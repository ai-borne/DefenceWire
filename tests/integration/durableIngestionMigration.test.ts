// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createMigratedDatabase, insertArticle, insertCluster, insertDecision } from './topicMigrationTestUtils.js';
import { buildLineageStatements, buildInsertClusterStatement } from '../../crawler/durableIngestQueryBuilder.js';
import { DurableCluster } from '../../crawler/durableIngestTypes.js';
import { StoryCluster } from '../../src/types/news.js';

const databases: DatabaseSync[] = [];
afterEach(() => databases.splice(0).forEach((db) => db.close()));

describe('Phase 2 durable ingestion migration', () => {
  it('enforces the ingestion state machine and unique input fingerprints', () => {
    const db = createMigratedDatabase();
    databases.push(db);
    db.prepare(`INSERT INTO ingestion_runs (id, input_fingerprint, status, started_at)
      VALUES ('run-a', 'fingerprint-a', 'started', '2026-09-13T00:00:00Z')`).run();
    expect(() => db.prepare(`INSERT INTO ingestion_runs (id, input_fingerprint, status, started_at)
      VALUES ('run-b', 'fingerprint-a', 'started', '2026-09-13T00:00:00Z')`).run()).toThrow();
    expect(() => db.prepare("UPDATE ingestion_runs SET status = 'published' WHERE id = 'run-a'").run())
      .toThrow('invalid ingestion run transition');
    for (const stage of ['articles_persisted', 'clusters_persisted', 'classified', 'publishable', 'published']) {
      db.prepare('UPDATE ingestion_runs SET status = ? WHERE id = ?').run(stage, 'run-a');
    }
    expect(db.prepare("SELECT status FROM ingestion_runs WHERE id = 'run-a'").get()!.status).toBe('published');
  });

  it('stores retry manifests and orphan lifecycle records without dangling references', () => {
    const db = createMigratedDatabase();
    databases.push(db);
    db.prepare(`INSERT INTO ingestion_runs (id, input_fingerprint, status, started_at)
      VALUES ('run-a', 'fingerprint-a', 'started', '2026-09-13T00:00:00Z')`).run();
    db.prepare(`INSERT INTO ingestion_cluster_manifest
      (ingestion_run_id, event_fingerprint, payload_hash, cluster_id, payload_key)
      VALUES ('run-a', 'event-a', 'hash-a', 'cluster-a', 'cluster-a.json')`).run();
    insertArticle(db, 'article-a');
    db.prepare(`INSERT INTO ingestion_run_articles
      (ingestion_run_id, source_article_id, content_hash)
      VALUES ('run-a', 'article-a', 'hash-a')`).run();
    db.prepare(`INSERT INTO ingestion_orphan_candidates
      (payload_key, ingestion_run_id, content_hash, detected_at)
      VALUES ('cluster-a.json', 'run-a', 'hash-a', '2026-09-13T00:00:00Z')`).run();
    db.prepare(`UPDATE ingestion_orphan_candidates SET resolution_state = 'adopted',
      resolved_at = '2026-09-13T00:01:00Z' WHERE payload_key = 'cluster-a.json'`).run();
    expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    expect(db.prepare('SELECT resolution_state FROM ingestion_orphan_candidates').get()!.resolution_state)
      .toBe('adopted');
    expect(db.prepare('SELECT COUNT(*) AS count FROM ingestion_run_articles').get()!.count).toBe(1);
    const snapshot = readFileSync(resolve(import.meta.dirname, '../../d1/schema.sql'), 'utf8');
    expect(snapshot).toContain('-- Source migration: 0007_durable_ingestion.sql');
  });

  it('copies curator locks to merge successors while retaining immutable decisions', () => {
    const db = createMigratedDatabase();
    databases.push(db);
    insertArticle(db, 'article-a');
    insertArticle(db, 'article-b');
    insertCluster(db, 'cluster-a', 'article-a');
    insertCluster(db, 'cluster-b', 'article-b');
    insertDecision(db, 'decision-a', 'cluster-a', 'india', 'accepted', 'curator');
    db.prepare(`INSERT INTO cluster_topics
      (cluster_id, topic_id, role, confidence, assignment_source, source_decision_id,
       locked_by_curator, assignment_run_id, classifier_version, assigned_at)
      VALUES ('cluster-a', 'india', 'subject', 1, 'curator', 'decision-a', 1,
              'run-decision-a', 'classifier-v1', '2026-09-13T00:00:00Z')`).run();
    const statements = buildLineageStatements(
      'cluster-a', 'cluster-b', 'merge', 'test merge', '2026-09-13T01:00:00Z');
    db.exec('BEGIN');
    try {
      for (const statement of statements) {
        db.prepare(statement.sql).run(...statement.params as Array<string | number | null | Uint8Array>);
      }
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
    expect(db.prepare(`SELECT locked_by_curator FROM cluster_topics
      WHERE cluster_id = 'cluster-b' AND topic_id = 'india'`).get()!.locked_by_curator).toBe(1);
    expect(db.prepare("SELECT COUNT(*) AS count FROM cluster_topic_decisions WHERE id = 'decision-a'").get()!.count).toBe(1);
    expect(db.prepare("SELECT merged_into_cluster_id FROM story_clusters WHERE id = 'cluster-a'").get()!.merged_into_cluster_id)
      .toBe('cluster-b');
  });

  it('lets the same durable cluster appear in two different runs\' manifests (Phase 13 Stage 2)', () => {
    const db = createMigratedDatabase();
    databases.push(db);
    db.prepare(`INSERT INTO ingestion_runs (id, input_fingerprint, status, started_at)
      VALUES ('run-a', 'fingerprint-a', 'started', '2026-09-13T00:00:00Z')`).run();
    db.prepare(`INSERT INTO ingestion_runs (id, input_fingerprint, status, started_at)
      VALUES ('run-b', 'fingerprint-b', 'started', '2026-09-13T01:00:00Z')`).run();
    db.prepare(`INSERT INTO ingestion_cluster_manifest
      (ingestion_run_id, event_fingerprint, payload_hash, cluster_id, payload_key)
      VALUES ('run-a', 'event-a', 'hash-1', 'cluster-a', 'cluster-a.json')`).run();
    expect(() => db.prepare(`INSERT INTO ingestion_cluster_manifest
      (ingestion_run_id, event_fingerprint, payload_hash, cluster_id, payload_key)
      VALUES ('run-b', 'event-a', 'hash-2', 'cluster-a', 'cluster-a.json')`).run()).not.toThrow();
    expect(() => db.prepare(`INSERT INTO ingestion_cluster_manifest
      (ingestion_run_id, event_fingerprint, payload_hash, cluster_id, payload_key)
      VALUES ('run-b', 'event-c', 'hash-3', 'cluster-a', 'cluster-a.json')`).run())
      .toThrow(/UNIQUE constraint failed/);
  });

  it('never regresses last_observed_at below the stored value on re-observation (production incident 2026-09-14)', () => {
    const db = createMigratedDatabase();
    databases.push(db);
    db.prepare(`INSERT INTO ingestion_runs (id, input_fingerprint, status, started_at)
      VALUES ('run-a', 'fingerprint-a', 'started', '2026-09-01T00:00:00Z')`).run();
    db.prepare(`INSERT INTO ingestion_runs (id, input_fingerprint, status, started_at)
      VALUES ('run-b', 'fingerprint-b', 'started', '2026-09-10T00:00:00Z')`).run();

    const durableCluster = (createdAt: string, updatedAt: string): DurableCluster => ({
      cluster: { createdAt, updatedAt } as StoryCluster,
      id: 'cluster-a', eventFingerprint: 'event-a', payloadKey: 'cluster-a.json',
      payloadHash: 'hash-a', sourceArticleIds: [], previousClusterIds: []
    });

    const insertFirst = buildInsertClusterStatement(
      durableCluster('2026-09-10T00:00:00Z', '2026-09-10T00:00:00Z'), 'run-a', '2026-09-10T00:00:00Z');
    db.prepare(insertFirst.sql).run(...insertFirst.params as Array<string | number | null>);
    expect(db.prepare("SELECT first_observed_at, last_observed_at FROM story_clusters WHERE id = 'cluster-a'").get())
      .toEqual({ first_observed_at: '2026-09-10T00:00:00Z', last_observed_at: '2026-09-10T00:00:00Z' });

    // A later run re-matches the same event fingerprint against a republished/backdated article
    // whose publishedAt predates the cluster's already-established first_observed_at. Blindly
    // overwriting last_observed_at with this run's own (older) value would push it below the
    // immutable first_observed_at and trip the story_clusters CHECK constraint
    // (last_observed_at >= first_observed_at) - exactly the production incident this test locks in.
    const regressed = buildInsertClusterStatement(
      durableCluster('2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z'), 'run-b', '2026-09-10T01:00:00Z');
    expect(() => db.prepare(regressed.sql).run(...regressed.params as Array<string | number | null>)).not.toThrow();
    expect(db.prepare("SELECT last_observed_at FROM story_clusters WHERE id = 'cluster-a'").get()!.last_observed_at)
      .toBe('2026-09-10T00:00:00Z');

    // A genuinely newer observation still advances last_observed_at.
    const advanced = buildInsertClusterStatement(
      durableCluster('2026-09-10T00:00:00Z', '2026-09-12T00:00:00Z'), 'run-b', '2026-09-12T00:00:00Z');
    db.prepare(advanced.sql).run(...advanced.params as Array<string | number | null>);
    expect(db.prepare("SELECT last_observed_at FROM story_clusters WHERE id = 'cluster-a'").get()!.last_observed_at)
      .toBe('2026-09-12T00:00:00Z');
  });
});
