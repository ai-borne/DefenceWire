/**
 * Unit Tests for Data Contracts & Type Models
 */

import { describe, it, expect } from 'vitest';
import { SourceTier } from '../../src/types/source.js';
import type { StoryCluster, StorySourceItem, SSBIntelligence } from '../../src/types/news.js';
import type { ScoreBreakdown, RankingParams } from '../../src/types/ranking.js';

describe('Data Contracts: SourceTier Enum', () => {
  it('should define all 4 institutional tiers correctly', () => {
    expect(SourceTier.TIER_1_OFFICIAL).toBe('TIER_1_OFFICIAL');
    expect(SourceTier.TIER_2_NATIONAL).toBe('TIER_2_NATIONAL');
    expect(SourceTier.TIER_3_SPECIALIZED).toBe('TIER_3_SPECIALIZED');
    expect(SourceTier.TIER_4_OSINT).toBe('TIER_4_OSINT');
  });
});

describe('Data Contracts: StoryCluster Structure', () => {
  it('should conform to StoryCluster schema', () => {
    const primarySource: StorySourceItem = {
      id: 'src-001',
      title: 'CCS Approves 97 Additional Tejas Mk1A Fighter Jets',
      url: 'https://pib.gov.in/PressReleasePage.aspx?PRID=1999999',
      sourceName: 'PIB Defence',
      sourceDomain: 'pib.gov.in',
      tier: SourceTier.TIER_1_OFFICIAL,
      publishedAt: '2026-08-30T09:00:00Z',
      isPrimary: true
    };

    const ssbIntel: SSBIntelligence = {
      whyItMatters: 'Critical milestone for IAF fighter squadron strength (target 42 vs current 31).',
      gdLecturettePoints: [
        'Atmanirbhar Bharat in Aerospace: Transition from import dependence to indigenous manufacturing.',
        'Indigenous content in Mk1A reaches ~65% with Uttam AESA radar and Astra BVRAAM integration.'
      ],
      potentialInterviewQuestions: [
        'Why does the Indian Air Force need both LCA Tejas Mk1A and MRFA/AMCA?',
        'Explain the role of AESA radar in modern beyond-visual-range (BVR) combat.'
      ],
      defenceTechTakeaway: {
        platformOrSystem: 'Tejas Mk1A',
        specifications: ['Uttam AESA Radar', 'Self-Protection Jammer (SPJ)', 'Astra Mk1 BVR'],
        indigenousContentPercentage: 65,
        keySignificance: 'Replaces aging MiG-21 Bisons with indigenous 4.5 Gen combat aircraft.'
      }
    };

    const cluster: StoryCluster = {
      id: 'cluster-001',
      synthesizedHeadline: 'Cabinet Committee on Security Clears 97 Additional Tejas Mk1A Fighters',
      primarySource,
      relatedCoverage: [
        {
          id: 'src-002',
          title: 'IAF to get 97 more LCA Tejas in massive indigenous boost',
          url: 'https://theprint.in/defence/tejas-ccs-clearance/12345/',
          sourceName: 'ThePrint',
          sourceDomain: 'theprint.in',
          tier: SourceTier.TIER_2_NATIONAL,
          publishedAt: '2026-08-30T09:15:00Z'
        }
      ],
      discussions: [
        {
          id: 'disc-001',
          author: 'Air Marshal (Retd) Anil Chopra',
          handleOrTitle: 'Former DG CAPS',
          quote: 'This clearance seals the future of HAL production line and bridges IAF squadron drawdown.',
          sourcePlatform: 'X/Twitter'
        }
      ],
      ssbIntel,
      categories: ['airforce', 'procurement', 'tech', 'ssb'],
      entities: ['Tejas Mk1A', 'IAF', 'CCS', 'HAL'],
      defenceScore: 94.5,
      isLeadStory: true,
      createdAt: '2026-08-30T09:00:00Z',
      updatedAt: '2026-08-30T09:20:00Z'
    };

    expect(cluster.id).toBe('cluster-001');
    expect(cluster.primarySource.tier).toBe(SourceTier.TIER_1_OFFICIAL);
    expect(cluster.categories).toContain('airforce');
    expect(cluster.ssbIntel?.defenceTechTakeaway?.indigenousContentPercentage).toBe(65);
    expect(cluster.defenceScore).toBe(94.5);
  });
});

describe('Data Contracts: Ranking & Scoring Structures', () => {
  it('should validate ScoreBreakdown and RankingParams structures', () => {
    const params: RankingParams = {
      gravity: 1.6,
      officialModBonus: 20,
      dacClearanceBonus: 15,
      borderStrategicBonus: 15,
      duplicatePenalty: -20
    };

    const breakdown: ScoreBreakdown = {
      sourceAuthorityScore: 25.0,
      sourceCountScore: 18.0,
      recencyScore: 15.0,
      ssbRelevanceScore: 15.0,
      strategicImpactScore: 10.0,
      velocityScore: 8.0,
      discussionScore: 4.5,
      bonusesTotal: 20.0,
      finalDefenceScore: 95.5,
      bonuses: [
        {
          name: 'Official MoD / PIB Release',
          points: 20,
          applied: true,
          reason: 'Tier 1 sovereign source'
        }
      ]
    };

    expect(params.gravity).toBe(1.6);
    expect(breakdown.finalDefenceScore).toBeGreaterThan(90);
    expect(breakdown.bonuses.length).toBe(1);
  });
});
