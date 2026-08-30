/**
 * Unit & Integration Tests for Crawler Ingestion Pipeline & Quality Gates
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it } from 'vitest';
import { FeedConfig } from '../../crawler/feedTypes.js';
import {
  filterFreshArticles,
  isDefenceRelevant,
  NON_DEFENCE_BLACKLIST_REGEX,
  DEFENCE_WHOLE_WORD_REGEX,
  runIngestionPipeline
} from '../../crawler/ingest.js';
import { StoryCluster, StorySourceItem } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';

const MOCK_TIER1_FEED: FeedConfig = {
  id: 'feed-pib',
  name: 'PIB MoD',
  url: 'https://pib.gov.in/feed.xml',
  domain: 'pib.gov.in',
  tier: SourceTier.TIER_1_OFFICIAL,
  defaultCategory: 'strategic',
  enabled: true
};

const MOCK_TIER2_FEED: FeedConfig = {
  id: 'feed-hindu',
  name: 'The Hindu',
  url: 'https://thehindu.com/feed.xml',
  domain: 'thehindu.com',
  tier: SourceTier.TIER_2_NATIONAL,
  defaultCategory: 'strategic',
  enabled: true
};

const SAMPLE_XML_TEJAS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>PIB Defence</title>
    <item>
      <title>HAL delivers first batch of upgraded Tejas Mk1A fighters to Indian Air Force</title>
      <link>https://pib.gov.in/tejas-mk1a-delivery-batch</link>
      <pubDate>Sun, 30 Aug 2026 09:00:00 GMT</pubDate>
      <description>Equipped with Uttam AESA radar and Astra Beyond Visual Range missiles.</description>
    </item>
    <item>
      <title>Sensex rises 500 points in early trade amid foreign inflows</title>
      <link>https://thehindu.com/sensex-record-high</link>
      <pubDate>Sun, 30 Aug 2026 09:10:00 GMT</pubDate>
      <description>Stock markets rallied today on strong tech earnings.</description>
    </item>
  </channel>
</rss>`;

describe('Crawler Ingestion Pipeline & Quality Gates', () => {
  it('enforces whole-word regex matching without false positive substring matches', () => {
    // "mod" keyword vs "Modi" / "commodity" / "modern"
    expect(DEFENCE_WHOLE_WORD_REGEX.test('MoD signs contract with shipyard')).toBe(true);
    expect(DEFENCE_WHOLE_WORD_REGEX.test('PM Modi addresses gathering')).toBe(false);
    expect(DEFENCE_WHOLE_WORD_REGEX.test('Commodity prices fluctuate in modern retail')).toBe(false);

    // "hal" keyword vs "shall" / "challenge"
    expect(DEFENCE_WHOLE_WORD_REGEX.test('HAL completes flight test')).toBe(true);
    expect(DEFENCE_WHOLE_WORD_REGEX.test('We shall overcome this challenge')).toBe(false);

    // "iaf" keyword vs random substrings
    expect(DEFENCE_WHOLE_WORD_REGEX.test('IAF scrambles fighter jets')).toBe(true);
  });

  it('rejects blacklisted non-defence topics across all feeds including Tier 1', () => {
    const pibMannKiBaat: StorySourceItem = {
      id: 'pib-mkb',
      title: 'Prime Minister addresses 115th episode of Mann Ki Baat',
      url: 'https://pib.gov.in/mann-ki-baat',
      sourceName: 'PIB MoD',
      sourceDomain: 'pib.gov.in',
      tier: SourceTier.TIER_1_OFFICIAL,
      publishedAt: '2026-08-30T08:00:00Z'
    };

    const sensexItem: StorySourceItem = {
      id: 'sensex-1',
      title: 'Sensex jumps 600 points, Nifty above 25,000 on stock market rally',
      url: 'https://thehindu.com/stock-market',
      sourceName: 'The Hindu',
      sourceDomain: 'thehindu.com',
      tier: SourceTier.TIER_2_NATIONAL,
      publishedAt: '2026-08-30T08:00:00Z'
    };

    const cricketItem: StorySourceItem = {
      id: 'cricket-1',
      title: 'BCCI announces Indian cricket squad for IPL tournament',
      url: 'https://thehindu.com/cricket-ipl',
      sourceName: 'The Hindu',
      sourceDomain: 'thehindu.com',
      tier: SourceTier.TIER_2_NATIONAL,
      publishedAt: '2026-08-30T08:00:00Z'
    };

    expect(NON_DEFENCE_BLACKLIST_REGEX.test(pibMannKiBaat.title)).toBe(true);
    expect(isDefenceRelevant(pibMannKiBaat, MOCK_TIER1_FEED)).toBe(false);
    expect(isDefenceRelevant(sensexItem, MOCK_TIER2_FEED)).toBe(false);
    expect(isDefenceRelevant(cricketItem, MOCK_TIER2_FEED)).toBe(false);
  });

  it('accepts genuine defence stories with military entities and defence keywords', () => {
    const defenceItem: StorySourceItem = {
      id: 'it-1',
      title: 'Indian Army deploys indigenous Zorawar light tanks near LAC in Ladakh',
      url: 'https://thehindu.com/army-zorawar',
      sourceName: 'The Hindu',
      sourceDomain: 'thehindu.com',
      tier: SourceTier.TIER_2_NATIONAL,
      publishedAt: '2026-08-30T08:00:00Z'
    };

    expect(isDefenceRelevant(defenceItem, MOCK_TIER2_FEED)).toBe(true);
  });

  it('filters fresh articles by max age limit', () => {
    const now = new Date('2026-08-30T12:00:00Z');
    const freshItem: StorySourceItem = {
      id: 'fresh',
      title: 'DRDO tests Pinaka ER',
      url: 'https://drdo.gov.in/pinaka-er',
      sourceName: 'DRDO',
      sourceDomain: 'drdo.gov.in',
      tier: SourceTier.TIER_1_OFFICIAL,
      publishedAt: '2026-08-30T06:00:00Z' // 6h old
    };

    const staleItem: StorySourceItem = {
      id: 'stale',
      title: 'Ancient military history archived',
      url: 'https://drdo.gov.in/stale',
      sourceName: 'DRDO',
      sourceDomain: 'drdo.gov.in',
      tier: SourceTier.TIER_1_OFFICIAL,
      publishedAt: '2026-08-20T00:00:00Z' // 10 days old
    };

    const filtered = filterFreshArticles([freshItem, staleItem], 72, now);
    expect(filtered.length).toBe(1);
    expect(filtered[0]?.id).toBe('fresh');
  });

  it('preserves curator override locks across crawler runs', async () => {
    const lockedCuratorCluster: StoryCluster = {
      id: 'cluster-curator-lead',
      synthesizedHeadline: '⚡ HUMAN CURATED: Historic Indo-French Submarine Joint Venture Signed',
      primarySource: {
        id: 'curator-ps',
        title: 'Original Wire Headline',
        url: 'https://pib.gov.in/tejas-mk1a-delivery-batch',
        sourceName: 'PIB MoD',
        sourceDomain: 'pib.gov.in',
        tier: SourceTier.TIER_1_OFFICIAL,
        publishedAt: '2026-08-30T09:00:00Z'
      },
      relatedCoverage: [],
      discussions: [],
      categories: ['navy', 'strategic'],
      entities: ['Project 75I'],
      defenceScore: 130,
      isLeadStory: true,
      isEditorPromoted: true,
      createdAt: '2026-08-30T09:00:00Z',
      updatedAt: '2026-08-30T09:00:00Z',
      ssbIntel: {
        whyItMatters: 'Curator custom editorial brief',
        gdLecturettePoints: ['Point 1'],
        potentialInterviewQuestions: ['Q1']
      }
    };

    const mockFetch = async () => new Response(SAMPLE_XML_TEJAS, { status: 200 });

    const result = await runIngestionPipeline({
      feeds: [MOCK_TIER1_FEED],
      maxAgeHours: 72,
      outputPath: null,
      fetchFn: mockFetch as typeof fetch,
      existingClusters: [lockedCuratorCluster]
    });

    const lead = result.clusters[0];
    expect(lead).toBeDefined();
    expect(lead?.isEditorPromoted).toBe(true);
    expect(lead?.isLeadStory).toBe(true);
    expect(lead?.synthesizedHeadline).toContain('HUMAN CURATED');
    expect(lead?.ssbIntel?.whyItMatters).toBe('Curator custom editorial brief');
  });

  it('preserves existing dataset when total network failure occurs (Atomic Commit Guard)', async () => {
    const existingDataset: StoryCluster[] = [
      {
        id: 'c-existing',
        synthesizedHeadline: 'Existing Protected Story',
        primarySource: {
          id: 'ps-existing',
          title: 'Existing Story',
          url: 'https://mod.gov.in/existing',
          sourceName: 'MoD',
          sourceDomain: 'mod.gov.in',
          tier: SourceTier.TIER_1_OFFICIAL,
          publishedAt: '2026-08-30T08:00:00Z'
        },
        relatedCoverage: [],
        discussions: [],
        categories: ['strategic'],
        entities: ['MoD'],
        defenceScore: 80,
        isLeadStory: true,
        createdAt: '2026-08-30T08:00:00Z',
        updatedAt: '2026-08-30T08:00:00Z'
      }
    ];

    const failingFetch = async () => new Response('', { status: 500 });

    const result = await runIngestionPipeline({
      feeds: [MOCK_TIER1_FEED],
      outputPath: null,
      fetchFn: failingFetch as typeof fetch,
      existingClusters: existingDataset
    });

    expect(result.totalIngested).toBe(0);
    expect(result.clusters.length).toBe(1);
    expect(result.clusters[0]?.id).toBe('c-existing');
  });
});
