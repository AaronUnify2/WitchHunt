// Session 25 (Aaron): the weapon cross: every gun carried, laid out in a cross.
import { describe, it, expect } from 'vitest';
import { moveFocus, crossSlots, WeaponCross, ARMS } from '../src/ui/WeaponCross.js';
import { Weapons } from '../src/player/Weapons.js';
import { config } from '../src/config.js';

const cross = config.weapons.cross;
const lengths = Object.fromEntries([...ARMS, 'melee'].map((a) => [a, cross[a].length]));

describe('the weapon cross', () => {
  it('lays the guns out as Aaron asked', () => {
    expect(cross.up).toEqual(['shotgun', 'autoShotgun']);
    expect(cross.left).toEqual(['pistol', 'smg']);
    expect(cross.right).toEqual(['rifle', 'sniper', 'thermal']); // the service rifle first (default agreed)
    expect(cross.down).toEqual(['flareGun', 'dynamite', 'charges']);
    for (const arm of ['up', 'left', 'right']) for (const id of cross[arm]) expect(config.weapons[id]?.kind).toBe('hitscan');
  });

  it('moves out along an arm, back to the middle, and across to another arm', () => {
    let f = moveFocus(null, 'right', lengths);
    expect(f).toEqual({ arm: 'right', i: 0 });
    f = moveFocus(f, 'right', lengths);
    f = moveFocus(f, 'right', lengths);
    f = moveFocus(f, 'right', lengths); // stops at the end
    expect(f).toEqual({ arm: 'right', i: 2 });
    f = moveFocus(f, 'left', lengths);
    expect(f).toEqual({ arm: 'right', i: 1 });
    f = moveFocus(moveFocus(f, 'left', lengths), 'left', lengths);
    expect(f).toBe(null); // the middle
    expect(moveFocus({ arm: 'up', i: 1 }, 'left', lengths)).toEqual({ arm: 'left', i: 0 });
  });

  it('shows what is not found yet as empty slots', () => {
    const s = crossSlots(cross, config.weapons, (id) => id === 'shotgun', 'shotgun', { flareGun: { owned: true, name: 'Flare gun', weapon: null }, dynamite: { owned: false }, charges: { owned: false, weapon: 'detonator' } });
    expect(s.up[0]).toMatchObject({ id: 'shotgun', owned: true, held: true });
    expect(s.up[1].owned).toBe(false);
    expect(s.down.map((x) => x.owned)).toEqual([true, false, false]);
  });

  it('A puts the focused gun in his hands; one not found does nothing; B closes', () => {
    const w = new Weapons(config.weapons, config.aiming, config.aimAssist, config.player, null, { emit() {} });
    w.init({}, {}, {}, null);
    for (const id of ['rifle', 'shotgun', 'sniper']) w.take(id);
    w.selectId('rifle');
    const c = new WeaponCross(config.weapons);
    c.init(null, { weapons: w, inventory: { flares: 3 } });
    c.open('gamepad');
    expect(c.focus).toEqual({ arm: 'right', i: 0 }); // it opens on the gun in hand
    const press = (...actions) => ({ activeDevice: 'gamepad', wasPressed: (a) => actions.includes(a), getMove: () => ({ x: 0, y: 0 }), swallowHeld() {} });
    c.update(press('menuRight'));
    expect(c.focus).toEqual({ arm: 'right', i: 1 });
    c.update(press('menuConfirm'));
    expect(c.isOpen).toBe(false);
    expect(w.id).toBe('sniper');
    c.open('gamepad');
    c.update(press('menuUp')); // across to the up arm: the shotgun
    c.update(press('menuUp')); // the auto shotgun: not found
    c.update(press('menuConfirm'));
    expect(c.isOpen).toBe(true);
    expect(w.id).toBe('sniper');
    c.update(press('menuBack'));
    expect(c.isOpen).toBe(false);
  });

  it('has a melee bar along the bottom: down past the down arm onto it, along it, back up', () => {
    expect(cross.melee[0]).toBe('shovel');
    let f = { arm: 'down', i: cross.down.length - 1 };
    f = moveFocus(f, 'down', lengths);
    expect(f).toEqual({ arm: 'melee', i: 0 });
    f = moveFocus(f, 'right', lengths);
    expect(f).toEqual({ arm: 'melee', i: 1 });
    f = moveFocus(f, 'up', lengths);
    expect(f).toEqual({ arm: 'down', i: cross.down.length - 1 });
  });

  it('A on the shovel puts it in his hands', () => {
    const w = new Weapons(config.weapons, config.aiming, config.aimAssist, config.player, null, { emit() {} });
    w.init({}, {}, {}, null);
    for (const id of ['rifle', 'shovel']) w.take(id);
    w.selectId('rifle');
    const c = new WeaponCross(config.weapons);
    c.init(null, { weapons: w, inventory: { flares: 0 } });
    c.open('gamepad');
    c.focus = { arm: 'melee', i: 0 };
    c.pick();
    expect(w.id).toBe('shovel');
  });
});
