/**
 * Unit Tests for Curator Kill-Switch Rollback Handler
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it, vi } from 'vitest';
import { handleCuratorRollback, CuratorRollbackDependencies, PublishedSnapshotRow } from '../../src/services/curatorRollbackHandler.js';
import { EDGE_CACHE_TAGS } from '../../src/seo/edgeCache.js';

function makeDeps(overrides: Partial<CuratorRollbackDependencies> = {}): CuratorRollbackDependencies {
  return {
    runQuery: vi.fn().mockResolvedValue([]),
    verifyAuth: vi.fn().mockResolvedValue(true),
    kvPut: vi.fn().mockResolvedValue(undefined),
    ...overrides
  };
}

const mockRow: PublishedSnapshotRow = {
  id: 42,
  snapshot_json: '{"clusters":[],"river":[]}',
  published_at: '2026-09-01T00:00:00Z'
};

describe('Curator Kill-Switch Rollback Handler', () => {
  it('rejects unauthenticated requests', async () => {
    const deps = makeDeps({ verifyAuth: vi.fn().mockResolvedValue(false) });
    const result = await handleCuratorRollback({}, null, deps);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Unauthorized');
    expect(deps.kvPut).not.toHaveBeenCalled();
  });

  it('defaults to the second-most-recent snapshot when no snapshotId is given', async () => {
    const runQuery = vi.fn().mockResolvedValue([mockRow]);
    const deps = makeDeps({ runQuery });

    const result = await handleCuratorRollback({}, null, deps);

    expect(result.success).toBe(true);
    expect(result.restoredSnapshotId).toBe(42);
    expect(deps.kvPut).toHaveBeenCalledWith('live_snapshot', mockRow.snapshot_json);
    expect(runQuery).toHaveBeenCalledWith(expect.stringContaining('OFFSET 1'), []);
  });

  it('restores a specific snapshotId when provided', async () => {
    const runQuery = vi.fn().mockResolvedValue([mockRow]);
    const deps = makeDeps({ runQuery });

    const result = await handleCuratorRollback({ snapshotId: 42 }, null, deps);

    expect(result.success).toBe(true);
    expect(runQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE id = ?'), [42]);
  });

  it('fails when no prior published snapshot exists', async () => {
    const deps = makeDeps({ runQuery: vi.fn().mockResolvedValue([]) });

    const result = await handleCuratorRollback({}, null, deps);

    expect(result.success).toBe(false);
    expect(result.error).toContain('No prior published snapshot');
  });

  it('purges the NEWS_FEED edge cache tag on successful rollback', async () => {
    const purgeCache = vi.fn().mockResolvedValue({ success: true });
    const deps = makeDeps({ runQuery: vi.fn().mockResolvedValue([mockRow]), purgeCache });

    await handleCuratorRollback({}, null, deps);

    expect(purgeCache).toHaveBeenCalledWith([EDGE_CACHE_TAGS.NEWS_FEED]);
  });

  it('returns a failure result when a dependency throws', async () => {
    const deps = makeDeps({
      runQuery: vi.fn().mockResolvedValue([mockRow]),
      kvPut: vi.fn().mockRejectedValue(new Error('KV unavailable'))
    });

    const result = await handleCuratorRollback({}, null, deps);

    expect(result.success).toBe(false);
    expect(result.error).toContain('KV unavailable');
  });
});
