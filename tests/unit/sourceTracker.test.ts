/**
 * Unit Tests for Crawler Source Reputation Tracker
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import {
  aggregateSourceStats,
  syncSourceReputationToD1,
  getFowlerCircuitStatus,
  recordFowlerFailure,
  recordFowlerSuccess,
  fetchFeedWithFowlerBreaker,
  getConditionalScrapeHeaders,
  getQuarantinedFeedRecords,
  resetFowlerCircuitBreakers,
  FOWLER_FAILURE_THRESHOLD,
  FOWLER_COOLDOWN_MS
} from '../../crawler/sourceTracker.js';
import { getSourceCircuitState, getQuarantinedSources } from '../../src/engine/sourceReputation.js';
import { StoryCluster, StorySourceItem } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';
import { FeedConfig } from '../../crawler/feedTypes.js';

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

const TEST_FEED: FeedConfig = {
  id: 'test-pib',
  name: 'PIB Test Feed',
  url: 'https://pib.gov.in/rss.xml',
  domain: 'pib.gov.in',
  tier: SourceTier.TIER_1_OFFICIAL,
  defaultCategory: 'official',
  enabled: true
};

describe('Crawler Source Tracker', () => {
  beforeEach(() => {
    resetFowlerCircuitBreakers();
  });

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

describe('Fowler Half-Open Circuit Breaker & Conditional Scraping', () => {
  beforeEach(() => {
    resetFowlerCircuitBreakers();
  });

  it('transitions from CLOSED to OPEN after 5 consecutive failures', () => {
    expect(FOWLER_FAILURE_THRESHOLD).toBe(5);
    const initial = getFowlerCircuitStatus(TEST_FEED.id, { domain: TEST_FEED.domain });
    expect(initial.state).toBe('CLOSED');
    expect(initial.consecutiveFailures).toBe(0);

    for (let i = 1; i <= 4; i++) {
      recordFowlerFailure(TEST_FEED.id, { domain: TEST_FEED.domain });
      expect(getFowlerCircuitStatus(TEST_FEED.id).state).toBe('CLOSED');
      expect(getFowlerCircuitStatus(TEST_FEED.id).consecutiveFailures).toBe(i);
    }

    recordFowlerFailure(TEST_FEED.id, { domain: TEST_FEED.domain });
    const tripped = getFowlerCircuitStatus(TEST_FEED.id);
    expect(tripped.state).toBe('OPEN');
    expect(tripped.consecutiveFailures).toBe(5);

    // Surfaced to shared reputation and quarantine list
    expect(getQuarantinedFeedRecords().length).toBe(1);
    expect(getQuarantinedSources().length).toBe(1);
    expect(getSourceCircuitState(TEST_FEED.domain)?.state).toBe('OPEN');
  });

  it('transitions from OPEN to HALF-OPEN after 24h cooldown has elapsed', () => {
    const t0 = 1000000;
    for (let i = 0; i < 5; i++) {
      recordFowlerFailure(TEST_FEED.id, { now: t0, domain: TEST_FEED.domain });
    }
    expect(getFowlerCircuitStatus(TEST_FEED.id, { now: t0 }).state).toBe('OPEN');

    // 12 hours later -> still OPEN
    const t12h = t0 + 12 * 60 * 60 * 1000;
    expect(getFowlerCircuitStatus(TEST_FEED.id, { now: t12h }).state).toBe('OPEN');

    // 24.1 hours later -> automatically transitions to HALF-OPEN for trial probe
    const t25h = t0 + FOWLER_COOLDOWN_MS + 3600000;
    const probed = getFowlerCircuitStatus(TEST_FEED.id, { now: t25h });
    expect(probed.state).toBe('HALF-OPEN');
    expect(getSourceCircuitState(TEST_FEED.domain)?.state).toBe('HALF-OPEN');
  });

  it('recovers from HALF-OPEN to CLOSED upon receiving HTTP 200', async () => {
    const t0 = 1000000;
    for (let i = 0; i < 5; i++) {
      recordFowlerFailure(TEST_FEED.id, { now: t0, domain: TEST_FEED.domain });
    }
    const t25h = t0 + FOWLER_COOLDOWN_MS + 3600000;
    expect(getFowlerCircuitStatus(TEST_FEED.id, { now: t25h }).state).toBe('HALF-OPEN');

    const sampleXml = `<rss version="2.0"><channel><title>PIB</title><item><title>Test Item</title><link>https://pib.gov.in/test1</link><pubDate>2026-08-30T10:00:00Z</pubDate></item></channel></rss>`;
    const mockFetch = async () => new Response(sampleXml, {
      status: 200,
      headers: { etag: '"etag-123"', 'last-modified': 'Sun, 30 Aug 2026 10:00:00 GMT' }
    });

    const items = await fetchFeedWithFowlerBreaker(TEST_FEED, {
      fetchFn: mockFetch as unknown as typeof fetch,
      now: t25h
    });

    expect(items.length).toBe(1);
    const recovered = getFowlerCircuitStatus(TEST_FEED.id);
    expect(recovered.state).toBe('CLOSED');
    expect(recovered.consecutiveFailures).toBe(0);
    expect(recovered.etag).toBe('"etag-123"');
    expect(getConditionalScrapeHeaders(TEST_FEED.id)['If-None-Match']).toBe('"etag-123"');
  });

  it('handles early exit on HTTP 304 Not Modified and recovers circuit safely', async () => {
    recordFowlerSuccess(TEST_FEED.id, { etag: '"etag-abc"' });
    expect(getConditionalScrapeHeaders(TEST_FEED.id)['If-None-Match']).toBe('"etag-abc"');

    const mock304Fetch = async () => new Response(null, { status: 304 });
    const items = await fetchFeedWithFowlerBreaker(TEST_FEED, {
      fetchFn: mock304Fetch as unknown as typeof fetch
    });

    expect(items).toEqual([]);
    expect(getFowlerCircuitStatus(TEST_FEED.id).state).toBe('CLOSED');
  });

  it('falls back to OPEN when probe fails in HALF-OPEN state', () => {
    const t0 = 1000000;
    for (let i = 0; i < 5; i++) {
      recordFowlerFailure(TEST_FEED.id, { now: t0 });
    }
    const t25h = t0 + FOWLER_COOLDOWN_MS + 3600000;
    expect(getFowlerCircuitStatus(TEST_FEED.id, { now: t25h }).state).toBe('HALF-OPEN');

    // Trial probe failure
    recordFowlerFailure(TEST_FEED.id, { now: t25h });
    expect(getFowlerCircuitStatus(TEST_FEED.id, { now: t25h }).state).toBe('OPEN');
  });
});

