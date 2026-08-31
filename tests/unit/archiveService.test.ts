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
      json: async () => ({ stories: [], nextCursor: null })
    });

    await searchArchive('F-16 radar', undefined, fetchFn as unknown as typeof fetch);

    expect(fetchFn).toHaveBeenCalledWith('/api/archive/search?q=F-16%20radar');
  });

  it('appends a before= cursor param when paginating', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ stories: [], nextCursor: null })
    });

    await searchArchive('Tejas', '2026-08-05T00:00:00Z', fetchFn as unknown as typeof fetch);

    expect(fetchFn).toHaveBeenCalledWith('/api/archive/search?q=Tejas&before=2026-08-05T00%3A00%3A00Z');
  });

  it('requests browse mode (blank q) with no cursor by default', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ stories: [], nextCursor: null })
    });

    await searchArchive('', undefined, fetchFn as unknown as typeof fetch);

    expect(fetchFn).toHaveBeenCalledWith('/api/archive/search?q=');
  });

  it('returns stories and nextCursor from a successful response', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ stories: [{ id: 'cluster-a' }], nextCursor: '2026-08-01T00:00:00Z' })
    });

    const result = await searchArchive('Tejas', undefined, fetchFn as unknown as typeof fetch);
    expect(result.stories).toHaveLength(1);
    expect(result.nextCursor).toBe('2026-08-01T00:00:00Z');
    expect(result.error).toBeUndefined();
  });

  it('surfaces a server-reported error message', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ stories: [], nextCursor: null, error: 'Archive database is not configured.' })
    });

    const result = await searchArchive('Tejas', undefined, fetchFn as unknown as typeof fetch);
    expect(result.stories).toEqual([]);
    expect(result.error).toBe('Archive database is not configured.');
  });

  it('returns a generic error when the request fails outright', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('network down'));
    const result = await searchArchive('Tejas', undefined, fetchFn as unknown as typeof fetch);

    expect(result.stories).toEqual([]);
    expect(result.nextCursor).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it('returns a generic error when the response is not ok', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    const result = await searchArchive('Tejas', undefined, fetchFn as unknown as typeof fetch);

    expect(result.stories).toEqual([]);
    expect(result.error).toBeTruthy();
  });
});
