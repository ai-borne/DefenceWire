/**
 * Cloudflare Pages Function: /api/curator/supplier-candidates
 * Curator Desk click-through review for the Phase 2.6 supplier growth
 * pipeline — same Zero Trust / passcode session as story curation.
 * Hard limit: <= 300 LOC.
 */

import {
  handleListSupplierCandidates,
  handleReviewSupplierCandidate,
  SupplierCandidateReviewRequest,
  SupplierCandidateRow
} from '../../../src/services/curatorSupplierCandidateHandler.js';
import { verifyCuratorAuthorization } from '../../../src/services/curatorAuthHandler.js';

interface D1PreparedStatement {
  bind: (...params: unknown[]) => D1PreparedStatement;
  all: <T>() => Promise<{ results: T[] }>;
  run: () => Promise<unknown>;
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

  const result = await handleListSupplierCandidates(
    {
      runQuery: async (sql, params) => {
        const { results } = await db.prepare(sql).bind(...params).all<SupplierCandidateRow>();
        return results as unknown as Record<string, unknown>[];
      }
    },
    cookieHeader,
    secret,
    authContext.authorized
  );

  return Response.json(result, {
    status: result.success ? 200 : authContext.authorized ? 500 : 401,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
  });
}

export async function onRequestPost(context: PagesFunctionContext): Promise<Response> {
  const db = context.env.DB;
  if (!db) {
    return Response.json({ success: false, error: 'D1 database not configured' }, { status: 503 });
  }

  try {
    const body = (await context.request.json()) as SupplierCandidateReviewRequest;
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

    if (!authContext.authorized) {
      return Response.json({ success: false, error: 'Unauthorized: Valid curator session required.' }, { status: 401 });
    }

    const result = await handleReviewSupplierCandidate(
      body,
      cookieHeader,
      {
        runQuery: async (sql, params) => {
          const { results } = await db.prepare(sql).bind(...params).all<Record<string, unknown>>();
          return results;
        },
        runMutation: async (sql, params) => db.prepare(sql).bind(...params).run(),
        verifyAuth: async () => true
      },
      secret,
      authContext.email || 'curator@institutional.internal'
    );

    return Response.json(result, {
      status: result.success ? 200 : 400,
      headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
    });
  } catch {
    return Response.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }
}
