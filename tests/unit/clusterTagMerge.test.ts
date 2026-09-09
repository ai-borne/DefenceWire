/**
 * Unit Tests for Cross-Cluster Tag Merge Pass (docs/knowledge_base_issues.md#1)
 * Verifies that clusters clustering itself failed to merge (paraphrased coverage
 * of the same event) but which independently resolved to the same/aliased
 * canonical tag get their hashtag sets unioned and primaryTag aligned, without
 * touching clusters that are genuinely distinct or outside the merge window.
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it } from 'vitest';
import {
  TAG_MERGE_WINDOW_HOURS,
  groupClustersForMerge,
  mergeClusterGroup,
  mergeDuplicateClusterTags
} from '../../crawler/clusterTagMerge.js';
import { CanonicalEntityRecord } from '../../crawler/canonicalEntityResolver.js';
import { StoryCluster, StorySourceItem } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';

function makeCluster(overrides: Partial<StoryCluster> & { id: string; primaryTag?: string; publishedAt?: string }): StoryCluster {
  const publishedAt = overrides.publishedAt ?? '2026-09-01T10:00:00Z';
  const source: StorySourceItem = {
    id: `src-${overrides.id}`,
    title: overrides.synthesizedHeadline || 'Test headline',
    snippet: '',
    url: `https://example.com/${overrides.id}`,
    sourceName: 'Test Source',
    sourceDomain: 'example.com',
    tier: SourceTier.TIER_1_OFFICIAL,
    publishedAt
  };
  return {
    id: overrides.id,
    synthesizedHeadline: overrides.synthesizedHeadline || 'Test headline',
    primarySource: source,
    relatedCoverage: [],
    discussions: [],
    categories: ['strategic'],
    entities: [],
    primaryTag: overrides.primaryTag,
    hashtags: overrides.hashtags,
    defenceScore: 50,
    isLeadStory: false,
    createdAt: publishedAt,
    updatedAt: publishedAt
  };
}

function makeRecord(overrides: Partial<CanonicalEntityRecord> = {}): CanonicalEntityRecord {
  return {
    id: 's-400-triumf',
    canonicalTag: '#S-400-Triumf',
    aliasSlugs: [],
    mentionCount: 5,
    firstSeenAt: '2026-08-01T00:00:00Z',
    lastSeenAt: '2026-08-01T00:00:00Z',
    ...overrides
  };
}

describe('groupClustersForMerge', () => {
  it('groups two clusters within the time window that resolve to the same canonical entity via fuzzy match', () => {
    // 's-400' vs 's-400-triumf' share {s,400} out of a 3-token union -> 0.67 Jaccard, clears the 0.6 threshold.
    const registry = [makeRecord()];
    const a = makeCluster({ id: 'a', primaryTag: '#S-400-Triumf', publishedAt: '2026-09-01T08:00:00Z' });
    const b = makeCluster({ id: 'b', primaryTag: '#S-400', publishedAt: '2026-09-01T09:00:00Z' });

    const groups = groupClustersForMerge([a, b], registry);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.map((c) => c.id).sort()).toEqual(['a', 'b']);
  });

  it('groups clusters with an identical primaryTag even with no registry entry (self-key match)', () => {
    const a = makeCluster({ id: 'a', primaryTag: '#Agni-5', publishedAt: '2026-09-01T08:00:00Z' });
    const b = makeCluster({ id: 'b', primaryTag: '#Agni-5', publishedAt: '2026-09-01T09:00:00Z' });

    const groups = groupClustersForMerge([a, b], []);
    expect(groups).toHaveLength(1);
  });

  it('does not group clusters whose tags never resolve to the same canonical entity', () => {
    const a = makeCluster({ id: 'a', primaryTag: '#S-400', publishedAt: '2026-09-01T08:00:00Z' });
    const b = makeCluster({ id: 'b', primaryTag: '#BrahMos', publishedAt: '2026-09-01T09:00:00Z' });

    const groups = groupClustersForMerge([a, b], []);
    expect(groups).toHaveLength(0);
  });

  it('does not group same-tag clusters that fall outside the tight merge window', () => {
    const a = makeCluster({ id: 'a', primaryTag: '#Agni-5', publishedAt: '2026-09-01T00:00:00Z' });
    const b = makeCluster({
      id: 'b',
      primaryTag: '#Agni-5',
      publishedAt: new Date(new Date('2026-09-01T00:00:00Z').getTime() + (TAG_MERGE_WINDOW_HOURS + 1) * 3600_000).toISOString()
    });

    expect(groupClustersForMerge([a, b], [])).toHaveLength(0);
  });

  it('ignores clusters with no primaryTag', () => {
    const a = makeCluster({ id: 'a', primaryTag: undefined });
    const b = makeCluster({ id: 'b', primaryTag: undefined });
    expect(groupClustersForMerge([a, b], [])).toHaveLength(0);
  });
});

describe('mergeClusterGroup', () => {
  it('unions hashtag sets across the group, deduping by slug', () => {
    const a = makeCluster({ id: 'a', primaryTag: '#Agni-5', hashtags: ['#DRDO', '#MIRV'] });
    const b = makeCluster({ id: 'b', primaryTag: '#Agni-5', hashtags: ['#MIRV', '#BallisticMissile'] });

    const merged = mergeClusterGroup([a, b], []);
    expect(merged[0]!.hashtags).toEqual(['#DRDO', '#MIRV', '#BallisticMissile']);
    expect(merged[1]!.hashtags).toEqual(['#DRDO', '#MIRV', '#BallisticMissile']);
  });

  it('aligns every member to the canonical registry tag when the group resolved via a registry hit', () => {
    const registry = [makeRecord()];
    const a = makeCluster({ id: 'a', primaryTag: '#S-400-Triumf' });
    const b = makeCluster({ id: 'b', primaryTag: '#S-400' });

    const merged = mergeClusterGroup([a, b], registry);
    expect(merged[0]!.primaryTag).toBe('#S-400-Triumf');
    expect(merged[1]!.primaryTag).toBe('#S-400-Triumf');
  });

  it('does not mutate the input cluster objects', () => {
    const a = makeCluster({ id: 'a', primaryTag: '#Agni-5', hashtags: ['#DRDO'] });
    const b = makeCluster({ id: 'b', primaryTag: '#Agni-5', hashtags: ['#MIRV'] });
    const snapshotA = JSON.stringify(a);

    mergeClusterGroup([a, b], []);
    expect(JSON.stringify(a)).toBe(snapshotA);
  });
});

describe('mergeDuplicateClusterTags', () => {
  it('merges matching clusters and records the alignment back into the registry', () => {
    const registry = [makeRecord()];
    const a = makeCluster({ id: 'a', primaryTag: '#S-400-Triumf', publishedAt: '2026-09-01T08:00:00Z' });
    const b = makeCluster({ id: 'b', primaryTag: '#S-400', publishedAt: '2026-09-01T09:00:00Z' });

    const result = mergeDuplicateClusterTags([a, b], registry, '2026-09-01T09:30:00Z');

    expect(result.mergedGroups).toBe(1);
    expect(result.mergedClusters).toBe(2);
    expect(result.clusters.find((c) => c.id === 'b')!.primaryTag).toBe('#S-400-Triumf');
    const record = result.registry.find((r) => r.id === 's-400-triumf')!;
    expect(record.aliasSlugs).toContain('s-400');
    expect(record.mentionCount).toBe(6);
  });

  it('leaves clusters untouched when nothing merges', () => {
    const a = makeCluster({ id: 'a', primaryTag: '#S-400-Triumf' });
    const b = makeCluster({ id: 'b', primaryTag: '#BrahMos' });

    const result = mergeDuplicateClusterTags([a, b], [], '2026-09-01T09:30:00Z');
    expect(result.mergedGroups).toBe(0);
    expect(result.clusters).toEqual([a, b]);
  });

  it('preserves clusters not part of any merge group alongside merged ones', () => {
    const a = makeCluster({ id: 'a', primaryTag: '#Agni-5', publishedAt: '2026-09-01T08:00:00Z' });
    const b = makeCluster({ id: 'b', primaryTag: '#Agni-5', publishedAt: '2026-09-01T09:00:00Z' });
    const c = makeCluster({ id: 'c', primaryTag: '#INS-Vikrant', publishedAt: '2026-09-01T08:30:00Z' });

    const result = mergeDuplicateClusterTags([a, b, c], [], '2026-09-01T09:30:00Z');
    expect(result.clusters).toHaveLength(3);
    expect(result.clusters.find((x) => x.id === 'c')!.primaryTag).toBe('#INS-Vikrant');
  });
});
