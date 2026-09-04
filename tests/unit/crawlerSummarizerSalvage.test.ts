/**
 * Unit tests for the Gemini partial-salvage validator and bounded correction retry.
 * Regression coverage for the CI failure mode where nearly every Gemini call was
 * rejected because optional numeric/string fields came back as JSON null.
 * Hard limit: <= 300 LOC.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { clearSummaryMemoryCache, summarizeWithGemini } from '../../crawler/summarizer.js';
import { StoryCluster } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';

const MOCK_CLUSTER: StoryCluster = {
  id: 'c-salvage-test',
  synthesizedHeadline: 'Project 75I Submarine Deal Finalized with Fuel-Cell AIP',
  primarySource: {
    id: 'ps-salvage',
    title: 'MoD Finalizes Project 75I Deal',
    url: 'https://mod.gov.in/press/p75i-salvage',
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

describe('Gemini partial-salvage validation', () => {
  beforeEach(() => clearSummaryMemoryCache());

  it('salvages an otherwise-valid brief when Gemini returns null for unknown optional metrics, instead of discarding the whole brief', async () => {
    const nullOptionalsFetch = async () => new Response(JSON.stringify({
      candidates: [{
        content: {
          parts: [{
            text: JSON.stringify({
              whyItMatters: 'Tejas Mk1A induction -> Boosts squadron strength -> Strengthens western air defence posture.',
              defenceTechTakeaway: {
                platformOrSystem: 'Tejas Mk1A',
                specifications: ['AESA radar'],
                keySignificance: 'Modernizes fighter fleet.',
                budgetCrores: null,
                deliveryTimeline: null,
                indigenousContentPercentage: null
              }
            })
          }]
        }
      }]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    const result = await summarizeWithGemini(MOCK_CLUSTER, 'mock-key', nullOptionalsFetch as typeof fetch);
    expect(result).not.toBeNull();
    expect(result?.provenance).toBe('gemini');
    expect(result?.defenceTechTakeaway?.platformOrSystem).toBe('Tejas Mk1A');
    expect(result?.defenceTechTakeaway?.budgetCrores).toBeUndefined();
    expect(result?.defenceTechTakeaway?.deliveryTimeline).toBeUndefined();
    expect(result?.defenceTechTakeaway?.indigenousContentPercentage).toBeUndefined();
  });

  it('drops only the malformed optional field instead of rejecting the entire brief', async () => {
    const outOfRangeFetch = async () => new Response(JSON.stringify({
      candidates: [{
        content: {
          parts: [{
            text: JSON.stringify({
              whyItMatters: 'Zorawar light tank trials -> Enhances high-altitude mobility -> Strengthens LAC posture.',
              defenceTechTakeaway: {
                platformOrSystem: 'Zorawar',
                specifications: ['25-tonne class'],
                keySignificance: 'Fills the light tank capability gap.',
                indigenousContentPercentage: 150
              }
            })
          }]
        }
      }]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    const result = await summarizeWithGemini(MOCK_CLUSTER, 'mock-key', outOfRangeFetch as typeof fetch);
    expect(result).not.toBeNull();
    expect(result?.defenceTechTakeaway?.platformOrSystem).toBe('Zorawar');
    expect(result?.defenceTechTakeaway?.indigenousContentPercentage).toBeUndefined();
  });

  it('retries once with correction feedback after a hard validation failure, then succeeds', async () => {
    let callCount = 0;
    const selfCorrectingFetch = async () => {
      callCount++;
      const text = callCount === 1
        ? JSON.stringify({ whyItMatters: 'Thin brief with no mandated chain.' })
        : JSON.stringify({ whyItMatters: 'Corrected brief -> Restores operational readiness -> Strengthens deterrence posture.' });
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const result = await summarizeWithGemini(MOCK_CLUSTER, 'mock-key', selfCorrectingFetch as typeof fetch);
    expect(callCount).toBe(2);
    expect(result?.whyItMatters).toContain('Corrected brief');
  });

  it('rejects a brief that never states the mandated structure even after the retry', async () => {
    // Guards against the partial-salvage change accidentally weakening the one hard
    // requirement (the mandated Scope -> Impact -> Strategic Significance chain).
    const stillNonCompliantFetch = async () => new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify({ whyItMatters: 'No chain here at all.' }) }] } }]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    const result = await summarizeWithGemini(MOCK_CLUSTER, 'mock-key', stillNonCompliantFetch as typeof fetch);
    expect(result).toBeNull();
  });
});
