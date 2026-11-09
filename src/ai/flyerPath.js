// Session 22 (M10.3 spike): a flying enemy's movement, as pure maths
// (tested). It steers: its velocity turns toward where it wants to go at
// a rate (config steer), so it banks round in curves instead of snapping.
// Where it wants to go comes from its move: circling Tom, a pass over him,
// a dive at his chest, a climb away, leaving.

// Turn velocity v ({ x, y, z }) toward the direction from p to target at
// `speed`, by `steer` per second. Returns the distance to the target.
export function steerTo(p, v, target, speed, steer, dt) {
  const dx = target.x - p.x;
  const dy = target.y - p.y;
  const dz = target.z - p.z;
  const d = Math.hypot(dx, dy, dz);
  if (d > 1e-6) {
    const k = Math.min(1, steer * dt);
    v.x += ((dx / d) * speed - v.x) * k;
    v.y += ((dy / d) * speed - v.y) * k;
    v.z += ((dz / d) * speed - v.z) * k;
  }
  p.x += v.x * dt;
  p.y += v.y * dt;
  p.z += v.z * dt;
  return d;
}

// A point on the circle round (cx, cz) at angle a, `height` above y.
export function circlePoint(cx, cy, cz, radius, height, a) {
  return { x: cx + Math.sin(a) * radius, y: cy + height, z: cz + Math.cos(a) * radius };
}

// Where a pass over Tom (tx, tz) ends: across him from the flyer at p,
// `past` metres beyond him, `height` above his feet ty.
export function passEnd(p, tx, ty, tz, past, height) {
  const dx = tx - p.x;
  const dz = tz - p.z;
  const d = Math.hypot(dx, dz) || 1;
  return { x: tx + (dx / d) * past, y: ty + height, z: tz + (dz / d) * past };
}

// Where a climb after a dive ends: on away from Tom, up to `height`.
export function climbEnd(p, v, ty, distance, height) {
  const f = Math.hypot(v.x, v.z) || 1;
  return { x: p.x + (v.x / f) * distance, y: ty + height, z: p.z + (v.z / f) * distance };
}

// The move after `index` in the script, or 'leave' at its end.
export function nextMove(script, index) {
  return index < script.length ? script[index] : 'leave';
}
