// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import {
  createMigratedDatabase, insertArticle, insertCluster, insertDecision
} from './topicMigrationTestUtils.js';
import { buildResolveTopicRedirectStatement } from '../../src/services/topicQueryBuilder.js';
import { buildResolveClusterRedirectStatement } from '../../src/services/durableRegistryQueryBuilder.js';

let db: DatabaseSync;
afterEach(() => db?.close());

function setup(): void {
  db = createMigratedDatabase();
  insertArticle(db, 'article-a');
  insertCluster(db, 'cluster-a', 'article-a');
}

describe('topic registry constraints', () => {
  it('enforces foreign keys and controlled topic values', () => {
    setup();
    expect(() => db.prepare("INSERT INTO topic_aliases VALUES ('ghost','missing','canonical',0,NULL,'published','now')").run())
      .toThrow(/FOREIGN KEY/);
    expect(() => db.prepare(`INSERT INTO topics
      (id, display_name, display_hashtag, topic_type, status, verification_state,
       registry_version, first_seen_at, last_seen_at, created_at, updated_at)
      VALUES ('bad', 'Bad', '#Bad', 'invented', 'active', 'published', 1, 'a', 'a', 'a', 'a')`).run())
      .toThrow(/CHECK constraint/);
  });

  it('rejects duplicate unconditional aliases but permits contextual ambiguity', () => {
    setup();
    expect(() => db.prepare(`INSERT INTO topic_aliases
      VALUES ('lac','india','spelling',0,NULL,'verified','now')`).run()).toThrow(/UNIQUE/);
    db.prepare(`INSERT INTO topic_aliases
      VALUES ('jaguar','india','spelling',1,'{"sense":"country"}','verified','now')`).run();
    db.prepare(`INSERT INTO topic_aliases
      VALUES ('jaguar','china','spelling',1,'{"sense":"platform"}','verified','now')`).run();
    expect(db.prepare("SELECT COUNT(*) AS count FROM topic_aliases WHERE normalized_alias='jaguar'").get()!.count).toBe(2);
  });

  it('rejects redirect cycles and invalid lifecycle transitions', () => {
    setup();
    db.prepare("UPDATE topics SET status='merged', verification_state='verified', replaced_by_topic_id='china' WHERE id='india'").run();
    expect(() => db.prepare("UPDATE topics SET status='merged', verification_state='verified', replaced_by_topic_id='india' WHERE id='china'").run())
      .toThrow(/redirect cycle/);
    expect(() => db.prepare("UPDATE topics SET status='provisional', verification_state='provisional' WHERE id='iran'").run())
      .toThrow(/lifecycle transition/);
  });

  it('resolves a valid topic redirect to its active canonical record', () => {
    setup();
    db.prepare("UPDATE topics SET status='merged', verification_state='verified', replaced_by_topic_id='china' WHERE id='india'").run();
    const statement = buildResolveTopicRedirectStatement('india');
    expect(db.prepare(statement.sql).get(...statement.params as SQLInputValue[])!.id).toBe('china');
  });

  it('rejects implication cycles and unbounded traversal', () => {
    setup();
    db.prepare("INSERT INTO topic_implication_rules VALUES ('india','china','{}',1,'verified')").run();
    expect(() => db.prepare("INSERT INTO topic_implication_rules VALUES ('china','india','{}',1,'verified')").run())
      .toThrow(/implication cycle/);
    expect(() => db.prepare("INSERT INTO topic_implication_rules VALUES ('iran','jordan','{}',6,'verified')").run())
      .toThrow(/CHECK constraint/);
  });
});

describe('durable identity and evidence constraints', () => {
  it('keeps cluster identity stable when its attached primary changes', () => {
    setup();
    insertArticle(db, 'article-b');
    db.prepare(`UPDATE cluster_sources SET coverage_role='related'
      WHERE cluster_id='cluster-a' AND source_article_id='article-a'`).run();
    db.prepare(`INSERT INTO cluster_sources VALUES
      ('cluster-a','article-b','primary','official','2026-09-13')`).run();
    db.prepare("UPDATE story_clusters SET primary_source_article_id='article-b' WHERE id='cluster-a'").run();
    expect(db.prepare("SELECT id FROM story_clusters WHERE primary_source_article_id='article-b'").get()!.id).toBe('cluster-a');
  });

  it('records merge and split lineage without orphan references', () => {
    setup();
    insertCluster(db, 'cluster-b');
    insertCluster(db, 'cluster-c');
    db.prepare("INSERT INTO cluster_lineage VALUES ('cluster-a','cluster-b','merge','dedupe','2026-09-13')").run();
    db.prepare("INSERT INTO cluster_lineage VALUES ('cluster-a','cluster-c','split','distinct event','2026-09-13')").run();
    expect(db.prepare('SELECT COUNT(*) AS count FROM cluster_lineage').get()!.count).toBe(2);
    expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  });

  it('resolves cluster redirects while retaining the predecessor', () => {
    setup();
    insertCluster(db, 'cluster-b');
    db.prepare("UPDATE story_clusters SET status='merged', merged_into_cluster_id='cluster-b' WHERE id='cluster-a'").run();
    const statement = buildResolveClusterRedirectStatement('cluster-a');
    expect(db.prepare(statement.sql).get(...statement.params as SQLInputValue[])!.id).toBe('cluster-b');
    expect(db.prepare("SELECT COUNT(*) AS count FROM story_clusters WHERE id='cluster-a'").get()!.count).toBe(1);
  });

  it('validates evidence offsets and derives independent owners from evidence rows', () => {
    setup();
    insertArticle(db, 'article-b', 'owner-a');
    insertArticle(db, 'article-c', 'owner-c');
    db.prepare(`INSERT INTO topic_assignment_runs VALUES
      ('extract','cluster-a','evidence-fingerprint',1,'extractor-v1','policy-v1',NULL,
       'validated','2026-09-13', '2026-09-13')`).run();
    for (const id of ['article-b', 'article-c']) {
      db.prepare(`INSERT INTO article_topic_mentions VALUES
        ('india','cluster-a',?,'exact',0,5,'hash','extract','2026-09-13')`).run(id);
    }
    db.prepare(`INSERT INTO article_topic_mentions VALUES
      ('india','cluster-a','article-a','exact',0,5,'hash','extract','2026-09-13')`).run();
    const count = db.prepare("SELECT * FROM topic_corroboration_counts WHERE topic_id='india'").get()!;
    expect(count).toMatchObject({ mention_count: 3, independent_source_count: 2 });
    expect(() => db.prepare(`INSERT INTO article_topic_mentions VALUES
      ('china','cluster-a','article-a','exact',7,2,'hash','extract','now')`).run()).toThrow(/CHECK constraint/);
  });
});

describe('effective assignment isolation', () => {
  it('admits only accepted decisions for published active topics', () => {
    setup();
    insertDecision(db, 'decision-ok', 'cluster-a', 'india');
    db.prepare(`INSERT INTO cluster_topics VALUES
      ('cluster-a','india','subject',0.95,'deterministic','decision-ok',0,
       'run-decision-ok','classifier-v1','2026-09-13',NULL)`).run();
    insertDecision(db, 'decision-shadow', 'cluster-a', 'china', 'shadow');
    expect(() => db.prepare(`INSERT INTO cluster_topics VALUES
      ('cluster-a','china','subject',0.5,'deterministic','decision-shadow',0,
       'run-decision-shadow','classifier-v1','2026-09-13',NULL)`).run()).toThrow(/published and accepted/);
  });

  it('keeps provisional, rejected, suppressed, and superseded history private', () => {
    setup();
    db.prepare(`INSERT INTO topics
      (id,display_name,display_hashtag,topic_type,status,verification_state,registry_version,
       first_seen_at,last_seen_at,created_at,updated_at)
      VALUES ('candidate','Candidate','#Candidate','facility','provisional','provisional',1,'a','a','a','a')`).run();
    insertDecision(db, 'decision-provisional', 'cluster-a', 'candidate');
    expect(() => db.prepare(`INSERT INTO cluster_topics VALUES
      ('cluster-a','candidate','facility',0.9,'deterministic','decision-provisional',0,
       'run-decision-provisional','v1','now',NULL)`).run()).toThrow(/published and accepted/);
    for (const state of ['rejected', 'suppressed', 'superseded']) {
      insertDecision(db, `decision-${state}`, 'cluster-a', 'iran', state);
    }
    expect(db.prepare("SELECT COUNT(*) AS count FROM cluster_topic_decisions WHERE decision_state != 'accepted'").get()!.count).toBe(3);
    expect(db.prepare('SELECT COUNT(*) AS count FROM cluster_topics').get()!.count).toBe(0);
  });

  it('prevents ingestion-style overwrite or deletion of curator locks', () => {
    setup();
    insertDecision(db, 'decision-lock', 'cluster-a', 'india', 'accepted', 'curator');
    db.prepare(`INSERT INTO cluster_topics VALUES
      ('cluster-a','india','subject',1,'curator','decision-lock',1,
       'run-decision-lock','curator','2026-09-13','2026-09-13')`).run();
    expect(() => db.prepare("UPDATE cluster_topics SET locked_by_curator=0 WHERE cluster_id='cluster-a'").run())
      .toThrow(/curator-locked/);
    expect(() => db.prepare("DELETE FROM cluster_topics WHERE cluster_id='cluster-a'").run())
      .toThrow(/curator-locked/);
  });

  it('allows an audited curator unlock before removal', () => {
    setup();
    insertDecision(db, 'decision-unlock', 'cluster-a', 'india', 'accepted', 'curator');
    db.prepare(`INSERT INTO cluster_topics VALUES
      ('cluster-a','india','subject',1,'curator','decision-unlock',1,
       'run-decision-unlock','curator','2026-09-13','2026-09-13')`).run();
    db.prepare(`INSERT INTO topic_curation_audit
      (id,topic_id,cluster_id,action,curator_email,expected_version,created_at)
      VALUES ('audit-unlock','india','cluster-a','unlock','curator@example.com',1,'2026-09-14')`).run();
    db.prepare(`UPDATE cluster_topics SET locked_by_curator=0, reviewed_at='2026-09-14'
      WHERE cluster_id='cluster-a' AND topic_id='india'`).run();
    db.prepare("DELETE FROM cluster_topics WHERE cluster_id='cluster-a' AND topic_id='india'").run();
    expect(db.prepare('SELECT COUNT(*) AS count FROM cluster_topics').get()!.count).toBe(0);
  });
});
