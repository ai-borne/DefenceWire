/**
 * Unit & Integration Tests for Crawler Ingestion Pipeline & Quality Gates
 * Hard limit: <= 300 LOC.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FeedConfig } from '../../crawler/feedTypes.js';
import {
  filterFreshArticles,
  isDefenceRelevant,
  NON_DEFENCE_BLACKLIST_REGEX,
  DEFENCE_WHOLE_WORD_REGEX,
  runIngestionPipeline,
  shouldRunAsCli
} from '../../crawler/ingest.js';
import { clearSummaryMemoryCache, resetThrottleState } from '../../crawler/summarizer.js';
import { resetCircuitBreakers } from '../../crawler/parser.js';
import { resetDynamicEntities } from '../../src/data/militaryEntities.js';
import { StoryCluster, StorySourceItem } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';

const MOCK_TIER1_FEED: FeedConfig = {
  id: 'feed-pib', name: 'PIB MoD', url: 'https://pib.gov.in/feed.xml',
  domain: 'pib.gov.in', tier: SourceTier.TIER_1_OFFICIAL, defaultCategory: 'strategic', enabled: true, timeoutMs: 600000
};

const MOCK_TIER2_FEED: FeedConfig = {
  id: 'feed-hindu', name: 'The Hindu', url: 'https://thehindu.com/feed.xml',
  domain: 'thehindu.com', tier: SourceTier.TIER_2_NATIONAL, defaultCategory: 'strategic', enabled: true
};

const SAMPLE_XML_TEJAS = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>PIB Defence</title>
  <item><title>HAL delivers first batch of upgraded Tejas Mk1A fighters to Indian Air Force</title><link>https://pib.gov.in/tejas-mk1a-delivery-batch</link><pubDate>${new Date().toUTCString()}</pubDate><description>Equipped with Uttam AESA radar and Astra Beyond Visual Range missiles.</description></item>
  <item><title>Sensex rises 500 points in early trade amid foreign inflows</title><link>https://thehindu.com/sensex-record-high</link><pubDate>${new Date().toUTCString()}</pubDate><description>Stock markets rallied today on strong tech earnings.</description></item>
</channel></rss>`;

const MOCK_GEMINI_SUCCESS = { candidates: [{ content: { parts: [{ text: JSON.stringify({
  whyItMatters: 'Gemini-generated brief.', strategicAngle: 'Gemini strategic angle.',
  defenceTechTakeaway: { platformOrSystem: 'Test Platform', specifications: ['S1', 'S2', 'S3'], keySignificance: 'Key significance.' }
}) }] } }] };

// 13 distinct defence platforms so clustering keeps each as its own story, exceeding the old hardcoded enrichment cap of 12.
const DISTINCT_DEFENCE_HEADLINES = [
  'HAL delivers upgraded Tejas Mk1A fighters to Indian Air Force',
  'IAF finalizes Rafale jet spares deal with Dassault Aviation',
  'Indian Army deploys Zorawar light tanks near LAC frontier',
  'DRDO conducts successful BrahMos missile test off Odisha coast',
  'Pinaka rocket artillery system inducted by army units',
  'S-400 air defence squadron activated by IAF in the west',
  'Prachand attack helicopter inducted into service by HAL',
  'INS Vikrant aircraft carrier completes operational upgrade',
  'INS Arihant strategic submarine completes deterrence patrol',
  'INS Mormugao stealth destroyer commissioned for the western fleet',
  'Nilgiri class frigate completes sea trials ahead of formal commissioning',
  'Akash-NG surface to air missile destroys aerial target in test',
  'ATAGS advanced towed artillery gun systems deployed along northern border'
];

function buildDistinctFeedXml(headlines: string[]): string {
  const pubDate = new Date().toUTCString();
  const items = headlines.map((title, idx) => `<item><title>${title}</title><link>https://pib.gov.in/story-${idx}</link><pubDate>${pubDate}</pubDate><description>Defence modernization update.</description></item>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>PIB Defence</title>${items}</channel></rss>`;
}

describe('Crawler Ingestion Pipeline & Quality Gates', () => {
  beforeEach(() => {
    resetCircuitBreakers();
    resetDynamicEntities();
    clearSummaryMemoryCache();
    resetThrottleState();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('detects direct CLI execution without relying on process.argv (vite-node omits the file arg)', () => {
    // vite-node runs the target file without ever adding its path to process.argv, so the
    // old `process.argv.some(a => a.includes('ingest'))` check was always false in production
    // and in local dev alike — the scheduled crawler's CLI branch never actually ran.
    expect(shouldRunAsCli({})).toBe(true);
    expect(shouldRunAsCli({ VITEST: 'true' })).toBe(false);
  });

  it('paces Gemini calls so every cluster gets a real AI summary, not a heuristic fallback', async () => {
    clearSummaryMemoryCache();
    const feedXml = buildDistinctFeedXml(DISTINCT_DEFENCE_HEADLINES);
    let geminiCallCount = 0;
    const mockFetch = async (url: string) => {
      if (String(url).includes('generativelanguage.googleapis.com')) {
        geminiCallCount++;
        return new Response(JSON.stringify(MOCK_GEMINI_SUCCESS), { status: 200 });
      }
      return new Response(feedXml, { status: 200 });
    };

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    // Pin freshness/clustering to the real "now" captured before the fake clock starts
    // advancing to pace Gemini throttling below — otherwise clusterArticles'/filterFreshArticles'
    // own `new Date()` default reads the *advancing* fake clock, nondeterministically shrinking
    // the 48h cluster time-diff window depending on exactly how far the timers have been wound
    // forward by the time those pure functions run.
    const fixedNow = new Date();
    vi.useFakeTimers();
    const resultPromise = runIngestionPipeline({
      feeds: [MOCK_TIER1_FEED],
      maxAgeHours: 72,
      maxClusters: DISTINCT_DEFENCE_HEADLINES.length,
      outputPath: null,
      fetchFn: mockFetch as unknown as typeof fetch,
      geminiApiKey: 'mock-api-key',
      now: fixedNow
    });
    // Advance timers step by step for each throttled Gemini call
    for (let i = 0; i < 20; i++) {
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(5000);
    }
    const result = await resultPromise;

    expect(result.clusters.length).toBeGreaterThan(12);
    // Every cluster attempted (and got) a real Gemini summary, not just the first 12/14.
    expect(geminiCallCount).toBe(result.clusters.length);
    for (const cluster of result.clusters) {
      expect(cluster.ssbIntel?.whyItMatters).toBe('Gemini-generated brief.');
    }
    // The per-run enrichment summary log must reflect the real Gemini/heuristic split.
    expect(logSpy).toHaveBeenCalledWith(`[SSB ENRICHMENT] ${result.clusters.length} via Gemini, 0 heuristic fallback, 0 preserved from prior run`);
    logSpy.mockRestore();
  });

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
        id: 'curator-ps', title: 'Original Wire Headline', url: 'https://pib.gov.in/tejas-mk1a-delivery-batch',
        sourceName: 'PIB MoD', sourceDomain: 'pib.gov.in', tier: SourceTier.TIER_1_OFFICIAL, publishedAt: '2026-08-30T09:00:00Z'
      },
      relatedCoverage: [], discussions: [], categories: ['navy', 'strategic'], entities: ['Project 75I'],
      defenceScore: 130, isLeadStory: true, isEditorPromoted: true,
      createdAt: '2026-08-30T09:00:00Z', updatedAt: '2026-08-30T09:00:00Z',
      ssbIntel: { whyItMatters: 'Curator custom editorial brief', gdLecturettePoints: ['Point 1'], potentialInterviewQuestions: ['Q1'] }
    };

    const mockFetch = async () => new Response(SAMPLE_XML_TEJAS, { status: 200 });

    const result = await runIngestionPipeline({
      feeds: [MOCK_TIER1_FEED], maxAgeHours: 72, outputPath: null, fetchFn: mockFetch as typeof fetch,
      existingClusters: [lockedCuratorCluster]
    });

    const lead = result.clusters[0];
    expect(lead?.isEditorPromoted).toBe(true);
    expect(lead?.isLeadStory).toBe(true);
    expect(lead?.synthesizedHeadline).toContain('HUMAN CURATED');
    expect(lead?.ssbIntel?.whyItMatters).toBe('Curator custom editorial brief');
  });

  it('preserves existing dataset when total network failure occurs (Atomic Commit Guard)', async () => {
    const existingDataset: StoryCluster[] = [{
      id: 'c-existing', synthesizedHeadline: 'Existing Protected Story',
      primarySource: {
        id: 'ps-existing', title: 'Existing Story', url: 'https://mod.gov.in/existing',
        sourceName: 'MoD', sourceDomain: 'mod.gov.in', tier: SourceTier.TIER_1_OFFICIAL, publishedAt: '2026-08-30T08:00:00Z'
      },
      relatedCoverage: [], discussions: [], categories: ['strategic'], entities: ['MoD'], defenceScore: 80, isLeadStory: true,
      createdAt: '2026-08-30T08:00:00Z', updatedAt: '2026-08-30T08:00:00Z'
    }];

    const failingFetch = async () => new Response('', { status: 500 });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await runIngestionPipeline({
      feeds: [MOCK_TIER1_FEED], outputPath: null, fetchFn: failingFetch as typeof fetch,
      existingClusters: existingDataset
    });

    expect(result.totalIngested).toBe(0);
    expect(result.clusters.length).toBe(1);
    expect(result.clusters[0]?.id).toBe('c-existing');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[ATOMIC COMMIT GUARD]'));
    logSpy.mockRestore();
  });
});
