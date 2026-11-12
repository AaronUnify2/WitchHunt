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
import { cuttingFrame, liftAt } from './railCutting.js';
import { hollerFrame, liftAt as hollerLift, offFloor, gullyKeep, toModel as hollerToModel } from './hollerGround.js';

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
    // Session 21: the 1903 railway first (its bed is only partly open: saplings
    // and brush have come back onto it), so a pathway crossing it is open over it.
    this.rail = this.map.railway ? railLookup(this.map.railway, this.geo) : null;
    if (this.rail) this.rasterRailway();
    for (const p of this.map.paths) {
      // Session 21: a faint trail (the stairs'): narrow, half grown over.
      if (p.faint) {
        const f = this.mapCfg.faintTrail;
        this.rasterPath(p.points, { ...this.mapCfg.paths, width: f.width, clearance: f.clearance, edgeNoise: f.edgeNoise, openScale: f.open, dirtScale: f.dirt });
      } else this.rasterPath(p.points, this.mapCfg.paths);
    }
    // The road (M9.1): asphalt with gravel shoulders (dirt), trees kept back.
    if (this.map.road) {
      const r = this.mapCfg.road;
      const p = this.mapCfg.paths;
      this.rasterPath(this.map.road.points, { ...p, width: r.width + r.shoulder * 2, clearance: r.clearance, edgeNoise: p.edgeNoise * 0.5 });
      // Session 21: the road north, the same, and the ground kept open at its end (the tunnel, the barrier, the spur of rock, the brush).
      if (this.map.road.north) this.rasterPath(this.map.road.north.points, { ...p, width: r.width + r.shoulder * 2, clearance: r.clearance, edgeNoise: p.edgeNoise * 0.5 });
      for (const o of this.map.roadNorth?.open ?? []) this.rasterOpen(o.x, o.z, o.r);
    }
    // The cordon (M9.1): a bare track along the fence, trees cleared each side.
    if (this.map.cluster && this.mapCfg.cordon) {
      const k = this.mapCfg.cordon;
      const z = this.map.cluster.cordonZ;
      const line = [{ x: this.geo.xMin, z }, { x: this.geo.xMax, z }];
      this.rasterPath(line, { ...this.mapCfg.paths, width: k.track, clearance: k.cleared - k.track / 2, edgeNoise: 0.6 });
    }
    // Session 29: the moonshiners' holler: its ridges are forest again (trees and laurel on both
    // faces and over the head), only the floor and the other pathways' gullies left open.
    this.holler = this.mapCfg.holler ? hollerFrame(this.map) : null;
    if (this.holler) this.closeHoller();
  }

  // The holler's ridges back to forest: past `wooded` metres off the floor, clear of the gullies,
  // inside the clearing (the forest outside it is forest already).
  closeHoller() {
    const f = this.holler;
    const hc = this.mapCfg.holler;
    const k = this.mapCfg.clearings;
    const reach = f.radius + k.treeClearance + k.edgeNoise + 4;
    this.forBox(f.x, f.z, f.x, f.z, reach, (idx, x, z) => {
      if (this.open[idx] <= 0) return;
      const m = hollerToModel(f, x, z);
      if (m.z < hc.mouth) return;
      const off = offFloor(hc, m.x, m.z);
      const wood = smoothstep(hc.wooded, hc.wooded + 2, off) * gullyKeep(f, hc, x, z);
      if (wood <= 0) return;
      this.open[idx] *= 1 - wood;
      this.dirt[idx] *= 1 - wood;
    });
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

  // Session 21: open ground (no trees or undergrowth; no dirt) in a circle, feathered over 2 m.
  rasterOpen(cx, cz, r) {
    this.forBox(cx, cz, cx, cz, r + 2, (idx, x, z) => {
      const open = 1 - smoothstep(r, r + 2, Math.hypot(x - cx, z - cz));
      if (open > this.open[idx]) this.open[idx] = open;
    });
  }

  // Session 21: the railway's bed (ballast: worn dirt, partly open) and the
  // thin strip either side (the old cleared ground, grown back). Its own
  // open values replace the forest's there (max with what's already set).
  rasterRailway() {
    const r = this.mapCfg.railway;
    const pts = this.map.railway.points;
    this.rasterPath(pts, { ...this.mapCfg.paths, width: r.bed, clearance: r.shoulder, edgeNoise: 0.5, openScale: r.bedOpen, dirtScale: 0.85, shoulderOpen: r.shoulderOpen });
  }

  // How much the forest has grown back over the railway here: 1 on its bed,
  // fading over its shoulders, 0 elsewhere (saplings and brush on it; Forest).
  regrowthAt(x, z) {
    if (!this.rail) return 0;
    const r = this.mapCfg.railway;
    const d = Math.abs(z - this.rail.zAt(x));
    const half = r.bed / 2;
    if (d >= half + r.shoulder) return 0;
    return d <= half ? 1 : 1 - (d - half) / r.shoulder;
  }

  // p: config.map.paths, or the road's own widths. openScale / dirtScale
  // (Session 21): cap how open and how bare the line gets (a faint trail,
  // the railway's bed); shoulderOpen: the open value its clearance strip
  // reaches (else the same as the middle).
  rasterPath(points, p) {
    const oScale = p.openScale ?? 1;
    const dScale = p.dirtScale ?? 1;
    const shoulder = p.shoulderOpen ?? oScale;
    const half = p.width / 2;
    const openHalf = half + p.clearance;
    const reach = openHalf + p.edgeNoise + p.edgeSoftness;
    for (let s = 0; s < points.length - 1; s++) {
      const a = points[s];
      const b = points[s + 1];
      this.forBox(a.x, a.z, b.x, b.z, reach, (idx, x, z) => {
        const d = pointSegmentDistance(x, z, a.x, a.z, b.x, b.z) + this.edgeWobble(x, z, p.edgeNoiseScale, p.edgeNoise);
        let open = 1 - smoothstep(openHalf - p.edgeSoftness, openHalf, d);
        if (oScale !== 1 || shoulder !== oScale) open *= d <= half ? oScale : shoulder + (oScale - shoulder) * (1 - smoothstep(half, half + p.edgeSoftness, d));
        const dirt = (1 - smoothstep(half - p.edgeSoftness, half + p.edgeSoftness, d)) * dScale;
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

  // The experimental dozer (world/LandClearing.js): open ground (and dirt,
  // up to `dirt`) cut into the masks within r of (x, z), feathered over
  // `soft` metres. Returns the mask cells' box it touched [i0, j0, i1, j1]
  // or null if nothing changed.
  carve(x, z, r, dirt = 1, soft = 1, open = 1) {
    let box = null;
    this.forBox(x, z, x, z, r + soft, (idx, px, pz) => {
      const d = Math.hypot(px - x, pz - z);
      const k = d <= r ? 1 : Math.max(0, 1 - (d - r) / soft);
      if (k <= 0) return;
      const o = Math.max(this.open[idx], open * k);
      const t = Math.max(this.dirt[idx], dirt * k);
      if (o === this.open[idx] && t === this.dirt[idx]) return;
      this.open[idx] = o;
      this.dirt[idx] = t;
      const i = idx % this.maskNx;
      const j = (idx - i) / this.maskNx;
      if (!box) box = [i, j, i, j];
      else {
        box[0] = Math.min(box[0], i);
        box[1] = Math.min(box[1], j);
        box[2] = Math.max(box[2], i);
        box[3] = Math.max(box[3], j);
      }
    });
    return box;
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
    // Session 21: the railway's grade: the ground along its line, smoothed
    // over a long window (a surveyed grade: cuttings through the rises,
    // low banks over the dips).
    // Session 27: the railway cutting's banks (world/railCutting.js).
    const cut = this.mapCfg.railway?.cutting;
    this.cutting = this.map.railway && cut ? cuttingFrame(this.map, cut) : null;
    // Session 29: the moonshiners' holler's ridges and headwall (world/hollerGround.js; its frame is buildMasks').
    if (this.rail) this.rail.grade = railGrade(this.rail, this.geo, this.mapCfg.railway.grade, (x, z) => this.rawHeight(x, z, 1));
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
    // Session 21: eased toward the railway's grade along its line, and the
    // hills its two collapsed tunnels are bored into at the map's edges.
    if (this.rail) h = this.railHeight(x, z, h);
    if (this.cutting) h += liftAt(this.cutting, this.mapCfg.railway.cutting, x, z);
    if (this.holler) h += hollerLift(this.holler, this.mapCfg.holler, x, z);
    // Behind the cliff face the ground climbs to the plateau on top.
    const behind = cliffZ(this.geo, x) - z;
    if (behind > 0) h += cliffHeight(this.geo, x) * smoothstep(0, this.geo.cliff.rampWidth, behind);
    return h;
  }

  railHeight(x, z, h) {
    const rc = this.mapCfg.railway;
    const g = rc.grade;
    const zr = this.rail.zAt(x);
    const d = Math.abs(z - zr);
    if (d < g.reach) {
      const w = g.blend * (1 - smoothstep(rc.bed / 2, g.reach, d));
      h += (this.rail.gradeAt(x) - h) * w;
    }
    // The tunnel hills: each portal is set in the face of a hill outside the
    // walkable area, the line running up to it in a cutting (its sides
    // rising either side of the bed, the bed itself at the grade).
    const t = rc.tunnel;
    for (const tn of this.map.railway.tunnels) {
      const ahead = (x - tn.x) * tn.facing; // metres in front of the portal (toward the map)
      if (ahead > t.hillFront) continue;
      const across = Math.abs(z - tn.z);
      if (across > t.hillWidth) continue;
      const rise = smoothstep(t.hillFront, t.hillFront - t.hillRise, ahead);
      const side = 1 - smoothstep(t.hillWidth * 0.55, t.hillWidth, across);
      let hill = t.hillHeight * rise * side;
      if (ahead > -0.5) hill *= smoothstep(t.cutHalf, t.cutHalf + t.cutSlope, across);
      h += hill;
    }
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

// Session 21: a quick lookup of the railway's z at any x (it runs west to
// east without doubling back), on a 1 m grid.
function railLookup(railway, geo) {
  const x0 = geo.xMin - 2;
  const n = Math.ceil(geo.xMax - geo.xMin) + 5;
  const zs = new Float32Array(n);
  const pts = railway.points;
  let i = 1;
  for (let k = 0; k < n; k++) {
    const x = x0 + k;
    while (i < pts.length - 1 && pts[i].x < x) i++;
    const a = pts[i - 1];
    const b = pts[i];
    const t = Math.max(0, Math.min(1, (x - a.x) / (b.x - a.x || 1)));
    zs[k] = a.z + (b.z - a.z) * t;
  }
  const at = (arr, x) => {
    const f = Math.max(0, Math.min(n - 1.001, x - x0));
    const k = Math.floor(f);
    return arr[k] + (arr[k + 1] - arr[k]) * (f - k);
  };
  const out = { x0, n, zs, zAt: (x) => at(zs, x), grade: null, gradeAt: (x) => (out.grade ? at(out.grade, x) : 0) };
  return out;
}

// The grade along the line: the raw ground at the line, a moving average
// over `window` metres (the same 1 m grid as railLookup).
function railGrade(rail, geo, cfg, rawAt) {
  const raw = new Float32Array(rail.n);
  for (let k = 0; k < rail.n; k++) raw[k] = rawAt(rail.x0 + k, rail.zs[k]);
  const half = Math.round(cfg.window / 2);
  const out = new Float32Array(rail.n);
  let sum = 0;
  let count = 0;
  for (let k = -half; k < rail.n; k++) {
    const add = k + half;
    if (add < rail.n) {
      sum += raw[add];
      count++;
    }
    const drop = k - half - 1;
    if (drop >= 0) {
      sum -= raw[drop];
      count--;
    }
    if (k >= 0) out[k] = sum / count + cfg.lift;
  }
  return out;
}
