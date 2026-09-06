/**
 * Unit tests for category-conditioned SSB brief generation.
 * Regression coverage for the over-templating bug: non-platform stories (personnel,
 * policy, diplomacy) were forced through the same Scope->Impact->Significance chain
 * and "specifications" block as genuine platform/procurement stories, producing
 * invented specs and generic filler instead of a grounded summary.
 * Hard limit: <= 300 LOC.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { clearSummaryMemoryCache, summarizeWithGemini } from '../../crawler/summarizer.js';
import { clearCFAIMemoryCache, summarizeWithCloudflareAI } from '../../crawler/cloudflareAI.js';
import {
  buildGeminiPrompt,
  buildGeminiResponseSchema,
  hasStructuredBrief,
  requiresPlatformBrief
} from '../../crawler/summarizerPrompt.js';
import { DomainCategory, StoryCluster } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';

function makeCluster(categories: DomainCategory[], overrides: Partial<StoryCluster> = {}): StoryCluster {
  return {
    id: 'c-category-test',
    synthesizedHeadline: 'Space Industry Lacks Workers Needed to Rebuild Satellites Lost in War',
    primarySource: {
      id: 'ps-category',
      title: 'Space industry lacks workers needed to rebuild satellites lost in war',
      url: 'https://defensenews.com/space/workforce',
      sourceName: 'Defense News',
      sourceDomain: 'defensenews.com',
      tier: SourceTier.TIER_1_OFFICIAL,
      publishedAt: '2026-09-05T09:00:00Z'
    },
    relatedCoverage: [],
    discussions: [],
    categories,
    entities: ['RAND'],
    defenceScore: 70,
    isLeadStory: false,
    createdAt: '2026-09-05T09:00:00Z',
    updatedAt: '2026-09-05T09:00:00Z',
    ...overrides
  };
}

describe('requiresPlatformBrief', () => {
  it('returns true for categories describing a concrete platform/system story', () => {
    expect(requiresPlatformBrief(['tech'])).toBe(true);
    expect(requiresPlatformBrief(['procurement'])).toBe(true);
    expect(requiresPlatformBrief(['programs'])).toBe(true);
    expect(requiresPlatformBrief(['idex'])).toBe(true);
    expect(requiresPlatformBrief(['tenders'])).toBe(true);
    expect(requiresPlatformBrief(['navy', 'procurement'])).toBe(true);
  });

  it('returns false for categories with no inherent platform/technical content', () => {
    expect(requiresPlatformBrief(['official'])).toBe(false);
    expect(requiresPlatformBrief(['strategic'])).toBe(false);
    expect(requiresPlatformBrief(['ssb'])).toBe(false);
    expect(requiresPlatformBrief(['army', 'navy', 'airforce'])).toBe(false);
  });
});

describe('hasStructuredBrief with requireChain flag', () => {
  it('still enforces the arrow chain by default (backward compatible)', () => {
    expect(hasStructuredBrief('A generic sentence with no chain at all.')).toBe(false);
  });

  it('accepts plain prose when requireChain is false', () => {
    expect(hasStructuredBrief('A generic sentence with no chain at all.', false)).toBe(true);
  });

  it('still enforces the arrow chain when requireChain is explicitly true', () => {
    expect(hasStructuredBrief('A generic sentence with no chain at all.', true)).toBe(false);
    expect(hasStructuredBrief('Scope -> Impact -> Significance', true)).toBe(true);
  });
});

describe('buildGeminiResponseSchema conditioned on includeTechTakeaway', () => {
  it('omits the defenceTechTakeaway property entirely when includeTechTakeaway is false', () => {
    const schema = buildGeminiResponseSchema(false, false);
    expect(JSON.stringify(schema)).not.toContain('defenceTechTakeaway');
  });

  it('includes the defenceTechTakeaway property when includeTechTakeaway is true', () => {
    const schema = buildGeminiResponseSchema(false, true);
    expect(JSON.stringify(schema)).toContain('defenceTechTakeaway');
  });
});

describe('buildGeminiPrompt conditioned on category', () => {
  it('mandates the Scope->Impact->Significance chain and specifications for platform categories', () => {
    const prompt = buildGeminiPrompt(makeCluster(['navy', 'procurement']));
    expect(prompt).toContain('MANDATORY BRIEF STRUCTURE FOR "whyItMatters"');
    expect(prompt).toContain('defenceTechTakeaway');
  });

  it('does not force the platform chain or a specifications block for non-platform categories', () => {
    const prompt = buildGeminiPrompt(makeCluster(['official']));
    expect(prompt).not.toContain('MANDATORY BRIEF STRUCTURE FOR "whyItMatters"');
    expect(prompt).not.toContain('"defenceTechTakeaway": {');
    expect(prompt.toLowerCase()).toContain('do not include a "defencetechtakeaway" key');
  });
});

describe('summarizeWithGemini end-to-end category behavior', () => {
  beforeEach(() => clearSummaryMemoryCache());

  it('accepts a plain, chain-free whyItMatters with no defenceTechTakeaway for a non-platform cluster', async () => {
    const cluster = makeCluster(['official']);
    const plainFetch = async () => new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify({
        whyItMatters: 'The U.S. lacks enough engineers and technicians to rebuild military satellites destroyed in a war with a peer adversary.'
      }) }] } }]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    const result = await summarizeWithGemini(cluster, 'mock-key', plainFetch as typeof fetch);
    expect(result).not.toBeNull();
    expect(result?.whyItMatters).toContain('engineers and technicians');
    expect(result?.defenceTechTakeaway).toBeUndefined();
  });

  it('still hard-rejects a chain-free whyItMatters for a platform/procurement cluster', async () => {
    const cluster = makeCluster(['navy', 'procurement']);
    const plainFetch = async () => new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify({
        whyItMatters: 'No mandated chain here at all, just plain prose.'
      }) }] } }]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    const result = await summarizeWithGemini(cluster, 'mock-key', plainFetch as typeof fetch);
    expect(result).toBeNull();
  });
});

describe('summarizeWithCloudflareAI category behavior', () => {
  beforeEach(() => clearCFAIMemoryCache());

  it('accepts a plain, chain-free whyItMatters for a non-platform cluster', async () => {
    const cluster = makeCluster(['official']);
    const fetchFn = async () => new Response(JSON.stringify({
      result: { response: JSON.stringify({
        whyItMatters: 'The U.S. lacks enough engineers and technicians to rebuild military satellites destroyed in wartime.'
      }) }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    const result = await summarizeWithCloudflareAI(cluster, {
      accountId: 'acc',
      apiToken: 'tok',
      fetchFn: fetchFn as typeof fetch
    });
    expect(result).not.toBeNull();
    expect(result?.whyItMatters).toContain('engineers and technicians');
  });

  it('still hard-rejects a chain-free whyItMatters for a platform/procurement cluster', async () => {
    const cluster = makeCluster(['navy', 'procurement'], {
      synthesizedHeadline: 'Distinct Platform Headline For Cache Isolation',
      primarySource: {
        id: 'ps-category-platform',
        title: 'Distinct platform story',
        url: 'https://defensenews.com/platform/distinct',
        sourceName: 'Defense News',
        sourceDomain: 'defensenews.com',
        tier: SourceTier.TIER_1_OFFICIAL,
        publishedAt: '2026-09-05T09:00:00Z'
      }
    });
    const fetchFn = async () => new Response(JSON.stringify({
      result: { response: JSON.stringify({
        whyItMatters: 'No mandated chain here at all, just plain prose.'
      }) }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    const result = await summarizeWithCloudflareAI(cluster, {
      accountId: 'acc',
      apiToken: 'tok',
      fetchFn: fetchFn as typeof fetch
    });
    expect(result).toBeNull();
  });
});
