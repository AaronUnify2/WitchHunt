import { describe, it, expect } from 'vitest';
import { Zombie, rollSpeed, ZOMBIE_FRAMES } from '../src/ai/Zombie.js';
import { Rng } from '../src/core/Rng.js';

const cfg = {
  health: 60, hitRadius: 0.3, height: 1.8, headBottom: 1.42, headRadius: 0.16,
  turnRate: 100, attackReach: 1.25, attackWindup: 0.45, attackRecover: 0.75,
  maxKnockback: 1.6, knockbackSpeed: 8, deathSeconds: 0.8, corpseSeconds: 20,
  corpseSinkSeconds: 2, hitFlashSeconds: 0.15, walkFrameRate: 1.6,
};

function make(x = 0, z = 10, speed = 3) {
  const zb = new Zombie(cfg);
  zb.spawn(x, z, Math.PI, speed);
  return zb;
}

describe('rollSpeed', () => {
  it('stays inside the level range, skewed slow', () => {
    const rng = new Rng(3);
    const lvl = { speedMin: 0.5, speedMax: 1.3 };
    let fast = 0;
    for (let i = 0; i < 1000; i++) {
      const s = rollSpeed(lvl, 7.2, 2, rng);
      expect(s).toBeGreaterThanOrEqual(3.6 - 1e-9);
      expect(s).toBeLessThanOrEqual(9.36);
      if (s > 7.2) fast++; // outruns the player's sprint
    }
    expect(fast).toBeGreaterThan(0);
    expect(fast).toBeLessThan(300); // a few, not most
  });
});

describe('Zombie', () => {
  it('walks to the player and stops at reach', () => {
    const z = make();
    for (let i = 0; i < 100; i++) z.update(0.05, { x: 0, z: 0 });
    expect(Math.hypot(z.x, z.z)).toBeLessThanOrEqual(1.25);
    expect(Math.hypot(z.x, z.z)).toBeGreaterThan(1);
  });

  it('swipes after the windup, once per cycle, only if still in reach', () => {
    const z = make(0, 1, 3);
    let hits = 0;
    z.update(0.01, { x: 0, z: 0 }, () => hits++);
    expect(z.state).toBe('attack');
    z.update(0.3, { x: 0, z: 0 }, () => hits++);
    expect(hits).toBe(0);
    z.update(0.2, { x: 0, z: 0 }, () => hits++);
    expect(hits).toBe(1);
    z.update(0.3, { x: 0, z: 0 }, () => hits++);
    expect(hits).toBe(1);
    // Next swipe: player steps away before it lands.
    z.update(0.5, { x: 0, z: 0 }, () => hits++);
    z.update(0.01, { x: 0, z: 0 }, () => hits++);
    expect(z.state).toBe('attack');
    z.update(0.5, { x: 0, z: -5 }, () => hits++);
    expect(hits).toBe(1);
  });

  it('staggers when hit, interrupting a swipe in its windup', () => {
    const z = make(0, 1);
    let hits = 0;
    z.update(0.01, { x: 0, z: 0 });
    z.update(0.2, { x: 0, z: 0 }, () => hits++);
    z.hit(20, 0.5, 0, { x: 0, z: 0 });
    expect(z.state).toBe('stagger');
    z.update(0.4, { x: 0, z: 0 }, () => hits++);
    expect(hits).toBe(0);
    z.update(0.2, { x: 0, z: 0 });
    expect(z.state).not.toBe('stagger');
  });

  it('dies at zero health, falls, then becomes a corpse and frees itself', () => {
    const z = make();
    expect(z.hit(25, 0, 0, { x: 0, z: 0 })).toBe(false);
    expect(z.hit(25, 0, 0, { x: 0, z: 0 })).toBe(false);
    expect(z.hit(25, 0, 0, { x: 0, z: 0 })).toBe(true);
    expect(z.alive).toBe(false);
    expect(z.hit(25, 0, 0, { x: 0, z: 0 })).toBe(false); // already dead
    z.update(0.4, { x: 0, z: 0 });
    expect(ZOMBIE_FRAMES.dying).toContain(z.frame);
    z.update(0.5, { x: 0, z: 0 });
    expect(z.state).toBe('corpse');
    z.update(18.5, { x: 0, z: 0 });
    expect(z.sink).toBeGreaterThan(0);
    z.update(2, { x: 0, z: 0 });
    expect(z.state).toBe('free');
    expect(z.active).toBe(false);
  });

  it('is pushed back away from the shooter, capped', () => {
    const z = make(0, 5);
    z.hit(1, 0.3, 10, { x: 0, z: 0 });
    for (let i = 0; i < 30; i++) z.update(0.05, { x: 0, z: 100 }); // target behind it: no walking toward us
    expect(z.z).toBeGreaterThan(5);
  });

  it('cycles walk frames as it moves', () => {
    const z = make(0, 50);
    const seen = new Set();
    for (let i = 0; i < 40; i++) {
      z.update(0.05, { x: 0, z: 0 });
      seen.add(z.frame);
    }
    expect(seen.size).toBe(4);
  });
});

describe('Zombie (M4)', () => {
  const m4 = { ...cfg, riseSeconds: 1.6, burrowSeconds: 2.5, attackDamage: 10, radius: 0.35 };

  it('climbs out of the ground before it moves, and can be shot but not stunned while rising', () => {
    const z = new Zombie(m4);
    z.spawn(0, 10, Math.PI, 3, { rise: true });
    expect(z.state).toBe('rise');
    expect(z.alive).toBe(true);
    z.hit(5, 1, 0, { x: 0, z: 0 });
    expect(z.state).toBe('rise');
    z.update(0.8, { x: 0, z: 0 });
    expect(z.sink).toBeCloseTo(0.5);
    expect(z.z).toBe(10); // hasn't moved
    z.update(1, { x: 0, z: 0 });
    expect(z.state).toBe('walk');
  });

  it('a wandering zombie walks to its goal and never swipes', () => {
    const z = new Zombie(m4);
    z.spawn(0, 1, Math.PI, 3, { mode: 'wander' });
    z.goalX = 0;
    z.goalZ = 20;
    z.hasGoal = true;
    let hits = 0;
    for (let i = 0; i < 200; i++) z.update(0.05, { x: 0, z: 0 }, () => hits++);
    expect(hits).toBe(0);
    expect(z.z).toBeCloseTo(20, 1);
  });

  it('burrows away at dawn: no corpse, back to the pool', () => {
    const z = new Zombie(m4);
    z.spawn(0, 10, 0, 3);
    z.burrow();
    expect(z.alive).toBe(false);
    z.update(2.6, { x: 0, z: 0 });
    expect(z.state).toBe('free');
  });

  it('takes a mutant body: bigger hit shape, its own swipe, shrugs off stagger', () => {
    const z = new Zombie(m4);
    const body = { radius: 0.6, hitRadius: 0.55, height: 2.5, headBottom: 2, headRadius: 0.26, attackReach: 1.9, attackWindup: 0.9, attackRecover: 1.3, attackDamage: 30, turnRate: 3, staggerScale: 0.25, knockbackScale: 0.2 };
    z.spawn(0, 10, 0, 3, { kind: 'mutant', body, health: 300 });
    expect(z.height).toBe(2.5);
    expect(z.hitRadius).toBe(0.55);
    expect(z.glareCircle.r).toBe(0.55);
    z.hit(10, 0.8, 0, { x: 0, z: 0 });
    expect(z.timer).toBeCloseTo(0.2);
    // Back to a normal zombie when reused from the pool.
    z.spawn(0, 10, 0, 3);
    expect(z.height).toBe(cfg.height);
    expect(z.attackReach).toBe(cfg.attackReach);
  });
});
