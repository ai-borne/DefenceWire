/** Resumable, bounded historical topic classification. */
import { createHash } from 'node:crypto';
import { D1Statement } from '../src/archive/d1QueryBuilder.js';
import { StoryCluster, StorySourceItem } from '../src/types/news.js';
import { SourceTier } from '../src/types/source.js';
import { D1RestConfig, executeD1Query } from './archiveSync.js';
import { DurableArticle, DurableCluster, DurableIngestPlan } from './durableIngestTypes.js';
import { CLASSIFIER_VERSION, ASSIGNMENT_POLICY_VERSION, contentFingerprint } from './deterministicTopicClassifier.js';
import { classifyDurableTopicsWithRegistry } from './topicClassificationPipeline.js';
import { topicModelConfigFromEnv } from './topicModelConfig.js';
import { fetchTopicRegistry } from './topicAssignmentService.js';
import { getClusterJson, R2Config } from './r2ArchiveStore.js';
import { normalizeTopicAlias } from '../src/services/topicRegistryService.js';

const DEFAULT_BATCH_SIZE = 25;
const MAX_BATCH_SIZE = 100;

export interface TopicHistoricalBackfillDeps {
  fetchFn?: typeof fetch;
  now?: () => Date;
  getClusterJsonFn?: typeof getClusterJson;
}

export interface TopicHistoricalBackfillResult {
  scanned: number;
  validated: number;
  reused: number;
  failed: number;
  beforeAssignments: number;
  afterAssignments: number;
}

type ClusterRow = { id: string; is_archived: number };
type ArticleRow = { id: string; canonical_url: string | null; original_url: string | null; source_domain: string; title: string; snippet: string | null; published_at: string; content_hash: string };

/**
 * Processes only missing/outdated assignments plus explicitly queued clusters.
 * Each failed cluster receives a retry record; callers must treat failed > 0 as
 * an incomplete backfill rather than a successful completion.
 */
export async function backfillHistoricalTopics(
  config: D1RestConfig, r2Config: R2Config, batchSize = DEFAULT_BATCH_SIZE,
  deps: TopicHistoricalBackfillDeps = {}
): Promise<TopicHistoricalBackfillResult> {
  const fetchFn = deps.fetchFn ?? globalThis.fetch;
  const now = (deps.now ?? (() => new Date()))().toISOString();
  const limit = Math.min(MAX_BATCH_SIZE, Math.max(1, Math.floor(batchSize)));
  const registry = await fetchTopicRegistry(config, fetchFn);
  const candidates = await requiredRows<ClusterRow>(candidateStatement(registry.registryVersion, limit, now), config, fetchFn);
  const beforeAssignments = await assignmentCount(config, fetchFn);
  let validated = 0; let reused = 0; let failed = 0;
  for (const candidate of candidates) {
    try {
      const legacyTags = candidate.is_archived ? await legacyTagsFromPayload(candidate.id, r2Config, fetchFn, deps.getClusterJsonFn) : [];
      const articles = await requiredRows<ArticleRow>(articleStatement(candidate.id), config, fetchFn);
      if (articles.length === 0) throw new Error('Cluster has no durable source articles.');
      const resolvedLegacy = legacyTags.map((tag) => resolveLegacyTag(tag, registry)).filter((id): id is string => id !== null);
      await queueUnknownLegacyTags(candidate.id, legacyTags.filter((tag) => !resolveLegacyTag(tag, registry)), now, config, fetchFn);
      const result = await classifyDurableTopicsWithRegistry(planFor(candidate.id, articles), registry, config, fetchFn, now, topicModelConfigFromEnv(), new Map([[candidate.id, resolvedLegacy]]));
      validated += result.validated; reused += result.reused;
      await complete(candidate.id, config, fetchFn);
    } catch (error) {
      failed++;
      await recordFailure(candidate.id, message(error), now, config, fetchFn).catch(() => undefined);
    }
  }
  return { scanned: candidates.length, validated, reused, failed, beforeAssignments,
    afterAssignments: await assignmentCount(config, fetchFn) };
}

function candidateStatement(registryVersion: number, limit: number, now: string): D1Statement {
  return { sql: `SELECT sc.id, EXISTS(SELECT 1 FROM archived_stories a WHERE a.id=sc.id) AS is_archived
    FROM story_clusters sc LEFT JOIN topic_backfill_failures f ON f.cluster_id=sc.id
    WHERE sc.status NOT IN ('merged','withdrawn') AND (f.cluster_id IS NULL OR f.available_at <= ?)
      AND (EXISTS(SELECT 1 FROM topic_reclassification_queue q WHERE q.cluster_id=sc.id AND q.status IN ('pending','failed') AND q.available_at <= ?)
        OR NOT EXISTS(SELECT 1 FROM topic_assignment_runs r WHERE r.cluster_id=sc.id AND r.registry_version=? AND r.classifier_version=? AND r.assignment_policy_version=? AND r.status IN ('validated','reused')))
    ORDER BY sc.last_observed_at DESC, sc.id DESC LIMIT ?`, params: [now, now, registryVersion, CLASSIFIER_VERSION, ASSIGNMENT_POLICY_VERSION, limit] };
}

function articleStatement(clusterId: string): D1Statement {
  return { sql: `SELECT a.id, a.canonical_url, a.original_url, a.source_domain, a.title, a.snippet, a.published_at, a.content_hash
    FROM cluster_sources cs JOIN source_articles a ON a.id=cs.source_article_id
    WHERE cs.cluster_id=? ORDER BY a.published_at ASC, a.id ASC`, params: [clusterId] };
}

function planFor(clusterId: string, rows: ArticleRow[]): DurableIngestPlan {
  const articles: DurableArticle[] = rows.map((row) => ({ id: row.id, canonicalUrl: row.canonical_url, contentHash: row.content_hash, sourceOwnerKey: row.source_domain,
    item: { id: row.id, title: row.title, url: row.canonical_url ?? row.original_url ?? '', sourceName: row.source_domain, sourceDomain: row.source_domain,
      tier: SourceTier.TIER_2_NATIONAL, publishedAt: row.published_at, snippet: row.snippet ?? undefined } satisfies StorySourceItem }));
  const sourceArticleIds = articles.map((article) => article.id);
  const cluster = { id: clusterId, sourceArticleIds, eventFingerprint: `historical:${clusterId}`, payloadKey: clusterId,
    payloadHash: contentFingerprint(sourceArticleIds.join('|')), previousClusterIds: [], cluster: {} as StoryCluster } satisfies DurableCluster;
  return { runId: `historical:${createHash('sha256').update(clusterId).digest('hex').slice(0, 16)}`, inputFingerprint: cluster.payloadHash, articles, clusters: [cluster], lineage: [] };
}

async function legacyTagsFromPayload(id: string, config: R2Config, fetchFn: typeof fetch, getFn = getClusterJson): Promise<string[]> {
  const result = await getFn(id, config, fetchFn);
  if (!result.ok || !result.body) throw new Error(`Archived R2 payload unavailable (${result.status ?? 'network error'}).`);
  const payload = JSON.parse(result.body) as { id?: unknown; primaryTag?: unknown; hashtags?: unknown; ssbIntel?: { primaryTag?: unknown; hashtags?: unknown } };
  if (payload.id !== id) throw new Error('Archived R2 payload cluster identity does not match D1.');
  return [payload.primaryTag, ...(Array.isArray(payload.hashtags) ? payload.hashtags : []), payload.ssbIntel?.primaryTag, ...(Array.isArray(payload.ssbIntel?.hashtags) ? payload.ssbIntel.hashtags : [])]
    .filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0).map((tag) => tag.trim()).slice(0, 12);
}

function resolveLegacyTag(tag: string, registry: Awaited<ReturnType<typeof fetchTopicRegistry>>): string | null {
  const normalized = normalizeTopicAlias(tag.replace(/^#/, ''));
  return registry.aliases.find((alias) => alias.normalizedAlias === normalized)?.topicId
    ?? registry.topics.find((topic) => normalizeTopicAlias(topic.displayHashtag.replace(/^#/, '')) === normalized)?.id
    ?? null;
}

export async function queueUnknownLegacyTags(clusterId: string, tags: string[], now: string, config: D1RestConfig, fetchFn: typeof fetch): Promise<void> {
  for (const tag of new Set(tags)) {
    const normalized = normalizeTopicAlias(tag.replace(/^#/, ''));
    if (!normalized) continue;
    const id = `candidate_${createHash('sha256').update(`legacy:${clusterId}:${normalized}`).digest('hex').slice(0, 24)}`;
    await requiredRows({ sql: `INSERT INTO topic_candidates (id,normalized_name,proposed_display_name,legacy_source,legacy_source_id,status,created_at)
      VALUES (?,?,?,'canonical_entities',?,'pending',?) ON CONFLICT(id) DO NOTHING`, params: [id, normalized, tag.slice(0, 160), `${clusterId}:${normalized}`, now] }, config, fetchFn);
  }
}

async function assignmentCount(config: D1RestConfig, fetchFn: typeof fetch): Promise<number> {
  const rows = await requiredRows<{ count: number }>({ sql: 'SELECT COUNT(*) AS count FROM cluster_topics', params: [] }, config, fetchFn);
  return Number(rows[0]?.count ?? 0);
}

async function complete(clusterId: string, config: D1RestConfig, fetchFn: typeof fetch): Promise<void> {
  await requiredRows({ sql: `UPDATE topic_reclassification_queue SET status='completed' WHERE cluster_id=? AND status IN ('pending','failed')`, params: [clusterId] }, config, fetchFn);
  await requiredRows({ sql: 'DELETE FROM topic_backfill_failures WHERE cluster_id=?', params: [clusterId] }, config, fetchFn);
}

async function recordFailure(clusterId: string, error: string, now: string, config: D1RestConfig, fetchFn: typeof fetch): Promise<void> {
  await requiredRows({ sql: `INSERT INTO topic_backfill_failures (cluster_id,attempts,available_at,last_error,updated_at) VALUES (?,1,?,?,?)
    ON CONFLICT(cluster_id) DO UPDATE SET attempts=attempts+1, available_at=excluded.available_at, last_error=excluded.last_error, updated_at=excluded.updated_at`, params: [clusterId, now, error, now] }, config, fetchFn);
  await requiredRows({ sql: `UPDATE topic_reclassification_queue SET status='failed', attempts=attempts+1 WHERE cluster_id=? AND status IN ('pending','processing')`, params: [clusterId] }, config, fetchFn);
}

async function requiredRows<T extends Record<string, unknown>>(statement: D1Statement, config: D1RestConfig, fetchFn: typeof fetch): Promise<T[]> {
  const result = await executeD1Query(statement, config, fetchFn);
  if (!result.ok) throw new Error(`D1 backfill query failed: ${result.error ?? result.status ?? 'unknown error'}`);
  return result.rows as T[];
}

function message(error: unknown): string { return (error instanceof Error ? error.message : 'Unknown historical topic backfill failure.').slice(0, 500); }
