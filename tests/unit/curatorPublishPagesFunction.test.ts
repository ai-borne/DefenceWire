/**
 * Unit Tests: Cloudflare Pages Function /api/curator/publish
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import { onRequestPost } from '../../functions/api/curator/publish.js';
import { createSessionCookie } from '../../src/services/curatorAuthHandler.js';

describe('Cloudflare Pages Function: /api/curator/publish', () => {
  const secret = 'curator-test-secret-2026';

  function makeMockDb() {
    return {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [] }),
        run: vi.fn().mockResolvedValue({ success: true })
      })
    };
  }

  it('returns 503 when D1 or NEWS_LIVE KV is not configured', async () => {
    const request = new Request('http://localhost:5176/api/curator/publish', { method: 'POST' });
    const response = await onRequestPost({ request, env: { DB: makeMockDb() as any } });
    expect(response.status).toBe(503);
  });

  it('rejects unauthenticated requests with 401', async () => {
    const request = new Request('http://localhost:5176/api/curator/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clusters: [], river: [] })
    });

    const response = await onRequestPost({
      request,
      env: { DB: makeMockDb() as any, NEWS_LIVE: { put: vi.fn() } as any, CURATOR_SESSION_SECRET: secret }
    });

    expect(response.status).toBe(401);
  });

  it('publishes live when authenticated with a valid session', async () => {
    const validCookie = await createSessionCookie(secret, 3600);
    const kvPut = vi.fn().mockResolvedValue(undefined);

    const request = new Request('http://localhost:5176/api/curator/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: validCookie },
      body: JSON.stringify({ clusters: [], river: [] })
    });

    const response = await onRequestPost({
      request,
      env: {
        DB: makeMockDb() as any,
        NEWS_LIVE: { put: kvPut } as any,
        CURATOR_SESSION_SECRET: secret
      }
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { success: boolean; message?: string };
    expect(body.success).toBe(true);
    expect(kvPut).toHaveBeenCalledWith('live_snapshot', expect.any(String));
  });

  it('wires the D1 snapshot insert and pruning SQL to the shared MAX_RETAINED_SNAPSHOTS=20 limit', async () => {
    const validCookie = await createSessionCookie(secret, 3600);
    const db = makeMockDb();

    const request = new Request('http://localhost:5176/api/curator/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: validCookie },
      body: JSON.stringify({ clusters: [], river: [] })
    });

    await onRequestPost({
      request,
      env: { DB: db as any, NEWS_LIVE: { put: vi.fn() } as any, CURATOR_SESSION_SECRET: secret }
    });

    const sqlCalls = (db.prepare as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0] as string);
    expect(sqlCalls.some((sql) => sql.includes('INSERT INTO published_snapshots'))).toBe(true);
    expect(sqlCalls.some((sql) => sql.includes('DELETE FROM published_snapshots') && sql.includes('NOT IN'))).toBe(true);

    const pruneCallIndex = sqlCalls.findIndex((sql) => sql.includes('DELETE FROM published_snapshots'));
    const sharedStatement = (db.prepare as ReturnType<typeof vi.fn>).mock.results[0]!.value;
    const boundArgsForPrune = (sharedStatement.bind as ReturnType<typeof vi.fn>).mock.calls[pruneCallIndex];
    expect(boundArgsForPrune).toEqual([20]);
  });

  it('rejects an invalid JSON body with 400', async () => {
    const validCookie = await createSessionCookie(secret, 3600);
    const request = new Request('http://localhost:5176/api/curator/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: validCookie },
      body: '{not json'
    });

    const response = await onRequestPost({
      request,
      env: { DB: makeMockDb() as any, NEWS_LIVE: { put: vi.fn() } as any, CURATOR_SESSION_SECRET: secret }
    });

    expect(response.status).toBe(400);
  });
});
