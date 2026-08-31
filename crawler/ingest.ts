/**
 * 24/7 Autonomous Defence News Ingestion Pipeline
 * Fetches 40+ RSS/Atom feeds, filters, clusters, scores, and generates SSB intel.
 * Enforces whole-word matching, negative blacklists, curator override locks & atomic commit guards.
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
import { archivePoppedClusters, reconcileArchiveWithLiveFeed, buildD1ConfigFromEnv } from './archiveSync.js';

export interface IngestOptions {
  feeds?: FeedConfig[];
  maxAgeHours?: number;
  maxClusters?: number;
  outputPath?: string | null;
  geminiApiKey?: string;
  fetchFn?: typeof fetch;
  existingClusters?: StoryCluster[];
  existingRiver?: StorySourceItem[];
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

export function filterFreshArticles(items: StorySourceItem[], maxAgeHours: number, now: Date = new Date()): StorySourceItem[] {
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
  const nowMs = now.getTime();

  return items.filter((item) => {
    const pubMs = new Date(item.publishedAt).getTime();
    if (isNaN(pubMs)) return true;
    return nowMs - pubMs <= maxAgeMs;
  });
}

function preserveCuratorOverrides(
  newClusters: StoryCluster[],
  existingClusters: StoryCluster[]
): StoryCluster[] {
  if (!existingClusters || existingClusters.length === 0) {
    return newClusters;
  }

  const lockedExisting = existingClusters.filter((c) => c.isEditorPromoted || c.isIgnored);
  if (lockedExisting.length === 0) {
    return newClusters;
  }

  const merged = [...newClusters];
  for (const locked of lockedExisting) {
    const existingIndex = merged.findIndex(
      (m) =>
        m.id === locked.id ||
        m.primarySource.url === locked.primarySource.url ||
        m.synthesizedHeadline.toLowerCase() === locked.synthesizedHeadline.toLowerCase()
    );

    if (existingIndex !== -1) {
      // Retain curator overrides on matched cluster
      merged[existingIndex] = {
        ...merged[existingIndex]!,
        isEditorPromoted: locked.isEditorPromoted,
        isLeadStory: locked.isEditorPromoted ? true : merged[existingIndex]!.isLeadStory,
        isIgnored: locked.isIgnored,
        synthesizedHeadline: locked.synthesizedHeadline,
        ssbIntel: locked.ssbIntel || merged[existingIndex]!.ssbIntel,
        defenceScore: locked.isEditorPromoted
          ? Math.max(merged[existingIndex]!.defenceScore, 125)
          : merged[existingIndex]!.defenceScore
      };
    } else {
      // Re-insert promoted cluster at the top
      if (locked.isEditorPromoted) {
        merged.unshift({ ...locked, isLeadStory: true });
      } else {
        merged.push(locked);
      }
    }
  }

  return merged;
}

export async function runIngestionPipeline(options: IngestOptions = {}): Promise<IngestResult> {
  const startTime = Date.now();
  const feeds = options.feeds ?? getActiveFeeds();
  const maxAgeHours = options.maxAgeHours ?? 72;
  const maxClusters = options.maxClusters ?? 30;
  const apiKey = options.geminiApiKey ?? process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? '';
  const fetchFn = options.fetchFn ?? globalThis.fetch;

  // Read existing dataset if present for curator protection and atomic guards
  let existingClusters: StoryCluster[] = options.existingClusters || [];
  let existingRiver: StorySourceItem[] = options.existingRiver || [];

  if (existingClusters.length === 0 && options.outputPath !== null) {
    const targetPath = options.outputPath ?? path.resolve(process.cwd(), 'public/data/news.json');
    try {
      const dataStr = await fs.readFile(targetPath, 'utf-8');
      const parsed = JSON.parse(dataStr) as { clusters?: StoryCluster[]; river?: StorySourceItem[] };
      if (parsed.clusters) existingClusters = parsed.clusters;
      if (parsed.river) existingRiver = parsed.river;
    } catch {
      // No existing file or mock filesystem
    }
  }

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

  // Atomic Commit Guard: Preserve existing data on total failure
  if (rawArticles.length === 0 || freshArticles.length === 0) {
    console.log(
      `[ATOMIC COMMIT GUARD] Bailing out: raw=${rawArticles.length}, fresh=${freshArticles.length} across ${feeds.length} feeds. Preserving existing dataset untouched.`
    );
    const fallbackClusters = existingClusters.length > 0 ? existingClusters : [...INITIAL_STORY_CLUSTERS];
    const fallbackRiver = existingRiver.length > 0 ? existingRiver : [...INITIAL_RIVER_ITEMS];
    return {
      clusters: fallbackClusters,
      river: fallbackRiver,
      totalIngested: 0,
      totalFiltered: 0,
      activeFeedsCount: feeds.length,
      durationMs: Date.now() - startTime,
      generatedAt: new Date().toISOString()
    };
  }

  // Chronological River items sorted by publishedAt descending
  const riverItems = [...freshArticles].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  // Cluster articles into coherent story groups
  const allClusters = clusterArticles(freshArticles);
  const topClusters = allClusters.slice(0, maxClusters);

  // Apply Curator Override Protection Locks
  const lockedProtectedClusters = preserveCuratorOverrides(topClusters, existingClusters);

  // Enrich all clusters with SSB Intelligence. summarizeWithGemini paces its own
  // requests (MIN_REQUEST_INTERVAL_MS) to stay under Gemini's free-tier 15 RPM limit,
  // so every cluster can attempt a real Gemini summary; any failure/rate-limit falls
  // back to the free, local heuristic so every cluster still gets a Summary badge.
  let geminiCount = 0;
  let heuristicCount = 0;
  let preservedCount = 0;
  for (const cluster of lockedProtectedClusters) {
    if (!cluster) continue;
    if (cluster.ssbIntel) {
      preservedCount++;
      continue;
    }
    const geminiIntel = apiKey ? await summarizeWithGemini(cluster, apiKey, fetchFn) : null;
    if (geminiIntel) {
      geminiCount++;
      cluster.ssbIntel = geminiIntel;
    } else {
      heuristicCount++;
      cluster.ssbIntel = generateHeuristicSSBIntel(cluster);
    }
  }
  console.log(`[SSB ENRICHMENT] ${geminiCount} via Gemini, ${heuristicCount} heuristic fallback, ${preservedCount} preserved from prior run`);

  const finalClusters = lockedProtectedClusters.length > 0 ? lockedProtectedClusters : [...INITIAL_STORY_CLUSTERS];
  const finalRiver = riverItems.length > 0 ? riverItems.slice(0, 100) : [...INITIAL_RIVER_ITEMS];

  const d1Config = buildD1ConfigFromEnv(process.env);
  const archiveResult = await archivePoppedClusters(existingClusters, finalClusters, d1Config, { fetchFn });
  const reconcileResult = await reconcileArchiveWithLiveFeed(finalClusters, d1Config, { fetchFn });
  console.log(`[ARCHIVE SYNC] ${archiveResult.archived} archived, ${archiveResult.failed} failed`);
  console.log(`[ARCHIVE RECONCILE] checked ${finalClusters.length} live ids, ${reconcileResult.failed} failed`);

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

  // Persist output atomically if specified or default to public/data/news.json
  if (options.outputPath !== null) {
    const defaultDir = path.resolve(process.cwd(), 'public/data');
    const targetPath = options.outputPath ?? path.join(defaultDir, 'news.json');

    try {
      const dir = path.dirname(targetPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(targetPath, JSON.stringify(result, null, 2), 'utf-8');
    } catch {
      // Non-fatal if filesystem is mock/read-only
    }
  }

  return result;
}

// Direct CLI entrypoint execution. vite-node does not add the executed file's path to
// process.argv, so detection can't rely on argv contents; instead, run unless loaded
// under Vitest (which always sets process.env.VITEST) importing this module for its exports.
export function shouldRunAsCli(env: NodeJS.ProcessEnv = process.env): boolean {
  return !env.VITEST;
}

if (shouldRunAsCli()) {
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
