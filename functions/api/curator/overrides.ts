/**
 * Cloudflare Pages Function: /api/curator/overrides
 * Thin runtime adapter for Curator D1 overrides with Zero Trust audit trail.
 * Hard limit: <= 300 LOC.
 */

import {
  handleGetOverrides,
  handleSaveOverride,
  handleDeleteOverride,
  CuratorOverrideRequest,
  CuratorOverrideRow
} from '../../../src/services/curatorOverrideHandler.js';
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
  };
}

export async function onRequestGet(context: PagesFunctionContext): Promise<Response> {
  const db = context.env.DB;
  if (!db) {
    return Response.json({ success: false, error: 'D1 database not configured' }, { status: 503 });
  }

  const cookieHeader = context.request.headers.get('cookie');
  const secret = context.env.CURATOR_SESSION_SECRET;
  const authContext = await verifyCuratorAuthorization(context.request.headers, cookieHeader, secret);

  const result = await handleGetOverrides(
    {
      runQuery: async (sql, params) => {
        const { results } = await db.prepare(sql).bind(...params).all<CuratorOverrideRow>();
        return results;
      }
    },
    cookieHeader,
    secret,
    authContext.authorized
  );

  return Response.json(result, {
    status: result.success ? 200 : 500,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

export async function onRequestPost(context: PagesFunctionContext): Promise<Response> {
  const db = context.env.DB;
  if (!db) {
    return Response.json({ success: false, error: 'D1 database not configured' }, { status: 503 });
  }

  try {
    const body = (await context.request.json()) as CuratorOverrideRequest;
    const cookieHeader = context.request.headers.get('cookie');
    const secret = context.env.CURATOR_SESSION_SECRET;
    const authContext = await verifyCuratorAuthorization(context.request.headers, cookieHeader, secret);

    if (!authContext.authorized) {
      return Response.json({ success: false, error: 'Unauthorized: Valid curator session required.' }, { status: 401 });
    }

    const result = await handleSaveOverride(
      body,
      cookieHeader,
      {
        runQuery: async (sql, params) => {
          const { results } = await db.prepare(sql).bind(...params).all<CuratorOverrideRow>();
          return results;
        },
        runMutation: async (sql, params) => {
          return await db.prepare(sql).bind(...params).run();
        },
        verifyAuth: async () => true
      },
      secret,
      authContext.email || 'curator@institutional.internal'
    );

    return Response.json(result, {
      status: result.success ? 200 : 400,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch {
    return Response.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }
}

export async function onRequestDelete(context: PagesFunctionContext): Promise<Response> {
  const db = context.env.DB;
  if (!db) {
    return Response.json({ success: false, error: 'D1 database not configured' }, { status: 503 });
  }

  const url = new URL(context.request.url);
  const id = url.searchParams.get('id') || '';
  const cookieHeader = context.request.headers.get('cookie');
  const secret = context.env.CURATOR_SESSION_SECRET;
  const authContext = await verifyCuratorAuthorization(context.request.headers, cookieHeader, secret);

  if (!authContext.authorized) {
    return Response.json({ success: false, error: 'Unauthorized: Valid curator session required.' }, { status: 401 });
  }

  const result = await handleDeleteOverride(
    id,
    cookieHeader,
    {
      runQuery: async (sql, params) => {
        const { results } = await db.prepare(sql).bind(...params).all<CuratorOverrideRow>();
        return results;
      },
      runMutation: async (sql, params) => {
        return await db.prepare(sql).bind(...params).run();
      },
      verifyAuth: async () => true
    },
    secret
  );

  return Response.json(result, {
    status: result.success ? 200 : 400,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
