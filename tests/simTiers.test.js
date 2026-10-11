import { describe, it, expect } from 'vitest';
import { tierFor, capActive, nearbyStepDue } from '../src/ai/simTiers.js';
import { EnemyManager } from '../src/ai/EnemyManager.js';
import { EventBus } from '../src/core/EventBus.js';
import { Rng } from '../src/core/Rng.js';
import { SpatialGrid } from '../src/world/SpatialGrid.js';
import { makeMap, makeGround, config } from './mapFixture.js';

const lod = config.zombies.lod;

describe('simulation tiers (pure)', () => {
  it('sorts by distance: active, nearby, abstract', () => {
    expect(tierFor(undefined, 10, lod)).toBe('active');
    expect(tierFor(undefined, lod.activeRadius + 1, lod)).toBe('nearby');
    expect(tierFor(undefined, lod.nearbyRadius + 1, lod)).toBe('abstract');
  });

  it("doesn't flicker across a boundary (hysteresis)", () => {
    const justOut = lod.activeRadius + lod.hysteresis / 2;
    expect(tierFor('active', justOut, lod)).toBe('active');
    expect(tierFor('nearby', justOut, lod)).toBe('nearby');
    expect(tierFor('active', lod.activeRadius + lod.hysteresis + 1, lod)).toBe('nearby');
    const farEdge = lod.nearbyRadius + lod.hysteresis / 2;
    expect(tierFor('nearby', farEdge, lod)).toBe('nearby');
    expect(tierFor('abstract', farEdge, lod)).toBe('abstract');
  });

  it('keeps only the nearest active under the cap', () => {
    const list = [5, 40, 12, 30, 2].map((d) => ({ lodDistance: d, tier: 'active' }));
    expect(capActive(list, 3)).toBe(3);
    const active = list.filter((z) => z.tier === 'active').map((z) => z.lodDistance);
    expect(active.sort((a, b) => a - b)).toEqual([2, 5, 12]);
  });

  it('spreads nearby steps evenly over the frames', () => {
    const every = 3;
    for (let slot = 0; slot < every; slot++) {
      let n = 0;
      for (let f = 0; f < 30; f++) if (nearbyStepDue(f, slot, every)) n++;
      expect(n).toBe(10);
    }
  });
});

describe('EnemyManager with tiers', () => {
  const SEED = 3;

  function setup() {
    const map = makeMap(SEED);
    const ground = makeGround(SEED);
    const world = { map, ground, variantMixAt: () => ({ citizen: 1 }) };
    const em = new EnemyManager(config, new Rng(5), new EventBus(), world);
    em.init(new SpatialGrid(config.world.colliderCellSize));
    em.setLevel(1);
    return { em, map, ground };
  }

  const senses = (x, z, ground) => ({ x, z, eyeY: ground.heightAt(x, z) + 1.7, daylight: 0, torchOn: false, crouched: true, sprinting: false, speed: 0, undergrowth: 0 });

  // A pathway point near the middle of the map.
  function midPoint(map) {
    const path = map.paths[Math.floor(map.paths.length / 2)];
    return path.points[Math.floor(path.points.length / 2)];
  }

  it('the pool grows past the old 64 cap, up to population.max', () => {
    const { em, map, ground } = setup();
    const far = { x: -5000, z: -5000 };
    const n = em.populate(far, 200, 0);
    expect(n).toBeGreaterThanOrEqual(200);
    expect(em.pool.length).toBeGreaterThan(64);
    em.update(1 / 60, senses(far.x, far.z, ground));
    expect(em.livingCount).toBe(n);
    expect(em.tiers.abstract).toBe(n);
    em.populate(far, config.zombies.population.max * 2, 0);
    expect(em.pool.length).toBe(config.zombies.population.max);
    expect(em.activeCount).toBe(config.zombies.population.max);
    void map;
  });

  it('no more than activeCap are active; the rest nearby', () => {
    const { em, map, ground } = setup();
    const p = midPoint(map);
    for (let i = 0; i < 40; i++) em.spawnZombie(p.x + (i % 8) * 3, p.z + Math.floor(i / 8) * 3, { mode: 'wander' });
    em.update(1 / 60, senses(p.x, p.z, ground));
    expect(em.tiers.active).toBe(lod.activeCap);
    expect(em.tiers.nearby).toBe(40 - lod.activeCap);
    expect(em.activeList.length).toBe(lod.activeCap);
  });

  it('an abstract zombie walks the pathways about as far as a simulated one', () => {
    const run = (playerFar) => {
      const { em, map, ground } = setup();
      const p = midPoint(map);
      const z = em.spawnZombie(p.x, p.z, { mode: 'wander', facing: 0 });
      // The player is either right beside it (active) or off the map (abstract).
      const player = playerFar ? senses(-5000, -5000, ground) : senses(p.x + 1000, p.z + 1000, ground);
      let walked = 0;
      let lastX = z.x;
      let lastZ = z.z;
      let tiers = new Set();
      for (let i = 0; i < 60 * 40; i++) {
        if (!playerFar) {
          // Keep the player a few metres behind it so it stays active
          // without noticing them (crouched, torch off, night).
          player.x = z.x + 30;
          player.z = z.z + 30;
        }
        em.update(1 / 60, player);
        tiers.add(z.tier);
        walked += Math.hypot(z.x - lastX, z.z - lastZ);
        lastX = z.x;
        lastZ = z.z;
      }
      return { walked, tiers, mode: z.mode, speed: z.speed };
    };
    const real = run(false);
    const abstract = run(true);
    expect(real.tiers.has('active')).toBe(true);
    expect([...abstract.tiers]).toEqual(['abstract']);
    expect(abstract.mode).toBe('wander');
    // Wandering pace over 40 s: both should cover most of it.
    const expected = abstract.speed * config.zombies.wander.pace * 40;
    expect(abstract.walked).toBeGreaterThan(expected * 0.75);
    expect(abstract.walked).toBeLessThan(expected * 1.1);
    expect(Math.abs(abstract.walked - real.walked) / real.walked).toBeLessThan(0.25);
  });

  it('comes back to life as the player walks up: abstract, nearby, then active', () => {
    const { em, map, ground } = setup();
    const p = midPoint(map);
    const z = em.spawnZombie(p.x, p.z, { mode: 'wander' });
    em.update(1 / 60, senses(p.x + 400, p.z, ground));
    expect(z.tier).toBe('abstract');
    em.update(1 / 60, senses(z.x + 100, z.z, ground));
    expect(z.tier).toBe('nearby');
    em.update(1 / 60, senses(z.x + 20, z.z, ground));
    expect(z.tier).toBe('active');
  });

  it('a gunshot still turns abstract and nearby zombies within earshot', () => {
    const { em, map, ground } = setup();
    const p = midPoint(map);
    const z = em.spawnZombie(p.x, p.z, { mode: 'wander' });
    em.update(1 / 60, senses(p.x + 65, p.z, ground));
    expect(z.tier).toBe('nearby');
    expect(em.alert(p.x + 65, p.z, config.weapons.rifle.noise)).toBe(1);
    expect(z.mode).toBe('chase');
  });
});
