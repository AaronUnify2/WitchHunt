import { describe, it, expect } from 'vitest';
import {
  packBits,
  unpackBits,
  saveClock,
  loadClock,
  savePlayer,
  loadPlayer,
  saveStation,
  loadStation,
  saveVehicles,
  loadVehicles,
  saveSigils,
  saveRevisits,
  loadRevisits,
  validSave,
  SAVE_VERSION,
} from '../src/core/saveData.js';
import { SaveStore } from '../src/core/SaveStore.js';
import { Clock } from '../src/core/Clock.js';
import { FogOfWar } from '../src/world/FogOfWar.js';
import { StationState } from '../src/base/StationState.js';
import { stationLayout } from '../src/base/stationLayout.js';
import { Health } from '../src/player/Health.js';
import { Armour } from '../src/player/Armour.js';
import { Inventory } from '../src/player/Inventory.js';
import { WeaponState } from '../src/combat/WeaponState.js';
import { Revisits } from '../src/ai/revisits.js';
import { makeMap, makeGround, config } from './mapFixture.js';

// Whatever goes through JSON (as localStorage does).
const viaJson = (d) => JSON.parse(JSON.stringify(d));

function station() {
  const map = makeMap(1234);
  const layout = stationLayout(map.clearings[map.homeIndex], makeGround(1234), config.station.layout);
  const state = new StationState(config.station, layout);
  state.init();
  return state;
}

function combatStub() {
  const armour = new Armour(config.armour);
  armour.init();
  const health = new Health(config.health, armour);
  health.init();
  const inventory = new Inventory(config.inventory);
  inventory.init();
  const order = ['shovel', 'rifle', 'shotgun'];
  const states = {};
  for (const id of order) {
    states[id] = new WeaponState(config.weapons[id]);
    states[id].init();
  }
  return { health, armour, inventory, weapons: { order, states, index: 1 }, kills: 0 };
}

describe('save round trip', () => {
  it('packs the fog of war into bits and back', () => {
    const bytes = new Uint8Array(1001);
    for (let i = 0; i < bytes.length; i += 3) bytes[i] = 1;
    const text = packBits(bytes);
    expect(text.length).toBeLessThan(bytes.length / 4);
    expect([...unpackBits(text, bytes.length)]).toEqual([...bytes]);
    const fog = new FogOfWar(config.fogOfWar, { xMin: 0, xMax: 400, zMin: 0, zMax: 300 });
    fog.reveal(100, 100, 60);
    const again = new FogOfWar(config.fogOfWar, { xMin: 0, xMax: 400, zMin: 0, zMax: 300 });
    again.fromBytes(unpackBits(viaJson(packBits(fog.toBytes())), again.cells.length));
    expect(again.revealedCount).toBe(fog.revealedCount);
    expect(again.isRevealed(100, 100)).toBe(true);
  });

  it('keeps the clock', () => {
    const a = new Clock(config.clock);
    a.init();
    a.day = 4;
    a.phaseIndex = 3;
    a.phaseElapsed = 12.5;
    const b = new Clock(config.clock);
    b.init();
    loadClock(b, viaJson(saveClock(a)));
    expect([b.day, b.phase, b.phaseElapsed]).toEqual([4, a.phase, 12.5]);
  });

  it('keeps the player: health, armour, kit, ammo and weapon', () => {
    const a = combatStub();
    a.health.value = 63;
    a.armour.add('ballistic', 40);
    a.inventory.scrap = 77;
    a.inventory.batteries = 2;
    a.inventory.firstAid = 1;
    a.inventory.ammo.pistol = 9;
    a.weapons.states.rifle.init(3, 21);
    a.weapons.index = 2;
    a.kills = 31;
    const d = viaJson(savePlayer({ position: { x: 5, z: -7 }, yaw: 1.2 }, a));
    expect(d.x).toBe(5);
    const b = combatStub();
    loadPlayer(b, d);
    expect(b.health.value).toBe(63);
    expect(b.armour.get('ballistic')).toBe(40);
    expect([b.inventory.scrap, b.inventory.batteries, b.inventory.firstAid, b.inventory.ammo.pistol]).toEqual([77, 2, 1, 9]);
    expect([b.weapons.states.rifle.mag, b.weapons.states.rifle.reserve]).toEqual([3, 21]);
    expect(b.weapons.index).toBe(2);
    expect(b.kills).toBe(31);
  });

  it('keeps every defence of the station', () => {
    const a = station();
    a.damage(a.segments[2], 123);
    a.buildBarricade(4, 999);
    a.damage(a.segments[4].barricade, 50);
    a.buildSpike(1, 999);
    a.wearSpike(1);
    a.reinforceDoor('front', 999);
    a.damage(a.doors.comms, 80);
    a.damage(a.gate, 100);
    a.charge = 140;
    a.buildFloodlight(0, 999);
    a.turret.available = a.turret.installed = true;
    a.turret.rounds = 55.5;
    a.setTurretMode('fast');
    const b = station();
    loadStation(b, viaJson(saveStation(a)));
    expect(b.security(360).total).toBeCloseTo(a.security(360).total, 9);
    expect(b.segments[2].health).toBe(a.segments[2].health);
    expect(b.segments[7].health).toBe(a.segments[7].health); // the run's broken panel stays broken
    expect(b.segments[4].barricade).toMatchObject({ built: true, health: a.segments[4].barricade.health });
    expect(b.segments[1].spike).toEqual(a.segments[1].spike);
    expect(b.doors.front).toMatchObject({ reinforced: true, max: a.doors.front.max, health: a.doors.front.health });
    expect(b.doors.comms.health).toBe(a.doors.comms.health);
    expect(b.gate.health).toBe(a.gate.health);
    expect(b.charge).toBe(140);
    expect(b.floods[0].built).toBe(true);
    expect(b.turret).toEqual(a.turret);
  });

  it("keeps vehicles' looted flags, sigils and visited encounters", () => {
    const fresh = (id) => ({ id, searched: { door: false, boot: false }, opened: { door: false, door2: false, boot: false }, bonnetUp: false, hasBattery: true, flat: false, alarmArmed: true, seen: false, hurt: 0, wrecked: false });
    const a = [fresh(1), fresh(2)];
    a[1].searched.boot = true;
    a[1].bonnetUp = true;
    a[1].hasBattery = false;
    a[1].alarmArmed = false;
    a[1].seen = true;
    a[1].hurt = 120; // Session 14: damage and wrecks
    a[0].wrecked = true;
    a[0].hurt = 300;
    const b = [fresh(1), fresh(2)];
    loadVehicles(b, viaJson(saveVehicles(a)));
    expect(b[0]).toEqual(a[0]);
    expect(b[1]).toMatchObject({ searched: { door: false, boot: true }, opened: { boot: true }, bonnetUp: true, hasBattery: false, alarmArmed: false, seen: true, hurt: 120, wrecked: false });

    const sigils = viaJson(saveSigils([{ id: 3, x: 1, z: 2, y: 0.5, groundId: 7, clearingId: 7, raised: 9, timer: 4, variants: {} }]));
    expect(sigils).toEqual([{ x: 1, z: 2, y: 0.5, groundId: 7, clearingId: 7, raised: 9 }]);

    const clearings = [{ kind: 'encounter', x: 0, z: 0, radius: 10 }, { kind: 'encounter', x: 500, z: 0, radius: 10 }];
    const r1 = new Revisits(config.revisits, clearings);
    r1.init();
    r1.update(500, 0, null);
    const r2 = new Revisits(config.revisits, clearings);
    r2.init();
    loadRevisits(r2, viaJson(saveRevisits(r1)));
    expect(r2.visited).toEqual([false, true]);
  });

  it('a save slot that survives the trip, and refuses junk', () => {
    const memory = new Map();
    const storage = { getItem: (k) => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v), removeItem: (k) => memory.delete(k) };
    const store = new SaveStore(config.save, storage);
    expect(store.load()).toBe(null);
    const d = { version: SAVE_VERSION, seed: 42, clock: {}, player: {}, station: {} };
    expect(store.save(d)).toBe(true);
    expect(validSave(store.load())).toBe(true);
    store.clear();
    expect(store.load()).toBe(null);
    memory.set(config.save.key, '{not json');
    expect(store.load()).toBe(null);
    expect(validSave({ ...d, version: SAVE_VERSION + 1 })).toBe(false);
    const broken = new SaveStore(config.save, { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('full'); } });
    expect(broken.load()).toBe(null);
    expect(broken.save(d)).toBe(false);
  });
});
