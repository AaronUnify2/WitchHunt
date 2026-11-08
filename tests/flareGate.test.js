import { describe, it, expect, afterEach } from 'vitest';
import { rollLoot, lootGate } from '../src/combat/loot.js';
import { Rng } from '../src/core/Rng.js';
import lootData from '../src/data/loot.json';
import progressData from '../src/data/progress.json';

const table = [
  { item: 'flare', chance: 1, min: 1, max: 2 },
  { item: 'scrap', chance: 0.5, min: 1, max: 4 },
];

afterEach(() => {
  lootGate.allows = () => true;
});

describe('flares out of the opening (Session 20)', () => {
  it("flares wait for the Mothman at the crashed plane (a flag the debug menu can set)", () => {
    expect(lootData.items.flare.after).toBe('mothmanMet');
    expect(progressData.flags.some((f) => f.id === 'mothmanMet')).toBe(true);
  });

  it('held back, nothing else changes; let through, they drop', () => {
    const flags = new Set();
    lootGate.allows = (item) => !lootData.items[item]?.after || flags.has(lootData.items[item].after);
    const before = [];
    for (let i = 0; i < 20; i++) before.push(...rollLoot(table, new Rng(i)).map((e) => ({ ...e })));
    expect(before.some((e) => e.item === 'flare')).toBe(false);
    lootGate.allows = () => true;
    const open = [];
    for (let i = 0; i < 20; i++) open.push(...rollLoot(table, new Rng(i)).map((e) => ({ ...e })));
    expect(open.filter((e) => e.item === 'flare').length).toBe(20);
    expect(open.filter((e) => e.item === 'scrap')).toEqual(before.filter((e) => e.item === 'scrap')); // same scrap either way
  });
});
