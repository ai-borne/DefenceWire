/**
 * Story Thread Continuity & Lineage Engine (Phase 1)
 * Links incoming story clusters to active and dormant threads via canonical
 * entity matching and Jaccard similarity. Handles out-of-order event sorting,
 * sequence indexing (x1.1.1 -> x1.1.2), dormant reactivation, and branch splitting.
 * Hard limit: <= 300 LOC.
 */

import { StoryCluster } from '../src/types/news.js';
import {
  StoryThread,
  StoryThreadEvent,
  ThreadContinuityResult
} from '../src/types/threads.js';

const DORMANT_DAYS = 60;
const DORMANT_MS = DORMANT_DAYS * 24 * 60 * 60 * 1000;
const SIMILARITY_THRESHOLD = 0.35;

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function extractCanonicalEntities(cluster: StoryCluster): string[] {
  const candidates: string[] = [];
  if (cluster.programTags) candidates.push(...cluster.programTags);
  if (cluster.ssbIntel?.defenceTechTakeaway?.platformOrSystem) {
    candidates.push(cluster.ssbIntel.defenceTechTakeaway.platformOrSystem);
  }
  if (cluster.entities) candidates.push(...cluster.entities);
  return Array.from(new Set(candidates.map((e) => e.trim()).filter((e) => e.length >= 3)));
}

export function calculateJaccard(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0;
  let inter = 0;
  for (const item of setA) {
    if (setB.has(item)) inter++;
  }
  const union = setA.size + setB.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function normalizeEntity(e: string): string {
  return e.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function scoreMatch(cluster: StoryCluster, thread: StoryThread): number {
  const clusterEntities = extractCanonicalEntities(cluster);
  const clusterNorm = new Set(clusterEntities.map(normalizeEntity));
  const threadNorm = normalizeEntity(thread.canonicalEntity);

  if (clusterNorm.has(threadNorm)) return 1.0;
  for (const entity of clusterNorm) {
    if (entity.includes(threadNorm) || threadNorm.includes(entity)) return 0.9;
  }

  const threadTokens = new Set(thread.title.toLowerCase().split(/\s+/).map(normalizeEntity));
  return calculateJaccard(clusterNorm, threadTokens);
}

export function generateDeltaSummary(cluster: StoryCluster): string {
  if (cluster.ssbIntel?.whyItMatters) return cluster.ssbIntel.whyItMatters;
  if (cluster.primarySource.snippet) return cluster.primarySource.snippet;
  return cluster.synthesizedHeadline;
}

export function sortAndIndexEvents(events: StoryThreadEvent[]): StoryThreadEvent[] {
  const sorted = [...events].sort(
    (a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
  );

  const branchCounters: Record<string, number> = {};
  return sorted.map((event) => {
    // Retain explicit branch if specified in sequenceCode (e.g., x1.2) or default to x1.1
    const match = event.sequenceCode.match(/^(x\d+\.\d+)/);
    const branchPrefix = match ? match[1]! : 'x1.1';
    const nextIdx = (branchCounters[branchPrefix] ?? 0) + 1;
    branchCounters[branchPrefix] = nextIdx;

    return {
      ...event,
      sequenceIndex: nextIdx,
      sequenceCode: `${branchPrefix}.${nextIdx}`
    };
  });
}

export interface ContinuityEngineOptions {
  now?: () => Date;
  dormantThresholdMs?: number;
}

export function matchAndAdvanceThreads(
  clusters: StoryCluster[],
  existingThreads: StoryThread[],
  existingEvents: StoryThreadEvent[] = [],
  options: ContinuityEngineOptions = {}
): ThreadContinuityResult {
  const now = (options.now ?? (() => new Date()))();
  const dormantMs = options.dormantThresholdMs ?? DORMANT_MS;
  const nowIso = now.toISOString();

  const threadMap = new Map<string, StoryThread>();
  for (const t of existingThreads) {
    threadMap.set(t.id, { ...t });
  }

  const eventsByThread = new Map<string, StoryThreadEvent[]>();
  for (const e of existingEvents) {
    const list = eventsByThread.get(e.threadId) ?? [];
    list.push(e);
    eventsByThread.set(e.threadId, list);
  }

  let newlySpawnedCount = 0;
  let attachedCount = 0;
  let reactivatedCount = 0;

  for (const cluster of clusters) {
    const canonicalEntities = extractCanonicalEntities(cluster);
    if (canonicalEntities.length === 0) continue;

    // Determine target threads: a story with multiple distinct programs links to all of them
    const matchedThreads: { thread: StoryThread; score: number }[] = [];
    for (const thread of threadMap.values()) {
      const score = scoreMatch(cluster, thread);
      if (score >= SIMILARITY_THRESHOLD) {
        matchedThreads.push({ thread, score });
      }
    }

    if (matchedThreads.length === 0) {
      // Spawn new thread for primary entity
      const primaryEntity = canonicalEntities[0]!;
      const threadId = `th_${slugify(primaryEntity)}`;
      if (threadMap.has(threadId)) continue; // avoid collision

      const newThread: StoryThread = {
        id: threadId,
        title: `${primaryEntity} Development & Delivery Arc`,
        canonicalEntity: primaryEntity,
        category: cluster.categories[0] ?? 'strategic',
        status: 'active',
        eventCount: 1,
        firstEventAt: cluster.primarySource.publishedAt,
        lastEventAt: cluster.primarySource.publishedAt,
        summary: cluster.synthesizedHeadline,
        createdAt: nowIso,
        updatedAt: nowIso
      };
      threadMap.set(threadId, newThread);
      newlySpawnedCount++;

      const newEvent: StoryThreadEvent = {
        id: `ev_${cluster.id}_${threadId}`,
        threadId,
        clusterId: cluster.id,
        sequenceCode: 'x1.1.1',
        sequenceIndex: 1,
        headline: cluster.synthesizedHeadline,
        deltaSummary: generateDeltaSummary(cluster),
        primarySourceName: cluster.primarySource.sourceName,
        primarySourceUrl: cluster.primarySource.url,
        publishedAt: cluster.primarySource.publishedAt,
        entities: cluster.entities,
        createdAt: nowIso
      };
      eventsByThread.set(threadId, [newEvent]);
      continue;
    }

    // Attach event to all matched threads (or subbranch if multiple programs)
    const isMultiProgramBranch = matchedThreads.length > 1;
    matchedThreads.forEach(({ thread }, idx) => {
      const currentEvents = eventsByThread.get(thread.id) ?? [];
      // Prevent duplicate event attachment
      if (currentEvents.some((e) => e.clusterId === cluster.id)) return;

      const lastPublished = new Date(thread.lastEventAt).getTime();
      const isDormantTime = now.getTime() - lastPublished > dormantMs;
      if (thread.status === 'dormant' || (isDormantTime && thread.status !== 'concluded')) {
        thread.status = 'active';
        reactivatedCount++;
      }

      const branchCode = isMultiProgramBranch && idx > 0 ? `x1.${idx + 1}.1` : 'x1.1.1';
      const event: StoryThreadEvent = {
        id: `ev_${cluster.id}_${thread.id}`,
        threadId: thread.id,
        clusterId: cluster.id,
        sequenceCode: branchCode,
        sequenceIndex: currentEvents.length + 1,
        headline: cluster.synthesizedHeadline,
        deltaSummary: generateDeltaSummary(cluster),
        primarySourceName: cluster.primarySource.sourceName,
        primarySourceUrl: cluster.primarySource.url,
        publishedAt: cluster.primarySource.publishedAt,
        entities: cluster.entities,
        createdAt: nowIso
      };

      currentEvents.push(event);
      eventsByThread.set(thread.id, currentEvents);
      attachedCount++;
    });
  }

  // Sort and re-index events chronologically for each thread
  const finalThreads: StoryThread[] = [];
  const finalEvents: StoryThreadEvent[] = [];

  for (const thread of threadMap.values()) {
    const rawEvents = eventsByThread.get(thread.id) ?? [];
    if (rawEvents.length === 0) continue;

    const indexedEvents = sortAndIndexEvents(rawEvents);
    eventsByThread.set(thread.id, indexedEvents);
    finalEvents.push(...indexedEvents);

    const firstEvent = indexedEvents[0]!;
    const lastEvent = indexedEvents[indexedEvents.length - 1]!;

    thread.eventCount = indexedEvents.length;
    thread.firstEventAt = firstEvent.publishedAt;
    thread.lastEventAt = lastEvent.publishedAt;
    thread.updatedAt = nowIso;
    finalThreads.push(thread);
  }

  return {
    threads: finalThreads,
    events: finalEvents,
    newlySpawnedCount,
    attachedCount,
    reactivatedCount
  };
}
