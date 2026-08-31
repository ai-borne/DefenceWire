/**
 * Unit Tests for the Client Archive Service
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import { searchArchive } from '../../src/services/archiveService.js';

describe('searchArchive', () => {
  it('requests /api/archive/search with the query URL-encoded', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ stories: [] })
    });

    await searchArchive('F-16 radar', fetchFn as unknown as typeof fetch);

    expect(fetchFn).toHaveBeenCalledWith('/api/archive/search?q=F-16%20radar');
  });

  it('returns the stories from a successful response', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ stories: [{ id: 'cluster-a' }] })
    });

    const result = await searchArchive('Tejas', fetchFn as unknown as typeof fetch);
    expect(result.stories).toHaveLength(1);
    expect(result.error).toBeUndefined();
  });

  it('surfaces a server-reported error message', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ stories: [], error: 'Archive database is not configured.' })
    });

    const result = await searchArchive('Tejas', fetchFn as unknown as typeof fetch);
    expect(result.stories).toEqual([]);
    expect(result.error).toBe('Archive database is not configured.');
  });

  it('returns a generic error when the request fails outright', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('network down'));
    const result = await searchArchive('Tejas', fetchFn as unknown as typeof fetch);

    expect(result.stories).toEqual([]);
    expect(result.error).toBeTruthy();
  });

  it('returns a generic error when the response is not ok', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    const result = await searchArchive('Tejas', fetchFn as unknown as typeof fetch);

    expect(result.stories).toEqual([]);
    expect(result.error).toBeTruthy();
  });
});
