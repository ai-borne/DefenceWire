/** Read-only durable article/cluster registry facade; ingestion is enabled in Phase 2. */
import { SourceArticleRecord, StoryClusterRecord } from '../types/durableKnowledge.js';
import {
  buildGetSourceArticleByCanonicalUrlStatement, buildGetStoryClusterStatement,
  buildResolveClusterRedirectStatement
} from './durableRegistryQueryBuilder.js';

export interface DurableRegistryReader {
  first<T extends Record<string, unknown>>(sql: string, params: unknown[]): Promise<T | null>;
}

export async function findSourceArticle(
  reader: DurableRegistryReader, canonicalUrl: string
): Promise<SourceArticleRecord | null> {
  const stmt = buildGetSourceArticleByCanonicalUrlStatement(canonicalUrl);
  const row = await reader.first<SourceArticleRow>(stmt.sql, stmt.params);
  return row ? {
    id: row.id, canonicalUrl: row.canonical_url, originalUrl: row.original_url,
    sourceDomain: row.source_domain, sourceOwnerKey: row.source_owner_key,
    title: row.title, publishedAt: row.published_at, contentHash: row.content_hash
  } : null;
}

export async function findStoryCluster(
  reader: DurableRegistryReader, clusterId: string
): Promise<StoryClusterRecord | null> {
  const stmt = buildGetStoryClusterStatement(clusterId);
  const row = await reader.first<StoryClusterRow>(stmt.sql, stmt.params);
  return row ? {
    id: row.id, eventFingerprint: row.event_fingerprint, status: row.status,
    primarySourceArticleId: row.primary_source_article_id,
    mergedIntoClusterId: row.merged_into_cluster_id,
    firstObservedAt: row.first_observed_at, lastObservedAt: row.last_observed_at
  } : null;
}

export async function resolveClusterRedirect(
  reader: DurableRegistryReader, clusterId: string
): Promise<string | null> {
  const stmt = buildResolveClusterRedirectStatement(clusterId);
  return (await reader.first<{ id: string }>(stmt.sql, stmt.params))?.id ?? null;
}

interface SourceArticleRow extends Record<string, unknown> {
  id: string; canonical_url: string | null; original_url: string | null;
  source_domain: string; source_owner_key: string; title: string;
  published_at: string; content_hash: string;
}

interface StoryClusterRow extends Record<string, unknown> {
  id: string; event_fingerprint: string; status: StoryClusterRecord['status'];
  primary_source_article_id: string | null; merged_into_cluster_id: string | null;
  first_observed_at: string; last_observed_at: string;
}
