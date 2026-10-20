// The first day (M9.2): the campsite's frame and layout, the order
// guarantee, the campers' car, the device's memory, cued lines, the
// cutscenes and the starting kit.
import { describe, it, expect } from 'vitest';
import { clearingFrame, frameToWorld, frameYaw, frameAnchor, frameEdge } from '../src/world/clearingFrame.js';
import { localToWorld, validateCutscenes } from '../src/story/cutsceneTimeline.js';
import { placeVehicles } from '../src/world/vehiclePlacement.js';
import { pickLine, hasNewLine } from '../src/story/dialoguePicker.js';
import { MetaStore } from '../src/meta/MetaStore.js';
import { Rng } from '../src/core/Rng.js';
import campsite from '../src/data/campsite.json';
import vehicleData from '../src/data/vehicles.json';
import dialogueData from '../src/data/dialogue.json';
import cutsceneData from '../src/data/cutscenes.json';
import lootData from '../src/data/loot.json';
import { makeMap, makeGround, config } from './mapFixture.js';

const map = makeMap(1);

describe("the campsite's frame", () => {
  const f = clearingFrame(map, 'campsite', 'home');

  it('is the same on every seed (the cluster is fixed)', () => {
    expect(clearingFrame(makeMap(77), 'campsite', 'home')).toEqual(f);
  });

  it('starts where the path from home walks in, and faces into the clearing', () => {
    expect(Math.hypot(f.entrance.x - f.x, f.entrance.z - f.z)).toBeCloseTo(f.radius, 1);
    const home = map.clearings[0];
    // The entrance is on home's side of the clearing.
    expect(Math.hypot(f.entrance.x - home.x, f.entrance.z - home.z)).toBeLessThan(Math.hypot(f.x - home.x, f.z - home.z));
    const e = frameToWorld(f, 0, -f.radius);
    expect(e.x).toBeCloseTo(f.entrance.x, 5);
    expect(e.z).toBeCloseTo(f.entrance.z, 5);
  });

  it("puts +x on your right as you walk in (seen from above, x east and z south)", () => {
    // Walking north (forward (0, -1)), your right is east (+x).
    const north = { x: 0, z: 0, radius: 10, fx: 0, fz: -1, rx: 1, rz: 0, yaw: Math.atan2(0, -1) };
    const r = clearingFrame({ clearings: [{ cluster: true, key: 'a', x: 0, z: 0, radius: 10 }, { cluster: true, key: 'b', x: 0, z: 100 }], paths: [] }, 'a', 'b');
    expect(r.fz).toBeCloseTo(north.fz);
    expect(r.rx).toBeCloseTo(1);
    expect(r.rz).toBeCloseTo(0);
    // Turning right lowers the yaw (rotation.y), so 90 degrees right faces east.
    const y = frameYaw(r, 90);
    expect(Math.sin(y)).toBeCloseTo(1);
    expect(Math.cos(y)).toBeCloseTo(0);
    // An edge point at 90 degrees is on the right.
    expect(frameEdge(r, 90).x).toBeCloseTo(10);
  });

  it('matches a cutscene anchor (x right, z ahead)', () => {
    const a = { ...frameAnchor(f), y: 0 };
    for (const [x, z] of [[3, 0], [0, 5], [-2, -7]]) {
      const w = frameToWorld(f, x, z);
      const c = localToWorld(a, [x, 0, z]);
      expect(c.x).toBeCloseTo(w.x, 5);
      expect(c.z).toBeCloseTo(w.z, 5);
    }
  });
});

describe('the campsite layout', () => {
  const f = clearingFrame(map, 'campsite', 'home');
  const ground = makeGround(1);
  const searches = Object.fromEntries(campsite.searches.map((s) => [s.id, s]));

  it('keeps everything inside the clearing', () => {
    for (const s of campsite.searches) expect(Math.hypot(s.x, s.z)).toBeLessThan(f.radius - 2);
    for (const t of campsite.tents) expect(Math.hypot(t.x, t.z)).toBeLessThan(f.radius - 3);
    expect(Math.hypot(campsite.car.x, campsite.car.z)).toBeLessThan(f.radius);
  });

  it('puts the camcorder near the entrance and the shotgun deep in (the order guarantee)', () => {
    const cam = campsite.searches.find((s) => s.gives?.some((g) => g.item === 'camcorder'));
    const gun = campsite.searches.find((s) => s.gives?.some((g) => g.item === 'shotgun'));
    const fromEntrance = (s) => Math.hypot(s.x, s.z + f.radius);
    expect(fromEntrance(cam)).toBeLessThan(fromEntrance(gun) - 8);
    expect(searches.cooler).toBe(cam);
  });

  it("guarantees a first aid kit and the scrap to patch the torn fence", () => {
    const gives = campsite.searches.flatMap((s) => s.gives ?? []);
    expect(gives.some((g) => g.item === 'firstAid')).toBe(true);
    const scrap = gives.filter((g) => g.item === 'scrap').reduce((n, g) => n + (g.amount ?? 1), 0);
    const sc = config.station;
    const torn = Object.entries(sc.fence.startHealth).reduce((n, [, h]) => n + Math.ceil((1 - h) * sc.costs.fenceRepair), 0);
    expect(config.inventory.startScrap + scrap).toBeGreaterThanOrEqual(torn);
  });

  it('names only real loot items', () => {
    const known = new Set([...Object.keys(lootData.items), 'camcorder', 'shotgun']);
    for (const s of campsite.searches) {
      for (const g of s.gives ?? []) expect(known).toContain(g.item);
      for (const l of s.loot ?? []) expect(known).toContain(l.item);
    }
  });

  it('parks the campers\' car by the path in, with a battery and no alarm', () => {
    const w = frameToWorld(f, campsite.car.x, campsite.car.z);
    const fixed = { campsite: [{ x: w.x, z: w.z, yaw: frameYaw(f, campsite.car.yaw) }] };
    const L = { x: map.clearings[0].x, z: map.clearings[0].z, r: 80 };
    const list = placeVehicles(map, ground, vehicleData, config.vehicles, new Rng(1).fork('vehicles').fork('placement'), [L], [], fixed);
    const car = list.find((v) => v.place === 'campsite');
    expect(car).toBeTruthy();
    expect(car.x).toBeCloseTo(w.x, 5);
    expect(car.z).toBeCloseTo(w.z, 5);
    expect(car.battery).toBe(true);
    expect(car.alarm).toBe(false);
  });

  it('sends the wave from the flanks, past the edge', () => {
    const wv = campsite.wave;
    expect(wv.count).toBeGreaterThanOrEqual(6);
    expect(wv.count).toBeLessThanOrEqual(8);
    for (const [a, b] of wv.arcs) {
      expect(Math.abs(a)).toBeGreaterThan(30); // not from the path in
      expect(Math.abs(b)).toBeGreaterThan(30);
    }
    expect(wv.beyondEdge[0]).toBeGreaterThan(0);
  });
});

describe("the device's memory (MetaStore)", () => {
  const store = () => {
    const m = new Map();
    return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
  };

  it('remembers the opening seen, and survives broken storage', () => {
    const s = new MetaStore(config.meta, store(), store());
    expect(s.introSeen).toBe(false);
    s.set('introSeen', true);
    expect(s.introSeen).toBe(true);
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => { throw new Error('blocked'); } };
    const b = new MetaStore(config.meta, broken, broken);
    expect(b.introSeen).toBe(false);
    expect(b.set('introSeen', true)).toBe(false);
    expect(b.takePendingChoice()).toBeNull();
  });

  it("carries the menu's choice across the reload, once", () => {
    const s = new MetaStore(config.meta, store(), store());
    s.setPendingChoice('skip');
    expect(s.takePendingChoice()).toBe('skip');
    expect(s.takePendingChoice()).toBeNull();
    s.setPendingChoice('nonsense');
    expect(s.takePendingChoice()).toBeNull();
  });
});

describe('Day 1 lines', () => {
  const lines = dialogueData.lines;
  const facts = (flags = []) => ({ night: 1, phase: 'day', flags: new Set(flags), milestones: [], scripts: new Set(['day1']) });

  it("never picks a cued line (the nudges, waking, the fence) by talking to the family", () => {
    for (const who of ['ellen', 'wyatt', 'junie']) {
      const line = pickLine(lines, who, facts(), new Set());
      if (line) expect(line.cued).toBeFalsy();
    }
    expect(hasNewLine(lines, 'wyatt', facts(), new Set())).toBe(false);
  });

  it("gives Junie her marker once the battery's in (lines 13 and 14)", () => {
    expect(hasNewLine(lines, 'junie', facts(), new Set())).toBe(false);
    expect(pickLine(lines, 'junie', facts(['day1Battery']), new Set()).id).toBe('day1.13');
  });

  it('has its nudges marked as drafts for Aaron', () => {
    const nudges = lines.filter((l) => l.id.startsWith('day1.nudge.'));
    expect(nudges.length).toBeGreaterThanOrEqual(4);
    for (const l of nudges) expect(l.draft && l.cued).toBe(true);
  });
});

describe("the first day's cutscenes", () => {
  it('are valid, and the new ones exist', () => {
    expect(validateCutscenes(cutsceneData.cutscenes, { looks: config.postFX.looks, lineIds: new Set(dialogueData.lines.map((l) => l.id)) })).toEqual([]);
    const ids = new Set(cutsceneData.cutscenes.map((c) => c.id));
    for (const id of ['menu.feed', 'opening.coldOpen', 'opening.wake', 'day1.tower', 'sweep.campsite', 'clip.camcorder', 'clip.night1']) expect(ids).toContain(id);
  });

  it('loops the menu feed and starts the waking from black', () => {
    const by = Object.fromEntries(cutsceneData.cutscenes.map((c) => [c.id, c]));
    expect(by['menu.feed'].loop).toBe(true);
    expect(by['opening.wake'].startBlack).toBe(true);
    expect(by['opening.wake'].tracks.some((t) => t.do === 'fade' && t.to === 0)).toBe(true);
  });
});

describe('the starting kit', () => {
  it("has no shotgun: it's the campsite's prize", () => {
    expect(config.weapons.startingLoadout).not.toContain('shotgun');
    expect(campsite.searches.some((s) => s.gives?.some((g) => g.item === 'shotgun'))).toBe(true);
  });
});
