/**
 * SQL Statement Builder & Row Mappers for Knowledge Graph (Phase 2)
 * Constructs fully parameterized SQLite statements for 1-hop and 2-hop
 * graph traversals, upserts, and temporal filtering.
 * Hard limit: <= 300 LOC.
 */

import {
  EpistemicState,
  GraphEdge,
  GraphEdgeRow,
  GraphNode,
  GraphNodeRow,
  NodeCategory,
  PredicateType,
  SubgraphQueryOptions
} from '../types/graph.js';

export interface PreparedStatement {
  sql: string;
  params: unknown[];
}

export function nodeRowToGraphNode(row: GraphNodeRow): GraphNode {
  let metadata: Record<string, unknown> | undefined;
  if (row.metadata_json) {
    try {
      metadata = JSON.parse(row.metadata_json);
    } catch {
      metadata = undefined;
    }
  }

  return {
    id: row.id,
    label: row.label,
    category: row.category as NodeCategory,
    mentionCount: row.mention_count,
    degree: row.degree,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    metadata
  };
}

export function edgeRowToGraphEdge(row: GraphEdgeRow): GraphEdge {
  return {
    id: row.id,
    sourceId: row.source_id,
    targetId: row.target_id,
    predicate: row.predicate as PredicateType,
    epistemicState: row.epistemic_state as EpistemicState,
    weight: row.weight,
    clusterId: row.cluster_id || undefined,
    firstObservedAt: row.first_observed_at,
    lastObservedAt: row.last_observed_at,
    sourceUrl: row.source_url,
    contextSnippet: row.context_snippet || undefined
  };
}

export function buildUpsertNodeStatement(node: GraphNode): PreparedStatement {
  const sql = `
    INSERT INTO graph_nodes (
      id, label, category, mention_count, degree, first_seen_at, last_seen_at, metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      mention_count = graph_nodes.mention_count + excluded.mention_count,
      degree = MAX(graph_nodes.degree, excluded.degree),
      last_seen_at = CASE WHEN excluded.last_seen_at > graph_nodes.last_seen_at THEN excluded.last_seen_at ELSE graph_nodes.last_seen_at END,
      metadata_json = COALESCE(excluded.metadata_json, graph_nodes.metadata_json)
  `.trim();

  const metadataJson = node.metadata ? JSON.stringify(node.metadata) : null;
  return {
    sql,
    params: [
      node.id,
      node.label,
      node.category,
      node.mentionCount,
      node.degree,
      node.firstSeenAt,
      node.lastSeenAt,
      metadataJson
    ]
  };
}

export function buildUpsertEdgeStatement(edge: GraphEdge): PreparedStatement {
  const sql = `
    INSERT INTO graph_edges (
      id, source_id, target_id, predicate, epistemic_state, weight, cluster_id,
      first_observed_at, last_observed_at, source_url, context_snippet
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      weight = graph_edges.weight + excluded.weight,
      epistemic_state = excluded.epistemic_state,
      last_observed_at = CASE WHEN excluded.last_observed_at > graph_edges.last_observed_at THEN excluded.last_observed_at ELSE graph_edges.last_observed_at END,
      context_snippet = COALESCE(excluded.context_snippet, graph_edges.context_snippet),
      cluster_id = COALESCE(excluded.cluster_id, graph_edges.cluster_id)
  `.trim();

  return {
    sql,
    params: [
      edge.id,
      edge.sourceId,
      edge.targetId,
      edge.predicate,
      edge.epistemicState,
      edge.weight,
      edge.clusterId ?? null,
      edge.firstObservedAt,
      edge.lastObservedAt,
      edge.sourceUrl,
      edge.contextSnippet ?? null
    ]
  };
}

export function buildGetNodeByIdStatement(nodeId: string): PreparedStatement {
  return {
    sql: 'SELECT * FROM graph_nodes WHERE id = ? LIMIT 1',
    params: [nodeId]
  };
}

export function buildGetNodesByIdsStatement(nodeIds: string[]): PreparedStatement {
  if (nodeIds.length === 0) {
    return { sql: 'SELECT * FROM graph_nodes WHERE 1 = 0', params: [] };
  }
  const placeholders = nodeIds.map(() => '?').join(', ');
  return {
    sql: `SELECT * FROM graph_nodes WHERE id IN (${placeholders})`,
    params: nodeIds
  };
}

export function build1HopEdgesStatement(centerNodeId: string, options: SubgraphQueryOptions = {}): PreparedStatement {
  const clauses: string[] = ['(source_id = ? OR target_id = ?)'];
  const params: unknown[] = [centerNodeId, centerNodeId];

  if (options.startDate) {
    clauses.push('last_observed_at >= ?');
    params.push(options.startDate);
  }
  if (options.endDate) {
    clauses.push('first_observed_at <= ?');
    params.push(options.endDate);
  }
  if (options.minWeight) {
    clauses.push('weight >= ?');
    params.push(options.minWeight);
  }
  if (options.epistemicStates && options.epistemicStates.length > 0) {
    const ph = options.epistemicStates.map(() => '?').join(', ');
    clauses.push(`epistemic_state IN (${ph})`);
    params.push(...options.epistemicStates);
  }

  const limit = Math.min(300, Math.max(1, options.limit ?? 100));
  const sql = `SELECT * FROM graph_edges WHERE ${clauses.join(' AND ')} ORDER BY weight DESC LIMIT ${limit}`;

  return { sql, params };
}

export function build2HopEdgesStatement(neighborNodeIds: string[], options: SubgraphQueryOptions = {}): PreparedStatement {
  if (neighborNodeIds.length === 0) {
    return { sql: 'SELECT * FROM graph_edges WHERE 1 = 0', params: [] };
  }

  const placeholders = neighborNodeIds.map(() => '?').join(', ');
  const clauses: string[] = [`(source_id IN (${placeholders}) OR target_id IN (${placeholders}))`];
  const params: unknown[] = [...neighborNodeIds, ...neighborNodeIds];

  if (options.startDate) {
    clauses.push('last_observed_at >= ?');
    params.push(options.startDate);
  }
  if (options.endDate) {
    clauses.push('first_observed_at <= ?');
    params.push(options.endDate);
  }
  if (options.minWeight) {
    clauses.push('weight >= ?');
    params.push(options.minWeight);
  }
  if (options.epistemicStates && options.epistemicStates.length > 0) {
    const ph = options.epistemicStates.map(() => '?').join(', ');
    clauses.push(`epistemic_state IN (${ph})`);
    params.push(...options.epistemicStates);
  }

  const limit = Math.min(300, Math.max(1, options.limit ?? 100));
  const sql = `SELECT * FROM graph_edges WHERE ${clauses.join(' AND ')} ORDER BY weight DESC LIMIT ${limit}`;

  return { sql, params };
}

export function buildGlobalSubgraphEdgesStatement(options: SubgraphQueryOptions = {}): PreparedStatement {
  const clauses: string[] = ['1 = 1'];
  const params: unknown[] = [];

  if (options.startDate) {
    clauses.push('last_observed_at >= ?');
    params.push(options.startDate);
  }
  if (options.endDate) {
    clauses.push('first_observed_at <= ?');
    params.push(options.endDate);
  }
  if (options.minWeight) {
    clauses.push('weight >= ?');
    params.push(options.minWeight);
  }
  if (options.epistemicStates && options.epistemicStates.length > 0) {
    const ph = options.epistemicStates.map(() => '?').join(', ');
    clauses.push(`epistemic_state IN (${ph})`);
    params.push(...options.epistemicStates);
  }

  const limit = Math.min(300, Math.max(1, options.limit ?? 100));
  const sql = `SELECT * FROM graph_edges WHERE ${clauses.join(' AND ')} ORDER BY last_observed_at DESC, weight DESC LIMIT ${limit}`;

  return { sql, params };
}
