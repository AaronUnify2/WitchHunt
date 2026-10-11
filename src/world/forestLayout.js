// Pure, seeded placement of trees and undergrowth across the whole map.
// Each is a jittered grid: at most one per cell, so spacing stays even
// without overlaps. Trees and bushes stay off open ground (pathways and
// clearings), and the forest is thicker in some patches than others.
// Trees also grow on the plateau above the cliff (seen against the sky),
// but never on the cliff face itself.
//
// ground: a GroundField (or anything with geo, openAt, heightAt, densityAt).

import { cliffZ } from './mapGeometry.js';

// Visit every cell of a jittered grid over the map. The same number of
// random draws is made per cell, so the layout depends only on the seed.
function jitteredGrid(geo, cellSize, jitter, rng, draws, visit) {
  const cols = Math.floor((geo.xMax - geo.xMin) / cellSize);
  const rows = Math.floor((geo.zMax - geo.zMin) / cellSize);
  const r = new Array(draws);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const jx = rng.range(-0.5, 0.5) * jitter * cellSize;
      const jz = rng.range(-0.5, 0.5) * jitter * cellSize;
      for (let k = 0; k < draws; k++) r[k] = rng.next();
      visit(geo.xMin + (i + 0.5) * cellSize + jx, geo.zMin + (j + 0.5) * cellSize + jz, r);
    }
  }
}

// Not inside the cliff wall or the ramp behind it.
function clearOfCliff(geo, x, z, gap) {
  if (z > geo.cliff.baseZ + geo.cliff.amplitude + gap) return true; // well south of it
  const line = cliffZ(geo, x);
  return z > line + gap || z < line - geo.cliff.rampWidth;
}

// Trees: [{ x, y, z, height, width, variant }].
export function layoutForest(cfg, ground, rng) {
  const geo = ground.geo;
  const trees = [];
  jitteredGrid(geo, cfg.cellSize, cfg.jitter, rng, 4, (x, z, r) => {
    const keep = cfg.densityMin + (1 - cfg.densityMin) * ground.densityAt(x, z, cfg.densityScale);
    if (r[0] >= keep) return;
    if (ground.openAt(x, z) > cfg.maxOpen) return;
    if (!clearOfCliff(geo, x, z, cfg.cliffGap)) return;
    const height = cfg.heightMin + (cfg.heightMax - cfg.heightMin) * r[1];
    const ratio = cfg.widthRatioMin + (cfg.widthRatioMax - cfg.widthRatioMin) * r[2];
    const variant = Math.min(cfg.textureVariants - 1, Math.floor(r[3] * cfg.textureVariants));
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
  jitteredGrid(geo, cfg.cellSize, 1, rng, 3, (x, z, r) => {
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
