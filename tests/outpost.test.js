// Session 17 (M9.4): the overrun military outpost: its layout, the helmets,
// the call, the approach waves, the watchtower's rounds, the barricade's peak.
import { describe, it, expect } from 'vitest';
import { Outpost } from '../src/encounters/Outpost.js';
import { helmetPart, wearHelmet, partMultiplier } from '../src/combat/hitscan.js';
import { lootTableFor } from '../src/combat/loot.js';
import { EventBus } from '../src/core/EventBus.js';
import { frameToWorld } from '../src/world/clearingFrame.js';
import outpost from '../src/data/outpost.json';
import progressData from '../src/data/progress.json';
import dialogueData from '../src/data/dialogue.json';
import cutsceneData from '../src/data/cutscenes.json';
import lootData from '../src/data/loot.json';
import vehiclesData from '../src/data/vehicles.json';
import { makeMap, makeGround, config } from './mapFixture.js';
import { flightAt } from '../src/story/cutsceneFlight.js';
import { rayEnemies } from '../src/combat/hitscan.js';
import papersData from '../src/data/papers.json';
import { localToWorld, validateCutscenes } from '../src/story/cutsceneTimeline.js';
import encountersData from '../src/data/encounters.json';

const map = makeMap(1234);
const ground = makeGround(1234);

// A stand-in game round the outpost: zombies that are just records, a player that's just a position.
function rig({ phase = 'day' } = {}) {
  const bus = new EventBus();
  const flags = new Set();
  const played = [];
  const later = [];
  const spawned = [];
  const enemies = {
    living: [],
    spawnZombie(x, z, opts) {
      const zb = { x, z, alive: true, variant: opts.variant, authored: opts.authored, mode: opts.mode, helmet: 50 };
      spawned.push(zb);
      this.living.push(zb);
      return zb;
    },
    brain: { chase() {} },
    damage(zb) {
      zb.alive = false;
      this.living = this.living.filter((q) => q !== zb);
      bus.emit('enemy:killed', { zombie: zb });
    },
  };
  const player = {
    position: { x: 0, y: 0, z: 0 },
    platform: null,
    yaw: 0,
    pitch: 0,
    setPlatform(pl, x, z) {
      this.platform = pl;
      this.position.x = x;
      this.position.z = z;
    },
    teleport(x, z) {
      this.position.x = x;
      this.position.z = z;
    },
  };
  const ammo = {};
  const combat = {
    enemies,
    weapons: { addAmmo: (t, n) => ((ammo[t] = (ammo[t] ?? 0) + n), true), order: [], extraTargets: [] },
    alive: true,
    hurt: 0,
    hurtPlayer(d) {
      this.hurt += d;
    },
    inventory: { addAmmo() {} },
    hud: { pickup() {} },
    sfx: { play() {} },
    takePickup: () => true,
    pickups: { drop() {} },
  };
  const progress = {
    has: (f) => flags.has(f),
    setFlag(f, on = true) {
      if (on === flags.has(f)) return;
      if (on) flags.add(f);
      else flags.delete(f);
      bus.emit('story:flag', { id: f, on });
    },
  };
  const charges = { n: 0, give: (k) => ((charges.n += k), k) };
  const o = new Outpost(config, bus);
  o.init(null, {
    world: { map, ground },
    player,
    combat,
    colliders: { insert() {}, query: () => [] },
    explosives: charges,
    clock: { phase },
    dialogue: { play: (id) => played.push(id), playLater: (id, s, when) => later.push({ id, s, when }) },
    progress,
    lore: { give() {} },
    notify() {},
  });
  const at = (x, z) => {
    const w = frameToWorld(o.frame, x, z);
    player.position.x = w.x;
    player.position.z = w.z;
  };
  const step = (seconds) => {
    for (let t = 0; t < seconds; t += 0.1) o.update(0.1, null, true, false);
  };
  const killAll = () => {
    for (const zb of [...enemies.living]) enemies.damage(zb);
  };
  return { o, bus, flags, played, later, spawned, enemies, player, progress, ammo, charges, at, step, killAll };
}

describe('the military outpost: the set', () => {
  const f = Outpost.frame(map);

  it('faces the checkpoint, with the cordon just past the compound and the clearing north of it', () => {
    expect(f).toBeTruthy();
    expect(f.fz).toBe(1);
    const cordon = map.cluster.cordonZ - f.z;
    expect(cordon).toBeCloseTo(30, 0);
    expect(f.z + f.radius).toBeLessThanOrEqual(map.cluster.cordonZ);
  });

  it('puts the barricade across the clearing, the tower on the near side, the compound between it and the cordon', () => {
    const B = outpost.barricade;
    expect(outpost.tower.z + outpost.tower.legs).toBeLessThan(B.z - 3);
    for (const [x, z] of outpost.peak) {
      expect(z).toBeGreaterThan(B.z + 3);
      expect(z).toBeLessThan(29);
      expect(Math.hypot(x, z)).toBeLessThan(f.radius);
    }
    for (const c of outpost.compound.containers) {
      expect(c.z).toBeGreaterThan(B.z + 3);
      expect(Math.hypot(Math.abs(c.x) + 3.4, c.z + 1.3)).toBeLessThan(f.radius + 3);
    }
  });

  it('leaves the barricade gaps open (the road, the torn fence, the spilled bags) and the road clear to the checkpoint', () => {
    const B = outpost.barricade;
    const solid = B.pieces.filter((p) => p.kind === 'sandbags').map((p) => [Math.min(p.x0, p.x1), Math.max(p.x0, p.x1)]);
    // Nothing solid over the road (x 0) nor the spilled stretch.
    for (const [a, b] of solid) expect(a > 3 || b < -3).toBe(true);
    expect(B.pieces.some((p) => p.kind === 'rubble')).toBe(true);
    const fence = B.pieces.find((p) => p.kind === 'fence');
    expect(Math.abs(fence.breach[0] - fence.breach[1])).toBeGreaterThan(2.5);
    // The crates and containers keep off the road south of the barricade.
    for (const [x] of outpost.compound.crates) expect(Math.abs(x)).toBeGreaterThan(4.5);
    for (const c of outpost.compound.containers) expect(Math.abs(c.x)).toBeGreaterThan(8);
  });

  it('stands its two trucks on authored spots, the first across the road gap', () => {
    const spots = Outpost.truckSpots(map);
    expect(spots).toHaveLength(2);
    const rule = vehiclesData.placement.outpost;
    expect(rule.row).toBeFalsy();
    expect(rule.count).toEqual([2, 2]);
    expect(Math.abs(outpost.trucks[0].z - outpost.barricade.z)).toBeLessThan(2);
  });

  it('has the field report and its lines, the arrival sweep and the outpost flags set for real', () => {
    const ids = new Set(dialogueData.lines.map((l) => l.id));
    for (const id of ['outpost.call.ellen', 'outpost.call.wyatt', 'outpost.call.home', 'outpost.arrive', 'outpost.helmet', 'outpost.helmetDown', 'outpost.lull1', 'outpost.lull2', 'outpost.lull2b', 'outpost.lull3', 'outpost.tower', 'outpost.rounds', 'outpost.peak', 'outpost.cleared.ellen', 'outpost.cleared.wyatt', 'outpost.report', 'outpost.manifest', 'outpost.charge']) expect(ids.has(id)).toBe(true);
    expect(cutsceneData.cutscenes.some((c) => c.id === 'sweep.outpost')).toBe(true);
    const flags = Object.fromEntries(progressData.flags.map((x) => [x.id, x]));
    for (const id of ['outpostCall', 'outpostEntered', 'outpostCleared']) expect(flags[id].standIn).toBe(false);
    expect(flags.outpostCleared.trigger).toBeUndefined(); // no "nobody about" stand-in: the peak sets it
    // Aaron: come home if it goes bad.
    const by = Object.fromEntries(dialogueData.lines.map((l) => [l.id, l.text]));
    expect(by['outpost.call.home']).toMatch(/come home/);
  });
});

describe('army helmets (Aaron, Oct 16)', () => {
  const rifle = config.weapons.rifle;
  const sniper = config.weapons.sniper;

  it('stop the headshot bonus until they come off', () => {
    const z = { helmet: 50 };
    expect(helmetPart(z, 'head', rifle)).toBe('helmet');
    expect(partMultiplier(z, 'helmet', 3)).toBe(1);
    expect(helmetPart(z, 'body', rifle)).toBe('body');
    expect(helmetPart({ helmet: 0 }, 'head', rifle)).toBe('head');
  });

  it('come off with enough damage (two service rifle rounds), or the hunting rifle punches straight through', () => {
    const z = { helmet: config.zombies.variants.army.helmet };
    expect(wearHelmet(z, rifle.damage, 'helmet')).toBe(false);
    expect(wearHelmet(z, rifle.damage, 'helmet')).toBe(true);
    expect(z.helmetOff).toBe(true);
    expect(helmetPart(z, 'head', rifle)).toBe('head');
    const y = { helmet: 50 };
    expect(sniper.helmetPierce).toBe(true);
    expect(helmetPart(y, 'head', sniper)).toBe('head');
    expect(wearHelmet(y, sniper.damage * 3, 'head')).toBe(true);
    // A body shot leaves it on.
    const b = { helmet: 50 };
    expect(wearHelmet(b, 100, 'body')).toBe(false);
    expect(b.helmet).toBe(50);
  });

  it("drops no helmet once it's been knocked off", () => {
    const on = lootTableFor({ variant: 'army' }, lootData.tables);
    const off = lootTableFor({ variant: 'army', helmetOff: true }, lootData.tables);
    expect(on.some((e) => e.item === 'helmet')).toBe(true);
    expect(off.some((e) => e.item === 'helmet')).toBe(false);
  });
});

describe('the military outpost: the beats', () => {
  const oc = config.outpost;

  it("sends Tom the moment the safe opens (Aaron), with Ellen's word to come home if it goes bad", () => {
    const r = rig();
    r.progress.setFlag('rifleClaimed');
    expect(r.flags.has('outpostCall')).toBe(false); // after Wyatt's line on the safe
    r.step(1);
    expect(r.flags.has('outpostCall')).toBe(true);
    expect(r.played).toEqual(['outpost.call.ellen', 'outpost.call.home']);
    // Session 17 (Aaron: one idea at a time): Wyatt's word on the rounds comes later, on its own.
    expect(r.later.map((l) => l.id)).toEqual(['outpost.call.wyatt']);
    expect(r.later[0].s).toBeGreaterThan(10);
  });

  it('stays quiet until the call', () => {
    const r = rig();
    r.at(40, -50);
    r.step(5);
    expect(r.spawned).toHaveLength(0);
    expect(r.o.approachStarted).toBe(false);
  });

  it('walks out: the first helmet standing on the road, then waves of 3, 5 and 8 army zombies with the radio in the lulls', () => {
    const r = rig();
    r.flags.add('outpostCall');
    r.at(50, -60);
    r.step(0.2);
    expect(r.o.approachStarted).toBe(true);
    expect(r.spawned).toHaveLength(1);
    expect(r.spawned[0]).toMatchObject({ variant: 'army', mode: 'linger', authored: 'outpost' });
    expect(r.played).toContain('outpost.helmet');
    const sizes = [];
    for (let i = 0; i < 4; i++) {
      const before = r.spawned.length;
      r.killAll();
      r.step(0.2);
      r.step(oc.approach.lull + 0.5);
      sizes.push(r.spawned.length - before);
    }
    expect(sizes).toEqual([3, 5, 8, 0]);
    expect(r.spawned.slice(1).every((z) => z.variant === 'army' && z.mode === 'chase')).toBe(true);
    expect(r.o.approachDone).toBe(true);
    for (const id of ['outpost.helmetDown', 'outpost.lull1', 'outpost.lull2', 'outpost.lull2b', 'outpost.lull3', 'outpost.tower']) expect(r.played).toContain(id);
  });

  it('sends bigger waves by night', () => {
    const r = rig({ phase: 'night' });
    r.flags.add('outpostCall');
    r.at(50, -60);
    r.step(0.2);
    r.killAll();
    r.step(oc.approach.lull + 1);
    expect(r.spawned.length - 1).toBe(Math.round(3 * oc.approach.nightScale));
  });

  it('goes back to the last wave cleared if Tom retreats mid-wave (the ones out are strays now)', () => {
    const r = rig();
    r.flags.add('outpostCall');
    r.at(50, -60);
    r.step(0.2);
    r.killAll();
    r.step(oc.approach.lull + 1);
    const out = r.enemies.living.slice();
    expect(out).toHaveLength(3);
    r.at(0, -oc.approach.retreat - 20);
    r.step(0.5);
    expect(r.o.wavesCleared).toBe(0);
    expect(out.every((z) => z.authored === null)).toBe(true);
    // Back: the same wave again.
    const before = r.spawned.length;
    r.at(50, -60);
    r.step(0.5);
    expect(r.spawned.length - before).toBe(3);
  });

  it('keeps the rounds up the watchtower: climb, take them, climb down', () => {
    const r = rig();
    r.o.climbUp();
    expect(r.o.onTower).toBe(true);
    expect(r.player.platform.y).toBeGreaterThan(ground.heightAt(r.player.position.x, r.player.position.z) + 5);
    const pick = r.o.pick('X');
    expect(pick.key).toBe('rounds');
    pick.act();
    expect(r.ammo.sniper).toBe(oc.tower.rounds);
    expect(r.o.pick('X').key).toBe('tower-down');
    r.o.climbDown();
    expect(r.o.onTower).toBe(false);
  });

  it("brings the barricade's peak once the approach and the rounds are done; up the tower it waits for the dogfight", () => {
    const r = rig();
    r.flags.add('outpostCall');
    r.o.approachStarted = true;
    r.o.helmetDone = true;
    r.o.wavesCleared = oc.approach.waves.length;
    r.o.climbUp();
    r.o.takeRounds();
    r.step(2);
    expect(r.o.peakState).toBe('none');
    r.o.dogfightSeen = true;
    r.step(0.2);
    expect(r.o.peakState).toBe('running');
    expect(r.played).toContain('outpost.peak');
    r.step(oc.peak.burstEvery * oc.peak.bursts + 1);
    expect(r.spawned.filter((z) => z.authored === 'outpost')).toHaveLength(oc.peak.count);
    // Spawned in the compound, south of the barricade.
    r.killAll();
    r.step(0.3);
    expect(r.o.peakState).toBe('done');
    expect(r.flags.has('outpostCleared')).toBe(true);
    expect(r.played).toContain('outpost.cleared.ellen');
  });

  it('brings the peak on anyway if Tom rushes the barricade before the approach is done', () => {
    const r = rig();
    r.flags.add('outpostCall');
    r.at(2, outpost.barricade.z - 2);
    r.step(0.3);
    expect(r.o.peakState).toBe('running');
  });

  it('gives one explosive charge from the armoury, and saves and loads its beats', () => {
    const r = rig();
    const arm = r.o.points.find((p) => p.id === 'armoury');
    r.o.search(arm);
    expect(r.charges.n).toBe(1);
    r.o.roundsTaken = true;
    r.o.helmetDone = true;
    r.o.wavesCleared = 2;
    const s = JSON.parse(JSON.stringify(r.o.saveState()));
    const q = rig();
    q.o.loadState(s);
    expect(q.o.roundsTaken).toBe(true);
    expect(q.o.wavesCleared).toBe(2);
    expect(q.o.searched.has('armoury')).toBe(true);
  });
});

describe('the dogfight (pass 3)', () => {
  it('flies through its keys and ends exactly on the last one, facing the way it goes', () => {
    const keys = [
      { at: 0, v: { x: 0, y: 100, z: 0 } },
      { at: 2, v: { x: 100, y: 100, z: 0 } },
      { at: 4, v: { x: 200, y: 0, z: 50 } },
    ];
    expect(flightAt(keys, 2).pos).toEqual({ x: 100, y: 100, z: 0 });
    expect(flightAt(keys, 9).pos).toEqual({ x: 200, y: 0, z: 50 });
    const mid = flightAt(keys, 1);
    expect(mid.pos.x).toBeGreaterThan(0);
    expect(mid.pos.x).toBeLessThan(100);
    expect(mid.dir.x).toBeGreaterThan(0.9);
  });

  it('has the crashed plane on every run (DESIGN, Oct 16): the plane comes down where the map has it', () => {
    expect(encountersData.encounters.find((e) => e.id === 'crashedPlane').appears).toBe('every');
    for (const seed of [1, 7, 1234]) {
      const m = makeMap(seed);
      expect(m.clearings.some((c) => c.key === 'crashedPlane')).toBe(true);
      expect(m.clearings.some((c) => c.key === 'crashedUfo')).toBe(true);
    }
  });

  it('anchors the fight between Tom and the plane, and the paths end on the two crash sites', () => {
    const r = rig();
    const eye = r.o.towerEye();
    const a = r.o.dogfightAnchors(eye);
    const { plane, ufo } = r.o.sites;
    expect(plane.real && ufo.real).toBe(true);
    const withY = (n) => ({ ...a[n], y: ground.heightAt(a[n].x, a[n].z) + (a[n].dy ?? 0) });
    // The plane's crash is straight ahead of the eye.
    const ahead = localToWorld(withY('dogfight'), [0, 0, 100]);
    const toPlane = Math.hypot(plane.x - eye.x, plane.z - eye.z);
    expect(Math.hypot(ahead.x - eye.x - ((plane.x - eye.x) / toPlane) * 100, ahead.z - eye.z - ((plane.z - eye.z) / toPlane) * 100)).toBeLessThan(0.01);
    // The eye is up the tower.
    expect(withY('dogfight').y).toBeCloseTo(eye.y, 5);
    // The fight's heights are from the eye's ground.
    expect(withY('fight').y).toBeCloseTo(ground.heightAt(eye.x, eye.z), 5);
    const clip = cutsceneData.cutscenes.find((c) => c.id === 'clip.dogfight');
    for (const id of ['plane', 'ufo']) {
      const fly = clip.tracks.find((e) => e.do === 'fly' && e.actor === id);
      const last = fly.path[fly.path.length - 1];
      expect(last.anchor).toBe(id === 'plane' ? 'planeCrash' : 'ufoCrash');
      const end = localToWorld(withY(last.anchor), last.p);
      const site = id === 'plane' ? plane : ufo;
      expect(Math.hypot(end.x - site.x, end.z - site.z)).toBeLessThan(1);
    }
    expect(clip.placeholder).toBeUndefined();
  });

  it('checks out (its events and actors), with its lines', () => {
    const lineIds = new Set(dialogueData.lines.map((l) => l.id));
    const looks = config.postFX.looks;
    const clip = cutsceneData.cutscenes.filter((c) => c.id === 'clip.dogfight' || c.id === 'sweep.outpost');
    expect(validateCutscenes(clip, { looks, lineIds })).toEqual([]);
    for (const id of ['outpost.dogfight.wyatt', 'outpost.dogfight.down', 'outpost.dogfight.ellen', 'outpost.dogfight.after']) expect(lineIds.has(id)).toBe(true);
  });

  it('waits for the scope up the tower, and plays once', () => {
    const r = rig();
    let played = 0;
    r.o.cutscenes = { active: false, play: (id, o) => (played++, o.onDone?.(false), true) };
    r.o.combat.weapons.id = 'sniper';
    r.o.combat.weapons.scoped = 0;
    r.o.climbUp();
    r.step(0.5);
    expect(played).toBe(0);
    r.o.combat.weapons.scoped = 1;
    r.step(0.5);
    r.step(0.5);
    expect(played).toBe(1);
    expect(r.o.dogfightSeen).toBe(true);
    expect(r.played).toContain('outpost.dogfight.after');
  });
});

describe('the compound (pass 4)', () => {
  const ai = config.beetles.ai;

  it('breaks a crate shot into, and its beetle claws out, facing Tom', () => {
    const r = rig();
    r.at(2, 14);
    const c = r.o.crateAt[0];
    r.bus.emit('weapon:impact', { x: c.x + 0.3, y: c.y + 0.6, z: c.z - 0.2 });
    expect(r.o.crates[0]).toBe('broken');
    expect(r.o.crateCols[0].off).toBe(true);
    const b = r.o.beetles.list[0];
    expect(b.state).toBe('emerge');
    expect(r.played).toContain('outpost.crate');
    // Shots far off don't.
    r.bus.emit('weapon:impact', { x: c.x + 30, y: c.y, z: c.z });
    expect(r.o.crates.filter((x) => x === 'broken')).toHaveLength(1);
    // The weapons can hit it.
    expect(r.o.combat.weapons.extraTargets[0].group).toContain(b);
  });

  it('lets one out on its own the first time Tom comes near (DESIGN: the fight always happens)', () => {
    const r = rig();
    r.at(-3, 8);
    r.step(0.3);
    expect(r.o.crates.every((x) => x === 'whole')).toBe(true);
    const [x, z] = outpost.compound.crates[0];
    r.at(x - 4, z);
    r.step(0.3);
    expect(r.o.crates.filter((x) => x === 'broken')).toHaveLength(1);
    expect(r.o.autoBroken).toBe(true);
  });

  it("shrugs off shots to the shell, not to the face; it's hit by a ray from the front only", () => {
    const r = rig();
    const b = r.o.beetles.spawn(0, 0, 0);
    // Facing +z: a shot from the front at the spot's height hits the weak spot; from behind, the shell.
    const front = rayEnemies({ x: 0, y: b.y + ai.spotHeight, z: 10 }, { x: 0, y: 0, z: -1 }, [b], 50);
    expect(front.part).toBe('weak');
    const back = rayEnemies({ x: 0, y: b.y + ai.spotHeight, z: -10 }, { x: 0, y: 0, z: 1 }, [b], 50);
    expect(back.part).toBe('body');
    b.takeHit(50, 'body', {}, null, null);
    expect(b.health).toBeCloseTo(ai.health - 50 * ai.armour);
    expect(r.played).toContain('outpost.beetle.hint');
    b.takeHit(50 * ai.weakMultiplier, 'weak', {}, null, null);
    expect(b.alive).toBe(false);
  });

  it('comes out, flares, charges and bites; up the tower it can only mill about below', () => {
    const r = rig();
    r.at(2, 14);
    const p = r.player.position;
    const b = r.o.beetles.spawn(p.x + 6, p.z, -Math.PI / 2);
    for (let i = 0; i < 80; i++) r.o.beetles.update(0.05, true);
    expect(r.o.combat.hurt).toBeGreaterThan(0);
    const hurt = r.o.combat.hurt;
    r.o.climbUp();
    for (let i = 0; i < 80; i++) r.o.beetles.update(0.05, true);
    expect(r.o.combat.hurt).toBe(hurt);
    expect(b.alive).toBe(true);
  });

  it("plays the torn container's sweep once and the resin body's lines once; the papers are there", () => {
    const r = rig();
    let played = [];
    r.o.cutscenes = { active: false, play: (id, o) => (played.push(id), o.onDone?.(false), true) };
    r.player.position.x = r.o.c7At.x;
    r.player.position.z = r.o.c7At.z;
    r.step(0.3);
    r.step(0.3);
    expect(played).toEqual(['sweep.outpostC7']);
    expect(r.played).toContain('outpost.c7.ellen');
    r.player.position.x = r.o.resinAt.x;
    r.player.position.z = r.o.resinAt.z;
    r.step(0.3);
    expect(r.played.filter((x) => x === 'outpost.resin.wyatt')).toHaveLength(1);
    const ids = papersData.papers.map((x) => x.id);
    expect(ids).toContain('fieldReport');
    expect(ids).toContain('outpostManifest');
    // The witch isn't here, nor named (DESIGN: what's deliberately absent).
    const words = papersData.papers.filter((x) => x.id === 'fieldReport' || x.id === 'outpostManifest').flatMap((x) => x.pages.map((g) => g.text)).join(' ');
    expect(words).not.toMatch(/witch/i);
    expect(words).not.toMatch(/moth/i);
    expect(cutsceneData.cutscenes.some((c) => c.id === 'sweep.outpostC7')).toBe(true);
  });

  it('keeps its broken crates and one-off beats over a save', () => {
    const r = rig();
    r.o.breakCrate(2);
    r.o.told.add('c7');
    const q = rig();
    q.o.loadState(JSON.parse(JSON.stringify(r.o.saveState())));
    expect(q.o.crates[2]).toBe('broken');
    expect(q.o.crateCols[2].off).toBe(true);
    expect(q.o.told.has('c7')).toBe(true);
  });
});
