/**
 * Unit Tests for TendersViewModel (MOAT3 Phase 5)
 * Filter/subscribe/pagination logic against an injected search function —
 * no real fetch or DOM. Mirrors ArchiveViewModel's test shape.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import { TendersViewModel } from '../../src/viewmodels/TendersViewModel.js';
import { Tender } from '../../src/types/tenders.js';

function makeTender(id: string, overrides: Partial<Tender> = {}): Tender {
  return {
    id, source: 'defproc', title: `Tender ${id}`, organisationChain: 'Indian Army',
    referenceNumber: null, category: 'Goods', domain: 'Army', publishedAt: '2026-08-01',
    closingAt: '2026-09-15T17:00:00', emdAmount: null, iddmPercent: null, programIds: [],
    detailUrl: `https://defproc.gov.in/tender/${id}`, pdfR2Key: null, status: 'active',
    firstSeenAt: '2026-08-01', lastSeenAt: '2026-08-01',
    ...overrides
  };
}

describe('TendersViewModel — filters', () => {
  it('defaults to the mod source scope and active status', () => {
    const vm = new TendersViewModel(vi.fn());
    expect(vm.getSourceScope()).toBe('mod');
    expect(vm.getStatus()).toBe('active');
  });

  it('notifies listeners and re-runs the search when a filter changes', async () => {
    const searchFn = vi.fn().mockResolvedValue({ tenders: [], nextCursor: null });
    const vm = new TendersViewModel(searchFn);
    const listener = vi.fn();
    vm.subscribe(listener);

    vm.setStatus('closed');
    expect(listener).toHaveBeenCalled();
    await Promise.resolve();
    await Promise.resolve();

    expect(searchFn).toHaveBeenCalledWith(expect.objectContaining({ status: 'closed' }), null);
  });

  it('does not notify or re-search when setting the same filter value', () => {
    const searchFn = vi.fn().mockResolvedValue({ tenders: [], nextCursor: null });
    const vm = new TendersViewModel(searchFn);
    vm.setSourceScope('mod');
    const listener = vi.fn();
    vm.subscribe(listener);

    vm.setSourceScope('mod');
    expect(listener).not.toHaveBeenCalled();
  });

  it('setSourceScope("idex") switches scope so iDEX/TDF listings can be shown as a tab, not a separate view', async () => {
    const searchFn = vi.fn().mockResolvedValue({ tenders: [], nextCursor: null });
    const vm = new TendersViewModel(searchFn);

    vm.setSourceScope('idex');
    await Promise.resolve();
    await Promise.resolve();

    expect(vm.getSourceScope()).toBe('idex');
    expect(searchFn).toHaveBeenCalledWith(expect.objectContaining({ sourceScope: 'idex' }), null);
  });
});

describe('TendersViewModel — results & pagination', () => {
  it('populates results after ensureLoaded triggers the initial search', async () => {
    const tender = makeTender('t1');
    const searchFn = vi.fn().mockResolvedValue({ tenders: [tender], nextCursor: 'cur1' });
    const vm = new TendersViewModel(searchFn);

    vm.ensureLoaded();
    await Promise.resolve();
    await Promise.resolve();

    expect(vm.getResults()).toEqual([tender]);
    expect(vm.hasMore()).toBe(true);
  });

  it('ensureLoaded is a no-op after the first call', () => {
    const searchFn = vi.fn().mockResolvedValue({ tenders: [], nextCursor: null });
    const vm = new TendersViewModel(searchFn);

    vm.ensureLoaded();
    vm.ensureLoaded();

    expect(searchFn).toHaveBeenCalledTimes(1);
  });

  it('loadMore appends results and advances the cursor', async () => {
    const searchFn = vi
      .fn()
      .mockResolvedValueOnce({ tenders: [makeTender('a')], nextCursor: 'cur1' })
      .mockResolvedValueOnce({ tenders: [makeTender('b')], nextCursor: null });
    const vm = new TendersViewModel(searchFn);

    vm.ensureLoaded();
    await Promise.resolve();
    await Promise.resolve();

    await vm.loadMore();

    expect(vm.getResults().map((t) => t.id)).toEqual(['a', 'b']);
    expect(vm.hasMore()).toBe(false);
    expect(searchFn).toHaveBeenLastCalledWith(expect.anything(), 'cur1');
  });

  it('loadMore is a no-op when there is no next cursor', async () => {
    const searchFn = vi.fn().mockResolvedValue({ tenders: [], nextCursor: null });
    const vm = new TendersViewModel(searchFn);
    vm.ensureLoaded();
    await Promise.resolve();
    await Promise.resolve();

    await vm.loadMore();
    expect(searchFn).toHaveBeenCalledTimes(1);
  });

  it('surfaces the search error message', async () => {
    const searchFn = vi.fn().mockResolvedValue({ tenders: [], nextCursor: null, error: 'boom' });
    const vm = new TendersViewModel(searchFn);
    vm.ensureLoaded();
    await Promise.resolve();
    await Promise.resolve();

    expect(vm.getErrorMessage()).toBe('boom');
  });
});

describe('TendersViewModel — selected tender', () => {
  it('selects and clears a tender for the detail modal, notifying listeners', () => {
    const vm = new TendersViewModel(vi.fn());
    const listener = vi.fn();
    vm.subscribe(listener);
    const tender = makeTender('t1');

    vm.setSelectedTender(tender);
    expect(vm.getSelectedTender()).toEqual(tender);
    expect(listener).toHaveBeenCalledTimes(1);

    vm.setSelectedTender(null);
    expect(vm.getSelectedTender()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('finds a currently-loaded tender by id (for #tender/<id> deep links)', async () => {
    const tender = makeTender('t1');
    const searchFn = vi.fn().mockResolvedValue({ tenders: [tender], nextCursor: null });
    const vm = new TendersViewModel(searchFn);
    vm.ensureLoaded();
    await Promise.resolve();
    await Promise.resolve();

    expect(vm.findLoadedTenderById('t1')).toEqual(tender);
    expect(vm.findLoadedTenderById('missing')).toBeNull();
  });

  it('resolves a loaded tender without calling the by-id network fallback', async () => {
    const tender = makeTender('t1');
    const searchFn = vi.fn().mockResolvedValue({ tenders: [tender], nextCursor: null });
    const byIdFn = vi.fn();
    const vm = new TendersViewModel(searchFn, byIdFn);
    vm.ensureLoaded();
    await Promise.resolve();
    await Promise.resolve();

    await expect(vm.resolveTenderById('t1')).resolves.toEqual(tender);
    expect(byIdFn).not.toHaveBeenCalled();
  });

  it('falls back to the by-id network call for a cold deep link not on the loaded page', async () => {
    const searchFn = vi.fn().mockResolvedValue({ tenders: [], nextCursor: null });
    const remoteTender = makeTender('t2');
    const byIdFn = vi.fn().mockResolvedValue(remoteTender);
    const vm = new TendersViewModel(searchFn, byIdFn);
    vm.ensureLoaded();
    await Promise.resolve();
    await Promise.resolve();

    await expect(vm.resolveTenderById('t2')).resolves.toEqual(remoteTender);
    expect(byIdFn).toHaveBeenCalledWith('t2');
  });
});
