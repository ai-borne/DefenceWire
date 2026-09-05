/**
 * Unit Tests: Cloudflare Pages Function /data/news.json
 * Verifies the live-KV-snapshot override and static-asset fallback behavior.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import { onRequestGet } from '../../functions/data/news.json.js';
import { EDGE_CACHE_TAGS } from '../../src/seo/edgeCache.js';

describe('Cloudflare Pages Function: /data/news.json', () => {
  it('serves the live KV snapshot when NEWS_LIVE has one', async () => {
    const snapshotJson = '{"clusters":[{"id":"cluster-live"}],"river":[]}';
    const next = vi.fn();

    const response = await onRequestGet({
      env: { NEWS_LIVE: { get: vi.fn().mockResolvedValue(snapshotJson) } },
      next
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe(snapshotJson);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    expect(response.headers.get('Cache-Tag')).toBe(EDGE_CACHE_TAGS.NEWS_FEED);
    expect(next).not.toHaveBeenCalled();
  });

  it('falls through to the static asset when NEWS_LIVE has no snapshot yet', async () => {
    const staticResponse = new Response('static-fallback', { status: 200 });
    const next = vi.fn().mockResolvedValue(staticResponse);

    const response = await onRequestGet({
      env: { NEWS_LIVE: { get: vi.fn().mockResolvedValue(null) } },
      next
    });

    expect(next).toHaveBeenCalledTimes(1);
    expect(response).toBe(staticResponse);
  });

  it('falls through to the static asset when NEWS_LIVE is unbound', async () => {
    const staticResponse = new Response('static-fallback', { status: 200 });
    const next = vi.fn().mockResolvedValue(staticResponse);

    const response = await onRequestGet({ env: {}, next });

    expect(next).toHaveBeenCalledTimes(1);
    expect(response).toBe(staticResponse);
  });
});
