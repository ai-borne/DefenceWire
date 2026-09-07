/**
 * Unit Tests for Graph Query Handler & 2-Hop Traversal (Phase 2)
 * Tests multi-hop graph expansion, SQL injection sanitization,
 * category filtering, and parameter constraints.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  handleGetSubgraph,
  sanitizeDate,
  sanitizeNodeId
} from '../../src/services/graphQueryHandler.js';
import { GraphEdgeRow, GraphNodeRow } from '../../src/types/graph.js';

const mockCenterNode: GraphNodeRow = {
  id: 'node_l-70-guns',
  label: 'L-70 Guns',
  category: 'platform',
  mention_count: 5,
  degree: 2,
  first_seen_at: '2026-08-01T00:00:00Z',
  last_seen_at: '2026-09-02T12:00:00Z',
  metadata_json: null
};

const mockDelhiNode: GraphNodeRow = {
  id: 'node_delhi',
  label: 'Delhi',
  category: 'location',
  mention_count: 10,
  degree: 3,
  first_seen_at: '2026-08-01T00:00:00Z',
  last_seen_at: '2026-09-02T12:00:00Z',
  metadata_json: null
};

const mockRedFortNode: GraphNodeRow = {
  id: 'node_red-fort',
  label: 'Red Fort',
  category: 'facility',
  mention_count: 3,
  degree: 1,
  first_seen_at: '2026-08-15T00:00:00Z',
  last_seen_at: '2026-09-02T12:00:00Z',
  metadata_json: null
};

const mockEdgeHop1: GraphEdgeRow = {
  id: 'edge_node_l-70-guns_DEPLOYED_TO_node_delhi',
  source_id: 'node_l-70-guns',
  target_id: 'node_delhi',
  predicate: 'DEPLOYED_TO',
  epistemic_state: 'CONFIRMED',
  weight: 2.0,
  cluster_id: 'cluster-1',
  first_observed_at: '2026-09-01T00:00:00Z',
  last_observed_at: '2026-09-02T12:00:00Z',
  source_url: 'https://pib.gov.in/l70',
  context_snippet: 'L-70 guns deployed in Delhi'
};

const mockEdgeHop2: GraphEdgeRow = {
  id: 'edge_node_delhi_CONNECTED_TO_node_red-fort',
  source_id: 'node_delhi',
  target_id: 'node_red-fort',
  predicate: 'CONNECTED_TO',
  epistemic_state: 'CONFIRMED',
  weight: 1.0,
  cluster_id: 'cluster-2',
  first_observed_at: '2026-09-01T00:00:00Z',
  last_observed_at: '2026-09-02T12:00:00Z',
  source_url: 'https://pib.gov.in/redfort',
  context_snippet: 'Security perimeter at Red Fort'
};

describe('sanitizeNodeId & sanitizeDate', () => {
  it('strips SQL injection attempts and illegal punctuation from node IDs', () => {
    expect(sanitizeNodeId("node_tejas'; DROP TABLE graph_nodes;--")).toBe('node_tejasDROPTABLEgraph_nodes--');
    expect(sanitizeNodeId('node_l-70-guns')).toBe('node_l-70-guns');
    expect(sanitizeNodeId('')).toBe('');
  });

  it('validates ISO date formats and rejects SQL injection in dates', () => {
    expect(sanitizeDate('2026-09-07')).toBe('2026-09-07');
    expect(sanitizeDate('2026-09-07T12:00:00Z')).toBe('2026-09-07T12:00:00Z');
    expect(sanitizeDate('2026-09-07 OR 1=1')).toBeUndefined();
    expect(sanitizeDate('invalid-date')).toBeUndefined();
    expect(sanitizeDate(undefined)).toBeUndefined();
  });
});

describe('handleGetSubgraph - 2-Hop Traversal', () => {
  it('performs 2-hop boundary traversal centered on a specific node', async () => {
    const runQuery = vi.fn().mockImplementation(async (sql: string, _params: unknown[]) => {
      // 1. Center node lookup
      if (sql.includes('SELECT * FROM graph_nodes WHERE id = ?')) {
        return [mockCenterNode];
      }
      // 2. Hop 1 edges lookup
      if (sql.includes('(source_id = ? OR target_id = ?)')) {
        return [mockEdgeHop1];
      }
      // 3. Hop 2 edges lookup
      if (sql.includes('source_id IN (?) OR target_id IN (?)')) {
        return [mockEdgeHop2];
      }
      // 4. Batch node details lookup
      if (sql.includes('WHERE id IN')) {
        return [mockCenterNode, mockDelhiNode, mockRedFortNode];
      }
      return [];
    });

    const result = await handleGetSubgraph(
      { centerNodeId: 'node_l-70-guns', maxHops: 2 },
      { runQuery }
    );

    expect(result.error).toBeUndefined();
    expect(result.centerNodeId).toBe('node_l-70-guns');
    expect(result.nodes).toHaveLength(3);
    expect(result.edges).toHaveLength(2);
    expect(result.nodes.map((n) => n.id)).toContain('node_l-70-guns');
    expect(result.nodes.map((n) => n.id)).toContain('node_delhi');
    expect(result.nodes.map((n) => n.id)).toContain('node_red-fort');

    // Verify parameterization: no raw SQL concatenation
    for (const call of runQuery.mock.calls) {
      expect(typeof call[0]).toBe('string');
      expect(Array.isArray(call[1])).toBe(true);
    }
  });

  it('handles center node not found gracefully', async () => {
    const runQuery = vi.fn().mockResolvedValue([]);
    const result = await handleGetSubgraph(
      { centerNodeId: 'node_nonexistent' },
      { runQuery }
    );

    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
    expect(result.error).toBe('Center node not found');
  });

  it('performs global subgraph query when centerNodeId is not specified', async () => {
    const runQuery = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes('FROM graph_edges')) {
        return [mockEdgeHop1];
      }
      if (sql.includes('FROM graph_nodes')) {
        return [mockCenterNode, mockDelhiNode];
      }
      return [];
    });

    const result = await handleGetSubgraph({}, { runQuery });

    expect(result.error).toBeUndefined();
    expect(result.centerNodeId).toBeUndefined();
    expect(result.edges).toHaveLength(1);
    expect(result.nodes).toHaveLength(2);
  });

  it('filters nodes and corresponding edges by category', async () => {
    const runQuery = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes('FROM graph_edges')) {
        return [mockEdgeHop1];
      }
      if (sql.includes('FROM graph_nodes')) {
        return [mockCenterNode, mockDelhiNode];
      }
      return [];
    });

    const result = await handleGetSubgraph(
      { categories: ['platform'] },
      { runQuery }
    );

    // Only 'platform' nodes kept; edges connecting to excluded 'location' filtered out
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]?.category).toBe('platform');
    expect(result.edges).toHaveLength(0);
  });

  it('catches database query errors and returns graceful payload', async () => {
    const runQuery = vi.fn().mockRejectedValue(new Error('D1 connection lost'));
    const result = await handleGetSubgraph(
      { centerNodeId: 'node_l-70-guns' },
      { runQuery }
    );

    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
    expect(result.error).toBe('Knowledge graph database query failed');
  });
});
