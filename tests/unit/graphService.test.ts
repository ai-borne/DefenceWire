/**
 * Unit Tests for Client Graph Service (Phase 2)
 * Tests client subgraph fetching, query serialization, and network failure fallbacks.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import { fetchSubgraph } from '../../src/services/graphService.js';
import { SubgraphPayload } from '../../src/types/graph.js';

describe('fetchSubgraph', () => {
  it('serializes all query parameters correctly and returns parsed payload on success', async () => {
    const mockPayload: SubgraphPayload = {
      nodes: [
        {
          id: 'node_l-70-guns',
          label: 'L-70 Guns',
          category: 'platform',
          mentionCount: 2,
          degree: 1,
          firstSeenAt: '2026-09-01T00:00:00Z',
          lastSeenAt: '2026-09-02T00:00:00Z'
        }
      ],
      edges: [],
      centerNodeId: 'node_l-70-guns',
      totalNodes: 1,
      totalEdges: 0,
      generatedAt: '2026-09-02T12:00:00Z'
    };

    let requestedUrl = '';
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      requestedUrl = url;
      return {
        ok: true,
        status: 200,
        json: async () => mockPayload
      };
    });

    const result = await fetchSubgraph(
      {
        centerNodeId: 'node_l-70-guns',
        maxHops: 2,
        limit: 50,
        startDate: '2026-09-01',
        endDate: '2026-09-07',
        categories: ['platform', 'location'],
        epistemicStates: ['CONFIRMED'],
        minWeight: 1.5
      },
      mockFetch as unknown as typeof fetch
    );

    expect(result.nodes).toHaveLength(1);
    expect(result.centerNodeId).toBe('node_l-70-guns');
    expect(requestedUrl).toContain('centerNodeId=node_l-70-guns');
    expect(requestedUrl).toContain('hops=2');
    expect(requestedUrl).toContain('limit=50');
    expect(requestedUrl).toContain('startDate=2026-09-01');
    expect(requestedUrl).toContain('endDate=2026-09-07');
    expect(requestedUrl).toContain('category=platform%2Clocation');
    expect(requestedUrl).toContain('state=CONFIRMED');
    expect(requestedUrl).toContain('minWeight=1.5');
  });

  it('returns graceful fallback on HTTP non-200 response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503
    });

    const result = await fetchSubgraph({}, mockFetch as unknown as typeof fetch);

    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
    expect(result.error).toBe('Knowledge graph is temporarily unavailable.');
  });

  it('returns graceful fallback on network rejection', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('DNS lookup failure'));

    const result = await fetchSubgraph({}, mockFetch as unknown as typeof fetch);

    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
    expect(result.error).toBe('Network error loading knowledge graph.');
  });
});
