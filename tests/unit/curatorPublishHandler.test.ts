/**
 * Unit Tests for Curator One-Push Publish Handler
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it, vi } from 'vitest';
import { handleCuratorPublish, CuratorPublishDependencies } from '../../src/services/curatorPublishHandler.js';
import { StoryCluster } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';
import { EDGE_CACHE_TAGS } from '../../src/seo/edgeCache.js';

function makeCluster(overrides: Partial<StoryCluster>): StoryCluster {
  return {
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
    isLeadStory: false,
    createdAt: '2026-08-30T10:00:00Z',
    updatedAt: '2026-08-30T10:00:00Z',
    ...overrides
  };
}

describe('Curator One-Push Publish Handler', () => {
  function makeDeps(overrides: Partial<CuratorPublishDependencies> = {}): CuratorPublishDependencies {
    return {
      runQuery: vi.fn().mockResolvedValue([]),
      runMutation: vi.fn().mockResolvedValue(undefined),
      verifyAuth: vi.fn().mockResolvedValue(true),
      kvPut: vi.fn().mockResolvedValue(undefined),
      insertSnapshot: vi.fn().mockResolvedValue(undefined),
      pruneSnapshots: vi.fn().mockResolvedValue(undefined),
      ...overrides
    };
  }

  it('rejects unauthenticated requests', async () => {
    const deps = makeDeps({ verifyAuth: vi.fn().mockResolvedValue(false) });
    const result = await handleCuratorPublish({ clusters: [], river: [] }, null, deps);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Unauthorized');
    expect(deps.kvPut).not.toHaveBeenCalled();
  });

  it('rejects a malformed payload missing clusters/river arrays', async () => {
    const deps = makeDeps();
    const result = await handleCuratorPublish({} as any, null, deps);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid publish payload');
  });

  it('upserts overrides only for changed clusters, writes the live KV snapshot, and records history', async () => {
    const deps = makeDeps();
    const promoted = makeCluster({ id: 'cluster-promoted', isEditorPromoted: true });
    const untouched = makeCluster({ id: 'cluster-untouched' });

    const result = await handleCuratorPublish(
      { clusters: [promoted, untouched], river: [] },
      null,
      deps,
      undefined,
      'editor@defencewire.in'
    );

    expect(result.success).toBe(true);
    expect(result.message).toContain('Published 1 curated overrides live.');

    // upsertOverride writes via runMutation with an INSERT ... ON CONFLICT statement
    expect(deps.runMutation).toHaveBeenCalledTimes(1);
    const [sql, params] = (deps.runMutation as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(sql).toContain('INSERT INTO curator_overrides');
    expect(params[0]).toBe('cluster-promoted');
    expect(params[4]).toBe('editor@defencewire.in');

    expect(deps.kvPut).toHaveBeenCalledWith('live_snapshot', expect.stringContaining('cluster-promoted'));
    expect(deps.insertSnapshot).toHaveBeenCalledWith(
      expect.stringContaining('cluster-untouched'),
      expect.any(String),
      'editor@defencewire.in'
    );
    expect(deps.pruneSnapshots).toHaveBeenCalledWith(20);
  });

  it('writes a "delete" tombstone override for each deletedClusterIds entry, separate from the changed-cluster loop', async () => {
    const deps = makeDeps();
    const untouched = makeCluster({ id: 'cluster-untouched' });

    const result = await handleCuratorPublish(
      { clusters: [untouched], river: [], deletedClusterIds: ['cluster-deleted'] },
      null,
      deps,
      undefined,
      'editor@defencewire.in'
    );

    expect(result.success).toBe(true);
    expect(result.message).toContain('Published 1 curated overrides live.');

    expect(deps.runMutation).toHaveBeenCalledTimes(1);
    const [sql, params] = (deps.runMutation as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(sql).toContain('INSERT INTO curator_overrides');
    expect(params[0]).toBe('cluster-deleted');
    expect(params[1]).toBe('delete');
  });

  it('treats a missing deletedClusterIds as no tombstones, not an error', async () => {
    const deps = makeDeps();
    const result = await handleCuratorPublish({ clusters: [], river: [] }, null, deps);

    expect(result.success).toBe(true);
    expect(deps.runMutation).not.toHaveBeenCalled();
  });

  it('purges the NEWS_FEED edge cache tag on successful publish', async () => {
    const purgeCache = vi.fn().mockResolvedValue({ success: true });
    const deps = makeDeps({ purgeCache });

    await handleCuratorPublish({ clusters: [], river: [] }, null, deps);

    expect(purgeCache).toHaveBeenCalledWith([EDGE_CACHE_TAGS.NEWS_FEED]);
  });

  it('still succeeds but surfaces a warning when the edge cache purge fails', async () => {
    const purgeCache = vi.fn().mockResolvedValue({ success: false, error: 'Zone credentials invalid' });
    const deps = makeDeps({ purgeCache });

    const result = await handleCuratorPublish({ clusters: [], river: [] }, null, deps);

    expect(result.success).toBe(true);
    expect(result.message).toContain('edge cache purge failed: Zone credentials invalid');
  });

  it('returns a failure result when a dependency throws', async () => {
    const deps = makeDeps({ kvPut: vi.fn().mockRejectedValue(new Error('KV unavailable')) });

    const result = await handleCuratorPublish({ clusters: [], river: [] }, null, deps);

    expect(result.success).toBe(false);
    expect(result.error).toContain('KV unavailable');
  });
});
