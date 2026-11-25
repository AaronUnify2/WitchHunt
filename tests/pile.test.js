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
    run(C.shed.flight + 0.06); // just landed: killed before a tendril can reach it
    expect(spawned).toHaveLength(1);
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

// Nov 25, pass 1 (readability): its bar, the charge's beeping, the nudge when the first charge is missed.
describe('the Pile, pass 1: reading the fight', () => {
  const withHud = () => {
    const r = rig();
    const bars = [];
    const sounds = [];
    const said = [];
    r.pile.combat.hud = { boss: (f, o) => bars.push([f, o?.name ?? null, o?.owner]) };
    r.pile.combat.sfx = { play: (n) => sounds.push(n) };
    r.pile.dialogue = { play: (id) => said.push(id) };
    return { ...r, bars, sounds, said };
  };

  it('shows its magic and body count on the boss bar, and takes it down when it dies', () => {
    const { pile, run, bars } = withHud();
    run(C.emergeSeconds + 0.1);
    const last = bars[bars.length - 1];
    expect(last[0]).toBe(1);
    expect(last[1]).toMatch(/THE PILE/);
    expect(last[1]).toMatch(/30/);
    expect(last[2]).toBe('pile');
    pile.hurtMagic(C.magic);
    run(0.1);
    expect(bars[bars.length - 1][0]).toBeNull();
  });

  it('beeps faster as the charge window runs out, and Wyatt nudges if the first is missed', () => {
    const { pile, run, sounds, said } = withHud();
    run(C.emergeSeconds + C.charge.first + 0.1);
    expect(pile.cycle).toBe('charge');
    const early = sounds.filter((s) => s === 'helmetPing').length;
    run(C.charge.window / 2);
    const mid = sounds.filter((s) => s === 'helmetPing').length - early;
    run(C.charge.window / 2);
    const late = sounds.filter((s) => s === 'helmetPing').length - early - mid;
    expect(late).toBeGreaterThan(mid);
    expect(pile.cycle).toBe('scramble');
    expect(said).toContain(C.lines.missed);
  });

  it("the witch's null doesn't hide the Pile's bar", async () => {
    const { Hud } = await import('../src/ui/Hud.js');
    const h = Object.create(Hud.prototype);
    const shown = [];
    h.set = (k, v, fn) => k === 'boss' && shown.push(v);
    h.boss(0.5, { owner: 'pile' });
    h.boss(null); // the witch, every frame
    expect(shown).toEqual([0.5]);
    h.boss(null, { owner: 'pile' });
    expect(shown).toEqual([0.5, null]);
  });
});

// Nov 25, pass 2 (impact): dust and rubble as it comes up, screams as bodies fly, a burst of green when it dies.
describe('the Pile, pass 2: impact', () => {
  it('throws up dust, screams as it sheds, and goes out in a burst of green', () => {
    const r = rig();
    const puffs = [];
    const sounds = [];
    const shakes = [];
    r.pile.combat.fx = { emit: (x, y, z, n, c) => puffs.push(c) };
    r.pile.combat.sfx = { play: (n) => sounds.push(n) };
    r.player.shake = (a) => shakes.push(a);
    r.pile.start(0, 0, 0);
    expect(shakes[0]).toBe(C.fx.emergeShake);
    r.run(1);
    expect(puffs).toContain(C.fx.dust);
    expect(puffs).toContain(C.fx.rubble);
    r.run(C.emergeSeconds);
    r.pile.shed(5, { x: 0, z: 30 });
    expect(sounds).toContain('camperScream');
    expect(puffs).toContain(C.fx.magic);
    r.run(1);
    expect(sounds).toContain('bodyThud');
    r.pile.hurtMagic(C.magic);
    expect(sounds).toContain('cleanse');
    expect(shakes).toContain(C.fx.deathShake);
    r.run(0.5);
    expect(r.pile.deadT).toBeGreaterThan(0.4);
  });
});

// Nov 25 (Aaron: "lean into the tendril element"): the grab.
describe('the Pile: the grab', () => {
  const grabbing = () => {
    const r = rig();
    r.run(C.emergeSeconds + 0.1);
    r.pile.bodies = 15; // medium: it can grab
    r.pile.cycle = 'scramble';
    r.pile.cycleT = 0;
    r.player.position = { x: 0, z: 9 };
    r.pile.attack = { kind: 'grab', state: 'windup', t: C.attacks.grab.windup, at: { x: 0, z: 9 } };
    r.pile.update(0.01, true); // strike: the tendril's thrown
    return r;
  };

  it('a tendril thrown at him takes him and reels him in; he can not walk', () => {
    const { pile, player, run } = grabbing();
    expect(pile.grab?.state).toBe('out');
    run(0.6);
    expect(pile.grab?.state).toBe('hold');
    expect(player.rooted).toBe(true);
    const z0 = player.position.z;
    run(0.5);
    expect(player.position.z).toBeLessThan(z0);
  });

  it('shot through, it lets him go', () => {
    const { pile, player, run } = grabbing();
    run(0.6);
    const pt = pile.targets.find((t) => pile.grab.targets?.includes(t));
    expect(pt).toBeDefined();
    pt.takeHit(10);
    expect(pile.grab).toBeNull();
    expect(player.rooted).toBe(false);
  });

  it('reeled all the way in: a heavy hit, and thrown back out', () => {
    const { pile, player, run, hurt } = grabbing();
    run(6);
    expect(pile.grab).toBeNull();
    expect(player.rooted).toBe(false);
    expect(hurt).toContain(C.attacks.grab.damage);
  });

  it('a sidestep dodges it', () => {
    const { pile, player, run } = grabbing();
    player.position = { x: 6, z: 2 };
    run(1.5);
    expect(pile.grab).toBeNull();
    expect(player.rooted).toBeFalsy();
  });
});
