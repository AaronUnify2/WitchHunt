// Session 23 (#343): the gun rack shows the guns on it.
import { describe, it, expect } from 'vitest';
import { rackGunParts, rackSlot } from '../src/render/rackGuns.js';
import { config } from './mapFixture.js';

const show = config.station.gunRack.show;
const box = (w, h, d, x, y, z, colour) => ({ w, h, d, x, y, z, colour });

describe('the guns on the rack (Session 23)', () => {
  it('has a look for every gun that can go on the rack', () => {
    const L = config.weapons.loadout;
    for (const id of Object.keys(L.slotOf)) {
      if (L.tools.includes(id) || L.slotOf[id] === 'melee') continue; // Session 27: melee weapons never go on the rack (weapons.found)
      expect(show.guns[id], id).toBeTruthy();
    }
  });

  it('each gun fits between the shelf and the top of the board', () => {
    for (const [id, look] of Object.entries(show.guns)) {
      const parts = rackGunParts(look, show, box);
      const top = Math.max(...parts.map((p) => p.y + p.h));
      expect(top, id).toBeLessThanOrEqual(1.2); // shelf at 0.6, board to 1.8
      expect(parts.length, id).toBeGreaterThan(1);
    }
  });

  it('the scope, pump and magazine show where a gun has them', () => {
    const n = (id) => rackGunParts(show.guns[id], show, box).length;
    expect(n('sniper')).toBe(n('rifle')); // a scope, against a magazine
    expect(n('thermal')).toBe(n('rifle') + 1); // both
    expect(n('shotgun')).toBe(n('rifle')); // a pump fore-end
  });

  it('the pegs run along the rack', () => {
    const rack = { x: 1, z0: -3, dz: 0.3, y: 0.6 };
    expect(rackSlot(rack, 2)).toEqual({ x: 1, y: 0.6, z: -3 + 0.6 });
  });
});
