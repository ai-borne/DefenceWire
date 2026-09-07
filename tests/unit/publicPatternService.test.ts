/**
 * Unit Tests for publicPatternService (Phase 5 Display UI)
 * Verifies pattern retrieval, in-memory session caching, and error fallbacks.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  fetchApprovedPatterns,
  clearPublicPatternCache
} from '../../src/services/publicPatternService.js';
import { EmergentPattern } from '../../src/types/patterns.js';

describe('publicPatternService', () => {
  const samplePatterns: EmergentPattern[] = [
    {
      id: 'pat_1',
      title: 'Hypersonic Glide Testing Convergence',
      synthesis: 'Integrated testing across DRDO missile tracks.',
      confidence: 0.95,
      nodeIds: ['drdo', 'hstdv'],
      clusterIds: ['c_1', 'c_2'],
      status: 'approved',
      createdAt: '2026-09-01T10:00:00Z'
    }
  ];

  beforeEach(() => {
    clearPublicPatternCache();
  });

  it('fetches approved patterns successfully from /api/patterns', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, patterns: samplePatterns })
    });

    const result = await fetchApprovedPatterns({}, mockFetch as never);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('pat_1');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith('/api/patterns?limit=10', expect.any(Object));
  });

  it('uses in-memory session cache to avoid duplicate network fetches', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, patterns: samplePatterns })
    });

    const first = await fetchApprovedPatterns({}, mockFetch as never);
    const second = await fetchApprovedPatterns({}, mockFetch as never);

    expect(first).toEqual(second);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('bypasses session cache when forceRefresh is true', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, patterns: samplePatterns })
    });

    await fetchApprovedPatterns({}, mockFetch as never);
    await fetchApprovedPatterns({ forceRefresh: true }, mockFetch as never);

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('returns cached data or empty array on non-ok HTTP response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500
    });

    const result = await fetchApprovedPatterns({}, mockFetch as never);
    expect(result).toEqual([]);
  });

  it('handles network throw gracefully with empty array', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network offline'));

    const result = await fetchApprovedPatterns({}, mockFetch as never);
    expect(result).toEqual([]);
  });
});
