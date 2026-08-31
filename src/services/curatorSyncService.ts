/**
 * Worldwide Curator Cloudflare Edge Sync Service for DefenceWire.in
 * Persists curated intelligence overrides directly to Cloudflare D1 via authenticated edge endpoints.
 * Hard limit: <= 300 LOC.
 */

import { StoryCluster, StorySourceItem } from '../types/news.js';

export interface CuratorSyncPayload {
  clusters: StoryCluster[];
  river: StorySourceItem[];
}

export interface CuratorSyncResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface ActiveOverride {
  id: string;
  override_type: string;
  payload_json: string;
  updated_at: string;
}

function resolveEndpoint(path: string): string {
  if (typeof window !== 'undefined' && window.location?.origin && !window.location.origin.startsWith('null')) {
    return path;
  }
  return `http://localhost${path}`;
}

const OVERRIDES_API_BASE = '/api/curator/overrides';

export class CuratorSyncService {
  private fetchFn: typeof fetch;

  constructor(customFetch?: typeof fetch) {
    this.fetchFn = customFetch || (typeof window !== 'undefined' ? window.fetch.bind(window) : globalThis.fetch);
  }

  /**
   * Fetches all active overrides stored in Cloudflare D1.
   */
  public async fetchActiveOverrides(): Promise<ActiveOverride[]> {
    try {
      const response = await this.fetchFn(resolveEndpoint(OVERRIDES_API_BASE), {
        method: 'GET',
        headers: { Accept: 'application/json' }
      });
      if (response.ok) {
        const result = (await response.json()) as { success: boolean; data?: ActiveOverride[] };
        return result.data || [];
      }
    } catch {
      // Offline fallback
    }
    return [];
  }

  /**
   * Persists an individual cluster override to Cloudflare D1.
   */
  public async saveOverride(
    id: string,
    overrideType: 'promote' | 'demote' | 'headline' | 'ssb' | 'ignore',
    payload: Record<string, unknown>
  ): Promise<CuratorSyncResult> {
    try {
      const response = await this.fetchFn(resolveEndpoint(OVERRIDES_API_BASE), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, overrideType, payload })
      });

      if (response.ok) {
        const resData = (await response.json()) as { success: boolean };
        if (resData.success) {
          return { success: true, message: 'Override saved to Cloudflare D1' };
        }
      }

      if (response.status === 401) {
        return { success: false, error: 'Unauthorized: Session expired or invalid.' };
      }

      const errText = await response.text();
      return { success: false, error: `D1 sync error (${response.status}): ${errText}` };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }

  /**
   * Deletes a curator override from Cloudflare D1.
   */
  public async deleteOverride(id: string): Promise<CuratorSyncResult> {
    try {
      const response = await this.fetchFn(resolveEndpoint(`${OVERRIDES_API_BASE}?id=${encodeURIComponent(id)}`), {
        method: 'DELETE'
      });

      if (response.ok) {
        return { success: true, message: 'Override removed from Cloudflare D1' };
      }

      if (response.status === 401) {
        return { success: false, error: 'Unauthorized: Session expired.' };
      }

      return { success: false, error: `D1 delete error (${response.status})` };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }

  /**
   * Synchronizes all active cluster overrides in batch.
   */
  public async publishCuratedSnapshot(payload: CuratorSyncPayload): Promise<CuratorSyncResult> {
    try {
      let savedCount = 0;
      const promoted = payload.clusters.filter((c) => c.isEditorPromoted || c.isLeadStory || c.isIgnored);

      for (const cluster of promoted) {
        const type = cluster.isIgnored ? 'ignore' : cluster.isEditorPromoted ? 'promote' : 'headline';
        const res = await this.saveOverride(cluster.id, type, {
          headline: cluster.synthesizedHeadline,
          isLeadStory: cluster.isLeadStory,
          isEditorPromoted: cluster.isEditorPromoted,
          isIgnored: cluster.isIgnored,
          ssbIntel: cluster.ssbIntel
        });
        if (res.success) savedCount++;
      }

      return {
        success: true,
        message: `Synced ${savedCount} curated overrides to Cloudflare D1.`
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }
}

export const defaultCuratorSyncService = new CuratorSyncService();
