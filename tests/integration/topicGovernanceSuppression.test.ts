// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { createMigratedDatabase } from './topicMigrationTestUtils.js';
import { handleTopicGovernance, type GovernanceDependencies } from '../../src/services/topicGovernanceHandler.js';

const databases: DatabaseSync[] = [];
afterEach(() => databases.splice(0).forEach((db) => db.close()));

function realDeps(db: DatabaseSync): GovernanceDependencies {
  return {
    async runQuery(sql, params) {
      return db.prepare(sql).all(...(params as Array<string | number | null>)) as Record<string, unknown>[];
    },
    async runBatch(statements) {
      db.exec('BEGIN');
      try {
        for (const s of statements) db.prepare(s.sql).run(...(s.params as Array<string | number | null>));
        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    },
    async runWrite(sql, params) {
      const result = db.prepare(sql).run(...(params as Array<string | number | null>));
      return { changes: Number(result.changes) };
    },
    verifyAuth: async () => true
  };
}

function insertAutoPromotedTopic(db: DatabaseSync, topicId: string): void {
  db.prepare(`INSERT INTO topics
    (id, display_name, display_hashtag, topic_type, status, verification_state, display_priority,
     registry_version, first_seen_at, last_seen_at, created_at, updated_at)
    VALUES (?, 'New Base', '#newbase', 'facility', 'active', 'published', 0, 1,
            '2026-09-14T00:00:00Z', '2026-09-14T00:00:00Z', '2026-09-14T00:00:00Z', '2026-09-14T00:00:00Z')`)
    .run(topicId);
}

describe('Phase 13 Stage 4 auto-promoted topic suppression/restore (real D1 schema)', () => {
  it('suppresses an auto-promoted active topic to deprecated, bumps registry_version, and writes exactly one audit record', () => {
    const db = createMigratedDatabase();
    databases.push(db);
    insertAutoPromotedTopic(db, 'new-base');

    const result = handleTopicGovernance(
      { action: 'suppress', expectedVersion: 0, topicId: 'new-base' },
      realDeps(db),
      'cookie',
      'curator@example.com'
    );
    return result.then((r) => {
      expect(r.success).toBe(true);
      const topic = db.prepare('SELECT status, verification_state, registry_version FROM topics WHERE id = ?').get('new-base') as
        { status: string; verification_state: string; registry_version: number };
      expect(topic.status).toBe('deprecated');
      expect(topic.verification_state).toBe('rejected');
      expect(topic.registry_version).toBe(2);
      const audits = db.prepare("SELECT action FROM topic_curation_audit WHERE topic_id = ?").all('new-base') as { action: string }[];
      expect(audits).toHaveLength(1);
      expect(audits[0]!.action).toBe('reject');
    });
  });

  it('restores a suppressed topic back to active/published and preserves both audit records', async () => {
    const db = createMigratedDatabase();
    databases.push(db);
    insertAutoPromotedTopic(db, 'new-base');
    const suppressed = await handleTopicGovernance({ action: 'suppress', expectedVersion: 0, topicId: 'new-base' }, realDeps(db), 'cookie', 'curator@example.com');
    expect(suppressed.success).toBe(true);

    const restored = await handleTopicGovernance({ action: 'restore', expectedVersion: 1, topicId: 'new-base' }, realDeps(db), 'cookie', 'curator@example.com');
    expect(restored.success).toBe(true);
    const topic = db.prepare('SELECT status, verification_state, registry_version FROM topics WHERE id = ?').get('new-base') as
      { status: string; verification_state: string; registry_version: number };
    expect(topic.status).toBe('active');
    expect(topic.verification_state).toBe('published');
    expect(topic.registry_version).toBe(3);
    const audits = db.prepare("SELECT action FROM topic_curation_audit WHERE topic_id = ? ORDER BY created_at").all('new-base') as { action: string }[];
    expect(audits.map((a) => a.action)).toEqual(['reject', 'approve']);
  });

  it('rejects a second concurrent suppress attempt using a stale version instead of silently double-applying it', async () => {
    const db = createMigratedDatabase();
    databases.push(db);
    insertAutoPromotedTopic(db, 'new-base');
    const first = await handleTopicGovernance({ action: 'suppress', expectedVersion: 0, topicId: 'new-base' }, realDeps(db), 'cookie', 'curator-a@example.com');
    expect(first.success).toBe(true);

    const second = await handleTopicGovernance({ action: 'suppress', expectedVersion: 0, topicId: 'new-base' }, realDeps(db), 'cookie', 'curator-b@example.com');
    expect(second.error).toMatch(/Conflict/);
    const audits = db.prepare("SELECT action FROM topic_curation_audit WHERE topic_id = ?").all('new-base') as { action: string }[];
    expect(audits).toHaveLength(1);
  });

  it("the schema's own lifecycle trigger blocks a direct active-to-provisional transition, which is why suppress targets 'deprecated' instead", () => {
    const db = createMigratedDatabase();
    databases.push(db);
    insertAutoPromotedTopic(db, 'new-base');
    expect(() => db.prepare("UPDATE topics SET status='provisional' WHERE id='new-base'").run())
      .toThrow(/invalid topic lifecycle transition/);
  });
});
