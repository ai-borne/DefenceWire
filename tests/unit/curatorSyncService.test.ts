/**
 * Unit Tests for CuratorSyncService (Cloudflare D1 Edge Sync)
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import { CuratorSyncService } from '../../src/services/curatorSyncService.js';

describe('CuratorSyncService (Cloudflare D1 Edge Sync)', () => {
  it('fetches active overrides from D1 endpoint', async () => {
    const mockRows = [
      { id: 'cluster-1', override_type: 'promote', payload_json: '{}', updated_at: '2026-08-31T00:00:00Z' }
    ];
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: mockRows })
    } as Response);

    const service = new CuratorSyncService(mockFetch as unknown as typeof fetch);
    const overrides = await service.fetchActiveOverrides();

    expect(overrides).toEqual(mockRows);
    expect(mockFetch).toHaveBeenCalledWith('/api/curator/overrides', expect.objectContaining({ method: 'GET' }));
  });

  it('safely handles sanitized overrides where curator_email is redacted', async () => {
    const mockSanitizedRows = [
      { id: 'cluster-2', override_type: 'ssb', payload_json: '{"ssbBrief":{"whyItMatters":"test"}}', updated_at: '2026-08-31T01:00:00Z' }
    ];
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: mockSanitizedRows })
    } as Response);

    const service = new CuratorSyncService(mockFetch as unknown as typeof fetch);
    const overrides = await service.fetchActiveOverrides();

    expect(overrides).toHaveLength(1);
    expect(overrides[0]?.id).toBe('cluster-2');
    expect((overrides[0] as any)?.curator_email).toBeUndefined();
  });

  it('saves an individual cluster override to Cloudflare D1', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true })
    } as Response);

    const service = new CuratorSyncService(mockFetch as unknown as typeof fetch);
    const result = await service.saveOverride('cluster-1', 'promote', { isLead: true });

    expect(result.success).toBe(true);
    expect(result.message).toContain('Cloudflare D1');
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/curator/overrides',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ id: 'cluster-1', overrideType: 'promote', payload: { isLead: true } })
      })
    );
  });

  it('deletes an override from Cloudflare D1', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true })
    } as Response);

    const service = new CuratorSyncService(mockFetch as unknown as typeof fetch);
    const result = await service.deleteOverride('cluster-1');

    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/curator/overrides?id=cluster-1',
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('handles 401 Unauthorized from edge endpoint gracefully', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized'
    } as Response);

    const service = new CuratorSyncService(mockFetch as unknown as typeof fetch);
    const result = await service.saveOverride('cluster-1', 'promote', {});

    expect(result.success).toBe(false);
    expect(result.error).toContain('Unauthorized');
  });
});
