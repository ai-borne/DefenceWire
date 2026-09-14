// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { createMigratedDatabase, insertArticle, insertCluster, insertDecision } from './topicMigrationTestUtils.js';
import {
  buildProvisionalTopicsStatement, buildPendingCandidatesStatement, buildAliasCollisionsStatement,
  buildNearDuplicateCandidatesStatement, buildAssignmentDisagreementsStatement,
  buildCandidateEvidenceStatement, buildSourceIndependenceStatement, buildAssignmentDiffStatement
} from '../../src/services/topicGovernanceQueryBuilder.js';

const databases: DatabaseSync[] = [];
afterEach(() => databases.splice(0).forEach((db) => db.close()));

function run(db: DatabaseSync, statement: { sql: string; params: unknown[] }): Record<string, unknown>[] {
  return db.prepare(statement.sql).all(...(statement.params as Array<string | number>)) as Record<string, unknown>[];
}

function insertTopic(db: DatabaseSync, id: string, status: string, hashtag: string): void {
  db.prepare(`INSERT INTO topics
    (id, display_name, display_hashtag, topic_type, status, verification_state, display_priority,
     registry_version, first_seen_at, last_seen_at, created_at, updated_at)
    VALUES (?, ?, ?, 'facility', ?, ?, 0, 1, '2026-09-14T00:00:00Z', '2026-09-14T00:00:00Z',
            '2026-09-14T00:00:00Z', '2026-09-14T00:00:00Z')`)
    .run(id, id, hashtag, status, status === 'active' ? 'published' : 'provisional');
}

function insertCandidate(db: DatabaseSync, id: string, normalizedName: string): void {
  db.prepare(`INSERT INTO topic_candidates (id, normalized_name, proposed_display_name, legacy_source, status, created_at)
    VALUES (?, ?, ?, 'runtime_discovery', 'pending', '2026-09-14T00:00:00Z')`)
    .run(id, normalizedName, normalizedName);
}

function insertAlias(db: DatabaseSync, topicId: string, normalizedAlias: string, requiresContext: 0 | 1): void {
  db.prepare(`INSERT INTO topic_aliases (normalized_alias, topic_id, alias_type, requires_context, context_rule_json, verification_state, created_at)
    VALUES (?, ?, 'canonical', ?, ?, 'verified', '2026-09-14T00:00:00Z')`)
    .run(normalizedAlias, topicId, requiresContext, requiresContext ? '{"sense":"test"}' : null);
}

describe('Phase 13 Stage 4 curator review-queue read models (real D1 schema)', () => {
  it('lists provisional topics', () => {
    const db = createMigratedDatabase(); databases.push(db);
    insertTopic(db, 'new-base', 'provisional', '#newbase');
    insertTopic(db, 'old-base', 'active', '#oldbase');
    const rows = run(db, buildProvisionalTopicsStatement());
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe('new-base');
  });

  it('lists pending candidates with their evidence counts', () => {
    const db = createMigratedDatabase(); databases.push(db);
    insertArticle(db, 'article-a');
    insertCluster(db, 'cluster-a', 'article-a');
    insertCandidate(db, 'candidate-a', 'new base');
    db.prepare(`INSERT INTO topic_candidate_evidence (candidate_id, source_article_id, cluster_id, evidence_start, evidence_end, evidence_content_hash, observed_at)
      VALUES ('candidate-a', 'article-a', 'cluster-a', 0, 8, 'hash', '2026-09-14T00:00:00Z')`).run();
    const rows = run(db, buildPendingCandidatesStatement());
    expect(rows).toHaveLength(1);
    expect(rows[0]!.evidence_count).toBe(1);
  });

  it('flags a normalized alias claimed by two topics under context rules, but not a single-topic contextual alias', () => {
    const db = createMigratedDatabase(); databases.push(db);
    insertTopic(db, 'india-test', 'active', '#india');
    insertTopic(db, 'sc-office', 'active', '#scoffice');
    insertTopic(db, 'sc-agency', 'active', '#scagency');
    insertAlias(db, 'india-test', 'lac', 1);
    insertAlias(db, 'sc-office', 'sc', 1);
    insertAlias(db, 'sc-agency', 'sc', 1);
    const rows = run(db, buildAliasCollisionsStatement()) as { normalized_alias: string; topic_count: number }[];
    const scRow = rows.find((r) => r.normalized_alias === 'sc');
    expect(scRow?.topic_count).toBe(2);
    expect(rows.find((r) => r.normalized_alias === 'lac')).toBeUndefined();
  });

  it('flags a pending candidate whose name already exists as an alias of another topic', () => {
    const db = createMigratedDatabase(); databases.push(db);
    insertTopic(db, 'india-test', 'active', '#india');
    insertAlias(db, 'india-test', 'bharat', 0);
    insertCandidate(db, 'candidate-dup', 'bharat');
    insertCandidate(db, 'candidate-new', 'genuinely new base');
    const rows = run(db, buildNearDuplicateCandidatesStatement());
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe('candidate-dup');
    expect(rows[0]!.matches_topic_id).toBe('india-test');
  });

  it('flags a shadow decision that disagrees with the currently accepted live role, but not one that agrees', () => {
    const db = createMigratedDatabase(); databases.push(db);
    insertTopic(db, 'india-test', 'active', '#india');
    insertArticle(db, 'article-a');
    insertCluster(db, 'cluster-a', 'article-a');
    insertDecision(db, 'decision-accepted', 'cluster-a', 'india-test', 'accepted', 'deterministic');
    db.prepare(`INSERT INTO cluster_topics (cluster_id, topic_id, role, confidence, assignment_source, source_decision_id, assignment_run_id, classifier_version, assigned_at)
      VALUES ('cluster-a', 'india-test', 'subject', 0.95, 'deterministic', 'decision-accepted', 'run-decision-accepted', 'classifier-v1', '2026-09-14T00:00:00Z')`).run();
    db.prepare(`INSERT INTO topic_assignment_runs (id, cluster_id, content_fingerprint, registry_version, classifier_version, assignment_policy_version, status, started_at, completed_at)
      VALUES ('run-decision-shadow', 'cluster-a', 'fingerprint-shadow', 1, 'classifier-v2', 'policy-v1', 'validated', '2026-09-14T00:00:00Z', '2026-09-14T00:00:00Z')`).run();
    db.prepare(`INSERT INTO cluster_topic_decisions (id, assignment_run_id, cluster_id, topic_id, role, confidence, assignment_source, decision_state, decided_at)
      VALUES ('decision-shadow', 'run-decision-shadow', 'cluster-a', 'india-test', 'actor', 0.8, 'model', 'shadow', '2026-09-14T01:00:00Z')`).run();
    const rows = run(db, buildAssignmentDisagreementsStatement());
    expect(rows).toHaveLength(1);
    expect(rows[0]!.shadow_role).toBe('actor');
    expect(rows[0]!.accepted_role).toBe('subject');
  });

  it('returns bounded candidate evidence joined to its source article', () => {
    const db = createMigratedDatabase(); databases.push(db);
    insertArticle(db, 'article-a', 'owner-a');
    insertCluster(db, 'cluster-a', 'article-a');
    insertCandidate(db, 'candidate-a', 'new base');
    db.prepare(`INSERT INTO topic_candidate_evidence (candidate_id, source_article_id, cluster_id, evidence_start, evidence_end, evidence_content_hash, observed_at)
      VALUES ('candidate-a', 'article-a', 'cluster-a', 0, 8, 'hash', '2026-09-14T00:00:00Z')`).run();
    const rows = run(db, buildCandidateEvidenceStatement('candidate-a'));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.title).toBe('Title');
    expect(rows[0]!.source_owner_key).toBe('owner-a');
  });

  it('computes source-independence corroboration counts for a topic', () => {
    const db = createMigratedDatabase(); databases.push(db);
    insertTopic(db, 'india-test', 'active', '#india');
    insertArticle(db, 'article-a', 'owner-a');
    insertArticle(db, 'article-b', 'owner-b');
    insertCluster(db, 'cluster-a', 'article-a');
    insertCluster(db, 'cluster-b', 'article-b');
    const pairs: Array<[string, string]> = [['article-a', 'cluster-a'], ['article-b', 'cluster-b']];
    for (const [article, cluster] of pairs) {
      db.prepare(`INSERT INTO topic_assignment_runs (id, cluster_id, content_fingerprint, registry_version, classifier_version, assignment_policy_version, status, started_at, completed_at)
        VALUES (?, ?, ?, 1, 'classifier-v1', 'policy-v1', 'validated', '2026-09-14T00:00:00Z', '2026-09-14T00:00:00Z')`).run(`run-${cluster}`, cluster, `fingerprint-${cluster}`);
      db.prepare(`INSERT INTO article_topic_mentions (topic_id, cluster_id, source_article_id, mention_kind, evidence_start, evidence_end, evidence_content_hash, extraction_run_id, observed_at)
        VALUES ('india-test', ?, ?, 'exact', 0, 8, 'hash', ?, '2026-09-14T00:00:00Z')`).run(cluster, article, `run-${cluster}`);
    }
    const rows = run(db, buildSourceIndependenceStatement('india-test'));
    expect(rows[0]!.mention_count).toBe(2);
    expect(rows[0]!.independent_source_count).toBe(2);
  });

  it('returns the bounded decision history diff for one cluster/topic pair', () => {
    const db = createMigratedDatabase(); databases.push(db);
    insertTopic(db, 'india-test', 'active', '#india');
    insertArticle(db, 'article-a');
    insertCluster(db, 'cluster-a', 'article-a');
    insertDecision(db, 'decision-1', 'cluster-a', 'india-test', 'accepted', 'deterministic');
    const rows = run(db, buildAssignmentDiffStatement('cluster-a', 'india-test'));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.classifier_version).toBe('classifier-v1');
  });
});
