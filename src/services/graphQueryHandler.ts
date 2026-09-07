/**
 * Edge-Agnostic Knowledge Graph Subgraph Handler (Phase 2)
 * Orchestrates 1-hop and 2-hop neighborhood traversals, temporal filtering,
 * node category projection, and strict SQL parameter sanitization.
 * Hard limit: <= 300 LOC.
 */

import {
  EpistemicState,
  GraphEdge,
  GraphEdgeRow,
  GraphNode,
  GraphNodeRow,
  NodeCategory,
  SubgraphPayload,
  SubgraphQueryOptions
} from '../types/graph.js';
import {
  build1HopEdgesStatement,
  build2HopEdgesStatement,
  buildGetNodeByIdStatement,
  buildGetNodesByIdsStatement,
  buildGlobalSubgraphEdgesStatement,
  edgeRowToGraphEdge,
  nodeRowToGraphNode
} from './graphQueryBuilder.js';

export interface GraphHandlerDeps {
  runQuery: (sql: string, params: unknown[]) => Promise<unknown[]>;
}

export function sanitizeNodeId(rawId: string): string {
  if (!rawId || typeof rawId !== 'string') return '';
  return rawId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100);
}

export function sanitizeDate(rawDate?: string): string | undefined {
  if (!rawDate || typeof rawDate !== 'string') return undefined;
  const trimmed = rawDate.trim();
  // Validates ISO date formats (e.g., 2026-09-07 or 2026-09-07T12:00:00.000Z)
  if (/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z?)?$/.test(trimmed)) {
    return trimmed;
  }
  return undefined;
}

const VALID_CATEGORIES = new Set<NodeCategory>([
  'platform',
  'threat',
  'facility',
  'location',
  'organization',
  'program'
]);

const VALID_EPISTEMIC_STATES = new Set<EpistemicState>([
  'CONFIRMED',
  'CONTESTED',
  'SUPERSEDED',
  'DISPUTED',
  'RETRACTED'
]);

export async function handleGetSubgraph(
  options: SubgraphQueryOptions,
  deps: GraphHandlerDeps
): Promise<SubgraphPayload> {
  const generatedAt = new Date().toISOString();
  const rawCenter = options.centerNodeId ? sanitizeNodeId(options.centerNodeId) : undefined;
  const maxHops = Math.min(3, Math.max(1, options.maxHops ?? 2));
  const limit = Math.min(300, Math.max(1, options.limit ?? 100));
  const startDate = sanitizeDate(options.startDate);
  const endDate = sanitizeDate(options.endDate);

  const categories = options.categories
    ? options.categories.filter((c) => VALID_CATEGORIES.has(c))
    : undefined;

  const epistemicStates = options.epistemicStates
    ? options.epistemicStates.filter((s) => VALID_EPISTEMIC_STATES.has(s))
    : undefined;

  const sanitizedOptions: SubgraphQueryOptions = {
    centerNodeId: rawCenter,
    maxHops,
    limit,
    startDate,
    endDate,
    categories,
    epistemicStates,
    minWeight: options.minWeight ? Math.max(0, options.minWeight) : undefined
  };

  try {
    const edgeMap = new Map<string, GraphEdge>();
    const involvedNodeIds = new Set<string>();

    if (rawCenter) {
      // 1. Verify center node exists
      const centerStmt = buildGetNodeByIdStatement(rawCenter);
      const centerRows = (await deps.runQuery(centerStmt.sql, centerStmt.params)) as GraphNodeRow[];
      if (centerRows.length === 0) {
        return {
          nodes: [],
          edges: [],
          centerNodeId: rawCenter,
          totalNodes: 0,
          totalEdges: 0,
          generatedAt,
          error: 'Center node not found'
        };
      }
      involvedNodeIds.add(rawCenter);

      // 2. Hop 1 traversal
      const hop1Stmt = build1HopEdgesStatement(rawCenter, sanitizedOptions);
      const hop1Rows = (await deps.runQuery(hop1Stmt.sql, hop1Stmt.params)) as GraphEdgeRow[];
      const neighborIds = new Set<string>();

      for (const row of hop1Rows) {
        const edge = edgeRowToGraphEdge(row);
        edgeMap.set(edge.id, edge);
        involvedNodeIds.add(edge.sourceId);
        involvedNodeIds.add(edge.targetId);
        if (edge.sourceId !== rawCenter) neighborIds.add(edge.sourceId);
        if (edge.targetId !== rawCenter) neighborIds.add(edge.targetId);
      }

      // 3. Hop 2 traversal
      if (maxHops >= 2 && neighborIds.size > 0 && edgeMap.size < limit) {
        const remainingLimit = limit - edgeMap.size;
        const hop2Options: SubgraphQueryOptions = { ...sanitizedOptions, limit: remainingLimit };
        const hop2Stmt = build2HopEdgesStatement(Array.from(neighborIds), hop2Options);
        const hop2Rows = (await deps.runQuery(hop2Stmt.sql, hop2Stmt.params)) as GraphEdgeRow[];

        for (const row of hop2Rows) {
          const edge = edgeRowToGraphEdge(row);
          if (!edgeMap.has(edge.id)) {
            edgeMap.set(edge.id, edge);
            involvedNodeIds.add(edge.sourceId);
            involvedNodeIds.add(edge.targetId);
          }
          if (edgeMap.size >= limit) break;
        }
      }
    } else {
      // Global or time-slice subgraph
      const globalStmt = buildGlobalSubgraphEdgesStatement(sanitizedOptions);
      const rows = (await deps.runQuery(globalStmt.sql, globalStmt.params)) as GraphEdgeRow[];

      for (const row of rows) {
        const edge = edgeRowToGraphEdge(row);
        edgeMap.set(edge.id, edge);
        involvedNodeIds.add(edge.sourceId);
        involvedNodeIds.add(edge.targetId);
      }
    }

    // 4. Fetch node entities for all involved IDs
    const nodeIdsArray = Array.from(involvedNodeIds);
    let nodes: GraphNode[] = [];

    if (nodeIdsArray.length > 0) {
      const nodesStmt = buildGetNodesByIdsStatement(nodeIdsArray);
      const nodeRows = (await deps.runQuery(nodesStmt.sql, nodesStmt.params)) as GraphNodeRow[];
      nodes = nodeRows.map(nodeRowToGraphNode);
    }

    // 5. Apply category filter if specified
    if (categories && categories.length > 0) {
      const allowedCategories = new Set(categories);
      nodes = nodes.filter((n) => allowedCategories.has(n.category));
      const validNodeIds = new Set(nodes.map((n) => n.id));
      for (const [edgeId, edge] of edgeMap.entries()) {
        if (!validNodeIds.has(edge.sourceId) || !validNodeIds.has(edge.targetId)) {
          edgeMap.delete(edgeId);
        }
      }
    }

    const edges = Array.from(edgeMap.values());

    return {
      nodes,
      edges,
      centerNodeId: rawCenter,
      totalNodes: nodes.length,
      totalEdges: edges.length,
      generatedAt
    };
  } catch (err) {
    console.error('[GRAPH HANDLER] Failed to query subgraph:', err);
    return {
      nodes: [],
      edges: [],
      centerNodeId: rawCenter,
      totalNodes: 0,
      totalEdges: 0,
      generatedAt,
      error: 'Knowledge graph database query failed'
    };
  }
}
