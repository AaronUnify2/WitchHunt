// Where the cluster's gates stand, and what stops Tom at each (pure; M9.1,
// DESIGN.md "Fixed opening cluster": the soft-gated path order). Each gate
// sits across one of the cluster's pathways (or the road), square to it,
// and opens on a story progress flag. Shut, its collider stops the player
// only: the dead and the witch clamber over (they walk the pathways).
// The checkpoint's gate is the cordon's own (world/cordon.js).

import { roadFrame } from './road.js';
import { segmentCollider } from './collision.js';

// The point `d` metres along a polyline, and its unit direction there.
function along(points, d) {
  let walked = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const seg = Math.hypot(b.x - a.x, b.z - a.z);
    if (seg > 0 && walked + seg >= d) {
      const t = (d - walked) / seg;
      return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, tx: (b.x - a.x) / seg, tz: (b.z - a.z) / seg };
    }
    walked += seg;
  }
  const a = points[points.length - 2];
  const b = points[points.length - 1];
  const seg = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  return { x: b.x, z: b.z, tx: (b.x - a.x) / seg, tz: (b.z - a.z) / seg };
}

function lengthOf(points) {
  let n = 0;
  for (let i = 1; i < points.length; i++) n += Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z);
  return n;
}

// The cluster pathway between two clearings (by key), its points running from a to b.
export function clusterPath(map, a, b) {
  for (const p of map.paths) {
    if (!p.cluster) continue;
    const ka = map.clearings[p.a].key;
    const kb = map.clearings[p.b].key;
    if (ka === a && kb === b) return p.points;
    if (ka === b && kb === a) return [...p.points].reverse();
  }
  throw new Error(`No cluster pathway between ${a} and ${b}`);
}

// How far either side of the path a gate's block reaches (metres).
export function gateHalfSpan(kind, cfg) {
  const k = cfg[kind];
  if (kind === 'fallenTree') return k.length / 2;
  return k.width / 2 + k.wing;
}

// data: openingCluster.json's "gates". cfg: config.map.gates.
// Returns [{ id, kind, opensOn, locked, x, z, tx, tz, half }]: the gate's
// centre, the path's direction through it, and its half span across.
export function gateLayout(map, data, cfg) {
  return data.map((g) => {
    let at;
    if (g.kind === 'checkpoint') {
      at = { x: map.cluster.checkpoint.x, z: map.cluster.checkpoint.z, tx: 0, tz: 1 };
    } else if (g.road !== undefined) {
      const f = roadFrame(map.road, g.road);
      at = { x: f.x, z: f.z, tx: f.tx, tz: f.tz };
    } else {
      const pts = clusterPath(map, g.path[0], g.path[1]);
      at = along(pts, g.at ?? lengthOf(pts) * g.t);
    }
    const half = g.kind === 'checkpoint' ? 0 : gateHalfSpan(g.kind, cfg);
    return { id: g.id, kind: g.kind, opensOn: g.opensOn, locked: g.locked, ...at, half };
  });
}

// The block across the path while it's shut: one segment, square to the
// path through the gate's centre (a fallen tree lies a little askew).
// Stops the player only; never stops shots. heightAt(x, z): the ground.
export function gateCollider(gate, cfg, heightAt) {
  const skew = gate.kind === 'fallenTree' ? 0.25 : 0;
  const c = Math.cos(skew);
  const s = Math.sin(skew);
  // Across the path: its right-hand side (tz, -tx), turned by the skew.
  const rx = gate.tz * c - -gate.tx * s;
  const rz = gate.tz * s + -gate.tx * c;
  const ax = gate.x - rx * gate.half;
  const az = gate.z - rz * gate.half;
  const bx = gate.x + rx * gate.half;
  const bz = gate.z + rz * gate.half;
  const base = heightAt(gate.x, gate.z);
  const col = segmentCollider(ax, az, bx, bz, 0.3, base - 2, base + 4, false);
  col.playerOnly = true;
  col.gate = gate.id;
  return col;
}

// Distance from (x, z) to a segment collider's line.
export function distanceToSegment(c, x, z) {
  const ex = c.bx - c.ax;
  const ez = c.bz - c.az;
  const len2 = ex * ex + ez * ez;
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((x - c.ax) * ex + (z - c.az) * ez) / len2)) : 0;
  return Math.hypot(x - (c.ax + ex * t), z - (c.az + ez * t));
}
