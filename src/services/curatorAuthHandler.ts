/**
 * Curator Edge Authentication & Zero Trust Identity Handler for DefenceWire.in
 * Edge-agnostic core behind functions/api/curator/auth.ts.
 * Implements Cloudflare Access JWT signature verification, constant-time hash verification, and HMAC session cookie signing.
 * Hard limit: <= 300 LOC.
 */

const DEFAULT_DEV_PASSCODE_HASH = '322c41dfafb6e928d43e943beff0bda52e11436b9eef4530c6440152d4f5e28c';
const DEFAULT_SESSION_SECRET = 'dw-curator-edge-secret-key-2026';
const SESSION_COOKIE_NAME = 'dw_curator_session';
const SESSION_MAX_AGE_DEFAULT = 60 * 60 * 24 * 7; // 7 days
const DEFAULT_ACCESS_TEAM_DOMAIN = 'defencewire.cloudflareaccess.com';

function base64UrlToUint8Array(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(b64url.length / 4) * 4, '=');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function extractHeader(headers: Headers | Record<string, string | null | undefined>, name: string): string | null {
  if (typeof (headers as Headers).get === 'function') return (headers as Headers).get(name);
  const rec = headers as Record<string, string | null | undefined>;
  return rec[name] || rec[name.toLowerCase()] || null;
}

/**
 * Cryptographically validates a Cloudflare Access JWT token signature against the team JWKS endpoint.
 */
export async function verifyAccessJwtToken(
  token: string | null | undefined,
  teamDomain: string = DEFAULT_ACCESS_TEAM_DOMAIN,
  fetchFn: typeof fetch = globalThis.fetch
): Promise<{ email: string } | null> {
  if (!token) return null;
  const parts = token.trim().split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;
  if (!headerB64 || !payloadB64 || !sigB64) return null;

  let header: { kid?: string };
  let payload: { email?: string; exp?: number; aud?: string[] };
  try {
    header = JSON.parse(new TextDecoder().decode(base64UrlToUint8Array(headerB64)));
    payload = JSON.parse(new TextDecoder().decode(base64UrlToUint8Array(payloadB64)));
  } catch {
    return null;
  }

  if (!payload.email || !payload.exp || Date.now() / 1000 > payload.exp) return null;

  try {
    const certsResponse = await fetchFn(`https://${teamDomain}/cdn-cgi/access/certs`);
    if (!certsResponse.ok) return null;
    const certs = (await certsResponse.json()) as { keys: JsonWebKey[] };
    const matchedKey = certs.keys.find((k) => (k as unknown as { kid?: string }).kid === header.kid);
    if (!matchedKey) return null;

    const cryptoKey = await globalThis.crypto.subtle.importKey(
      'jwk',
      matchedKey,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const signedData = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signature = base64UrlToUint8Array(sigB64).slice().buffer;
    const isValid = await globalThis.crypto.subtle.verify('RSASSA-PKCS1-v1_5', cryptoKey, signature, signedData);
    if (!isValid) return null;

    return { email: payload.email.trim().toLowerCase() };
  } catch {
    return null;
  }
}

/**
 * Verifies a Cloudflare Access CF_Authorization cookie's JWT signature against published JWKS.
 */
export async function verifyAccessSessionCookie(
  cookieHeader: string | null | undefined,
  teamDomain: string = DEFAULT_ACCESS_TEAM_DOMAIN,
  fetchFn: typeof fetch = globalThis.fetch
): Promise<{ email: string } | null> {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';').map((c) => c.trim());
  const cfCookie = cookies.find((c) => c.startsWith('CF_Authorization='));
  if (!cfCookie) return null;
  return verifyAccessJwtToken(cfCookie.slice('CF_Authorization='.length), teamDomain, fetchFn);
}

/**
 * Constant-time comparison between two strings to prevent timing attacks.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Computes standard SHA-256 hex string using Web Crypto API.
 */
export async function sha256Hex(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', encoder.encode(text.trim()));
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Signs payload with HMAC-SHA256.
 */
export async function hmacSign(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await globalThis.crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates an HttpOnly signed session cookie string.
 */
export async function createSessionCookie(secret: string = DEFAULT_SESSION_SECRET, maxAge: number = SESSION_MAX_AGE_DEFAULT): Promise<string> {
  const timestamp = Date.now().toString();
  const signature = await hmacSign(timestamp, secret);
  return `${SESSION_COOKIE_NAME}=${timestamp}.${signature}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}

/**
 * Generates a cookie-clearing header.
 */
export function createClearSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

/**
 * Verifies an incoming cookie against the HMAC secret.
 */
export async function verifySessionCookie(
  cookieHeader: string | null | undefined,
  secret: string = DEFAULT_SESSION_SECRET,
  maxAgeMs: number = SESSION_MAX_AGE_DEFAULT * 1000
): Promise<boolean> {
  if (!cookieHeader) return false;
  const cookies = cookieHeader.split(';').map((c) => c.trim());
  const sessionCookie = cookies.find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
  if (!sessionCookie) return false;

  const token = sessionCookie.slice(`${SESSION_COOKIE_NAME}=`.length);
  const [timestampStr, providedSig] = token.split('.');
  if (!timestampStr || !providedSig) return false;

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp) || Date.now() - timestamp > maxAgeMs) return false;

  const expectedSig = await hmacSign(timestampStr, secret);
  return timingSafeEqual(providedSig, expectedSig);
}

/**
 * Extracts Cloudflare Zero Trust (Access) identity from request headers.
 */
export function extractCloudflareAccessIdentity(
  headers: Headers | Record<string, string | null | undefined>
): { email: string; isAccessAuthenticated: boolean } | null {
  const email = extractHeader(headers, 'cf-access-authenticated-user-email');
  const jwt = extractHeader(headers, 'cf-access-jwt-assertion');
  if (email && email.includes('@')) {
    return { email: email.trim().toLowerCase(), isAccessAuthenticated: Boolean(jwt) };
  }
  return null;
}

export interface CuratorAuthContext {
  authorized: boolean;
  email: string;
  provider: 'cloudflare_zero_trust' | 'edge_session' | 'none';
}

/**
 * Validates request authorization using verified Cloudflare Access JWT or Edge Session Cookie.
 */
export async function verifyCuratorAuthorization(
  headers: Headers | Record<string, string | null | undefined>,
  cookieHeader?: string | null,
  secret: string = DEFAULT_SESSION_SECRET,
  teamDomain: string = DEFAULT_ACCESS_TEAM_DOMAIN,
  fetchFn: typeof fetch = globalThis.fetch
): Promise<CuratorAuthContext> {
  const jwtAssertion = extractHeader(headers, 'cf-access-jwt-assertion');
  if (jwtAssertion) {
    const verifiedHeader = await verifyAccessJwtToken(jwtAssertion, teamDomain, fetchFn);
    if (verifiedHeader) {
      return { authorized: true, email: verifiedHeader.email, provider: 'cloudflare_zero_trust' };
    }
  }

  const cfSession = await verifyAccessSessionCookie(cookieHeader, teamDomain, fetchFn);
  if (cfSession) {
    return { authorized: true, email: cfSession.email, provider: 'cloudflare_zero_trust' };
  }

  const isCookieValid = await verifySessionCookie(cookieHeader, secret);
  if (isCookieValid) {
    return { authorized: true, email: 'curator@institutional.internal', provider: 'edge_session' };
  }

  return { authorized: false, email: '', provider: 'none' };
}

export interface CuratorAuthEnv {
  CURATOR_PASSCODE_HASH?: string;
  CURATOR_SESSION_SECRET?: string;
  NODE_ENV?: string;
}

export interface CuratorAuthPayload {
  passcode?: string;
  remember?: boolean;
}

export interface CuratorAuthResponse {
  success: boolean;
  cookie?: string;
  error?: string;
}

/**
 * Processes edge authentication requests.
 */
export async function handleCuratorAuthRequest(
  payload: CuratorAuthPayload,
  env: CuratorAuthEnv = {}
): Promise<CuratorAuthResponse> {
  const isProd = (env.NODE_ENV || (typeof process !== 'undefined' ? process.env?.NODE_ENV : undefined)) === 'production';
  if (isProd && (!env.CURATOR_PASSCODE_HASH || !env.CURATOR_SESSION_SECRET)) {
    return { success: false, error: 'Production environment requires configured secrets.' };
  }

  const passcode = payload.passcode?.trim();
  if (!passcode) return { success: false, error: 'Passcode is required.' };

  const expectedHash = env.CURATOR_PASSCODE_HASH || DEFAULT_DEV_PASSCODE_HASH;
  const secret = env.CURATOR_SESSION_SECRET || DEFAULT_SESSION_SECRET;

  const computedHash = await sha256Hex(passcode);
  const isValid = timingSafeEqual(computedHash, expectedHash);

  if (!isValid) return { success: false, error: 'Invalid passcode.' };

  const maxAge = payload.remember ? SESSION_MAX_AGE_DEFAULT : 60 * 60 * 8;
  const cookie = await createSessionCookie(secret, maxAge);

  return { success: true, cookie };
}

