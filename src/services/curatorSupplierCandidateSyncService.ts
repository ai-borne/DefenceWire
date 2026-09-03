/**
 * Client-side sync service for /api/curator/supplier-candidates.
 * Curator Desk's click-through review of the Phase 2.6 supplier growth
 * pipeline candidates. Mirrors curatorSyncService.ts's fetch conventions.
 * Hard limit: <= 300 LOC.
 */

import { SupplierCandidateRow } from './curatorSupplierCandidateHandler.js';

export interface SupplierCandidateReviewResult {
  success: boolean;
  error?: string;
}

function resolveEndpoint(path: string): string {
  if (typeof window !== 'undefined' && window.location?.origin && !window.location.origin.startsWith('null')) {
    return path;
  }
  return `http://localhost${path}`;
}

const CANDIDATES_API_BASE = '/api/curator/supplier-candidates';

export class CuratorSupplierCandidateSyncService {
  private fetchFn: typeof fetch;

  constructor(customFetch?: typeof fetch) {
    this.fetchFn = customFetch || (typeof window !== 'undefined' ? window.fetch.bind(window) : globalThis.fetch);
  }

  public async fetchPendingCandidates(): Promise<{ candidates: SupplierCandidateRow[]; error?: string }> {
    try {
      const response = await this.fetchFn(resolveEndpoint(CANDIDATES_API_BASE), {
        method: 'GET',
        headers: { Accept: 'application/json' },
        credentials: 'include'
      });
      const result = (await response.json()) as { success: boolean; data?: SupplierCandidateRow[]; error?: string };
      if (result.success) {
        return { candidates: result.data || [] };
      }
      return { candidates: [], error: result.error || 'Failed to load supplier candidates.' };
    } catch (err) {
      return { candidates: [], error: err instanceof Error ? err.message : 'Network error loading supplier candidates.' };
    }
  }

  public async reviewCandidate(id: string, action: 'approve' | 'reject'): Promise<SupplierCandidateReviewResult> {
    try {
      const response = await this.fetchFn(resolveEndpoint(CANDIDATES_API_BASE), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, action })
      });
      const result = (await response.json()) as { success: boolean; error?: string };
      return { success: result.success, error: result.error };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Network error submitting review.' };
    }
  }
}

export const defaultCuratorSupplierCandidateSyncService = new CuratorSupplierCandidateSyncService();
