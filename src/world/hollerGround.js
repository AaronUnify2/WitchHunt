// The moonshiners' holler's ground (pure; Session 29; DESIGN.md "Moonshiners'
// holler"). Where the seed deals the moonshinersHoller clearing, the ground
// is lifted into a hollow: two wooded ridges either side of a narrow floor
// that winds up from the mouth (where the first pathway walks in) to a
// headwall at the far end, the floor widening near the head into the still's
// yard. The ridges taper away before the mouth, so the pathway walks in
// between their noses. Every other pathway that reaches the clearing comes
// down into it through a gully, so no seed's way in is walled off.
//
// The frame is the clearing's path frame (world/clearingFrame.js pathFrame):
// model z ahead (the mouth at -radius), model x on the walker's LEFT, as in
// world/CrashSite.js toWorld (the set is placed the same way).
//
// GroundField adds liftAt() to its heights, so the terrain mesh, feet, the
// dead, the forest's trees and rocks all follow.

import { pathFrame } from './clearingFrame.js';
import { pointSegmentDistance } from './mapGraph.js';
import { smoothstep } from './noise.js';

// The holler's frame for this map, or null (no holler clearing).
// Returns the path frame plus `paths`: every OTHER pathway into the clearing (their points).
export function hollerFrame(map) {
  const f = pathFrame(map, 'moonshinersHoller');
  if (!f) return null;
  const ci = map.clearings.findIndex((c) => c.key === 'moonshinersHoller');
  const first = map.paths.find((p) => p.a === ci || p.b === ci);
  const paths = map.paths.filter((p) => p !== first && (p.a === ci || p.b === ci)).map((p) => p.points);
  return { ...f, paths };
}

// World to model (x left, z ahead), and back.
export function toModel(f, x, z) {
  const s = Math.sin(f.yaw);
  const c = Math.cos(f.yaw);
  const dx = x - f.x;
  const dz = z - f.z;
  return { x: dx * c - dz * s, z: dx * s + dz * c };
}

export function toWorld(f, x, z) {
  const s = Math.sin(f.yaw);
  const c = Math.cos(f.yaw);
  return { x: f.x + x * c + z * s, z: f.z - x * s + z * c };
}

// The floor's middle (model x) at model z: the hollow winds a little.
export function floorMid(cfg, z) {
  return cfg.wind * Math.sin(z * cfg.windRate + 0.6);
}

// The floor's half width at model z: narrow up the hollow, wide at the yard.
export function floorHalf(cfg, z) {
  return cfg.floorHalf + (cfg.yardHalf - cfg.floorHalf) * smoothstep(cfg.yard[0], cfg.yard[1], z);
}

// Metres from the floor's edge out to (model) (x, z): 0 on the floor.
export function offFloor(cfg, x, z) {
  const side = Math.max(0, Math.abs(x - floorMid(cfg, z)) - floorHalf(cfg, z));
  const head = Math.max(0, z - cfg.head);
  return Math.hypot(side, head);
}

// The ridges' lift without the gullies, at model (x, z) (metres).
export function ridgeLift(cfg, x, z) {
  const d = offFloor(cfg, x, z);
  if (d <= 0) return 0;
  const left = x - floorMid(cfg, z) > 0; // model +x is the walker's left
  const h = left ? cfg.height[0] : cfg.height[1];
  const face = smoothstep(0, cfg.faceRun, d);
  const outer = 1 - smoothstep(cfg.topOut, cfg.topOut + cfg.outFade, d);
  // The noses: the ridges come down to nothing before the mouth.
  const nose = smoothstep(cfg.mouth - cfg.nose, cfg.mouth, z);
  const lumps = 1 + cfg.lumps * Math.sin(z * 0.19 + (left ? 1.3 : 4.1)) * Math.sin(d * 0.29 + z * 0.05);
  return h * face * outer * nose * lumps;
}

// How much the other pathways' gullies leave of the ridge at world (x, z): 0 in one, 1 clear.
export function gullyKeep(f, cfg, x, z) {
  let keep = 1;
  for (const pts of f.paths) {
    let d = Infinity;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      if (Math.min(a.x, b.x) > x + 60 || Math.max(a.x, b.x) < x - 60 || Math.min(a.z, b.z) > z + 60 || Math.max(a.z, b.z) < z - 60) continue;
      d = Math.min(d, pointSegmentDistance(x, z, a.x, a.z, b.x, b.z));
    }
    keep = Math.min(keep, smoothstep(cfg.gully, cfg.gully + cfg.gullyBlend, d));
  }
  return keep;
}

// The lift at world (x, z) (metres; 0 away from the holler).
export function liftAt(f, cfg, x, z) {
  const reach = f.radius + cfg.topOut + cfg.outFade + cfg.yardHalf;
  const dx = x - f.x;
  const dz = z - f.z;
  if (dx > reach || dx < -reach || dz > reach || dz < -reach) return 0;
  const m = toModel(f, x, z);
  if (m.z < cfg.mouth - cfg.nose) return 0;
  const h = ridgeLift(cfg, m.x, m.z);
  if (h <= 0) return 0;
  return h * gullyKeep(f, cfg, x, z);
}
