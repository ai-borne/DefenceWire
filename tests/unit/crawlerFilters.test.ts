/**
 * Unit Tests: Crawler Filters & Relevance Engine
 * Verifies whole-word defence keyword detection, military entity extraction, negative blacklists, and article freshness.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect } from 'vitest';
import {
  isDefenceRelevant,
  filterFreshArticles,
  NON_DEFENCE_BLACKLIST,
  NON_DEFENCE_BLACKLIST_REGEX,
  DEFENCE_WHOLE_WORD_REGEX
} from '../../crawler/filters.js';
import { StorySourceItem } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';
import { FeedConfig } from '../../crawler/feeds.js';

describe('Crawler Filters: Relevance & Negative Blacklisting', () => {
  const nationalFeed: FeedConfig = {
    id: 'the-hindu-national',
    name: 'The Hindu',
    url: 'https://thehindu.com/rss',
    domain: 'thehindu.com',
    tier: SourceTier.TIER_2_NATIONAL,
    defaultCategory: 'procurement',
    enabled: true
  };

  const officialFeed: FeedConfig = {
    id: 'pib-defence',
    name: 'PIB Defence',
    url: 'https://pib.gov.in/rss',
    domain: 'pib.gov.in',
    tier: SourceTier.TIER_1_OFFICIAL,
    defaultCategory: 'strategic',
    enabled: true
  };

  it('exports valid non-empty blacklist and regex patterns', () => {
    expect(NON_DEFENCE_BLACKLIST.length).toBeGreaterThan(10);
    expect(NON_DEFENCE_BLACKLIST).toContain('cricket');
    expect(NON_DEFENCE_BLACKLIST_REGEX.test('cricket tournament')).toBe(true);
    expect(DEFENCE_WHOLE_WORD_REGEX.test('iaf fighter jet')).toBe(true);
  });

  it('rejects articles containing non-defence blacklist keywords even if defence terms are present', () => {
    const item: StorySourceItem = {
      id: 'item-1',
      title: 'Defence Minister Attends Bollywood Box Office Premiere in Mumbai',
      url: 'https://example.com/1',
      sourceName: 'The Hindu',
      sourceDomain: 'thehindu.com',
      tier: SourceTier.TIER_2_NATIONAL,
      publishedAt: '2026-08-31T08:00:00Z',
      snippet: 'Celebrity stars and politicians gather for movie screening.'
    };

    expect(isDefenceRelevant(item, nationalFeed)).toBe(false);
  });

  it('rejects cricket and election rally topics across all source tiers', () => {
    const item: StorySourceItem = {
      id: 'item-2',
      title: 'Army Officers Cheer at Cricket IPL Finals in Chennai',
      url: 'https://pib.gov.in/news/2',
      sourceName: 'PIB India',
      sourceDomain: 'pib.gov.in',
      tier: SourceTier.TIER_1_OFFICIAL,
      publishedAt: '2026-08-31T08:00:00Z'
    };

    expect(isDefenceRelevant(item, officialFeed)).toBe(false);
  });

  it('accepts articles with verified military entities', () => {
    const item: StorySourceItem = {
      id: 'item-3',
      title: 'CCS Clears Prototype Development Funding for AMCA 5th-Gen Fighter',
      url: 'https://thehindu.com/news/3',
      sourceName: 'The Hindu',
      sourceDomain: 'thehindu.com',
      tier: SourceTier.TIER_2_NATIONAL,
      publishedAt: '2026-08-31T08:00:00Z'
    };

    expect(isDefenceRelevant(item, nationalFeed)).toBe(true);
  });

  it('accepts articles with whole-word defence terminology', () => {
    const item: StorySourceItem = {
      id: 'item-4',
      title: 'DRDO Successfully Test Fires VSHORADS Missile from Chandipur',
      url: 'https://thehindu.com/news/4',
      sourceName: 'The Hindu',
      sourceDomain: 'thehindu.com',
      tier: SourceTier.TIER_2_NATIONAL,
      publishedAt: '2026-08-31T08:00:00Z'
    };

    expect(isDefenceRelevant(item, nationalFeed)).toBe(true);
  });

  it('rejects general news without defence relevance from national feeds', () => {
    const item: StorySourceItem = {
      id: 'item-5',
      title: 'New Highway Opened Connecting Delhi and Mumbai',
      url: 'https://thehindu.com/news/5',
      sourceName: 'The Hindu',
      sourceDomain: 'thehindu.com',
      tier: SourceTier.TIER_2_NATIONAL,
      publishedAt: '2026-08-31T08:00:00Z'
    };

    expect(isDefenceRelevant(item, nationalFeed)).toBe(false);
  });
});

describe('Crawler Filters: Article Freshness Window', () => {
  it('filters out articles older than maxAgeHours window', () => {
    const now = new Date('2026-08-31T12:00:00Z');
    const freshItem: StorySourceItem = {
      id: 'fresh-1',
      title: 'IAF inducts new radar systems',
      url: 'https://example.com/fresh',
      sourceName: 'PIB',
      sourceDomain: 'pib.gov.in',
      tier: SourceTier.TIER_1_OFFICIAL,
      publishedAt: '2026-08-31T06:00:00Z' // 6h old
    };

    const staleItem: StorySourceItem = {
      id: 'stale-1',
      title: 'Historic defence accord signed',
      url: 'https://example.com/stale',
      sourceName: 'PIB',
      sourceDomain: 'pib.gov.in',
      tier: SourceTier.TIER_1_OFFICIAL,
      publishedAt: '2026-08-20T00:00:00Z' // 11 days old
    };

    const result = filterFreshArticles([freshItem, staleItem], 72, now);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('fresh-1');
  });
});
