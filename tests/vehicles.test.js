import { describe, it, expect } from 'vitest';
import { placeVehicles, footprint, spotsOf, quadsOverlap, pickWeighted, ruleFor, toWorld } from '../src/world/vehiclePlacement.js';
import { stationLayout } from '../src/base/stationLayout.js';
import { rollLoot } from '../src/combat/loot.js';
import { Rng } from '../src/core/Rng.js';
import data from '../src/data/vehicles.json';
import loot from '../src/data/loot.json';
import { makeMap, makeGround, config } from './mapFixture.js';

const SEEDS = [1, 7, 1234, 99, 4242];
const vc = config.vehicles;

function place(seed) {
  const map = makeMap(seed);
  const ground = makeGround(seed);
  const layout = stationLayout(map.clearings[map.homeIndex], ground, config.station.layout);
  const avoid = [{ x: layout.centre.x, z: layout.centre.z, r: layout.radius + vc.placement.avoidRadius }];
  const off = config.landmarks.offset;
  const signs = map.clearings.map((c) => ({ x: c.x + off, z: c.z - off }));
  const list = placeVehicles(map, ground, data, vc, new Rng(seed).fork('vehicles').fork('placement'), avoid, signs);
  return { map, ground, layout, list, signs };
}

describe('vehicle data', () => {
  it('has the four agreed types, each with parts, lids, spots and loot from loot.json', () => {
    expect(Object.keys(data.types).sort()).toEqual(['army', 'pickup', 'police', 'sedan']);
    for (const t of Object.values(data.types)) {
      expect(t.size).toHaveLength(3);
      expect(t.parts.length).toBeGreaterThan(3);
      for (const lid of ['bonnet', 'boot', 'door']) expect(t.lids[lid].box).toHaveLength(6);
      for (const spot of ['door', 'boot', 'bonnet']) expect(typeof t.spots[spot]).toBe('string');
      for (const spot of ['door', 'boot']) {
        for (const entry of t.loot[spot]) expect(loot.items[entry.item], entry.item).toBeDefined();
      }
    }
  });

  it('only names types that exist in its placement weights', () => {
    for (const rule of Object.values(data.placement)) {
      for (const id of Object.keys(rule.weights ?? {})) expect(data.types[id], id).toBeDefined();
    }
  });
});

describe('placement helpers', () => {
  it('turns a vehicle-frame point into the world like the zombies do (forward = sin, cos)', () => {
    const v = { x: 10, z: 20, yaw: Math.PI / 2 };
    const ahead = toWorld(v, 0, 2);
    expect(ahead.x).toBeCloseTo(12);
    expect(ahead.z).toBeCloseTo(20);
    const right = toWorld(v, 1, 0);
    expect(right.x).toBeCloseTo(10);
    expect(right.z).toBeCloseTo(19);
  });

  it('separates footprints', () => {
    const a = footprint({ x: 0, z: 0, yaw: 0 }, 4, 2);
    expect(quadsOverlap(a, footprint({ x: 1, z: 1, yaw: 0.5 }, 4, 2))).toBe(true);
    expect(quadsOverlap(a, footprint({ x: 5, z: 0, yaw: 0 }, 4, 2))).toBe(false);
    expect(quadsOverlap(a, footprint({ x: 0, z: 4.5, yaw: 0 }, 4, 2))).toBe(false);
  });

  it('picks by weight and finds a clearing rule by encounter, then type, then default', () => {
    const rng = new Rng(5);
    const counts = { a: 0, b: 0 };
    for (let i = 0; i < 2000; i++) counts[pickWeighted({ a: 3, b: 1 }, rng)]++;
    expect(counts.a / 2000).toBeGreaterThan(0.7);
    expect(counts.a / 2000).toBeLessThan(0.8);
    expect(pickWeighted({}, rng)).toBeNull();
    expect(ruleFor({ key: 'campsite', kind: 'encounter', clearingType: 'bog' }, data.placement)).toBe(data.placement.campsite);
    expect(ruleFor({ key: 'clearing', kind: 'wild', clearingType: 'roadside' }, data.placement)).toBe(data.placement.roadside);
    expect(ruleFor({ key: 'clearing', kind: 'wild', clearingType: 'bog' }, data.placement)).toBe(data.placement.default);
  });
});

describe('placeVehicles', () => {
  it('places the same vehicles for the same seed', () => {
    const a = place(1234).list;
    const b = place(1234).list;
    expect(b).toEqual(a);
    expect(place(99).list).not.toEqual(a);
  });

  it('puts about 45 on a map (Aaron), never more than the cap', () => {
    let total = 0;
    for (const seed of SEEDS) {
      const n = place(seed).list.length;
      expect(n).toBeGreaterThanOrEqual(25);
      expect(n).toBeLessThanOrEqual(vc.placement.maxVehicles);
      total += n;
    }
    expect(total / SEEDS.length).toBeGreaterThan(35);
    expect(total / SEEDS.length).toBeLessThan(55);
  });

  it('always leaves a car with a battery and no alarm at the campsite next to home', () => {
    for (const seed of SEEDS) {
      const { list } = place(seed);
      const camp = list.filter((v) => v.place === 'campsite');
      expect(camp.length, `seed ${seed}`).toBe(1);
      expect(camp[0].battery).toBe(true);
      expect(camp[0].alarm).toBe(false);
    }
  });

  it('gives roughly the agreed share of batteries, and alarms only with a battery', () => {
    let n = 0;
    let withBattery = 0;
    for (const seed of SEEDS) {
      for (const v of place(seed).list) {
        n++;
        if (v.battery) withBattery++;
        if (v.alarm) expect(v.battery).toBe(true);
      }
    }
    expect(withBattery / n).toBeGreaterThan(0.45);
    expect(withBattery / n).toBeLessThan(0.78);
  });

  it('keeps every vehicle on open ground, on gentle slopes, clear of each other, the station, signs and the cliff', () => {
    const pc = vc.placement;
    for (const seed of SEEDS) {
      const { ground, layout, list, signs } = place(seed);
      const quads = [];
      for (const v of list) {
        const t = data.types[v.type];
        const [length, width] = t.size;
        expect(Math.hypot(v.x - layout.centre.x, v.z - layout.centre.z)).toBeGreaterThan(layout.radius + pc.avoidRadius);
        for (const s of signs) expect(Math.hypot(v.x - s.x, v.z - s.z)).toBeGreaterThan(pc.signClearance);
        for (const p of footprint(v, length, width)) {
          expect(ground.openAt(p.x, p.z), `${v.type} ${v.id} seed ${seed}`).toBeGreaterThanOrEqual(pc.openNeeded);
          expect(p.z).toBeGreaterThan(ground.cliffZ(p.x) + ground.geo.cliff.walkMargin);
        }
        // Its spots can be stood on.
        for (const p of Object.values(spotsOf(v, t, vc.spotOut))) expect(ground.openAt(p.x, p.z)).toBeGreaterThanOrEqual(pc.openNeeded);
        const front = toWorld(v, 0, length / 2);
        const back = toWorld(v, 0, -length / 2);
        expect(Math.abs(ground.heightAt(front.x, front.z) - ground.heightAt(back.x, back.z)) / length).toBeLessThanOrEqual(pc.maxSlope + 1e-9);
        const quad = footprint(v, length, width);
        for (const q of quads) expect(quadsOverlap(quad, q)).toBe(false);
        quads.push(quad);
      }
    }
  });

  it('lines roadblocks up at roadside clearings and checkpoints, and puts army trucks at checkpoints', () => {
    let roadside = 0;
    let checkpointArmy = 0;
    let checkpoint = 0;
    for (const seed of SEEDS) {
      for (const v of place(seed).list) {
        if (v.place === 'roadside') roadside++;
        if (v.place === 'checkpoint') {
          checkpoint++;
          if (v.type === 'army') checkpointArmy++;
        }
      }
    }
    expect(roadside).toBeGreaterThan(0);
    expect(checkpoint).toBeGreaterThan(0);
    expect(checkpointArmy / checkpoint).toBeGreaterThan(0.5);
  });

  it('rolls loot from each type and spot table', () => {
    const rng = new Rng(3);
    let anything = 0;
    for (const t of Object.values(data.types)) {
      for (const spot of ['door', 'boot']) {
        for (let i = 0; i < 20; i++) anything += rollLoot(t.loot[spot], rng).length;
      }
    }
    expect(anything).toBeGreaterThan(0);
  });
});
