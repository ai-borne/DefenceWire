/**
 * Pure TypeScript Micro Force-Directed Spring Physics Simulation (Phase 3)
 * Implements Euler/Verlet spring mechanics, Coulomb repulsion, and center gravity.
 * Zero external dependencies. Hard limit: <= 300 LOC.
 */

import { NodeCategory, PredicateType, EpistemicState } from '../../types/graph.js';

export interface SimulationNode {
  id: string;
  label: string;
  category: NodeCategory;
  degree: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number | null;
  fy?: number | null;
  radius: number;
}

export interface SimulationEdge {
  id: string;
  source: string | SimulationNode;
  target: string | SimulationNode;
  weight: number;
  predicate: PredicateType;
  epistemicState: EpistemicState;
  sourceNode?: SimulationNode;
  targetNode?: SimulationNode;
}

export interface ForceSimulationOptions {
  chargeStrength: number;
  linkDistance: number;
  linkStrength: number;
  centerStrength: number;
  alphaDecay: number;
  velocityDamping: number;
  minDistance: number;
  maxDistance: number;
  centerX: number;
  centerY: number;
}

const DEFAULT_OPTIONS: ForceSimulationOptions = {
  chargeStrength: -180,
  linkDistance: 80,
  linkStrength: 0.15,
  centerStrength: 0.05,
  alphaDecay: 0.02,
  velocityDamping: 0.82,
  minDistance: 8,
  maxDistance: 350,
  centerX: 0,
  centerY: 0
};

export class ForceSimulation {
  private nodes: SimulationNode[] = [];
  private edges: SimulationEdge[] = [];
  private nodeMap = new Map<string, SimulationNode>();
  private options: ForceSimulationOptions;
  private alpha = 1.0;

  constructor(options?: Partial<ForceSimulationOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  public setCenter(x: number, y: number): void {
    this.options.centerX = x;
    this.options.centerY = y;
  }

  public setNodes(nodes: SimulationNode[]): void {
    this.nodes = nodes;
    this.nodeMap.clear();

    const count = nodes.length;
    nodes.forEach((node, idx) => {
      this.nodeMap.set(node.id, node);
      // Initialize with Fermat's spiral if coordinates are zero or unset
      if (node.x === 0 && node.y === 0 && count > 0) {
        const phi = idx * 2.399963229728653; // Golden angle
        const r = 25 * Math.sqrt(idx + 1);
        node.x = this.options.centerX + r * Math.cos(phi);
        node.y = this.options.centerY + r * Math.sin(phi);
      }
      node.vx = 0;
      node.vy = 0;
    });
    this.reheat(0.8);
  }

  public setEdges(edges: SimulationEdge[]): void {
    this.edges = edges;
    for (const edge of this.edges) {
      const sId = typeof edge.source === 'string' ? edge.source : edge.source.id;
      const tId = typeof edge.target === 'string' ? edge.target : edge.target.id;
      edge.sourceNode = this.nodeMap.get(sId);
      edge.targetNode = this.nodeMap.get(tId);
    }
  }

  public getNodes(): readonly SimulationNode[] {
    return this.nodes;
  }

  public getEdges(): readonly SimulationEdge[] {
    return this.edges;
  }

  public getAlpha(): number {
    return this.alpha;
  }

  public reheat(newAlpha = 0.6): void {
    this.alpha = Math.max(this.alpha, Math.min(1.0, newAlpha));
  }

  public isFinished(): boolean {
    return this.alpha < 0.005;
  }

  public tick(): number {
    if (this.isFinished()) return 0;

    const {
      chargeStrength,
      linkDistance,
      linkStrength,
      centerStrength,
      alphaDecay,
      velocityDamping,
      minDistance,
      maxDistance,
      centerX,
      centerY
    } = this.options;

    const n = this.nodes.length;

    // 1. Center Gravity Pull
    for (let i = 0; i < n; i++) {
      const node = this.nodes[i];
      if (!node || node.fx != null) continue;
      const dx = centerX - node.x;
      const dy = centerY - node.y;
      node.vx += dx * centerStrength * this.alpha;
      node.vy += dy * centerStrength * this.alpha;
    }

    // 2. Coulomb Repulsion between Nodes
    for (let i = 0; i < n; i++) {
      const n1 = this.nodes[i];
      if (!n1) continue;
      for (let j = i + 1; j < n; j++) {
        const n2 = this.nodes[j];
        if (!n2) continue;

        let dx = n1.x - n2.x;
        let dy = n1.y - n2.y;
        let distSq = dx * dx + dy * dy;

        if (distSq < 0.001) {
          dx = (Math.random() - 0.5) * 0.1;
          dy = (Math.random() - 0.5) * 0.1;
          distSq = dx * dx + dy * dy;
        }

        const dist = Math.sqrt(distSq);
        if (dist < maxDistance) {
          const effectiveDist = Math.max(dist, minDistance);
          const force = (chargeStrength * this.alpha) / (effectiveDist * effectiveDist);
          const fx = (dx / effectiveDist) * force;
          const fy = (dy / effectiveDist) * force;

          if (n1.fx == null) {
            n1.vx -= fx;
            n1.vy -= fy;
          }
          if (n2.fx == null) {
            n2.vx += fx;
            n2.vy += fy;
          }
        }
      }
    }

    // 3. Hooke's Law Spring Attraction Along Edges
    for (const edge of this.edges) {
      const s = edge.sourceNode;
      const t = edge.targetNode;
      if (!s || !t || s === t) continue;

      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
      const displacement = dist - linkDistance;
      const weightMultiplier = Math.min(Math.max(edge.weight || 1, 1), 3);
      const force = displacement * linkStrength * this.alpha * weightMultiplier;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      if (s.fx == null) {
        s.vx += fx * 0.5;
        s.vy += fy * 0.5;
      }
      if (t.fx == null) {
        t.vx -= fx * 0.5;
        t.vy -= fy * 0.5;
      }
    }

    // 4. Velocity Integration, Position Updates & Cooling
    const maxSpeed = 20;
    for (let i = 0; i < n; i++) {
      const node = this.nodes[i];
      if (!node) continue;
      if (node.fx != null && node.fy != null) {
        node.x = node.fx;
        node.y = node.fy;
        node.vx = 0;
        node.vy = 0;
      } else {
        const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
        if (speed > maxSpeed) {
          node.vx = (node.vx / speed) * maxSpeed;
          node.vy = (node.vy / speed) * maxSpeed;
        }
        node.vx *= velocityDamping;
        node.vy *= velocityDamping;
        node.x += node.vx;
        node.y += node.vy;
      }
    }

    this.alpha *= 1 - alphaDecay;
    return this.alpha;
  }

  public step(iterations = 35): void {
    for (let i = 0; i < iterations && !this.isFinished(); i++) {
      this.tick();
    }
  }

  public getNodeAt(x: number, y: number, hitPadding = 6): SimulationNode | null {
    // Traverse in reverse so topmost rendered nodes are hit first
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const node = this.nodes[i];
      if (!node) continue;
      const dx = node.x - x;
      const dy = node.y - y;
      const r = node.radius + hitPadding;
      if (dx * dx + dy * dy <= r * r) {
        return node;
      }
    }
    return null;
  }
}
