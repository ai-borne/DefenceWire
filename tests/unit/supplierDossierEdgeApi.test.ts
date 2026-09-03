/**
 * Unit Tests for Edge Supplier Dossier Handler & /api/suppliers/:slug Pages Function.
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it, vi } from 'vitest';
import { handleSupplierDossierRequest } from '../../src/services/supplierDossierHandler.js';
import { SupplierDbRow } from '../../src/services/supplierDirectoryHandler.js';
import { onRequestGet } from '../../functions/api/suppliers/[slug].js';

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

describe('Supplier Dossier Handler', () => {
  it('returns empty result with error for missing slug', async () => {
    const mockDb = {
      querySupplier: async () => null,
      queryCapabilities: async () => [],
      queryLinkedPrograms: async () => []
    };

    const res = await handleSupplierDossierRequest('', mockDb);
    expect(res.supplier).toBeNull();
    expect(res.error).toBe('Supplier slug is required.');
  });

  it('returns 404-equivalent error when the supplier does not exist', async () => {
    const mockDb = {
      querySupplier: async () => null,
      queryCapabilities: async () => [],
      queryLinkedPrograms: async () => []
    };

    const res = await handleSupplierDossierRequest('unknown-supplier', mockDb);
    expect(res.supplier).toBeNull();
    expect(res.error).toBe('Supplier not found.');
  });

  it('assembles the full dossier from supplier, capability and linked-program rows', async () => {
    const mockDb = {
      querySupplier: async (slug: string) => (slug === 'bel' ? MOCK_ROW : null),
      queryCapabilities: async () => [
        { supplier_id: 'bel', capability_domain: 'Radar & RF', certifications: '["CEMILAC","DGAQA"]' }
      ],
      queryLinkedPrograms: async () => [
        {
          program_id: 'tejas-mk1a',
          subsystem_name: 'Uttam AESA Radar',
          supplier_id: 'bel',
          tier: 'dpsu',
          indigenisation_status: 'in_house'
        }
      ]
    };

    const res = await handleSupplierDossierRequest('bel', mockDb);
    expect(res.error).toBeUndefined();
    expect(res.supplier?.name).toBe('Bharat Electronics Limited');
    expect(res.supplier?.capabilities).toEqual([
      { capabilityDomain: 'Radar & RF', certifications: ['CEMILAC', 'DGAQA'] }
    ]);
    expect(res.supplier?.linkedPrograms).toEqual([
      { programId: 'tejas-mk1a', subsystemName: 'Uttam AESA Radar', tier: 'dpsu', indigenisationStatus: 'in_house' }
    ]);
  });

  it('falls back to an empty certifications array when JSON is malformed rather than throwing', async () => {
    const mockDb = {
      querySupplier: async () => MOCK_ROW,
      queryCapabilities: async () => [
        { supplier_id: 'bel', capability_domain: 'Radar & RF', certifications: 'not-json' }
      ],
      queryLinkedPrograms: async () => []
    };

    const res = await handleSupplierDossierRequest('bel', mockDb);
    expect(res.supplier?.capabilities[0]?.certifications).toEqual([]);
  });

  it('handles database query errors gracefully without throwing', async () => {
    const mockDb = {
      querySupplier: async () => {
        throw new Error('D1 connection timeout');
      },
      queryCapabilities: async () => [],
      queryLinkedPrograms: async () => []
    };

    const res = await handleSupplierDossierRequest('bel', mockDb);
    expect(res.supplier).toBeNull();
    expect(res.error).toContain('D1 connection timeout');
  });
});

describe('Pages Function onRequestGet (/api/suppliers/:slug)', () => {
  it('returns 503 if D1 database binding is missing', async () => {
    const request = new Request('http://localhost:5176/api/suppliers/bel');
    const response = await onRequestGet({ request, params: { slug: 'bel' }, env: {} });

    expect(response.status).toBe(503);
    const data = await response.json();
    expect(data.error).toBe('Supplier dossier database is not configured.');
  });

  it('returns 429 with Retry-After headers when the rate limit is exceeded', async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null),
        all: vi.fn().mockResolvedValue({ results: [] })
      })
    };

    let response;
    for (let i = 0; i < 121; i++) {
      const request = new Request('http://localhost:5176/api/suppliers/bel', {
        headers: { 'CF-Connecting-IP': '203.0.113.100' }
      });
      response = await onRequestGet({ request, params: { slug: 'bel' }, env: { DB: mockDb as unknown as any } });
    }

    expect(response!.status).toBe(429);
    expect(response!.headers.get('Retry-After')).toBeTruthy();
  });

  it('returns 404 when the supplier is not found', async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null),
        all: vi.fn().mockResolvedValue({ results: [] })
      })
    };

    const request = new Request('http://localhost:5176/api/suppliers/unknown', {
      headers: { 'CF-Connecting-IP': '203.0.113.7' }
    });
    const response = await onRequestGet({ request, params: { slug: 'unknown' }, env: { DB: mockDb as unknown as any } });

    expect(response.status).toBe(404);
  });

  it('returns 200 with full dossier data and cache headers on success', async () => {
    const mockDb = {
      prepare: vi.fn().mockImplementation((sql: string) => {
        if (sql.includes('FROM suppliers')) {
          return { bind: vi.fn().mockReturnValue({ first: vi.fn().mockResolvedValue(MOCK_ROW) }) };
        }
        if (sql.includes('supplier_capabilities')) {
          return {
            bind: vi.fn().mockReturnValue({
              all: vi.fn().mockResolvedValue({
                results: [{ supplier_id: 'bel', capability_domain: 'Radar & RF', certifications: '[]' }]
              })
            })
          };
        }
        return {
          bind: vi.fn().mockReturnValue({
            all: vi.fn().mockResolvedValue({
              results: [
                {
                  program_id: 'tejas-mk1a',
                  subsystem_name: 'Uttam AESA Radar',
                  supplier_id: 'bel',
                  tier: 'dpsu',
                  indigenisation_status: 'in_house'
                }
              ]
            })
          })
        };
      })
    };

    const request = new Request('http://localhost:5176/api/suppliers/bel', {
      headers: { 'CF-Connecting-IP': '203.0.113.8' }
    });
    const response = await onRequestGet({ request, params: { slug: 'bel' }, env: { DB: mockDb as unknown as any } });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.supplier.name).toBe('Bharat Electronics Limited');
    expect(data.supplier.linkedPrograms).toHaveLength(1);
    expect(response.headers.get('Cache-Control')).toContain('s-maxage=3600');
  });
});
