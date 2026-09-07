/**
 * Unit Tests for PublicPatternViewModel (Phase 5 Display UI)
 * Tests carousel state, pagination wrapping, drawer expansion, and dismiss logic.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import { PublicPatternViewModel } from '../../src/viewmodels/PublicPatternViewModel.js';
import { EmergentPattern } from '../../src/types/patterns.js';

describe('PublicPatternViewModel', () => {
  const pattern1: EmergentPattern = {
    id: 'pat_1',
    title: 'Pattern 1',
    synthesis: 'Synthesis 1',
    confidence: 0.8,
    nodeIds: ['n1'],
    clusterIds: ['c1'],
    status: 'approved',
    createdAt: '2026-09-01T00:00:00Z'
  };

  const pattern2: EmergentPattern = {
    id: 'pat_2',
    title: 'Pattern 2',
    synthesis: 'Synthesis 2',
    confidence: 0.9,
    nodeIds: ['n2'],
    clusterIds: ['c2'],
    status: 'approved',
    createdAt: '2026-09-02T00:00:00Z'
  };

  it('initializes with default state', () => {
    const vm = new PublicPatternViewModel(async () => []);
    expect(vm.getPatterns()).toEqual([]);
    expect(vm.getTotalPatterns()).toBe(0);
    expect(vm.getActiveIndex()).toBe(0);
    expect(vm.getActivePattern()).toBeNull();
    expect(vm.getIsExpanded()).toBe(false);
    expect(vm.getIsDismissed()).toBe(false);
    expect(vm.getIsLoading()).toBe(false);
  });

  it('loads patterns via injected service and notifies listeners', async () => {
    const mockFetch = vi.fn().mockResolvedValue([pattern1, pattern2]);
    const vm = new PublicPatternViewModel(mockFetch);

    const listener = vi.fn();
    vm.subscribe(listener);

    await vm.loadPatterns();

    expect(mockFetch).toHaveBeenCalledWith({ forceRefresh: false, limit: 10 });
    expect(vm.getTotalPatterns()).toBe(2);
    expect(vm.getActivePattern()?.id).toBe('pat_1');
    expect(vm.getIsLoading()).toBe(false);
    expect(listener).toHaveBeenCalled();
  });

  it('navigates carousel forward and wraps around', () => {
    const vm = new PublicPatternViewModel(async () => []);
    vm.setPatterns([pattern1, pattern2]);

    expect(vm.getActiveIndex()).toBe(0);
    vm.nextPattern();
    expect(vm.getActiveIndex()).toBe(1);
    expect(vm.getActivePattern()?.id).toBe('pat_2');

    // Wraps around to 0
    vm.nextPattern();
    expect(vm.getActiveIndex()).toBe(0);
  });

  it('navigates carousel backward and wraps around', () => {
    const vm = new PublicPatternViewModel(async () => []);
    vm.setPatterns([pattern1, pattern2]);

    expect(vm.getActiveIndex()).toBe(0);
    vm.prevPattern();
    expect(vm.getActiveIndex()).toBe(1);

    vm.prevPattern();
    expect(vm.getActiveIndex()).toBe(0);
  });

  it('handles toggleExpanded and setExpanded', () => {
    const vm = new PublicPatternViewModel(async () => []);
    expect(vm.getIsExpanded()).toBe(false);

    vm.toggleExpanded();
    expect(vm.getIsExpanded()).toBe(true);

    vm.toggleExpanded();
    expect(vm.getIsExpanded()).toBe(false);

    vm.setExpanded(true);
    expect(vm.getIsExpanded()).toBe(true);
  });

  it('dismisses the briefing banner', () => {
    const vm = new PublicPatternViewModel(async () => []);
    const listener = vi.fn();
    vm.subscribe(listener);

    expect(vm.getIsDismissed()).toBe(false);
    vm.dismiss();
    expect(vm.getIsDismissed()).toBe(true);
    expect(listener).toHaveBeenCalled();
  });

  it('allows unsubscribing from state updates', () => {
    const vm = new PublicPatternViewModel(async () => []);
    const listener = vi.fn();
    const unsub = vm.subscribe(listener);

    vm.toggleExpanded();
    expect(listener).toHaveBeenCalledTimes(1);

    unsub();
    vm.toggleExpanded();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
