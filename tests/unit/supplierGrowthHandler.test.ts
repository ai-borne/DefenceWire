/**
 * Unit Tests for Supplier Growth Signal Handler (Phase 2.7)
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it, vi } from 'vitest';
import { handleSupplierGrowthRequest } from '../../src/services/supplierGrowthHandler.js';

describe('Supplier Growth Signal Handler', () => {
  it('reports zero, not an error, when nothing has been promoted yet', async () => {
    const countPromotionsSince = vi.fn().mockResolvedValue(0);
    const result = await handleSupplierGrowthRequest({ countPromotionsSince });
    expect(result).toEqual({ newLinksCount: 0, sinceDate: result.sinceDate });
    expect(result.error).toBeUndefined();
  });

  it('counts promotions in the trailing 30-day window from the given clock', async () => {
    const countPromotionsSince = vi.fn().mockResolvedValue(3);
    const now = () => new Date('2026-09-30T00:00:00.000Z');
    const result = await handleSupplierGrowthRequest({ countPromotionsSince, now });
    expect(result.newLinksCount).toBe(3);
    expect(result.sinceDate).toBe('2026-08-31T00:00:00.000Z');
    expect(countPromotionsSince).toHaveBeenCalledWith('2026-08-31T00:00:00.000Z');
  });

  it('fails soft (count 0, error surfaced) rather than throwing when the query fails', async () => {
    const countPromotionsSince = vi.fn().mockRejectedValue(new Error('D1 unavailable'));
    const result = await handleSupplierGrowthRequest({ countPromotionsSince });
    expect(result.newLinksCount).toBe(0);
    expect(result.error).toBe('D1 unavailable');
  });
});
