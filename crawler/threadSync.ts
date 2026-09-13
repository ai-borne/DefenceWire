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
  buildUpsertThreadEventStatement,
  buildThreadCandidatesStatement,
  buildEventsForThreadsStatement,
  buildClusterTopicLinksStatement,
  buildClusterLineageStatement,
  buildUpsertThreadTopicStatement
} from '../src/services/threadQueryBuilder.js';
import { ThreadTopicLink } from '../src/types/threads.js';
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
  fetchFn: typeof fetch,
  clusterIds: string[] = []
): Promise<{ threads: StoryThread[]; events: StoryThreadEvent[]; topicsByCluster: Map<string, string[]>; lineageClusterIdsByCluster: Map<string, string[]> }> {
  try {
    if (clusterIds.length === 0) return { threads: [], events: [], topicsByCluster: new Map(), lineageClusterIdsByCluster: new Map() };
    const [threadRes, topicRes, lineageRes] = await Promise.all([
      executeD1Query(buildThreadCandidatesStatement(clusterIds), config, fetchFn),
      executeD1Query(buildClusterTopicLinksStatement(clusterIds), config, fetchFn),
      executeD1Query(buildClusterLineageStatement(clusterIds), config, fetchFn)
    ]);

    const threads = (threadRes.rows as unknown as StoryThreadRow[]).map(threadRowToStoryThread);
    const eventRes = threads.length > 0
      ? await executeD1Query(buildEventsForThreadsStatement(threads.map((thread) => thread.id)), config, fetchFn)
      : { rows: [] };
    const events = (eventRes.rows as unknown as StoryThreadEventRow[]).map(eventRowToStoryThreadEvent);
    const topicsByCluster = new Map<string, string[]>();
    for (const row of topicRes.rows as { cluster_id?: string; topic_id?: string }[]) {
      if (!row.cluster_id || !row.topic_id) continue;
      topicsByCluster.set(row.cluster_id, [...(topicsByCluster.get(row.cluster_id) ?? []), row.topic_id]);
    }
    const lineageClusterIdsByCluster = new Map<string, string[]>();
    for (const row of lineageRes.rows as { predecessor_cluster_id?: string; successor_cluster_id?: string }[]) {
      if (!row.predecessor_cluster_id || !row.successor_cluster_id) continue;
      const predecessor = row.predecessor_cluster_id;
      const successor = row.successor_cluster_id;
      if (clusterIds.includes(predecessor)) {
        lineageClusterIdsByCluster.set(predecessor, [...(lineageClusterIdsByCluster.get(predecessor) ?? []), successor]);
      }
      if (clusterIds.includes(successor)) {
        lineageClusterIdsByCluster.set(successor, [...(lineageClusterIdsByCluster.get(successor) ?? []), predecessor]);
      }
    }

    return { threads, events, topicsByCluster, lineageClusterIdsByCluster };
  } catch (err) {
    console.error('[THREAD SYNC] Failed to fetch existing threads from D1:', err);
    return { threads: [], events: [], topicsByCluster: new Map(), lineageClusterIdsByCluster: new Map() };
  }
}

export async function syncThreadsToD1(
  continuity: ThreadContinuityResult,
  config: D1RestConfig,
  fetchFn: typeof fetch,
  topicLinks: ThreadTopicLink[] = []
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

  for (const link of topicLinks) {
    try {
      const res = await executeD1Query(buildUpsertThreadTopicStatement(link), config, fetchFn);
      if (!res.ok) failed++;
    } catch {
      failed++;
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

  if (continuity.purgedEventIds && continuity.purgedEventIds.length > 0) {
    for (const eventId of continuity.purgedEventIds) {
      try {
        const stmt = { sql: 'DELETE FROM story_thread_events WHERE id = ?', params: [eventId] };
        const res = await executeD1Query(stmt, config, fetchFn);
        if (res.ok) {
          console.log(`[THREAD SYNC] Purged incoherent event from D1: ${eventId}`);
        }
      } catch (err) {
        console.error(`[THREAD SYNC] Error purging event ${eventId}:`, err);
      }
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
    const { threads: existingThreads, events: existingEvents, topicsByCluster, lineageClusterIdsByCluster } = await fetchExistingThreadsAndEvents(
      config,
      fetchFn,
      clusters.map((cluster) => cluster.id)
    );

    const continuity = matchAndAdvanceThreads(clusters, existingThreads, existingEvents, { ...options, lineageClusterIdsByCluster });
    const topicLinks = continuity.events.flatMap((event) =>
      (topicsByCluster.get(event.clusterId) ?? []).map((topicId) => ({ threadId: event.threadId, topicId, linkedAt: event.createdAt }))
    );

    const { syncedThreads, syncedEvents, failed } = await syncThreadsToD1(continuity, config, fetchFn, topicLinks);

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
