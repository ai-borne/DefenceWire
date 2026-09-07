/**
 * Unit Tests for ThreadExplorerView Component (Phase 4)
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import { renderThreadExplorerView } from '../../src/components/threads/ThreadExplorerView.js';
import { ThreadExplorerViewModel } from '../../src/viewmodels/ThreadExplorerViewModel.js';
import { StoryThread, StoryThreadEvent } from '../../src/types/threads.js';
import threadStrings from '../../src/resources/threadStrings.js';

const MOCK_THREADS: StoryThread[] = [
  {
    id: 'amca-stealth-arc',
    title: 'Advanced Medium Combat Aircraft (AMCA) 5th Gen Program',
    canonicalEntity: 'AMCA',
    category: 'tech',
    status: 'active',
    eventCount: 2,
    firstEventAt: '2026-01-01T00:00:00Z',
    lastEventAt: '2026-02-01T00:00:00Z',
    summary: 'CCS approval and prototype rollout tracking for India fifth generation fighter.',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z'
  }
];

const MOCK_EVENTS: StoryThreadEvent[] = [
  {
    id: 'evt-amca-1',
    threadId: 'amca-stealth-arc',
    clusterId: 'cluster-amca-1',
    sequenceCode: 'x1.1.1',
    sequenceIndex: 1,
    headline: 'Cabinet Committee on Security Clears ₹15,000 Cr for AMCA Prototypes',
    deltaSummary: 'Sanctioned 5 prototypes with first rollout targeted in 3.5 years.',
    primarySourceName: 'PIB MoD',
    primarySourceUrl: 'https://pib.gov.in/amca-ccs',
    publishedAt: '2026-01-01T00:00:00Z',
    entities: ['CCS', 'AMCA', 'DRDO', 'ADA'],
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'evt-amca-2',
    threadId: 'amca-stealth-arc',
    clusterId: 'cluster-amca-2',
    sequenceCode: 'x1.1.2',
    sequenceIndex: 2,
    headline: 'DRDO Signs Critical Aero-Structure Fabrication Work-Orders for AMCA',
    deltaSummary: 'Titanium bulkhead casting tenders finalized with private Indian industry.',
    primarySourceName: 'Livefist',
    primarySourceUrl: 'https://livefistdefence.com/amca-fab',
    publishedAt: '2026-02-01T00:00:00Z',
    entities: ['DRDO', 'AMCA', 'ADA'],
    createdAt: '2026-02-01T00:00:00Z'
  }
];

describe('ThreadExplorerView Component', () => {
  it('should render header with badge, title and subtitle', () => {
    const vm = new ThreadExplorerViewModel({
      fetchThreadsList: vi.fn().mockResolvedValue({ threads: [], nextCursor: null }),
      fetchThreadDetail: vi.fn().mockResolvedValue({ thread: null, events: [] })
    });

    const view = renderThreadExplorerView(vm);

    const title = view.querySelector('.dw-thread-title');
    expect(title?.textContent).toContain(threadStrings.tabTitle);

    const subtitle = view.querySelector('.dw-thread-subtitle');
    expect(subtitle?.textContent).toBe(threadStrings.tabSubtitle);
  });

  it('should render status filter buttons and update viewModel on click', () => {
    const vm = new ThreadExplorerViewModel({
      fetchThreadsList: vi.fn().mockResolvedValue({ threads: [], nextCursor: null }),
      fetchThreadDetail: vi.fn().mockResolvedValue({ thread: null, events: [] })
    });

    const view = renderThreadExplorerView(vm);
    const tabs = view.querySelectorAll<HTMLButtonElement>('.dw-thread-tab');
    expect(tabs.length).toBe(4);

    const activeTab = Array.from(tabs).find((t) => t.textContent === threadStrings.statusActive);
    expect(activeTab).toBeDefined();

    activeTab?.click();
    expect(vm.getStatusFilter()).toBe('active');
  });

  it('should render search input and forward search query to viewModel', () => {
    const vm = new ThreadExplorerViewModel({
      fetchThreadsList: vi.fn().mockResolvedValue({ threads: [], nextCursor: null }),
      fetchThreadDetail: vi.fn().mockResolvedValue({ thread: null, events: [] })
    });

    const view = renderThreadExplorerView(vm);
    const searchInput = view.querySelector<HTMLInputElement>('.dw-thread-search');
    expect(searchInput).not.toBeNull();

    if (searchInput) {
      searchInput.value = 'AMCA';
      searchInput.dispatchEvent(new Event('input'));
    }

    expect(vm.getSearchQuery()).toBe('amca');
  });

  it('should render master threads list and trigger selection on item click', async () => {
    const vm = new ThreadExplorerViewModel({
      fetchThreadsList: vi.fn().mockResolvedValue({ threads: MOCK_THREADS, nextCursor: null }),
      fetchThreadDetail: vi.fn().mockResolvedValue({ thread: MOCK_THREADS[0], events: MOCK_EVENTS })
    });

    const view = renderThreadExplorerView(vm);
    await vm.loadThreads();

    const items = view.querySelectorAll('.dw-thread-item');
    expect(items.length).toBe(1);

    const title = items[0]?.querySelector('.dw-thread-item-title');
    expect(title?.textContent).toBe(MOCK_THREADS[0]?.title);

    const entityBadge = items[0]?.querySelector('.dw-thread-entity-badge');
    expect(entityBadge?.textContent).toBe('AMCA');

    const statusBadge = items[0]?.querySelector('.dw-thread-status-badge');
    expect(statusBadge?.textContent).toBe('ACTIVE');

    const selectSpy = vi.spyOn(vm, 'selectThread');
    (items[0] as HTMLElement).click();
    expect(selectSpy).toHaveBeenCalledWith('amca-stealth-arc');
  });

  it('should render chronological timeline branch and event cards when a thread is selected', async () => {
    const vm = new ThreadExplorerViewModel({
      fetchThreadsList: vi.fn().mockResolvedValue({ threads: MOCK_THREADS, nextCursor: null }),
      fetchThreadDetail: vi.fn().mockResolvedValue({ thread: MOCK_THREADS[0], events: MOCK_EVENTS })
    });

    const view = renderThreadExplorerView(vm);
    await vm.loadThreads();
    await vm.selectThread('amca-stealth-arc');

    const timelineBranch = view.querySelector('.dw-timeline-branch');
    expect(timelineBranch).not.toBeNull();

    const cards = view.querySelectorAll('.dw-timeline-card');
    expect(cards.length).toBe(2);

    expect(cards[0]?.getAttribute('data-sequence-code')).toBe('x1.1.1');
    expect(cards[1]?.getAttribute('data-sequence-code')).toBe('x1.1.2');
    expect(cards[1]?.classList.contains('is-latest')).toBe(true);
  });

  it('should invoke __cleanup and unsubscribe on removal', () => {
    const vm = new ThreadExplorerViewModel({
      fetchThreadsList: vi.fn().mockResolvedValue({ threads: [], nextCursor: null }),
      fetchThreadDetail: vi.fn().mockResolvedValue({ thread: null, events: [] })
    });

    const view = renderThreadExplorerView(vm);
    const cleanup = (view as HTMLElement & { __cleanup?: () => void }).__cleanup;
    expect(typeof cleanup).toBe('function');

    const destroySpy = vi.spyOn(vm, 'destroy');
    cleanup?.();
    expect(destroySpy).toHaveBeenCalledTimes(1);
  });
});
