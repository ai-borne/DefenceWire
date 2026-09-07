/**
 * Cloudflare Pages Function: GET /api/patterns
 * Public Edge API serving curator-approved emergent pattern hypotheses.
 * Edge rate-limited and cached with Cache-Tag: dw-patterns.
 * Hard limit: <= 300 LOC.
 */

import { buildListPatternsStatement } from '../../../src/services/curatorPatternQueryBuilder.js';
import { patternRowToEmergentPattern, EmergentPatternRow } from '../../../src/types/patterns.js';
import {
  checkRateLimit,
  getClientIp,
  getRateLimitHeaders
} from '../../../src/services/edgeRateLimiter.js';

interface D1PreparedStatement {
  bind: (...params: unknown[]) => D1PreparedStatement;
  all: <T>() => Promise<{ results: T[] }>;
}

interface D1Database {
  prepare: (sql: string) => D1PreparedStatement;
}

interface PagesFunctionContext {
  request: Request;
  env: { DB?: D1Database };
}

export async function onRequestGet(context: PagesFunctionContext): Promise<Response> {
  const clientIp = getClientIp(context.request.headers);
  const rateLimitKey = `public_patterns:${clientIp}`;
  const rateLimit = checkRateLimit(rateLimitKey, 60, 60_000);
  const rateLimitHeaders = getRateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return Response.json(
      { success: false, patterns: [], error: 'Too many requests. Please slow down.' },
      { status: 429, headers: { ...rateLimitHeaders, 'X-Content-Type-Options': 'nosniff' } }
    );
  }

  const db = context.env.DB;
  if (!db) {
    return Response.json(
      { success: false, patterns: [], error: 'Patterns database is not configured.' },
      { status: 503, headers: { ...rateLimitHeaders, 'X-Content-Type-Options': 'nosniff' } }
    );
  }

  const url = new URL(context.request.url);
  const limitParam = Math.min(Math.max(Number(url.searchParams.get('limit')) || 10, 1), 50);

  try {
    const stmt = buildListPatternsStatement({ status: 'approved', limit: limitParam });
    const { results } = await db.prepare(stmt.sql).bind(...stmt.params).all();
    const rows = (results || []) as unknown as EmergentPatternRow[];
    const patterns = rows.map(patternRowToEmergentPattern);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=120, s-maxage=600, stale-while-revalidate=1200',
      'Cache-Tag': 'dw-patterns',
      ...rateLimitHeaders
    };

    return new Response(JSON.stringify({ success: true, patterns }), {
      status: 200,
      headers
    });
  } catch (err) {
    return Response.json(
      { success: false, patterns: [], error: err instanceof Error ? err.message : 'Database error' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
          ...rateLimitHeaders
        }
      }
    );
  }
}
