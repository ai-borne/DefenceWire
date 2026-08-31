/**
 * Unit Tests for Edge Entity Dossier Handler
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it } from 'vitest';
import {
  handleEntityDossierRequest,
  DiscoveredEntityDbRow
} from '../../src/services/entityDossierHandler.js';
import { StoryCluster } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';

const MOCK_CLUSTER: StoryCluster = {
  id: 'c-dossier-1',
  synthesizedHeadline: 'Tejas Mk1A Squadron Deployment Accelerates',
  primarySource: {
    id: 'ps-1',
    title: 'Tejas Mk1A Squadron Deployment',
    url: 'https://pib.gov.in/tejas',
    sourceName: 'PIB MoD',
    sourceDomain: 'pib.gov.in',
    tier: SourceTier.TIER_1_OFFICIAL,
    publishedAt: '2026-08-30T10:00:00Z'
  },
  relatedCoverage: [],
  discussions: [],
  categories: ['airforce', 'tech'],
  entities: ['Tejas Mk1A'],
  defenceScore: 90,
  isLeadStory: true,
  createdAt: '2026-08-30T10:00:00Z',
  updatedAt: '2026-08-30T10:00:00Z'
};

describe('Entity Dossier Edge Handler', () => {
  it('returns empty result with error for missing slug', async () => {
    const mockDb = {
      queryEntity: async () => null,
      queryRelatedStories: async () => []
    };

    const res = await handleEntityDossierRequest('', mockDb);
    expect(res.entity).toBeNull();
    expect(res.error).toBe('Entity slug is required.');
  });

  it('retrieves complete entity record and related story clusters from database adapter', async () => {
    const mockRow: DiscoveredEntityDbRow = {
      id: 'tejas-mk1a',
      name: 'Tejas Mk1A',
      pattern: '\\btejas\\s*mk1a\\b',
      category: 'airforce',
      source_count: 5,
      mention_count: 12,
      is_promoted: 1,
      first_seen_at: '2026-08-01T00:00:00Z',
      last_seen_at: '2026-08-30T10:00:00Z'
    };

    const mockDb = {
      queryEntity: async (slug: string) => (slug === 'tejas-mk1a' ? mockRow : null),
      queryRelatedStories: async () => [{ cluster_json: JSON.stringify(MOCK_CLUSTER) }]
    };

    const res = await handleEntityDossierRequest('tejas-mk1a', mockDb);
    expect(res.error).toBeUndefined();
    expect(res.entity).not.toBeNull();
    expect(res.entity?.name).toBe('Tejas Mk1A');
    expect(res.entity?.isPromoted).toBe(true);
    expect(res.relatedStories).toHaveLength(1);
    expect(res.relatedStories[0]!.synthesizedHeadline).toContain('Tejas Mk1A');
  });

  it('returns 404 error when neither entity row nor stories exist', async () => {
    const mockDb = {
      queryEntity: async () => null,
      queryRelatedStories: async () => []
    };

    const res = await handleEntityDossierRequest('unknown-system', mockDb);
    expect(res.entity).toBeNull();
    expect(res.error).toBe('Entity not found.');
  });

  it('handles database query errors gracefully without throwing', async () => {
    const mockDb = {
      queryEntity: async () => {
        throw new Error('D1 connection timeout');
      },
      queryRelatedStories: async () => []
    };

    const res = await handleEntityDossierRequest('tejas-mk1a', mockDb);
    expect(res.entity).toBeNull();
    expect(res.error).toContain('D1 connection timeout');
  });
});
