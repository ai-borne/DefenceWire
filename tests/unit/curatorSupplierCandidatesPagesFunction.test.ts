/**
 * Unit Tests: Cloudflare Pages Function /api/curator/supplier-candidates (Phase 2.7)
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import { onRequestGet, onRequestPost } from '../../functions/api/curator/supplier-candidates.js';
import { createSessionCookie } from '../../src/services/curatorAuthHandler.js';

describe('Cloudflare Pages Function: /api/curator/supplier-candidates', () => {
  const secret = 'curator-test-secret-2026';

  it('returns 503 if D1 database binding is missing', async () => {
    const request = new Request('http://localhost:5176/api/curator/supplier-candidates');
    const response = await onRequestGet({ request, env: {} });
    expect(response.status).toBe(503);
  });

  it('returns 401 for GET without a valid curator session', async () => {
    const mockDb = { prepare: vi.fn() };
    const request = new Request('http://localhost:5176/api/curator/supplier-candidates');
    const response = await onRequestGet({ request, env: { DB: mockDb as never, CURATOR_SESSION_SECRET: secret } });
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  it('returns pending candidates for GET with a valid curator session cookie', async () => {
    const mockRows = [
      {
        id: 'new_link:bel:tejas-mk2',
        candidate_type: 'new_link',
        supplier_id: 'bel',
        supplier_name: 'Bharat Electronics Limited',
        program_id: 'tejas-mk2',
        subsystem_name: 'Needs reviewer input',
        source_story_id: 'story-1',
        source_domains: '["idrw.org"]',
        mention_count: 2,
        source_count: 1,
        confidence: 0.55,
        status: 'pending',
        first_seen_at: '2026-09-01T00:00:00.000Z',
        last_seen_at: '2026-09-02T00:00:00.000Z'
      }
    ];
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: mockRows })
      })
    };

    const cookie = await createSessionCookie(secret);
    const request = new Request('http://localhost:5176/api/curator/supplier-candidates', {
      headers: { cookie: cookie.split(';')[0]! }
    });
    const response = await onRequestGet({ request, env: { DB: mockDb as never, CURATOR_SESSION_SECRET: secret } });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
  });

  it('returns 401 for POST (approve) without a valid curator session', async () => {
    const mockDb = { prepare: vi.fn() };
    const request = new Request('http://localhost:5176/api/curator/supplier-candidates', {
      method: 'POST',
      body: JSON.stringify({ id: 'x', action: 'approve' })
    });
    const response = await onRequestPost({ request, env: { DB: mockDb as never, CURATOR_SESSION_SECRET: secret } });
    expect(response.status).toBe(401);
  });

  it('approves a candidate for POST with a valid curator session cookie', async () => {
    const candidateRow = {
      id: 'new_link:bel:tejas-mk2',
      program_id: 'tejas-mk2',
      subsystem_name: 'Needs reviewer input',
      supplier_id: 'bel',
      status: 'pending'
    };
    const supplierRow = { tier: 'dpsu' };

    let call = 0;
    const mockDb = {
      prepare: vi.fn().mockImplementation(() => ({
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockImplementation(() => {
          call++;
          if (call === 1) return Promise.resolve({ results: [candidateRow] });
          if (call === 2) return Promise.resolve({ results: [supplierRow] });
          return Promise.resolve({ results: [] });
        }),
        run: vi.fn().mockResolvedValue(undefined)
      }))
    };

    const cookie = await createSessionCookie(secret);
    const request = new Request('http://localhost:5176/api/curator/supplier-candidates', {
      method: 'POST',
      headers: { cookie: cookie.split(';')[0]!, 'content-type': 'application/json' },
      body: JSON.stringify({ id: candidateRow.id, action: 'approve' })
    });
    const response = await onRequestPost({ request, env: { DB: mockDb as never, CURATOR_SESSION_SECRET: secret } });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('approved');
  });

  it('returns 400 for an invalid POST body', async () => {
    const mockDb = { prepare: vi.fn() };
    const cookie = await createSessionCookie(secret);
    const request = new Request('http://localhost:5176/api/curator/supplier-candidates', {
      method: 'POST',
      headers: { cookie: cookie.split(';')[0]! },
      body: 'not json'
    });
    const response = await onRequestPost({ request, env: { DB: mockDb as never, CURATOR_SESSION_SECRET: secret } });
    expect(response.status).toBe(400);
  });
});
