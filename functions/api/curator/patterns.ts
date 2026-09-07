/**
 * Cloudflare Pages Function: /api/curator/patterns
 * Curator Desk review for Phase 5 emergent pattern hypotheses.
 * Gated by Cloudflare Zero Trust / Passcode session.
 * Hard limit: <= 300 LOC.
 */

import {
  handleListPatterns,
  handleReviewPattern
} from '../../../src/services/curatorPatternHandler.js';
import { verifyCuratorAuthorization } from '../../../src/services/curatorAuthHandler.js';
import { PatternReviewRequest, PatternStatus } from '../../../src/types/patterns.js';
import {
  buildZoneConfigFromEnv,
  purgeEdgeCacheByUrls,
  purgeEdgeCacheByTags,
  EDGE_CACHE_URLS
} from '../../../src/seo/edgeCache.js';

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
    CLOUDFLARE_ZONE_ID?: string;
    CLOUDFLARE_API_TOKEN?: string;
  };
}

export async function onRequestGet(context: PagesFunctionContext): Promise<Response> {
  const db = context.env.DB;
  if (!db) {
    return Response.json({ success: false, error: 'D1 database not configured' }, { status: 503 });
  }

  const url = new URL(context.request.url);
  const statusParam = url.searchParams.get('status') as PatternStatus | 'all' | null;
  const limitParam = Number(url.searchParams.get('limit')) || 50;
  const offsetParam = Number(url.searchParams.get('offset')) || 0;

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

  const result = await handleListPatterns(
    {
      runQuery: async (sql, params) => {
        const { results } = await db.prepare(sql).bind(...params).all();
        return results as unknown as Record<string, unknown>[];
      }
    },
    {
      status: statusParam || undefined,
      limit: limitParam,
      offset: offsetParam
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
    const body = (await context.request.json()) as PatternReviewRequest;
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

    const curatorEmail = authContext.email || 'curator@institutional.internal';

    const result = await handleReviewPattern(
      body,
      {
        runQuery: async (sql, params) => {
          const { results } = await db.prepare(sql).bind(...params).all();
          return results as unknown as Record<string, unknown>[];
        },
        runMutation: async (sql, params) => {
          return db.prepare(sql).bind(...params).run();
        },
        purgeCache: async (tags) => {
          const zoneConfig = buildZoneConfigFromEnv(context.env);
          if (!zoneConfig) return { success: false, error: 'Zone not configured' };
          await purgeEdgeCacheByUrls([EDGE_CACHE_URLS.PATTERNS], zoneConfig);
          return purgeEdgeCacheByTags(tags, zoneConfig);
        }
      },
      cookieHeader,
      secret,
      authContext.authorized,
      curatorEmail
    );

    return Response.json(result, {
      status: result.success ? 200 : 400,
      headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
    });
  } catch (err) {
    return Response.json(
      { success: false, error: err instanceof Error ? err.message : 'Invalid request body' },
      { status: 400 }
    );
  }
}
