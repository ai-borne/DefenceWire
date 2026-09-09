/**
 * Unit Tests for Tag Screening Orchestration
 * Verifies the Tier 0 canonical-entity short-circuit (docs/knowledge_base_issues.md#2)
 * composes correctly with the existing Tier 1-3 cascade, and that omitting
 * resolveCanonical preserves prior screenClusterTags behavior exactly.
 * Hard limit: <= 300 LOC.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { screenClusterTags } from '../../crawler/tagScreening.js';
import { clearCFAIMemoryCache } from '../../crawler/cloudflareAI.js';
import { StoryCluster, StorySourceItem } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';

function createMockCluster(headline: string, snippet: string, entities: string[] = [], primaryTag?: string): StoryCluster {
  const source: StorySourceItem = {
    id: 'src-1',
    title: headline,
    snippet,
    url: 'https://pib.gov.in/test',
    sourceName: 'PIB Defence',
    sourceDomain: 'pib.gov.in',
    tier: SourceTier.TIER_1_OFFICIAL,
    publishedAt: '2026-09-01T10:00:00Z'
  };
  return {
    id: 'cluster-1',
    synthesizedHeadline: headline,
    primarySource: source,
    relatedCoverage: [],
    discussions: [],
    categories: ['tech', 'airforce'],
    entities,
    primaryTag,
    defenceScore: 85,
    isLeadStory: true,
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z'
  };
}

describe('screenClusterTags — Tier 0 canonical short-circuit', () => {
  beforeEach(() => {
    clearCFAIMemoryCache();
  });

  it('uses the canonical hit directly as primaryTag and never invokes the Tier 1-3 cascade', async () => {
    let fetchCalls = 0;
    const mockFetch = async () => {
      fetchCalls++;
      return new Response('{}', { status: 200 });
    };

    // Candidate tag is a raw variant; a real cascade run would need Tier 1-3
    // to validate it, but a known canonical hit should bypass that entirely.
    const cluster = createMockCluster(
      'S400 Triumf air defence squadron declared operational',
      'The system was inducted into the Western Air Command.',
      ['S400'],
      '#S400'
    );

    await screenClusterTags(
      cluster,
      undefined,
      { accountId: 'acc-1', apiToken: 'tok-1', fetchFn: mockFetch as typeof fetch },
      (tag) => (tag === '#S400' ? '#S-400' : null)
    );

    expect(cluster.primaryTag).toBe('#S-400');
    expect(fetchCalls).toBe(0);
  });

  it('falls through to the existing cascade when resolveCanonical returns no match', async () => {
    const cluster = createMockCluster(
      'IAF inducts second squadron of Rafale fighters in Ambala',
      'Rafale jets enhance air superiority and long-range standoff strike capabilities.',
      ['Rafale', 'IAF'],
      '#Rafale'
    );

    const geminiOutput = { primaryTag: '#Rafale', focalEntity: 'Dassault Rafale', hashtags: ['#Rafale', '#IAF'] };

    await screenClusterTags(cluster, geminiOutput, {}, () => null);

    expect(cluster.primaryTag).toBe('#Rafale');
  });

  it('behaves identically to the pre-Issue-2 cascade when resolveCanonical is omitted entirely', async () => {
    const cluster = createMockCluster(
      'IAF tests black stealth coatings for high-altitude air superiority',
      'The multirole aircraft received an indigenous radar absorbent material.',
      [],
      '#LAC'
    );

    await screenClusterTags(cluster, undefined, {});

    expect(cluster.primaryTag).toBeUndefined();
  });

  it('does not consult resolveCanonical when the cluster has no primaryTag candidate', async () => {
    let calls = 0;
    const cluster = createMockCluster('Generic defence procurement update', 'No specific platform named.', []);

    await screenClusterTags(cluster, undefined, {}, () => {
      calls++;
      return '#Should-Not-Be-Used';
    });

    expect(calls).toBe(0);
    expect(cluster.primaryTag).toBeUndefined();
  });

  it('still screens hashtags and entities independently of the primaryTag short-circuit', async () => {
    const cluster = createMockCluster(
      'Naval warship visits port with LAC telemetry tracking radar',
      'Indian Navy frigate docks for scheduled overhaul and electronic calibration.',
      ['Navy', 'frigate', 'LAC'],
      '#Navy'
    );
    cluster.hashtags = ['#Navy', '#LAC'];

    await screenClusterTags(
      cluster,
      undefined,
      { accountId: 'acc-1', apiToken: 'tok-1', fetchFn: (async () => new Response('{}', { status: 200 })) as typeof fetch },
      (tag) => (tag === '#Navy' ? '#Navy' : null)
    );

    expect(cluster.primaryTag).toBe('#Navy');
    // #LAC has no border anchors in this text — must still be screened out by the untouched cascade.
    expect(cluster.entities).not.toContain('LAC');
  });
});
