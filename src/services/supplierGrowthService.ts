/**
 * Client-side fetch wrapper for GET /api/suppliers/growth (Phase 2.7).
 * Fire-and-forget: the coverage strip renders synchronously without this
 * data and patches the growth signal in once it resolves, so a slow or
 * failed request never blocks or breaks the strip.
 * Hard limit: <= 300 LOC.
 */

export interface SupplierGrowthResponse {
  newLinksCount: number;
  sinceDate: string;
  error?: string;
}

export async function fetchSupplierGrowth(
  fetchFn: typeof fetch = globalThis.fetch
): Promise<SupplierGrowthResponse | null> {
  try {
    const res = await fetchFn('/api/suppliers/growth', { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = (await res.json()) as SupplierGrowthResponse;
    if (typeof data.newLinksCount !== 'number' || data.error) return null;
    return data;
  } catch {
    return null;
  }
}
