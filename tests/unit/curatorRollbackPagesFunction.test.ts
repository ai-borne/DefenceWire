/**
 * Unit Tests: Cloudflare Pages Function /api/curator/rollback
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import { onRequestPost } from '../../functions/api/curator/rollback.js';
import { createSessionCookie } from '../../src/services/curatorAuthHandler.js';

describe('Cloudflare Pages Function: /api/curator/rollback', () => {
  const secret = 'curator-test-secret-2026';

  function makeMockDb(rows: unknown[] = []) {
    return {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: rows })
      })
    };
  }

  it('returns 503 when D1 or NEWS_LIVE KV is not configured', async () => {
    const request = new Request('http://localhost:5176/api/curator/rollback', { method: 'POST' });
    const response = await onRequestPost({ request, env: { DB: makeMockDb() as any } });
    expect(response.status).toBe(503);
  });

  it('rejects unauthenticated requests with 401', async () => {
    const request = new Request('http://localhost:5176/api/curator/rollback', { method: 'POST' });

    const response = await onRequestPost({
      request,
      env: { DB: makeMockDb() as any, NEWS_LIVE: { put: vi.fn() } as any, CURATOR_SESSION_SECRET: secret }
    });

    expect(response.status).toBe(401);
  });

  it('rolls back to the previous snapshot when authenticated', async () => {
    const validCookie = await createSessionCookie(secret, 3600);
    const kvPut = vi.fn().mockResolvedValue(undefined);
    const snapshotRow = { id: 7, snapshot_json: '{"clusters":[],"river":[]}', published_at: '2026-09-01T00:00:00Z' };

    const request = new Request('http://localhost:5176/api/curator/rollback', {
      method: 'POST',
      headers: { cookie: validCookie }
    });

    const response = await onRequestPost({
      request,
      env: {
        DB: makeMockDb([snapshotRow]) as any,
        NEWS_LIVE: { put: kvPut } as any,
        CURATOR_SESSION_SECRET: secret
      }
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { success: boolean; restoredSnapshotId?: number };
    expect(body.success).toBe(true);
    expect(body.restoredSnapshotId).toBe(7);
    expect(kvPut).toHaveBeenCalledWith('live_snapshot', snapshotRow.snapshot_json);
  });

  it('returns 404 when no prior snapshot exists', async () => {
    const validCookie = await createSessionCookie(secret, 3600);
    const request = new Request('http://localhost:5176/api/curator/rollback', {
      method: 'POST',
      headers: { cookie: validCookie }
    });

    const response = await onRequestPost({
      request,
      env: { DB: makeMockDb([]) as any, NEWS_LIVE: { put: vi.fn() } as any, CURATOR_SESSION_SECRET: secret }
    });

    expect(response.status).toBe(404);
  });
});
