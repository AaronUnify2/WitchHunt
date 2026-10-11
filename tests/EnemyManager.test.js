import { describe, it, expect } from 'vitest';
import { EnemyManager } from '../src/ai/EnemyManager.js';
import { EventBus } from '../src/core/EventBus.js';
import { Rng } from '../src/core/Rng.js';
import { SpatialGrid } from '../src/world/SpatialGrid.js';
import { makeMap, makeGround, config } from './mapFixture.js';

const SEED = 3;

function setup(mix = { citizen: 1 }) {
  const bus = new EventBus();
  const map = makeMap(SEED);
  const ground = makeGround(SEED);
  const world = { map, ground, variantMixAt: () => mix };
  const em = new EnemyManager(config, new Rng(1), bus, world);
  em.init(new SpatialGrid(config.world.colliderCellSize));
  // A spot in the middle of the map, on the ground.
  const c = map.clearings.find((cl) => cl.band === 'middle');
  const player = { x: c.x, z: c.z, eyeY: ground.heightAt(c.x, c.z) + 1.7, daylight: 0, torchOn: false, crouched: true, sprinting: false, speed: 0, undergrowth: 0 };
  return { em, bus, map, ground, player, c };
}

const raiseOpts = (mix) => ({ ringMin: 3, ringMax: 9, mix, mode: 'wander', rise: true });

describe('EnemyManager', () => {
  it('level 1 raises slow singles; level 5 raises hordes and mutants, never past the mutant cap', () => {
    const { em, c } = setup();
    em.setLevel(1);
    for (let i = 0; i < 40; i++) {
      const { plan } = em.spawnRaising(c.x, c.z, raiseOpts({ citizen: 1 }));
      expect(plan.type).toBe('single');
    }
    em.clear();
    em.setLevel(5);
    const seen = { single: 0, horde: 0, mutant: 0 };
    for (let i = 0; i < 60; i++) {
      seen[em.spawnRaising(c.x, c.z, raiseOpts({ citizen: 1 })).plan.type]++;
      if (em.activeCount > 40) em.clear();
      expect(em.mutantCount).toBeLessThanOrEqual(config.mutant.poolSize);
    }
    expect(seen.horde).toBeGreaterThan(5);
    expect(seen.mutant).toBeGreaterThan(0);
  });

  it('a horde is 7-15 slow zombies in a tight cluster', () => {
    const { em, c } = setup();
    const n = em.spawnPlanned({ type: 'horde', count: 12 }, c.x, c.z, raiseOpts({ citizen: 1 }));
    expect(n).toBe(12);
    const pack = em.pool.filter((z) => z.active);
    const h = config.zombies.horde;
    const sprint = config.zombies.sprintSpeed;
    for (const z of pack) {
      expect(z.horde).toBe(pack[0].horde);
      expect(z.speed).toBeGreaterThanOrEqual(h.speedMin * sprint - 1e-9);
      expect(z.speed).toBeLessThanOrEqual(h.speedMax * sprint + 1e-9);
      expect(Math.hypot(z.x - pack[0].x, z.z - pack[0].z)).toBeLessThan(h.radius * 2 + 1);
    }
    expect(pack[0].horde.leader).toBe(pack[0]);
  });

  it('mutants are big, tough and hit hard', () => {
    const { em, c } = setup();
    em.setLevel(3);
    em.spawnPlanned({ type: 'mutant', count: 1 }, c.x, c.z, raiseOpts({ citizen: 1 }));
    const m = em.pool.find((z) => z.active);
    expect(m.kind).toBe('mutant');
    expect(m.height).toBe(config.mutant.height);
    expect(m.maxHealth).toBeCloseTo(config.mutant.health * config.zombies.levels[3].health);
    expect(m.attackDamage).toBe(config.mutant.attackDamage);
    expect(m.hitRadius).toBe(config.mutant.hitRadius);
  });

  it('variants follow the mix and police and army are tougher', () => {
    const { em, c } = setup();
    for (let i = 0; i < 30; i++) em.spawnPlanned({ type: 'single', count: 1 }, c.x, c.z, raiseOpts({ police: 1 }));
    const zs = em.pool.filter((z) => z.active);
    expect(zs.every((z) => z.variant === 'police')).toBe(true);
    expect(zs[0].maxHealth).toBeCloseTo(config.zombies.health * config.zombies.variants.police.health);
  });

  it('changing the level changes every living zombie\'s speed at once', () => {
    const { em, c } = setup();
    em.setLevel(1);
    for (let i = 0; i < 10; i++) em.spawnPlanned({ type: 'single', count: 1 }, c.x, c.z, raiseOpts({ citizen: 1 }));
    const zs = em.pool.filter((z) => z.active);
    const slow = zs.map((z) => z.speed);
    em.setLevel(5);
    zs.forEach((z, i) => expect(z.speed).toBeGreaterThan(slow[i]));
    em.setLevel(1);
    zs.forEach((z, i) => expect(z.speed).toBeCloseTo(slow[i]));
  });

  it('swipes hurt more at higher levels', () => {
    const { em, bus, c } = setup();
    const hits = [];
    bus.on('enemy:strike', ({ damage }) => hits.push(damage));
    for (const level of [1, 5]) {
      em.clear();
      em.setLevel(level);
      em.spawnZombie(c.x + 1, c.z, { mode: 'chase' });
      const player = { x: c.x, z: c.z, eyeY: 1.7, daylight: 0, torchOn: false, crouched: false, sprinting: false, speed: 0, undergrowth: 0 };
      for (let t = 0; t < 2 && hits.length < (level === 1 ? 1 : 2); t += 0.05) em.update(0.05, player);
    }
    expect(hits[1]).toBeCloseTo(hits[0] * config.zombies.levels[5].damage);
  });

  it('a gunshot brings zombies in earshot; others carry on wandering', () => {
    const { em, player, c } = setup();
    const near = em.spawnZombie(c.x + 40, c.z, { mode: 'wander' });
    const far = em.spawnZombie(c.x + 200, c.z, { mode: 'wander' });
    em.update(0.05, player); // refresh the living list
    em.alert(player.x, player.z, config.weapons.rifle.noise);
    expect(near.mode).toBe('chase');
    expect(far.mode).toBe('wander');
  });

  it('raised zombies climb out of the ground, then wander off', () => {
    const { em, player, c } = setup();
    const z = em.spawnZombie(c.x + 60, c.z, { mode: 'wander', rise: true });
    expect(z.state).toBe('rise');
    expect(z.sink).toBe(1);
    for (let t = 0; t < 3; t += 0.05) em.update(0.05, player);
    expect(z.state).toBe('walk');
    expect(z.sink).toBe(0);
    expect(z.mode).toBe('wander');
  });

  it('at dawn most sink away, a few stay as stragglers, never in front of the player', () => {
    const { em, player, c } = setup();
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      em.spawnZombie(c.x + Math.sin(a) * 80, c.z + Math.cos(a) * 80, { mode: 'wander' });
    }
    const close = em.spawnZombie(c.x + 5, c.z, { mode: 'chase' });
    em.update(0.05, player);
    em.thinOut(10);
    for (let t = 0; t < 20; t += 0.1) em.update(0.1, player);
    const left = em.pool.filter((z) => z.alive);
    expect(left.length).toBeLessThan(15);
    expect(left).toContain(close);
    expect(left.filter((z) => z.straggler).length).toBeGreaterThan(0);
  });

  it('counts each sigil\'s living zombies, and forgets a dug-up sigil', () => {
    const { em, player, c } = setup();
    const sigil = {};
    for (let i = 0; i < 4; i++) em.spawnZombie(c.x + 50, c.z + i, { mode: 'wander', owner: sigil });
    em.update(0.05, player);
    expect(em.ownedCount(sigil)).toBe(4);
    em.disown(sigil);
    expect(em.ownedCount(sigil)).toBe(0);
  });
});
