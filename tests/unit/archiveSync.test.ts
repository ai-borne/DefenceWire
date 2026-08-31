/**
 * Unit Tests for the Crawler Archive Sync (D1 REST write path)
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import { StoryCluster } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';
import { archivePoppedClusters, reconcileArchiveWithLiveFeed, buildD1ConfigFromEnv } from '../../crawler/archiveSync.js';

function makeCluster(id: string): StoryCluster {
  return {
    id,
    synthesizedHeadline: `Headline for ${id}`,
    primarySource: {
      id: `src-${id}`,
      title: `Title ${id}`,
      url: `https://example.com/${id}`,
      sourceName: 'Example',
      sourceDomain: 'example.com',
      tier: SourceTier.TIER_2_NATIONAL,
      publishedAt: '2026-08-01T00:00:00Z'
    },
    relatedCoverage: [],
    discussions: [],
    categories: ['army'],
    entities: [],
    defenceScore: 50,
    isLeadStory: false,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z'
  };
}

const config = { accountId: 'acct-1', databaseId: 'db-1', apiToken: 'token-1' };

describe('buildD1ConfigFromEnv', () => {
  it('builds a config when all three env vars are present', () => {
    const env = { CLOUDFLARE_ACCOUNT_ID: 'a', CLOUDFLARE_D1_DATABASE_ID: 'b', CLOUDFLARE_API_TOKEN: 'c' };
    expect(buildD1ConfigFromEnv(env)).toEqual({ accountId: 'a', databaseId: 'b', apiToken: 'c' });
  });

  it('returns null when any env var is missing', () => {
    expect(buildD1ConfigFromEnv({ CLOUDFLARE_ACCOUNT_ID: 'a' })).toBeNull();
    expect(buildD1ConfigFromEnv({})).toBeNull();
  });
});

describe('archivePoppedClusters', () => {
  it('does nothing when D1 config is null (secrets not yet provisioned)', async () => {
    const fetchFn = vi.fn();
    const result = await archivePoppedClusters([makeCluster('a')], [], null, { fetchFn });

    expect(fetchFn).not.toHaveBeenCalled();
    expect(result).toEqual({ archived: 0, failed: 0 });
  });

  it('does nothing when no clusters were popped', async () => {
    const fetchFn = vi.fn();
    const result = await archivePoppedClusters([makeCluster('a')], [makeCluster('a')], config, { fetchFn });

    expect(fetchFn).not.toHaveBeenCalled();
    expect(result).toEqual({ archived: 0, failed: 0 });
  });

  it('POSTs one D1 REST query per popped cluster with bearer auth', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true });
    const result = await archivePoppedClusters([makeCluster('a'), makeCluster('b')], [], config, { fetchFn });

    expect(fetchFn).toHaveBeenCalledTimes(2);
    const firstCall = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(firstCall[0]).toBe('https://api.cloudflare.com/client/v4/accounts/acct-1/d1/database/db-1/query');
    expect(firstCall[1].method).toBe('POST');
    expect((firstCall[1].headers as Record<string, string>).Authorization).toBe('Bearer token-1');
    expect(result).toEqual({ archived: 2, failed: 0 });
  });

  it('counts a failed HTTP response without throwing', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    const result = await archivePoppedClusters([makeCluster('a')], [], config, { fetchFn });

    expect(result).toEqual({ archived: 0, failed: 1 });
  });

  it('counts a network error without throwing', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('network down'));
    const result = await archivePoppedClusters([makeCluster('a')], [], config, { fetchFn });

    expect(result).toEqual({ archived: 0, failed: 1 });
  });
});

describe('reconcileArchiveWithLiveFeed', () => {
  it('does nothing when D1 config is null', async () => {
    const fetchFn = vi.fn();
    const result = await reconcileArchiveWithLiveFeed([makeCluster('a')], null, { fetchFn });

    expect(fetchFn).not.toHaveBeenCalled();
    expect(result).toEqual({ removed: 0, failed: 0 });
  });

  it('does nothing when the live feed is empty', async () => {
    const fetchFn = vi.fn();
    const result = await reconcileArchiveWithLiveFeed([], config, { fetchFn });

    expect(fetchFn).not.toHaveBeenCalled();
    expect(result).toEqual({ removed: 0, failed: 0 });
  });

  it('issues one DELETE covering every currently-live cluster id, so a re-surfaced story stops being duplicated in the archive', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true });
    const liveClusters = [makeCluster('a'), makeCluster('b')];
    const result = await reconcileArchiveWithLiveFeed(liveClusters, config, { fetchFn });

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.cloudflare.com/client/v4/accounts/acct-1/d1/database/db-1/query');
    const body = JSON.parse(init.body as string);
    expect(body.sql).toContain('DELETE FROM archived_stories');
    expect(body.params).toEqual(['a', 'b']);
    expect(result).toEqual({ removed: 2, failed: 0 });
  });

  it('counts a failed HTTP response without throwing', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    const result = await reconcileArchiveWithLiveFeed([makeCluster('a')], config, { fetchFn });

    expect(result).toEqual({ removed: 0, failed: 1 });
  });

  it('counts a network error without throwing', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('network down'));
    const result = await reconcileArchiveWithLiveFeed([makeCluster('a')], config, { fetchFn });

    expect(result).toEqual({ removed: 0, failed: 1 });
  });
});
