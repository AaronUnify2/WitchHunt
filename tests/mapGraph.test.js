import { describe, it, expect } from 'vitest';
import {
  pointSegmentDistance,
  segmentsCross,
  minimumSpanningTree,
  addLoops,
  hopCounts,
  isConnected,
  graphDistance,
} from '../src/world/mapGraph.js';
import { Rng } from '../src/core/Rng.js';

const square = [
  { x: 0, z: 0, radius: 1 },
  { x: 10, z: 0, radius: 1 },
  { x: 10, z: 10, radius: 1 },
  { x: 0, z: 10, radius: 1 },
];

describe('geometry', () => {
  it('measures distance to a segment, clamped to its ends', () => {
    expect(pointSegmentDistance(5, 3, 0, 0, 10, 0)).toBeCloseTo(3);
    expect(pointSegmentDistance(-4, 3, 0, 0, 10, 0)).toBeCloseTo(5);
  });

  it('detects crossing segments but not touching ends', () => {
    expect(segmentsCross({ x: 0, z: 0 }, { x: 10, z: 10 }, { x: 0, z: 10 }, { x: 10, z: 0 })).toBe(true);
    expect(segmentsCross({ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 10, z: 0 }, { x: 10, z: 10 })).toBe(false);
    expect(segmentsCross({ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 0, z: 5 }, { x: 10, z: 5 })).toBe(false);
  });
});

describe('graphs', () => {
  it('builds a spanning tree of n - 1 edges that connects everything', () => {
    const edges = minimumSpanningTree(square);
    expect(edges).toHaveLength(3);
    expect(isConnected(4, edges)).toBe(true);
  });

  it('counts hops and walking distance', () => {
    const edges = [[0, 1], [1, 2], [2, 3]];
    expect(hopCounts(4, edges, 0)).toEqual([0, 1, 2, 3]);
    expect(graphDistance(square, edges, 0, 3)).toBeCloseTo(30);
    expect(hopCounts(4, [[0, 1]], 0)[3]).toBe(Infinity);
  });

  it('adds a loop that cuts a long detour, without crossings', () => {
    const edges = [[0, 1], [1, 2], [2, 3]];
    addLoops(square, edges, new Rng(1), { count: 5, maxLength: 100, keepChance: 1, detourRatio: 1.8, minAngle: 0.3, clearance: 0 });
    // 3-0 (detour 30 vs 10) gets added; the diagonals would cross or aren't worth it.
    expect(edges).toContainEqual([0, 3]);
    expect(edges).toHaveLength(4);
  });
});
