/**
 * Unit Tests: Live Snapshot Freshness Comparison (SSOT)
 * Verifies /data/news.json's core business rule: the curator-published KV
 * snapshot must never permanently shadow a newer hourly-crawled static feed.
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it } from 'vitest';
import { pickFresherSnapshot } from '../../src/services/liveSnapshotFreshness.js';

function json(generatedAt?: string): string {
  return JSON.stringify({ clusters: [], river: [], ...(generatedAt ? { generatedAt } : {}) });
}

describe('pickFresherSnapshot', () => {
  it('picks the KV snapshot when it is newer than the static feed', () => {
    const kv = json('2026-09-06T08:00:00Z');
    const staticFeed = json('2026-09-05T08:00:00Z');

    const result = pickFresherSnapshot({ json: kv }, { json: staticFeed });

    expect(result).toEqual({ json: kv, source: 'kv' });
  });

  it('picks the static feed when a later crawl has overtaken an older curator publish', () => {
    const kv = json('2026-09-04T08:00:00Z');
    const staticFeed = json('2026-09-06T08:00:00Z');

    const result = pickFresherSnapshot({ json: kv }, { json: staticFeed });

    expect(result).toEqual({ json: staticFeed, source: 'static' });
  });

  it('treats a legacy KV snapshot with no generatedAt as the oldest possible, never blocking the static feed', () => {
    const kv = json(); // pre-migration publish, no timestamp embedded
    const staticFeed = json('2026-09-06T08:00:00Z');

    const result = pickFresherSnapshot({ json: kv }, { json: staticFeed });

    expect(result).toEqual({ json: staticFeed, source: 'static' });
  });

  it('falls back to the KV snapshot when the static feed is unavailable or unparsable', () => {
    const kv = json('2026-09-06T08:00:00Z');

    expect(pickFresherSnapshot({ json: kv }, { json: null })).toEqual({ json: kv, source: 'kv' });
    expect(pickFresherSnapshot({ json: kv }, { json: 'not-json' })).toEqual({ json: kv, source: 'kv' });
  });

  it('falls back to the static feed when the KV snapshot is unavailable or unparsable', () => {
    const staticFeed = json('2026-09-06T08:00:00Z');

    expect(pickFresherSnapshot({ json: null }, { json: staticFeed })).toEqual({ json: staticFeed, source: 'static' });
    expect(pickFresherSnapshot({ json: 'not-json' }, { json: staticFeed })).toEqual({
      json: staticFeed,
      source: 'static'
    });
  });

  it('favors the static feed on an exact timestamp tie, since it is what the hourly crawl keeps moving forward', () => {
    const same = '2026-09-06T08:00:00Z';
    const kv = json(same);
    const staticFeed = json(same);

    const result = pickFresherSnapshot({ json: kv }, { json: staticFeed });

    expect(result).toEqual({ json: staticFeed, source: 'static' });
  });

  it('returns null when neither payload is available', () => {
    expect(pickFresherSnapshot({ json: null }, { json: null })).toBeNull();
  });
});
