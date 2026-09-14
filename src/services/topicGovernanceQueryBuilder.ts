/**
 * Curator-only read models for the Topic Governance review queues: bounded
 * SQL builders returning {sql, params}, shared by the read handler below and
 * its tests. Nothing here is reachable from the public topic read API
 * (src/services/topicReadHandler.ts) — these queries surface non-published
 * and pending state deliberately, which the public API must never do.
 */
import { D1Statement } from '../archive/d1QueryBuilder.js';

const QUEUE_PAGE_SIZE = 50;
const EVIDENCE_PAGE_SIZE = 20;
const HISTORY_PAGE_SIZE = 20;

export function buildProvisionalTopicsStatement(limit: number = QUEUE_PAGE_SIZE): D1Statement {
  return {
    sql: `SELECT id, display_name, topic_type, registry_version, first_seen_at, last_seen_at
          FROM topics WHERE status = 'provisional' ORDER BY last_seen_at DESC LIMIT ?`,
    params: [limit]
  };
}

export function buildPendingCandidatesStatement(limit: number = QUEUE_PAGE_SIZE): D1Statement {
  return {
    sql: `SELECT c.id, c.normalized_name, c.proposed_display_name, c.proposed_topic_type,
                 c.legacy_source, c.created_at,
                 (SELECT COUNT(*) FROM topic_candidate_evidence e WHERE e.candidate_id = c.id) AS evidence_count
          FROM topic_candidates c WHERE c.status = 'pending' ORDER BY c.created_at DESC LIMIT ?`,
    params: [limit]
  };
}

/**
 * Contextual aliases (requires_context=1) are the only aliases the schema
 * lets share one normalized_alias across topics — the unique index only
 * blocks unconditional collisions. A string claimed by 2+ topics under
 * context rules is exactly the ambiguous case a curator should double-check.
 */
export function buildAliasCollisionsStatement(limit: number = QUEUE_PAGE_SIZE): D1Statement {
  return {
    sql: `SELECT normalized_alias, COUNT(DISTINCT topic_id) AS topic_count, GROUP_CONCAT(DISTINCT topic_id) AS topic_ids
          FROM topic_aliases WHERE requires_context = 1 AND verification_state != 'rejected'
          GROUP BY normalized_alias HAVING COUNT(DISTINCT topic_id) > 1
          ORDER BY topic_count DESC LIMIT ?`,
    params: [limit]
  };
}

/**
 * No dedicated near-duplicate table exists in the schema. This surfaces the
 * practically-actionable proxy: a pending candidate whose normalized_name
 * already matches an existing topic's alias — i.e. it is likely a mention of
 * an existing topic rather than a genuinely new one, and approving it as a
 * new topic would create a duplicate.
 */
export function buildNearDuplicateCandidatesStatement(limit: number = QUEUE_PAGE_SIZE): D1Statement {
  return {
    sql: `SELECT c.id, c.normalized_name, c.proposed_display_name, a.topic_id AS matches_topic_id
          FROM topic_candidates c
          JOIN topic_aliases a ON a.normalized_alias = c.normalized_name AND a.verification_state != 'rejected'
          WHERE c.status = 'pending' ORDER BY c.created_at DESC LIMIT ?`,
    params: [limit]
  };
}

/**
 * A "shadow" decision that disagrees with the currently accepted live role
 * for the same cluster/topic pair is a real classifier disagreement worth a
 * curator's attention, distinct from routine reclassification churn.
 */
export function buildAssignmentDisagreementsStatement(limit: number = QUEUE_PAGE_SIZE): D1Statement {
  return {
    sql: `SELECT d.cluster_id, d.topic_id, d.role AS shadow_role, ct.role AS accepted_role,
                 d.assignment_source AS shadow_source, ct.assignment_source AS accepted_source, d.decided_at
          FROM cluster_topic_decisions d
          JOIN cluster_topics ct ON ct.cluster_id = d.cluster_id AND ct.topic_id = d.topic_id
          WHERE d.decision_state = 'shadow' AND d.role != ct.role
          ORDER BY d.decided_at DESC LIMIT ?`,
    params: [limit]
  };
}

export function buildCandidateEvidenceStatement(candidateId: string, limit: number = EVIDENCE_PAGE_SIZE): D1Statement {
  return {
    sql: `SELECT e.source_article_id, e.cluster_id, e.evidence_start, e.evidence_end, e.evidence_content_hash,
                 e.observed_at, a.title, a.canonical_url, a.source_owner_key
          FROM topic_candidate_evidence e JOIN source_articles a ON a.id = e.source_article_id
          WHERE e.candidate_id = ? ORDER BY e.observed_at DESC LIMIT ?`,
    params: [candidateId, limit]
  };
}

export function buildSourceIndependenceStatement(topicId: string): D1Statement {
  return {
    sql: `SELECT topic_id, mention_count, independent_source_count FROM topic_corroboration_counts WHERE topic_id = ?`,
    params: [topicId]
  };
}

/**
 * The current optimistic-concurrency version for one governed resource, so a
 * curator UI can read-then-submit without racing another curator's edit. No
 * row means the resource has never been mutated through governance — version 0.
 */
export function buildGovernanceVersionStatement(resourceType: string, resourceId: string): D1Statement {
  return {
    sql: `SELECT version FROM topic_governance_versions WHERE resource_type = ? AND resource_id = ?`,
    params: [resourceType, resourceId]
  };
}

export function buildAssignmentDiffStatement(clusterId: string, topicId: string, limit: number = HISTORY_PAGE_SIZE): D1Statement {
  return {
    sql: `SELECT d.id, d.role, d.confidence, d.assignment_source, d.decision_state, d.decided_at, r.classifier_version
          FROM cluster_topic_decisions d JOIN topic_assignment_runs r ON r.id = d.assignment_run_id
          WHERE d.cluster_id = ? AND d.topic_id = ? ORDER BY d.decided_at DESC LIMIT ?`,
    params: [clusterId, topicId, limit]
  };
}
