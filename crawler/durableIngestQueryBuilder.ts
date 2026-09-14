import { D1Statement } from '../src/archive/d1QueryBuilder.js';
import { DurableArticle, DurableCluster, IngestionStage } from './durableIngestTypes.js';

export function buildFindRunStatement(runId: string): D1Statement {
  return { sql: 'SELECT id, status, retry_count FROM ingestion_runs WHERE id = ? LIMIT 1', params: [runId] };
}

export function buildFindManifestStatement(runId: string): D1Statement {
  return {
    sql: `SELECT event_fingerprint, payload_hash, cluster_id, payload_key
          FROM ingestion_cluster_manifest WHERE ingestion_run_id = ?`,
    params: [runId]
  };
}

export function buildUpsertManifestStatement(
  runId: string, cluster: DurableCluster
): D1Statement {
  return {
    sql: `INSERT INTO ingestion_cluster_manifest
      (ingestion_run_id, event_fingerprint, payload_hash, cluster_id, payload_key)
      VALUES (?, ?, ?, ?, ?) ON CONFLICT(ingestion_run_id, event_fingerprint, payload_hash)
      DO UPDATE SET payload_key = excluded.payload_key`,
    params: [runId, cluster.eventFingerprint, cluster.payloadHash, cluster.id, cluster.payloadKey]
  };
}

export function buildStartRunStatement(
  runId: string, fingerprint: string, articleCount: number, clusterCount: number, now: string
): D1Statement {
  return {
    sql: `INSERT INTO ingestion_runs
          (id, input_fingerprint, status, started_at, eligible_article_count, eligible_cluster_count)
          VALUES (?, ?, 'started', ?, ?, ?) ON CONFLICT(id) DO NOTHING`,
    params: [runId, fingerprint, now, articleCount, clusterCount]
  };
}

export function buildResumeRunStatement(runId: string): D1Statement {
  return {
    sql: `UPDATE ingestion_runs SET status = 'started', completed_at = NULL,
          failure_stage = NULL, retry_count = retry_count + 1
          WHERE id = ? AND status = 'failed_retryable'`,
    params: [runId]
  };
}

export function buildAdvanceRunStatement(runId: string, stage: IngestionStage, now: string): D1Statement {
  const completedAt = stage === 'published' || stage.startsWith('failed_') ? now : null;
  return {
    sql: `UPDATE ingestion_runs SET status = ?, completed_at = ?, failure_stage = NULL WHERE id = ?`,
    params: [stage, completedAt, runId]
  };
}

export function buildSetHomepageCountStatement(runId: string, count: number): D1Statement {
  return {
    sql: 'UPDATE ingestion_runs SET homepage_cluster_count = ? WHERE id = ?',
    params: [count, runId]
  };
}

export function buildFailRunStatement(runId: string, stage: IngestionStage, now: string): D1Statement {
  return {
    sql: `UPDATE ingestion_runs SET status = 'failed_retryable', completed_at = ?, failure_stage = ? WHERE id = ?`,
    params: [now, stage, runId]
  };
}

/** D1 rejects statements with more than ~100 bound parameters; keep well under that per IN-list. */
export const D1_LOOKUP_CHUNK_SIZE = 90;

export function buildLookupByArticleIdsStatement(articleIds: string[]): D1Statement {
  const marks = articleIds.map(() => '?').join(', ');
  return {
    sql: `SELECT cs.source_article_id, sc.id AS cluster_id, sc.event_fingerprint
          FROM story_clusters sc LEFT JOIN cluster_sources cs ON cs.cluster_id = sc.id
          WHERE sc.status = 'active' AND cs.source_article_id IN (${marks})`,
    params: articleIds
  };
}

export function buildLookupByFingerprintsStatement(fingerprints: string[]): D1Statement {
  const marks = fingerprints.map(() => '?').join(', ');
  return {
    sql: `SELECT cs.source_article_id, sc.id AS cluster_id, sc.event_fingerprint
          FROM story_clusters sc LEFT JOIN cluster_sources cs ON cs.cluster_id = sc.id
          WHERE sc.status = 'active' AND sc.event_fingerprint IN (${marks})`,
    params: fingerprints
  };
}

export function buildUpsertArticleStatement(article: DurableArticle, runAt: string): D1Statement {
  return {
    sql: `INSERT INTO source_articles
      (id, canonical_url, original_url, source_domain, source_owner_key, title, snippet,
       published_at, content_hash, first_seen_at, last_seen_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET title = excluded.title, snippet = excluded.snippet,
        content_hash = excluded.content_hash, last_seen_at = excluded.last_seen_at`,
    params: [article.id, article.canonicalUrl, article.item.url || null,
      article.item.sourceDomain, article.sourceOwnerKey, article.item.title,
      article.item.snippet ?? null, article.item.publishedAt, article.contentHash, runAt, runAt]
  };
}

export function buildAttachRunArticleStatement(runId: string, article: DurableArticle): D1Statement {
  return {
    sql: `INSERT INTO ingestion_run_articles (ingestion_run_id, source_article_id, content_hash)
          VALUES (?, ?, ?) ON CONFLICT(ingestion_run_id, source_article_id)
          DO UPDATE SET content_hash = excluded.content_hash`,
    params: [runId, article.id, article.contentHash]
  };
}

export function buildInsertClusterStatement(cluster: DurableCluster, runId: string, now: string): D1Statement {
  return {
    sql: `INSERT INTO story_clusters
      (id, event_fingerprint, status, first_observed_at, last_observed_at, created_at,
       updated_at, payload_key, ingestion_run_id)
      VALUES (?, ?, 'active', ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET event_fingerprint = excluded.event_fingerprint,
        status = 'active',
        last_observed_at = CASE WHEN excluded.last_observed_at > story_clusters.last_observed_at
          THEN excluded.last_observed_at ELSE story_clusters.last_observed_at END,
        updated_at = excluded.updated_at, payload_key = excluded.payload_key,
        ingestion_run_id = excluded.ingestion_run_id, merged_into_cluster_id = NULL`,
    params: [cluster.id, cluster.eventFingerprint, cluster.cluster.createdAt,
      cluster.cluster.updatedAt, now, now, cluster.payloadKey, runId]
  };
}

export function buildAttachSourceStatement(
  clusterId: string, articleId: string, role: 'primary' | 'related' | 'social',
  authority: 'official' | 'trusted' | 'standard' | 'social' | 'unknown', now: string
): D1Statement {
  return {
    sql: `INSERT INTO cluster_sources
      (cluster_id, source_article_id, coverage_role, source_authority, attached_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(cluster_id, source_article_id) DO UPDATE SET
        coverage_role = excluded.coverage_role, source_authority = excluded.source_authority`,
    params: [clusterId, articleId, role, authority, now]
  };
}

export function buildSelectPrimaryStatement(clusterId: string, articleId: string): D1Statement {
  return { sql: 'UPDATE story_clusters SET primary_source_article_id = ? WHERE id = ?', params: [articleId, clusterId] };
}

export function buildDemotePrimaryStatement(clusterId: string): D1Statement {
  return {
    sql: `UPDATE cluster_sources SET coverage_role = 'related'
          WHERE cluster_id = ? AND coverage_role = 'primary'`,
    params: [clusterId]
  };
}

export function buildLineageStatements(
  predecessorId: string, successorId: string, changeType: 'merge' | 'split' | 'article_move',
  reason: string, now: string
): D1Statement[] {
  const lineageRunId = `lineage:${changeType}:${predecessorId}:${successorId}`;
  const statements: D1Statement[] = [{
    sql: `INSERT OR IGNORE INTO cluster_lineage
      (predecessor_cluster_id, successor_cluster_id, change_type, reason, changed_at)
      VALUES (?, ?, ?, ?, ?)`,
    params: [predecessorId, successorId, changeType, reason, now]
  }, {
    sql: `INSERT OR IGNORE INTO topic_assignment_runs
      (id, cluster_id, content_fingerprint, registry_version, classifier_version,
       assignment_policy_version, status, started_at, completed_at)
      SELECT ?, ?, ?, 1, 'lineage-v1', 'curator-lock-v1', 'validated', ?, ?
      WHERE EXISTS (SELECT 1 FROM cluster_topics
                    WHERE cluster_id = ? AND locked_by_curator = 1)`,
    params: [lineageRunId, successorId, lineageRunId, now, now, predecessorId]
  }, {
    sql: `INSERT OR IGNORE INTO cluster_topic_decisions
      (id, assignment_run_id, cluster_id, topic_id, role, confidence,
       assignment_source, decision_state, decided_at)
      SELECT ? || ':' || topic_id, ?, ?, topic_id, role, confidence,
             'curator', 'accepted', ?
      FROM cluster_topics WHERE cluster_id = ? AND locked_by_curator = 1`,
    params: [lineageRunId, lineageRunId, successorId, now, predecessorId]
  }, {
    sql: `INSERT INTO cluster_topics
      (cluster_id, topic_id, role, confidence, assignment_source, source_decision_id,
       locked_by_curator, assignment_run_id, classifier_version, assigned_at, reviewed_at)
      SELECT ?, topic_id, role, confidence, 'curator', ? || ':' || topic_id,
             1, ?, 'lineage-v1', ?, ?
      FROM cluster_topics WHERE cluster_id = ? AND locked_by_curator = 1
      ON CONFLICT(cluster_id, topic_id) DO UPDATE SET
        role = excluded.role, confidence = excluded.confidence,
        assignment_source = 'curator', source_decision_id = excluded.source_decision_id,
        locked_by_curator = 1, assignment_run_id = excluded.assignment_run_id,
        classifier_version = excluded.classifier_version, reviewed_at = excluded.reviewed_at`,
    params: [successorId, lineageRunId, lineageRunId, now, now, predecessorId]
  }];
  if (changeType === 'merge') {
    statements.push({
      sql: `UPDATE story_clusters SET status = 'merged', merged_into_cluster_id = ?,
            primary_source_article_id = NULL, updated_at = ? WHERE id = ?`,
      params: [successorId, now, predecessorId]
    });
  }
  return statements;
}

export function buildRecordOrphanStatement(
  payloadKey: string, runId: string, contentHash: string, now: string
): D1Statement {
  return {
    sql: `INSERT INTO ingestion_orphan_candidates
      (payload_key, ingestion_run_id, content_hash, detected_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(payload_key) DO UPDATE SET content_hash = excluded.content_hash,
        detected_at = excluded.detected_at, resolution_state = 'pending', resolved_at = NULL`,
    params: [payloadKey, runId, contentHash, now]
  };
}

export function buildAdoptOrphanStatement(payloadKey: string, now: string): D1Statement {
  return {
    sql: `UPDATE ingestion_orphan_candidates SET resolution_state = 'adopted', resolved_at = ?
          WHERE payload_key = ? AND resolution_state = 'pending'`,
    params: [now, payloadKey]
  };
}
