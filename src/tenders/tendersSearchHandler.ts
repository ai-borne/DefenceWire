/**
 * Tender Search Orchestration Handler for DefenceWire.in (MOAT3 Phase 4)
 * Edge-agnostic core behind functions/api/tenders/search.ts, mirroring
 * src/archive/archiveSearchHandler.ts's shape exactly: injected runQuery
 * (Dependency Inversion) so it is fully unit-testable without a D1 or
 * Workers runtime.
 *
 * Serves two modes behind one shape: an FTS keyword search when `q` is
 * given, and a status/domain/closingBefore-filtered "browse" listing when
 * it's blank — both keyset-paginated on last_seen_at, default status filter
 * 'active' so the common "show me open tenders" path never scans closed rows.
 * Hard limit: <= 300 LOC.
 */

import { TenderRow } from '../archive/d1QueryBuilder.js';
import { buildSearchTendersStatement, buildBrowseTendersStatement } from './tenderSearchQueryBuilder.js';

export interface TendersSearchDependencies {
  runQuery: (sql: string, params: unknown[]) => Promise<TenderRow[]>;
}

export interface TendersSearchOptions {
  status?: string | null;
  domain?: string | null;
  closingBefore?: string | null;
  cursor?: string | null;
  limit?: number;
}

export interface TendersSearchResult {
  tenders: TenderRow[];
  nextCursor: string | null;
  error?: string;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const MAX_QUERY_LENGTH = 100;
const MAX_QUERY_TOKENS = 10;
const VALID_STATUSES = new Set(['active', 'closed', 'cancelled']);

/** Strips control characters and clamps length/token count, same DoS-hardening shape as the archive search input. */
function sanitizeSearchQueryInput(raw: string): string {
  const cleanChars = raw.replace(/[\x00-\x1F\x7F]/g, '');
  const clamped = cleanChars.slice(0, MAX_QUERY_LENGTH).trim();
  const tokens = clamped.split(/\s+/).filter(Boolean).slice(0, MAX_QUERY_TOKENS);
  return tokens.join(' ');
}

function sanitizeStatus(raw: string | null | undefined): string {
  const clean = (raw || '').trim().toLowerCase();
  return VALID_STATUSES.has(clean) ? clean : 'active';
}

function sanitizeDomain(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return raw.replace(/[\x00-\x1F\x7F]/g, '').slice(0, 40).trim() || null;
}

function sanitizeIsoDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const clean = raw.replace(/[\x00-\x1F\x7F]/g, '').slice(0, 40).trim();
  return Number.isNaN(Date.parse(clean)) ? null : clean;
}

export async function handleTendersSearchRequest(
  rawQuery: string,
  deps: TendersSearchDependencies,
  options: TendersSearchOptions = {}
): Promise<TendersSearchResult> {
  const limit = Math.min(Math.max(1, options.limit ?? DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
  const cursor = options.cursor ? options.cursor.slice(0, 100).trim() : null;
  const status = sanitizeStatus(options.status);
  const domain = sanitizeDomain(options.domain);
  const closingBefore = sanitizeIsoDate(options.closingBefore);
  const sanitizedQuery = sanitizeSearchQueryInput(rawQuery);

  // Fetch one extra row to detect hasMore without a separate COUNT query.
  const statement = sanitizedQuery
    ? buildSearchTendersStatement(sanitizedQuery, status, limit + 1, cursor)
    : buildBrowseTendersStatement({ status, domain, closingBefore }, cursor, limit + 1);

  let rows: TenderRow[];
  try {
    rows = await deps.runQuery(statement.sql, statement.params);
  } catch {
    return { tenders: [], nextCursor: null, error: 'Tender search is temporarily unavailable.' };
  }

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const lastRow = pageRows[pageRows.length - 1];
  const nextCursor = hasMore && lastRow ? lastRow.last_seen_at : null;

  return { tenders: pageRows, nextCursor };
}
