/**
 * Unit Tests for Force-Directed Spring Physics Simulation (Phase 3)
 * Tests Euler/Verlet spring convergence, repulsion, stability under 500+ nodes,
 * and node hit-testing.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect } from 'vitest';
import { ForceSimulation, SimulationNode, SimulationEdge } from '../../src/components/graph/forceSimulation.js';

describe('ForceSimulation Spring Mechanics & Convergence', () => {
  it('initializes nodes and cools down alpha after ticking', () => {
    const sim = new ForceSimulation({ centerX: 100, centerY: 100 });
    const nodes: SimulationNode[] = [
      { id: 'n1', label: 'Node 1', category: 'platform', degree: 1, x: 0, y: 0, vx: 0, vy: 0, radius: 10 },
      { id: 'n2', label: 'Node 2', category: 'threat', degree: 1, x: 0, y: 0, vx: 0, vy: 0, radius: 10 }
    ];
    sim.setNodes(nodes);

    expect(sim.getAlpha()).toBeGreaterThan(0.5);
    expect(sim.isFinished()).toBe(false);

    // Initial spiral coordinates should have been assigned
    expect(nodes[0]!.x).not.toBe(0);
    expect(nodes[1]!.x).not.toBe(0);

    // Tick multiple times to simulate cooling
    sim.step(50);
    expect(sim.getAlpha()).toBeLessThan(0.4);
  });

  it('repels overlapping nodes apart due to Coulomb forces', () => {
    const sim = new ForceSimulation({ chargeStrength: -200, centerX: 0, centerY: 0 });
    const n1: SimulationNode = { id: 'n1', label: 'N1', category: 'platform', degree: 0, x: 10, y: 10, vx: 0, vy: 0, radius: 8 };
    const n2: SimulationNode = { id: 'n2', label: 'N2', category: 'platform', degree: 0, x: 11, y: 10, vx: 0, vy: 0, radius: 8 };

    sim.setNodes([n1, n2]);
    const initialDist = Math.hypot(n1.x - n2.x, n1.y - n2.y);

    sim.tick();
    const newDist = Math.hypot(n1.x - n2.x, n1.y - n2.y);

    expect(newDist).toBeGreaterThan(initialDist);
  });

  it('pulls connected nodes closer via Hookes law spring attraction', () => {
    const sim = new ForceSimulation({ linkDistance: 50, linkStrength: 0.3, chargeStrength: 0 });
    const n1: SimulationNode = { id: 'n1', label: 'N1', category: 'platform', degree: 1, x: 0, y: 0, vx: 0, vy: 0, radius: 8 };
    const n2: SimulationNode = { id: 'n2', label: 'N2', category: 'facility', degree: 1, x: 200, y: 0, vx: 0, vy: 0, radius: 8 };
    const edge: SimulationEdge = {
      id: 'e1',
      source: 'n1',
      target: 'n2',
      weight: 1,
      predicate: 'DEPLOYED_TO',
      epistemicState: 'CONFIRMED'
    };

    sim.setNodes([n1, n2]);
    sim.setEdges([edge]);

    sim.step(15);
    const finalDist = Math.hypot(n1.x - n2.x, n1.y - n2.y);

    // Should pull them significantly closer than 200px
    expect(finalDist).toBeLessThan(180);
  });

  it('preserves pinned coordinates when node has fx and fy set', () => {
    const sim = new ForceSimulation();
    const pinned: SimulationNode = {
      id: 'pinned',
      label: 'Pinned',
      category: 'location',
      degree: 0,
      x: 50,
      y: 50,
      vx: 0,
      vy: 0,
      fx: 50,
      fy: 50,
      radius: 10
    };
    sim.setNodes([pinned]);

    sim.step(20);
    expect(pinned.x).toBe(50);
    expect(pinned.y).toBe(50);
  });

  it('maintains stability under 500+ nodes without generating NaN or infinite coordinates', () => {
    const sim = new ForceSimulation({ centerX: 500, centerY: 500 });
    const count = 500;
    const nodes: SimulationNode[] = [];
    const edges: SimulationEdge[] = [];

    for (let i = 0; i < count; i++) {
      nodes.push({
        id: `node_${i}`,
        label: `Platform ${i}`,
        category: i % 2 === 0 ? 'platform' : 'facility',
        degree: 1,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        radius: 6
      });
      if (i > 0) {
        edges.push({
          id: `edge_${i}`,
          source: `node_${i - 1}`,
          target: `node_${i}`,
          weight: 1,
          predicate: 'CONNECTED_TO',
          epistemicState: 'CONFIRMED'
        });
      }
    }

    sim.setNodes(nodes);
    sim.setEdges(edges);

    expect(() => sim.step(10)).not.toThrow();

    for (let i = 0; i < 20; i++) {
      const node = nodes[i]!;
      expect(Number.isFinite(node.x)).toBe(true);
      expect(Number.isFinite(node.y)).toBe(true);
      expect(Number.isNaN(node.x)).toBe(false);
      expect(Number.isNaN(node.y)).toBe(false);
    }
  });

  it('correctly detects node under pointer coordinates with getNodeAt', () => {
    const sim = new ForceSimulation();
    const nodeA: SimulationNode = { id: 'a', label: 'A', category: 'platform', degree: 1, x: 100, y: 100, vx: 0, vy: 0, radius: 10 };
    const nodeB: SimulationNode = { id: 'b', label: 'B', category: 'threat', degree: 1, x: 200, y: 200, vx: 0, vy: 0, radius: 12 };
    sim.setNodes([nodeA, nodeB]);

    // Hit test directly on A
    expect(sim.getNodeAt(102, 102)?.id).toBe('a');
    // Hit test on B with padding
    expect(sim.getNodeAt(212, 200, 4)?.id).toBe('b');
    // Miss
    expect(sim.getNodeAt(50, 50)).toBeNull();
  });
});
