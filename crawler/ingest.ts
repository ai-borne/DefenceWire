/** Autonomous feed ingestion orchestrator. Hard limit: <= 300 LOC. */
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { clusterArticles } from '../src/engine/clusterEngine.js';
import { INITIAL_STORY_CLUSTERS } from '../src/data/initialNews.js';
import { INITIAL_RIVER_ITEMS } from '../src/data/riverNews.js';
import { StoryCluster, StorySourceItem } from '../src/types/news.js';
import { getActiveFeeds } from './feeds.js';
import { generateHeuristicSSBIntel, resolveGeminiApiKey, summarizeWithGemini } from './summarizer.js';
import { summarizeWithCloudflareAI } from './cloudflareAI.js';
import { archivePoppedClusters, reconcileArchiveWithLiveFeed, buildD1ConfigFromEnv } from './archiveSync.js';
import { findClustersToArchive } from '../src/archive/archiveDiff.js';
import { backfillUnthreadedArchive } from './threadBackfill.js';
import { preserveCuratorOverrides, fetchCuratorOverridesFromD1, applyD1CuratorOverrides } from './curatorOverrideSync.js';
import { buildR2ConfigFromEnv } from './r2ArchiveStore.js';
import {
  aggregateEntityCandidates, getPromotedEntityConfigs,
  syncDiscoveredEntitiesToD1, EntityHarvestCandidate
} from './entityHarvester.js';
import { runSupplierCandidateExtraction } from './supplierCandidateExtractor.js';
import { registerDynamicEntities } from '../src/data/militaryEntities.js';
import { aggregateSourceStats, syncSourceReputationToD1, fetchFeedWithFowlerBreaker } from './sourceTracker.js';
import { runThreadContinuity } from './threadSync.js';
import { runGraphExtractionAndSync } from './graphSync.js';
import { runPatternDetectionAndSync } from './patternSync.js';
import { geminiBudgetConfigFromEnv, getGeminiDailyCallCount, recordGeminiCalls } from './geminiBudget.js';
import {
  advanceDurableRun, buildDurableIngestConfigFromEnv, failDurableRun,
  persistDurableInput
} from './durableIngestService.js';
import { DurablePersistResult } from './durableIngestTypes.js';
import { classifyAndMarkDurableRun } from './topicClassificationPipeline.js';
import { topicModelConfigFromEnv } from './topicModelConfig.js';
import { IngestOptions, IngestResult } from './ingestTypes.js';
import { writeSnapshotAtomically } from './snapshotWriter.js';
import { hydratePublishedTopics } from './publicTopicProjection.js';
export {
  isDefenceRelevant, filterFreshArticles, NON_DEFENCE_BLACKLIST,
  NON_DEFENCE_BLACKLIST_REGEX, DEFENCE_WHOLE_WORD_REGEX
} from './filters.js';
import { isDefenceRelevant, filterFreshArticles } from './filters.js';

export type { IngestOptions, IngestResult } from './ingestTypes.js';

export async function runIngestionPipeline(options: IngestOptions = {}): Promise<IngestResult> {
  const startTime = Date.now();
  const feeds = options.feeds ?? getActiveFeeds();
  const maxAgeHours = options.maxAgeHours ?? 48;
  const maxClusters = options.maxClusters ?? 30;
  const apiKey = resolveGeminiApiKey(options.geminiApiKey);
  const fetchFn = options.fetchFn ?? globalThis.fetch;
  const now = options.now ?? new Date();
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

  const batchSize = 6;
  for (let i = 0; i < feeds.length; i += batchSize) {
    const batch = feeds.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((feed) =>
        fetchFeedWithFowlerBreaker(feed, { fetchFn, now: now.getTime() }).then((items) => {
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

  const freshArticles = filterFreshArticles(rawArticles, maxAgeHours, now);

  // Atomic Commit Guard: Preserve existing data on total failure
  if (rawArticles.length === 0 || freshArticles.length === 0) {
    console.log(`[ATOMIC COMMIT GUARD] Bailing out: raw=${rawArticles.length}, fresh=${freshArticles.length} across ${feeds.length} feeds. Preserving existing dataset.`);
    const fallbackClusters = existingClusters.length > 0 ? existingClusters : [...INITIAL_STORY_CLUSTERS];
    const fallbackRiver = existingRiver.length > 0 ? existingRiver : [...INITIAL_RIVER_ITEMS];
    return {
      clusters: fallbackClusters, river: fallbackRiver, totalIngested: 0, totalFiltered: 0,
      activeFeedsCount: feeds.length, durationMs: Date.now() - startTime, generatedAt: new Date().toISOString()
    };
  }

  const riverItems = [...freshArticles].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  let allClusters = clusterArticles(freshArticles, now);
  const d1Config = buildD1ConfigFromEnv(process.env);
  const r2Config = buildR2ConfigFromEnv(process.env);
  const durableConfig = options.enableDurableIngestion === false ? null :
    buildDurableIngestConfigFromEnv(process.env);
  let durableRun: DurablePersistResult | null = null;
  if (durableConfig) {
    durableRun = await persistDurableInput(freshArticles, allClusters, durableConfig, { fetchFn });
    allClusters = durableRun.clusters;
  }

  const shouldIncludeSeeds = options.includeSeedClusters ?? false;
  const mergedWithSeeds = [...allClusters];
  if (shouldIncludeSeeds) {
    for (const seed of INITIAL_STORY_CLUSTERS) {
      if (!mergedWithSeeds.some((m) => m.id === seed.id || m.primarySource.url === seed.primarySource.url)) {
        mergedWithSeeds.push(seed);
      }
    }
  }

  let lockedProtectedClusters = preserveCuratorOverrides(mergedWithSeeds, existingClusters);
  if (d1Config) {
    const overrideRows = await fetchCuratorOverridesFromD1(d1Config, fetchFn);
    if (overrideRows) {
      console.log(`[CURATOR OVERRIDES] Applying ${overrideRows.length} D1 override row(s) as authoritative.`);
      lockedProtectedClusters = applyD1CuratorOverrides(lockedProtectedClusters, overrideRows);
    }
  } else {
    console.log('[CURATOR OVERRIDES] D1 not configured; using disk-JSON override heuristic only.');
  }

  const geminiBudget = geminiBudgetConfigFromEnv(d1Config);
  let geminiDailyCount = apiKey ? await getGeminiDailyCallCount(geminiBudget, fetchFn, now) : 0;
  let geminiCount = 0;
  let cfAiCount = 0;
  let heuristicCount = 0;
  let preservedCount = 0;
  const entityCandidates: EntityHarvestCandidate[] = [];
  for (const cluster of lockedProtectedClusters) {
    if (!cluster) continue;

    // Collect candidates for dynamic entity harvester
    for (const ent of cluster.entities) {
      entityCandidates.push({
        name: ent,
        category: cluster.categories[0] || 'tech',
        sourceDomain: cluster.primarySource.sourceDomain,
        seenAt: cluster.primarySource.publishedAt
      });
    }

    if (cluster.ssbIntel) {
      preservedCount++;
      continue;
    }

    // 1. Primary: Gemini Flash Free Tier (skipped once the daily D1 budget is exhausted)
    const geminiAllowed = Boolean(apiKey) && (!geminiBudget || geminiDailyCount < geminiBudget.dailyLimit);
    let intel = geminiAllowed ? await summarizeWithGemini(cluster, apiKey, fetchFn) : null;
    if (intel) {
      geminiCount++;
      geminiDailyCount++;
    } else {
      // 2. Secondary: Cloudflare Workers AI Free Tier
      intel = await summarizeWithCloudflareAI(cluster, { fetchFn });
      if (intel) {
        cfAiCount++;
      } else {
        // 3. Fallback: Local Deterministic NLP Heuristic
        heuristicCount++;
        intel = generateHeuristicSSBIntel(cluster);
      }
    }

    cluster.ssbIntel = intel;
  }

  await recordGeminiCalls(geminiBudget, geminiCount, fetchFn, now);

  const cfLog = cfAiCount > 0 ? `${cfAiCount} Cloudflare AI, ` : '';
  const budgetLog = geminiBudget ? ` | [GEMINI BUDGET] ${geminiDailyCount}/${geminiBudget.dailyLimit} today` : '';
  console.log(`[SSB ENRICHMENT] ${geminiCount} via Gemini, ${cfLog}${heuristicCount} heuristic fallback, ${preservedCount} preserved from prior run${budgetLog}`);

  if (durableRun && durableConfig) {
    const byId = new Map(lockedProtectedClusters.map((cluster) => [cluster.id, cluster]));
    for (const item of durableRun.plan.clusters) item.cluster = byId.get(item.id) ?? item.cluster;
    const topicResult = await classifyAndMarkDurableRun(durableRun, durableConfig, fetchFn, now.toISOString(), topicModelConfigFromEnv());
    console.log(`[TOPIC CLASSIFICATION] ${topicResult.validated} validated, ${topicResult.reused} reused`);
  }

  // Closed-loop dynamic entity harvesting
  const aggregatedEntities = aggregateEntityCandidates(entityCandidates);
  const promotedConfigs = getPromotedEntityConfigs(aggregatedEntities);
  if (promotedConfigs.length > 0) {
    registerDynamicEntities(promotedConfigs);
    console.log(`[DYNAMIC ENTITY TRIE] Registered ${promotedConfigs.length} auto-promoted sovereign entities.`);
  }
  const entitySyncResult = await syncDiscoveredEntitiesToD1(aggregatedEntities, d1Config, { fetchFn });
  console.log(`[D1 ENTITY SYNC] ${entitySyncResult.synced} synced, ${entitySyncResult.promotedCount} promoted`);

  // Autonomous supplier growth pipeline (Phase 2.6): draft new_link candidates
  // from supplier x program co-mentions — never writes to suppliers/program_suppliers.
  const supplierCandidateResult = await runSupplierCandidateExtraction(riverItems, d1Config, { fetchFn });
  console.log(`[D1 SUPPLIER CANDIDATE SYNC] ${supplierCandidateResult.synced} synced, ${supplierCandidateResult.drafted} drafted`);

  // Closed-loop dynamic source reputation & scoop tracking
  const sourceStatsMap = aggregateSourceStats(rawArticles, freshArticles, lockedProtectedClusters);
  const repSyncResult = await syncSourceReputationToD1(sourceStatsMap, d1Config, { fetchFn });
  console.log(`[D1 REPUTATION SYNC] ${repSyncResult.syncedToD1} sources synced`);

  const rankedClusters = lockedProtectedClusters.slice(0, maxClusters);
  let finalClusters = rankedClusters.length > 0 ? rankedClusters : [...INITIAL_STORY_CLUSTERS];
  if (durableRun && durableConfig) {
    finalClusters = await hydratePublishedTopics(finalClusters, durableConfig.d1, fetchFn);
  }
  const finalRiver = riverItems.length > 0 ? riverItems.slice(0, 100) : [...INITIAL_RIVER_ITEMS];
  const archiveCandidates = [...new Map([...existingClusters, ...lockedProtectedClusters]
    .map((cluster) => [cluster.id, cluster])).values()];
  const archiveResult = await archivePoppedClusters(archiveCandidates, finalClusters, d1Config, r2Config, { fetchFn });
  const reconcileResult = await reconcileArchiveWithLiveFeed(finalClusters, d1Config, r2Config, { fetchFn });
  console.log(`[ARCHIVE SYNC] ${archiveResult.archived} archived, ${archiveResult.failed} failed, ${archiveResult.r2Failed} R2 failed | [RECONCILE] ${reconcileResult.failed} failed, ${reconcileResult.r2Failed} R2 failed`);
  if (durableRun && (archiveResult.failed > 0 || reconcileResult.failed > 0)) {
    if (durableConfig) await failDurableRun(durableRun.plan, 'classified', durableConfig, fetchFn);
    throw new Error('Archive persistence failed; refusing to publish a partial homepage snapshot.');
  }
  // Temporal story threading & lineage engine (Phase 1). Popped clusters get a final pass before archival (issue #3).
  const poppedClusters = findClustersToArchive(existingClusters, finalClusters);
  const threadResult = await runThreadContinuity([...finalClusters, ...poppedClusters], d1Config, { fetchFn });
  console.log(`[D1 THREAD SYNC] ${threadResult.syncedThreads} threads, ${threadResult.syncedEvents} events synced`);

  const backfillResult = await backfillUnthreadedArchive(d1Config, r2Config, { fetchFn }); // pre-fix archived clusters, never threaded
  console.log(`[D1 THREAD BACKFILL] ${backfillResult.threaded} threaded, ${backfillResult.failed} failed, ${backfillResult.scanned} scanned`);

  // Semantic triplet & knowledge graph extraction (Phase 2)
  const graphResult = await runGraphExtractionAndSync(finalClusters, d1Config, { fetchFn });
  console.log(`[D1 GRAPH SYNC] ${graphResult.syncedNodes} nodes, ${graphResult.syncedEdges} edges synced`);

  // Emergent pattern & hypothesis synthesizer (Phase 5)
  const patternResult = await runPatternDetectionAndSync(finalClusters, d1Config, { fetchFn, apiKey });
  console.log(`[D1 PATTERN SYNC] ${patternResult.syncedPatterns} patterns synced, ${patternResult.candidates.length} candidates detected`);

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

  if (durableRun && durableConfig) {
    await advanceDurableRun(durableRun.plan, 'publishable', durableConfig, finalClusters.length, fetchFn);
  }

  // Persist output atomically if specified or default to public/data/news.json
  if (options.outputPath !== null) {
    const defaultDir = path.resolve(process.cwd(), 'public/data');
    const targetPath = options.outputPath ?? path.join(defaultDir, 'news.json');

    try {
      await writeSnapshotAtomically(targetPath, result);
    } catch (error) {
      if (durableRun && durableConfig) {
        await failDurableRun(durableRun.plan, 'publishable', durableConfig, fetchFn);
        throw new Error('Homepage snapshot write failed after durable ingestion.', { cause: error });
      }
    }
  }

  if (durableRun && durableConfig) {
    await advanceDurableRun(durableRun.plan, 'published', durableConfig, finalClusters.length, fetchFn);
  }

  return result;
}

export function shouldRunAsCli(env: NodeJS.ProcessEnv = process.env): boolean {
  return !env.VITEST;
}

if (shouldRunAsCli()) {
  console.log('[DEFENCEWIRE CRAWLER] Starting 24/7 ingestion pipeline across 40+ feeds...');
  runIngestionPipeline()
    .then((res) => console.log(`[CRAWLER COMPLETE] Ingested: ${res.totalIngested} | Filtered: ${res.totalFiltered} | Clusters: ${res.clusters.length} | River: ${res.river.length} | Time: ${res.durationMs}ms`))
    .catch((err) => {
      console.error('[CRAWLER ERROR]', err);
      process.exitCode = 1;
    });
}
