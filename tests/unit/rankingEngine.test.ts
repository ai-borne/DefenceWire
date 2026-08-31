/**
 * Unit Tests for Mathematical Ranking Engine
 * Tests score breakdowns, time-decay gravity, bonuses, and sorting.
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it } from 'vitest';
import {
  AUTO_PILOT_SCORE_THRESHOLD,
  calculateScoreBreakdown,
  isAutoPilotEligible,
  rankClusters
} from '../../src/engine/rankingEngine.js';
import { StoryCluster, StorySourceItem } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';

const MOCK_PRIMARY_T1: StorySourceItem = {
  id: 't1-01',
  title: 'MoD Announces DAC Clearance for BrahMos Missile Regiment',
  url: 'https://pib.gov.in/press/101',
  sourceName: 'PIB MoD',
  sourceDomain: 'pib.gov.in',
  tier: SourceTier.TIER_1_OFFICIAL,
  publishedAt: '2026-08-30T10:00:00Z',
  isPrimary: true
};

const MOCK_RELATED_T2: StorySourceItem = {
  id: 't2-01',
  title: 'Indian Armed Forces to Deploy Extended-Range BrahMos Missiles Along LAC',
  url: 'https://thehindu.com/news/102',
  sourceName: 'The Hindu',
  sourceDomain: 'thehindu.com',
  tier: SourceTier.TIER_2_NATIONAL,
  publishedAt: '2026-08-30T10:30:00Z'
};

const MOCK_CLUSTER: StoryCluster = {
  id: 'test-cluster-01',
  synthesizedHeadline: 'DAC Clears ₹70,000 Cr BrahMos & Drone Acquisitions for LAC Deployment',
  primarySource: MOCK_PRIMARY_T1,
  relatedCoverage: [MOCK_RELATED_T2],
  discussions: [
    {
      id: 'd-1',
      author: 'Defence Analyst',
      handleOrTitle: 'ThinkTank Fellow',
      quote: 'Strategic precision fires enhance deterrence.',
      sourcePlatform: 'ThinkTank'
    }
  ],
  ssbIntel: {
    whyItMatters: 'Directly impacts precision standoff strike capability along northern borders.',
    gdLecturettePoints: ['Deterrence posture along LAC', 'Indigenisation under DAP 2020'],
    potentialInterviewQuestions: ['What is the range of BrahMos Extended Range?']
  },
  categories: ['procurement', 'strategic', 'tech', 'ssb'],
  entities: ['DAC Clearance', 'BrahMos', 'LAC'],
  defenceScore: 0,
  isLeadStory: false,
  createdAt: '2026-08-30T10:00:00Z',
  updatedAt: '2026-08-30T10:30:00Z'
};

describe('Ranking Engine & DefenceScore Calculation', () => {
  const referenceTime = new Date('2026-08-30T11:00:00Z'); // 30 mins after updated

  it('should calculate complete score breakdown with all 7 components and bonuses', () => {
    const breakdown = calculateScoreBreakdown(MOCK_CLUSTER, referenceTime);

    expect(breakdown.sourceAuthorityScore).toBeGreaterThan(0);
    expect(breakdown.sourceAuthorityScore).toBeLessThanOrEqual(100);

    expect(breakdown.sourceCountScore).toBe(50); // 2 sources = 50 points
    expect(breakdown.recencyScore).toBeGreaterThan(90); // ~30 mins old
    expect(breakdown.ssbRelevanceScore).toBeGreaterThanOrEqual(60);
    expect(breakdown.strategicImpactScore).toBeGreaterThan(0);
    expect(breakdown.velocityScore).toBe(50); // 2 recent sources in 6h = 50 points
    expect(breakdown.discussionScore).toBe(50); // 1 discussion quote = 50 points

    expect(breakdown.bonuses.length).toBeGreaterThanOrEqual(3);
    expect(breakdown.bonusesTotal).toBeGreaterThan(0);
    expect(breakdown.finalDefenceScore).toBeGreaterThan(50);
  });

  it('should apply time decay gravity curve correctly', () => {
    const now0h = new Date('2026-08-30T10:30:00Z');
    const now4h = new Date('2026-08-30T14:30:00Z');
    const now24h = new Date('2026-08-31T10:30:00Z');

    const score0h = calculateScoreBreakdown(MOCK_CLUSTER, now0h);
    const score4h = calculateScoreBreakdown(MOCK_CLUSTER, now4h);
    const score24h = calculateScoreBreakdown(MOCK_CLUSTER, now24h);

    expect(score0h.recencyScore).toBe(100);
    expect(score4h.recencyScore).toBe(50); // at half-life of 4 hours
    expect(score24h.recencyScore).toBeLessThan(10);
    expect(score0h.finalDefenceScore).toBeGreaterThan(score4h.finalDefenceScore);
    expect(score4h.finalDefenceScore).toBeGreaterThan(score24h.finalDefenceScore);
  });

  it('should apply Official MoD Bonus (+20) only when primary is Tier 1', () => {
    const breakdownTier1 = calculateScoreBreakdown(MOCK_CLUSTER, referenceTime);
    const modBonus = breakdownTier1.bonuses.find(b => b.name.includes('Official MoD'));
    expect(modBonus?.applied).toBe(true);
    expect(modBonus?.points).toBe(20);

    const clusterTier4: StoryCluster = {
      ...MOCK_CLUSTER,
      primarySource: {
        ...MOCK_PRIMARY_T1,
        tier: SourceTier.TIER_4_OSINT
      }
    };
    const breakdownTier4 = calculateScoreBreakdown(clusterTier4, referenceTime);
    const modBonusTier4 = breakdownTier4.bonuses.find(b => b.name.includes('Official MoD'));
    expect(modBonusTier4?.applied).toBe(false);
  });

  it('should apply DAC clearance (+15) and Border alert (+15) bonuses', () => {
    const breakdown = calculateScoreBreakdown(MOCK_CLUSTER, referenceTime);
    const dacBonus = breakdown.bonuses.find(b => b.name.includes('DAC Procurement'));
    const borderBonus = breakdown.bonuses.find(b => b.name.includes('Border & Operational'));

    expect(dacBonus?.applied).toBe(true);
    expect(dacBonus?.points).toBe(15);
    expect(borderBonus?.applied).toBe(true);
    expect(borderBonus?.points).toBe(15);
  });

  it('should apply editorial lead promotion bonus (+25)', () => {
    const promotedCluster: StoryCluster = {
      ...MOCK_CLUSTER,
      isEditorPromoted: true
    };
    const breakdown = calculateScoreBreakdown(promotedCluster, referenceTime);
    const promoBonus = breakdown.bonuses.find(b => b.name.includes('Editorial Lead Promotion'));

    expect(promoBonus?.applied).toBe(true);
    expect(promoBonus?.points).toBe(25);
  });

  it('should apply penalty for ignored / duplicate wire spam (-20)', () => {
    const ignoredCluster: StoryCluster = {
      ...MOCK_CLUSTER,
      isIgnored: true
    };
    const breakdown = calculateScoreBreakdown(ignoredCluster, referenceTime);
    const ignoredBonus = breakdown.bonuses.find(b => b.name.includes('Ignored'));

    expect(ignoredBonus?.applied).toBe(true);
    expect(ignoredBonus?.points).toBe(-20);
  });

  it('should rank clusters in descending order and set leadStory on the top item', () => {
    const clusterA: StoryCluster = {
      ...MOCK_CLUSTER,
      id: 'cluster-a',
      updatedAt: '2026-08-30T10:30:00Z'
    };

    const clusterB: StoryCluster = {
      ...MOCK_CLUSTER,
      id: 'cluster-b',
      ssbIntel: undefined,
      entities: [],
      categories: ['strategic'],
      updatedAt: '2026-08-25T10:30:00Z' // 5 days old
    };

    const ranked = rankClusters([clusterB, clusterA], referenceTime);

    expect(ranked[0]?.id).toBe('cluster-a');
    expect(ranked[0]?.isLeadStory).toBe(true);
    expect(ranked[1]?.id).toBe('cluster-b');
    expect(ranked[1]?.isLeadStory).toBe(false);
    expect(ranked[0]?.defenceScore).toBeGreaterThan(ranked[1]?.defenceScore ?? 0);
  });

  it('evaluates Auto-Pilot mode eligibility with threshold >= 75 and unignored status', () => {
    expect(AUTO_PILOT_SCORE_THRESHOLD).toBe(75);

    const eligibleCluster: StoryCluster = {
      ...MOCK_CLUSTER,
      defenceScore: 78,
      isIgnored: false
    };

    const borderlineCluster: StoryCluster = {
      ...MOCK_CLUSTER,
      defenceScore: 75,
      isIgnored: false
    };

    const lowScoreCluster: StoryCluster = {
      ...MOCK_CLUSTER,
      defenceScore: 74.9,
      isIgnored: false
    };

    const ignoredHighCluster: StoryCluster = {
      ...MOCK_CLUSTER,
      defenceScore: 95,
      isIgnored: true
    };

    expect(isAutoPilotEligible(eligibleCluster)).toBe(true);
    expect(isAutoPilotEligible(borderlineCluster)).toBe(true);
    expect(isAutoPilotEligible(lowScoreCluster)).toBe(false);
    expect(isAutoPilotEligible(ignoredHighCluster)).toBe(false);
  });

  it('only grants DAC Procurement Clearance bonus when genuine defence acquisition triggers are present', () => {
    const milkCluster: StoryCluster = {
      ...MOCK_CLUSTER,
      id: 'cluster-milk',
      synthesizedHeadline: 'Tamil Nadu CM Vijay announces further hike of milk procurement price',
      entities: [],
      categories: ['strategic']
    };

    const dacCluster: StoryCluster = {
      ...MOCK_CLUSTER,
      id: 'cluster-dac',
      synthesizedHeadline: 'DAC Clears Capital Acquisition of 31 MQ-9B Drones for Armed Forces',
      entities: ['DAC Clearance'],
      categories: ['procurement', 'navy']
    };

    const breakdownMilk = calculateScoreBreakdown(milkCluster, referenceTime);
    const dacBonusMilk = breakdownMilk.bonuses.find(b => b.name === 'DAC Procurement Clearance');
    expect(dacBonusMilk?.applied).toBe(false);

    const breakdownDac = calculateScoreBreakdown(dacCluster, referenceTime);
    const dacBonusDac = breakdownDac.bonuses.find(b => b.name === 'DAC Procurement Clearance');
    expect(dacBonusDac?.applied).toBe(true);
  });
});
