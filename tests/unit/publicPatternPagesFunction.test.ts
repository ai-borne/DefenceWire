/**
 * Unit Tests: Cloudflare Pages Function /api/patterns (Public Pattern Edge API)
 * Verifies public access, D1 queries for approved patterns, rate limiting, and cache headers.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import { onRequestGet } from '../../functions/api/patterns/index.js';

describe('Cloudflare Pages Function: GET /api/patterns', () => {
  it('returns 503 if D1 database binding is missing', async () => {
    const request = new Request('http://localhost:5176/api/patterns');
    const response = await onRequestGet({ request, env: {} });
    expect(response.status).toBe(503);
    const body = (await response.json()) as { success: boolean; error?: string };
    expect(body.success).toBe(false);
    expect(body.error).toContain('not configured');
  });

  it('queries D1 for approved patterns and returns 200 with cache headers', async () => {
    const mockRows = [
      {
        id: 'pat_delhi_air_defence',
        title: 'NCR Air Defence & Counter-UAS Convergence',
        synthesis: 'Observed drone threats and L-70 gun deployment in Delhi NCR.',
        confidence: 0.92,
        node_ids_json: '["node_delhi","node_l-70-guns"]',
        cluster_ids_json: '["c-1","c-2"]',
        status: 'approved',
        created_at: '2026-09-02T12:00:00Z',
        reviewed_at: '2026-09-02T13:00:00Z',
        reviewed_by: 'curator@defencewire.in'
      }
    ];

    const mockPrepare = vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnThis(),
      all: vi.fn().mockResolvedValue({ results: mockRows })
    });
    const mockDb = { prepare: mockPrepare };

    const request = new Request('http://localhost:5176/api/patterns?limit=5', {
      headers: { 'cf-connecting-ip': '1.2.3.4' }
    });

    const response = await onRequestGet({
      request,
      env: { DB: mockDb as never }
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toContain('max-age=120');
    expect(response.headers.get('Cache-Tag')).toBe('dw-patterns');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');

    const body = (await response.json()) as {
      success: boolean;
      patterns: Array<{ id: string; title: string; status: string; confidence: number }>;
    };
    expect(body.success).toBe(true);
    expect(body.patterns).toHaveLength(1);
    expect(body.patterns[0]?.id).toBe('pat_delhi_air_defence');
    expect(body.patterns[0]?.status).toBe('approved');
    expect(body.patterns[0]?.confidence).toBe(0.92);
  });

  it('returns 500 when database throws an error', async () => {
    const mockPrepare = vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnThis(),
      all: vi.fn().mockRejectedValue(new Error('D1 connection reset'))
    });
    const mockDb = { prepare: mockPrepare };

    const request = new Request('http://localhost:5176/api/patterns', {
      headers: { 'cf-connecting-ip': '5.6.7.8' }
    });

    const response = await onRequestGet({
      request,
      env: { DB: mockDb as never }
    });

    expect(response.status).toBe(500);
    const body = (await response.json()) as { success: boolean; error: string };
    expect(body.success).toBe(false);
    expect(body.error).toContain('D1 connection reset');
  });

  it('enforces rate limiting on excessive requests from same IP', async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [] })
      })
    };

    const targetIp = '99.88.77.66';
    let lastResponse: Response | null = null;

    // Issue 65 requests to exceed the 60 req/min limit
    for (let i = 0; i < 65; i++) {
      const request = new Request('http://localhost:5176/api/patterns', {
        headers: { 'cf-connecting-ip': targetIp }
      });
      lastResponse = await onRequestGet({
        request,
        env: { DB: mockDb as never }
      });
    }

    expect(lastResponse).not.toBeNull();
    expect(lastResponse?.status).toBe(429);
    const body = (await lastResponse?.json()) as { success: boolean; error: string };
    expect(body.success).toBe(false);
    expect(body.error).toContain('Too many requests');
  });
});
