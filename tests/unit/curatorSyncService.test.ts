/**
 * Unit Tests for CuratorSyncService (GitHub REST API Git Sync)
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CuratorSyncService } from '../../src/services/curatorSyncService.js';
import { StoryCluster, StorySourceItem } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';

describe('CuratorSyncService', () => {
  let syncService: CuratorSyncService;

  const mockPayload: { clusters: StoryCluster[]; river: StorySourceItem[] } = {
    clusters: [
      {
        id: 'cluster-1',
        synthesizedHeadline: 'CCS Clears 5th-Gen AMCA Stealth Fighter Prototype Funding',
        primarySource: {
          id: 'src-1',
          title: 'CCS clears AMCA funding',
          url: 'https://pib.gov.in/news/1',
          sourceName: 'PIB India',
          sourceDomain: 'pib.gov.in',
          tier: SourceTier.TIER_1_OFFICIAL,
          publishedAt: '2026-08-30T10:00:00Z'
        },
        relatedCoverage: [],
        discussions: [],
        categories: ['airforce'],
        entities: ['AMCA'],
        defenceScore: 92,
        isLeadStory: true,
        createdAt: '2026-08-30T10:00:00Z',
        updatedAt: '2026-08-30T10:00:00Z'
      }
    ],
    river: []
  };

  beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
    syncService = new CuratorSyncService();
  });

  it('manages Personal Access Token in local storage', () => {
    expect(syncService.hasToken()).toBe(false);
    expect(syncService.getStoredToken()).toBeNull();

    syncService.setStoredToken('ghp_test_token_12345');
    expect(syncService.hasToken()).toBe(true);
    expect(syncService.getStoredToken()).toBe('ghp_test_token_12345');

    syncService.clearStoredToken();
    expect(syncService.hasToken()).toBe(false);
  });

  it('encodes unicode strings to base64 correctly', () => {
    const text = 'Tejas Mk1A delivery to IAF ✈️ — ₹15,000 Cr';
    const encoded = syncService.encodeBase64Unicode(text);
    expect(encoded).toBeDefined();
    expect(encoded.length).toBeGreaterThan(0);
  });

  it('retrieves current file SHA on successful 200 response', async () => {
    const mockFetch = async () =>
      ({
        ok: true,
        status: 200,
        json: async () => ({ sha: 'abc123sha456' })
      } as unknown as Response);

    const service = new CuratorSyncService(mockFetch as unknown as typeof fetch);
    const sha = await service.fetchCurrentFileSha('ghp_token');
    expect(sha).toBe('abc123sha456');
  });

  it('returns null SHA if file does not exist (404 status)', async () => {
    const mockFetch = async () =>
      ({
        ok: false,
        status: 404
      } as unknown as Response);

    const service = new CuratorSyncService(mockFetch as unknown as typeof fetch);
    const sha = await service.fetchCurrentFileSha('ghp_token');
    expect(sha).toBeNull();
  });

  it('publishes curated snapshot to GitHub API and returns commit url on 200', async () => {
    const mockFetch = async (_url: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method || 'GET';
      if (method === 'GET') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ sha: 'existing_sha_789' })
        } as unknown as Response;
      }
      if (method === 'PUT') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            commit: { html_url: 'https://github.com/ai-borne/DefenceWire/commit/testcommit123' }
          })
        } as unknown as Response;
      }
      return { ok: false, status: 500 } as unknown as Response;
    };

    const service = new CuratorSyncService(mockFetch as unknown as typeof fetch);
    const result = await service.publishCuratedSnapshot('ghp_token', mockPayload);

    expect(result.success).toBe(true);
    expect(result.commitUrl).toBe('https://github.com/ai-borne/DefenceWire/commit/testcommit123');
  });

  it('returns error when publishing without token', async () => {
    const result = await syncService.publishCuratedSnapshot('', mockPayload);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Token is required');
  });

  it('handles 401 Unauthorized from GitHub API gracefully', async () => {
    const mockFetch = async () =>
      ({
        ok: false,
        status: 401
      } as unknown as Response);

    const service = new CuratorSyncService(mockFetch as unknown as typeof fetch);
    const result = await service.publishCuratedSnapshot('invalid_token', mockPayload);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Unauthorized');
  });
});
