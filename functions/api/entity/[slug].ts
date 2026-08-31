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
  const slug = context.params.slug || '';
  const db = context.env.DB;

  if (!db) {
    return Response.json(
      { entity: null, relatedStories: [], error: 'Dossier database is not configured.' },
      { status: 503 }
    );
  }

  const result = await handleEntityDossierRequest(slug, {
    queryEntity: async (entitySlug: string) => {
      const sql = 'SELECT * FROM discovered_entities WHERE id = ? LIMIT 1;';
      return db.prepare(sql).bind(entitySlug).first<DiscoveredEntityDbRow>();
    },
    queryRelatedStories: async (entitySlug: string, limit = 20) => {
      const sql = `SELECT cluster_json FROM archived_stories
        WHERE entities LIKE ? ESCAPE '\\' OR synthesized_headline LIKE ? ESCAPE '\\'
        ORDER BY archived_at DESC LIMIT ?;`;
      const searchPattern = `%${escapeSqlLikePattern(entitySlug)}%`;
      const { results } = await db
        .prepare(sql)
        .bind(searchPattern, searchPattern, limit)
        .all<{ cluster_json: string }>();
      return results;
    }
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff'
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
