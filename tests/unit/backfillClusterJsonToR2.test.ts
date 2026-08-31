/**
 * Unit Tests for the one-off cluster_json -> R2 backfill script.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import { backfillClusterJsonToR2 } from '../../crawler/scripts/backfillClusterJsonToR2.js';
import { D1RestConfig } from '../../crawler/archiveSync.js';
import { R2Config } from '../../crawler/r2ArchiveStore.js';

const d1Config: D1RestConfig = { accountId: 'acct-1', databaseId: 'db-1', apiToken: 'token-1' };
const r2Config: R2Config = { accountId: 'acct-1', accessKeyId: 'key-1', secretAccessKey: 'secret-1', bucketName: 'bucket-1' };

/**
 * Fake D1 + R2 pair: a fetchFn that services both the D1 REST query endpoint
 * (SELECT/UPDATE against an in-memory row map) and the R2 PUT endpoint
 * (writes into an in-memory blob map), keyed purely by request URL — good
 * enough to exercise the script's batching/resumability logic end to end
 * without any real network or Cloudflare account.
 */
function makeFakeBackend(initialRows: Record<string, string>, opts: { failR2Ids?: Set<string>; failUpdateIds?: Set<string> } = {}) {
  const rows = new Map(Object.entries(initialRows));
  const r2Store = new Map<string, string>();
  const failR2Ids = opts.failR2Ids ?? new Set<string>();
  const failUpdateIds = opts.failUpdateIds ?? new Set<string>();
  // Exposed so a test can simulate a transient failure clearing up between runs.

  const fetchFn = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    if (url.includes('r2.cloudflarestorage.com')) {
      const id = decodeURIComponent(url.split('/').pop()!).replace('.json', '');
      if (failR2Ids.has(id)) return { ok: false, status: 500 } as Response;
      r2Store.set(id, init.body as string);
      return { ok: true, status: 200 } as Response;
    }

    const statement = JSON.parse(init.body as string) as { sql: string; params: unknown[] };
    if (statement.sql.startsWith('SELECT')) {
      const limit = statement.params[0] as number;
      const results = [...rows.entries()].slice(0, limit).map(([id, cluster_json]) => ({ id, cluster_json }));
      return { ok: true, status: 200, json: async () => ({ result: [{ results }] }) } as unknown as Response;
    }
    if (statement.sql.startsWith('UPDATE')) {
      const id = statement.params[0] as string;
      if (failUpdateIds.has(id)) return { ok: false, status: 500, json: async () => ({}) } as unknown as Response;
      rows.delete(id);
      return { ok: true, status: 200, json: async () => ({ result: [{ results: [] }] }) } as unknown as Response;
    }
    throw new Error(`unexpected statement: ${statement.sql}`);
  });

  return { fetchFn, rows, r2Store, failR2Ids };
}

describe('backfillClusterJsonToR2', () => {
  it('migrates every row with cluster_json to R2 and nulls it out in D1', async () => {
    const { fetchFn, rows, r2Store } = makeFakeBackend({
      'story-1': '{"id":"story-1"}',
      'story-2': '{"id":"story-2"}',
      'story-3': '{"id":"story-3"}'
    });

    const result = await backfillClusterJsonToR2(d1Config, r2Config, { fetchFn });

    expect(result).toEqual({ migrated: 3, failed: 0 });
    expect(rows.size).toBe(0);
    expect(r2Store.get('story-1')).toBe('{"id":"story-1"}');
    expect(r2Store.get('story-2')).toBe('{"id":"story-2"}');
    expect(r2Store.get('story-3')).toBe('{"id":"story-3"}');
  });

  it('leaves the D1 row untouched (safe to retry) when the R2 PUT fails', async () => {
    const { fetchFn, rows } = makeFakeBackend(
      { 'story-1': '{"id":"story-1"}', 'story-2': '{"id":"story-2"}' },
      { failR2Ids: new Set(['story-1']) }
    );

    const result = await backfillClusterJsonToR2(d1Config, r2Config, { fetchFn });

    expect(result).toEqual({ migrated: 1, failed: 1 });
    expect(rows.has('story-1')).toBe(true);
    expect(rows.has('story-2')).toBe(false);
  });

  it('counts a D1 null-out failure without losing the R2 write (idempotent retry)', async () => {
    const { fetchFn, rows, r2Store } = makeFakeBackend(
      { 'story-1': '{"id":"story-1"}' },
      { failUpdateIds: new Set(['story-1']) }
    );

    const result = await backfillClusterJsonToR2(d1Config, r2Config, { fetchFn });

    expect(result).toEqual({ migrated: 0, failed: 1 });
    expect(rows.has('story-1')).toBe(true);
    expect(r2Store.get('story-1')).toBe('{"id":"story-1"}');
  });

  it('is naturally resumable: a second run picks up rows left over from a failed first run', async () => {
    const backend = makeFakeBackend(
      { 'story-1': '{"id":"story-1"}', 'story-2': '{"id":"story-2"}' },
      { failR2Ids: new Set(['story-1']) }
    );

    const first = await backfillClusterJsonToR2(d1Config, r2Config, { fetchFn: backend.fetchFn });
    expect(first).toEqual({ migrated: 1, failed: 1 });
    expect(backend.rows.has('story-1')).toBe(true);

    // Simulate the transient R2 failure clearing up before the next invocation.
    backend.failR2Ids.delete('story-1');
    const second = await backfillClusterJsonToR2(d1Config, r2Config, { fetchFn: backend.fetchFn });
    expect(second).toEqual({ migrated: 1, failed: 0 });
    expect(backend.rows.size).toBe(0);
  });

  it('returns an empty result when no rows still carry cluster_json in D1', async () => {
    const { fetchFn } = makeFakeBackend({});
    const result = await backfillClusterJsonToR2(d1Config, r2Config, { fetchFn });
    expect(result).toEqual({ migrated: 0, failed: 0 });
  });
});
