/**
 * Phase 14 D1/R2 reconciliation report: lists every object actually present
 * in the R2 archive bucket via the S3-compatible API and diffs it against
 * every key D1 expects to exist (ingestion_cluster_manifest.payload_key,
 * plus archived_stories.id for rows whose payload has been migrated out of
 * D1, i.e. cluster_json IS NULL). Read-only against both D1 and R2; issues
 * no PUT/DELETE. Fails the job (non-zero exit) on any D1-expected key
 * missing from R2 (a real broken reference); R2 objects with no D1
 * reference are reported as orphans, not treated as failures, since a
 * deliberate deletion or an in-flight write can produce one transiently.
 * Hard limit: <= 300 LOC.
 */
import { buildD1ConfigFromEnv, executeD1Query, D1RestConfig } from '../archiveSync.js';
import { buildR2ConfigFromEnv, listObjectKeys } from '../r2ArchiveStore.js';

async function q(config: D1RestConfig, sql: string): Promise<Record<string, unknown>[]> {
  const res = await executeD1Query({ sql, params: [] }, config, fetch);
  if (!res.ok) throw new Error(`[R2-RECONCILE] query failed: ${res.error} :: ${sql}`);
  return res.rows;
}

async function main(): Promise<void> {
  const d1Config = buildD1ConfigFromEnv(process.env);
  if (!d1Config) throw new Error('[R2-RECONCILE] missing CLOUDFLARE_ACCOUNT_ID/CLOUDFLARE_D1_DATABASE_ID/CLOUDFLARE_API_TOKEN.');
  const r2Config = buildR2ConfigFromEnv(process.env);
  if (!r2Config) throw new Error('[R2-RECONCILE] missing CLOUDFLARE_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET_NAME.');

  const manifestRows = await q(d1Config, `SELECT DISTINCT payload_key FROM ingestion_cluster_manifest`);
  const archivedRows = await q(d1Config, `SELECT id FROM archived_stories WHERE cluster_json IS NULL`);

  const expectedKeys = new Set<string>();
  for (const row of manifestRows) expectedKeys.add(String(row.payload_key));
  for (const row of archivedRows) expectedKeys.add(`${String(row.id)}.json`);

  const actualKeys = new Set(await listObjectKeys(r2Config));

  const missingFromR2 = [...expectedKeys].filter((k) => !actualKeys.has(k));
  const orphanedInR2 = [...actualKeys].filter((k) => !expectedKeys.has(k));

  const report = {
    generatedAt: new Date().toISOString(),
    bucket: r2Config.bucketName,
    expectedKeyCount: expectedKeys.size,
    actualObjectCount: actualKeys.size,
    missingFromR2Count: missingFromR2.length,
    missingFromR2Sample: missingFromR2.slice(0, 20),
    orphanedInR2Count: orphanedInR2.length,
    orphanedInR2Sample: orphanedInR2.slice(0, 20)
  };

  console.log(JSON.stringify(report, null, 2));

  if (missingFromR2.length > 0) {
    console.error(`[R2-RECONCILE] ${missingFromR2.length} D1-expected key(s) are missing from R2 — broken reference(s).`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('[R2-RECONCILE] fatal:', err);
  process.exitCode = 1;
});
