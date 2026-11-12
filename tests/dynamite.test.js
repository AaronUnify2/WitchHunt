// Session 27, batch 3: dynamite (combat/Dynamite.js, combat/dynamiteFlight.js, config.dynamite).
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { config } from '../src/config.js';
import { throwVelocity, throwArc, stepStick } from '../src/combat/dynamiteFlight.js';
import { Dynamite } from '../src/combat/Dynamite.js';

const dc = config.dynamite;
const flat = () => 0;

describe('the throw', () => {
  it('leaves the hand along the look, tipped up a little, at the throw speed', () => {
    const v = throwVelocity(0, 0, -1, dc.throwSpeed, dc.throwLift);
    expect(Math.hypot(v.x, v.y, v.z)).toBeCloseTo(dc.throwSpeed, 6);
    expect(v.z).toBeLessThan(0);
    expect(v.y).toBeCloseTo(Math.sin(dc.throwLift) * dc.throwSpeed, 6);
    // Looking down, it still goes out in front.
    const down = throwVelocity(0, -0.5, -0.866, dc.throwSpeed, dc.throwLift);
    expect(down.z).toBeLessThan(0);
  });

  it('draws the arc to where it first lands, and the stick lands there', () => {
    const o = { x: 0, y: 1.5, z: 0 };
    const v = throwVelocity(0, 0, 1, dc.throwSpeed, dc.throwLift);
    const arc = throwArc(o, v, dc.gravity, flat, 400, dc.arcStep);
    expect(arc.land).toBeTruthy();
    expect(arc.land.y).toBeCloseTo(0, 6);
    expect(arc.points.length).toBeGreaterThan(10); // dots enough to read it
    // The flight agrees with the drawn arc up to the first touch.
    const s = { x: o.x, y: o.y, z: o.z, vx: v.x, vy: v.y, vz: v.z, resting: false };
    let firstTouch = null;
    for (let i = 0; i < 400 && !firstTouch; i++) {
      const ev = stepStick(s, 1 / 240, { ...dc, radius: 0 }, { heightAt: flat });
      if (ev === 'bounce') firstTouch = { x: s.x, z: s.z };
    }
    expect(firstTouch).toBeTruthy();
    expect(Math.hypot(firstTouch.x - arc.land.x, firstTouch.z - arc.land.z)).toBeLessThan(0.25);
    // A sensible throw: lands somewhere between 6 and 20 m off.
    expect(arc.land.z).toBeGreaterThan(6);
    expect(arc.land.z).toBeLessThan(20);
  });

  it('bounces a little, rolls a little, and lies still (not far past where it landed)', () => {
    const v = throwVelocity(0, 0, 1, dc.throwSpeed, dc.throwLift);
    const arc = throwArc({ x: 0, y: 1.5, z: 0 }, v, dc.gravity, flat, 400, dc.arcStep);
    const s = { x: 0, y: 1.5, z: 0, vx: v.x, vy: v.y, vz: v.z, resting: false };
    let bounces = 0;
    for (let i = 0; i < 30 * 8 && !s.resting; i++) if (stepStick(s, 1 / 30, dc, { heightAt: flat }) === 'bounce') bounces++;
    expect(s.resting).toBe(true);
    expect(bounces).toBeGreaterThanOrEqual(1);
    expect(s.z - arc.land.z).toBeGreaterThan(0);
    expect(s.z - arc.land.z).toBeLessThan(5);
    expect(s.y).toBeCloseTo(dc.radius, 6);
  });

  it('glances off a trunk in its way instead of passing through it', () => {
    const s = { x: 0, y: 1, z: 0, vx: 0, vy: 0, vz: 10, resting: false };
    const trunk = { x: 0, z: 2, r: 0.4, top: 10 };
    for (let i = 0; i < 30; i++) stepStick(s, 1 / 60, dc, { heightAt: flat, blockers: [trunk] });
    expect(s.z).toBeLessThan(2);
    expect(s.vz).toBeLessThanOrEqual(0);
  });
});

// A Dynamite with the game round it stubbed: a weapon in hand, a camera, a blast that records.
function rig() {
  const events = [];
  const bus = { emit: (n, d) => events.push([n, d]) };
  const cam = new THREE.PerspectiveCamera();
  cam.position.set(0, 1.6, 0);
  cam.lookAt(0, 1.6, -10);
  cam.updateMatrixWorld(true);
  const weapons = {
    id: 'rifle',
    order: ['rifle'],
    extraTargets: [],
    requireRelease: false,
    switchProgress: 1,
    setSlot(id, on) {
      if (on && !this.order.includes(id)) this.order.push(id);
      if (!on) this.order = this.order.filter((x) => x !== id);
      if (!on && this.id === id) this.id = this.order[0];
    },
    selectId(id) {
      if (!this.order.includes(id)) return false;
      this.id = id;
      return true;
    },
  };
  const blasts = [];
  const sounds = [];
  const combat = { weapons, inventory: {}, alive: true, sfx: { play: (n) => sounds.push(n) }, enemies: { living: [] }, viewModel: {} };
  const d = new Dynamite(config, bus);
  d.init(new THREE.Scene(), {
    combat,
    player: { camera: cam, position: new THREE.Vector3(0, 0, 0), velocity: { x: 0, z: 0 } },
    explosives: { blast: (x, y, z, e) => blasts.push({ x, y, z, e }) },
    ground: { heightAt: flat },
    colliders: { query: (x, z, r, out) => ((out.length = 0), out) },
    notify: () => {},
  });
  const keys = new Set();
  const prev = new Set();
  const input = { activeDevice: 'gamepad', isDown: (a) => keys.has(a), wasPressed: (a) => keys.has(a) && !prev.has(a) };
  const frame = (dt = 1 / 30) => {
    d.update(dt, input, true);
    prev.clear();
    for (const k of keys) prev.add(k);
  };
  return { d, weapons, keys, frame, blasts, events, sounds, combat };
}

describe('dynamite in hand', () => {
  it('is in hand only while there are sticks; scarce: a carry limit', () => {
    const r = rig();
    r.frame();
    expect(r.weapons.order).not.toContain('dynamite');
    expect(r.d.give(20)).toBe(dc.carryMax);
    r.frame();
    expect(r.weapons.order).toContain('dynamite');
  });

  it('RT lights it (a match), the fuse burns while held, and letting go throws it', () => {
    const r = rig();
    r.d.give(2);
    r.frame();
    r.weapons.selectId('dynamite');
    r.keys.add('attack');
    r.frame();
    expect(r.d.lit).toBeTruthy();
    expect(r.sounds).toContain('matchStrike');
    for (let i = 0; i < 20; i++) r.frame();
    expect(r.d.lit.fuse).toBeLessThan(dc.fuseSeconds - 0.6);
    expect(r.d.hud.prompt).toMatch(/throw/i);
    expect(r.d.hud.progress).toBeGreaterThan(0);
    r.keys.delete('attack');
    r.frame();
    expect(r.d.lit).toBe(null);
    expect(r.d.count).toBe(1);
    expect(r.d.sticks.length).toBe(1);
    expect(r.d.sticks[0].vz).toBeLessThan(0); // away, where he's looking
    // It goes off when its fuse runs out, not before.
    const left = r.d.sticks[0].fuse;
    for (let i = 0; i < Math.floor(left * 30) - 2; i++) r.frame();
    expect(r.blasts.length).toBe(0);
    for (let i = 0; i < 6; i++) r.frame();
    expect(r.blasts.length).toBe(1);
    expect(r.blasts[0].e).toEqual(dc.blast);
  });

  it('held too long, it goes off in his hand (Aaron)', () => {
    const r = rig();
    r.d.give(2);
    r.frame();
    r.weapons.selectId('dynamite');
    r.keys.add('attack');
    for (let i = 0; i < Math.ceil(dc.fuseSeconds * 30) + 3; i++) r.frame();
    expect(r.blasts.length).toBe(1);
    expect(r.blasts[0].x).toBe(0);
    expect(r.blasts[0].e.playerDamage).toBe(dc.inHandDamage);
    expect(r.d.count).toBe(1);
    expect(r.events.some(([n, e]) => n === 'dynamite:blast' && e.inHand)).toBe(true);
  });

  it('switched away while lit, it drops at his feet, still burning', () => {
    const r = rig();
    r.d.give(1);
    r.frame();
    r.weapons.selectId('dynamite');
    r.keys.add('attack');
    r.frame();
    r.weapons.selectId('rifle');
    r.frame();
    expect(r.d.lit).toBe(null);
    expect(r.d.sticks.length).toBe(1);
    expect(r.d.sticks[0].fuse).toBeGreaterThan(0);
  });

  it('the last one thrown, the gun that was in hand comes back', () => {
    const r = rig();
    r.d.give(1);
    r.frame();
    r.weapons.selectId('dynamite');
    r.frame();
    r.keys.add('attack');
    r.frame();
    r.frame();
    r.frame();
    r.frame();
    r.keys.delete('attack');
    r.frame();
    for (let i = 0; i < Math.ceil(dc.cooldown * 30) + 3; i++) r.frame();
    expect(r.weapons.id).toBe('rifle');
    expect(r.weapons.order).not.toContain('dynamite');
  });
});

describe('a hard knock', () => {
  it('a lit stick lying there is a target: shot, it goes off at once', () => {
    const r = rig();
    const s = r.d.addStick({ x: 0, y: 0.05, z: -5 }, { x: 0, y: 0, z: 0 }, 30);
    r.frame();
    const t = r.d.targets.group.find((x) => x === s.target);
    expect(t?.targetable).toBe(true);
    expect(t.noAssist).toBe(true);
    t.takeHit(25, 'body');
    expect(r.blasts.length).toBe(1);
    expect(r.d.sticks.length).toBe(0);
  });

  it('a hazard (the powder store\'s crate) goes up when shot, and anything near a blast follows', () => {
    const r = rig();
    let blown = 0;
    const big = { radius: 12, damage: 400, playerDamage: 150, edge: 0.2, knockback: 6, shake: 2, alert: 200 };
    const h = r.d.addHazard({ x: 2, y: 0, z: -2, r: 0.5, h: 0.6, blast: big, onBlow: () => blown++ });
    r.frame();
    expect(r.d.targets.group).toContain(h.target);
    // A stick going off next to it: the crate follows a moment later.
    r.d.addStick({ x: 0, y: 0.05, z: -2 }, { x: 0, y: 0, z: 0 }, 0.01);
    for (let i = 0; i < 15; i++) r.frame();
    expect(blown).toBe(1);
    expect(r.blasts.map((b) => b.e)).toContain(big);
    expect(r.d.targets.group).not.toContain(h.target);
  });
});

describe('saving', () => {
  it('keeps the sticks carried (a lit one is not saved), within the carry limit', () => {
    const r = rig();
    r.d.give(5);
    expect(r.d.saveState()).toEqual({ carried: 5 });
    r.d.loadState({ carried: 99 });
    expect(r.d.count).toBe(dc.carryMax);
    r.d.loadState(undefined);
    expect(r.d.count).toBe(0);
  });
});
