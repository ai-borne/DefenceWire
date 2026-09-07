/**
 * Unit Tests for Crawler Graph Sync (Phase 2)
 * Tests D1 REST synchronization, batch upserts, in-memory fallback,
 * and resilient non-fatal failure handling.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import { runGraphExtractionAndSync, syncGraphToD1 } from '../../crawler/graphSync.js';
import { TripletExtractionResult } from '../../src/types/graph.js';
import { D1RestConfig } from '../../crawler/archiveSync.js';
import { StoryCluster } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';


const mockD1Config: D1RestConfig = {
  accountId: 'test-account',
  databaseId: 'test-db',
  apiToken: 'test-token'
};

const mockExtraction: TripletExtractionResult = {
  nodes: [
    {
      id: 'node_l-70-guns',
      label: 'L-70 Guns',
      category: 'platform',
      mentionCount: 1,
      degree: 1,
      firstSeenAt: '2026-09-01T00:00:00Z',
      lastSeenAt: '2026-09-01T00:00:00Z'
    },
    {
      id: 'node_delhi',
      label: 'Delhi',
      category: 'location',
      mentionCount: 1,
      degree: 1,
      firstSeenAt: '2026-09-01T00:00:00Z',
      lastSeenAt: '2026-09-01T00:00:00Z'
    }
  ],
  edges: [
    {
      id: 'edge_node_l-70-guns_DEPLOYED_TO_node_delhi',
      sourceId: 'node_l-70-guns',
      targetId: 'node_delhi',
      predicate: 'DEPLOYED_TO',
      epistemicState: 'CONFIRMED',
      weight: 1.0,
      firstObservedAt: '2026-09-01T00:00:00Z',
      lastObservedAt: '2026-09-01T00:00:00Z',
      sourceUrl: 'https://pib.gov.in/test'
    }
  ],
  extractedCount: 1,
  suppressedCount: 2
};

describe('syncGraphToD1', () => {
  it('successfully syncs nodes and edges to D1 via REST API', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, result: [{ results: [] }] })
    });

    const result = await syncGraphToD1(mockExtraction, mockD1Config, mockFetch as unknown as typeof fetch);

    expect(result.syncedNodes).toBe(2);
    expect(result.syncedEdges).toBe(1);
    expect(result.failed).toBe(0);
    expect(mockFetch).toHaveBeenCalledTimes(3); // 2 nodes + 1 edge
  });

  it('handles HTTP error status codes and network rejections without crashing', async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return { ok: false, status: 500, json: async () => ({ success: false }) };
      }
      throw new Error('Network timeout');
    });

    const result = await syncGraphToD1(mockExtraction, mockD1Config, mockFetch as unknown as typeof fetch);

    expect(result.syncedNodes).toBe(0);
    expect(result.failed).toBe(3);
  });
});

describe('runGraphExtractionAndSync', () => {
  const mockCluster: StoryCluster = {
    id: 'cluster-graph-1',
    synthesizedHeadline: 'Indian Army deploys modernized L-70 air defence guns around Delhi',
    primarySource: {
      id: 'src-1',
      title: 'L-70 deployed in Delhi',
      url: 'https://pib.gov.in/l70',
      sourceName: 'PIB MoD',
      sourceDomain: 'pib.gov.in',
      tier: SourceTier.TIER_1_OFFICIAL,
      publishedAt: '2026-09-02T12:00:00Z'
    },
    relatedCoverage: [],
    discussions: [],
    categories: ['army'],
    entities: ['Indian Army', 'L-70 Guns'],
    defenceScore: 80,
    isLeadStory: false,
    createdAt: '2026-09-02T12:00:00Z',
    updatedAt: '2026-09-02T12:00:00Z'
  };

  it('runs in-memory extraction when D1 config is null', async () => {
    const result = await runGraphExtractionAndSync([mockCluster], null);

    expect(result.syncedNodes).toBe(0);
    expect(result.syncedEdges).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.extracted.nodes.length).toBeGreaterThan(0);
    expect(result.extracted.edges.length).toBeGreaterThan(0);
  });

  it('extracts and syncs to D1 when config is present', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, result: [{ results: [] }] })
    });

    const result = await runGraphExtractionAndSync([mockCluster], mockD1Config, {
      fetchFn: mockFetch as unknown as typeof fetch
    });

    expect(result.syncedNodes).toBeGreaterThan(0);
    expect(result.syncedEdges).toBeGreaterThan(0);
    expect(result.failed).toBe(0);
  });

  it('catches and isolates unexpected exceptions', async () => {
    const badConfig = { ...mockD1Config };
    const mockFetch = vi.fn().mockRejectedValue(new Error('Fatal D1 error'));

    const result = await runGraphExtractionAndSync([mockCluster], badConfig, {
      fetchFn: mockFetch as unknown as typeof fetch
    });

    expect(result.syncedNodes).toBe(0);
    expect(result.syncedEdges).toBe(0);
    expect(result.failed).toBeGreaterThan(0);
  });
});
