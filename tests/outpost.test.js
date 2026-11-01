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

const map = makeMap(1234);
const ground = makeGround(1234);

// A stand-in game round the outpost: zombies that are just records, a player that's just a position.
function rig({ phase = 'day' } = {}) {
  const bus = new EventBus();
  const flags = new Set();
  const played = [];
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
    weapons: { addAmmo: (t, n) => ((ammo[t] = (ammo[t] ?? 0) + n), true), order: [] },
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
    colliders: { insert() {} },
    explosives: charges,
    clock: { phase },
    dialogue: { play: (id) => played.push(id) },
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
  return { o, bus, flags, played, spawned, enemies, player, progress, ammo, charges, at, step, killAll };
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
    expect(r.played).toEqual(['outpost.call.ellen', 'outpost.call.wyatt', 'outpost.call.home']);
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
