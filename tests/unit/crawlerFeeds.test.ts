/**
 * Unit Tests for Crawler Feed Registry
 * Validates 40+ curated defence feed endpoints, tiers, and URLs.
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it } from 'vitest';
import {
  CRAWLER_FEEDS,
  getActiveFeeds,
  getAllFeeds,
  getFeedsByCategory,
  getFeedsByTier
} from '../../crawler/feeds.js';
import { SourceTier } from '../../src/types/source.js';
import { isValidUrl } from '../../src/utils/security.js';

describe('Crawler Feed Registry', () => {
  it('contains at least 40 curated Indian defence RSS/Atom feeds', () => {
    expect(CRAWLER_FEEDS.length).toBeGreaterThanOrEqual(40);
  });

  it('contains feeds across all 4 reliability tiers', () => {
    const tier1 = getFeedsByTier(SourceTier.TIER_1_OFFICIAL);
    const tier2 = getFeedsByTier(SourceTier.TIER_2_NATIONAL);
    const tier3 = getFeedsByTier(SourceTier.TIER_3_SPECIALIZED);
    const tier4 = getFeedsByTier(SourceTier.TIER_4_OSINT);

    expect(tier1.length).toBeGreaterThanOrEqual(5);
    expect(tier2.length).toBeGreaterThanOrEqual(10);
    expect(tier3.length).toBeGreaterThanOrEqual(10);
    expect(tier4.length).toBeGreaterThanOrEqual(10);
  });

  it('validates that all feed entries have valid HTTPS/HTTP URLs and unique IDs', () => {
    const seenIds = new Set<string>();

    for (const feed of CRAWLER_FEEDS) {
      expect(feed.id).toBeTruthy();
      expect(seenIds.has(feed.id)).toBe(false);
      seenIds.add(feed.id);

      expect(feed.name).toBeTruthy();
      expect(feed.domain).toBeTruthy();
      expect(isValidUrl(feed.url)).toBe(true);
      expect(feed.url.startsWith('https://') || feed.url.startsWith('http://')).toBe(true);
    }
  });

  it('returns all feeds via getAllFeeds and only active via getActiveFeeds', () => {
    const all = getAllFeeds();
    const active = getActiveFeeds();

    expect(all.length).toBe(CRAWLER_FEEDS.length);
    expect(active.length).toBe(CRAWLER_FEEDS.filter((f) => f.enabled).length);
    expect(active.every((f) => f.enabled)).toBe(true);
  });

  it('filters feeds correctly by category', () => {
    const techFeeds = getFeedsByCategory('tech');
    const armyFeeds = getFeedsByCategory('army');
    const strategicFeeds = getFeedsByCategory('strategic');

    expect(techFeeds.length).toBeGreaterThan(0);
    expect(armyFeeds.length).toBeGreaterThan(0);
    expect(strategicFeeds.length).toBeGreaterThan(0);
    expect(techFeeds.every((f) => f.defaultCategory === 'tech')).toBe(true);
  });
});
