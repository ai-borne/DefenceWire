/**
 * Unit Tests for Curator Ad-Hoc Ingest Handler (Phase 4)
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it, vi } from 'vitest';
import { handleCuratorIngest, CuratorIngestDependencies } from '../../src/services/curatorIngestHandler.js';

function buildDeps(overrides: Partial<CuratorIngestDependencies> = {}): CuratorIngestDependencies {
  return {
    fetchFn: vi.fn(),
    getLiveSnapshot: vi.fn().mockResolvedValue(null),
    runQuery: vi.fn().mockResolvedValue([]),
    runMutation: vi.fn().mockResolvedValue(undefined),
    kvPut: vi.fn().mockResolvedValue(undefined),
    insertSnapshot: vi.fn().mockResolvedValue(undefined),
    pruneSnapshots: vi.fn().mockResolvedValue(undefined),
    now: new Date('2026-09-05T10:00:00Z'),
    ...overrides
  };
}

describe('Curator Ad-Hoc Ingest Handler', () => {
  it('rejects unauthorized requests with HTTP 401', async () => {
    const { status, result } = await handleCuratorIngest({ mode: 'text', text: 'hello' }, false, buildDeps());
    expect(status).toBe(401);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unauthorized');
  });

  it('rejects a missing/invalid mode with HTTP 400', async () => {
    const { status, result } = await handleCuratorIngest(null, true, buildDeps());
    expect(status).toBe(400);
    expect(result.success).toBe(false);
  });

  it('rejects an SSRF-unsafe URL with HTTP 400 and never fetches it', async () => {
    const fetchFn = vi.fn();
    const { status, result } = await handleCuratorIngest(
      { mode: 'url', url: 'http://169.254.169.254/latest/meta-data/' },
      true,
      buildDeps({ fetchFn })
    );
    expect(status).toBe(400);
    expect(result.success).toBe(false);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('rejects empty pasted text with HTTP 400', async () => {
    const { status, result } = await handleCuratorIngest({ mode: 'text', text: '   ' }, true, buildDeps());
    expect(status).toBe(400);
    expect(result.success).toBe(false);
  });

  it('sanitizes <script> tags out of pasted text before clustering', async () => {
    const deps = buildDeps();
    const { status, result } = await handleCuratorIngest(
      {
        mode: 'text',
        text: 'India tests new hypersonic missile system.<script>alert(1)</script> Full details inside.',
        sourceName: 'Field Report'
      },
      true,
      deps
    );

    expect(status).toBe(200);
    expect(result.success).toBe(true);
    const serialized = JSON.stringify(result.cluster);
    expect(serialized).not.toContain('<script>');
    expect(serialized).not.toContain('alert(1)');
    expect(deps.kvPut).toHaveBeenCalled();
  });

  it('produces a cluster and publishes it live for a safe URL', async () => {
    const html = '<html><head><title>Navy Commissions New Frigate</title></head><body>The Indian Navy commissioned a new stealth frigate today, boosting maritime defence capability.</body></html>';
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => html
    } as unknown as Response);
    const deps = buildDeps({ fetchFn });

    const { status, result } = await handleCuratorIngest(
      { mode: 'url', url: 'https://news.example.com/navy-frigate' },
      true,
      deps
    );

    expect(status).toBe(200);
    expect(result.success).toBe(true);
    expect(result.cluster).toBeDefined();
    expect(result.cluster?.isEditorPromoted).toBe(true);
    expect(result.cluster?.isLeadStory).toBe(false);
    expect(deps.kvPut).toHaveBeenCalledWith('live_snapshot', expect.any(String));
    expect(deps.insertSnapshot).toHaveBeenCalled();
  });

  it('returns HTTP 502 when the URL fetch fails', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('network unreachable'));
    const { status, result } = await handleCuratorIngest(
      { mode: 'url', url: 'https://news.example.com/unreachable' },
      true,
      buildDeps({ fetchFn })
    );
    expect(status).toBe(502);
    expect(result.success).toBe(false);
  });

  it('merges the new cluster with the existing live snapshot rather than replacing it', async () => {
    const existingCluster = {
      id: 'existing-1',
      synthesizedHeadline: 'Existing Story',
      primarySource: {
        id: 'src-existing', title: 'Existing', url: 'https://example.com/existing',
        sourceName: 'Existing', sourceDomain: 'example.com', tier: 'TIER_4_OSINT', publishedAt: '2026-09-01T00:00:00Z'
      },
      relatedCoverage: [], discussions: [], categories: ['strategic'], entities: [],
      defenceScore: 50, isLeadStory: false, createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z'
    };
    const deps = buildDeps({
      getLiveSnapshot: vi.fn().mockResolvedValue({ clusters: [existingCluster], river: [] })
    });

    const { result } = await handleCuratorIngest(
      { mode: 'text', text: 'Fresh submitted defence story about a new radar system deployment.' },
      true,
      deps
    );

    expect(result.success).toBe(true);
    const kvPutCall = (deps.kvPut as any).mock.calls[0];
    const snapshot = JSON.parse(kvPutCall[1]);
    expect(snapshot.clusters.some((c: any) => c.id === 'existing-1')).toBe(true);
  });
});
