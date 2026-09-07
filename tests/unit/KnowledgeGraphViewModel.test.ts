/**
 * Unit Tests for KnowledgeGraphViewModel (Phase 3)
 * Tests state transitions, temporal edge filtering, dynamic degree recalculation,
 * category filtering, search queries, and scrubber timeline controls.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import { KnowledgeGraphViewModel } from '../../src/viewmodels/KnowledgeGraphViewModel.js';
import { SubgraphPayload } from '../../src/types/graph.js';

describe('KnowledgeGraphViewModel State & Filtering', () => {
  const mockPayload: SubgraphPayload = {
    nodes: [
      { id: 'l70', label: 'L-70 Air Defence Guns', category: 'platform', degree: 2, mentionCount: 4, firstSeenAt: '2026-01-10T00:00:00Z', lastSeenAt: '2026-02-15T00:00:00Z' },
      { id: 'delhi', label: 'National Capital Territory Delhi', category: 'location', degree: 2, mentionCount: 6, firstSeenAt: '2026-01-05T00:00:00Z', lastSeenAt: '2026-02-15T00:00:00Z' },
      { id: 'drone', label: 'Unmanned Aerial Threat', category: 'threat', degree: 1, mentionCount: 2, firstSeenAt: '2026-02-01T00:00:00Z', lastSeenAt: '2026-02-10T00:00:00Z' }
    ],
    edges: [
      {
        id: 'e1',
        sourceId: 'l70',
        targetId: 'delhi',
        predicate: 'DEPLOYED_TO',
        epistemicState: 'CONFIRMED',
        weight: 1,
        firstObservedAt: '2026-01-10T00:00:00Z',
        lastObservedAt: '2026-01-20T00:00:00Z',
        sourceUrl: 'https://pib.gov.in/mod1'
      },
      {
        id: 'e2',
        sourceId: 'l70',
        targetId: 'drone',
        predicate: 'TARGETS',
        epistemicState: 'CONFIRMED',
        weight: 1,
        firstObservedAt: '2026-02-05T00:00:00Z',
        lastObservedAt: '2026-02-10T00:00:00Z',
        sourceUrl: 'https://pib.gov.in/mod2'
      }
    ],
    totalNodes: 3,
    totalEdges: 2,
    generatedAt: '2026-02-15T00:00:00Z'
  };

  it('populates data and computes temporal boundaries from edges', () => {
    const vm = new KnowledgeGraphViewModel();
    vm.setData(mockPayload);

    expect(vm.getMinDate()).toBe('2026-01-10T00:00:00.000Z');
    expect(vm.getMaxDate()).toBe('2026-02-10T00:00:00.000Z');
    expect(vm.getCurrentDate()).toBe('2026-02-10T00:00:00.000Z');
  });

  it('filters out edges occurring after the scrubbed date and recalculates degree', () => {
    const vm = new KnowledgeGraphViewModel();
    vm.setData(mockPayload);

    // Scrub back to mid-January before the drone threat occurred (2026-01-25)
    vm.setCurrentDate('2026-01-25T00:00:00.000Z');
    const filtered = vm.getFilteredData();

    expect(filtered.edges).toHaveLength(1);
    expect(filtered.edges[0]?.id).toBe('e1');

    // Only nodes connected to e1 should be active (drone has degree 0 and no search match)
    expect(filtered.nodes.map((n) => n.id)).toEqual(expect.arrayContaining(['l70', 'delhi']));
    expect(filtered.nodes.find((n) => n.id === 'drone')).toBeUndefined();

    // Degree of l70 should be dynamically 1 (instead of 2)
    const l70 = filtered.nodes.find((n) => n.id === 'l70');
    expect(l70?.degree).toBe(1);
  });

  it('filters nodes by category', () => {
    const vm = new KnowledgeGraphViewModel();
    vm.setData(mockPayload);

    vm.setActiveCategory('platform');
    const filtered = vm.getFilteredData();

    // Only platform nodes matching the active category
    expect(filtered.nodes.every((n) => n.category === 'platform')).toBe(true);
    expect(filtered.nodes.some((n) => n.id === 'l70')).toBe(true);
  });

  it('filters nodes by search query case-insensitively', () => {
    const vm = new KnowledgeGraphViewModel();
    vm.setData(mockPayload);

    vm.setSearchQuery('guns');
    const filtered = vm.getFilteredData();

    expect(filtered.nodes).toHaveLength(1);
    expect(filtered.nodes[0]?.id).toBe('l70');
  });

  it('extracts selected node details, incident edges, and 1-hop neighbors', () => {
    const vm = new KnowledgeGraphViewModel();
    vm.setData(mockPayload);

    // Null selection returns empty
    expect(vm.getSelectedNodeDetails().node).toBeNull();
    expect(vm.getSelectedNodeDetails().neighbors).toHaveLength(0);

    vm.setSelectedNodeId('l70');
    const details = vm.getSelectedNodeDetails();

    expect(details.node?.id).toBe('l70');
    expect(details.neighbors.map((n) => n.id)).toEqual(expect.arrayContaining(['delhi', 'drone']));
    expect(details.incidentEdges).toHaveLength(2);
  });

  it('notifies subscribers on state updates', () => {
    const vm = new KnowledgeGraphViewModel();
    const listener = vi.fn();
    const unsub = vm.subscribe(listener);

    vm.setActiveCategory('threat');
    expect(listener).toHaveBeenCalledTimes(1);

    vm.setHoveredNodeId('drone');
    expect(listener).toHaveBeenCalledTimes(2);

    unsub();
    vm.setActiveCategory('all');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('controls playback animation via stepForward and togglePlay', () => {
    vi.useFakeTimers();
    const vm = new KnowledgeGraphViewModel();
    vm.setData(mockPayload);

    expect(vm.getIsPlaying()).toBe(false);
    vm.togglePlay();
    expect(vm.getIsPlaying()).toBe(true);

    // Advance timer to trigger interval step
    vi.advanceTimersByTime(450);
    expect(vm.getCurrentDate()).toBeDefined();

    vm.togglePlay();
    expect(vm.getIsPlaying()).toBe(false);
    vm.destroy();
    vi.useRealTimers();
  });

  it('loads remote subgraph via injected fetch function', async () => {
    const mockFetch = vi.fn().mockResolvedValue(mockPayload);
    const vm = new KnowledgeGraphViewModel(mockFetch);

    await vm.loadSubgraph('l70');

    expect(mockFetch).toHaveBeenCalledWith({ centerNodeId: 'l70', limit: 150 });
    expect(vm.getFilteredData().nodes).toHaveLength(3);
    expect(vm.getIsLoading()).toBe(false);
  });
});
