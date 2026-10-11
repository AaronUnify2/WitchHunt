import { describe, it, expect } from 'vitest';
import { rayCylinder, rayBlockers, rayEnemies, falloff, spreadDirection, meleeTarget, rayEnemiesAll, partMultiplier, meleeFromBehind } from '../src/combat/hitscan.js';
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

describe('rayEnemiesAll (penetration)', () => {
  it('returns every zombie in the line, nearest first', async () => {
    const { rayEnemiesAll } = await import('../src/combat/hitscan.js');
    const out = [];
    const far = zombie(-12);
    const near = zombie(-4);
    const mid = zombie(-8);
    const n = rayEnemiesAll({ x: 0, y: 1.2, z: 0 }, ahead, [far, near, mid, zombie(-6, 3)], 100, out);
    expect(n).toBe(3);
    expect(out.slice(0, n).map((h) => h.enemy)).toEqual([near, mid, far]);
    expect(out[0].part).toBe('body');
  });

  it('stops at a blocker distance and reuses its output array', async () => {
    const { rayEnemiesAll } = await import('../src/combat/hitscan.js');
    const out = [];
    expect(rayEnemiesAll(eye, ahead, [zombie(-4), zombie(-8)], 6, out)).toBe(1);
    const first = out[0];
    rayEnemiesAll(eye, ahead, [zombie(-4)], 100, out);
    expect(out[0]).toBe(first);
    expect(out[0].part).toBe('head');
  });
});

describe('hitscan on hills', () => {
  it('hits a zombie standing on higher ground by its own height', () => {
    const eye = { x: 0, y: 1.7, z: 0 };
    const zombie = { x: 0, y: 2, z: -10, hitRadius: 0.3, height: 1.8, headBottom: 1.42, headRadius: 0.16 };
    const level = { x: 0, y: 0, z: -1 };
    expect(rayEnemies(eye, level, [zombie], 100)).toBeNull(); // passes under its feet
    const up = { x: 0, y: 0.15, z: -1 }; // about 3.2 m up at the zombie: its body
    const len = Math.hypot(up.y, up.z);
    const hit = rayEnemies(eye, { x: 0, y: up.y / len, z: up.z / len }, [zombie], 100);
    expect(hit?.enemy).toBe(zombie);
  });

  it('stops shots at the ground it is given', () => {
    const wall = { rayDistance: (o, d, max) => Math.min(max, 7) };
    expect(rayBlockers({ x: 0, y: 1.7, z: 0 }, { x: 0, y: 0, z: -1 }, [], 100, wall)).toBe(7);
  });

  it('lets a rock block only between its base and top', () => {
    const rock = { x: 0, z: -4, r: 0.8, base: 3, top: 4 };
    expect(rayBlockers({ x: 0, y: 1.7, z: 0 }, { x: 0, y: 0, z: -1 }, [rock], 100)).toBe(100);
    expect(rayBlockers({ x: 0, y: 3.5, z: 0 }, { x: 0, y: 0, z: -1 }, [rock], 100)).toBeCloseTo(3.2);
  });
});

describe('weak spots (the mutant)', () => {
  // A mutant at the origin facing +z, with its spot on its back (toward -z).
  const mutant = {
    x: 0, y: 0, z: 0, facing: 0, hitRadius: 0.55, height: 2.5, headBottom: 2.02, headRadius: 0.26,
    headshotMultiplier: 4,
    weakSpot: { multiplier: 8, back: 0.44, height: 1.85, radius: 0.24, meleeBehindDegrees: 50 },
  };

  it('a shot from behind at the spot hits it; from the front it hits the body', () => {
    const fromBehind = rayEnemies({ x: 0, y: 1.85, z: -10 }, { x: 0, y: 0, z: 1 }, [mutant], 50);
    expect(fromBehind.part).toBe('weak');
    const fromFront = rayEnemies({ x: 0, y: 1.85, z: 10 }, { x: 0, y: 0, z: -1 }, [mutant], 50);
    expect(fromFront.part).toBe('body');
    // From behind but low: the body, not the spot.
    expect(rayEnemies({ x: 0, y: 0.8, z: -10 }, { x: 0, y: 0, z: 1 }, [mutant], 50).part).toBe('body');
  });

  it('turns with the mutant', () => {
    const turned = { ...mutant, facing: Math.PI }; // facing -z: its back is toward +z
    expect(rayEnemies({ x: 0, y: 1.85, z: 10 }, { x: 0, y: 0, z: -1 }, [turned], 50).part).toBe('weak');
    const hits = [];
    rayEnemiesAll({ x: 0, y: 1.85, z: 10 }, { x: 0, y: 0, z: -1 }, [turned], 50, hits);
    expect(hits[0].part).toBe('weak');
  });

  it('is worth 8x; the mutant\'s headshots 4x; other zombies keep the default', () => {
    expect(partMultiplier(mutant, 'weak', 3)).toBe(8);
    expect(partMultiplier(mutant, 'head', 3)).toBe(4);
    expect(partMultiplier(mutant, 'body', 3)).toBe(1);
    expect(partMultiplier({ headshotMultiplier: null }, 'head', 3)).toBe(3);
    expect(partMultiplier({}, 'weak', 3)).toBe(1);
  });

  it('a shovel swing from behind lands on the spot', () => {
    expect(meleeFromBehind({ x: 0, z: -1.5 }, mutant)).toBe(true);
    expect(meleeFromBehind({ x: 0.8, z: -1.5 }, mutant)).toBe(true); // about 28 degrees off
    expect(meleeFromBehind({ x: 1.5, z: 0 }, mutant)).toBe(false); // its side
    expect(meleeFromBehind({ x: 0, z: 1.5 }, mutant)).toBe(false); // in front
    expect(meleeFromBehind({ x: 0, z: -1.5 }, { ...mutant, weakSpot: null })).toBe(false);
  });
});
