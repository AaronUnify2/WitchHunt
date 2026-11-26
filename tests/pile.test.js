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
    expect(seams).toHaveLength(C.seams.count);
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

// Nov 25 (Aaron: "a debug button to start the game at the point of this boss fight").
describe('the debug start at the Pile', () => {
  it('has the opening through Night 2 done and the tunnel call made, and nothing after', async () => {
    const { PILE_FLAGS } = await import('../src/debug/storyStart.js');
    for (const f of ['day1Battery', 'shelterOpened', 'rifleClaimed', 'night2Done', 'tunnelCall']) expect(PILE_FLAGS, f).toContain(f);
    for (const f of ['tunnelSeen', 'tunnelCleared', 'farmCall', 'outpostCall', 'outpostCleared']) expect(PILE_FLAGS, f).not.toContain(f);
  });
});

// Nov 25 (Aaron: "a cutscene to show the pile emerging from the ground"; the eye teaser; the caption).
describe("the Pile's cutscene", () => {
  const list = (d) => (Array.isArray(d) ? d : d.cutscenes);
  it('plays the first time Tom sees the tunnel; the Pile waits under the rubble and fights when it ends', async () => {
    const cut = list((await import('../src/data/cutscenes.json')).default).find((c) => c.id === 'pile.emerge');
    expect(cut.duration).toBeGreaterThan(8);
    expect(cut.duration).toBeLessThan(11);
    const events = cut.tracks.filter((t) => t.do === 'emit').map((t) => t.event);
    expect(events).toEqual(['pile:burst', 'pile:heave', 'pile:eye']);
    expect(cut.tracks.find((t) => t.do === 'caption')).toMatchObject({ text: 'The Laurel Gap Tunnel', sub: 'Day 3' });

    const r = rig();
    const flags = new Set(['night2Done', 'tunnelCall']);
    let played = null;
    const t = new Tunnel(config, r.bus);
    t.init({
      world: { map: { roadNorth: { barrier: { x: 0, z: -9 } } } },
      player: { position: { x: 0, z: 10 } },
      progress: { has: (f) => flags.has(f), setFlag: (f) => flags.add(f) },
      dialogue: { play() {} },
      cutscenes: { active: false, play: (id, o) => ((played = { id, o }), true) },
      pile: r.pile,
    });
    r.pile.stop();
    t.update(0.1, true);
    expect(played.id).toBe('pile.emerge');
    expect(flags.has('pileSeen')).toBe(true);
    expect(r.pile.phase).toBe('intro');
    expect(r.pile.risen).toBe(0);
    r.run(1);
    expect(r.pile.targets).toHaveLength(0); // nothing to shoot, nothing hits him
    r.bus.emit('pile:burst');
    r.bus.emit('pile:heave');
    r.run(C.emergeSeconds + 0.2);
    expect(r.pile.risen).toBe(1);
    expect(r.pile.phase).toBe('intro'); // still waiting on the cutscene
    played.o.onDone(false);
    expect(r.pile.phase).toBe('fight');
  });

  it('skipped straight away, it comes up whole and fights', () => {
    const r = rig();
    r.pile.start(0, 0, 0, { intro: true });
    r.pile.beginFight();
    expect(r.pile.phase).toBe('fight');
    expect(r.pile.risen).toBe(1);
  });
});

// Nov 25 (Aaron's concept art: a big red eye in the middle, "its heart is vulnerable").
describe("the Pile's heart", () => {
  it('is one of its eyes, bigger, and hurts its magic twice as much', () => {
    const { pile, run } = rig();
    run(C.emergeSeconds + C.charge.first + 0.2);
    pile.charge.takeHit(50);
    run(0.05);
    const heart = pile.targets.find((t) => t.heart);
    const eye = pile.targets.find((t) => pile.seams.includes(t) && !t.heart);
    expect(heart.hitRadius).toBeGreaterThan(eye.hitRadius);
    const m0 = pile.magic;
    eye.takeHit(100);
    const byEye = m0 - pile.magic;
    const m1 = pile.magic;
    heart.takeHit(100);
    expect(m1 - pile.magic).toBeCloseTo(byEye * C.seams.heart.magicScale);
  });
});

// Nov 26 (Aaron: "it moves a little too slow ... super easy to just shoot it and walk backwards"; more aggressive,
// tendrils lashing, and a leap high into the air and down on the ground: medium and small only).
describe('the Pile, more aggressive (Nov 26)', () => {
  const fighting = (bodies = 30) => {
    const r = rig();
    r.run(C.emergeSeconds + 0.05);
    r.pile.bodies = bodies;
    return r;
  };

  it('surges at him faster than he can walk backwards', () => {
    const { pile, player, run, events } = fighting();
    pile.attackCool = 99; // (no attacks: just the chase)
    pile.surgeCool = 0;
    player.position = { x: 0, z: 30 };
    const z0 = pile.z;
    run(0.05);
    expect(events).toContain('pile:surge');
    run(C.surge.seconds - 0.1);
    const speed = (pile.z - z0) / C.surge.seconds;
    expect(speed).toBeGreaterThan(config.player.walkSpeed);
  });

  it('lashes in every stage, in flurries, each one a hit if he stays put', () => {
    for (const st of ['large', 'medium', 'small']) expect(C.stages[st].attacks).toContain('lash');
    const { pile, player, run, hurt } = fighting();
    pile.surgeCool = 99;
    pile.attackCool = 99;
    player.position = { x: 0, z: 9 };
    run(2); // (he's stood still: nothing to lead)
    pile.attack = { kind: 'lash', state: 'windup', t: 0, at: { x: 0, z: 9 }, left: 3 };
    run(C.attacks.lash.windup + 2 * C.attacks.lash.gap + 0.3);
    expect(hurt.filter((d) => d === C.attacks.lash.damage).length).toBe(3);
  });

  it('leaps only once it is smaller, and when he keeps off it is what it does', () => {
    expect(C.stages.large.attacks).not.toContain('leap');
    const big = fighting(30);
    expect(big.pile.pickAttack(big.pile.radius + 15)).not.toBe('leap');
    const mid = fighting(15);
    expect(mid.pile.pickAttack(mid.pile.radius + C.attacks.leap.prefer + 1)).toBe('leap');
    expect(mid.pile.pickAttack(mid.pile.radius + 2)).not.toBe('leap'); // too close: something else
    mid.pile.leapCool = 1;
    expect(mid.pile.pickAttack(mid.pile.radius + C.attacks.leap.prefer + 1)).not.toBe('leap'); // not straight again
  });

  it('springs high, comes down where he stood, hurts him, throws him back and shakes bodies loose', () => {
    const { pile, player, run, hurt, events, spawned } = fighting(15);
    pile.surgeCool = 99;
    player.position = { x: 0, z: 16 };
    pile.attack = { kind: 'leap', state: 'windup', t: 0, at: { x: 0, z: 16 } };
    const L = C.attacks.leap;
    run(L.windup + L.strike * 0.5);
    expect(events).toContain('pile:leap');
    expect(pile.air).toBeGreaterThan(L.height * 0.8);
    expect(pile.air).toBeLessThanOrEqual(L.height);
    run(L.strike * 0.5 + 0.05);
    expect(events).toContain('pile:landed');
    expect(pile.air).toBe(0);
    expect(Math.hypot(pile.x, pile.z - 16)).toBeLessThan(0.5);
    expect(hurt).toContain(L.damage);
    expect(pile.bodies).toBe(15 - L.shed);
    run(L.seconds + 0.05);
    expect(Math.hypot(player.position.x - pile.x, player.position.z - pile.z)).toBeGreaterThan(L.distance * 0.9);
    run(1.5);
    expect(spawned.length).toBeGreaterThanOrEqual(L.shed);
  });

  it('sidestepped as it comes down: no hit', () => {
    const { pile, player, run, hurt } = fighting(15);
    pile.surgeCool = 99;
    player.position = { x: 0, z: 16 };
    pile.attack = { kind: 'leap', state: 'windup', t: 0, at: { x: 0, z: 16 } };
    const L = C.attacks.leap;
    run(L.windup + 0.05);
    player.position = { x: 12, z: 16 };
    run(L.strike);
    expect(hurt).not.toContain(L.damage);
  });

  it('its idle tendrils snap at him when he is in close', () => {
    const { pile, player, run, hurt } = fighting();
    pile.attackCool = 99;
    pile.surgeCool = 99;
    player.position = { x: 0, z: pile.radius + C.snap.reach - 0.5 };
    run(0.1);
    expect(hurt).toContain(C.snap.damage);
  });
});

// Nov 26 (Aaron: "I can't beat the pile now. The tendrils have too much range"; "move skittery, like an injured
// spider on the explosion").
describe('the Pile, tuned down and skittering (Nov 26)', () => {
  it('its tendrils reach less far and hurt less', () => {
    expect(C.attacks.lash.range).toBeLessThanOrEqual(9);
    expect(C.attacks.lash.damage).toBeLessThanOrEqual(11);
    expect(C.attacks.grab.range).toBeLessThanOrEqual(10);
    expect(C.snap.reach).toBeLessThanOrEqual(2.5);
  });

  it('blasted, it skitters about in jerks near where it was hit, its eyes going with it', () => {
    const { pile, run } = rig();
    run(C.emergeSeconds + C.charge.first + 0.2);
    pile.charge.takeHit(50);
    expect(pile.cycle).toBe('reel');
    const at = { x: pile.x, z: pile.z };
    const seen = [];
    for (let i = 0; i < 60; i++) {
      run(0.05);
      seen.push({ x: pile.x, z: pile.z });
      expect(Math.hypot(pile.x - at.x, pile.z - at.z)).toBeLessThanOrEqual(C.skitter.range + 1e-6);
    }
    const moved = seen.some((p) => Math.hypot(p.x - at.x, p.z - at.z) > 0.5);
    expect(moved).toBe(true);
    // Still now and then (the rests between darts).
    let still = 0;
    for (let i = 1; i < seen.length; i++) if (Math.hypot(seen[i].x - seen[i - 1].x, seen[i].z - seen[i - 1].z) < 1e-6) still++;
    expect(still).toBeGreaterThan(5);
    const eye = pile.targets.find((t) => pile.seams.includes(t));
    expect(Math.hypot(eye.x - pile.x, eye.z - pile.z)).toBeLessThan(pile.radius + 0.5);
  });
});
