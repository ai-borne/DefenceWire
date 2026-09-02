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

// ---------------------------------------------------------------------------
// Tenders (MOAT3) — same D1 REST write path (crawler/archiveSync.ts's
// executeD1Query), just a different table. Kept in this file per SSOT: one
// place for every D1 statement shape used across the crawler and the API.
// ---------------------------------------------------------------------------

export interface TenderRow {
  id: string;
  source: string;
  title: string;
  organisation_chain: string;
  reference_number: string | null;
  category: string | null;
  domain: string | null;
  published_at: string | null;
  closing_at: string | null;
  emd_amount: number | null;
  iddm_percent: number | null;
  program_ids: string | null;
  detail_url: string;
  pdf_r2_key: string | null;
  status: string;
  first_seen_at: string;
  last_seen_at: string;
}

/** Inserts a newly-seen tender, or refreshes the mutable fields (status/EMD/etc.) on one already tracked. */
export function buildUpsertTenderStatement(row: TenderRow): D1Statement {
  return {
    sql: `INSERT INTO tenders
      (id, source, title, organisation_chain, reference_number, category, domain, published_at, closing_at, emd_amount, iddm_percent, program_ids, detail_url, pdf_r2_key, status, first_seen_at, last_seen_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        organisation_chain = excluded.organisation_chain,
        category = excluded.category,
        domain = excluded.domain,
        closing_at = excluded.closing_at,
        emd_amount = excluded.emd_amount,
        iddm_percent = excluded.iddm_percent,
        program_ids = excluded.program_ids,
        pdf_r2_key = excluded.pdf_r2_key,
        status = excluded.status,
        last_seen_at = excluded.last_seen_at`,
    params: [
      row.id, row.source, row.title, row.organisation_chain, row.reference_number,
      row.category, row.domain, row.published_at, row.closing_at, row.emd_amount,
      row.iddm_percent, row.program_ids, row.detail_url, row.pdf_r2_key, row.status,
      row.first_seen_at, row.last_seen_at
    ]
  };
}

/** Flips one tender's status directly (e.g. source-reported cancellation), independent of the bulk lifecycle sweep. */
export function buildUpdateTenderStatusStatement(id: string, status: 'active' | 'closed' | 'cancelled'): D1Statement {
  return { sql: `UPDATE tenders SET status = ? WHERE id = ?`, params: [status, id] };
}

/** Bulk-transitions active tenders whose closing_at has passed the retention window to 'closed' — uses idx_tenders_closing_at. */
export function buildCloseStaleTendersStatement(cutoffIso: string): D1Statement {
  return {
    sql: `UPDATE tenders SET status = 'closed' WHERE status = 'active' AND closing_at IS NOT NULL AND closing_at < ?`,
    params: [cutoffIso]
  };
}

/**
 * Hard-deletes tenders closed for longer than the retention window, with no
 * program linkage and no curator override — mirrors the FTS5 delete trigger
 * (tenders_ad) so the index stays consistent automatically.
 */
export function buildDeleteStaleClosedTendersStatement(cutoffIso: string): D1Statement {
  return {
    sql: `DELETE FROM tenders WHERE status = 'closed' AND last_seen_at < ?
      AND (program_ids IS NULL OR program_ids = '[]')
      AND id NOT IN (SELECT id FROM curator_overrides)`,
    params: [cutoffIso]
  };
}

/** Records a source fetch success, resetting its circuit-breaker failure streak. */
export function buildUpsertTenderHealthSuccessStatement(source: string, nowIso: string): D1Statement {
  return {
    sql: `INSERT INTO tender_source_health (source, last_success_at, consecutive_failures, last_failure_reason, updated_at)
      VALUES (?, ?, 0, NULL, ?)
      ON CONFLICT(source) DO UPDATE SET
        last_success_at = excluded.last_success_at,
        consecutive_failures = 0,
        last_failure_reason = NULL,
        updated_at = excluded.updated_at`,
    params: [source, nowIso, nowIso]
  };
}

/** Records a source fetch failure (e.g. captcha_detected), incrementing its circuit-breaker failure streak. */
export function buildUpsertTenderHealthFailureStatement(source: string, reason: string, nowIso: string): D1Statement {
  return {
    sql: `INSERT INTO tender_source_health (source, last_success_at, consecutive_failures, last_failure_reason, updated_at)
      VALUES (?, NULL, 1, ?, ?)
      ON CONFLICT(source) DO UPDATE SET
        consecutive_failures = tender_source_health.consecutive_failures + 1,
        last_failure_reason = excluded.last_failure_reason,
        updated_at = excluded.updated_at`,
    params: [source, reason, nowIso]
  };
}
