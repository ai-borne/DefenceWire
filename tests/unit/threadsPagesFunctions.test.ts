/**
 * Unit Tests for Cloudflare Pages Functions:
 * GET /api/threads/list
 * GET /api/threads/:id
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import { onRequestGet as onRequestGetList } from '../../functions/api/threads/list.js';
import { onRequestGet as onRequestGetDetail } from '../../functions/api/threads/[id].js';
import { StoryThreadRow, StoryThreadEventRow } from '../../src/types/threads.js';

const mockThreadRow: StoryThreadRow = {
  id: 'th_su-57',
  title: 'Su-57 Operational & Strategic Arc',
  canonical_entity: 'Su-57',
  category: 'airforce',
  status: 'active',
  event_count: 1,
  first_event_at: '2026-09-08T02:30:41.000Z',
  last_event_at: '2026-09-08T02:30:41.000Z',
  summary: 'Russian Su-57 Conducts Rehearsal Flight Over Egypt',
  created_at: '2026-09-08T11:49:23.376Z',
  updated_at: '2026-09-08T11:49:23.376Z'
};

const mockEventRow: StoryThreadEventRow = {
  id: 'ev_1',
  thread_id: 'th_su-57',
  cluster_id: 'cluster-1',
  sequence_code: 'x1.1.1',
  sequence_index: 1,
  headline: 'Russian Su-57 Conducts Rehearsal Flight Over Egypt',
  delta_summary: 'Flight completed',
  primary_source_name: 'IDRW',
  primary_source_url: 'https://idrw.org/su-57',
  published_at: '2026-09-08T02:30:41.000Z',
  entities: JSON.stringify(['Su-57']),
  created_at: '2026-09-08T11:49:23.376Z'
};

describe('Pages Function: GET /api/threads/list', () => {
  it('returns HTTP 503 when D1 database binding is absent', async () => {
    const request = new Request('https://www.defencewire.in/api/threads/list');
    const response = await onRequestGetList({
      request,
      env: {}
    });

    expect(response.status).toBe(503);
    const body = (await response.json()) as { error?: string };
    expect(body.error).toContain('not configured');
  });

  it('queries D1 and returns JSON payload with Cache-Tag and caching headers', async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({
            results: [mockThreadRow]
          })
        })
      })
    };

    const request = new Request('https://www.defencewire.in/api/threads/list?status=active&limit=5');
    const response = await onRequestGetList({
      request,
      env: { DB: mockDb as never }
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    expect(response.headers.get('Cache-Tag')).toBe('dw-threads');
    expect(response.headers.get('Cache-Control')).toContain('public');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');

    const body = (await response.json()) as { threads: unknown[] };
    expect(body.threads).toHaveLength(1);
    expect(mockDb.prepare).toHaveBeenCalled();
  });
});

describe('Pages Function: GET /api/threads/:id', () => {
  it('returns HTTP 400 when thread id parameter is missing or empty', async () => {
    const request = new Request('https://www.defencewire.in/api/threads/');
    const response = await onRequestGetDetail({
      request,
      params: { id: '' },
      env: {}
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error?: string };
    expect(body.error).toBe('Thread ID is required.');
  });

  it('returns HTTP 503 when D1 database binding is absent', async () => {
    const request = new Request('https://www.defencewire.in/api/threads/th_su-57');
    const response = await onRequestGetDetail({
      request,
      params: { id: 'th_su-57' },
      env: {}
    });

    expect(response.status).toBe(503);
    const body = (await response.json()) as { error?: string };
    expect(body.error).toContain('not configured');
  });

  it('queries D1 and returns thread detail and timeline events', async () => {
    const mockDb = {
      prepare: vi.fn().mockImplementation((sql: string) => ({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockImplementation(() => {
            if (sql.includes('FROM story_threads')) {
              return Promise.resolve({ results: [mockThreadRow] });
            }
            return Promise.resolve({ results: [mockEventRow] });
          })
        })
      }))
    };

    const request = new Request('https://www.defencewire.in/api/threads/th_su-57');
    const response = await onRequestGetDetail({
      request,
      params: { id: 'th_su-57' },
      env: { DB: mockDb as never }
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toContain('public');

    const body = (await response.json()) as { thread: { id: string } | null; events: unknown[] };
    expect(body.thread?.id).toBe('th_su-57');
    expect(body.events).toHaveLength(1);
  });

  it('correctly decodes URI-encoded hashtags such as %23Su-57', async () => {
    const mockDb = {
      prepare: vi.fn().mockImplementation((sql: string) => ({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockImplementation(() => {
            if (sql.includes('FROM story_threads')) {
              return Promise.resolve({ results: [mockThreadRow] });
            }
            return Promise.resolve({ results: [mockEventRow] });
          })
        })
      }))
    };

    const request = new Request('https://www.defencewire.in/api/threads/%23Su-57');
    const response = await onRequestGetDetail({
      request,
      params: { id: '%23Su-57' },
      env: { DB: mockDb as never }
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { thread: { canonicalEntity: string } | null };
    expect(body.thread?.canonicalEntity).toBe('Su-57');
  });

  it('returns HTTP 404 when thread does not exist', async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({
            results: []
          })
        })
      })
    };

    const request = new Request('https://www.defencewire.in/api/threads/th_nonexistent');
    const response = await onRequestGetDetail({
      request,
      params: { id: 'th_nonexistent' },
      env: { DB: mockDb as never }
    });

    expect(response.status).toBe(404);
    const body = (await response.json()) as { thread: unknown; error?: string };
    expect(body.thread).toBeNull();
    expect(body.error).toBe('Thread not found');
  });
});
