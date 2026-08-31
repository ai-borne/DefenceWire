/**
 * Unit Tests for Curated International Defence Feeds
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it } from 'vitest';
import { INTERNATIONAL_DEFENCE_FEEDS } from '../../crawler/feedsInternational.js';
import { isValidUrl } from '../../src/utils/security.js';

describe('International Defence Feeds Registry', () => {
  it('contains exactly 10 curated global defence sources', () => {
    expect(INTERNATIONAL_DEFENCE_FEEDS).toHaveLength(10);
  });

  it('contains reputable international defence intelligence domains', () => {
    const domains = INTERNATIONAL_DEFENCE_FEEDS.map((f) => f.domain);
    expect(domains).toContain('defensenews.com');
    expect(domains).toContain('twz.com');
    expect(domains).toContain('aviationweek.com');
    expect(domains).toContain('janes.com');
    expect(domains).toContain('sipri.org');
  });

  it('ensures all international feed URLs are valid and unique', () => {
    const seenIds = new Set<string>();
    for (const feed of INTERNATIONAL_DEFENCE_FEEDS) {
      expect(seenIds.has(feed.id)).toBe(false);
      seenIds.add(feed.id);
      expect(isValidUrl(feed.url)).toBe(true);
      expect(feed.url.startsWith('https://')).toBe(true);
      expect(feed.enabled).toBe(true);
    }
  });
});
