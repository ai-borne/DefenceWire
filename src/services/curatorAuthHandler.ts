/**
 * Curator Edge Authentication & Zero Trust Identity Handler for DefenceWire.in
 * Edge-agnostic core behind functions/api/curator/auth.ts.
 * Implements Cloudflare Access JWT verification, constant-time comparison, and HMAC session cookie signing.
 * Hard limit: <= 300 LOC.
 */

import { STRINGS } from '../resources/strings.js';

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
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return null;
  const [headerB64, payloadB64, sigB64] = parts;

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

    const cryptoKey = await globalThis.crypto.subtle.importKey('jwk', matchedKey, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const signedData = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signature = base64UrlToUint8Array(sigB64).slice().buffer;
    const isValid = await globalThis.crypto.subtle.verify('RSASSA-PKCS1-v1_5', cryptoKey, signature, signedData);
    return isValid ? { email: payload.email.trim().toLowerCase() } : null;
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
  const cfCookie = cookieHeader.split(';').map((c) => c.trim()).find((c) => c.startsWith('CF_Authorization='));
  if (!cfCookie) return null;
  return verifyAccessJwtToken(cfCookie.slice('CF_Authorization='.length), teamDomain, fetchFn);
}

/**
 * Constant-time comparison between two strings to prevent timing oracles and length leakage.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const maxLen = Math.max(a.length, b.length);
  let result = a.length ^ b.length;
  for (let i = 0; i < maxLen; i++) {
    result |= (i < a.length ? a.charCodeAt(i) : 0) ^ (i < b.length ? b.charCodeAt(i) : 0);
  }
  return result === 0;
}

/**
 * Computes standard SHA-256 hex string using Web Crypto API.
 */
export async function sha256Hex(text: string): Promise<string> {
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text.trim()));
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
 * Generates an HttpOnly signed session cookie string with v1 version prefix.
 */
export async function createSessionCookie(secret: string, maxAge: number = SESSION_MAX_AGE_DEFAULT): Promise<string> {
  if (!secret || typeof secret !== 'string' || !secret.trim()) {
    throw new Error('Cannot create session cookie: session secret is required.');
  }
  const primarySecret = secret.split(',')[0]?.trim();
  if (!primarySecret) throw new Error('Cannot create session cookie: primary secret is required.');
  const timestamp = Date.now().toString();
  const signature = await hmacSign(timestamp, primarySecret);
  return `${SESSION_COOKIE_NAME}=v1.${timestamp}.${signature}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}

export function createClearSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

function parseSessionEpoch(epoch?: number | string | null): number {
  if (!epoch) return 0;
  if (typeof epoch === 'number') return epoch < 1e11 ? epoch * 1000 : epoch;
  const trimmed = epoch.trim();
  if (!trimmed) return 0;
  const num = parseInt(trimmed, 10);
  if (!isNaN(num)) return num < 1e11 ? num * 1000 : num;
  const parsedDate = Date.parse(trimmed);
  return !isNaN(parsedDate) ? parsedDate : 0;
}

/**
 * Verifies an incoming cookie against HMAC secret(s) and epoch revocation bounds.
 */
export async function verifySessionCookie(
  cookieHeader: string | null | undefined,
  secret: string | null | undefined,
  maxAgeMs: number = SESSION_MAX_AGE_DEFAULT * 1000,
  sessionEpoch?: number | string | null
): Promise<boolean> {
  if (!cookieHeader || !secret || typeof secret !== 'string' || !secret.trim()) return false;
  const sessionCookie = cookieHeader.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
  if (!sessionCookie) return false;

  const token = sessionCookie.slice(`${SESSION_COOKIE_NAME}=`.length);
  const parts = token.split('.');
  let timestampStr = '';
  let providedSig = '';

  if (parts.length === 3 && parts[0] === 'v1') {
    timestampStr = parts[1]!;
    providedSig = parts[2]!;
  } else if (parts.length === 2) {
    timestampStr = parts[0]!;
    providedSig = parts[1]!;
  } else {
    return false;
  }

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return false;

  const now = Date.now();
  if (now - timestamp > maxAgeMs || timestamp > now + 60_000) return false;

  const minEpochMs = parseSessionEpoch(sessionEpoch);
  if (minEpochMs > 0 && timestamp < minEpochMs) return false;

  const secretCandidates = secret.split(',').map((s) => s.trim()).filter(Boolean);
  for (const s of secretCandidates) {
    const expectedSig = await hmacSign(timestampStr, s);
    if (timingSafeEqual(providedSig, expectedSig)) return true;
  }
  return false;
}

export function extractCloudflareAccessIdentity(
  headers: Headers | Record<string, string | null | undefined>
): { email: string; isAccessAuthenticated: boolean } | null {
  const email = extractHeader(headers, 'cf-access-authenticated-user-email');
  const jwt = extractHeader(headers, 'cf-access-jwt-assertion');
  return email && email.includes('@') ? { email: email.trim().toLowerCase(), isAccessAuthenticated: Boolean(jwt) } : null;
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
  secret?: string | null,
  teamDomain: string = DEFAULT_ACCESS_TEAM_DOMAIN,
  fetchFn: typeof fetch = globalThis.fetch,
  sessionEpoch?: number | string | null
): Promise<CuratorAuthContext> {
  const jwtAssertion = extractHeader(headers, 'cf-access-jwt-assertion');
  if (jwtAssertion) {
    const verifiedHeader = await verifyAccessJwtToken(jwtAssertion, teamDomain, fetchFn);
    if (verifiedHeader) return { authorized: true, email: verifiedHeader.email, provider: 'cloudflare_zero_trust' };
  }

  const cfSession = await verifyAccessSessionCookie(cookieHeader, teamDomain, fetchFn);
  if (cfSession) return { authorized: true, email: cfSession.email, provider: 'cloudflare_zero_trust' };

  if (secret && (await verifySessionCookie(cookieHeader, secret, undefined, sessionEpoch))) {
    return { authorized: true, email: 'curator@institutional.internal', provider: 'edge_session' };
  }

  return { authorized: false, email: '', provider: 'none' };
}

export interface CuratorAuthEnv {
  CURATOR_PASSCODE_HASH?: string;
  CURATOR_SESSION_SECRET?: string;
  CURATOR_SESSION_EPOCH?: string | number;
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
 * Processes edge authentication requests with fail-closed security.
 */
export async function handleCuratorAuthRequest(
  payload: CuratorAuthPayload,
  env: CuratorAuthEnv = {}
): Promise<CuratorAuthResponse> {
  const expectedHash = env.CURATOR_PASSCODE_HASH?.trim();
  const secret = env.CURATOR_SESSION_SECRET?.trim();
  if (!expectedHash || !secret) return { success: false, error: STRINGS.errors.authConfigMissing };

  const passcode = payload.passcode?.trim();
  if (!passcode) return { success: false, error: 'Passcode is required.' };

  const computedHash = await sha256Hex(passcode);
  if (!timingSafeEqual(computedHash, expectedHash)) return { success: false, error: STRINGS.editor.invalidPasscode };

  const maxAge = payload.remember ? SESSION_MAX_AGE_DEFAULT : 60 * 60 * 8;
  const cookie = await createSessionCookie(secret, maxAge);
  return { success: true, cookie };
}

/**
 * Sanitizes and validates a redirect/return URL to eliminate open redirect vulnerabilities and CRLF injection.
 */
export function sanitizeReturnUrl(url: string | null | undefined, fallback: string = '/#curator'): string {
  if (!url || typeof url !== 'string') return fallback;
  const trimmed = url.trim();
  if (!trimmed) return fallback;

  if (/[\r\n\0\t\x00-\x1F\x7F]/.test(trimmed) || /%(?:0[0-9a-fA-F]|1[0-9a-fA-F]|7[fF])/i.test(trimmed)) return fallback;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) || /^[/\\]{2,}/.test(trimmed) || /^\\[/\\]?/.test(trimmed) || /^\/\\/.test(trimmed)) return fallback;

  try {
    const decoded = decodeURIComponent(trimmed);
    if (/[\r\n\0\t\x00-\x1F\x7F]/.test(decoded) || /^[/\\]{2,}/.test(decoded) || /^\/\\/.test(decoded) || /^\\[/\\]?/.test(decoded) || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(decoded)) {
      return fallback;
    }
    if ((decoded.split(/[?#]/)[0] || '').includes('\\')) return fallback;
  } catch {
    return fallback;
  }

  if (!trimmed.startsWith('/') && !trimmed.startsWith('#')) return fallback;
  return trimmed;
}
