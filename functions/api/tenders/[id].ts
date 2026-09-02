/**
 * Cloudflare Pages Function: GET /api/tenders/:id
 * Single-row PK lookup backing cold #tender/<id> deep links (shared links,
 * or a landing hit before that tender's search page is loaded) that
 * TendersViewModel.findLoadedTenderById can't resolve on its own.
 * Thin runtime adapter only — logic lives in the tested
 * src/tenders/tendersSearchHandler.ts, same D1 binding as search.ts.
 * Hard limit: <= 300 LOC.
 */

import { handleTenderByIdRequest } from '../../../src/tenders/tendersSearchHandler.js';
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
  params: { id?: string };
  env: { DB?: D1Database };
}

export async function onRequestGet(context: PagesFunctionContext): Promise<Response> {
  const clientIp = getClientIp(context.request.headers);
  const rateLimitKey = `tenders_by_id:${clientIp}`;
  const rateLimit = checkRateLimit(rateLimitKey, 60, 60_000);
  const rateLimitHeaders = getRateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return Response.json(
      { tender: null, error: 'Too many tender lookups. Please slow down.' },
      { status: 429, headers: { ...rateLimitHeaders, 'X-Content-Type-Options': 'nosniff' } }
    );
  }

  const id = context.params.id || '';
  const db = context.env.DB;

  if (!db) {
    return Response.json(
      { tender: null, error: 'Tender database is not configured.' },
      { status: 503, headers: { ...rateLimitHeaders, 'X-Content-Type-Options': 'nosniff' } }
    );
  }

  const result = await handleTenderByIdRequest(id, {
    runQuery: async (sql, params) => {
      const { results } = await db.prepare(sql).bind(...params).all<TenderRow>();
      return results;
    }
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    ...rateLimitHeaders
  };

  const status = result.error ? (result.error === 'Tender id is required.' ? 400 : 502) : result.tender ? 200 : 404;
  headers['Cache-Control'] = status === 200 ? 'public, max-age=60, s-maxage=300, stale-while-revalidate=600' : 'no-store';

  return new Response(JSON.stringify(result), { status, headers });
}
