// Session 25 (Aaron: "I'd really love to shoot some of them"): the giant moths spike (ai/Moths.js).
import { describe, it, expect } from 'vitest';
import { config } from '../src/config.js';
import { spawnCount, cloudPoint, dartReached, hurtMoth, Moths } from '../src/ai/Moths.js';
import { rayEnemiesAll } from '../src/combat/hitscan.js';

const mc = config.spikes.moths;

describe('giant moths', () => {
  it('a swarm is 16, a big one 32, and never more than the renderer draws', () => {
    expect(mc.swarm).toBe(16);
    expect(mc.bigSwarm).toBe(32);
    expect(mc.bigSwarm).toBeLessThanOrEqual(config.moths.giant.poolSize);
    expect(spawnCount(0, 32, 16)).toBe(16);
    expect(spawnCount(20, 32, 16)).toBe(12);
    expect(spawnCount(32, 32, 16)).toBe(0);
  });

  it('mill in a cloud 3 to 5 m up round a point near Tom, each on its own orbit', () => {
    const slot = { angle: 1, radius: 3, height: 4, speed: 0.4, bob: 0.5 };
    const a = cloudPoint(10, 0, 20, slot, 0);
    const b = cloudPoint(10, 0, 20, slot, 2);
    expect(Math.hypot(a.x - 10, a.z - 20)).toBeCloseTo(3, 5);
    expect(a.y).toBeGreaterThan(3);
    expect(a.y).toBeLessThan(5);
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(0.5); // it moves round
    expect(mc.cloudHeight[0]).toBeGreaterThanOrEqual(3);
    expect(mc.cloudHeight[1]).toBeLessThanOrEqual(5);
  });

  it("a dart that reaches Tom's chest nips", () => {
    expect(dartReached({ x: 0.3, y: 1.4, z: 0.2 }, 0, mc.dartAt, 0, mc.nipRange)).toBe(true);
    expect(dartReached({ x: 3, y: 4, z: 0 }, 0, mc.dartAt, 0, mc.nipRange)).toBe(false);
  });

  it('a service rifle round drops one; a shotgun blast needs three pellets on one', () => {
    const w = config.weapons;
    expect(hurtMoth({ health: mc.health }, w.rifle.damage)).toBe(true);
    const m = { health: mc.health };
    expect(hurtMoth(m, w.shotgun.damage * 2)).toBe(false);
    expect(hurtMoth(m, w.shotgun.damage)).toBe(true);
    expect(hurtMoth(m, 10)).toBe(false); // already down
  });

  it("each moth is its own small target for the weapons, with no aim assist", () => {
    const sent = [];
    const ms = Object.create(Moths.prototype);
    ms.cfg = config;
    ms.mc = mc;
    ms.bus = null;
    ms.renderer = { update() {} };
    ms.combat = { weapons: { extraTargets: sent } };
    ms.scene = null;
    // init without a renderer: build the pool by hand as init does.
    Moths.prototype.init.call(Object.assign(ms, { renderer: null }), { scene: { add() {} }, player: { position: { x: 0, y: 0, z: 0 } }, combat: ms.combat, rng: { range: (a) => a, chance: () => true, int: (a) => a } });
    expect(sent.length).toBe(1);
    const group = sent[0].group;
    expect(group.length).toBe(config.moths.giant.poolSize);
    const t = group[0];
    expect(t.noAssist).toBe(true);
    expect(t.hitRadius).toBeLessThan(0.5);
    // A ray at a moth 6 m off hits it; one a metre to the side doesn't.
    Object.assign(t, { x: 0, y: 2, z: -6, targetable: true });
    const hits = [];
    expect(rayEnemiesAll({ x: 0, y: 2.35, z: 0 }, { x: 0, y: 0, z: -1 }, [t], Infinity, hits)).toBe(1);
    expect(rayEnemiesAll({ x: 1, y: 2.35, z: 0 }, { x: 0, y: 0, z: -1 }, [t], Infinity, hits)).toBe(0);
  });
});
