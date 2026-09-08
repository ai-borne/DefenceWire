/**
 * Cloudflare Pages Function: GET /api/threads/:id
 * Edge endpoint returning story thread metadata and chronological event timeline.
 * Hard limit: <= 300 LOC.
 */

import { handleGetThreadDetail } from '../../../src/services/threadHandler.js';
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
  const rawParam = context.params.id ?? '';
  let rawId = rawParam;
  try {
    rawId = decodeURIComponent(rawParam);
  } catch {
    rawId = rawParam;
  }
  const rateLimitKey = `thread_detail:${clientIp}`;
  const rateLimit = checkRateLimit(rateLimitKey, 60, 60_000);
  const rateLimitHeaders = getRateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return Response.json(
      { thread: null, events: [], error: 'Too many requests. Please slow down.' },
      { status: 429, headers: { ...rateLimitHeaders, 'X-Content-Type-Options': 'nosniff' } }
    );
  }

  if (!rawId) {
    return Response.json(
      { thread: null, events: [], error: 'Thread ID is required.' },
      { status: 400, headers: { ...rateLimitHeaders, 'X-Content-Type-Options': 'nosniff' } }
    );
  }

  const db = context.env.DB;
  if (!db) {
    return Response.json(
      { thread: null, events: [], error: 'Threads database is not configured.' },
      { status: 503, headers: { ...rateLimitHeaders, 'X-Content-Type-Options': 'nosniff' } }
    );
  }

  const result = await handleGetThreadDetail(rawId, {
    runQuery: async (sql, params) => {
      const { results } = await db.prepare(sql).bind(...params).all();
      return results;
    }
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    ...rateLimitHeaders
  };

  if (!result.error) {
    headers['Cache-Control'] = 'public, max-age=60, s-maxage=300, stale-while-revalidate=600';
  } else {
    headers['Cache-Control'] = 'no-store';
  }

  const status = result.error ? (result.error === 'Thread not found' ? 404 : 500) : 200;

  return new Response(JSON.stringify(result), {
    status,
    headers
  });
}
