/**
 * Curator Edge Authentication & Zero Trust Identity Handler for DefenceWire.in
 * Edge-agnostic core behind functions/api/curator/auth.ts.
 * Implements Cloudflare Access JWT/header parsing, constant-time hash verification, and HMAC session cookie signing.
 * Hard limit: <= 300 LOC.
 */

const DEFAULT_DEV_PASSCODE_HASH = '322c41dfafb6e928d43e943beff0bda52e11436b9eef4530c6440152d4f5e28c';
const DEFAULT_SESSION_SECRET = 'dw-curator-edge-secret-key-2026';
const SESSION_COOKIE_NAME = 'dw_curator_session';
const SESSION_MAX_AGE_DEFAULT = 60 * 60 * 24 * 7; // 7 days

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
  const data = encoder.encode(text.trim());
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Signs payload with HMAC-SHA256.
 */
export async function hmacSign(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await globalThis.crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const sigArray = Array.from(new Uint8Array(signature));
  return sigArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates an HttpOnly signed session cookie string.
 */
export async function createSessionCookie(secret: string = DEFAULT_SESSION_SECRET, maxAge: number = SESSION_MAX_AGE_DEFAULT): Promise<string> {
  const timestamp = Date.now().toString();
  const signature = await hmacSign(timestamp, secret);
  const token = `${timestamp}.${signature}`;
  return `${SESSION_COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
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
  const targetPrefix = `${SESSION_COOKIE_NAME}=`;
  const sessionCookie = cookies.find((c) => c.startsWith(targetPrefix));
  if (!sessionCookie) return false;

  const token = sessionCookie.slice(targetPrefix.length);
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [timestampStr, providedSig] = parts;
  if (!timestampStr || !providedSig) return false;

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp) || Date.now() - timestamp > maxAgeMs) {
    return false;
  }

  const expectedSig = await hmacSign(timestampStr, secret);
  return timingSafeEqual(providedSig, expectedSig);
}

/**
 * Extracts Cloudflare Zero Trust (Access) authenticated identity from request headers.
 */
export function extractCloudflareAccessIdentity(
  headers: Headers | Record<string, string | null | undefined>
): { email: string; isAccessAuthenticated: boolean } | null {
  const getHeader = (name: string): string | null => {
    if (typeof (headers as Headers).get === 'function') {
      return (headers as Headers).get(name);
    }
    const rec = headers as Record<string, string | null | undefined>;
    return rec[name] || rec[name.toLowerCase()] || null;
  };

  const email = getHeader('cf-access-authenticated-user-email');
  const jwt = getHeader('cf-access-jwt-assertion');

  if (email && email.includes('@')) {
    return {
      email: email.trim().toLowerCase(),
      isAccessAuthenticated: Boolean(jwt || email)
    };
  }

  return null;
}

export interface CuratorAuthContext {
  authorized: boolean;
  email: string;
  provider: 'cloudflare_zero_trust' | 'edge_session' | 'none';
}

/**
 * Validates request authorization using either Cloudflare Access or Edge Session Cookie.
 */
export async function verifyCuratorAuthorization(
  headers: Headers | Record<string, string | null | undefined>,
  cookieHeader?: string | null,
  secret: string = DEFAULT_SESSION_SECRET
): Promise<CuratorAuthContext> {
  const cfIdentity = extractCloudflareAccessIdentity(headers);
  if (cfIdentity?.isAccessAuthenticated) {
    return {
      authorized: true,
      email: cfIdentity.email,
      provider: 'cloudflare_zero_trust'
    };
  }

  const isCookieValid = await verifySessionCookie(cookieHeader, secret);
  if (isCookieValid) {
    return {
      authorized: true,
      email: 'curator@institutional.internal',
      provider: 'edge_session'
    };
  }

  return {
    authorized: false,
    email: '',
    provider: 'none'
  };
}

export interface CuratorAuthEnv {
  CURATOR_PASSCODE_HASH?: string;
  CURATOR_SESSION_SECRET?: string;
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
  const passcode = payload.passcode?.trim();
  if (!passcode) {
    return { success: false, error: 'Passcode is required.' };
  }

  const expectedHash = env.CURATOR_PASSCODE_HASH || DEFAULT_DEV_PASSCODE_HASH;
  const secret = env.CURATOR_SESSION_SECRET || DEFAULT_SESSION_SECRET;

  const computedHash = await sha256Hex(passcode);
  const isValid = timingSafeEqual(computedHash, expectedHash);

  if (!isValid) {
    return { success: false, error: 'Invalid passcode.' };
  }

  const maxAge = payload.remember ? SESSION_MAX_AGE_DEFAULT : 60 * 60 * 8; // 8 hours if not remembered
  const cookie = await createSessionCookie(secret, maxAge);

  return { success: true, cookie };
}
