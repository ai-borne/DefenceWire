/**
 * Unit Tests for Curator Purge Cache Request Handler
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it, vi } from 'vitest';
import {
  handleCuratorPurgeCache,
  DEFAULT_PURGE_TAGS
} from '../../src/services/curatorPurgeCacheHandler.js';

describe('Curator Purge Cache Request Handler', () => {
  const validEnv = {
    CLOUDFLARE_ZONE_ID: 'zone-123',
    CLOUDFLARE_API_TOKEN: 'token-456'
  };

  it('rejects unauthorized requests with HTTP 401', async () => {
    const { status, result } = await handleCuratorPurgeCache(null, validEnv, false);

    expect(status).toBe(401);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unauthorized');
  });

  it('returns HTTP 503 when Cloudflare credentials are not configured', async () => {
    const { status, result } = await handleCuratorPurgeCache(null, {}, true);

    expect(status).toBe(503);
    expect(result.success).toBe(false);
    expect(result.error).toContain('not configured');
  });

  it('purges default core tags when no custom tags provided and credentials exist', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true })
    } as unknown as Response);

    const { status, result } = await handleCuratorPurgeCache(
      null,
      validEnv,
      true,
      { fetchFn: mockFetch as unknown as typeof fetch }
    );

    expect(status).toBe(200);
    expect(result.success).toBe(true);
    expect(result.purgedTags).toEqual(DEFAULT_PURGE_TAGS);
    expect(result.message).toContain('Successfully purged');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.cloudflare.com/client/v4/zones/zone-123/purge_cache',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Authorization': 'Bearer token-456',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tags: DEFAULT_PURGE_TAGS })
      })
    );
  });

  it('purges custom tags when supplied in the request body', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true })
    } as unknown as Response);

    const customTags = ['dw-llms-txt', 'dw-sitemap'];
    const { status, result } = await handleCuratorPurgeCache(
      { tags: customTags },
      validEnv,
      true,
      { fetchFn: mockFetch as unknown as typeof fetch }
    );

    expect(status).toBe(200);
    expect(result.success).toBe(true);
    expect(result.purgedTags).toEqual(customTags);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.cloudflare.com/client/v4/zones/zone-123/purge_cache',
      expect.objectContaining({
        body: JSON.stringify({ tags: customTags })
      })
    );
  });

  it('returns HTTP 502 with error message when Cloudflare API responds with error', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => 'Zone access denied'
    } as unknown as Response);

    const { status, result } = await handleCuratorPurgeCache(
      null,
      validEnv,
      true,
      { fetchFn: mockFetch as unknown as typeof fetch }
    );

    expect(status).toBe(502);
    expect(result.success).toBe(false);
    expect(result.error).toContain('HTTP 403: Zone access denied');
  });

  it('returns HTTP 502 with error message when network fetch fails', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('DNS resolution failed'));

    const { status, result } = await handleCuratorPurgeCache(
      null,
      validEnv,
      true,
      { fetchFn: mockFetch as unknown as typeof fetch }
    );

    expect(status).toBe(502);
    expect(result.success).toBe(false);
    expect(result.error).toContain('DNS resolution failed');
  });
});
