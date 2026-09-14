/**
 * Phase 13 Stage 9 Phase 10 operational-monitoring report: computes every
 * Phase 10 signal that is actually derivable from D1 alone against
 * authenticated production, writes a sanitized (counts/rates only, no
 * source bodies or curator evidence) report to stdout, and fails the job
 * (non-zero exit) when a real alert condition is observed. Read-only:
 * issues no INSERT/UPDATE/DELETE. Manual, never mutates production.
 * Hard limit: <= 300 LOC.
 */
import { buildD1ConfigFromEnv, executeD1Query, D1RestConfig } from '../archiveSync.js';

interface Signal { name: string; value: unknown; alert?: string; }

async function q(config: D1RestConfig, sql: string, params: unknown[] = []): Promise<Record<string, unknown>[]> {
  const res = await executeD1Query({ sql, params }, config, fetch);
  if (!res.ok) throw new Error(`[MONITOR] query failed: ${res.error} :: ${sql}`);
  return res.rows;
}

async function scalar(config: D1RestConfig, sql: string, params: unknown[] = []): Promise<number> {
  const rows = await q(config, sql, params);
  const v = rows[0] ? Object.values(rows[0])[0] : 0;
  return typeof v === 'number' ? v : Number(v ?? 0);
}

async function main(): Promise<void> {
  const config = buildD1ConfigFromEnv(process.env);
  if (!config) throw new Error('[MONITOR] missing CLOUDFLARE_ACCOUNT_ID/CLOUDFLARE_D1_DATABASE_ID/CLOUDFLARE_API_TOKEN.');

  const signals: Signal[] = [];
  const alerts: string[] = [];

  const totalClusters = await scalar(config, `SELECT COUNT(*) c FROM story_clusters WHERE status = 'active'`);
  const taggedClusters = await scalar(config, `SELECT COUNT(DISTINCT cluster_id) c FROM cluster_topics ct JOIN story_clusters s ON s.id = ct.cluster_id WHERE s.status = 'active'`);
  const untaggedRate = totalClusters > 0 ? (totalClusters - taggedClusters) / totalClusters : 0;
  signals.push({ name: 'eligible_clusters_persisted', value: totalClusters });
  signals.push({ name: 'untagged_cluster_rate', value: untaggedRate });
  if (untaggedRate > 0.5) alerts.push(`untagged_cluster_rate ${untaggedRate.toFixed(3)} exceeds 0.5 (sudden untagged-rate increase)`);

  const avgTopicsPerCluster = await scalar(config, `SELECT AVG(cnt) FROM (SELECT COUNT(*) cnt FROM cluster_topics GROUP BY cluster_id)`);
  signals.push({ name: 'average_topics_per_cluster', value: avgTopicsPerCluster });

  const bySource = await q(config, `SELECT assignment_source, COUNT(*) c FROM cluster_topics GROUP BY assignment_source`);
  signals.push({ name: 'assignment_counts_by_source', value: bySource });

  const pendingCandidates = await scalar(config, `SELECT COUNT(*) c FROM topic_candidates WHERE status = 'pending'`);
  signals.push({ name: 'unknown_topic_candidates_pending', value: pendingCandidates });

  const provisionalTopics = await scalar(config, `SELECT COUNT(*) c FROM topics WHERE status = 'provisional'`);
  signals.push({ name: 'provisional_topics_awaiting_corroboration', value: provisionalTopics });

  const abandonedProvisional = await scalar(config, `SELECT COUNT(*) c FROM topics WHERE status = 'provisional' AND last_seen_at < datetime('now', '-30 days')`);
  signals.push({ name: 'abandoned_provisional_topics_30d', value: abandonedProvisional });
  if (abandonedProvisional > 0) alerts.push(`${abandonedProvisional} provisional topic(s) have received no corroboration in 30+ days`);

  const newCandidates7d = await scalar(config, `SELECT COUNT(*) c FROM topic_candidates WHERE created_at >= datetime('now', '-7 days')`);
  signals.push({ name: 'newly_discovered_candidate_rate_7d', value: newCandidates7d });

  const failedRuns = await scalar(config, `SELECT COUNT(*) c FROM topic_assignment_runs WHERE status = 'failed'`);
  signals.push({ name: 'classification_failures', value: failedRuns });
  if (failedRuns > 0) alerts.push(`${failedRuns} topic_assignment_runs row(s) have status='failed'`);

  const reusedRuns = await scalar(config, `SELECT COUNT(*) c FROM topic_assignment_runs WHERE status = 'reused'`);
  const validatedRuns = await scalar(config, `SELECT COUNT(*) c FROM topic_assignment_runs WHERE status = 'validated'`);
  signals.push({ name: 'assignment_runs_reused_vs_validated', value: { reused: reusedRuns, validated: validatedRuns } });

  const mergedTopics = await scalar(config, `SELECT COUNT(*) c FROM topics WHERE status = 'merged' AND replaced_by_topic_id IS NOT NULL`);
  signals.push({ name: 'alias_redirect_targets', value: mergedTopics });

  const brokenRedirects = await scalar(config, `SELECT COUNT(*) c FROM topics t WHERE t.status = 'merged' AND (t.replaced_by_topic_id IS NULL OR NOT EXISTS (SELECT 1 FROM topics r WHERE r.id = t.replaced_by_topic_id))`);
  signals.push({ name: 'compatibility_hashtags_not_resolving', value: brokenRedirects });
  if (brokenRedirects > 0) alerts.push(`${brokenRedirects} merged topic(s) do not resolve to a stored topic ID`);

  const backlog = await scalar(config, `SELECT COUNT(*) c FROM topic_reclassification_queue WHERE status = 'pending'`);
  signals.push({ name: 'backfill_backlog_pending', value: backlog });

  const orphanBlobs = await scalar(config, `SELECT COUNT(*) c FROM ingestion_orphan_candidates WHERE resolution_state = 'pending'`);
  signals.push({ name: 'orphaned_blobs_pending', value: orphanBlobs });

  // "Incomplete" means genuinely stuck mid-run (never reached completed_at),
  // not merely a non-'published' terminal status: 'failed_retryable' rows
  // routinely finish (completed_at set) and are retried by a later run, so
  // counting them here would be a false alarm, not a real stuck run.
  const incompleteRuns = await scalar(config, `SELECT COUNT(*) c FROM ingestion_runs WHERE completed_at IS NULL AND started_at < datetime('now', '-1 hour')`);
  signals.push({ name: 'incomplete_ingestion_runs', value: incompleteRuns });
  if (incompleteRuns > 0) alerts.push(`${incompleteRuns} ingestion_runs row(s) started over an hour ago and never reached completed_at (genuinely stuck)`);

  const failedTerminalRuns = await scalar(config, `SELECT COUNT(*) c FROM ingestion_runs WHERE status = 'failed_terminal'`);
  signals.push({ name: 'failed_terminal_ingestion_runs', value: failedTerminalRuns });
  if (failedTerminalRuns > 0) alerts.push(`${failedTerminalRuns} ingestion_runs row(s) have status='failed_terminal'`);

  const staleRetryableRuns = await scalar(config, `SELECT COUNT(*) c FROM ingestion_runs WHERE status = 'failed_retryable' AND started_at < datetime('now', '-24 hours')`);
  signals.push({ name: 'stale_failed_retryable_ingestion_runs_24h', value: staleRetryableRuns });
  if (staleRetryableRuns > 0) alerts.push(`${staleRetryableRuns} ingestion_runs row(s) have sat at status='failed_retryable' for over 24h with no successful retry`);

  // Structural invariant, not a rate: zero provisional/shadow topics may ever
  // be publicly reachable. cluster_topics_only_validated_insert/_update
  // triggers already enforce this at write time; re-verify directly here.
  const publicUnpublished = await scalar(config, `SELECT COUNT(*) c FROM cluster_topics ct JOIN topics t ON t.id = ct.topic_id WHERE NOT (t.status = 'active' AND t.verification_state = 'published')`);
  signals.push({ name: 'public_unpublished_assignments', value: publicUnpublished });
  if (publicUnpublished > 0) alerts.push(`${publicUnpublished} cluster_topics row(s) reference a non-published/non-active topic`);

  // Assignment stability: an unchanged (fingerprint, registry, classifier,
  // policy) run should be deduped ('reused'), never re-validated with a
  // *different* decision set. A cluster with more than one 'validated' run
  // sharing the same content_fingerprint indicates drift on unchanged input.
  const driftRows = await q(config, `
    SELECT cluster_id, content_fingerprint, COUNT(*) c
    FROM topic_assignment_runs
    WHERE status = 'validated'
    GROUP BY cluster_id, content_fingerprint, registry_version, classifier_version, assignment_policy_version
    HAVING COUNT(*) > 1
  `);
  signals.push({ name: 'unchanged_input_assignment_drift', value: driftRows.length });
  if (driftRows.length > 0) alerts.push(`${driftRows.length} cluster/fingerprint pair(s) show more than one validated run for unchanged input`);

  signals.push({ name: 'topic_page_404_rate', value: 'not_instrumented', alert: undefined });
  signals.push({ name: 'classification_cache_hit_rate_latency_cost', value: 'not_instrumented' });
  signals.push({ name: 'core_topic_disagreement_near_duplicates', value: 'not_instrumented' });
  signals.push({ name: 'near_duplicate_topic_score_alias_collisions', value: 'structurally_prevented_by_unique_index' });

  const report = {
    generatedAt: new Date().toISOString(),
    database: config.databaseId,
    signals,
    alerts,
    notInstrumented: [
      'topic_page_404_rate — no request-log capture exists in this deployment; would require Cloudflare Logpush or equivalent.',
      'classification_cache_hit_rate/latency/model_cost — not persisted anywhere in the current schema (topic_assignment_runs.model_cache_key records only presence, not hit/miss timing or spend).',
      'core_topic_disagreement_across_near_duplicate_clusters — requires a near-duplicate clustering pass not present in this read-only report.'
    ]
  };

  console.log(JSON.stringify(report, null, 2));

  if (alerts.length > 0) {
    console.error(`[MONITOR] ${alerts.length} alert condition(s) triggered:`);
    for (const a of alerts) console.error(`  - ${a}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('[MONITOR] fatal:', err);
  process.exitCode = 1;
});
