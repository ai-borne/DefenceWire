/**
 * Cloudflare Pages Function: /api/curator/rollback
 * Thin runtime adapter for the "Rollback Last Publish" kill-switch: restores
 * a previous published_snapshots row into the NEWS_LIVE KV namespace and
 * purges the NEWS_FEED edge cache tag.
 * Hard limit: <= 300 LOC.
 */

import {
  handleCuratorRollback,
  CuratorRollbackRequest,
  PublishedSnapshotRow
} from '../../../src/services/curatorRollbackHandler.js';
import { verifyCuratorAuthorization } from '../../../src/services/curatorAuthHandler.js';
import { purgeEdgeCacheByTags } from '../../../src/seo/edgeCache.js';

interface D1PreparedStatement {
  bind: (...params: unknown[]) => D1PreparedStatement;
  all: <T>() => Promise<{ results: T[] }>;
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

  let body: CuratorRollbackRequest | null = null;
  try {
    const text = await context.request.text();
    if (text.trim().length > 0) {
      body = JSON.parse(text) as CuratorRollbackRequest;
    }
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

  const result = await handleCuratorRollback(
    body,
    cookieHeader,
    {
      runQuery: async (sql, params) => {
        const { results } = await db.prepare(sql).bind(...params).all<PublishedSnapshotRow>();
        return results;
      },
      verifyAuth: async () => true,
      kvPut: async (key, value) => {
        await kv.put(key, value);
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
    secret
  );

  return Response.json(result, {
    status: result.success ? 200 : (result.error === 'No prior published snapshot available to roll back to.' ? 404 : 400),
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
