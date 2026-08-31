/**
 * Unit Tests for News Sources Registry & Tier Weights
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it } from 'vitest';
import {
  extractDomain,
  getAllSources,
  getSourceByDomain,
  getSourceTier,
  getTierAuthorityWeight,
  TIER_WEIGHTS
} from '../../src/data/sources.js';
import { SourceTier } from '../../src/types/source.js';

describe('Source Registry & Tier Weighting', () => {
  it('should define authority weights for all SourceTiers in strict hierarchy', () => {
    const t1 = TIER_WEIGHTS[SourceTier.TIER_1_OFFICIAL].authorityWeight;
    const t1Social = TIER_WEIGHTS[SourceTier.TIER_1_SOCIAL].authorityWeight;
    const t2 = TIER_WEIGHTS[SourceTier.TIER_2_NATIONAL].authorityWeight;
    const t3 = TIER_WEIGHTS[SourceTier.TIER_3_SPECIALIZED].authorityWeight;
    const t4 = TIER_WEIGHTS[SourceTier.TIER_4_OSINT].authorityWeight;

    expect(t1).toBe(1.0);
    expect(t1Social).toBe(0.6);
    expect(t2).toBe(0.85);
    expect(t3).toBe(0.7);
    expect(t4).toBe(0.5);

    expect(t1).toBeGreaterThan(t2);
    expect(t2).toBeGreaterThan(t3);
    expect(t3).toBeGreaterThan(t1Social);
    expect(t1Social).toBeGreaterThan(t4);
  });

  it('should correctly extract clean domains from various URL formats', () => {
    expect(extractDomain('https://pib.gov.in/PressReleasePage.aspx?PRID=123')).toBe('pib.gov.in');
    expect(extractDomain('http://www.thehindu.com/news/national/article.ece')).toBe('thehindu.com');
    expect(extractDomain('livefistdefence.com/page-1')).toBe('livefistdefence.com');
    expect(extractDomain('www.drdo.gov.in')).toBe('drdo.gov.in');
    expect(extractDomain('')).toBe('');
  });

  it('should find registered sources by domain', () => {
    const pib = getSourceByDomain('pib.gov.in');
    expect(pib).toBeDefined();
    expect(pib?.tier).toBe(SourceTier.TIER_1_OFFICIAL);
    expect(pib?.isOfficialGov).toBe(true);

    const hindu = getSourceByDomain('https://www.thehindu.com/news/national');
    expect(hindu).toBeDefined();
    expect(hindu?.tier).toBe(SourceTier.TIER_2_NATIONAL);

    const livefist = getSourceByDomain('livefistdefence.com');
    expect(livefist).toBeDefined();
    expect(livefist?.tier).toBe(SourceTier.TIER_3_SPECIALIZED);

    const idsa = getSourceByDomain('idsa.in');
    expect(idsa).toBeDefined();
    expect(idsa?.tier).toBe(SourceTier.TIER_4_OSINT);
  });

  it('should return default TIER_4_OSINT for unknown domains', () => {
    const unknownTier = getSourceTier('unknown-random-blog.xyz');
    expect(unknownTier).toBe(SourceTier.TIER_4_OSINT);
    expect(getTierAuthorityWeight(unknownTier)).toBe(0.5);
  });

  it('should return all registered sources without duplicates', () => {
    const all = getAllSources();
    expect(all.length).toBeGreaterThan(15);
    const ids = all.map(s => s.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});
