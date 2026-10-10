import { describe, it, expect } from 'vitest';
import { Rng, hashSeed } from '../src/core/Rng.js';

const SAMPLES = 1000;

function sequence(rng, n) {
  return Array.from({ length: n }, () => rng.next());
}

describe('Rng', () => {
  it('gives the same sequence for the same seed', () => {
    expect(sequence(new Rng(12345), SAMPLES)).toEqual(sequence(new Rng(12345), SAMPLES));
  });

  it('gives the same sequence for the same string seed', () => {
    expect(sequence(new Rng('witch'), SAMPLES)).toEqual(sequence(new Rng('witch'), SAMPLES));
  });

  it('gives different sequences for different seeds', () => {
    expect(sequence(new Rng(1), 10)).not.toEqual(sequence(new Rng(2), 10));
  });

  it('restarts the sequence when re-initialised with the same seed', () => {
    const rng = new Rng(99);
    const first = sequence(rng, 20);
    rng.init(99);
    expect(sequence(rng, 20)).toEqual(first);
  });

  it('next() stays in [0, 1)', () => {
    const rng = new Rng(7);
    for (const v of sequence(rng, SAMPLES)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int() stays within its inclusive bounds and hits both ends', () => {
    const rng = new Rng(3);
    const seen = new Set();
    for (let i = 0; i < SAMPLES; i++) {
      const v = rng.int(1, 6);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
      seen.add(v);
    }
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('range() stays within [min, max)', () => {
    const rng = new Rng(4);
    for (let i = 0; i < SAMPLES; i++) {
      const v = rng.range(-2, 5);
      expect(v).toBeGreaterThanOrEqual(-2);
      expect(v).toBeLessThan(5);
    }
  });

  it('pick() returns elements of the array', () => {
    const rng = new Rng(5);
    const items = ['bog', 'graveyard', 'roadside'];
    for (let i = 0; i < 100; i++) expect(items).toContain(rng.pick(items));
  });

  it('fork() is deterministic and independent of the parent', () => {
    const a = new Rng(42).fork('map');
    const b = new Rng(42).fork('map');
    expect(sequence(a, 20)).toEqual(sequence(b, 20));
    expect(sequence(new Rng(42).fork('loot'), 20)).not.toEqual(sequence(new Rng(42).fork('map'), 20));
  });

  it('hashSeed() gives a 32-bit unsigned integer', () => {
    for (const seed of [0, 1, -1, 123456789, 'abc', '']) {
      const h = hashSeed(seed);
      expect(Number.isInteger(h)).toBe(true);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(2 ** 32);
    }
  });
});
