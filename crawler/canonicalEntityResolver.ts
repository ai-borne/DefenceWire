/**
 * Durable Canonical-Entity Resolution for DefenceWire.in (docs/knowledge_base_issues.md#2)
 * Self-learning SSOT the tag screening cascade (crawler/tagScreening.ts) checks
 * first: exact slug/alias match, then a conservative fuzzy match, before a
 * cluster mints a genuinely new tag. Cascade-approved resolutions are written
 * back so the same real-world entity converges on one canonical tag across
 * independently-run crawls. Mirrors crawler/threadSync.ts's D1 read/write shape.
 * Hard limit: <= 300 LOC.
 */

import { StoryCluster, SSBIntelligence } from '../src/types/news.js';
import { hashtagToSlug } from '../src/utils/hashtagUtils.js';
import { computeJaccardSimilarity } from '../src/engine/clusterEngine.js';
import { D1RestConfig, executeD1Query } from './archiveSync.js';
import { screenClusterTags } from './tagScreening.js';

/** Tag token sets are short, so this must be stricter than clustering's 0.05-0.32 title-similarity bands to avoid false merges. */
const FUZZY_MATCH_THRESHOLD = 0.6;
const REGISTRY_FETCH_LIMIT = 500;

export interface CanonicalEntityRecord {
  id: string;
  canonicalTag: string;
  aliasSlugs: string[];
  mentionCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

function toSlugKey(tag: string): string {
  return hashtagToSlug(tag).replace(/^th_/, '');
}

function tokenize(slug: string): Set<string> {
  return new Set(slug.split('-').filter(Boolean));
}

export interface CanonicalResolution {
  record: CanonicalEntityRecord;
  matchType: 'exact' | 'fuzzy';
}

/** Tier 0 lookup: exact slug/alias match first, then fuzzy token-overlap match. Pure — no I/O. */
export function resolveCanonicalTag(candidateTag: string, registry: CanonicalEntityRecord[]): CanonicalResolution | null {
  const slug = toSlugKey(candidateTag);
  if (!slug) return null;

  const exact = registry.find((r) => r.id === slug || r.aliasSlugs.includes(slug));
  if (exact) return { record: exact, matchType: 'exact' };

  const candidateTokens = tokenize(slug);
  if (candidateTokens.size === 0) return null;

  let best: CanonicalEntityRecord | null = null;
  let bestScore = 0;
  for (const record of registry) {
    for (const knownSlug of [record.id, ...record.aliasSlugs]) {
      const score = computeJaccardSimilarity(candidateTokens, tokenize(knownSlug));
      if (score > bestScore) {
        bestScore = score;
        best = record;
      }
    }
  }

  return best && bestScore >= FUZZY_MATCH_THRESHOLD ? { record: best, matchType: 'fuzzy' } : null;
}

/** Functional upsert: increments mention count for a known canonical slug, or mints a new record; learns a new alias slug when the raw candidate differs from the canonical form. */
export function recordCanonicalResolution(
  registry: CanonicalEntityRecord[],
  candidateTag: string,
  resolvedTag: string,
  now: string
): CanonicalEntityRecord[] {
  const candidateSlug = toSlugKey(candidateTag);
  const canonicalSlug = toSlugKey(resolvedTag);
  if (!canonicalSlug) return registry;

  const existingIndex = registry.findIndex((r) => r.id === canonicalSlug);
  if (existingIndex === -1) {
    const aliasSlugs = candidateSlug && candidateSlug !== canonicalSlug ? [candidateSlug] : [];
    return [...registry, { id: canonicalSlug, canonicalTag: resolvedTag, aliasSlugs, mentionCount: 1, firstSeenAt: now, lastSeenAt: now }];
  }

  return registry.map((r, i) => {
    if (i !== existingIndex) return r;
    const learnsNewAlias = candidateSlug && candidateSlug !== canonicalSlug && !r.aliasSlugs.includes(candidateSlug);
    return {
      ...r,
      aliasSlugs: learnsNewAlias ? [...r.aliasSlugs, candidateSlug] : r.aliasSlugs,
      mentionCount: r.mentionCount + 1,
      lastSeenAt: now
    };
  });
}

function rowToRecord(row: Record<string, unknown>): CanonicalEntityRecord {
  let aliasSlugs: string[] = [];
  try {
    const parsed = JSON.parse((row.alias_slugs_json as string) || '[]');
    if (Array.isArray(parsed)) aliasSlugs = parsed;
  } catch {
    aliasSlugs = [];
  }
  return {
    id: row.id as string,
    canonicalTag: row.canonical_tag as string,
    aliasSlugs,
    mentionCount: Number(row.mention_count) || 1,
    firstSeenAt: row.first_seen_at as string,
    lastSeenAt: row.last_seen_at as string
  };
}

/** One bounded SELECT per crawl run — never per-cluster — so the hot path stays non-blocking. */
export async function fetchCanonicalRegistry(config: D1RestConfig | null, fetchFn: typeof fetch): Promise<CanonicalEntityRecord[]> {
  if (!config) return [];
  try {
    const res = await executeD1Query(
      { sql: 'SELECT * FROM canonical_entities ORDER BY last_seen_at DESC LIMIT ?', params: [REGISTRY_FETCH_LIMIT] },
      config,
      fetchFn
    );
    if (!res.ok) {
      console.error(`[CANONICAL ENTITY SYNC] Failed to fetch registry: HTTP ${res.status}`);
      return [];
    }
    return res.rows.map(rowToRecord);
  } catch (err) {
    console.error('[CANONICAL ENTITY SYNC] Unexpected failure fetching registry:', err);
    return [];
  }
}

export async function syncCanonicalRegistryToD1(
  registry: CanonicalEntityRecord[],
  config: D1RestConfig | null,
  fetchFn: typeof fetch
): Promise<{ synced: number; failed: number }> {
  if (!config || registry.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const record of registry) {
    const stmt = {
      sql: `INSERT INTO canonical_entities (id, canonical_tag, alias_slugs_json, mention_count, first_seen_at, last_seen_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          canonical_tag = excluded.canonical_tag,
          alias_slugs_json = excluded.alias_slugs_json,
          mention_count = excluded.mention_count,
          last_seen_at = excluded.last_seen_at;`,
      params: [record.id, record.canonicalTag, JSON.stringify(record.aliasSlugs), record.mentionCount, record.firstSeenAt, record.lastSeenAt]
    };
    try {
      const res = await executeD1Query(stmt, config, fetchFn);
      if (res.ok) {
        synced++;
      } else {
        failed++;
        console.error(`[CANONICAL ENTITY SYNC] Failed to upsert ${record.id}: HTTP ${res.status}`);
      }
    } catch (err) {
      failed++;
      console.error(`[CANONICAL ENTITY SYNC] Error upserting ${record.id}:`, err);
    }
  }

  return { synced, failed };
}

/**
 * Per-cluster orchestrator: resolves/screens the cluster's primaryTag through
 * the Tier 0 canonical lookup + existing Tier 1-3 cascade, then records the
 * resulting mapping back into the in-memory registry (available to later
 * clusters in the same run, and flushed to D1 once via syncCanonicalRegistryToD1).
 * Non-fatal: a screening failure logs loudly and returns the registry unchanged.
 */
export async function screenClusterTagsWithCanonicalLearning(
  cluster: StoryCluster,
  registry: CanonicalEntityRecord[],
  intel: SSBIntelligence | null | undefined,
  deps: { fetchFn?: typeof fetch },
  now: string
): Promise<CanonicalEntityRecord[]> {
  const originalCandidate = cluster.primaryTag;
  try {
    await screenClusterTags(
      cluster,
      intel
        ? { primaryTag: intel.primaryTag, focalEntity: intel.focalEntity, operationalTheater: intel.operationalTheater, hashtags: intel.hashtags }
        : undefined,
      { fetchFn: deps.fetchFn },
      (tag) => resolveCanonicalTag(tag, registry)?.record.canonicalTag ?? null
    );
  } catch (err) {
    console.error(`[TAG SCREENING ERROR] Failed for cluster ${cluster.id}:`, err);
    return registry;
  }

  // The approved tag may have originated from `intel.primaryTag` rather than the cluster's
  // own candidate (e.g. the cluster started with no primaryTag at all) — fall back to the
  // final tag itself so a genuinely new entity still gets registered (self-match, no alias).
  if (!cluster.primaryTag) return registry;
  return recordCanonicalResolution(registry, originalCandidate || cluster.primaryTag, cluster.primaryTag, now);
}
