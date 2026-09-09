/**
 * Unit Tests for Archive Thread Backfill (fix for docs/knowledge_base_issues.md#3)
 * Verifies unthreaded archived clusters are pulled from D1+R2, threaded, and
 * synced back — and that missing config / partial failures degrade
 * non-fatally rather than breaking the crawl.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import { backfillUnthreadedArchive } from '../../crawler/threadBackfill.js';

const d1Config = { accountId: 'acc-1', databaseId: 'db-1', apiToken: 'tok-1' };
const r2Config = { accountId: 'acc-1', accessKeyId: 'key-1', secretAccessKey: 'secret-1', bucketName: 'bucket-1' };

const clusterJson = JSON.stringify({
  id: 'cluster-orphan-1',
  synthesizedHeadline: 'AMCA prototype rollout advances',
  primarySource: {
    id: 'src-1', title: 'MoD Report', url: 'https://mod.gov.in/amca', sourceName: 'PIB MoD',
    sourceDomain: 'mod.gov.in', tier: 1, publishedAt: '2026-08-01T10:00:00Z'
  },
  relatedCoverage: [], discussions: [], categories: ['airforce'], entities: ['AMCA'],
  programTags: ['amca'], defenceScore: 88, isLeadStory: false,
  createdAt: '2026-08-01T10:00:00Z', updatedAt: '2026-08-01T10:00:00Z'
});

describe('backfillUnthreadedArchive', () => {
  it('no-ops without D1 config', async () => {
    const result = await backfillUnthreadedArchive(null, r2Config);
    expect(result).toEqual({ scanned: 0, threaded: 0, failed: 0 });
  });

  it('no-ops without R2 config', async () => {
    const result = await backfillUnthreadedArchive(d1Config, null);
    expect(result).toEqual({ scanned: 0, threaded: 0, failed: 0 });
  });

  it('threads an orphaned archived cluster and syncs it to D1', async () => {
    const r2Fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => clusterJson });

    const d1Fetch = vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
      const body = JSON.parse(opts.body as string) as { sql: string };
      if (body.sql.includes('LEFT JOIN story_thread_events')) {
        return Promise.resolve({
          ok: true, status: 200,
          text: () => Promise.resolve(JSON.stringify({ result: [{ results: [{ id: 'cluster-orphan-1' }] }] }))
        });
      }
      if (body.sql.includes('SELECT * FROM')) {
        return Promise.resolve({
          ok: true, status: 200,
          text: () => Promise.resolve(JSON.stringify({ result: [{ results: [] }] }))
        });
      }
      return Promise.resolve({
        ok: true, status: 200,
        text: () => Promise.resolve(JSON.stringify({ result: [{ meta: { changes: 1 } }] }))
      });
    });

    const fetchFn = vi.fn().mockImplementation((url: string, opts: RequestInit) => {
      if (url.includes('r2.cloudflarestorage.com')) return r2Fetch(url, opts);
      return d1Fetch(url, opts);
    });

    const result = await backfillUnthreadedArchive(d1Config, r2Config, { fetchFn });

    expect(result.scanned).toBe(1);
    expect(result.threaded).toBe(1);
    expect(result.failed).toBe(0);
    expect(r2Fetch).toHaveBeenCalledTimes(1);
    expect((r2Fetch.mock.calls[0] as [string, RequestInit])[0]).toContain('cluster-orphan-1.json');
  });

  it('returns scanned=0 without hitting R2 when nothing is unthreaded', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      text: () => Promise.resolve(JSON.stringify({ result: [{ results: [] }] }))
    });

    const result = await backfillUnthreadedArchive(d1Config, r2Config, { fetchFn });
    expect(result).toEqual({ scanned: 0, threaded: 0, failed: 0 });
  });

  it('counts a failed R2 fetch without throwing and still reports scanned count', async () => {
    const fetchFn = vi.fn().mockImplementation((url: string, opts: RequestInit) => {
      if (url.includes('r2.cloudflarestorage.com')) {
        return Promise.resolve({ ok: false, status: 404 });
      }
      const body = JSON.parse(opts.body as string) as { sql: string };
      if (body.sql.includes('LEFT JOIN story_thread_events')) {
        return Promise.resolve({
          ok: true, status: 200,
          text: () => Promise.resolve(JSON.stringify({ result: [{ results: [{ id: 'cluster-missing-blob' }] }] }))
        });
      }
      return Promise.resolve({
        ok: true, status: 200,
        text: () => Promise.resolve(JSON.stringify({ result: [{ results: [] }] }))
      });
    });

    const result = await backfillUnthreadedArchive(d1Config, r2Config, { fetchFn });
    expect(result.scanned).toBe(1);
    expect(result.threaded).toBe(0);
    expect(result.failed).toBe(1);
  });

  it('tolerates a D1 network failure without throwing', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('network down'));
    const result = await backfillUnthreadedArchive(d1Config, r2Config, { fetchFn });
    expect(result.failed).toBeGreaterThanOrEqual(1);
    expect(result.threaded).toBe(0);
  });
});
