/**
 * Unit Tests for Edge Cache Tag & Revalidation Engine
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it, vi } from 'vitest';
import {
  computeEtag,
  isEtagMatch,
  buildEdgeCacheHeaders,
  buildZoneConfigFromEnv,
  purgeEdgeCacheByUrls,
  EDGE_CACHE_TAGS
} from '../../src/seo/edgeCache.js';

describe('Edge Cache Tag & ETag Engine', () => {
  it('computes deterministic ETags for identical content and differentiates changes', () => {
    const etag1 = computeEtag('Hello DefenceWire');
    const etag2 = computeEtag('Hello DefenceWire');
    const etag3 = computeEtag('Hello DefenceWire 2');

    expect(etag1).toBe(etag2);
    expect(etag1).not.toBe(etag3);
    expect(etag1.startsWith('"')).toBe(true);
    expect(etag1.endsWith('"')).toBe(true);
  });

  it('evaluates If-None-Match header matching for strong, weak, and wildcard scenarios', () => {
    const etag = '"abc12345-10"';

    expect(isEtagMatch(etag, etag)).toBe(true);
    expect(isEtagMatch('W/"abc12345-10"', etag)).toBe(true);
    expect(isEtagMatch('"other", "abc12345-10"', etag)).toBe(true);
    expect(isEtagMatch('*', etag)).toBe(true);

    expect(isEtagMatch('"mismatch"', etag)).toBe(false);
    expect(isEtagMatch('', etag)).toBe(false);
    expect(isEtagMatch(null, etag)).toBe(false);
    expect(isEtagMatch(undefined, etag)).toBe(false);
  });

  it('builds standard Edge Cache headers with Cache-Tag, ETag, and Cache-Control', () => {
    const headers = buildEdgeCacheHeaders({
      cacheTags: [EDGE_CACHE_TAGS.LLMS_TXT, EDGE_CACHE_TAGS.AI_GROUNDING],
      etag: '"test-etag"',
      contentType: 'text/plain; charset=utf-8',
      maxAgeSeconds: 1800,
      sMaxAgeSeconds: 7200,
      staleWhileRevalidateSeconds: 600
    });

    expect(headers['Content-Type']).toBe('text/plain; charset=utf-8');
    expect(headers['Cache-Control']).toBe('public, max-age=1800, s-maxage=7200, stale-while-revalidate=600');
    expect(headers['Cache-Tag']).toBe('dw-llms-txt,dw-ai-grounding');
    expect(headers['ETag']).toBe('"test-etag"');
    expect(headers['X-Robots-Tag']).toBe('all');
  });

  it('supports single string cacheTag and private scope', () => {
    const headers = buildEdgeCacheHeaders({
      cacheTags: EDGE_CACHE_TAGS.SITEMAP,
      isPrivate: true
    });

    expect(headers['Cache-Control']).toContain('private');
    expect(headers['Cache-Tag']).toBe('dw-sitemap');
  });

  it('extracts Zone Config from environment variables', () => {
    expect(buildZoneConfigFromEnv({})).toBeNull();
    expect(buildZoneConfigFromEnv({ CLOUDFLARE_ZONE_ID: 'z123' })).toBeNull();

    const config = buildZoneConfigFromEnv({
      CLOUDFLARE_ZONE_ID: 'z123',
      CLOUDFLARE_API_TOKEN: 't456'
    });
    expect(config).toEqual({ zoneId: 'z123', apiToken: 't456' });
  });

  it('handles edge cache purge gracefully when unconfigured or empty', async () => {
    const emptyRes = await purgeEdgeCacheByUrls([], null);
    expect(emptyRes.success).toBe(true);
    expect(emptyRes.purgedTargets).toEqual([]);

    const unconfRes = await purgeEdgeCacheByUrls(['https://www.defencewire.in/data/news.json'], null);
    expect(unconfRes.success).toBe(false);
    expect(unconfRes.error).toContain('not configured');
  });

  it('executes Cloudflare Zone file-URL purge via API and handles responses', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true })
    } as unknown as Response);

    const config = { zoneId: 'zone-abc', apiToken: 'token-xyz' };
    const urls = ['https://www.defencewire.in/llms.txt', 'https://www.defencewire.in/data/news.json'];

    const result = await purgeEdgeCacheByUrls(urls, config, { fetchFn: mockFetch as unknown as typeof fetch });

    expect(result.success).toBe(true);
    expect(result.purgedTargets).toEqual(urls);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.cloudflare.com/client/v4/zones/zone-abc/purge_cache',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Authorization': 'Bearer token-xyz',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ files: urls })
      })
    );
  });

  it('captures and surfaces API errors and network failures during cache purge', async () => {
    const mockFailedFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => 'Forbidden: Invalid Token'
    } as unknown as Response);

    const config = { zoneId: 'zone-abc', apiToken: 'token-xyz' };
    const result = await purgeEdgeCacheByUrls(['https://www.defencewire.in/llms.txt'], config, {
      fetchFn: mockFailedFetch as unknown as typeof fetch
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('HTTP 403: Forbidden: Invalid Token');

    const mockNetworkError = vi.fn().mockRejectedValue(new Error('Connection timed out'));
    const netResult = await purgeEdgeCacheByUrls(['https://www.defencewire.in/llms.txt'], config, {
      fetchFn: mockNetworkError as unknown as typeof fetch
    });

    expect(netResult.success).toBe(false);
    expect(netResult.error).toContain('Connection timed out');
  });
});
