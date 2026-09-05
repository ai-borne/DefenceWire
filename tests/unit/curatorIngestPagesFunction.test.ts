/**
 * Unit Tests for Cloudflare Pages Function: /api/curator/ingest (Phase 4)
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { onRequestPost } from '../../functions/api/curator/ingest.js';
import { createSessionCookie } from '../../src/services/curatorAuthHandler.js';
import { clearRateLimits } from '../../src/services/edgeRateLimiter.js';

function buildDb() {
  return {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnThis(),
      all: vi.fn().mockResolvedValue({ results: [] }),
      run: vi.fn().mockResolvedValue(undefined)
    })
  };
}

function buildKv(liveSnapshot: string | null = null) {
  return {
    get: vi.fn().mockResolvedValue(liveSnapshot),
    put: vi.fn().mockResolvedValue(undefined)
  };
}

describe('Pages Function: /api/curator/ingest', () => {
  const secret = 'curator-test-secret-2026';

  beforeEach(() => {
    clearRateLimits();
  });

  it('rejects unauthenticated requests with HTTP 401', async () => {
    const request = new Request('https://www.defencewire.in/api/curator/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'text', text: 'unauthenticated attempt' })
    });

    const response = await onRequestPost({
      request,
      env: { CURATOR_SESSION_SECRET: secret, DB: buildDb() as any, NEWS_LIVE: buildKv() as any }
    });

    expect(response.status).toBe(401);
    const body = await response.json() as { success: boolean; error?: string };
    expect(body.success).toBe(false);
    expect(body.error).toContain('Unauthorized');
  });

  it('rejects an SSRF-unsafe URL with HTTP 400 for an authenticated curator', async () => {
    const cookie = await createSessionCookie(secret, 3600);
    const request = new Request('https://www.defencewire.in/api/curator/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify({ mode: 'url', url: 'http://127.0.0.1/admin' })
    });

    const response = await onRequestPost({
      request,
      env: { CURATOR_SESSION_SECRET: secret, DB: buildDb() as any, NEWS_LIVE: buildKv() as any }
    });

    expect(response.status).toBe(400);
    const body = await response.json() as { success: boolean; error?: string };
    expect(body.success).toBe(false);
  });

  it('returns HTTP 429 after exceeding the rate limit threshold', async () => {
    const cookie = await createSessionCookie(secret, 3600);
    const env = { CURATOR_SESSION_SECRET: secret, DB: buildDb() as any, NEWS_LIVE: buildKv() as any };

    let lastResponse: Response | null = null;
    for (let i = 0; i < 11; i++) {
      const request = new Request('https://www.defencewire.in/api/curator/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie, 'cf-connecting-ip': '203.0.113.9' },
        body: JSON.stringify({ mode: 'text', text: `submission number ${i}` })
      });
      lastResponse = await onRequestPost({ request, env });
    }

    expect(lastResponse?.status).toBe(429);
    const body = await lastResponse!.json() as { success: boolean; error?: string };
    expect(body.success).toBe(false);
  });

  it('sanitizes text-mode input and publishes a live snapshot on success', async () => {
    const cookie = await createSessionCookie(secret, 3600);
    const db = buildDb();
    const kv = buildKv();
    const request = new Request('https://www.defencewire.in/api/curator/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie, 'cf-connecting-ip': '198.51.100.4' },
      body: JSON.stringify({
        mode: 'text',
        text: 'Army deploys new artillery system.<script>alert(1)</script> Full report follows.',
        sourceName: 'Field Desk'
      })
    });

    const response = await onRequestPost({
      request,
      env: { CURATOR_SESSION_SECRET: secret, DB: db as any, NEWS_LIVE: kv as any }
    });

    expect(response.status).toBe(200);
    const body = await response.json() as { success: boolean; cluster?: unknown };
    expect(body.success).toBe(true);
    expect(JSON.stringify(body.cluster)).not.toContain('<script>');
    expect(kv.put).toHaveBeenCalledWith('live_snapshot', expect.any(String));
  });

  it('returns HTTP 503 when D1/KV are not configured', async () => {
    const cookie = await createSessionCookie(secret, 3600);
    const request = new Request('https://www.defencewire.in/api/curator/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie, 'cf-connecting-ip': '198.51.100.5' },
      body: JSON.stringify({ mode: 'text', text: 'no backing services configured' })
    });

    const response = await onRequestPost({ request, env: { CURATOR_SESSION_SECRET: secret } });
    expect(response.status).toBe(503);
  });
});
