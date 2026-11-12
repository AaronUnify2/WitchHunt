// Session 28, batch 1: the sawmill's set (render/sawmillModel.js) and the set in the world
// (world/SawmillSite.js).
import { describe, it, expect } from 'vitest';
import { makeMap, config } from './mapFixture.js';
import { buildSawmill, SAWMILL } from '../src/render/sawmillModel.js';
import { sawmillPlacement } from '../src/world/SawmillSite.js';
import { toWorld } from '../src/world/CrashSite.js';
import { weatherFor, lumaOf } from '../src/render/propKit.js';
import vehicles from '../src/data/vehicles.json';

const sc = config.sawmill;
const model = buildSawmill(sc, { weather: weatherFor(config.props.weather, sc.look.weather) });
const SEEDS = [1234, 7, 4242];

describe("the sawmill's set", () => {
  it('is one mesh for the set, one for the dead who get up, and four small ones', () => {
    expect(model.group.children.length).toBe(6);
    expect(Object.keys(model.parts).sort()).toEqual(['chainsaw', 'diary', 'headSaw', 'risers', 'smg']);
    const tris = model.group.children.reduce((n, m) => n + m.geometry.getAttribute('position').count / 3, 0);
    expect(tris).toBeGreaterThan(8000);
    expect(tris).toBeLessThan(32000);
  });

  it('adds no lights and keeps its colours dull (the glare rule)', () => {
    let lights = 0;
    model.group.traverse((o) => { if (o.isLight) lights++; });
    expect(lights).toBe(0);
    for (const [name, hex] of Object.entries(sc.look.colors)) expect(lumaOf(hex), name).toBeLessThan(0.45);
  });

  it('has every place the beat needs', () => {
    for (const s of ['arrive', 'middle', 'boot', 'agent', 'bunkDoor', 'bunkInside', 'bunks', 'case', 'brass', 'drag', 'tarps', 'pit', 'carriage', 'headSaw', 'engine', 'chainsaw', 'deck', 'pinned', 'desk', 'bench']) expect(model.spots[s], s).toBeTruthy();
  });

  it('keeps everything inside the clearing', () => {
    const r = sc.radius;
    for (const [name, s] of Object.entries(model.spots)) expect(Math.hypot(s.x, s.z), name).toBeLessThan(r);
    for (const c of model.colliders) {
      if (c.seg) expect(Math.max(Math.hypot(c.ax, c.az), Math.hypot(c.bx, c.bz))).toBeLessThan(r);
      else expect(Math.hypot(c.x, c.z)).toBeLessThan(r);
    }
  });

  it('lays out the dead who get up: the five under the tarps, the night shift, three agents', () => {
    const by = (k) => model.risers.filter((r) => r.kind === k).length;
    expect(by('logger')).toBe(SAWMILL.tarps.count + 4);
    expect(by('mib')).toBe(3);
    expect(model.risers.filter((r) => r.group === 'tarps').length).toBe(SAWMILL.tarps.count);
    let at = 0;
    for (const r of model.risers) {
      expect(r.start).toBe(at);
      expect(r.count).toBeGreaterThan(30);
      at += r.count;
    }
    expect(at).toBe(model.parts.risers.geometry.getAttribute('position').count);
  });

  it('folds one body away when it gets up, and lays them all back', () => {
    const pos = model.parts.risers.geometry.getAttribute('position');
    const r = model.risers[2];
    const before = pos.array.slice(r.start * 3, (r.start + r.count) * 3);
    model.hideRiser(2);
    expect(pos.array.slice(r.start * 3, (r.start + r.count) * 3).every((v) => v === 0)).toBe(true);
    const other = model.risers[3];
    expect(pos.array.slice(other.start * 3, other.start * 3 + 9).some((v) => v !== 0)).toBe(true);
    model.showRisers();
    expect(Array.from(pos.array.slice(r.start * 3, (r.start + r.count) * 3))).toEqual(Array.from(before));
  });

  it("leaves the bunkhouse's doorway and the shed's front open", () => {
    const K = SAWMILL.bunk;
    const blocked = (x, z) => model.colliders.some((c) => {
      if (!c.seg) return Math.hypot(x - c.x, z - c.z) < c.r;
      const dx = c.bx - c.ax;
      const dz = c.bz - c.az;
      const t = Math.max(0, Math.min(1, ((x - c.ax) * dx + (z - c.az) * dz) / (dx * dx + dz * dz || 1)));
      return Math.hypot(x - c.ax - dx * t, z - c.az - dz * t) < c.t;
    });
    expect(blocked(K.x0, K.door)).toBe(false);
    expect(blocked(K.x0, K.door + 2)).toBe(true);
    const M = SAWMILL.shed;
    expect(blocked(M.x0 + 2.2, M.z0)).toBe(false);
    expect(blocked(3.1, 5.5)).toBe(false); // the man with the chainsaw in him
    expect(blocked(SAWMILL.saw.x - 0.2, SAWMILL.saw.z - 2.2)).toBe(false);
  });

  it('stands in its clearing on every seed, facing the way the path comes in', () => {
    for (const seed of SEEDS) {
      const map = makeMap(seed);
      const p = sawmillPlacement(map);
      const c = map.clearings.find((k) => k.key === 'sawmill');
      expect(Boolean(p), `seed ${seed}`).toBe(Boolean(c));
      if (!p) continue;
      expect(p.x).toBe(c.x);
      const a = toWorld(p, 0, -c.radius);
      const path = map.paths.find((q) => map.clearings[q.a] === c || map.clearings[q.b] === c);
      const near = Math.min(...path.points.map((q) => Math.hypot(q.x - a.x, q.z - a.z)));
      expect(near, `seed ${seed}`).toBeLessThan(6);
    }
  });

  it('has no signpost and no parked pickups in the way', () => {
    expect(config.landmarks.built).toContain('sawmill');
    expect(vehicles.spawns?.sawmill?.count ?? vehicles.clearings?.sawmill?.count ?? [0, 0]).toEqual([0, 0]);
  });
});
