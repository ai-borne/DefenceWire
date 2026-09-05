/**
 * Unit Tests for NewsViewModel.deleteCluster — Phase 3 permanent tombstone.
 * Validates exclusion from both the public feed and the desk's own
 * candidate list, and that deleted IDs remain retrievable for publish.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import { NewsViewModel } from '../../src/viewmodels/NewsViewModel.js';
import { StoryCluster } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';

function makeCluster(id: string, overrides: Partial<StoryCluster> = {}): StoryCluster {
  return {
    id,
    synthesizedHeadline: `Headline for ${id}`,
    primarySource: {
      id: `src-${id}`,
      title: `Title ${id}`,
      url: `https://example.com/${id}`,
      sourceName: 'Example',
      sourceDomain: 'example.com',
      tier: SourceTier.TIER_2_NATIONAL,
      publishedAt: '2026-08-01T00:00:00Z'
    },
    relatedCoverage: [],
    discussions: [],
    categories: ['army'],
    entities: [],
    defenceScore: 50,
    isLeadStory: false,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
    ...overrides
  };
}

describe('NewsViewModel.deleteCluster (Phase 3 tombstone)', () => {
  it('excludes a deleted cluster from the public filtered feed', () => {
    const vm = new NewsViewModel([makeCluster('c-1'), makeCluster('c-2')], []);
    vm.deleteCluster('c-1');

    const feed = vm.getFilteredClusters();
    expect(feed.totalMatchingStories).toBe(1);
    expect(feed.leadStory?.id).toBe('c-2');
    expect(feed.regularClusters.some((c) => c.id === 'c-1')).toBe(false);
  });

  it('excludes a deleted cluster from getAllClusters(true) — unlike ignore, there is no review view for it', () => {
    const vm = new NewsViewModel([makeCluster('c-1'), makeCluster('c-2')], []);
    vm.deleteCluster('c-1');

    const all = vm.getAllClusters(true);
    expect(all.some((c) => c.id === 'c-1')).toBe(false);
    expect(all.some((c) => c.id === 'c-2')).toBe(true);
  });

  it('is permanent — deleteCluster has no restore counterpart, unlike toggleIgnore', () => {
    const vm = new NewsViewModel([makeCluster('c-1')], []);
    vm.deleteCluster('c-1');
    vm.deleteCluster('c-1');

    expect(vm.getAllClusters(true)).toHaveLength(0);
    expect(vm.getDeletedClusterIds()).toEqual(['c-1']);
  });

  it('keeps a deleted cluster ID retrievable via getDeletedClusterIds for publish, even though every read view excludes it', () => {
    const vm = new NewsViewModel([makeCluster('c-1'), makeCluster('c-2')], []);
    expect(vm.getDeletedClusterIds()).toEqual([]);

    vm.deleteCluster('c-1');
    expect(vm.getDeletedClusterIds()).toEqual(['c-1']);
    expect(vm.getClusterById('c-1')?.isDeleted).toBe(true);
  });

  it('notifies subscribers when a cluster is deleted', () => {
    const vm = new NewsViewModel([makeCluster('c-1')], []);
    const listener = vi.fn();
    vm.subscribe(listener);

    vm.deleteCluster('c-1');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
