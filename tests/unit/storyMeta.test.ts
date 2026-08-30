/**
 * Unit Tests for the Story Meta SSOT Builder
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect } from 'vitest';
import { StoryCluster } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';
import { buildStoryUrl, parseStoryIdFromPath, buildStoryMetaDocument } from '../../src/seo/storyMeta.js';

const mockCluster: StoryCluster = {
  id: 'cluster-tejas-mk1a-delivery-2026',
  synthesizedHeadline: 'HAL delivers first batch of upgraded Tejas Mk1A fighters to Indian Air Force',
  primarySource: {
    id: 'src-pib-tejas-01',
    title: 'HAL Tejas Mk1A Delivery',
    url: 'https://pib.gov.in/news/tejas',
    sourceName: 'PIB MoD',
    sourceDomain: 'pib.gov.in',
    tier: SourceTier.TIER_1_OFFICIAL,
    publishedAt: '2026-08-30T10:00:00Z',
    snippet: 'Equipped with Uttam AESA radar and Astra Beyond Visual Range missiles.'
  },
  relatedCoverage: [],
  discussions: [],
  categories: ['airforce'],
  entities: ['Tejas Mk1A'],
  defenceScore: 95,
  isLeadStory: true,
  createdAt: '2026-08-30T10:00:00Z',
  updatedAt: '2026-08-30T10:00:00Z'
};

describe('buildStoryUrl', () => {
  it('builds a canonical absolute /story/:id URL', () => {
    expect(buildStoryUrl('cluster-abc')).toBe('https://www.defencewire.in/story/cluster-abc');
  });
});

describe('parseStoryIdFromPath', () => {
  it('extracts the cluster id from a /story/:id path', () => {
    expect(parseStoryIdFromPath('/story/cluster-abc')).toBe('cluster-abc');
  });

  it('returns null for the homepage path', () => {
    expect(parseStoryIdFromPath('/')).toBeNull();
  });

  it('returns null for an unrelated path', () => {
    expect(parseStoryIdFromPath('/army')).toBeNull();
  });

  it('returns null when the id segment is empty', () => {
    expect(parseStoryIdFromPath('/story/')).toBeNull();
  });
});

describe('buildStoryMetaDocument', () => {
  it('composes a title from the synthesized headline and site name', () => {
    const meta = buildStoryMetaDocument(mockCluster);
    expect(meta.title).toBe('HAL delivers first batch of upgraded Tejas Mk1A fighters to Indian Air Force — DefenceWire.in');
  });

  it('uses the primary source snippet as the description when present', () => {
    const meta = buildStoryMetaDocument(mockCluster);
    expect(meta.description).toBe('Equipped with Uttam AESA radar and Astra Beyond Visual Range missiles.');
  });

  it('falls back to the synthesized headline when no snippet exists', () => {
    const clusterWithoutSnippet: StoryCluster = {
      ...mockCluster,
      primarySource: { ...mockCluster.primarySource, snippet: undefined }
    };
    const meta = buildStoryMetaDocument(clusterWithoutSnippet);
    expect(meta.description).toBe(mockCluster.synthesizedHeadline);
  });

  it('points url at the canonical story permalink', () => {
    const meta = buildStoryMetaDocument(mockCluster);
    expect(meta.url).toBe('https://www.defencewire.in/story/cluster-tejas-mk1a-delivery-2026');
  });

  it('provides an absolute imageUrl suitable for og:image', () => {
    const meta = buildStoryMetaDocument(mockCluster);
    expect(meta.imageUrl).toMatch(/^https:\/\/www\.defencewire\.in\//);
  });
});
