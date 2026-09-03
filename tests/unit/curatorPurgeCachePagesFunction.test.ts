/**
 * Unit Tests for Cloudflare Pages Function: /api/curator/purge-cache
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it, vi } from 'vitest';
import { onRequestPost } from '../../functions/api/curator/purge-cache.js';
import { createSessionCookie } from '../../src/services/curatorAuthHandler.js';
import { DEFAULT_PURGE_TAGS } from '../../src/services/curatorPurgeCacheHandler.js';

describe('Pages Function: /api/curator/purge-cache', () => {
  const secret = 'curator-test-secret-2026';

  it('rejects unauthenticated requests with HTTP 401', async () => {
    const request = new Request('https://www.defencewire.in/api/curator/purge-cache', {
      method: 'POST'
    });

    const response = await onRequestPost({
      request,
      env: {
        CURATOR_SESSION_SECRET: secret,
        CLOUDFLARE_ZONE_ID: 'zone-123',
        CLOUDFLARE_API_TOKEN: 'token-456'
      }
    });

    expect(response.status).toBe(401);
    const body = await response.json() as { success: boolean; error?: string };
    expect(body.success).toBe(false);
    expect(body.error).toContain('Unauthorized');
  });

  it('handles authenticated requests and purges edge cache tags', async () => {
    const cookie = await createSessionCookie(secret, 3600);
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true })
    } as unknown as Response);

    const originalFetch = globalThis.fetch;
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    try {
      const request = new Request('https://www.defencewire.in/api/curator/purge-cache', {
        method: 'POST',
        headers: { cookie }
      });

      const response = await onRequestPost({
        request,
        env: {
          CURATOR_SESSION_SECRET: secret,
          CLOUDFLARE_ZONE_ID: 'zone-123',
          CLOUDFLARE_API_TOKEN: 'token-456'
        }
      });

      expect(response.status).toBe(200);
      const body = await response.json() as { success: boolean; purgedTags: string[]; message?: string };
      expect(body.success).toBe(true);
      expect(body.purgedTags).toEqual(DEFAULT_PURGE_TAGS);
      expect(body.message).toContain('Successfully purged');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('returns HTTP 503 when Cloudflare credentials are not configured in context.env', async () => {
    const cookie = await createSessionCookie(secret, 3600);
    const request = new Request('https://www.defencewire.in/api/curator/purge-cache', {
      method: 'POST',
      headers: { cookie }
    });

    const response = await onRequestPost({
      request,
      env: {
        CURATOR_SESSION_SECRET: secret
      }
    });

    expect(response.status).toBe(503);
    const body = await response.json() as { success: boolean; error?: string };
    expect(body.success).toBe(false);
    expect(body.error).toContain('not configured');
  });
});
