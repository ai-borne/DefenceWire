/**
 * Edge-Agnostic Story Thread Request Handler (Phase 1)
 * Handles listing threads, cursor pagination, and fetching thread event
 * timelines with SQL parameter sanitization.
 * Hard limit: <= 300 LOC.
 */

import {
  StoryThread,
  StoryThreadEvent,
  StoryThreadRow,
  StoryThreadEventRow,
  ThreadDetailResult,
  ThreadListResult,
  ThreadQueryOptions,
  ThreadStatus
} from '../types/threads.js';
import {
  buildGetEventsByThreadIdStatement,
  buildGetThreadByIdStatement,
  buildListThreadsStatement,
  eventRowToStoryThreadEvent,
  threadRowToStoryThread
} from './threadQueryBuilder.js';
import { cleanHashtag, hashtagToSlug, canonicalizeTag } from '../utils/hashtagUtils.js';
import { auditThreadCoherence } from './threadCoherence.js';

export interface ThreadHandlerDeps {
  runQuery: (sql: string, params: unknown[]) => Promise<unknown[]>;
}

export function sanitizeThreadId(rawId: string): string {
  if (!rawId || typeof rawId !== 'string') return '';
  return rawId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100);
}

export async function handleListThreads(
  options: ThreadQueryOptions,
  deps: ThreadHandlerDeps
): Promise<ThreadListResult> {
  const allowedStatuses: ThreadStatus[] = ['active', 'dormant', 'concluded'];
  const status = options.status && allowedStatuses.includes(options.status) ? options.status : undefined;
  const category = options.category ? options.category.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 50) : undefined;
  const limit = Math.min(50, Math.max(1, options.limit ?? 20));

  const sanitizedOptions: ThreadQueryOptions = {
    ...options,
    status,
    category,
    limit,
    cursor: options.cursor ? options.cursor.slice(0, 50) : null
  };

  try {
    const stmt = buildListThreadsStatement(sanitizedOptions);
    const rows = (await deps.runQuery(stmt.sql, stmt.params)) as StoryThreadRow[];
    const threads: StoryThread[] = rows.map(threadRowToStoryThread).filter((t) => t.eventCount > 0);

    let nextCursor: string | null = null;
    if (threads.length >= limit && threads.length > 0) {
      nextCursor = threads[threads.length - 1]!.lastEventAt;
    }

    return { threads, nextCursor };
  } catch (err) {
    console.error('[THREAD HANDLER] Error querying threads:', err);
    return { threads: [], nextCursor: null, error: 'Database query failed' };
  }
}

export function slugifyThreadCandidate(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function handleGetThreadDetail(
  rawId: string,
  deps: ThreadHandlerDeps
): Promise<ThreadDetailResult> {
  const trimmed = typeof rawId === 'string' ? rawId.trim() : '';
  if (!trimmed) {
    return { thread: null, events: [], error: 'Invalid thread ID' };
  }

  const cleanId = sanitizeThreadId(trimmed);
  const slugId = hashtagToSlug(trimmed) || (slugifyThreadCandidate(trimmed) ? `th_${slugifyThreadCandidate(trimmed)}` : '');
  const cleanedTag = cleanHashtag(trimmed);
  const canonicalEntity = canonicalizeTag(trimmed);

  const candidateEntities: string[] = [];
  if (cleanedTag) candidateEntities.push(cleanedTag);
  if (canonicalEntity) candidateEntities.push(canonicalEntity);
  const unhashed = trimmed.replace(/^#+/, '').trim();
  if (unhashed) candidateEntities.push(unhashed.slice(0, 100));

  try {
    const threadStmt = buildGetThreadByIdStatement(
      cleanId || slugId,
      slugId,
      canonicalEntity || cleanedTag || trimmed.slice(0, 100),
      candidateEntities
    );
    const threadRows = (await deps.runQuery(threadStmt.sql, threadStmt.params)) as StoryThreadRow[];
    if (threadRows.length === 0 || !threadRows[0]) {
      return { thread: null, events: [], error: 'Thread not found' };
    }

    const thread = threadRowToStoryThread(threadRows[0]);
    const eventsStmt = buildGetEventsByThreadIdStatement(thread.id);
    const eventRows = (await deps.runQuery(eventsStmt.sql, eventsStmt.params)) as StoryThreadEventRow[];
    const rawEvents: StoryThreadEvent[] = eventRows.map(eventRowToStoryThreadEvent);
    const audit = auditThreadCoherence(rawEvents, {
      id: thread.id,
      canonicalEntity: thread.canonicalEntity,
      title: thread.title
    });
    const events = audit.validEvents;
    thread.eventCount = events.length;

    return { thread, events };
  } catch (err) {
    console.error(`[THREAD HANDLER] Error fetching thread detail for ${trimmed}:`, err);
    return { thread: null, events: [], error: 'Database query failed' };
  }
}
