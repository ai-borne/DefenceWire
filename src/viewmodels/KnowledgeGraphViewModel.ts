/**
 * Knowledge Graph ViewModel (Phase 3)
 * State management for node/edge filtering, time-range scrubbing,
 * category toggles, search queries, and 1-hop / 2-hop inspection.
 * Hard limit: <= 300 LOC.
 */

import { GraphNode, GraphEdge, NodeCategory, SubgraphPayload } from '../types/graph.js';
import { fetchSubgraph } from '../services/graphService.js';

export interface KnowledgeGraphViewState {
  activeCategory: NodeCategory | 'all';
  searchQuery: string;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  minDate: string;
  maxDate: string;
  currentDate: string;
  isPlaying: boolean;
  isLoading: boolean;
  errorMessage: string | null;
}

export class KnowledgeGraphViewModel {
  private allNodes: GraphNode[] = [];
  private allEdges: GraphEdge[] = [];
  private activeCategory: NodeCategory | 'all' = 'all';
  private searchQuery = '';
  private selectedNodeId: string | null = null;
  private hoveredNodeId: string | null = null;
  private focusedNodeIds: Set<string> = new Set();
  private minDate = '2026-01-01T00:00:00Z';
  private maxDate = new Date().toISOString();
  private currentDate = new Date().toISOString();
  private isPlaying = false;
  private isLoading = false;
  private errorMessage: string | null = null;
  private playIntervalId: ReturnType<typeof setInterval> | null = null;
  private listeners: Array<() => void> = [];
  private fetchFn: typeof fetchSubgraph;

  constructor(fetchFn: typeof fetchSubgraph = fetchSubgraph) {
    this.fetchFn = fetchFn;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }

  public async loadSubgraph(centerNodeId?: string): Promise<void> {
    this.isLoading = true;
    this.errorMessage = null;
    this.notify();

    try {
      const payload = await this.fetchFn({
        centerNodeId,
        limit: 150
      });
      this.setData(payload);
    } catch {
      this.errorMessage = 'Failed to load knowledge graph. Using cached intelligence.';
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  public setData(payload: SubgraphPayload): void {
    this.allNodes = [...payload.nodes];
    this.allEdges = [...payload.edges];

    // Compute temporal bounds from edge timestamps
    if (this.allEdges.length > 0) {
      let minTs = Infinity;
      let maxTs = -Infinity;
      for (const e of this.allEdges) {
        const t1 = new Date(e.firstObservedAt).getTime();
        const t2 = new Date(e.lastObservedAt).getTime();
        if (!isNaN(t1)) {
          minTs = Math.min(minTs, t1);
          maxTs = Math.max(maxTs, t1);
        }
        if (!isNaN(t2)) {
          minTs = Math.min(minTs, t2);
          maxTs = Math.max(maxTs, t2);
        }
      }
      if (minTs !== Infinity && maxTs !== -Infinity) {
        this.minDate = new Date(minTs).toISOString();
        this.maxDate = new Date(maxTs).toISOString();
        this.currentDate = this.maxDate;
      }
    }
    this.notify();
  }

  public getFilteredData(): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const currentTs = new Date(this.currentDate).getTime();
    const query = this.searchQuery.trim().toLowerCase();

    // 1. Filter edges by temporal horizon
    const activeEdges = this.allEdges.filter((e) => {
      const firstTs = new Date(e.firstObservedAt).getTime();
      return isNaN(firstTs) || firstTs <= currentTs;
    });

    // 2. Compute dynamic degrees for active edges
    const degreeMap = new Map<string, number>();
    for (const e of activeEdges) {
      degreeMap.set(e.sourceId, (degreeMap.get(e.sourceId) || 0) + 1);
      degreeMap.set(e.targetId, (degreeMap.get(e.targetId) || 0) + 1);
    }

    // 3. Filter nodes by category and search
    const activeNodes = this.allNodes
      .filter((n) => {
        if (this.activeCategory !== 'all' && n.category !== this.activeCategory) return false;
        if (query && !n.label.toLowerCase().includes(query)) return false;
        // Keep node if it matches query or has at least 1 active edge
        return (degreeMap.get(n.id) || 0) > 0 || query.length > 0;
      })
      .map((n) => ({
        ...n,
        degree: degreeMap.get(n.id) || 0
      }));

    const validNodeIds = new Set(activeNodes.map((n) => n.id));
    const validEdges = activeEdges.filter(
      (e) => validNodeIds.has(e.sourceId) && validNodeIds.has(e.targetId)
    );

    return { nodes: activeNodes, edges: validEdges };
  }

  public getSelectedNodeDetails(): {
    node: GraphNode | null;
    neighbors: GraphNode[];
    incidentEdges: GraphEdge[];
  } {
    if (!this.selectedNodeId) {
      return { node: null, neighbors: [], incidentEdges: [] };
    }
    const node = this.allNodes.find((n) => n.id === this.selectedNodeId) || null;
    if (!node) return { node: null, neighbors: [], incidentEdges: [] };

    const currentTs = new Date(this.currentDate).getTime();
    const incidentEdges = this.allEdges.filter((e) => {
      const isIncident = e.sourceId === node.id || e.targetId === node.id;
      const firstTs = new Date(e.firstObservedAt).getTime();
      return isIncident && (isNaN(firstTs) || firstTs <= currentTs);
    });

    const neighborIds = new Set<string>();
    for (const e of incidentEdges) {
      neighborIds.add(e.sourceId === node.id ? e.targetId : e.sourceId);
    }

    const neighbors = this.allNodes.filter((n) => neighborIds.has(n.id));
    return { node, neighbors, incidentEdges };
  }

  // Getters
  public getActiveCategory(): NodeCategory | 'all' { return this.activeCategory; }
  public getSearchQuery(): string { return this.searchQuery; }
  public getSelectedNodeId(): string | null { return this.selectedNodeId; }
  public getHoveredNodeId(): string | null { return this.hoveredNodeId; }
  public getMinDate(): string { return this.minDate; }
  public getMaxDate(): string { return this.maxDate; }
  public getCurrentDate(): string { return this.currentDate; }
  public getIsPlaying(): boolean { return this.isPlaying; }
  public getIsLoading(): boolean { return this.isLoading; }
  public getErrorMessage(): string | null { return this.errorMessage; }

  // Setters & Actions
  public setActiveCategory(cat: NodeCategory | 'all'): void {
    this.activeCategory = cat;
    this.notify();
  }

  public setSearchQuery(q: string): void {
    this.searchQuery = q;
    this.notify();
  }

  public setSelectedNodeId(id: string | null): void {
    this.selectedNodeId = id;
    this.notify();
  }

  public setHoveredNodeId(id: string | null): void {
    if (this.hoveredNodeId === id) return;
    this.hoveredNodeId = id;
    this.notify();
  }

  public focusNodes(nodeIds: string[]): void {
    this.focusedNodeIds = new Set(nodeIds);
    if (nodeIds.length > 0) {
      this.selectedNodeId = nodeIds[0] || null;
    }
    this.notify();
  }

  public getFocusedNodeIds(): Set<string> {
    return new Set(this.focusedNodeIds);
  }

  public setCurrentDate(date: string): void {
    this.currentDate = date;
    this.notify();
  }

  public stepForward(stepDays = 7): void {
    const curr = new Date(this.currentDate).getTime();
    const max = new Date(this.maxDate).getTime();
    const next = Math.min(curr + stepDays * 86400000, max);
    this.currentDate = new Date(next).toISOString();
    if (next >= max && this.isPlaying) {
      this.togglePlay();
    }
    this.notify();
  }

  public togglePlay(): void {
    this.isPlaying = !this.isPlaying;
    if (this.isPlaying) {
      // If at end, loop back to min
      if (new Date(this.currentDate).getTime() >= new Date(this.maxDate).getTime()) {
        this.currentDate = this.minDate;
      }
      this.playIntervalId = setInterval(() => {
        this.stepForward(3);
      }, 400);
    } else if (this.playIntervalId) {
      clearInterval(this.playIntervalId);
      this.playIntervalId = null;
    }
    this.notify();
  }

  public destroy(): void {
    if (this.playIntervalId) {
      clearInterval(this.playIntervalId);
      this.playIntervalId = null;
    }
    this.listeners = [];
  }
}
