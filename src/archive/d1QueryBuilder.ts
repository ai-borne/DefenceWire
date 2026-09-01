/**
 * D1 Query Builder SSOT for DefenceWire.in
 * The exact SQL/params pairs used to write and read the archive, shared by
 * the crawler's REST-API write path (crawler/archiveSync.ts) and the Pages
 * Function's D1-binding read path (functions/api/archive/search.ts), so the
 * two surfaces never drift onto incompatible query shapes.
 * Hard limit: <= 300 LOC.
 */

import { ArchivedStoryRow } from './archiveRow.js';

export interface D1Statement {
  sql: string;
  params: unknown[];
}

const DEFAULT_SEARCH_LIMIT = 30;

export function buildInsertArchivedStoryStatement(row: ArchivedStoryRow): D1Statement {
  return {
    sql: `INSERT OR IGNORE INTO archived_stories
      (id, synthesized_headline, snippet, primary_source_name, primary_source_url, primary_source_published_at, categories, entities, defence_score, cluster_json, archived_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    params: [
      row.id,
      row.synthesized_headline,
      row.snippet,
      row.primary_source_name,
      row.primary_source_url,
      row.primary_source_published_at,
      row.categories,
      row.entities,
      row.defence_score,
      row.cluster_json,
      row.archived_at
    ]
  };
}

/**
 * Wraps each whitespace-separated token as a quoted FTS5 phrase so
 * user-typed search text (hyphens, colons, boolean keywords) can never
 * produce a MATCH syntax error or wildcard token explosion.
 */
export function sanitizeFtsQuery(rawQuery: string): string {
  if (!rawQuery || typeof rawQuery !== 'string') return '';
  const clean = rawQuery.replace(/[\x00-\x1F\x7F]/g, '').slice(0, 100).trim();
  const tokens = clean.split(/\s+/).filter(Boolean).slice(0, 10);
  if (tokens.length === 0) return '';
  return tokens.map((token) => `"${token.slice(0, 40).replace(/"/g, '""')}"`).join(' ');
}

/**
 * Queries related archived stories for an entity using the indexed FTS5 virtual table
 * rather than unindexed full-table LIKE scans.
 */
export function buildEntityRelatedStoriesStatement(
  rawEntity: string,
  limit: number = 20
): D1Statement {
  const cleanLimit = Math.min(50, Math.max(1, limit));
  const sanitizedQuery = sanitizeFtsQuery(rawEntity);
  return {
    sql: `SELECT a.id, a.cluster_json FROM archived_stories_fts f
          JOIN archived_stories a ON a.rowid = f.rowid
          WHERE archived_stories_fts MATCH ?
          ORDER BY a.archived_at DESC
          LIMIT ?`,
    params: [sanitizedQuery, cleanLimit]
  };
}

/**
 * FTS5 keyword search, optionally paginated with a keyset cursor (the
 * archived_at of the last row seen) rather than OFFSET, so page N stays
 * just as fast as page 1 no matter how deep the archive grows.
 */
export function buildSearchArchiveStatement(
  rawQuery: string,
  limit: number = DEFAULT_SEARCH_LIMIT,
  cursor: string | null = null
): D1Statement {
  const cleanLimit = Math.min(50, Math.max(1, limit));
  const cursorClause = cursor ? 'AND a.archived_at < ?' : '';
  return {
    sql: `SELECT a.* FROM archived_stories_fts f
          JOIN archived_stories a ON a.rowid = f.rowid
          WHERE archived_stories_fts MATCH ? ${cursorClause}
          ORDER BY a.archived_at DESC
          LIMIT ?`,
    params: cursor ? [sanitizeFtsQuery(rawQuery), cursor, cleanLimit] : [sanitizeFtsQuery(rawQuery), cleanLimit]
  };
}

/**
 * Date-descending listing of the whole archive with no search term, for the
 * default "browse" view. Same keyset cursor pattern as the search statement.
 */
export function buildBrowseArchiveStatement(cursor: string | null = null, limit: number = DEFAULT_SEARCH_LIMIT): D1Statement {
  const cursorClause = cursor ? 'WHERE archived_at < ?' : '';
  return {
    sql: `SELECT * FROM archived_stories
          ${cursorClause}
          ORDER BY archived_at DESC
          LIMIT ?`,
    params: cursor ? [cursor, limit] : [limit]
  };
}

/**
 * Selects a batch of rows still carrying the pre-Phase-3 cluster_json in D1,
 * for the one-off backfill script that migrates them to R2. No offset/cursor
 * needed — every migrated row nulls its own cluster_json, so this same query
 * always returns the remaining work, making the backfill naturally resumable.
 */
export function buildSelectClusterJsonBackfillStatement(limit: number): D1Statement {
  return {
    sql: `SELECT id, cluster_json FROM archived_stories WHERE cluster_json IS NOT NULL LIMIT ?`,
    params: [limit]
  };
}

/** Clears cluster_json for one row once its payload is confirmed written to R2. */
export function buildNullClusterJsonStatement(id: string): D1Statement {
  return {
    sql: `UPDATE archived_stories SET cluster_json = NULL WHERE id = ?`,
    params: [id]
  };
}

/**
 * Removes archived rows for ids that are back in the live feed. A cluster
 * can drop out of the top-N/72h window on one crawl and re-enter on a
 * later one (its source article is still fresh) — without this, it would
 * stay permanently archived even while showing live, i.e. duplicated.
 */
export function buildDeleteArchivedStoriesStatement(ids: string[]): D1Statement {
  const placeholders = ids.map(() => '?').join(', ');
  return {
    sql: `DELETE FROM archived_stories WHERE id IN (${placeholders})`,
    params: [...ids]
  };
}
