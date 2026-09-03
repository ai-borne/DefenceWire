/**
 * Cloudflare Pages Function: GET /api/suppliers/:slug
 * Edge endpoint returning a full verified supplier dossier — capabilities,
 * certifications and linked strategic programs. Wire-mention cross-linking
 * is deferred to Phase 2.4 (UI wiring).
 * Hard limit: <= 300 LOC.
 */

import {
  handleSupplierDossierRequest,
  ProgramSupplierLinkDbRow,
  SupplierCapabilityDbRow
} from '../../../src/services/supplierDossierHandler.js';
import { SupplierDbRow } from '../../../src/services/supplierDirectoryHandler.js';
import {
  checkRateLimit,
  getClientIp,
  getRateLimitHeaders
} from '../../../src/services/edgeRateLimiter.js';

interface D1PreparedStatement {
  bind: (...params: unknown[]) => D1PreparedStatement;
  all: <T>() => Promise<{ results: T[] }>;
  first: <T>() => Promise<T | null>;
}

interface D1Database {
  prepare: (sql: string) => D1PreparedStatement;
}

interface PagesFunctionContext {
  request: Request;
  params: { slug?: string };
  env: { DB?: D1Database };
}

export async function onRequestGet(context: PagesFunctionContext): Promise<Response> {
  const clientIp = getClientIp(context.request.headers);
  const rateLimitKey = `supplier_dossier:${clientIp}`;
  const rateLimit = checkRateLimit(rateLimitKey, 120, 60_000);
  const rateLimitHeaders = getRateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return Response.json(
      { supplier: null, error: 'Too many dossier requests. Please slow down.' },
      { status: 429, headers: { ...rateLimitHeaders, 'X-Content-Type-Options': 'nosniff' } }
    );
  }

  const slug = context.params.slug || '';
  const db = context.env.DB;

  if (!db) {
    return Response.json(
      { supplier: null, error: 'Supplier dossier database is not configured.' },
      { status: 503, headers: { ...rateLimitHeaders, 'X-Content-Type-Options': 'nosniff' } }
    );
  }

  const result = await handleSupplierDossierRequest(slug, {
    querySupplier: async (cleanSlug: string) => {
      const sql = 'SELECT * FROM suppliers WHERE slug = ? LIMIT 1;';
      return db.prepare(sql).bind(cleanSlug).first<SupplierDbRow>();
    },
    queryCapabilities: async (supplierId: string) => {
      const sql = 'SELECT * FROM supplier_capabilities WHERE supplier_id = ?;';
      const { results } = await db.prepare(sql).bind(supplierId).all<SupplierCapabilityDbRow>();
      return results;
    },
    queryLinkedPrograms: async (supplierId: string) => {
      const sql = 'SELECT * FROM program_suppliers WHERE supplier_id = ?;';
      const { results } = await db.prepare(sql).bind(supplierId).all<ProgramSupplierLinkDbRow>();
      return results;
    }
  });

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

  const status = result.error ? (result.error === 'Supplier not found.' ? 404 : 502) : 200;

  return new Response(JSON.stringify(result), { status, headers });
}
