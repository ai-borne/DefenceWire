import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const migrationsDirectory = resolve(root, 'd1/migrations');

export function createMigratedDatabase(startAfter?: string): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  const names = readdirSync(migrationsDirectory).filter((name) => name.endsWith('.sql')).sort();
  for (const name of names) {
    if (startAfter && name <= startAfter) continue;
    db.exec(readFileSync(resolve(migrationsDirectory, name), 'utf8'));
  }
  return db;
}

export function insertArticle(db: DatabaseSync, id: string, owner: string = 'owner-a'): void {
  db.prepare(`INSERT INTO source_articles
    (id, canonical_url, source_domain, source_owner_key, title, published_at,
     content_hash, first_seen_at, last_seen_at)
    VALUES (?, ?, 'example.com', ?, 'Title', '2026-09-13T00:00:00Z',
            'hash', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z')`)
    .run(id, `https://example.com/${id}`, owner);
}

export function insertCluster(db: DatabaseSync, id: string, articleId?: string): void {
  db.prepare(`INSERT INTO story_clusters
    (id, event_fingerprint, status, first_observed_at, last_observed_at, created_at, updated_at)
    VALUES (?, 'event-v1', 'active', '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z',
            '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z')`).run(id);
  if (articleId) {
    db.prepare(`INSERT INTO cluster_sources
      (cluster_id, source_article_id, coverage_role, source_authority, attached_at)
      VALUES (?, ?, 'primary', 'trusted', '2026-09-13T00:00:00Z')`).run(id, articleId);
    db.prepare('UPDATE story_clusters SET primary_source_article_id = ? WHERE id = ?').run(articleId, id);
  }
}

export function insertDecision(
  db: DatabaseSync, decisionId: string, clusterId: string, topicId: string,
  state: string = 'accepted', source: string = 'deterministic'
): void {
  const runId = `run-${decisionId}`;
  db.prepare(`INSERT INTO topic_assignment_runs
    (id, cluster_id, content_fingerprint, registry_version, classifier_version,
     assignment_policy_version, status, started_at, completed_at)
    VALUES (?, ?, ?, 1, 'classifier-v1', 'policy-v1', 'validated',
            '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z')`)
    .run(runId, clusterId, `fingerprint-${decisionId}`);
  db.prepare(`INSERT INTO cluster_topic_decisions
    (id, assignment_run_id, cluster_id, topic_id, role, confidence,
     assignment_source, decision_state, decided_at)
    VALUES (?, ?, ?, ?, 'subject', 0.95, ?, ?, '2026-09-13T00:00:00Z')`)
    .run(decisionId, runId, clusterId, topicId, source, state);
}
