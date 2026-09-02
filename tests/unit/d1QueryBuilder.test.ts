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
  buildDeleteArchivedStoriesStatement,
  buildEntityRelatedStoriesStatement,
  buildCloseStaleTendersStatement,
  buildDeleteStaleClosedTendersStatement,
  buildUpdateTenderStatusStatement,
  buildUpsertTenderHealthFailureStatement,
  buildUpsertTenderHealthSuccessStatement,
  buildUpsertTenderStatement,
  sanitizeFtsQuery,
  TenderRow
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

  it('strips ASCII control characters and clamps token count to 10', () => {
    const wildInput = 'word1\x00 word2\x1F word3 word4 word5 word6 word7 word8 word9 word10 word11 word12';
    const sanitized = sanitizeFtsQuery(wildInput);
    const tokens = sanitized.split(' ');
    expect(tokens.length).toBeLessThanOrEqual(10);
    expect(sanitized).not.toContain('\x00');
    expect(sanitized).not.toContain('\x1F');
  });

  it('returns an empty string for empty or whitespace-only input', () => {
    expect(sanitizeFtsQuery('')).toBe('');
    expect(sanitizeFtsQuery('   ')).toBe('');
  });
});

describe('buildEntityRelatedStoriesStatement', () => {
  it('builds an indexed FTS5 query to retrieve related story IDs and cluster_json', () => {
    const stmt = buildEntityRelatedStoriesStatement('Tejas Mk1A', 20);
    expect(stmt.sql).toContain('archived_stories_fts');
    expect(stmt.sql).toContain('MATCH ?');
    expect(stmt.sql).toContain('ORDER BY a.archived_at DESC');
    expect(stmt.sql).toContain('LIMIT ?');
    expect(stmt.params).toEqual(['"Tejas" "Mk1A"', 20]);
  });

  it('clamps limit to safe bounds [1, 50]', () => {
    expect(buildEntityRelatedStoriesStatement('BrahMos', 0).params[1]).toBe(1);
    expect(buildEntityRelatedStoriesStatement('BrahMos', 500).params[1]).toBe(50);
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

describe('buildDeleteArchivedStoriesStatement', () => {
  it('builds a parameterized DELETE with one placeholder per id', () => {
    const stmt = buildDeleteArchivedStoriesStatement(['cluster-a', 'cluster-b', 'cluster-c']);
    expect(stmt.sql).toMatch(/^DELETE FROM archived_stories WHERE id IN \(\?, \?, \?\)$/);
    expect(stmt.params).toEqual(['cluster-a', 'cluster-b', 'cluster-c']);
  });

  it('never interpolates ids directly into the SQL string', () => {
    const stmt = buildDeleteArchivedStoriesStatement(['cluster-a']);
    expect(stmt.sql).not.toContain('cluster-a');
  });
});

const tenderRow: TenderRow = {
  id: '2026_IAF_787429_1',
  source: 'defproc',
  title: 'Procurement of Spare Parts for Su-30MKI Avionics Suite',
  organisation_chain: 'Ministry Of Defence | Indian Air Force | Air Headquarters',
  reference_number: 'AF/2026/B/787429',
  category: 'Goods',
  domain: 'Air Force',
  published_at: '2026-08-26',
  closing_at: '2026-09-15T17:00:00',
  emd_amount: 50000,
  iddm_percent: 55,
  program_ids: '[]',
  detail_url: 'https://defproc.gov.in/tender/787429',
  pdf_r2_key: null,
  status: 'active',
  first_seen_at: '2026-08-26T00:00:00Z',
  last_seen_at: '2026-08-26T00:00:00Z'
};

describe('buildUpsertTenderStatement', () => {
  it('builds an upsert with 17 positional params matching the row shape', () => {
    const stmt = buildUpsertTenderStatement(tenderRow);
    expect(stmt.sql).toMatch(/^INSERT INTO tenders/i);
    expect(stmt.sql).toContain('ON CONFLICT(id) DO UPDATE SET');
    expect(stmt.params).toHaveLength(17);
    expect(stmt.params[0]).toBe(tenderRow.id);
  });

  it('never interpolates row values directly into the SQL string', () => {
    const stmt = buildUpsertTenderStatement(tenderRow);
    expect(stmt.sql).not.toContain(tenderRow.id);
    expect(stmt.sql).not.toContain(tenderRow.title);
  });
});

describe('buildUpdateTenderStatusStatement', () => {
  it('builds a parameterized status update', () => {
    const stmt = buildUpdateTenderStatusStatement('2026_IAF_787429_1', 'closed');
    expect(stmt.sql).toBe('UPDATE tenders SET status = ? WHERE id = ?');
    expect(stmt.params).toEqual(['closed', '2026_IAF_787429_1']);
  });
});

describe('buildCloseStaleTendersStatement', () => {
  it('bulk-transitions active tenders past the cutoff to closed', () => {
    const stmt = buildCloseStaleTendersStatement('2026-08-03T00:00:00.000Z');
    expect(stmt.sql).toContain("SET status = 'closed'");
    expect(stmt.sql).toContain("WHERE status = 'active'");
    expect(stmt.params).toEqual(['2026-08-03T00:00:00.000Z']);
  });
});

describe('buildDeleteStaleClosedTendersStatement', () => {
  it('hard-deletes closed, unlinked, non-overridden tenders past the cutoff', () => {
    const stmt = buildDeleteStaleClosedTendersStatement('2026-03-06T00:00:00.000Z');
    expect(stmt.sql).toContain("DELETE FROM tenders WHERE status = 'closed'");
    expect(stmt.sql).toContain("program_ids IS NULL OR program_ids = '[]'");
    expect(stmt.sql).toContain('NOT IN (SELECT id FROM curator_overrides)');
    expect(stmt.params).toEqual(['2026-03-06T00:00:00.000Z']);
  });
});

describe('tender_source_health upserts', () => {
  it('builds a success upsert that resets the failure streak', () => {
    const stmt = buildUpsertTenderHealthSuccessStatement('defproc', '2026-09-02T00:00:00.000Z');
    expect(stmt.sql).toContain('consecutive_failures = 0');
    expect(stmt.params).toEqual(['defproc', '2026-09-02T00:00:00.000Z', '2026-09-02T00:00:00.000Z']);
  });

  it('builds a failure upsert that increments the failure streak', () => {
    const stmt = buildUpsertTenderHealthFailureStatement('eprocure', 'captcha_detected', '2026-09-02T00:00:00.000Z');
    expect(stmt.sql).toContain('consecutive_failures = tender_source_health.consecutive_failures + 1');
    expect(stmt.params).toEqual(['eprocure', 'captcha_detected', '2026-09-02T00:00:00.000Z']);
  });
});
