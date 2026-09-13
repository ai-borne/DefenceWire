import { StoryCluster, StorySourceItem } from '../src/types/news.js';
import { D1RestConfig } from './archiveSync.js';
import { R2Config, R2PutResult } from './r2ArchiveStore.js';

export type IngestionStage =
  | 'started' | 'articles_persisted' | 'clusters_persisted'
  | 'classified' | 'publishable' | 'published'
  | 'failed_retryable' | 'failed_terminal';

export interface DurableArticle {
  item: StorySourceItem;
  id: string;
  canonicalUrl: string | null;
  contentHash: string;
  sourceOwnerKey: string;
}

export interface DurableCluster {
  cluster: StoryCluster;
  id: string;
  eventFingerprint: string;
  payloadKey: string;
  payloadHash: string;
  sourceArticleIds: string[];
  previousClusterIds: string[];
}

export interface DurableIngestPlan {
  runId: string;
  inputFingerprint: string;
  articles: DurableArticle[];
  clusters: DurableCluster[];
  lineage: DurableLineage[];
}

export interface DurableLineage {
  predecessorId: string;
  successorId: string;
  changeType: 'merge' | 'split' | 'article_move';
  reason: string;
}

export interface DurableLookupRow extends Record<string, unknown> {
  source_article_id: string;
  cluster_id: string;
  event_fingerprint: string;
}

export interface DurableIngestConfig {
  d1: D1RestConfig;
  r2: R2Config;
}

export interface DurableIngestDeps {
  fetchFn?: typeof fetch;
  putClusterJsonFn?: (
    key: string, json: string, config: R2Config, fetchFn: typeof fetch
  ) => Promise<R2PutResult>;
  mintUuid?: () => string;
}

export interface DurableRunRow extends Record<string, unknown> {
  id: string;
  status: IngestionStage;
  retry_count: number;
}

export interface DurableManifestRow extends Record<string, unknown> {
  event_fingerprint: string;
  payload_hash: string;
  cluster_id: string;
  payload_key: string;
}

export interface DurablePersistResult {
  plan: DurableIngestPlan;
  clusters: StoryCluster[];
  resumed: boolean;
}
