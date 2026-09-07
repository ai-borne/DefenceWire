/**
 * Crawler Knowledge Graph Sync for DefenceWire.in (Phase 2)
 * Extracts semantic relationship triplets from story clusters and persists
 * nodes and directed edges to Cloudflare D1 via the REST API.
 * Non-fatal: failures or missing configuration never break the main crawl.
 * Hard limit: <= 300 LOC.
 */

import { StoryCluster } from '../src/types/news.js';
import { GraphSyncResult, TripletExtractionResult } from '../src/types/graph.js';
import {
  buildUpsertEdgeStatement,
  buildUpsertNodeStatement
} from '../src/services/graphQueryBuilder.js';
import { extractTripletsFromClusters } from './tripletExtractor.js';
import { D1RestConfig, executeD1Query } from './archiveSync.js';

export interface GraphSyncDeps {
  fetchFn?: typeof fetch;
}

export async function syncGraphToD1(
  extraction: TripletExtractionResult,
  config: D1RestConfig,
  fetchFn: typeof fetch
): Promise<{ syncedNodes: number; syncedEdges: number; failed: number }> {
  let syncedNodes = 0;
  let syncedEdges = 0;
  let failed = 0;

  // Upsert all discovered graph nodes
  for (const node of extraction.nodes) {
    const stmt = buildUpsertNodeStatement(node);
    try {
      const res = await executeD1Query(stmt, config, fetchFn);
      if (res.ok) {
        syncedNodes++;
      } else {
        failed++;
        console.error(`[GRAPH SYNC] Failed to upsert node ${node.id}: HTTP ${res.status}`);
      }
    } catch (err) {
      failed++;
      console.error(`[GRAPH SYNC] Error upserting node ${node.id}:`, err);
    }
  }

  // Upsert all extracted relational edges
  for (const edge of extraction.edges) {
    const stmt = buildUpsertEdgeStatement(edge);
    try {
      const res = await executeD1Query(stmt, config, fetchFn);
      if (res.ok) {
        syncedEdges++;
      } else {
        failed++;
        console.error(`[GRAPH SYNC] Failed to upsert edge ${edge.id}: HTTP ${res.status}`);
      }
    } catch (err) {
      failed++;
      console.error(`[GRAPH SYNC] Error upserting edge ${edge.id}:`, err);
    }
  }

  return { syncedNodes, syncedEdges, failed };
}

export async function runGraphExtractionAndSync(
  clusters: StoryCluster[],
  config: D1RestConfig | null,
  deps: GraphSyncDeps = {}
): Promise<GraphSyncResult> {
  const fetchFn = deps.fetchFn ?? globalThis.fetch;
  const extraction = extractTripletsFromClusters(clusters);

  if (!config) {
    console.log(
      `[GRAPH SYNC] D1 is not configured; running in-memory graph extraction (${extraction.nodes.length} nodes, ${extraction.edges.length} edges).`
    );
    return {
      syncedNodes: 0,
      syncedEdges: 0,
      failed: 0,
      extracted: extraction
    };
  }

  try {
    const { syncedNodes, syncedEdges, failed } = await syncGraphToD1(extraction, config, fetchFn);
    console.log(
      `[GRAPH SYNC] ${syncedNodes} nodes synced, ${syncedEdges} edges synced, ${failed} failed (${extraction.suppressedCount} stop-nodes suppressed).`
    );
    return {
      syncedNodes,
      syncedEdges,
      failed,
      extracted: extraction
    };
  } catch (err) {
    console.error('[GRAPH SYNC] Unexpected failure in graph sync pipeline:', err);
    return {
      syncedNodes: 0,
      syncedEdges: 0,
      failed: 1,
      extracted: extraction
    };
  }
}
