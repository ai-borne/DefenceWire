/**
 * D1 Query Builder for Emergent Patterns & Curator Review (Phase 5)
 * Constructs parameterized SQLite queries for listing, upserting, and reviewing pattern hypotheses.
 * Hard limit: <= 300 LOC.
 */

import {
  EmergentPattern,
  PatternQueryOptions,
  PatternReviewRequest
} from '../types/patterns.js';

export interface ParameterizedStatement {
  sql: string;
  params: unknown[];
}

export function buildUpsertPatternStatement(pattern: EmergentPattern): ParameterizedStatement {
  const sql = `
    INSERT INTO emergent_patterns (
      id, title, synthesis, confidence, node_ids_json, cluster_ids_json, status, created_at, reviewed_at, reviewed_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      synthesis = excluded.synthesis,
      confidence = excluded.confidence,
      node_ids_json = excluded.node_ids_json,
      cluster_ids_json = excluded.cluster_ids_json
    WHERE status = 'draft';
  `.trim();

  const params: unknown[] = [
    pattern.id,
    pattern.title,
    pattern.synthesis,
    pattern.confidence,
    JSON.stringify(pattern.nodeIds),
    JSON.stringify(pattern.clusterIds),
    pattern.status || 'draft',
    pattern.createdAt,
    pattern.reviewedAt || null,
    pattern.reviewedBy || null
  ];

  return { sql, params };
}

export function buildListPatternsStatement(options: PatternQueryOptions = {}): ParameterizedStatement {
  const limit = Math.min(Math.max(Number(options.limit) || 50, 1), 200);
  const offset = Math.max(Number(options.offset) || 0, 0);

  const clauses: string[] = [];
  const params: unknown[] = [];

  if (options.status && options.status !== 'all') {
    clauses.push('status = ?');
    params.push(options.status);
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const sql = `
    SELECT id, title, synthesis, confidence, node_ids_json, cluster_ids_json, status, created_at, reviewed_at, reviewed_by
    FROM emergent_patterns
    ${whereClause}
    ORDER BY status = 'draft' DESC, confidence DESC, created_at DESC
    LIMIT ? OFFSET ?;
  `.trim();

  params.push(limit, offset);

  return { sql, params };
}

export function buildGetPatternByIdStatement(id: string): ParameterizedStatement {
  const sql = `
    SELECT id, title, synthesis, confidence, node_ids_json, cluster_ids_json, status, created_at, reviewed_at, reviewed_by
    FROM emergent_patterns
    WHERE id = ?
    LIMIT 1;
  `.trim();

  return { sql, params: [id] };
}

export function buildReviewPatternStatement(
  request: PatternReviewRequest,
  curatorEmail: string,
  nowIso: string = new Date().toISOString()
): ParameterizedStatement {
  const setClauses: string[] = ['reviewed_at = ?', 'reviewed_by = ?'];
  const params: unknown[] = [nowIso, curatorEmail];

  if (request.action === 'approve') {
    setClauses.push("status = 'approved'");
  } else if (request.action === 'reject') {
    setClauses.push("status = 'rejected'");
  }

  if (request.title && request.title.trim()) {
    setClauses.push('title = ?');
    params.push(request.title.trim());
  }

  if (request.synthesis && request.synthesis.trim()) {
    setClauses.push('synthesis = ?');
    params.push(request.synthesis.trim());
  }

  params.push(request.id);

  const sql = `
    UPDATE emergent_patterns
    SET ${setClauses.join(', ')}
    WHERE id = ?;
  `.trim();

  return { sql, params };
}
