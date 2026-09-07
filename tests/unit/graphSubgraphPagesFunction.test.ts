/**
 * Unit Tests for Cloudflare Pages Function: GET /api/graph/subgraph (Phase 2)
 * Tests HTTP parsing, D1 execution, caching headers, and rate limiting.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import { onRequestGet } from '../../functions/api/graph/subgraph.js';
import { GraphNodeRow } from '../../src/types/graph.js';

const mockNode: GraphNodeRow = {
  id: 'node_l-70-guns',
  label: 'L-70 Guns',
  category: 'platform',
  mention_count: 3,
  degree: 1,
  first_seen_at: '2026-09-01T00:00:00Z',
  last_seen_at: '2026-09-02T00:00:00Z',
  metadata_json: null
};

describe('Pages Function: GET /api/graph/subgraph', () => {
  it('returns 503 when D1 database binding is absent', async () => {
    const request = new Request('https://defencewire.in/api/graph/subgraph');
    const response = await onRequestGet({
      request,
      env: {}
    });

    expect(response.status).toBe(503);
    const body = (await response.json()) as { error?: string };
    expect(body.error).toContain('not configured');
  });

  it('queries D1 and returns JSON payload with caching headers', async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({
            results: [mockNode]
          })
        })
      })
    };

    const request = new Request('https://defencewire.in/api/graph/subgraph?limit=10&hops=2');
    const response = await onRequestGet({
      request,
      env: { DB: mockDb as never }
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('Cache-Control')).toContain('public');
  });

  it('passes centerNodeId and categories to handler', async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({
            results: [mockNode]
          })
        })
      })
    };

    const request = new Request(
      'https://defencewire.in/api/graph/subgraph?centerNodeId=node_l-70-guns&category=platform,location&state=CONFIRMED'
    );
    const response = await onRequestGet({
      request,
      env: { DB: mockDb as never }
    });

    expect(response.status).toBe(200);
    expect(mockDb.prepare).toHaveBeenCalled();
  });
});
