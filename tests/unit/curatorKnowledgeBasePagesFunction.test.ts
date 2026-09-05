/**
 * Unit Tests: Cloudflare Pages Function /api/curator/knowledge-base (Phase 5)
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import { onRequestGet } from '../../functions/api/curator/knowledge-base.js';
import { createSessionCookie } from '../../src/services/curatorAuthHandler.js';

describe('Cloudflare Pages Function: /api/curator/knowledge-base', () => {
  const secret = 'curator-test-secret-2026';

  it('returns 503 if D1 database binding is missing', async () => {
    const request = new Request('http://localhost:5176/api/curator/knowledge-base?table=discovered_entities');
    const response = await onRequestGet({ request, env: {} });
    expect(response.status).toBe(503);
  });

  it('returns 401 without a valid curator session', async () => {
    const mockDb = { prepare: vi.fn() };
    const request = new Request('http://localhost:5176/api/curator/knowledge-base?table=discovered_entities');
    const response = await onRequestGet({ request, env: { DB: mockDb as never, CURATOR_SESSION_SECRET: secret } });
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  it('returns 400 for an authenticated request naming an unknown table', async () => {
    const mockDb = { prepare: vi.fn() };
    const cookie = await createSessionCookie(secret);
    const request = new Request('http://localhost:5176/api/curator/knowledge-base?table=not_a_real_table', {
      headers: { cookie: cookie.split(';')[0]! }
    });
    const response = await onRequestGet({ request, env: { DB: mockDb as never, CURATOR_SESSION_SECRET: secret } });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('Unknown knowledge base table');
  });

  it('returns paginated rows for an authenticated GET against an allow-listed table', async () => {
    const mockRows = [
      { id: 'rudram-ii', name: 'Rudram-II', category: 'airforce', source_count: 3, mention_count: 5, is_promoted: 1, first_seen_at: '2026-01-01T00:00:00.000Z', last_seen_at: '2026-02-01T00:00:00.000Z' }
    ];
    let call = 0;
    const mockDb = {
      prepare: vi.fn().mockImplementation(() => ({
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockImplementation(() => {
          call++;
          if (call === 1) return Promise.resolve({ results: [{ total: 1 }] });
          return Promise.resolve({ results: mockRows });
        })
      }))
    };

    const cookie = await createSessionCookie(secret);
    const request = new Request('http://localhost:5176/api/curator/knowledge-base?table=discovered_entities&page=0&pageSize=20', {
      headers: { cookie: cookie.split(';')[0]! }
    });
    const response = await onRequestGet({ request, env: { DB: mockDb as never, CURATOR_SESSION_SECRET: secret } });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.rows).toHaveLength(1);
    expect(body.data.totalCount).toBe(1);
    expect(body.data.table).toBe('discovered_entities');
  });

  it('passes filter/sort query params through to the handler', async () => {
    let capturedSql = '';
    const mockDb = {
      prepare: vi.fn().mockImplementation((sql: string) => {
        capturedSql = sql;
        return {
          bind: vi.fn().mockReturnThis(),
          all: vi.fn().mockResolvedValue({ results: [] })
        };
      })
    };

    const cookie = await createSessionCookie(secret);
    const request = new Request(
      'http://localhost:5176/api/curator/knowledge-base?table=source_reputation&sortBy=scoop_count&sortDir=asc&filter=livefist',
      { headers: { cookie: cookie.split(';')[0]! } }
    );
    await onRequestGet({ request, env: { DB: mockDb as never, CURATOR_SESSION_SECRET: secret } });

    expect(capturedSql).toContain('scoop_count ASC');
  });
});
