/**
 * Unit Tests: Crawler Filters & Relevance Engine
 * Verifies whole-word defence keyword detection, military entity extraction, negative blacklists, and article freshness.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect } from 'vitest';
import {
  isDefenceRelevant,
  screenAmbiguousArticle,
  filterFreshArticles,
  NON_DEFENCE_BLACKLIST,
  NON_DEFENCE_BLACKLIST_REGEX,
  DEFENCE_WHOLE_WORD_REGEX
} from '../../crawler/filters.js';

import { StorySourceItem } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';
import { FeedConfig } from '../../crawler/feeds.js';

function createMockItem(id: string, title: string, tier = SourceTier.TIER_2_NATIONAL, snippet?: string): StorySourceItem {
  return {
    id,
    title,
    url: `https://example.com/${id}`,
    sourceName: 'The Hindu',
    sourceDomain: 'thehindu.com',
    tier,
    publishedAt: '2026-08-31T08:00:00Z',
    snippet
  };
}

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
    const item = createMockItem('item-1', 'Defence Minister Attends Bollywood Box Office Premiere in Mumbai', SourceTier.TIER_2_NATIONAL, 'Celebrity stars gather');
    expect(isDefenceRelevant(item, nationalFeed)).toBe(false);
  });

  it('rejects cricket and election rally topics across all source tiers', () => {
    const item = createMockItem('item-2', 'Army Officers Cheer at Cricket IPL Finals in Chennai', SourceTier.TIER_1_OFFICIAL);
    expect(isDefenceRelevant(item, officialFeed)).toBe(false);
  });

  it('accepts articles with verified military entities', () => {
    const item = createMockItem('item-3', 'CCS Clears Prototype Development Funding for AMCA 5th-Gen Fighter');
    expect(isDefenceRelevant(item, nationalFeed)).toBe(true);
  });

  it('accepts articles with whole-word defence terminology', () => {
    const item = createMockItem('item-4', 'DRDO Successfully Test Fires VSHORADS Missile from Chandipur');
    expect(isDefenceRelevant(item, nationalFeed)).toBe(true);
  });

  it('rejects general news without defence relevance from national feeds', () => {
    const item = createMockItem('item-5', 'New Highway Opened Connecting Delhi and Mumbai');
    expect(isDefenceRelevant(item, nationalFeed)).toBe(false);
  });

  it('rejects agricultural, dairy, civic and commodity procurement from national feeds', () => {
    const milk = createMockItem('item-milk', 'Tamil Nadu CM Vijay announces further hike of milk procurement price to ₹44 per litre');
    const paddy = createMockItem('item-paddy', 'Centre hikes paddy procurement MSP by ₹117 per quintal for kharif season');
    const bus = createMockItem('item-bus', 'State cabinet approves municipal tender for 500 electric bus procurement');

    expect(isDefenceRelevant(milk, nationalFeed)).toBe(false);
    expect(isDefenceRelevant(paddy, nationalFeed)).toBe(false);
    expect(isDefenceRelevant(bus, nationalFeed)).toBe(false);
  });

  it('accepts legitimate defence and military procurement items', () => {
    const akash = createMockItem('item-akash', 'IAF, MoD Consider Major Akash-NG Procurement With Around 1,000 Missiles Order Book');
    const dac = createMockItem('item-dac', 'DAC Clears Capital Acquisition of 31 MQ-9B Drones for Armed Forces');
    const army = createMockItem('item-army', 'Indian Army floats preliminary tender for 307 ATAGS howitzers');

    expect(isDefenceRelevant(akash, nationalFeed)).toBe(true);
    expect(isDefenceRelevant(dac, nationalFeed)).toBe(true);
    expect(isDefenceRelevant(army, nationalFeed)).toBe(true);
  });

  it('rejects educational, courtroom, and civic municipal spam from national wires even if defence words exist', () => {
    const exam = createMockItem('item-exam', 'NTA releases NEET UG 2026 admit card for defence quota students');
    const court = createMockItem('item-court', 'Supreme Court rejects bail plea in murder trial hearing of ex-serviceman');
    const tax = createMockItem('item-tax', 'Municipal corporation hikes property tax rates across commercial zones');

    expect(isDefenceRelevant(exam, nationalFeed)).toBe(false);
    expect(isDefenceRelevant(court, nationalFeed)).toBe(false);
    expect(isDefenceRelevant(tax, nationalFeed)).toBe(false);
  });

  it('accepts articles covering Indian defence PSUs, private primes and modern electronic warfare', () => {
    const bel = createMockItem('item-bel', 'BEL secures ₹2,500 crore export order for radar warning receivers');
    const tasl = createMockItem('item-tasl', 'TASL opens new defense aerospace facility in Hyderabad');
    const mdl = createMockItem('item-mdl', 'MDL delivers new offshore vessel to coast guard');
    const ew = createMockItem('item-ew', 'Indian forces deploy counter-drone electronic warfare systems along borders');

    expect(isDefenceRelevant(bel, nationalFeed)).toBe(true);
    expect(isDefenceRelevant(tasl, nationalFeed)).toBe(true);
    expect(isDefenceRelevant(mdl, nationalFeed)).toBe(true);
    expect(isDefenceRelevant(ew, nationalFeed)).toBe(true);
  });
});

describe('Crawler Filters: Article Freshness Window', () => {
  it('filters out articles older than maxAgeHours window', () => {
    const now = new Date('2026-08-31T12:00:00Z');
    const freshItem = createMockItem('fresh-1', 'IAF inducts new radar systems', SourceTier.TIER_1_OFFICIAL);
    freshItem.publishedAt = '2026-08-31T06:00:00Z'; // 6h old

    const staleItem = createMockItem('stale-1', 'Historic defence accord signed', SourceTier.TIER_1_OFFICIAL);
    staleItem.publishedAt = '2026-08-20T00:00:00Z'; // 11 days old

    const result = filterFreshArticles([freshItem, staleItem], 72, now);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('fresh-1');
  });

  it('delegates ambiguous screening to Cloudflare AI layer', async () => {
    const ambiguousItem = createMockItem(
      'amb-1',
      'Strategic partnership announced for advanced navigation hardware',
      SourceTier.TIER_2_NATIONAL
    );

    const mockFetch = async () =>
      new Response(
        JSON.stringify({
          result: {
            response: JSON.stringify({
              isMilitaryDefence: true,
              confidence: 0.88,
              category: 'tech',
              strategicSignificance: 'medium',
              strategicBonus: 10,
              discoveredEntities: ['NavIC-M'],
              actionSignature: 'rnd',
              rationale: 'Military grade navigation satellite hardware partnership.'
            })
          }
        }),
        { status: 200 }
      );

    const screenRes = await screenAmbiguousArticle(ambiguousItem, {
      accountId: 'acc-1',
      apiToken: 'tok-1',
      fetchFn: mockFetch as typeof fetch
    });

    expect(screenRes).not.toBeNull();
    expect(screenRes?.isMilitaryDefence).toBe(true);
    expect(screenRes?.discoveredEntities).toContain('NavIC-M');
  });
});

