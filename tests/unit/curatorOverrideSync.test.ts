/**
 * Unit Tests for crawler/curatorOverrideSync.ts — D1-authoritative curator
 * override reads used by the hourly crawl (Phase 2: survive regeneration).
 * Hard limit: <= 300 LOC.
 */

import { afterEach, describe, it, expect, vi } from 'vitest';
import { StoryCluster } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';
import {
  preserveCuratorOverrides,
  fetchCuratorOverridesFromD1,
  applyD1CuratorOverrides,
  D1CuratorOverrideRow
} from '../../crawler/curatorOverrideSync.js';
import { runIngestionPipeline } from '../../crawler/ingest.js';
import { FeedConfig } from '../../crawler/feedTypes.js';

const D1_ENV = { CLOUDFLARE_ACCOUNT_ID: 'acct-1', CLOUDFLARE_D1_DATABASE_ID: 'db-1', CLOUDFLARE_API_TOKEN: 'token-1' };

const MOCK_FEED: FeedConfig = {
  id: 'feed-pib', name: 'PIB MoD', url: 'https://pib.gov.in/feed.xml',
  domain: 'pib.gov.in', tier: SourceTier.TIER_1_OFFICIAL, defaultCategory: 'strategic', enabled: true
};

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>PIB</title>
  <item><title>HAL delivers upgraded Tejas Mk1A fighters to Indian Air Force</title><link>https://pib.gov.in/tejas-mk1a</link><pubDate>${new Date().toUTCString()}</pubDate><description>Defence platform induction.</description></item>
</channel></rss>`;

/** Serves the RSS feed and any Cloudflare D1 REST POST, routing SELECTs against curator_overrides to `overrideRows`. */
function buildFetchStub(overrideRows: Array<Record<string, unknown>>) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('pib.gov.in')) {
      return new Response(SAMPLE_XML, { status: 200 });
    }
    if (url.includes('api.cloudflare.com') && url.includes('/d1/database/')) {
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      const isCuratorOverridesSelect = typeof body.sql === 'string' && body.sql.includes('FROM curator_overrides');
      return new Response(
        JSON.stringify({ result: [{ results: isCuratorOverridesSelect ? overrideRows : [] }] }),
        { status: 200 }
      );
    }
    return new Response('', { status: 404 });
  });
}

const config = { accountId: 'acct-1', databaseId: 'db-1', apiToken: 'token-1' };

function makeCluster(id: string, overrides: Partial<StoryCluster> = {}): StoryCluster {
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
    updatedAt: '2026-08-01T00:00:00Z',
    ...overrides
  };
}

describe('preserveCuratorOverrides (disk-JSON baseline/fallback)', () => {
  it('reinserts a promoted cluster the fresh crawl dropped', () => {
    const promoted = makeCluster('c-1', { isEditorPromoted: true, isLeadStory: true });
    const result = preserveCuratorOverrides([makeCluster('c-2')], [promoted]);
    expect(result[0]?.id).toBe('c-1');
    expect(result.some((c) => c.id === 'c-2')).toBe(true);
  });

  it('is a no-op when nothing existing is locked', () => {
    const fresh = [makeCluster('c-2')];
    expect(preserveCuratorOverrides(fresh, [makeCluster('c-1')])).toEqual(fresh);
  });
});

describe('fetchCuratorOverridesFromD1', () => {
  it('returns rows on a successful query', async () => {
    const fetchFn = vi.fn(async () =>
      new Response(JSON.stringify({ result: [{ results: [{ id: 'c-1', override_type: 'promote', payload_json: '{}', updated_at: 't' }] }] }), { status: 200 })
    );
    const rows = await fetchCuratorOverridesFromD1(config, fetchFn as unknown as typeof fetch);
    expect(rows).toHaveLength(1);
    expect(rows?.[0]?.id).toBe('c-1');
  });

  it('returns null (not []) and logs when D1 responds with a non-OK status, so an outage is never mistaken for an empty override set', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchFn = vi.fn(async () => new Response('server error', { status: 500 }));
    const rows = await fetchCuratorOverridesFromD1(config, fetchFn as unknown as typeof fetch);
    expect(rows).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('returns null and logs when the fetch itself throws', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchFn = vi.fn(async () => {
      throw new Error('network down');
    });
    const rows = await fetchCuratorOverridesFromD1(config, fetchFn as unknown as typeof fetch);
    expect(rows).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe('applyD1CuratorOverrides', () => {
  it('overlays promote/headline/ssb fields onto the matching cluster, taking priority over disk state', () => {
    const clusters = [makeCluster('c-1', { isEditorPromoted: false, synthesizedHeadline: 'Old' })];
    const rows: D1CuratorOverrideRow[] = [
      {
        id: 'c-1',
        override_type: 'promote',
        payload_json: JSON.stringify({ headline: 'D1 Headline', isEditorPromoted: true, isLeadStory: true }),
        updated_at: 't'
      }
    ];
    const result = applyD1CuratorOverrides(clusters, rows);
    expect(result[0]?.synthesizedHeadline).toBe('D1 Headline');
    expect(result[0]?.isEditorPromoted).toBe(true);
    expect(result[0]?.isLeadStory).toBe(true);
    expect(result[0]?.defenceScore).toBeGreaterThanOrEqual(125);
  });

  it('overlays a "demote" override (isEditorPromoted: false) even when disk state had it promoted', () => {
    const clusters = [makeCluster('c-1', { isEditorPromoted: true, isLeadStory: true, defenceScore: 130 })];
    const rows: D1CuratorOverrideRow[] = [
      { id: 'c-1', override_type: 'demote', payload_json: JSON.stringify({ isEditorPromoted: false, isLeadStory: false }), updated_at: 't' }
    ];
    const result = applyD1CuratorOverrides(clusters, rows);
    expect(result[0]?.isEditorPromoted).toBe(false);
    expect(result[0]?.isLeadStory).toBe(false);
  });

  it('excludes a tombstoned ("delete") cluster from the output entirely, even if disk state had promoted it', () => {
    const clusters = [makeCluster('c-1', { isEditorPromoted: true }), makeCluster('c-2')];
    const rows: D1CuratorOverrideRow[] = [{ id: 'c-1', override_type: 'delete', payload_json: '{}', updated_at: 't' }];
    const result = applyD1CuratorOverrides(clusters, rows);
    expect(result.some((c) => c.id === 'c-1')).toBe(false);
    expect(result.some((c) => c.id === 'c-2')).toBe(true);
  });

  it('skips a row with malformed payload_json instead of throwing, and leaves the rest untouched', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const clusters = [makeCluster('c-1')];
    const rows: D1CuratorOverrideRow[] = [{ id: 'c-1', override_type: 'ignore', payload_json: 'not json', updated_at: 't' }];
    const result = applyD1CuratorOverrides(clusters, rows);
    expect(result[0]?.id).toBe('c-1');
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('ignores an override row whose cluster id is not present in the input (aged out of the current crawl window)', () => {
    const clusters = [makeCluster('c-1')];
    const rows: D1CuratorOverrideRow[] = [{ id: 'c-missing', override_type: 'ignore', payload_json: JSON.stringify({ isIgnored: true }), updated_at: 't' }];
    expect(applyD1CuratorOverrides(clusters, rows)).toEqual(clusters);
  });

  it('is a no-op when there are no override rows', () => {
    const clusters = [makeCluster('c-1')];
    expect(applyD1CuratorOverrides(clusters, [])).toBe(clusters);
  });
});

describe('runIngestionPipeline — D1 override survival through a full crawl', () => {
  const originalEnv = { ...process.env };
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('applies a D1 ignore override onto a cluster the fresh crawl produced, surviving hourly regeneration', async () => {
    Object.assign(process.env, D1_ENV);
    const overrideRows = [
      {
        id: expect.any(String) as unknown as string,
        override_type: 'ignore',
        payload_json: JSON.stringify({ isIgnored: true }),
        updated_at: '2026-09-01T00:00:00Z'
      }
    ];
    // First run (no D1 env) to learn the real generated cluster id, then re-run with that id overridden via D1.
    const plainFetch = vi.fn(async (input: RequestInfo | URL) =>
      String(input).includes('pib.gov.in') ? new Response(SAMPLE_XML, { status: 200 }) : new Response('', { status: 404 })
    );
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    const baseline = await runIngestionPipeline({ feeds: [MOCK_FEED], maxAgeHours: 72, outputPath: null, fetchFn: plainFetch as unknown as typeof fetch });
    const clusterId = baseline.clusters[0]!.id;

    Object.assign(process.env, D1_ENV);
    overrideRows[0]!.id = clusterId;
    const fetchStub = buildFetchStub(overrideRows);
    const result = await runIngestionPipeline({ feeds: [MOCK_FEED], maxAgeHours: 72, outputPath: null, fetchFn: fetchStub as unknown as typeof fetch });

    const overridden = result.clusters.find((c) => c.id === clusterId);
    expect(overridden?.isIgnored).toBe(true);
  });

  it('fails loud (logs, does not silently skip) when D1 is configured but the query errors, and still returns a usable result via the disk fallback', async () => {
    Object.assign(process.env, D1_ENV);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const failingFetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('pib.gov.in')) return new Response(SAMPLE_XML, { status: 200 });
      if (url.includes('api.cloudflare.com')) return new Response('server error', { status: 500 });
      return new Response('', { status: 404 });
    });

    const result = await runIngestionPipeline({ feeds: [MOCK_FEED], maxAgeHours: 72, outputPath: null, fetchFn: failingFetch as unknown as typeof fetch });

    expect(result.clusters.length).toBeGreaterThan(0);
    expect(errorSpy.mock.calls.some((call) => String(call[0]).includes('[D1 CURATOR OVERRIDES]'))).toBe(true);
    errorSpy.mockRestore();
  });
});
