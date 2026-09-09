/**
 * Unit tests for the Gemini partial-salvage validator and bounded correction retry.
 * Regression coverage for the CI failure mode where nearly every Gemini call was
 * rejected because optional numeric/string fields came back as JSON null.
 * Hard limit: <= 300 LOC.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { clearSummaryMemoryCache, summarizeWithGemini } from '../../crawler/summarizer.js';
import { buildGeminiPrompt, buildGeminiResponseSchema } from '../../crawler/summarizerPrompt.js';
import { sanitizeGeminiSSBIntelligence } from '../../crawler/geminiSalvage.js';
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

  it('salvages and normalizes primaryTag and hashtags from Gemini response', async () => {
    const taggedFetch = async () => new Response(JSON.stringify({
      candidates: [{
        content: {
          parts: [{
            text: JSON.stringify({
              whyItMatters: 'Su-57 stealth fighter induction -> Expands 5th-gen capability -> Alters regional deterrence.',
              primaryTag: 'Su-57',
              hashtags: ['#Su57', 'StealthFighter'],
              defenceTechTakeaway: {
                platformOrSystem: 'Su-57',
                specifications: ['Internal weapons bay'],
                keySignificance: 'Enhances air superiority.'
              }
            })
          }]
        }
      }]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    const result = await summarizeWithGemini(MOCK_CLUSTER, 'mock-key', taggedFetch as typeof fetch);
    expect(result).not.toBeNull();
    expect(result?.primaryTag).toBe('#Su-57');
    expect(result?.hashtags).toContain('#Su57');
    expect(result?.hashtags).toContain('#StealthFighter');
  });

  it('drops malformed primaryTag and invalid hashtag entries while preserving brief', async () => {
    const badTagsFetch = async () => new Response(JSON.stringify({
      candidates: [{
        content: {
          parts: [{
            text: JSON.stringify({
              whyItMatters: 'Pinaka MBRL salvo -> Destroys area targets -> Bolsters artillery firepower.',
              primaryTag: 12345, // invalid type
              hashtags: ['#Pinaka', null, ''], // invalid entries
              defenceTechTakeaway: {
                platformOrSystem: 'Pinaka',
                specifications: ['Guided rocket'],
                keySignificance: 'Precision strike.'
              }
            })
          }]
        }
      }]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    const result = await summarizeWithGemini(MOCK_CLUSTER, 'mock-key', badTagsFetch as typeof fetch);
    expect(result).not.toBeNull();
    expect(result?.primaryTag).toBeUndefined();
    expect(result?.hashtags).toEqual(['#Pinaka']);
  });

  it('salvages and extracts focalEntity and operationalTheater from Gemini response', async () => {
    const dualOutputFetch = async () => new Response(JSON.stringify({
      candidates: [{
        content: {
          parts: [{
            text: JSON.stringify({
              whyItMatters: 'Rafale deployment -> Secures northern sector air dominance -> Deterrence against PLA.',
              primaryTag: '#Rafale',
              focalEntity: 'Dassault Rafale',
              operationalTheater: 'Northern Sector / Ladakh',
              hashtags: ['#Rafale', '#IAF'],
              defenceTechTakeaway: {
                platformOrSystem: 'Rafale',
                specifications: ['Meteor BVRAAM', 'SCALP cruise missile'],
                keySignificance: 'Air superiority and deep precision strike capability.'
              }
            })
          }]
        }
      }]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    const result = await summarizeWithGemini(MOCK_CLUSTER, 'mock-key', dualOutputFetch as typeof fetch);
    expect(result).not.toBeNull();
    expect(result?.focalEntity).toBe('Dassault Rafale');
    expect(result?.operationalTheater).toBe('Northern Sector / Ladakh');
    expect(result?.primaryTag).toBe('#Rafale');
  });

  it('gracefully drops malformed focalEntity and filters pseudo-null operationalTheater strings', () => {
    const raw = {
      whyItMatters: 'Pinaka regiment deployment -> Saturates area defence -> Bolsters artillery fire support.',
      focalEntity: 42, // invalid type
      operationalTheater: 'null', // string 'null' should be ignored
      primaryTag: '   #Pinaka   '
    };

    const parsed = sanitizeGeminiSSBIntelligence(raw, true);
    expect(parsed.intel).not.toBeNull();
    expect(parsed.intel?.focalEntity).toBeUndefined();
    expect(parsed.intel?.operationalTheater).toBeUndefined();
    expect(parsed.intel?.primaryTag).toBe('#Pinaka');
    expect(parsed.droppedFields).toContain('focalEntity');
  });

  it('enforces negative prompt constraints against #LAC and provides updated canonical examples in schema', () => {
    const prompt = buildGeminiPrompt(MOCK_CLUSTER);
    expect(prompt).toContain('Never output #LAC unless the article explicitly reports on the India-China border.');
    expect(prompt).toContain('"primaryTag": "#PrimaryEntity (e.g. #Su57, #TejasMk1A, #Pinaka, #BrahMos)"');
    expect(prompt).not.toContain('(e.g. #Su57, #TejasMk1A, #TASL, #LAC)');

    const schema = buildGeminiResponseSchema(false, true) as {
      properties?: Record<string, { description?: string }>;
    };
    expect(schema.properties?.focalEntity).toBeDefined();
    expect(schema.properties?.operationalTheater).toBeDefined();
    expect(schema.properties?.primaryTag?.description).toContain('#BrahMos');
    expect(schema.properties?.primaryTag?.description).not.toContain('#LAC');
  });
});
