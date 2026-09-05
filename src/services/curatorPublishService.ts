/**
 * Curator One-Push Publish & Rollback Client Service for DefenceWire.in
 * Talks to /api/curator/publish and /api/curator/rollback — the "go live"
 * and kill-switch actions behind EditorViewModel.publishToProduction() /
 * rollbackToPreviousPublish(). Replaces CuratorSyncService.publishCuratedSnapshot's
 * client-side per-cluster override loop with a single authenticated
 * server-side publish (see curatorPublishHandler.ts for what it now does).
 * Hard limit: <= 300 LOC.
 */

import { StoryCluster, StorySourceItem } from '../types/news.js';
import { CuratorSyncResult } from './curatorSyncService.js';

export interface CuratorPublishPayload {
  clusters: StoryCluster[];
  river: StorySourceItem[];
}

function resolveEndpoint(path: string): string {
  if (typeof window !== 'undefined' && window.location?.origin && !window.location.origin.startsWith('null')) {
    return path;
  }
  return `http://localhost${path}`;
}

const PUBLISH_API = '/api/curator/publish';
const ROLLBACK_API = '/api/curator/rollback';

export class CuratorPublishService {
  private fetchFn: typeof fetch;

  constructor(customFetch?: typeof fetch) {
    this.fetchFn = customFetch || (typeof window !== 'undefined' ? window.fetch.bind(window) : globalThis.fetch);
  }

  /**
   * Publishes a curated snapshot live via the server-side bulk publish endpoint.
   */
  public async publish(payload: CuratorPublishPayload): Promise<CuratorSyncResult> {
    try {
      const response = await this.fetchFn(resolveEndpoint(PUBLISH_API), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = (await response.json().catch(() => null)) as CuratorSyncResult | null;
      if (response.ok && data?.success) {
        return { success: true, message: data.message || 'Published live.' };
      }
      if (response.status === 401) {
        return { success: false, error: 'Unauthorized: Session expired or invalid.' };
      }
      return { success: false, error: data?.error || `Publish failed (${response.status})` };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }

  /**
   * Reverts the live homepage to a previous publish (default: the one before the last).
   */
  public async rollback(snapshotId?: number): Promise<CuratorSyncResult> {
    try {
      const response = await this.fetchFn(resolveEndpoint(ROLLBACK_API), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshotId ? { snapshotId } : {})
      });

      const data = (await response.json().catch(() => null)) as CuratorSyncResult | null;
      if (response.ok && data?.success) {
        return { success: true, message: data.message || 'Rolled back to previous publish.' };
      }
      if (response.status === 401) {
        return { success: false, error: 'Unauthorized: Session expired or invalid.' };
      }
      return { success: false, error: data?.error || `Rollback failed (${response.status})` };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }
}

export const defaultCuratorPublishService = new CuratorPublishService();
