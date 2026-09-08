/**
 * Unit Tests for Thread Request Handler & D1 Query Builder (Phase 1)
 * Tests thread listing, pagination, sanitization, and detail retrieval.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  handleListThreads,
  handleGetThreadDetail,
  sanitizeThreadId
} from '../../src/services/threadHandler.js';
import { StoryThreadRow, StoryThreadEventRow } from '../../src/types/threads.js';

const mockThreadRow: StoryThreadRow = {
  id: 'th_tejas-mk1a',
  title: 'Tejas Mk1A Delivery Arc',
  canonical_entity: 'Tejas Mk1A',
  category: 'airforce',
  status: 'active',
  event_count: 2,
  first_event_at: '2026-07-01T00:00:00Z',
  last_event_at: '2026-08-15T12:00:00Z',
  summary: 'Delivery progression of Mk1A fighters to IAF',
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-08-15T12:00:00Z'
};

const mockEventRow: StoryThreadEventRow = {
  id: 'ev_1',
  thread_id: 'th_tejas-mk1a',
  cluster_id: 'cluster-1',
  sequence_code: 'x1.1.1',
  sequence_index: 1,
  headline: 'First aircraft delivers',
  delta_summary: 'Rollout complete',
  primary_source_name: 'PIB MoD',
  primary_source_url: 'https://pib.gov.in/1',
  published_at: '2026-07-01T00:00:00Z',
  entities: JSON.stringify(['Tejas Mk1A', 'HAL']),
  created_at: '2026-07-01T00:00:00Z'
};

describe('sanitizeThreadId', () => {
  it('strips dangerous or illegal SQL characters from thread id', () => {
    expect(sanitizeThreadId("th_tejas'; DROP TABLE story_threads;--")).toBe('th_tejasDROPTABLEstory_threads--');
    expect(sanitizeThreadId('th_pinaka-er_123')).toBe('th_pinaka-er_123');
    expect(sanitizeThreadId('')).toBe('');
  });
});

describe('handleListThreads', () => {
  it('returns mapped threads and nextCursor when limit is reached', async () => {
    const runQuery = vi.fn().mockResolvedValue([mockThreadRow]);
    const result = await handleListThreads({ limit: 1 }, { runQuery });

    expect(result.threads).toHaveLength(1);
    expect(result.threads[0]?.id).toBe('th_tejas-mk1a');
    expect(result.threads[0]?.canonicalEntity).toBe('Tejas Mk1A');
    expect(result.nextCursor).toBe('2026-08-15T12:00:00Z');
    expect(runQuery).toHaveBeenCalledTimes(1);
  });

  it('filters by category and status in query parameters', async () => {
    const runQuery = vi.fn().mockResolvedValue([]);
    await handleListThreads({ category: 'airforce', status: 'active', limit: 10 }, { runQuery });

    expect(runQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE status = ? AND category = ?'),
      ['active', 'airforce', 10]
    );
  });

  it('sanitizes and discards invalid status values', async () => {
    const runQuery = vi.fn().mockResolvedValue([]);
    await handleListThreads({ status: 'malicious_status' as any, limit: 10 }, { runQuery });

    expect(runQuery).toHaveBeenCalledWith(
      expect.not.stringContaining('WHERE status = ?'),
      [10]
    );
  });

  it('handles database exceptions gracefully without crashing', async () => {
    const runQuery = vi.fn().mockRejectedValue(new Error('D1 Connection Reset'));
    const result = await handleListThreads({}, { runQuery });

    expect(result.threads).toEqual([]);
    expect(result.nextCursor).toBeNull();
    expect(result.error).toBe('Database query failed');
  });
});

describe('handleGetThreadDetail', () => {
  it('returns thread domain model and sorted events', async () => {
    const runQuery = vi.fn().mockImplementation((sql: string) => {
      if (sql.includes('FROM story_threads')) {
        return Promise.resolve([mockThreadRow]);
      }
      return Promise.resolve([mockEventRow]);
    });

    const result = await handleGetThreadDetail('th_tejas-mk1a', { runQuery });

    expect(result.thread).not.toBeNull();
    expect(result.thread?.id).toBe('th_tejas-mk1a');
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.sequenceCode).toBe('x1.1.1');
    expect(result.events[0]?.entities).toEqual(['Tejas Mk1A', 'HAL']);
    expect(result.error).toBeUndefined();
  });

  it('resolves thread when queried with canonical entity name or slug without th_ prefix', async () => {
    const runQuery = vi.fn().mockImplementation((sql: string) => {
      if (sql.includes('FROM story_threads')) {
        // Assert query uses parameter binding covering id and canonical_entity
        expect(sql).toContain('canonical_entity');
        return Promise.resolve([mockThreadRow]);
      }
      return Promise.resolve([mockEventRow]);
    });

    // Test with human-readable canonical entity name
    const resultByEntity = await handleGetThreadDetail('Tejas Mk1A', { runQuery });
    expect(resultByEntity.thread?.id).toBe('th_tejas-mk1a');

    // Test with slugified name without th_ prefix
    const resultBySlug = await handleGetThreadDetail('tejas-mk1a', { runQuery });
    expect(resultBySlug.thread?.id).toBe('th_tejas-mk1a');
  });

  it('returns 404 error when thread does not exist', async () => {
    const runQuery = vi.fn().mockResolvedValue([]);
    const result = await handleGetThreadDetail('th_nonexistent', { runQuery });

    expect(result.thread).toBeNull();
    expect(result.events).toEqual([]);
    expect(result.error).toBe('Thread not found');
  });

  it('rejects empty or invalid thread IDs immediately', async () => {
    const runQuery = vi.fn();
    const result = await handleGetThreadDetail('', { runQuery });

    expect(result.error).toBe('Invalid thread ID');
    expect(runQuery).not.toHaveBeenCalled();
  });
});

