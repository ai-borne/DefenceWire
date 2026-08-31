/**
 * Unit Tests for Dynamic Source Reputation & Scoop Indexing Engine
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import {
  computeReputationMultiplier,
  identifyScoopLeader,
  registerDynamicSourceMultipliers,
  getSourceMultiplier,
  resetSourceMultipliers,
  SourceStats
} from '../../src/engine/sourceReputation.js';
import { StoryCluster } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';

describe('Dynamic Source Reputation Engine', () => {
  beforeEach(() => {
    resetSourceMultipliers();
  });

  it('computes 1.0 default multiplier for baseline statistics', () => {
    const baseline: SourceStats = {
      domain: 'thehindu.com',
      sourceName: 'The Hindu',
      totalIngested: 100,
      acceptedCount: 50,
      scoopCount: 0,
      corroborationCount: 0
    };
    expect(computeReputationMultiplier(baseline)).toBe(1.0);
  });

  it('rewards sources with high scoop counts and corroboration', () => {
    const scoopLeader: SourceStats = {
      domain: 'livefistdefence.com',
      sourceName: 'Livefist',
      totalIngested: 20,
      acceptedCount: 18,
      scoopCount: 5,
      corroborationCount: 10
    };
    const multiplier = computeReputationMultiplier(scoopLeader);
    expect(multiplier).toBeGreaterThan(1.15);
    expect(multiplier).toBeLessThanOrEqual(1.3);
  });

  it('penalizes sources with high noise and low acceptance ratios', () => {
    const noisyFeed: SourceStats = {
      domain: 'clickbaitdefence.com',
      sourceName: 'Noisy Blog',
      totalIngested: 200,
      acceptedCount: 10,
      scoopCount: 0,
      corroborationCount: 0
    };
    const multiplier = computeReputationMultiplier(noisyFeed);
    expect(multiplier).toBeLessThan(1.0);
    expect(multiplier).toBeGreaterThanOrEqual(0.7);
  });

  it('accurately identifies the scoop originator based on earliest publish timestamp', () => {
    const cluster: StoryCluster = {
      id: 'c-scoop-test',
      synthesizedHeadline: 'BrahMos-NG Flight Trials Slated for Mid-2027',
      primarySource: {
        id: 'ps-1',
        title: 'BrahMos-NG Update',
        url: 'https://thehindu.com/brahmos',
        sourceName: 'The Hindu',
        sourceDomain: 'thehindu.com',
        tier: SourceTier.TIER_2_NATIONAL,
        publishedAt: '2026-08-30T14:00:00Z'
      },
      relatedCoverage: [
        {
          id: 'rc-1',
          title: 'Scoop: BrahMos-NG Flight Trial Timeline',
          url: 'https://livefistdefence.com/scoop',
          sourceName: 'Livefist',
          sourceDomain: 'livefistdefence.com',
          tier: SourceTier.TIER_3_SPECIALIZED,
          publishedAt: '2026-08-30T11:30:00Z' // 2.5 hours earlier!
        },
        {
          id: 'rc-2',
          title: 'BrahMos Next Gen Tests',
          url: 'https://ndtv.com/brahmos',
          sourceName: 'NDTV',
          sourceDomain: 'ndtv.com',
          tier: SourceTier.TIER_2_NATIONAL,
          publishedAt: '2026-08-30T15:15:00Z'
        }
      ],
      discussions: [],
      categories: ['tech'],
      entities: ['BrahMos'],
      defenceScore: 90,
      isLeadStory: true,
      createdAt: '2026-08-30T11:30:00Z',
      updatedAt: '2026-08-30T15:15:00Z'
    };

    const leader = identifyScoopLeader(cluster);
    expect(leader).toBe('livefistdefence.com');
  });

  it('manages in-memory dynamic multiplier registry with bounding', () => {
    registerDynamicSourceMultipliers({
      'livefistdefence.com': 1.25,
      'noisyblog.com': 0.75,
      'extreme.com': 2.5 // Should clamp to 1.3
    });

    expect(getSourceMultiplier('livefistdefence.com')).toBe(1.25);
    expect(getSourceMultiplier('noisyblog.com')).toBe(0.75);
    expect(getSourceMultiplier('extreme.com')).toBe(1.3);
    expect(getSourceMultiplier('unknown.com')).toBe(1.0);
  });
});
