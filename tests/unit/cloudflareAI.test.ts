/**
 * Unit Tests for Cloudflare Workers AI Client Adapter
 * Hard limit: <= 300 LOC.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import {
  clearCFAIMemoryCache,
  computeCFAICacheHash,
  DEFAULT_CF_AI_MODEL,
  extractJsonFromText,
  getCloudflareAIModel,
  runCloudflareAIInference,
  screenItemWithCloudflareAI,
  summarizeWithCloudflareAI
} from '../../crawler/cloudflareAI.js';
import { StoryCluster, StorySourceItem } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';

const MOCK_SOURCE_ITEM: StorySourceItem = {
  id: 'item-cf-1',
  title: 'DRDO Successfully Flight Tests Rudram-II Anti-Radiation Missile',
  snippet: 'The air-to-surface missile was tested from a Su-30MKI fighter aircraft off Odisha coast.',
  url: 'https://pib.gov.in/rudram2',
  sourceName: 'PIB MoD',
  sourceDomain: 'pib.gov.in',
  tier: SourceTier.TIER_1_OFFICIAL,
  publishedAt: '2026-08-30T10:00:00Z'
};

const MOCK_CLUSTER: StoryCluster = {
  id: 'c-cf-1',
  synthesizedHeadline: 'DRDO Tests Rudram-II Anti-Radiation Missile',
  primarySource: MOCK_SOURCE_ITEM,
  relatedCoverage: [],
  discussions: [],
  categories: ['tech', 'airforce'],
  entities: ['Rudram-II', 'Su-30MKI'],
  defenceScore: 88,
  isLeadStory: true,
  createdAt: '2026-08-30T10:00:00Z',
  updatedAt: '2026-08-30T10:00:00Z'
};

describe('Cloudflare Workers AI Client Adapter', () => {
  beforeEach(() => {
    clearCFAIMemoryCache();
  });

  it('defaults to @cf/meta/llama-3.2-3b-instruct and resolves dynamic CF_AI_MODEL', () => {
    expect(DEFAULT_CF_AI_MODEL).toBe('@cf/meta/llama-3.2-3b-instruct');
    expect(getCloudflareAIModel({})).toBe('@cf/meta/llama-3.2-3b-instruct');
    expect(getCloudflareAIModel({ CF_AI_MODEL: '@cf/meta/llama-3.1-8b-instruct' })).toBe(
      '@cf/meta/llama-3.1-8b-instruct'
    );
  });

  it('computes deterministic cache hashes for screening and summarization', () => {
    const h1 = computeCFAICacheHash('screen', 'Test Headline 1');
    const h2 = computeCFAICacheHash('screen', 'Test Headline 1');
    const hDiff = computeCFAICacheHash('screen', 'Different');

    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64);
    expect(h1).not.toBe(hDiff);
  });

  it('extracts JSON objects embedded in markdown code fences or plain text', () => {
    expect(extractJsonFromText('')).toBeNull();
    expect(extractJsonFromText('invalid json string')).toBeNull();

    const plain = '{"key": "value"}';
    expect(extractJsonFromText(plain)).toEqual({ key: 'value' });

    const fenced = '```json\n{"status": "ok", "score": 10}\n```';
    expect(extractJsonFromText(fenced)).toEqual({ status: 'ok', score: 10 });

    const conversational = 'Here is the JSON result: {"platform": "Rudram-II"} Hope this helps!';
    expect(extractJsonFromText(conversational)).toEqual({ platform: 'Rudram-II' });
  });

  it('returns null if accountId or apiToken is missing', async () => {
    const res = await runCloudflareAIInference('prompt', 'system', {
      accountId: '',
      apiToken: ''
    });
    expect(res).toBeNull();
  });

  it('executes inference and parses response with custom fetch', async () => {
    const mockResponse = {
      result: {
        response: '{"isMilitaryDefence": true, "confidence": 0.98, "category": "tech"}'
      },
      success: true
    };

    let requestedUrl = '';
    const customFetch = async (url: string) => {
      requestedUrl = url;
      return new Response(JSON.stringify(mockResponse), { status: 200 });
    };

    const res = await runCloudflareAIInference('test prompt', 'system prompt', {
      accountId: 'test-account',
      apiToken: 'test-token',
      fetchFn: customFetch as typeof fetch
    });

    expect(requestedUrl).toContain('test-account/ai/run/@cf/meta/llama-3.2-3b-instruct');
    expect(res).toContain('isMilitaryDefence');
  });

  it('screens items and caches results in CF_AI_MEMORY_CACHE', async () => {
    const mockScreenPayload = {
      result: {
        response: JSON.stringify({
          isMilitaryDefence: true,
          confidence: 0.95,
          category: 'tech',
          strategicSignificance: 'high',
          strategicBonus: 15,
          discoveredEntities: ['Rudram-II'],
          actionSignature: 'trial',
          rationale: 'Successful missile trial validated air defence suppression.'
        })
      }
    };

    let fetchCount = 0;
    const customFetch = async () => {
      fetchCount++;
      return new Response(JSON.stringify(mockScreenPayload), { status: 200 });
    };

    const options = {
      accountId: 'acc-123',
      apiToken: 'tok-123',
      fetchFn: customFetch as typeof fetch
    };

    // First call: network invocation
    const result1 = await screenItemWithCloudflareAI(MOCK_SOURCE_ITEM, options);
    expect(result1).not.toBeNull();
    expect(result1?.isMilitaryDefence).toBe(true);
    expect(result1?.category).toBe('tech');
    expect(result1?.discoveredEntities).toEqual(['Rudram-II']);
    expect(fetchCount).toBe(1);

    // Second call: cache hit -> 0 network requests
    const result2 = await screenItemWithCloudflareAI(MOCK_SOURCE_ITEM, options);
    expect(result2).toEqual(result1);
    expect(fetchCount).toBe(1);
  });

  it('summarizes clusters and sanitizes output correctly', async () => {
    const mockSummaryPayload = {
      result: {
        response: JSON.stringify({
          whyItMatters: 'Provides indigenous SEAD / DEAD capability for IAF.',
          strategicAngle: 'Crucial for neutralizing adversarial radar networks.',
          defenceTechTakeaway: {
            platformOrSystem: 'Rudram-II',
            specifications: ['Mach 5.5 hypersonic speed', '300 km standoff range'],
            keySignificance: 'Advanced anti-radiation seeker precision.'
          }
        })
      }
    };

    let fetchCount = 0;
    const customFetch = async () => {
      fetchCount++;
      return new Response(JSON.stringify(mockSummaryPayload), { status: 200 });
    };

    const options = {
      accountId: 'acc-123',
      apiToken: 'tok-123',
      fetchFn: customFetch as typeof fetch
    };

    const summary = await summarizeWithCloudflareAI(MOCK_CLUSTER, options);
    expect(summary).not.toBeNull();
    expect(summary?.whyItMatters).toContain('SEAD / DEAD');
    expect(summary?.defenceTechTakeaway?.platformOrSystem).toBe('Rudram-II');
    expect(fetchCount).toBe(1);

    // Cache hit
    const cachedSummary = await summarizeWithCloudflareAI(MOCK_CLUSTER, options);
    expect(cachedSummary).toEqual(summary);
    expect(fetchCount).toBe(1);
  });
});
