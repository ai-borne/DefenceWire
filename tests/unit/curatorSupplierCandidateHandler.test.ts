/**
 * Unit Tests for Curator Supplier Candidate Review Handler (Phase 2.7)
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it, vi } from 'vitest';
import {
  handleListSupplierCandidates,
  handleReviewSupplierCandidate,
  CuratorSupplierCandidateDependencies
} from '../../src/services/curatorSupplierCandidateHandler.js';

const PENDING_ROW = {
  id: 'new_link:bel:tejas-mk2',
  candidate_type: 'new_link',
  supplier_id: 'bel',
  supplier_name: 'Bharat Electronics Limited',
  program_id: 'tejas-mk2',
  subsystem_name: 'Needs reviewer input',
  source_story_id: 'story-1',
  source_domains: '["idrw.org"]',
  mention_count: 2,
  source_count: 1,
  confidence: 0.55,
  status: 'pending',
  first_seen_at: '2026-09-01T00:00:00.000Z',
  last_seen_at: '2026-09-02T00:00:00.000Z'
};

describe('handleListSupplierCandidates', () => {
  it('rejects an unauthenticated request without querying the database', async () => {
    const runQuery = vi.fn();
    const result = await handleListSupplierCandidates({ runQuery, verifyAuth: async () => false }, null, undefined);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unauthorized');
    expect(runQuery).not.toHaveBeenCalled();
  });

  it('returns pending candidates for an authenticated request', async () => {
    const runQuery = vi.fn().mockResolvedValue([PENDING_ROW]);
    const result = await handleListSupplierCandidates({ runQuery }, null, undefined, true);
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0]?.id).toBe('new_link:bel:tejas-mk2');
  });
});

describe('handleReviewSupplierCandidate', () => {
  function makeDeps(overrides: Partial<CuratorSupplierCandidateDependencies> = {}): CuratorSupplierCandidateDependencies {
    return {
      runQuery: vi.fn().mockResolvedValue([PENDING_ROW]),
      runMutation: vi.fn().mockResolvedValue(undefined),
      verifyAuth: async () => true,
      ...overrides
    };
  }

  it('rejects an unauthenticated review request', async () => {
    const deps = makeDeps({ verifyAuth: async () => false });
    const result = await handleReviewSupplierCandidate({ id: 'x', action: 'approve' }, null, deps, undefined);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unauthorized');
  });

  it('rejects an invalid action', async () => {
    const deps = makeDeps();
    const result = await handleReviewSupplierCandidate(
      { id: 'x', action: 'delete' as never },
      null,
      deps,
      undefined
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid request');
  });

  it('returns an error when the candidate is not pending (already reviewed or unknown)', async () => {
    const runQuery = vi.fn().mockResolvedValue([]);
    const deps = makeDeps({ runQuery });
    const result = await handleReviewSupplierCandidate({ id: 'nope', action: 'approve' }, null, deps, undefined);
    expect(result.success).toBe(false);
    expect(result.error).toContain('No pending candidate');
  });

  it('rejects promotion when the supplier no longer exists in the live suppliers table', async () => {
    const runQuery = vi
      .fn()
      .mockResolvedValueOnce([PENDING_ROW]) // candidate lookup
      .mockResolvedValueOnce([]); // suppliers lookup — empty
    const deps = makeDeps({ runQuery });
    const result = await handleReviewSupplierCandidate({ id: PENDING_ROW.id, action: 'approve' }, null, deps, undefined);
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('approves a candidate: inserts into program_suppliers and marks the candidate approved', async () => {
    const runQuery = vi
      .fn()
      .mockResolvedValueOnce([PENDING_ROW]) // candidate lookup
      .mockResolvedValueOnce([{ tier: 'dpsu' }]); // suppliers lookup
    const runMutation = vi.fn().mockResolvedValue(undefined);
    const deps = makeDeps({ runQuery, runMutation });

    const result = await handleReviewSupplierCandidate(
      { id: PENDING_ROW.id, action: 'approve' },
      null,
      deps,
      undefined,
      'reviewer@defencewire.in'
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: PENDING_ROW.id, status: 'approved' });
    expect(runMutation).toHaveBeenCalledTimes(2);
    expect(runMutation.mock.calls[0]![0]).toContain('INSERT INTO program_suppliers');
    expect(runMutation.mock.calls[1]![0]).toContain('UPDATE supplier_candidates');
  });

  it('rejects a candidate without touching program_suppliers', async () => {
    const runQuery = vi.fn().mockResolvedValueOnce([PENDING_ROW]);
    const runMutation = vi.fn().mockResolvedValue(undefined);
    const deps = makeDeps({ runQuery, runMutation });

    const result = await handleReviewSupplierCandidate({ id: PENDING_ROW.id, action: 'reject' }, null, deps, undefined);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: PENDING_ROW.id, status: 'rejected' });
    expect(runMutation).toHaveBeenCalledTimes(1);
    expect(runMutation.mock.calls[0]![0]).toContain('UPDATE supplier_candidates');
  });
});
