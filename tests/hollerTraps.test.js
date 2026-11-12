// Session 29, batch 2: the holler's traps (combat/hollerTraps.js) and the wire cutters
// (encounters/Holler.js).
import { describe, it, expect } from 'vitest';
import { config } from './mapFixture.js';
import { HollerTraps, segmentsCross, inCone, steppedIn, trapFlag, nearestOnSegment } from '../src/combat/hollerTraps.js';
import { Holler, FLAGS } from '../src/encounters/Holler.js';
import progressData from '../src/data/progress.json';
import data from '../src/data/holler.json';

const R = config.holler.trapRules;

describe('the pure parts', () => {
  it('tells when a step crosses a line', () => {
    expect(segmentsCross(0, -1, 0, 1, -2, 0, 2, 0)).toBe(true);
    expect(segmentsCross(0, -1, 0, -0.2, -2, 0, 2, 0)).toBe(false);
    expect(segmentsCross(3, -1, 3, 1, -2, 0, 2, 0)).toBe(false); // past the line's end
  });

  it("knows what's in a stump gun's charge", () => {
    const gun = { x: 0, z: 0, dirX: 0, dirZ: 1 };
    expect(inCone(gun, 0, 5, R.shotgun.range, R.shotgun.halfAngle)).toBeCloseTo(5);
    expect(inCone(gun, 0.5, 5, R.shotgun.range, R.shotgun.halfAngle)).toBeGreaterThan(0);
    expect(inCone(gun, 4, 5, R.shotgun.range, R.shotgun.halfAngle)).toBe(-1); // off to the side
    expect(inCone(gun, 0, -3, R.shotgun.range, R.shotgun.halfAngle)).toBe(-1); // behind it
    expect(inCone(gun, 0, 30, R.shotgun.range, R.shotgun.halfAngle)).toBe(-1); // out of range
  });

  it('lines catch feet, not a jump; plates and nooses catch whoever steps on them', () => {
    const line = { kind: 'cans', state: 'armed', a: { x: -3, z: 0 }, b: { x: 3, z: 0 } };
    expect(steppedIn(line, R, 0, -0.2, 0, 0.2)).toBe(true);
    expect(steppedIn(line, R, 0, -0.2, 0, 0.2, true)).toBe(false);
    expect(steppedIn({ ...line, state: 'sprung' }, R, 0, -0.2, 0, 0.2)).toBe(false);
    const bear = { kind: 'bear', state: 'armed', x: 0, z: 0 };
    expect(steppedIn(bear, R, 1, 1, 0.2, 0.1)).toBe(true);
    expect(steppedIn(bear, R, 1, 1, 0.9, 0.9)).toBe(false);
    expect(nearestOnSegment({ x: -3, z: 0 }, { x: 3, z: 0 }, 1, 2).d).toBeCloseTo(2);
  });

  it('has a story flag for every trap, and the cutters', () => {
    const ids = new Set(progressData.flags.map((f) => f.id));
    for (const t of config.holler.traps) expect(ids.has(trapFlag(t.id)), t.id).toBe(true);
    for (const f of FLAGS) expect(ids.has(f), f).toBe(true);
    expect(trapFlag('bear1')).toBe('hollerTrapBear1');
  });

  it('has lines for every kind', () => {
    for (const k of ['shotgun', 'cans', 'bear', 'snare']) {
      expect(data.traps[k].hint, k).toBeTruthy();
      expect(data.traps[k].disarm.prompt, k).toBeTruthy();
    }
    for (const k of ['bear', 'snare']) expect(data.traps[k].free.prompt).toBeTruthy();
    for (const k of ['shotgun', 'cans']) expect(data.traps[k].noCutters).toBeTruthy();
  });
});

// A small world: a line across z = 0, a bear trap at (0, 5), a snare at (0, 8), a stump gun aimed down a
// line at z = 12 from (4, 12) (aiming -x), cans at z = 15.
function rig() {
  const flags = new Set();
  const events = [];
  const bus = { on() {}, emit: (e, p) => events.push([e, p]) };
  const looks = new Map();
  const site = {
    ready: true,
    place: { x: 0, z: 5, radius: 30 },
    traps: [
      { i: 0, id: 'mouthGun', kind: 'shotgun', sprung: true, x: 0, z: -5, a: { x: -3, z: -5 }, b: { x: 3, z: -5 }, gun: { x: 4, z: -5, dirX: -1, dirZ: 0 } },
      { i: 1, id: 'bear1', kind: 'bear', x: 0, z: 5 },
      { i: 2, id: 'snare1', kind: 'snare', x: 0, z: 8 },
      { i: 3, id: 'gun2', kind: 'shotgun', x: 0, z: 12, a: { x: -3, z: 12 }, b: { x: 3, z: 12 }, gun: { x: 4, z: 12, dirX: -1, dirZ: 0 } },
      { i: 4, id: 'cans1', kind: 'cans', x: 0, z: 15, a: { x: -3, z: 15 }, b: { x: 3, z: 15 } },
    ],
    setTrap: (i, lk) => looks.set(i, lk),
  };
  const player = { position: { x: 0, z: -2 }, onGround: true, rooted: false, platform: null };
  const hurt = [];
  const alerts = [];
  const living = [];
  const damaged = [];
  const combat = { alive: true, hurtPlayer: (d) => hurt.push(d), weapons: { addAmmo: () => true } };
  const enemies = {
    living,
    alert: (x, z, r) => alerts.push(r),
    damage: (z, amount) => {
      damaged.push([z, amount]);
      z.health -= amount;
      if (z.health <= 0) z.alive = false;
      return !z.alive;
    },
  };
  const progress = { has: (f) => flags.has(f), setFlag: (f, on = true) => (on ? flags.add(f) : flags.delete(f)) };
  const notes = [];
  const traps = new HollerTraps(config.holler, bus);
  traps.init({ site, player, combat, enemies, progress, sfx: null, notify: (t) => notes.push(t), texts: data.traps });
  const walk = (x, z) => {
    player.position.x = x;
    player.position.z = z;
    traps.update(1 / 30, true);
  };
  return { traps, site, player, flags, events, looks, hurt, alerts, living, damaged, combat, notes, walk };
}

describe('the traps going off', () => {
  it('starts armed but for the one already sprung, and remembers what went', () => {
    const r = rig();
    expect(r.traps.list.map((t) => t.state)).toEqual(['sprung', 'armed', 'armed', 'armed', 'armed']);
    expect(r.looks.get(0)).toBe('sprung');
    r.flags.add('hollerTrapBear1');
    r.traps.reset();
    expect(r.traps.list[1].state).toBe('sprung');
  });

  it('a stump gun fires down its line at Tom walking through it', () => {
    const r = rig();
    r.walk(0, 11.8);
    r.walk(0, 12.2);
    expect(r.traps.list[3].state).toBe('sprung');
    expect(r.hurt.length).toBe(1);
    expect(r.hurt[0]).toBeGreaterThan(R.shotgun.tomDamage * 0.4);
    expect(r.flags.has('hollerTrapGun2')).toBe(true);
    expect(r.looks.get(3)).toBe('sprung');
  });

  it("doesn't fire when he jumps the line", () => {
    const r = rig();
    r.walk(0, 11.8);
    r.player.onGround = false;
    r.walk(0, 12.2);
    expect(r.traps.list[3].state).toBe('armed');
    expect(r.hurt.length).toBe(0);
  });

  it('the cans rattle and every dead thing for a long way hears', () => {
    const r = rig();
    r.walk(0, 14.8);
    r.walk(0, 15.2);
    expect(r.alerts).toContain(R.cans.alert);
    expect(r.events.some(([e]) => e === 'holler:alarm')).toBe(true);
  });

  it("a bear trap holds Tom until he prises it open (X), and a death lets him go", () => {
    const r = rig();
    r.walk(0, 4.6);
    r.walk(0, 5.0);
    expect(r.player.rooted).toBe(true);
    expect(r.traps.held.id).toBe('bear1');
    const opts = r.traps.options('X', false);
    expect(opts.length).toBe(1);
    expect(opts[0].prompt).toContain(data.traps.bear.free.prompt);
    opts[0].act();
    expect(r.player.rooted).toBe(false);
    // Caught again in the snare, then killed: let go.
    r.walk(0, 7.6);
    r.walk(0, 8.0);
    expect(r.player.rooted).toBe(true);
    r.combat.alive = false;
    r.walk(0, 8.0);
    expect(r.player.rooted).toBe(false);
  });

  it('leads the dead into them: the gun takes what walks through its line, the bear trap holds one', () => {
    const r = rig();
    r.player.position.x = 20; // well out of the way
    const z1 = { x: 0, z: 11.5, y: 0, health: 60, alive: true, state: 'walk' };
    const z2 = { x: -1.5, z: 12.6, y: 0, health: 60, alive: true, state: 'walk' }; // stood in the charge
    r.living.push(z1, z2);
    r.traps.update(1 / 30, true);
    z1.z = 12.3;
    r.traps.update(1 / 30, true);
    expect(r.traps.list[3].state).toBe('sprung');
    expect(r.damaged.filter(([z]) => z === z1 || z === z2).length).toBe(2);
    expect(r.hurt.length).toBe(0); // Tom wasn't in it
    const z3 = { x: 0, z: 4, y: 0, health: 60, alive: true, state: 'walk' };
    r.living.push(z3);
    r.traps.update(1 / 30, true);
    z3.z = 4.9;
    r.traps.update(1 / 30, true);
    expect(r.traps.list[1].state).toBe('sprung');
    expect(z3.slow).toBe(0);
    expect(z3.slowTimer).toBe(R.bear.holdSeconds);
    expect(r.player.rooted).toBe(false);
  });

  it('disarms: plates and pegs by hand, lines only with the cutters (shells out of the gun)', () => {
    const r = rig();
    r.player.position.x = 0;
    r.player.position.z = 11.2;
    let o = r.traps.options('X', false);
    expect(o.find((q) => q.key === 'read:gun2').act).toBeNull();
    o = r.traps.options('X', true);
    const cut = o.find((q) => q.key === 'disarm:gun2');
    expect(cut.prompt).toContain(data.traps.shotgun.disarm.prompt);
    cut.act();
    expect(r.traps.list[3].state).toBe('disarmed');
    expect(r.flags.has('hollerTrapGun2')).toBe(true);
    // Walking through a cut line does nothing.
    r.walk(0, 11.8);
    r.walk(0, 12.2);
    expect(r.hurt.length).toBe(0);
    r.player.position.z = 4.2;
    const spring = r.traps.options('X', false).find((q) => q.key === 'disarm:bear1');
    expect(spring).toBeTruthy();
    spring.act();
    expect(r.traps.list[1].state).toBe('disarmed');
  });

  it('tells him about each kind once, as he first comes near one', () => {
    const r = rig();
    r.walk(0, 1.5);
    expect(r.notes).toContain(data.traps.bear.hint);
    const n = r.notes.length;
    r.walk(0, 2);
    expect(r.notes.length).toBe(n);
  });
});

describe('the wire cutters', () => {
  it('are taken at the lookout and cut lines from then on', () => {
    const flags = new Set();
    const shown = {};
    const site = { ready: true, place: { x: 0, z: 0, radius: 30, yaw: 0 }, spots: { cutters: { x: 1, z: 1 }, sign: { x: 50, z: 50 } }, traps: [], show: (n, on) => (shown[n] = on), setTrap() {}, at: (x, z) => ({ x, z }) };
    const h = new Holler(config, { on() {}, emit() {} });
    h.init({ site, player: { position: { x: 1, z: 1.5 } }, combat: { sfx: null, alive: true }, enemies: { living: [] }, progress: { has: (f) => flags.has(f), setFlag: (f, on = true) => (on ? flags.add(f) : flags.delete(f)) }, notify() {} });
    expect(shown.cutters).toBe(true);
    const best = h.pick('X');
    expect(best.key).toBe('cutters');
    best.act();
    expect(h.cutters).toBe(true);
    expect(shown.cutters).toBe(false);
    h.reset();
    expect(shown.cutters).toBe(false);
  });
});
