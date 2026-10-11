import { describe, it, expect } from 'vitest';
import { levelForSigils, levelStats, clampLevel, speedRoll, speedFromRoll, pickVariant, planSpawn } from '../src/ai/zombieLevels.js';
import { Rng } from '../src/core/Rng.js';
import { config } from '../src/config.js';

const levels = config.zombies.levels;
const horde = config.zombies.horde;

describe('zombie levels', () => {
  it('level = active sigils, 1 to 5', () => {
    expect(levelForSigils(0)).toBe(1);
    expect(levelForSigils(3)).toBe(3);
    expect(levelForSigils(9)).toBe(5);
    expect(clampLevel(0)).toBe(1);
  });

  it('every level from 1 to 5 has a full row, matching DESIGN.md', () => {
    const fields = ['speedMin', 'speedMax', 'hordeChance', 'mutantChance', 'health', 'damage', 'notice', 'defenceDamage'];
    for (let l = 1; l <= 5; l++) for (const f of fields) expect(typeof levelStats(levels, l)[f]).toBe('number');
    expect(levelStats(levels, 1)).toMatchObject({ speedMin: 0.35, speedMax: 0.45, hordeChance: 0, mutantChance: 0 });
    expect(levelStats(levels, 2)).toMatchObject({ speedMin: 0.35, speedMax: 0.55, hordeChance: 0.1, mutantChance: 0 });
    expect(levelStats(levels, 3)).toMatchObject({ speedMin: 0.4, speedMax: 0.7, hordeChance: 0.1, mutantChance: 0.05 });
    expect(levelStats(levels, 4)).toMatchObject({ speedMin: 0.45, speedMax: 0.95, hordeChance: 0.2, mutantChance: 0.1 });
    expect(levelStats(levels, 5)).toMatchObject({ speedMin: 0.5, speedMax: 1.3, hordeChance: 0.3, mutantChance: 0.15 });
  });

  it('higher levels are tougher, hit harder and notice from further', () => {
    for (let l = 2; l <= 5; l++) {
      for (const f of ['health', 'damage', 'notice', 'defenceDamage']) expect(levelStats(levels, l)[f]).toBeGreaterThan(levelStats(levels, l - 1)[f]);
    }
  });

  it('only level 5 has zombies that outrun the player', () => {
    const sprint = config.zombies.sprintSpeed;
    for (let l = 1; l <= 4; l++) expect(speedFromRoll(1, levels[l].speedMin, levels[l].speedMax, sprint)).toBeLessThan(sprint);
    expect(speedFromRoll(1, levels[5].speedMin, levels[5].speedMax, sprint)).toBeGreaterThan(sprint);
  });

  it('speed rolls are skewed toward the slow end', () => {
    const rng = new Rng(11);
    let slowHalf = 0;
    for (let i = 0; i < 2000; i++) if (speedRoll(rng, config.zombies.speedSkew) < 0.5) slowHalf++;
    expect(slowHalf).toBeGreaterThan(1300);
  });
});

describe('pickVariant', () => {
  it('follows the mix', () => {
    const rng = new Rng(5);
    const counts = { citizen: 0, police: 0, army: 0 };
    for (let i = 0; i < 3000; i++) counts[pickVariant({ citizen: 0.25, police: 0.6, army: 0.15 }, rng)]++;
    expect(counts.police / 3000).toBeGreaterThan(0.55);
    expect(counts.police / 3000).toBeLessThan(0.65);
    expect(counts.army).toBeGreaterThan(0);
  });

  it('falls back to citizens with no mix', () => {
    expect(pickVariant(null, new Rng(1))).toBe('citizen');
    expect(pickVariant({}, new Rng(1))).toBe('citizen');
  });

  it('every clearing type has a valid mix', async () => {
    const { types } = (await import('../src/data/clearingTypes.json')).default;
    for (const t of types) {
      for (const v of Object.keys(t.variants)) expect(config.zombies.variants[v]).toBeDefined();
    }
  });
});

describe('planSpawn', () => {
  function tally(level, mutantAllowed = true, n = 4000) {
    const rng = new Rng(`plan${level}`);
    const t = { single: 0, horde: 0, mutant: 0 };
    for (let i = 0; i < n; i++) {
      const p = planSpawn(levels[level], horde, rng, mutantAllowed);
      t[p.type]++;
      if (p.type === 'horde') {
        expect(p.count).toBeGreaterThanOrEqual(horde.countMin);
        expect(p.count).toBeLessThanOrEqual(horde.countMax);
      }
    }
    return t;
  }

  it('level 1: singles only', () => {
    expect(tally(1)).toEqual({ single: 4000, horde: 0, mutant: 0 });
  });

  it('level 2: hordes appear, no mutants', () => {
    const t = tally(2);
    expect(t.horde / 4000).toBeGreaterThan(0.07);
    expect(t.mutant).toBe(0);
  });

  it('level 5: more hordes and mutants', () => {
    const t = tally(5);
    expect(t.horde / 4000).toBeGreaterThan(0.26);
    expect(t.mutant / 4000).toBeGreaterThan(0.08);
  });

  it('no mutants when the mutant cap is full', () => {
    expect(tally(5, false).mutant).toBe(0);
  });
});
