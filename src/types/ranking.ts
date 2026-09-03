/**
 * Ranking Formula & Scoring Types for DefenceWire.in
 * Hard limit: <= 300 LOC.
 */

export interface BonusFactor {
  name: string;
  points: number; // e.g. +20 for official MoD release, +15 for DAC clearance, -20 for duplicate
  applied: boolean;
  reason: string;
}

export interface ScoreBreakdown {
  sourceAuthorityScore: number; // 0.25 weight (S_auth)
  sourceCountScore: number;     // 0.20 weight (N_sources)
  recencyScore: number;         // 0.15 weight (R_recency)
  ssbRelevanceScore: number;    // 0.15 weight (SSB_rel)
  strategicImpactScore: number; // 0.10 weight (M_strat)
  velocityScore: number;        // 0.10 weight (V_velocity)
  discussionScore: number;      // 0.05 weight (D_disc)
  bonusesTotal: number;         // Sum of bonus factors
  finalDefenceScore: number;    // Final combined score (0 - 100+)
  bonuses: BonusFactor[];
}

export interface RankingParams {
  gravity: number;             // Time-decay gravity exponent (default: 1.6)
  officialModBonus: number;    // Points added for PIB / MoD Tier 1 (+20)
  officialSocialConfirmationBonus: number; // Points added for verified official handle corroboration (+15)
  dacClearanceBonus: number;   // Points added for DAC procurement (+15)
  borderStrategicBonus: number;// Points added for LAC/LoC operational (+15)
  duplicatePenalty: number;    // Penalty for redundant wire spam (-20)
  breakingVelocityBonus?: number; // Points added for verified breaking velocity surge (+15)
}
