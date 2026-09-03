/**
 * Cloudflare Pages Function: GET /api/suppliers
 * Edge endpoint listing the verified Indian Defence MSME & Supplier Directory,
 * filterable by tier/capability/corridor/search with cursor pagination.
 * Hard limit: <= 300 LOC.
 */

import {
  handleSupplierDirectoryRequest,
  SupplierDbRow
} from '../../../src/services/supplierDirectoryHandler.js';
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
  const rateLimitKey = `supplier_directory:${clientIp}`;
  const rateLimit = checkRateLimit(rateLimitKey, 120, 60_000);
  const rateLimitHeaders = getRateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return Response.json(
      { suppliers: [], nextCursor: null, error: 'Too many directory requests. Please slow down.' },
      { status: 429, headers: { ...rateLimitHeaders, 'X-Content-Type-Options': 'nosniff' } }
    );
  }

  const db = context.env.DB;
  if (!db) {
    return Response.json(
      { suppliers: [], nextCursor: null, error: 'Supplier directory database is not configured.' },
      { status: 503, headers: { ...rateLimitHeaders, 'X-Content-Type-Options': 'nosniff' } }
    );
  }

  const url = new URL(context.request.url);
  const searchParams = url.searchParams;

  const result = await handleSupplierDirectoryRequest(
    {
      tier: searchParams.get('tier') || undefined,
      capabilityDomain: searchParams.get('capabilityDomain') || undefined,
      corridor: searchParams.get('corridor') || undefined,
      query: searchParams.get('query') || undefined,
      cursor: searchParams.get('cursor') || undefined,
      limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined
    },
    {
      querySuppliers: async ({ tier, capabilityDomain, corridor, likePattern, cursor, limit }) => {
        const conditions: string[] = [];
        const params: unknown[] = [];
        let sql = 'SELECT DISTINCT s.* FROM suppliers s';

        if (capabilityDomain) {
          sql += ' JOIN supplier_capabilities sc ON sc.supplier_id = s.id';
          conditions.push('sc.capability_domain = ?');
          params.push(capabilityDomain);
        }
        if (tier) {
          conditions.push('s.tier = ?');
          params.push(tier);
        }
        if (corridor) {
          conditions.push('s.corridor = ?');
          params.push(corridor);
        }
        if (likePattern) {
          conditions.push("(s.name LIKE ? ESCAPE '\\' OR s.description LIKE ? ESCAPE '\\')");
          params.push(likePattern, likePattern);
        }
        if (cursor) {
          conditions.push('s.slug > ?');
          params.push(cursor);
        }

        if (conditions.length > 0) {
          sql += ' WHERE ' + conditions.join(' AND ');
        }
        sql += ' ORDER BY s.slug ASC LIMIT ?';
        params.push(limit);

        const { results } = await db.prepare(sql).bind(...params).all<SupplierDbRow>();
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
    headers['Cache-Control'] = 'public, s-maxage=3600, stale-while-revalidate=86400';
  } else {
    headers['Cache-Control'] = 'no-store';
  }

  const status = result.error ? 502 : 200;

  return new Response(JSON.stringify(result), { status, headers });
}
