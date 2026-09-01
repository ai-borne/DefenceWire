/**
 * Unit Tests: Curator Edge Authentication & Zero Trust D1 Overrides Handlers
 * Verifies cryptographic Cloudflare Access JWT verification, spoofing prevention, constant-time comparison, secret requirements, and epoch revocation.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import {
  timingSafeEqual,
  sha256Hex,
  createSessionCookie,
  verifySessionCookie,
  handleCuratorAuthRequest,
  extractCloudflareAccessIdentity,
  verifyCuratorAuthorization,
  verifyAccessJwtToken,
  sanitizeReturnUrl
} from '../../src/services/curatorAuthHandler.js';
import {
  handleGetOverrides,
  handleSaveOverride,
  handleDeleteOverride
} from '../../src/services/curatorOverrideHandler.js';

function toBase64Url(input: object | Uint8Array): string {
  const binary = input instanceof Uint8Array ? String.fromCharCode(...input) : JSON.stringify(input);
  return Buffer.from(binary, 'binary').toString('base64url');
}

describe('Curator Edge Auth: Cloudflare Zero Trust & Session Defense', () => {
  const testKid = 'test-key-2026';
  const testSecret = 'hardened-test-secret-2026';
  let privateKey: CryptoKey;
  let publicJwk: JsonWebKey & { kid?: string };
  let mockFetchJwks: typeof fetch;

  beforeAll(async () => {
    const keyPair = await globalThis.crypto.subtle.generateKey(
      { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
      true,
      ['sign', 'verify']
    );
    privateKey = keyPair.privateKey;
    const exported = await globalThis.crypto.subtle.exportKey('jwk', keyPair.publicKey);
    publicJwk = { ...exported, kid: testKid };
    mockFetchJwks = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/cdn-cgi/access/certs')) return { ok: true, status: 200, json: async () => ({ keys: [publicJwk] }) };
      return { ok: false, status: 404 };
    }) as unknown as typeof fetch;
  });

  async function createSignedJwt(email: string, expSec = 3600): Promise<string> {
    const [hB64, pB64] = [toBase64Url({ alg: 'RS256', typ: 'JWT', kid: testKid }), toBase64Url({ email, exp: Math.floor(Date.now() / 1000) + expSec })];
    const sig = await globalThis.crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, new TextEncoder().encode(`${hB64}.${pB64}`));
    return `${hB64}.${pB64}.${toBase64Url(new Uint8Array(sig))}`;
  }

  it('extracts presence of Cloudflare Access headers', () => {
    const headers = { 'cf-access-authenticated-user-email': 'editor@defencewire.in', 'cf-access-jwt-assertion': 'mock.jwt' };
    const identity = extractCloudflareAccessIdentity(headers);
    expect(identity).toEqual({ email: 'editor@defencewire.in', isAccessAuthenticated: true });
  });

  it('verifies valid cryptographic Cloudflare Access JWT assertions and rejects tampered ones', async () => {
    const validJwt = await createSignedJwt('editor@defencewire.in');
    const result = await verifyAccessJwtToken(validJwt, 'defencewire.cloudflareaccess.com', mockFetchJwks);
    expect(result?.email).toBe('editor@defencewire.in');

    const tampered = `${validJwt.slice(0, -5)}XXXXX`;
    expect(await verifyAccessJwtToken(tampered, 'defencewire.cloudflareaccess.com', mockFetchJwks)).toBeNull();
  });

  it('rejects spoofed email headers without valid JWT cryptographic assertion', async () => {
    const spoofed = { 'cf-access-authenticated-user-email': 'attacker@evil.com' };
    const auth = await verifyCuratorAuthorization(spoofed, null, testSecret, 'defencewire.cloudflareaccess.com', mockFetchJwks);
    expect(auth.authorized).toBe(false);
    expect(auth.provider).toBe('none');
  });

  it('verifies authorization via valid Cloudflare Access JWT header and CF_Authorization cookie', async () => {
    const validJwt = await createSignedJwt('curator@defencewire.in');
    const authHeader = await verifyCuratorAuthorization({ 'cf-access-jwt-assertion': validJwt }, null, testSecret, 'defencewire.cloudflareaccess.com', mockFetchJwks);
    expect(authHeader).toEqual({ authorized: true, email: 'curator@defencewire.in', provider: 'cloudflare_zero_trust' });

    const authCookie = await verifyCuratorAuthorization({}, `CF_Authorization=${validJwt}`, testSecret, 'defencewire.cloudflareaccess.com', mockFetchJwks);
    expect(authCookie).toEqual({ authorized: true, email: 'curator@defencewire.in', provider: 'cloudflare_zero_trust' });
  });

  it('falls back to HMAC session cookie when Cloudflare Access headers are absent', async () => {
    const cookie = await createSessionCookie(testSecret, 3600);
    const auth = await verifyCuratorAuthorization({}, cookie, testSecret);
    expect(auth.authorized).toBe(true);
    expect(auth.provider).toBe('edge_session');
  });

  it('performs zero-leak constant-time comparison across identical, mismatched, and varied-length strings', () => {
    expect(timingSafeEqual('abcd1234', 'abcd1234')).toBe(true);
    expect(timingSafeEqual('abcd1234', 'abcd1235')).toBe(false);
    expect(timingSafeEqual('short', 'muchlongerstring')).toBe(false);
    expect(timingSafeEqual('', '')).toBe(true);
    expect(timingSafeEqual('', 'a')).toBe(false);
    expect(timingSafeEqual(null as any, 'a')).toBe(false);
  });

  it('hashes plain-text passcodes using standard SHA-256', async () => {
    const hash = await sha256Hex('testpasscode');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('generates a valid v1 signed HMAC session cookie and verifies it successfully', async () => {
    const cookie = await createSessionCookie(testSecret, 3600);
    expect(cookie).toContain('dw_curator_session=v1.');
    expect(await verifySessionCookie(cookie, testSecret, 3600 * 1000)).toBe(true);
  });

  it('throws when createSessionCookie is called with empty or invalid secrets', async () => {
    await expect(createSessionCookie('')).rejects.toThrow('session secret is required');
    await expect(createSessionCookie(null as any)).rejects.toThrow('session secret is required');
  });

  it('verifies legacy unversioned tokens for zero-downtime backward compatibility', async () => {
    const timestamp = Date.now().toString();
    const encoder = new TextEncoder();
    const key = await globalThis.crypto.subtle.importKey('raw', encoder.encode(testSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = await globalThis.crypto.subtle.sign('HMAC', key, encoder.encode(timestamp));
    const hmacHex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
    const legacyCookie = `dw_curator_session=${timestamp}.${hmacHex}`;
    expect(await verifySessionCookie(legacyCookie, testSecret)).toBe(true);
  });

  it('supports zero-downtime secret rotation with comma-separated secrets', async () => {
    const oldSecret = 'old-secret-key-2025';
    const newSecret = 'new-secret-key-2026';
    const rotationSecretList = `${newSecret}, ${oldSecret}`;
    const oldCookie = await createSessionCookie(oldSecret, 3600);
    const newCookie = await createSessionCookie(newSecret, 3600);

    expect(await verifySessionCookie(oldCookie, rotationSecretList)).toBe(true);
    expect(await verifySessionCookie(newCookie, rotationSecretList)).toBe(true);
    expect(await verifySessionCookie(oldCookie, 'completely-unrelated-key')).toBe(false);
  });

  it('rejects tampered, expired, missing secret, or invalid format session cookies', async () => {
    const cookie = await createSessionCookie(testSecret, 3600);
    expect(await verifySessionCookie(cookie.replace('dw_curator_session=v1.', 'dw_curator_session=v1.forged.'), testSecret)).toBe(false);
    expect(await verifySessionCookie('dw_curator_session=invalidformat', testSecret)).toBe(false);
    expect(await verifySessionCookie('dw_curator_session=v99.1234.sig', testSecret)).toBe(false);
    expect(await verifySessionCookie(cookie, '')).toBe(false);
    expect(await verifySessionCookie(cookie, null)).toBe(false);
  });

  it('enforces instant session revocation via CURATOR_SESSION_EPOCH', async () => {
    const pastTimestamp = Date.now() - 5000;
    const encoder = new TextEncoder();
    const key = await globalThis.crypto.subtle.importKey('raw', encoder.encode(testSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = await globalThis.crypto.subtle.sign('HMAC', key, encoder.encode(pastTimestamp.toString()));
    const hmacHex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
    const oldSessionCookie = `dw_curator_session=v1.${pastTimestamp}.${hmacHex}`;

    // Valid without epoch
    expect(await verifySessionCookie(oldSessionCookie, testSecret)).toBe(true);

    // Revoked when epoch is set after session creation timestamp
    const revocationEpoch = Math.floor((Date.now() - 1000) / 1000); // in seconds
    expect(await verifySessionCookie(oldSessionCookie, testSecret, undefined, revocationEpoch)).toBe(false);

    // Fresh session issued after epoch passes
    const freshCookie = await createSessionCookie(testSecret, 3600);
    expect(await verifySessionCookie(freshCookie, testSecret, undefined, revocationEpoch)).toBe(true);
  });

  it('authenticates valid passcodes and fails closed on missing secrets or invalid passcode', async () => {
    const testPasscode = 'secretDefencePass123';
    const expectedHash = await sha256Hex(testPasscode);

    const validRes = await handleCuratorAuthRequest(
      { passcode: testPasscode, remember: true },
      { CURATOR_PASSCODE_HASH: expectedHash, CURATOR_SESSION_SECRET: testSecret }
    );
    expect(validRes.success).toBe(true);
    expect(validRes.cookie).toContain('dw_curator_session=v1.');

    // Fails closed if secrets are missing
    const noSecretRes = await handleCuratorAuthRequest({ passcode: testPasscode }, {});
    expect(noSecretRes.success).toBe(false);
    expect(noSecretRes.error).toContain('Server configuration error');

    // Denies wrong passcode
    const invalidRes = await handleCuratorAuthRequest(
      { passcode: 'wrongPasscode' },
      { CURATOR_PASSCODE_HASH: expectedHash, CURATOR_SESSION_SECRET: testSecret }
    );
    expect(invalidRes.success).toBe(false);
    expect(invalidRes.error).toBe('Invalid passcode. Access denied.');
  });
});

describe('Curator D1 Overrides Handler: Zero Trust Audit Logging & CRUD', () => {
  const secret = 'curator-test-secret';

  it('redacts curator_email from overrides on unauthenticated requests and preserves when authenticated', async () => {
    const mockRows = [{ id: 'cluster-1', override_type: 'promote', payload_json: '{}', updated_at: '2026-08-31', curator_email: 'editor@defencewire.in' }];
    const runQuery = vi.fn().mockResolvedValue(mockRows);

    const unauthRes = await handleGetOverrides({ runQuery });
    expect(unauthRes.success).toBe(true);
    expect(unauthRes.data?.[0]?.curator_email).toBeUndefined();

    const validCookie = await createSessionCookie(secret, 3600);
    const authRes = await handleGetOverrides({ runQuery }, validCookie, secret);
    expect(authRes.success).toBe(true);
    expect(authRes.data?.[0]?.curator_email).toBe('editor@defencewire.in');
  });

  it('rejects override mutation when unauthenticated and persists audit trail when authorized', async () => {
    const unauth = await handleSaveOverride({ id: 'cluster-1', overrideType: 'promote', payload: { isLead: true } }, null, { runQuery: vi.fn() });
    expect(unauth.success).toBe(false);
    expect(unauth.error).toContain('Unauthorized');

    const validCookie = await createSessionCookie(secret, 3600);
    const runMutation = vi.fn().mockResolvedValue({ success: true });
    const auth = await handleSaveOverride(
      { id: 'cluster-1', overrideType: 'promote', payload: { isLead: true } },
      validCookie,
      { runQuery: vi.fn(), runMutation },
      secret,
      'editor@defencewire.in'
    );
    expect(auth.success).toBe(true);
    expect(auth.data?.curatorEmail).toBe('editor@defencewire.in');
  });

  it('deletes override when authorized', async () => {
    const validCookie = await createSessionCookie(secret, 3600);
    const runMutation = vi.fn().mockResolvedValue({ success: true });
    const res = await handleDeleteOverride('cluster-1', validCookie, { runQuery: vi.fn(), runMutation }, secret);
    expect(res.success).toBe(true);
    expect(res.data?.id).toBe('cluster-1');
  });
});

describe('Curator Auth Gateway: Open Redirect Sanitization & Relative Path Enforcement', () => {
  it('allows safe relative paths and rejects open redirect payloads and CRLF', () => {
    ['/#curator', '#curator', '/', '/archive', '/river?source=pib', '/valid#curator'].forEach((p) => {
      expect(sanitizeReturnUrl(p)).toBe(p);
    });

    const malicious = [
      'https://evil.com', 'http://attacker.org', '//evil.com', '///evil.com', '/\\evil.com',
      '\\evil.com', '/%2f%2fevil.com', 'javascript:alert(1)', '/\r\nLocation: https://evil.com'
    ];
    malicious.forEach((url) => expect(sanitizeReturnUrl(url)).toBe('/#curator'));
    expect(sanitizeReturnUrl(null as any)).toBe('/#curator');
  });
});
