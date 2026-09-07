/**
 * Emergent Pattern & Hypothesis Synthesizer Types (Phase 5)
 * Contracts for autonomous pattern detection, hypothesis synthesis,
 * and human-in-the-loop curator review.
 * Hard limit: <= 300 LOC.
 */

export type PatternStatus = 'draft' | 'approved' | 'rejected';

export interface EmergentPattern {
  id: string;
  title: string;
  synthesis: string;
  confidence: number;
  nodeIds: string[];
  clusterIds: string[];
  status: PatternStatus;
  createdAt: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
}

export interface EmergentPatternRow {
  id: string;
  title: string;
  synthesis: string;
  confidence: number;
  node_ids_json: string;
  cluster_ids_json: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface PatternCandidate {
  id: string;
  title: string;
  nodeIds: string[];
  clusterIds: string[];
  confidence: number;
  anchorCategory: string;
  timeWindowHours: number;
  sharedEntities: string[];
  clusterHeadlines: string[];
}

export type PatternReviewActionType = 'approve' | 'reject' | 'edit';

export interface PatternReviewRequest {
  id: string;
  action: PatternReviewActionType;
  title?: string;
  synthesis?: string;
}

export interface PatternReviewResult {
  success: boolean;
  pattern?: EmergentPattern;
  error?: string;
}

export interface PatternListResponse {
  success: boolean;
  patterns: EmergentPattern[];
  total: number;
  error?: string;
}

export interface PatternQueryOptions {
  status?: PatternStatus | 'all';
  limit?: number;
  offset?: number;
}

export interface PatternSyncResult {
  syncedPatterns: number;
  failed: number;
  candidates: PatternCandidate[];
}

/**
 * Transforms a raw SQLite D1 row into a strongly-typed EmergentPattern.
 */
export function patternRowToEmergentPattern(row: EmergentPatternRow): EmergentPattern {
  let nodeIds: string[] = [];
  try {
    nodeIds = JSON.parse(row.node_ids_json || '[]');
  } catch {
    nodeIds = [];
  }

  let clusterIds: string[] = [];
  try {
    clusterIds = JSON.parse(row.cluster_ids_json || '[]');
  } catch {
    clusterIds = [];
  }

  const validStatus: PatternStatus =
    row.status === 'approved' || row.status === 'rejected' ? row.status : 'draft';

  return {
    id: row.id,
    title: row.title,
    synthesis: row.synthesis,
    confidence: Number(row.confidence) || 0.5,
    nodeIds,
    clusterIds,
    status: validStatus,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by
  };
}
