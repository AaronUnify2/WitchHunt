// Session 23 (Aaron): a gun found with its slot full asks which gun to leave
// (the safe's hunting rifle went to the rack by itself, every run).
import { describe, it, expect } from 'vitest';
import { Weapons } from '../src/player/Weapons.js';
import { GunChoice, gunChoiceRows } from '../src/ui/GunChoice.js';
import { config } from './mapFixture.js';

const bus = { emit() {} };
function weapons() {
  const w = new Weapons(config.weapons, config.aiming, config.aimAssist, config.player, null, bus);
  w.init({}, {}, {}, null);
  return w;
}
// The opening's loadout by the gas station's safe: shotgun, service rifle, shovel.
function opening() {
  const w = weapons();
  for (const id of ['shotgun', 'rifle', 'shovel']) w.take(id);
  return w;
}
const input = (pressed = []) => ({ activeDevice: 'gamepad', wasPressed: (a) => pressed.includes(a), swallowHeld() {} });

describe('the gun choice (Session 23)', () => {
  it('offers to leave either long gun, or send the new one to the rack', () => {
    const w = opening();
    const rows = gunChoiceRows(config.weapons, w.order, 'sniper');
    expect(rows.map((r) => r.out)).toEqual(['shotgun', 'rifle', null]);
    expect(rows[0].label).toBe('Take it, leave the shotgun');
    expect(rows[2].id).toBe('rack');
  });

  it('leaving the service rifle carries the hunting rifle and racks the other', () => {
    const w = opening();
    expect(w.take('sniper')).toBe('rack');
    const notes = [];
    const c = new GunChoice(config.weapons);
    c.init(null, { weapons: w, notify: (t) => notes.push(t) });
    c.ask('sniper');
    expect(c.update(input(), true)).toBe(true);
    expect(c.isOpen).toBe(true);
    c.pick('leave-rifle');
    expect(c.isOpen).toBe(false);
    expect(w.order).toContain('sniper');
    expect(w.order).not.toContain('rifle');
    expect(w.rack).toEqual(['rifle']);
    expect(w.id).toBe('sniper');
    expect(notes[0]).toMatch(/service rifle: sent to/i);
  });

  it('sending it to the rack leaves the loadout as it was', () => {
    const w = opening();
    w.take('sniper');
    const c = new GunChoice(config.weapons);
    c.init(null, { weapons: w });
    c.ask('sniper');
    c.update(input(), true);
    c.pick('rack');
    expect(w.order).toEqual(['shotgun', 'rifle', 'shovel']);
    expect(w.rack).toEqual(['sniper']);
  });

  it('waits while something else holds the game (a card, a cutscene)', () => {
    const w = opening();
    w.take('sniper');
    const c = new GunChoice(config.weapons);
    c.init(null, { weapons: w });
    c.ask('sniper');
    expect(c.update(input(), false)).toBe(false);
    expect(c.isOpen).toBe(false);
    expect(c.update(input(), true)).toBe(true);
  });

  it('a gun with room never asks (nothing to leave)', () => {
    const w = weapons();
    w.take('shovel');
    expect(gunChoiceRows(config.weapons, w.order, 'sniper').length).toBe(1);
    const c = new GunChoice(config.weapons);
    c.init(null, { weapons: w });
    c.ask('sniper');
    expect(c.update(input(), true)).toBe(false);
  });
});
