/**
 * Story Thread Semantic Coherence & Outlier Detection Engine (Phase 4 & 7)
 * SSOT for auditing intra-thread coherence across chronological milestones.
 * Identifies and isolates semantic outliers (e.g. false acronym attachments).
 * Used at both crawl/sync time and read/query time for defense-in-depth.
 * Hard limit: <= 300 LOC (Target: <= 100 LOC).
 */

import { StoryThreadEvent } from '../types/threads.js';
import { isNoiseTag } from '../utils/hashtagUtils.js';

export function normalizeEntity(e: string): string {
  return e.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function calculateJaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function extractEventTokens(e: StoryThreadEvent): Set<string> {
  const tokens = new Set<string>();
  for (const ent of e.entities) {
    tokens.add(normalizeEntity(ent));
    for (const p of ent.toLowerCase().split(/[^a-z0-9]+/)) {
      if (p.length >= 2 && !isNoiseTag(p)) tokens.add(p);
    }
  }
  for (const w of e.headline.toLowerCase().split(/[^a-z0-9]+/)) {
    if (w.length >= 3 && !isNoiseTag(w)) tokens.add(w);
  }
  return tokens;
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
    if (cur.size === 0) {
      outlierEvents.push(events[i]!);
      flaggedIds.push(events[i]!.id);
      continue;
    }
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
    else {
      outlierEvents.push(events[i]!);
      flaggedIds.push(events[i]!.id);
    }
  }
  return { coherent: outlierEvents.length === 0, validEvents, outlierEvents, flaggedIds };
}
