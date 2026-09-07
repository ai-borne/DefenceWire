/**
 * Knowledge Graph & Epistemic Triplet Data Contracts (Phase 2)
 * Defines graph nodes, directed semantic edges, truth states,
 * predicates, and subgraph query structures.
 * Hard limit: <= 300 LOC.
 */

export type EpistemicState =
  | 'CONFIRMED'
  | 'CONTESTED'
  | 'SUPERSEDED'
  | 'DISPUTED'
  | 'RETRACTED';

export type PredicateType =
  | 'DEPLOYED_TO'
  | 'CONNECTED_TO'
  | 'PROCURES'
  | 'TESTED_AT'
  | 'TARGETS'
  | 'DEVELOPED_BY'
  | 'ENGAGED_WITH'
  | 'SUPPLIES'
  | 'INTERCEPTED'
  | 'COLLABORATES_WITH';

export type NodeCategory =
  | 'platform'
  | 'threat'
  | 'facility'
  | 'location'
  | 'organization'
  | 'program';

export interface GraphNode {
  id: string;
  label: string;
  category: NodeCategory;
  mentionCount: number;
  degree: number;
  firstSeenAt: string;
  lastSeenAt: string;
  metadata?: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  predicate: PredicateType;
  epistemicState: EpistemicState;
  weight: number;
  clusterId?: string;
  firstObservedAt: string;
  lastObservedAt: string;
  sourceUrl: string;
  contextSnippet?: string;
}

export interface GraphNodeRow {
  id: string;
  label: string;
  category: string;
  mention_count: number;
  degree: number;
  first_seen_at: string;
  last_seen_at: string;
  metadata_json: string | null;
}

export interface GraphEdgeRow {
  id: string;
  source_id: string;
  target_id: string;
  predicate: string;
  epistemic_state: string;
  weight: number;
  cluster_id: string | null;
  first_observed_at: string;
  last_observed_at: string;
  source_url: string;
  context_snippet: string | null;
}

export interface SubgraphQueryOptions {
  centerNodeId?: string;
  maxHops?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  categories?: NodeCategory[];
  epistemicStates?: EpistemicState[];
  minWeight?: number;
}

export interface SubgraphPayload {
  nodes: GraphNode[];
  edges: GraphEdge[];
  centerNodeId?: string;
  totalNodes: number;
  totalEdges: number;
  generatedAt: string;
  error?: string;
}

export interface TripletExtractionResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  extractedCount: number;
  suppressedCount: number;
}

export interface GraphSyncResult {
  syncedNodes: number;
  syncedEdges: number;
  failed: number;
  extracted: TripletExtractionResult;
}
