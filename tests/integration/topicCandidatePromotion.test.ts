// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { createMigratedDatabase, insertArticle, insertCluster } from './topicMigrationTestUtils.js';
import { buildProvisionalPromotionStatement } from '../../crawler/topicAssignmentService.js';

const databases: DatabaseSync[] = [];
afterEach(() => databases.splice(0).forEach((db) => db.close()));

function insertProvisionalTopic(db: DatabaseSync, topicId: string): void {
  db.prepare(`INSERT INTO topics
    (id, display_name, display_hashtag, topic_type, status, verification_state, display_priority,
     registry_version, first_seen_at, last_seen_at, created_at, updated_at)
    VALUES (?, 'New Base', '#newbase', 'facility', 'provisional', 'provisional', 0, 1,
            '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z')`)
    .run(topicId);
}

function insertCandidate(db: DatabaseSync, candidateId: string, topicId: string): void {
  db.prepare(`INSERT INTO topic_candidates
    (id, normalized_name, proposed_display_name, legacy_source, status, resolved_topic_id, created_at)
    VALUES (?, 'new base', 'New Base', 'runtime_discovery', 'approved', ?, '2026-09-13T00:00:00Z')`)
    .run(candidateId, topicId);
}

function insertEvidence(db: DatabaseSync, candidateId: string, articleId: string, clusterId: string): void {
  db.prepare(`INSERT INTO topic_candidate_evidence
    (candidate_id, source_article_id, cluster_id, evidence_start, evidence_end, evidence_content_hash, observed_at)
    VALUES (?, ?, ?, 0, 8, 'hash', '2026-09-13T00:00:00Z')`)
    .run(candidateId, articleId, clusterId);
}

describe('Phase 13 Stage 3 provisional-topic promotion', () => {
  it('leaves a provisional topic untouched with only one owner and no authoritative source', () => {
    const db = createMigratedDatabase();
    databases.push(db);
    insertProvisionalTopic(db, 'new-base');
    insertArticle(db, 'article-a', 'owner-a');
    insertCluster(db, 'cluster-a', 'article-a');
    insertCandidate(db, 'candidate-new-base', 'new-base');
    insertEvidence(db, 'candidate-new-base', 'article-a', 'cluster-a');
    const statement = buildProvisionalPromotionStatement(1, '2026-09-13T02:00:00Z');
    db.prepare(statement.sql).run(...statement.params as Array<string | number>);
    const topic = db.prepare('SELECT status, verification_state FROM topics WHERE id = ?').get('new-base') as { status: string; verification_state: string };
    expect(topic.status).toBe('provisional');
    expect(topic.verification_state).toBe('provisional');
  });

  it('promotes a provisional topic once two independent owners have each supplied evidence', () => {
    const db = createMigratedDatabase();
    databases.push(db);
    insertProvisionalTopic(db, 'new-base');
    insertArticle(db, 'article-a', 'owner-a');
    insertArticle(db, 'article-b', 'owner-b');
    insertCluster(db, 'cluster-a', 'article-a');
    insertCluster(db, 'cluster-b', 'article-b');
    insertCandidate(db, 'candidate-new-base', 'new-base');
    insertEvidence(db, 'candidate-new-base', 'article-a', 'cluster-a');
    insertEvidence(db, 'candidate-new-base', 'article-b', 'cluster-b');
    const statement = buildProvisionalPromotionStatement(1, '2026-09-13T02:00:00Z');
    db.prepare(statement.sql).run(...statement.params as Array<string | number>);
    const topic = db.prepare('SELECT status, verification_state, registry_version FROM topics WHERE id = ?').get('new-base') as { status: string; verification_state: string; registry_version: number };
    expect(topic.status).toBe('active');
    expect(topic.verification_state).toBe('published');
    expect(topic.registry_version).toBe(2);
  });

  it('does not promote on two mentions from the same owner (not independent)', () => {
    const db = createMigratedDatabase();
    databases.push(db);
    insertProvisionalTopic(db, 'new-base');
    insertArticle(db, 'article-a', 'owner-a');
    insertArticle(db, 'article-b', 'owner-a');
    insertCluster(db, 'cluster-a', 'article-a');
    insertCluster(db, 'cluster-b', 'article-b');
    insertCandidate(db, 'candidate-new-base', 'new-base');
    insertEvidence(db, 'candidate-new-base', 'article-a', 'cluster-a');
    insertEvidence(db, 'candidate-new-base', 'article-b', 'cluster-b');
    const statement = buildProvisionalPromotionStatement(1, '2026-09-13T02:00:00Z');
    db.prepare(statement.sql).run(...statement.params as Array<string | number>);
    const topic = db.prepare('SELECT status FROM topics WHERE id = ?').get('new-base') as { status: string };
    expect(topic.status).toBe('provisional');
  });

  it('promotes a provisional topic immediately from a single reviewed authoritative (official) source', () => {
    const db = createMigratedDatabase();
    databases.push(db);
    insertProvisionalTopic(db, 'new-base');
    insertArticle(db, 'article-a', 'owner-a');
    db.prepare(`INSERT INTO story_clusters
      (id, event_fingerprint, status, first_observed_at, last_observed_at, created_at, updated_at)
      VALUES ('cluster-a', 'event-v1', 'active', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z',
              '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z')`).run();
    db.prepare(`INSERT INTO cluster_sources
      (cluster_id, source_article_id, coverage_role, source_authority, attached_at)
      VALUES ('cluster-a', 'article-a', 'primary', 'official', '2026-09-13T00:00:00Z')`).run();
    insertCandidate(db, 'candidate-new-base', 'new-base');
    insertEvidence(db, 'candidate-new-base', 'article-a', 'cluster-a');
    const statement = buildProvisionalPromotionStatement(1, '2026-09-13T02:00:00Z');
    db.prepare(statement.sql).run(...statement.params as Array<string | number>);
    const topic = db.prepare('SELECT status, verification_state FROM topics WHERE id = ?').get('new-base') as { status: string; verification_state: string };
    expect(topic.status).toBe('active');
    expect(topic.verification_state).toBe('published');
  });

  it('leaves an already-rejected provisional candidate alone even if a second, unrelated owner later supplies evidence for a different candidate of the same topic id', () => {
    const db = createMigratedDatabase();
    databases.push(db);
    insertProvisionalTopic(db, 'new-base');
    insertArticle(db, 'article-a', 'owner-a');
    insertCluster(db, 'cluster-a', 'article-a');
    insertCandidate(db, 'candidate-new-base', 'new-base');
    insertEvidence(db, 'candidate-new-base', 'article-a', 'cluster-a');
    db.prepare(`UPDATE topic_candidates SET status='rejected', resolved_topic_id=NULL WHERE id='candidate-new-base'`).run();
    const statement = buildProvisionalPromotionStatement(1, '2026-09-13T02:00:00Z');
    db.prepare(statement.sql).run(...statement.params as Array<string | number>);
    const topic = db.prepare('SELECT status FROM topics WHERE id = ?').get('new-base') as { status: string };
    expect(topic.status).toBe('provisional');
  });
});
