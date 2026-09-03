/**
 * Supplier Growth Signal Handler (Phase 2.7)
 * Pure, edge-agnostic handler counting program_suppliers rows promoted via
 * the Phase 2.6 candidate review pipeline in the last 30 days — powers the
 * Ecosystem coverage strip's "N new verified links" growth signal. Returns
 * zero (not an error) when nothing has been promoted yet — that's the
 * expected state until a human runs the review CLI at least once.
 * Hard limit: <= 300 LOC.
 */

export interface SupplierGrowthResult {
  newLinksCount: number;
  sinceDate: string;
  error?: string;
}

export interface SupplierGrowthDeps {
  countPromotionsSince: (sinceIso: string) => Promise<number>;
  now?: () => Date;
}

const GROWTH_WINDOW_DAYS = 30;

export async function handleSupplierGrowthRequest(deps: SupplierGrowthDeps): Promise<SupplierGrowthResult> {
  const now = deps.now ? deps.now() : new Date();
  const since = new Date(now.getTime() - GROWTH_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  try {
    const newLinksCount = await deps.countPromotionsSince(since);
    return { newLinksCount, sinceDate: since };
  } catch (err) {
    return {
      newLinksCount: 0,
      sinceDate: since,
      error: err instanceof Error ? err.message : 'Failed to count recent supplier link promotions.'
    };
  }
}
