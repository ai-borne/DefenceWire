/**
 * Cloudflare Pages Function: GET /api/archive/search?q=...
 * Thin runtime adapter only — all logic lives in the tested, edge-agnostic
 * src/archive/archiveSearchHandler.ts, which this file wires to the real D1
 * binding declared in wrangler.toml.
 * Hard limit: <= 300 LOC.
 */

import { handleArchiveSearchRequest } from '../../../src/archive/archiveSearchHandler.js';
import type { ArchivedStoryRow } from '../../../src/archive/archiveRow.js';

interface D1PreparedStatement {
  bind: (...params: unknown[]) => D1PreparedStatement;
  all: <T>() => Promise<{ results: T[] }>;
}

interface D1Database {
  prepare: (sql: string) => D1PreparedStatement;
}

interface R2ObjectBody {
  text: () => Promise<string>;
}

interface R2Bucket {
  get: (key: string) => Promise<R2ObjectBody | null>;
}

interface PagesFunctionContext {
  request: Request;
  env: { DB?: D1Database; ARCHIVE_MEDIA?: R2Bucket };
}

export async function onRequestGet(context: PagesFunctionContext): Promise<Response> {
  const url = new URL(context.request.url);
  const rawQuery = url.searchParams.get('q') ?? '';
  const cursor = url.searchParams.get('before');
  const db = context.env.DB;
  const bucket = context.env.ARCHIVE_MEDIA;

  if (!db) {
    return Response.json({ stories: [], nextCursor: null, error: 'Archive database is not configured.' }, { status: 503 });
  }

  const result = await handleArchiveSearchRequest(
    rawQuery,
    {
      runQuery: async (sql, params) => {
        const { results } = await db.prepare(sql).bind(...params).all<ArchivedStoryRow>();
        return results;
      },
      getClusterJson: async (id) => {
        if (!bucket) return null;
        const obj = await bucket.get(`${id}.json`);
        return obj ? obj.text() : null;
      }
    },
    { cursor }
  );

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff'
  };

  if (!result.error) {
    headers['Cache-Control'] = 'public, max-age=60, s-maxage=300, stale-while-revalidate=600';
  } else {
    headers['Cache-Control'] = 'no-store';
  }

  return new Response(JSON.stringify(result), {
    status: result.error ? 502 : 200,
    headers
  });
}
