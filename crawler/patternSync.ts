/**
 * Crawler Emergent Pattern Sync for DefenceWire.in (Phase 5)
 * Detects dense subgraphs & spatiotemporal clustering across wire clusters,
 * synthesizes situational intelligence hypotheses, and persists them to Cloudflare D1.
 * Non-fatal: failures or missing configuration never break the main crawl.
 * Hard limit: <= 300 LOC.
 */

import { StoryCluster } from '../src/types/news.js';
import { PatternSyncResult } from '../src/types/patterns.js';
import { buildUpsertPatternStatement } from '../src/services/curatorPatternQueryBuilder.js';
import { detectEmergentPatterns, PatternDetectorOptions } from './patternDetector.js';
import { synthesizeEmergentPattern, PatternSynthesizerOptions } from './patternSynthesizer.js';
import { D1RestConfig, executeD1Query } from './archiveSync.js';

export interface PatternSyncDeps extends PatternDetectorOptions, PatternSynthesizerOptions {
  fetchFn?: typeof fetch;
}

export async function runPatternDetectionAndSync(
  clusters: StoryCluster[],
  config: D1RestConfig | null,
  deps: PatternSyncDeps = {}
): Promise<PatternSyncResult> {
  const fetchFn = deps.fetchFn ?? globalThis.fetch;
  const candidates = detectEmergentPatterns(clusters, deps);

  if (candidates.length === 0) {
    return { syncedPatterns: 0, failed: 0, candidates: [] };
  }

  let syncedPatterns = 0;
  let failed = 0;

  for (const candidate of candidates) {
    try {
      const pattern = await synthesizeEmergentPattern(candidate, {
        apiKey: deps.apiKey,
        fetchFn,
        now: deps.now,
        env: deps.env
      });

      if (!config) {
        continue;
      }

      const stmt = buildUpsertPatternStatement(pattern);
      const res = await executeD1Query(stmt, config, fetchFn);
      if (res.ok) {
        syncedPatterns++;
      } else {
        failed++;
        console.error(`[PATTERN SYNC] Failed to upsert pattern ${pattern.id}: HTTP ${res.status}`);
      }
    } catch (err) {
      failed++;
      console.error(`[PATTERN SYNC] Error processing pattern candidate ${candidate.id}:`, err);
    }
  }

  return {
    syncedPatterns,
    failed,
    candidates
  };
}
