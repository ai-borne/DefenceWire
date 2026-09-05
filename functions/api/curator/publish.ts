/**
 * Cloudflare Pages Function: /api/curator/publish
 * Thin runtime adapter for the one-push "go live" curator publish flow:
 * bulk-upserts curator_overrides, writes the live KV snapshot, records a
 * published_snapshots row (pruned to the last 20), and purges the
 * NEWS_FEED edge cache tag so the change is visible immediately.
 * Hard limit: <= 300 LOC.
 */

import {
  handleCuratorPublish,
  CuratorPublishPayload
} from '../../../src/services/curatorPublishHandler.js';
import { verifyCuratorAuthorization } from '../../../src/services/curatorAuthHandler.js';
import { purgeEdgeCacheByTags } from '../../../src/seo/edgeCache.js';
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
  const db = context.env.DB;
  const kv = context.env.NEWS_LIVE;
  if (!db || !kv) {
    return Response.json(
      { success: false, error: 'D1 database or NEWS_LIVE KV namespace not configured' },
      { status: 503 }
    );
  }

  let body: CuratorPublishPayload;
  try {
    body = (await context.request.json()) as CuratorPublishPayload;
  } catch {
    return Response.json({ success: false, error: 'Invalid request body' }, { status: 400 });
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

  if (!authContext.authorized) {
    return Response.json({ success: false, error: 'Unauthorized: Valid curator session required.' }, { status: 401 });
  }

  const result = await handleCuratorPublish(
    body,
    cookieHeader,
    {
      runQuery: async (sql, params) => {
        const { results } = await db.prepare(sql).bind(...params).all<CuratorOverrideRow>();
        return results;
      },
      runMutation: async (sql, params) => db.prepare(sql).bind(...params).run(),
      verifyAuth: async () => true,
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
}
