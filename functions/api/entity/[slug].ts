/**
 * Cloudflare Pages Function: GET /api/entity/:slug
 * Edge endpoint returning comprehensive platform/missile dossiers and development timelines.
 * Hard limit: <= 300 LOC.
 */

import {
  handleEntityDossierRequest,
  escapeSqlLikePattern,
  DiscoveredEntityDbRow
} from '../../../src/services/entityDossierHandler.js';
import { ArchiveBindingUnavailableError } from '../../../src/archive/archiveRow.js';
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

interface R2ObjectBody {
  text: () => Promise<string>;
}

interface R2Bucket {
  get: (key: string) => Promise<R2ObjectBody | null>;
}

interface PagesFunctionContext {
  request: Request;
  params: { slug?: string };
  env: { DB?: D1Database; ARCHIVE_MEDIA?: R2Bucket };
}

export async function onRequestGet(context: PagesFunctionContext): Promise<Response> {
  const clientIp = getClientIp(context.request.headers);
  const rateLimitKey = `entity_dossier:${clientIp}`;
  const rateLimit = checkRateLimit(rateLimitKey, 120, 60_000);
  const rateLimitHeaders = getRateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return Response.json(
      { entity: null, relatedStories: [], error: 'Too many dossier requests. Please slow down.' },
      { status: 429, headers: { ...rateLimitHeaders, 'X-Content-Type-Options': 'nosniff' } }
    );
  }

  const slug = context.params.slug || '';
  const db = context.env.DB;
  const bucket = context.env.ARCHIVE_MEDIA;

  if (!db) {
    return Response.json(
      { entity: null, relatedStories: [], error: 'Dossier database is not configured.' },
      { status: 503, headers: { ...rateLimitHeaders, 'X-Content-Type-Options': 'nosniff' } }
    );
  }

  const result = await handleEntityDossierRequest(slug, {
    queryEntity: async (entitySlug: string) => {
      const sql = 'SELECT * FROM discovered_entities WHERE id = ? LIMIT 1;';
      return db.prepare(sql).bind(entitySlug).first<DiscoveredEntityDbRow>();
    },
    queryRelatedStories: async (entitySlug: string, limit = 20) => {
      const sql = `SELECT id, cluster_json FROM archived_stories
        WHERE entities LIKE ? ESCAPE '\\' OR synthesized_headline LIKE ? ESCAPE '\\'
        ORDER BY archived_at DESC LIMIT ?;`;
      const searchPattern = `%${escapeSqlLikePattern(entitySlug)}%`;
      const { results } = await db
        .prepare(sql)
        .bind(searchPattern, searchPattern, limit)
        .all<{ id: string; cluster_json: string | null }>();
      return results;
    },
    getClusterJson: async (id: string) => {
      if (!bucket) throw new ArchiveBindingUnavailableError('ARCHIVE_MEDIA R2 binding is not configured.');
      const obj = await bucket.get(`${id}.json`);
      return obj ? obj.text() : null;
    }
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    ...rateLimitHeaders
  };

  if (!result.error) {
    headers['Cache-Control'] = 'public, max-age=120, s-maxage=600, stale-while-revalidate=1200';
  } else {
    headers['Cache-Control'] = 'no-store';
  }

  const status = result.error ? (result.error === 'Entity not found.' ? 404 : 502) : 200;

  return new Response(JSON.stringify(result), {
    status,
    headers
  });
}
