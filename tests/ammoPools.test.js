import { describe, it, expect } from 'vitest';
import { config } from '../src/config.js';
import { Weapons } from '../src/player/Weapons.js';
import { WeaponState } from '../src/combat/WeaponState.js';

// Weapons without a player or a scene: only the loadout and ammo logic.
function weapons() {
  const w = new Weapons(config.weapons, config.aiming, config.aimAssist, config.player, null, { emit() {} });
  w.reset();
  return w;
}

describe('shared ammo pools (Session 10b)', () => {
  it('guns firing the same rounds draw on one pool', () => {
    const pool = { rounds: 20 };
    const a = new WeaponState(config.weapons.pistol, pool);
    const b = new WeaponState(config.weapons.smg, pool);
    a.init(0, null);
    b.init(0, null);
    a.startReload();
    a.update(config.weapons.pistol.reloadSeconds + 0.01);
    expect(a.mag).toBe(12);
    expect(b.reserve).toBe(8);
  });

  it('a new gun joins its ammo type\'s pool without wiping it', () => {
    const w = weapons();
    const shells = w.ammoRounds('shotgun');
    expect(shells).toBe(config.weapons.shotgun.startReserve);
    w.setSlot('autoShotgun', true);
    expect(w.ammoType('autoShotgun')).toBe('shotgun');
    expect(w.states.autoShotgun.reserve).toBe(shells);
    w.addAmmo('shotgun', 5);
    expect(w.states.shotgun.reserve).toBe(shells + 5);
  });

  it('pickups for rounds with no gun yet are refused (they go in the pack)', () => {
    const w = weapons();
    expect(w.addAmmo('pistol', 10)).toBe(false);
    expect(w.ammoRounds('pistol')).toBeNull();
    w.setSlot('smg', true);
    expect(w.addAmmo('pistol', 10)).toBe(true);
    expect(w.ammoRounds('pistol')).toBe(10);
  });

  it('the debug "give ammo" fills each pool once, not once per gun', () => {
    const w = weapons();
    w.setSlot('autoShotgun', true);
    const before = w.ammoRounds('shotgun');
    w.giveAmmo(10);
    expect(w.ammoRounds('shotgun')).toBe(before + 10);
  });
});
