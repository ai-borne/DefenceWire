/**
 * Cloudflare Pages Function: GET /api/threads/list?status=active&category=...&cursor=...
 * Thin runtime adapter wiring D1 to the edge-agnostic handleListThreads.
 * Hard limit: <= 300 LOC.
 */

import { handleListThreads } from '../../../src/services/threadHandler.js';
import {
  checkRateLimit,
  getClientIp,
  getRateLimitHeaders
} from '../../../src/services/edgeRateLimiter.js';
import { ThreadStatus } from '../../../src/types/threads.js';

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
  const rateLimitKey = `threads_list:${clientIp}`;
  const rateLimit = checkRateLimit(rateLimitKey, 60, 60_000);
  const rateLimitHeaders = getRateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return Response.json(
      { threads: [], nextCursor: null, error: 'Too many requests. Please slow down.' },
      { status: 429, headers: { ...rateLimitHeaders, 'X-Content-Type-Options': 'nosniff' } }
    );
  }

  const url = new URL(context.request.url);
  const statusParam = url.searchParams.get('status') as ThreadStatus | null;
  const categoryParam = url.searchParams.get('category');
  const cursorParam = url.searchParams.get('cursor');
  const limitParam = Number(url.searchParams.get('limit')) || 20;

  const db = context.env.DB;
  if (!db) {
    return Response.json(
      { threads: [], nextCursor: null, error: 'Threads database is not configured.' },
      { status: 503, headers: { ...rateLimitHeaders, 'X-Content-Type-Options': 'nosniff' } }
    );
  }

  const result = await handleListThreads(
    {
      status: statusParam ?? undefined,
      category: categoryParam ?? undefined,
      cursor: cursorParam ?? undefined,
      limit: limitParam
    },
    {
      runQuery: async (sql, params) => {
        const { results } = await db.prepare(sql).bind(...params).all();
        return results;
      }
    }
  );

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    ...rateLimitHeaders
  };

  if (!result.error) {
    headers['Cache-Control'] = 'public, max-age=60, s-maxage=300, stale-while-revalidate=600';
    headers['Cache-Tag'] = 'dw-threads';
  } else {
    headers['Cache-Control'] = 'no-store';
  }

  return new Response(JSON.stringify(result), {
    status: result.error ? 500 : 200,
    headers
  });
}
