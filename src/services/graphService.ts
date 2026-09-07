/**
 * Client Knowledge Graph Service for DefenceWire.in (Phase 2)
 * Thin fetch wrapper around GET /api/graph/subgraph.
 * Kept decoupled from ViewModels to ensure pure network testability.
 * Hard limit: <= 300 LOC.
 */

import { SubgraphPayload, SubgraphQueryOptions } from '../types/graph.js';

export async function fetchSubgraph(
  options: SubgraphQueryOptions = {},
  fetchFn: typeof fetch = fetch
): Promise<SubgraphPayload> {
  const params = new URLSearchParams();
  if (options.centerNodeId) params.set('centerNodeId', options.centerNodeId);
  if (options.maxHops) params.set('hops', String(options.maxHops));
  if (options.limit) params.set('limit', String(options.limit));
  if (options.startDate) params.set('startDate', options.startDate);
  if (options.endDate) params.set('endDate', options.endDate);
  if (options.minWeight) params.set('minWeight', String(options.minWeight));
  if (options.categories && options.categories.length > 0) {
    params.set('category', options.categories.join(','));
  }
  if (options.epistemicStates && options.epistemicStates.length > 0) {
    params.set('state', options.epistemicStates.join(','));
  }

  const queryStr = params.toString();
  const endpoint = `/api/graph/subgraph${queryStr ? `?${queryStr}` : ''}`;
  const now = new Date().toISOString();

  try {
    const res = await fetchFn(endpoint);
    if (!res.ok) {
      return {
        nodes: [],
        edges: [],
        totalNodes: 0,
        totalEdges: 0,
        generatedAt: now,
        error: 'Knowledge graph is temporarily unavailable.'
      };
    }
    const data = (await res.json()) as SubgraphPayload;
    return {
      nodes: data.nodes ?? [],
      edges: data.edges ?? [],
      centerNodeId: data.centerNodeId,
      totalNodes: data.totalNodes ?? (data.nodes ? data.nodes.length : 0),
      totalEdges: data.totalEdges ?? (data.edges ? data.edges.length : 0),
      generatedAt: data.generatedAt || now,
      error: data.error
    };
  } catch {
    return {
      nodes: [],
      edges: [],
      totalNodes: 0,
      totalEdges: 0,
      generatedAt: now,
      error: 'Network error loading knowledge graph.'
    };
  }
}
