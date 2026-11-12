// Build queue item 2: the bug-zapper night at the station (encounters/BugZapper.js), scaffolding.
import { describe, it, expect } from 'vitest';
import { config } from '../src/config.js';
import { BugZapper, zapperBlocked, wyattShotDue, ZAPPER_FLAGS } from '../src/encounters/BugZapper.js';
import dialogue from '../src/data/dialogue.json';
import progress from '../src/data/progress.json';
import cutscenes from '../src/data/cutscenes.json';

const Z = config.bugZapper;
const lineById = new Map(dialogue.lines.map((l) => [l.id, l]));

describe('calling the night', () => {
  it('needs the dozer home and the fence holding enough', () => {
    const base = { dozerHome: true, charge: 1000, capacity: 1000, need: Z.needCharge, started: false };
    expect(zapperBlocked(base)).toBeNull();
    expect(zapperBlocked({ ...base, dozerHome: false })).toMatch(/dozer/);
    expect(zapperBlocked({ ...base, charge: 1000 * Z.needCharge - 1 })).toMatch(/fence is at/);
    expect(zapperBlocked({ ...base, started: true })).toBe('started');
  });

  it("Wyatt's shots come every few seconds", () => {
    expect(wyattShotDue(Z.wyattEvery[0] - 0.1, Z.wyattEvery, 0)).toBe(false);
    expect(wyattShotDue(Z.wyattEvery[0], Z.wyattEvery, 0)).toBe(true);
    expect(wyattShotDue(Z.wyattEvery[1] - 0.1, Z.wyattEvery, 1)).toBe(false);
    // unhelped by Tom, his rifle alone ends it in a sane time
    const shots = Math.ceil(Z.hookedHealth / Z.wyattDamage);
    expect((shots * (Z.wyattEvery[0] + Z.wyattEvery[1])) / 2).toBeLessThan(90);
  });
});

function rig(flags = ['dozerHome']) {
  const set = new Set(flags);
  const lines = [];
  const said = [];
  const scenes = [];
  const state = { charge: 800, capacity: 1000 };
  const flyer = { active: false, p: { x: 5, y: 9, z: 5 }, health: 0, sent: 0, send(o) { this.sent++; this.active = true; this.opts = o; }, tether(at, o) { this.tethered = o; this.health = o.health; }, hit(n) { this.health -= n; if (this.health <= 0) { const d = this.tethered.onDown; this.tethered.onDown = null; d?.(); } }, stop() { this.active = false; } };
  const dozer = { winchExtras: [], winch: {}, x: 0, y: 0, z: 20 };
  const floors = new Map();
  const player = { position: { x: 1, y: 0, z: 0 }, riding: null };
  const z = new BugZapper(config, { on() {}, emit() {} });
  let nights = 0;
  z.init({ player, combat: { setHealthFloor: (k, f) => floors.set(k, f), clearHealthFloor: (k) => floors.delete(k) }, station: { state, layout: { fenceBox: { x: -6, z: 0 }, cabin: { frontDoor: { x: 6, z: 0 } }, centre: { x: 0, z: 10 }, radius: 28, tower: { x: 8, z: 12 } }, renderer: { pulseWire() {} } }, dozer, flyer, clock: { phase: 'day' }, cutscenes: { active: false, namedAnchors: new Map(), play: (id, o) => { scenes.push(id); o.onDone(); return true; } }, dialogue: { play: (id) => lines.push(id) }, progress: { has: (f) => set.has(f), setFlag: (f, on = true) => (on ? set.add(f) : set.delete(f)) }, notify: (t) => said.push(t), sfx: { play() {} }, skipToNight: () => nights++, rng: () => 0.5 });
  const input = { activeDevice: 'gamepad', down: false, isDown() { return this.down; } };
  const tick = (s) => { for (let t = 0; t < s; t += 0.05) z.update(0.05, input, true, true); };
  return { z, set, lines, said, scenes, state, flyer, dozer, floors, player, input, tick, nights: () => nights };
}

describe('the night, start to end', () => {
  it('the prompt at the fence box says why not, until the fence is up', () => {
    const r = rig();
    r.state.charge = 100;
    r.tick(0.1);
    expect(r.z.hud.prompt).toMatch(/fence is at 100 of 1000/);
    r.input.down = true;
    r.tick(3);
    expect(r.scenes).toEqual([]);
    r.input.down = false;
    r.state.charge = 600;
    r.tick(0.1);
    expect(r.z.hud.prompt).toMatch(/fire the lure flares/);
  });

  it('flares, night, the Mothman unbeatable, Tom floored, and the hook offered', () => {
    const r = rig();
    r.tick(0.1);
    r.input.down = true;
    r.tick(1.5);
    expect(r.scenes).toEqual(['zapper.flares']);
    expect(r.nights()).toBe(1);
    expect(r.set.has('zapperStarted')).toBe(true);
    expect(r.flyer.opts.unbeatable).toBe(true);
    expect(r.floors.get('bugZapper')).toBe(Z.floor);
    expect(r.dozer.winchExtras.length).toBe(1);
    expect(r.dozer.winchExtras[0].active).toBe(true);
    r.tick(1);
    expect(r.dozer.winchExtras[0].y).toBe(9); // it follows the flyer
    expect(r.z.hud.prompt).toBe('');
  });

  it("hooked, it can be hurt; Wyatt's rifle alone brings it down onto the fence, and the fence is drained", () => {
    const r = rig();
    r.z.start();
    r.tick(6);
    expect(r.lines).toContain('zapper.miss.wyatt');
    const health0 = r.flyer.health;
    r.dozer.winchExtras[0].onHook();
    expect(r.set.has('mothmanHooked')).toBe(true);
    expect(r.flyer.health).toBe(Z.hookedHealth);
    expect(health0).not.toBe(Z.hookedHealth);
    r.tick(120);
    expect(r.scenes).toEqual(['zapper.flares', 'zapper.fence']);
    expect(r.set.has('mothmanZapped')).toBe(true);
    expect(r.state.charge).toBe(0);
    expect(r.flyer.active).toBe(false);
    expect(r.dozer.winch).toBeNull();
    expect(r.floors.has('bugZapper')).toBe(false);
    expect(r.lines.at(-1)).toBe('zapper.after.ellen');
    expect(r.dozer.winchExtras[0].active).toBe(false);
  });

  it('a fight left unfinished starts again from the flares; a finished one stays done', () => {
    const r = rig(['dozerHome', 'zapperStarted', 'mothmanHooked']);
    expect(r.z.state).toBe('idle');
    expect(r.set.has('zapperStarted')).toBe(false);
    const done = rig(['dozerHome', 'zapperStarted', 'mothmanHooked', 'mothmanZapped']);
    expect(done.z.state).toBe('done');
    done.tick(1);
    expect(done.z.hud.prompt).toBe('');
  });
});

describe('its data', () => {
  it('lines, flags and the two scenes', () => {
    for (const id of ['zapper.flares.ellen', 'zapper.come.junie', 'zapper.miss.wyatt', 'zapper.hooked.wyatt', 'zapper.fence.wyatt', 'zapper.after.ellen', 'zapper.after.ellen2']) expect(lineById.get(id)?.draft).toBe(true);
    for (const l of dialogue.lines) if (l.next) expect(lineById.has(l.next)).toBe(true);
    const flags = progress.flags.map((f) => f.id);
    for (const f of ZAPPER_FLAGS) expect(flags).toContain(f);
    for (const id of ['zapper.flares', 'zapper.fence']) {
      const s = cutscenes.cutscenes.find((c) => c.id === id);
      expect(s.duration).toBeLessThan(9);
      for (const e of s.tracks) {
        expect(e.at).toBeLessThanOrEqual(s.duration);
        if (e.do === 'line') expect(lineById.has(e.line)).toBe(true);
      }
    }
  });
});
