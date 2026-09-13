/** Manual, fail-loud entry point for bounded historical topic backfill. */
import { buildD1ConfigFromEnv } from '../archiveSync.js';
import { buildR2ConfigFromEnv } from '../r2ArchiveStore.js';
import { backfillHistoricalTopics } from '../topicHistoricalBackfill.js';

async function main(): Promise<void> {
  const d1 = buildD1ConfigFromEnv(process.env); const r2 = buildR2ConfigFromEnv(process.env);
  if (!d1 || !r2) throw new Error('Historical topic backfill requires complete D1 and R2 configuration.');
  let scanned = 0; let validated = 0; let reused = 0; let beforeAssignments = 0; let afterAssignments = 0; let firstBatch = true;
  for (;;) {
    const result = await backfillHistoricalTopics(d1, r2);
    scanned += result.scanned; validated += result.validated; reused += result.reused;
    if (firstBatch) { beforeAssignments = result.beforeAssignments; firstBatch = false; }
    afterAssignments = result.afterAssignments;
    if (result.failed > 0) throw new Error(`[TOPIC BACKFILL] failed=${result.failed}; retry ledger retains the affected cluster(s).`);
    if (result.scanned === 0) break;
  }
  console.log(`[TOPIC BACKFILL] scanned=${scanned} validated=${validated} reused=${reused} failed=0 assignments=${beforeAssignments}->${afterAssignments}`);
}

if (import.meta.url === `file://${process.argv[1]}`) void main();
