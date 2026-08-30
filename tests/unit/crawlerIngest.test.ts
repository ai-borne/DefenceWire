/**
 * Unit & Integration Tests for Crawler Ingestion Pipeline & Summarizer
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it } from 'vitest';
import { FeedConfig } from '../../crawler/feedTypes.js';
import {
  filterFreshArticles,
  isDefenceRelevant,
  runIngestionPipeline
} from '../../crawler/ingest.js';
import {
  generateHeuristicSSBIntel,
  summarizeWithGemini
} from '../../crawler/summarizer.js';
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

describe('Crawler Ingestion Pipeline & Summarizer', () => {
  it('filters articles based on defence relevance and source tier', () => {
    const defenceItem: StorySourceItem = {
      id: 'it-1',
      title: 'Indian Army deploys indigenous Zorawar light tanks near LAC in Ladakh',
      url: 'https://thehindu.com/army-zorawar',
      sourceName: 'The Hindu',
      sourceDomain: 'thehindu.com',
      tier: SourceTier.TIER_2_NATIONAL,
      publishedAt: '2026-08-30T08:00:00Z'
    };

    const noiseItem: StorySourceItem = {
      id: 'it-2',
      title: 'Bollywood celebrity wedding ceremony in Mumbai draws massive crowds',
      url: 'https://thehindu.com/bollywood-wedding',
      sourceName: 'The Hindu',
      sourceDomain: 'thehindu.com',
      tier: SourceTier.TIER_2_NATIONAL,
      publishedAt: '2026-08-30T08:00:00Z'
    };

    expect(isDefenceRelevant(defenceItem, MOCK_TIER2_FEED)).toBe(true);
    expect(isDefenceRelevant(noiseItem, MOCK_TIER2_FEED)).toBe(false);

    // Tier 1 feeds pass directly
    expect(isDefenceRelevant(noiseItem, MOCK_TIER1_FEED)).toBe(true);
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

  it('generates rich heuristic SSB intelligence for clusters', () => {
    const cluster: StoryCluster = {
      id: 'c-test',
      synthesizedHeadline: 'HAL Delivers First Batch of Tejas Mk1A Fighters to IAF',
      primarySource: {
        id: 'ps-1',
        title: 'HAL Delivers Tejas Mk1A',
        url: 'https://pib.gov.in/tejas',
        sourceName: 'PIB MoD',
        sourceDomain: 'pib.gov.in',
        tier: SourceTier.TIER_1_OFFICIAL,
        publishedAt: '2026-08-30T09:00:00Z'
      },
      relatedCoverage: [],
      discussions: [],
      categories: ['airforce', 'tech'],
      entities: ['Tejas Mk1A', 'HAL'],
      defenceScore: 85,
      isLeadStory: true,
      createdAt: '2026-08-30T09:00:00Z',
      updatedAt: '2026-08-30T09:00:00Z'
    };

    const intel = generateHeuristicSSBIntel(cluster);

    expect(intel.whyItMatters).toBeTruthy();
    expect(intel.gdLecturettePoints.length).toBeGreaterThanOrEqual(3);
    expect(intel.potentialInterviewQuestions.length).toBeGreaterThanOrEqual(3);
    expect(intel.defenceTechTakeaway?.platformOrSystem).toBe('Tejas Mk1A');
    expect(intel.defenceTechTakeaway?.specifications.length).toBeGreaterThanOrEqual(2);
  });

  it('handles Gemini Flash LLM summarization with valid responses and fallbacks', async () => {
    const cluster: StoryCluster = {
      id: 'c-gemini',
      synthesizedHeadline: 'Project 75I Submarine Deal Finalized',
      primarySource: {
        id: 'ps-2',
        title: 'Project 75I Signed',
        url: 'https://mod.gov.in/p75i',
        sourceName: 'MoD',
        sourceDomain: 'mod.gov.in',
        tier: SourceTier.TIER_1_OFFICIAL,
        publishedAt: '2026-08-30T09:00:00Z'
      },
      relatedCoverage: [],
      discussions: [],
      categories: ['navy', 'procurement'],
      entities: ['Project 75I'],
      defenceScore: 90,
      isLeadStory: true,
      createdAt: '2026-08-30T09:00:00Z',
      updatedAt: '2026-08-30T09:00:00Z'
    };

    // 1. Without API key -> returns null
    const noKeyRes = await summarizeWithGemini(cluster, '');
    expect(noKeyRes).toBeNull();

    // 2. With mock successful Gemini API response
    const mockGeminiResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  whyItMatters: 'Critical milestone for Indian Navy underwater deterrence.',
                  gdLecturettePoints: ['AIP Technology vs Nuclear Propulsion', 'Indigenisation vs Strategic Delays'],
                  potentialInterviewQuestions: ['What is Air Independent Propulsion (AIP)?'],
                  strategicAngle: 'Countering Chinese naval presence in the Indian Ocean.',
                  defenceTechTakeaway: {
                    platformOrSystem: 'Project 75I',
                    specifications: ['Fuel-cell AIP', 'Heavyweight Torpedoes'],
                    keySignificance: 'Enhances sub-surface stealth'
                  }
                })
              }
            ]
          }
        }
      ]
    };

    const mockFetch = async () =>
      new Response(JSON.stringify(mockGeminiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    const geminiIntel = await summarizeWithGemini(cluster, 'mock-key', mockFetch as typeof fetch);
    expect(geminiIntel).toBeDefined();
    expect(geminiIntel?.whyItMatters).toContain('underwater deterrence');
    expect(geminiIntel?.gdLecturettePoints).toContain('AIP Technology vs Nuclear Propulsion');
  });

  it('runs complete ingestion pipeline and outputs structured clusters and river items', async () => {
    const mockFetch = async (url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr.includes('pib')) {
        return new Response(SAMPLE_XML_TEJAS, { status: 200 });
      }
      return new Response('', { status: 404 });
    };

    const result = await runIngestionPipeline({
      feeds: [MOCK_TIER1_FEED, MOCK_TIER2_FEED],
      maxAgeHours: 72,
      maxClusters: 10,
      fetchFn: mockFetch as typeof fetch
    });

    expect(result.totalIngested).toBeGreaterThan(0);
    expect(result.clusters.length).toBeGreaterThan(0);
    expect(result.river.length).toBeGreaterThan(0);
    expect(result.clusters[0]?.ssbIntel).toBeDefined();
    expect(result.generatedAt).toBeTruthy();
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});
