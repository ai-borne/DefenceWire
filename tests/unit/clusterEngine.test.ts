/**
 * Unit Tests for Clustering & Deduplication Engine
 * Tests military entity extraction, Jaccard similarity, and multi-source clustering.
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it } from 'vitest';
import {
  areStoriesSimilar,
  clusterArticles,
  computeJaccardSimilarity,
  extractMilitaryEntities,
  pickPrimarySource,
  tokenizeText
} from '../../src/engine/clusterEngine.js';
import { StorySourceItem } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';

describe('Cluster & Deduplication Engine', () => {
  it('should extract recognized military entities and map domain categories', () => {
    const text1 = 'IAF inducts Tejas Mk1A fighters as HAL ramps up production line';
    const res1 = extractMilitaryEntities(text1);
    expect(res1.entities).toContain('Tejas Mk1A');
    expect(res1.entities).toContain('HAL');
    expect(res1.categories).toContain('airforce');
    expect(res1.categories).toContain('tech');

    const text2 = 'DRDO begins trials for Zorawar light tank for LAC high-altitude deployment';
    const res2 = extractMilitaryEntities(text2);
    expect(res2.entities).toContain('Zorawar');
    expect(res2.entities).toContain('DRDO');
    expect(res2.categories).toContain('army');

    const text3 = 'Navy shortlists TKMS and Navantia for Project 75I submarines with AIP';
    const res3 = extractMilitaryEntities(text3);
    expect(res3.entities).toContain('Project 75I');
    expect(res3.categories).toContain('navy');
  });

  it('should clean and tokenize text while removing stopwords', () => {
    const tokens = tokenizeText('The Indian Army conducts military exercise in Ladakh with new tanks');
    expect(tokens.has('the')).toBe(false);
    expect(tokens.has('army')).toBe(true);
    expect(tokens.has('conducts')).toBe(true);
    expect(tokens.has('exercise')).toBe(true);
    expect(tokens.has('ladakh')).toBe(true);
    expect(tokens.has('tanks')).toBe(true);
  });

  it('should compute exact Jaccard similarity between token sets', () => {
    const setA = new Set(['tejas', 'squadron', 'delivery', 'hal']);
    const setB = new Set(['tejas', 'squadron', 'delivery', 'iaf']);

    // Intersection: 3 ('tejas', 'squadron', 'delivery'), Union: 5 ('tejas', 'squadron', 'delivery', 'hal', 'iaf') -> 3/5 = 0.6
    const jaccard = computeJaccardSimilarity(setA, setB);
    expect(jaccard).toBeCloseTo(0.6, 2);

    const disjoint = computeJaccardSimilarity(new Set(['navy', 'submarine']), new Set(['army', 'tank']));
    expect(disjoint).toBe(0);
  });

  it('should detect similar stories from different wire outlets covering the same event', () => {
    const storyA: StorySourceItem = {
      id: 'a-1',
      title: 'HAL scales Tejas Mk1A delivery schedule with GE F404 engine shipments',
      url: 'https://pib.gov.in/news-1',
      sourceName: 'PIB MoD',
      sourceDomain: 'pib.gov.in',
      tier: SourceTier.TIER_1_OFFICIAL,
      publishedAt: '2026-08-30T06:00:00Z'
    };

    const storyB: StorySourceItem = {
      id: 'b-1',
      title: 'GE Aerospace dispatches F404 engines for IAF Tejas Mk1A fighters to HAL',
      url: 'https://thehindu.com/news-2',
      sourceName: 'The Hindu',
      sourceDomain: 'thehindu.com',
      tier: SourceTier.TIER_2_NATIONAL,
      publishedAt: '2026-08-30T06:30:00Z'
    };

    const storyC: StorySourceItem = {
      id: 'c-1',
      title: 'Indian Navy submarine INS Arighat strengthens nuclear deterrence in Bay of Bengal',
      url: 'https://aninews.in/news-3',
      sourceName: 'ANI',
      sourceDomain: 'aninews.in',
      tier: SourceTier.TIER_2_NATIONAL,
      publishedAt: '2026-08-30T07:00:00Z'
    };

    expect(areStoriesSimilar(storyA, storyB)).toBe(true);
    expect(areStoriesSimilar(storyA, storyC)).toBe(false);
  });

  it('should pick Tier 1 official source as primary over Tier 2/3 sources', () => {
    const items: StorySourceItem[] = [
      {
        id: 't3-item',
        title: 'Report on Tejas Delivery',
        url: 'https://livefistdefence.com/t3',
        sourceName: 'Livefist',
        sourceDomain: 'livefistdefence.com',
        tier: SourceTier.TIER_3_SPECIALIZED,
        publishedAt: '2026-08-30T08:00:00Z'
      },
      {
        id: 't1-item',
        title: 'MoD Official Press Release on Tejas Delivery',
        url: 'https://pib.gov.in/t1',
        sourceName: 'PIB',
        sourceDomain: 'pib.gov.in',
        tier: SourceTier.TIER_1_OFFICIAL,
        publishedAt: '2026-08-30T07:00:00Z'
      },
      {
        id: 't2-item',
        title: 'National Report on Tejas Delivery',
        url: 'https://thehindu.com/t2',
        sourceName: 'The Hindu',
        sourceDomain: 'thehindu.com',
        tier: SourceTier.TIER_2_NATIONAL,
        publishedAt: '2026-08-30T07:30:00Z'
      }
    ];

    const { primary, related } = pickPrimarySource(items);
    expect(primary.id).toBe('t1-item');
    expect(primary.isPrimary).toBe(true);
    expect(related.length).toBe(2);
    expect(related.map(r => r.id)).toContain('t2-item');
    expect(related.map(r => r.id)).toContain('t3-item');
  });

  it('should cluster multi-source stream into distinct clusters and deduplicate URLs', () => {
    const rawFeed: StorySourceItem[] = [
      // Cluster 1: Tejas (3 items, 1 duplicate URL)
      {
        id: 'raw-1',
        title: 'GE F404 engines arrive for Tejas Mk1A delivery to IAF',
        url: 'https://thehindu.com/tejas-deal',
        sourceName: 'The Hindu',
        sourceDomain: 'thehindu.com',
        tier: SourceTier.TIER_2_NATIONAL,
        publishedAt: '2026-08-30T06:00:00Z'
      },
      {
        id: 'raw-1-dup',
        title: 'GE F404 engines arrive for Tejas Mk1A delivery to IAF',
        url: 'https://thehindu.com/tejas-deal?utm_source=twitter',
        sourceName: 'The Hindu',
        sourceDomain: 'thehindu.com',
        tier: SourceTier.TIER_2_NATIONAL,
        publishedAt: '2026-08-30T06:00:00Z'
      },
      {
        id: 'raw-2',
        title: 'MoD reviews Tejas Mk1A squadron operationalization schedule',
        url: 'https://pib.gov.in/tejas-mod',
        sourceName: 'PIB MoD',
        sourceDomain: 'pib.gov.in',
        tier: SourceTier.TIER_1_OFFICIAL,
        publishedAt: '2026-08-30T06:30:00Z'
      },
      // Cluster 2: Zorawar (2 items)
      {
        id: 'raw-3',
        title: 'DRDO commences winter trials for Zorawar light tank in Ladakh',
        url: 'https://drdo.gov.in/zorawar-trials',
        sourceName: 'DRDO',
        sourceDomain: 'drdo.gov.in',
        tier: SourceTier.TIER_1_OFFICIAL,
        publishedAt: '2026-08-30T05:00:00Z'
      },
      {
        id: 'raw-4',
        title: 'Zorawar light tank deployment ready for LAC operations',
        url: 'https://aninews.in/zorawar-army',
        sourceName: 'ANI',
        sourceDomain: 'aninews.in',
        tier: SourceTier.TIER_2_NATIONAL,
        publishedAt: '2026-08-30T05:20:00Z'
      }
    ];

    const clusters = clusterArticles(rawFeed, new Date('2026-08-30T08:00:00Z'));

    expect(clusters.length).toBe(2);
    expect(clusters[0]?.isLeadStory).toBe(true);
    expect(clusters[1]?.isLeadStory).toBe(false);

    const tejasCluster = clusters.find(c => c.entities.includes('Tejas Mk1A'));
    expect(tejasCluster).toBeDefined();
    expect(tejasCluster?.primarySource.tier).toBe(SourceTier.TIER_1_OFFICIAL);
    expect(tejasCluster?.relatedCoverage.length).toBe(1); // 1 duplicate stripped, 1 related item

    const zorawarCluster = clusters.find(c => c.entities.includes('Zorawar'));
    expect(zorawarCluster).toBeDefined();
    expect(zorawarCluster?.relatedCoverage.length).toBe(1);
  });
});
