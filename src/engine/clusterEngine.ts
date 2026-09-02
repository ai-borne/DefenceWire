/**
 * Clustering & Deduplication Engine for DefenceWire.in
 * Military entity extraction, Jaccard similarity grouping, and cluster synthesis.
 * Hard limit: <= 300 LOC.
 */

import { DiscussionQuote, StoryCluster, StorySourceItem } from '../types/news.js';
import { SourceTier } from '../types/source.js';
import { getTierAuthorityWeight } from '../data/sources.js';
import { calculateScoreBreakdown } from './rankingEngine.js';
import { computeStableHash } from '../utils/stableId.js';

import { KNOWN_MILITARY_ENTITIES, extractMilitaryEntities, MilitaryEntityConfig } from '../data/militaryEntities.js';
import { hasSharedActionSignature } from './actionSignatures.js';


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

const AGENCY_ENTITIES = new Set(['DRDO', 'HAL', 'DAC Clearance', 'CCS Approval']);

export const MAX_CLUSTER_TIME_DIFF_HOURS = 48;

/**
 * Determines whether two news items belong to the same story cluster using Two-Stage Techmeme verification.
 */
export function areStoriesSimilar(itemA: StorySourceItem, itemB: StorySourceItem, threshold = 0.32): boolean {
  // Normalize URLs to prevent exact duplicate indexing
  const cleanUrlA = ((itemA.url || '').split('?')[0] ?? '').toLowerCase();
  const cleanUrlB = ((itemB.url || '').split('?')[0] ?? '').toLowerCase();
  if (cleanUrlA && cleanUrlA === cleanUrlB) return true;

  // Enforce temporal window: stories older than 48h apart are distinct news cycles
  if (itemA.publishedAt && itemB.publishedAt) {
    const timeA = new Date(itemA.publishedAt).getTime();
    const timeB = new Date(itemB.publishedAt).getTime();
    if (!isNaN(timeA) && !isNaN(timeB)) {
      const diffHours = Math.abs(timeA - timeB) / (1000 * 60 * 60);
      if (diffHours > MAX_CLUSTER_TIME_DIFF_HOURS) {
        return false;
      }
    }
  }

  const fullTextA = `${itemA.title} ${itemA.snippet || ''}`;
  const fullTextB = `${itemB.title} ${itemB.snippet || ''}`;

  const entitiesA = extractMilitaryEntities(fullTextA);
  const entitiesB = extractMilitaryEntities(fullTextB);
  const sharedEntities = entitiesA.entities.filter(e => entitiesB.entities.includes(e));
  const hasPlatformOverlap = sharedEntities.some(e => !AGENCY_ENTITIES.has(e));

  const sharedAction = hasSharedActionSignature(fullTextA, fullTextB);

  const tokensA = tokenizeText(itemA.title);
  const tokensB = tokenizeText(itemB.title);
  const jaccard = computeJaccardSimilarity(tokensA, tokensB);

  // Stage 1: High specificity - Shared Weapon Platform + Shared Action Signature
  if (hasPlatformOverlap && sharedAction) {
    return jaccard >= 0.05;
  }

  // Shared weapon platform alone
  if (hasPlatformOverlap) {
    return jaccard >= 0.14;
  }

  // Shared agency alone requires higher topic correlation
  if (sharedEntities.length > 0) {
    return jaccard >= 0.24;
  }

  // Stage 2: General story similarity
  return jaccard >= threshold;
}





/**
 * Converts an official social post into a structured DiscussionQuote.
 */
export function convertSocialItemToDiscussionQuote(item: StorySourceItem): DiscussionQuote {
  const author = item.sourceName.split('(')[0]?.trim() || item.sourceName;
  let handleOrTitle = item.author || '';
  if (!handleOrTitle) {
    const parenMatch = item.sourceName.match(/\((@[^)]+)\)/);
    if (parenMatch && parenMatch[1]) {
      handleOrTitle = parenMatch[1];
    } else if (item.sourceName.includes('@')) {
      handleOrTitle = item.sourceName;
    } else {
      handleOrTitle = `@${author.replace(/\s+/g, '')}`;
    }
  }
  return {
    id: `quote-${computeStableHash(item.url || item.id)}`,
    author,
    handleOrTitle,
    quote: item.snippet || item.title,
    url: item.url,
    sourcePlatform: 'X/Twitter'
  };
}

/**
 * Selects the authoritative primary source from a group of items.
 * Wire articles always take precedence over social posts.
 * Highest SourceTier weight wins; recency breaks ties.
 */
export function pickPrimarySource(items: StorySourceItem[]): { primary: StorySourceItem; related: StorySourceItem[] } {
  if (!items || items.length === 0) {
    throw new Error('Cannot pick primary source from empty list');
  }

  // Top Stories Quality Guard: Social posts are never permitted to become the primarySource if wire articles exist
  const nonSocial = items.filter(it => it.tier !== SourceTier.TIER_1_SOCIAL);
  const candidates = nonSocial.length > 0 ? nonSocial : items;

  const sorted = [...candidates].sort((a, b) => {
    const weightDiff = getTierAuthorityWeight(b.tier) - getTierAuthorityWeight(a.tier);
    if (weightDiff !== 0) return weightDiff;
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });

  const first = sorted[0];
  if (!first) {
    throw new Error('No items in sorted list');
  }

  const primary: StorySourceItem = { ...first, isPrimary: true };
  const related: StorySourceItem[] = items
    .filter(item => item.id !== primary.id && item.tier !== SourceTier.TIER_1_SOCIAL)
    .map(item => ({ ...item, isPrimary: false }));

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

  // Build StoryCluster for each group that has wire reporting coverage
  const clusters: StoryCluster[] = [];

  for (const group of groups) {
    const nonSocial = group.filter(it => it.tier !== SourceTier.TIER_1_SOCIAL);
    const socialItems = group.filter(it => it.tier === SourceTier.TIER_1_SOCIAL);

    // Sensor & Corroborator Router: Orphan social posts without wire coverage route solely to the River
    if (nonSocial.length === 0) {
      continue;
    }

    const { primary, related } = pickPrimarySource(group);
    const allTitles = group.map(g => g.title).join(' ');
    const { entities, categories } = extractMilitaryEntities(allTitles);
    const discussions: DiscussionQuote[] = socialItems.map(convertSocialItemToDiscussionQuote);

    const finalCategories = new Set(categories);
    if (
      primary.officialType ||
      primary.tier === SourceTier.TIER_1_OFFICIAL ||
      group.some(it => it.officialType || it.tier === SourceTier.TIER_1_OFFICIAL)
    ) {
      finalCategories.add('official');
    }
    if (
      primary.officialType === 'tender' ||
      group.some(it => it.officialType === 'tender' || it.url.includes('defproc') || it.url.includes('tender'))
    ) {
      finalCategories.add('tenders');
    }
    if (
      primary.officialType === 'idex' ||
      group.some(it => it.officialType === 'idex' || it.url.includes('idex.gov.in') || it.url.includes('tdf.drdo.in'))
    ) {
      finalCategories.add('idex');
    }
    if (entities.length > 0) {
      finalCategories.add('programs');
    }

    const baseCluster: StoryCluster = {
      id: `cluster-${computeStableHash(primary.url)}`,
      synthesizedHeadline: primary.title,
      primarySource: primary,
      relatedCoverage: related,
      discussions,
      categories: Array.from(finalCategories),
      entities,
      defenceScore: 0,
      isLeadStory: false,
      createdAt: primary.publishedAt,
      updatedAt: group.reduce((latest, item) => (item.publishedAt > latest ? item.publishedAt : latest), primary.publishedAt)
    };

    const breakdown = calculateScoreBreakdown(baseCluster, now);
    baseCluster.defenceScore = breakdown.finalDefenceScore;
    clusters.push(baseCluster);
  }

  // Sort descending by DefenceScore
  clusters.sort((a, b) => b.defenceScore - a.defenceScore);
  const lead = clusters[0];
  if (lead) {
    lead.isLeadStory = true;
  }

  return clusters;
}
