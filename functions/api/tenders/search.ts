/**
 * Cloudflare Pages Function: GET /api/tenders/search?q=...&status=...&domain=...&closingBefore=...&before=...
 * Thin runtime adapter only — all logic lives in the tested, edge-agnostic
 * src/tenders/tendersSearchHandler.ts, which this file wires to the same D1
 * binding used by functions/api/archive/search.ts.
 * Hard limit: <= 300 LOC.
 */

import { handleTendersSearchRequest } from '../../../src/tenders/tendersSearchHandler.js';
import { type TenderRow } from '../../../src/archive/d1QueryBuilder.js';
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
  const rateLimitKey = `tenders_search:${clientIp}`;
  const rateLimit = checkRateLimit(rateLimitKey, 60, 60_000);
  const rateLimitHeaders = getRateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return Response.json(
      { tenders: [], nextCursor: null, error: 'Too many search requests. Please slow down.' },
      { status: 429, headers: { ...rateLimitHeaders, 'X-Content-Type-Options': 'nosniff' } }
    );
  }

  const url = new URL(context.request.url);
  const rawQuery = url.searchParams.get('q') ?? '';
  const cursor = url.searchParams.get('before');
  const status = url.searchParams.get('status');
  const domain = url.searchParams.get('domain');
  const closingBefore = url.searchParams.get('closingBefore');
  const db = context.env.DB;

  if (!db) {
    return Response.json(
      { tenders: [], nextCursor: null, error: 'Tender database is not configured.' },
      { status: 503, headers: { ...rateLimitHeaders, 'X-Content-Type-Options': 'nosniff' } }
    );
  }

  const result = await handleTendersSearchRequest(
    rawQuery,
    {
      runQuery: async (sql, params) => {
        const { results } = await db.prepare(sql).bind(...params).all<TenderRow>();
        return results;
      }
    },
    { cursor, status, domain, closingBefore }
  );

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    ...rateLimitHeaders
  };

  headers['Cache-Control'] = result.error
    ? 'no-store'
    : 'public, max-age=60, s-maxage=300, stale-while-revalidate=600';

  return new Response(JSON.stringify(result), {
    status: result.error ? 502 : 200,
    headers
  });
}
