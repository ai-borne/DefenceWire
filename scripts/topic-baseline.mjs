#!/usr/bin/env node
/**
 * Reproducible Phase 0 metrics for the repository news snapshot and thread seed.
 * It never calls remote services or mutates production data.
 * Hard limit: <= 300 LOC.
 */

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_NEWS_PATH = 'public/data/news.json';
const DEFAULT_THREAD_SEED_PATH = 'd1/seeds/threads.sql';

/** @param {string} value */
export function normalizeObservedTag(value) {
  return value
    .replace(/^#+/, '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** @param {string} value */
export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

/** @param {string} sql */
export function extractThreadSeedMetrics(sql) {
  const threadRows = sql.match(/INSERT OR REPLACE INTO story_threads\b/g) ?? [];
  const eventRows = [...sql.matchAll(
    /INSERT OR REPLACE INTO story_thread_events[^\n]*?VALUES\s*\('[^']+',\s*'[^']+',\s*'([^']+)'/g
  )];
  const clusterIds = new Set(eventRows.map((match) => match[1]).filter(Boolean));
  const canonicalEntityRows = sql.match(/INSERT OR REPLACE INTO canonical_entities\b/g) ?? [];

  return {
    threadCount: threadRows.length,
    eventCount: eventRows.length,
    threadedClusterIds: [...clusterIds].sort(),
    canonicalEntitySeedCount: canonicalEntityRows.length
  };
}

/**
 * @param {Record<string, any>} news
 * @param {ReturnType<typeof extractThreadSeedMetrics>} seed
 */
export function calculateTopicBaseline(news, seed) {
  const clusters = Array.isArray(news.clusters) ? news.clusters : [];
  const river = Array.isArray(news.river) ? news.river : [];
  const taggedClusters = clusters.filter(
    (cluster) => Boolean(cluster.primaryTag) || (Array.isArray(cluster.hashtags) && cluster.hashtags.length > 0)
  );

  const observedTags = [...new Set(clusters.flatMap((cluster) => [
    cluster.primaryTag,
    ...(Array.isArray(cluster.hashtags) ? cluster.hashtags : [])
  ]).filter((tag) => typeof tag === 'string' && tag.length > 0))].sort();

  /** @type {Map<string, string[]>} */
  const normalizedGroups = new Map();
  for (const tag of observedTags) {
    const key = normalizeObservedTag(tag);
    if (!key) continue;
    normalizedGroups.set(key, [...(normalizedGroups.get(key) ?? []), tag]);
  }
  const variantGroups = [...normalizedGroups.entries()]
    .filter(([, values]) => values.length > 1)
    .map(([normalized, variants]) => ({ normalized, variants: variants.sort() }))
    .sort((a, b) => a.normalized.localeCompare(b.normalized));

  const retainedUrls = new Set(clusters.flatMap((cluster) => [
    cluster.primarySource,
    ...(Array.isArray(cluster.relatedCoverage) ? cluster.relatedCoverage : [])
  ]).map((source) => source?.url).filter(Boolean));
  const omittedRiverArticles = river.filter((source) => source?.url && !retainedUrls.has(source.url));
  const threadedIds = new Set(seed.threadedClusterIds);
  const orphanClusters = clusters.filter((cluster) => !threadedIds.has(cluster.id));

  return {
    snapshotGeneratedAt: String(news.generatedAt ?? 'unknown'),
    totalIngested: Number(news.totalIngested ?? 0),
    totalFiltered: Number(news.totalFiltered ?? 0),
    retainedClusterCount: clusters.length,
    taggedClusterCount: taggedClusters.length,
    taggedClusterPercentage: clusters.length === 0
      ? 0
      : Number(((taggedClusters.length / clusters.length) * 100).toFixed(2)),
    observedTagSpellingCount: observedTags.length,
    normalizedObservedTopicCount: normalizedGroups.size,
    extraObservedTagVariantCount: observedTags.length - normalizedGroups.size,
    observedTagVariantGroups: variantGroups,
    riverArticleCount: river.length,
    observableArticlesExcludedFromRetainedClusters: omittedRiverArticles.length,
    threadCount: seed.threadCount,
    eventCount: seed.eventCount,
    threadedRetainedClusterCount: clusters.length - orphanClusters.length,
    orphanRetainedClusterCount: orphanClusters.length,
    canonicalEntitySeedCount: seed.canonicalEntitySeedCount,
    limitations: [
      'The committed news snapshot does not retain allClusters before the top-N slice; the exclusion count is the observable river URL set absent from retained cluster sources.',
      'Thread and orphan counts compare the committed news snapshot with the committed thread seed, not the remote D1 database.',
      'The repository seed contains no canonical_entities rows, so learned remote aliases are not measurable without external credentials.'
    ]
  };
}

/** @param {string} rootDir */
export async function loadTopicBaseline(rootDir) {
  const newsPath = path.join(rootDir, DEFAULT_NEWS_PATH);
  const seedPath = path.join(rootDir, DEFAULT_THREAD_SEED_PATH);
  const [newsText, seedText] = await Promise.all([
    readFile(newsPath, 'utf8'),
    readFile(seedPath, 'utf8')
  ]);
  const metrics = calculateTopicBaseline(JSON.parse(newsText), extractThreadSeedMetrics(seedText));
  return {
    sourceFiles: {
      news: DEFAULT_NEWS_PATH,
      newsSha256: sha256(newsText),
      threadSeed: DEFAULT_THREAD_SEED_PATH,
      threadSeedSha256: sha256(seedText)
    },
    ...metrics
  };
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  loadTopicBaseline(rootDir)
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => {
      console.error('[TOPIC BASELINE] Failed to measure repository snapshot:', error);
      process.exitCode = 1;
    });
}
