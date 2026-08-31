/**
 * Unit Tests for the Archive Row Mapper (StoryCluster <-> D1 row SSOT)
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import { StoryCluster } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';
import { toArchivedStoryRow, fromArchivedStoryRow, ArchiveBindingUnavailableError } from '../../src/archive/archiveRow.js';

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

  it('never writes cluster_json to D1 — R2 is the sole copy as of Phase 3', () => {
    const row = toArchivedStoryRow(mockCluster, '2026-08-05T00:00:00Z');
    expect(row.cluster_json).toBeNull();
  });

  it('stores null snippet when the primary source has none', () => {
    const withoutSnippet: StoryCluster = { ...mockCluster, primarySource: { ...mockCluster.primarySource, snippet: undefined } };
    const row = toArchivedStoryRow(withoutSnippet, '2026-08-05T00:00:00Z');
    expect(row.snippet).toBeNull();
  });
});

describe('fromArchivedStoryRow', () => {
  it('rehydrates the exact original StoryCluster from a legacy row that still carries cluster_json', async () => {
    const row = { ...toArchivedStoryRow(mockCluster, '2026-08-05T00:00:00Z'), cluster_json: JSON.stringify(mockCluster) };
    const rehydrated = await fromArchivedStoryRow(row);
    expect(rehydrated).toEqual(mockCluster);
  });

  it('round-trips through a JSON.stringify/parse boundary (simulating D1 storage)', async () => {
    const row = { ...toArchivedStoryRow(mockCluster, '2026-08-05T00:00:00Z'), cluster_json: JSON.stringify(mockCluster) };
    const wireRow = JSON.parse(JSON.stringify(row));
    const rehydrated = await fromArchivedStoryRow(wireRow);
    expect(rehydrated).toEqual(mockCluster);
  });

  it('D1 has cluster_json: uses it directly and never calls the R2 fallback', async () => {
    const row = { ...toArchivedStoryRow(mockCluster, '2026-08-05T00:00:00Z'), cluster_json: JSON.stringify(mockCluster) };
    const getClusterJson = vi.fn().mockResolvedValue('should not be used');
    const rehydrated = await fromArchivedStoryRow(row, getClusterJson);
    expect(rehydrated).toEqual(mockCluster);
    expect(getClusterJson).not.toHaveBeenCalled();
  });

  it('D1 cluster_json is null (the Phase 3+ norm): falls back to R2 and rehydrates successfully', async () => {
    const row = toArchivedStoryRow(mockCluster, '2026-08-05T00:00:00Z');
    const getClusterJson = vi.fn().mockResolvedValue(JSON.stringify(mockCluster));
    const rehydrated = await fromArchivedStoryRow(row, getClusterJson);
    expect(rehydrated).toEqual(mockCluster);
    expect(getClusterJson).toHaveBeenCalledWith(mockCluster.id);
  });

  it('D1 cluster_json is null and the R2 fallback fails: throws rather than returning a malformed story', async () => {
    const row = toArchivedStoryRow(mockCluster, '2026-08-05T00:00:00Z');
    const getClusterJson = vi.fn().mockResolvedValue(null);
    await expect(fromArchivedStoryRow(row, getClusterJson)).rejects.toThrow(/cluster_json missing/);
  });

  it('D1 cluster_json is null and no R2 fallback is provided: throws instead of crashing or returning empty', async () => {
    const row = toArchivedStoryRow(mockCluster, '2026-08-05T00:00:00Z');
    await expect(fromArchivedStoryRow(row)).rejects.toThrow(/cluster_json missing/);
  });

  it('propagates an ArchiveBindingUnavailableError from the R2 fallback rather than swallowing it', async () => {
    const row = toArchivedStoryRow(mockCluster, '2026-08-05T00:00:00Z');
    const getClusterJson = vi.fn().mockRejectedValue(new ArchiveBindingUnavailableError('R2 binding missing'));
    await expect(fromArchivedStoryRow(row, getClusterJson)).rejects.toBeInstanceOf(ArchiveBindingUnavailableError);
  });
});
