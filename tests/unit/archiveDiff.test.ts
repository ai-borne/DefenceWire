/**
 * Unit Tests for Archive Diff Detection
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect } from 'vitest';
import { StoryCluster } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';
import { findClustersToArchive } from '../../src/archive/archiveDiff.js';

function makeCluster(id: string): StoryCluster {
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
    updatedAt: '2026-08-01T00:00:00Z'
  };
}

describe('findClustersToArchive', () => {
  it('returns clusters present in the previous run but absent from the next run', () => {
    const previous = [makeCluster('a'), makeCluster('b'), makeCluster('c')];
    const next = [makeCluster('a'), makeCluster('c')];

    const result = findClustersToArchive(previous, next);

    expect(result.map((c) => c.id)).toEqual(['b']);
  });

  it('returns an empty array when nothing was popped', () => {
    const previous = [makeCluster('a'), makeCluster('b')];
    const next = [makeCluster('a'), makeCluster('b')];

    expect(findClustersToArchive(previous, next)).toEqual([]);
  });

  it('returns an empty array when there is no previous run', () => {
    expect(findClustersToArchive([], [makeCluster('a')])).toEqual([]);
  });

  it('treats all previous clusters as popped when the next run is empty', () => {
    const previous = [makeCluster('a'), makeCluster('b')];
    expect(findClustersToArchive(previous, []).map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('does not mutate either input array', () => {
    const previous = [makeCluster('a'), makeCluster('b')];
    const next = [makeCluster('a')];
    const previousCopy = [...previous];
    const nextCopy = [...next];

    findClustersToArchive(previous, next);

    expect(previous).toEqual(previousCopy);
    expect(next).toEqual(nextCopy);
  });
});
