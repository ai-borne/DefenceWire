import { describe, expect, it } from 'vitest';
import {
  CONFIDENCE_THRESHOLD,
  extractDefenceMetrics,
  generateExtractiveSSBIntel,
  HIGH_VALUE_BUDGET_THRESHOLD_CR
} from '../../crawler/extractiveMiner.js';
import { isValidSSBIntelligence } from '../../crawler/summarizer.js';
import { StoryCluster } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';

function createMockCluster(overrides: Partial<StoryCluster> = {}): StoryCluster {
  return {
    id: 'c-miner-test',
    synthesizedHeadline: 'Cabinet Clears 34 Dhruv ALH Helicopters',
    primarySource: {
      id: 'ps-pib-1',
      title: 'CCS approves procurement of 34 ALH Dhruv helicopters worth Rs 8,073 crore',
      url: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2012345',
      sourceName: 'PIB MoD',
      sourceDomain: 'pib.gov.in',
      tier: SourceTier.TIER_1_OFFICIAL,
      publishedAt: '2026-08-30T10:00:00Z',
      snippet: 'The Cabinet Committee on Security approved acquisition of 34 ALH Dhruv helicopters worth Rs 8,073 crore with delivery by 2028 with 65% indigenous content.'
    },
    relatedCoverage: [],
    discussions: [],
    categories: ['airforce', 'procurement'],
    entities: ['ALH Dhruv'],
    defenceScore: 95,
    isLeadStory: true,
    createdAt: '2026-08-30T10:00:00Z',
    updatedAt: '2026-08-30T10:00:00Z',
    ...overrides
  };
}

describe('Deterministic Extractive Miner', () => {
  it('extracts budget, timeline, quantities, and IC% with high confidence from PIB communique', () => {
    const cluster = createMockCluster();
    const result = extractDefenceMetrics(cluster);

    expect(result.confidence).toBeGreaterThanOrEqual(CONFIDENCE_THRESHOLD);
    expect(result.isHighConfidence).toBe(true);
    expect(result.metrics.platformOrSystem).toBe('ALH Dhruv');
    expect(result.metrics.budgetCrores).toBe(8073);
    expect(result.metrics.quantities).toBe('34 helicopters');
    expect(result.metrics.deliveryTimeline).toBe('2028');
    expect(result.metrics.indigenousContentPercentage).toBe(65);
    expect(result.summaryText).toContain('ALH Dhruv:');
    expect(result.summaryText).toContain('₹8,073 Cr');
    expect(result.summaryText).toContain('PIB MoD');
  });

  it('triggers sanity audit flags on single orders exceeding ₹25,000 Cr threshold', () => {
    const megaCluster = createMockCluster({
      synthesizedHeadline: 'MoD Seals Mega Deal for 97 Tejas Mk1A Jets',
      primarySource: {
        id: 'ps-pib-mega',
        title: 'Contract signed for 97 Tejas Mk1A aircraft worth ₹67,000 Cr',
        url: 'https://pib.gov.in/tejas97',
        sourceName: 'PIB',
        sourceDomain: 'pib.gov.in',
        tier: SourceTier.TIER_1_OFFICIAL,
        publishedAt: '2026-08-30T11:00:00Z',
        snippet: 'MoD sanctions capital outlay of ₹67,000 crore for 97 fighter jets by 2030.'
      },
      entities: ['Tejas Mk1A']
    });

    const result = extractDefenceMetrics(megaCluster);
    expect(result.metrics.budgetCrores).toBe(67000);
    expect(result.metrics.budgetCrores).toBeGreaterThan(HIGH_VALUE_BUDGET_THRESHOLD_CR);
    expect(result.metrics.isHighValueOrder).toBe(true);
    expect(result.metrics.sanityAuditRequired).toBe(true);
  });

  it('falls back to verbatim cited excerpt when confidence is below 0.75', () => {
    const lowConfCluster = createMockCluster({
      synthesizedHeadline: 'Speculative Commentary on Armoured Formations',
      primarySource: {
        id: 'ps-blog',
        title: 'Opinion: Future tank operational concepts in desert terrain',
        url: 'https://defence-blog-rumors.com/tanks',
        sourceName: 'Defence Watcher',
        sourceDomain: 'defence-watcher.com',
        tier: SourceTier.TIER_3_SPECIALIZED,
        publishedAt: '2026-08-30T12:00:00Z',
        snippet: 'Military analysts suggest future armored forces will need modern optical sights.'
      },
      entities: ['Arjun Tank'],
      categories: ['army']
    });

    const result = extractDefenceMetrics(lowConfCluster);
    expect(result.confidence).toBeLessThan(CONFIDENCE_THRESHOLD);
    expect(result.isHighConfidence).toBe(false);
    expect(result.summaryText).toBe(result.verbatimQuote);
    expect(result.verbatimQuote).toMatch(/^".+" — Defence Watcher$/);
  });

  it('generates schema-valid SSBIntelligence with proper domain scoping', () => {
    const cluster = createMockCluster();
    const intel = generateExtractiveSSBIntel(cluster);

    expect(isValidSSBIntelligence(intel)).toBe(true);
    expect(intel.whyItMatters).toBeTruthy();
    expect(intel.strategicAngle).toContain('AIRFORCE');
    expect(intel.defenceTechTakeaway?.platformOrSystem).toBe('ALH Dhruv');
    expect(intel.gdLecturettePoints).toBeUndefined();
  });

  it('populates lecturette and interview prompts for clusters tagged with ssb category', () => {
    const ssbCluster = createMockCluster({
      categories: ['ssb', 'navy']
    });
    const intel = generateExtractiveSSBIntel(ssbCluster);

    expect(isValidSSBIntelligence(intel)).toBe(true);
    expect(intel.gdLecturettePoints?.length).toBeGreaterThanOrEqual(3);
    expect(intel.potentialInterviewQuestions?.length).toBeGreaterThanOrEqual(3);
    expect(intel.strategicAngle).toContain('SSB');
  });
});
