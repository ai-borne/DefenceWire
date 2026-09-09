/**
 * Story Thread Semantic Coherence & Outlier Detection Engine (Phase 4 & 7)
 * SSOT for auditing intra-thread coherence across chronological milestones.
 * Identifies and isolates semantic outliers (e.g. false acronym attachments).
 * Used at both crawl/sync time and read/query time for defense-in-depth.
 * Hard limit: <= 300 LOC (Target: <= 100 LOC).
 */

import { StoryThreadEvent } from '../types/threads.js';
import { isNoiseTag } from '../utils/hashtagUtils.js';

export const GENERIC_DEFENCE_NOUNS = new Set([
  'missile', 'missiles', 'navy', 'naval', 'army', 'air', 'force', 'forces',
  'military', 'defence', 'defense', 'aircraft', 'jet', 'fighter', 'drone',
  'drones', 'uav', 'uavs', 'radar', 'radars', 'ship', 'ships', 'warship',
  'warships', 'frigate', 'frigates', 'submarine', 'submarines', 'system',
  'systems', 'corps', 'talks', 'deal', 'deals', 'procurement', 'ministry',
  'security', 'strike', 'base', 'command', 'troop', 'troops', 'border',
  'operation', 'operations', 'strategic', 'exercise', 'exercises', 'news',
  'arc', 'operational', 'development', 'delivery', 'acquisition', 'technology',
  'ecosystem', 'framework', 'boost', 'tensions', 'flag', 'level'
]);

export function normalizeEntity(e: string): string {
  return e.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function isDistinctiveToken(t: string): boolean {
  return t.length >= 2 && !isNoiseTag(t) && !GENERIC_DEFENCE_NOUNS.has(t);
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
    if (w.length >= 2 && !isNoiseTag(w)) tokens.add(w);
  }
  return tokens;
}

export interface ThreadAnchorContext {
  id?: string;
  canonicalEntity?: string;
  title?: string;
}

export function extractThreadAnchorTokens(context?: ThreadAnchorContext, fallbackThreadId?: string): {
  tokens: Set<string>;
  phrases: string[];
  canonicalNorm: string;
} {
  const tokens = new Set<string>();
  const phrases: string[] = [];
  const rawId = context?.id || fallbackThreadId || '';
  const cleanedId = rawId.replace(/^th[-_]/, '');
  const canonical = context?.canonicalEntity || cleanedId;
  const canonicalNorm = normalizeEntity(canonical);

  if (canonicalNorm) tokens.add(canonicalNorm);

  for (const part of canonical.toLowerCase().split(/[^a-z0-9]+/)) {
    if (isDistinctiveToken(part)) tokens.add(part);
  }
  for (const part of cleanedId.toLowerCase().split(/[^a-z0-9]+/)) {
    if (isDistinctiveToken(part)) tokens.add(part);
  }

  // Domain expansions for high-frequency strategic border acronyms
  if (tokens.has('lac')) {
    phrases.push('line of actual control');
    tokens.add('arunachal');
    tokens.add('galwan');
    tokens.add('wacha');
  }
  if (tokens.has('loc')) {
    phrases.push('line of control');
    tokens.add('kashmir');
  }

  return { tokens, phrases, canonicalNorm };
}

export interface ThreadCoherenceAuditResult {
  coherent: boolean;
  validEvents: StoryThreadEvent[];
  outlierEvents: StoryThreadEvent[];
  flaggedIds: string[];
}

export function auditThreadCoherence(
  events: StoryThreadEvent[],
  context?: ThreadAnchorContext
): ThreadCoherenceAuditResult {
  if (events.length === 0) return { coherent: true, validEvents: [], outlierEvents: [], flaggedIds: [] };

  const anchor = extractThreadAnchorTokens(context, events[0]?.threadId);
  const tokenSets = events.map(extractEventTokens);
  const validEvents: StoryThreadEvent[] = [], outlierEvents: StoryThreadEvent[] = [], flaggedIds: string[] = [];

  for (let i = 0; i < events.length; i++) {
    const ev = events[i]!;
    const cur = tokenSets[i]!;
    const evEntities = ev.entities.map(normalizeEntity);
    const evTextLower = `${ev.headline} ${ev.deltaSummary || ''}`.toLowerCase();

    // Check 1: Direct canonical entity match
    let hasAnchor = Boolean(anchor.canonicalNorm && evEntities.includes(anchor.canonicalNorm));

    // Check 2: Anchor phrases in headline or summary
    if (!hasAnchor) {
      for (const phrase of anchor.phrases) {
        if (evTextLower.includes(phrase)) {
          hasAnchor = true;
          break;
        }
      }
    }

    // Check 3: Anchor tokens in event token set (must be whole word token, not substring)
    if (!hasAnchor) {
      for (const at of anchor.tokens) {
        if (cur.has(at)) {
          hasAnchor = true;
          break;
        }
      }
    }

    // Check 4: Consensus similarity with peer events in the thread
    let simSum = 0;
    let peerCount = 0;
    for (let j = 0; j < events.length; j++) {
      if (j !== i) {
        simSum += calculateJaccard(cur, tokenSets[j]!);
        peerCount++;
      }
    }
    const avgSim = peerCount > 0 ? simSum / peerCount : 0;

    // If anchor is present or consensus is strong without anchor contradiction, event is valid
    if (hasAnchor || (anchor.tokens.size === 0 && avgSim >= 0.15)) {
      validEvents.push(ev);
    } else {
      outlierEvents.push(ev);
      flaggedIds.push(ev.id);
    }
  }

  return { coherent: outlierEvents.length === 0, validEvents, outlierEvents, flaggedIds };
}
