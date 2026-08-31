/**
 * Curated Indian Defence RSS & Atom Feed Registry
 * SSOT combining 40+ feeds across all 4 reliability tiers.
 * Hard limit: <= 300 LOC.
 */

import { DomainCategory } from '../src/types/news.js';
import { SourceTier } from '../src/types/source.js';
import { FeedConfig } from './feedTypes.js';
import { OFFICIAL_AND_NATIONAL_FEEDS } from './feedsOfficialNational.js';
import { SPECIALIZED_AND_THINKTANK_FEEDS } from './feedsSpecializedThinkTanks.js';
import { INTERNATIONAL_DEFENCE_FEEDS } from './feedsInternational.js';
import { SOCIAL_FEEDS } from './feedsSocial.js';

export * from './feedTypes.js';
export * from './feedsSocial.js';

export const CRAWLER_FEEDS: FeedConfig[] = [
  ...OFFICIAL_AND_NATIONAL_FEEDS,
  ...SPECIALIZED_AND_THINKTANK_FEEDS,
  ...INTERNATIONAL_DEFENCE_FEEDS,
  ...SOCIAL_FEEDS
];


export function getAllFeeds(): FeedConfig[] {
  return [...CRAWLER_FEEDS];
}

export function getActiveFeeds(): FeedConfig[] {
  return CRAWLER_FEEDS.filter((f) => f.enabled);
}

export function getFeedsByTier(tier: SourceTier): FeedConfig[] {
  return CRAWLER_FEEDS.filter((f) => f.tier === tier && f.enabled);
}

export function getFeedsByCategory(category: DomainCategory): FeedConfig[] {
  return CRAWLER_FEEDS.filter((f) => f.defaultCategory === category && f.enabled);
}
