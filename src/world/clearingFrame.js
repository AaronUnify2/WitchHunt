// A cluster clearing's own frame (pure; M9.2): authored encounter layouts
// (data/campsite.json) are written from where the path from another place
// (home, for the campsite) walks into the clearing: x metres to your right
// as you walk in, z metres ahead, the clearing's centre at z 0 and the
// entrance at z = -radius. So a layout reads the way a player meets it,
// whatever way the path happens to come in.
//
// Yaw is like the zombies' and three.js's rotation.y: forward is
// (sin yaw, cos yaw). "Right" is your right hand as you walk in, seen from
// above (x east, z south): (-fz, fx). A cutscene anchor matching the frame
// (story/cutsceneTimeline.js: ahead is (-sin yaw, -cos yaw)) has
// yaw atan2(-fx, -fz): frameAnchor().

// key: the clearing's cluster key. fromKey: the place the path comes from.
// Returns { x, z, radius, yaw, fx, fz, rx, rz, entrance: { x, z } } or null.
export function clearingFrame(map, key, fromKey) {
  const ci = map.clearings.findIndex((c) => c.cluster && c.key === key);
  const fi = map.clearings.findIndex((c) => c.cluster && c.key === fromKey);
  if (ci < 0) return null;
  const c = map.clearings[ci];
  const path = fi < 0 ? null : map.paths.find((p) => (p.a === ci && p.b === fi) || (p.a === fi && p.b === ci));
  let entrance = null;
  if (path?.points?.length) {
    // Walking the path from the far end, the first point inside the clearing.
    const pts = path.a === ci ? [...path.points].reverse() : path.points;
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i];
      if (Math.hypot(p.x - c.x, p.z - c.z) <= c.radius) {
        const q = pts[i - 1];
        entrance = edgeCrossing(q, p, c);
        break;
      }
    }
  }
  if (!entrance) {
    const from = fi < 0 ? { x: c.x, z: c.z - 1 } : map.clearings[fi];
    const d = Math.hypot(from.x - c.x, from.z - c.z) || 1;
    entrance = { x: c.x + ((from.x - c.x) / d) * c.radius, z: c.z + ((from.z - c.z) / d) * c.radius };
  }
  const dx = c.x - entrance.x;
  const dz = c.z - entrance.z;
  const len = Math.hypot(dx, dz) || 1;
  const fx = dx / len;
  const fz = dz / len;
  return { x: c.x, z: c.z, radius: c.radius, yaw: Math.atan2(fx, fz), fx, fz, rx: -fz, rz: fx, entrance };
}

// Where the segment from q (outside) to p (inside) crosses the clearing's edge.
function edgeCrossing(q, p, c) {
  let lo = 0;
  let hi = 1;
  for (let k = 0; k < 20; k++) {
    const t = (lo + hi) / 2;
    const x = q.x + (p.x - q.x) * t;
    const z = q.z + (p.z - q.z) * t;
    if (Math.hypot(x - c.x, z - c.z) <= c.radius) hi = t;
    else lo = t;
  }
  return { x: q.x + (p.x - q.x) * hi, z: q.z + (p.z - q.z) * hi };
}

// A point in the frame (x right, z ahead), in the world.
export function frameToWorld(f, x, z) {
  return { x: f.x + f.rx * x + f.fx * z, z: f.z + f.rz * x + f.fz * z };
}

// A yaw in the frame (degrees, from ahead toward the right), in the world
// (radians, the zombies' and rotation.y's convention: turning right lowers it).
export function frameYaw(f, degrees) {
  return f.yaw - (degrees * Math.PI) / 180;
}

// The frame as a cutscene anchor: { x, z, yaw } with x right and z ahead.
export function frameAnchor(f) {
  return { x: f.x, z: f.z, yaw: Math.atan2(-f.fx, -f.fz) };
}

// A point on (or past) the clearing's edge: angle in degrees (0 ahead, 90
// right), `out` metres past the edge.
export function frameEdge(f, degrees, out = 0) {
  const a = (degrees * Math.PI) / 180;
  const r = f.radius + out;
  return frameToWorld(f, Math.sin(a) * r, Math.cos(a) * r);
}
