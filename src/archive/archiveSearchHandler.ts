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
import { ArchivedStoryRow, fromArchivedStoryRow } from './archiveRow.js';
import { buildSearchArchiveStatement, buildBrowseArchiveStatement } from './d1QueryBuilder.js';

export interface ArchiveSearchDependencies {
  runQuery: (sql: string, params: unknown[]) => Promise<ArchivedStoryRow[]>;
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

export async function handleArchiveSearchRequest(
  rawQuery: string,
  deps: ArchiveSearchDependencies,
  options: ArchiveSearchOptions = {}
): Promise<ArchiveSearchResult> {
  const limit = options.limit ?? DEFAULT_PAGE_SIZE;
  const cursor = options.cursor ?? null;
  const trimmedQuery = rawQuery.trim();

  // Fetch one extra row so we can tell whether another page exists without
  // a separate COUNT query.
  const statement = trimmedQuery
    ? buildSearchArchiveStatement(trimmedQuery, limit + 1, cursor)
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
      stories.push(fromArchivedStoryRow(row));
    } catch {
      // Skip a corrupt row rather than failing the whole page.
    }
  }

  const lastRow = pageRows[pageRows.length - 1];
  const nextCursor = hasMore && lastRow ? lastRow.archived_at : null;

  return { stories, nextCursor };
}
