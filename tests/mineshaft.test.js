// Session 30, batch 1: the abandoned mineshaft's surface (render/mineshaftModel.js,
// world/MineshaftSite.js, encounters/Mineshaft.js): the set, where it stands, the
// searches, the battery and the cage's lever.
import { describe, it, expect } from 'vitest';
import { config, makeMap } from './mapFixture.js';
import { buildMineshaft, MINESHAFT } from '../src/render/mineshaftModel.js';
import { mineshaftPlacement } from '../src/world/MineshaftSite.js';
import { Mineshaft, FLAGS, boxState } from '../src/encounters/Mineshaft.js';
import data from '../src/data/mineshaft.json';
import progressData from '../src/data/progress.json';
import cutscenes from '../src/data/cutscenes.json';
import encounters from '../src/data/encounters.json';
import vehicles from '../src/data/vehicles.json';

const mc = config.mineshaft;

describe("the mineshaft's surface set", () => {
  const model = buildMineshaft(mc, {});

  it('bakes into one mesh and three small pieces, within the tablet budget', () => {
    const tris = model.mesh.geometry.getAttribute('position').count / 3;
    expect(tris).toBeGreaterThan(1500);
    expect(tris).toBeLessThan(26000);
    expect(Object.keys(model.parts).sort()).toEqual(['battery', 'boxLamp', 'cageLamp']);
    expect(model.group.children.length).toBe(4);
  });

  it('has a spot for everything the beat uses', () => {
    for (const name of ['arrive', 'sign', 'box', 'lever', 'cage', 'gate', ...data.searches.map((s) => s.spot)]) expect(model.spots[name], name).toBeTruthy();
  });

  it('keeps every piece inside the radius it is drawn by', () => {
    const pos = model.mesh.geometry.getAttribute('position');
    let far = 0;
    for (let i = 0; i < pos.count; i++) far = Math.max(far, Math.hypot(pos.getX(i), pos.getZ(i)));
    expect(far).toBeLessThan(24);
  });

  it("leaves the office door, the cage's gate and the way to the lever open", () => {
    const O = MINESHAFT.office;
    const K = MINESHAFT.collar;
    const blocked = (x, z, r = 0.35) =>
      model.colliders.some((c) => {
        if (!c.seg) return Math.hypot(x - c.x, z - c.z) < c.r + r;
        const dx = c.bx - c.ax;
        const dz = c.bz - c.az;
        const t = Math.max(0, Math.min(1, ((x - c.ax) * dx + (z - c.az) * dz) / (dx * dx + dz * dz || 1)));
        return Math.hypot(x - (c.ax + dx * t), z - (c.az + dz * t)) < c.t + r;
      });
    expect(blocked(O.x0, O.door)).toBe(false); // through the doorway
    expect(blocked(O.x0, O.door + 1.5)).toBe(true); // the wall beside it
    expect(blocked((O.x0 + O.x1) / 2 - 0.5, O.door)).toBe(false); // the middle of the floor
    expect(blocked(K.x, K.z - K.half)).toBe(false); // the gate
    expect(blocked(K.x, K.z)).toBe(false); // in the cage
    expect(blocked(K.x, K.z + K.half)).toBe(true); // its back
    for (const name of ['desk', 'tags', 'lamps', 'locker', 'box', 'lever', 'army', 'cart']) expect(blocked(model.spots[name].x, model.spots[name].z, 0.3), name).toBe(false);
  });

  it('uses dull colours (the glare rule)', () => {
    const col = model.mesh.geometry.getAttribute('color');
    let max = 0;
    for (let i = 0; i < col.count; i++) max = Math.max(max, col.getX(i), col.getY(i), col.getZ(i));
    expect(max).toBeLessThan(0.3);
  });
});

describe('where the mineshaft stands', () => {
  it('is in its clearing on every seed, facing the way the path walks in', () => {
    for (const seed of [1234, 7, 99]) {
      const map = makeMap(seed);
      const p = mineshaftPlacement(map);
      const c = map.clearings.find((k) => k.key === 'mineshaft');
      expect(p, `seed ${seed}`).toBeTruthy();
      expect(p.x).toBe(c.x);
      expect(p.radius).toBe(22);
    }
  });

  it('is marked built, with no seeded vehicles in its clearing', () => {
    expect(config.landmarks.built).toContain('mineshaft');
    expect(vehicles.placement.mineshaft).toEqual({ count: [0, 0], chance: 0 });
    expect(encounters.encounters.find((e) => e.id === 'mineshaft').radius).toBe(22);
  });
});

describe("the mineshaft's data", () => {
  it('has a story flag for everything it saves', () => {
    const ids = new Set(progressData.flags.map((f) => f.id));
    for (const f of FLAGS) expect(ids.has(f), f).toBe(true);
    for (const s of data.searches) expect(FLAGS).toContain(s.flag);
  });

  it('has a hold for every search, and an arrival sweep', () => {
    for (const s of data.searches) expect(mc.encounter.holds[s.hold], s.id).toBeGreaterThan(0);
    const sweep = cutscenes.cutscenes.find((c) => c.id === 'sweep.mineshaft');
    expect(sweep.camera.every((k) => k.anchor === 'mineshaft')).toBe(true);
    expect(sweep.duration).toBeGreaterThan(sweep.camera.at(-1).at);
  });
});

// ---- the beat, with stand-ins -----------------------------------------------------------------

function make({ batteries = 0, flags = [] } = {}) {
  const model = buildMineshaft(mc, {});
  const spots = {};
  for (const [k, s] of Object.entries(model.spots)) spots[k] = { x: s.x, y: s.y, z: s.z };
  const shown = {};
  const site = { ready: true, place: { x: 0, z: 0, yaw: 0, radius: 22 }, spots, show: (n, on) => (shown[n] = on) };
  const set = new Set(flags);
  const said = [];
  const sounds = [];
  const inv = { batteries, scrap: 0, ammo: {}, kits: 0, useBattery() { if (this.batteries <= 0) return false; this.batteries -= 1; return true; }, addScrap(n) { this.scrap += n; }, addKits(k, n) { this.kits += n; return n; } };
  const player = { position: { x: 0, y: 0, z: -40 } };
  const played = [];
  const m = new Mineshaft(config, { on() {}, emit() {} });
  m.init({
    site,
    player,
    combat: { sfx: { play: (n) => sounds.push(n) }, inventory: inv, hud: { pickup() {} } },
    cutscenes: { active: false, namedAnchors: new Map(), play: (id) => played.push(id) },
    progress: { has: (f) => set.has(f), setFlag: (f, on = true) => (on ? set.add(f) : set.delete(f)) },
    notify: (t) => said.push(t),
  });
  const input = { activeDevice: 'gamepad', down: false, isDown() { return this.down; } };
  const at = (name) => Object.assign(player.position, { x: spots[name].x, z: spots[name].z });
  const hold = (seconds) => {
    input.down = true;
    for (let t = 0; t < seconds; t += 0.05) m.update(0.05, input, true, true);
    input.down = false;
    m.update(0.05, input, true, true);
  };
  return { m, set, said, sounds, shown, inv, player, played, input, at, hold };
}

describe("the mineshaft's beat on the surface", () => {
  it('knows what the control box offers', () => {
    expect(boxState(false, 0)).toBe('none');
    expect(boxState(false, 2)).toBe('fit');
    expect(boxState(true, 0)).toBe('live');
  });

  it('plays the arrival sweep once, as Tom comes up the track', () => {
    const t = make();
    t.m.update(0.1, t.input, true, true);
    expect(t.played).toEqual([]);
    t.at('arrive');
    t.m.update(0.1, t.input, true, true);
    t.m.update(0.1, t.input, true, true);
    expect(t.played).toEqual(['sweep.mineshaft']);
    expect(t.set.has('mineVisited')).toBe(true);
  });

  it('searches each place once and gives what it holds', () => {
    const t = make({ flags: ['mineVisited'] });
    for (const s of data.searches) {
      t.at(s.spot);
      t.m.update(0.05, t.input, true, true);
      expect(t.m.hud.prompt, s.id).toContain(s.prompt);
      t.hold(1.6);
      expect(t.set.has(s.flag), s.id).toBe(true);
    }
    expect(t.inv.scrap).toBe(mc.encounter.lamps.scrap);
    expect(t.inv.ammo.pistol).toBe(mc.encounter.locker.pistol);
    expect(t.inv.ammo.rifle).toBe(mc.encounter.army.rifle);
    expect(t.inv.kits).toBe(1);
    expect(t.said.length).toBe(data.searches.length);
  });

  it('keeps the cage dead until a battery is fitted, and uses one up', () => {
    const t = make({ flags: ['mineVisited'] });
    t.at('lever');
    t.m.update(0.05, t.input, true, true);
    expect(t.m.hud.prompt).toBe(data.cage.dead);
    t.at('box');
    t.m.update(0.05, t.input, true, true);
    expect(t.m.hud.prompt).toBe(data.box.none);
    t.hold(3);
    expect(t.set.has('mineBatteryFitted')).toBe(false);
    t.inv.batteries = 2;
    t.m.update(0.05, t.input, true, true);
    expect(t.m.hud.prompt).toContain(data.box.prompt);
    t.hold(2.4);
    expect(t.set.has('mineBatteryFitted')).toBe(true);
    expect(t.inv.batteries).toBe(1);
    expect(t.shown.battery).toBe(true);
    for (let i = 0; i < 30; i++) t.m.update(0.05, t.input, true, true);
    expect(t.shown.cageLamp).toBe(true);
    expect(t.said).toContain(data.box.done);
    expect(t.sounds).toContain('relayClack');
    expect(t.m.hud.prompt).toBe(data.box.live);
  });

  it('shows the battery and the lamps again after a load', () => {
    const t = make({ flags: ['mineVisited', 'mineBatteryFitted'] });
    expect(t.shown).toEqual({ battery: true, boxLamp: true, cageLamp: true });
    const u = make();
    expect(u.shown).toEqual({ battery: false, boxLamp: false, cageLamp: false });
  });
});
