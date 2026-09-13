import { StoryCluster, StorySourceItem } from '../src/types/news.js';
import { D1Statement } from '../src/archive/d1QueryBuilder.js';
import { executeD1Query, buildD1ConfigFromEnv } from './archiveSync.js';
import { buildR2ConfigFromEnv, putJsonObject } from './r2ArchiveStore.js';
import { canonicalizeArticleUrl } from './durableIdentity.js';
import { finalizeDurablePlan, prepareDurableInputs, sourceAuthority } from './durableClusterPlanner.js';
import {
  buildAdoptOrphanStatement, buildAdvanceRunStatement, buildAttachRunArticleStatement, buildAttachSourceStatement,
  buildDemotePrimaryStatement, buildFailRunStatement, buildFindRunStatement,
  buildFindManifestStatement,
  buildInsertClusterStatement, buildLineageStatements, buildLookupClustersStatement,
  buildRecordOrphanStatement, buildResumeRunStatement, buildSelectPrimaryStatement, buildSetHomepageCountStatement,
  buildStartRunStatement, buildUpsertArticleStatement, buildUpsertManifestStatement
} from './durableIngestQueryBuilder.js';
import {
  DurableIngestConfig, DurableIngestDeps, DurableIngestPlan, DurableLookupRow, DurableManifestRow,
  DurablePersistResult, DurableRunRow, IngestionStage
} from './durableIngestTypes.js';

const MAX_BATCH_STATEMENTS = 100;

export function buildDurableIngestConfigFromEnv(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>
): DurableIngestConfig | null {
  const d1 = buildD1ConfigFromEnv(env);
  const r2 = buildR2ConfigFromEnv(env);
  if (!d1 && !r2) return null;
  if (!d1 || !r2) throw new Error('Durable ingestion requires complete D1 and R2 configuration.');
  return { d1, r2 };
}

export async function persistDurableInput(
  articles: StorySourceItem[], clusters: StoryCluster[], config: DurableIngestConfig,
  deps: DurableIngestDeps = {}
): Promise<DurablePersistResult> {
  const fetchFn = deps.fetchFn ?? globalThis.fetch;
  const prepared = await prepareDurableInputs(articles, clusters, deps.mintUuid);
  const lookup = await loadExistingMembership(prepared, config, fetchFn);
  const plan = await finalizeDurablePlan(prepared, lookup);
  await restoreManifestIdentities(plan, config, fetchFn);
  const now = new Date().toISOString();
  await executeStrict(buildStartRunStatement(
    plan.runId, plan.inputFingerprint, plan.articles.length, plan.clusters.length, now), config, fetchFn);
  let run = await readRun(plan.runId, config, fetchFn);
  const resumed = Boolean(run && run.retry_count > 0);
  if (run?.status === 'published') return { plan, clusters: plan.clusters.map((item) => item.cluster), resumed };
  if (run?.status === 'failed_retryable') {
    await executeStrict(buildResumeRunStatement(plan.runId), config, fetchFn);
    run = { ...run, status: 'started' };
  }
  try {
    if (atOrBefore(run?.status, 'started')) {
      await executeStrictBatch(plan.clusters.map((cluster) =>
        buildUpsertManifestStatement(plan.runId, cluster)), config, fetchFn);
      await executeStrictBatch([
        ...plan.articles.map((article) => buildUpsertArticleStatement(article, now)),
        ...plan.articles.map((article) => buildAttachRunArticleStatement(plan.runId, article))
      ], config, fetchFn);
      await advance(plan.runId, 'articles_persisted', config, fetchFn);
    }
    if (atOrBefore(run?.status, 'articles_persisted')) {
      try {
        await writeClusterPayloads(plan, config, fetchFn, deps);
      } catch (error) {
        await failRun(plan, 'clusters_persisted', config, fetchFn, false);
        throw error;
      }
      try {
        await persistClusters(plan, config, fetchFn, now);
      } catch (error) {
        await failRun(plan, 'clusters_persisted', config, fetchFn, true);
        throw error;
      }
      await advance(plan.runId, 'clusters_persisted', config, fetchFn);
    }
    return { plan, clusters: plan.clusters.map((item) => item.cluster), resumed };
  } catch (error) {
    const failed = await readRun(plan.runId, config, fetchFn).catch(() => null);
    if (failed?.status !== 'failed_retryable' && failed?.status !== 'failed_terminal') {
      await failRun(plan, run?.status ?? 'started', config, fetchFn, false);
    }
    throw error;
  }
}

async function restoreManifestIdentities(
  plan: DurableIngestPlan, config: DurableIngestConfig, fetchFn: typeof fetch
): Promise<void> {
  const result = await executeD1Query(buildFindManifestStatement(plan.runId), config.d1, fetchFn);
  if (!result.ok) throw new Error('Unable to read ingestion cluster manifest.');
  const rows = result.rows as DurableManifestRow[];
  const byInput = new Map(rows.map((row) =>
    [`${row.event_fingerprint}|${row.payload_hash}`, row]));
  for (const cluster of plan.clusters) {
    const row = byInput.get(`${cluster.eventFingerprint}|${cluster.payloadHash}`);
    if (!row) continue;
    cluster.id = row.cluster_id;
    cluster.payloadKey = row.payload_key;
    cluster.cluster.id = row.cluster_id;
  }
}

export async function markDurableClassified(
  plan: DurableIngestPlan, config: DurableIngestConfig, deps: DurableIngestDeps = {}
): Promise<void> {
  const fetchFn = deps.fetchFn ?? globalThis.fetch;
  const current = await readRun(plan.runId, config, fetchFn);
  if (current && ['classified', 'publishable', 'published'].includes(current.status)) return;
  try {
    await writeClusterPayloads(plan, config, fetchFn, deps);
    await advance(plan.runId, 'classified', config, fetchFn);
  } catch (error) {
    await failRun(plan, 'clusters_persisted', config, fetchFn, false);
    throw error;
  }
}

export async function advanceDurableRun(
  plan: DurableIngestPlan, stage: 'publishable' | 'published', config: DurableIngestConfig,
  homepageClusterCount: number,
  fetchFn: typeof fetch = globalThis.fetch
): Promise<void> {
  const current = await readRun(plan.runId, config, fetchFn);
  if (current?.status === 'published' || current?.status === stage) return;
  if (stage === 'publishable') {
    await executeStrict(buildSetHomepageCountStatement(
      plan.runId, homepageClusterCount), config, fetchFn);
  }
  await advance(plan.runId, stage, config, fetchFn);
}

export async function failDurableRun(
  plan: DurableIngestPlan, stage: IngestionStage, config: DurableIngestConfig,
  fetchFn: typeof fetch = globalThis.fetch
): Promise<void> {
  await failRun(plan, stage, config, fetchFn, false);
}

async function loadExistingMembership(
  prepared: Awaited<ReturnType<typeof prepareDurableInputs>>,
  config: DurableIngestConfig, fetchFn: typeof fetch
): Promise<DurableLookupRow[]> {
  const ids = prepared.articles.map((article) => article.id);
  const fingerprints = prepared.clusters.map((cluster) => cluster.eventFingerprint);
  if (ids.length === 0 || fingerprints.length === 0) return [];
  const result = await executeD1Query(buildLookupClustersStatement(ids, fingerprints), config.d1, fetchFn);
  if (!result.ok) throw new Error(`Durable cluster lookup failed: ${result.error ?? result.status ?? 'unknown error'}`);
  return result.rows as DurableLookupRow[];
}

async function readRun(
  runId: string, config: DurableIngestConfig, fetchFn: typeof fetch
): Promise<DurableRunRow | null> {
  const result = await executeD1Query(buildFindRunStatement(runId), config.d1, fetchFn);
  if (!result.ok) throw new Error('Unable to read durable ingestion checkpoint.');
  return (result.rows[0] as DurableRunRow | undefined) ?? null;
}

async function persistClusters(
  plan: DurableIngestPlan, config: DurableIngestConfig, fetchFn: typeof fetch, now: string
): Promise<void> {
  const statements: D1Statement[] = plan.clusters.map((cluster) =>
    buildInsertClusterStatement(cluster, plan.runId, now));
  for (const cluster of plan.clusters) {
    statements.push(buildDemotePrimaryStatement(cluster.id));
    const articleById = new Map(plan.articles.map((article) => [article.id, article]));
    const primaryUrl = cluster.cluster.primarySource.url;
    const canonicalPrimaryUrl = canonicalizeArticleUrl(primaryUrl);
    for (const articleId of cluster.sourceArticleIds) {
      const article = articleById.get(articleId);
      if (!article) continue;
      const role = article.canonicalUrl === canonicalPrimaryUrl ? 'primary' :
        article.item.tier.toString().includes('SOCIAL') ? 'social' : 'related';
      statements.push(buildAttachSourceStatement(cluster.id, articleId, role,
        sourceAuthority(article.item.tier), now));
    }
    const primary = plan.articles.find((article) => article.canonicalUrl === canonicalPrimaryUrl);
    if (primary) statements.push(buildSelectPrimaryStatement(cluster.id, primary.id));
    statements.push(buildAdoptOrphanStatement(cluster.payloadKey, now));
  }
  for (const item of plan.lineage) {
    statements.push(...buildLineageStatements(
      item.predecessorId, item.successorId, item.changeType, item.reason, now));
  }
  await executeStrictBatch(statements, config, fetchFn);
}

async function writeClusterPayloads(
  plan: DurableIngestPlan, config: DurableIngestConfig, fetchFn: typeof fetch,
  deps: DurableIngestDeps
): Promise<void> {
  const putFn = deps.putClusterJsonFn ?? putJsonObject;
  for (const cluster of plan.clusters) {
    const result = await putFn(cluster.payloadKey, JSON.stringify(cluster.cluster), config.r2, fetchFn);
    if (!result.ok) throw new Error(`R2 payload write failed for ${cluster.id}: ${result.status ?? 'network error'}`);
  }
}

async function failRun(
  plan: DurableIngestPlan, stage: IngestionStage, config: DurableIngestConfig,
  fetchFn: typeof fetch, recordOrphans: boolean
): Promise<void> {
  const now = new Date().toISOString();
  const orphans = recordOrphans ? plan.clusters.map((cluster) =>
    buildRecordOrphanStatement(cluster.payloadKey, plan.runId, cluster.payloadHash, now)) : [];
  try {
    await executeStrictBatch([...orphans, buildFailRunStatement(plan.runId, stage, now)], config, fetchFn);
  } catch { /* The original persistence error remains authoritative. */ }
}

async function advance(
  runId: string, stage: IngestionStage, config: DurableIngestConfig, fetchFn: typeof fetch
): Promise<void> {
  await executeStrict(buildAdvanceRunStatement(runId, stage, new Date().toISOString()), config, fetchFn);
}

async function executeStrict(
  statement: D1Statement, config: DurableIngestConfig, fetchFn: typeof fetch
): Promise<void> {
  const result = await executeD1Query(statement, config.d1, fetchFn);
  if (!result.ok) throw new Error(`D1 durable write failed: ${result.error ?? result.status ?? 'unknown error'}`);
}

async function executeStrictBatch(
  statements: D1Statement[], config: DurableIngestConfig, fetchFn: typeof fetch
): Promise<void> {
  for (let index = 0; index < statements.length; index += MAX_BATCH_STATEMENTS) {
    const batch = statements.slice(index, index + MAX_BATCH_STATEMENTS);
    const response = await fetchFn(d1Endpoint(config), {
      method: 'POST', headers: d1Headers(config), body: JSON.stringify({ batch })
    });
    const body = await response.json().catch(() => null) as D1BatchResponse | null;
    const failed = body?.result?.some((item) => item.success === false);
    if (!response.ok || !body?.success || failed) throw new Error(`D1 transactional batch failed: HTTP ${response.status}`);
  }
}

function d1Endpoint(config: DurableIngestConfig): string {
  return `https://api.cloudflare.com/client/v4/accounts/${config.d1.accountId}/d1/database/${config.d1.databaseId}/query`;
}

function d1Headers(config: DurableIngestConfig): Record<string, string> {
  return { Authorization: `Bearer ${config.d1.apiToken}`, 'Content-Type': 'application/json' };
}

function atOrBefore(current: IngestionStage | undefined, stage: IngestionStage): boolean {
  const order: IngestionStage[] = ['started', 'articles_persisted', 'clusters_persisted', 'classified', 'publishable', 'published'];
  return order.indexOf(current ?? 'started') <= order.indexOf(stage);
}

interface D1BatchResponse {
  success?: boolean;
  result?: Array<{ success?: boolean }>;
}
