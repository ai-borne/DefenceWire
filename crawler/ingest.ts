/**
 * 24/7 Autonomous Defence News Ingestion Pipeline
 * Fetches 40+ RSS/Atom feeds, filters, clusters, scores, and generates SSB intel.
 * Hard limit: <= 300 LOC.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { clusterArticles, extractMilitaryEntities } from '../src/engine/clusterEngine.js';
import { INITIAL_STORY_CLUSTERS } from '../src/data/initialNews.js';
import { INITIAL_RIVER_ITEMS } from '../src/data/riverNews.js';
import { StoryCluster, StorySourceItem } from '../src/types/news.js';
import { SourceTier } from '../src/types/source.js';
import { FeedConfig, getActiveFeeds } from './feeds.js';
import { fetchFeedWithCircuitBreaker } from './parser.js';
import { generateHeuristicSSBIntel, summarizeWithGemini } from './summarizer.js';

export interface IngestOptions {
  feeds?: FeedConfig[];
  maxAgeHours?: number;
  maxClusters?: number;
  outputPath?: string;
  geminiApiKey?: string;
  fetchFn?: typeof fetch;
}

export interface IngestResult {
  clusters: StoryCluster[];
  river: StorySourceItem[];
  totalIngested: number;
  totalFiltered: number;
  activeFeedsCount: number;
  durationMs: number;
  generatedAt: string;
}

const DEFENCE_KEYWORDS = [
  'defence', 'defense', 'military', 'army', 'navy', 'air force', 'iaf', 'drdo', 'hal',
  'mod', 'pib', 'missile', 'frigate', 'corvette', 'warship', 'submarine', 'tejas', 'amca',
  'rafale', 'zorawar', 'brahmos', 'pinaka', 's-400', 'prachand', 'iac', 'aircraft carrier',
  'lac', 'loc', 'galwan', 'ladakh', 'border', 'tri-service', 'theater command', 'chief of defence staff',
  'procurement', 'aon', 'dac', 'iddm', 'make in india', 'ssb', 'c-uas', 'drone', 'loitering munition'
];

export function isDefenceRelevant(item: StorySourceItem, feed: FeedConfig): boolean {
  if (feed.tier === SourceTier.TIER_1_OFFICIAL || feed.tier === SourceTier.TIER_3_SPECIALIZED) {
    return true;
  }
  const fullText = `${item.title} ${item.snippet || ''}`.toLowerCase();
  const entities = extractMilitaryEntities(item.title);
  if (entities.entities.length > 0) {
    return true;
  }
  return DEFENCE_KEYWORDS.some((kw) => fullText.includes(kw));
}

export function filterFreshArticles(items: StorySourceItem[], maxAgeHours: number, now: Date = new Date()): StorySourceItem[] {
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
  const nowMs = now.getTime();

  return items.filter((item) => {
    const pubMs = new Date(item.publishedAt).getTime();
    if (isNaN(pubMs)) return true;
    return nowMs - pubMs <= maxAgeMs;
  });
}

export async function runIngestionPipeline(options: IngestOptions = {}): Promise<IngestResult> {
  const startTime = Date.now();
  const feeds = options.feeds ?? getActiveFeeds();
  const maxAgeHours = options.maxAgeHours ?? 72;
  const maxClusters = options.maxClusters ?? 30;
  const apiKey = options.geminiApiKey ?? process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? '';
  const fetchFn = options.fetchFn ?? globalThis.fetch;

  const rawArticles: StorySourceItem[] = [];

  // Concurrent batch fetching (batch size 6)
  const batchSize = 6;
  for (let i = 0; i < feeds.length; i += batchSize) {
    const batch = feeds.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((feed) =>
        fetchFeedWithCircuitBreaker(feed, { fetchFn }).then((items) => {
          return items.filter((it) => isDefenceRelevant(it, feed));
        })
      )
    );

    for (const res of results) {
      if (res.status === 'fulfilled') {
        rawArticles.push(...res.value);
      }
    }
  }

  const freshArticles = filterFreshArticles(rawArticles, maxAgeHours);

  // Chronological River items sorted by publishedAt descending
  const riverItems = [...freshArticles].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  // Cluster articles into coherent story groups
  const allClusters = clusterArticles(freshArticles);
  const topClusters = allClusters.slice(0, maxClusters);

  // Enrich top clusters with SSB Intelligence
  for (let i = 0; i < Math.min(topClusters.length, 12); i++) {
    const cluster = topClusters[i];
    if (!cluster) continue;
    if (!cluster.ssbIntel) {
      const geminiIntel = apiKey ? await summarizeWithGemini(cluster, apiKey, fetchFn) : null;
      cluster.ssbIntel = geminiIntel ?? generateHeuristicSSBIntel(cluster);
    }
  }

  const finalClusters = topClusters.length > 0 ? topClusters : [...INITIAL_STORY_CLUSTERS];
  const finalRiver = riverItems.length > 0 ? riverItems.slice(0, 100) : [...INITIAL_RIVER_ITEMS];

  const generatedAt = new Date().toISOString();
  const durationMs = Date.now() - startTime;

  const result: IngestResult = {
    clusters: finalClusters,
    river: finalRiver,
    totalIngested: rawArticles.length,
    totalFiltered: freshArticles.length,
    activeFeedsCount: feeds.length,
    durationMs,
    generatedAt
  };

  // Persist output if specified or default to public/data/news.json
  const defaultDir = path.resolve(process.cwd(), 'public/data');
  const targetPath = options.outputPath ?? path.join(defaultDir, 'news.json');

  try {
    const dir = path.dirname(targetPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(targetPath, JSON.stringify(result, null, 2), 'utf-8');
  } catch {
    // Non-fatal if filesystem is mock/read-only
  }

  return result;
}

// Direct CLI entrypoint execution
const isCli =
  typeof process !== 'undefined' &&
  (process.argv.some((a) => a.includes('ingest')) || process.argv[1]?.includes('ingest'));

if (isCli) {
  console.log('[DEFENCEWIRE CRAWLER] Starting 24/7 ingestion pipeline across 40+ feeds...');
  try {
    const res = await runIngestionPipeline();
    console.log(
      `[CRAWLER COMPLETE] Ingested: ${res.totalIngested} raw items | Filtered & Fresh: ${res.totalFiltered} | Clusters: ${res.clusters.length} | River: ${res.river.length} | Time: ${res.durationMs}ms`
    );
  } catch (err) {
    console.error('[CRAWLER ERROR]', err);
  }
}
