/**
 * Unit Tests for Zero-Cost Tag Adjudication Engine (Phase 3)
 * Verifies Tier 1 pre-screen, Tier 2 consensus, and Tier 3 Cloudflare AI tie-breaker.
 * Hard limit: <= 300 LOC.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { adjudicateCandidateTag } from '../../crawler/tagAdjudicator.js';
import { clearCFAIMemoryCache } from '../../crawler/cloudflareAI.js';
import { StoryCluster, StorySourceItem } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';

function createMockCluster(headline: string, snippet: string, entities: string[] = []): StoryCluster {
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
    defenceScore: 85,
    isLeadStory: true,
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z'
  };
}

describe('Zero-Cost Tag Adjudicator (Tier 3 Cascade)', () => {
  beforeEach(() => {
    clearCFAIMemoryCache();
  });

  it('rejects lexical collision immediately via Tier 1 without calling Cloudflare AI', async () => {
    let fetchCalls = 0;
    const mockFetch = async () => {
      fetchCalls++;
      return new Response('{}', { status: 200 });
    };

    const cluster = createMockCluster(
      'IAF tests black stealth coatings for high-altitude air superiority',
      'The multirole aircraft received an indigenous radar absorbent material.'
    );

    const verdict = await adjudicateCandidateTag(cluster, '#LAC', undefined, {
      accountId: 'acc-1',
      apiToken: 'tok-1',
      fetchFn: mockFetch as typeof fetch
    });

    expect(verdict.approved).toBe(false);
    expect(verdict.source).toBe('tier1_pre_screen');
    expect(verdict.confidence).toBe(1.0);
    expect(verdict.rationale).toContain('not present as discrete word boundary');
    expect(fetchCalls).toBe(0); // $0 and 0 latency
  });

  it('approves true consensus between Tier 1 and Tier 2 with zero Cloudflare AI calls', async () => {
    let fetchCalls = 0;
    const mockFetch = async () => {
      fetchCalls++;
      return new Response('{}', { status: 200 });
    };

    const cluster = createMockCluster(
      'IAF inducts second squadron of Rafale fighters in Ambala',
      'Rafale jets enhance air superiority and long-range standoff strike capabilities.',
      ['Rafale', 'IAF']
    );

    const geminiOutput = {
      primaryTag: '#Rafale',
      focalEntity: 'Dassault Rafale',
      hashtags: ['#Rafale', '#IAF']
    };

    const verdict = await adjudicateCandidateTag(cluster, '#Rafale', geminiOutput, {
      accountId: 'acc-1',
      apiToken: 'tok-1',
      fetchFn: mockFetch as typeof fetch
    });

    expect(verdict.approved).toBe(true);
    expect(verdict.source).toBe('tier1_tier2_consensus');
    expect(verdict.confidence).toBeGreaterThanOrEqual(0.8);
    expect(verdict.matchedAnchors).toBeDefined();
    expect(fetchCalls).toBe(0); // 0 edge neurons consumed
  });

  it('dispatches contested hallucinated #LAC on helicopter story to Cloudflare AI for rejection', async () => {
    let fetchCalls = 0;
    const mockCFResponse = {
      result: {
        response: JSON.stringify({
          approved: false,
          confidence: 0.95,
          canonicalTag: '#HAL',
          rationale: 'Article focuses on HAL light utility helicopter trials, not India-China border standoff.'
        })
      },
      success: true
    };

    const mockFetch = async () => {
      fetchCalls++;
      return new Response(JSON.stringify(mockCFResponse), { status: 200 });
    };

    const cluster = createMockCluster(
      'HAL LUH achieves high-altitude cold weather landing in northern sector',
      'The Light Utility Helicopter completed critical performance trials in Leh sector.',
      ['HAL', 'LUH']
    );

    // Gemini hallucinated #LAC due to "northern sector / high-altitude"
    const geminiOutput = {
      primaryTag: '#LAC',
      focalEntity: 'HAL LUH',
      operationalTheater: 'Northern Sector'
    };

    const verdict = await adjudicateCandidateTag(cluster, '#LAC', geminiOutput, {
      accountId: 'acc-1',
      apiToken: 'tok-1',
      fetchFn: mockFetch as typeof fetch
    });

    expect(verdict.approved).toBe(false);
    expect(verdict.source).toBe('tier3_cloudflare_ai');
    expect(verdict.confidence).toBe(0.95);
    expect(verdict.rationale).toContain('HAL light utility helicopter');
    expect(fetchCalls).toBe(1);
  });

  it('approves legitimate border reporting for #LAC when Cloudflare AI validates the story', async () => {
    let fetchCalls = 0;
    const mockCFResponse = {
      result: {
        response: JSON.stringify({
          approved: true,
          confidence: 0.98,
          canonicalTag: '#LAC',
          rationale: 'Legitimate report on India-China Corps Commander border talks at Chushul.'
        })
      },
      success: true
    };

    const mockFetch = async () => {
      fetchCalls++;
      return new Response(JSON.stringify(mockCFResponse), { status: 200 });
    };

    const cluster = createMockCluster(
      'India and China hold 22nd round of border talks along LAC in Chushul',
      'PLA and Indian Army discuss disengagement and patrolling arrangements in eastern Ladakh standoff areas.',
      ['LAC', 'China', 'Indian Army']
    );

    const verdict = await adjudicateCandidateTag(cluster, '#LAC', undefined, {
      accountId: 'acc-1',
      apiToken: 'tok-1',
      fetchFn: mockFetch as typeof fetch
    });

    expect(verdict.approved).toBe(true);
    expect(verdict.tag).toBe('#LAC');
    expect(verdict.matchedAnchors).toContain('China');
    expect(verdict.matchedAnchors).toContain('border');
    expect(fetchCalls).toBe(1);
  });

  it('falls back safely to deterministic pre-screen when Cloudflare AI fails or is unconfigured', async () => {
    const failingFetch = async () => {
      throw new Error('Network timeout reaching Cloudflare edge');
    };

    const cluster = createMockCluster(
      'HAL LUH achieves high-altitude cold weather landing in Ladakh',
      'The helicopter completed flight trials in Leh.',
      ['HAL', 'LUH']
    );

    const geminiOutput = {
      primaryTag: '#LAC'
    };

    const verdict = await adjudicateCandidateTag(cluster, '#LAC', geminiOutput, {
      accountId: 'acc-1',
      apiToken: 'tok-1',
      fetchFn: failingFetch as typeof fetch
    });

    expect(verdict.approved).toBe(false);
    expect(verdict.source).toBe('deterministic_fallback');
  });

  it('enforces defense-in-depth safety override against #LAC even if LLM hallucinated approval', async () => {
    const erroneousApprovalResponse = {
      result: {
        response: JSON.stringify({
          approved: true,
          confidence: 0.90,
          canonicalTag: '#LAC',
          rationale: 'Erroneous edge verdict on non-border story.'
        })
      },
      success: true
    };

    const mockFetch = async () => {
      return new Response(JSON.stringify(erroneousApprovalResponse), { status: 200 });
    };

    // Story mentions LAC token boundary but zero border anchors (China, PLA, standoff, patrol, etc.)
    const cluster = createMockCluster(
      'Naval warship visits port with LAC telemetry tracking radar',
      'Indian Navy frigate docks for scheduled overhaul and electronic calibration.',
      ['Navy', 'frigate']
    );

    const verdict = await adjudicateCandidateTag(cluster, '#LAC', { primaryTag: '#LAC' }, {
      accountId: 'acc-1',
      apiToken: 'tok-1',
      fetchFn: mockFetch as typeof fetch
    });

    expect(verdict.approved).toBe(false);
    expect(verdict.source).toBe('tier3_cloudflare_ai');
  });
});
