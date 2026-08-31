/**
 * Unit Tests for AuthService (Serverless Edge Authentication & Zero Trust Identity)
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '../../src/services/authService.js';

describe('AuthService (Serverless Edge Authentication & Zero Trust)', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
  });

  it('initializes in unauthenticated state by default', () => {
    expect(authService.isAuthenticated()).toBe(false);
    expect(authService.getCuratorEmail()).toBeNull();
    expect(authService.getAuthProvider()).toBeNull();
  });

  it('authenticates successfully via edge /api/curator/auth endpoint', async () => {
    const mockFetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === '/api/curator/auth' && init?.method === 'POST') {
        const body = JSON.parse(init.body as string) as { passcode?: string };
        if (body.passcode === 'validpasscode') {
          return {
            ok: true,
            status: 200,
            json: async () => ({ success: true })
          } as Response;
        }
      }
      return { ok: false, status: 401, json: async () => ({ success: false }) } as Response;
    });

    const service = new AuthService(mockFetch as unknown as typeof fetch);
    let notifiedState: boolean | null = null;
    service.onAuthChange((isAuth) => {
      notifiedState = isAuth;
    });

    const success = await service.login('validpasscode', true);
    expect(success).toBe(true);
    expect(service.isAuthenticated()).toBe(true);
    expect(service.getAuthProvider()).toBe('edge_session');
    expect(notifiedState).toBe(true);
  });

  it('captures verified Cloudflare Zero Trust email on checkSession()', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        authenticated: true,
        userEmail: 'editor@defencewire.in',
        provider: 'cloudflare_zero_trust'
      })
    } as Response);

    const service = new AuthService(mockFetch as unknown as typeof fetch);
    const isAuth = await service.checkSession();

    expect(isAuth).toBe(true);
    expect(service.isAuthenticated()).toBe(true);
    expect(service.getCuratorEmail()).toBe('editor@defencewire.in');
    expect(service.getAuthProvider()).toBe('cloudflare_zero_trust');
  });

  it('logs out and resets identity attributes', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true })
    } as Response);

    const service = new AuthService(mockFetch as unknown as typeof fetch);
    service.setAuthenticated(true, 'editor@defencewire.in', 'cloudflare_zero_trust');
    expect(service.isAuthenticated()).toBe(true);
    expect(service.getCuratorEmail()).toBe('editor@defencewire.in');

    service.logout();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.getCuratorEmail()).toBeNull();
    expect(service.getAuthProvider()).toBeNull();
  });
});
