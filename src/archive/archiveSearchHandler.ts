/**
 * Archive Search Orchestration Handler for DefenceWire.in
 * Edge-agnostic core behind functions/api/archive/search.ts. Depends only on
 * an injected runQuery callback (Dependency Inversion), so it is fully
 * unit-testable without a D1 or Workers runtime, and the Pages Function
 * itself stays a thin runtime adapter.
 *
 * Serves two modes behind one shape: an FTS keyword search when a query is
 * given, and a date-descending "browse" listing of the whole archive when
 * it's blank — both paginated with the same keyset cursor.
 * Hard limit: <= 300 LOC.
 */

import { StoryCluster } from '../types/news.js';
import { ArchivedStoryRow, GetClusterJson, fromArchivedStoryRow, ArchiveBindingUnavailableError } from './archiveRow.js';
import { buildSearchArchiveStatement, buildBrowseArchiveStatement } from './d1QueryBuilder.js';

export interface ArchiveSearchDependencies {
  runQuery: (sql: string, params: unknown[]) => Promise<ArchivedStoryRow[]>;
  getClusterJson?: GetClusterJson;
}

export interface ArchiveSearchOptions {
  cursor?: string | null;
  limit?: number;
}

export interface ArchiveSearchResult {
  stories: StoryCluster[];
  nextCursor: string | null;
  error?: string;
}

const DEFAULT_PAGE_SIZE = 30;
const MAX_PAGE_SIZE = 50;
const MAX_QUERY_LENGTH = 100;
const MAX_QUERY_TOKENS = 10;

/**
 * Sanitizes and clamps raw user search input to protect D1 from DoS/FTS injection.
 */
function sanitizeSearchQueryInput(raw: string): string {
  // 1. Strip non-printable and control characters
  const cleanChars = raw.replace(/[\x00-\x1F\x7F]/g, '');
  // 2. Clamp length to max 100 characters
  const clamped = cleanChars.slice(0, MAX_QUERY_LENGTH).trim();
  // 3. Limit to max 10 tokens
  const tokens = clamped.split(/\s+/).filter(Boolean).slice(0, MAX_QUERY_TOKENS);
  return tokens.join(' ');
}

export async function handleArchiveSearchRequest(
  rawQuery: string,
  deps: ArchiveSearchDependencies,
  options: ArchiveSearchOptions = {}
): Promise<ArchiveSearchResult> {
  const limit = Math.min(Math.max(1, options.limit ?? DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
  const cursor = options.cursor ? options.cursor.slice(0, 100).trim() : null;
  const sanitizedQuery = sanitizeSearchQueryInput(rawQuery);

  // Fetch one extra row so we can tell whether another page exists without
  // a separate COUNT query.
  const statement = sanitizedQuery
    ? buildSearchArchiveStatement(sanitizedQuery, limit + 1, cursor)
    : buildBrowseArchiveStatement(cursor, limit + 1);

  let rows: ArchivedStoryRow[];
  try {
    rows = await deps.runQuery(statement.sql, statement.params);
  } catch {
    return { stories: [], nextCursor: null, error: 'Archive search is temporarily unavailable.' };
  }

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;

  const stories: StoryCluster[] = [];
  for (const row of pageRows) {
    try {
      stories.push(await fromArchivedStoryRow(row, deps.getClusterJson));
    } catch (err) {
      if (err instanceof ArchiveBindingUnavailableError) {
        // Config-level failure, not a per-row data issue — fail the whole
        // request loudly rather than silently thinning out the results.
        return { stories: [], nextCursor: null, error: 'Archive media storage is not configured.' };
      }
      // Skip a corrupt row or unresolved R2 blob rather than failing the whole page.
    }
  }

  const lastRow = pageRows[pageRows.length - 1];
  const nextCursor = hasMore && lastRow ? lastRow.archived_at : null;

  return { stories, nextCursor };
}
