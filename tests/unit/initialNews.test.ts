/**
 * Unit Tests for Initial Datasets (Story Clusters & River of News)
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it } from 'vitest';
import { INITIAL_STORY_CLUSTERS } from '../../src/data/initialNews.js';
import { INITIAL_RIVER_ITEMS } from '../../src/data/riverNews.js';
import { isValidExternalUrl } from '../../src/utils/security.js';

describe('Initial Datasets Integrity', () => {
  it('should contain curated story clusters spanning key defence domains', () => {
    expect(INITIAL_STORY_CLUSTERS.length).toBeGreaterThanOrEqual(6);

    const categories = new Set(INITIAL_STORY_CLUSTERS.flatMap(c => c.categories));
    expect(categories.has('airforce')).toBe(true);
    expect(categories.has('navy')).toBe(true);
    expect(categories.has('army')).toBe(true);
    expect(categories.has('tech')).toBe(true);
    expect(categories.has('procurement')).toBe(true);
    expect(categories.has('strategic')).toBe(true);
    expect(categories.has('ssb')).toBe(true);
  });

  it('should designate exactly one lead story among initial clusters', () => {
    const leadStories = INITIAL_STORY_CLUSTERS.filter(c => c.isLeadStory);
    expect(leadStories.length).toBe(1);
    expect(leadStories[0]?.synthesizedHeadline).toContain('Tejas Mk1A');
  });

  it('should have valid secure external URLs and well-formed sources for every cluster', () => {
    for (const cluster of INITIAL_STORY_CLUSTERS) {
      expect(cluster.id).toBeTruthy();
      expect(cluster.synthesizedHeadline).toBeTruthy();
      expect(cluster.primarySource).toBeDefined();
      expect(cluster.primarySource.isPrimary).toBe(true);
      expect(isValidExternalUrl(cluster.primarySource.url)).toBe(true);
      expect(cluster.primarySource.sourceName).toBeTruthy();
      expect(cluster.primarySource.sourceDomain).toBeTruthy();

      // Related coverage
      for (const related of cluster.relatedCoverage) {
        expect(isValidExternalUrl(related.url)).toBe(true);
        expect(related.sourceName).toBeTruthy();
      }

      // Check SSB intel if present
      if (cluster.ssbIntel) {
        expect(cluster.ssbIntel.whyItMatters.length).toBeGreaterThan(10);
        expect(cluster.ssbIntel.gdLecturettePoints?.length).toBeGreaterThanOrEqual(1);
        expect(cluster.ssbIntel.potentialInterviewQuestions?.length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('should contain rich real-time chronological River of News items', () => {
    expect(INITIAL_RIVER_ITEMS.length).toBeGreaterThanOrEqual(10);

    for (const item of INITIAL_RIVER_ITEMS) {
      expect(item.id).toBeTruthy();
      expect(item.title).toBeTruthy();
      expect(isValidExternalUrl(item.url)).toBe(true);
      expect(item.sourceName).toBeTruthy();
      expect(item.sourceDomain).toBeTruthy();
      expect(item.publishedAt).toBeTruthy();
    }
  });
});
