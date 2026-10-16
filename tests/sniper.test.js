import { describe, it, expect } from 'vitest';
import { config } from '../src/config.js';
import { WeaponState } from '../src/combat/WeaponState.js';
import { Armour } from '../src/player/Armour.js';
import { Health } from '../src/player/Health.js';
import { Inventory } from '../src/player/Inventory.js';
import { savePlayer, loadPlayer } from '../src/core/saveData.js';

const sniper = config.weapons.sniper;
const z = config.zombies;

// A zombie's health for a level and variant.
function zombieHealth(level, variant) {
  return z.health * z.levels[level].health * z.variants[variant].health;
}

describe('the hunting rifle (Session 10b, Aaron: kills by headshot)', () => {
  it('never kills even the weakest zombie with a body shot', () => {
    expect(sniper.damage).toBeLessThan(zombieHealth(1, 'citizen'));
  });

  it('kills the toughest zombie with a headshot', () => {
    const toughest = Math.max(...Object.keys(z.levels).flatMap((l) => Object.keys(z.variants).map((v) => zombieHealth(l, v))));
    expect(sniper.damage * config.weapons.headshotMultiplier).toBeGreaterThanOrEqual(toughest);
  });

  it('punches through more of a line than the service rifle', () => {
    const rifle = config.weapons.rifle;
    expect(sniper.pierce).toBeGreaterThan(rifle.pierce);
    expect(sniper.pierceKeep).toBeGreaterThan(rifle.pierceKeep);
  });

  it('comes back from a save with its rounds', () => {
    const make = () => {
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
      const weapons = {
        cfg: config.weapons,
        order,
        states,
        index: 1,
        setSlot(id) {
          this.order.push(id);
          this.states[id] = new WeaponState(config.weapons[id]);
          this.states[id].init();
        },
      };
      return { health, armour, inventory, weapons, kills: 0 };
    };
    const a = make();
    a.weapons.setSlot('sniper');
    a.weapons.states.sniper.init(4, 6);
    const d = JSON.parse(JSON.stringify(savePlayer({ position: { x: 0, z: 0 }, yaw: 0 }, a)));
    const b = make();
    loadPlayer(b, d);
    expect(b.weapons.order).toContain('sniper');
    expect(b.weapons.states.sniper.mag).toBe(4);
    expect(b.weapons.states.sniper.reserve).toBe(6);
  });
});
