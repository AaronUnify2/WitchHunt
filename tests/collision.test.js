import { describe, it, expect } from 'vitest';
import { resolveCircles, clampToRadius } from '../src/world/collision.js';
import { SpatialGrid } from '../src/world/SpatialGrid.js';

describe('resolveCircles', () => {
  it('pushes the player out of an overlapping trunk', () => {
    const pos = { x: 0.5, z: 0 };
    resolveCircles(pos, 0.35, [{ x: 0, z: 0, r: 0.3 }]);
    expect(Math.hypot(pos.x, pos.z)).toBeCloseTo(0.65);
    expect(pos.z).toBeCloseTo(0);
  });

  it('leaves a clear position alone', () => {
    const pos = { x: 5, z: 5 };
    resolveCircles(pos, 0.35, [{ x: 0, z: 0, r: 0.3 }]);
    expect(pos).toEqual({ x: 5, z: 5 });
  });

  it('handles a dead-centre overlap', () => {
    const pos = { x: 1, z: 1 };
    resolveCircles(pos, 0.35, [{ x: 1, z: 1, r: 0.3 }]);
    expect(Math.hypot(pos.x - 1, pos.z - 1)).toBeCloseTo(0.65);
  });
});

describe('clampToRadius', () => {
  it('pulls positions back inside the boundary', () => {
    const pos = clampToRadius({ x: 30, z: 40 }, 10);
    expect(Math.hypot(pos.x, pos.z)).toBeCloseTo(10);
  });
});

describe('SpatialGrid', () => {
  it('finds nearby circles, including across cell borders', () => {
    const grid = new SpatialGrid(8);
    grid.insert({ x: 7.9, z: 0, r: 0.3 });
    grid.insert({ x: 50, z: 50, r: 0.3 });
    const near = grid.query(8.1, 0, 0.35);
    expect(near).toHaveLength(1);
    expect(near[0].x).toBe(7.9);
  });

  it('reuses the output array', () => {
    const grid = new SpatialGrid(8);
    grid.insert({ x: 0, z: 0, r: 1 });
    const out = [{ stale: true }];
    expect(grid.query(0, 0, 1, out)).toBe(out);
    expect(out).toHaveLength(1);
    expect(out[0].stale).toBeUndefined();
  });
});
