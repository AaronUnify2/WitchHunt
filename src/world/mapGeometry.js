// The map's fixed geometry (pure): its bounds, the walkable area, the
// wandering line of the northern cliff and the north-south "southness"
// scale that bands and danger are measured on. North is -z.

import { signedNoise, noiseSeed } from './noise.js';

// Build the geometry for a map seed from config.map.
export function makeGeometry(mapCfg, seed) {
  const halfW = mapCfg.width / 2;
  const halfD = mapCfg.depth / 2;
  const c = mapCfg.cliff;
  const zMin = -halfD;
  const cliffBaseZ = zMin + c.plateauDepth;
  return {
    xMin: -halfW,
    xMax: halfW,
    zMin,
    zMax: halfD,
    // Walkable area (the cliff closes the north side; see cliffZ)
    walk: { xMin: -halfW + mapCfg.edgeMargin, xMax: halfW - mapCfg.edgeMargin, zMax: halfD - mapCfg.edgeMargin },
    cliff: {
      seed: noiseSeed(seed, 'cliff'),
      baseZ: cliffBaseZ,
      amplitude: c.amplitude,
      wavelength: c.wavelength,
      height: c.height,
      heightVariation: c.heightVariation,
      rampWidth: c.rampWidth,
      walkMargin: c.walkMargin,
    },
    // Southness 0 at the cliff's mean line, 1 at the southern walkable edge.
    southTop: cliffBaseZ,
    southBottom: halfD - mapCfg.edgeMargin,
  };
}

// z of the cliff face at x.
export function cliffZ(geo, x) {
  const c = geo.cliff;
  return c.baseZ + c.amplitude * signedNoise(x / c.wavelength, 0.5, c.seed);
}

// Height of the cliff wall at x (metres above the ground at its foot).
export function cliffHeight(geo, x) {
  const c = geo.cliff;
  return c.height + c.heightVariation * signedNoise(x / (c.wavelength * 0.4), 7.5, c.seed);
}

export function southnessAt(geo, z) {
  return Math.max(0, Math.min(1, (z - geo.southTop) / (geo.southBottom - geo.southTop)));
}

export function zAtSouthness(geo, s) {
  return geo.southTop + s * (geo.southBottom - geo.southTop);
}

// Keep a ground position inside the walkable area: east, west and south
// edges, and `cliff.walkMargin` south of the cliff face. Mutates and
// returns pos ({ x, z }).
export function clampToWalkable(geo, pos) {
  const w = geo.walk;
  pos.x = Math.max(w.xMin, Math.min(w.xMax, pos.x));
  const north = cliffZ(geo, pos.x) + geo.cliff.walkMargin;
  pos.z = Math.max(north, Math.min(w.zMax, pos.z));
  return pos;
}
