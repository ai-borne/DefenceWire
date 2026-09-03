/**
 * Unit Tests for Supplier <-> Wire Story Matcher (Phase 2.7)
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it } from 'vitest';
import {
  getCompiledSupplierMatchers,
  matchSuppliersInText,
  getRelatedStoriesForSupplier
} from '../../src/engine/supplierMatcher.js';
import { ALL_SUPPLIERS } from '../../src/data/suppliers/seedSuppliers.js';
import { StoryCluster, StorySourceItem } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';

function makeSource(overrides: Partial<StorySourceItem> = {}): StorySourceItem {
  return {
    id: 'story-1',
    title: '',
    url: 'https://example.com/story',
    sourceName: 'Example Wire',
    sourceDomain: 'example.com',
    tier: 'tier1' as SourceTier,
    publishedAt: '2026-09-01T00:00:00.000Z',
    ...overrides
  };
}

function makeCluster(overrides: Partial<StoryCluster> = {}): StoryCluster {
  return {
    id: 'cluster-1',
    synthesizedHeadline: '',
    primarySource: makeSource(),
    relatedCoverage: [],
    discussions: [],
    categories: ['tech'],
    entities: [],
    defenceScore: 50,
    isLeadStory: false,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides
  };
}

describe('Supplier Wire Story Matcher', () => {
  it('pre-compiles a matcher for every verified supplier', () => {
    const matchers = getCompiledSupplierMatchers();
    expect(matchers.length).toBe(ALL_SUPPLIERS.length);
    for (const m of matchers) {
      expect(m.supplier).toBeDefined();
      expect(m.regex).toBeInstanceOf(RegExp);
    }
  });

  it('matches a supplier by its known public abbreviation, not just its full legal name', () => {
    const bel = ALL_SUPPLIERS.find((s) => s.id === 'bel');
    expect(bel).toBeDefined();
    expect(bel!.aliases).toContain('BEL');

    const matches = matchSuppliersInText('BEL delivers Uttam AESA radar units for Tejas Mk1A');
    expect(matches.map((s) => s.id)).toContain('bel');
  });

  it('matches a supplier by its full name when no alias is present in the text', () => {
    const matches = matchSuppliersInText('Hindustan Aeronautics Limited rolls out its 20th Tejas Mk1A');
    expect(matches.map((s) => s.id)).toContain('hal');
  });

  it('does not false-positive match a supplier whose name/alias is absent from the text', () => {
    const matches = matchSuppliersInText('DRDO conducts a successful trial of the Agni-V missile');
    expect(matches.map((s) => s.id)).not.toContain('bel');
    expect(matches.map((s) => s.id)).not.toContain('hal');
  });

  it('returns live feed clusters whose headline/snippet/entities mention the given supplier', () => {
    const matching = makeCluster({
      id: 'match',
      synthesizedHeadline: 'BEL wins new radar order for the Indian Air Force'
    });
    const nonMatching = makeCluster({ id: 'no-match', synthesizedHeadline: 'DRDO tests hypersonic glide vehicle' });

    const related = getRelatedStoriesForSupplier('bel', [matching, nonMatching]);
    expect(related.map((c) => c.id)).toEqual(['match']);
  });

  it('returns an empty array for an unknown supplier id or empty cluster list', () => {
    expect(getRelatedStoriesForSupplier('not-a-real-supplier', [makeCluster()])).toEqual([]);
    expect(getRelatedStoriesForSupplier('bel', [])).toEqual([]);
  });
});
