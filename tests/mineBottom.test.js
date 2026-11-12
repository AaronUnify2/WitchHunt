// Session 31: the bottom of the mine, past the bulkhead (encounters/MineBottom.js,
// render/mineCavernModel.js): the bulkhead levered open, the cavern, the seam, what's there to take.
import { describe, it, expect } from 'vitest';
import { config } from './mapFixture.js';
import { make } from './mineFixture.js';
import { buildTrack, halfAt, roofAt, rayDistance, pointAt } from '../src/world/mineTrack.js';
import { seamLine } from '../src/render/mineCavernModel.js';
import { BOTTOM_FLAGS, seamPulse, sideBlocks, fireSpeed, fuseTick, lick } from '../src/encounters/MineBottom.js';
import { MineFight, due, rammed } from '../src/encounters/MineFight.js';
import cutscenes from '../src/data/cutscenes.json';
import { keepInRoom } from '../src/player/Player.js';
import progress from '../src/data/progress.json';
import lore from '../src/data/lore.json';
import papers from '../src/data/papers.json';
import data from '../src/data/mineshaft.json';

const mc = config.mineshaft;
const track = buildTrack(mc.track);

function extras() {
  const got = { lore: [], cards: [], papers: [], sticks: 0 };
  return {
    got,
    extra: {
      lore: { give: (id) => got.lore.push(id) },
      card: { show: (id, h) => { got.cards.push(id); h.read?.(); return true; } },
      paper: { open: (id) => got.papers.push(id) },
      dynamite: { give: (n) => { const fit = Math.min(n, 8 - got.sticks); got.sticks += fit; return fit; } },
    },
  };
}

// Down at the bottom on foot, the cart at the buffers.
function atBottom(flags = []) {
  const x = extras();
  const m = make({ flags: ['mineBottom', ...flags], extra: x.extra });
  m.ride.jump('bottom');
  m.got = x.got;
  m.go = (s, lat = 0) => m.stand(m.ride.at(s, lat));
  return m;
}

describe('the cavern past the bottom', () => {
  it('opens out past the bulkhead: wide, and its roof far over the drift’s', () => {
    expect(track.length).toBe(468);
    expect(track.door).toBeGreaterThan(mc.ride.end + 4);
    expect(halfAt(track, track.door)).toBeCloseTo(mc.track.half, 1);
    expect(halfAt(track, 455)).toBeGreaterThan(7);
    expect(roofAt(track, 455)).toBeGreaterThan(8);
    expect(roofAt(track, 420)).toBe(mc.track.roof);
    // Level from the buffers to the end wall (the bottom's room is one flat box).
    expect(Math.abs(pointAt(track, 424).y - pointAt(track, 468).y)).toBeLessThan(0.05);
  });

  it('stops a shot at the bulkhead until it’s open', () => {
    const p = pointAt(track, 426);
    const dir = { x: Math.sin(p.yaw), y: 0, z: Math.cos(p.yaw) };
    const from = { x: p.x, y: p.y + 1.4, z: p.z };
    const shut = { ...track, shutAt: track.door };
    expect(rayDistance(shut, from, dir, 90)).toBeLessThan(track.door - 426 + 0.7);
    expect(rayDistance(track, from, dir, 90)).toBeGreaterThan(40);
  });

  it('draws the seam as a crack: taller than a house, a hand wide', () => {
    const hash = (a, b) => (Math.sin(a * 127.1 + b * 311.7) * 43758.5453) % 1;
    const line = seamLine(mc.bottom.seam.height, mc.bottom.seam.width, (a, b) => Math.abs(hash(a, b)));
    expect(line[line.length - 1][1] - line[0][1]).toBeCloseTo(mc.bottom.seam.height, 5);
    for (const [, , half] of line) expect(half * 2).toBeLessThanOrEqual(mc.bottom.seam.width);
    expect(Math.max(...line.map((l) => l[2] * 2))).toBeGreaterThan(0.1);
  });

  it('pulses the seam’s light between its two brightnesses', () => {
    const S = mc.bottom.seam;
    let lo = 9;
    let hi = 0;
    for (let t = 0; t < S.pulse * 2; t += 0.05) {
      const k = seamPulse(t, S.pulse, S.glow);
      lo = Math.min(lo, k);
      hi = Math.max(hi, k);
    }
    expect(lo).toBeCloseTo(S.glow[0], 1);
    expect(hi).toBeCloseTo(S.glow[1], 1);
  });

  it('narrows the room box to the tunnel’s own shape', () => {
    const blocks = sideBlocks(track, 419, 468, 443.5, 7.4);
    expect(blocks.length).toBeGreaterThan(4);
    // In the drift at 425 a step out to 5 m is pushed back inside its walls; in the cavern it isn't.
    const pl = { x: 0, z: 0, rx: 1, rz: 0, fx: 0, fz: 1, hx: 7.4, hz: 24.5, blocks };
    const a = { x: 5, z: 425 - 443.5 };
    keepInRoom(a, pl, 0.35);
    expect(Math.abs(a.x)).toBeLessThan(halfAt(track, 425));
    const b = { x: 5, z: 455 - 443.5 };
    keepInRoom(b, pl, 0.35);
    expect(b.x).toBe(5);
  });
});

describe('the bottom, on foot', () => {
  it('has a story flag, a text, a lore item and a paper for everything it uses', () => {
    const ids = new Set(progress.flags.map((f) => f.id));
    for (const f of BOTTOM_FLAGS) expect(ids.has(f), f).toBe(true);
    for (const k of ['door', 'seam', 'cocoon', 'foreman', 'log', 'sticks', 'drill', 'plunger']) expect(data.bottom[k].prompt, k).toBeTruthy();
    for (const k of ['fuse', 'fuseAboard', 'haul', 'blast', 'rails', 'singe', 'sealed', 'lever', 'box']) expect(data.out[k], k).toBeTruthy();
    const items = new Map(lore.items.map((i) => [i.id, i]));
    expect(items.get('foremanLog').paper).toBe('foremanLog');
    expect(items.get('drillHead').card.line).toBeTruthy();
    expect(papers.papers.find((p) => p.id === 'foremanLog').pages.length).toBeGreaterThan(3);
  });

  it('keeps Tom out of the cavern until the bar’s levered out, then lets him through', () => {
    const m = atBottom();
    expect(m.ride.track.shutAt).toBe(track.door);
    expect(m.ride.model.parts.bulkhead.visible).toBe(true);
    // Walking at the door gets him nowhere.
    const beyond = m.ride.at(track.door + 3, 0);
    const into = m.ride.at(track.door - 0.1, 0); // a step into the leaf
    const p = { x: into.x, z: into.z };
    keepInRoom(p, m.player.platform, 0.35);
    expect(m.ride.sOf({ ...p, y: m.player.position.y })).toBeLessThan(track.door - 0.4);
    // The bar: a long hold at the door.
    m.go(track.door - 1.2);
    m.tick(0.1);
    expect(m.hud.prompt).toContain(data.bottom.door.prompt);
    m.hold(mc.encounter.holds.door + 0.3);
    expect(m.set.has('mineBulkhead')).toBe(true);
    expect(m.ride.track.shutAt).toBe(null);
    expect(m.ride.model.parts.bulkhead.visible).toBe(false);
    expect(m.ride.model.parts.bulkheadOpen.visible).toBe(true);
    expect(m.said).toContain(data.bottom.door.done);
    const q = { x: beyond.x, z: beyond.z };
    keepInRoom(q, m.player.platform, 0.35);
    expect(m.ride.sOf({ ...q, y: m.player.position.y })).toBeGreaterThan(track.door + 2);
  });

  it('says what the cavern is the first time he walks in, once', () => {
    const m = atBottom(['mineBulkhead']);
    m.go(track.door + 6);
    m.tick(0.2);
    expect(m.set.has('mineCavernSeen')).toBe(true);
    expect(m.said).toContain(data.bottom.inside);
    m.tick(20);
    expect(m.said).toContain(data.bottom.roost);
    expect(m.said.filter((t) => t === data.bottom.inside).length).toBe(1);
  });

  it('gives the logbook (a card, a paper, lore), the sticks and the drill’s head, each once', () => {
    const m = atBottom(['mineBulkhead', 'mineCavernSeen']);
    const spot = (n) => m.ride.toWorld(m.ride.model.spots[n]);
    m.stand(spot('log'));
    m.tick(0.1);
    expect(m.hud.prompt).toContain(data.bottom.log.prompt);
    m.hold(mc.encounter.holds.log + 0.3);
    expect(m.got.lore).toEqual(['foremanLog']);
    expect(m.got.papers).toEqual(['foremanLog']);
    expect(m.ride.model.parts.log.visible).toBe(false);
    m.stand(spot('sticks'));
    m.hold(mc.encounter.holds.sticks + 0.3);
    expect(m.got.sticks).toBe(mc.bottom.sticksGiven);
    expect(m.set.has('mineSticks')).toBe(true);
    m.stand(spot('drill'));
    m.hold(mc.encounter.holds.drill + 0.3);
    expect(m.got.lore).toEqual(['foremanLog', 'drillHead']);
    expect(m.got.cards).toEqual(['foremanLog', 'drillHead']);
    expect(m.ride.model.parts.drillHead.visible).toBe(false);
    // Nothing's offered twice.
    for (const n of ['sticks', 'drill']) {
      m.stand(spot(n));
      m.tick(0.1);
      expect(m.hud.prompt).not.toContain(data.bottom[n].prompt);
    }
  });

  it('leaves the sticks in the case when he can’t carry any more', () => {
    const m = atBottom(['mineBulkhead', 'mineCavernSeen']);
    m.got.sticks = 8;
    m.stand(m.ride.toWorld(m.ride.model.spots.sticks));
    m.hold(mc.encounter.holds.sticks + 0.3);
    expect(m.set.has('mineSticks')).toBe(false);
    expect(m.said).toContain(data.bottom.sticks.full);
  });

  it('dresses the set from the flags when the mine’s loaded again', () => {
    const m = atBottom(['mineBulkhead', 'foremanLogFound', 'drillHeadTaken']);
    const P = m.ride.model.parts;
    expect(P.bulkheadOpen.visible).toBe(true);
    expect(P.log.visible).toBe(false);
    expect(P.drillHead.visible).toBe(false);
    expect(P.sticks.visible).toBe(true);
  });
});

// ---- the way out ------------------------------------------------------------------------------------

const E = mc.escape;

// The bottom with the bulkhead open, a fight with stand-ins for the dead and the moths, and a combat that
// counts what hurts Tom.
function outRig({ flags = [], health = 100 } = {}) {
  const zombies = [];
  const enemies = {
    brain: { chase() {} },
    spawnZombie(x, z, opts) {
      const zb = { x, z, y: opts.y, alive: true, state: 'walk', tier: 'active', radius: 0.35, ...opts };
      zombies.push(zb);
      return zb;
    },
    damage(z) { z.alive = false; z.state = 'dying'; return true; },
  };
  const moths = { roosts: new Map(), woke: [], living: 0, hc: null, setHabitat(h) { this.h = h; this.habitat = h; }, roost(pts, id) { this.roosts.set(id, pts.length); this.living += pts.length; return pts.length; }, roosting(id = null) { return id === null ? [...this.roosts.values()].reduce((a, b) => a + b, 0) : this.roosts.get(id) ?? 0; }, wake(id) { const n = this.roosts.get(id) ?? 0; this.roosts.set(id, 0); this.woke.push(id); return { count: n, fled: 0 }; }, dismiss() {}, clear() { this.roosts.clear(); this.living = 0; } };
  const beetles = { list: [], spawn() {}, hit() {}, update() {}, clear() {}, get living() { return []; } };
  const fight = new MineFight(config, null);
  const x = extras();
  const m = make({ flags: ['mineBottom', 'mineBulkhead', 'mineCavernSeen', ...flags], fight, enemies, extra: x.extra });
  fight.bus = m.bus;
  fight.init({ enemies, beetles, moths, combat: { sfx: { play() {} } }, player: m.player, notify: (t) => m.said.push(t), rng: { next: () => 0.5 } });
  const hurt = [];
  const combat = m.ride.bottom.combat;
  combat.alive = true;
  combat.health = { value: health };
  combat.hurtPlayer = (d) => { hurt.push(d); combat.health.value -= d; if (combat.health.value <= 0) combat.alive = false; };
  m.ride.jump('bottom');
  const spot = (n) => m.ride.toWorld(m.ride.model.spots[n]);
  const push = () => { m.stand(spot('plunger')); m.tick(0.1); m.hold(mc.encounter.holds.plunger + 0.2); };
  const toCart = () => { m.stand(m.ride.at(mc.ride.end - 1.6, 1.0)); m.tick(0.1); };
  return { ...m, fight, zombies, moths, hurt, combat, push, toCart, spot };
}

describe('the way out (pure)', () => {
  it('times the fire to reach the landing just behind a cart that’s slowed by nothing', () => {
    const v = fireSpeed(426, 380, E.speed, E.stop, E.fire.endGap);
    const t = (380 - E.stop) / E.speed;
    expect(426 - v * t).toBeCloseTo(E.stop + E.fire.endGap, 5);
    expect(v).toBeGreaterThan(E.speed);
    // Never slower than the cart, however near it starts.
    expect(fireSpeed(385, 380, E.speed, E.stop, E.fire.endGap)).toBeGreaterThan(E.speed);
  });

  it('ticks the fuse faster as it runs down', () => {
    expect(fuseTick(E.fuse, E.fuse, E.hurryAt)).toBeCloseTo(1.0, 5);
    expect(fuseTick(E.hurryAt + 0.01, E.fuse, E.hurryAt)).toBeCloseTo(0.3, 1);
    expect(fuseTick(0.2, E.fuse, E.hurryAt)).toBeLessThan(0.14);
  });

  it('burns him with a lick of the fire, never below the floor', () => {
    expect(lick(100, E.fire)).toBe(E.fire.lick);
    expect(lick(E.fire.floor + 3, E.fire)).toBe(3);
    expect(lick(E.fire.floor - 2, E.fire)).toBe(0);
  });

  it('fires the script the other way coming up, and runs down the dead with the cart’s tail', () => {
    const fired = new Set();
    expect(due(E.script, 420, fired, -1)).toEqual([]);
    expect(due(E.script, E.script[0].at, fired, -1)).toEqual([0]);
    expect(due(E.script, 0, fired, -1).length).toBe(E.script.length);
    const R = mc.fight.ram;
    expect(rammed(R, 100, 9, 98.2, 0.1, -1)).toBe(true);
    expect(rammed(R, 100, 9, 101.8, 0.1, -1)).toBe(false); // behind it now
    // Every one's on the rails ahead (up the drift), far enough off to be shot first.
    for (const e of E.script) {
      for (const [s, lat] of e.miners) {
        expect(e.at - s, `at ${e.at}`).toBeGreaterThan(24);
        expect(s).toBeGreaterThan(E.cutAt + 20);
        expect(Math.abs(lat)).toBeLessThan(R.half);
      }
    }
  });

  it('has the closing cutscene, with the cut to the surface in it', () => {
    const cs = cutscenes.cutscenes.find((c) => c.id === 'mine.out');
    expect(cs.indoors).toBe(true);
    expect(cs.tracks.some((e) => e.do === 'emit' && e.event === 'mine:out' && e.payload.step === 'surface')).toBe(true);
    expect(new Set(cs.camera.map((k) => k.anchor))).toEqual(new Set(['mineLanding', 'mineCollar']));
    expect(cs.duration).toBeGreaterThan(E.cine.fill[1] + 4);
  });
});

describe('the plunger and the fuse', () => {
  it('lights a twenty second fuse: the count on the prompt, the handle down, the moths gone', () => {
    const m = outRig();
    expect(m.moths.roosts.get('cavern')).toBe(mc.bottom.roost.count);
    m.stand(m.spot('plunger'));
    m.tick(0.1);
    expect(m.hud.prompt).toContain(data.bottom.plunger.prompt);
    m.push();
    const b = m.ride.bottom;
    expect(b.fuse).toBeGreaterThan(E.fuse - 1);
    expect(m.said).toContain(data.bottom.plunger.armed);
    expect(m.events).toContain('mine:fuse');
    expect(m.hud.prompt).toContain('FUSE');
    expect(m.moths.woke).toEqual(['cavern']);
    expect(m.moths.h.hc.dartCount).toEqual([0, 0]); // they don't stop to bite
    expect(m.ride.model.parts.handle.position.y).toBeLessThan(0);
    expect(m.ride.model.parts.spark.visible).toBe(true);
    // It can't be pushed twice, and the slow way up isn't offered while it burns.
    m.stand(m.spot('plunger'));
    m.tick(0.1);
    expect(m.hud.prompt).not.toContain(data.bottom.plunger.prompt);
    m.toCart();
    expect(m.hud.prompt).toContain(data.out.board.prompt);
    expect(m.hud.prompt).not.toContain(data.cart.winch.prompt);
  });

  it('kills him if he’s still on foot when it burns down, and puts it all back', () => {
    const m = outRig();
    m.push();
    m.tick(E.fuse + 0.5);
    expect(m.said).toContain(data.bottom.plunger.late);
    expect(m.hurt[0]).toBeGreaterThan(1000);
    expect(m.set.has('mineSealed')).toBe(false);
    m.ride.reset(); // the respawn
    expect(m.ride.bottom.fuse).toBe(null);
    expect(m.ride.bottom.esc).toBe(null);
  });
});

describe('the ride out', () => {
  it('hauls the cart up at a walk until the charges go, then throws it on with the fire behind', () => {
    const m = outRig();
    m.push();
    m.tick(4);
    m.toCart();
    m.hold(0.6);
    const b = m.ride.bottom;
    expect(m.ride.phase).toBe('aboard');
    expect(m.said).toContain(data.out.haul);
    expect(m.player.yaw).toBeCloseTo(m.ride.cart.heading, 1); // facing up the drift
    m.tick(3);
    expect(m.ride.cart.s).toBeLessThan(mc.ride.end - 4);
    expect(m.ride.cart.speed).toBeLessThanOrEqual(E.haul + 0.01);
    expect(b.esc.blown).toBe(false);
    m.tick(b.fuse + 0.2);
    expect(b.esc.blown).toBe(true);
    expect(m.events).toContain('mine:blast');
    expect(m.said).toContain(data.out.blast);
    expect(m.ride.cart.speed).toBeGreaterThanOrEqual(E.kick - 0.5);
    expect(m.ride.model.parts.fire[0].visible).toBe(true);
    expect(m.ride.model.parts.seamGlow.visible).toBe(false);
    const gap0 = b.esc.fireS - m.ride.cart.s;
    expect(gap0).toBeLessThanOrEqual(E.fire.startGap + 0.5);
    m.tick(10);
    expect(m.ride.cart.speed).toBeCloseTo(E.speed, 1);
    expect(b.esc.fireS - m.ride.cart.s).toBeLessThan(gap0); // gaining
    expect(b.light.ambientDay).toBeGreaterThan(mc.light.ambientDay); // the drift's lit by it
    expect(m.hurt.length).toBe(0);
  });

  it('puts the last of the shift on the rails ahead; each one hit slows the cart, and the fire licks him', () => {
    const m = outRig();
    m.push();
    m.toCart();
    m.hold(0.6);
    m.tick(E.fuse + 1); // away, and the charges gone
    let slowed = false;
    let top = 0;
    for (let i = 0; i < 70 && m.ride.below; i++) {
      const v0 = m.ride.cart.speed;
      top = Math.max(top, v0);
      m.tick(0.5);
      if (m.ride.below && m.ride.cart.speed < v0 * 0.8 && m.ride.cart.s > E.stop + E.brake + 5) slowed = true;
    }
    expect(m.zombies.length).toBe(E.script.reduce((n, e) => n + e.miners.length, 0));
    expect(m.zombies.every((z) => z.mode === 'chase' && z.variant === 'miner')).toBe(true);
    expect(m.events.filter((e) => e === 'mine:rammed').length).toBeGreaterThan(3);
    expect(slowed).toBe(true);
    // Nobody shot: the fire caught the cart, more than once, and never took him under the floor.
    expect(m.hurt.length).toBeGreaterThan(1);
    expect(m.hurt.every((d) => d <= E.fire.lick)).toBe(true);
    expect(m.combat.health.value).toBeGreaterThanOrEqual(E.fire.floor);
    expect(m.said).toContain(data.out.singe);
    // And out (no cutscene here: the cart reaching the landing ends it).
    expect(m.ride.below).toBe(false);
    expect(m.set.has('mineSealed')).toBe(true);
    expect(m.said).toContain(data.out.sealed);
    expect(m.events).toContain('mine:sealed');
  });

  it('never lets the fire kill him, however little he has left', () => {
    const m = outRig({ health: E.fire.floor + 5 });
    m.push();
    m.toCart();
    m.hold(0.6);
    m.tick(E.fuse + 60);
    expect(m.ride.below).toBe(false);
    expect(m.combat.alive).toBe(true);
    expect(m.combat.health.value).toBe(E.fire.floor);
  });

  it('hands the last of it to the cutscene, and comes out sealed when that ends or is skipped', () => {
    let played = null;
    const m = outRig();
    m.ride.bottom.cutscenes = { play: (id, opts) => { played = { id, opts }; return true; } };
    m.push();
    m.toCart();
    m.hold(0.6);
    m.tick(E.fuse + 60);
    expect(played.id).toBe('mine.out');
    expect(m.ride.phase).toBe('cine');
    expect(m.set.has('mineSealed')).toBe(true); // already: a quit mid-scene still seals it
    expect(m.ride.cart.s).toBeLessThanOrEqual(E.cutAt);
    expect(played.opts.anchors.mineLanding.dy).toBeLessThan(-1000); // the camera's down in the pocket
    // The scene's own clock brings the cart in, the fire after it, and the shaft's walls down.
    for (let t = 0; t < E.cine.lift + 1; t += 0.05) m.ride.update(0.05, m.input, false, false);
    expect(m.ride.cart.s).toBeCloseTo(E.stop, 1);
    expect(m.ride.model.parts.sleeve.visible).toBe(true);
    // The cut to the surface, then the end.
    m.bus.emit('mine:out', { step: 'surface' });
    expect(m.ride.below).toBe(false);
    played.opts.onDone(false);
    expect(m.said.filter((t) => t === data.out.sealed).length).toBe(1);
    expect(m.ride.bottom.cine).toBe(null);
    // Sealed: the cage won't go down again.
    expect(m.ride.descend()).toBe(false);
  });
});
