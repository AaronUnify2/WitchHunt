// Build queue item 6: the Car Armory and Sheriff (encounters/CarArmory.js), scaffolding.
import { describe, it, expect } from 'vitest';
import { config } from '../src/config.js';
import { seenInLane, CarArmory, ARMORY_FLAGS, ARMORY_DOCS } from '../src/encounters/CarArmory.js';
import { buildCarArmory, ARMORY } from '../src/render/carArmoryModel.js';
import { carArmoryPlacement } from '../src/world/CarArmorySite.js';
import { laterFlags } from '../src/debug/storyStart.js';
import dialogue from '../src/data/dialogue.json';
import progress from '../src/data/progress.json';
import lore from '../src/data/lore.json';

const E = config.carArmory.encounter;

describe('the survivors’ lane', () => {
  const lane = ARMORY.lane;
  const bz = ARMORY.barricade.z;
  it('standing in it, he is seen; crouched, he is not, until he is under the sandbags', () => {
    expect(seenInLane({ x: 0, z: -4 }, false, lane, bz, E.survivors.under)).toBe(true);
    expect(seenInLane({ x: 0, z: -4 }, true, lane, bz, E.survivors.under)).toBe(false);
    expect(seenInLane({ x: 0, z: bz - 1.5 }, true, lane, bz, E.survivors.under)).toBe(true);
  });
  it('out of the lane (the hall, the motor pool, behind them) he is never seen', () => {
    expect(seenInLane({ x: ARMORY.hall.x0 + 2, z: 0 }, false, lane, bz, E.survivors.under)).toBe(false);
    expect(seenInLane({ x: ARMORY.ute.x, z: ARMORY.ute.z }, false, lane, bz, E.survivors.under)).toBe(false);
    expect(seenInLane({ x: 0, z: 12 }, false, lane, bz, E.survivors.under)).toBe(false);
  });
  it('the hall can be reached from the gate without crossing it: hug the fence on the right', () => {
    // the gate is at x 0 (in the lane): one step in he is seen, so the way is crouched, or round by the hall's side
    expect(lane.x0).toBeGreaterThan(ARMORY.hall.x1);
  });
});

describe('the set', () => {
  it('builds with every spot the beat needs, and its people stand inside the fence', () => {
    const m = buildCarArmory(config.carArmory.look, {});
    for (const s of ['gate', 'ute', 'crates', 'turret', 'charges', 'docs', 'cage', 'sheriff', 'out', 'portal', 'post0', 'post1', 'post2']) expect(m.spots[s]).toBeTruthy();
    for (const s of Object.values(m.spots)) {
      expect(Math.abs(s.x)).toBeLessThanOrEqual(ARMORY.fence.half);
      expect(Math.abs(s.z)).toBeLessThanOrEqual(ARMORY.fence.half);
    }
    expect(m.group.children.length).toBe(2);
    m.dispose();
    expect(carArmoryPlacement({ clearings: [], paths: [] })).toBeNull();
  });
});

function rig(flags = ['shipCoreFitted']) {
  const set = new Set(flags);
  const lines = [];
  const said = [];
  const given = [];
  const spawned = [];
  const m = buildCarArmory(config.carArmory.look, {});
  const spots = m.spots;
  m.dispose();
  const site = { place: { x: 0, z: 0, yaw: 0 }, spots, toWorld: (x, z) => ({ x, z }) };
  const player = { position: { x: 0, y: 0, z: -80 }, crouched: false, riding: null };
  const hurts = [];
  const weapons = { extraTargets: [], pools: { rifle: { rounds: 5 }, shotgun: { rounds: 2 } }, addAmmo(t, n) { this.pools[t].rounds += n; return true; } };
  const inv = { scrap: 0, kits: 0, addKits(k, n) { this.kits += n; return n; }, addScrap(n) { this.scrap += n; } };
  const explosives = { ec: { carryMax: 4 }, inventory: { charges: 1 }, placed: [], give(n) { const k = Math.min(n, this.ec.carryMax - this.inventory.charges); this.inventory.charges += k; return k; } };
  const armour = { ballistic: 0, add(k, n) { this[k] += n; return n; } };
  const a = new CarArmory(config, { on() {}, emit() {} });
  a.init({ site, player, combat: { weapons, inventory: inv, armour, hud: { pickup: (t) => said.push(t) }, hurtPlayer: (d) => hurts.push(d) }, explosives, enemies: { spawnZombie: (x, z, o) => spawned.push(o) }, ground: { heightAt: () => 0 }, lore: { give: (id) => given.push(id) }, dialogue: { play: (id) => lines.push(id) }, progress: { has: (f) => set.has(f), setFlag: (f, on = true) => (on ? set.add(f) : set.delete(f)) }, notify: (t) => said.push(t), sfx: { play() {} }, rng: () => 0.2 });
  const input = { activeDevice: 'gamepad', down: false, isDown() { return this.down; } };
  const tick = (s) => { for (let t = 0; t < s; t += 0.05) a.update(0.05, input, true, true); };
  const holdAt = (spot, s) => { player.position.x = spot.x; player.position.z = spot.z; tick(0.1); input.down = true; tick(s); input.down = false; tick(0.1); };
  return { a, set, lines, said, given, spawned, player, hurts, weapons, inv, explosives, armour, spots, tick, holdAt };
}

describe('the beat, start to end', () => {
  it('Ellen at the gate, and the dead agents in the yard, once', () => {
    const r = rig();
    r.player.position.z = -ARMORY.fence.half - 8;
    r.tick(0.3);
    expect(r.set.has('armorySeen')).toBe(true);
    expect(r.lines).toEqual(['armory.seen.ellen']);
    expect(r.spawned.length).toBe(E.dead);
    expect(r.spawned.every((o) => o.variant === 'mib')).toBe(true);
    r.tick(3);
    expect(r.spawned.length).toBe(E.dead);
  });

  it('upright in the lane he is shot at; crouched he is left alone', () => {
    const r = rig();
    r.player.position.z = -4;
    r.player.crouched = true;
    r.tick(6);
    expect(r.hurts.length).toBe(0);
    r.player.crouched = false;
    r.tick(6);
    expect(r.lines).toContain('armory.spotted.agent');
    expect(r.hurts.length).toBeGreaterThan(2); // rng 0.2 under hitChance: every shot lands
    expect(r.hurts[0]).toBe(E.survivors.damage);
  });

  it('the stores, the turret, the charges (again and again), the files', () => {
    const r = rig();
    r.holdAt(r.spots.crates, 2.6);
    expect(r.set.has('armoryLooted')).toBe(true);
    expect(r.weapons.pools.rifle.rounds).toBe(5 + E.loot.perPool);
    expect(r.inv.scrap).toBe(E.loot.scrap);
    expect(r.armour.ballistic).toBe(E.loot.armour);
    r.holdAt(r.spots.turret, 2.2);
    expect(r.set.has('turretFound')).toBe(true);
    r.holdAt(r.spots.charges, 1.6);
    expect(r.explosives.inventory.charges).toBe(4);
    r.tick(0.2);
    expect(r.a.hud.prompt).toMatch(/carrying all you can/);
    r.explosives.inventory.charges = 0; // used, and back for more: it restocks
    r.holdAt(r.spots.charges, 1.6);
    expect(r.explosives.inventory.charges).toBe(4);
    r.holdAt(r.spots.docs, 1.6);
    expect(r.given).toEqual(ARMORY_DOCS);
  });

  it('the cage: Sheriff is out, he speaks, and the survivors stop mattering', () => {
    const r = rig();
    const before = { x: r.a.sheriff.x, z: r.a.sheriff.z };
    r.holdAt(r.spots.cage, E.cageSeconds + 0.4);
    expect(r.set.has('sheriffFreed')).toBe(true);
    expect(r.lines.at(-1)).toBe('armory.sheriff.1');
    expect(r.a.sheriff.z).toBeLessThan(before.z); // out in front of the cage
    r.player.position.x = 0;
    r.player.position.z = -4;
    const n = r.hurts.length;
    r.tick(6);
    expect(r.hurts.length).toBe(n);
  });
});

describe('its data', () => {
  it('flags, lines, speakers, documents, start points', () => {
    const flags = progress.flags.map((f) => f.id);
    for (const f of ARMORY_FLAGS) expect(flags).toContain(f);
    const byId = new Map(dialogue.lines.map((l) => [l.id, l]));
    for (const id of ['armory.seen.ellen', 'armory.spotted.agent', 'armory.sheriff.1', 'armory.sheriff.2', 'armory.sheriff.3']) expect(byId.get(id)?.draft).toBe(true);
    expect(config.story.speakers.sheriff).toBeTruthy();
    expect(config.story.speakers.agent).toBeTruthy();
    const items = new Set(lore.items.map((i) => i.id));
    for (const id of ARMORY_DOCS) expect(items.has(id)).toBe(true);
    expect(laterFlags('ute')).toContain('sheriffFreed');
    expect(laterFlags('armory')).not.toContain('armorySeen');
    for (const f of laterFlags('ute')) expect(flags).toContain(f);
  });
});
