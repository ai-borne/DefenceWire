/**
 * Unit Tests for Edge Supplier Directory Handler & /api/suppliers Pages Function.
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it, vi } from 'vitest';
import {
  handleSupplierDirectoryRequest,
  SupplierDbRow
} from '../../src/services/supplierDirectoryHandler.js';
import { onRequestGet } from '../../functions/api/suppliers/index.js';

const MOCK_ROW: SupplierDbRow = {
  id: 'bel',
  slug: 'bel',
  name: 'Bharat Electronics Limited',
  tier: 'dpsu',
  hq_city: 'Bengaluru',
  hq_state: 'Karnataka',
  corridor: 'Bengaluru',
  website: 'https://bel-india.in',
  description: 'Defence electronics DPSU.',
  srijan_id: null,
  idex_winner: 0,
  is_listed: 1,
  stock_symbol: 'BEL'
};

describe('Supplier Directory Handler', () => {
  it('returns mapped suppliers with no filters applied', async () => {
    const mockDb = { querySuppliers: async () => [MOCK_ROW] };
    const res = await handleSupplierDirectoryRequest({}, mockDb);

    expect(res.error).toBeUndefined();
    expect(res.suppliers).toHaveLength(1);
    expect(res.suppliers[0]!.name).toBe('Bharat Electronics Limited');
    expect(res.suppliers[0]!.isListed).toBe(true);
    expect(res.suppliers[0]!.idexWinner).toBe(false);
  });

  it('ignores an invalid tier/corridor value rather than passing it through to the query', async () => {
    const querySuppliers = vi.fn().mockResolvedValue([MOCK_ROW]);
    const mockDb = { querySuppliers };

    await handleSupplierDirectoryRequest({ tier: 'not-a-real-tier', corridor: 'Mars' }, mockDb);

    expect(querySuppliers).toHaveBeenCalledWith(
      expect.objectContaining({ tier: undefined, corridor: undefined })
    );
  });

  it('escapes LIKE wildcards in the search query before passing to the adapter', async () => {
    const querySuppliers = vi.fn().mockResolvedValue([]);
    const mockDb = { querySuppliers };

    await handleSupplierDirectoryRequest({ query: '100%_test' }, mockDb);

    expect(querySuppliers).toHaveBeenCalledWith(
      expect.objectContaining({ likePattern: '%100\\%\\_test%' })
    );
  });

  it('returns a nextCursor when more rows exist beyond the requested limit', async () => {
    const rows = [MOCK_ROW, { ...MOCK_ROW, id: 'hal', slug: 'hal', name: 'HAL' }];
    const mockDb = { querySuppliers: async () => rows };

    const res = await handleSupplierDirectoryRequest({ limit: 1 }, mockDb);
    expect(res.suppliers).toHaveLength(1);
    expect(res.nextCursor).toBe('bel');
  });

  it('clamps an oversized limit to the maximum page size', async () => {
    const querySuppliers = vi.fn().mockResolvedValue([]);
    const mockDb = { querySuppliers };

    await handleSupplierDirectoryRequest({ limit: 9999 }, mockDb);

    expect(querySuppliers).toHaveBeenCalledWith(expect.objectContaining({ limit: 51 }));
  });

  it('handles database query errors gracefully without throwing', async () => {
    const mockDb = {
      querySuppliers: async () => {
        throw new Error('D1 connection timeout');
      }
    };

    const res = await handleSupplierDirectoryRequest({}, mockDb);
    expect(res.suppliers).toEqual([]);
    expect(res.error).toContain('D1 connection timeout');
  });
});

describe('Pages Function onRequestGet (/api/suppliers)', () => {
  it('returns 503 if D1 database binding is missing', async () => {
    const request = new Request('http://localhost:5176/api/suppliers');
    const response = await onRequestGet({ request, env: {} });

    expect(response.status).toBe(503);
    const data = await response.json();
    expect(data.error).toBe('Supplier directory database is not configured.');
  });

  it('returns 429 with Retry-After headers when the rate limit is exceeded', async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [] })
      })
    };

    let response;
    for (let i = 0; i < 121; i++) {
      const request = new Request('http://localhost:5176/api/suppliers', {
        headers: { 'CF-Connecting-IP': '203.0.113.99' }
      });
      response = await onRequestGet({ request, env: { DB: mockDb as unknown as any } });
    }

    expect(response!.status).toBe(429);
    expect(response!.headers.get('Retry-After')).toBeTruthy();
  });

  it('builds a filtered query and returns 200 with mapped supplier data', async () => {
    const mockBind = vi.fn().mockReturnThis();
    const mockAll = vi.fn().mockResolvedValue({ results: [MOCK_ROW] });
    const mockDb = {
      prepare: vi.fn().mockReturnValue({ bind: mockBind, all: mockAll })
    };

    const request = new Request('http://localhost:5176/api/suppliers?tier=dpsu&corridor=Bengaluru', {
      headers: { 'CF-Connecting-IP': '203.0.113.5' }
    });
    const response = await onRequestGet({ request, env: { DB: mockDb as unknown as any } });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.suppliers).toHaveLength(1);
    expect(data.suppliers[0].id).toBe('bel');
    expect(response.headers.get('Cache-Control')).toContain('s-maxage=3600');
  });

  it('returns 502 with no-store cache header when the D1 query throws', async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockRejectedValue(new Error('D1 timeout'))
      })
    };

    const request = new Request('http://localhost:5176/api/suppliers', {
      headers: { 'CF-Connecting-IP': '203.0.113.6' }
    });
    const response = await onRequestGet({ request, env: { DB: mockDb as unknown as any } });

    expect(response.status).toBe(502);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
});
