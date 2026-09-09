/**
 * Unit Tests for Durable Canonical-Entity Resolution (docs/knowledge_base_issues.md#2)
 * Verifies exact/fuzzy lookup, self-learning alias write-back, D1 fetch/sync,
 * and the per-cluster orchestrator's fast-path/fallback/error-swallowing behavior.
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it } from 'vitest';
import {
  CanonicalEntityRecord,
  resolveCanonicalTag,
  recordCanonicalResolution,
  fetchCanonicalRegistry,
  syncCanonicalRegistryToD1,
  screenClusterTagsWithCanonicalLearning
} from '../../crawler/canonicalEntityResolver.js';
import { D1RestConfig } from '../../crawler/archiveSync.js';
import { StoryCluster, StorySourceItem } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';

const D1_CONFIG: D1RestConfig = { accountId: 'acc-1', databaseId: 'db-1', apiToken: 'tok-1' };

function makeRecord(overrides: Partial<CanonicalEntityRecord> = {}): CanonicalEntityRecord {
  return {
    id: 's-400',
    canonicalTag: '#S-400',
    aliasSlugs: [],
    mentionCount: 1,
    firstSeenAt: '2026-09-01T00:00:00Z',
    lastSeenAt: '2026-09-01T00:00:00Z',
    ...overrides
  };
}

function createMockCluster(primaryTag?: string): StoryCluster {
  const source: StorySourceItem = {
    id: 'src-1',
    title: 'S400 Triumf squadron declared operational',
    snippet: 'The system was inducted into the Western Air Command.',
    url: 'https://pib.gov.in/test',
    sourceName: 'PIB Defence',
    sourceDomain: 'pib.gov.in',
    tier: SourceTier.TIER_1_OFFICIAL,
    publishedAt: '2026-09-01T10:00:00Z'
  };
  return {
    id: 'cluster-1',
    synthesizedHeadline: source.title,
    primarySource: source,
    relatedCoverage: [],
    discussions: [],
    categories: ['airforce'],
    entities: ['S400'],
    primaryTag,
    defenceScore: 85,
    isLeadStory: true,
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z'
  };
}

describe('resolveCanonicalTag', () => {
  it('returns an exact match when the candidate slug equals a known canonical id', () => {
    const registry = [makeRecord()];
    const hit = resolveCanonicalTag('#S-400', registry);
    expect(hit?.matchType).toBe('exact');
    expect(hit?.record.canonicalTag).toBe('#S-400');
  });

  it('returns an exact match when the candidate slug is a known alias', () => {
    const registry = [makeRecord({ aliasSlugs: ['s400'] })];
    const hit = resolveCanonicalTag('#S400', registry);
    expect(hit?.matchType).toBe('exact');
    expect(hit?.record.id).toBe('s-400');
  });

  it('returns a fuzzy match for a close variant above the threshold', () => {
    // 's-400-triumf' vs 's-400' share {s,400} out of a 3-token union -> 0.67 Jaccard
    const registry = [makeRecord({ id: 's-400-triumf', canonicalTag: '#S-400-Triumf' })];
    const hit = resolveCanonicalTag('#S-400', registry);
    expect(hit?.matchType).toBe('fuzzy');
    expect(hit?.record.id).toBe('s-400-triumf');
  });

  it('returns null when nothing clears the fuzzy threshold, to avoid false merges', () => {
    const registry = [makeRecord({ id: 'brahmos', canonicalTag: '#BrahMos' })];
    expect(resolveCanonicalTag('#Agni-5', registry)).toBeNull();
  });

  it('returns null for an empty or unresolvable candidate tag', () => {
    expect(resolveCanonicalTag('', [makeRecord()])).toBeNull();
  });
});

describe('recordCanonicalResolution', () => {
  it('creates a new record for a genuinely new entity', () => {
    // hashtagToSlug CamelCase-splits 'BrahMos' -> 'brah-mos', same SSOT the resolver keys off.
    const updated = recordCanonicalResolution([], '#BrahMos', '#BrahMos', '2026-09-01T00:00:00Z');
    expect(updated).toHaveLength(1);
    expect(updated[0]).toMatchObject({ id: 'brah-mos', canonicalTag: '#BrahMos', mentionCount: 1, aliasSlugs: [] });
  });

  it('increments mention count and updates lastSeenAt for a repeat resolution', () => {
    const registry = [makeRecord({ mentionCount: 2, lastSeenAt: '2026-09-01T00:00:00Z' })];
    const updated = recordCanonicalResolution(registry, '#S-400', '#S-400', '2026-09-05T00:00:00Z');
    expect(updated[0]!.mentionCount).toBe(3);
    expect(updated[0]!.lastSeenAt).toBe('2026-09-05T00:00:00Z');
  });

  it('learns a new alias slug when the raw candidate differs from the canonical slug', () => {
    const registry = [makeRecord()];
    const updated = recordCanonicalResolution(registry, '#S400', '#S-400', '2026-09-05T00:00:00Z');
    expect(updated[0]!.aliasSlugs).toContain('s400');
  });

  it('does not duplicate an alias slug already learned', () => {
    const registry = [makeRecord({ aliasSlugs: ['s400'] })];
    const updated = recordCanonicalResolution(registry, '#S400', '#S-400', '2026-09-05T00:00:00Z');
    expect(updated[0]!.aliasSlugs).toEqual(['s400']);
  });

  it('is a pure function: it never mutates the input registry array or its records', () => {
    const registry = [makeRecord()];
    const snapshot = JSON.stringify(registry);
    recordCanonicalResolution(registry, '#S400', '#S-400', '2026-09-05T00:00:00Z');
    expect(JSON.stringify(registry)).toBe(snapshot);
  });
});

describe('fetchCanonicalRegistry', () => {
  it('returns an empty registry when D1 is not configured, without making a network call', async () => {
    let called = false;
    const fetchFn = async () => {
      called = true;
      return new Response('{}', { status: 200 });
    };
    const result = await fetchCanonicalRegistry(null, fetchFn as typeof fetch);
    expect(result).toEqual([]);
    expect(called).toBe(false);
  });

  it('maps D1 rows into CanonicalEntityRecord, parsing alias_slugs_json', async () => {
    const fetchFn = async () =>
      new Response(
        JSON.stringify({
          result: [{ results: [{ id: 's-400', canonical_tag: '#S-400', alias_slugs_json: '["s400"]', mention_count: 4, first_seen_at: 'a', last_seen_at: 'b' }] }]
        }),
        { status: 200 }
      );
    const result = await fetchCanonicalRegistry(D1_CONFIG, fetchFn as typeof fetch);
    expect(result).toEqual([{ id: 's-400', canonicalTag: '#S-400', aliasSlugs: ['s400'], mentionCount: 4, firstSeenAt: 'a', lastSeenAt: 'b' }]);
  });

  it('fails loudly and returns an empty registry on a non-OK response, never throwing', async () => {
    const fetchFn = async () => new Response('server error', { status: 500 });
    const result = await fetchCanonicalRegistry(D1_CONFIG, fetchFn as typeof fetch);
    expect(result).toEqual([]);
  });
});

describe('syncCanonicalRegistryToD1', () => {
  it('no-ops without a network call when D1 is not configured', async () => {
    let called = false;
    const fetchFn = async () => {
      called = true;
      return new Response('{}', { status: 200 });
    };
    const result = await syncCanonicalRegistryToD1([makeRecord()], null, fetchFn as typeof fetch);
    expect(result).toEqual({ synced: 0, failed: 0 });
    expect(called).toBe(false);
  });

  it('upserts every record and counts failures without throwing', async () => {
    let call = 0;
    const fetchFn = async () => {
      call++;
      return new Response('{}', { status: call === 1 ? 200 : 500 });
    };
    const result = await syncCanonicalRegistryToD1([makeRecord({ id: 'a' }), makeRecord({ id: 'b' })], D1_CONFIG, fetchFn as typeof fetch);
    expect(result).toEqual({ synced: 1, failed: 1 });
  });
});

describe('screenClusterTagsWithCanonicalLearning', () => {
  it('short-circuits via the canonical registry and records the resolution back', async () => {
    // 's400' is already a learned alias of the 's-400' canonical entity.
    const registry = [makeRecord({ aliasSlugs: ['s400'] })];
    const cluster = createMockCluster('#S400');

    const updated = await screenClusterTagsWithCanonicalLearning(cluster, registry, null, {}, '2026-09-05T00:00:00Z');

    expect(cluster.primaryTag).toBe('#S-400');
    const record = updated.find((r) => r.id === 's-400');
    expect(record?.mentionCount).toBe(2);
    expect(record?.aliasSlugs).toContain('s400');
  });

  it('falls through to the real cascade and mints a new registry entry when nothing matches', async () => {
    const cluster = createMockCluster(undefined);
    cluster.synthesizedHeadline = 'India tests Agni-5 MIRV-capable ballistic missile';
    cluster.entities = ['Agni-5'];
    cluster.primarySource.snippet = 'DRDO confirmed a successful MIRV payload test of the Agni-5 missile.';

    const intel = { whyItMatters: 'MIRV test', primaryTag: '#Agni-5', focalEntity: 'Agni-5', hashtags: ['#Agni-5'] };
    const updated = await screenClusterTagsWithCanonicalLearning(cluster, [], intel, {}, '2026-09-05T00:00:00Z');

    expect(cluster.primaryTag).toBe('#Agni-5');
    expect(updated.some((r) => r.id === 'agni-5')).toBe(true);
  });

  it('returns the registry unchanged when the cascade rejects the candidate outright', async () => {
    // "#LAC" on an unrelated helicopter story with no border anchors -> Tier 1 rejects it,
    // cluster.primaryTag ends up undefined, so nothing should be recorded.
    const cluster = createMockCluster('#LAC');
    cluster.synthesizedHeadline = 'HAL LUH completes cold weather trials';
    cluster.primarySource.snippet = 'The helicopter completed flight trials in Leh.';
    cluster.entities = ['HAL', 'LUH'];

    const emptyRegistry: CanonicalEntityRecord[] = [];

    const updated = await screenClusterTagsWithCanonicalLearning(cluster, emptyRegistry, null, {}, '2026-09-05T00:00:00Z');

    expect(cluster.primaryTag).toBeUndefined();
    expect(updated).toEqual(emptyRegistry);
  });
});
