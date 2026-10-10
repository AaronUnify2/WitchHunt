// Seeded pseudo-random numbers (mulberry32). The same seed always gives
// the same sequence, so a seed reproduces a run. Never use Math.random()
// for anything that affects gameplay.

const UINT32 = 4294967296; // 2^32, for mapping a uint32 to [0, 1)

// Turn any seed (number or string) into a 32-bit unsigned integer.
export function hashSeed(seed) {
  const text = String(seed);
  let h = 2166136261; // FNV-1a offset basis
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619); // FNV-1a prime
  }
  return h >>> 0;
}

export class Rng {
  constructor(seed = 0) {
    this.init(seed);
  }

  init(seed) {
    this.seed = seed;
    this.state = hashSeed(seed);
  }

  update() {}

  dispose() {}

  // Float in [0, 1).
  next() {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / UINT32;
  }

  // Float in [min, max).
  range(min, max) {
    return min + (max - min) * this.next();
  }

  // Integer in [min, max], both inclusive.
  int(min, max) {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  // True with probability p.
  chance(p) {
    return this.next() < p;
  }

  // A random element of a non-empty array.
  pick(array) {
    return array[Math.floor(this.next() * array.length)];
  }

  // A new independent generator derived from this seed and a label,
  // so separate systems (map, loot, spawns) don't disturb each other.
  fork(label) {
    return new Rng(`${this.seed}:${label}`);
  }
}
