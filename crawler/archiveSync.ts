/**
 * Crawler Archive Sync for DefenceWire.in
 * Writes clusters that fell out of the live feed into the D1 archive, and
 * reconciles the archive against the live feed on every run, both via
 * Cloudflare's D1 REST API (GitHub Actions has no Workers binding, so this
 * is the write path available outside the edge runtime). Non-fatal: a
 * failed or unconfigured archive sync never breaks the main crawl.
 * Hard limit: <= 300 LOC.
 */

import { StoryCluster } from '../src/types/news.js';
import { findClustersToArchive } from '../src/archive/archiveDiff.js';
import { toArchivedStoryRow } from '../src/archive/archiveRow.js';
import { buildInsertArchivedStoryStatement, buildDeleteArchivedStoriesStatement, D1Statement } from '../src/archive/d1QueryBuilder.js';
import { putClusterJson, R2Config } from './r2ArchiveStore.js';

export interface D1RestConfig {
  accountId: string;
  databaseId: string;
  apiToken: string;
}

export interface ArchiveSyncDeps {
  fetchFn?: typeof fetch;
  now?: () => Date;
  putClusterJsonFn?: typeof putClusterJson;
}

export interface ArchiveSyncResult {
  archived: number;
  failed: number;
  r2Failed: number;
}

export interface ArchiveReconcileResult {
  removed: number;
  failed: number;
}

export function buildD1ConfigFromEnv(env: NodeJS.ProcessEnv | Record<string, string | undefined>): D1RestConfig | null {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = env.CLOUDFLARE_D1_DATABASE_ID;
  const apiToken = env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !databaseId || !apiToken) return null;
  return { accountId, databaseId, apiToken };
}

function d1RestEndpoint(config: D1RestConfig): string {
  return `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/d1/database/${config.databaseId}/query`;
}

async function executeD1Statement(
  statement: D1Statement,
  config: D1RestConfig,
  fetchFn: typeof fetch
): Promise<{ ok: boolean; status?: number }> {
  const response = await fetchFn(d1RestEndpoint(config), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(statement)
  });
  return { ok: response.ok, status: response.status };
}

export async function archivePoppedClusters(
  previousClusters: StoryCluster[],
  nextClusters: StoryCluster[],
  config: D1RestConfig | null,
  r2Config: R2Config | null,
  deps: ArchiveSyncDeps = {}
): Promise<ArchiveSyncResult> {
  if (!config) return { archived: 0, failed: 0, r2Failed: 0 };

  const popped = findClustersToArchive(previousClusters, nextClusters);
  console.log(
    `[ARCHIVE SYNC] previous=${previousClusters.length} next=${nextClusters.length} popped=${popped.length} ids=${popped.map((c) => c.id).join('|')}`
  );
  if (popped.length === 0) return { archived: 0, failed: 0, r2Failed: 0 };

  const fetchFn = deps.fetchFn ?? globalThis.fetch;
  const putClusterJsonFn = deps.putClusterJsonFn ?? putClusterJson;
  const archivedAt = (deps.now ?? (() => new Date()))().toISOString();

  let archived = 0;
  let failed = 0;
  let r2Failed = 0;

  for (const cluster of popped) {
    if (r2Config) {
      // R2 failures don't block the D1 insert this phase — D1 still carries
      // cluster_json as the fallback of record until Phase 3's cutover.
      const r2Result = await putClusterJsonFn(cluster.id, JSON.stringify(cluster), r2Config, fetchFn);
      if (!r2Result.ok) {
        r2Failed++;
        console.error(`[ARCHIVE SYNC] R2 blob write failed for ${cluster.id}: HTTP ${r2Result.status ?? 'network error'}`);
      }
    }

    const statement = buildInsertArchivedStoryStatement(toArchivedStoryRow(cluster, archivedAt));
    try {
      const { ok, status } = await executeD1Statement(statement, config, fetchFn);
      if (ok) {
        archived++;
      } else {
        failed++;
        console.error(`[ARCHIVE SYNC] D1 write failed for ${cluster.id}: HTTP ${status}`);
      }
    } catch (err) {
      failed++;
      console.error(`[ARCHIVE SYNC] D1 write error for ${cluster.id}:`, err);
    }
  }

  return { archived, failed, r2Failed };
}

/**
 * Removes archived rows for any cluster currently back in the live feed.
 * A cluster can drop out of the top-N/72h window on one run and re-enter
 * on a later one (its source article is still fresh) — without this, it
 * would stay permanently archived while also showing live, i.e. the same
 * story appearing in both Top Stories and the Archive at once.
 */
export async function reconcileArchiveWithLiveFeed(
  liveClusters: StoryCluster[],
  config: D1RestConfig | null,
  deps: ArchiveSyncDeps = {}
): Promise<ArchiveReconcileResult> {
  if (!config || liveClusters.length === 0) return { removed: 0, failed: 0 };

  const fetchFn = deps.fetchFn ?? globalThis.fetch;
  const ids = liveClusters.map((c) => c.id);
  console.log(`[ARCHIVE RECONCILE] live=${ids.length} ids=${ids.join('|')}`);
  const statement = buildDeleteArchivedStoriesStatement(ids);

  try {
    const { ok, status } = await executeD1Statement(statement, config, fetchFn);
    if (ok) return { removed: liveClusters.length, failed: 0 };
    console.error(`[ARCHIVE RECONCILE] D1 delete failed: HTTP ${status}`);
    return { removed: 0, failed: 1 };
  } catch (err) {
    console.error('[ARCHIVE RECONCILE] D1 delete error:', err);
    return { removed: 0, failed: 1 };
  }
}
