/**
 * Unit Tests: Curator Edge Authentication & Zero Trust D1 Overrides Handlers
 * Verifies cryptographic Cloudflare Access JWT verification, spoofing prevention, constant-time comparison, and D1 audit logging.
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
    const headers = {
      'cf-access-authenticated-user-email': 'editor@defencewire.in',
      'cf-access-jwt-assertion': 'mock.jwt.assertion'
    };
    const identity = extractCloudflareAccessIdentity(headers);
    expect(identity).not.toBeNull();
    expect(identity?.email).toBe('editor@defencewire.in');
    expect(identity?.isAccessAuthenticated).toBe(true);
  });

  it('verifies valid cryptographic Cloudflare Access JWT assertions', async () => {
    const validJwt = await createSignedJwt('editor@defencewire.in');
    const result = await verifyAccessJwtToken(validJwt, 'defencewire.cloudflareaccess.com', mockFetchJwks);
    expect(result).not.toBeNull();
    expect(result?.email).toBe('editor@defencewire.in');
  });

  it('rejects spoofed email headers without valid JWT cryptographic assertion', async () => {
    const spoofedHeaders = {
      'cf-access-authenticated-user-email': 'attacker@evil.com'
    };
    const auth = await verifyCuratorAuthorization(spoofedHeaders, null, 'secret', 'defencewire.cloudflareaccess.com', mockFetchJwks);
    expect(auth.authorized).toBe(false);
    expect(auth.provider).toBe('none');
  });

  it('rejects tampered Cloudflare Access JWT tokens', async () => {
    const validJwt = await createSignedJwt('editor@defencewire.in');
    const tamperedJwt = `${validJwt.slice(0, -5)}XXXXX`;
    const result = await verifyAccessJwtToken(tamperedJwt, 'defencewire.cloudflareaccess.com', mockFetchJwks);
    expect(result).toBeNull();
  });

  it('verifies authorization via valid Cloudflare Access JWT header', async () => {
    const validJwt = await createSignedJwt('curator@defencewire.in');
    const headers = {
      'cf-access-authenticated-user-email': 'curator@defencewire.in',
      'cf-access-jwt-assertion': validJwt
    };
    const auth = await verifyCuratorAuthorization(headers, null, 'secret', 'defencewire.cloudflareaccess.com', mockFetchJwks);
    expect(auth.authorized).toBe(true);
    expect(auth.email).toBe('curator@defencewire.in');
    expect(auth.provider).toBe('cloudflare_zero_trust');
  });

  it('verifies authorization via valid Cloudflare Access CF_Authorization cookie', async () => {
    const validJwt = await createSignedJwt('curator-cookie@defencewire.in');
    const cookieHeader = `CF_Authorization=${validJwt}; other=123`;
    const auth = await verifyCuratorAuthorization({}, cookieHeader, 'secret', 'defencewire.cloudflareaccess.com', mockFetchJwks);
    expect(auth.authorized).toBe(true);
    expect(auth.email).toBe('curator-cookie@defencewire.in');
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

  it('generates a valid v1 signed HMAC session cookie and verifies it successfully', async () => {
    const secret = 'custom-secret-key-123';
    const cookie = await createSessionCookie(secret, 3600);
    expect(cookie).toContain('dw_curator_session=v1.');
    const isValid = await verifySessionCookie(cookie, secret, 3600 * 1000);
    expect(isValid).toBe(true);
  });

  it('verifies legacy unversioned tokens for zero-downtime backward compatibility', async () => {
    const secret = 'custom-secret-key-123';
    const timestamp = Date.now().toString();
    const encoder = new TextEncoder();
    const key = await globalThis.crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = await globalThis.crypto.subtle.sign('HMAC', key, encoder.encode(timestamp));
    const hmacHex = Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, '0')).join('');
    const legacyCookie = `dw_curator_session=${timestamp}.${hmacHex}`;
    expect(await verifySessionCookie(legacyCookie, secret)).toBe(true);
  });

  it('supports zero-downtime secret rotation with comma-separated secrets', async () => {
    const oldSecret = 'old-secret-key-2025';
    const newSecret = 'new-secret-key-2026';
    const rotationSecretList = `${newSecret}, ${oldSecret}`;

    const oldSessionCookie = await createSessionCookie(oldSecret, 3600);
    const newSessionCookie = await createSessionCookie(newSecret, 3600);

    // Both old and new cookies validate during rotation window
    expect(await verifySessionCookie(oldSessionCookie, rotationSecretList)).toBe(true);
    expect(await verifySessionCookie(newSessionCookie, rotationSecretList)).toBe(true);
    // Unknown secret rejected
    expect(await verifySessionCookie(oldSessionCookie, 'completely-unrelated-key')).toBe(false);
  });

  it('rejects tampered, expired, or invalid format session cookies', async () => {
    const secret = 'custom-secret-key-123';
    const cookie = await createSessionCookie(secret, 3600);
    const tamperedCookie = cookie.replace('dw_curator_session=v1.', 'dw_curator_session=v1.forged.');
    expect(await verifySessionCookie(tamperedCookie, secret)).toBe(false);
    expect(await verifySessionCookie('dw_curator_session=invalidformat', secret)).toBe(false);
    expect(await verifySessionCookie('dw_curator_session=v99.1234.sig', secret)).toBe(false);
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

  it('enforces configured secrets in production environment', async () => {
    const result = await handleCuratorAuthRequest(
      { passcode: 'anyPasscode', remember: true },
      { NODE_ENV: 'production' }
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain('Production environment requires configured secrets');
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
  it('redacts curator_email from overrides on unauthenticated requests to prevent PII leakage', async () => {
    const mockRows = [{ id: 'cluster-1', override_type: 'promote', payload_json: '{}', updated_at: '2026-08-31', curator_email: 'editor@defencewire.in' }];
    const runQuery = vi.fn().mockResolvedValue(mockRows);
    const res = await handleGetOverrides({ runQuery });
    expect(res.success).toBe(true);
    expect(res.data?.[0]?.id).toBe('cluster-1');
    expect(res.data?.[0]?.curator_email).toBeUndefined();
  });

  it('preserves curator_email on authenticated curator requests', async () => {
    const secret = 'curator-test-secret';
    const validCookie = await createSessionCookie(secret, 3600);
    const mockRows = [{ id: 'cluster-1', override_type: 'promote', payload_json: '{}', updated_at: '2026-08-31', curator_email: 'editor@defencewire.in' }];
    const runQuery = vi.fn().mockResolvedValue(mockRows);
    const res = await handleGetOverrides({ runQuery }, validCookie, secret);
    expect(res.success).toBe(true);
    expect(res.data?.[0]?.curator_email).toBe('editor@defencewire.in');
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

describe('Curator Auth Gateway: Open Redirect Sanitization & Relative Path Enforcement', () => {
  it('allows safe relative paths and fragment navigations', () => {
    ['/#curator', '#curator', '/', '/archive', '/river?source=pib', '/valid#curator'].forEach((p) => {
      expect(sanitizeReturnUrl(p)).toBe(p);
    });
  });

  it('rejects external URLs, dangerous schemes, obfuscated paths, and CRLF payloads', () => {
    const malicious = [
      'https://evil.com', 'http://attacker.org/phish', 'https://defencewire.in.evil.com',
      '//evil.com', '///evil.com', '/\\evil.com', '\\evil.com', '\\/evil.com',
      '/%2f%2fevil.com', '/%5cevil.com', 'javascript:alert(1)', 'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)', '/\r\nLocation: https://evil.com', '/%0d%0aSet-Cookie: evil=1', '/path\0nullbyte'
    ];
    malicious.forEach((url) => {
      expect(sanitizeReturnUrl(url)).toBe('/#curator');
    });
  });

  it('handles empty, whitespace, non-string, or custom fallback scenarios', () => {
    [null, undefined, '', '   '].forEach((input) => {
      expect(sanitizeReturnUrl(input as any)).toBe('/#curator');
    });
    expect(sanitizeReturnUrl('https://evil.com', '/archive')).toBe('/archive');
  });
});

