/**
 * One-off Phase 14 cleanup: deletes the single stray `test-live-probe.json`
 * object found in production R2 by the D1/R2 reconciliation report — a
 * leftover manual smoke-test artifact with no D1 reference at all (not
 * real ingestion data). Hardcoded to this one key deliberately, not a
 * general-purpose delete tool, to avoid building a reusable
 * delete-anything-in-production capability for a single confirmed cleanup.
 * Confirms the object is gone (a subsequent GET returns 404) before
 * reporting success. Hard limit: <= 300 LOC.
 */
import { buildR2ConfigFromEnv, deleteObject, getClusterJson } from '../r2ArchiveStore.js';

const TARGET_KEY = 'test-live-probe.json';

async function main(): Promise<void> {
  const r2Config = buildR2ConfigFromEnv(process.env);
  if (!r2Config) throw new Error('[DELETE-TEST-PROBE] missing CLOUDFLARE_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET_NAME.');

  console.log(`[DELETE-TEST-PROBE] deleting ${TARGET_KEY} from bucket ${r2Config.bucketName}`);
  const result = await deleteObject(TARGET_KEY, r2Config);
  if (!result.ok) {
    throw new Error(`[DELETE-TEST-PROBE] delete failed: HTTP ${result.status ?? 'network error'}`);
  }

  const verify = await getClusterJson(TARGET_KEY.replace(/\.json$/, ''), r2Config);
  if (verify.ok) {
    throw new Error('[DELETE-TEST-PROBE] object still readable after delete — aborting, not confirmed removed.');
  }
  console.log(`[DELETE-TEST-PROBE] confirmed removed (GET now returns ${verify.status}).`);
}

main().catch((err) => {
  console.error('[DELETE-TEST-PROBE] fatal:', err);
  process.exitCode = 1;
});
