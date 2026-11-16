// Nov 16 (Aaron): the grey at the crashed plane as a boss: its shield, its ray, its arcs; and the controls the
// ray turns round.
import { describe, it, expect } from 'vitest';
import { absorb, regen, inCone, pickFlit } from '../src/encounters/greyBoss.js';
import { Player } from '../src/player/Player.js';
import { config } from '../src/config.js';

const b = config.crashedPlane.encounter.boss;

describe('the grey as a boss (Nov 16)', () => {
  it('is no longer a two-shot kill for the hunting rifle', () => {
    const body = config.weapons.sniper.damage;
    const head = body * config.crashedPlane.encounter.hit.headshotMultiplier;
    // the shield takes several shots (no head bonus through it), and then the health several more
    expect(Math.ceil(b.shield / body)).toBeGreaterThanOrEqual(3); // Nov 16 rebalance: shield halved (5 shots before)
    expect(Math.ceil(b.health / head)).toBeGreaterThanOrEqual(3);
  });

  it('its shield takes hits first, the popping shot is spent, and then the health', () => {
    let s = { shield: 60, health: 450 };
    s = absorb(s, 50);
    expect(s).toEqual({ shield: 10, health: 450, popped: false });
    s = absorb(s, 50);
    expect(s.shield).toBe(0);
    expect(s.popped).toBe(true);
    expect(s.health).toBe(450); // no spill
    s = absorb(s, 50);
    expect(s.health).toBe(400);
  });

  it('its shield comes back once it has been left alone a few seconds, Master Chief style', () => {
    const c = { max: b.shield, delay: b.shieldDelay, refill: b.shieldRefill };
    let s = { since: 0, shield: 0 };
    for (let t = 0; t < b.shieldDelay - 0.2; t += 0.1) s = regen(s, 0.1, c);
    expect(s.shield).toBe(0);
    for (let t = 0; t < b.shieldRefill + 0.5; t += 0.1) s = regen(s, 0.1, c);
    expect(s.shield).toBe(b.shield);
  });

  it("the ray's cone: a wide one, and only so far", () => {
    expect(inCone(0, 0, 0, 1, 0, 10, b.ray.range, b.ray.halfAngle)).toBe(true);
    expect(inCone(0, 0, 0, 1, 5, 14, b.ray.range, b.ray.halfAngle)).toBe(true); // well off the line, far out
    expect(inCone(0, 0, 0, 1, 10, 5, b.ray.range, b.ray.halfAngle)).toBe(false); // out to the side
    expect(inCone(0, 0, 0, 1, 0, b.ray.range + 2, b.ray.range, b.ray.halfAngle)).toBe(false);
    expect(b.ray.charge).toBeGreaterThanOrEqual(1); // the tell
    expect(b.ray.seconds).toBeGreaterThanOrEqual(4);
  });

  it('flits to clear ground in its ring, never onto him', () => {
    let n = 0;
    const rand = () => ((n = (n * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 30; i++) {
      const to = pickFlit({ x: 8, z: 0 }, { x: 0, z: 0 }, { x: 10, z: 2 }, b.flit.dash, b.flit.ring, rand, (x) => x > -20);
      if (!to) continue;
      const c = Math.hypot(to.x, to.z);
      expect(c).toBeGreaterThanOrEqual(b.flit.ring[0]);
      expect(c).toBeLessThanOrEqual(b.flit.ring[1]);
      expect(Math.hypot(to.x - 10, to.z - 2)).toBeGreaterThanOrEqual(4);
    }
    expect(pickFlit({ x: 8, z: 0 }, { x: 0, z: 0 }, { x: 30, z: 30 }, b.flit.dash, b.flit.ring, rand, () => false)).toBe(null);
  });
});

describe('the mind scramble: the controls turned round (Player.scramble)', () => {
  const make = () => {
    const ground = { heightAt: () => 0, undergrowthAt: () => 0, clamp() {} };
    const p = new Player(config.player, config.render, config.feedback, { query: () => [] }, ground);
    p.init();
    p.teleport(0, 0, 0);
    return p;
  };
  const input = (mx, my, lx, ly) => ({ getMove: () => ({ x: mx, y: my }), getLook: () => ({ x: lx, y: ly }), isDown: () => false, wasPressed: () => false, activeDevice: 'keyboardMouse' });

  it('W walks back and the mouse turns the other way, for as long as it lasts', () => {
    const a = make();
    a.update(0.1, input(0, 1, 0.1, 0.05));
    const b2 = make();
    b2.scramble(5);
    b2.update(0.1, input(0, 1, 0.1, 0.05));
    // facing yaw 0, forward is -z: unscrambled W goes -z, scrambled +z
    expect(a.position.z).toBeLessThan(0);
    expect(b2.position.z).toBeGreaterThan(0);
    expect(Math.sign(a.yaw)).toBe(-Math.sign(b2.yaw));
    expect(Math.sign(a.pitch)).toBe(-Math.sign(b2.pitch));
    for (let t = 0; t < 5; t += 0.1) b2.update(0.1, input(0, 0, 0, 0));
    expect(b2.scrambled).toBe(false);
  });

  it('a shove carries him and fades', () => {
    const p = make();
    p.push(10, 0);
    for (let t = 0; t < 2; t += 0.05) p.update(0.05, input(0, 0, 0, 0));
    expect(p.position.x).toBeGreaterThan(1);
    expect(p.position.x).toBeLessThan(3);
    expect(p.shoveV.x).toBe(0);
  });
});
