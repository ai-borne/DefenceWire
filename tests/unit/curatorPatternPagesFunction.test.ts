/**
 * Unit Tests: Cloudflare Pages Function /api/curator/patterns (Phase 5)
 * Tests endpoint binding verification, session authentication, and GET/POST dispatch.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import { onRequestGet, onRequestPost } from '../../functions/api/curator/patterns.js';
import { createSessionCookie } from '../../src/services/curatorAuthHandler.js';

describe('Cloudflare Pages Function: /api/curator/patterns', () => {
  const secret = 'curator-test-secret-2026';

  it('returns 503 if D1 database binding is missing on GET', async () => {
    const request = new Request('http://localhost:5176/api/curator/patterns');
    const response = await onRequestGet({ request, env: {} });
    expect(response.status).toBe(503);
  });

  it('returns 503 if D1 database binding is missing on POST', async () => {
    const request = new Request('http://localhost:5176/api/curator/patterns', {
      method: 'POST',
      body: JSON.stringify({ id: 'pat_1', action: 'approve' })
    });
    const response = await onRequestPost({ request, env: {} });
    expect(response.status).toBe(503);
  });

  it('returns 401 for GET without a valid curator session', async () => {
    const mockDb = { prepare: vi.fn() };
    const request = new Request('http://localhost:5176/api/curator/patterns');
    const response = await onRequestGet({
      request,
      env: { DB: mockDb as never, CURATOR_SESSION_SECRET: secret }
    });
    expect(response.status).toBe(401);
    const body = (await response.json()) as { success: boolean };
    expect(body.success).toBe(false);
  });

  it('returns patterns for GET with a valid curator session cookie', async () => {
    const mockRows = [
      {
        id: 'pat_delhi_air_defence',
        title: 'NCR Air Defence & Counter-UAS Convergence',
        synthesis: 'Observed drone threats and L-70 gun deployment in Delhi NCR.',
        confidence: 0.88,
        node_ids_json: '["node_delhi","node_l-70-guns"]',
        cluster_ids_json: '["c-1","c-2"]',
        status: 'draft',
        created_at: '2026-09-02T12:00:00Z',
        reviewed_at: null,
        reviewed_by: null
      }
    ];

    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: mockRows })
      })
    };

    const cookie = await createSessionCookie(secret);
    const request = new Request('http://localhost:5176/api/curator/patterns?status=draft', {
      headers: { cookie: cookie.split(';')[0]! }
    });

    const response = await onRequestGet({
      request,
      env: { DB: mockDb as never, CURATOR_SESSION_SECRET: secret }
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { success: boolean; data: unknown[] };
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
  });

  it('returns 401 for POST without valid curator session', async () => {
    const mockDb = { prepare: vi.fn() };
    const request = new Request('http://localhost:5176/api/curator/patterns', {
      method: 'POST',
      body: JSON.stringify({ id: 'pat_1', action: 'approve' })
    });

    const response = await onRequestPost({
      request,
      env: { DB: mockDb as never, CURATOR_SESSION_SECRET: secret }
    });

    expect(response.status).toBe(401);
  });

  it('approves a pattern for POST with valid session', async () => {
    const existingRow = {
      id: 'pat_delhi_air_defence',
      title: 'NCR Air Defence & Counter-UAS Convergence',
      synthesis: 'Observed drone threats and L-70 gun deployment in Delhi NCR.',
      confidence: 0.88,
      node_ids_json: '["node_delhi","node_l-70-guns"]',
      cluster_ids_json: '["c-1","c-2"]',
      status: 'draft',
      created_at: '2026-09-02T12:00:00Z',
      reviewed_at: null,
      reviewed_by: null
    };

    const updatedRow = {
      ...existingRow,
      status: 'approved',
      reviewed_at: '2026-09-03T00:00:00Z',
      reviewed_by: 'curator@institutional.internal'
    };

    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        all: vi
          .fn()
          .mockResolvedValueOnce({ results: [existingRow] })
          .mockResolvedValueOnce({ results: [updatedRow] }),
        run: vi.fn().mockResolvedValue({ success: true })
      })
    };

    const cookie = await createSessionCookie(secret);
    const request = new Request('http://localhost:5176/api/curator/patterns', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: cookie.split(';')[0]!
      },
      body: JSON.stringify({ id: 'pat_delhi_air_defence', action: 'approve' })
    });

    const response = await onRequestPost({
      request,
      env: { DB: mockDb as never, CURATOR_SESSION_SECRET: secret }
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { success: boolean; data?: { status: string } };
    expect(body.success).toBe(true);
    expect(body.data?.status).toBe('approved');
  });

  it('returns 400 when invalid request body is provided', async () => {
    const mockDb = { prepare: vi.fn() };
    const cookie = await createSessionCookie(secret);
    const request = new Request('http://localhost:5176/api/curator/patterns', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: cookie.split(';')[0]!
      },
      body: 'invalid-json'
    });

    const response = await onRequestPost({
      request,
      env: { DB: mockDb as never, CURATOR_SESSION_SECRET: secret }
    });

    expect(response.status).toBe(400);
  });
});
