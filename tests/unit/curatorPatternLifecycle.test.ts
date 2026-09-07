/**
 * Integration & Lifecycle Test: Curator Promotion Lifecycle & Edge Cache Invalidation
 * Verifies end-to-end:
 * 1. Draft candidate state & hidden public banner (zero layout shift)
 * 2. Curator approval via handleReviewPattern
 * 3. Instant edge cache purging for Cache-Tag 'dw-patterns' & API URL
 * 4. Immediate public feed appearance in PublicPatternBanner
 * 5. Crawl survival (approved patterns immune to draft overwriting)
 * Hard limit: <= 300 LOC.
 */

// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { handleReviewPattern } from '../../src/services/curatorPatternHandler.js';
import { onRequestGet as publicPatternsGet } from '../../functions/api/patterns/index.js';
import { renderPublicPatternBanner } from '../../src/components/patterns/PublicPatternBanner.js';
import { PublicPatternViewModel } from '../../src/viewmodels/PublicPatternViewModel.js';
import { buildUpsertPatternStatement } from '../../src/services/curatorPatternQueryBuilder.js';
import { EmergentPattern, EmergentPatternRow } from '../../src/types/patterns.js';
import { EDGE_CACHE_TAGS, EDGE_CACHE_URLS, purgeEdgeCacheByTags } from '../../src/seo/edgeCache.js';

describe('Curator Promotion Lifecycle & Edge Cache Invalidation', () => {
  const patternId = 'pat_brahmos_deployment';

  let currentDbRow: EmergentPatternRow = {
    id: patternId,
    title: 'BrahMos Coastal Battery Deployment Convergence',
    synthesis: 'Observed mobile launcher trials and telemetry stations activating in the Andaman sector.',
    confidence: 0.91,
    node_ids_json: JSON.stringify(['brahmos', 'andaman-nicobar']),
    cluster_ids_json: JSON.stringify(['c-brahmos-1', 'c-brahmos-2']),
    status: 'draft',
    created_at: '2026-09-02T10:00:00Z',
    reviewed_at: null,
    reviewed_by: null
  };

  it('maintains hidden banner with zero layout shift when pattern is only in draft', async () => {
    // 1. D1 returns only approved patterns to the public endpoint
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockImplementation(async () => {
          // If status is draft, public query for status = 'approved' yields nothing
          if (currentDbRow.status === 'approved') {
            return { results: [currentDbRow] };
          }
          return { results: [] };
        })
      })
    };

    const req = new Request('http://localhost:5176/api/patterns');
    const res = await publicPatternsGet({ request: req, env: { DB: mockDb as never } });
    const data = (await res.json()) as { success: boolean; patterns: EmergentPattern[] };

    expect(res.status).toBe(200);
    expect(data.patterns).toHaveLength(0);

    // 2. Public Banner rendered with empty patterns is hidden (zero layout shift)
    const vm = new PublicPatternViewModel(async () => data.patterns);
    await vm.loadPatterns();
    const bannerEl = renderPublicPatternBanner(vm);
    expect(bannerEl.classList.contains('is-hidden')).toBe(true);
  });

  it('triggers edge cache invalidation when curator approves the pattern', async () => {
    const purgeCacheMock = vi.fn().mockResolvedValue({ success: true });
    const mockDb = {
      runQuery: vi.fn().mockImplementation(async () => [currentDbRow]),
      runMutation: vi.fn().mockImplementation(async () => {
        currentDbRow = {
          ...currentDbRow,
          status: 'approved',
          reviewed_at: '2026-09-02T12:00:00Z',
          reviewed_by: 'lead.editor@defencewire.in'
        };
        return { success: true };
      }),
      purgeCache: purgeCacheMock
    };

    const result = await handleReviewPattern(
      { id: patternId, action: 'approve' },
      mockDb,
      null,
      'secret',
      true,
      'lead.editor@defencewire.in'
    );

    expect(result.success).toBe(true);
    expect(result.data?.status).toBe('approved');
    expect(result.data?.reviewedBy).toBe('lead.editor@defencewire.in');

    // Assert purgeEdgeCache was triggered with dw-patterns
    expect(purgeCacheMock).toHaveBeenCalledWith(['dw-patterns']);
  });

  it('dispatches purgeEdgeCacheByTags to Cloudflare zone purge API', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, text: async () => '' });
    const config = { zoneId: 'test-zone-id', apiToken: 'test-api-token' };

    const purgeRes = await purgeEdgeCacheByTags([EDGE_CACHE_TAGS.PATTERNS], config, {
      fetchFn: mockFetch as never
    });

    expect(purgeRes.success).toBe(true);
    expect(purgeRes.purgedTargets).toEqual(['dw-patterns']);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.cloudflare.com/client/v4/zones/test-zone-id/purge_cache',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ tags: ['dw-patterns'] })
      })
    );
    expect(EDGE_CACHE_URLS.PATTERNS).toBe('https://www.defencewire.in/api/patterns');
  });

  it('serves approved pattern on public endpoint and unhides Situational Matrix Banner', async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [currentDbRow] })
      })
    };

    const req = new Request('http://localhost:5176/api/patterns');
    const res = await publicPatternsGet({ request: req, env: { DB: mockDb as never } });
    const data = (await res.json()) as { success: boolean; patterns: EmergentPattern[] };

    expect(data.patterns).toHaveLength(1);
    expect(data.patterns[0]?.status).toBe('approved');
    expect(data.patterns[0]?.title).toContain('BrahMos');

    // Public banner mounts and displays approved pattern with live radar
    const vm = new PublicPatternViewModel(async () => data.patterns);
    await vm.loadPatterns();
    const bannerEl = renderPublicPatternBanner(vm);

    expect(bannerEl.classList.contains('is-hidden')).toBe(false);
    expect(bannerEl.querySelector('.dw-pattern-title')?.textContent).toContain('BrahMos');
    expect(bannerEl.querySelector('.dw-pattern-confidence-badge')?.textContent).toContain('91%');
  });

  it('preserves approved status during subsequent crawler sync runs (crawl survival)', () => {
    const reIngestedPattern: EmergentPattern = {
      id: patternId,
      title: 'BrahMos Fresh Title From Next Crawl',
      synthesis: 'Fresh synthesized text from next crawl run',
      confidence: 0.95,
      nodeIds: ['brahmos', 'andaman-nicobar'],
      clusterIds: ['c-brahmos-1', 'c-brahmos-2', 'c-brahmos-3'],
      status: 'draft',
      createdAt: '2026-09-02T16:00:00Z'
    };

    const stmt = buildUpsertPatternStatement(reIngestedPattern);

    // Assert that the ON CONFLICT clause only updates draft patterns:
    expect(stmt.sql).toContain("WHERE status = 'draft'");
    // This ensures approved patterns in D1 are never accidentally overwritten or reset to draft.
  });
});
