/**
 * Client Story Thread Service for DefenceWire.in (Phase 1)
 * Thin fetch wrapper around GET /api/threads/list and GET /api/threads/[id].
 * Kept separate from ViewModels to ensure pure network testability.
 * Hard limit: <= 300 LOC.
 */

import {
  ThreadDetailResult,
  ThreadListResult,
  ThreadQueryOptions
} from '../types/threads.js';

export async function fetchThreadsList(
  options: ThreadQueryOptions = {},
  fetchFn: typeof fetch = fetch
): Promise<ThreadListResult> {
  const params = new URLSearchParams();
  if (options.status) params.set('status', options.status);
  if (options.category) params.set('category', options.category);
  if (options.limit) params.set('limit', String(options.limit));
  if (options.cursor) params.set('cursor', options.cursor);

  const queryStr = params.toString();
  const endpoint = `/api/threads/list${queryStr ? `?${queryStr}` : ''}`;

  try {
    const res = await fetchFn(endpoint);
    if (!res.ok) {
      return { threads: [], nextCursor: null, error: 'Story threads are temporarily unavailable.' };
    }
    const data = (await res.json()) as ThreadListResult;
    return {
      threads: data.threads ?? [],
      nextCursor: data.nextCursor ?? null,
      error: data.error
    };
  } catch {
    return { threads: [], nextCursor: null, error: 'Network error loading story threads.' };
  }
}

export async function fetchThreadDetail(
  threadId: string,
  fetchFn: typeof fetch = fetch
): Promise<ThreadDetailResult> {
  if (!threadId) {
    return { thread: null, events: [], error: 'Thread ID is required.' };
  }

  const endpoint = `/api/threads/${encodeURIComponent(threadId)}`;

  try {
    const res = await fetchFn(endpoint);
    if (!res.ok) {
      return { thread: null, events: [], error: 'Thread detail is temporarily unavailable.' };
    }
    const data = (await res.json()) as ThreadDetailResult;
    return {
      thread: data.thread ?? null,
      events: data.events ?? [],
      error: data.error
    };
  } catch {
    return { thread: null, events: [], error: 'Network error loading thread detail.' };
  }
}
