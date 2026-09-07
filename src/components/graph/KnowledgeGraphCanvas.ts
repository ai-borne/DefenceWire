/**
 * Hardware-Accelerated Micro-Canvas Force Graph Engine (Phase 3)
 * Pure HTML5 2D Canvas viewer supporting pan, zoom, drag, hover hit-testing,
 * dynamic node glow, and epistemic edge rendering.
 * Hard limit: <= 300 LOC.
 */

import { NodeCategory } from '../../types/graph.js';
import { ForceSimulation, SimulationNode, SimulationEdge } from './forceSimulation.js';
import { KnowledgeGraphViewModel } from '../../viewmodels/KnowledgeGraphViewModel.js';

const CATEGORY_COLORS: Record<NodeCategory, string> = {
  platform: '#0284C7', threat: '#DC2626', facility: '#0F766E',
  location: '#854D0E', organization: '#7C3AED', program: '#B31919'
};

export class KnowledgeGraphCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private vm: KnowledgeGraphViewModel;
  private simulation = new ForceSimulation();
  private panX = 0;
  private panY = 0;
  private zoom = 1.0;
  private isDraggingNode = false;
  private isPanning = false;
  private draggedNode: SimulationNode | null = null;
  private startMouseX = 0;
  private startMouseY = 0;
  private animationFrameId: number | null = null;
  private unsubscribeVm: () => void;
  private resizeObserver: ResizeObserver | null = null;

  constructor(canvas: HTMLCanvasElement, vm: KnowledgeGraphViewModel) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.vm = vm;

    this.setupEvents();
    this.syncData();
    this.handleResize();

    this.unsubscribeVm = this.vm.subscribe(() => {
      this.syncData();
      this.startLoop();
    });

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.handleResize());
      this.resizeObserver.observe(this.canvas);
    }
    this.startLoop();
  }

  private handleResize(): void {
    const width = this.canvas.clientWidth || 800;
    const height = this.canvas.clientHeight || 500;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    if (this.ctx) {
      this.ctx.resetTransform?.();
      this.ctx.scale(dpr, dpr);
    }
    this.simulation.setCenter(width / 2, height / 2);
    this.render();
  }

  private syncData(): void {
    const { nodes, edges } = this.vm.getFilteredData();
    const simNodes: SimulationNode[] = nodes.map((n) => ({
      id: n.id, label: n.label, category: n.category, degree: n.degree,
      x: 0, y: 0, vx: 0, vy: 0, radius: 6 + Math.min(n.degree * 2.5, 18)
    }));
    const simEdges: SimulationEdge[] = edges.map((e) => ({
      id: e.id, source: e.sourceId, target: e.targetId,
      weight: e.weight, predicate: e.predicate, epistemicState: e.epistemicState
    }));
    this.simulation.setNodes(simNodes);
    this.simulation.setEdges(simEdges);
    this.simulation.step(25);
    this.render();
  }

  private screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return { x: (sx - this.panX) / this.zoom, y: (sy - this.panY) / this.zoom };
  }

  private setupEvents(): void {
    this.canvas.addEventListener('pointerdown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const world = this.screenToWorld(sx, sy);
      const hit = this.simulation.getNodeAt(world.x, world.y);

      if (hit) {
        this.isDraggingNode = true;
        this.draggedNode = hit;
        hit.fx = world.x;
        hit.fy = world.y;
        this.simulation.reheat(0.5);
      } else {
        this.isPanning = true;
        this.startMouseX = sx - this.panX;
        this.startMouseY = sy - this.panY;
      }
      this.startLoop();
    });

    window.addEventListener('pointermove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const world = this.screenToWorld(sx, sy);

      if (this.isDraggingNode && this.draggedNode) {
        this.draggedNode.fx = world.x;
        this.draggedNode.fy = world.y;
        this.simulation.reheat(0.4);
      } else if (this.isPanning) {
        this.panX = sx - this.startMouseX;
        this.panY = sy - this.startMouseY;
        this.render();
      } else if (e.target === this.canvas) {
        const hit = this.simulation.getNodeAt(world.x, world.y);
        this.canvas.style.cursor = hit ? 'pointer' : 'grab';
        this.vm.setHoveredNodeId(hit ? hit.id : null);
      }
    });

    window.addEventListener('pointerup', () => {
      if (this.isDraggingNode && this.draggedNode) {
        this.draggedNode.fx = null;
        this.draggedNode.fy = null;
        this.vm.setSelectedNodeId(this.draggedNode.id);
      }
      this.isDraggingNode = false;
      this.isPanning = false;
      this.draggedNode = null;
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.12 : 0.88;
      const newZoom = Math.min(Math.max(this.zoom * factor, 0.25), 3.5);
      this.panX = sx - (sx - this.panX) * (newZoom / this.zoom);
      this.panY = sy - (sy - this.panY) * (newZoom / this.zoom);
      this.zoom = newZoom;
      this.render();
    });
  }

  public render(): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const width = this.canvas.clientWidth || 800;
    const height = this.canvas.clientHeight || 500;

    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.zoom, this.zoom);

    const nodes = this.simulation.getNodes();
    const edges = this.simulation.getEdges();
    const activeHighlightId = this.vm.getHoveredNodeId() || this.vm.getSelectedNodeId();

    // 1. Draw Edges
    for (const edge of edges) {
      const s = edge.sourceNode;
      const t = edge.targetNode;
      if (!s || !t) continue;

      const isConn = activeHighlightId ? s.id === activeHighlightId || t.id === activeHighlightId : true;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(t.x, t.y);

      if (edge.epistemicState === 'CONTESTED' || edge.epistemicState === 'DISPUTED') {
        ctx.setLineDash([4, 4]);
      } else if (edge.epistemicState === 'SUPERSEDED' || edge.epistemicState === 'RETRACTED') {
        ctx.setLineDash([2, 4]);
      } else {
        ctx.setLineDash([]);
      }

      ctx.strokeStyle = !isConn ? 'rgba(120, 130, 140, 0.15)' : activeHighlightId ? '#38BDF8' : 'rgba(140, 150, 160, 0.4)';
      ctx.lineWidth = isConn && activeHighlightId ? 2.2 : 1.2;
      ctx.stroke();

      if (isConn && activeHighlightId) {
        ctx.font = '10px ui-monospace, monospace';
        ctx.fillStyle = '#38BDF8';
        ctx.textAlign = 'center';
        ctx.fillText(edge.predicate.replace(/_/g, ' '), (s.x + t.x) / 2, (s.y + t.y) / 2 - 4);
      }
    }
    ctx.setLineDash([]);

    // 2. Draw Nodes
    for (const node of nodes) {
      const isSel = node.id === this.vm.getSelectedNodeId();
      const isHov = node.id === this.vm.getHoveredNodeId();
      const isNeighbor = activeHighlightId ? edges.some((e) => (e.sourceNode?.id === activeHighlightId && e.targetNode?.id === node.id) || (e.targetNode?.id === activeHighlightId && e.sourceNode?.id === node.id)) : false;
      const isFocused = isSel || isHov || isNeighbor || !activeHighlightId;
      const color = CATEGORY_COLORS[node.category] || '#0284C7';

      if (isSel || isHov) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 6, 0, Math.PI * 2);
        ctx.fillStyle = isSel ? 'rgba(229, 83, 83, 0.25)' : 'rgba(56, 189, 248, 0.25)';
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fillStyle = isFocused ? color : 'rgba(100, 110, 120, 0.25)';
      ctx.fill();
      ctx.strokeStyle = isSel ? '#FFFFFF' : '#1E252E';
      ctx.lineWidth = isSel ? 2.5 : 1.5;
      ctx.stroke();

      if (isFocused || this.zoom >= 0.9) {
        ctx.font = `${Math.max(9, Math.min(11, 10 / this.zoom))}px -apple-system, sans-serif`;
        ctx.fillStyle = isFocused ? '#E8ECEF' : 'rgba(160, 170, 185, 0.4)';
        ctx.textAlign = 'center';
        ctx.fillText(node.label, node.x, node.y + node.radius + 12);
      }
    }
    ctx.restore();
  }

  private startLoop(): void {
    if (this.animationFrameId != null) return;
    const loop = () => {
      this.simulation.tick();
      this.render();
      if (!this.simulation.isFinished() || this.isDraggingNode || this.isPanning) {
        this.animationFrameId = requestAnimationFrame(loop);
      } else {
        this.animationFrameId = null;
      }
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  public zoomIn(): void { this.zoom = Math.min(this.zoom * 1.25, 3.5); this.render(); }
  public zoomOut(): void { this.zoom = Math.max(this.zoom * 0.8, 0.25); this.render(); }
  public resetView(): void {
    this.panX = 0; this.panY = 0; this.zoom = 1.0;
    this.simulation.reheat(0.8); this.startLoop();
  }
  public recenter(): void {
    const width = this.canvas.clientWidth || 800;
    const height = this.canvas.clientHeight || 500;
    this.panX = 0; this.panY = 0;
    this.simulation.setCenter(width / 2, height / 2);
    this.simulation.reheat(0.7); this.startLoop();
  }
  public destroy(): void {
    if (this.animationFrameId != null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.unsubscribeVm();
    this.resizeObserver?.disconnect();
  }
}
