/**
 * Unit Tests for Edge Entity Dossier Handler
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it, vi } from 'vitest';
import {
  handleEntityDossierRequest,
  escapeSqlLikePattern,
  DiscoveredEntityDbRow
} from '../../src/services/entityDossierHandler.js';
import { ArchiveBindingUnavailableError } from '../../src/archive/archiveRow.js';
import { onRequestGet } from '../../functions/api/entity/[slug].js';
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

describe('Entity Dossier Edge Handler & SQL LIKE Protection', () => {
  describe('escapeSqlLikePattern', () => {
    it('handles empty and standard alphanumeric input safely', () => {
      expect(escapeSqlLikePattern('')).toBe('');
      expect(escapeSqlLikePattern('tejas-mk1a')).toBe('tejas-mk1a');
      expect(escapeSqlLikePattern('INS Vikrant 2026')).toBe('INS Vikrant 2026');
    });

    it('escapes SQL LIKE wildcard characters (% and _) with backslash default', () => {
      expect(escapeSqlLikePattern('100%')).toBe('100\\%');
      expect(escapeSqlLikePattern('tejas_mk1a')).toBe('tejas\\_mk1a');
      expect(escapeSqlLikePattern('%_wildcard_%')).toBe('\\%\\_wildcard\\_\\%');
    });

    it('escapes embedded backslashes before escaping wildcards', () => {
      expect(escapeSqlLikePattern('system\\path%_test')).toBe('system\\\\path\\%\\_test');
    });

    it('supports custom escape characters when supplied', () => {
      expect(escapeSqlLikePattern('100%_pure', '/')).toBe('100/%/_pure');
    });
  });

  describe('handleEntityDossierRequest', () => {
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
        queryRelatedStories: async () => [{ id: MOCK_CLUSTER.id, cluster_json: JSON.stringify(MOCK_CLUSTER) }]
      };

      const res = await handleEntityDossierRequest('tejas-mk1a', mockDb);
      expect(res.error).toBeUndefined();
      expect(res.entity).not.toBeNull();
      expect(res.entity?.name).toBe('Tejas Mk1A');
      expect(res.entity?.isPromoted).toBe(true);
      expect(res.relatedStories).toHaveLength(1);
      expect(res.relatedStories[0]!.synthesizedHeadline).toContain('Tejas Mk1A');
    });

    it('falls back to R2 via getClusterJson when a related story has no cluster_json in D1', async () => {
      const mockDb = {
        queryEntity: async () => null,
        queryRelatedStories: async () => [{ id: MOCK_CLUSTER.id, cluster_json: null }],
        getClusterJson: vi.fn().mockResolvedValue(JSON.stringify(MOCK_CLUSTER))
      };

      const res = await handleEntityDossierRequest('tejas-mk1a', mockDb);
      expect(mockDb.getClusterJson).toHaveBeenCalledWith(MOCK_CLUSTER.id);
      expect(res.relatedStories).toHaveLength(1);
      expect(res.relatedStories[0]!.id).toBe(MOCK_CLUSTER.id);
    });

    it('skips a related story with no cluster_json in D1 when the R2 fallback also fails', async () => {
      const mockDb = {
        queryEntity: async () => null,
        queryRelatedStories: async () => [{ id: MOCK_CLUSTER.id, cluster_json: null }],
        getClusterJson: vi.fn().mockResolvedValue(null)
      };

      const res = await handleEntityDossierRequest('tejas-mk1a', mockDb);
      expect(res.relatedStories).toHaveLength(0);
      expect(res.error).toBe('Entity not found.');
    });

    it('fails the whole request loudly when the R2 binding itself is unavailable, rather than silently dropping the related story', async () => {
      const mockDb = {
        queryEntity: async () => null,
        queryRelatedStories: async () => [{ id: MOCK_CLUSTER.id, cluster_json: null }],
        getClusterJson: vi.fn().mockRejectedValue(new ArchiveBindingUnavailableError('ARCHIVE_MEDIA R2 binding is not configured.'))
      };

      const res = await handleEntityDossierRequest('tejas-mk1a', mockDb);
      expect(res.entity).toBeNull();
      expect(res.relatedStories).toEqual([]);
      expect(res.error).toContain('R2 binding is not configured');
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

  describe('Pages Function onRequestGet (/api/entity/:slug)', () => {
    it('returns 503 if D1 database binding is missing', async () => {
      const request = new Request('http://localhost:5176/api/entity/tejas');
      const response = await onRequestGet({
        request,
        params: { slug: 'tejas' },
        env: {}
      });

      expect(response.status).toBe(503);
      const data = await response.json();
      expect(data.error).toBe('Dossier database is not configured.');
    });

    it('binds sanitized and escaped LIKE wildcard pattern in D1 query', async () => {
      const mockBind = vi.fn().mockReturnThis();
      const mockDb = {
        prepare: vi.fn().mockImplementation((sql: string) => {
          if (sql.includes('discovered_entities')) {
            return {
              bind: vi.fn().mockReturnValue({
                first: vi.fn().mockResolvedValue({
                  id: 'tejas_mk1a',
                  name: 'Tejas Mk1A',
                  pattern: '',
                  category: 'airforce',
                  source_count: 1,
                  mention_count: 1,
                  is_promoted: 1,
                  first_seen_at: '2026-08-30T00:00:00Z',
                  last_seen_at: '2026-08-30T00:00:00Z'
                })
              })
            };
          }
          return {
            bind: mockBind.mockReturnValue({
              all: vi.fn().mockResolvedValue({ results: [{ id: MOCK_CLUSTER.id, cluster_json: JSON.stringify(MOCK_CLUSTER) }] })
            })
          };
        })
      };

      const request = new Request('http://localhost:5176/api/entity/tejas_mk1%');
      const response = await onRequestGet({
        request,
        params: { slug: 'tejas_mk1%' },
        env: { DB: mockDb as unknown as any }
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.entity).not.toBeNull();
      // Verify queryRelatedStories passed escaped wildcards `%tejas\_mk1\%%`
      expect(mockBind).toHaveBeenCalledWith('%tejas\\_mk1\\%%', '%tejas\\_mk1\\%%', 20);
    });

    it('fails loudly (non-2xx) instead of silently dropping results when a row has no cluster_json in D1 and ARCHIVE_MEDIA is unconfigured', async () => {
      const mockDb = {
        prepare: vi.fn().mockImplementation((sql: string) => {
          if (sql.includes('discovered_entities')) {
            return { bind: vi.fn().mockReturnValue({ first: vi.fn().mockResolvedValue(null) }) };
          }
          return {
            bind: vi.fn().mockReturnValue({
              all: vi.fn().mockResolvedValue({ results: [{ id: MOCK_CLUSTER.id, cluster_json: null }] })
            })
          };
        })
      };

      const request = new Request('http://localhost:5176/api/entity/tejas-mk1a');
      const response = await onRequestGet({
        request,
        params: { slug: 'tejas-mk1a' },
        env: { DB: mockDb as unknown as any }
      });

      expect(response.status).not.toBe(200);
      const data = await response.json();
      expect(data.error).toBeTruthy();
    });
  });
});

