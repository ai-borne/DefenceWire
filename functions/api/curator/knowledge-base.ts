/**
 * Cloudflare Pages Function: /api/curator/knowledge-base
 * Read-only, paginated/sortable/filterable view over Phase 1-4's D1 tables
 * for the Curator Desk's Knowledge Base tab (Phase 5). GET only — this is a
 * pure read layer, no mutation endpoint exists here.
 * Hard limit: <= 300 LOC.
 */

import { handleGetKnowledgeBase, CuratorKnowledgeBaseDependencies } from '../../../src/services/curatorKnowledgeBaseHandler.js';
import { verifyCuratorAuthorization } from '../../../src/services/curatorAuthHandler.js';

interface D1PreparedStatement {
  bind: (...params: unknown[]) => D1PreparedStatement;
  all: <T>() => Promise<{ results: T[] }>;
}

interface D1Database {
  prepare: (sql: string) => D1PreparedStatement;
}

interface PagesFunctionContext {
  request: Request;
  env: {
    DB?: D1Database;
    CURATOR_SESSION_SECRET?: string;
    CURATOR_SESSION_EPOCH?: string;
    CURATOR_TEAM_DOMAIN?: string;
  };
}

export async function onRequestGet(context: PagesFunctionContext): Promise<Response> {
  const db = context.env.DB;
  if (!db) {
    return Response.json({ success: false, error: 'D1 database not configured' }, { status: 503 });
  }

  const url = new URL(context.request.url);
  const cookieHeader = context.request.headers.get('cookie');
  const secret = context.env.CURATOR_SESSION_SECRET;
  const epoch = context.env.CURATOR_SESSION_EPOCH;
  const authContext = await verifyCuratorAuthorization(
    context.request.headers,
    cookieHeader,
    secret,
    context.env.CURATOR_TEAM_DOMAIN,
    globalThis.fetch,
    epoch
  );

  const deps: CuratorKnowledgeBaseDependencies = {
    runQuery: async (sql, params) => {
      const { results } = await db.prepare(sql).bind(...params).all<Record<string, unknown>>();
      return results;
    }
  };

  const result = await handleGetKnowledgeBase(
    {
      table: url.searchParams.get('table') || '',
      page: url.searchParams.has('page') ? Number(url.searchParams.get('page')) : undefined,
      pageSize: url.searchParams.has('pageSize') ? Number(url.searchParams.get('pageSize')) : undefined,
      sortBy: url.searchParams.get('sortBy') || undefined,
      sortDir: url.searchParams.get('sortDir') || undefined,
      filter: url.searchParams.get('filter') || undefined
    },
    deps,
    cookieHeader,
    secret,
    authContext.authorized
  );

  return Response.json(result, {
    status: result.success ? 200 : authContext.authorized ? 400 : 401,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
  });
}
