/**
 * Dynamic Source Reputation & Scoop Indexing Engine
 * Computes rolling reputation multipliers (0.70x to 1.30x) based on scoop velocity,
 * cross-outlet corroboration, and signal-to-noise ratio.
 * Hard limit: <= 300 LOC.
 */

import { StoryCluster } from '../types/news.js';

export interface SourceStats {
  domain: string;
  sourceName: string;
  totalIngested: number;
  acceptedCount: number;
  scoopCount: number;
  corroborationCount: number;
  lastEvaluatedAt?: string;
}

export interface SourceReputationRecord extends SourceStats {
  reputationMultiplier: number;
}

// In-memory active multiplier registry
const activeMultipliers: Map<string, number> = new Map();

/**
 * Computes a dynamic reputation multiplier bounded strictly between 0.70 and 1.30.
 */
export function computeReputationMultiplier(stats: SourceStats): number {
  if (!stats || stats.totalIngested <= 0) {
    return 1.0;
  }

  let multiplier = 1.0;

  // 1. Signal-to-Noise Ratio (Acceptance vs Raw Feed Items)
  const acceptanceRatio = stats.acceptedCount / Math.max(1, stats.totalIngested);
  if (acceptanceRatio < 0.15) {
    multiplier -= 0.15; // Heavy noise penalty
  } else if (acceptanceRatio < 0.35) {
    multiplier -= 0.08;
  } else if (acceptanceRatio >= 0.75) {
    multiplier += 0.08; // High-purity defence signal bonus
  }

  // 2. Scoop Originator Velocity Bonus
  const scoopBonus = Math.min(0.15, (stats.scoopCount || 0) * 0.03);
  multiplier += scoopBonus;

  // 3. Corroboration Accuracy Bonus
  const corroborationBonus = Math.min(0.10, (stats.corroborationCount || 0) * 0.01);
  multiplier += corroborationBonus;

  // Strict bounding [0.70, 1.30]
  const clamped = Math.max(0.7, Math.min(1.3, multiplier));
  return Math.round(clamped * 100) / 100;
}

/**
 * Identifies the domain that published the earliest verified scoop in a story cluster.
 */
export function identifyScoopLeader(cluster: StoryCluster): string | null {
  if (!cluster || !cluster.primarySource) return null;

  let earliestTime = new Date(cluster.primarySource.publishedAt).getTime();
  let earliestDomain = cluster.primarySource.sourceDomain;

  if (isNaN(earliestTime)) {
    earliestTime = Infinity;
  }

  if (cluster.relatedCoverage && cluster.relatedCoverage.length > 0) {
    for (const item of cluster.relatedCoverage) {
      const itemTime = new Date(item.publishedAt).getTime();
      if (!isNaN(itemTime) && itemTime < earliestTime) {
        earliestTime = itemTime;
        earliestDomain = item.sourceDomain;
      }
    }
  }

  return earliestDomain || null;
}

/**
 * Registers dynamic multipliers in runtime memory for ranking engine scoring.
 */
export function registerDynamicSourceMultipliers(multipliers: Record<string, number>): void {
  for (const [domain, mult] of Object.entries(multipliers)) {
    if (domain && typeof mult === 'number') {
      const clamped = Math.max(0.7, Math.min(1.3, mult));
      activeMultipliers.set(domain.toLowerCase(), clamped);
    }
  }
}

/**
 * Retrieves the dynamic multiplier for a source domain, defaulting to 1.0.
 */
export function getSourceMultiplier(domain: string): number {
  if (!domain) return 1.0;
  return activeMultipliers.get(domain.toLowerCase()) ?? 1.0;
}

/**
 * Clears the active multiplier registry (useful for unit tests).
 */
export function resetSourceMultipliers(): void {
  activeMultipliers.clear();
}
