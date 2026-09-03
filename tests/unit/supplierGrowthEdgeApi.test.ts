/**
 * Unit Tests for the /api/suppliers/growth Pages Function (Phase 2.7).
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it, vi } from 'vitest';
import { onRequestGet } from '../../functions/api/suppliers/growth.js';

describe('Pages Function onRequestGet (/api/suppliers/growth)', () => {
  it('returns 503 if the D1 database binding is missing', async () => {
    const request = new Request('http://localhost:5176/api/suppliers/growth');
    const response = await onRequestGet({ request, env: {} });

    expect(response.status).toBe(503);
    const data = await response.json();
    expect(data.newLinksCount).toBe(0);
    expect(data.error).toBe('Supplier database is not configured.');
  });

  it('returns the promoted-link count from D1 with cache headers on success', async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ cnt: 4 })
      })
    };
    const request = new Request('http://localhost:5176/api/suppliers/growth');
    const response = await onRequestGet({ request, env: { DB: mockDb as never } });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.newLinksCount).toBe(4);
    expect(data.error).toBeUndefined();
    expect(response.headers.get('Cache-Control')).toContain('s-maxage=3600');
  });

  it('returns 429 when the rate limit is exceeded', async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ cnt: 0 })
      })
    };
    const request = new Request('http://localhost:5176/api/suppliers/growth', {
      headers: { 'CF-Connecting-IP': '203.0.113.9' }
    });

    let lastResponse: Response | null = null;
    for (let i = 0; i < 121; i++) {
      lastResponse = await onRequestGet({ request, env: { DB: mockDb as never } });
    }

    expect(lastResponse!.status).toBe(429);
  });
});
