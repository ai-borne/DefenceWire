/**
 * Story Thread Continuity & Lineage Engine (Phase 1 & 4)
 * Links incoming story clusters to active and dormant threads via canonical
 * entity matching, semantic fingerprint Jaccard overlap, and intra-thread
 * coherence auditing. Handles out-of-order event sorting and sequence indexing.
 * Hard limit: <= 300 LOC (Target: <= 285 LOC).
 */

import { DomainCategory, StoryCluster } from '../src/types/news.js';
import { StoryThread, StoryThreadEvent, ThreadContinuityResult } from '../src/types/threads.js';
import { cleanHashtag, hashtagToSlug, isNoiseTag } from '../src/utils/hashtagUtils.js';

const DORMANT_DAYS = 60;
const DORMANT_MS = DORMANT_DAYS * 24 * 60 * 60 * 1000;
const SIMILARITY_THRESHOLD = 0.35;

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function extractCanonicalEntities(cluster: StoryCluster): string[] {
  const raw = [
    cluster.primaryTag,
    ...(cluster.hashtags ?? []),
    ...(cluster.programTags ?? []),
    cluster.ssbIntel?.defenceTechTakeaway?.platformOrSystem,
    ...(cluster.entities ?? [])
  ].filter((r): r is string => Boolean(r && typeof r === 'string' && r.trim()));

  const seen = new Set<string>();
  const candidates: string[] = [];
  for (const item of raw) {
    const cleaned = (item.startsWith('#') ? cleanHashtag(item) : item).trim();
    if (!cleaned || isNoiseTag(cleaned) || cleaned.length < 2) continue;
    const lower = cleaned.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      candidates.push(cleaned);
    }
  }
  return candidates;
}

export function generateThreadTitle(entity: string, category?: DomainCategory | string): string {
  const name = cleanHashtag(entity) || entity;
  const c = (category || '').toLowerCase();
  const suffix = c === 'procurement' || c === 'tenders' ? 'Acquisition & Delivery Arc'
    : ['airforce', 'army', 'navy', 'strategic'].includes(c) ? 'Operational & Strategic Arc'
    : c === 'tech' || c === 'space' ? 'Technology & Systems Arc'
    : 'Intelligence & Strategic Arc';
  return `${name} ${suffix}`;
}

export function calculateJaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function normalizeEntity(e: string): string {
  return e.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function extractClusterTokens(c: StoryCluster): string[] {
  const tokenSet = new Set<string>();
  for (const ent of extractCanonicalEntities(c)) {
    tokenSet.add(normalizeEntity(ent));
    for (const p of ent.toLowerCase().split(/[^a-z0-9]+/)) if (p.length >= 2 && !isNoiseTag(p)) tokenSet.add(p);
  }
  return Array.from(tokenSet);
}

export function extractEventTokens(e: StoryThreadEvent): Set<string> {
  const tokens = new Set<string>();
  for (const ent of e.entities) {
    tokens.add(normalizeEntity(ent));
    for (const p of ent.toLowerCase().split(/[^a-z0-9]+/)) if (p.length >= 2 && !isNoiseTag(p)) tokens.add(p);
  }
  for (const w of e.headline.toLowerCase().split(/[^a-z0-9]+/)) if (w.length >= 3 && !isNoiseTag(w)) tokens.add(w);
  return tokens;
}

export function scoreMatch(cluster: StoryCluster, thread: StoryThread): number {
  const clusterNorm = new Set(extractCanonicalEntities(cluster).map(normalizeEntity));
  const threadNorm = normalizeEntity(thread.canonicalEntity);
  if (clusterNorm.has(threadNorm)) return 1.0;

  const threadTokens = thread.canonicalEntity.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 2 && !isNoiseTag(t));
  for (const ent of extractCanonicalEntities(cluster)) {
    const entTokens = ent.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 2 && !isNoiseTag(t));
    if (threadTokens.some((tt) => entTokens.includes(tt))) return 0.9;
  }

  const threadFp = new Set(thread.semanticFingerprint?.length ? thread.semanticFingerprint : thread.title.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 2 && !isNoiseTag(t)));
  const jaccard = calculateJaccard(new Set(extractClusterTokens(cluster)), threadFp);
  return jaccard >= 0.4 ? jaccard : 0;
}

export function generateDeltaSummary(cluster: StoryCluster): string {
  if (cluster.ssbIntel?.whyItMatters) return cluster.ssbIntel.whyItMatters;
  if (cluster.primarySource.snippet) return cluster.primarySource.snippet;
  return cluster.synthesizedHeadline;
}

function makeEvent(c: StoryCluster, tId: string, code: string, idx: number, now: string): StoryThreadEvent {
  return {
    id: `ev_${c.id}_${tId}`, threadId: tId, clusterId: c.id, sequenceCode: code, sequenceIndex: idx,
    headline: c.synthesizedHeadline, deltaSummary: generateDeltaSummary(c),
    primarySourceName: c.primarySource.sourceName, primarySourceUrl: c.primarySource.url,
    publishedAt: c.primarySource.publishedAt, entities: c.entities, createdAt: now
  };
}

export function sortAndIndexEvents(events: StoryThreadEvent[]): StoryThreadEvent[] {
  const sorted = [...events].sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime());
  const counters: Record<string, number> = {};
  return sorted.map((event) => {
    const match = event.sequenceCode.match(/^(x\d+\.\d+)/);
    const branch = match ? match[1]! : 'x1.1';
    const nextIdx = (counters[branch] ?? 0) + 1;
    counters[branch] = nextIdx;
    return { ...event, sequenceIndex: nextIdx, sequenceCode: `${branch}.${nextIdx}` };
  });
}

export interface ThreadCoherenceAuditResult {
  coherent: boolean;
  validEvents: StoryThreadEvent[];
  outlierEvents: StoryThreadEvent[];
  flaggedIds: string[];
}

export function auditThreadCoherence(events: StoryThreadEvent[]): ThreadCoherenceAuditResult {
  if (events.length <= 1) return { coherent: true, validEvents: [...events], outlierEvents: [], flaggedIds: [] };
  const tokenSets = events.map(extractEventTokens);
  const anchor = events[0]?.threadId ? normalizeEntity(events[0].threadId.replace(/^th[-_]/, '')) : '';
  const validEvents: StoryThreadEvent[] = [], outlierEvents: StoryThreadEvent[] = [], flaggedIds: string[] = [];

  for (let i = 0; i < events.length; i++) {
    const cur = tokenSets[i]!;
    if (cur.size === 0) { outlierEvents.push(events[i]!); flaggedIds.push(events[i]!.id); continue; }
    const centroid = new Set<string>();
    let maxPair = 0;
    for (let j = 0; j < events.length; j++) {
      if (j !== i) {
        for (const t of tokenSets[j]!) centroid.add(t);
        const sim = calculateJaccard(cur, tokenSets[j]!);
        if (sim > maxPair) maxPair = sim;
      }
    }
    if (anchor && anchor.length >= 2 && !isNoiseTag(anchor)) centroid.add(anchor);
    let shared = 0;
    for (const t of cur) if (centroid.has(t)) shared++;
    const similarity = Math.max(maxPair, shared / cur.size);
    if (similarity >= 0.15) validEvents.push(events[i]!);
    else { outlierEvents.push(events[i]!); flaggedIds.push(events[i]!.id); }
  }
  return { coherent: outlierEvents.length === 0, validEvents, outlierEvents, flaggedIds };
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

  const threadMap = new Map<string, StoryThread>(existingThreads.map((t) => [t.id, { ...t }]));
  const eventsByThread = new Map<string, StoryThreadEvent[]>();
  for (const e of existingEvents) {
    const list = eventsByThread.get(e.threadId) ?? [];
    list.push(e);
    eventsByThread.set(e.threadId, list);
  }

  for (const thread of threadMap.values()) {
    if (!thread.semanticFingerprint?.length) {
      const fp = new Set<string>();
      for (const ev of eventsByThread.get(thread.id) ?? []) {
        for (const t of extractEventTokens(ev)) fp.add(t);
      }
      if (fp.size > 0) thread.semanticFingerprint = Array.from(fp).slice(0, 100);
    }
  }

  let newlySpawnedCount = 0, attachedCount = 0, reactivatedCount = 0;

  for (const cluster of clusters) {
    const canonicalEntities = extractCanonicalEntities(cluster);
    if (canonicalEntities.length === 0) continue;

    const matched: { thread: StoryThread; score: number }[] = [];
    for (const thread of threadMap.values()) {
      const score = scoreMatch(cluster, thread);
      if (score >= SIMILARITY_THRESHOLD) matched.push({ thread, score });
    }

    if (matched.length === 0) {
      const primaryEntity = canonicalEntities[0]!;
      const threadId = hashtagToSlug(primaryEntity) || `th_${slugify(primaryEntity)}`;
      if (threadMap.has(threadId)) continue;

      const cat = cluster.categories[0] ?? 'strategic';
      threadMap.set(threadId, {
        id: threadId,
        title: generateThreadTitle(primaryEntity, cat),
        canonicalEntity: primaryEntity,
        category: cat,
        status: 'active',
        eventCount: 1,
        firstEventAt: cluster.primarySource.publishedAt,
        lastEventAt: cluster.primarySource.publishedAt,
        summary: cluster.synthesizedHeadline,
        semanticFingerprint: extractClusterTokens(cluster).slice(0, 50),
        createdAt: nowIso,
        updatedAt: nowIso
      });
      newlySpawnedCount++;
      eventsByThread.set(threadId, [makeEvent(cluster, threadId, 'x1.1.1', 1, nowIso)]);
      continue;
    }

    const multi = matched.length > 1;
    matched.forEach(({ thread }, idx) => {
      const curEvents = eventsByThread.get(thread.id) ?? [];
      if (curEvents.some((e) => e.clusterId === cluster.id)) return;

      const lastPublished = new Date(thread.lastEventAt).getTime();
      if (thread.status === 'dormant' || (now.getTime() - lastPublished > dormantMs && thread.status !== 'concluded')) {
        thread.status = 'active';
        reactivatedCount++;
      }

      const fp = new Set(thread.semanticFingerprint ?? []);
      for (const t of extractClusterTokens(cluster)) fp.add(t);
      thread.semanticFingerprint = Array.from(fp).slice(0, 100);

      const branchCode = multi && idx > 0 ? `x1.${idx + 1}.1` : 'x1.1.1';
      curEvents.push(makeEvent(cluster, thread.id, branchCode, curEvents.length + 1, nowIso));
      eventsByThread.set(thread.id, curEvents);
      attachedCount++;
    });
  }

  const finalThreads: StoryThread[] = [], finalEvents: StoryThreadEvent[] = [];
  for (const thread of threadMap.values()) {
    const raw = eventsByThread.get(thread.id) ?? [];
    if (raw.length === 0) continue;

    const audit = auditThreadCoherence(raw);
    const coherent = audit.validEvents.length > 0 ? audit.validEvents : raw;
    const indexed = sortAndIndexEvents(coherent);
    eventsByThread.set(thread.id, indexed);
    finalEvents.push(...indexed);

    thread.eventCount = indexed.length;
    thread.firstEventAt = indexed[0]!.publishedAt;
    thread.lastEventAt = indexed[indexed.length - 1]!.publishedAt;
    thread.updatedAt = nowIso;
    finalThreads.push(thread);
  }

  return { threads: finalThreads, events: finalEvents, newlySpawnedCount, attachedCount, reactivatedCount };
}
