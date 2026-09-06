/**
 * Unit Tests: Cloudflare Pages Function /data/news.json
 * Verifies it always compares the NEWS_LIVE KV snapshot against the
 * freshly-crawled static feed by generatedAt and serves whichever is newer,
 * instead of letting one curator publish permanently shadow every
 * subsequent hourly crawl.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import { onRequestGet } from '../../functions/data/news.json.js';
import { EDGE_CACHE_TAGS } from '../../src/seo/edgeCache.js';

function feedJson(generatedAt?: string, marker = 'x'): string {
  return JSON.stringify({ clusters: [{ id: marker }], river: [], ...(generatedAt ? { generatedAt } : {}) });
}

describe('Cloudflare Pages Function: /data/news.json', () => {
  it('serves the KV snapshot when it is newer than the static feed', async () => {
    const kvJson = feedJson('2026-09-06T08:00:00Z', 'cluster-live');
    const staticJson = feedJson('2026-09-05T08:00:00Z', 'cluster-static');
    const next = vi.fn().mockResolvedValue(new Response(staticJson, { status: 200 }));

    const response = await onRequestGet({
      env: { NEWS_LIVE: { get: vi.fn().mockResolvedValue(kvJson) } },
      next
    });

    expect(next).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(kvJson);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    expect(response.headers.get('Cache-Tag')).toBe(EDGE_CACHE_TAGS.NEWS_FEED);
  });

  it('serves the static feed once it has overtaken an older curator publish', async () => {
    const kvJson = feedJson('2026-09-04T08:00:00Z', 'cluster-live');
    const staticJson = feedJson('2026-09-06T08:00:00Z', 'cluster-static');
    const staticResponse = new Response(staticJson, { status: 200 });
    const next = vi.fn().mockResolvedValue(staticResponse);

    const response = await onRequestGet({
      env: { NEWS_LIVE: { get: vi.fn().mockResolvedValue(kvJson) } },
      next
    });

    expect(response).toBe(staticResponse);
  });

  it('serves the static feed when the KV snapshot predates the generatedAt field (legacy publish)', async () => {
    const kvJson = feedJson(undefined, 'cluster-live');
    const staticJson = feedJson('2026-09-06T08:00:00Z', 'cluster-static');
    const staticResponse = new Response(staticJson, { status: 200 });
    const next = vi.fn().mockResolvedValue(staticResponse);

    const response = await onRequestGet({
      env: { NEWS_LIVE: { get: vi.fn().mockResolvedValue(kvJson) } },
      next
    });

    expect(response).toBe(staticResponse);
  });

  it('falls back to the KV snapshot when the static asset request fails', async () => {
    const kvJson = feedJson('2026-09-06T08:00:00Z', 'cluster-live');
    const staticResponse = new Response('not found', { status: 404 });
    const next = vi.fn().mockResolvedValue(staticResponse);

    const response = await onRequestGet({
      env: { NEWS_LIVE: { get: vi.fn().mockResolvedValue(kvJson) } },
      next
    });

    expect(await response.text()).toBe(kvJson);
    expect(response.headers.get('Cache-Tag')).toBe(EDGE_CACHE_TAGS.NEWS_FEED);
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
