import { describe, it, expect } from 'vitest';
import { rollLoot, lootTableFor, pickupLabel } from '../src/combat/loot.js';
import { Pickups } from '../src/world/Pickups.js';
import { Rng } from '../src/core/Rng.js';
import { config } from '../src/config.js';
import loot from '../src/data/loot.json';

function rate(table, item, n = 4000) {
  const rng = new Rng(`rate-${item}`);
  let hits = 0;
  for (let i = 0; i < n; i++) if (rollLoot(table, rng).some((d) => d.item === item)) hits++;
  return hits / n;
}

describe('loot tables', () => {
  it('every table entry names a real item, and every variant has a table', () => {
    for (const table of Object.values(loot.tables)) for (const e of table) expect(loot.items[e.item]).toBeDefined();
    for (const v of Object.keys(config.zombies.variants)) expect(loot.tables[v]).toBeDefined();
    expect(loot.tables.mutant).toBeDefined();
  });

  it('matches DESIGN.md: citizens mostly ammo, sometimes scrap, rarely first aid', () => {
    const t = loot.tables.citizen;
    const ammo = rate(t, 'shotgunAmmo') + rate(t, 'rifleAmmo');
    expect(ammo).toBeGreaterThan(rate(t, 'scrap'));
    expect(rate(t, 'scrap')).toBeGreaterThan(rate(t, 'firstAid'));
    expect(rate(t, 'firstAid')).toBeLessThan(0.08);
  });

  it('police drop vests and pistol ammo; the army helmets and rifle ammo', () => {
    expect(rate(loot.tables.police, 'vest')).toBeGreaterThan(0.25);
    expect(rate(loot.tables.police, 'pistolAmmo')).toBeGreaterThan(0.2);
    expect(rate(loot.tables.army, 'helmet')).toBeGreaterThan(0.25);
    expect(rate(loot.tables.army, 'rifleAmmo')).toBeGreaterThan(0.15);
    // The army is the main rifle ammo source.
    expect(rate(loot.tables.army, 'rifleAmmo')).toBeGreaterThan(rate(loot.tables.citizen, 'rifleAmmo') * 3);
  });

  it('vests are +40 ballistic and helmets +20', () => {
    expect(loot.items.vest).toMatchObject({ armour: 'ballistic', amount: 40 });
    expect(loot.items.helmet).toMatchObject({ armour: 'ballistic', amount: 20 });
  });

  it('ammo is scarce: a kill pays back well under one rifle round on average (Aaron, M4 test)', () => {
    const rng = new Rng(4);
    const n = 3000;
    for (const v of ['citizen', 'police', 'army']) {
      let rifle = 0;
      for (let i = 0; i < n; i++) for (const d of rollLoot(loot.tables[v], rng)) if (d.item === 'rifleAmmo') rifle += d.amount;
      expect(rifle / n).toBeLessThan(0.5);
    }
  });

  it('mutants drop more', () => {
    const rng = new Rng(2);
    let mutant = 0;
    let citizen = 0;
    for (let i = 0; i < 500; i++) {
      mutant += rollLoot(loot.tables.mutant, rng).length;
      citizen += rollLoot(loot.tables.citizen, rng).length;
    }
    expect(mutant).toBeGreaterThan(citizen * 4);
  });

  it('amounts stay in range; tables follow the enemy', () => {
    const rng = new Rng(9);
    for (let i = 0; i < 500; i++) {
      for (const d of rollLoot(loot.tables.army, rng)) {
        if (d.item === 'rifleAmmo') {
          expect(d.amount).toBeGreaterThanOrEqual(1);
          expect(d.amount).toBeLessThanOrEqual(2);
        }
      }
    }
    expect(lootTableFor({ kind: 'mutant', variant: 'mutant' }, loot.tables)).toBe(loot.tables.mutant);
    expect(lootTableFor({ kind: 'zombie', variant: 'police' }, loot.tables)).toBe(loot.tables.police);
    expect(pickupLabel(loot.items.shotgunAmmo, 4)).toBe('+4 shotgun shells');
    expect(pickupLabel(loot.items.vest, 1)).toBe('+ police vest (+40 ballistic)');
  });
});

describe('Pickups', () => {
  const cfg = { poolSize: 3, radius: 1.3, lifeSeconds: 10 };

  it('is taken when walked over, unless take() refuses', () => {
    const p = new Pickups(cfg);
    p.init();
    p.drop('scrap', 2, 5, 0, 5);
    expect(p.update(0.1, 0, 0, () => true)).toBe(0); // too far
    expect(p.update(0.1, 5, 5.5, () => false)).toBe(0); // e.g. a full armour bar: stays
    expect(p.activeCount).toBe(1);
    const got = [];
    expect(p.update(0.1, 5, 5.5, (item, n) => got.push([item, n]))).toBe(1);
    expect(got).toEqual([['scrap', 2]]);
    expect(p.activeCount).toBe(0);
  });

  it('expires, and reuses the oldest slot when full', () => {
    const p = new Pickups(cfg);
    p.init();
    p.drop('a', 1, 0, 0, 0);
    p.update(5, 100, 100);
    p.drop('b', 1, 0, 0, 0);
    p.drop('c', 1, 0, 0, 0);
    p.drop('d', 1, 0, 0, 0); // full: replaces 'a'
    expect(p.pool.map((s) => s.item).sort()).toEqual(['b', 'c', 'd']);
    p.update(10.1, 100, 100);
    expect(p.activeCount).toBe(0);
  });
});
