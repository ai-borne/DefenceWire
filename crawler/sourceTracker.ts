/**
 * Crawler Source Reputation Tracker
 * Aggregates feed ingestion stats, identifies scoop originators from clusters,
 * computes rolling multipliers, and synchronizes with Cloudflare D1.
 * Hard limit: <= 300 LOC.
 */

import { StoryCluster, StorySourceItem } from '../src/types/news.js';
import {
  computeReputationMultiplier,
  identifyScoopLeader,
  registerDynamicSourceMultipliers,
  SourceStats
} from '../src/engine/sourceReputation.js';
import { D1RestConfig } from './archiveSync.js';

export interface SourceTrackerResult {
  statsMap: Map<string, SourceStats>;
  multipliers: Record<string, number>;
  syncedToD1: number;
}

/**
 * Aggregates ingestion statistics and scoop counts from a crawler run.
 */
export function aggregateSourceStats(
  rawItems: StorySourceItem[],
  filteredItems: StorySourceItem[],
  clusters: StoryCluster[]
): Map<string, SourceStats> {
  const statsMap = new Map<string, SourceStats>();

  const getOrCreate = (domain: string, name: string): SourceStats => {
    const cleanDomain = (domain || 'unknown').toLowerCase();
    let stats = statsMap.get(cleanDomain);
    if (!stats) {
      stats = {
        domain: cleanDomain,
        sourceName: name || cleanDomain,
        totalIngested: 0,
        acceptedCount: 0,
        scoopCount: 0,
        corroborationCount: 0
      };
      statsMap.set(cleanDomain, stats);
    }
    return stats;
  };

  // 1. Ingestion Volume
  for (const item of rawItems) {
    if (item.sourceDomain) {
      const stats = getOrCreate(item.sourceDomain, item.sourceName);
      stats.totalIngested++;
    }
  }

  // 2. Acceptance & Quality Volume
  for (const item of filteredItems) {
    if (item.sourceDomain) {
      const stats = getOrCreate(item.sourceDomain, item.sourceName);
      stats.acceptedCount++;
    }
  }

  // 3. Scoop Originator & Corroboration Credits
  for (const cluster of clusters) {
    const leaderDomain = identifyScoopLeader(cluster);
    if (leaderDomain) {
      const leaderStats = getOrCreate(leaderDomain, cluster.primarySource.sourceName);
      leaderStats.scoopCount++;
    }

    if (cluster.relatedCoverage && cluster.relatedCoverage.length > 0) {
      for (const related of cluster.relatedCoverage) {
        if (related.sourceDomain) {
          const stats = getOrCreate(related.sourceDomain, related.sourceName);
          stats.corroborationCount++;
        }
      }
    }
  }

  return statsMap;
}

/**
 * Synchronizes computed source reputation metrics to Cloudflare D1.
 */
export async function syncSourceReputationToD1(
  statsMap: Map<string, SourceStats>,
  d1Config: D1RestConfig | null,
  options: { fetchFn?: typeof fetch; now?: () => Date } = {}
): Promise<SourceTrackerResult> {
  const fetchFn = options.fetchFn ?? globalThis.fetch;
  const now = (options.now ? options.now() : new Date()).toISOString();
  const multipliers: Record<string, number> = {};

  for (const [domain, stats] of statsMap.entries()) {
    const multiplier = computeReputationMultiplier(stats);
    multipliers[domain] = multiplier;
  }

  registerDynamicSourceMultipliers(multipliers);

  if (!d1Config || statsMap.size === 0) {
    return { statsMap, multipliers, syncedToD1: 0 };
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${d1Config.accountId}/d1/database/${d1Config.databaseId}/query`;
  let syncedCount = 0;

  for (const [domain, stats] of statsMap.entries()) {
    const multiplier = multipliers[domain] ?? 1.0;
    const sql = `INSERT INTO source_reputation (
      domain, source_name, total_items_ingested, accepted_items_count,
      scoop_count, corroboration_count, reputation_multiplier, last_evaluated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(domain) DO UPDATE SET
      total_items_ingested = source_reputation.total_items_ingested + excluded.total_items_ingested,
      accepted_items_count = source_reputation.accepted_items_count + excluded.accepted_items_count,
      scoop_count = source_reputation.scoop_count + excluded.scoop_count,
      corroboration_count = source_reputation.corroboration_count + excluded.corroboration_count,
      reputation_multiplier = excluded.reputation_multiplier,
      last_evaluated_at = excluded.last_evaluated_at;`;

    const params = [
      domain,
      stats.sourceName,
      stats.totalIngested,
      stats.acceptedCount,
      stats.scoopCount,
      stats.corroborationCount,
      multiplier,
      now
    ];

    try {
      const res = await fetchFn(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${d1Config.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sql, params })
      });
      if (res.ok) syncedCount++;
    } catch {
      // Non-fatal if D1 is offline
    }
  }

  return { statsMap, multipliers, syncedToD1: syncedCount };
}

// Fowler Half-Open Circuit Breaker & Conditional Scraping Re-exports
export type {
  FowlerCircuitState,
  FeedCircuitRecord
} from './fowlerCircuitBreaker.js';

export {
  FOWLER_FAILURE_THRESHOLD,
  FOWLER_COOLDOWN_MS,
  getFowlerCircuitStatus,
  recordFowlerSuccess,
  recordFowlerFailure,
  getConditionalScrapeHeaders,
  getQuarantinedFeedRecords,
  resetFowlerCircuitBreakers,
  fetchFeedWithFowlerBreaker
} from './fowlerCircuitBreaker.js';



