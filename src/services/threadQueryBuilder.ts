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
  ThreadQueryOptions
} from '../types/threads.js';

export function threadRowToStoryThread(row: StoryThreadRow): StoryThread {
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

export function buildUpsertThreadStatement(thread: StoryThread): D1Statement {
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
  canonicalEntity?: string
): D1Statement {
  const clauses = ['id = ?'];
  const params: unknown[] = [primaryId];

  if (slugId && slugId !== primaryId) {
    clauses.push('id = ?');
    params.push(slugId);
  }

  if (canonicalEntity) {
    clauses.push('canonical_entity = ? COLLATE NOCASE');
    params.push(canonicalEntity);
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
