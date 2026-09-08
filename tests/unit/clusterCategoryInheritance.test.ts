/**
 * Unit Tests for MOAT Category Inheritance in Cluster Engine
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it } from 'vitest';
import { clusterArticles } from '../../src/engine/clusterEngine.js';
import { StorySourceItem } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';

describe('Cluster Engine: MOAT Category Inheritance', () => {
  it('automatically adds official category when primary source is Tier 1 Official or has officialType', () => {
    const item: StorySourceItem = {
      id: 'pib-1',
      title: 'MoD Reviews LCA Tejas Production Line',
      url: 'https://pib.gov.in/tejas',
      sourceName: 'PIB MoD',
      sourceDomain: 'pib.gov.in',
      tier: SourceTier.TIER_1_OFFICIAL,
      publishedAt: '2026-08-30T06:00:00Z',
      officialType: 'pib_mod'
    };

    const clusters = clusterArticles([item]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.categories).toContain('official');
    expect(clusters[0]?.categories).toContain('programs');
    expect(clusters[0]?.categories).toContain('airforce');
  });

  it('adds tenders category for tender portals or tender officialType', () => {
    const item: StorySourceItem = {
      id: 'tender-1',
      title: 'Expression of Interest for Light Combat Aircraft Avionics',
      url: 'https://defproc.gov.in/tenders/eoi-lca',
      sourceName: 'DDP MoD',
      sourceDomain: 'defproc.gov.in',
      tier: SourceTier.TIER_1_OFFICIAL,
      publishedAt: '2026-08-30T07:00:00Z',
      officialType: 'tender'
    };

    const clusters = clusterArticles([item]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.categories).toContain('official');
    expect(clusters[0]?.categories).toContain('tenders');
  });

  it('adds idex category for iDEX and TDF innovation challenges', () => {
    const item: StorySourceItem = {
      id: 'idex-1',
      title: 'DISC-12 Defence Innovation Grants Announced for Startups',
      url: 'https://idex.gov.in/disc-12',
      sourceName: 'iDEX Defence',
      sourceDomain: 'idex.gov.in',
      tier: SourceTier.TIER_1_OFFICIAL,
      publishedAt: '2026-08-30T08:00:00Z',
      officialType: 'idex'
    };

    const clusters = clusterArticles([item]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.categories).toContain('official');
    expect(clusters[0]?.categories).toContain('idex');
  });

  it('automatically populates programTags matching strategic programs during clustering', () => {
    const item: StorySourceItem = {
      id: 'amca-story',
      title: 'MoD Allocates Budget for AMCA 5th Gen Fighter Prototypes and Wind Tunnel Trials',
      url: 'https://pib.gov.in/amca-budget',
      sourceName: 'PIB MoD',
      sourceDomain: 'pib.gov.in',
      tier: SourceTier.TIER_1_OFFICIAL,
      publishedAt: '2026-08-30T09:00:00Z',
      officialType: 'pib_mod',
      snippet: 'CCS sanctions ₹15,000 Cr for ADA-led Advanced Medium Combat Aircraft development.'
    };

    const clusters = clusterArticles([item]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.programTags).toBeDefined();
    expect(clusters[0]?.programTags).toContain('amca');
    expect(clusters[0]?.categories).toContain('programs');
  });

  it('aggregates unique item tags into cluster.hashtags and sets primaryTag', () => {
    const item1: StorySourceItem = {
      id: 'item-tejas-1',
      title: 'MoD Clears LCA Tejas Mk1A Procurement Contract at Aero India',
      url: 'https://thehindu.com/tejas-aero-india',
      sourceName: 'The Hindu',
      sourceDomain: 'thehindu.com',
      tier: SourceTier.TIER_2_NATIONAL,
      publishedAt: '2026-08-30T09:00:00Z',
      tags: ['#TejasMk1A', '#AeroIndia']
    };
    const item2: StorySourceItem = {
      id: 'item-tejas-2',
      title: 'CCS Accords Final Clearance for LCA Tejas Mk1A Procurement Deal with TASL',
      url: 'https://livefistdefence.com/tejas-tasl',
      sourceName: 'Livefist',
      sourceDomain: 'livefistdefence.com',
      tier: SourceTier.TIER_3_SPECIALIZED,
      publishedAt: '2026-08-30T09:30:00Z',
      tags: ['#TejasMk1A', '#TASL']
    };

    const clusters = clusterArticles([item1, item2]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.hashtags).toContain('#TejasMk1A');
    expect(clusters[0]?.hashtags).toContain('#AeroIndia');
    expect(clusters[0]?.hashtags).toContain('#TASL');
    expect(clusters[0]?.primaryTag).toBe('#TejasMk1A');
  });
});
