/**
 * Cloudflare Pages Function: /api/curator/ingest
 * Thin runtime adapter for ad-hoc curator ingestion by URL or pasted text
 * (Phase 4). Auth-gated, rate-limited, and delegates all clustering/SSRF/
 * publish logic to curatorIngestHandler.ts.
 * Hard limit: <= 300 LOC.
 */

import {
  handleCuratorIngest,
  CuratorIngestRequest
} from '../../../src/services/curatorIngestHandler.js';
import { verifyCuratorAuthorization } from '../../../src/services/curatorAuthHandler.js';
import { purgeEdgeCacheByTags } from '../../../src/seo/edgeCache.js';
import { checkRateLimit, getClientIp, getRateLimitHeaders } from '../../../src/services/edgeRateLimiter.js';
import { STRINGS } from '../../../src/resources/strings.js';
import type { StoryCluster, StorySourceItem } from '../../../src/types/news.js';
import type { CuratorOverrideRow } from '../../../src/services/curatorOverrideHandler.js';

interface D1PreparedStatement {
  bind: (...params: unknown[]) => D1PreparedStatement;
  all: <T>() => Promise<{ results: T[] }>;
  run: () => Promise<unknown>;
}

interface D1Database {
  prepare: (sql: string) => D1PreparedStatement;
}

interface KVNamespace {
  get: (key: string) => Promise<string | null>;
  put: (key: string, value: string) => Promise<void>;
}

interface PagesFunctionContext {
  request: Request;
  env: {
    DB?: D1Database;
    NEWS_LIVE?: KVNamespace;
    CURATOR_SESSION_SECRET?: string;
    CURATOR_SESSION_EPOCH?: string;
    CLOUDFLARE_ZONE_ID?: string;
    CLOUDFLARE_API_TOKEN?: string;
  };
}

export async function onRequestPost(context: PagesFunctionContext): Promise<Response> {
  const clientIp = getClientIp(context.request.headers);
  const rateLimit = checkRateLimit(`ingest:${clientIp}`, 10, 60_000);
  const rateLimitHeaders = getRateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return Response.json(
      { success: false, error: STRINGS.errors.rateLimitExceeded },
      { status: 429, headers: { ...rateLimitHeaders, 'X-Content-Type-Options': 'nosniff' } }
    );
  }

  const db = context.env.DB;
  const kv = context.env.NEWS_LIVE;
  if (!db || !kv) {
    return Response.json(
      { success: false, error: 'D1 database or NEWS_LIVE KV namespace not configured' },
      { status: 503, headers: { ...rateLimitHeaders, 'X-Content-Type-Options': 'nosniff' } }
    );
  }

  const cookieHeader = context.request.headers.get('cookie');
  const secret = context.env.CURATOR_SESSION_SECRET;
  const epoch = context.env.CURATOR_SESSION_EPOCH;
  const authContext = await verifyCuratorAuthorization(
    context.request.headers,
    cookieHeader,
    secret,
    undefined,
    globalThis.fetch,
    epoch
  );

  let body: CuratorIngestRequest | null = null;
  try {
    body = (await context.request.json()) as CuratorIngestRequest;
  } catch {
    body = null;
  }

  const { status, result } = await handleCuratorIngest(
    body,
    authContext.authorized,
    {
      fetchFn: globalThis.fetch,
      getLiveSnapshot: async () => {
        const snapshot = await kv.get('live_snapshot');
        if (!snapshot) return null;
        try {
          return JSON.parse(snapshot) as { clusters: StoryCluster[]; river: StorySourceItem[] };
        } catch {
          return null;
        }
      },
      runQuery: async (sql, params) => {
        const { results } = await db.prepare(sql).bind(...params).all<CuratorOverrideRow>();
        return results;
      },
      runMutation: async (sql, params) => db.prepare(sql).bind(...params).run(),
      kvPut: async (key, value) => {
        await kv.put(key, value);
      },
      insertSnapshot: async (snapshotJson, publishedAt, curatorEmail) => {
        await db
          .prepare('INSERT INTO published_snapshots (snapshot_json, published_at, curator_email) VALUES (?, ?, ?)')
          .bind(snapshotJson, publishedAt, curatorEmail)
          .run();
      },
      pruneSnapshots: async (keep) => {
        await db
          .prepare(
            `DELETE FROM published_snapshots WHERE id NOT IN (
               SELECT id FROM published_snapshots ORDER BY published_at DESC LIMIT ?
             )`
          )
          .bind(keep)
          .run();
      },
      purgeCache: async (tags) => {
        const zoneId = context.env.CLOUDFLARE_ZONE_ID;
        const apiToken = context.env.CLOUDFLARE_API_TOKEN;
        if (!zoneId || !apiToken) {
          return { success: false, error: 'Cloudflare credentials not configured' };
        }
        return purgeEdgeCacheByTags(tags, { zoneId, apiToken });
      }
    },
    authContext.email || 'curator@institutional.internal'
  );

  return Response.json(result, {
    status,
    headers: { ...rateLimitHeaders, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
  });
}
