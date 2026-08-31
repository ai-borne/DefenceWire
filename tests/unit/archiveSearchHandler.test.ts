/**
 * Unit Tests for the Archive Search Orchestration Handler
 * Exercises the edge-agnostic core behind functions/api/archive/search.ts
 * via dependency injection, without any D1 or Workers runtime. Covers both
 * FTS keyword search and the default cursor-paginated "browse" mode used
 * when no search term is given.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import { ArchivedStoryRow } from '../../src/archive/archiveRow.js';
import { handleArchiveSearchRequest } from '../../src/archive/archiveSearchHandler.js';

function makeRow(id: string, archivedAt: string): ArchivedStoryRow {
  return {
    id,
    synthesized_headline: `Headline for ${id}`,
    snippet: 'Some snippet.',
    primary_source_name: 'PIB MoD',
    primary_source_url: `https://pib.gov.in/news/${id}`,
    primary_source_published_at: archivedAt,
    categories: '["airforce"]',
    entities: '["Tejas Mk1A"]',
    defence_score: 90,
    cluster_json: JSON.stringify({
      id,
      synthesizedHeadline: `Headline for ${id}`,
      primarySource: {
        id: `src-${id}`,
        title: `Title ${id}`,
        url: `https://pib.gov.in/news/${id}`,
        sourceName: 'PIB MoD',
        sourceDomain: 'pib.gov.in',
        tier: 'TIER_1_OFFICIAL',
        publishedAt: archivedAt
      },
      relatedCoverage: [],
      discussions: [],
      categories: ['airforce'],
      entities: ['Tejas Mk1A'],
      defenceScore: 90,
      isLeadStory: false,
      createdAt: archivedAt,
      updatedAt: archivedAt
    }),
    archived_at: archivedAt
  };
}

const row = makeRow('cluster-tejas-mk1a', '2026-08-05T00:00:00Z');

describe('handleArchiveSearchRequest — search mode', () => {
  it('returns rehydrated story clusters for a matching query', async () => {
    const runQuery = vi.fn().mockResolvedValue([row]);
    const result = await handleArchiveSearchRequest('Tejas', { runQuery });

    expect(result.stories).toHaveLength(1);
    expect(result.stories[0]?.id).toBe('cluster-tejas-mk1a');
    expect(runQuery).toHaveBeenCalledTimes(1);
  });

  it('returns an empty result and an error message when the query fails', async () => {
    const runQuery = vi.fn().mockRejectedValue(new Error('D1 unavailable'));
    const result = await handleArchiveSearchRequest('Tejas', { runQuery });

    expect(result.stories).toEqual([]);
    expect(result.error).toBeTruthy();
  });

  it('skips rows whose cluster_json fails to parse instead of throwing', async () => {
    const brokenRow: ArchivedStoryRow = { ...row, cluster_json: 'not valid json' };
    const runQuery = vi.fn().mockResolvedValue([brokenRow, row]);
    const result = await handleArchiveSearchRequest('Tejas', { runQuery });

    expect(result.stories).toHaveLength(1);
    expect(result.stories[0]?.id).toBe('cluster-tejas-mk1a');
  });
});

describe('handleArchiveSearchRequest — browse mode (blank query)', () => {
  it('queries a date-descending listing when the search term is blank', async () => {
    const runQuery = vi.fn().mockResolvedValue([row]);
    const result = await handleArchiveSearchRequest('   ', { runQuery });

    expect(runQuery).toHaveBeenCalledTimes(1);
    expect(result.stories).toHaveLength(1);
  });
});

describe('handleArchiveSearchRequest — cursor pagination', () => {
  it('reports nextCursor as the last row archived_at when a full page comes back', async () => {
    const rows = [makeRow('a', '2026-08-05T00:00:00Z'), makeRow('b', '2026-08-04T00:00:00Z')];
    const runQuery = vi.fn().mockResolvedValue(rows);
    const result = await handleArchiveSearchRequest('', { runQuery }, { limit: 1 });

    expect(result.stories).toHaveLength(1);
    expect(result.nextCursor).toBe('2026-08-05T00:00:00Z');
  });

  it('reports nextCursor as null when fewer rows than the page size come back', async () => {
    const runQuery = vi.fn().mockResolvedValue([row]);
    const result = await handleArchiveSearchRequest('', { runQuery }, { limit: 10 });

    expect(result.nextCursor).toBeNull();
  });

  it('passes the cursor through to the query so the next page can be requested', async () => {
    const runQuery = vi.fn().mockResolvedValue([]);
    await handleArchiveSearchRequest('', { runQuery }, { cursor: '2026-08-05T00:00:00Z' });

    const [, params] = runQuery.mock.calls[0] as [string, unknown[]];
    expect(params).toContain('2026-08-05T00:00:00Z');
  });
});
