/**
 * Unit Tests for AuthService (Passcode Hashing, Verification & Session Persistence)
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService, DEFAULT_PASSCODE_HASH } from '../../src/services/authService.js';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
    authService = new AuthService();
  });

  it('initializes in unauthenticated state when no session stored', () => {
    expect(authService.isAuthenticated()).toBe(false);
  });

  it('computes consistent SHA-256 hash for passcodes', async () => {
    const hash1 = await authService.hashPasscode('defencewire2026');
    const hash2 = await authService.hashPasscode('defencewire2026');
    expect(hash1).toBe(DEFAULT_PASSCODE_HASH);
    expect(hash1).toBe(hash2);
  });

  it('verifies correct passcode and rejects invalid passcodes', async () => {
    const valid = await authService.verifyPasscode('defencewire2026');
    const invalid = await authService.verifyPasscode('wrong-passcode');
    const empty = await authService.verifyPasscode('');

    expect(valid).toBe(true);
    expect(invalid).toBe(false);
    expect(empty).toBe(false);
  });

  it('logs in successfully and notifies listeners', async () => {
    let notifiedAuth: boolean | null = null;
    authService.onAuthChange((isAuth) => {
      notifiedAuth = isAuth;
    });

    const success = await authService.login('defencewire2026', true);
    expect(success).toBe(true);
    expect(authService.isAuthenticated()).toBe(true);
    expect(notifiedAuth).toBe(true);

    // Verify session restoration on new instance
    const newService = new AuthService();
    expect(newService.isAuthenticated()).toBe(true);
  });

  it('rejects invalid login attempt and leaves unauthenticated', async () => {
    const success = await authService.login('invalid-code');
    expect(success).toBe(false);
    expect(authService.isAuthenticated()).toBe(false);
  });

  it('logs out, clears session and notifies listeners', async () => {
    await authService.login('defencewire2026', true);
    expect(authService.isAuthenticated()).toBe(true);

    let notifiedAuth: boolean | null = null;
    authService.onAuthChange((isAuth) => {
      notifiedAuth = isAuth;
    });

    authService.logout();
    expect(authService.isAuthenticated()).toBe(false);
    expect(notifiedAuth).toBe(false);

    // Verify session is cleared in storage
    const newService = new AuthService();
    expect(newService.isAuthenticated()).toBe(false);
  });
});
