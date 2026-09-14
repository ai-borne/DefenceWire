/**
 * Phase 13 Stage 8 non-production-clone drill: exercises the real thread
 * continuity pipeline (matchAndAdvanceThreads + syncThreadsToD1, the exact
 * runtime code path used every crawl) against authenticated D1 at a scale
 * beyond production's current 226 threads / 249 events, covering primary-
 * source replacement, merge, split, and dormant reactivation. Fails loud on
 * any invariant violation. Manual, one-off; never runs on a schedule.
 */
import { buildD1ConfigFromEnv, executeD1Query, D1RestConfig } from '../archiveSync.js';
import { fetchExistingThreadsAndEvents, syncThreadsToD1 } from '../threadSync.js';
import { matchAndAdvanceThreads } from '../threadContinuityEngine.js';
import { StoryCluster } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';
import { buildUpsertThreadEventStatement } from '../../src/services/threadQueryBuilder.js';

const PROGRAM_COUNT = 110;
const FOLLOWUP_PASSES = 4; // spawn pass + 4 followups = 5 events per program = 550 events
const BATCH_SIZE = 10; // keeps bound params well under D1's ~100-per-statement limit

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString();
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function insertStoryClusters(
  config: D1RestConfig,
  rows: { id: string; fingerprint: string; firstObservedAt: string; lastObservedAt: string }[]
): Promise<void> {
  for (const group of chunk(rows, BATCH_SIZE)) {
    const placeholders = group.map(() => '(?,?,?,?,?,?,?,?,?)').join(',');
    const params: unknown[] = [];
    for (const r of group) {
      params.push(r.id, r.fingerprint, 'active', null, r.firstObservedAt, r.lastObservedAt, null, r.firstObservedAt, r.lastObservedAt);
    }
    const res = await executeD1Query(
      {
        sql: `INSERT INTO story_clusters (
          id, event_fingerprint, status, primary_source_article_id,
          first_observed_at, last_observed_at, merged_into_cluster_id, created_at, updated_at
        ) VALUES ${placeholders}
        ON CONFLICT(id) DO UPDATE SET last_observed_at = excluded.last_observed_at`,
        params
      },
      config,
      fetch
    );
    if (!res.ok) throw new Error(`[DRILL] story_clusters insert failed: ${res.error}`);
  }
}

async function insertLineage(
  config: D1RestConfig,
  edges: { predecessor: string; successor: string; changeType: 'merge' | 'split'; reason: string }[]
): Promise<void> {
  for (const edge of edges) {
    const res = await executeD1Query(
      {
        sql: `INSERT INTO cluster_lineage (predecessor_cluster_id, successor_cluster_id, change_type, reason, changed_at)
          VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING`,
        params: [edge.predecessor, edge.successor, edge.changeType, edge.reason, new Date().toISOString()]
      },
      config,
      fetch
    );
    if (!res.ok) throw new Error(`[DRILL] cluster_lineage insert failed: ${res.error}`);
  }
}

function makeCluster(id: string, programTag: string, publishedAt: string, sourceName = 'Drill Wire Service'): StoryCluster {
  return {
    id,
    synthesizedHeadline: `${programTag} programme update`,
    primarySource: {
      id: `src_${id}`,
      title: `${programTag} coverage`,
      url: `https://example.test/${id}`,
      sourceName,
      sourceDomain: 'example.test',
      tier: SourceTier.TIER_3_SPECIALIZED,
      publishedAt
    },
    relatedCoverage: [],
    discussions: [],
    categories: ['strategic'],
    entities: [programTag],
    programTags: [programTag],
    defenceScore: 50,
    isLeadStory: false,
    createdAt: publishedAt,
    updatedAt: publishedAt
  };
}

async function runPass(config: D1RestConfig, clusters: StoryCluster[]): Promise<{ synced: number; failed: number; newlySpawned: number; attached: number; reactivated: number }> {
  let synced = 0, failed = 0, newlySpawned = 0, attached = 0, reactivated = 0;
  for (const group of chunk(clusters, BATCH_SIZE)) {
    const { threads, events, lineageClusterIdsByCluster } = await fetchExistingThreadsAndEvents(config, fetch, group.map((c) => c.id));
    const continuity = matchAndAdvanceThreads(group, threads, events, { lineageClusterIdsByCluster });
    const { syncedEvents, failed: syncFailed } = await syncThreadsToD1(continuity, config, fetch);
    synced += syncedEvents;
    failed += syncFailed;
    newlySpawned += continuity.newlySpawnedCount;
    attached += continuity.attachedCount;
    reactivated += continuity.reactivatedCount;
  }
  return { synced, failed, newlySpawned, attached, reactivated };
}

async function queryOne(config: D1RestConfig, sql: string, params: unknown[] = []): Promise<Record<string, unknown>> {
  const res = await executeD1Query({ sql, params }, config, fetch);
  if (!res.ok) throw new Error(`[DRILL] query failed: ${sql} :: ${res.error}`);
  return res.rows[0] ?? {};
}

async function main(): Promise<void> {
  const config = buildD1ConfigFromEnv(process.env);
  if (!config) throw new Error('[DRILL] requires CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, CLOUDFLARE_API_TOKEN.');
  if (config.databaseId === (process.env.PRODUCTION_D1_DATABASE_ID ?? '6c03abeb-ce1f-4669-8985-dbbdd3735807')) {
    throw new Error('[DRILL] refusing to run against the production database ID.');
  }

  const before = await queryOne(config, 'SELECT (SELECT COUNT(*) FROM story_threads) AS threads, (SELECT COUNT(*) FROM story_thread_events) AS events');
  console.log(`[DRILL] before: threads=${before.threads} events=${before.events}`);

  // --- Phase 1: volume padding — spawn PROGRAM_COUNT threads, then FOLLOWUP_PASSES
  // more events each via the same event_fingerprint (fingerprint-match candidate arm). ---
  const programs = Array.from({ length: PROGRAM_COUNT }, (_, i) => `drill-programme-${String(i + 1).padStart(3, '0')}`);
  const fingerprintOf = (p: string) => `fp-${p}`;

  const spawnClusters = programs.map((p, i) => makeCluster(`cl-${p}-spawn`, p, daysAgoIso(30 - (i % 10))));
  await insertStoryClusters(config, spawnClusters.map((c) => ({
    id: c.id, fingerprint: fingerprintOf(c.programTags![0]!), firstObservedAt: c.primarySource.publishedAt, lastObservedAt: c.primarySource.publishedAt
  })));
  const spawnResult = await runPass(config, spawnClusters);
  console.log(`[DRILL] phase1 spawn: synced=${spawnResult.synced} newlySpawned=${spawnResult.newlySpawned} failed=${spawnResult.failed}`);
  if (spawnResult.failed > 0) throw new Error('[DRILL] phase1 spawn had sync failures.');
  if (spawnResult.newlySpawned !== PROGRAM_COUNT) {
    throw new Error(`[DRILL] expected ${PROGRAM_COUNT} newly spawned threads, got ${spawnResult.newlySpawned}.`);
  }

  for (let pass = 1; pass <= FOLLOWUP_PASSES; pass++) {
    const passClusters = programs.map((p) => makeCluster(`cl-${p}-p${pass}`, p, daysAgoIso(20 - pass * 2)));
    await insertStoryClusters(config, passClusters.map((c) => ({
      id: c.id, fingerprint: fingerprintOf(c.programTags![0]!), firstObservedAt: c.primarySource.publishedAt, lastObservedAt: c.primarySource.publishedAt
    })));
    const result = await runPass(config, passClusters);
    console.log(`[DRILL] phase1 followup pass ${pass}: synced=${result.synced} attached=${result.attached} failed=${result.failed}`);
    if (result.failed > 0) throw new Error(`[DRILL] phase1 followup pass ${pass} had sync failures.`);
    if (result.attached !== PROGRAM_COUNT) {
      throw new Error(`[DRILL] followup pass ${pass}: expected ${PROGRAM_COUNT} attached events, got ${result.attached}.`);
    }
  }

  // --- Phase 2: dormant reactivation — backdate one thread past the 60-day
  // dormant threshold, then feed one more matching cluster and confirm reactivation. ---
  const reactivationProgram = programs[0]!;
  const reactivationThreadId = `th_${reactivationProgram.replace(/[^a-z0-9]+/g, '-')}`;
  await executeD1Query(
    { sql: `UPDATE story_threads SET status='dormant', last_event_at=? WHERE id=?`, params: [daysAgoIso(90), reactivationThreadId] },
    config,
    fetch
  );
  const reactivateCluster = makeCluster(`cl-${reactivationProgram}-reactivate`, reactivationProgram, daysAgoIso(0));
  await insertStoryClusters(config, [{
    id: reactivateCluster.id, fingerprint: fingerprintOf(reactivationProgram), firstObservedAt: reactivateCluster.primarySource.publishedAt, lastObservedAt: reactivateCluster.primarySource.publishedAt
  }]);
  const reactivateResult = await runPass(config, [reactivateCluster]);
  console.log(`[DRILL] phase2 reactivation: reactivated=${reactivateResult.reactivated} attached=${reactivateResult.attached}`);
  if (reactivateResult.reactivated < 1) throw new Error('[DRILL] dormant thread was not reactivated.');
  const reactivatedRow = await queryOne(config, 'SELECT status FROM story_threads WHERE id=?', [reactivationThreadId]);
  if (reactivatedRow.status !== 'active') throw new Error(`[DRILL] reactivated thread status is "${reactivatedRow.status}", expected "active".`);

  // --- Phase 3: merge — two predecessor clusters collapse into one successor
  // cluster; the lineage-arm candidate query must still surface the thread. ---
  const mergeProgram = programs[1]!;
  const mergeThreadId = `th_${mergeProgram.replace(/[^a-z0-9]+/g, '-')}`;
  const mergePredecessorA = `cl-${mergeProgram}-spawn`;
  const mergePredecessorB = `cl-${mergeProgram}-p1`;
  const mergeSuccessor = makeCluster(`cl-${mergeProgram}-merged`, mergeProgram, daysAgoIso(0));
  await insertStoryClusters(config, [{
    id: mergeSuccessor.id, fingerprint: `fp-merged-${mergeProgram}`, firstObservedAt: mergeSuccessor.primarySource.publishedAt, lastObservedAt: mergeSuccessor.primarySource.publishedAt
  }]);
  await insertLineage(config, [
    { predecessor: mergePredecessorA, successor: mergeSuccessor.id, changeType: 'merge', reason: 'drill: two clusters collapsed on re-clustering' },
    { predecessor: mergePredecessorB, successor: mergeSuccessor.id, changeType: 'merge', reason: 'drill: two clusters collapsed on re-clustering' }
  ]);
  const mergeResult = await runPass(config, [mergeSuccessor]);
  console.log(`[DRILL] phase3 merge: attached=${mergeResult.attached} newlySpawned=${mergeResult.newlySpawned}`);
  if (mergeResult.attached !== 1 || mergeResult.newlySpawned !== 0) {
    throw new Error(`[DRILL] merge drill did not attach to the existing thread (attached=${mergeResult.attached}, newlySpawned=${mergeResult.newlySpawned}).`);
  }
  const mergeEventRow = await queryOne(config, 'SELECT COUNT(*) AS n FROM story_thread_events WHERE thread_id=? AND cluster_id=?', [mergeThreadId, mergeSuccessor.id]);
  if (Number(mergeEventRow.n) !== 1) throw new Error('[DRILL] merge drill did not record exactly one event for the successor cluster.');

  // --- Phase 4: split — one predecessor cluster's coverage splits into two
  // successor clusters, both must resolve back to the original thread. ---
  const splitProgram = programs[2]!;
  const splitThreadId = `th_${splitProgram.replace(/[^a-z0-9]+/g, '-')}`;
  const splitPredecessor = `cl-${splitProgram}-spawn`;
  const splitSuccessorA = makeCluster(`cl-${splitProgram}-splitA`, splitProgram, daysAgoIso(0));
  const splitSuccessorB = makeCluster(`cl-${splitProgram}-splitB`, splitProgram, daysAgoIso(0));
  await insertStoryClusters(config, [splitSuccessorA, splitSuccessorB].map((c) => ({
    id: c.id, fingerprint: `fp-split-${c.id}`, firstObservedAt: c.primarySource.publishedAt, lastObservedAt: c.primarySource.publishedAt
  })));
  await insertLineage(config, [
    { predecessor: splitPredecessor, successor: splitSuccessorA.id, changeType: 'split', reason: 'drill: cluster split into two threads of coverage' },
    { predecessor: splitPredecessor, successor: splitSuccessorB.id, changeType: 'split', reason: 'drill: cluster split into two threads of coverage' }
  ]);
  const splitResult = await runPass(config, [splitSuccessorA, splitSuccessorB]);
  console.log(`[DRILL] phase4 split: attached=${splitResult.attached} newlySpawned=${splitResult.newlySpawned}`);
  if (splitResult.attached !== 2 || splitResult.newlySpawned !== 0) {
    throw new Error(`[DRILL] split drill did not attach both successors to the existing thread (attached=${splitResult.attached}, newlySpawned=${splitResult.newlySpawned}).`);
  }
  const splitEventRow = await queryOne(
    config,
    'SELECT COUNT(DISTINCT cluster_id) AS n FROM story_thread_events WHERE thread_id=? AND cluster_id IN (?, ?)',
    [splitThreadId, splitSuccessorA.id, splitSuccessorB.id]
  );
  if (Number(splitEventRow.n) !== 2) throw new Error('[DRILL] split drill did not record distinct events for both successor clusters.');

  // --- Phase 5: primary-source replacement — re-upsert an existing event's
  // deterministic ID with a corrected source; must update in place, not duplicate. ---
  const sourceReplaceProgram = programs[3]!;
  const sourceReplaceThreadId = `th_${sourceReplaceProgram.replace(/[^a-z0-9]+/g, '-')}`;
  const sourceReplaceClusterId = `cl-${sourceReplaceProgram}-spawn`;
  const originalEvent = await queryOne(
    config,
    'SELECT * FROM story_thread_events WHERE thread_id=? AND cluster_id=?',
    [sourceReplaceThreadId, sourceReplaceClusterId]
  );
  if (!originalEvent.id) throw new Error('[DRILL] could not locate seed event for primary-source-replacement drill.');
  const beforeCount = await queryOne(config, 'SELECT COUNT(*) AS n FROM story_thread_events WHERE thread_id=?', [sourceReplaceThreadId]);
  const replacement = await executeD1Query(
    buildUpsertThreadEventStatement({
      id: String(originalEvent.id),
      threadId: String(originalEvent.thread_id),
      clusterId: String(originalEvent.cluster_id),
      sequenceCode: String(originalEvent.sequence_code),
      sequenceIndex: Number(originalEvent.sequence_index),
      headline: String(originalEvent.headline),
      deltaSummary: String(originalEvent.delta_summary),
      primarySourceName: 'Corrected Primary Source',
      primarySourceUrl: 'https://example.test/corrected-source',
      publishedAt: String(originalEvent.published_at),
      entities: JSON.parse(String(originalEvent.entities)),
      createdAt: String(originalEvent.created_at)
    }),
    config,
    fetch
  );
  if (!replacement.ok) throw new Error(`[DRILL] primary-source replacement upsert failed: ${replacement.error}`);
  const afterCount = await queryOne(config, 'SELECT COUNT(*) AS n FROM story_thread_events WHERE thread_id=?', [sourceReplaceThreadId]);
  if (Number(afterCount.n) !== Number(beforeCount.n)) {
    throw new Error(`[DRILL] primary-source replacement changed event count for thread ${sourceReplaceThreadId} (${beforeCount.n} -> ${afterCount.n}); expected no duplicate.`);
  }
  const updatedEvent = await queryOne(config, 'SELECT primary_source_name FROM story_thread_events WHERE id=?', [String(originalEvent.id)]);
  if (updatedEvent.primary_source_name !== 'Corrected Primary Source') {
    throw new Error('[DRILL] primary-source replacement did not update the existing row in place.');
  }

  // --- Final invariants ---
  const after = await queryOne(config, 'SELECT (SELECT COUNT(*) FROM story_threads) AS threads, (SELECT COUNT(*) FROM story_thread_events) AS events');
  console.log(`[DRILL] after: threads=${after.threads} events=${after.events}`);
  if (Number(after.threads) <= 100) throw new Error(`[DRILL] expected more than 100 threads, got ${after.threads}.`);
  if (Number(after.events) <= 500) throw new Error(`[DRILL] expected more than 500 events, got ${after.events}.`);

  const dupEvents = await queryOne(
    config,
    'SELECT COUNT(*) AS n FROM (SELECT thread_id, cluster_id, COUNT(*) c FROM story_thread_events GROUP BY thread_id, cluster_id HAVING COUNT(*) > 1)'
  );
  if (Number(dupEvents.n) > 0) throw new Error(`[DRILL] found ${dupEvents.n} duplicate (thread_id, cluster_id) event pairs.`);

  const fkViolations = await executeD1Query({ sql: 'PRAGMA foreign_key_check', params: [] }, config, fetch);
  if (fkViolations.rows.length > 0) {
    throw new Error(`[DRILL] foreign_key_check found ${fkViolations.rows.length} violations: ${JSON.stringify(fkViolations.rows)}`);
  }

  console.log('[DRILL] all phases and invariants passed.');
}

if (import.meta.url === `file://${process.argv[1]}`) void main();
