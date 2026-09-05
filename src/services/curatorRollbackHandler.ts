/**
 * Curator Kill-Switch Rollback Handler for DefenceWire.in
 * Edge-agnostic core behind functions/api/curator/rollback.ts.
 * Reverts the live homepage to a previous published_snapshots row by
 * rewriting it into the NEWS_LIVE KV namespace, independent of whatever a
 * curator's browser currently holds. Defaults to the second-most-recent
 * row (the one before the last publish) unless a specific snapshotId is
 * given.
 * Hard limit: <= 300 LOC.
 */

import { EDGE_CACHE_URLS } from '../seo/edgeCache.js';
import { verifySessionCookie } from './curatorAuthHandler.js';

const LIVE_SNAPSHOT_KEY = 'live_snapshot';

export interface CuratorRollbackRequest {
  snapshotId?: number;
}

export interface CuratorRollbackResult {
  success: boolean;
  message?: string;
  error?: string;
  restoredSnapshotId?: number;
}

export interface PublishedSnapshotRow {
  id: number;
  snapshot_json: string;
  published_at: string;
}

export interface CuratorRollbackDependencies {
  runQuery: (sql: string, params: unknown[]) => Promise<PublishedSnapshotRow[]>;
  kvPut: (key: string, value: string) => Promise<void>;
  verifyAuth?: (cookieHeader: string | null) => Promise<boolean>;
  purgeCache?: (urls: string[]) => Promise<{ success: boolean; error?: string }>;
}

export async function handleCuratorRollback(
  body: CuratorRollbackRequest | null | undefined,
  cookieHeader: string | null,
  deps: CuratorRollbackDependencies,
  secret?: string
): Promise<CuratorRollbackResult> {
  const isAuth = deps.verifyAuth
    ? await deps.verifyAuth(cookieHeader)
    : await verifySessionCookie(cookieHeader, secret);

  if (!isAuth) {
    return { success: false, error: 'Unauthorized: Valid curator session required.' };
  }

  try {
    const rows = body?.snapshotId
      ? await deps.runQuery(
          'SELECT id, snapshot_json, published_at FROM published_snapshots WHERE id = ?',
          [body.snapshotId]
        )
      : await deps.runQuery(
          'SELECT id, snapshot_json, published_at FROM published_snapshots ORDER BY published_at DESC LIMIT 1 OFFSET 1',
          []
        );

    const target = rows[0];
    if (!target) {
      return { success: false, error: 'No prior published snapshot available to roll back to.' };
    }

    await deps.kvPut(LIVE_SNAPSHOT_KEY, target.snapshot_json);

    let purgeWarning = '';
    if (deps.purgeCache) {
      const purgeResult = await deps.purgeCache([EDGE_CACHE_URLS.NEWS_FEED]);
      if (!purgeResult.success) {
        purgeWarning = ` (edge cache purge failed: ${purgeResult.error || 'unknown error'})`;
      }
    }

    return {
      success: true,
      message: `Rolled back to snapshot published ${target.published_at}.${purgeWarning}`,
      restoredSnapshotId: target.id
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
