/**
 * Unit Tests for Client Thread Service (Phase 1)
 * Tests network calls, query string composition, and fallback error handling.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import { fetchThreadsList, fetchThreadDetail } from '../../src/services/threadService.js';

describe('fetchThreadsList', () => {
  it('constructs correct query parameters and returns parsed list', async () => {
    const mockResponse = {
      threads: [
        {
          id: 'th_amca',
          title: 'AMCA Program',
          canonicalEntity: 'AMCA',
          category: 'airforce',
          status: 'active',
          eventCount: 1,
          firstEventAt: '2026-08-01T00:00:00Z',
          lastEventAt: '2026-08-01T00:00:00Z',
          createdAt: '2026-08-01T00:00:00Z',
          updatedAt: '2026-08-01T00:00:00Z'
        }
      ],
      nextCursor: '2026-08-01T00:00:00Z'
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    } as unknown as Response);

    const result = await fetchThreadsList(
      { status: 'active', category: 'airforce', limit: 10, cursor: '2026-09-01T00:00:00Z' },
      mockFetch
    );

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/threads/list?status=active&category=airforce&limit=10&cursor=2026-09-01T00%3A00%3A00Z'
    );
    expect(result.threads).toHaveLength(1);
    expect(result.threads[0]?.id).toBe('th_amca');
    expect(result.nextCursor).toBe('2026-08-01T00:00:00Z');
  });

  it('handles HTTP error responses gracefully without throwing', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500
    } as unknown as Response);

    const result = await fetchThreadsList({}, mockFetch);
    expect(result.threads).toEqual([]);
    expect(result.nextCursor).toBeNull();
    expect(result.error).toBe('Story threads are temporarily unavailable.');
  });
});

describe('fetchThreadDetail', () => {
  it('fetches thread detail by id', async () => {
    const mockDetail = {
      thread: {
        id: 'th_zorawar',
        title: 'Zorawar Tank Arc'
      },
      events: [
        {
          id: 'ev_1',
          sequenceCode: 'x1.1.1'
        }
      ]
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockDetail)
    } as unknown as Response);

    const result = await fetchThreadDetail('th_zorawar', mockFetch);
    expect(mockFetch).toHaveBeenCalledWith('/api/threads/th_zorawar');
    expect(result.thread?.id).toBe('th_zorawar');
    expect(result.events).toHaveLength(1);
  });

  it('returns error when thread id is blank', async () => {
    const mockFetch = vi.fn();
    const result = await fetchThreadDetail('', mockFetch);

    expect(result.error).toBe('Thread ID is required.');
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
