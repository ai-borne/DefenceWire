// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SourceTier } from '../../src/types/source.js';
import { StoryCluster } from '../../src/types/news.js';

const mocks = vi.hoisted(() => ({
  persist: vi.fn(), classified: vi.fn(), advance: vi.fn(), archive: vi.fn(), reconcile: vi.fn(), query: vi.fn()
}));

vi.mock('../../src/engine/clusterEngine.js', () => ({
  extractMilitaryEntities: vi.fn(() => ({ entities: ['Army'], categories: ['army'] })),
  clusterArticles: vi.fn(() => Array.from({ length: 50 }, (_, index): StoryCluster => ({
    id: `temporary-${index}`, synthesizedHeadline: `Distinct defence event ${index}`,
    primarySource: {
      id: `source-${index}`, title: `Distinct defence event ${index}`,
      url: `https://example.com/${index}`, sourceName: 'Example', sourceDomain: 'example.com',
      tier: SourceTier.TIER_2_NATIONAL, publishedAt: '2026-09-13T08:00:00Z'
    },
    relatedCoverage: [], discussions: [], categories: ['army'], entities: [`Entity ${index}`],
    defenceScore: 100 - index, isLeadStory: index === 0,
    createdAt: '2026-09-13T08:00:00Z', updatedAt: '2026-09-13T08:00:00Z'
  })))
}));

vi.mock('../../crawler/durableIngestService.js', () => ({
  buildDurableIngestConfigFromEnv: vi.fn(() => ({ d1: {}, r2: {} })),
  persistDurableInput: mocks.persist,
  markDurableClassified: mocks.classified,
  advanceDurableRun: mocks.advance,
  failDurableRun: vi.fn()
}));

vi.mock('../../crawler/archiveSync.js', () => ({
  buildD1ConfigFromEnv: vi.fn(() => null),
  archivePoppedClusters: mocks.archive,
  reconcileArchiveWithLiveFeed: mocks.reconcile,
  executeD1Query: mocks.query
}));

vi.mock('../../crawler/sourceTracker.js', () => ({
  fetchFeedWithFowlerBreaker: vi.fn(async () => [{
    id: 'input', title: 'Indian Army conducts missile defence exercise',
    url: 'https://example.com/input', sourceName: 'PIB', sourceDomain: 'example.com',
    tier: SourceTier.TIER_1_OFFICIAL, publishedAt: '2026-09-13T08:00:00Z',
    snippet: 'Army defence exercise.'
  }]),
  aggregateSourceStats: vi.fn(() => new Map()),
  syncSourceReputationToD1: vi.fn(async () => ({ syncedToD1: 0 }))
}));

import { runIngestionPipeline } from '../../crawler/ingest.js';

const feed = {
  id: 'feed', name: 'PIB', url: 'https://example.com/feed', domain: 'example.com',
  tier: SourceTier.TIER_1_OFFICIAL, defaultCategory: 'army' as const, enabled: true
};
const xml = `<?xml version="1.0"?><rss><channel><item>
  <title>Indian Army conducts missile defence exercise</title>
  <link>https://example.com/input</link><pubDate>Sun, 13 Sep 2026 08:00:00 GMT</pubDate>
  <description>Army defence exercise.</description></item></channel></rss>`;

describe('durable pipeline ordering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.persist.mockImplementation(async (_articles, clusters: StoryCluster[]) => ({
      clusters,
      resumed: false,
      plan: {
        runId: 'run', inputFingerprint: 'fingerprint', articles: [], lineage: [],
        clusters: clusters.map((cluster) => ({
          cluster, id: cluster.id, eventFingerprint: 'event', payloadKey: `${cluster.id}.json`,
          payloadHash: 'hash', sourceArticleIds: [], previousClusterIds: []
        }))
      }
    }));
    mocks.archive.mockResolvedValue({ archived: 20, failed: 0, r2Failed: 0 });
    mocks.reconcile.mockResolvedValue({ removed: 30, failed: 0 });
    mocks.query.mockResolvedValue({ ok: true, rows: [] });
  });

  it('persists and enriches all 50 clusters, then projects only 30 to the homepage', async () => {
    const result = await runIngestionPipeline({
      feeds: [feed], maxAgeHours: 72, maxClusters: 30, outputPath: null,
      fetchFn: vi.fn().mockResolvedValue(new Response(xml, { status: 200 })),
      now: new Date('2026-09-13T10:00:00Z')
    });

    expect(mocks.persist.mock.calls[0]?.[1]).toHaveLength(50);
    expect(mocks.classified.mock.calls[0]?.[0].clusters).toHaveLength(50);
    expect(mocks.classified.mock.calls[0]?.[0].clusters.every(
      (item: { cluster: StoryCluster }) => Boolean(item.cluster.ssbIntel))).toBe(true);
    expect(mocks.archive.mock.calls[0]?.[0]).toHaveLength(50);
    expect(mocks.archive.mock.calls[0]?.[1]).toHaveLength(30);
    expect(result.clusters).toHaveLength(30);
    expect(result.clusters.every((cluster) => Array.isArray(cluster.canonicalTopics))).toBe(true);
    expect(mocks.persist.mock.invocationCallOrder[0]).toBeLessThan(mocks.classified.mock.invocationCallOrder[0]!);
    expect(mocks.classified.mock.invocationCallOrder[0]).toBeLessThan(mocks.archive.mock.invocationCallOrder[0]!);
    expect(mocks.advance).toHaveBeenNthCalledWith(1, expect.anything(), 'publishable', expect.anything(), 30, expect.anything());
    expect(mocks.advance).toHaveBeenNthCalledWith(2, expect.anything(), 'published', expect.anything(), 30, expect.anything());
  });
});
