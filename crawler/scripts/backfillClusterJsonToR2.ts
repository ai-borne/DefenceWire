/**
 * One-off backfill: migrates every pre-Phase-3 archived_stories row that
 * still carries cluster_json in D1 to its R2 blob, then nulls the D1 column.
 * Not part of the recurring crawl — invoked manually via `npm run
 * backfill:cluster-json`. Naturally resumable: the select always asks for
 * "rows where cluster_json IS NOT NULL", so an interrupted run just leaves
 * unmigrated rows for the next invocation to pick up; a row is only nulled
 * out in D1 after its R2 write is confirmed, so no data is ever lost.
 * Hard limit: <= 300 LOC.
 */

import { buildD1ConfigFromEnv, executeD1Query, D1RestConfig } from '../archiveSync.js';
import { buildR2ConfigFromEnv, putClusterJson, R2Config } from '../r2ArchiveStore.js';
import { buildSelectClusterJsonBackfillStatement, buildNullClusterJsonStatement } from '../../src/archive/d1QueryBuilder.js';

const BATCH_SIZE = 25;

export interface BackfillDeps {
  fetchFn?: typeof fetch;
  putClusterJsonFn?: typeof putClusterJson;
}

export interface BackfillResult {
  migrated: number;
  failed: number;
}

export async function backfillClusterJsonToR2(
  d1Config: D1RestConfig,
  r2Config: R2Config,
  deps: BackfillDeps = {}
): Promise<BackfillResult> {
  const fetchFn = deps.fetchFn ?? globalThis.fetch;
  const putClusterJsonFn = deps.putClusterJsonFn ?? putClusterJson;

  let migrated = 0;
  let failed = 0;
  // A row whose R2/D1 step failed this run still matches the "cluster_json
  // IS NOT NULL" select, so without tracking it here every subsequent
  // outer-loop pass would re-select the same failed row forever. Excluding
  // already-attempted ids lets a genuinely stuck row surface as `failed`
  // and end the run, instead of spinning indefinitely.
  const attemptedFailedIds = new Set<string>();

  for (;;) {
    const selectResult = await executeD1Query(buildSelectClusterJsonBackfillStatement(BATCH_SIZE), d1Config, fetchFn);
    if (!selectResult.ok) {
      failed++;
      console.error(`[BACKFILL] D1 select failed: HTTP ${selectResult.status}`);
      break;
    }

    const rows = (selectResult.rows as Array<{ id: string; cluster_json: string }>).filter(
      (row) => !attemptedFailedIds.has(row.id)
    );
    if (rows.length === 0) break;

    for (const row of rows) {
      const putResult = await putClusterJsonFn(row.id, row.cluster_json, r2Config, fetchFn);
      if (!putResult.ok) {
        failed++;
        attemptedFailedIds.add(row.id);
        console.error(`[BACKFILL] R2 PUT failed for ${row.id}: HTTP ${putResult.status ?? 'network error'}; D1 row left untouched for retry`);
        continue;
      }

      const updateResult = await executeD1Query(buildNullClusterJsonStatement(row.id), d1Config, fetchFn);
      if (!updateResult.ok) {
        failed++;
        attemptedFailedIds.add(row.id);
        console.error(`[BACKFILL] D1 null-out failed for ${row.id}: HTTP ${updateResult.status}; blob is safely in R2, retry will null it out`);
        continue;
      }

      migrated++;
    }
  }

  return { migrated, failed };
}

async function main(): Promise<void> {
  const d1Config = buildD1ConfigFromEnv(process.env);
  const r2Config = buildR2ConfigFromEnv(process.env);
  if (!d1Config || !r2Config) {
    console.error('[BACKFILL] Missing D1 or R2 environment configuration; aborting.');
    process.exit(1);
  }

  const result = await backfillClusterJsonToR2(d1Config, r2Config);
  console.log(`[BACKFILL] Done. migrated=${result.migrated} failed=${result.failed}`);
  if (result.failed > 0) process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
