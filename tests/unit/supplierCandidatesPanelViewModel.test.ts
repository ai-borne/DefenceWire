/**
 * Unit Tests for SupplierCandidatesPanelViewModel (Phase 2.7)
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it, vi } from 'vitest';
import { SupplierCandidatesPanelViewModel } from '../../src/viewmodels/SupplierCandidatesPanelViewModel.js';
import { CuratorSupplierCandidateSyncService } from '../../src/services/curatorSupplierCandidateSyncService.js';
import { SupplierCandidateRow } from '../../src/services/curatorSupplierCandidateHandler.js';

const ROW: SupplierCandidateRow = {
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

function makeSyncServiceMock(overrides: Partial<CuratorSupplierCandidateSyncService> = {}) {
  return {
    fetchPendingCandidates: vi.fn().mockResolvedValue({ candidates: [ROW] }),
    reviewCandidate: vi.fn().mockResolvedValue({ success: true }),
    ...overrides
  } as unknown as CuratorSupplierCandidateSyncService;
}

describe('SupplierCandidatesPanelViewModel', () => {
  it('loads pending candidates and notifies listeners', async () => {
    const sync = makeSyncServiceMock();
    const vm = new SupplierCandidatesPanelViewModel(sync);
    const listener = vi.fn();
    vm.subscribe(listener);

    await vm.load();

    expect(vm.getCandidates()).toEqual([ROW]);
    expect(vm.hasLoadedOnce()).toBe(true);
    expect(vm.getIsLoading()).toBe(false);
    expect(listener).toHaveBeenCalled();
  });

  it('surfaces a load error without throwing', async () => {
    const sync = makeSyncServiceMock({
      fetchPendingCandidates: vi.fn().mockResolvedValue({ candidates: [], error: 'network down' })
    });
    const vm = new SupplierCandidatesPanelViewModel(sync);

    await vm.load();

    expect(vm.getCandidates()).toEqual([]);
    expect(vm.getError()).toBe('network down');
  });

  it('removes a candidate from the list on successful approve/reject', async () => {
    const sync = makeSyncServiceMock();
    const vm = new SupplierCandidatesPanelViewModel(sync);
    await vm.load();
    expect(vm.getCandidates()).toHaveLength(1);

    await vm.review(ROW.id, 'approve');

    expect(sync.reviewCandidate).toHaveBeenCalledWith(ROW.id, 'approve');
    expect(vm.getCandidates()).toHaveLength(0);
    expect(vm.getReviewingId()).toBeNull();
  });

  it('keeps a candidate in the list and surfaces an error when review fails', async () => {
    const sync = makeSyncServiceMock({
      reviewCandidate: vi.fn().mockResolvedValue({ success: false, error: 'D1 write failed' })
    });
    const vm = new SupplierCandidatesPanelViewModel(sync);
    await vm.load();

    await vm.review(ROW.id, 'reject');

    expect(vm.getCandidates()).toHaveLength(1);
    expect(vm.getError()).toBe('D1 write failed');
  });

  it('ignores a second review call while one is already in flight', async () => {
    let resolveFirst: (v: { success: boolean }) => void = () => {};
    const firstCall = new Promise<{ success: boolean }>((res) => {
      resolveFirst = res;
    });
    const reviewCandidate = vi.fn().mockReturnValueOnce(firstCall).mockResolvedValue({ success: true });
    const sync = makeSyncServiceMock({ reviewCandidate });
    const vm = new SupplierCandidatesPanelViewModel(sync);
    await vm.load();

    const p1 = vm.review(ROW.id, 'approve');
    const p2 = vm.review(ROW.id, 'reject');
    resolveFirst({ success: true });
    await Promise.all([p1, p2]);

    expect(reviewCandidate).toHaveBeenCalledTimes(1);
  });
});
