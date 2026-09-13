// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { createMigratedDatabase, insertArticle, insertCluster, insertDecision } from './topicMigrationTestUtils.js';
import { buildThreadCandidatesStatement } from '../../src/services/threadQueryBuilder.js';

let db: DatabaseSync;
afterEach(() => db?.close());

function setup(): void {
  db = createMigratedDatabase();
  insertArticle(db, 'article-a');
  insertCluster(db, 'cluster-a', 'article-a');
  insertDecision(db, 'decision-india', 'cluster-a', 'india');
  db.prepare(`INSERT INTO cluster_topics VALUES ('cluster-a','india','subject',1,
    'deterministic','decision-india',0,'run-decision-india','v1','now',NULL)`).run();
  db.prepare(`INSERT INTO story_threads VALUES ('th-legacy','Legacy event arc','Legacy',
    'strategic','dormant',501,'2025-01-01','2026-01-01',NULL,NULL,'2025-01-01','2026-01-01')`).run();
  db.prepare(`INSERT INTO thread_topics VALUES ('th-legacy','india','now')`).run();
  db.prepare(`INSERT INTO story_thread_events VALUES ('event-legacy','th-legacy','cluster-a',
    'x1.1.1',501,'Legacy headline','Legacy delta','Official','https://example.com',
    '2026-01-01','[]','now')`).run();
}

describe('Phase 9 thread/topic separation', () => {
  it('allows several unrelated threads under one topic and several topics on one thread', () => {
    setup();
    db.prepare(`INSERT INTO story_threads VALUES ('th-second','Second event arc','Second',
      'strategic','active',1,'2026-01-01','2026-01-01',NULL,NULL,'now','now')`).run();
    db.prepare(`INSERT INTO thread_topics VALUES ('th-second','india','now'), ('th-legacy','iran','now')`).run();
    expect(db.prepare("SELECT COUNT(*) AS count FROM thread_topics WHERE topic_id='india'").get()!.count).toBe(2);
    expect(db.prepare("SELECT COUNT(*) AS count FROM thread_topics WHERE thread_id='th-legacy'").get()!.count).toBe(2);
  });

  it('uses indexed topic candidates without a 100-thread or 500-event correctness limit', () => {
    setup();
    const statement = buildThreadCandidatesStatement(['cluster-a']);
    expect(statement.sql).toContain('thread_topics');
    expect(statement.sql).toContain('cluster_lineage');
    expect(statement.sql).toContain('event_fingerprint');
    expect(statement.sql).toContain("'-180 days'");
    expect(statement.sql).not.toMatch(/LIMIT\s+(100|500)/i);
    expect(db.prepare(statement.sql).all(...statement.params as SQLInputValue[])).toMatchObject([{ id: 'th-legacy' }]);
    expect(db.prepare("SELECT COUNT(*) AS count FROM story_thread_events WHERE thread_id='th-legacy'").get()!.count).toBe(1);
  });

  it('retains an event when its source cluster changes primary article', () => {
    setup();
    insertArticle(db, 'article-b');
    db.prepare("UPDATE cluster_sources SET coverage_role='related' WHERE cluster_id='cluster-a'").run();
    db.prepare("INSERT INTO cluster_sources VALUES ('cluster-a','article-b','primary','official','now')").run();
    db.prepare("UPDATE story_clusters SET primary_source_article_id='article-b' WHERE id='cluster-a'").run();
    expect(db.prepare("SELECT cluster_id FROM story_thread_events WHERE id='event-legacy'").get()!.cluster_id).toBe('cluster-a');
  });
});
