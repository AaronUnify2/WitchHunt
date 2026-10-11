import { describe, it, expect } from 'vitest';
import { MarchRoutes } from '../src/ai/marchRoutes.js';
import { Revisits } from '../src/ai/revisits.js';
import { marchChance } from '../src/ai/ZombieDirector.js';
import { EnemyManager } from '../src/ai/EnemyManager.js';
import { EventBus } from '../src/core/EventBus.js';
import { Rng } from '../src/core/Rng.js';
import { SpatialGrid } from '../src/world/SpatialGrid.js';
import { makeMap, makeGround, config } from './mapFixture.js';

const homeOf = (map) => map.clearings.findIndex((c) => c.kind === 'home');

// Walk a march by hopping straight to each goal; returns metres walked.
function walk(routes, w) {
  let walked = 0;
  for (let i = 0; i < 5000 && !w.marchDone; i++) {
    routes.step(w, 0.5);
    walked += Math.hypot(w.goalX - w.x, w.goalZ - w.z);
    w.x = w.goalX;
    w.z = w.goalZ;
  }
  return walked;
}

describe('march routes', () => {
  for (const seed of [3, 11, 1234]) {
    it(`seed ${seed}: every clearing marches home by the shortest way`, () => {
      const map = makeMap(seed);
      const home = homeOf(map);
      const routes = new MarchRoutes(map, home);
      for (const c of map.clearings) {
        const w = { x: c.x, z: c.z };
        const walked = walk(routes, w);
        expect(w.marchDone).toBe(true);
        expect(Math.hypot(w.x - map.clearings[home].x, w.z - map.clearings[home].z)).toBeLessThan(1e-6);
        expect(walked).toBeCloseTo(routes.distance[c.id ?? map.clearings.indexOf(c)], 0);
      }
    });
  }

  it('from the middle of a pathway, it takes the shorter way and remaining() agrees', () => {
    const map = makeMap(3);
    const routes = new MarchRoutes(map, homeOf(map));
    for (const p of map.paths) {
      const pt = p.points[Math.floor(p.points.length / 2)];
      const w = { x: pt.x + 2, z: pt.z };
      const expected = routes.remaining(w.x, w.z);
      const walked = walk(routes, w);
      expect(Math.abs(walked - expected)).toBeLessThan(3);
    }
  });
});

describe('march odds', () => {
  it('about two thirds of the zombies raised march, whatever the group size', () => {
    const share = config.sigils.marchShare;
    for (const size of config.sigils.marchGroupSize) {
      const p = marchChance(share, size);
      expect(p).toBeGreaterThan(0);
      expect(p).toBeLessThan(1);
      const marching = p * size;
      expect(marching / (marching + (1 - p))).toBeCloseTo(share, 6);
    }
    expect(marchChance(1, 4)).toBe(1);
    expect(marchChance(0, 4)).toBe(0);
  });
});

describe('revisits', () => {
  const cfg = config.revisits;
  const clearing = { kind: 'encounter', x: 0, z: 0, radius: 20 };
  const other = { kind: 'wild', x: 500, z: 0, radius: 20 };
  const make = () => {
    const r = new Revisits(cfg, [clearing, other]);
    r.init();
    return r;
  };
  const far = cfg.triggerDistance + cfg.rearm + 10;

  it('fresh the first time; a few zombies when you come back at night, once a night', () => {
    const r = make();
    expect(r.update(far, 0, 1)).toEqual([]); // night 1, never been there
    expect(r.update(cfg.triggerDistance - 5, 0, 1)).toEqual([]);
    expect(r.update(5, 0, 1)).toEqual([]); // first visit: fresh
    expect(r.update(far, 0, 1)).toEqual([]); // leave
    expect(r.update(cfg.triggerDistance - 5, 0, 1)).toEqual([clearing]); // come back: due
    expect(r.update(far, 0, 1)).toEqual([]);
    expect(r.update(cfg.triggerDistance - 5, 0, 1)).toEqual([]); // not twice in a night
    expect(r.update(far, 0, 2)).toEqual([]);
    expect(r.update(cfg.triggerDistance - 5, 0, 2)).toEqual([clearing]); // the next night again
  });

  it('never by day, and only for the configured kinds', () => {
    const r = make();
    r.update(5, 0, null); // visit by day
    r.update(505, 0, null); // and the wild clearing
    r.update(far + 600, 0, null);
    expect(r.update(cfg.triggerDistance - 5, 0, null)).toEqual([]); // day: nothing
    expect(r.update(far + 600, 0, 3)).toEqual([]);
    expect(r.update(500 - cfg.triggerDistance + 5, 0, 3)).toEqual([]); // wild: not a kind that gets them
    expect(r.update(far + 600, 0, 3)).toEqual([]);
    expect(r.update(cfg.triggerDistance - 5, 0, 3)).toEqual([clearing]);
  });
});

describe('night marches through the tiers', () => {
  // The farthest sigil ground from home (by pathway).
  function farthestGround(map, routes) {
    let best = null;
    map.clearings.forEach((c, i) => {
      if (c.kind === 'sigilGround' && (!best || routes.distance[i] > routes.distance[best.i])) best = { c, i };
    });
    return best;
  }

  for (const seed of [3, 11, 1234]) {
    it(`seed ${seed}: a level 1 group from the farthest sigil ground reaches home within the night`, () => {
      const map = makeMap(seed);
      const ground = makeGround(seed);
      const em = new EnemyManager(config, new Rng(7), new EventBus(), { map, ground, variantMixAt: () => ({ citizen: 1 }) });
      em.init(new SpatialGrid(config.world.colliderCellSize));
      em.setLevel(1);
      const { c, i } = farthestGround(map, em.marches);
      const pack = { leader: null, radius: config.zombies.horde.radius };
      const group = [];
      for (let k = 0; k < 4; k++) {
        const z = em.spawnZombie(c.x + k, c.z, { mode: 'march', horde: pack });
        group.push(z);
      }
      em.formMarch(group, pack);
      // The player is far off the map, so the whole march is abstract.
      const player = { x: -5000, z: -5000, eyeY: 0, daylight: 0, torchOn: false, crouched: true, sprinting: false, speed: 0, undergrowth: 0 };
      const home = map.clearings[homeOf(map)];
      const night = config.clock.phases.find((p) => p.name === 'night').seconds;
      const baseRadius = config.station.siege.baseRadius;
      let arrived = Infinity;
      for (let t = 0; t < night * 2 && arrived === Infinity; t += 1 / 30) {
        em.update(1 / 30, player);
        if (Math.hypot(pack.leader.x - home.x, pack.leader.z - home.z) < baseRadius) arrived = t;
      }
      const distance = em.marches.distance[i];
      // Typical level 1 marcher at 2x, with time to spare in a 6-minute night.
      expect(arrived).toBeLessThan(night * 0.85);
      // And the group came along.
      for (const z of group) expect(Math.hypot(z.x - pack.leader.x, z.z - pack.leader.z)).toBeLessThan(25);
      void distance;
    });
  }
});

describe('unsticking', () => {
  it('a marcher with a parked car square across its way walks round it', () => {
    const map = makeMap(3);
    const ground = makeGround(3);
    const grid = new SpatialGrid(config.world.colliderCellSize);
    const em = new EnemyManager(config, new Rng(9), new EventBus(), { map, ground, variantMixAt: () => ({ citizen: 1 }) });
    em.init(grid);
    em.setLevel(1);
    const c = map.clearings.find((cl) => cl.band === 'middle');
    const z = em.spawnZombie(c.x, c.z, { mode: 'linger', linger: { x: c.x, z: c.z, r: 0 } });
    // A car-sized wall of circles 5 m ahead, across the way to a goal 15 m north.
    for (let i = -3; i <= 3; i++) grid.insert({ x: c.x + i * 0.9, z: c.z + 5, r: 1.2 });
    const player = { x: c.x + 40, z: c.z - 40, eyeY: 0, daylight: 0, torchOn: false, crouched: true, sprinting: false, speed: 0, undergrowth: 0 };
    let reached = false;
    for (let i = 0; i < 60 * 30 && !reached; i++) {
      z.goalX = c.x; // hold the goal fixed (lingering would pick new ones)
      z.goalZ = c.z + 15;
      z.hasGoal = true;
      em.update(1 / 60, player);
      reached = z.z > c.z + 9; // well past the car
    }
    expect(em.detours).toBeGreaterThan(0);
    expect(reached).toBe(true);
  });
});
