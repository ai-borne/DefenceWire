/**
 * Crawler Archive Sync for DefenceWire.in
 * Writes clusters that fell out of the live feed into the D1 archive via
 * Cloudflare's D1 REST API (GitHub Actions has no Workers binding, so this
 * is the write path available outside the edge runtime). Non-fatal: a
 * failed or unconfigured archive sync never breaks the main crawl.
 * Hard limit: <= 300 LOC.
 */

import { StoryCluster } from '../src/types/news.js';
import { findClustersToArchive } from '../src/archive/archiveDiff.js';
import { toArchivedStoryRow } from '../src/archive/archiveRow.js';
import { buildInsertArchivedStoryStatement } from '../src/archive/d1QueryBuilder.js';

export interface D1RestConfig {
  accountId: string;
  databaseId: string;
  apiToken: string;
}

export interface ArchiveSyncDeps {
  fetchFn?: typeof fetch;
  now?: () => Date;
}

export interface ArchiveSyncResult {
  archived: number;
  failed: number;
}

export function buildD1ConfigFromEnv(env: NodeJS.ProcessEnv | Record<string, string | undefined>): D1RestConfig | null {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = env.CLOUDFLARE_D1_DATABASE_ID;
  const apiToken = env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !databaseId || !apiToken) return null;
  return { accountId, databaseId, apiToken };
}

export async function archivePoppedClusters(
  previousClusters: StoryCluster[],
  nextClusters: StoryCluster[],
  config: D1RestConfig | null,
  deps: ArchiveSyncDeps = {}
): Promise<ArchiveSyncResult> {
  if (!config) return { archived: 0, failed: 0 };

  const popped = findClustersToArchive(previousClusters, nextClusters);
  if (popped.length === 0) return { archived: 0, failed: 0 };

  const fetchFn = deps.fetchFn ?? globalThis.fetch;
  const archivedAt = (deps.now ?? (() => new Date()))().toISOString();
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/d1/database/${config.databaseId}/query`;

  let archived = 0;
  let failed = 0;

  for (const cluster of popped) {
    const statement = buildInsertArchivedStoryStatement(toArchivedStoryRow(cluster, archivedAt));
    try {
      const response = await fetchFn(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(statement)
      });
      if (response.ok) {
        archived++;
      } else {
        failed++;
        console.error(`[ARCHIVE SYNC] D1 write failed for ${cluster.id}: HTTP ${response.status}`);
      }
    } catch (err) {
      failed++;
      console.error(`[ARCHIVE SYNC] D1 write error for ${cluster.id}:`, err);
    }
  }

  return { archived, failed };
}
