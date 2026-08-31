/**
 * Client Archive Service for DefenceWire.in
 * Thin fetch wrapper around GET /api/archive/search, the read side of the
 * D1-backed story archive. Kept separate from ArchiveViewModel so the
 * network concern stays independently testable and swappable. Supports
 * both keyword search and the default cursor-paginated "browse" mode
 * (blank query) behind the same call shape.
 * Hard limit: <= 300 LOC.
 */

import { StoryCluster } from '../types/news.js';

export interface ArchiveSearchOutcome {
  stories: StoryCluster[];
  nextCursor: string | null;
  error?: string;
}

export async function searchArchive(
  query: string,
  cursor?: string | null,
  fetchFn: typeof fetch = fetch
): Promise<ArchiveSearchOutcome> {
  const beforeParam = cursor ? `&before=${encodeURIComponent(cursor)}` : '';

  try {
    const response = await fetchFn(`/api/archive/search?q=${encodeURIComponent(query)}${beforeParam}`);
    if (!response.ok) {
      return { stories: [], nextCursor: null, error: 'Archive search is temporarily unavailable.' };
    }
    const data = (await response.json()) as ArchiveSearchOutcome;
    return { stories: data.stories ?? [], nextCursor: data.nextCursor ?? null, error: data.error };
  } catch {
    return { stories: [], nextCursor: null, error: 'Archive search is temporarily unavailable.' };
  }
}
