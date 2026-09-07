/**
 * Unit Tests for Curator Pattern Service (Phase 5)
 * Tests client-side HTTP communication, error isolation, and response parsing.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import { CuratorPatternService } from '../../src/services/curatorPatternService.js';
import { EmergentPattern } from '../../src/types/patterns.js';

describe('CuratorPatternService', () => {
  it('lists patterns with query params and returns typed patterns', async () => {
    const mockPatterns: EmergentPattern[] = [
      {
        id: 'pat_delhi_air_defence',
        title: 'NCR Air Defence & Counter-UAS Convergence',
        synthesis: 'Observed drone threats and L-70 gun deployment in Delhi NCR.',
        confidence: 0.88,
        nodeIds: ['node_delhi', 'node_l-70-guns'],
        clusterIds: ['c-1', 'c-2'],
        status: 'draft',
        createdAt: '2026-09-02T12:00:00Z',
        reviewedAt: null,
        reviewedBy: null
      }
    ];

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockPatterns })
    });

    const service = new CuratorPatternService(mockFetch as unknown as typeof fetch);
    const res = await service.listPatterns({ status: 'draft', limit: 10 });

    expect(res.success).toBe(true);
    expect(res.patterns).toHaveLength(1);
    expect(res.patterns[0]?.id).toBe('pat_delhi_air_defence');
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/curator/patterns?status=draft&limit=10',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('handles server errors gracefully during listPatterns', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    });

    const service = new CuratorPatternService(mockFetch as unknown as typeof fetch);
    const res = await service.listPatterns();

    expect(res.success).toBe(false);
    expect(res.patterns).toHaveLength(0);
    expect(res.error).toContain('HTTP 500');
  });

  it('reviews pattern and returns updated model on success', async () => {
    const updatedPattern: EmergentPattern = {
      id: 'pat_delhi_air_defence',
      title: 'NCR Air Defence & Counter-UAS Convergence',
      synthesis: 'Observed drone threats and L-70 gun deployment in Delhi NCR.',
      confidence: 0.88,
      nodeIds: ['node_delhi', 'node_l-70-guns'],
      clusterIds: ['c-1', 'c-2'],
      status: 'approved',
      createdAt: '2026-09-02T12:00:00Z',
      reviewedAt: '2026-09-03T10:00:00Z',
      reviewedBy: 'curator@institutional.internal'
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: updatedPattern })
    });

    const service = new CuratorPatternService(mockFetch as unknown as typeof fetch);
    const res = await service.reviewPattern({ id: 'pat_delhi_air_defence', action: 'approve' });

    expect(res.success).toBe(true);
    expect(res.pattern?.status).toBe('approved');
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/curator/patterns',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ id: 'pat_delhi_air_defence', action: 'approve' })
      })
    );
  });

  it('handles network failure during reviewPattern', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network disconnected'));

    const service = new CuratorPatternService(mockFetch as unknown as typeof fetch);
    const res = await service.reviewPattern({ id: 'pat_1', action: 'reject' });

    expect(res.success).toBe(false);
    expect(res.error).toBe('Network disconnected');
  });
});
