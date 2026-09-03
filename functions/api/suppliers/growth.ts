/**
 * Cloudflare Pages Function: GET /api/suppliers/growth
 * Edge endpoint powering the Ecosystem coverage strip's "N new verified
 * links promoted in the last 30 days" growth signal (Phase 2.7).
 * Hard limit: <= 300 LOC.
 */

import { handleSupplierGrowthRequest } from '../../../src/services/supplierGrowthHandler.js';
import {
  checkRateLimit,
  getClientIp,
  getRateLimitHeaders
} from '../../../src/services/edgeRateLimiter.js';

interface D1PreparedStatement {
  bind: (...params: unknown[]) => D1PreparedStatement;
  first: <T>() => Promise<T | null>;
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
  const rateLimitKey = `supplier_growth:${clientIp}`;
  const rateLimit = checkRateLimit(rateLimitKey, 120, 60_000);
  const rateLimitHeaders = getRateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return Response.json(
      { newLinksCount: 0, sinceDate: '', error: 'Too many requests. Please slow down.' },
      { status: 429, headers: { ...rateLimitHeaders, 'X-Content-Type-Options': 'nosniff' } }
    );
  }

  const db = context.env.DB;
  if (!db) {
    return Response.json(
      { newLinksCount: 0, sinceDate: '', error: 'Supplier database is not configured.' },
      { status: 503, headers: { ...rateLimitHeaders, 'X-Content-Type-Options': 'nosniff' } }
    );
  }

  const result = await handleSupplierGrowthRequest({
    countPromotionsSince: async (sinceIso: string) => {
      const row = await db
        .prepare('SELECT COUNT(*) AS cnt FROM program_suppliers WHERE promoted_at IS NOT NULL AND promoted_at >= ?;')
        .bind(sinceIso)
        .first<{ cnt: number }>();
      return row?.cnt ?? 0;
    }
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    ...rateLimitHeaders,
    'Cache-Control': result.error ? 'no-store' : 'public, s-maxage=3600, stale-while-revalidate=86400'
  };

  return new Response(JSON.stringify(result), { status: result.error ? 502 : 200, headers });
}
