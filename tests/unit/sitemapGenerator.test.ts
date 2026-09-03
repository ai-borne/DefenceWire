/**
 * Unit Tests for Dynamic XML Sitemap Engine
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it } from 'vitest';
import {
  generateSitemapEntries,
  generateSitemapXml
} from '../../src/seo/sitemapGenerator.js';
import { ALL_STRATEGIC_PROGRAMS } from '../../src/data/strategicPrograms.js';
import { ALL_SUPPLIERS } from '../../src/data/suppliers/seedSuppliers.js';
import { StoryCluster } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';

describe('Dynamic XML Sitemap Engine', () => {
  it('generates complete sitemap entries covering homepage, all 43 programs, and suppliers', () => {
    const entries = generateSitemapEntries();

    // 1 Homepage + 43 Programs + Suppliers
    expect(entries.length).toBe(1 + ALL_STRATEGIC_PROGRAMS.length + ALL_SUPPLIERS.length);

    // Homepage
    const home = entries.find((e) => e.loc === 'https://www.defencewire.in/');
    expect(home).toBeDefined();
    expect(home?.priority).toBe(1.0);
    expect(home?.changefreq).toBe('hourly');

    // 43 Strategic Programs
    for (const prog of ALL_STRATEGIC_PROGRAMS) {
      const entry = entries.find((e) => e.loc === `https://www.defencewire.in/program/${prog.id}`);
      expect(entry).toBeDefined();
      expect(entry?.priority).toBe(0.9);
      expect(entry?.changefreq).toBe('daily');
    }

    // Verified Suppliers
    for (const supplier of ALL_SUPPLIERS) {
      const entry = entries.find((e) => e.loc === `https://www.defencewire.in/supplier/${supplier.slug}`);
      expect(entry).toBeDefined();
      expect(entry?.priority).toBe(0.8);
      expect(entry?.changefreq).toBe('weekly');
    }
  });

  it('includes active story briefings with lastmod timestamps when provided', () => {
    const mockStories: StoryCluster[] = [
      {
        id: 'cluster-tejas-test-1',
        synthesizedHeadline: 'Tejas Mk1A Delivery Schedule Clarified by MoD',
        primarySource: {
          id: 'src-1',
          title: 'MoD Release',
          url: 'https://pib.gov.in',
          sourceName: 'PIB',
          sourceDomain: 'pib.gov.in',
          tier: SourceTier.TIER_1_OFFICIAL,
          publishedAt: '2026-09-02T14:30:00Z'
        },
        relatedCoverage: [],
        discussions: [],
        categories: ['procurement'],
        entities: ['Tejas'],
        defenceScore: 85,
        isLeadStory: true,
        createdAt: '2026-09-01T10:00:00Z',
        updatedAt: '2026-09-02T14:30:00Z'
      }
    ];

    const entries = generateSitemapEntries(mockStories);
    const storyEntry = entries.find((e) => e.loc === 'https://www.defencewire.in/story/cluster-tejas-test-1');

    expect(storyEntry).toBeDefined();
    expect(storyEntry?.priority).toBe(0.7);
    expect(storyEntry?.lastmod).toBe('2026-09-02');
  });

  it('generates schema-compliant XML markup with proper namespace and declarations', () => {
    const xml = generateSitemapXml();

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain('</urlset>');
    expect(xml).toContain('<loc>https://www.defencewire.in/</loc>');
    expect(xml).toContain('<loc>https://www.defencewire.in/program/tejas-mk1a</loc>');
    expect(xml).toContain('<loc>https://www.defencewire.in/supplier/hal</loc>');
    expect(xml).toContain('<priority>1.0</priority>');
    expect(xml).toContain('<priority>0.9</priority>');
  });
});
