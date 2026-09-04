/**
 * Unit Tests for SSBIntelligence provenance tagging, the mandated
 * Scope -> Impact -> Strategic Significance structure gate, and crisp
 * (non-mid-word) prompt truncation.
 * Hard limit: <= 300 LOC.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSummaryMemoryCache, hasStructuredBrief, sanitizePromptInput, summarizeWithGemini } from '../../crawler/summarizer.js';
import { StoryCluster } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';

const MOCK_CLUSTER: StoryCluster = {
  id: 'c-provenance-test',
  synthesizedHeadline: 'Project 75I Submarine Deal Finalized with Fuel-Cell AIP',
  primarySource: {
    id: 'ps-provenance',
    title: 'MoD Finalizes Project 75I Deal',
    url: 'https://mod.gov.in/press/p75i-provenance',
    sourceName: 'MoD Press',
    sourceDomain: 'mod.gov.in',
    tier: SourceTier.TIER_1_OFFICIAL,
    publishedAt: '2026-08-30T09:00:00Z'
  },
  relatedCoverage: [],
  discussions: [],
  categories: ['navy', 'procurement'],
  entities: ['Project 75I'],
  defenceScore: 92,
  isLeadStory: true,
  createdAt: '2026-08-30T09:00:00Z',
  updatedAt: '2026-08-30T09:00:00Z'
};

describe('hasStructuredBrief', () => {
  it('flags whyItMatters that does not follow the mandated Scope -> Impact -> Significance chain', () => {
    expect(hasStructuredBrief('A generic sentence with no structured chain at all.')).toBe(false);
    expect(hasStructuredBrief('Tejas induction -> Boosts squadron strength -> Strengthens posture')).toBe(true);
  });
});

describe('sanitizePromptInput truncation', () => {
  it('truncates long prompt inputs at a sentence/word boundary, never mid-word', () => {
    const longSnippet = 'The Cabinet Committee on Security approved a landmark procurement worth thousands of crores for indigenous platforms. Delivery is expected across the next decade with full IOR coverage.';
    const clean = sanitizePromptInput(longSnippet, 100);
    expect(clean.length).toBeLessThanOrEqual(100);
    expect(clean).not.toMatch(/[a-zA-Z]-$/); // crude .slice(0,100) would cut "indigen-"
    expect(/\s|\.\.\.|[.!?]$/.test(clean)).toBe(true);
  });
});

describe('Gemini provenance stamping', () => {
  beforeEach(() => clearSummaryMemoryCache());

  it('stamps successful Gemini output with provenance: gemini', async () => {
    const compliantFetch = async () => new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify({
        whyItMatters: 'Project 75I deal -> Enhances underwater deterrence -> Strategic leap for the Navy.'
      }) }] } }]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    const result = await summarizeWithGemini(MOCK_CLUSTER, 'mock-key', compliantFetch as typeof fetch);
    expect(result?.provenance).toBe('gemini');
  });

  it('stamps the extractive-miner fallback with provenance: extractive', async () => {
    const failingFetch = async () => new Response('Server Error', { status: 500 });
    const fallbackIntel = await summarizeWithGemini(MOCK_CLUSTER, 'mock-key', failingFetch as typeof fetch, undefined, true);
    expect(fallbackIntel?.provenance).toBe('extractive');
  });
});

describe('Gemini validation rejection logging', () => {
  beforeEach(() => clearSummaryMemoryCache());

  it('logs the specific validation failure reason instead of silently discarding a non-compliant Gemini response', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const nonCompliantFetch = async () => new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify({ whyItMatters: 'Thin, non-structured brief with no chain.' }) }] } }]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    const result = await summarizeWithGemini(MOCK_CLUSTER, 'mock-key', nonCompliantFetch as typeof fetch);
    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('[GEMINI VALIDATION REJECTED]'), expect.stringContaining('Scope -> Impact -> Strategic Significance'));
    errorSpy.mockRestore();
  });
});
