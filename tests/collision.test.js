import { describe, it, expect } from 'vitest';
import { resolveCircles, clampToRadius, nearestHit } from '../src/world/collision.js';
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

describe('nearestHit', () => {
  const eye = { x: 0, y: 1.5, z: 0 };
  const level = { x: 0, y: 0, z: -1 }; // looking straight ahead (-z)

  it('returns maxDistance and no facing when nothing is in the way', () => {
    expect(nearestHit(eye, level, [], 5)).toEqual({ distance: 5, facing: 0 });
  });

  it('hits the ground when looking down, at a glancing angle', () => {
    const down = { x: 0, y: -Math.SQRT1_2, z: -Math.SQRT1_2 };
    const hit = nearestHit(eye, down, [], 10);
    expect(hit.distance).toBeCloseTo(1.5 * Math.SQRT2);
    expect(hit.facing).toBeCloseTo(Math.SQRT1_2);
  });

  it('hits a tree canopy (visual radius) head-on', () => {
    const hit = nearestHit(eye, level, [{ x: 0, z: -3, r: 0.3, vr: 1 }], 10);
    expect(hit.distance).toBeCloseTo(2);
    expect(hit.facing).toBeCloseTo(1);
  });

  it('a grazing hit on the edge of a circle faces away from the beam', () => {
    const hit = nearestHit(eye, level, [{ x: 0.95, z: -3, r: 0.3, vr: 1 }], 10);
    expect(hit.distance).toBeLessThan(10);
    expect(hit.facing).toBeLessThan(0.5);
  });

  it('ignores circles behind or beside the ray', () => {
    const behind = { x: 0, z: 3, r: 0.3, vr: 1 };
    const beside = { x: 5, z: -3, r: 0.3, vr: 1 };
    expect(nearestHit(eye, level, [behind, beside], 10).distance).toBe(10);
  });

  it('passes over a low rock but hits a tall one', () => {
    const low = { x: 0, z: -2, r: 0.4, vr: 0.5, top: 0.6 };
    const tall = { x: 0, z: -2, r: 0.4, vr: 0.5, top: 2 };
    expect(nearestHit(eye, level, [low], 10).distance).toBe(10);
    expect(nearestHit(eye, level, [tall], 10).distance).toBeCloseTo(1.5);
  });

  it('is zero distance, head-on, when already inside a canopy', () => {
    expect(nearestHit(eye, level, [{ x: 0.2, z: 0, r: 0.3, vr: 1 }], 10)).toEqual({ distance: 0, facing: 1 });
  });
});

describe('nearestHit rock lids', () => {
  it('hits the flat top of a short cylinder when aimed down onto it', async () => {
    const { nearestHit } = await import('../src/world/collision.js');
    const rock = { x: 1, z: 0, r: 0.5, top: 0.6 };
    const origin = { x: 0, y: 1.5, z: 0 };
    const dir = { x: 0.6, y: -0.8, z: 0 };
    const hit = nearestHit(origin, dir, [rock], 10);
    // Lid at y = 0.6: t = 0.9 / 0.8 = 1.125, x = 0.675 (inside the rock's radius)
    expect(hit.distance).toBeCloseTo(1.125);
    expect(hit.facing).toBeCloseTo(0.8);
  });

  it('passes over a lid it does not come down through', async () => {
    const { nearestHit } = await import('../src/world/collision.js');
    const rock = { x: 1, z: 0, r: 0.15, top: 0.6 };
    const hit = nearestHit({ x: 0, y: 1.5, z: 0 }, { x: 0.8, y: -0.6, z: 0 }, [rock], 10);
    expect(hit.distance).toBeCloseTo(2.5); // over the rock, onto the ground
  });
});

describe('nearestHit on hills', () => {
  // A ground that rises toward -z: height = -0.5 z.
  const slope = {
    rayDistance(origin, dir, max, step) {
      for (let t = 0; t <= max; t += step / 4) if (origin.y + dir.y * t <= -0.5 * (origin.z + dir.z * t)) return t;
      return max;
    },
  };

  it('hits rising ground ahead even when looking level', () => {
    const hit = nearestHit({ x: 0, y: 1.5, z: 0 }, { x: 0, y: 0, z: -1 }, [], 10, undefined, slope, 0.5);
    expect(hit.distance).toBeCloseTo(3, 0);
  });

  it('skips a rock hit below its base', async () => {
    const rock = { x: 0, z: -3, r: 0.5, base: 2, top: 3 };
    const hit = nearestHit({ x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: -1 }, [rock], 10);
    expect(hit.distance).toBe(10);
  });
});
