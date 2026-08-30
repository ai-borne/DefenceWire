/**
 * Unit Tests for Gemini Summarizer & Content-Hash Memory
 * Hard limit: <= 300 LOC.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearSummaryMemoryCache,
  computeContentHash,
  generateHeuristicSSBIntel,
  getSummaryMemorySize,
  summarizeWithGemini
} from '../../crawler/summarizer.js';
import { StoryCluster } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';

const MOCK_CLUSTER: StoryCluster = {
  id: 'c-gemini-test',
  synthesizedHeadline: 'Project 75I Submarine Deal Finalized with Fuel-Cell AIP',
  primarySource: {
    id: 'ps-gemini',
    title: 'MoD Finalizes Project 75I Deal',
    url: 'https://mod.gov.in/press/p75i',
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

const MOCK_GEMINI_RESPONSE = {
  candidates: [
    {
      content: {
        parts: [
          {
            text: JSON.stringify({
              isDefenceRelevant: true,
              whyItMatters: 'Critical strategic leap for Indian Navy underwater deterrence in IOR.',
              gdLecturettePoints: [
                'AIP Technology vs Nuclear Submarine Fleet',
                'Indigenisation milestones under Strategic Partnership Model',
                'Maritime Balance in the Indian Ocean Region'
              ],
              potentialInterviewQuestions: [
                'What is Air Independent Propulsion (AIP)?',
                'Why is Project 75I critical for Indian Navy submarine doctrine?',
                'How does AIP compare to SSN capabilities?'
              ],
              strategicAngle: 'Countering expanding PLA Navy presence in the Malacca Straits.',
              defenceTechTakeaway: {
                platformOrSystem: 'Project 75I',
                specifications: ['Fuel-cell AIP module', 'Heavyweight wire-guided torpedoes', 'Land-attack cruise missiles'],
                keySignificance: 'Enhances sub-surface stealth endurance from days to weeks.'
              }
            })
          }
        ]
      }
    }
  ]
};

describe('Summarizer & Content-Hash Memory', () => {
  beforeEach(() => {
    clearSummaryMemoryCache();
  });

  it('computes deterministic SHA-256 content hashes for news items', () => {
    const hash1 = computeContentHash('HAL Tejas Mk1A Delivery', 'https://pib.gov.in/tejas');
    const hash2 = computeContentHash('HAL Tejas Mk1A Delivery', 'https://pib.gov.in/tejas');
    const hashDifferent = computeContentHash('HAL Tejas Mk1A Delivery', 'https://pib.gov.in/different');

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // 64-char SHA-256 hex string
    expect(hash1).not.toBe(hashDifferent);
  });

  it('generates complete heuristic SSB intelligence with domain-specific takeaways', () => {
    const heuristic = generateHeuristicSSBIntel(MOCK_CLUSTER);

    expect(heuristic.whyItMatters).toBeTruthy();
    expect(heuristic.gdLecturettePoints.length).toBeGreaterThanOrEqual(3);
    expect(heuristic.potentialInterviewQuestions.length).toBeGreaterThanOrEqual(3);
    expect(heuristic.strategicAngle).toBeTruthy();
    expect(heuristic.defenceTechTakeaway?.platformOrSystem).toBe('Project 75I');
    expect(heuristic.defenceTechTakeaway?.specifications.length).toBeGreaterThanOrEqual(3);
  });

  it('returns null without calling fetch when API key is empty', async () => {
    let fetchCalled = false;
    const trackingFetch = async () => {
      fetchCalled = true;
      return new Response('', { status: 200 });
    };

    const res = await summarizeWithGemini(MOCK_CLUSTER, '', trackingFetch as typeof fetch);
    expect(res).toBeNull();
    expect(fetchCalled).toBe(false);
  });

  it('fetches from Gemini API on cache miss and stores in content-hash memory', async () => {
    let callCount = 0;
    const mockFetch = async () => {
      callCount++;
      return new Response(JSON.stringify(MOCK_GEMINI_RESPONSE), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    expect(getSummaryMemorySize()).toBe(0);

    // Call 1: Cache Miss -> API Invocation
    const intel1 = await summarizeWithGemini(MOCK_CLUSTER, 'mock-api-key', mockFetch as typeof fetch);
    expect(intel1).toBeDefined();
    expect(intel1?.whyItMatters).toContain('underwater deterrence');
    expect(callCount).toBe(1);
    expect(getSummaryMemorySize()).toBe(1);

    // Call 2: Cache Hit -> Instant $0 return without API call
    const intel2 = await summarizeWithGemini(MOCK_CLUSTER, 'mock-api-key', mockFetch as typeof fetch);
    expect(intel2).toEqual(intel1);
    expect(callCount).toBe(1); // No new network calls!
  });

  it('handles invalid or unparseable Gemini responses gracefully', async () => {
    const invalidJsonFetch = async () =>
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'not valid json' }] } }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    const result = await summarizeWithGemini(MOCK_CLUSTER, 'mock-key', invalidJsonFetch as typeof fetch);
    expect(result).toBeNull();
  });
});
