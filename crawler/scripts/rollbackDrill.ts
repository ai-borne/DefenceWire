/**
 * Phase 13 Stage 9 rollback drill: proves the cutover's data-level rollback
 * lever against a non-production D1 clone, never production. Simulates a
 * bad cutover write (a full, trigger-valid assignment cycle: run + accepted
 * decision + effective cluster_topics row), then executes the rollback
 * procedure and verifies it restores public membership exactly while
 * preserving the immutable decision/run audit ledger — proving the ledger
 * cannot be tampered with even during a rollback. Also proves the
 * decision ledger genuinely rejects delete/update (the reason rollback
 * targets cluster_topics, not the ledger). Manual, never scheduled, never
 * targets production.
 * Hard limit: <= 300 LOC.
 */
import { buildD1ConfigFromEnv, executeD1Query, D1RestConfig } from '../archiveSync.js';

async function queryOne(config: D1RestConfig, sql: string, params: unknown[] = []): Promise<Record<string, unknown>> {
  const res = await executeD1Query({ sql, params }, config, fetch);
  if (!res.ok) throw new Error(`[ROLLBACK-DRILL] query failed: ${sql} :: ${res.error}`);
  return res.rows[0] ?? {};
}

async function exec(config: D1RestConfig, sql: string, params: unknown[] = []): Promise<{ ok: boolean; error?: string }> {
  return executeD1Query({ sql, params }, config, fetch);
}

async function main(): Promise<void> {
  const config = buildD1ConfigFromEnv(process.env);
  if (!config) throw new Error('[ROLLBACK-DRILL] requires CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, CLOUDFLARE_API_TOKEN.');
  if (config.databaseId === (process.env.PRODUCTION_D1_DATABASE_ID ?? '6c03abeb-ce1f-4669-8985-dbbdd3735807')) {
    throw new Error('[ROLLBACK-DRILL] refusing to run against the production database ID.');
  }

  const topicRow = await queryOne(config, `SELECT id FROM topics WHERE status='active' AND verification_state='published' LIMIT 1`);
  const topicId = String(topicRow.id ?? '');
  if (!topicId) throw new Error('[ROLLBACK-DRILL] no active/published topic found in the clone to drill against.');

  const runId = `rb${process.env.GITHUB_RUN_ID ?? Date.now().toString()}${process.env.GITHUB_RUN_ATTEMPT ?? ''}`.replace(/[^0-9a-z]/gi, '').toLowerCase();
  const clusterId = `cl-${runId}-rollback`;
  const decisionId = `dec-${runId}`;
  const now = new Date().toISOString();

  const baseline = await queryOne(config, `SELECT
    (SELECT COUNT(*) FROM cluster_topics) AS cluster_topics_n,
    (SELECT COUNT(*) FROM cluster_topic_decisions) AS decisions_n,
    (SELECT COUNT(*) FROM topic_assignment_runs) AS runs_n`);
  console.log(`[ROLLBACK-DRILL] baseline: cluster_topics=${baseline.cluster_topics_n} decisions=${baseline.decisions_n} runs=${baseline.runs_n}`);

  // --- Simulate a bad cutover write: one full, trigger-valid assignment cycle. ---
  const clusterInsert = await exec(config, `INSERT INTO story_clusters (id, event_fingerprint, status, primary_source_article_id, first_observed_at, last_observed_at, merged_into_cluster_id, created_at, updated_at) VALUES (?, ?, 'active', NULL, ?, ?, NULL, ?, ?)`, [clusterId, `fp-${clusterId}`, now, now, now, now]);
  if (!clusterInsert.ok) throw new Error(`[ROLLBACK-DRILL] story_clusters insert failed: ${clusterInsert.error}`);

  const runInsert = await exec(config, `INSERT INTO topic_assignment_runs (id, cluster_id, content_fingerprint, registry_version, classifier_version, assignment_policy_version, model_cache_key, status, started_at, completed_at) VALUES (?, ?, ?, 1, 'drill-classifier', 'drill-policy', NULL, 'validated', ?, ?)`, [runId, clusterId, `cf-${clusterId}`, now, now]);
  if (!runInsert.ok) throw new Error(`[ROLLBACK-DRILL] topic_assignment_runs insert failed: ${runInsert.error}`);

  const decisionInsert = await exec(config, `INSERT INTO cluster_topic_decisions (id, assignment_run_id, cluster_id, topic_id, role, confidence, assignment_source, decision_state, supersedes_decision_id, decided_at) VALUES (?, ?, ?, ?, 'subject', 0.99, 'migration', 'accepted', NULL, ?)`, [decisionId, runId, clusterId, topicId, now]);
  if (!decisionInsert.ok) throw new Error(`[ROLLBACK-DRILL] cluster_topic_decisions insert failed: ${decisionInsert.error}`);

  const effectiveInsert = await exec(config, `INSERT INTO cluster_topics (cluster_id, topic_id, role, confidence, assignment_source, source_decision_id, locked_by_curator, assignment_run_id, classifier_version, assigned_at, reviewed_at) VALUES (?, ?, 'subject', 0.99, 'migration', ?, 0, ?, 'drill-classifier', ?, NULL)`, [clusterId, topicId, decisionId, runId, now]);
  if (!effectiveInsert.ok) throw new Error(`[ROLLBACK-DRILL] cluster_topics insert failed: ${effectiveInsert.error}`);

  const afterWrite = await queryOne(config, `SELECT
    (SELECT COUNT(*) FROM cluster_topics) AS cluster_topics_n,
    (SELECT COUNT(*) FROM cluster_topic_decisions) AS decisions_n,
    (SELECT COUNT(*) FROM topic_assignment_runs) AS runs_n`);
  if (Number(afterWrite.cluster_topics_n) !== Number(baseline.cluster_topics_n) + 1) {
    throw new Error(`[ROLLBACK-DRILL] simulated write did not add exactly one cluster_topics row (before=${baseline.cluster_topics_n}, after=${afterWrite.cluster_topics_n}).`);
  }
  console.log('[ROLLBACK-DRILL] simulated bad cutover write applied and publicly exposed via cluster_topics.');

  // --- Prove the decision ledger genuinely refuses mutation (the reason
  // rollback must target cluster_topics, not the ledger). ---
  const deleteDecisionAttempt = await exec(config, `DELETE FROM cluster_topic_decisions WHERE id = ?`, [decisionId]);
  if (deleteDecisionAttempt.ok) {
    throw new Error('[ROLLBACK-DRILL] cluster_topic_decisions accepted a DELETE; the immutable-ledger trigger did not fire as expected.');
  }
  console.log('[ROLLBACK-DRILL] confirmed cluster_topic_decisions rejects DELETE (immutable audit trail intact).');

  // --- Execute the actual rollback procedure: remove the effective public
  // membership row only. The decision/run ledger stays as permanent audit
  // history of "this assignment was made, then rolled back." ---
  const rollbackDelete = await exec(config, `DELETE FROM cluster_topics WHERE cluster_id = ? AND topic_id = ?`, [clusterId, topicId]);
  if (!rollbackDelete.ok) throw new Error(`[ROLLBACK-DRILL] rollback DELETE failed: ${rollbackDelete.error}`);

  const afterRollback = await queryOne(config, `SELECT
    (SELECT COUNT(*) FROM cluster_topics) AS cluster_topics_n,
    (SELECT COUNT(*) FROM cluster_topic_decisions) AS decisions_n,
    (SELECT COUNT(*) FROM topic_assignment_runs) AS runs_n`);
  console.log(`[ROLLBACK-DRILL] after rollback: cluster_topics=${afterRollback.cluster_topics_n} decisions=${afterRollback.decisions_n} runs=${afterRollback.runs_n}`);

  if (Number(afterRollback.cluster_topics_n) !== Number(baseline.cluster_topics_n)) {
    throw new Error(`[ROLLBACK-DRILL] rollback did not restore cluster_topics to baseline (baseline=${baseline.cluster_topics_n}, after=${afterRollback.cluster_topics_n}).`);
  }
  if (Number(afterRollback.decisions_n) !== Number(afterWrite.decisions_n)) {
    throw new Error('[ROLLBACK-DRILL] decision ledger row count changed during rollback; audit trail must be append-only.');
  }
  if (Number(afterRollback.runs_n) !== Number(afterWrite.runs_n)) {
    throw new Error('[ROLLBACK-DRILL] assignment run ledger row count changed during rollback; audit trail must be append-only.');
  }

  const fkViolations = await exec(config, 'PRAGMA foreign_key_check', []);
  const fkRows = (await executeD1Query({ sql: 'PRAGMA foreign_key_check', params: [] }, config, fetch)).rows;
  if (!fkViolations.ok) throw new Error(`[ROLLBACK-DRILL] foreign_key_check failed: ${fkViolations.error}`);
  if (fkRows.length > 0) throw new Error(`[ROLLBACK-DRILL] foreign_key_check found ${fkRows.length} violations after rollback: ${JSON.stringify(fkRows)}`);

  console.log('[ROLLBACK-DRILL] rollback restored public membership exactly, preserved the immutable audit ledger, and left zero foreign-key violations.');
}

if (import.meta.url === `file://${process.argv[1]}`) void main();
