// Session 27, batch 1: the railway cutting's ground (world/railCutting.js), its set
// (render/railwayCuttingModel.js) and the set in the world (world/RailwayCuttingSite.js).
import { describe, it, expect } from 'vitest';
import { makeMap, makeGround, config } from './mapFixture.js';
import { bankLift, liftAt, toModel, toWorld, across, lineAt, gullyKeep } from '../src/world/railCutting.js';
import { buildRailwayCutting, trainLayout } from '../src/render/railwayCuttingModel.js';
import { storePlace } from '../src/world/RailwayCuttingSite.js';
import { weatherFor, lumaOf } from '../src/render/propKit.js';

const rc = config.railwayCutting;
const cut = config.map.railway.cutting;
const fakeGround = (X) => (Math.abs(X) > cut.floorHalf ? Math.min(6, (Math.abs(X) - cut.floorHalf) * 1.3) : 0);
const model = buildRailwayCutting(rc, { weather: weatherFor(config.props.weather, rc.look.weather), cut, heightAt: fakeGround });
const SEEDS = [1234, 7, 4242];

describe("the cutting's banks", () => {
  it('leave the floor flat, rise to their full height up the faces, and taper to the mouths', () => {
    expect(bankLift(cut, 1, 0, 0)).toBe(0);
    expect(bankLift(cut, 1, cut.floorHalf - 0.1, 0)).toBe(0);
    const top = bankLift(cut, 1, cut.floorHalf + cut.faceRun + 2, 0);
    expect(top).toBeGreaterThan(cut.height[1] * 0.8);
    expect(bankLift(cut, -1, -(cut.floorHalf + cut.faceRun + 2), 0)).toBeGreaterThan(cut.height[0] * 0.8);
    expect(bankLift(cut, 1, cut.floorHalf + cut.faceRun + 2, cut.length + cut.nose + 1)).toBe(0); // past the mouth
    expect(bankLift(cut, 1, cut.topOut + cut.outFade + 1, 0)).toBe(0); // back in the forest
  });

  it('are in the ground on every seed: the bed along the line stays at grade', () => {
    for (const seed of SEEDS) {
      const g = makeGround(seed);
      const f = g.cutting;
      expect(f, `seed ${seed}`).toBeTruthy();
      const y0 = g.heightAt(f.x, f.z);
      for (let Z = -20; Z <= 20; Z += 5) {
        const l = lineAt(f, Z);
        const w = toWorld(f, l.x, Z);
        expect(Math.abs(across(f, w.x, w.z)), `seed ${seed} Z ${Z}`).toBeLessThan(0.05);
        expect(liftAt(f, cut, w.x, w.z)).toBe(0);
        expect(Math.abs(g.heightAt(w.x, w.z) - y0), `seed ${seed} Z ${Z}`).toBeLessThan(1.5);
      }
    }
  });

  it("let every pathway down into the cutting (a gully where it crosses a bank)", () => {
    for (const seed of SEEDS) {
      const g = makeGround(seed);
      const f = g.cutting;
      expect(f.paths.length).toBeGreaterThan(0);
      for (const p of f.paths) {
        for (const q of p.points) {
          if (Math.hypot(q.x - f.x, q.z - f.z) > f.radius + 10) continue;
          expect(gullyKeep(f, cut, q.x, q.z), `seed ${seed}`).toBeLessThan(0.01);
          expect(liftAt(f, cut, q.x, q.z)).toBeLessThan(0.05);
        }
      }
    }
  });

  it('has a frame that converts both ways', () => {
    const f = makeGround(1234).cutting;
    const w = toWorld(f, 3, -7);
    const m = toModel(f, w.x, w.z);
    expect(m.x).toBeCloseTo(3, 6);
    expect(m.z).toBeCloseTo(-7, 6);
  });

  it('puts the powder store up on a full bank, clear of the gullies, on every seed', () => {
    for (const seed of SEEDS) {
      const g = makeGround(seed);
      const f = g.cutting;
      const keep = (X, Z) => { const w = toWorld(f, X, Z); return gullyKeep(f, cut, w.x, w.z); };
      const lift = (X, Z) => { const w = toWorld(f, X, Z); return liftAt(f, cut, w.x, w.z); };
      const s = storePlace(f, cut, keep, lift);
      expect([1, -1]).toContain(s.side);
      expect(keep(s.side * 13.2, s.z), `seed ${seed}`).toBeGreaterThan(0.95);
      expect(lift(s.side * 13.2, s.z)).toBeGreaterThan(3);
    }
  });

  it('keeps every other clearing where it was (the map unmoved: saves keep)', () => {
    const map = makeMap(1234);
    const c = map.clearings.find((k) => k.key === 'railwayCutting');
    expect(c).toBeTruthy();
    expect(c.radius).toBe(24);
  });
});

describe("the cutting's set", () => {
  it('is one mesh for the set and four small ones that change in play, no lights, within budget', () => {
    let meshes = 0;
    let lights = 0;
    model.group.traverse((o) => {
      if (o.isMesh) meshes++;
      if (o.isLight) lights++;
    });
    expect(meshes).toBe(5);
    expect(lights).toBe(0);
    expect(Object.keys(model.parts).sort()).toEqual(['cowcatcher', 'door', 'doorOpen', 'lantern']);
    const geo = model.mesh.geometry;
    expect(geo.getAttribute('color').count).toBe(geo.getAttribute('position').count);
    expect(geo.getAttribute('position').count / 3).toBeLessThan(40000);
    expect(model.parts.lantern.material.isMeshBasicMaterial).toBe(true); // a glow, not a light
  });

  it('keeps to the glare rule (every colour dull)', () => {
    for (const [name, hex] of Object.entries(rc.look.colors)) expect(lumaOf(hex), name).toBeLessThan(0.45);
  });

  it('lays the train out front to back with its gaps, the engine first', () => {
    const t = trainLayout(rc.train);
    expect(t.map((c) => c.kind)).toEqual(['engine', 'tender', 'coach', 'coach', 'baggage']);
    expect(t[0].z0).toBe(rc.train.front * rc.train.heading);
    for (let i = 1; i < t.length; i++) {
      expect(t[i].z0).toBeLessThan(t[i - 1].z1); // behind the one in front, a gap between
      expect(t[i - 1].z1 - t[i].z0).toBeCloseTo(t[i].gap, 6);
    }
  });

  it('has its places: the cab, the cowcatcher ahead, the lantern on the line, the maul, the coaches, the store', () => {
    for (const s of ['cab', 'cowcatcher', 'lantern', 'maul', 'coach1.trunk', 'coach1.rack', 'coach2.bag', 'coach2.doll', 'coach2.voice', 'baggageDoor', 'storeDoor', 'storeInside', 'stepsFoot', 'stepsTop']) expect(model.spots[s], s).toBeTruthy();
    expect(model.spots.lantern.z).toBeGreaterThan(model.spots.cowcatcher.z); // ahead of the engine
    expect(Math.abs(model.spots.storeDoor.x)).toBeGreaterThan(cut.floorHalf + cut.faceRun); // up on the bank
    expect(Math.abs(model.spots.stepsTop.x)).toBeGreaterThan(Math.abs(model.spots.stepsFoot.x));
  });

  it("gives each coach's inside as a room: inside its walls, room down the aisle", () => {
    for (const id of ['coach1', 'coach2']) {
      const r = model.rooms[id];
      expect(r, id).toBeTruthy();
      expect(r.hx).toBeLessThan(rc.train.coach.width / 2);
      expect(r.hz).toBeGreaterThan(4);
      // The aisle is clear its whole length for someone 0.35 m round.
      const blocked = r.blocks.filter(([x0, x1, z0, z1]) => x0 < 0.35 && x1 > -0.35 && z0 < 0 && z1 > 0);
      expect(blocked.length, id).toBeLessThanOrEqual(1);
    }
  });

  it('is solid: the rock faces, the train, the store; the store has a doorway', () => {
    const faces = model.colliders.filter((c) => c.face);
    expect(faces.length).toBeGreaterThan(8);
    expect(faces.every((c) => Math.abs(c.ax) > cut.floorHalf)).toBe(true);
    const segs = model.colliders.filter((c) => c.seg && !c.face);
    expect(segs.length).toBeGreaterThanOrEqual(10); // the cars and the store's five wall pieces
    expect(config.landmarks.built).toContain('railwayCutting'); // its signpost's gone
  });
});
