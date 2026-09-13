/**
 * Story Thread D1 Query Builder & Row Mappers (Phase 1)
 * Builds parameterized D1Statements for story threads and events, and maps
 * SQLite D1 rows to TypeScript domain objects.
 * Hard limit: <= 300 LOC.
 */

import { D1Statement } from '../archive/d1QueryBuilder.js';
import {
  StoryThread,
  StoryThreadEvent,
  StoryThreadRow,
  StoryThreadEventRow,
  ThreadQueryOptions,
  ThreadTopicLink
} from '../types/threads.js';

export function threadRowToStoryThread(row: StoryThreadRow): StoryThread {
  let semanticFingerprint: string[] | undefined = undefined;
  if (row.fingerprint_json) {
    try {
      semanticFingerprint = JSON.parse(row.fingerprint_json);
    } catch {
      semanticFingerprint = undefined;
    }
  }

  return {
    id: row.id,
    title: row.title,
    canonicalEntity: row.canonical_entity,
    category: row.category,
    status: (row.status as StoryThread['status']) || 'active',
    eventCount: row.event_count,
    firstEventAt: row.first_event_at,
    lastEventAt: row.last_event_at,
    summary: row.summary ?? undefined,
    semanticFingerprint,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function eventRowToStoryThreadEvent(row: StoryThreadEventRow): StoryThreadEvent {
  let entities: string[] = [];
  try {
    entities = JSON.parse(row.entities);
  } catch {
    entities = [];
  }

  return {
    id: row.id,
    threadId: row.thread_id,
    clusterId: row.cluster_id,
    sequenceCode: row.sequence_code,
    sequenceIndex: row.sequence_index,
    headline: row.headline,
    deltaSummary: row.delta_summary,
    primarySourceName: row.primary_source_name,
    primarySourceUrl: row.primary_source_url,
    publishedAt: row.published_at,
    entities,
    createdAt: row.created_at
  };
}

export function buildUpsertThreadStatement(thread: StoryThread, includeFingerprint: boolean = true): D1Statement {
  if (!includeFingerprint) {
    return {
      sql: `INSERT INTO story_threads (
        id, title, canonical_entity, category, status, event_count,
        first_event_at, last_event_at, summary, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        category = excluded.category,
        status = excluded.status,
        event_count = excluded.event_count,
        first_event_at = excluded.first_event_at,
        last_event_at = excluded.last_event_at,
        summary = excluded.summary,
        updated_at = excluded.updated_at`,
      params: [
        thread.id,
        thread.title,
        thread.canonicalEntity,
        thread.category,
        thread.status,
        thread.eventCount,
        thread.firstEventAt,
        thread.lastEventAt,
        thread.summary ?? null,
        thread.createdAt,
        thread.updatedAt
      ]
    };
  }

  return {
    sql: `INSERT INTO story_threads (
      id, title, canonical_entity, category, status, event_count,
      first_event_at, last_event_at, summary, fingerprint_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      category = excluded.category,
      status = excluded.status,
      event_count = excluded.event_count,
      first_event_at = excluded.first_event_at,
      last_event_at = excluded.last_event_at,
      summary = excluded.summary,
      fingerprint_json = excluded.fingerprint_json,
      updated_at = excluded.updated_at`,
    params: [
      thread.id,
      thread.title,
      thread.canonicalEntity,
      thread.category,
      thread.status,
      thread.eventCount,
      thread.firstEventAt,
      thread.lastEventAt,
      thread.summary ?? null,
      thread.semanticFingerprint ? JSON.stringify(thread.semanticFingerprint) : null,
      thread.createdAt,
      thread.updatedAt
    ]
  };
}

export function buildUpsertThreadEventStatement(event: StoryThreadEvent): D1Statement {
  return {
    sql: `INSERT INTO story_thread_events (
      id, thread_id, cluster_id, sequence_code, sequence_index,
      headline, delta_summary, primary_source_name, primary_source_url,
      published_at, entities, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      sequence_code = excluded.sequence_code,
      sequence_index = excluded.sequence_index,
      headline = excluded.headline,
      delta_summary = excluded.delta_summary,
      primary_source_name = excluded.primary_source_name,
      primary_source_url = excluded.primary_source_url,
      published_at = excluded.published_at,
      entities = excluded.entities`,
    params: [
      event.id,
      event.threadId,
      event.clusterId,
      event.sequenceCode,
      event.sequenceIndex,
      event.headline,
      event.deltaSummary,
      event.primarySourceName,
      event.primarySourceUrl,
      event.publishedAt,
      JSON.stringify(event.entities),
      event.createdAt
    ]
  };
}

export function buildListThreadsStatement(options: ThreadQueryOptions = {}): D1Statement {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options.status) {
    conditions.push('status = ?');
    params.push(options.status);
  }

  if (options.category) {
    conditions.push('category = ?');
    params.push(options.category);
  }

  if (options.cursor) {
    conditions.push('last_event_at < ?');
    params.push(options.cursor);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(50, Math.max(1, options.limit ?? 20));
  params.push(limit);

  return {
    sql: `SELECT * FROM story_threads ${whereClause} ORDER BY last_event_at DESC LIMIT ?`,
    params
  };
}

export function buildGetThreadByIdStatement(
  primaryId: string,
  slugId?: string,
  canonicalEntity?: string,
  candidateEntities?: string[]
): D1Statement {
  const clauses: string[] = ['id = ?'];
  const params: unknown[] = [primaryId];

  if (slugId && slugId !== primaryId) {
    clauses.push('id = ?');
    params.push(slugId);
  }

  const entities = new Set<string>();
  if (canonicalEntity) entities.add(canonicalEntity);
  if (candidateEntities) {
    for (const ent of candidateEntities) {
      if (ent) entities.add(ent);
    }
  }

  for (const ent of entities) {
    clauses.push('canonical_entity = ? COLLATE NOCASE');
    params.push(ent);
  }

  return {
    sql: `SELECT * FROM story_threads WHERE (${clauses.join(' OR ')}) LIMIT 1`,
    params
  };
}

export function buildGetEventsByThreadIdStatement(threadId: string): D1Statement {
  return {
    sql: `SELECT * FROM story_thread_events WHERE thread_id = ? ORDER BY sequence_index ASC`,
    params: [threadId]
  };
}

/**
 * Finds only threads plausibly related to the incoming clusters.  This is
 * deliberately topic/lineage scoped: thread continuity must never depend on
 * an arbitrary newest-N slice of the whole database.
 */
export function buildThreadCandidatesStatement(clusterIds: string[]): D1Statement {
  const marks = clusterIds.map(() => '?').join(',');
  return {
    sql: `WITH incoming_clusters AS (
        SELECT event_fingerprint, first_observed_at, last_observed_at FROM story_clusters WHERE id IN (${marks})
      ), incoming_topics AS (
        SELECT DISTINCT topic_id FROM cluster_topics WHERE cluster_id IN (${marks})
      ), incoming_lineage AS (
        SELECT predecessor_cluster_id AS cluster_id FROM cluster_lineage WHERE successor_cluster_id IN (${marks})
        UNION SELECT successor_cluster_id FROM cluster_lineage WHERE predecessor_cluster_id IN (${marks})
      ), candidate_ids AS (
        SELECT DISTINCT tt.thread_id FROM thread_topics tt JOIN incoming_topics it ON it.topic_id=tt.topic_id
        UNION SELECT DISTINCT e.thread_id FROM story_thread_events e JOIN story_clusters historical ON historical.id=e.cluster_id
          JOIN incoming_clusters incoming ON incoming.event_fingerprint=historical.event_fingerprint
          AND historical.last_observed_at BETWEEN datetime(incoming.first_observed_at, '-180 days') AND datetime(incoming.last_observed_at, '+180 days')
        UNION SELECT DISTINCT e.thread_id FROM story_thread_events e
          WHERE e.cluster_id IN (${marks}) OR e.cluster_id IN (SELECT cluster_id FROM incoming_lineage)
      ) SELECT st.* FROM story_threads st JOIN candidate_ids c ON c.thread_id=st.id
      ORDER BY st.last_event_at DESC`,
    params: [...clusterIds, ...clusterIds, ...clusterIds, ...clusterIds, ...clusterIds]
  };
}

export function buildEventsForThreadsStatement(threadIds: string[]): D1Statement {
  const marks = threadIds.map(() => '?').join(',');
  return { sql: `SELECT * FROM story_thread_events WHERE thread_id IN (${marks}) ORDER BY thread_id, sequence_index ASC`, params: threadIds };
}

export function buildClusterTopicLinksStatement(clusterIds: string[]): D1Statement {
  const marks = clusterIds.map(() => '?').join(',');
  return { sql: `SELECT cluster_id, topic_id FROM cluster_topics WHERE cluster_id IN (${marks})`, params: clusterIds };
}

export function buildClusterLineageStatement(clusterIds: string[]): D1Statement {
  const marks = clusterIds.map(() => '?').join(',');
  return { sql: `SELECT predecessor_cluster_id, successor_cluster_id FROM cluster_lineage
    WHERE predecessor_cluster_id IN (${marks}) OR successor_cluster_id IN (${marks})`, params: [...clusterIds, ...clusterIds] };
}

export function buildUpsertThreadTopicStatement(link: ThreadTopicLink): D1Statement {
  return { sql: `INSERT INTO thread_topics (thread_id, topic_id, linked_at) VALUES (?, ?, ?)
    ON CONFLICT(thread_id, topic_id) DO NOTHING`, params: [link.threadId, link.topicId, link.linkedAt] };
}
