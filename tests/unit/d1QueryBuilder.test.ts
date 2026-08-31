/**
 * Unit Tests for the D1 Query Builder SSOT
 * Verifies the exact SQL/params shape used by both the crawler's REST-API
 * write path and the Pages Function's D1-binding read path, and the FTS5
 * query sanitizer that keeps user search input from breaking MATCH syntax.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect } from 'vitest';
import { ArchivedStoryRow } from '../../src/archive/archiveRow.js';
import {
  buildInsertArchivedStoryStatement,
  buildSearchArchiveStatement,
  buildBrowseArchiveStatement,
  sanitizeFtsQuery
} from '../../src/archive/d1QueryBuilder.js';

const row: ArchivedStoryRow = {
  id: 'cluster-tejas-mk1a',
  synthesized_headline: 'HAL delivers Tejas Mk1A fighters',
  snippet: 'Equipped with Uttam AESA radar.',
  primary_source_name: 'PIB MoD',
  primary_source_url: 'https://pib.gov.in/news/tejas',
  primary_source_published_at: '2026-08-01T10:00:00Z',
  categories: '["airforce"]',
  entities: '["Tejas Mk1A"]',
  defence_score: 90,
  cluster_json: '{}',
  archived_at: '2026-08-05T00:00:00Z'
};

describe('buildInsertArchivedStoryStatement', () => {
  it('builds a parameterized INSERT OR IGNORE statement', () => {
    const stmt = buildInsertArchivedStoryStatement(row);
    expect(stmt.sql).toMatch(/^INSERT OR IGNORE INTO archived_stories/i);
    expect(stmt.sql).toContain('VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  });

  it('orders params to match the row field order in the statement', () => {
    const stmt = buildInsertArchivedStoryStatement(row);
    expect(stmt.params).toEqual([
      row.id,
      row.synthesized_headline,
      row.snippet,
      row.primary_source_name,
      row.primary_source_url,
      row.primary_source_published_at,
      row.categories,
      row.entities,
      row.defence_score,
      row.cluster_json,
      row.archived_at
    ]);
  });

  it('never interpolates row values directly into the SQL string', () => {
    const stmt = buildInsertArchivedStoryStatement(row);
    expect(stmt.sql).not.toContain(row.id);
    expect(stmt.sql).not.toContain(row.synthesized_headline);
  });
});

describe('sanitizeFtsQuery', () => {
  it('wraps each token as a quoted phrase to avoid FTS5 syntax errors', () => {
    expect(sanitizeFtsQuery('Tejas Mk1A')).toBe('"Tejas" "Mk1A"');
  });

  it('neutralizes FTS5 special characters like hyphens by quoting', () => {
    expect(sanitizeFtsQuery('F-16 radar')).toBe('"F-16" "radar"');
  });

  it('escapes embedded double quotes', () => {
    expect(sanitizeFtsQuery('"Tejas"')).toBe('"""Tejas"""');
  });

  it('collapses extra whitespace and trims', () => {
    expect(sanitizeFtsQuery('  Tejas    Mk1A  ')).toBe('"Tejas" "Mk1A"');
  });

  it('returns an empty string for empty or whitespace-only input', () => {
    expect(sanitizeFtsQuery('')).toBe('');
    expect(sanitizeFtsQuery('   ')).toBe('');
  });
});

describe('buildSearchArchiveStatement', () => {
  it('builds a parameterized FTS MATCH query joined to the base table', () => {
    const stmt = buildSearchArchiveStatement('Tejas', 30);
    expect(stmt.sql).toContain('archived_stories_fts');
    expect(stmt.sql).toContain('MATCH ?');
    expect(stmt.sql).toContain('LIMIT ?');
  });

  it('passes the sanitized query and limit as params, not interpolated', () => {
    const stmt = buildSearchArchiveStatement('F-16 radar', 10);
    expect(stmt.params).toEqual(['"F-16" "radar"', 10]);
    expect(stmt.sql).not.toContain('F-16');
  });

  it('defaults to a sensible result limit when none is given', () => {
    const stmt = buildSearchArchiveStatement('Tejas');
    expect(stmt.params[1]).toBeGreaterThan(0);
    expect(stmt.params[1]).toBeLessThanOrEqual(50);
  });

  it('adds a keyset cursor condition when a cursor is given, without breaking the FTS join', () => {
    const stmt = buildSearchArchiveStatement('Tejas', 30, '2026-08-05T00:00:00Z');
    expect(stmt.sql).toContain('archived_stories_fts');
    expect(stmt.sql).toContain('a.archived_at < ?');
    expect(stmt.params).toEqual(['"Tejas"', '2026-08-05T00:00:00Z', 30]);
  });

  it('omits the cursor condition when cursor is null', () => {
    const stmt = buildSearchArchiveStatement('Tejas', 30, null);
    expect(stmt.sql).not.toContain('archived_at < ?');
    expect(stmt.params).toEqual(['"Tejas"', 30]);
  });
});

describe('buildBrowseArchiveStatement', () => {
  it('builds a plain date-descending listing with no query needed', () => {
    const stmt = buildBrowseArchiveStatement(null, 30);
    expect(stmt.sql).toContain('FROM archived_stories');
    expect(stmt.sql).not.toContain('MATCH');
    expect(stmt.sql).toContain('ORDER BY archived_at DESC');
    expect(stmt.params).toEqual([30]);
  });

  it('adds a keyset cursor condition when paginating past the first page', () => {
    const stmt = buildBrowseArchiveStatement('2026-08-05T00:00:00Z', 30);
    expect(stmt.sql).toContain('archived_at < ?');
    expect(stmt.params).toEqual(['2026-08-05T00:00:00Z', 30]);
  });

  it('never interpolates the cursor value into the SQL string', () => {
    const stmt = buildBrowseArchiveStatement('2026-08-05T00:00:00Z', 30);
    expect(stmt.sql).not.toContain('2026-08-05');
  });
});
