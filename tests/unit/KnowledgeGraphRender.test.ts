/**
 * Unit Tests for KnowledgeGraphView & Canvas Rendering Engine (Phase 3)
 * Smoke tests 2D canvas context operations, TimeScrubber DOM interactions,
 * and inspector panel updates.
 * Hard limit: <= 300 LOC.
 */

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KnowledgeGraphViewModel } from '../../src/viewmodels/KnowledgeGraphViewModel.js';
import { renderTimeScrubber } from '../../src/components/graph/TimeScrubber.js';
import { renderKnowledgeGraphView } from '../../src/components/graph/KnowledgeGraphView.js';
import { KnowledgeGraphCanvas } from '../../src/components/graph/KnowledgeGraphCanvas.js';
import { SubgraphPayload } from '../../src/types/graph.js';

describe('KnowledgeGraph DOM & Canvas Rendering', () => {
  const samplePayload: SubgraphPayload = {
    nodes: [
      { id: 'tejas', label: 'LCA Tejas Mk1A', category: 'platform', degree: 2, mentionCount: 5, firstSeenAt: '2026-01-01T00:00:00Z', lastSeenAt: '2026-02-01T00:00:00Z' },
      { id: 'hal', label: 'Hindustan Aeronautics Limited', category: 'organization', degree: 2, mentionCount: 3, firstSeenAt: '2026-01-01T00:00:00Z', lastSeenAt: '2026-02-01T00:00:00Z' }
    ],
    edges: [
      {
        id: 'e1',
        sourceId: 'tejas',
        targetId: 'hal',
        predicate: 'DEVELOPED_BY',
        epistemicState: 'CONFIRMED',
        weight: 2,
        firstObservedAt: '2026-01-05T00:00:00Z',
        lastObservedAt: '2026-01-25T00:00:00Z',
        sourceUrl: 'https://pib.gov.in/mod3'
      }
    ],
    totalNodes: 2,
    totalEdges: 1,
    generatedAt: '2026-02-01T00:00:00Z'
  };

  let mockCtx: Record<string, unknown>;

  beforeEach(() => {
    mockCtx = {
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      setLineDash: vi.fn(),
      resetTransform: vi.fn(),
      canvas: {}
    };

    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx);
  });

  it('renders TimeScrubber with interactive slider and triggers ViewModel updates', () => {
    const vm = new KnowledgeGraphViewModel();
    vm.setData(samplePayload);

    const scrubber = renderTimeScrubber(vm);
    expect(scrubber.className).toBe('dw-graph-scrubber');

    const slider = scrubber.querySelector('input.dw-graph-scrubber-slider') as HTMLInputElement;
    expect(slider).not.toBeNull();

    const playBtn = scrubber.querySelector('button.dw-graph-scrubber-play') as HTMLButtonElement;
    expect(playBtn).not.toBeNull();
    expect(playBtn.textContent).toBe('▶');

    // Clicking play toggles state
    playBtn.click();
    expect(vm.getIsPlaying()).toBe(true);
    expect(playBtn.textContent).toBe('⏸');

    // Cleanup
    (scrubber as HTMLElement & { __cleanup?: () => void }).__cleanup?.();
  });

  it('initializes KnowledgeGraphCanvas and executes 2D rendering cycles', () => {
    const vm = new KnowledgeGraphViewModel();
    vm.setData(samplePayload);

    const canvas = document.createElement('canvas');
    const graphCanvas = new KnowledgeGraphCanvas(canvas, vm);

    // Initial render should clear and draw arcs for nodes and lines for edges
    expect(mockCtx.clearRect).toHaveBeenCalled();
    expect(mockCtx.arc).toHaveBeenCalled();
    expect(mockCtx.stroke).toHaveBeenCalled();

    // Test zoom in / zoom out / reset
    graphCanvas.zoomIn();
    expect(mockCtx.scale).toHaveBeenCalled();

    graphCanvas.zoomOut();
    graphCanvas.resetView();
    graphCanvas.recenter();

    graphCanvas.destroy();
  });

  it('mounts KnowledgeGraphView container with filters, canvas, and inspector', () => {
    const mockFetch = vi.fn().mockResolvedValue(samplePayload);
    const vm = new KnowledgeGraphViewModel(mockFetch);
    vm.setData(samplePayload);

    const view = renderKnowledgeGraphView(vm);

    expect(view.querySelector('.dw-graph-title')?.textContent).toContain('Intel Graph');
    expect(view.querySelectorAll('.dw-graph-tab').length).toBeGreaterThanOrEqual(6);

    const searchInput = view.querySelector('input.dw-graph-search') as HTMLInputElement;
    expect(searchInput).not.toBeNull();

    searchInput.value = 'tejas';
    searchInput.dispatchEvent(new Event('input'));
    expect(vm.getSearchQuery()).toBe('tejas');

    // Inspector initially shows empty guidance
    const emptyGuidance = view.querySelector('.dw-graph-inspector-empty');
    expect(emptyGuidance).not.toBeNull();

    // Selecting a node updates inspector to show details card
    vm.setSelectedNodeId('tejas');
    const inspectorName = view.querySelector('.dw-graph-inspector-name');
    expect(inspectorName?.textContent).toBe('LCA Tejas Mk1A');

    const linkPredicate = view.querySelector('.dw-graph-link-predicate');
    expect(linkPredicate?.textContent).toBe('DEVELOPED BY');

    // Cleanup
    (view as HTMLElement & { __cleanup?: () => void }).__cleanup?.();
  });
});
