/**
 * Clustering & Deduplication Engine for DefenceWire.in
 * Military entity extraction, Jaccard similarity grouping, and cluster synthesis.
 * Hard limit: <= 300 LOC.
 */

import { StoryCluster, StorySourceItem } from '../types/news.js';
import { getTierAuthorityWeight } from '../data/sources.js';
import { calculateScoreBreakdown } from './rankingEngine.js';
import { computeStableHash } from '../utils/stableId.js';

import { KNOWN_MILITARY_ENTITIES, extractMilitaryEntities, MilitaryEntityConfig } from '../data/militaryEntities.js';

export { KNOWN_MILITARY_ENTITIES, extractMilitaryEntities };
export type { MilitaryEntityConfig };

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'has', 'have', 'had',
  'this', 'that', 'these', 'those', 'its', 'their', 'new', 'after', 'over', 'into',
  'says', 'said', 'will', 'indian', 'india', 'defence', 'military'
]);

/**
 * Normalizes text into a set of clean word tokens.
 */
export function tokenizeText(text: string): Set<string> {
  if (!text) return new Set();
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w));
  return new Set(words);
}

/**
 * Computes Jaccard similarity coefficient: |A ∩ B| / |A ∪ B|
 */
export function computeJaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersectionSize = 0;
  for (const item of setA) {
    if (setB.has(item)) {
      intersectionSize++;
    }
  }
  const unionSize = setA.size + setB.size - intersectionSize;
  return unionSize === 0 ? 0 : intersectionSize / unionSize;
}

/**
 * Determines whether two news items belong to the same story cluster.
 */
export function areStoriesSimilar(itemA: StorySourceItem, itemB: StorySourceItem, threshold = 0.28): boolean {
  // Normalize URLs to prevent exact duplicate indexing
  const cleanUrlA = ((itemA.url || '').split('?')[0] ?? '').toLowerCase();
  const cleanUrlB = ((itemB.url || '').split('?')[0] ?? '').toLowerCase();
  if (cleanUrlA && cleanUrlA === cleanUrlB) return true;

  const entitiesA = extractMilitaryEntities(itemA.title);
  const entitiesB = extractMilitaryEntities(itemB.title);

  // Check common entity overlap
  const sharedEntities = entitiesA.entities.filter(e => entitiesB.entities.includes(e));

  const tokensA = tokenizeText(itemA.title);
  const tokensB = tokenizeText(itemB.title);
  const jaccard = computeJaccardSimilarity(tokensA, tokensB);

  // If sharing high-specificity entity, lower required token threshold
  if (sharedEntities.length > 0) {
    return jaccard >= 0.14;
  }

  return jaccard >= threshold;
}

/**
 * Selects the authoritative primary source from a group of items.
 * Highest SourceTier weight wins; recency breaks ties.
 */
export function pickPrimarySource(items: StorySourceItem[]): { primary: StorySourceItem; related: StorySourceItem[] } {
  if (!items || items.length === 0) {
    throw new Error('Cannot pick primary source from empty list');
  }

  const sorted = [...items].sort((a, b) => {
    const weightDiff = getTierAuthorityWeight(b.tier) - getTierAuthorityWeight(a.tier);
    if (weightDiff !== 0) return weightDiff;
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });

  const first = sorted[0];
  if (!first) {
    throw new Error('No items in sorted list');
  }

  const primary: StorySourceItem = { ...first, isPrimary: true };
  const related: StorySourceItem[] = sorted.slice(1).map(item => ({ ...item, isPrimary: false }));

  return { primary, related };
}

/**
 * Groups a stream of raw StorySourceItems into coherent StoryClusters.
 */
export function clusterArticles(articles: StorySourceItem[], now: Date = new Date()): StoryCluster[] {
  if (!articles || articles.length === 0) {
    return [];
  }

  // Deduplicate exact URLs first
  const seenUrls = new Set<string>();
  const uniqueArticles: StorySourceItem[] = [];
  for (const article of articles) {
    const cleanUrl = (article.url.split('?')[0] ?? '').toLowerCase();
    if (!seenUrls.has(cleanUrl)) {
      seenUrls.add(cleanUrl);
      uniqueArticles.push(article);
    }
  }

  const groups: StorySourceItem[][] = [];

  for (const article of uniqueArticles) {
    let matchedGroup = false;
    for (const group of groups) {
      if (group.some(existing => areStoriesSimilar(existing, article))) {
        group.push(article);
        matchedGroup = true;
        break;
      }
    }
    if (!matchedGroup) {
      groups.push([article]);
    }
  }

  // Build StoryCluster for each group
  const clusters: StoryCluster[] = groups.map((group) => {
    const { primary, related } = pickPrimarySource(group);
    const allTitles = group.map(g => g.title).join(' ');
    const { entities, categories } = extractMilitaryEntities(allTitles);

    const baseCluster: StoryCluster = {
      id: `cluster-${computeStableHash(primary.url)}`,
      synthesizedHeadline: primary.title,
      primarySource: primary,
      relatedCoverage: related,
      discussions: [],
      categories,
      entities,
      defenceScore: 0,
      isLeadStory: false,
      createdAt: primary.publishedAt,
      updatedAt: group.reduce((latest, item) => (item.publishedAt > latest ? item.publishedAt : latest), primary.publishedAt)
    };

    const breakdown = calculateScoreBreakdown(baseCluster, now);
    baseCluster.defenceScore = breakdown.finalDefenceScore;
    return baseCluster;
  });

  // Sort descending by DefenceScore
  clusters.sort((a, b) => b.defenceScore - a.defenceScore);
  const lead = clusters[0];
  if (lead) {
    lead.isLeadStory = true;
  }

  return clusters;
}
