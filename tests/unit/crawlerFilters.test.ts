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

  it('rejects agricultural, dairy, civic and commodity procurement from national feeds', () => {
    const milkItem: StorySourceItem = {
      id: 'item-milk',
      title: 'Tamil Nadu CM Vijay announces further hike of milk procurement price to ₹44 per litre',
      url: 'https://thehindu.com/news/national/tamil-nadu/milk-procurement-price/1',
      sourceName: 'The Hindu',
      sourceDomain: 'thehindu.com',
      tier: SourceTier.TIER_2_NATIONAL,
      publishedAt: '2026-08-31T08:00:00Z',
      snippet: 'Last week, CM Vijay had announced that the government had increased the procurement price by ₹3.'
    };

    const paddyItem: StorySourceItem = {
      id: 'item-paddy',
      title: 'Centre hikes paddy procurement MSP by ₹117 per quintal for kharif season',
      url: 'https://hindustantimes.com/india-news/paddy-msp-procurement/2',
      sourceName: 'Hindustan Times',
      sourceDomain: 'hindustantimes.com',
      tier: SourceTier.TIER_2_NATIONAL,
      publishedAt: '2026-08-31T08:00:00Z'
    };

    const busItem: StorySourceItem = {
      id: 'item-bus',
      title: 'State cabinet approves municipal tender for 500 electric bus procurement',
      url: 'https://thehindu.com/news/bus-procurement/3',
      sourceName: 'The Hindu',
      sourceDomain: 'thehindu.com',
      tier: SourceTier.TIER_2_NATIONAL,
      publishedAt: '2026-08-31T08:00:00Z'
    };

    expect(isDefenceRelevant(milkItem, nationalFeed)).toBe(false);
    expect(isDefenceRelevant(paddyItem, nationalFeed)).toBe(false);
    expect(isDefenceRelevant(busItem, nationalFeed)).toBe(false);
  });

  it('accepts legitimate defence and military procurement items', () => {
    const akashItem: StorySourceItem = {
      id: 'item-akash',
      title: 'IAF, MoD Consider Major Akash-NG Procurement With Around 1,000 Missiles Order Book',
      url: 'https://thehindu.com/news/defence/akash-procurement/4',
      sourceName: 'The Hindu',
      sourceDomain: 'thehindu.com',
      tier: SourceTier.TIER_2_NATIONAL,
      publishedAt: '2026-08-31T08:00:00Z'
    };

    const dacItem: StorySourceItem = {
      id: 'item-dac',
      title: 'DAC Clears Capital Acquisition of 31 MQ-9B Drones for Armed Forces',
      url: 'https://thehindu.com/news/defence/dac-mq9b/5',
      sourceName: 'The Hindu',
      sourceDomain: 'thehindu.com',
      tier: SourceTier.TIER_2_NATIONAL,
      publishedAt: '2026-08-31T08:00:00Z'
    };

    const armyItem: StorySourceItem = {
      id: 'item-army',
      title: 'Indian Army floats preliminary tender for 307 ATAGS howitzers',
      url: 'https://thehindu.com/news/defence/atags-tender/6',
      sourceName: 'The Hindu',
      sourceDomain: 'thehindu.com',
      tier: SourceTier.TIER_2_NATIONAL,
      publishedAt: '2026-08-31T08:00:00Z'
    };

    expect(isDefenceRelevant(akashItem, nationalFeed)).toBe(true);
    expect(isDefenceRelevant(dacItem, nationalFeed)).toBe(true);
    expect(isDefenceRelevant(armyItem, nationalFeed)).toBe(true);
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
