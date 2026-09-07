/**
 * Crawler Thread Sync for DefenceWire.in (Phase 1)
 * Pulls active/dormant threads from Cloudflare D1, executes thread continuity matching,
 * and writes updated threads and chronological events back to D1 via the REST API.
 * Non-fatal: failures or missing configuration never break the main crawl.
 * Hard limit: <= 300 LOC.
 */

import { StoryCluster } from '../src/types/news.js';
import {
  StoryThread,
  StoryThreadEvent,
  StoryThreadRow,
  StoryThreadEventRow,
  ThreadContinuityResult
} from '../src/types/threads.js';
import {
  threadRowToStoryThread,
  eventRowToStoryThreadEvent,
  buildUpsertThreadStatement,
  buildUpsertThreadEventStatement
} from '../src/services/threadQueryBuilder.js';
import { matchAndAdvanceThreads, ContinuityEngineOptions } from './threadContinuityEngine.js';
import { D1RestConfig, executeD1Query } from './archiveSync.js';

export interface ThreadSyncDeps {
  fetchFn?: typeof fetch;
  now?: () => Date;
}

export interface ThreadSyncResult {
  syncedThreads: number;
  syncedEvents: number;
  failed: number;
  continuity: ThreadContinuityResult;
}

export async function fetchExistingThreadsAndEvents(
  config: D1RestConfig,
  fetchFn: typeof fetch
): Promise<{ threads: StoryThread[]; events: StoryThreadEvent[] }> {
  try {
    const threadRes = await executeD1Query(
      { sql: 'SELECT * FROM story_threads ORDER BY last_event_at DESC LIMIT 100', params: [] },
      config,
      fetchFn
    );

    const eventRes = await executeD1Query(
      { sql: 'SELECT * FROM story_thread_events ORDER BY sequence_index ASC LIMIT 500', params: [] },
      config,
      fetchFn
    );

    const threads = (threadRes.rows as unknown as StoryThreadRow[]).map(threadRowToStoryThread);
    const events = (eventRes.rows as unknown as StoryThreadEventRow[]).map(eventRowToStoryThreadEvent);

    return { threads, events };
  } catch (err) {
    console.error('[THREAD SYNC] Failed to fetch existing threads from D1:', err);
    return { threads: [], events: [] };
  }
}

export async function syncThreadsToD1(
  continuity: ThreadContinuityResult,
  config: D1RestConfig,
  fetchFn: typeof fetch
): Promise<{ syncedThreads: number; syncedEvents: number; failed: number }> {
  let syncedThreads = 0;
  let syncedEvents = 0;
  let failed = 0;

  for (const thread of continuity.threads) {
    const stmt = buildUpsertThreadStatement(thread);
    try {
      const res = await executeD1Query(stmt, config, fetchFn);
      if (res.ok) {
        syncedThreads++;
      } else {
        failed++;
        console.error(`[THREAD SYNC] Failed to upsert thread ${thread.id}: HTTP ${res.status}`);
      }
    } catch (err) {
      failed++;
      console.error(`[THREAD SYNC] Error upserting thread ${thread.id}:`, err);
    }
  }

  for (const event of continuity.events) {
    const stmt = buildUpsertThreadEventStatement(event);
    try {
      const res = await executeD1Query(stmt, config, fetchFn);
      if (res.ok) {
        syncedEvents++;
      } else {
        failed++;
        console.error(`[THREAD SYNC] Failed to upsert event ${event.id}: HTTP ${res.status}`);
      }
    } catch (err) {
      failed++;
      console.error(`[THREAD SYNC] Error upserting event ${event.id}:`, err);
    }
  }

  return { syncedThreads, syncedEvents, failed };
}

export async function runThreadContinuity(
  clusters: StoryCluster[],
  config: D1RestConfig | null,
  deps: ThreadSyncDeps = {},
  options: ContinuityEngineOptions = {}
): Promise<ThreadSyncResult> {
  const fetchFn = deps.fetchFn ?? globalThis.fetch;
  const emptyContinuity: ThreadContinuityResult = {
    threads: [],
    events: [],
    newlySpawnedCount: 0,
    attachedCount: 0,
    reactivatedCount: 0
  };

  if (!config) {
    console.log('[THREAD SYNC] D1 is not configured; running in-memory thread continuity simulation.');
    const continuity = matchAndAdvanceThreads(clusters, [], [], options);
    return {
      syncedThreads: 0,
      syncedEvents: 0,
      failed: 0,
      continuity
    };
  }

  try {
    const { threads: existingThreads, events: existingEvents } = await fetchExistingThreadsAndEvents(
      config,
      fetchFn
    );

    const continuity = matchAndAdvanceThreads(clusters, existingThreads, existingEvents, options);

    const { syncedThreads, syncedEvents, failed } = await syncThreadsToD1(continuity, config, fetchFn);

    console.log(
      `[THREAD SYNC] ${syncedThreads} threads synced (${continuity.newlySpawnedCount} new, ${continuity.reactivatedCount} reactivated), ${syncedEvents} events synced (${continuity.attachedCount} attached), ${failed} failed.`
    );

    return {
      syncedThreads,
      syncedEvents,
      failed,
      continuity
    };
  } catch (err) {
    console.error('[THREAD SYNC] Unexpected failure in thread continuity pipeline:', err);
    return {
      syncedThreads: 0,
      syncedEvents: 0,
      failed: 1,
      continuity: emptyContinuity
    };
  }
}
