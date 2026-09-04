/**
 * Unit Tests for NewsViewModel Sources Drawer Reactive State
 * Validates independent drawer tracking, toggling, notifications, and defensive immutability.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import { NewsViewModel } from '../../src/viewmodels/NewsViewModel.js';
import { INITIAL_STORY_CLUSTERS } from '../../src/data/initialNews.js';
import { INITIAL_RIVER_ITEMS } from '../../src/data/riverNews.js';

describe('NewsViewModel - Sources Drawer Reactive State', () => {
  it('initializes with no expanded sources drawers', () => {
    const vm = new NewsViewModel(INITIAL_STORY_CLUSTERS, INITIAL_RIVER_ITEMS);
    const testId = INITIAL_STORY_CLUSTERS[0]!.id;

    expect(vm.isSourcesExpanded(testId)).toBe(false);
    expect(vm.hasExpandedSourcesDrawers()).toBe(false);
    expect(vm.getExpandedSourcesClusterIds().size).toBe(0);
  });

  it('toggles sources drawer expansion state and notifies subscribers', () => {
    const vm = new NewsViewModel(INITIAL_STORY_CLUSTERS, INITIAL_RIVER_ITEMS);
    const testId = INITIAL_STORY_CLUSTERS[0]!.id;
    const listener = vi.fn();
    vm.subscribe(listener);

    vm.toggleSourcesDrawer(testId);
    expect(vm.isSourcesExpanded(testId)).toBe(true);
    expect(vm.hasExpandedSourcesDrawers()).toBe(true);
    expect(vm.getExpandedSourcesClusterIds().has(testId)).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);

    vm.toggleSourcesDrawer(testId);
    expect(vm.isSourcesExpanded(testId)).toBe(false);
    expect(vm.hasExpandedSourcesDrawers()).toBe(false);
    expect(vm.getExpandedSourcesClusterIds().size).toBe(0);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('supports setSourcesExpanded with and without listener notification', () => {
    const vm = new NewsViewModel(INITIAL_STORY_CLUSTERS, INITIAL_RIVER_ITEMS);
    const id1 = INITIAL_STORY_CLUSTERS[0]!.id;
    const id2 = INITIAL_STORY_CLUSTERS[1]!.id;
    const listener = vi.fn();
    vm.subscribe(listener);

    // Expand id1 silently (notify = false)
    vm.setSourcesExpanded(id1, true, false);
    expect(vm.isSourcesExpanded(id1)).toBe(true);
    expect(vm.hasExpandedSourcesDrawers()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(0);

    // Expand id2 with notification (notify = true)
    vm.setSourcesExpanded(id2, true, true);
    expect(vm.isSourcesExpanded(id2)).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);

    // Idempotent: setting same state does not trigger redundant notifications
    vm.setSourcesExpanded(id2, true, true);
    expect(listener).toHaveBeenCalledTimes(1);

    // Collapse id1 silently
    vm.setSourcesExpanded(id1, false, false);
    expect(vm.isSourcesExpanded(id1)).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('returns a defensive copy from getExpandedSourcesClusterIds', () => {
    const vm = new NewsViewModel(INITIAL_STORY_CLUSTERS, INITIAL_RIVER_ITEMS);
    const id = INITIAL_STORY_CLUSTERS[0]!.id;

    vm.setSourcesExpanded(id, true);
    const setCopy = vm.getExpandedSourcesClusterIds();
    expect(setCopy.has(id)).toBe(true);

    // Mutating the returned copy must not corrupt ViewModel state
    setCopy.delete(id);
    expect(vm.isSourcesExpanded(id)).toBe(true);
    expect(vm.getExpandedSourcesClusterIds().has(id)).toBe(true);
  });

  it('operates completely independently from SSB drawer state', () => {
    const vm = new NewsViewModel(INITIAL_STORY_CLUSTERS, INITIAL_RIVER_ITEMS);
    const id = INITIAL_STORY_CLUSTERS[0]!.id;

    // Expand sources drawer only
    vm.toggleSourcesDrawer(id);
    expect(vm.isSourcesExpanded(id)).toBe(true);
    expect(vm.isSSBExpanded(id)).toBe(false);

    // Expand SSB drawer
    vm.toggleSSBDrawer(id);
    expect(vm.isSourcesExpanded(id)).toBe(true);
    expect(vm.isSSBExpanded(id)).toBe(true);

    // Collapse sources drawer: SSB drawer remains expanded
    vm.toggleSourcesDrawer(id);
    expect(vm.isSourcesExpanded(id)).toBe(false);
    expect(vm.isSSBExpanded(id)).toBe(true);

    // Collapse SSB drawer
    vm.toggleSSBDrawer(id);
    expect(vm.isSourcesExpanded(id)).toBe(false);
    expect(vm.isSSBExpanded(id)).toBe(false);
  });
});
