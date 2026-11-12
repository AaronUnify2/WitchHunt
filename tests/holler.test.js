// Session 29, batch 1: the moonshiners' holler's ground (world/hollerGround.js), its set
// (render/hollerModel.js) and the set in the world (world/HollerSite.js).
import { describe, it, expect } from 'vitest';
import { makeMap, makeGround, config } from './mapFixture.js';
import { hollerFrame, liftAt, ridgeLift, floorMid, floorHalf, offFloor, toModel, toWorld } from '../src/world/hollerGround.js';
import { buildHoller, HOLLER } from '../src/render/hollerModel.js';
import { weatherFor, lumaOf } from '../src/render/propKit.js';
import vehicles from '../src/data/vehicles.json';
import encounters from '../src/data/encounters.json';

const hc = config.holler;
const gc = config.map.holler;
const model = buildHoller(hc, { weather: weatherFor(config.props.weather, hc.look.weather), ground: gc });
const SEEDS = [1234, 7, 4242];

describe("the holler's ground", () => {
  it('is a narrow floor between two ridges, closed at the head', () => {
    for (let z = gc.mouth; z < gc.head; z += 3) {
      expect(ridgeLift(gc, floorMid(gc, z), z)).toBe(0); // the floor
      const out = floorHalf(gc, z) + gc.faceRun + 2;
      expect(ridgeLift(gc, floorMid(gc, z) + out, z)).toBeGreaterThan(gc.height[0] * 0.7); // left ridge
      expect(ridgeLift(gc, floorMid(gc, z) - out, z)).toBeGreaterThan(gc.height[1] * 0.7); // right ridge
    }
    expect(ridgeLift(gc, floorMid(gc, gc.head), gc.head + gc.faceRun + 2)).toBeGreaterThan(gc.height[0] * 0.7); // the headwall
    expect(floorHalf(gc, -20)).toBeLessThan(5);
    expect(floorHalf(gc, 15)).toBeGreaterThan(9);
  });

  it('opens at the mouth: nothing before the ridges come down', () => {
    expect(ridgeLift(gc, 12, gc.mouth - gc.nose - 1)).toBe(0);
    expect(ridgeLift(gc, 12, gc.mouth - gc.nose / 2)).toBeLessThan(gc.height[0] * 0.6);
  });

  it('puts every seed into the ground: the floor flat, the ridges up, every other pathway through a gully', () => {
    for (const seed of SEEDS) {
      const map = makeMap(seed);
      const f = hollerFrame(map);
      expect(f, `seed ${seed}`).toBeTruthy();
      const ground = makeGround(seed);
      expect(ground.holler).toBeTruthy();
      const at = (x, z) => {
        const w = toWorld(f, x, z);
        return ground.heightAt(w.x, w.z);
      };
      // Up the hollow (mouth to halfway) both ridges stand; the other pathways come in nearer the yard.
      for (const z of [-24, -20, -16, -12]) {
        const floor = at(floorMid(gc, z), z);
        expect(at(floorMid(gc, z) + 13, z) - floor, `seed ${seed} left ${z}`).toBeGreaterThan(4);
        expect(at(floorMid(gc, z) - 13, z) - floor, `seed ${seed} right ${z}`).toBeGreaterThan(4);
      }
      // The pathway that walks in is on the floor where it crosses the mouth.
      const m = toModel(f, f.entrance.x, f.entrance.z);
      expect(Math.abs(m.z + f.radius)).toBeLessThan(0.5);
      expect(liftAt(f, gc, f.entrance.x, f.entrance.z)).toBeLessThan(0.5);
      // Each other pathway's points near the clearing are (nearly) on the ground's own level.
      for (const pts of f.paths) {
        for (const p of pts) {
          const d = Math.hypot(p.x - f.x, p.z - f.z);
          if (d > f.radius + 25) continue;
          expect(liftAt(f, gc, p.x, p.z), `seed ${seed} gully`).toBeLessThan(0.6);
        }
      }
    }
  });

  it('grows the forest back over the ridges (trees and undergrowth), the floor left open', () => {
    for (const seed of SEEDS) {
      const ground = makeGround(seed);
      const f = ground.holler;
      for (const z of [-22, -16]) {
        const floor = toWorld(f, floorMid(gc, z), z);
        const up = toWorld(f, floorMid(gc, z) + floorHalf(gc, z) + gc.wooded + 4, z);
        expect(ground.openAt(floor.x, floor.z), `seed ${seed} floor`).toBeGreaterThan(0.8);
        expect(ground.openAt(up.x, up.z), `seed ${seed} ridge`).toBeLessThan(0.2);
      }
    }
  });

  it('round-trips the frame', () => {
    const f = hollerFrame(makeMap(1234));
    const w = toWorld(f, 3, -7);
    const m = toModel(f, w.x, w.z);
    expect(m.x).toBeCloseTo(3);
    expect(m.z).toBeCloseTo(-7);
    expect(offFloor(gc, floorMid(gc, 0), 0)).toBe(0);
  });
});

describe("the holler's set", () => {
  it('is one mesh for the set, one for the traps, six small ones', () => {
    expect(model.group.children.length).toBe(8);
    expect(Object.keys(model.parts).sort()).toEqual(['autoShotgun', 'coil', 'cutters', 'fireGlow', 'needle', 'trapMap', 'traps']);
    const tris = model.group.children.reduce((n, m) => n + m.geometry.getAttribute('position').count / 3, 0);
    expect(tris).toBeGreaterThan(6000);
    expect(tris).toBeLessThan(30000);
  });

  it('adds no lights and keeps its colours dull (the glare rule)', () => {
    let lights = 0;
    model.group.traverse((o) => { if (o.isLight) lights++; });
    expect(lights).toBe(0);
    for (const [name, hex] of Object.entries(hc.look.colors)) expect(lumaOf(hex), name).toBeLessThan(0.45);
  });

  it('has every place the beat needs', () => {
    for (const s of ['arrive', 'middle', 'sign', 'agent', 'lookout', 'trapMap', 'cutters', 'still', 'damper', 'relief', 'line', 'gauge', 'coil', 'note', 'mash', 'jars', 'cabinet', 'ammo', 'spring', 'kin0', 'kin4']) expect(model.spots[s], s).toBeTruthy();
  });

  it('keeps everything inside the clearing', () => {
    const r = hc.radius;
    for (const [name, s] of Object.entries(model.spots)) expect(Math.hypot(s.x, s.z), name).toBeLessThan(r + 3);
  });

  it('lays out the traps: four kinds, two not on the map, the first already sprung', () => {
    expect(model.traps.length).toBe(hc.traps.length);
    expect(new Set(model.traps.map((t) => t.kind))).toEqual(new Set(['shotgun', 'cans', 'bear', 'snare']));
    expect(model.traps.filter((t) => !t.mapped).length).toBe(2);
    expect(model.traps[0].sprung).toBe(true);
    // Every trap sits on the floor, up the hollow from the mouth and short of the still.
    for (const t of model.traps) {
      expect(offFloor(gc, t.x, t.z), t.id).toBe(0);
      expect(t.z).toBeGreaterThan(gc.mouth);
      expect(t.z).toBeLessThan(HOLLER.still.z);
    }
    // Lines span the floor; guns aim back at them.
    for (const t of model.traps.filter((q) => q.a)) expect(Math.hypot(t.a.x - t.b.x, t.a.z - t.b.z), t.id).toBeGreaterThan(6);
    for (const t of model.traps.filter((q) => q.kind === 'shotgun')) expect(t.gun).toBeTruthy();
    // The unmapped ones are past the lookout (the map's found halfway: it's those after it that are out of date).
    for (const t of model.traps.filter((q) => !q.mapped)) expect(t.z).toBeGreaterThan(HOLLER.lookout.z);
  });

  it("shows one look per trap: armed folds the sprung run away, and back", () => {
    const pos = model.parts.traps.geometry.getAttribute('position');
    const run = (i, lk) => model.runs.find((r) => r.trap === i && r.look === lk);
    const live = (r) => pos.array.slice(r.start * 3, (r.start + r.count) * 3).some((v) => v !== 0);
    expect(live(run(1, 'armed'))).toBe(true);
    expect(live(run(1, 'sprung'))).toBe(false);
    expect(live(run(0, 'sprung'))).toBe(true);
    model.setTrap(1, 'sprung');
    expect(live(run(1, 'armed'))).toBe(false);
    expect(live(run(1, 'sprung'))).toBe(true);
    model.setTrap(1, 'armed');
    expect(live(run(1, 'armed'))).toBe(true);
  });

  it('leaves the shed open down its front and the floor walkable up the middle', () => {
    const blocked = (x, z) => model.colliders.some((c) => {
      if (!c.seg) return Math.hypot(x - c.x, z - c.z) < c.r;
      const dx = c.bx - c.ax;
      const dz = c.bz - c.az;
      const t = Math.max(0, Math.min(1, ((x - c.ax) * dx + (z - c.az) * dz) / (dx * dx + dz * dz || 1)));
      return Math.hypot(x - c.ax - dx * t, z - c.az - dz * t) < c.t;
    });
    const D = HOLLER.shed;
    expect(blocked((D.x0 + D.x1) / 2, D.z0 - 0.3)).toBe(false);
    for (let z = gc.mouth; z < 11; z += 0.5) expect(blocked(floorMid(gc, z), z), `z ${z}`).toBe(false);
    // The ledges at the faces' feet are solid.
    expect(blocked(floorMid(gc, -10) + floorHalf(gc, -10) + 0.7, -10)).toBe(true);
  });

  it('is in the world: no vehicles dealt there, no placeholder sign, a radius for the set', () => {
    expect(vehicles.clearings?.moonshinersHoller ?? vehicles.moonshinersHoller ?? JSON.stringify(vehicles).includes('"moonshinersHoller":{"count":[0,0]')).toBeTruthy();
    expect(JSON.stringify(vehicles)).toContain('"moonshinersHoller":{"count":[0,0],"chance":0}');
    expect(config.landmarks.built).toContain('moonshinersHoller');
    expect(encounters.encounters.find((e) => e.id === 'moonshinersHoller').radius).toBe(30);
  });
});
