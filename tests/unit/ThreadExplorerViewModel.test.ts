/**
 * Unit Tests for Story Thread Explorer ViewModel (Phase 4)
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import { ThreadExplorerViewModel } from '../../src/viewmodels/ThreadExplorerViewModel.js';
import { StoryThread, StoryThreadEvent } from '../../src/types/threads.js';

const MOCK_THREADS: StoryThread[] = [
  {
    id: 'lca-mk1a-arc',
    title: 'LCA Tejas Mk1A Delivery & Production Arc',
    canonicalEntity: 'LCA Tejas Mk1A',
    category: 'tech',
    status: 'active',
    eventCount: 3,
    firstEventAt: '2026-01-10T10:00:00Z',
    lastEventAt: '2026-02-15T12:00:00Z',
    summary: 'Multi-year procurement and delivery tracking for 83 LCA Tejas Mk1A jets.',
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-02-15T12:00:00Z'
  },
  {
    id: 'project-75i-rfp',
    title: 'Project 75I Submarine Acquisition',
    canonicalEntity: 'Project 75I',
    category: 'strategic',
    status: 'dormant',
    eventCount: 2,
    firstEventAt: '2025-06-01T08:00:00Z',
    lastEventAt: '2025-09-20T14:00:00Z',
    summary: 'Six advanced AIP submarines acquisition under Strategic Partnership model.',
    createdAt: '2025-06-01T08:00:00Z',
    updatedAt: '2025-09-20T14:00:00Z'
  }
];

const MOCK_EVENTS: StoryThreadEvent[] = [
  {
    id: 'evt-1',
    threadId: 'lca-mk1a-arc',
    clusterId: 'cluster-1',
    sequenceCode: 'x1.1.1',
    sequenceIndex: 1,
    headline: 'HAL Inaugurates Third LCA Production Line in Nashik',
    deltaSummary: 'Added capability to roll out 24 aircraft per year from earlier 16.',
    primarySourceName: 'Press Information Bureau',
    primarySourceUrl: 'https://pib.gov.in/press1',
    publishedAt: '2026-01-10T10:00:00Z',
    entities: ['HAL', 'LCA Tejas Mk1A', 'Nashik'],
    createdAt: '2026-01-10T10:00:00Z'
  },
  {
    id: 'evt-2',
    threadId: 'lca-mk1a-arc',
    clusterId: 'cluster-2',
    sequenceCode: 'x1.1.2',
    sequenceIndex: 2,
    headline: 'First Serial LCA Mk1A Completes Successful FCF Sortie',
    deltaSummary: 'Digital fly-by-wire and AESA radar integration cleared for delivery.',
    primarySourceName: 'The Hindu',
    primarySourceUrl: 'https://thehindu.com/lca',
    publishedAt: '2026-02-15T12:00:00Z',
    entities: ['IAF', 'LCA Tejas Mk1A', 'HAL'],
    createdAt: '2026-02-15T12:00:00Z'
  }
];

describe('ThreadExplorerViewModel', () => {
  it('should initialize with default states and empty lists', () => {
    const vm = new ThreadExplorerViewModel({
      fetchThreadsList: vi.fn().mockResolvedValue({ threads: [], nextCursor: null }),
      fetchThreadDetail: vi.fn().mockResolvedValue({ thread: null, events: [] })
    });

    expect(vm.getFilteredThreads()).toEqual([]);
    expect(vm.getSelectedThreadId()).toBeNull();
    expect(vm.getSelectedThread()).toBeNull();
    expect(vm.getEvents()).toEqual([]);
    expect(vm.getSearchQuery()).toBe('');
    expect(vm.getStatusFilter()).toBe('all');
    expect(vm.getCategoryFilter()).toBe('all');
    expect(vm.getIsLoadingThreads()).toBe(false);
  });

  it('should load threads and auto-select first thread', async () => {
    const fetchList = vi.fn().mockResolvedValue({ threads: MOCK_THREADS, nextCursor: 'cur-1' });
    const fetchDetail = vi.fn().mockResolvedValue({ thread: MOCK_THREADS[0], events: MOCK_EVENTS });

    const vm = new ThreadExplorerViewModel({
      fetchThreadsList: fetchList,
      fetchThreadDetail: fetchDetail
    });

    await vm.loadThreads();

    expect(fetchList).toHaveBeenCalledTimes(1);
    expect(vm.getFilteredThreads().length).toBe(2);
    expect(vm.getSelectedThreadId()).toBe('lca-mk1a-arc');
    expect(vm.getSelectedThread()?.title).toBe('LCA Tejas Mk1A Delivery & Production Arc');
    expect(vm.getEvents().length).toBe(2);
    expect(vm.hasMoreThreads()).toBe(true);
  });

  it('should filter threads by search query against title and canonical entity', async () => {
    const vm = new ThreadExplorerViewModel({
      fetchThreadsList: vi.fn().mockResolvedValue({ threads: MOCK_THREADS, nextCursor: null }),
      fetchThreadDetail: vi.fn().mockResolvedValue({ thread: MOCK_THREADS[0], events: [] })
    });

    await vm.loadThreads();

    vm.setSearchQuery('Submarine');
    expect(vm.getFilteredThreads().length).toBe(1);
    expect(vm.getFilteredThreads()[0]?.id).toBe('project-75i-rfp');

    vm.setSearchQuery('mk1a');
    expect(vm.getFilteredThreads().length).toBe(1);
    expect(vm.getFilteredThreads()[0]?.id).toBe('lca-mk1a-arc');

    vm.setSearchQuery('non-existent');
    expect(vm.getFilteredThreads().length).toBe(0);

    vm.setSearchQuery('');
    expect(vm.getFilteredThreads().length).toBe(2);
  });

  it('should change status filter and reload threads', async () => {
    const fetchList = vi.fn().mockResolvedValue({ threads: [MOCK_THREADS[1]], nextCursor: null });
    const vm = new ThreadExplorerViewModel({
      fetchThreadsList: fetchList,
      fetchThreadDetail: vi.fn().mockResolvedValue({ thread: null, events: [] })
    });

    vm.setStatusFilter('dormant');
    expect(vm.getStatusFilter()).toBe('dormant');
    expect(fetchList).toHaveBeenCalledWith(expect.objectContaining({ status: 'dormant' }));
  });

  it('should change category filter and reload threads', async () => {
    const fetchList = vi.fn().mockResolvedValue({ threads: [MOCK_THREADS[0]], nextCursor: null });
    const vm = new ThreadExplorerViewModel({
      fetchThreadsList: fetchList,
      fetchThreadDetail: vi.fn().mockResolvedValue({ thread: null, events: [] })
    });

    vm.setCategoryFilter('tech');
    expect(vm.getCategoryFilter()).toBe('tech');
    expect(fetchList).toHaveBeenCalledWith(expect.objectContaining({ category: 'tech' }));
  });

  it('should select thread and fetch its chronological events', async () => {
    const fetchDetail = vi.fn().mockResolvedValue({ thread: MOCK_THREADS[1], events: MOCK_EVENTS });
    const vm = new ThreadExplorerViewModel({
      fetchThreadsList: vi.fn().mockResolvedValue({ threads: MOCK_THREADS, nextCursor: null }),
      fetchThreadDetail: fetchDetail
    });

    await vm.loadThreads();
    await vm.selectThread('project-75i-rfp');

    expect(fetchDetail).toHaveBeenCalledWith('project-75i-rfp');
    expect(vm.getSelectedThreadId()).toBe('project-75i-rfp');
    expect(vm.getSelectedThread()?.canonicalEntity).toBe('Project 75I');
    expect(vm.getEvents().length).toBe(2);
  });

  it('should notify subscribers on state changes', async () => {
    const vm = new ThreadExplorerViewModel({
      fetchThreadsList: vi.fn().mockResolvedValue({ threads: MOCK_THREADS, nextCursor: null }),
      fetchThreadDetail: vi.fn().mockResolvedValue({ thread: MOCK_THREADS[0], events: [] })
    });

    const listener = vi.fn();
    const unsub = vm.subscribe(listener);

    vm.setSearchQuery('test');
    expect(listener).toHaveBeenCalled();

    unsub();
    const callCount = listener.mock.calls.length;
    vm.setSearchQuery('another');
    expect(listener.mock.calls.length).toBe(callCount);
  });

  it('should handle API errors gracefully', async () => {
    const vm = new ThreadExplorerViewModel({
      fetchThreadsList: vi.fn().mockRejectedValue(new Error('Network error')),
      fetchThreadDetail: vi.fn().mockResolvedValue({ thread: null, events: [] })
    });

    await vm.loadThreads();
    expect(vm.getErrorMessage()).toBe('Failed to load story threads.');
    expect(vm.getIsLoadingThreads()).toBe(false);
  });
});
