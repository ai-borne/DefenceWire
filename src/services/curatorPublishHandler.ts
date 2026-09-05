/**
 * Curator One-Push "Go Live" Publish Handler for DefenceWire.in
 * Edge-agnostic core behind functions/api/curator/publish.ts.
 * Replaces the old client-side per-cluster override loop
 * (CuratorSyncService.publishCuratedSnapshot) with a single authenticated
 * server-side action that (a) upserts one curator_overrides row per changed
 * cluster, (b) writes the merged snapshot to the NEWS_LIVE KV namespace so
 * functions/data/news.json.ts serves it instantly, (c) records a
 * published_snapshots row for the rollback kill-switch, pruned to the last
 * N rows, and (d) purges the news feed edge cache URL.
 * Hard limit: <= 300 LOC.
 */

import { StoryCluster, StorySourceItem } from '../types/news.js';
import { EDGE_CACHE_URLS } from '../seo/edgeCache.js';
import { verifySessionCookie } from './curatorAuthHandler.js';
import { upsertOverride, CuratorOverrideDependencies } from './curatorOverrideHandler.js';

const MAX_RETAINED_SNAPSHOTS = 20;
const LIVE_SNAPSHOT_KEY = 'live_snapshot';

export interface CuratorPublishPayload {
  clusters: StoryCluster[];
  river: StorySourceItem[];
  deletedClusterIds?: string[];
}

export interface CuratorPublishResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface CuratorPublishDependencies extends CuratorOverrideDependencies {
  kvPut: (key: string, value: string) => Promise<void>;
  insertSnapshot: (snapshotJson: string, publishedAt: string, curatorEmail: string) => Promise<void>;
  pruneSnapshots: (keep: number) => Promise<void>;
  purgeCache?: (urls: string[]) => Promise<{ success: boolean; error?: string }>;
}

/**
 * Publishes a curated snapshot live: upserts D1 overrides, writes the live
 * KV snapshot, records publish history, and purges the edge cache.
 */
export async function handleCuratorPublish(
  body: CuratorPublishPayload,
  cookieHeader: string | null,
  deps: CuratorPublishDependencies,
  secret?: string,
  curatorEmail: string = 'curator@institutional.internal'
): Promise<CuratorPublishResult> {
  const isAuth = deps.verifyAuth
    ? await deps.verifyAuth(cookieHeader)
    : await verifySessionCookie(cookieHeader, secret);

  if (!isAuth) {
    return { success: false, error: 'Unauthorized: Valid curator session required.' };
  }

  if (!Array.isArray(body?.clusters) || !Array.isArray(body?.river)) {
    return { success: false, error: 'Invalid publish payload: clusters and river arrays are required.' };
  }

  try {
    const changed = body.clusters.filter((c) => c.isEditorPromoted || c.isLeadStory || c.isIgnored);
    for (const cluster of changed) {
      const overrideType = cluster.isIgnored ? 'ignore' : cluster.isEditorPromoted ? 'promote' : 'headline';
      await upsertOverride(
        deps,
        cluster.id,
        overrideType,
        {
          headline: cluster.synthesizedHeadline,
          isLeadStory: cluster.isLeadStory,
          isEditorPromoted: cluster.isEditorPromoted,
          isIgnored: cluster.isIgnored,
          ssbIntel: cluster.ssbIntel
        },
        curatorEmail
      );
    }

    // Tombstones: deleted clusters are already excluded from body.clusters
    // (NewsViewModel.getAllClusters(true) drops them), so they're carried
    // separately here — this is the only write path for a 'delete'
    // override_type row, which crawler/curatorOverrideSync.ts then treats
    // as a permanent exclusion, surviving future crawl regenerations.
    const deletedIds = Array.isArray(body.deletedClusterIds) ? body.deletedClusterIds : [];
    for (const id of deletedIds) {
      await upsertOverride(deps, id, 'delete', { deletedAt: new Date().toISOString() }, curatorEmail);
    }

    const publishedAt = new Date().toISOString();
    const snapshotJson = JSON.stringify({ clusters: body.clusters, river: body.river });

    await deps.kvPut(LIVE_SNAPSHOT_KEY, snapshotJson);
    await deps.insertSnapshot(snapshotJson, publishedAt, curatorEmail);
    await deps.pruneSnapshots(MAX_RETAINED_SNAPSHOTS);

    let purgeWarning = '';
    if (deps.purgeCache) {
      const purgeResult = await deps.purgeCache([EDGE_CACHE_URLS.NEWS_FEED]);
      if (!purgeResult.success) {
        purgeWarning = ` (edge cache purge failed: ${purgeResult.error || 'unknown error'})`;
      }
    }

    return {
      success: true,
      message: `Published ${changed.length + deletedIds.length} curated overrides live.${purgeWarning}`
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
