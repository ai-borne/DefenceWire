/**
 * Unit Tests for NewsViewModel and ThemeViewModel
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import { NewsViewModel } from '../../src/viewmodels/NewsViewModel.js';
import { ThemeViewModel } from '../../src/viewmodels/ThemeViewModel.js';
import { INITIAL_STORY_CLUSTERS } from '../../src/data/initialNews.js';
import { INITIAL_RIVER_ITEMS } from '../../src/data/riverNews.js';

describe('ThemeViewModel', () => {
  it('should initialize with provided or default theme mode', () => {
    const vm = new ThemeViewModel('dark');
    expect(vm.getTheme()).toBe('dark');
    expect(vm.getEffectiveTheme()).toBe('dark');
  });

  it('should update theme and notify subscribers', () => {
    const vm = new ThemeViewModel('light');
    const subscriber = vi.fn();
    const unsubscribe = vm.subscribe(subscriber);

    vm.setTheme('dark');
    expect(vm.getTheme()).toBe('dark');
    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(subscriber).toHaveBeenCalledWith('dark', 'dark');

    unsubscribe();
    vm.setTheme('system');
    expect(subscriber).toHaveBeenCalledTimes(1);
  });

  it('should cycle through themes with toggleTheme', () => {
    const vm = new ThemeViewModel('light');
    vm.toggleTheme();
    expect(vm.getTheme()).toBe('dark');

    vm.toggleTheme();
    expect(vm.getTheme()).toBe('system');

    vm.toggleTheme();
    expect(vm.getTheme()).toBe('light');
  });
});

describe('NewsViewModel', () => {
  it('should load initial clusters and river items correctly', () => {
    const vm = new NewsViewModel(INITIAL_STORY_CLUSTERS, INITIAL_RIVER_ITEMS);
    const { leadStory, regularClusters, totalMatchingStories } = vm.getFilteredClusters();

    expect(totalMatchingStories).toBe(INITIAL_STORY_CLUSTERS.length);
    expect(leadStory).not.toBeNull();
    expect(regularClusters.length).toBe(INITIAL_STORY_CLUSTERS.length - 1);
  });

  it('should filter clusters by domain category', () => {
    const vm = new NewsViewModel(INITIAL_STORY_CLUSTERS, INITIAL_RIVER_ITEMS);

    vm.setActiveCategory('navy');
    expect(vm.getActiveCategory()).toBe('navy');

    const result = vm.getFilteredClusters();
    expect(result.totalMatchingStories).toBeGreaterThan(0);
    expect(result.leadStory?.categories).toContain('navy');

    for (const cluster of result.regularClusters) {
      expect(cluster.categories).toContain('navy');
    }
  });

  it('should filter clusters by search query across headlines and entities', () => {
    const vm = new NewsViewModel(INITIAL_STORY_CLUSTERS, INITIAL_RIVER_ITEMS);

    vm.setSearchQuery('Tejas');
    expect(vm.getSearchQuery()).toBe('Tejas');

    const result = vm.getFilteredClusters();
    expect(result.totalMatchingStories).toBeGreaterThan(0);

    const hasTejas = (result.leadStory?.synthesizedHeadline.includes('Tejas') ||
      result.leadStory?.entities.includes('Tejas Mk1A'));
    expect(hasTejas).toBe(true);
  });

  it('should return empty results gracefully for non-matching queries', () => {
    const vm = new NewsViewModel(INITIAL_STORY_CLUSTERS, INITIAL_RIVER_ITEMS);

    vm.setSearchQuery('NonExistentKeywordXYZ999');
    const result = vm.getFilteredClusters();

    expect(result.totalMatchingStories).toBe(0);
    expect(result.leadStory).toBeNull();
    expect(result.regularClusters).toEqual([]);
  });

  it('should manage SSB drawer expansion state toggle correctly', () => {
    const vm = new NewsViewModel(INITIAL_STORY_CLUSTERS, INITIAL_RIVER_ITEMS);
    const testId = INITIAL_STORY_CLUSTERS[0]!.id;

    expect(vm.isSSBExpanded(testId)).toBe(false);

    vm.toggleSSBDrawer(testId);
    expect(vm.isSSBExpanded(testId)).toBe(true);

    vm.toggleSSBDrawer(testId);
    expect(vm.isSSBExpanded(testId)).toBe(false);
  });

  it('should filter river items by search query', () => {
    const vm = new NewsViewModel(INITIAL_STORY_CLUSTERS, INITIAL_RIVER_ITEMS);

    expect(vm.getFilteredRiverItems().length).toBe(INITIAL_RIVER_ITEMS.length);

    vm.setSearchQuery('amphibious');
    const filteredRiver = vm.getFilteredRiverItems();
    expect(filteredRiver.length).toBeGreaterThan(0);
    expect(filteredRiver[0]!.title.toLowerCase()).toContain('amphibious');
  });

  it('should trigger state listeners when category or search changes', () => {
    const vm = new NewsViewModel(INITIAL_STORY_CLUSTERS, INITIAL_RIVER_ITEMS);
    const listener = vi.fn();
    const unsubscribe = vm.subscribe(listener);

    vm.setActiveCategory('airforce');
    expect(listener).toHaveBeenCalledTimes(1);

    vm.setSearchQuery('Rafale');
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    vm.setActiveCategory('all');
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
