/**
 * D1 Query Builder for the /api/tenders search & browse endpoint (MOAT3 Phase 4)
 * Split out from src/archive/d1QueryBuilder.ts (which already holds the
 * write-path tender statements from Phases 2-3) purely to stay under the
 * 300-LOC file limit — same SSOT discipline, just domain-scoped to the read
 * path this file's two callers (tendersSearchHandler.ts, its tests) use.
 * Hard limit: <= 300 LOC.
 */

import { D1Statement, sanitizeFtsQuery } from '../archive/d1QueryBuilder.js';

const DEFAULT_SEARCH_LIMIT = 20;

/** SSOT: which `source` column values back the iDEX/TDF innovation-grant tab vs the MoD tender tab. */
export const IDEX_TDF_SOURCES: readonly string[] = ['idex', 'tdf'];

/**
 * FTS5 keyword search over tenders, optionally paginated with a keyset
 * cursor (last_seen_at of the last row seen) — same shape as
 * buildSearchArchiveStatement. Always scoped to status first so the common
 * "show me open tenders" case uses idx_tenders_source before any FTS work.
 */
export function buildSearchTendersStatement(
  rawQuery: string,
  status: string,
  limit: number = DEFAULT_SEARCH_LIMIT,
  cursor: string | null = null
): D1Statement {
  // Capped at 51, not 50: the handler over-fetches by one row (limit+1) to
  // detect hasMore without a COUNT query, so the cap must accommodate that.
  const cleanLimit = Math.min(51, Math.max(1, limit));
  const cursorClause = cursor ? 'AND t.last_seen_at < ?' : '';
  return {
    sql: `SELECT t.* FROM tenders_fts f
          JOIN tenders t ON t.rowid = f.rowid
          WHERE tenders_fts MATCH ? AND t.status = ? ${cursorClause}
          ORDER BY t.last_seen_at DESC
          LIMIT ?`,
    params: cursor
      ? [sanitizeFtsQuery(rawQuery), status, cursor, cleanLimit]
      : [sanitizeFtsQuery(rawQuery), status, cleanLimit]
  };
}

/**
 * Default no-search-term listing: status/domain/closingBefore filters with
 * the same keyset cursor pagination, never OFFSET, so page depth never costs
 * more than page 1 as the table grows.
 */
export function buildBrowseTendersStatement(
  filters: { status: string; domain?: string | null; closingBefore?: string | null; sourceScope?: 'mod' | 'idex' | 'all' },
  cursor: string | null = null,
  limit: number = DEFAULT_SEARCH_LIMIT
): D1Statement {
  // Capped at 51, not 50: the handler over-fetches by one row (limit+1) to
  // detect hasMore without a COUNT query, so the cap must accommodate that.
  const cleanLimit = Math.min(51, Math.max(1, limit));
  const clauses = ['status = ?'];
  const params: unknown[] = [filters.status];

  if (filters.sourceScope === 'idex') {
    clauses.push(`source IN (${IDEX_TDF_SOURCES.map(() => '?').join(',')})`);
    params.push(...IDEX_TDF_SOURCES);
  } else if (filters.sourceScope === 'mod') {
    clauses.push(`source NOT IN (${IDEX_TDF_SOURCES.map(() => '?').join(',')})`);
    params.push(...IDEX_TDF_SOURCES);
  }
  if (filters.domain) {
    clauses.push('domain = ?');
    params.push(filters.domain);
  }
  if (filters.closingBefore) {
    clauses.push('closing_at IS NOT NULL AND closing_at < ?');
    params.push(filters.closingBefore);
  }
  if (cursor) {
    clauses.push('last_seen_at < ?');
    params.push(cursor);
  }
  params.push(cleanLimit);

  return {
    sql: `SELECT * FROM tenders
          WHERE ${clauses.join(' AND ')}
          ORDER BY last_seen_at DESC
          LIMIT ?`,
    params
  };
}
