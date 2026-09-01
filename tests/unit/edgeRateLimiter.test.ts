/**
 * Unit Tests: Edge Rate Limiting & D1 Resource Protection Guardrails
 * Verifies sliding window rate limiting, client IP extraction, RFC headers, and endpoint 429 responses.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkRateLimit,
  getClientIp,
  getRateLimitHeaders,
  clearRateLimits
} from '../../src/services/edgeRateLimiter.js';
import { onRequestPost as curatorAuthPost } from '../../functions/api/curator/auth.js';
import { onRequestGet as archiveSearchGet } from '../../functions/api/archive/search.js';
import { onRequestGet as entityDossierGet } from '../../functions/api/entity/[slug].js';

describe('Edge Rate Limiter: Core Engine & IP Identification', () => {
  beforeEach(() => {
    clearRateLimits();
  });

  it('extracts client IP from Cloudflare and proxy headers with fallback', () => {
    expect(getClientIp({ 'cf-connecting-ip': '203.0.113.195' })).toBe('203.0.113.195');
    expect(getClientIp({ 'x-forwarded-for': '198.51.100.1, 10.0.0.1' })).toBe('198.51.100.1');
    expect(getClientIp({ 'x-real-ip': '192.0.2.45' })).toBe('192.0.2.45');
    expect(getClientIp({})).toBe('127.0.0.1');

    const headers = new Headers();
    headers.set('cf-connecting-ip', '1.1.1.1');
    expect(getClientIp(headers)).toBe('1.1.1.1');
  });

  it('strictly prioritizes cf-connecting-ip over spoofed x-forwarded-for and x-real-ip headers', () => {
    const spoofedHeaders = {
      'cf-connecting-ip': '203.0.113.50',
      'x-forwarded-for': '1.2.3.4, 5.6.7.8',
      'x-real-ip': '9.10.11.12'
    };
    expect(getClientIp(spoofedHeaders)).toBe('203.0.113.50');
  });

  it('sanitizes ports, control characters, and clamps extracted IP address strings', () => {
    expect(getClientIp({ 'cf-connecting-ip': '198.51.100.22:8080' })).toBe('198.51.100.22');
    expect(getClientIp({ 'x-forwarded-for': '  192.0.2.1\r\n:9000  ' })).toBe('192.0.2.1');
    expect(getClientIp({ 'x-real-ip': '2001:db8::1' })).toBe('2001:db8::1');
  });

  it('allows requests within threshold and decrements remaining quota', () => {
    const key = 'test-client-1';
    const now = 1000000;

    const r1 = checkRateLimit(key, 3, 60_000, now);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);
    expect(r1.limit).toBe(3);

    const r2 = checkRateLimit(key, 3, 60_000, now + 1000);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = checkRateLimit(key, 3, 60_000, now + 2000);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);

    // 4th request in same window blocked
    const r4 = checkRateLimit(key, 3, 60_000, now + 3000);
    expect(r4.allowed).toBe(false);
    expect(r4.remaining).toBe(0);
  });

  it('resets window after expiry time has elapsed', () => {
    const key = 'test-client-2';
    const start = 1000000;

    checkRateLimit(key, 1, 10_000, start);
    expect(checkRateLimit(key, 1, 10_000, start + 5000).allowed).toBe(false);

    // After 10s elapsed
    const rAfter = checkRateLimit(key, 1, 10_000, start + 10001);
    expect(rAfter.allowed).toBe(true);
    expect(rAfter.remaining).toBe(0);
  });

  it('formats compliant RFC rate limit headers with Retry-After on rejection', () => {
    const allowedHeaders = getRateLimitHeaders({ allowed: true, limit: 60, remaining: 59, resetSec: 60 });
    expect(allowedHeaders['RateLimit-Limit']).toBe('60');
    expect(allowedHeaders['RateLimit-Remaining']).toBe('59');
    expect(allowedHeaders['RateLimit-Reset']).toBe('60');
    expect(allowedHeaders['Retry-After']).toBeUndefined();

    const blockedHeaders = getRateLimitHeaders({ allowed: false, limit: 60, remaining: 0, resetSec: 42 });
    expect(blockedHeaders['RateLimit-Remaining']).toBe('0');
    expect(blockedHeaders['Retry-After']).toBe('42');
  });
});

describe('Edge Endpoints: Rate Limiting & D1 Guardrail Protection', () => {
  beforeEach(() => {
    clearRateLimits();
  });

  it('enforces rate limiting on /api/curator/auth login attempts with HTTP 429', async () => {
    const requestFactory = () =>
      new Request('http://localhost:5176/api/curator/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-connecting-ip': '198.51.100.50'
        },
        body: JSON.stringify({ passcode: 'wrong' })
      });

    // 5 attempts allowed (returns 401 invalid passcode)
    for (let i = 0; i < 5; i++) {
      const res = await curatorAuthPost({ request: requestFactory(), env: { CURATOR_PASSCODE_HASH: 'abc', CURATOR_SESSION_SECRET: 'test-secret' } });
      expect(res.status).toBe(401);
      expect(res.headers.get('RateLimit-Remaining')).toBe(String(4 - i));
    }

    // 6th attempt rejected with HTTP 429 Too Many Requests
    const resBlocked = await curatorAuthPost({ request: requestFactory(), env: { CURATOR_PASSCODE_HASH: 'abc', CURATOR_SESSION_SECRET: 'test-secret' } });
    expect(resBlocked.status).toBe(429);
    expect(resBlocked.headers.get('Retry-After')).toBeTruthy();
    const data = (await resBlocked.json()) as { error: string };
    expect(data.error).toContain('Too many login attempts');
  });

  it('enforces rate limiting on /api/archive/search queries with HTTP 429', async () => {
    const request = new Request('http://localhost:5176/api/archive/search?q=tejas', {
      headers: { 'cf-connecting-ip': '198.51.100.77' }
    });

    const mockDb = {
      prepare: () => ({
        bind: () => ({
          all: async () => ({ results: [] })
        })
      })
    };

    // Exhaust 60 search requests
    for (let i = 0; i < 60; i++) {
      const res = await archiveSearchGet({ request, env: { DB: mockDb as any } });
      expect(res.status).toBe(200);
    }

    // 61st search request is rate limited
    const resBlocked = await archiveSearchGet({ request, env: { DB: mockDb as any } });
    expect(resBlocked.status).toBe(429);
    const data = (await resBlocked.json()) as { error: string };
    expect(data.error).toContain('Too many search requests');
  });

  it('enforces rate limiting on /api/entity/:slug dossier fetches with HTTP 429', async () => {
    const request = new Request('http://localhost:5176/api/entity/tejas-mk1a', {
      headers: { 'cf-connecting-ip': '198.51.100.88' }
    });

    const mockDb = {
      prepare: () => ({
        bind: () => ({
          first: async () => null,
          all: async () => ({ results: [] })
        })
      })
    };

    // Exhaust 120 dossier requests
    for (let i = 0; i < 120; i++) {
      const res = await entityDossierGet({ request, params: { slug: 'tejas-mk1a' }, env: { DB: mockDb as any } });
      expect(res.status).toBe(404);
    }

    // 121st request is rate limited
    const resBlocked = await entityDossierGet({ request, params: { slug: 'tejas-mk1a' }, env: { DB: mockDb as any } });
    expect(resBlocked.status).toBe(429);
    const data = (await resBlocked.json()) as { error: string };
    expect(data.error).toContain('Too many dossier requests');
  });
});
