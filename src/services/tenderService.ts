/**
 * Client Tender Service for DefenceWire.in
 * Thin fetch wrapper around GET /api/tenders/search, mirroring
 * src/services/archiveService.ts's shape exactly so the network concern
 * stays independently testable/swappable from TendersViewModel.
 * Hard limit: <= 300 LOC.
 */

import { Tender, TenderFilters } from '../types/tenders.js';
import { fromTenderRow } from '../tenders/tenderRow.js';
import { TenderRow } from '../archive/d1QueryBuilder.js';

export interface TenderSearchOutcome {
  tenders: Tender[];
  nextCursor: string | null;
  error?: string;
}

interface TenderSearchApiResponse {
  tenders?: TenderRow[];
  nextCursor?: string | null;
  error?: string;
}

export async function searchTenders(
  filters: TenderFilters,
  cursor?: string | null,
  fetchFn: typeof fetch = fetch
): Promise<TenderSearchOutcome> {
  const params = new URLSearchParams();
  if (filters.query) params.set('q', filters.query);
  if (filters.status !== 'all') params.set('status', filters.status);
  if (filters.domain !== 'all') params.set('domain', filters.domain);
  if (filters.sourceScope !== 'all') params.set('sourceScope', filters.sourceScope);
  if (cursor) params.set('before', cursor);

  try {
    const response = await fetchFn(`/api/tenders/search?${params.toString()}`);
    if (!response.ok) {
      return { tenders: [], nextCursor: null, error: 'Tender search is temporarily unavailable.' };
    }
    const data = (await response.json()) as TenderSearchApiResponse;
    return {
      tenders: (data.tenders ?? []).map(fromTenderRow),
      nextCursor: data.nextCursor ?? null,
      error: data.error
    };
  } catch {
    return { tenders: [], nextCursor: null, error: 'Tender search is temporarily unavailable.' };
  }
}
