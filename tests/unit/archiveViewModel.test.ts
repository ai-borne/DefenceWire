/**
 * Unit Tests for ArchiveViewModel
 * Covers search, the default cursor-paginated browse mode, loadMore, and
 * the deferred initial-load trigger used to avoid re-entrant rendering.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import { ArchiveViewModel } from '../../src/viewmodels/ArchiveViewModel.js';
import { StoryCluster } from '../../src/types/news.js';

const storyA = { id: 'cluster-a' } as StoryCluster;
const storyB = { id: 'cluster-b' } as StoryCluster;

describe('ArchiveViewModel — search', () => {
  it('starts idle with an empty query and no results', () => {
    const vm = new ArchiveViewModel(vi.fn());
    expect(vm.getSearchQuery()).toBe('');
    expect(vm.getResults()).toEqual([]);
    expect(vm.isLoading()).toBe(false);
    expect(vm.getErrorMessage()).toBeNull();
    expect(vm.hasMore()).toBe(false);
  });

  it('sets loading true while a search is in flight and false once it resolves', async () => {
    let resolveSearch!: (v: { stories: StoryCluster[]; nextCursor: string | null }) => void;
    const searchFn = vi.fn(() => new Promise<{ stories: StoryCluster[]; nextCursor: string | null }>((resolve) => (resolveSearch = resolve)));
    const vm = new ArchiveViewModel(searchFn);

    const pending = vm.search('Tejas');
    expect(vm.isLoading()).toBe(true);

    resolveSearch({ stories: [storyA], nextCursor: null });
    await pending;

    expect(vm.isLoading()).toBe(false);
    expect(vm.getResults()).toEqual([storyA]);
    expect(vm.getSearchQuery()).toBe('Tejas');
  });

  it('surfaces an error message and clears results when the search fails', async () => {
    const searchFn = vi.fn().mockResolvedValue({ stories: [], nextCursor: null, error: 'Archive search is temporarily unavailable.' });
    const vm = new ArchiveViewModel(searchFn);

    await vm.search('Tejas');

    expect(vm.getErrorMessage()).toBe('Archive search is temporarily unavailable.');
    expect(vm.getResults()).toEqual([]);
  });

  it('a new search resets pagination and replaces results rather than appending', async () => {
    const searchFn = vi.fn().mockResolvedValue({ stories: [storyA], nextCursor: 'cursor-1' });
    const vm = new ArchiveViewModel(searchFn);

    await vm.search('Tejas');
    expect(vm.getResults()).toEqual([storyA]);

    searchFn.mockResolvedValue({ stories: [storyB], nextCursor: null });
    await vm.search('BrahMos');
    expect(vm.getResults()).toEqual([storyB]);
    expect(vm.hasMore()).toBe(false);
  });

  it('notifies subscribers on state changes', async () => {
    const searchFn = vi.fn().mockResolvedValue({ stories: [storyA], nextCursor: null });
    const vm = new ArchiveViewModel(searchFn);
    const listener = vi.fn();
    vm.subscribe(listener);

    await vm.search('Tejas');

    expect(listener).toHaveBeenCalled();
  });

  it('unsubscribe stops further notifications', async () => {
    const searchFn = vi.fn().mockResolvedValue({ stories: [], nextCursor: null });
    const vm = new ArchiveViewModel(searchFn);
    const listener = vi.fn();
    const unsubscribe = vm.subscribe(listener);
    unsubscribe();

    await vm.search('Tejas');

    expect(listener).not.toHaveBeenCalled();
  });
});

describe('ArchiveViewModel — browse mode is just search with a blank query', () => {
  it('a blank query still calls the search function (browse mode), unlike the old skip-when-blank behavior', async () => {
    const searchFn = vi.fn().mockResolvedValue({ stories: [storyA], nextCursor: null });
    const vm = new ArchiveViewModel(searchFn);

    await vm.search('');

    expect(searchFn).toHaveBeenCalledWith('');
    expect(vm.getResults()).toEqual([storyA]);
  });
});

describe('ArchiveViewModel — loadMore', () => {
  it('appends the next page to existing results using the stored cursor', async () => {
    const searchFn = vi.fn().mockResolvedValue({ stories: [storyA], nextCursor: 'cursor-1' });
    const vm = new ArchiveViewModel(searchFn);
    await vm.search('Tejas');

    searchFn.mockResolvedValue({ stories: [storyB], nextCursor: null });
    await vm.loadMore();

    expect(searchFn).toHaveBeenLastCalledWith('Tejas', 'cursor-1');
    expect(vm.getResults()).toEqual([storyA, storyB]);
    expect(vm.hasMore()).toBe(false);
  });

  it('does nothing when there is no next page', async () => {
    const searchFn = vi.fn().mockResolvedValue({ stories: [storyA], nextCursor: null });
    const vm = new ArchiveViewModel(searchFn);
    await vm.search('Tejas');

    await vm.loadMore();

    expect(searchFn).toHaveBeenCalledTimes(1);
  });

  it('does nothing while a load is already in flight', async () => {
    const searchFn = vi.fn().mockResolvedValue({ stories: [storyA], nextCursor: 'cursor-1' });
    const vm = new ArchiveViewModel(searchFn);
    await vm.search('Tejas');

    let resolveMore!: (v: { stories: StoryCluster[]; nextCursor: string | null }) => void;
    searchFn.mockReturnValue(new Promise((resolve) => (resolveMore = resolve)));

    const firstLoad = vm.loadMore();
    const secondLoad = vm.loadMore();
    resolveMore({ stories: [storyB], nextCursor: null });
    await Promise.all([firstLoad, secondLoad]);

    expect(searchFn).toHaveBeenCalledTimes(2);
  });
});

describe('ArchiveViewModel — deferred initial browse load', () => {
  it('ensureBrowseLoaded triggers exactly one search, deferred out of the current call stack', async () => {
    const searchFn = vi.fn().mockResolvedValue({ stories: [storyA], nextCursor: null });
    const vm = new ArchiveViewModel(searchFn);

    vm.ensureBrowseLoaded();
    vm.ensureBrowseLoaded();
    vm.ensureBrowseLoaded();

    expect(searchFn).not.toHaveBeenCalled();

    await Promise.resolve();
    await Promise.resolve();

    expect(searchFn).toHaveBeenCalledTimes(1);
    expect(searchFn).toHaveBeenCalledWith('');
  });

  it('does not trigger again once a search has already happened', async () => {
    const searchFn = vi.fn().mockResolvedValue({ stories: [], nextCursor: null });
    const vm = new ArchiveViewModel(searchFn);

    await vm.search('Tejas');
    vm.ensureBrowseLoaded();
    await Promise.resolve();

    expect(searchFn).toHaveBeenCalledTimes(1);
  });
});
