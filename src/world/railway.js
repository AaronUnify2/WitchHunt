// The 1903 railway line (pure; Session 21, M10.2; DESIGN.md "Map: Structure",
// "the 1903 railway line"). Part of the map on every run, like the road and
// the cordon: the line the town cut through the forest in 1903, abandoned
// for a century. It runs the full width of the map east to west along the
// soft border between the middle and the south band (config.map.railway
// .southness), in long straights joined by gentle curves, and is lost at
// each edge in a collapsed tunnel. No fence and no lock: a landmark.
//
// The line is the same on every seed (it comes from config alone). The
// generator keeps clearings off it, except the railway cutting (an
// optional encounter), which sits on it wherever the seed puts it.

import { smoothLine, lineFrom, roadDistance, roadFrame } from './road.js';
import { zAtSouthness } from './mapGeometry.js';
import { segmentsCross } from './mapGraph.js';

// geo: makeGeometry(config.map). cfg: config.map.railway. Returns a line
// ({ points, along, length }) west to east, plus `z0` (the border's z) and
// the two tunnel mouths ({ x, z, facing: +1 east / -1 west }).
export function buildRailway(geo, cfg) {
  const z0 = zAtSouthness(geo, cfg.southness);
  const control = cfg.points.map(([x, dz]) => ({ x, z: z0 + dz }));
  const line = lineFrom(smoothLine(control, cfg.sample), { z0, width: cfg.bed });
  // The tunnels: where the line meets the walkable area's east and west edges, a
  // little beyond them (the hill each is bored into rises behind).
  const west = geo.walk.xMin - cfg.tunnel.beyondEdge;
  const east = geo.walk.xMax + cfg.tunnel.beyondEdge;
  line.tunnels = [
    { x: west, z: railZAt(line, west), facing: 1 },
    { x: east, z: railZAt(line, east), facing: -1 },
  ];
  return line;
}

// The line's z at x (it runs west to east, never doubling back).
export function railZAt(line, x) {
  const pts = line.points;
  if (x <= pts[0].x) return pts[0].z;
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].x >= x) {
      const a = pts[i - 1];
      const b = pts[i];
      const t = (x - a.x) / (b.x - a.x || 1);
      return a.z + (b.z - a.z) * t;
    }
  }
  return pts[pts.length - 1].z;
}

// Distance from (x, z) to the line's centre, and how far along it the
// nearest point is ({ distance, along }).
export function railDistance(line, x, z) {
  return roadDistance(line, x, z);
}

// The point `d` metres along the line, its direction and its right-hand side.
export function railFrame(line, d) {
  return roadFrame(line, d);
}

// Where pathways cross the line: [{ x, z, along, path, tx, tz }] (tx, tz:
// the pathway's direction at the crossing). paths: the map's pathways.
export function railCrossings(line, paths) {
  const out = [];
  const pts = line.points;
  for (let pi = 0; pi < paths.length; pi++) {
    const p = paths[pi].points;
    for (let i = 1; i < p.length; i++) {
      const a = p[i - 1];
      const b = p[i];
      // Only the stretch of line near this segment.
      const lo = Math.min(a.x, b.x) - 8;
      const hi = Math.max(a.x, b.x) + 8;
      for (let j = 1; j < pts.length; j++) {
        const c = pts[j - 1];
        const d = pts[j];
        if (d.x < lo || c.x > hi) continue;
        if (!segmentsCross(a, b, c, d)) continue;
        const hit = intersect(a, b, c, d);
        const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
        out.push({ x: hit.x, z: hit.z, along: line.along[j - 1] + Math.hypot(hit.x - c.x, hit.z - c.z), path: pi, tx: (b.x - a.x) / len, tz: (b.z - a.z) / len });
      }
    }
  }
  return out.sort((p, q) => p.along - q.along);
}

function intersect(a, b, c, d) {
  const rx = b.x - a.x;
  const rz = b.z - a.z;
  const sx = d.x - c.x;
  const sz = d.z - c.z;
  const den = rx * sz - rz * sx;
  if (Math.abs(den) < 1e-9) return { x: a.x, z: a.z };
  const t = ((c.x - a.x) * sz - (c.z - a.z) * sx) / den;
  return { x: a.x + rx * t, z: a.z + rz * t };
}
