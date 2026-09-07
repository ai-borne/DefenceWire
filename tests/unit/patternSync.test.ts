/**
 * Unit Tests for Crawler Pattern Sync Pipeline (Phase 5)
 * Tests pattern detection, synthesis execution, and Cloudflare D1 persistence.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import { runPatternDetectionAndSync } from '../../crawler/patternSync.js';
import { StoryCluster } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';

function createMockCluster(
  id: string,
  headline: string,
  publishedAt: string,
  entities: string[],
  domain: string = 'pib.gov.in',
  snippet: string = ''
): StoryCluster {
  return {
    id,
    synthesizedHeadline: headline,
    primarySource: {
      id: `src-${id}`,
      title: headline,
      url: `https://${domain}/story-${id}`,
      sourceName: domain,
      sourceDomain: domain,
      tier: SourceTier.TIER_1_OFFICIAL,
      publishedAt,
      snippet
    },
    relatedCoverage: [],
    discussions: [],
    categories: ['strategic'],
    entities,
    defenceScore: 88,
    isLeadStory: false,
    createdAt: publishedAt,
    updatedAt: publishedAt
  };
}

describe('Crawler Pattern Sync', () => {
  const d1Config = {
    accountId: 'test-account',
    databaseId: 'test-db',
    apiToken: 'test-token'
  };

  it('returns empty result when no candidates are detected', async () => {
    const res = await runPatternDetectionAndSync([], d1Config);
    expect(res.syncedPatterns).toBe(0);
    expect(res.candidates).toHaveLength(0);
  });

  it('detects candidates, synthesizes situational hypotheses, and persists to D1', async () => {
    const clusters: StoryCluster[] = [
      createMockCluster(
        'c-1',
        'Unidentified Drone Infiltration Threat Detected Near Delhi NCR',
        '2026-09-01T08:00:00Z',
        ['Delhi', 'Drone Infiltration'],
        'thehindu.com',
        'Hostile quadcopter suspected along perimeter.'
      ),
      createMockCluster(
        'c-2',
        'Multi-Agency Security Grid Sanitization Underway at Red Fort in Delhi',
        '2026-09-01T14:30:00Z',
        ['Delhi', 'Red Fort'],
        'pib.gov.in',
        'High alert declared with counter-UAS systems activated across Delhi.'
      ),
      createMockCluster(
        'c-3',
        'Army Deploys Upgraded L-70 Air Defence Guns Across Delhi VVIP Sectors',
        '2026-09-02T10:00:00Z',
        ['Delhi', 'L-70 Guns'],
        'tribuneindia.com',
        'Anti-aircraft and counter-drone batteries positioned around key Delhi installations.'
      )
    ];

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        result: [{ results: [], success: true }]
      })
    });

    const res = await runPatternDetectionAndSync(clusters, d1Config, {
      fetchFn: mockFetch as unknown as typeof fetch
    });

    expect(res.candidates.length).toBeGreaterThanOrEqual(1);
    expect(res.syncedPatterns).toBeGreaterThanOrEqual(1);
    expect(res.failed).toBe(0);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/client/v4/accounts/test-account/d1/database/test-db/query'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('runs safely in-memory when D1 is not configured', async () => {
    const clusters: StoryCluster[] = [
      createMockCluster(
        'c-1',
        'Drone Threat Detected Near Delhi NCR',
        '2026-09-01T08:00:00Z',
        ['Delhi', 'Drone Infiltration']
      ),
      createMockCluster(
        'c-2',
        'Red Fort Security Grid Sanitized in Delhi',
        '2026-09-01T14:30:00Z',
        ['Delhi', 'Red Fort']
      ),
      createMockCluster(
        'c-3',
        'L-70 Air Defence Guns Deployed in Delhi',
        '2026-09-02T10:00:00Z',
        ['Delhi', 'L-70 Guns']
      )
    ];

    const res = await runPatternDetectionAndSync(clusters, null);
    expect(res.candidates.length).toBeGreaterThanOrEqual(1);
    expect(res.syncedPatterns).toBe(0);
    expect(res.failed).toBe(0);
  });

  it('handles D1 query failures non-fatally and records failures', async () => {
    const clusters: StoryCluster[] = [
      createMockCluster(
        'c-1',
        'Drone Threat Detected Near Delhi NCR',
        '2026-09-01T08:00:00Z',
        ['Delhi', 'Drone Infiltration']
      ),
      createMockCluster(
        'c-2',
        'Red Fort Security Grid Sanitized in Delhi',
        '2026-09-01T14:30:00Z',
        ['Delhi', 'Red Fort']
      ),
      createMockCluster(
        'c-3',
        'L-70 Air Defence Guns Deployed in Delhi',
        '2026-09-02T10:00:00Z',
        ['Delhi', 'L-70 Guns']
      )
    ];

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500
    });

    const res = await runPatternDetectionAndSync(clusters, d1Config, {
      fetchFn: mockFetch as unknown as typeof fetch
    });

    expect(res.candidates.length).toBeGreaterThanOrEqual(1);
    expect(res.syncedPatterns).toBe(0);
    expect(res.failed).toBeGreaterThanOrEqual(1);
  });
});
