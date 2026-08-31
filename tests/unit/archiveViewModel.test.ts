/**
 * Unit Tests for ArchiveViewModel
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import { ArchiveViewModel } from '../../src/viewmodels/ArchiveViewModel.js';
import { StoryCluster } from '../../src/types/news.js';

const mockStory = { id: 'cluster-a' } as StoryCluster;

describe('ArchiveViewModel', () => {
  it('starts idle with an empty query and no results', () => {
    const vm = new ArchiveViewModel(vi.fn());
    expect(vm.getSearchQuery()).toBe('');
    expect(vm.getResults()).toEqual([]);
    expect(vm.isLoading()).toBe(false);
    expect(vm.getErrorMessage()).toBeNull();
  });

  it('sets loading true while a search is in flight and false once it resolves', async () => {
    let resolveSearch!: (v: { stories: StoryCluster[] }) => void;
    const searchFn = vi.fn(() => new Promise<{ stories: StoryCluster[] }>((resolve) => (resolveSearch = resolve)));
    const vm = new ArchiveViewModel(searchFn);

    const pending = vm.search('Tejas');
    expect(vm.isLoading()).toBe(true);

    resolveSearch({ stories: [mockStory] });
    await pending;

    expect(vm.isLoading()).toBe(false);
    expect(vm.getResults()).toEqual([mockStory]);
    expect(vm.getSearchQuery()).toBe('Tejas');
  });

  it('surfaces an error message and clears results when the search fails', async () => {
    const searchFn = vi.fn().mockResolvedValue({ stories: [], error: 'Archive search is temporarily unavailable.' });
    const vm = new ArchiveViewModel(searchFn);

    await vm.search('Tejas');

    expect(vm.getErrorMessage()).toBe('Archive search is temporarily unavailable.');
    expect(vm.getResults()).toEqual([]);
  });

  it('does not call the search function for a blank query', async () => {
    const searchFn = vi.fn();
    const vm = new ArchiveViewModel(searchFn);

    await vm.search('   ');

    expect(searchFn).not.toHaveBeenCalled();
    expect(vm.getResults()).toEqual([]);
  });

  it('notifies subscribers on state changes', async () => {
    const searchFn = vi.fn().mockResolvedValue({ stories: [mockStory] });
    const vm = new ArchiveViewModel(searchFn);
    const listener = vi.fn();
    vm.subscribe(listener);

    await vm.search('Tejas');

    expect(listener).toHaveBeenCalled();
  });

  it('unsubscribe stops further notifications', async () => {
    const searchFn = vi.fn().mockResolvedValue({ stories: [] });
    const vm = new ArchiveViewModel(searchFn);
    const listener = vi.fn();
    const unsubscribe = vm.subscribe(listener);
    unsubscribe();

    await vm.search('Tejas');

    expect(listener).not.toHaveBeenCalled();
  });
});
