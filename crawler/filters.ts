/**
 * Article Filtering & Relevance Engine for DefenceWire.in
 * Implements strict whole-word keyword matching, entity recognition, negative blacklisting, and freshness gates.
 * Hard limit: <= 300 LOC.
 */

import { StorySourceItem } from '../src/types/news.js';
import { SourceTier } from '../src/types/source.js';
import { FeedConfig } from './feeds.js';
import { extractMilitaryEntities } from '../src/engine/clusterEngine.js';

export const NON_DEFENCE_BLACKLIST = [
  'mann ki baat', 'drug-free', 'nasha mukt', 'election rally', 'assembly election',
  'bollywood', 'box office', 'cricket', 'ipl', 'bcci', 'stock market', 'sensex',
  'nifty', 'gold rate', 'silver rate', 'petrol price', 'diesel price', 'entertainment',
  'celebrity', 'horoscope', 'astrology', 'weather forecast', 'monsoon rainfall',
  'traffic jam', 'real estate', 'crypto', 'bitcoin', 'mutual fund', 'cinema', 'ott release'
];

export const NON_DEFENCE_BLACKLIST_REGEX = new RegExp(
  `\\b(${NON_DEFENCE_BLACKLIST.join('|')})\\b`,
  'i'
);

export const DEFENCE_WHOLE_WORD_REGEX = /\b(mod|iaf|drdo|hal|dac|ccs|lac|loc|ssb|aon|iddm|atags|mbbr|iadc|cds|dmr|ssbn|ssn|sam|bvr|qrsam|vshorads?|lch|luh|alhs?|bmd|ecm|c-uas|cuas|uavs?|ucavs?|fpv|loitering munition|defence|defense|military|army|navy|air force|armed forces|warship|corvette|frigate|destroyer|submarine|tejas|amca|rafale|zorawar|brahmos|pinaka|s-400|prachand|aircraft carrier|tri-service|theat(?:er|re) command|procurement|missile|artillery|infantry|air defen[sc]e|atmanirbhar|make in india)\b/i;

/**
 * Validates if an article item is strictly relevant to Indian defence & military affairs.
 */
export function isDefenceRelevant(item: StorySourceItem, feed: FeedConfig): boolean {
  const fullText = `${item.title} ${item.snippet || ''}`;

  // 1. Blacklist check: Hard reject across all tiers
  if (NON_DEFENCE_BLACKLIST_REGEX.test(fullText)) {
    return false;
  }

  // 2. Military Entity extraction
  const entities = extractMilitaryEntities(item.title);
  if (entities.entities.length > 0) {
    return true;
  }

  // 3. Whole-word defence keywords check
  if (DEFENCE_WHOLE_WORD_REGEX.test(fullText)) {
    return true;
  }

  // 4. Official & Specialized tier pass-through if not blacklisted
  if (feed.tier === SourceTier.TIER_1_OFFICIAL || feed.tier === SourceTier.TIER_3_SPECIALIZED) {
    return true;
  }

  return false;
}

/**
 * Filters out articles older than maxAgeHours.
 */
export function filterFreshArticles(
  items: StorySourceItem[],
  maxAgeHours: number,
  now: Date = new Date()
): StorySourceItem[] {
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
  const nowMs = now.getTime();

  return items.filter((item) => {
    const pubMs = new Date(item.publishedAt).getTime();
    if (isNaN(pubMs)) return true;
    return nowMs - pubMs <= maxAgeMs;
  });
}
