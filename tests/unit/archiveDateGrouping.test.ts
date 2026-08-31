/**
 * Unit Tests for Archive Date Grouping
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect } from 'vitest';
import { StoryCluster } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';
import { groupStoriesByDate } from '../../src/archive/archiveDateGrouping.js';

function makeStory(id: string, publishedAt: string): StoryCluster {
  return {
    id,
    synthesizedHeadline: `Headline ${id}`,
    primarySource: {
      id: `src-${id}`,
      title: `Title ${id}`,
      url: `https://example.com/${id}`,
      sourceName: 'Example',
      sourceDomain: 'example.com',
      tier: SourceTier.TIER_2_NATIONAL,
      publishedAt
    },
    relatedCoverage: [],
    discussions: [],
    categories: ['army'],
    entities: [],
    defenceScore: 50,
    isLeadStory: false,
    createdAt: publishedAt,
    updatedAt: publishedAt
  };
}

const NOW = new Date('2026-08-31T12:00:00Z');

describe('groupStoriesByDate', () => {
  it('groups stories published on the same IST calendar day together', () => {
    const stories = [makeStory('a', '2026-08-30T10:00:00Z'), makeStory('b', '2026-08-30T18:00:00Z')];
    const groups = groupStoriesByDate(stories, NOW);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.stories).toHaveLength(2);
  });

  it('splits stories from different days into separate groups, preserving date-descending input order', () => {
    const stories = [makeStory('b', '2026-08-30T10:00:00Z'), makeStory('a', '2026-08-25T10:00:00Z')];
    const groups = groupStoriesByDate(stories, NOW);
    expect(groups).toHaveLength(2);
    expect(groups[0]?.stories[0]?.id).toBe('b');
    expect(groups[1]?.stories[0]?.id).toBe('a');
  });

  it('labels the current IST day as "Today"', () => {
    const stories = [makeStory('a', '2026-08-31T08:00:00Z')];
    const groups = groupStoriesByDate(stories, NOW);
    expect(groups[0]?.dateLabel).toBe('Today');
  });

  it('labels the previous IST day as "Yesterday"', () => {
    const stories = [makeStory('a', '2026-08-30T08:00:00Z')];
    const groups = groupStoriesByDate(stories, NOW);
    expect(groups[0]?.dateLabel).toBe('Yesterday');
  });

  it('labels older days with a formatted date', () => {
    const stories = [makeStory('a', '2026-08-15T08:00:00Z')];
    const groups = groupStoriesByDate(stories, NOW);
    expect(groups[0]?.dateLabel).toMatch(/15 Aug 2026/);
  });

  it('returns an empty array for an empty input', () => {
    expect(groupStoriesByDate([], NOW)).toEqual([]);
  });

  it('preserves input order within a group rather than re-sorting', () => {
    const stories = [makeStory('b', '2026-08-30T18:00:00Z'), makeStory('a', '2026-08-30T10:00:00Z')];
    const groups = groupStoriesByDate(stories, NOW);
    expect(groups[0]?.stories.map((s) => s.id)).toEqual(['b', 'a']);
  });
});
