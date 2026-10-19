// Pure, seeded placement of trees and undergrowth across the whole map.
// Each is a jittered grid: at most one per cell, so spacing stays even
// without overlaps. Trees and bushes stay off open ground (pathways and
// clearings), and the forest is thicker in some patches than others.
// Trees also grow on the plateau above the cliff (seen against the sky),
// but never on the cliff face itself.
//
// ground: a GroundField (or anything with geo, openAt, heightAt, densityAt).

import { cliffZ } from './mapGeometry.js';
import { Rng } from '../core/Rng.js';

// Visit every cell of a jittered grid over the map. The same number of
// random draws is made per cell, so the layout depends only on the seed.
// Where the ground is fixed (north of the cordon, M9.1) the draws come
// from `fixedRng` instead, so the opening cluster's trees are the same
// every run; both streams advance every cell so neither depends on where
// the line falls.
function jitteredGrid(geo, cellSize, jitter, rng, fixedRng, isFixed, draws, visit) {
  const cols = Math.floor((geo.xMax - geo.xMin) / cellSize);
  const rows = Math.floor((geo.zMax - geo.zMin) / cellSize);
  const r = new Array(draws);
  const f = new Array(draws + 2);
  for (let j = 0; j < rows; j++) {
    const z0 = geo.zMin + (j + 0.5) * cellSize;
    const fixedRow = fixedRng && isFixed(z0 + cellSize);
    for (let i = 0; i < cols; i++) {
      let jx = rng.range(-0.5, 0.5);
      let jz = rng.range(-0.5, 0.5);
      for (let k = 0; k < draws; k++) r[k] = rng.next();
      if (fixedRow) {
        for (let k = 0; k < draws + 2; k++) f[k] = fixedRng.next();
        jx = f[draws] - 0.5;
        jz = f[draws + 1] - 0.5;
        for (let k = 0; k < draws; k++) r[k] = f[k];
      }
      visit(geo.xMin + (i + 0.5) * cellSize + jx * jitter * cellSize, z0 + jz * jitter * cellSize, r);
    }
  }
}

// The fixed stream for a layout, if the ground has a fixed region.
function fixedStream(ground, label) {
  return ground.fixedSeed !== undefined ? new Rng(`${ground.fixedSeed}:${label}`) : null;
}

// Not inside the cliff wall or the ramp behind it.
function clearOfCliff(geo, x, z, gap) {
  if (z > geo.cliff.baseZ + geo.cliff.amplitude + gap) return true; // well south of it
  const line = cliffZ(geo, x);
  return z > line + gap || z < line - geo.cliff.rampWidth;
}

// Which kind of tree (index into kinds) a draw r in 0..1 picks, by weight.
export function pickTreeKind(kinds, r) {
  const total = kinds.reduce((sum, k) => sum + k.weight, 0);
  let left = r * total;
  for (let i = 0; i < kinds.length; i++) {
    left -= kinds[i].weight;
    if (left < 0) return i;
  }
  return kinds.length - 1;
}

// Trees: [{ x, y, z, height, width, variant }]; variant indexes cfg.kinds.
export function layoutForest(cfg, ground, rng) {
  const geo = ground.geo;
  const trees = [];
  jitteredGrid(geo, cfg.cellSize, cfg.jitter, rng, fixedStream(ground, 'trees'), (z) => ground.isFixed(z), 4, (x, z, r) => {
    const keep = cfg.densityMin + (1 - cfg.densityMin) * ground.densityAt(x, z, cfg.densityScale);
    if (r[0] >= keep) return;
    if (ground.openAt(x, z) > cfg.maxOpen) return;
    if (!clearOfCliff(geo, x, z, cfg.cliffGap)) return;
    const variant = pickTreeKind(cfg.kinds, r[3]);
    const kind = cfg.kinds[variant];
    const height = kind.height[0] + (kind.height[1] - kind.height[0]) * r[1];
    const ratio = kind.widthRatio[0] + (kind.widthRatio[1] - kind.widthRatio[0]) * r[2];
    trees.push({ x, y: ground.heightAt(x, z), z, height, width: height * ratio, variant });
  });
  return trees;
}

// Undergrowth (low bushes and ferns): [{ x, y, z, height, width, variant }],
// variant counted from 0 within the bush sprites. Only south of the cliff
// (nobody sees the plateau's floor).
export function layoutUndergrowth(cfg, ground, rng, densityScale) {
  const geo = ground.geo;
  const bushes = [];
  jitteredGrid(geo, cfg.cellSize, 1, rng, fixedStream(ground, 'undergrowth'), (z) => ground.isFixed(z), 3, (x, z, r) => {
    const keep = cfg.densityMin + (1 - cfg.densityMin) * ground.densityAt(x, z, densityScale);
    if (r[0] >= keep) return;
    if (ground.openAt(x, z) > cfg.maxOpen) return;
    if (z < geo.cliff.baseZ + geo.cliff.amplitude + geo.cliff.walkMargin && z < cliffZ(geo, x) + geo.cliff.walkMargin) return;
    const height = cfg.heightMin + (cfg.heightMax - cfg.heightMin) * r[1];
    const variant = Math.min(cfg.variants - 1, Math.floor(r[2] * cfg.variants));
    bushes.push({ x, y: ground.heightAt(x, z), z, height, width: height * cfg.widthRatio, variant });
  });
  return bushes;
}
