/**
 * Unit Tests for the Tender Search/Browse D1 Query Builder (MOAT3 Phase 4)
 * Pure SQL/params shape tests — verifies keyset pagination, status scoping,
 * and optional domain/closingBefore filters compose correctly without a D1
 * runtime.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect } from 'vitest';
import { buildSearchTendersStatement, buildBrowseTendersStatement } from '../../src/tenders/tenderSearchQueryBuilder.js';

describe('buildSearchTendersStatement', () => {
  it('scopes to status and MATCHes the FTS table', () => {
    const stmt = buildSearchTendersStatement('radar', 'active', 20);
    expect(stmt.sql).toContain('tenders_fts MATCH ?');
    expect(stmt.sql).toContain('t.status = ?');
    expect(stmt.params).toEqual(['"radar"', 'active', 20]);
  });

  it('adds a keyset cursor clause and param when a cursor is given', () => {
    const stmt = buildSearchTendersStatement('radar', 'active', 20, '2026-09-01T00:00:00Z');
    expect(stmt.sql).toContain('t.last_seen_at < ?');
    expect(stmt.params).toEqual(['"radar"', 'active', '2026-09-01T00:00:00Z', 20]);
  });

  it('clamps the limit to 51 (the handler over-fetches by one row to detect hasMore)', () => {
    const stmt = buildSearchTendersStatement('radar', 'active', 500);
    expect(stmt.params[stmt.params.length - 1]).toBe(51);
  });
});

describe('buildBrowseTendersStatement', () => {
  it('filters by status only when no domain/closingBefore/cursor given', () => {
    const stmt = buildBrowseTendersStatement({ status: 'active' });
    expect(stmt.sql).toContain('status = ?');
    expect(stmt.sql).not.toContain('domain = ?');
    expect(stmt.params).toEqual(['active', 20]);
  });

  it('adds a domain clause when domain is given', () => {
    const stmt = buildBrowseTendersStatement({ status: 'active', domain: 'Navy' });
    expect(stmt.sql).toContain('domain = ?');
    expect(stmt.params).toEqual(['active', 'Navy', 20]);
  });

  it('adds a closingBefore clause when given', () => {
    const stmt = buildBrowseTendersStatement({ status: 'active', closingBefore: '2026-10-01' });
    expect(stmt.sql).toContain('closing_at IS NOT NULL AND closing_at < ?');
    expect(stmt.params).toEqual(['active', '2026-10-01', 20]);
  });

  it('adds a keyset cursor clause when given, after status/domain/closingBefore', () => {
    const stmt = buildBrowseTendersStatement(
      { status: 'active', domain: 'Navy', closingBefore: '2026-10-01' },
      '2026-09-01T00:00:00Z'
    );
    expect(stmt.sql).toContain('last_seen_at < ?');
    expect(stmt.params).toEqual(['active', 'Navy', '2026-10-01', '2026-09-01T00:00:00Z', 20]);
  });

  it('orders by last_seen_at descending and clamps limit to 51 (the handler over-fetches by one row)', () => {
    const stmt = buildBrowseTendersStatement({ status: 'active' }, null, 500);
    expect(stmt.sql).toContain('ORDER BY last_seen_at DESC');
    expect(stmt.params[stmt.params.length - 1]).toBe(51);
  });

  it('scopes to idex/tdf sources when sourceScope is "idex"', () => {
    const stmt = buildBrowseTendersStatement({ status: 'active', sourceScope: 'idex' });
    expect(stmt.sql).toContain('source IN (?,?)');
    expect(stmt.params).toEqual(['active', 'idex', 'tdf', 20]);
  });

  it('excludes idex/tdf sources when sourceScope is "mod"', () => {
    const stmt = buildBrowseTendersStatement({ status: 'active', sourceScope: 'mod' });
    expect(stmt.sql).toContain('source NOT IN (?,?)');
    expect(stmt.params).toEqual(['active', 'idex', 'tdf', 20]);
  });

  it('applies no source clause when sourceScope is "all" or omitted', () => {
    const stmt = buildBrowseTendersStatement({ status: 'active', sourceScope: 'all' });
    expect(stmt.sql).not.toContain('source IN');
    expect(stmt.sql).not.toContain('source NOT IN');
  });
});
