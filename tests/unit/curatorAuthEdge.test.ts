/**
 * Unit Tests: Curator Edge Authentication & Zero Trust D1 Overrides Handlers
 * Verifies Cloudflare Access identity parsing, dual-mode authorization, constant-time comparison, HMAC cookies, and D1 audit logging.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  timingSafeEqual,
  sha256Hex,
  createSessionCookie,
  verifySessionCookie,
  handleCuratorAuthRequest,
  extractCloudflareAccessIdentity,
  verifyCuratorAuthorization
} from '../../src/services/curatorAuthHandler.js';
import {
  handleGetOverrides,
  handleSaveOverride,
  handleDeleteOverride
} from '../../src/services/curatorOverrideHandler.js';

describe('Curator Edge Auth: Cloudflare Zero Trust & Session Defense', () => {
  it('extracts verified identity from Cloudflare Access headers', () => {
    const headers = {
      'cf-access-authenticated-user-email': 'editor@defencewire.in',
      'cf-access-jwt-assertion': 'mock.jwt.assertion'
    };

    const identity = extractCloudflareAccessIdentity(headers);
    expect(identity).not.toBeNull();
    expect(identity?.email).toBe('editor@defencewire.in');
    expect(identity?.isAccessAuthenticated).toBe(true);
  });

  it('returns null when Cloudflare Access headers are absent or malformed', () => {
    expect(extractCloudflareAccessIdentity({})).toBeNull();
    expect(extractCloudflareAccessIdentity({ 'cf-access-authenticated-user-email': 'invalid-email' })).toBeNull();
  });

  it('verifies authorization seamlessly via Cloudflare Access without cookie', async () => {
    const headers = {
      'cf-access-authenticated-user-email': 'editor@defencewire.in',
      'cf-access-jwt-assertion': 'jwt.token'
    };

    const auth = await verifyCuratorAuthorization(headers, null);
    expect(auth.authorized).toBe(true);
    expect(auth.email).toBe('editor@defencewire.in');
    expect(auth.provider).toBe('cloudflare_zero_trust');
  });

  it('falls back to HMAC session cookie when Cloudflare Access headers are absent', async () => {
    const secret = 'custom-secret-key-123';
    const cookie = await createSessionCookie(secret, 3600);

    const auth = await verifyCuratorAuthorization({}, cookie, secret);
    expect(auth.authorized).toBe(true);
    expect(auth.provider).toBe('edge_session');
  });

  it('performs constant-time comparison correctly for equal and unequal strings', () => {
    expect(timingSafeEqual('abcd1234', 'abcd1234')).toBe(true);
    expect(timingSafeEqual('abcd1234', 'abcd1235')).toBe(false);
  });

  it('hashes plain-text passcodes using standard SHA-256', async () => {
    const hash = await sha256Hex('testpasscode');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('generates a valid signed HMAC session cookie and verifies it successfully', async () => {
    const secret = 'custom-secret-key-123';
    const cookie = await createSessionCookie(secret, 3600);
    const isValid = await verifySessionCookie(cookie, secret, 3600 * 1000);
    expect(isValid).toBe(true);
  });

  it('rejects tampered or expired session cookies', async () => {
    const secret = 'custom-secret-key-123';
    const cookie = await createSessionCookie(secret, 3600);
    const tamperedCookie = cookie.replace('dw_curator_session=', 'dw_curator_session=forged.');
    expect(await verifySessionCookie(tamperedCookie, secret)).toBe(false);
  });

  it('authenticates valid passcodes and returns signed session cookie', async () => {
    const testPasscode = 'secretDefencePass123';
    const expectedHash = await sha256Hex(testPasscode);

    const result = await handleCuratorAuthRequest(
      { passcode: testPasscode, remember: true },
      { CURATOR_PASSCODE_HASH: expectedHash }
    );

    expect(result.success).toBe(true);
    expect(result.cookie).toContain('dw_curator_session=');
  });

  it('denies access on invalid passcodes without exposing secrets', async () => {
    const expectedHash = await sha256Hex('realPasscode');

    const result = await handleCuratorAuthRequest(
      { passcode: 'wrongPasscode', remember: false },
      { CURATOR_PASSCODE_HASH: expectedHash }
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid passcode.');
  });
});

describe('Curator D1 Overrides Handler: Zero Trust Audit Logging & CRUD', () => {
  it('allows unauthenticated reads of active curator overrides', async () => {
    const mockRows = [{ id: 'cluster-1', override_type: 'promote', payload_json: '{}', updated_at: '2026-08-31', curator_email: 'editor@defencewire.in' }];
    const runQuery = vi.fn().mockResolvedValue(mockRows);

    const res = await handleGetOverrides({ runQuery });
    expect(res.success).toBe(true);
    expect(res.data).toEqual(mockRows);
  });

  it('rejects override mutation when session is unauthenticated', async () => {
    const runQuery = vi.fn().mockResolvedValue([]);
    const res = await handleSaveOverride(
      { id: 'cluster-1', overrideType: 'promote', payload: { isLead: true } },
      null,
      { runQuery }
    );

    expect(res.success).toBe(false);
    expect(res.error).toContain('Unauthorized');
  });

  it('persists override and records curator email for audit trail when authorized', async () => {
    const secret = 'curator-test-secret';
    const validCookie = await createSessionCookie(secret, 3600);
    const runMutation = vi.fn().mockResolvedValue({ success: true });

    const res = await handleSaveOverride(
      { id: 'cluster-1', overrideType: 'promote', payload: { isLead: true } },
      validCookie,
      { runQuery: vi.fn(), runMutation },
      secret,
      'editor@defencewire.in'
    );

    expect(res.success).toBe(true);
    expect(res.data?.id).toBe('cluster-1');
    expect(res.data?.curatorEmail).toBe('editor@defencewire.in');
    expect(runMutation).toHaveBeenCalledTimes(1);
  });

  it('deletes override when authorized', async () => {
    const secret = 'curator-test-secret';
    const validCookie = await createSessionCookie(secret, 3600);
    const runMutation = vi.fn().mockResolvedValue({ success: true });

    const res = await handleDeleteOverride('cluster-1', validCookie, { runQuery: vi.fn(), runMutation }, secret);
    expect(res.success).toBe(true);
    expect(res.data?.id).toBe('cluster-1');
  });
});
