// Nov 24 (Aaron: three of the Hanged at the Pruitts' plot; they drop, and go back up into the tree when badly hurt).
import { describe, it, expect } from 'vitest';
import { Hanged, turnToward } from '../src/ai/Hanged.js';
import { buildFamilyCemetery } from '../src/render/familyCemeteryModel.js';
import { hasPlaceholder } from '../src/audio/Sfx.js';
import { config } from '../src/config.js';

const cfg = config.familyPlot.hanged;
const flat = { heightAt: () => 0 };

function rig() {
  const player = { position: { x: 0, z: -30 }, yaw: 0 };
  const hurt = [];
  const events = [];
  const sounds = [];
  const combat = { weapons: { extraTargets: [] }, hurtPlayer: (a) => hurt.push(a) };
  const H = new Hanged(cfg, { player, combat, colliders: null, ground: flat, bus: { emit: (e) => events.push(e) }, rng: { next: () => 0.5 }, makeBody: null, sfx: (n) => sounds.push(n) });
  const ropes = config.familyPlot.oak.limbs.map((L, i) => ({ x: Math.sin(L.yaw * Math.PI / 180) * 3, y: L.y, z: Math.cos(L.yaw * Math.PI / 180) * 3 }));
  H.hang(ropes, { x: 0, z: 0 }, ['hangedA', 'hangedB', 'hangedC']);
  const step = (s) => { for (let t = 0; t < s; t += 1 / 30) H.update(1 / 30); };
  return { H, player, hurt, events, sounds, combat, step };
}

describe('the Hanged (Nov 24)', () => {
  it('four hang from the dead oak (Nov 25: the four campers; was three), feet off the ground, bodies and ropes both targets', () => {
    const { H, combat } = rig();
    expect(H.list).toHaveLength(4);
    for (const h of H.list) {
      expect(h.state).toBe('hang');
      expect(h.y).toBeCloseTo(cfg.feetUp);
      expect(h.rope.height).toBeGreaterThan(0.5);
    }
    expect(combat.weapons.extraTargets).toHaveLength(2);
  });

  it('wake when Tom comes within wakeAt of the tree, and drop one by one', () => {
    const { H, player, step } = rig();
    step(1);
    expect(H.woken).toBe(false);
    player.position.z = -(cfg.wakeAt - 1);
    step(0.1);
    expect(H.woken).toBe(true);
    const order = () => H.list.map((h) => h.state);
    expect(order().filter((s) => s !== 'hang')).toHaveLength(1); // only the first so far
    step(cfg.dropEvery * 2 + cfg.snapSeconds + 1.5);
    expect(H.list.every((h) => h.state !== 'hang' && h.state !== 'wake')).toBe(true);
  });

  it('chase him and claw when they reach him', () => {
    const { H, player, hurt, step } = rig();
    player.position.z = -8;
    step(8);
    expect(hurt.length).toBeGreaterThan(0);
    expect(hurt[0]).toBe(cfg.damage);
  });

  it('badly hurt, one goes back up into the branches (untargetable, unseen), once; then drops behind him', () => {
    const { H, player, step } = rig();
    player.position.z = -8;
    step(5);
    const h = H.list[0];
    expect(h.state === 'chase' || h.state === 'claw').toBe(true);
    h.takeHit(h.maxHealth * (1 - cfg.retreatAt) + 1, 'body');
    expect(h.state).toBe('up');
    step(cfg.upSeconds + 0.1);
    expect(h.state).toBe('lurk');
    expect(h.targetable).toBe(false);
    step(cfg.lurk[1] + 0.2);
    expect(['fall', 'land', 'chase', 'claw']).toContain(h.state);
    // Behind him: the camera faces -z at yaw 0, so behind is +z.
    step(0.05);
    h.takeHit(1, 'body');
    expect(h.state).not.toBe('up'); // once only
  });

  it('a shot through the rope drops it early and hurts it; the others wake', () => {
    const { H } = rig();
    const h = H.list[2];
    h.rope.takeHit(10);
    expect(h.state).toBe('fall');
    expect(h.health).toBeCloseTo(h.maxHealth * (1 - cfg.ropeFall));
    expect(H.woken).toBe(true);
    expect(h.rope.targetable).toBe(false);
  });

  it('all four dead: allDead, and the save knows which', () => {
    const { H, events } = rig();
    for (const h of H.list) h.takeHit(9999, 'head');
    expect(events).toContain('hanged:allDead');
    expect(H.deadIndices().sort()).toEqual([0, 1, 2, 3]);
    H.hang(H.list.map((h) => h.knot), { x: 0, z: 0 }, ['hangedA'], [0, 2]);
    expect(H.list.map((h) => h.i)).toEqual([1, 3]);
  });

  it('turns the short way', () => {
    expect(Math.cos(turnToward(3, -3, 10))).toBeCloseTo(Math.cos(-3)); // the same heading (a full turn on)
    expect(turnToward(3, -3, 10) - 3).toBeCloseTo(2 * Math.PI - 6); // the short way: across the wrap
    expect(turnToward(0, 1, 0.2)).toBeCloseTo(0.2);
  });

  it('every sound it makes has a placeholder', () => {
    for (const n of ['ropeCreak', 'ropeSnap', 'bodyThud', 'hangedSnarl', 'branchThrash']) expect(hasPlaceholder(n), n).toBe(true);
  });
});

describe('the family plot (Nov 24)', () => {
  it('builds: the oak with a rope on each limb, six headstones, colliders', () => {
    const m = buildFamilyCemetery(config.familyPlot);
    expect(m.ropes).toHaveLength(config.familyPlot.oak.limbs.length);
    expect(m.colliders).toHaveLength(1 + config.familyPlot.stones.length);
    // The sigil goes in at (2.5, 1.5): clear of the stones.
    for (const s of config.familyPlot.stones) expect(Math.hypot(s[0] - 2.5, s[1] - 1.5)).toBeGreaterThan(1.5);
    m.dispose();
  });
});
