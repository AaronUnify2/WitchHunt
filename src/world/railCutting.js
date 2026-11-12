// The railway cutting's ground (pure; Session 27; DESIGN.md "The railway
// cutting: the 1903 line"). Where the seed puts the railwayCutting clearing
// on the 1903 line, the line runs through a rise the navvies blasted in
// 1902: the ground either side of the bed is lifted into two banks, their
// faces steep (the set dresses them in blasted rock: render/railwayCuttingModel.js),
// their tops running back into the forest, both ends tapering down to the
// line's level (the cutting's mouths). Every pathway that reaches the
// clearing comes down into it through a gully cut in the bank (the old
// wagon roads), so no seed's way in is walled off.
//
// The frame: origin on the line at the clearing, Z along the line (its
// direction there, toward the east), X across it (+X its right-hand side,
// the line's north). toModel / toWorld convert; across() follows the real
// line (it curves a little), so the faces keep their distance from the rails.
//
// GroundField adds liftAt() to its heights (the terrain mesh, feet, trees
// and rocks all follow), so the cutting is in the ground itself.

import { railDistance, railFrame, railZAt } from './railway.js';
import { pointSegmentDistance } from './mapGraph.js';
import { smoothstep } from './noise.js';

// The cutting's frame for this map, or null (no clearing, no railway).
// cfg: config.map.railway.cutting.
export function cuttingFrame(map, cfg) {
  const ci = map.clearings.findIndex((k) => k.key === 'railwayCutting');
  if (ci < 0 || !map.railway) return null;
  const c = map.clearings[ci];
  const line = map.railway;
  const rd = railDistance(line, c.x, c.z);
  const f = railFrame(line, rd.along);
  const frame = { x: f.x, z: f.z, radius: c.radius, tx: f.tx, tz: f.tz, rx: f.rx, rz: f.rz, yaw: Math.atan2(f.tx, f.tz), along: rd.along, line, ci };
  // The pathways that come into the clearing: their points, and which bank they cross (by where they
  // first touch the clearing's edge, walking in).
  frame.paths = [];
  for (const p of map.paths) {
    if (p.a !== ci && p.b !== ci) continue;
    const pts = p.a === ci ? [...p.points].reverse() : p.points;
    let entry = pts[pts.length - 1];
    for (const q of pts) {
      if (Math.hypot(q.x - c.x, q.z - c.z) <= c.radius) {
        entry = q;
        break;
      }
    }
    const m = toModel(frame, entry.x, entry.z);
    frame.paths.push({ points: pts, side: Math.sign(across(frame, entry.x, entry.z)) || 1, entry: m });
  }
  // The powder store's bank: the one fewer pathways come down (the right if it's even), and its
  // end: away from the nearest pathway on that bank.
  if (cfg) {
    const on = (s) => frame.paths.filter((p) => p.side === s);
    frame.storeSide = on(-1).length < on(1).length ? -1 : 1;
    const mine = on(frame.storeSide);
    const near = (z) => Math.min(Infinity, ...mine.map((p) => Math.abs(p.entry.z - z)));
    frame.storeEnd = near(cfg.store.z) >= near(-cfg.store.z) ? 1 : -1;
  }
  return frame;
}

// A world point in the frame ({ x: across, z: along }), straight-frame (not following the curve).
export function toModel(f, x, z) {
  const dx = x - f.x;
  const dz = z - f.z;
  return { x: dx * f.rx + dz * f.rz, z: dx * f.tx + dz * f.tz };
}

// A frame point in the world.
export function toWorld(f, X, Z) {
  return { x: f.x + f.rx * X + f.tx * Z, z: f.z + f.rz * X + f.tz * Z };
}

// Signed metres from the line (its real curve) across to (x, z): + on its right (north).
export function across(f, x, z) {
  return (z - railZAt(f.line, x)) * f.rz;
}

// The line itself in the frame at along Z: { x (its offset across), yaw (its turn from the frame's
// Z, radians, three.js's sense) }: so the train sits on the real rails.
export function lineAt(f, Z) {
  const p = toWorld(f, 0, Z);
  const lz = railZAt(f.line, p.x);
  const m = toModel(f, p.x, lz);
  const p2 = toWorld(f, 0, Z + 1);
  const m2 = toModel(f, p2.x, railZAt(f.line, p2.x));
  return { x: m.x, z: m.z, yaw: Math.atan2(m2.x - m.x, m2.z - m.z) };
}

// The banks' height without the gullies, at frame (X across from the real line, Z along) (pure, metres).
export function bankLift(cfg, side, X, Z) {
  const a = Math.abs(X);
  if (a < cfg.floorHalf) return 0;
  const h = side > 0 ? cfg.height[1] : cfg.height[0];
  const face = smoothstep(cfg.floorHalf, cfg.floorHalf + cfg.faceRun, a);
  const outer = 1 - smoothstep(cfg.topOut, cfg.topOut + cfg.outFade, a);
  const az = Math.abs(Z);
  const nose = 1 - smoothstep(cfg.length, cfg.length + cfg.nose, az);
  // A lumpy top: two slow waves, so the banks aren't ruled lines.
  const lumps = 1 + cfg.lumps * Math.sin(Z * 0.21 + side * 1.7) * Math.sin(a * 0.33 + Z * 0.07);
  return h * face * outer * nose * lumps;
}

// How much a pathway's gully takes out of the bank at (x, z): 0 in it, 1 clear of every one.
export function gullyKeep(f, cfg, x, z) {
  let keep = 1;
  for (const p of f.paths) {
    const pts = p.points;
    let d = Infinity;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      // Only the stretch near the cutting.
      if (Math.min(a.x, b.x) > x + 60 || Math.max(a.x, b.x) < x - 60 || Math.min(a.z, b.z) > z + 60 || Math.max(a.z, b.z) < z - 60) continue;
      d = Math.min(d, pointSegmentDistance(x, z, a.x, a.z, b.x, b.z));
    }
    keep = Math.min(keep, smoothstep(cfg.gully, cfg.gully + cfg.gullyBlend, d));
  }
  return keep;
}

// The lift at world (x, z): the banks, less the gullies (metres; 0 away from the cutting).
export function liftAt(f, cfg, x, z) {
  const m = toModel(f, x, z);
  if (Math.abs(m.z) > cfg.length + cfg.nose || Math.abs(m.x) > cfg.topOut + cfg.outFade + 4) return 0;
  const X = across(f, x, z);
  const h = bankLift(cfg, Math.sign(X) || 1, X, m.z);
  if (h <= 0) return 0;
  return h * gullyKeep(f, cfg, x, z);
}
