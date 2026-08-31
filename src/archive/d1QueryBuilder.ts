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
 * produce a MATCH syntax error.
 */
export function sanitizeFtsQuery(rawQuery: string): string {
  const tokens = rawQuery.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return '';
  return tokens.map((token) => `"${token.replace(/"/g, '""')}"`).join(' ');
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
  const cursorClause = cursor ? 'AND a.archived_at < ?' : '';
  return {
    sql: `SELECT a.* FROM archived_stories_fts f
          JOIN archived_stories a ON a.rowid = f.rowid
          WHERE archived_stories_fts MATCH ? ${cursorClause}
          ORDER BY a.archived_at DESC
          LIMIT ?`,
    params: cursor ? [sanitizeFtsQuery(rawQuery), cursor, limit] : [sanitizeFtsQuery(rawQuery), limit]
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
