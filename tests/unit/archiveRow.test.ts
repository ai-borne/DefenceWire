/**
 * Unit Tests for the Archive Row Mapper (StoryCluster <-> D1 row SSOT)
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect } from 'vitest';
import { StoryCluster } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';
import { toArchivedStoryRow, fromArchivedStoryRow } from '../../src/archive/archiveRow.js';

const mockCluster: StoryCluster = {
  id: 'cluster-tejas-mk1a',
  synthesizedHeadline: 'HAL delivers Tejas Mk1A fighters',
  primarySource: {
    id: 'src-pib-tejas-01',
    title: 'HAL Tejas Mk1A Delivery',
    url: 'https://pib.gov.in/news/tejas',
    sourceName: 'PIB MoD',
    sourceDomain: 'pib.gov.in',
    tier: SourceTier.TIER_1_OFFICIAL,
    publishedAt: '2026-08-01T10:00:00Z',
    snippet: 'Equipped with Uttam AESA radar.'
  },
  relatedCoverage: [],
  discussions: [],
  categories: ['airforce', 'procurement'],
  entities: ['Tejas Mk1A', 'HAL'],
  defenceScore: 90,
  isLeadStory: true,
  createdAt: '2026-08-01T10:00:00Z',
  updatedAt: '2026-08-02T10:00:00Z'
};

describe('toArchivedStoryRow', () => {
  it('maps core fields directly', () => {
    const row = toArchivedStoryRow(mockCluster, '2026-08-05T00:00:00Z');
    expect(row.id).toBe('cluster-tejas-mk1a');
    expect(row.synthesized_headline).toBe('HAL delivers Tejas Mk1A fighters');
    expect(row.snippet).toBe('Equipped with Uttam AESA radar.');
    expect(row.primary_source_name).toBe('PIB MoD');
    expect(row.primary_source_url).toBe('https://pib.gov.in/news/tejas');
    expect(row.defence_score).toBe(90);
    expect(row.archived_at).toBe('2026-08-05T00:00:00Z');
  });

  it('serializes categories and entities as JSON arrays', () => {
    const row = toArchivedStoryRow(mockCluster, '2026-08-05T00:00:00Z');
    expect(JSON.parse(row.categories)).toEqual(['airforce', 'procurement']);
    expect(JSON.parse(row.entities)).toEqual(['Tejas Mk1A', 'HAL']);
  });

  it('embeds the full cluster as cluster_json for lossless rehydration', () => {
    const row = toArchivedStoryRow(mockCluster, '2026-08-05T00:00:00Z');
    expect(JSON.parse(row.cluster_json)).toEqual(mockCluster);
  });

  it('stores null snippet when the primary source has none', () => {
    const withoutSnippet: StoryCluster = { ...mockCluster, primarySource: { ...mockCluster.primarySource, snippet: undefined } };
    const row = toArchivedStoryRow(withoutSnippet, '2026-08-05T00:00:00Z');
    expect(row.snippet).toBeNull();
  });
});

describe('fromArchivedStoryRow', () => {
  it('rehydrates the exact original StoryCluster from cluster_json', () => {
    const row = toArchivedStoryRow(mockCluster, '2026-08-05T00:00:00Z');
    const rehydrated = fromArchivedStoryRow(row);
    expect(rehydrated).toEqual(mockCluster);
  });

  it('round-trips through a JSON.stringify/parse boundary (simulating D1 storage)', () => {
    const row = toArchivedStoryRow(mockCluster, '2026-08-05T00:00:00Z');
    const wireRow = JSON.parse(JSON.stringify(row));
    const rehydrated = fromArchivedStoryRow(wireRow);
    expect(rehydrated).toEqual(mockCluster);
  });
});
