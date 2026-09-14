// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { createMigratedDatabase, insertArticle, insertCluster, insertDecision } from './topicMigrationTestUtils.js';
import { buildPublishedTopicsStatement } from '../../crawler/publicTopicProjection.js';

const databases: DatabaseSync[] = [];
afterEach(() => databases.splice(0).forEach((db) => db.close()));

function insertTopic(
  db: DatabaseSync, id: string, hashtag: string, displayPriority: number,
  status: string = 'active', verificationState: string = 'published'
): void {
  db.prepare(`INSERT INTO topics
    (id, display_name, display_hashtag, topic_type, status, verification_state, display_priority,
     registry_version, first_seen_at, last_seen_at, created_at, updated_at)
    VALUES (?, ?, ?, 'country', ?, ?, ?, 1,
            '2026-09-14T00:00:00Z', '2026-09-14T00:00:00Z', '2026-09-14T00:00:00Z', '2026-09-14T00:00:00Z')`)
    .run(id, id, hashtag, status, verificationState, displayPriority);
}

function insertClusterTopic(db: DatabaseSync, clusterId: string, topicId: string, decisionId: string): void {
  db.prepare(`INSERT INTO cluster_topics
    (cluster_id, topic_id, role, confidence, assignment_source, source_decision_id, assignment_run_id, classifier_version, assigned_at)
    VALUES (?, ?, 'subject', 0.9, 'deterministic', ?, ?, 'classifier-v1', '2026-09-14T00:00:00Z')`)
    .run(clusterId, topicId, decisionId, `run-${decisionId}`);
}

function run(db: DatabaseSync, clusterIds: string[]): Record<string, unknown>[] {
  const statement = buildPublishedTopicsStatement(clusterIds);
  return db.prepare(statement.sql).all(...(statement.params as string[])) as Record<string, unknown>[];
}

describe('Phase 13 Stage 7 published topic feed projection (real D1 schema)', () => {
  it('joins the pre-seeded #India taxonomy row into the assigned-story path, ordered by stored display priority', () => {
    const db = createMigratedDatabase();
    databases.push(db);
    insertArticle(db, 'article-a');
    insertCluster(db, 'cluster-a', 'article-a');
    insertTopic(db, 'lac-watch', '#LacWatch', 4);
    insertDecision(db, 'decision-india', 'cluster-a', 'india');
    insertDecision(db, 'decision-lac', 'cluster-a', 'lac-watch');
    insertClusterTopic(db, 'cluster-a', 'india', 'decision-india');
    insertClusterTopic(db, 'cluster-a', 'lac-watch', 'decision-lac');

    const rows = run(db, ['cluster-a']);
    expect(rows.map((row) => row.id)).toEqual(['india', 'lac-watch']);
  });

  it('breaks equal display priority ties by ascending canonical ID', () => {
    const db = createMigratedDatabase();
    databases.push(db);
    insertArticle(db, 'article-a');
    insertCluster(db, 'cluster-a', 'article-a');
    insertTopic(db, 'zulu', '#Zulu', 5);
    insertTopic(db, 'alpha', '#Alpha', 5);
    insertDecision(db, 'decision-zulu', 'cluster-a', 'zulu');
    insertDecision(db, 'decision-alpha', 'cluster-a', 'alpha');
    insertClusterTopic(db, 'cluster-a', 'zulu', 'decision-zulu');
    insertClusterTopic(db, 'cluster-a', 'alpha', 'decision-alpha');

    const rows = run(db, ['cluster-a']);
    expect(rows.map((row) => row.id)).toEqual(['alpha', 'zulu']);
  });

  it('excludes a membership once its topic is downgraded after assignment, even though cluster_topics keeps the row', () => {
    const db = createMigratedDatabase();
    databases.push(db);
    insertArticle(db, 'article-a');
    insertCluster(db, 'cluster-a', 'article-a');
    insertTopic(db, 'legacy-base', '#LegacyBase', 3);
    insertDecision(db, 'decision-legacy', 'cluster-a', 'legacy-base');
    insertClusterTopic(db, 'cluster-a', 'legacy-base', 'decision-legacy');

    expect(run(db, ['cluster-a']).map((row) => row.id)).toEqual(['legacy-base']);

    db.prepare("UPDATE topics SET status = 'deprecated', verification_state = 'rejected' WHERE id = 'legacy-base'").run();

    expect(run(db, ['cluster-a'])).toEqual([]);
  });

  it('refuses at the schema level to materialize a membership for a non-accepted decision', () => {
    const db = createMigratedDatabase();
    databases.push(db);
    insertArticle(db, 'article-a');
    insertCluster(db, 'cluster-a', 'article-a');
    insertTopic(db, 'shadowed', '#Shadowed', 3);
    insertDecision(db, 'decision-shadow', 'cluster-a', 'shadowed', 'shadow');

    expect(() => insertClusterTopic(db, 'cluster-a', 'shadowed', 'decision-shadow'))
      .toThrow('effective topic must be published and accepted');
  });

  it('scopes results per cluster within a single batched query, with no per-card query', () => {
    const db = createMigratedDatabase();
    databases.push(db);
    insertArticle(db, 'article-a');
    insertArticle(db, 'article-b');
    insertCluster(db, 'cluster-a', 'article-a');
    insertCluster(db, 'cluster-b', 'article-b');
    insertTopic(db, 'sortie-alpha', '#SortieAlpha', 9);
    insertTopic(db, 'sortie-bravo', '#SortieBravo', 9);
    insertDecision(db, 'decision-alpha', 'cluster-a', 'sortie-alpha');
    insertDecision(db, 'decision-bravo', 'cluster-b', 'sortie-bravo');
    insertClusterTopic(db, 'cluster-a', 'sortie-alpha', 'decision-alpha');
    insertClusterTopic(db, 'cluster-b', 'sortie-bravo', 'decision-bravo');

    const rows = run(db, ['cluster-a', 'cluster-b']);
    expect(rows).toEqual([
      expect.objectContaining({ cluster_id: 'cluster-a', id: 'sortie-alpha' }),
      expect.objectContaining({ cluster_id: 'cluster-b', id: 'sortie-bravo' })
    ]);
  });
});
