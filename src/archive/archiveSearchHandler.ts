/**
 * Archive Search Orchestration Handler for DefenceWire.in
 * Edge-agnostic core behind functions/api/archive/search.ts. Depends only on
 * an injected runQuery callback (Dependency Inversion), so it is fully
 * unit-testable without a D1 or Workers runtime, and the Pages Function
 * itself stays a thin runtime adapter.
 * Hard limit: <= 300 LOC.
 */

import { StoryCluster } from '../types/news.js';
import { ArchivedStoryRow, fromArchivedStoryRow } from './archiveRow.js';
import { buildSearchArchiveStatement } from './d1QueryBuilder.js';

export interface ArchiveSearchDependencies {
  runQuery: (sql: string, params: unknown[]) => Promise<ArchivedStoryRow[]>;
}

export interface ArchiveSearchResult {
  stories: StoryCluster[];
  error?: string;
}

export async function handleArchiveSearchRequest(
  rawQuery: string,
  deps: ArchiveSearchDependencies
): Promise<ArchiveSearchResult> {
  if (!rawQuery.trim()) {
    return { stories: [] };
  }

  const statement = buildSearchArchiveStatement(rawQuery);

  let rows: ArchivedStoryRow[];
  try {
    rows = await deps.runQuery(statement.sql, statement.params);
  } catch {
    return { stories: [], error: 'Archive search is temporarily unavailable.' };
  }

  const stories: StoryCluster[] = [];
  for (const row of rows) {
    try {
      stories.push(fromArchivedStoryRow(row));
    } catch {
      // Skip a corrupt row rather than failing the whole search.
    }
  }

  return { stories };
}
