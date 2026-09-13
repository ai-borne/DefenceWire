// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createMigratedDatabase } from './topicMigrationTestUtils.js';

const databases: DatabaseSync[] = [];
const migrated = (): DatabaseSync => {
  const db = createMigratedDatabase();
  databases.push(db);
  return db;
};

afterEach(() => databases.splice(0).forEach((db) => db.close()));

describe('Phase 1 D1 migrations', () => {
  it('migrates an empty database and seeds the reviewed registry', () => {
    const db = migrated();
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const names = new Set(tables.map((row) => String(row.name)));
    for (const name of ['ingestion_runs', 'source_articles', 'story_clusters', 'cluster_sources',
      'cluster_lineage', 'topics', 'topic_aliases', 'topic_relations', 'topic_implication_rules',
      'topic_candidates', 'topic_assignment_runs', 'cluster_topic_decisions', 'cluster_topics',
      'article_topic_mentions', 'topic_curation_audit', 'topic_reclassification_queue']) {
      expect(names.has(name), `missing ${name}`).toBe(true);
    }
    expect(db.prepare('SELECT COUNT(*) AS count FROM topics').get()!.count).toBe(29);
    expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  });

  it('upgrades the supported legacy schema without losing its records', () => {
    const db = new DatabaseSync(':memory:');
    databases.push(db);
    db.exec('PRAGMA foreign_keys = ON');
    const root = resolve(import.meta.dirname, '../..');
    db.exec(readFileSync(resolve(root, 'd1/migrations/0001_legacy_core.sql'), 'utf8'));
    db.exec(readFileSync(resolve(root, 'd1/migrations/0002_legacy_graph.sql'), 'utf8'));
    db.prepare(`INSERT INTO canonical_entities
      (id, canonical_tag, first_seen_at, last_seen_at)
      VALUES ('legacy-x', '#LegacyX', '2026-01-01', '2026-01-01')`).run();
    for (const name of ['0003_durable_identity.sql', '0004_topic_registry.sql',
      '0005_topic_assignments.sql', '0006_seed_topic_taxonomy.sql', '0007_durable_ingestion.sql',
      '0008_phase3_topic_corpus_seed.sql']) {
      db.exec(readFileSync(resolve(root, `d1/migrations/${name}`), 'utf8'));
    }
    expect(db.prepare("SELECT canonical_tag FROM canonical_entities WHERE id='legacy-x'").get()!.canonical_tag).toBe('#LegacyX');
    expect(db.prepare("SELECT status FROM topic_candidates WHERE legacy_source_id='legacy-x'").get()!.status).toBe('pending');
    expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  });

  it('keeps schema.sql reproducibly generated from the numbered migrations', () => {
    const root = resolve(import.meta.dirname, '../..');
    const snapshot = readFileSync(resolve(root, 'd1/schema.sql'), 'utf8');
    for (const name of ['0001_legacy_core.sql', '0002_legacy_graph.sql', '0003_durable_identity.sql',
      '0004_topic_registry.sql', '0005_topic_assignments.sql', '0006_seed_topic_taxonomy.sql',
      '0007_durable_ingestion.sql', '0008_phase3_topic_corpus_seed.sql']) {
      expect(snapshot).toContain(`-- Source migration: ${name}`);
      expect(snapshot).toContain(readFileSync(resolve(root, `d1/migrations/${name}`), 'utf8').trim());
    }
  });
});
