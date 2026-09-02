/**
 * Unit Tests for the Tender Search Orchestration Handler (MOAT3 Phase 4)
 * Exercises the edge-agnostic core behind functions/api/tenders/search.ts
 * via dependency injection — no D1/Workers runtime. Covers FTS search mode,
 * the default status-filtered browse mode, keyset pagination boundaries,
 * and DoS/input-sanitization protections, mirroring archiveSearchHandler's
 * test shape for the sibling endpoint.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import { TenderRow } from '../../src/archive/d1QueryBuilder.js';
import { handleTendersSearchRequest } from '../../src/tenders/tendersSearchHandler.js';

function makeRow(id: string, lastSeenAt: string, overrides: Partial<TenderRow> = {}): TenderRow {
  return {
    id, source: 'defproc', title: `Tender ${id}`, organisation_chain: 'Indian Army',
    reference_number: null, category: 'Goods', domain: 'Army', published_at: '2026-08-01',
    closing_at: '2026-09-15T17:00:00', emd_amount: null, iddm_percent: null,
    program_ids: '[]', detail_url: `https://defproc.gov.in/tender/${id}`, pdf_r2_key: null,
    status: 'active', first_seen_at: lastSeenAt, last_seen_at: lastSeenAt,
    ...overrides
  };
}

describe('handleTendersSearchRequest — search mode', () => {
  it('returns matching tenders for a keyword query', async () => {
    const row = makeRow('t1', '2026-09-01T00:00:00Z');
    const runQuery = vi.fn().mockResolvedValue([row]);
    const result = await handleTendersSearchRequest('radar', { runQuery });

    expect(result.tenders).toHaveLength(1);
    expect(result.tenders[0]?.id).toBe('t1');
    expect(runQuery).toHaveBeenCalledTimes(1);
  });

  it('scopes the FTS query to the active status by default', async () => {
    const runQuery = vi.fn().mockResolvedValue([]);
    await handleTendersSearchRequest('radar', { runQuery });

    const [, params] = runQuery.mock.calls[0] as [string, unknown[]];
    expect(params).toContain('active');
  });

  it('returns an empty result and an error message when the query fails', async () => {
    const runQuery = vi.fn().mockRejectedValue(new Error('D1 unavailable'));
    const result = await handleTendersSearchRequest('radar', { runQuery });

    expect(result.tenders).toEqual([]);
    expect(result.error).toBeTruthy();
  });
});

describe('handleTendersSearchRequest — browse mode (blank query)', () => {
  it('queries a status-filtered last_seen_at-descending listing when the search term is blank', async () => {
    const row = makeRow('t1', '2026-09-01T00:00:00Z');
    const runQuery = vi.fn().mockResolvedValue([row]);
    const result = await handleTendersSearchRequest('   ', { runQuery });

    expect(runQuery).toHaveBeenCalledTimes(1);
    expect(result.tenders).toHaveLength(1);
  });

  it('defaults status to active, never leaking closed/cancelled rows unfiltered', async () => {
    const runQuery = vi.fn().mockResolvedValue([]);
    await handleTendersSearchRequest('', { runQuery });

    const [sql, params] = runQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('status = ?');
    expect(params[0]).toBe('active');
  });

  it('rejects an invalid status value and falls back to active', async () => {
    const runQuery = vi.fn().mockResolvedValue([]);
    await handleTendersSearchRequest('', { runQuery }, { status: "'; DROP TABLE tenders; --" });

    const [, params] = runQuery.mock.calls[0] as [string, unknown[]];
    expect(params[0]).toBe('active');
  });

  it('honors an explicit closed status filter', async () => {
    const runQuery = vi.fn().mockResolvedValue([]);
    await handleTendersSearchRequest('', { runQuery }, { status: 'closed' });

    const [, params] = runQuery.mock.calls[0] as [string, unknown[]];
    expect(params[0]).toBe('closed');
  });

  it('applies a domain filter when given', async () => {
    const runQuery = vi.fn().mockResolvedValue([]);
    await handleTendersSearchRequest('', { runQuery }, { domain: 'Navy' });

    const [sql, params] = runQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('domain = ?');
    expect(params).toContain('Navy');
  });

  it('applies a closingBefore filter only when it is a valid date', async () => {
    const runQuery = vi.fn().mockResolvedValue([]);
    await handleTendersSearchRequest('', { runQuery }, { closingBefore: 'not-a-date' });

    const [sql] = runQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).not.toContain('closing_at');
  });
});

describe('handleTendersSearchRequest — cursor pagination', () => {
  it('reports nextCursor as the last row last_seen_at when a full page comes back', async () => {
    const rows = [makeRow('a', '2026-09-02T00:00:00Z'), makeRow('b', '2026-09-01T00:00:00Z')];
    const runQuery = vi.fn().mockResolvedValue(rows);
    const result = await handleTendersSearchRequest('', { runQuery }, { limit: 1 });

    expect(result.tenders).toHaveLength(1);
    expect(result.nextCursor).toBe('2026-09-02T00:00:00Z');
  });

  it('reports nextCursor as null when fewer rows than the page size come back', async () => {
    const runQuery = vi.fn().mockResolvedValue([makeRow('a', '2026-09-02T00:00:00Z')]);
    const result = await handleTendersSearchRequest('', { runQuery }, { limit: 10 });

    expect(result.nextCursor).toBeNull();
  });

  it('passes the cursor through to the query so the next page can be requested', async () => {
    const runQuery = vi.fn().mockResolvedValue([]);
    await handleTendersSearchRequest('', { runQuery }, { cursor: '2026-09-01T00:00:00Z' });

    const [, params] = runQuery.mock.calls[0] as [string, unknown[]];
    expect(params).toContain('2026-09-01T00:00:00Z');
  });
});

describe('handleTendersSearchRequest — DoS & Input Sanitization Protection', () => {
  it('clamps requested page size limit to max 50 to prevent memory blowup', async () => {
    const runQuery = vi.fn().mockResolvedValue([]);
    await handleTendersSearchRequest('', { runQuery }, { limit: 5000 });

    const [, params] = runQuery.mock.calls[0] as [string, unknown[]];
    // status + limit(+1) params for browse mode with no filters: ['active', 51]
    expect(params[params.length - 1]).toBe(51);
  });

  it('strips non-printable control characters from search input', async () => {
    const runQuery = vi.fn().mockResolvedValue([]);
    await handleTendersSearchRequest('radar\x00Mk1A\x1F\x07', { runQuery });

    const [, params] = runQuery.mock.calls[0] as [string, unknown[]];
    const ftsQuery = params[0] as string;
    expect(ftsQuery).not.toContain('\x00');
    expect(ftsQuery).not.toContain('\x1F');
  });

  it('limits search tokens to a maximum of 10 words', async () => {
    const runQuery = vi.fn().mockResolvedValue([]);
    const manyTokens = 'one two three four five six seven eight nine ten eleven twelve';
    await handleTendersSearchRequest(manyTokens, { runQuery });

    const [, params] = runQuery.mock.calls[0] as [string, unknown[]];
    const ftsQuery = params[0] as string;
    const tokens = ftsQuery.split(/\s+/);
    expect(tokens.length).toBeLessThanOrEqual(10);
  });
});
