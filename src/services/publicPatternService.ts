/**
 * Public Emergent Pattern Service for DefenceWire.in (Phase 5 Display UI)
 * Fetches curator-approved emergent pattern hypotheses from edge API.
 * Features in-memory session caching and graceful offline degradation.
 * Hard limit: <= 300 LOC.
 */

import { EmergentPattern } from '../types/patterns.js';

let sessionPatternCache: EmergentPattern[] | null = null;

export interface FetchPatternsOptions {
  limit?: number;
  forceRefresh?: boolean;
}

/**
 * Fetches approved emergent patterns for the public reader UI.
 */
export async function fetchApprovedPatterns(
  options: FetchPatternsOptions = {},
  fetchFn: typeof fetch = globalThis.fetch
): Promise<EmergentPattern[]> {
  if (!options.forceRefresh && sessionPatternCache !== null) {
    return sessionPatternCache;
  }

  const limit = options.limit || 10;
  const url = `/api/patterns?limit=${encodeURIComponent(limit)}`;

  try {
    const res = await fetchFn(url, {
      method: 'GET',
      headers: { Accept: 'application/json' }
    });

    if (!res.ok) {
      return sessionPatternCache || [];
    }

    const data = (await res.json()) as { success?: boolean; patterns?: EmergentPattern[] };
    if (data && data.success && Array.isArray(data.patterns)) {
      sessionPatternCache = data.patterns;
      return sessionPatternCache;
    }

    return sessionPatternCache || [];
  } catch {
    // Graceful degradation on network failure or offline mode
    return sessionPatternCache || [];
  }
}

/**
 * Clears the in-memory session cache (useful for testing or manual refresh).
 */
export function clearPublicPatternCache(): void {
  sessionPatternCache = null;
}
