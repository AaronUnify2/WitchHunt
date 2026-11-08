import { describe, it, expect } from 'vitest';
import { hasRoom, swapCandidates, slotOf } from '../src/player/loadout.js';
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

describe('the loadout (Session 20)', () => {
  it('two long guns, a sidearm (the pistol or the SMG), one melee', () => {
    expect(L.slots).toEqual({ long: 2, sidearm: 1, melee: 1 });
    for (const id of ['rifle', 'shotgun', 'sniper', 'thermal', 'autoShotgun']) expect(slotOf(L, id)).toBe('long');
    for (const id of ['pistol', 'smg']) expect(slotOf(L, id)).toBe('sidearm');
    expect(slotOf(L, 'shovel')).toBe('melee');
    expect(hasRoom(L, ['rifle', 'shotgun'], 'sniper')).toBe(false);
    expect(hasRoom(L, ['rifle', 'shotgun'], 'pistol')).toBe(true);
    expect(hasRoom(L, ['hands', 'detonator'], 'rifle')).toBe(true);
    expect(swapCandidates(L, ['shovel', 'rifle', 'shotgun', 'pistol'], 'sniper')).toEqual(['rifle', 'shotgun']);
  });

  it('a gun found with its slot full goes to the rack by itself', () => {
    const w = weapons();
    expect(w.take('shovel')).toBe('carried');
    expect(w.order).toEqual(['shovel']); // empty hands gone
    expect(w.take('rifle')).toBe('carried');
    expect(w.take('shotgun')).toBe('carried');
    expect(w.take('sniper')).toBe('rack');
    expect(w.take('pistol')).toBe('carried');
    expect(w.take('smg')).toBe('rack');
    expect(w.order).toEqual(['shovel', 'rifle', 'shotgun', 'pistol']);
    expect(w.rack).toEqual(['sniper', 'smg']);
    expect(w.has('sniper')).toBe(true);
    expect(w.addAmmo('sniper', 5)).toBe(true); // its rounds still go to its pool
  });

  it('swaps at the rack in the same slot and the same place in the cycle, keeping magazines', () => {
    const w = weapons();
    for (const id of ['shovel', 'rifle', 'shotgun', 'sniper']) w.take(id);
    w.states.rifle.mag = 2;
    expect(w.swap('sniper', 'pistol')).toBe(false); // not carried
    expect(w.swap('sniper', 'rifle')).toBe(true);
    expect(w.order).toEqual(['shovel', 'sniper', 'shotgun']);
    expect(w.rack).toEqual(['rifle']);
    expect(w.swap('rifle', 'sniper')).toBe(true);
    expect(w.states.rifle.mag).toBe(2);
    expect(w.stow('shotgun')).toBe(true);
    expect(w.draw('sniper')).toBe(true);
    expect(w.order).toEqual(['shovel', 'rifle', 'sniper']);
  });

  it('the shovel goes on the belt and still digs once something takes the melee slot', () => {
    const w = weapons();
    w.take('shovel');
    w.take('rifle');
    expect(w.stow('shovel')).toBe(true);
    expect(w.belt).toEqual(['shovel']);
    expect(w.has('shovel')).toBe(true);
    expect(w.draw('shovel')).toBe(true);
    expect(w.belt).toEqual([]);
    w.stow('rifle');
    expect(w.stow('shovel')).toBe(true); // the last thing in hand: empty hands come back
    expect(w.order).toEqual(['hands']);
  });

  it('saves the loadout, the rack and the belt', () => {
    const a = weapons();
    for (const id of ['shovel', 'rifle', 'shotgun', 'sniper', 'pistol']) a.take(id);
    a.stow('shovel');
    a.states.sniper.mag = 1;
    const d = JSON.parse(JSON.stringify(savePlayer({ position: { x: 0, z: 0 }, yaw: 0 }, combat(a))));
    const b = weapons();
    loadPlayer(combat(b), d);
    expect(b.order).toEqual(['rifle', 'shotgun', 'pistol']);
    expect(b.rack).toEqual(['sniper']);
    expect(b.belt).toEqual(['shovel']);
    expect(b.states.sniper.mag).toBe(1);
  });
});
