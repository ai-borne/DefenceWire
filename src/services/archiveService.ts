/**
 * Client Archive Service for DefenceWire.in
 * Thin fetch wrapper around GET /api/archive/search, the read side of the
 * D1-backed story archive. Kept separate from ArchiveViewModel so the
 * network concern stays independently testable and swappable.
 * Hard limit: <= 300 LOC.
 */

import { StoryCluster } from '../types/news.js';

export interface ArchiveSearchOutcome {
  stories: StoryCluster[];
  error?: string;
}

export async function searchArchive(query: string, fetchFn: typeof fetch = fetch): Promise<ArchiveSearchOutcome> {
  try {
    const response = await fetchFn(`/api/archive/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      return { stories: [], error: 'Archive search is temporarily unavailable.' };
    }
    const data = (await response.json()) as ArchiveSearchOutcome;
    return { stories: data.stories ?? [], error: data.error };
  } catch {
    return { stories: [], error: 'Archive search is temporarily unavailable.' };
  }
}
