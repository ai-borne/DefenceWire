/**
 * Unit Tests for the client-side supplier growth fetch wrapper (Phase 2.7)
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it, vi } from 'vitest';
import { fetchSupplierGrowth } from '../../src/services/supplierGrowthService.js';

describe('fetchSupplierGrowth', () => {
  it('returns the parsed growth payload on success', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ newLinksCount: 2, sinceDate: '2026-08-01T00:00:00.000Z' })
    } as Response);
    const result = await fetchSupplierGrowth(fetchFn);
    expect(result).toEqual({ newLinksCount: 2, sinceDate: '2026-08-01T00:00:00.000Z' });
  });

  it('returns null on a non-ok response, an error payload, or a network failure', async () => {
    const notOk = vi.fn().mockResolvedValue({ ok: false } as Response);
    expect(await fetchSupplierGrowth(notOk)).toBeNull();

    const withError = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ newLinksCount: 0, sinceDate: '', error: 'not configured' })
    } as Response);
    expect(await fetchSupplierGrowth(withError)).toBeNull();

    const throws = vi.fn().mockRejectedValue(new Error('network down'));
    expect(await fetchSupplierGrowth(throws)).toBeNull();
  });
});
