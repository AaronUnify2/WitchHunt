import { describe, it, expect } from 'vitest';
import { chooseSigilSpot, spotAllowed, distanceToPath } from '../src/ai/sigilPlanter.js';
import { Rng } from '../src/core/Rng.js';
import { makeMap, makeGround, config } from './mapFixture.js';

const cfg = config.planter;

// Plant like the stand-in witch, up to the cap, on one map.
function plantAll(seed, player = null) {
  const map = makeMap(seed);
  const ground = makeGround(seed);
  const rng = new Rng(`plant${seed}`);
  const sigils = [];
  for (let i = 0; i < config.sigils.cap; i++) {
    const spot = chooseSigilSpot(map, ground, sigils, player, cfg, rng, (id) => !sigils.some((s) => s.groundId === id));
    if (spot) sigils.push(spot);
  }
  return { map, sigils };
}

describe('the stand-in planter', () => {
  it('fills to five on every map tried, following the rules', () => {
    for (const seed of [1, 2, 3, 42, 77, 1234]) {
      const { map, sigils } = plantAll(seed);
      expect(sigils.length).toBe(5);
      const home = map.clearings[map.homeIndex];
      for (const s of sigils) {
        expect(Math.hypot(s.x - home.x, s.z - home.z)).toBeGreaterThanOrEqual(cfg.homeMinDistance);
        for (const o of sigils) if (o !== s) expect(Math.hypot(s.x - o.x, s.z - o.z)).toBeGreaterThanOrEqual(cfg.minGap);
        for (const c of map.clearings) {
          if (['home', 'hut', 'encounter'].includes(c.kind)) expect(Math.hypot(s.x - c.x, s.z - c.z)).toBeGreaterThanOrEqual(c.radius + cfg.keepOut);
        }
        if (s.groundId >= 0) {
          expect(map.clearings[s.groundId].kind).toBe('sigilGround');
        } else {
          // In the forest beside a pathway, not in a clearing.
          let nearest = Infinity;
          for (const p of map.paths) nearest = Math.min(nearest, distanceToPath(p.points, s.x, s.z));
          expect(nearest).toBeGreaterThan(cfg.pathOffset[0] * 0.7);
          expect(nearest).toBeLessThan(cfg.pathOffset[1] + 2);
        }
        expect(Number.isFinite(s.y)).toBe(true);
      }
      // No two on the same ground.
      const grounds = sigils.filter((s) => s.groundId >= 0).map((s) => s.groundId);
      expect(new Set(grounds).size).toBe(grounds.length);
    }
  });

  it('puts most plantings on sigil grounds', () => {
    let onGround = 0;
    let total = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const map = makeMap(seed);
      const ground = makeGround(seed);
      const rng = new Rng(`first${seed}`);
      // The first planting of a run, when every ground is free.
      const spot = chooseSigilSpot(map, ground, [], null, cfg, rng);
      total++;
      if (spot.groundId >= 0) onGround++;
    }
    expect(onGround / total).toBeGreaterThan(0.4);
    expect(onGround / total).toBeLessThan(0.85);
  });

  it('is the same from the same seed', () => {
    expect(plantAll(9).sigils).toEqual(plantAll(9).sigils);
  });

  it('keeps away from the player', () => {
    const map = makeMap(5);
    const g = map.clearings.find((c) => c.kind === 'sigilGround');
    const player = { x: g.x, z: g.z };
    expect(spotAllowed(g.x + 3, g.z, map, [], player, cfg)).toBe(false);
    const { sigils } = plantAll(5, player);
    for (const s of sigils) expect(Math.hypot(s.x - player.x, s.z - player.z)).toBeGreaterThanOrEqual(cfg.playerMinDistance);
  });
});

describe("the witch's cluster rule (M9.1): before the crossing, only inside the opening cluster", () => {
  const margin = config.witch.clusterPlantMargin;
  const plantInside = (seed, count) => {
    const map = makeMap(seed);
    const ground = makeGround(seed);
    const within = (x, z) => z < map.cluster.cordonZ - margin;
    const rng = new Rng(`cluster${seed}`);
    const sigils = [];
    const firsts = [];
    for (let i = 0; i < count; i++) {
      const spot = chooseSigilSpot(map, ground, sigils, null, cfg, rng, (id) => !sigils.some((s) => s.groundId === id), within);
      if (!spot) continue;
      if (i === 0) firsts.push(spot);
      sigils.push(spot);
    }
    return { map, sigils, firsts };
  };

  it('never plants south of the cordon, and still keeps her other rules', () => {
    for (const seed of [1, 2, 3, 42]) {
      const { map, sigils } = plantInside(seed, config.sigils.cap);
      expect(sigils.length).toBeGreaterThanOrEqual(3); // the cluster holds a few nights' worth
      const home = map.clearings[map.homeIndex];
      for (const s of sigils) {
        expect(s.z).toBeLessThan(map.cluster.cordonZ - margin);
        expect(Math.hypot(s.x - home.x, s.z - home.z)).toBeGreaterThanOrEqual(cfg.homeMinDistance);
      }
    }
  });

  it("usually goes to the cluster's own sigil ground while it's free", () => {
    let atGround = 0;
    const tries = 40;
    for (let seed = 0; seed < tries; seed++) {
      const { map, firsts } = plantInside(seed + 100, 1);
      const ground = map.clearings.find((c) => c.cluster && c.kind === 'sigilGround');
      if (firsts[0]?.groundId === ground.id) atGround++;
    }
    expect(atGround / tries).toBeGreaterThan(cfg.groundChance - 0.2);
  });
});
