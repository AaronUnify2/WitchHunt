// Nov 25 (Aaron): the Pile, Day 3's fight at the tunnel (ai/Pile.js). Two numbers: bodies (its size, down and up)
// and magic (its real health, only down: charges and seams).
import { describe, it, expect } from 'vitest';
import { Pile } from '../src/ai/Pile.js';
import { Tunnel } from '../src/encounters/Tunnel.js';
import dialogueData from '../src/data/dialogue.json';
import { config } from '../src/config.js';

const C = config.pile;
const ids = new Set(dialogueData.lines.map((l) => l.id));

const rig = () => {
  const events = [];
  const hurt = [];
  const blasts = [];
  const spawned = [];
  const handlers = new Map();
  const bus = {
    emit: (e, d) => {
      events.push(e);
      for (const h of handlers.get(e) ?? []) h(d);
    },
    on: (e, h) => {
      if (!handlers.has(e)) handlers.set(e, []);
      handlers.get(e).push(h);
      return () => {};
    },
  };
  const enemies = {
    spawnZombie: (x, z, o) => {
      const zb = { x, z, variant: o.variant, state: 'walk', get alive() { return this.state !== 'free' && this.state !== 'dead'; }, get active() { return this.state !== 'free'; } };
      spawned.push(zb);
      return zb;
    },
    brain: { chase() {} },
    alert() {},
  };
  const player = { position: { x: 0, z: 30 }, shake() {} };
  let r = 0;
  const pile = new Pile(C, bus, {
    ground: { heightAt: () => 0, clamp() {} },
    player,
    combat: { enemies, weapons: { extraTargets: [] }, hurtPlayer: (d) => hurt.push(d), sfx: null },
    explosives: { ec: {}, blast: (x, y, z, e, s) => blasts.push(s) },
    rng: () => ((r = (r * 9301 + 49297) % 233280) / 233280),
  });
  const run = (s, dt = 0.05) => {
    for (let t = 0; t < s; t += dt) pile.update(dt, true);
  };
  pile.start(0, 0, 0);
  return { pile, events, hurt, blasts, spawned, player, run, bus };
};

describe('the Pile (Nov 25)', () => {
  it('comes up with 30 bodies and full magic, and can be shot once it is up', () => {
    const { pile, run } = rig();
    expect(pile.bodies).toBe(30);
    expect(pile.magic).toBe(C.magic);
    run(0.5);
    expect(pile.targets).toHaveLength(0); // still heaving up
    run(C.emergeSeconds);
    expect(pile.phase).toBe('fight');
    expect(pile.targets).toContain(pile.mass);
  });

  it('is big and slow at the start, and speeds up as it shrinks', () => {
    const { pile } = rig();
    expect(pile.stage).toBe('large');
    const big = pile.radius;
    pile.bodies = 15;
    expect(pile.stage).toBe('medium');
    pile.bodies = 5;
    expect(pile.stage).toBe('small');
    expect(pile.radius).toBeLessThan(big);
    expect(C.stages.large.speed).toBeLessThan(C.stages.medium.speed);
    expect(C.stages.medium.speed).toBeLessThan(C.stages.small.speed);
  });

  it('gunfire knocks bodies off but never touches the magic', () => {
    const { pile, run, spawned } = rig();
    run(C.emergeSeconds + 0.1);
    pile.mass.takeHit(C.shots.perBody * 2 + 1, 'body', {}, {}, { x: 0, z: 30 });
    expect(pile.bodies).toBe(28);
    expect(pile.magic).toBe(C.magic);
    run(1.5);
    expect(spawned.length).toBe(2); // they land and get up
  });

  it('a charge surfaces; shot, it blasts bodies off, takes magic, and opens seams', () => {
    const { pile, run, blasts, events } = rig();
    run(C.emergeSeconds + C.charge.first + 0.2);
    expect(pile.cycle).toBe('charge');
    expect(pile.targets).toContain(pile.charge);
    pile.charge.takeHit(50);
    expect(blasts).toEqual(['pile']);
    expect(events).toContain('pile:blast');
    expect(pile.magic).toBe(C.magic - C.charge.magic);
    expect(pile.bodies).toBeLessThan(30);
    expect(pile.cycle).toBe('reel');
    run(0.05);
    const seams = pile.targets.filter((t) => pile.seams.includes(t));
    expect(seams).toHaveLength(3);
    const before = pile.magic;
    seams[0].takeHit(100);
    expect(pile.magic).toBeCloseTo(before - 100 * C.seams.magicPerDamage);
  });

  it('drags its fallen back in with tendrils; one cut drops its body, which gets up again', () => {
    const { pile, run, spawned } = rig();
    run(C.emergeSeconds + 0.1);
    pile.mass.takeHit(C.shots.perBody, 'body', {}, {}, { x: 0, z: 30 });
    run(1.2);
    expect(spawned).toHaveLength(1);
    const fallen = spawned[0];
    expect(pile.bodies).toBe(29);
    run(3);
    expect(fallen.state).toBe('free'); // taken
    // It came back in, or is on its way.
    if (pile.tendrils.length) {
      const t = pile.tendrils[0];
      expect(t.state).toBe('drag');
      pile.cut(t);
      expect(spawned).toHaveLength(2);
    } else {
      expect(pile.bodies).toBe(30);
    }
  });

  it("a fallen one killed before it's taken is gone for good", () => {
    const { pile, run, spawned } = rig();
    run(C.emergeSeconds + 0.1);
    pile.mass.takeHit(C.shots.perBody, 'body', {}, {}, { x: 0, z: 30 });
    run(1.2);
    spawned[0].state = 'dead';
    run(5);
    expect(pile.bodies).toBe(29);
  });

  it('no more than maxLoose of its fallen up at once', () => {
    const { pile, run, spawned } = rig();
    run(C.emergeSeconds + 0.1);
    pile.player.position = { x: 0, z: 200 }; // out of the tendrils' reach for the moment
    pile.shed(20, { x: 0, z: 30 });
    run(1.5);
    expect(spawned.length).toBe(C.maxLoose);
  });

  it('out of magic, it falls apart: the bodies left stand up, and the tunnel is done', () => {
    const { pile, run, events, spawned, bus } = rig();
    const flags = new Set(['night2Done', 'tunnelCall', 'tunnelSeen']);
    const t = new Tunnel(config, bus);
    t.init({ progress: { has: (f) => flags.has(f), setFlag: (f) => flags.add(f) }, pile: null });
    run(C.emergeSeconds + 0.1);
    pile.hurtMagic(C.magic);
    expect(pile.phase).toBe('dead');
    expect(events).toContain('pile:dead');
    expect(flags.has('tunnelCleared')).toBe(true);
    run(1);
    expect(spawned.length).toBe(Math.min(30, C.lastGroup));
    expect(pile.targets).toHaveLength(0);
  });

  it('hurts Tom when it rolls into him', () => {
    const { pile, run, hurt, player } = rig();
    run(C.emergeSeconds + 0.1);
    player.position = { x: 0, z: pile.radius + 0.2 };
    run(0.2);
    expect(hurt.length).toBeGreaterThan(0);
  });

  it('has its lines', () => {
    for (const id of Object.values(C.lines)) expect(ids.has(id), id).toBe(true);
  });
});
