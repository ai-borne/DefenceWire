/**
 * Unit Tests for Crawler Thread Sync (Phase 1)
 * Tests D1 sync execution, D1 unconfigured fallback, and error tolerance.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import { runThreadContinuity } from '../../crawler/threadSync.js';
import { StoryCluster } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';

function makeCluster(id: string, entity: string): StoryCluster {
  return {
    id,
    synthesizedHeadline: `${entity} advances in development milestones`,
    primarySource: {
      id: `src-${id}`,
      title: 'MoD Report',
      url: `https://mod.gov.in/${id}`,
      sourceName: 'PIB MoD',
      sourceDomain: 'mod.gov.in',
      tier: SourceTier.TIER_1_OFFICIAL,
      publishedAt: '2026-08-20T10:00:00Z'
    },
    relatedCoverage: [],
    discussions: [],
    categories: ['airforce'],
    entities: [entity],
    programTags: [entity.toLowerCase()],
    defenceScore: 88,
    isLeadStory: false,
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-08-20T10:00:00Z'
  };
}

describe('runThreadContinuity', () => {
  it('falls back to in-memory simulation when D1 is not configured', async () => {
    const cluster = makeCluster('c1', 'AMCA');
    const result = await runThreadContinuity([cluster], null);

    expect(result.syncedThreads).toBe(0);
    expect(result.syncedEvents).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.continuity.newlySpawnedCount).toBe(1);
    expect(result.continuity.threads).toHaveLength(1);
  });

  it('queries D1 for existing threads and syncs newly advanced threads', async () => {
    const config = {
      accountId: 'acc-123',
      databaseId: 'db-456',
      apiToken: 'token-789'
    };

    const mockFetch = vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
      const body = JSON.parse(opts.body as string) as { sql: string };
      if (body.sql.includes('SELECT * FROM story_threads')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify({ result: [{ results: [] }] }))
        });
      }
      if (body.sql.includes('SELECT * FROM story_thread_events')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify({ result: [{ results: [] }] }))
        });
      }
      // Insert statements
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ result: [{ meta: { changes: 1 } }] }))
      });
    });

    const cluster = makeCluster('c2', 'Rudram-II');
    const result = await runThreadContinuity([cluster], config, { fetchFn: mockFetch });

    expect(result.syncedThreads).toBe(1);
    expect(result.syncedEvents).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.continuity.newlySpawnedCount).toBe(1);
  });

  it('tolerates network failure when syncing to D1 without throwing', async () => {
    const config = {
      accountId: 'acc-123',
      databaseId: 'db-456',
      apiToken: 'token-789'
    };

    const mockFetch = vi.fn().mockRejectedValue(new Error('Cloudflare network timeout'));
    const cluster = makeCluster('c3', 'Pinaka');
    const result = await runThreadContinuity([cluster], config, { fetchFn: mockFetch });

    expect(result.failed).toBeGreaterThanOrEqual(1);
    expect(result.syncedThreads).toBe(0);
  });

  it('validates that d1/seeds/threads.sql contains valid seed statements for all non-program platforms', async () => {
    const fs = await import('fs');
    const sqlContent = fs.readFileSync('d1/seeds/threads.sql', 'utf8');
    const statements = sqlContent.split(';').map(s => s.trim()).filter(Boolean);

    expect(statements.length).toBeGreaterThanOrEqual(20);
    for (const stmt of statements) {
      expect(stmt).toMatch(/^INSERT OR REPLACE INTO (story_threads|story_thread_events)/);
    }

    const expectedThreads = [
      'th_dac-clearance',
      'th_qrsam',
      'th_pralay',
      'th_project-kusha',
      'th_rafale',
      'th_su-57',
      'th_apache',
      'th_tasl',
      'th_eos-05',
      'th_ins-sudarshini',
      'th_lac'
    ];

    for (const threadId of expectedThreads) {
      expect(sqlContent).toContain(`'${threadId}'`);
    }
  });

  it('syncs clusters with hashtags and primaryTag to D1 cleanly', async () => {
    const config = {
      accountId: 'acc-123',
      databaseId: 'db-456',
      apiToken: 'token-789'
    };

    const mockFetch = vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
      const body = JSON.parse(opts.body as string) as { sql: string };
      if (body.sql.includes('SELECT * FROM')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify({ result: [{ results: [] }] }))
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ result: [{ meta: { changes: 1 } }] }))
      });
    });

    const hashtagCluster: StoryCluster = {
      ...makeCluster('cluster-su57', 'Su-57'),
      entities: ['Su-57'],
      primaryTag: 'Su-57',
      hashtags: ['Su57'],
      programTags: ['su-57']
    };

    const result = await runThreadContinuity([hashtagCluster], config, { fetchFn: mockFetch });
    expect(result.syncedThreads).toBe(1);
    expect(result.syncedEvents).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.continuity.threads[0]?.canonicalEntity).toBe('Su-57');
    expect(result.continuity.threads[0]?.id).toBe('th_su-57');
  });

  it('auto-migrates remote D1 table when fingerprint_json column is missing', async () => {
    const config = { accountId: 'acc-1', databaseId: 'db-1', apiToken: 'tok-1' };
    let altered = false;

    const mockFetch = vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
      const body = JSON.parse(opts.body as string) as { sql: string };
      if (body.sql.includes('ALTER TABLE story_threads')) {
        altered = true;
        return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('{}') });
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

    const cluster = makeCluster('c4', 'Tejas');
    const result = await runThreadContinuity([cluster], config, { fetchFn: mockFetch });
    expect(altered).toBe(true);
    expect(result.syncedThreads).toBe(1);
    expect(result.failed).toBe(0);
  });

  it('falls back to legacy upsert without fingerprint_json if remote D1 rejects ALTER TABLE', async () => {
    const config = { accountId: 'acc-1', databaseId: 'db-1', apiToken: 'tok-1' };
    let legacyFallbackUsed = false;

    const mockFetch = vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
      const body = JSON.parse(opts.body as string) as { sql: string };
      if (body.sql.includes('ALTER TABLE story_threads')) {
        return Promise.resolve({
          ok: false, status: 403,
          text: () => Promise.resolve('{"errors":[{"message":"not authorized"}]}')
        });
      }
      if (body.sql.includes('SELECT * FROM')) {
        return Promise.resolve({
          ok: true, status: 200,
          text: () => Promise.resolve(JSON.stringify({ result: [{ results: [] }] }))
        });
      }
      if (body.sql.includes('fingerprint_json')) {
        return Promise.resolve({
          ok: false, status: 400,
          text: () => Promise.resolve('{"errors":[{"message":"table story_threads has no column named fingerprint_json: SQLITE_ERROR"}]}')
        });
      }
      legacyFallbackUsed = true;
      return Promise.resolve({
        ok: true, status: 200,
        text: () => Promise.resolve(JSON.stringify({ result: [{ meta: { changes: 1 } }] }))
      });
    });

    const cluster = makeCluster('c5', 'Zorawar');
    const result = await runThreadContinuity([cluster], config, { fetchFn: mockFetch });
    expect(legacyFallbackUsed).toBe(true);
    expect(result.syncedThreads).toBe(1);
    expect(result.failed).toBe(0);
  });
});

