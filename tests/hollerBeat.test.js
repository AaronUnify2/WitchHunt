// Session 29, batch 3: the moonshiners' holler's beat (encounters/Holler.js): the sweep, the family,
// the trap map, the still and its valves, the auto shotgun, the copper worm.
import { describe, it, expect } from 'vitest';
import { config } from './mapFixture.js';
import { Holler, FLAGS, valveTurn, gaugeStep, stillLook } from '../src/encounters/Holler.js';
import data from '../src/data/holler.json';
import progressData from '../src/data/progress.json';
import papers from '../src/data/papers.json';
import lore from '../src/data/lore.json';
import dialogue from '../src/data/dialogue.json';
import cutscenes from '../src/data/cutscenes.json';
import loot from '../src/data/loot.json';
import { drawingSvg } from '../src/ui/paperDrawings.js';
import { gaugeAngle } from '../src/world/HollerSite.js';

const ec = config.holler.encounter;
const S = ec.still;

describe('the still (pure)', () => {
  it('takes its valves in order: damper, relief, line', () => {
    expect(valveTurn(S.order, [], 'damper')).toBe('ok');
    expect(valveTurn(S.order, [], 'relief')).toBe('early');
    expect(valveTurn(S.order, [], 'line')).toBe('early');
    expect(valveTurn(S.order, ['damper'], 'relief')).toBe('ok');
    expect(valveTurn(S.order, ['damper'], 'line')).toBe('early');
    expect(valveTurn(S.order, ['damper', 'relief'], 'line')).toBe('ok');
    expect(valveTurn(S.order, ['damper'], 'damper')).toBe('done');
  });

  it('climbs from the red to blowing over blowSeconds, holds when damped, bleeds down', () => {
    let v = S.start;
    for (let t = 0; t < S.blowSeconds - 1; t += 1) v = gaugeStep(v, 'climbing', 1, S);
    expect(v).toBeLessThan(1);
    v = gaugeStep(v, 'climbing', 2, S);
    expect(v).toBeGreaterThanOrEqual(1);
    expect(gaugeStep(0.9, 'damped', 10, S)).toBe(0.9);
    expect(gaugeStep(0.9, 'idle', 10, S)).toBe(0.9);
    expect(gaugeStep(0.9, 'bleeding', 100, S)).toBe(S.bled);
    expect(S.start).toBeGreaterThan(0.7); // in the red when he gets there
  });

  it("sweeps the needle clockwise as Tom faces it (model +x is his left), into the red past 0.7", () => {
    const dir = (v) => ({ x: -Math.sin(gaugeAngle(v)), y: Math.cos(gaugeAngle(v)) });
    expect(dir(0).x).toBeGreaterThan(0); // his lower left
    expect(dir(0).y).toBeLessThan(0);
    expect(dir(0.5).y).toBeCloseTo(1); // straight up
    expect(dir(1).x).toBeLessThan(0); // his lower right
    expect(gaugeAngle(0.7)).toBeCloseTo(0.3 * Math.PI); // where the red band starts
  });

  it('remembers what became of it', () => {
    expect(stillLook(new Set())).toBe('running');
    expect(stillLook(new Set(['hollerStillShut']))).toBe('shut');
    expect(stillLook(new Set(['hollerStillBlown']))).toBe('blown');
  });
});

describe("the holler's data", () => {
  it('has a story flag for everything it saves', () => {
    const ids = new Set(progressData.flags.map((f) => f.id));
    for (const f of FLAGS) expect(ids.has(f), f).toBe(true);
    for (const s of data.searches) expect(ids.has(s.flag), s.flag).toBe(true);
  });

  it('has the papers, lore, family lines and the sweep', () => {
    const paper = (id) => papers.papers.find((p) => p.id === id);
    expect(paper('hollerTrapMap').pages[0].drawing).toBe('trapMap');
    expect(paper('stillBoard').pages[0].text).toMatch(/DAMPER[\s\S]*BLEED[\s\S]*LINE/);
    const item = (id) => lore.items.find((l) => l.id === id);
    expect(item('trapMap').paper).toBe('hollerTrapMap');
    expect(item('copperCoil').kind).toBe('item');
    for (const id of ['holler.ellen.1', 'holler.wyatt.1', 'holler.ellen.2']) expect(dialogue.lines.find((l) => l.id === id), id).toBeTruthy();
    const sweep = cutscenes.cutscenes.find((c) => c.id === 'sweep.holler');
    expect(sweep.camera.every((k) => k.anchor === 'holler')).toBe(true);
    expect(sweep.duration).toBeGreaterThan(sweep.camera[sweep.camera.length - 1].at);
    for (const v of Object.keys(data.valves)) expect(S.order).toContain(v);
  });

  it('draws the trap map from the real layout: every mapped trap, not the two laid since', () => {
    const svg = drawingSvg('trapMap');
    const marks = (svg.match(/class="paper-drawing-caption">(GUN|CANS|TRAP|SNARE)</g) ?? []).length;
    expect(marks).toBe(config.holler.traps.filter((t) => t.mapped !== false).length);
    expect(marks).toBe(config.holler.traps.length - 2);
    expect(svg).toContain('STILL');
  });

  it('has the turned family: a zombie look, a health, a loot table', () => {
    expect(config.zombies.variants.moonshiner).toBeTruthy();
    expect(config.zombies.texture.looks.moonshiner.as).toBe('citizen');
    expect(loot.tables.moonshiner.length).toBeGreaterThan(0);
  });
});

// A stand-in game round the encounter.
function rig(flagsIn = []) {
  const flags = new Set(flagsIn);
  const events = [];
  const handlers = {};
  const bus = { on: (e, f) => ((handlers[e] ??= []).push(f)), emit: (e, p) => { events.push(e); for (const f of handlers[e] ?? []) f(p); } };
  const shown = {};
  let gauge = 0;
  const spots = { arrive: { x: 0, z: -33 }, still: { x: 0, y: 0, z: 14 }, gauge: { x: 0, y: 1.9, z: 15 }, damper: { x: 0.3, z: 14.2 }, relief: { x: -0.9, z: 15 }, line: { x: 1.2, z: 14.5 }, coil: { x: 3.4, z: 15 }, cabinet: { x: -5, z: 19 }, ammo: { x: -7, z: 19 }, note: { x: -2, z: 12 }, cutters: { x: -3, z: -5 }, trapMap: { x: -3.5, z: -4 }, sign: { x: 2, z: -27 }, agent: { x: -1, z: -26 }, lookout: { x: -2, z: -5 }, jars: { x: 0, z: 10 }, mash: { x: 3, z: 17 } };
  for (let k = 0; k < 5; k++) spots[`kin${k}`] = { x: k - 2, z: 13 };
  const site = { ready: true, place: { x: 0, z: 0, radius: 30, yaw: 0 }, spots, traps: [], show: (n, on) => (shown[n] = on), setTrap() {}, setGauge: (v) => (gauge = v), at: (x, z) => ({ x, z }) };
  const zombies = [];
  const enemies = {
    living: zombies,
    spawnZombie: (x, z, o) => {
      const zb = { x, z, alive: true, mode: o.mode, variant: o.variant, burrow() { this.alive = false; } };
      zombies.push(zb);
      return zb;
    },
    alert: () => {},
  };
  const blasts = [];
  const given = [];
  const hurt = [];
  const notes = [];
  const played = [];
  const lored = [];
  const player = { position: { x: 0, z: -60 }, onGround: true, rooted: false };
  const combat = { sfx: { play() {} }, alive: true, giveWeapon: (id, n) => given.push([id, n]), weapons: { addAmmo: () => true }, hurtPlayer: (d) => hurt.push(d), hud: {} };
  const h = new Holler(config, bus);
  h.init({
    site,
    player,
    combat,
    enemies,
    explosives: { blast: (x, y, z, e) => blasts.push(e) },
    cutscenes: { active: false, play: (id) => played.push(id), namedAnchors: new Map() },
    progress: { has: (f) => flags.has(f), setFlag: (f, on = true) => (on ? flags.add(f) : flags.delete(f)) },
    lore: { give: (id) => lored.push(id) },
    card: { show: () => true },
    paper: { open() { return true; } },
    notify: (t) => notes.push(t),
    rng: () => 0.5,
  });
  const at = (x, z) => {
    player.position.x = x;
    player.position.z = z;
  };
  const run = (seconds, dt = 0.1) => {
    for (let t = 0; t < seconds; t += dt) h.update(dt, null, true, false);
  };
  const press = (key) => {
    const o = h.pick('X');
    expect(o?.key, `nearest is ${o?.key}`).toBe(key);
    o.act();
  };
  return { h, flags, events, shown, gauge: () => gauge, zombies, blasts, given, hurt, notes, played, lored, at, run, press, spots };
}

describe('the beat', () => {
  it('counts a family put down from out of earshot as woken (the ridge pair still come)', () => {
    const r = rig(['hollerVisited']);
    r.at(0, -40);
    r.run(0.3);
    expect(r.h.awake).toBe(false);
    for (const z of r.zombies) z.alive = false;
    r.run(0.3);
    expect(r.h.awake).toBe(true);
    r.run(ec.familyTrees.after + 0.5);
    expect(r.zombies.filter((z) => z.alive).length).toBe(ec.familyTrees.count);
  });

  it("still sends the two off the ridge if the family's all down before they come", () => {
    const r = rig(['hollerVisited']);
    r.at(0, 4);
    r.run(0.5);
    for (const z of r.zombies) z.alive = false;
    r.run(1);
    expect(r.flags.has('hollerFamilyDown')).toBe(false);
    r.run(ec.familyTrees.after);
    expect(r.zombies.filter((z) => z.alive).length).toBe(ec.familyTrees.count);
    for (const z of r.zombies) z.alive = false;
    r.run(0.3);
    expect(r.flags.has('hollerFamilyDown')).toBe(true);
  });

  it('plays the arrival sweep once at the mouth, the family already round the still', () => {
    const r = rig();
    r.at(0, -60);
    r.run(0.2);
    expect(r.zombies.length).toBe(5);
    expect(r.zombies.every((z) => z.mode === 'linger' && z.variant === 'moonshiner')).toBe(true);
    r.at(0, -34);
    r.run(0.2);
    expect(r.played).toEqual(['sweep.holler']);
    expect(r.flags.has('hollerVisited')).toBe(true);
    r.run(1);
    expect(r.played.length).toBe(1);
  });

  it('wakes the family as he comes into the yard; the still starts to climb', () => {
    const r = rig(['hollerVisited']);
    r.at(0, -10);
    r.run(0.5);
    expect(r.h.still.phase).toBe('idle');
    const before = r.gauge();
    r.at(0, 4);
    r.run(2);
    expect(r.flags.has('hollerFamilyUp')).toBe(true);
    expect(r.h.still.phase).toBe('climbing');
    expect(r.gauge()).toBeGreaterThan(before);
  });

  it('the cans ringing wake them too', () => {
    const r = rig(['hollerVisited']);
    r.at(0, -20);
    r.run(0.2);
    r.h.bus.emit('holler:alarm', { x: 0, z: -14 });
    expect(r.h.awake).toBe(true);
  });

  it('two more come down off the ridge, and when every one is down the holler goes quiet', () => {
    const r = rig(['hollerVisited']);
    r.at(0, 4);
    r.run(0.5);
    expect(r.zombies.length).toBe(5);
    r.run(ec.familyTrees.after + 0.5);
    expect(r.zombies.length).toBe(5 + ec.familyTrees.count);
    for (const z of r.zombies) z.alive = false;
    r.run(0.3);
    expect(r.flags.has('hollerFamilyDown')).toBe(true);
    expect(r.notes).toContain(data.family.down);
  });

  it('shuts down with the valves in order: then the worm comes out (a card, lore)', () => {
    const r = rig(['hollerVisited', 'hollerFamilyDown']);
    r.at(0.3, 14.2);
    r.run(0.2);
    r.press('valve:damper');
    expect(r.h.still.phase).toBe('damped');
    expect(r.shown.fireGlow).toBe(false);
    r.at(-0.9, 15);
    r.press('valve:relief');
    r.run(S.bleedSeconds + 0.5);
    expect(r.gauge()).toBeCloseTo(S.bled, 2);
    r.at(1.2, 14.5);
    r.press('valve:line');
    expect(r.flags.has('hollerStillShut')).toBe(true);
    r.at(3.4, 15);
    r.press('coil');
    expect(r.flags.has('copperCoilTaken')).toBe(true);
    expect(r.lored).toContain('copperCoil');
    expect(r.blasts.length).toBe(0);
  });

  it('bucks when a valve is turned out of turn: steam, the needle jumps', () => {
    const r = rig(['hollerVisited', 'hollerFamilyDown']);
    r.at(1.2, 14.5);
    r.run(0.2);
    const before = r.h.still.value;
    r.press('valve:line');
    expect(r.h.still.value).toBeCloseTo(before + S.wrongLine);
    expect(r.h.valves).toEqual([]);
    expect(r.hurt.length).toBe(1);
    expect(r.notes).toContain(data.valves.line.early);
  });

  it('blows when the gauge goes over: the worm goes with it', () => {
    const r = rig(['hollerVisited']);
    r.at(0, 4);
    r.run(S.blowSeconds + 2, 0.5);
    expect(r.flags.has('hollerStillBlown')).toBe(true);
    expect(r.blasts.length).toBe(1);
    expect(r.shown.coil).toBe(false);
    r.at(3.4, 15);
    const o = r.h.pick('X');
    expect(o.key).toBe('coilBlown');
    expect(o.act).toBeNull();
  });

  it('gives the auto shotgun and the shells in the shed, and the trap map at the lookout', () => {
    const r = rig(['hollerVisited']);
    r.at(-5, 19);
    r.press('cabinet');
    expect(r.given).toEqual([['autoShotgun', ec.autoShotgunShells]]);
    expect(r.shown.autoShotgun).toBe(false);
    r.at(-3.5, -4);
    r.press('trapMap');
    expect(r.lored).toContain('trapMap');
    expect(r.flags.has('trapMapFound')).toBe(true);
  });

  it('comes back as the flags say: a still left running starts again, a shut one stays cold', () => {
    const r = rig(['hollerVisited', 'hollerStillShut', 'autoShotgunTaken']);
    expect(r.h.still.phase).toBe('shut');
    expect(r.shown.fireGlow).toBe(false);
    expect(r.shown.autoShotgun).toBe(false);
    expect(r.shown.coil).toBe(true);
    const r2 = rig(['hollerVisited']);
    r2.at(0, 4);
    r2.run(5);
    r2.h.reset();
    expect(r2.h.still.phase).toBe('idle');
    expect(r2.h.still.value).toBe(S.start);
    expect(r2.h.awake).toBe(false);
  });
});
