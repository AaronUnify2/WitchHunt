// Build queue item 4: the missing quad and the mega night (encounters/MegaNight.js), scaffolding.
import { describe, it, expect } from 'vitest';
import { config } from '../src/config.js';
import { MegaNight, megaPlan, megaTotal, segmentAt, megaOver, MEGA_FLAGS } from '../src/encounters/MegaNight.js';
import { laterFlags } from '../src/debug/storyStart.js';
import dialogue from '../src/data/dialogue.json';
import progress from '../src/data/progress.json';

const M = config.megaNight;

describe('the plan', () => {
  it('is about 150 of the dead, in waves, with the three new kinds in them', () => {
    const plan = megaPlan(M);
    expect(plan.length).toBe(M.waves);
    const total = megaTotal(plan);
    expect(total).toBeGreaterThanOrEqual(140);
    expect(total).toBeLessThanOrEqual(165);
    expect(plan.reduce((n, w) => n + w.hollows, 0)).toBeGreaterThan(0);
    expect(plan.reduce((n, w) => n + w.screamers, 0)).toBeGreaterThan(0);
    expect(plan.reduce((n, w) => n + w.hanged, 0)).toBeGreaterThan(0);
    for (let i = 1; i < plan.length; i++) expect(plan[i].at - plan[i - 1].at).toBe(M.every);
    expect(plan.at(-1).at).toBeLessThan(M.timeout);
  });

  it('finds the fence panel at a bearing, wrap-around included', () => {
    const segs = [{ a0: 0.2, a1: 1.2 }, { a0: 1.2, a1: 2.4 }, { a0: 5.9, a1: 6.5 }];
    expect(segmentAt(segs, 0.5)).toBe(0);
    expect(segmentAt(segs, 2)).toBe(1);
    expect(segmentAt(segs, 6.0)).toBe(2);
    expect(segmentAt(segs, 0.1)).toBe(2); // past 2 pi
    expect(segmentAt(segs, 3.5)).toBe(-1);
  });

  it('ends when the last wave is in and few are left, or at its time', () => {
    const base = { sent: 6, waves: 6, left: 2, endLeft: 3, t: 100, timeout: 420 };
    expect(megaOver(base)).toBe(true);
    expect(megaOver({ ...base, left: 20 })).toBe(false);
    expect(megaOver({ ...base, sent: 5 })).toBe(false);
    expect(megaOver({ ...base, sent: 2, left: 60, t: 421 })).toBe(true);
  });
});

function rig(flags = ['blessingBuried']) {
  const set = new Set(flags);
  const lines = [];
  const said = [];
  const spawned = { planned: 0, zombies: [] };
  const handlers = {};
  const bus = { on: (e, fn) => { handlers[e] = fn; }, emit: (e, p) => handlers[e]?.(p) };
  const quad = { x: 400, z: 300, gone: false, riding: false, setGone(g) { this.gone = g; } };
  const segments = Array.from({ length: 8 }, (_, i) => ({ a0: (i * Math.PI) / 4, a1: ((i + 1) * Math.PI) / 4 }));
  const state = { segments: segments.map(() => ({ health: 100 })) };
  const enemies = { living: [], spawnPlanned: () => { spawned.planned++; return 1; }, spawnZombie: (x, z, o) => { const zb = { x, z, alive: true, ...o }; spawned.zombies.push(zb); return zb; } };
  const player = { position: { x: 0, y: 0, z: 0 } };
  let nights = 0;
  let dawns = 0;
  const m = new MegaNight(config, bus);
  m.init({ ground: { heightAt: () => 0 }, player, quad, station: { overrunEnabled: true, layout: { centre: { x: 0, z: 0 }, radius: 28, segments }, state }, enemies, world: { variantMixAt: () => ({}) }, clock: { phase: 'day' }, dialogue: { play: (id) => lines.push(id) }, subtitles: { busy: false }, progress: { has: (f) => set.has(f), setFlag: (f, on = true) => (on ? set.add(f) : set.delete(f)) }, notify: (t) => said.push(t), sfx: { play() {} }, skipToNight: () => nights++, skipToDawn: () => dawns++, rng: () => 0.25 });
  const tick = (s, dt = 0.1) => { for (let t = 0; t < s; t += dt) m.update(dt, true); };
  return { m, set, lines, said, spawned, quad, state, enemies, player, tick, bus, nights: () => nights, dawns: () => dawns };
}

describe('the beat, start to end', () => {
  it('the quad is gone the moment the Blessing is buried, and a ring marks where it stood', () => {
    const before = rig([]);
    expect(before.quad.gone).toBe(false);
    before.set.add('blessingBuried');
    before.bus.emit('cave:blessing');
    expect(before.quad.gone).toBe(true);
    expect(before.m.ring).toEqual({ x: 400, z: 300 });
    const loaded = rig(['blessingBuried']);
    expect(loaded.quad.gone).toBe(true);
  });

  it('finding the ring, the radio erupts; getting home starts the night', () => {
    const r = rig();
    r.player.position.x = 400;
    r.player.position.z = 303;
    r.tick(0.2);
    expect(r.set.has('quadMissing')).toBe(true);
    r.tick(M.callAfter + 0.3);
    expect(r.lines).toEqual(['mega.call.ellen']);
    expect(r.m.state).toBe('idle'); // still out at the ring
    r.player.position.x = M.startWithin - 5;
    r.player.position.z = 0;
    r.tick(0.2);
    expect(r.m.state).toBe('night');
    expect(r.nights()).toBe(1);
    expect(r.m.station.overrunEnabled).toBe(false); // (scaffolding: the station holds out tonight)
  });

  it('the waves come, the Hollow tears a panel down, the Screamer calls more, and dawn ends it', () => {
    const r = rig(['blessingBuried', 'quadMissing', 'megaNightCalled']);
    r.enemies.living = Array.from({ length: 10 }, () => ({ x: 5, z: 5, alive: true })); // the yard's full of them
    r.tick(M.firstAfter + M.every * (M.waves - 1) + 2);
    expect(r.m.sent).toBe(M.waves);
    expect(r.spawned.planned).toBeGreaterThanOrEqual(M.waves * M.perWave);
    const hollow = r.spawned.zombies.find((z) => z.authored === 'hollow');
    const screamer = r.spawned.zombies.find((z) => z.authored === 'screamer');
    expect(hollow.kind).toBe('mutant');
    expect(screamer.mode).toBe('linger');
    expect(r.spawned.zombies.some((z) => z.authored === 'hanged')).toBe(true);
    expect(r.lines).toContain('mega.screamer.ellen');
    // the Hollow reaches the wire due east (bearing pi / 2: the panel from pi/4... index 1 or 2)
    hollow.x = 29;
    hollow.z = 0.01;
    r.enemies.living = [hollow];
    const sentBefore = r.spawned.planned;
    r.tick(0.2);
    expect(r.state.segments.filter((s) => s.health === 0).length).toBe(1);
    expect(r.lines).toContain('mega.hollow.wyatt');
    r.tick(5);
    expect(r.state.segments.filter((s) => s.health === 0).length).toBe(1); // once
    // the Screamer dead: no more answer its call
    screamer.alive = false;
    for (const z of r.spawned.zombies) if (z.authored === 'screamer') z.alive = false;
    const p0 = r.spawned.planned;
    r.tick(20);
    expect(r.spawned.planned).toBe(p0);
    expect(p0).toBeGreaterThanOrEqual(sentBefore);
    expect(r.m.state).toBe('done'); // one left near home: under endLeft
    expect(r.dawns()).toBe(1);
    expect(r.m.station.overrunEnabled).toBe(true);
    expect(r.set.has('megaNightDone')).toBe(true);
    expect(r.lines.at(-1)).toBe('mega.after.ellen');
  });

  it('a night left unfinished starts over; the ring is saved', () => {
    const r = rig(['blessingBuried', 'quadMissing', 'megaNightCalled', 'megaNightStarted']);
    expect(r.set.has('megaNightStarted')).toBe(false);
    expect(r.m.saveState()).toEqual({ ring: { x: 400, z: 300 } });
    const again = rig([]);
    again.m.loadState({ ring: { x: 7, z: 9 } });
    expect(again.m.ring).toEqual({ x: 7, z: 9 });
  });

  it('the mothership gives it back rebuilt: the old quad stays gone, the ring goes', () => {
    const r = rig();
    r.m.returnQuad();
    expect(r.quad.gone).toBe(true); // Earl's quad as it was never comes back; the alien quad is the mothership's to place
    expect(r.set.has('quadReturned')).toBe(true);
    r.m.reset();
    expect(r.quad.gone).toBe(true);
  });
});

describe('its data', () => {
  it('flags, lines, start points', () => {
    const flags = progress.flags.map((f) => f.id);
    for (const f of [...MEGA_FLAGS, 'quadReturned']) expect(flags).toContain(f);
    const byId = new Map(dialogue.lines.map((l) => [l.id, l]));
    for (const id of ['mega.call.ellen', 'mega.first.wyatt', 'mega.hollow.wyatt', 'mega.screamer.ellen', 'mega.after.ellen', 'mega.after.ellen2', 'mega.after.wyatt']) expect(byId.get(id)?.draft).toBe(true);
    for (const l of dialogue.lines) if (l.next) expect(byId.has(l.next)).toBe(true);
    expect(laterFlags('ufo')).toContain('megaNightDone');
    expect(laterFlags('megaNight')).not.toContain('quadMissing');
    for (const f of laterFlags('ufo')) expect(flags).toContain(f);
  });
});
