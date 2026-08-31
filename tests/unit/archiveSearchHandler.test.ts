/**
 * Unit Tests for the Archive Search Orchestration Handler
 * Exercises the edge-agnostic core behind functions/api/archive/search.ts
 * via dependency injection, without any D1 or Workers runtime.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import { ArchivedStoryRow } from '../../src/archive/archiveRow.js';
import { handleArchiveSearchRequest } from '../../src/archive/archiveSearchHandler.js';

const row: ArchivedStoryRow = {
  id: 'cluster-tejas-mk1a',
  synthesized_headline: 'HAL delivers Tejas Mk1A fighters',
  snippet: 'Equipped with Uttam AESA radar.',
  primary_source_name: 'PIB MoD',
  primary_source_url: 'https://pib.gov.in/news/tejas',
  primary_source_published_at: '2026-08-01T10:00:00Z',
  categories: '["airforce"]',
  entities: '["Tejas Mk1A"]',
  defence_score: 90,
  cluster_json: JSON.stringify({
    id: 'cluster-tejas-mk1a',
    synthesizedHeadline: 'HAL delivers Tejas Mk1A fighters',
    primarySource: {
      id: 'src-1',
      title: 'HAL Tejas Mk1A Delivery',
      url: 'https://pib.gov.in/news/tejas',
      sourceName: 'PIB MoD',
      sourceDomain: 'pib.gov.in',
      tier: 'TIER_1_OFFICIAL',
      publishedAt: '2026-08-01T10:00:00Z',
      snippet: 'Equipped with Uttam AESA radar.'
    },
    relatedCoverage: [],
    discussions: [],
    categories: ['airforce'],
    entities: ['Tejas Mk1A'],
    defenceScore: 90,
    isLeadStory: false,
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z'
  }),
  archived_at: '2026-08-05T00:00:00Z'
};

describe('handleArchiveSearchRequest', () => {
  it('returns rehydrated story clusters for a matching query', async () => {
    const runQuery = vi.fn().mockResolvedValue([row]);
    const result = await handleArchiveSearchRequest('Tejas', { runQuery });

    expect(result.stories).toHaveLength(1);
    expect(result.stories[0]?.id).toBe('cluster-tejas-mk1a');
    expect(runQuery).toHaveBeenCalledTimes(1);
  });

  it('returns an empty result without querying when the search term is blank', async () => {
    const runQuery = vi.fn();
    const result = await handleArchiveSearchRequest('   ', { runQuery });

    expect(result.stories).toEqual([]);
    expect(runQuery).not.toHaveBeenCalled();
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
