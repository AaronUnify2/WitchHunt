import { describe, it, expect } from 'vitest';
import { verdict, attackFallChance, resolveAttack } from '../src/base/nightResolver.js';
import { sigilDanger, nightDanger, marchSpeed } from '../src/base/danger.js';
import { Rng } from '../src/core/Rng.js';
import { config } from './mapFixture.js';

const r = config.nights.resolver;
const NIGHT = config.clock.phases.find((p) => p.name === 'night').seconds;

describe('the margin table (DESIGN.md)', () => {
  it('puts each margin in its band', () => {
    expect(verdict(25, r).band).toBe('clean');
    expect(verdict(20, r).band).toBe('clean');
    expect(verdict(19, r).band).toBe('holds');
    expect(verdict(0, r).band).toBe('holds');
    expect(verdict(-1, r).band).toBe('mayFall');
    expect(verdict(-10, r).band).toBe('mayFall');
    expect(verdict(-11, r).band).toBe('overrun');
  });

  it('only "may fall" and "likely overrun" can fall, more often the worse the margin', () => {
    expect(verdict(25, r).fallChance).toBe(0);
    expect(verdict(0, r).fallChance).toBe(0);
    const a = verdict(-2, r).fallChance;
    const b = verdict(-9, r).fallChance;
    const c = verdict(-15, r).fallChance;
    const d = verdict(-40, r).fallChance;
    expect(a).toBeGreaterThan(0);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
    expect(d).toBeGreaterThanOrEqual(c);
    expect(c).toBeGreaterThan(0.5); // "likely"
  });

  it('a holding station takes more damage the thinner the margin', () => {
    expect(verdict(1, r).damage).toBeGreaterThan(verdict(18, r).damage);
    expect(verdict(18, r).damage).toBeGreaterThan(verdict(25, r).damage);
  });

  it('attacks that make up the whole night fall as often as the night', () => {
    const night = 0.4;
    for (const shares of [[1], [0.5, 0.5], [0.2, 0.3, 0.5], [0.1, 0.1, 0.1, 0.7]]) {
      const survive = shares.reduce((p, s) => p * (1 - attackFallChance(night, s)), 1);
      expect(1 - survive).toBeCloseTo(night, 9);
    }
  });

  it('over many nights of four attacks at -5, the station falls about as often as the band says', () => {
    const rng = new Rng(4);
    const chance = verdict(-5, r).fallChance;
    let fell = 0;
    const N = 4000;
    for (let n = 0; n < N; n++) {
      let lost = false;
      for (let a = 0; a < 4 && !lost; a++) {
        lost = resolveAttack({ margin: -5, zombies: 5, threat: 2, nightDanger: 40, defenceDamage: 1, roll: rng.next() }, r).falls;
      }
      if (lost) fell++;
    }
    expect(fell / N).toBeCloseTo(chance, 1);
  });

  it("an attack's damage grows with its size and the level", () => {
    const base = { margin: 10, threat: 2, nightDanger: 30, roll: 0.99 };
    const small = resolveAttack({ ...base, zombies: 4, defenceDamage: 1 }, r);
    const big = resolveAttack({ ...base, zombies: 8, defenceDamage: 1 }, r);
    const hard = resolveAttack({ ...base, zombies: 4, defenceDamage: 2 }, r);
    expect(big.damage).toBeCloseTo(small.damage * 2, 6);
    expect(hard.damage).toBeCloseTo(small.damage * 2, 6);
    expect(small.falls).toBe(false);
  });
});

describe('danger', () => {
  it('no sigils, no danger', () => {
    expect(nightDanger([], () => 0, () => '', 1, config, NIGHT).total).toBe(0);
  });

  it('closer sigils are more dangerous; a higher level is more dangerous', () => {
    const near = sigilDanger(300, 1, config, NIGHT);
    const far = sigilDanger(1700, 1, config, NIGHT);
    expect(near.value).toBeGreaterThanOrEqual(far.value);
    expect(near.firstArrival).toBeLessThan(far.firstArrival);
    expect(sigilDanger(1700, 5, config, NIGHT).value).toBeGreaterThan(far.value);
    expect(marchSpeed(config, 5)).toBeGreaterThan(marchSpeed(config, 1));
  });

  it("night 2's single sigil against a fresh station holds but takes damage", () => {
    // A fresh run: about 25 security (one panel down, no charge).
    const d = sigilDanger(900, 1, config, NIGHT).value;
    expect(d).toBeGreaterThan(5);
    expect(d).toBeLessThan(25);
    expect(verdict(25 - d, r).band).toBe('holds');
  });
});
