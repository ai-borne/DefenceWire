/**
 * Unit Tests for Crawler Source Reputation Tracker
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it } from 'vitest';
import { aggregateSourceStats, syncSourceReputationToD1 } from '../../crawler/sourceTracker.js';
import { StoryCluster, StorySourceItem } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';

const MOCK_RAW_ITEMS: StorySourceItem[] = [
  {
    id: 'r-1',
    title: 'MoD signs BrahMos deal',
    url: 'https://pib.gov.in/1',
    sourceName: 'PIB MoD',
    sourceDomain: 'pib.gov.in',
    tier: SourceTier.TIER_1_OFFICIAL,
    publishedAt: '2026-08-30T10:00:00Z'
  },
  {
    id: 'r-2',
    title: 'Livefist breaks Tejas engine scoop',
    url: 'https://livefistdefence.com/tejas',
    sourceName: 'Livefist',
    sourceDomain: 'livefistdefence.com',
    tier: SourceTier.TIER_3_SPECIALIZED,
    publishedAt: '2026-08-30T09:00:00Z'
  },
  {
    id: 'r-3',
    title: 'Celebrity spotted at airshow',
    url: 'https://noisyfeed.com/show',
    sourceName: 'Noisy Feed',
    sourceDomain: 'noisyfeed.com',
    tier: SourceTier.TIER_4_OSINT,
    publishedAt: '2026-08-30T08:00:00Z'
  }
];

const MOCK_FILTERED_ITEMS: StorySourceItem[] = [MOCK_RAW_ITEMS[0]!, MOCK_RAW_ITEMS[1]!];

const MOCK_CLUSTERS: StoryCluster[] = [
  {
    id: 'c-1',
    synthesizedHeadline: 'Tejas Engine Delivery Accelerated',
    primarySource: MOCK_RAW_ITEMS[1]!,
    relatedCoverage: [
      {
        id: 'rc-1',
        title: 'Tejas engine update',
        url: 'https://thehindu.com/tejas',
        sourceName: 'The Hindu',
        sourceDomain: 'thehindu.com',
        tier: SourceTier.TIER_2_NATIONAL,
        publishedAt: '2026-08-30T11:00:00Z'
      }
    ],
    discussions: [],
    categories: ['airforce'],
    entities: ['Tejas Mk1A'],
    defenceScore: 95,
    isLeadStory: true,
    createdAt: '2026-08-30T09:00:00Z',
    updatedAt: '2026-08-30T11:00:00Z'
  }
];

describe('Crawler Source Tracker', () => {
  it('aggregates ingestion, acceptance, and scoop originator credits accurately', () => {
    const statsMap = aggregateSourceStats(MOCK_RAW_ITEMS, MOCK_FILTERED_ITEMS, MOCK_CLUSTERS);

    const livefist = statsMap.get('livefistdefence.com');
    expect(livefist).toBeDefined();
    expect(livefist?.totalIngested).toBe(1);
    expect(livefist?.acceptedCount).toBe(1);
    expect(livefist?.scoopCount).toBe(1);

    const thehindu = statsMap.get('thehindu.com');
    expect(thehindu?.corroborationCount).toBe(1);

    const noisy = statsMap.get('noisyfeed.com');
    expect(noisy?.totalIngested).toBe(1);
    expect(noisy?.acceptedCount).toBe(0);
  });

  it('syncs computed multipliers to D1 with bearer authorization', async () => {
    const statsMap = aggregateSourceStats(MOCK_RAW_ITEMS, MOCK_FILTERED_ITEMS, MOCK_CLUSTERS);
    let capturedBody = '';

    const mockFetch = async (_url: string, init?: RequestInit) => {
      capturedBody = String(init?.body || '');
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    };

    const d1Config = {
      accountId: 'acc-123',
      databaseId: 'db-123',
      apiToken: 'token-123'
    };

    const res = await syncSourceReputationToD1(statsMap, d1Config, {
      fetchFn: mockFetch as unknown as typeof fetch
    });

    expect(res.syncedToD1).toBe(statsMap.size);
    expect(capturedBody).toContain('INSERT INTO source_reputation');
    expect(res.multipliers['livefistdefence.com']).toBeGreaterThan(1.0);
  });
});
