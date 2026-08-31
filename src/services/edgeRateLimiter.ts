/**
 * Edge Rate Limiting & D1 Resource Protection Guardrails
 * In-memory sliding window rate limiter for Cloudflare Pages Functions and Edge runtime.
 * Hard limit: <= 300 LOC.
 */

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSec: number;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const RATE_LIMIT_STORE = new Map<string, RateLimitBucket>();
const MAX_STORE_SIZE = 10_000;

/**
 * Extracts client IP identifier from edge request headers.
 */
export function getClientIp(headers: Headers | Record<string, string | null | undefined>): string {
  const getHeader = (name: string): string | null => {
    if (typeof (headers as Headers).get === 'function') return (headers as Headers).get(name);
    const rec = headers as Record<string, string | null | undefined>;
    return rec[name] || rec[name.toLowerCase()] || null;
  };

  const cfIp = getHeader('cf-connecting-ip');
  if (cfIp && cfIp.trim()) return cfIp.trim();

  const xff = getHeader('x-forwarded-for');
  if (xff && xff.trim()) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }

  const realIp = getHeader('x-real-ip');
  if (realIp && realIp.trim()) return realIp.trim();

  return '127.0.0.1';
}

/**
 * Prunes expired buckets from the in-memory store.
 */
function pruneExpiredBuckets(now: number): void {
  for (const [key, bucket] of RATE_LIMIT_STORE.entries()) {
    if (now >= bucket.resetAt) {
      RATE_LIMIT_STORE.delete(key);
    }
  }
}

/**
 * Evaluates rate limit for a given key within a rolling time window.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now()
): RateLimitResult {
  if (RATE_LIMIT_STORE.size > MAX_STORE_SIZE) {
    pruneExpiredBuckets(now);
  }

  const existing = RATE_LIMIT_STORE.get(key);

  if (!existing || now >= existing.resetAt) {
    const resetAt = now + windowMs;
    RATE_LIMIT_STORE.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - 1),
      resetSec: Math.max(1, Math.ceil(windowMs / 1000))
    };
  }

  const resetSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));

  if (existing.count >= limit) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetSec
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - existing.count),
    resetSec
  };
}

/**
 * Generates standard rate limit headers (RFC compliant).
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'RateLimit-Limit': String(result.limit),
    'RateLimit-Remaining': String(result.remaining),
    'RateLimit-Reset': String(result.resetSec)
  };

  if (!result.allowed) {
    headers['Retry-After'] = String(result.resetSec);
  }

  return headers;
}

/**
 * Clears all active rate limit buckets (primarily for testing).
 */
export function clearRateLimits(): void {
  RATE_LIMIT_STORE.clear();
}
