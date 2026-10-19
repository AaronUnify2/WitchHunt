// The ground as data (pure, no three.js): height everywhere on the map,
// and two masks on a finer grid:
//  - dirt: bare ground on pathways and in the middle of clearings (drawn
//    by the ground shader and the map);
//  - open: no trees or undergrowth (pathways, clearings and a margin
//    round them). Off the open ground the undergrowth slows you down.
// Heights are rolling noise, levelled in clearings, smoothed along
// pathways, and lifted onto the plateau behind the northern cliff.
// North of the cordon every noise field comes from the opening cluster's
// fixed seed, so the cluster's land is the same on every run (M9.1).
// Height lookups interpolate exactly like the ground mesh's triangles, so
// feet, trees and rocks sit on the drawn surface.

import { noiseSeed, smoothstep } from './noise.js';
import { cliffZ, cliffHeight, clampToWalkable, blendedNoise, fixedWeight } from './mapGeometry.js';
import { pointSegmentDistance } from './mapGraph.js';

export class GroundField {
  // map: from generateMap(). mapCfg: config.map. terrainCfg: config.terrain.
  constructor(map, mapCfg, terrainCfg) {
    this.map = map;
    this.geo = map.geometry;
    this.mapCfg = mapCfg;
    this.cfg = terrainCfg;
    this.seed = map.seed;
    this.fixedSeed = this.geo.cluster.seed;
    this.buildMasks();
    this.buildHeights();
  }

  // ---- masks ---------------------------------------------------------------

  buildMasks() {
    const g = this.geo;
    const cell = this.mapCfg.maskCell;
    this.maskCell = cell;
    this.maskNx = Math.round((g.xMax - g.xMin) / cell) + 1;
    this.maskNz = Math.round((g.zMax - g.zMin) / cell) + 1;
    this.dirt = new Float32Array(this.maskNx * this.maskNz);
    this.open = new Float32Array(this.maskNx * this.maskNz);
    this.edgeSeed = noiseSeed(this.seed, 'edges');
    this.fixedEdgeSeed = noiseSeed(this.fixedSeed, 'edges');
    for (const c of this.map.clearings) this.rasterClearing(c);
    for (const p of this.map.paths) this.rasterPath(p.points, this.mapCfg.paths);
    // The road (M9.1): asphalt with gravel shoulders (dirt), trees kept back.
    if (this.map.road) {
      const r = this.mapCfg.road;
      const p = this.mapCfg.paths;
      this.rasterPath(this.map.road.points, { ...p, width: r.width + r.shoulder * 2, clearance: r.clearance, edgeNoise: p.edgeNoise * 0.5 });
    }
    // The cordon (M9.1): a bare track along the fence, trees cleared each side.
    if (this.map.cluster && this.mapCfg.cordon) {
      const k = this.mapCfg.cordon;
      const z = this.map.cluster.cordonZ;
      const line = [{ x: this.geo.xMin, z }, { x: this.geo.xMax, z }];
      this.rasterPath(line, { ...this.mapCfg.paths, width: k.track, clearance: k.cleared - k.track / 2, edgeNoise: 0.6 });
    }
  }

  // Visit every mask point within `reach` of a box, calling fn(index, x, z).
  forBox(x0, z0, x1, z1, reach, fn) {
    const g = this.geo;
    const cell = this.maskCell;
    const i0 = Math.max(0, Math.floor((Math.min(x0, x1) - reach - g.xMin) / cell));
    const i1 = Math.min(this.maskNx - 1, Math.ceil((Math.max(x0, x1) + reach - g.xMin) / cell));
    const j0 = Math.max(0, Math.floor((Math.min(z0, z1) - reach - g.zMin) / cell));
    const j1 = Math.min(this.maskNz - 1, Math.ceil((Math.max(z0, z1) + reach - g.zMin) / cell));
    for (let j = j0; j <= j1; j++) {
      const z = g.zMin + j * cell;
      for (let i = i0; i <= i1; i++) fn(j * this.maskNx + i, g.xMin + i * cell, z);
    }
  }

  // The outline wobble at a point, in metres.
  edgeWobble(x, z, scale, amount) {
    return blendedNoise(this.geo, z, x / scale, z / scale, this.edgeSeed, this.fixedEdgeSeed) * amount;
  }

  rasterClearing(c) {
    const k = this.mapCfg.clearings;
    const openR = c.radius + k.treeClearance;
    const dirtR = c.radius * k.dirtFraction;
    const reach = openR + k.edgeNoise + k.edgeSoftness;
    this.forBox(c.x, c.z, c.x, c.z, reach, (idx, x, z) => {
      const d = Math.hypot(x - c.x, z - c.z) + this.edgeWobble(x, z, k.edgeNoiseScale, k.edgeNoise);
      const open = 1 - smoothstep(openR - k.edgeSoftness, openR, d);
      const dirt = 1 - smoothstep(dirtR - k.edgeSoftness, dirtR + k.edgeSoftness, d);
      if (open > this.open[idx]) this.open[idx] = open;
      if (dirt > this.dirt[idx]) this.dirt[idx] = dirt;
    });
  }

  // p: config.map.paths, or the road's own widths.
  rasterPath(points, p) {
    const half = p.width / 2;
    const openHalf = half + p.clearance;
    const reach = openHalf + p.edgeNoise + p.edgeSoftness;
    for (let s = 0; s < points.length - 1; s++) {
      const a = points[s];
      const b = points[s + 1];
      this.forBox(a.x, a.z, b.x, b.z, reach, (idx, x, z) => {
        const d = pointSegmentDistance(x, z, a.x, a.z, b.x, b.z) + this.edgeWobble(x, z, p.edgeNoiseScale, p.edgeNoise);
        const open = 1 - smoothstep(openHalf - p.edgeSoftness, openHalf, d);
        const dirt = 1 - smoothstep(half - p.edgeSoftness, half + p.edgeSoftness, d);
        if (open > this.open[idx]) this.open[idx] = open;
        if (dirt > this.dirt[idx]) this.dirt[idx] = dirt;
      });
    }
  }

  // Bilinear lookup in a mask grid.
  sampleMask(grid, x, z) {
    const fx = (x - this.geo.xMin) / this.maskCell;
    const fz = (z - this.geo.zMin) / this.maskCell;
    const i = Math.max(0, Math.min(this.maskNx - 2, Math.floor(fx)));
    const j = Math.max(0, Math.min(this.maskNz - 2, Math.floor(fz)));
    const tx = Math.max(0, Math.min(1, fx - i));
    const tz = Math.max(0, Math.min(1, fz - j));
    const n = this.maskNx;
    const a = grid[j * n + i];
    const b = grid[j * n + i + 1];
    const c = grid[(j + 1) * n + i];
    const d = grid[(j + 1) * n + i + 1];
    return (a + (b - a) * tx) * (1 - tz) + (c + (d - c) * tx) * tz;
  }

  // 1 on pathways and in clearings (no trees, no undergrowth), 0 in the forest.
  openAt(x, z) {
    return this.sampleMask(this.open, x, z);
  }

  // 1 on bare dirt, 0 on forest floor.
  dirtAt(x, z) {
    return this.sampleMask(this.dirt, x, z);
  }

  // How much undergrowth is underfoot: 0 on open ground, 1 in the forest.
  undergrowthAt(x, z) {
    return 1 - this.openAt(x, z);
  }

  // The dirt and open masks as byte pairs (0-255: dirt, open), row by row
  // from the north-west corner, for the ground shader.
  maskBytes() {
    const bytes = new Uint8Array(this.dirt.length * 2);
    for (let i = 0; i < this.dirt.length; i++) {
      bytes[i * 2] = Math.round(this.dirt[i] * 255);
      bytes[i * 2 + 1] = Math.round(this.open[i] * 255);
    }
    return bytes;
  }

  // ---- heights -------------------------------------------------------------

  buildHeights() {
    const g = this.geo;
    const t = this.cfg;
    this.heightCell = t.heightCell;
    this.nx = Math.round((g.xMax - g.xMin) / t.heightCell) + 1;
    this.nz = Math.round((g.zMax - g.zMin) / t.heightCell) + 1;
    this.octaveSeeds = t.octaves.map((_, i) => noiseSeed(this.seed, `height${i}`));
    this.fixedOctaveSeeds = t.octaves.map((_, i) => noiseSeed(this.fixedSeed, `height${i}`));
    // Each clearing is levelled toward the height at its centre.
    this.levels = this.map.clearings.map((c) => this.rawHeight(c.x, c.z, 1));
    this.heights = new Float32Array(this.nx * this.nz);
    this.minHeight = Infinity;
    this.maxHeight = -Infinity;
    for (let j = 0; j < this.nz; j++) {
      const z = g.zMin + j * t.heightCell;
      for (let i = 0; i < this.nx; i++) {
        const x = g.xMin + i * t.heightCell;
        const h = this.heightFormula(x, z);
        this.heights[j * this.nx + i] = h;
        if (h < this.minHeight) this.minHeight = h;
        if (h > this.maxHeight) this.maxHeight = h;
      }
    }
  }

  // Rolling noise; layers marked smoothOnPaths fade out on open ground.
  rawHeight(x, z, open) {
    const octaves = this.cfg.octaves;
    let h = 0;
    for (let i = 0; i < octaves.length; i++) {
      const o = octaves[i];
      const scale = o.smoothOnPaths ? 1 - open : 1;
      if (scale > 0) h += o.amplitude * scale * blendedNoise(this.geo, z, x / o.wavelength, z / o.wavelength, this.octaveSeeds[i], this.fixedOctaveSeeds[i]);
    }
    return h;
  }

  heightFormula(x, z) {
    const t = this.cfg;
    const blend = t.clearingFlattenBlend;
    let h = this.rawHeight(x, z, this.openAt(x, z));
    const clearings = this.map.clearings;
    for (let i = 0; i < clearings.length; i++) {
      const c = clearings[i];
      const reach = c.radius + blend;
      const dx = x - c.x;
      const dz = z - c.z;
      if (dx > reach || dx < -reach || dz > reach || dz < -reach) continue;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d > reach) continue;
      const w = (1 - smoothstep(c.radius, reach, d)) * t.clearingFlatten;
      h += (this.levels[i] - h) * w;
    }
    // Behind the cliff face the ground climbs to the plateau on top.
    const behind = cliffZ(this.geo, x) - z;
    if (behind > 0) h += cliffHeight(this.geo, x) * smoothstep(0, this.geo.cliff.rampWidth, behind);
    return h;
  }

  // Height at grid point (i, j), clamped to the grid.
  gridHeight(i, j) {
    i = Math.max(0, Math.min(this.nx - 1, i));
    j = Math.max(0, Math.min(this.nz - 1, j));
    return this.heights[j * this.nx + i];
  }

  // Ground height at (x, z). Each grid square is two triangles split along
  // the (i+1, j)-(i, j+1) diagonal, matching the ground mesh.
  heightAt(x, z) {
    const fx = (x - this.geo.xMin) / this.heightCell;
    const fz = (z - this.geo.zMin) / this.heightCell;
    const i = Math.max(0, Math.min(this.nx - 2, Math.floor(fx)));
    const j = Math.max(0, Math.min(this.nz - 2, Math.floor(fz)));
    const tx = Math.max(0, Math.min(1, fx - i));
    const tz = Math.max(0, Math.min(1, fz - j));
    const n = this.nx;
    const a = this.heights[j * n + i];
    const b = this.heights[j * n + i + 1];
    const c = this.heights[(j + 1) * n + i];
    if (tx + tz <= 1) return a + (b - a) * tx + (c - a) * tz;
    const d = this.heights[(j + 1) * n + i + 1];
    return d + (c - d) * (1 - tx) + (b - d) * (1 - tz);
  }

  // Distance along a ray (origin + t * dir, dir a unit vector) to the
  // ground, or maxDistance if it doesn't reach it. Marches in `step`s,
  // then narrows the crossing down by bisection.
  rayDistance(origin, dir, maxDistance, step) {
    let prevT = 0;
    if (origin.y - this.heightAt(origin.x, origin.z) <= 0) return 0;
    if (dir.y >= 0 && origin.y > this.maxHeight) return maxDistance;
    for (let t = step; ; t += step) {
      const tt = Math.min(t, maxDistance);
      if (origin.y + dir.y * tt - this.heightAt(origin.x + dir.x * tt, origin.z + dir.z * tt) <= 0) {
        let lo = prevT;
        let hi = tt;
        for (let k = 0; k < 8; k++) {
          const mid = (lo + hi) / 2;
          if (origin.y + dir.y * mid - this.heightAt(origin.x + dir.x * mid, origin.z + dir.z * mid) <= 0) hi = mid;
          else lo = mid;
        }
        return hi;
      }
      prevT = tt;
      if (tt >= maxDistance) return maxDistance;
    }
  }

  // ---- bounds --------------------------------------------------------------

  // z of the cliff face at x.
  cliffZ(x) {
    return cliffZ(this.geo, x);
  }

  // True where the land comes wholly from the cluster's fixed seed (north
  // of the cordon), so seeded placement there should use a fixed seed too.
  isFixed(z) {
    return fixedWeight(this.geo, z) >= 1;
  }

  // Keep a position inside the walkable area. Mutates and returns pos.
  clamp(pos) {
    return clampToWalkable(this.geo, pos);
  }

  // Forest density 0..1 at a point (thicker and thinner patches), from
  // smooth noise with features `scale` metres across. Precomputed on the
  // height grid the first time it's asked for, then interpolated.
  densityAt(x, z, scale) {
    if (this.densityScale !== scale) this.buildDensity(scale);
    const fx = (x - this.geo.xMin) / this.heightCell;
    const fz = (z - this.geo.zMin) / this.heightCell;
    const i = Math.max(0, Math.min(this.nx - 2, Math.floor(fx)));
    const j = Math.max(0, Math.min(this.nz - 2, Math.floor(fz)));
    const tx = Math.max(0, Math.min(1, fx - i));
    const tz = Math.max(0, Math.min(1, fz - j));
    const g = this.density;
    const n = this.nx;
    const a = g[j * n + i];
    const b = g[j * n + i + 1];
    const c = g[(j + 1) * n + i];
    const d = g[(j + 1) * n + i + 1];
    return (a + (b - a) * tx) * (1 - tz) + (c + (d - c) * tx) * tz;
  }

  buildDensity(scale) {
    const seed = noiseSeed(this.seed, 'density');
    const fixed = noiseSeed(this.fixedSeed, 'density');
    this.densityScale = scale;
    this.density = new Float32Array(this.nx * this.nz);
    for (let j = 0; j < this.nz; j++) {
      const z = this.geo.zMin + j * this.heightCell;
      for (let i = 0; i < this.nx; i++) {
        this.density[j * this.nx + i] = (blendedNoise(this.geo, z, (this.geo.xMin + i * this.heightCell) / scale, z / scale, seed, fixed) + 1) / 2;
      }
    }
  }
}
