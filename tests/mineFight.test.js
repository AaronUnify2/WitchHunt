// Session 30, batch 3: what comes at Tom on the ride down (encounters/MineFight.js): the miners, the
// beetles, the cart into them; and the giant moths' real behaviour (ai/Moths.js): roosts, waking,
// scattering, the stream down the drift.
import { describe, it, expect } from 'vitest';
import { config } from './mapFixture.js';
import { make } from './mineFixture.js';
import { MineFight, due, roostPlaces, rammed } from '../src/encounters/MineFight.js';
import { ID } from '../src/encounters/MineRide.js';
import { Moths, scatterSplit, streamSlot } from '../src/ai/Moths.js';
import { buildTrack, nearest, halfAt } from '../src/world/mineTrack.js';
import data from '../src/data/mineshaft.json';
import loot from '../src/data/loot.json';

const mc = config.mineshaft;
const fc = mc.fight;
const rc = mc.ride;
const track = buildTrack(mc.track);

describe("the fight's script (pure)", () => {
  it('fires each entry once, as the cart reaches it', () => {
    const fired = new Set();
    expect(due(fc.script, 0, fired)).toEqual([]);
    const first = due(fc.script, fc.script[0].at, fired);
    expect(first).toEqual([0]);
    first.forEach((i) => fired.add(i));
    expect(due(fc.script, fc.script[0].at + 1, fired)).toEqual([]);
    expect(due(fc.script, 1000, fired).length).toBe(fc.script.length - 1);
  });

  it('puts everything ahead of the cart, in the tunnel, far enough off to be seen coming', () => {
    for (const e of fc.script) {
      for (const [s, lat] of [...(e.miners ?? []), ...(e.beetles ?? [])]) {
        expect(s - e.at, `at ${e.at}`).toBeGreaterThan(20);
        expect(s).toBeLessThan(rc.end);
        expect(Math.abs(lat)).toBeLessThan(halfAt(track, s) - 0.3);
      }
      if (e.roost) {
        expect(e.roost.s[0] - e.at).toBeGreaterThan(fc.moths.wake + 5); // hung before the cart wakes it
        expect(e.roost.s[1]).toBeLessThan(rc.end);
      }
    }
    for (const [id, st] of Object.entries(fc.stops)) {
      const stop = rc.stops.find((q) => q.id === id);
      for (const w of st.waves) for (const [s] of w.miners) expect(Math.abs(s - stop.s), id).toBeGreaterThan(8); // not on top of him
    }
  });

  it('never asks for more moths at once than the renderer draws', () => {
    const roosts = [...fc.script.filter((e) => e.roost).map((e) => e.roost), ...Object.values(fc.stops).filter((s) => s.roost).map((s) => s.roost)];
    expect(roosts.length).toBe(3);
    for (const r of roosts) expect(r.count).toBeLessThanOrEqual(config.moths.giant.poolSize);
    expect(roosts.every((r) => r.count >= 10)).toBe(true);
  });

  it('hangs a roost under the caps, spread along its stretch', () => {
    const pl = roostPlaces(160, 176, 12);
    expect(pl.length).toBe(12);
    expect(pl[0].s).toBe(160);
    expect(pl[11].s).toBe(176);
    for (const q of pl) expect(Math.abs(q.lat)).toBeLessThan(mc.track.half - 0.6);
    expect(new Set(pl.map((q) => q.lat.toFixed(2))).size).toBeGreaterThan(3);
  });

  it('runs down one of the dead on the rails at speed, not one beside them or at a crawl', () => {
    const R = fc.ram;
    expect(rammed(R, 100, 4.6, 101.8, 0.2)).toBe(true);
    expect(rammed(R, 100, 4.6, 101.8, 1.6)).toBe(false); // off to the side
    expect(rammed(R, 100, 1.0, 101.8, 0.2)).toBe(false); // too slow
    expect(rammed(R, 100, 4.6, 106, 0)).toBe(false); // not there yet
    expect(rammed(R, 100, 4.6, 98, 0)).toBe(false); // behind it
  });

  it('has a miner look, health, loot and a line for every moment', () => {
    expect(config.zombies.variants.miner.health).toBeGreaterThan(1);
    expect(config.zombies.variants.miner.helmet).toBeGreaterThan(0);
    expect(config.zombies.texture.looks.miner.as).toBe('army');
    expect(loot.tables.miner.length).toBeGreaterThan(0);
    for (const k of ['first', 'roost', 'woke', 'scattered', 'beetles', 'steep', 'left']) expect(data.fight[k], k).toBeTruthy();
  });
});

describe("the giant moths' roosts (ai/Moths.js)", () => {
  const makeMoths = () => {
    const events = [];
    const handlers = {};
    const bus = { on: (n, f) => (handlers[n] ??= []).push(f), emit: (n, p) => { events.push([n, p]); for (const f of handlers[n] ?? []) f(p ?? {}); } };
    const ms = new Moths(config, bus);
    let seed = 1;
    const next = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const hurt = [];
    ms.init({ scene: { add() {} }, player: { position: { x: 0, y: 0, z: 0 } }, combat: { weapons: { extraTargets: [] }, hurtPlayer: (d) => hurt.push(d) }, rng: { next, range: (a, b) => a + (b - a) * next(), chance: (p) => next() < p, int: (a, b) => a + Math.floor(next() * (b - a + 1)) } });
    ms.renderer = { update() {}, dispose() {} };
    return { ms, events, hurt, bus };
  };
  // A straight tunnel along +z for a habitat: 4 m wide, 3 m high, Tom's cart at z = cartZ moving at `v`.
  const tunnel = (cart) => ({
    hc: fc.moths,
    slot: (m, t, out) => Object.assign(out, { x: m.slot.lat * 1.2, y: m.slot.up, z: cart.z + m.slot.along }),
    clamp: (m) => { m.x = Math.max(-1.5, Math.min(1.5, m.x)); m.y = Math.max(0.5, Math.min(2.6, m.y)); },
    floorAt: () => 0,
    speed: () => cart.v + fc.moths.speedOver,
    dartSpeed: () => cart.v + fc.moths.dartSpeedOver,
    away: (m, out) => Object.assign(out, { x: 0, y: 2.5, z: m.z + 30 }),
  });
  const points = (n, z0) => Array.from({ length: n }, (_, i) => ({ x: (i % 3) - 1, y: 2.5, z: z0 + i, facing: 0 }));

  it('splits a scattered roost: most flee, the rest come', () => {
    expect(scatterSplit(10, 0.6)).toEqual({ fled: 6, come: 4 });
    expect(scatterSplit(1, 0.6)).toEqual({ fled: 1, come: 0 });
    expect(scatterSplit(0, 0.6)).toEqual({ fled: 0, come: 0 });
  });

  it("deals each a place in the stream: mostly behind Tom, up under the roof", () => {
    let k = 0;
    const r = () => ((k += 0.37) % 1);
    let behind = 0;
    for (let i = 0; i < 40; i++) {
      const s = streamSlot(fc.moths, r);
      expect(s.along).toBeGreaterThanOrEqual(fc.moths.along[0]);
      expect(s.along).toBeLessThanOrEqual(fc.moths.along[1]);
      expect(s.up).toBeGreaterThanOrEqual(fc.moths.up[0]);
      expect(s.up).toBeLessThan(mc.track.roof - 0.3);
      if (s.along < 0) behind++;
    }
    expect(behind).toBeGreaterThan(24);
  });

  it('hang still, folded, lit and shootable until woken', () => {
    const { ms } = makeMoths();
    const cart = { z: 0, v: 0 };
    ms.setHabitat(tunnel(cart));
    expect(ms.roost(points(12, 30), 'a')).toBe(12);
    expect(ms.roosting('a')).toBe(12);
    const m = ms.moths.find((q) => q.active);
    expect(m.state).toBe('rest');
    expect(m.roll).toBeCloseTo(Math.PI);
    expect(m.target.targetable).toBe(true);
    const at = { x: m.x, y: m.y, z: m.z };
    for (let i = 0; i < 60; i++) ms.update(0.05, true);
    expect({ x: m.x, y: m.y, z: m.z }).toEqual(at);
    expect(ms.roosting()).toBe(12);
  });

  it('wake together and stream after the cart, keeping up with it, inside the tunnel', () => {
    const { ms, events } = makeMoths();
    const cart = { z: 0, v: 9 };
    ms.setHabitat(tunnel(cart));
    ms.roost(points(12, 20), 'a');
    expect(ms.wake('a')).toEqual({ count: 12, fled: 0 });
    expect(events.some(([n, p]) => n === 'moths:woke' && p.count === 12)).toBe(true);
    for (let i = 0; i < 200; i++) {
      cart.z += cart.v * 0.05;
      ms.player.position.z = cart.z;
      ms.update(0.05, true);
    }
    const flying = ms.moths.filter((m) => m.active && ['fly', 'dart', 'peel'].includes(m.state));
    expect(flying.length).toBe(12);
    for (const m of flying) {
      expect(Math.abs(m.z - cart.z), 'kept up').toBeLessThan(22);
      expect(Math.abs(m.x)).toBeLessThanOrEqual(1.5);
      expect(m.y).toBeLessThanOrEqual(2.6);
      expect(m.roll).toBe(0);
    }
    expect(ms.roosting()).toBe(0);
  });

  it('dive at Tom in ones and twos and nip for the mine’s own damage', () => {
    const { ms, hurt } = makeMoths();
    const cart = { z: 0, v: 0 };
    ms.setHabitat(tunnel(cart));
    ms.roost(points(12, 4), 'a');
    ms.wake('a');
    let most = 0;
    for (let i = 0; i < 400; i++) {
      ms.update(0.05, true);
      most = Math.max(most, ms.moths.filter((m) => m.active && m.state === 'dart').length);
    }
    expect(hurt.length).toBeGreaterThan(2);
    expect(hurt.every((d) => d === fc.moths.nipDamage)).toBe(true);
    expect(most).toBeLessThanOrEqual(fc.moths.dartCount[1] * 2);
    expect(hurt.length).toBeLessThan(40); // twenty seconds of it: a harrying, not a mauling
  });

  it('scatter when shot at from far off: most flee down the drift and are gone', () => {
    const { ms } = makeMoths();
    const cart = { z: 0, v: 4 };
    ms.setHabitat(tunnel(cart));
    ms.roost(points(10, 40), 'c');
    const out = ms.wake('c', true);
    expect(out).toEqual({ count: 10, fled: 6 });
    expect(ms.moths.filter((m) => m.active && m.state === 'leave').length).toBe(6);
    for (let i = 0; i < 100; i++) ms.update(0.05, true);
    expect(ms.moths.filter((m) => m.active).length).toBe(4);
  });

  it('tell the mine when a roost is shot into', () => {
    const { ms, events } = makeMoths();
    ms.setHabitat(tunnel({ z: 0, v: 0 }));
    ms.roost(points(5, 30), 'b');
    const m = ms.moths.find((q) => q.active);
    m.target.takeHit(100);
    expect(events.some(([n, p]) => n === 'moths:roostHit' && p.group === 'b')).toBe(true);
    expect(m.state).toBe('dying');
    expect(ms.roosting('b')).toBe(4);
  });

  it('still behave as the spike did with no habitat', () => {
    const { ms } = makeMoths();
    expect(ms.send(16)).toBe(16);
    for (let i = 0; i < 100; i++) ms.update(0.05, true);
    expect(ms.living).toBe(16);
    const m = ms.moths.find((q) => q.active);
    expect(m.y).toBeGreaterThan(1);
  });
});

// ---- the fight on a real ride, with stand-ins for the dead ---------------------------------------

function fightRig({ flags = [] } = {}) {
  const zombies = [];
  const chased = [];
  const enemies = {
    brain: { chase: (z, x, zz) => chased.push(z) },
    spawnZombie(x, z, opts) {
      const zb = { x, z, y: opts.y, alive: true, state: 'walk', tier: 'active', radius: 0.35, ...opts };
      zombies.push(zb);
      return zb;
    },
    damage(z, amount) { z.alive = false; z.state = 'dying'; return true; },
  };
  const beetles = { list: [], spawned: [], spawn(x, z, f, opts) { const b = { x, z, y: opts.y, alive: true, space: opts.space, room: opts }; this.list.push(b); this.spawned.push(b); return b; }, hit(b, n) { b.hits = (b.hits ?? 0) + n; }, update() {}, clear() { this.list.length = 0; }, get living() { return this.list.filter((b) => b.alive); } };
  const moths = {
    roosts: new Map(),
    woke: [],
    left: false,
    living: 0,
    setHabitat(h) { this.h = h; },
    roost(pts, id) { this.roosts.set(id, pts.length); this.living += pts.length; return pts.length; },
    roosting(id = null) { return id === null ? [...this.roosts.values()].reduce((a, b) => a + b, 0) : this.roosts.get(id) ?? 0; },
    wake(id, scatter) { const n = this.roosts.get(id) ?? 0; this.roosts.set(id, 0); this.woke.push([id, scatter]); return { count: n, fled: scatter ? Math.round(n * 0.6) : 0 }; },
    dismiss() { this.left = true; },
    clear() { this.roosts.clear(); this.living = 0; },
  };
  const fight = new MineFight(config, null);
  const t = make({ flags, fight, enemies });
  fight.bus = t.bus;
  fight.init({ enemies, beetles, moths, combat: { sfx: { play() {} } }, player: t.player, notify: (x) => t.said.push(x), rng: { next: () => 0.5 } });
  const go = () => {
    t.ride.descend();
    t.tick(mc.lift.seconds + mc.lift.hang + 0.3);
    t.ride.board();
    t.ride.release();
  };
  return { ...t, fight, zombies, chased, beetles, moths, go };
}

describe('the fight on the ride', () => {
  it('stands miners in the drift ahead as the cart comes on, in the mine, and tells the near ones where Tom is', () => {
    const r = fightRig();
    r.go();
    r.tick(3);
    expect(r.zombies.length).toBe(fc.script[0].miners.length);
    const z = r.zombies[0];
    expect(z.variant).toBe('miner');
    expect(z.space).toBe(ID);
    expect(z.authored).toBe('mine');
    const n = nearest(track, z.x - r.ride.offset.x, z.y - r.ride.offset.y, z.z - r.ride.offset.z);
    expect(n.s).toBeCloseTo(fc.script[0].miners[0][0], 0);
    expect(r.chased.length).toBe(0); // still 30 m and more off
    r.tick(5);
    expect(r.chased).toContain(z);
    r.tick(3);
    expect(r.said).toContain(data.fight.first);
  });

  it('runs down the one left standing on the rails, and drops those it leaves behind', () => {
    const r = fightRig();
    const events = [];
    r.bus.on('mine:rammed', () => events.push(1));
    r.go();
    r.tick(12);
    expect(events.length).toBe(1);
    expect(r.zombies[0].alive).toBe(false);
    r.tick(26);
    // Past the points' halt by now? No: it stops there. The second group (beside the rails) was passed.
    expect(r.ride.where).toBe('points');
    expect(r.zombies.filter((z) => z.alive).length).toBeGreaterThan(0);
  });

  it('hangs a roost ahead, says so when it is seen, and wakes it as the cart closes', () => {
    const r = fightRig({ flags: ['minePoints', 'mineFall'] });
    r.go();
    const A = fc.script.find((e) => e.roost?.id === 'a').roost;
    while (r.ride.cart.s < A.s[0] - fc.moths.wake - 3) r.tick(0.5);
    expect(r.moths.roosts.get('a')).toBe(A.count);
    expect(r.said).toContain(data.fight.roost);
    expect(r.moths.woke).toEqual([]);
    while (r.ride.cart.s < A.s[0] - fc.moths.wake + 2) r.tick(0.5);
    expect(r.moths.woke).toEqual([['a', false]]);
    expect(r.said).toContain(data.fight.woke);
  });

  it('scatters a roost shot at from far off, and only wakes one shot at close', () => {
    const r = fightRig({ flags: ['minePoints', 'mineFall'] });
    r.go();
    const A = fc.script.find((e) => e.roost?.id === 'a').roost;
    const at = fc.script.find((e) => e.roost?.id === 'a').at;
    while (r.ride.cart.s < at + 1) r.tick(0.5);
    expect(A.s[0] - r.ride.cart.s).toBeGreaterThan(fc.moths.scatterBeyond);
    r.bus.emit('moths:roostHit', { group: 'a' });
    expect(r.moths.woke).toEqual([['a', true]]);
    expect(r.said).toContain(data.fight.scattered);
  });

  it('sends the dead at Tom at a stop while he is down off the cart, and wakes the roost over the fall', () => {
    const r = fightRig({ flags: ['minePoints'] });
    r.go();
    while (r.ride.where !== 'fall') r.tick(0.5);
    const before = r.zombies.length;
    expect(r.moths.roosts.get('b')).toBe(fc.stops.fall.roost.count);
    r.ride.climbDown();
    r.tick(fc.stops.fall.waves[0].after + 0.5);
    expect(r.zombies.length).toBe(before + fc.stops.fall.waves[0].miners.length);
    expect(r.zombies.at(-1).mode).toBe('chase');
    expect(r.moths.woke.some(([id]) => id === 'b')).toBe(false);
    r.tick(fc.stops.fall.roost.wakeAfter);
    expect(r.moths.woke.some(([id]) => id === 'b')).toBe(true);
  });

  it('brings beetles up out of the ballast ahead, slower than the cart, and shoulders one aside on the rails', () => {
    const r = fightRig({ flags: ['minePoints', 'mineFall'] });
    r.go();
    while (r.ride.cart.s < 120) r.tick(0.5);
    expect(r.beetles.spawned.length).toBe(2);
    const b = r.beetles.spawned[0];
    expect(b.space).toBe(ID);
    expect(b.room.speedScale * config.beetles.ai.speed).toBeLessThan(rc.cruise);
    // One sat on the rails right in front of the cart.
    const a = r.ride.at(r.ride.cart.s + 2.2, 0, 0);
    Object.assign(b, { x: a.x, z: a.z, y: a.y });
    r.tick(0.1);
    expect(b.hits).toBe(fc.ram.beetle);
    r.tick(0.3);
    expect(b.hits).toBe(fc.ram.beetle); // once as it passes
  });

  it('has the moths break off at the bottom, and leaves the mine quiet from then on', () => {
    const r = fightRig({ flags: ['minePoints', 'mineFall'] });
    r.go();
    while (r.ride.where !== 'bottom') r.tick(1);
    expect(r.moths.left).toBe(true);
    r.tick(3);
    expect(r.said).toContain(data.fight.left);
    expect(r.set.has('mineBottom')).toBe(true);
    // Up and down again: nothing's dealt.
    r.ride.surface();
    expect(r.zombies.every((z) => z.state === 'free' || !z.alive || z.mine !== r.fight.token)).toBe(true);
    const n = r.zombies.length;
    r.go();
    r.tick(40);
    expect(r.zombies.length).toBe(n);
    expect(r.fight.quiet).toBe(true);
  });
});
