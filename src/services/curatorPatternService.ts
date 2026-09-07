/**
 * Client Service for Curator Emergent Patterns (Phase 5)
 * Handles client-side HTTP communication with /api/curator/patterns.
 * Hard limit: <= 300 LOC.
 */

import {
  EmergentPattern,
  PatternListResponse,
  PatternQueryOptions,
  PatternReviewRequest,
  PatternReviewResult
} from '../types/patterns.js';

export class CuratorPatternService {
  private fetchFn: typeof fetch;

  constructor(fetchFn: typeof fetch = globalThis.fetch) {
    this.fetchFn = fetchFn;
  }

  public async listPatterns(options: PatternQueryOptions = {}): Promise<PatternListResponse> {
    const params = new URLSearchParams();
    if (options.status) params.set('status', options.status);
    if (options.limit) params.set('limit', String(options.limit));
    if (options.offset) params.set('offset', String(options.offset));

    const queryStr = params.toString();
    const url = `/api/curator/patterns${queryStr ? `?${queryStr}` : ''}`;

    try {
      const res = await this.fetchFn(url, {
        method: 'GET',
        headers: { Accept: 'application/json' }
      });

      if (!res.ok) {
        return {
          success: false,
          patterns: [],
          total: 0,
          error: `HTTP ${res.status}: ${res.statusText}`
        };
      }

      const body = (await res.json()) as { success: boolean; data?: EmergentPattern[]; error?: string };
      if (body.success && Array.isArray(body.data)) {
        return {
          success: true,
          patterns: body.data,
          total: body.data.length
        };
      }

      return {
        success: false,
        patterns: [],
        total: 0,
        error: body.error || 'Failed to list emergent patterns'
      };
    } catch (err) {
      return {
        success: false,
        patterns: [],
        total: 0,
        error: err instanceof Error ? err.message : 'Network error'
      };
    }
  }

  public async reviewPattern(request: PatternReviewRequest): Promise<PatternReviewResult> {
    try {
      const res = await this.fetchFn('/api/curator/patterns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(request)
      });

      if (!res.ok) {
        return {
          success: false,
          error: `HTTP ${res.status}: ${res.statusText}`
        };
      }

      const body = (await res.json()) as { success: boolean; data?: EmergentPattern; error?: string };
      if (body.success && body.data) {
        return {
          success: true,
          pattern: body.data
        };
      }

      return {
        success: false,
        error: body.error || 'Failed to review pattern'
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Network error'
      };
    }
  }
}

export const defaultCuratorPatternService = new CuratorPatternService();
