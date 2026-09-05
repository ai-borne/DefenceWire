/**
 * Unit Tests for Curator Knowledge Base Read Handler (Phase 5)
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it, vi } from 'vitest';
import {
  handleGetKnowledgeBase,
  KNOWLEDGE_BASE_TABLE_KEYS,
  CuratorKnowledgeBaseDependencies
} from '../../src/services/curatorKnowledgeBaseHandler.js';

describe('handleGetKnowledgeBase', () => {
  it('rejects an unauthenticated request without querying the database', async () => {
    const runQuery = vi.fn();
    const result = await handleGetKnowledgeBase(
      { table: 'discovered_entities' },
      { runQuery, verifyAuth: async () => false },
      null,
      undefined
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unauthorized');
    expect(runQuery).not.toHaveBeenCalled();
  });

  it('rejects an unknown table name without querying the database', async () => {
    const runQuery = vi.fn();
    const result = await handleGetKnowledgeBase(
      { table: 'users; DROP TABLE curator_overrides;--' },
      { runQuery },
      null,
      undefined,
      true
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown knowledge base table');
    expect(runQuery).not.toHaveBeenCalled();
  });

  it('every allow-listed table key is queryable and returns rows/count', async () => {
    for (const table of KNOWLEDGE_BASE_TABLE_KEYS) {
      const runQuery = vi
        .fn()
        .mockResolvedValueOnce([{ total: 3 }])
        .mockResolvedValueOnce([{ col: 'x' }]);
      const result = await handleGetKnowledgeBase({ table }, { runQuery }, null, undefined, true);
      expect(result.success).toBe(true);
      expect(result.data?.table).toBe(table);
      expect(result.data?.totalCount).toBe(3);
      expect(result.data?.rows).toEqual([{ col: 'x' }]);
    }
  });

  it('never interpolates client-supplied sortBy/sortDir into the SQL when not allow-listed', async () => {
    const runQuery = vi.fn().mockResolvedValueOnce([{ total: 0 }]).mockResolvedValueOnce([]);
    await handleGetKnowledgeBase(
      { table: 'curator_overrides', sortBy: 'id); DROP TABLE curator_overrides;--', sortDir: 'garbage' },
      { runQuery },
      null,
      undefined,
      true
    );
    const secondCallSql = runQuery.mock.calls[1]![0] as string;
    expect(secondCallSql).not.toContain('DROP TABLE');
    expect(secondCallSql).toContain('ORDER BY updated_at DESC');
  });

  it('applies a LIKE filter across the configured filter columns as bound parameters', async () => {
    const runQuery = vi.fn().mockResolvedValueOnce([{ total: 1 }]).mockResolvedValueOnce([{ domain: 'x.com' }]);
    await handleGetKnowledgeBase(
      { table: 'source_reputation', filter: 'livefist' },
      { runQuery },
      null,
      undefined,
      true
    );
    const [countSql, countParams] = runQuery.mock.calls[0]!;
    expect(countSql).toContain('WHERE domain LIKE ? OR source_name LIKE ?');
    expect(countParams).toEqual(['%livefist%', '%livefist%']);
  });

  it('clamps pageSize to the maximum and page to non-negative', async () => {
    const runQuery = vi.fn().mockResolvedValueOnce([{ total: 0 }]).mockResolvedValueOnce([]);
    await handleGetKnowledgeBase(
      { table: 'published_snapshots', pageSize: 9999, page: -5 },
      { runQuery },
      null,
      undefined,
      true
    );
    const [, rowParams] = runQuery.mock.calls[1]!;
    // LIMIT (clamped pageSize), OFFSET (page * pageSize) — page clamped to 0
    expect(rowParams).toEqual([50, 0]);
  });

  it('surfaces a database error rather than silently returning an empty result', async () => {
    const runQuery = vi.fn().mockRejectedValueOnce(new Error('D1 unavailable'));
    const result = await handleGetKnowledgeBase({ table: 'discovered_entities' }, { runQuery }, null, undefined, true);
    expect(result.success).toBe(false);
    expect(result.error).toBe('D1 unavailable');
  });

  it('resolves auth via verifySessionCookie fallback when isAuthorized is undefined and no verifyAuth override given', async () => {
    const runQuery = vi.fn();
    const deps: CuratorKnowledgeBaseDependencies = { runQuery };
    const result = await handleGetKnowledgeBase({ table: 'discovered_entities' }, deps, null, undefined, undefined);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unauthorized');
  });
});
