// The flare gun (M9.1): a projectile that conks what it hits and burns
// where it lands; the newest burning flare lures zombies, never the witch.
import { describe, it, expect } from 'vitest';
import { stepFlare } from '../src/combat/flareFlight.js';
import { ZombieBrain } from '../src/ai/ZombieBrain.js';
import { PathRoutes } from '../src/ai/pathRoutes.js';
import { playerSenses } from '../src/ai/detection.js';
import { Inventory } from '../src/player/Inventory.js';
import { Rng } from '../src/core/Rng.js';
import { FLAT_GROUND } from '../src/world/collision.js';
import { makeMap, config } from './mapFixture.js';

const fc = config.flares;
const flat = { rayDistance: FLAT_GROUND.rayDistance, heightAt: () => 0 };

// Fire from (0, 1.6, 0) along +z, level, and step until it stops.
function fly(world, dir = { x: 0, y: 0, z: 1 }) {
  const f = { x: 0, y: 1.6, z: 0, vx: dir.x * fc.speed, vy: dir.y * fc.speed, vz: dir.z * fc.speed, age: 0 };
  for (let i = 0; i < 1000; i++) {
    const hit = stepFlare(f, 1 / 60, fc, { targets: [], blockers: [], ground: flat, ...world });
    if (hit) return { hit, f };
  }
  return { hit: null, f };
}

const zombieAt = (z) => ({ x: 0, y: 0, z, hitRadius: 0.35, height: 1.8, headBottom: 1.5, headRadius: 0.16 });

describe('a flare in flight', () => {
  it('flies fast and nearly flat, then lands on the ground well out', () => {
    const { hit } = fly({});
    expect(hit.kind).toBe('ground');
    expect(hit.y).toBeCloseTo(0, 1);
    expect(hit.z).toBeGreaterThan(25); // a level shot carries a good way before it drops in
  });

  it('conks a zombie it meets, at the head if aimed there', () => {
    const body = fly({ targets: [zombieAt(12)] }, { x: 0, y: -0.02, z: 1 });
    expect(body.hit.kind).toBe('target');
    expect(body.hit.part).toBe('body');
    const head = fly({ targets: [zombieAt(12)] }, { x: 0, y: 0.025, z: 1 }); // a touch high: it drops over 12 m
    expect(head.hit.kind).toBe('target');
    expect(head.hit.part).toBe('head');
    expect(head.hit.z).toBeLessThan(12);
  });

  it('drops short of a tree trunk it strikes', () => {
    const { hit } = fly({ blockers: [{ x: 0, z: 10, r: 0.4 }] });
    expect(hit.kind).toBe('solid');
    expect(hit.z).toBeLessThan(10 - 0.4);
  });

  it('goes through chain-link and past the player-only gates', () => {
    const fence = { seg: true, ax: -5, az: 8, bx: 5, bz: 8, t: 0.15, x: 0, z: 8, r: 5, blocksShots: false };
    const { hit } = fly({ blockers: [fence] });
    expect(hit.kind).toBe('ground');
    expect(hit.z).toBeGreaterThan(8);
  });

  it('fired straight up, climbs, arcs over and comes back down smoothly (Aaron)', () => {
    const f = { x: 0, y: 1.6, z: 0, vx: 0, vy: fc.speed * 0.995, vz: fc.speed * 0.1, age: 0 };
    let top = 0;
    let prevY = f.y;
    let biggestStep = 0;
    let hit = null;
    for (let i = 0; i < 2000 && !hit; i++) {
      hit = stepFlare(f, 1 / 60, fc, { targets: [], blockers: [], ground: flat });
      if (!hit) {
        top = Math.max(top, f.y);
        biggestStep = Math.max(biggestStep, Math.abs(f.y - prevY));
        prevY = f.y;
      }
    }
    expect(hit.kind).toBe('ground');
    expect(top).toBeGreaterThan(40);
    expect(f.age).toBeGreaterThan(4);
    expect(f.age).toBeLessThan(12);
    expect(prevY).toBeLessThan(1.5); // its last step in the air was just above the ground: no jump down
    expect(biggestStep).toBeLessThan(fc.speed / 60 + 0.01);
  });
});

describe('the lure', () => {
  const det = config.detection;
  const brain = () => new ZombieBrain(det, config.zombies.wander, new PathRoutes(makeMap(2)), FLAT_GROUND, new Rng(1));
  const senses = (x = 0, z = 0) => playerSenses({ x, z, eyeY: 1.7, daylight: 0, torchOn: true, crouched: false, sprinting: false, speed: 0, undergrowth: 0 }, det, 1);
  const run = (b, z, s, seconds) => {
    for (let t = 0; t < seconds; t += 0.1) {
      b.tick(0.1);
      b.update(z, 0.1, s);
    }
  };
  const lure = { x: 20, z: 0, radius: fc.lureRadius, mill: fc.lureMill, breakDistance: fc.lureBreakDistance };

  it('draws a chasing zombie off the player to mill about the flare', () => {
    const b = brain();
    const z = { x: 0, y: 0, z: 8, facing: Math.PI, alive: true };
    b.reset(z, 'chase');
    run(b, z, senses(), 0.5);
    expect(z.mode).toBe('chase');
    b.lure = lure;
    run(b, z, senses(), 1);
    expect(z.mode).toBe('lured');
    expect(Math.hypot(z.goalX - lure.x, z.goalZ - lure.z)).toBeLessThanOrEqual(fc.lureMill + 1e-6);
  });

  it("leaves zombies out of its reach alone", () => {
    const b = brain();
    b.lure = lure;
    const z = { x: 20 + fc.lureRadius + 10, y: 0, z: 0, facing: 0, alive: true };
    b.reset(z, 'wander');
    run(b, z, senses(500, 500), 1);
    expect(z.mode).toBe('wander');
  });

  it('still comes for you if you walk right up to it', () => {
    const b = brain();
    b.lure = lure;
    const z = { x: 21, y: 0, z: 0, facing: -Math.PI / 2, alive: true };
    b.reset(z, 'wander');
    run(b, z, senses(21 - 1.5, 0), 1);
    expect(z.mode).toBe('chase');
  });

  it('lets them go back to their errand when it burns out', () => {
    const b = brain();
    b.lure = lure;
    const z = { x: 25, y: 0, z: 0, facing: 0, alive: true };
    b.reset(z, 'march');
    run(b, z, senses(500, 500), 1);
    expect(z.mode).toBe('lured');
    b.lure = null;
    run(b, z, senses(500, 500), 1);
    expect(z.mode).toBe('march');
  });
});

describe('carrying flares', () => {
  it('starts with a few and never carries more than the limit', () => {
    const inv = new Inventory(config.inventory);
    inv.init();
    expect(inv.flares).toBe(config.inventory.startFlares);
    expect(inv.addFlares(5)).toBe(config.inventory.maxFlares - config.inventory.startFlares);
    expect(inv.flares).toBe(config.inventory.maxFlares);
  });
});
