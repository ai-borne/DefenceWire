/**
 * Unit Tests for Social Clustering, Discussion Quote Conversion, and Scoring Bonuses
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it } from 'vitest';
import {
  clusterArticles,
  convertSocialItemToDiscussionQuote,
  pickPrimarySource
} from '../../src/engine/clusterEngine.js';
import { calculateScoreBreakdown, rankClusters } from '../../src/engine/rankingEngine.js';
import { StoryCluster, StorySourceItem } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';

describe('Social Clustering & Corroboration Engine', () => {
  const referenceTime = new Date('2026-08-30T10:00:00Z');

  const wireArticleA: StorySourceItem = {
    id: 'wire-hindu-1',
    title: 'DRDO conducts successful flight test of long-range guided glide bomb Gaurav off Odisha coast',
    snippet: 'The indigenous glide bomb Gaurav was launched from Su-30MKI fighter aircraft.',
    url: 'https://thehindu.com/news/national/drdo-gaurav-test',
    sourceName: 'The Hindu',
    sourceDomain: 'thehindu.com',
    tier: SourceTier.TIER_2_NATIONAL,
    publishedAt: '2026-08-30T06:00:00Z'
  };

  const wireArticleB: StorySourceItem = {
    id: 'wire-ani-1',
    title: 'Indian Air Force fighter test fires DRDO Gaurav glide bomb successfully',
    snippet: 'Defence officials confirmed the flight trials met all mission parameters.',
    url: 'https://aninews.in/news/drdo-gaurav-trials',
    sourceName: 'ANI',
    sourceDomain: 'aninews.in',
    tier: SourceTier.TIER_2_NATIONAL,
    publishedAt: '2026-08-30T06:30:00Z'
  };

  const officialTweet: StorySourceItem = {
    id: 'tweet-drdo-1',
    title: 'DRDO successfully flight-tested Long Range Glide Bomb GAURAV from Su-30 MK-I platform off Odisha coast.',
    snippet: 'GAURAV is an indigenous 1,000 kg class glide bomb designed to hit targets with high precision.',
    url: 'https://x.com/DRDO_India/status/1820000000000000000',
    sourceName: 'DRDO (@DRDO_India)',
    sourceDomain: 'x.com',
    author: '@DRDO_India',
    tier: SourceTier.TIER_1_SOCIAL,
    publishedAt: '2026-08-30T06:15:00Z'
  };

  const youtubeVideo: StorySourceItem = {
    id: 'yt-drdo-1',
    title: 'Flight Trial Highlights: Long Range Glide Bomb Gaurav release from Su-30MKI',
    snippet: 'Official telemetry and onboard camera footage from the successful Gaurav weapon trials.',
    url: 'https://www.youtube.com/watch?v=mockGaurav01',
    sourceName: 'DRDO India (Official YouTube)',
    sourceDomain: 'youtube.com',
    tier: SourceTier.TIER_1_SOCIAL,
    publishedAt: '2026-08-30T06:45:00Z'
  };

  it('never promotes a social post to primarySource when a wire article exists', () => {
    const items = [officialTweet, wireArticleA, wireArticleB];
    const { primary, related } = pickPrimarySource(items);

    expect(primary.id).toBe('wire-ani-1');
    expect(primary.tier).toBe(SourceTier.TIER_2_NATIONAL);
    expect(primary.isPrimary).toBe(true);

    expect(related.map((r) => r.id)).toContain('wire-hindu-1');
    expect(related.map((r) => r.id)).not.toContain('tweet-drdo-1');
  });

  it('converts an official social item to a DiscussionQuote structure', () => {
    const quote = convertSocialItemToDiscussionQuote(officialTweet);

    expect(quote.id).toBeDefined();
    expect(quote.author).toBe('DRDO');
    expect(quote.handleOrTitle).toBe('@DRDO_India');
    expect(quote.quote).toBe(officialTweet.snippet);
    expect(quote.url).toBe(officialTweet.url);
    expect(quote.sourcePlatform).toBe('X/Twitter');
  });

  it('clusters matching wire articles and official social updates together, attaching social items as DiscussionQuotes', () => {
    const items = [wireArticleA, wireArticleB, officialTweet, youtubeVideo];
    const clusters = clusterArticles(items, referenceTime);

    expect(clusters.length).toBe(1);
    const cluster = clusters[0]!;

    expect(cluster.primarySource.tier).not.toBe(SourceTier.TIER_1_SOCIAL);
    expect(cluster.primarySource.id).toBe('wire-ani-1');
    expect(cluster.relatedCoverage.length).toBe(1);
    expect(cluster.relatedCoverage[0]?.id).toBe('wire-hindu-1');

    expect(cluster.discussions.length).toBe(2);
    expect(cluster.discussions.map((d) => d.handleOrTitle)).toContain('@DRDO_India');
    expect(cluster.discussions.some((d) => d.author.includes('DRDO India'))).toBe(true);
  });

  it('applies the +15 Official Social Signal Confirmation bonus to corroborated clusters', () => {
    const uncorroboratedCluster: StoryCluster = {
      id: 'cluster-uncorroborated',
      synthesizedHeadline: 'Foreign shipyard bids for Indian Navy landing platform dock project',
      primarySource: wireArticleA,
      relatedCoverage: [wireArticleB],
      discussions: [],
      categories: ['navy', 'procurement'],
      entities: ['Project 75I'],
      defenceScore: 0,
      isLeadStory: false,
      createdAt: '2026-08-30T06:00:00Z',
      updatedAt: '2026-08-30T06:30:00Z'
    };

    const corroboratedCluster: StoryCluster = {
      ...uncorroboratedCluster,
      id: 'cluster-corroborated',
      discussions: [convertSocialItemToDiscussionQuote(officialTweet)]
    };

    const breakdownUncorr = calculateScoreBreakdown(uncorroboratedCluster, referenceTime);
    const bonusUncorr = breakdownUncorr.bonuses.find((b) => b.name.includes('Official Social Signal'));
    expect(bonusUncorr?.applied).toBe(false);

    const breakdownCorr = calculateScoreBreakdown(corroboratedCluster, referenceTime);
    const bonusCorr = breakdownCorr.bonuses.find((b) => b.name.includes('Official Social Signal'));
    expect(bonusCorr?.applied).toBe(true);
    expect(bonusCorr?.points).toBe(15);
    expect(breakdownCorr.finalDefenceScore).toBeGreaterThan(breakdownUncorr.finalDefenceScore);
  });

  it('routes orphan social posts away from Top Stories clusters, preserving them for the river', () => {
    const orphanTweet: StorySourceItem = {
      id: 'orphan-1',
      title: 'Army Commander reviews operational preparedness at forward post in Siachen',
      snippet: 'Northern Command chief interacted with troops stationed at highest battlefield.',
      url: 'https://x.com/NorthernComd_IA/status/1820000000000000001',
      sourceName: 'Northern Command Indian Army (@NorthernComd_IA)',
      sourceDomain: 'x.com',
      author: '@NorthernComd_IA',
      tier: SourceTier.TIER_1_SOCIAL,
      publishedAt: '2026-08-30T07:00:00Z'
    };

    const clusters = clusterArticles([orphanTweet], referenceTime);
    expect(clusters.length).toBe(0);
  });

  it('ranks corroborated stories higher due to official confirmation bonus and velocity points', () => {
    const baseStory: StoryCluster = {
      id: 'cluster-base',
      synthesizedHeadline: 'Defence Ministry reviews Tejas Mk1A operational readiness',
      primarySource: {
        ...wireArticleA,
        title: 'Defence Ministry reviews Tejas Mk1A operational readiness'
      },
      relatedCoverage: [],
      discussions: [],
      categories: ['airforce', 'strategic'],
      entities: ['Tejas Mk1A'],
      defenceScore: 0,
      isLeadStory: false,
      createdAt: '2026-08-30T06:00:00Z',
      updatedAt: '2026-08-30T06:00:00Z'
    };

    const corroboratedStory: StoryCluster = {
      ...baseStory,
      id: 'cluster-boosted',
      discussions: [convertSocialItemToDiscussionQuote(officialTweet)]
    };

    const ranked = rankClusters([baseStory, corroboratedStory], referenceTime);
    expect(ranked[0]?.id).toBe('cluster-boosted');
    expect(ranked[0]?.isLeadStory).toBe(true);
    expect(ranked[0]?.defenceScore).toBeGreaterThan(ranked[1]?.defenceScore ?? 0);
  });
});
