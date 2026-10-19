// The map's fixed geometry (pure): its bounds, the walkable area, the
// wandering line of the northern cliff, the north-south "southness"
// scale that bands and danger are measured on, and the opening cluster's
// home and cordon line. North is -z.
//
// The cliff runs wholly north of the cordon, so it comes from the
// cluster's fixed seed and is the same on every run (M9.1). Other seeded
// land (hills, trees, outlines) blends from the fixed seed north of the
// cordon to the run's seed south of it: see fixedWeight().

import { signedNoise, noiseSeed } from './noise.js';

// Build the geometry from config.map (the same for every seed).
export function makeGeometry(mapCfg) {
  const halfW = mapCfg.width / 2;
  const halfD = mapCfg.depth / 2;
  const c = mapCfg.cliff;
  const zMin = -halfD;
  const cliffBaseZ = zMin + c.plateauDepth;
  const k = mapCfg.cluster;
  const geo = {
    xMin: -halfW,
    xMax: halfW,
    zMin,
    zMax: halfD,
    // Walkable area (the cliff closes the north side; see cliffZ)
    walk: { xMin: -halfW + mapCfg.edgeMargin, xMax: halfW - mapCfg.edgeMargin, zMax: halfD - mapCfg.edgeMargin },
    cliff: {
      seed: noiseSeed(k.seed, 'cliff'),
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
  const home = { x: k.homeX, z: cliffZ(geo, k.homeX) + mapCfg.home.offsetFromCliff };
  geo.cluster = { seed: k.seed, home, cordonZ: home.z + k.cordonSouthOfHome, fade: k.fade };
  return geo;
}

// How much of the land at z comes from the cluster's fixed seed: 1 north
// of the cordon, fading to 0 over `fade` metres south of it.
export function fixedWeight(geo, z) {
  const c = geo.cluster;
  if (z <= c.cordonZ) return 1;
  if (z >= c.cordonZ + c.fade) return 0;
  const t = (z - c.cordonZ) / c.fade;
  return 1 - t * t * (3 - 2 * t);
}

// Signed noise at noise coordinates (nx, nz), blended between the run's
// field and the fixed one by the weight at world z.
export function blendedNoise(geo, z, nx, nz, runSeed, fixedSeed) {
  const w = fixedWeight(geo, z);
  if (w >= 1) return signedNoise(nx, nz, fixedSeed);
  if (w <= 0) return signedNoise(nx, nz, runSeed);
  return signedNoise(nx, nz, runSeed) * (1 - w) + signedNoise(nx, nz, fixedSeed) * w;
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
