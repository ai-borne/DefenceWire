/**
 * Archive Thread Backfill for DefenceWire.in (fix for docs/knowledge_base_issues.md#3)
 * Retroactively threads archived clusters that aged out of the live feed
 * before `matchAndAdvanceThreads` ever saw them (e.g. archived in a run
 * before this fix shipped). Runs a small bounded batch every crawl
 * invocation and self-drains the backlog over successive runs. Non-fatal:
 * failures never break the main crawl.
 * Hard limit: <= 300 LOC.
 */

import { StoryCluster } from '../src/types/news.js';
import { buildSelectUnthreadedArchivedStatement } from '../src/archive/d1QueryBuilder.js';
import { D1RestConfig, executeD1Query } from './archiveSync.js';
import { getClusterJson, R2Config } from './r2ArchiveStore.js';
import { matchAndAdvanceThreads } from './threadContinuityEngine.js';
import { fetchExistingThreadsAndEvents, syncThreadsToD1 } from './threadSync.js';

const BACKFILL_BATCH_SIZE = 25;

export interface ThreadBackfillDeps {
  fetchFn?: typeof fetch;
  now?: () => Date;
}

export interface ThreadBackfillResult {
  scanned: number;
  threaded: number;
  failed: number;
}

async function loadUnthreadedClusters(
  config: D1RestConfig,
  r2Config: R2Config,
  fetchFn: typeof fetch
): Promise<{ clusters: StoryCluster[]; scanned: number; failed: number }> {
  const res = await executeD1Query(buildSelectUnthreadedArchivedStatement(BACKFILL_BATCH_SIZE), config, fetchFn);
  if (!res.ok) {
    console.error(`[THREAD BACKFILL] Failed to query unthreaded archived clusters: HTTP ${res.status}`);
    return { clusters: [], scanned: 0, failed: 0 };
  }

  const ids = res.rows.map((row) => row.id as string).filter(Boolean);
  const clusters: StoryCluster[] = [];
  let failed = 0;

  for (const id of ids) {
    const blob = await getClusterJson(id, r2Config, fetchFn);
    if (!blob.ok || !blob.body) {
      failed++;
      console.error(`[THREAD BACKFILL] Failed to fetch R2 cluster_json for ${id}: HTTP ${blob.status ?? 'network error'}`);
      continue;
    }
    try {
      clusters.push(JSON.parse(blob.body) as StoryCluster);
    } catch (err) {
      failed++;
      console.error(`[THREAD BACKFILL] Failed to parse cluster_json for ${id}:`, err);
    }
  }

  return { clusters, scanned: ids.length, failed };
}

/**
 * Threads a bounded batch of archived-but-unthreaded clusters. Requires both
 * D1 and R2 config (cluster_json only lives in R2 as of Phase 3) — silently
 * no-ops without breaking the crawl if either is missing, matching the rest
 * of the archive/thread sync pipeline's non-fatal convention.
 */
export async function backfillUnthreadedArchive(
  config: D1RestConfig | null,
  r2Config: R2Config | null,
  deps: ThreadBackfillDeps = {}
): Promise<ThreadBackfillResult> {
  if (!config || !r2Config) return { scanned: 0, threaded: 0, failed: 0 };

  const fetchFn = deps.fetchFn ?? globalThis.fetch;

  try {
    const { clusters, scanned, failed: loadFailed } = await loadUnthreadedClusters(config, r2Config, fetchFn);
    if (clusters.length === 0) return { scanned, threaded: 0, failed: loadFailed };

    const { threads: existingThreads, events: existingEvents } = await fetchExistingThreadsAndEvents(config, fetchFn);
    const continuity = matchAndAdvanceThreads(clusters, existingThreads, existingEvents, { now: deps.now });
    const { syncedEvents, failed: syncFailed } = await syncThreadsToD1(continuity, config, fetchFn);

    return { scanned, threaded: syncedEvents, failed: loadFailed + syncFailed };
  } catch (err) {
    console.error('[THREAD BACKFILL] Unexpected failure:', err);
    return { scanned: 0, threaded: 0, failed: 1 };
  }
}
