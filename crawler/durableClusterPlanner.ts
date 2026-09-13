import { extractActionSignatures } from '../src/engine/actionSignatures.js';
import { StoryCluster, StorySourceItem } from '../src/types/news.js';
import { SourceTier } from '../src/types/source.js';
import { canonicalizeArticleUrl, createSourceArticleId, mintClusterId } from './durableIdentity.js';
import {
  DurableArticle, DurableCluster, DurableIngestPlan, DurableLineage, DurableLookupRow
} from './durableIngestTypes.js';

export async function prepareDurableInputs(
  articles: StorySourceItem[], clusters: StoryCluster[], mintUuid: () => string = () => crypto.randomUUID()
): Promise<Omit<DurableIngestPlan, 'runId' | 'inputFingerprint'>> {
  const durableArticles = await Promise.all(articles.map(toDurableArticle));
  const byUrl = new Map(durableArticles.flatMap((article) =>
    article.canonicalUrl ? [[article.canonicalUrl, article] as const] : []));
  const durableClusters = await Promise.all(clusters.map(async (cluster) => {
    const members = clusterMembers(cluster, byUrl);
    const eventFingerprint = await digest(eventFingerprintInput(cluster));
    const payloadHash = await digest(JSON.stringify(cluster));
    return {
      cluster, id: mintClusterId(mintUuid()), eventFingerprint,
      payloadKey: '', payloadHash,
      sourceArticleIds: members.map((article) => article.id), previousClusterIds: []
    } satisfies DurableCluster;
  }));
  return { articles: deduplicateArticles(durableArticles), clusters: durableClusters, lineage: [] };
}

export async function finalizeDurablePlan(
  prepared: Omit<DurableIngestPlan, 'runId' | 'inputFingerprint'>,
  lookupRows: DurableLookupRow[]
): Promise<DurableIngestPlan> {
  const priorByArticle = new Map<string, string>();
  const priorByFingerprint = new Map<string, string>();
  for (const row of lookupRows) {
    if (row.source_article_id) priorByArticle.set(row.source_article_id, row.cluster_id);
    priorByFingerprint.set(row.event_fingerprint, row.cluster_id);
  }
  const claimed = new Set<string>();
  const lineage: DurableLineage[] = [];
  for (const durable of prepared.clusters) {
    const previous = [...new Set(durable.sourceArticleIds
      .map((id) => priorByArticle.get(id)).filter((id): id is string => Boolean(id)))];
    if (previous.length === 0) {
      const fingerprintMatch = priorByFingerprint.get(durable.eventFingerprint);
      if (fingerprintMatch) previous.push(fingerprintMatch);
    }
    durable.previousClusterIds = previous;
    const reusable = previous.find((id) => !claimed.has(id));
    if (reusable) durable.id = reusable;
    for (const predecessor of previous) {
      if (predecessor === durable.id) continue;
      const changeType = claimed.has(predecessor) ? 'split' : 'merge';
      lineage.push({
        predecessorId: predecessor, successorId: durable.id, changeType,
        reason: `${changeType}: durable source membership changed during ingestion`
      });
    }
    claimed.add(durable.id);
  }
  const inputFingerprint = await digest(prepared.articles
    .map((article) => `${article.id}:${article.contentHash}`).sort().join('|'));
  const runId = `ingest_${inputFingerprint.slice(0, 32)}`;
  for (const cluster of prepared.clusters) {
    cluster.cluster.id = cluster.id;
    cluster.payloadKey = `${cluster.id}.json`;
  }
  return { ...prepared, runId, inputFingerprint, lineage };
}

export function sourceAuthority(tier: SourceTier): 'official' | 'trusted' | 'standard' | 'social' | 'unknown' {
  if (tier === SourceTier.TIER_1_OFFICIAL) return 'official';
  if (tier === SourceTier.TIER_1_SOCIAL) return 'social';
  if (tier === SourceTier.TIER_2_NATIONAL) return 'trusted';
  if (tier === SourceTier.TIER_3_SPECIALIZED || tier === SourceTier.TIER_4_OSINT) return 'standard';
  return 'unknown';
}

async function toDurableArticle(item: StorySourceItem): Promise<DurableArticle> {
  const contentHash = await digest(`${normalize(item.title)}\n${normalize(item.snippet ?? '')}`);
  const canonicalUrl = item.url?.trim() ? canonicalizeArticleUrl(item.url) : null;
  const sourceOwnerKey = item.sourceDomain.trim().toLowerCase();
  const id = await createSourceArticleId({
    url: item.url, sourceOwnerKey, publishedAt: item.publishedAt, title: item.title, contentHash
  });
  return { item, id, canonicalUrl, contentHash, sourceOwnerKey };
}

function clusterMembers(cluster: StoryCluster, byUrl: Map<string, DurableArticle>): DurableArticle[] {
  const urls = [cluster.primarySource, ...cluster.relatedCoverage]
    .map((item) => canonicalizeArticleUrl(item.url));
  for (const discussion of cluster.discussions) {
    if (discussion.url) urls.push(canonicalizeArticleUrl(discussion.url));
  }
  return urls.map((url) => byUrl.get(url)).filter((item): item is DurableArticle => Boolean(item));
}

function eventFingerprintInput(cluster: StoryCluster): string {
  const text = `${cluster.synthesizedHeadline} ${cluster.primarySource.snippet ?? ''}`;
  const day = cluster.createdAt.slice(0, 10);
  const headlineTokens = normalize(cluster.synthesizedHeadline).replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/).filter((token) => token.length > 2).sort().slice(0, 12);
  return ['event-v1', day, ...cluster.entities.map(normalize).sort(),
    ...extractActionSignatures(text).sort(), ...headlineTokens].join('|');
}

function deduplicateArticles(articles: DurableArticle[]): DurableArticle[] {
  return [...new Map(articles.map((article) => [article.id, article])).values()];
}

function normalize(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase('en-US').replace(/\s+/g, ' ');
}

async function digest(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
