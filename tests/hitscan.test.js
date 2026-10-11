import { describe, it, expect } from 'vitest';
import { rayCylinder, rayBlockers, rayEnemies, falloff, spreadDirection, meleeTarget } from '../src/combat/hitscan.js';
import { Rng } from '../src/core/Rng.js';

const eye = { x: 0, y: 1.7, z: 0 };
const ahead = { x: 0, y: 0, z: -1 };
const zombie = (z, x = 0) => ({ x, z, hitRadius: 0.3, height: 1.8, headBottom: 1.42, headRadius: 0.16 });

describe('rayCylinder', () => {
  it('hits the near side', () => {
    expect(rayCylinder(eye, ahead, 0, -10, 0.5, 0, 3)).toBeCloseTo(9.5);
  });
  it('misses above the top and to the side', () => {
    expect(rayCylinder(eye, ahead, 0, -10, 0.5, 0, 1)).toBe(Infinity);
    expect(rayCylinder(eye, ahead, 2, -10, 0.5, 0, 3)).toBe(Infinity);
  });
  it('misses things behind', () => {
    expect(rayCylinder(eye, ahead, 0, 10, 0.5, 0, 3)).toBe(Infinity);
  });
  it('hits the top cap from above', () => {
    const down = { x: 0, y: -1, z: 0 };
    expect(rayCylinder(eye, down, 0, 0, 0.5, 0, 1)).toBeCloseTo(0.7);
  });
});

describe('rayEnemies', () => {
  it('body shot at chest height, head shot at head height', () => {
    expect(rayEnemies({ x: 0, y: 1.2, z: 0 }, ahead, [zombie(-10)], 100).part).toBe('body');
    const hit = rayEnemies(eye, ahead, [zombie(-10)], 100);
    expect(hit.part).toBe('head');
    expect(hit.distance).toBeCloseTo(9.84);
  });
  it('takes the nearest of several', () => {
    const near = zombie(-5);
    expect(rayEnemies(eye, ahead, [zombie(-10), near], 100).enemy).toBe(near);
  });
  it('misses over the shoulder of the head', () => {
    expect(rayEnemies(eye, ahead, [zombie(-10, 0.25)], 100)).toBe(null);
  });
  it('respects max distance', () => {
    expect(rayEnemies(eye, ahead, [zombie(-10)], 5)).toBe(null);
  });
});

describe('rayBlockers', () => {
  it('a trunk in the way blocks, the ground stops downward shots', () => {
    expect(rayBlockers(eye, ahead, [{ x: 0, z: -4, r: 0.3 }], 100)).toBeCloseTo(3.7);
    const down = { x: 0, y: -0.6, z: -0.8 };
    expect(rayBlockers(eye, down, [], 100)).toBeCloseTo(1.7 / 0.6);
  });
  it('shots pass over a low rock', () => {
    expect(rayBlockers(eye, ahead, [{ x: 0, z: -4, r: 0.8, top: 1 }], 100)).toBe(100);
  });
});

describe('falloff', () => {
  it('is full, then linear, then the floor', () => {
    expect(falloff(5, 8, 25, 0.3)).toBe(1);
    expect(falloff(16.5, 8, 25, 0.3)).toBeCloseTo(0.65);
    expect(falloff(40, 8, 25, 0.3)).toBe(0.3);
  });
});

describe('spreadDirection', () => {
  it('stays inside the cone and is unit length', () => {
    const rng = new Rng(7);
    const out = { x: 0, y: 0, z: 0 };
    const spread = (6 * Math.PI) / 180;
    for (let i = 0; i < 200; i++) {
      spreadDirection(ahead, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, spread, rng, out);
      expect(Math.hypot(out.x, out.y, out.z)).toBeCloseTo(1);
      expect(Math.acos(-out.z)).toBeLessThanOrEqual(spread + 1e-9);
    }
  });
  it('zero spread is straight ahead', () => {
    const out = spreadDirection(ahead, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, 0, new Rng(1), {});
    expect(out.z).toBeCloseTo(-1);
  });
});

describe('meleeTarget', () => {
  const arc = (70 * Math.PI) / 180;
  it('hits a zombie in reach and in front', () => {
    const z = zombie(-1.5);
    expect(meleeTarget(eye, 0, -1, [z], 2.2, arc)).toBe(z);
  });
  it('misses one out of reach or behind', () => {
    expect(meleeTarget(eye, 0, -1, [zombie(-3)], 2.2, arc)).toBe(null);
    expect(meleeTarget(eye, 0, -1, [zombie(1.5)], 2.2, arc)).toBe(null);
  });
  it('picks the one nearest the centre of the swing', () => {
    const side = zombie(-1.2, 1);
    const centre = zombie(-1.8, 0.1);
    expect(meleeTarget(eye, 0, -1, [side, centre], 2.2, arc)).toBe(centre);
  });
});
