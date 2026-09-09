/**
 * Cross-Cluster Tag Merge Pass for DefenceWire.in (docs/knowledge_base_issues.md#1)
 * Post-hoc reconciliation after the per-cluster Tier0-3 tag cascade
 * (crawler/tagScreening.ts): when the clustering stage (src/engine/clusterEngine.ts)
 * fails to merge two publications' paraphrased coverage of the same event into one
 * StoryCluster, each cluster's primaryTag was screened independently and can settle
 * on different-but-equivalent tags. This pass compares already-tagged clusters
 * within a tight time window and, where they resolve to the same canonical entity,
 * unions their hashtag sets and aligns primaryTag — without re-running clustering.
 * Hard limit: <= 300 LOC.
 */

import { StoryCluster } from '../src/types/news.js';
import { hashtagToSlug } from '../src/utils/hashtagUtils.js';
import { CanonicalEntityRecord, resolveCanonicalTag, recordCanonicalResolution } from './canonicalEntityResolver.js';

/**
 * Cross-cluster merges are riskier than within-cluster canonicalization (distinct
 * clusters may legitimately cover the same entity days apart), so this window is
 * intentionally tighter than clustering's own 48h MAX_CLUSTER_TIME_DIFF_HOURS.
 */
export const TAG_MERGE_WINDOW_HOURS = 12;

function publishedAtMs(cluster: StoryCluster): number {
  const t = new Date(cluster.primarySource?.publishedAt || cluster.createdAt).getTime();
  return isNaN(t) ? 0 : t;
}

/** Resolves a cluster's primaryTag to a stable merge key: canonical registry id if known, else its own slug. Self-keyed clusters only merge with exact slug matches. */
function mergeKeyFor(cluster: StoryCluster, registry: CanonicalEntityRecord[]): string | null {
  if (!cluster.primaryTag) return null;
  const hit = resolveCanonicalTag(cluster.primaryTag, registry);
  if (hit) return hit.record.id;
  const slug = hashtagToSlug(cluster.primaryTag);
  return slug || null;
}

/**
 * Groups clusters sharing a merge key into tight time-window chains (greedy
 * single-linkage, mirroring clusterArticles' grouping shape), skipping singletons.
 * Pure — no I/O.
 */
export function groupClustersForMerge(clusters: StoryCluster[], registry: CanonicalEntityRecord[]): StoryCluster[][] {
  const byKey = new Map<string, StoryCluster[]>();
  for (const cluster of clusters) {
    const key = mergeKeyFor(cluster, registry);
    if (!key) continue;
    const list = byKey.get(key) ?? [];
    list.push(cluster);
    byKey.set(key, list);
  }

  const windowMs = TAG_MERGE_WINDOW_HOURS * 60 * 60 * 1000;
  const groups: StoryCluster[][] = [];

  for (const sameKey of byKey.values()) {
    if (sameKey.length < 2) continue;
    const sorted = [...sameKey].sort((a, b) => publishedAtMs(a) - publishedAtMs(b));
    let chain: StoryCluster[] = [sorted[0]!];
    for (let i = 1; i < sorted.length; i++) {
      const cur = sorted[i]!;
      const prev = chain[chain.length - 1]!;
      if (publishedAtMs(cur) - publishedAtMs(prev) <= windowMs) {
        chain.push(cur);
      } else {
        if (chain.length > 1) groups.push(chain);
        chain = [cur];
      }
    }
    if (chain.length > 1) groups.push(chain);
  }

  return groups;
}

/**
 * Merges one group in place: unions hashtag sets (deduped by slug) and aligns every
 * member's primaryTag to a single winning tag (the canonical registry's tag when the
 * group resolved via a registry hit, else the earliest-published member's own tag).
 * Pure — returns new cluster objects, does not mutate its input.
 */
export function mergeClusterGroup(group: StoryCluster[], registry: CanonicalEntityRecord[]): StoryCluster[] {
  const winningTag =
    resolveCanonicalTag(group[0]!.primaryTag!, registry)?.record.canonicalTag ??
    [...group].sort((a, b) => publishedAtMs(a) - publishedAtMs(b))[0]!.primaryTag!;

  const seenSlugs = new Set<string>();
  const unionedHashtags: string[] = [];
  for (const cluster of group) {
    for (const tag of cluster.hashtags ?? []) {
      const slug = hashtagToSlug(tag);
      if (slug && !seenSlugs.has(slug)) {
        seenSlugs.add(slug);
        unionedHashtags.push(tag);
      }
    }
  }

  return group.map((cluster) => ({
    ...cluster,
    primaryTag: winningTag,
    hashtags: unionedHashtags.length > 0 ? unionedHashtags : cluster.hashtags
  }));
}

export interface TagMergeResult {
  clusters: StoryCluster[];
  registry: CanonicalEntityRecord[];
  mergedGroups: number;
  mergedClusters: number;
}

/**
 * Orchestrator: finds and merges cross-cluster tag duplicates, and records any newly
 * aligned tags back into the canonical registry so future runs converge immediately
 * (self-learning SSOT, same shape as screenClusterTagsWithCanonicalLearning).
 * Non-fatal: a failure logs loudly (Rule 12) and returns the input unchanged.
 */
export function mergeDuplicateClusterTags(
  clusters: StoryCluster[],
  registry: CanonicalEntityRecord[],
  now: string
): TagMergeResult {
  try {
    const groups = groupClustersForMerge(clusters, registry);
    if (groups.length === 0) {
      return { clusters, registry, mergedGroups: 0, mergedClusters: 0 };
    }

    const mergedById = new Map<string, StoryCluster>();
    let updatedRegistry = registry;
    let mergedClusters = 0;

    for (const group of groups) {
      const merged = mergeClusterGroup(group, updatedRegistry);
      for (let i = 0; i < group.length; i++) {
        const original = group[i]!;
        const next = merged[i]!;
        mergedById.set(original.id, next);
        if (next.primaryTag && next.primaryTag !== original.primaryTag) {
          updatedRegistry = recordCanonicalResolution(updatedRegistry, original.primaryTag || next.primaryTag, next.primaryTag, now);
        }
      }
      mergedClusters += group.length;
    }

    const finalClusters = clusters.map((c) => mergedById.get(c.id) ?? c);
    console.log(`[TAG MERGE] ${groups.length} cross-cluster duplicate tag group(s) merged, ${mergedClusters} cluster(s) affected.`);
    return { clusters: finalClusters, registry: updatedRegistry, mergedGroups: groups.length, mergedClusters };
  } catch (err) {
    console.error('[TAG MERGE ERROR] Cross-cluster merge pass failed:', err);
    return { clusters, registry, mergedGroups: 0, mergedClusters: 0 };
  }
}
