import { describe, it, expect } from 'vitest';
import { slotOf } from '../src/player/loadout.js';
import { Weapons } from '../src/player/Weapons.js';
import { savePlayer, loadPlayer } from '../src/core/saveData.js';
import { Health } from '../src/player/Health.js';
import { Armour } from '../src/player/Armour.js';
import { Inventory } from '../src/player/Inventory.js';
import { config } from './mapFixture.js';

const L = config.weapons.loadout;
const bus = { emit() {} };

function weapons() {
  const w = new Weapons(config.weapons, config.aiming, config.aimAssist, config.player, null, bus);
  w.init({}, {}, {}, null);
  return w;
}

function combat(w) {
  const armour = new Armour(config.armour);
  armour.init();
  const health = new Health(config.health, armour);
  health.init();
  const inventory = new Inventory(config.inventory);
  inventory.init();
  return { health, armour, inventory, weapons: w, kills: 0 };
}

describe('carrying every gun (Session 25, Aaron)', () => {
  it('the slots still name each gun (the weapon cross and the rack use them)', () => {
    for (const id of ['rifle', 'shotgun', 'sniper', 'thermal', 'autoShotgun']) expect(slotOf(L, id)).toBe('long');
    for (const id of ['pistol', 'smg']) expect(slotOf(L, id)).toBe('sidearm');
    expect(slotOf(L, 'shovel')).toBe('melee');
  });

  it('every gun found goes straight to Tom: no rack, no belt', () => {
    const w = weapons();
    for (const id of ['shovel', 'rifle', 'shotgun', 'sniper', 'pistol', 'smg', 'thermal', 'autoShotgun']) expect(w.take(id)).toBe('carried');
    expect(w.order).toEqual(['shovel', 'rifle', 'shotgun', 'sniper', 'pistol', 'smg', 'thermal', 'autoShotgun']);
    expect(w.rack).toEqual([]);
    expect(w.belt).toEqual([]);
    expect(w.found).toEqual(['rifle', 'shotgun', 'sniper', 'pistol', 'smg', 'thermal', 'autoShotgun']);
  });

  it('the swap button flips between the last two used; LB goes to the shovel and back', () => {
    const w = weapons();
    for (const id of ['shovel', 'rifle', 'shotgun', 'sniper']) w.take(id);
    w.selectId('rifle');
    w.selectId('sniper');
    expect(w.swapLast()).toBe(true);
    expect(w.id).toBe('rifle');
    w.swapLast();
    expect(w.id).toBe('sniper');
    w.toggleShovel();
    expect(w.id).toBe('shovel');
    w.toggleShovel();
    expect(w.id).toBe('sniper');
  });

  it('saves what Tom carries; an older save with guns on the rack gives them back', () => {
    const a = weapons();
    for (const id of ['shovel', 'rifle', 'shotgun', 'pistol']) a.take(id);
    a.states.shotgun.mag = 1;
    const d = JSON.parse(JSON.stringify(savePlayer({ position: { x: 0, z: 0 }, yaw: 0 }, combat(a))));
    // As a Session 20-24 save had it: the sniper on the rack, the shovel on the belt.
    d.carried = ['rifle', 'shotgun', 'pistol'];
    d.rack = ['sniper'];
    d.belt = ['shovel'];
    d.weapons.sniper = { mag: 2, reserve: 0 };
    const b = weapons();
    loadPlayer(combat(b), d);
    expect(b.order).toEqual(['rifle', 'shotgun', 'pistol', 'sniper', 'shovel']);
    expect(b.rack).toEqual([]);
    expect(b.belt).toEqual([]);
    expect(b.states.shotgun.mag).toBe(1);
    expect(b.states.sniper.mag).toBe(2);
  });
});
