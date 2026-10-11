// Seeded smooth noise (pure). Value noise: a random value at every
// integer grid point, blended with a smooth curve in between. Cheap,
// deterministic and good enough for rolling hills, wobbly edges and
// patchy forest density.

import { hashSeed } from '../core/Rng.js';

const UINT32 = 4294967296;

// A 32-bit seed from any seed (number or string) and a label, so each
// use of noise gets its own independent field.
export function noiseSeed(seed, label) {
  return hashSeed(`${seed}:noise:${label}`);
}

// Random value in [0, 1) for integer grid point (ix, iz).
function lattice(ix, iz, seed) {
  let h = seed ^ Math.imul(ix, 0x27d4eb2d) ^ Math.imul(iz, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / UINT32;
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}

// Smooth noise in [0, 1) at (x, z), in grid units (one bump per unit).
export function valueNoise(x, z, seed) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = smooth(x - ix);
  const fz = smooth(z - iz);
  const a = lattice(ix, iz, seed);
  const b = lattice(ix + 1, iz, seed);
  const c = lattice(ix, iz + 1, seed);
  const d = lattice(ix + 1, iz + 1, seed);
  const top = a + (b - a) * fx;
  const bottom = c + (d - c) * fx;
  return top + (bottom - top) * fz;
}

// Noise centred on zero, in [-1, 1).
export function signedNoise(x, z, seed) {
  return valueNoise(x, z, seed) * 2 - 1;
}

// Smoothstep from edge0 to edge1 (edge0 may be greater than edge1).
export function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
