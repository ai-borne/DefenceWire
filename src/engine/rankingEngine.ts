/**
 * Mathematical Ranking Engine for DefenceWire.in
 * Implements Techmeme-style multi-factor DefenceScore ranking formula.
 * Hard limit: <= 300 LOC.
 */

import { StoryCluster, StorySourceItem } from '../types/news.js';
import { SourceTier } from '../types/source.js';
import { BonusFactor, RankingParams, ScoreBreakdown } from '../types/ranking.js';
import { getTierAuthorityWeight } from '../data/sources.js';
import { getSourceMultiplier } from './sourceReputation.js';

export const DEFAULT_RANKING_PARAMS: RankingParams = {
  gravity: 1.6,
  officialModBonus: 20,
  dacClearanceBonus: 15,
  borderStrategicBonus: 15,
  duplicatePenalty: 20
};

const STRATEGIC_KEYWORDS = [
  'lac', 'loc', 'nuclear', 'triad', 'ssbn', 'amca', 'project 75i',
  'brahmos', 'dac', 'ccs', 's-400', 'hypersonic', 'deterrence',
  'indigenous', 'zorawar', 'carrier', 'iadc', 'theatre command'
];

/**
 * Computes Source Authority score (0 - 100) scaled by dynamic source reputation.
 */
function calculateAuthorityScore(primary: StorySourceItem, related: StorySourceItem[]): number {
  const primaryMult = getSourceMultiplier(primary.sourceDomain);
  const primaryWeight = Math.min(100, getTierAuthorityWeight(primary.tier) * 100 * primaryMult);
  if (!related || related.length === 0) {
    return Math.round(primaryWeight);
  }
  const relatedSum = related.reduce((acc, item) => {
    const mult = getSourceMultiplier(item.sourceDomain);
    return acc + Math.min(100, getTierAuthorityWeight(item.tier) * 100 * mult);
  }, 0);
  const relatedAvg = relatedSum / related.length;
  return Math.round(primaryWeight * 0.6 + relatedAvg * 0.4);
}


/**
 * Computes Source Count score (0 - 100) based on corroboration breadth.
 */
function calculateSourceCountScore(totalSources: number): number {
  if (totalSources <= 1) return 25;
  if (totalSources === 2) return 50;
  if (totalSources === 3) return 70;
  if (totalSources === 4) return 85;
  return Math.min(100, 85 + (totalSources - 4) * 5);
}

/**
 * Computes Time Decay Recency score (0 - 100) using gravity exponent.
 */
function calculateRecencyScore(dateString: string, now: Date, gravity: number): number {
  const itemDate = new Date(dateString).getTime();
  const nowDate = now.getTime();
  const ageHours = Math.max(0, (nowDate - itemDate) / (1000 * 60 * 60));
  // Scale with half-life around 4 hours
  const score = 100 / (1 + Math.pow(ageHours / 4, gravity));
  return Math.round(Math.max(0, Math.min(100, score)) * 10) / 10;
}

/**
 * Computes SSB Relevance score (0 - 100).
 */
function calculateSSBRelevanceScore(cluster: StoryCluster): number {
  const ssb = cluster.ssbIntel;
  if (!ssb) return 0;

  let score = 0;
  if (ssb.whyItMatters && ssb.whyItMatters.trim().length > 10) score += 25;
  if (ssb.gdLecturettePoints && ssb.gdLecturettePoints.length >= 2) score += 25;
  else if (ssb.gdLecturettePoints && ssb.gdLecturettePoints.length === 1) score += 15;

  if (ssb.potentialInterviewQuestions && ssb.potentialInterviewQuestions.length >= 2) score += 25;
  else if (ssb.potentialInterviewQuestions && ssb.potentialInterviewQuestions.length === 1) score += 15;

  if (ssb.defenceTechTakeaway || ssb.strategicAngle) score += 25;

  return Math.min(100, score);
}

/**
 * Computes Strategic Impact score (0 - 100).
 */
function calculateStrategicScore(cluster: StoryCluster): number {
  let score = 0;
  const categories = cluster.categories || [];
  if (categories.includes('strategic')) score += 25;
  if (categories.includes('procurement')) score += 20;
  if (categories.includes('tech')) score += 15;

  const textToScan = `${cluster.synthesizedHeadline} ${cluster.entities.join(' ')}`.toLowerCase();
  let keywordHits = 0;
  for (const kw of STRATEGIC_KEYWORDS) {
    if (textToScan.includes(kw)) {
      keywordHits++;
    }
  }

  score += Math.min(40, keywordHits * 15);
  return Math.min(100, score);
}

/**
 * Computes Velocity score (0 - 100).
 */
function calculateVelocityScore(primary: StorySourceItem, related: StorySourceItem[], now: Date): number {
  const allItems = [primary, ...(related || [])];
  const nowDate = now.getTime();
  const recentCount = allItems.filter(item => {
    const ageHours = (nowDate - new Date(item.publishedAt).getTime()) / (1000 * 60 * 60);
    return ageHours >= 0 && ageHours <= 6;
  }).length;

  if (recentCount >= 4) return 100;
  if (recentCount === 3) return 75;
  if (recentCount === 2) return 50;
  return 20;
}

/**
 * Computes Discussion score (0 - 100).
 */
function calculateDiscussionScore(cluster: StoryCluster): number {
  const count = cluster.discussions ? cluster.discussions.length : 0;
  if (count >= 2) return 100;
  if (count === 1) return 50;
  return 0;
}

/**
 * Evaluates bonus and penalty factors for a cluster.
 */
function evaluateBonuses(cluster: StoryCluster, params: RankingParams): BonusFactor[] {
  const bonuses: BonusFactor[] = [];

  // MoD / PIB Official Bonus
  const isOfficial = cluster.primarySource.tier === SourceTier.TIER_1_OFFICIAL;
  bonuses.push({
    name: 'Official MoD / PIB Release',
    points: params.officialModBonus,
    applied: isOfficial,
    reason: isOfficial ? 'Primary source is sovereign Tier 1 government entity' : 'Not Tier 1 official'
  });

  // DAC / CCS Procurement Clearance
  const text = `${cluster.synthesizedHeadline} ${cluster.entities.join(' ')}`.toLowerCase();
  const isDac = /\b(dac|defence acquisition council|ccs approval|acceptance of necessity|aon)\b/i.test(text) ||
    (/\b(procurement|acquisition|tender)\b/i.test(text) && /\b(defence|defense|mod|iaf|navy|army|drdo|missile|aircraft|warship|ammunition|howitzer|tank|drone|uav|submarine)\b/i.test(text));
  bonuses.push({
    name: 'DAC Procurement Clearance',
    points: params.dacClearanceBonus,
    applied: isDac,
    reason: isDac ? 'High-value capital acquisition / DAC approval' : 'Not DAC procurement'
  });

  // Border / Strategic Alert
  const isBorder = text.includes('lac') || text.includes('loc') || text.includes('ladakh') || text.includes('arunachal');
  bonuses.push({
    name: 'Border & Operational Alert',
    points: params.borderStrategicBonus,
    applied: isBorder,
    reason: isBorder ? 'Direct LAC/LoC or operational deterrence significance' : 'No border alert'
  });

  // Editor Promoted
  if (cluster.isEditorPromoted) {
    bonuses.push({
      name: 'Editorial Lead Promotion',
      points: 25,
      applied: true,
      reason: 'Promoted by editor to lead'
    });
  }

  // Duplicate / Ignored Penalty
  if (cluster.isIgnored) {
    bonuses.push({
      name: 'Ignored / Low-Value Wire Penalty',
      points: -params.duplicatePenalty,
      applied: true,
      reason: 'Flagged as redundant wire spam'
    });
  }

  return bonuses;
}

/**
 * Calculates complete score breakdown and final DefenceScore for a StoryCluster.
 */
export function calculateScoreBreakdown(
  cluster: StoryCluster,
  now: Date = new Date(),
  customParams?: Partial<RankingParams>
): ScoreBreakdown {
  const params: RankingParams = { ...DEFAULT_RANKING_PARAMS, ...customParams };

  const primary = cluster.primarySource;
  const related = cluster.relatedCoverage || [];
  const totalSources = 1 + related.length;

  const sourceAuthorityScore = calculateAuthorityScore(primary, related);
  const sourceCountScore = calculateSourceCountScore(totalSources);
  const recencyScore = calculateRecencyScore(cluster.updatedAt || cluster.createdAt, now, params.gravity);
  const ssbRelevanceScore = calculateSSBRelevanceScore(cluster);
  const strategicImpactScore = calculateStrategicScore(cluster);
  const velocityScore = calculateVelocityScore(primary, related, now);
  const discussionScore = calculateDiscussionScore(cluster);

  const bonuses = evaluateBonuses(cluster, params);
  const bonusesTotal = bonuses.filter(b => b.applied).reduce((acc, b) => acc + b.points, 0);

  // DefenceScore formula: 0.25 S_auth + 0.20 N_sources + 0.15 R_recency + 0.15 SSB_rel + 0.10 M_strat + 0.10 V_vel + 0.05 D_disc + Bonuses
  const rawBaseScore =
    0.25 * sourceAuthorityScore +
    0.20 * sourceCountScore +
    0.15 * recencyScore +
    0.15 * ssbRelevanceScore +
    0.10 * strategicImpactScore +
    0.10 * velocityScore +
    0.05 * discussionScore;

  const finalDefenceScore = Math.max(0, Math.round((rawBaseScore + bonusesTotal) * 10) / 10);

  return {
    sourceAuthorityScore,
    sourceCountScore,
    recencyScore,
    ssbRelevanceScore,
    strategicImpactScore,
    velocityScore,
    discussionScore,
    bonusesTotal,
    finalDefenceScore,
    bonuses
  };
}

/**
 * Recalculates scores and sorts clusters in descending order of DefenceScore.
 * Also designates the top item as leadStory.
 */
export function rankClusters(
  clusters: StoryCluster[],
  now: Date = new Date(),
  customParams?: Partial<RankingParams>
): StoryCluster[] {
  if (!clusters || clusters.length === 0) {
    return [];
  }

  const scored = clusters.map(cluster => {
    const breakdown = calculateScoreBreakdown(cluster, now, customParams);
    return {
      ...cluster,
      defenceScore: breakdown.finalDefenceScore,
      isLeadStory: false
    };
  });

  // Sort descending by DefenceScore, fallback to updatedAt
  scored.sort((a, b) => {
    if (b.defenceScore !== a.defenceScore) {
      return b.defenceScore - a.defenceScore;
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  // Mark top active cluster as lead story
  const firstActiveIndex = scored.findIndex(c => !c.isIgnored);
  if (firstActiveIndex !== -1) {
    const activeLead = scored[firstActiveIndex];
    if (activeLead) {
      activeLead.isLeadStory = true;
    }
  }

  return scored;
}

/**
 * Auto-Pilot Gold-Standard Score Threshold (Score >= 75).
 * Qualifies stories with Tier 1 MoD release or multi-source corroboration.
 */
export const AUTO_PILOT_SCORE_THRESHOLD = 75;

export function isAutoPilotEligible(cluster: StoryCluster): boolean {
  return !cluster.isIgnored && cluster.defenceScore >= AUTO_PILOT_SCORE_THRESHOLD;
}
