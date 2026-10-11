// Pure 2D collision helpers on the ground plane (x, z).

// Push a circle at `pos` with `radius` out of every overlapping static
// circle. Mutates and returns `pos`.
export function resolveCircles(pos, radius, circles) {
  for (const c of circles) {
    const dx = pos.x - c.x;
    const dz = pos.z - c.z;
    const minDist = radius + c.r;
    const distSq = dx * dx + dz * dz;
    if (distSq >= minDist * minDist) continue;
    const dist = Math.sqrt(distSq);
    if (dist === 0) {
      pos.x += minDist; // dead centre: push out along +x
      continue;
    }
    const push = (minDist - dist) / dist;
    pos.x += dx * push;
    pos.z += dz * push;
  }
  return pos;
}

// Keep `pos` within `maxRadius` of the origin. Mutates and returns `pos`.
export function clampToRadius(pos, maxRadius) {
  const dist = Math.hypot(pos.x, pos.z);
  if (dist > maxRadius) {
    pos.x *= maxRadius / dist;
    pos.z *= maxRadius / dist;
  }
  return pos;
}

// The nearest surface along a ray (origin + t * dir, dir a unit 3D
// vector): the ground (y = 0) or a circle treated as an upright cylinder
// of radius `c.vr ?? c.r` (from the ground up to `c.top`, with a flat lid
// there, or unbounded if there's no top). Fills `out` with { distance, facing }, where facing is
// the cosine between the ray and the surface (1 = head-on, near 0 =
// glancing). If nothing is closer than maxDistance, distance is
// maxDistance and facing is 0. Returns `out`.
export function nearestHit(origin, dir, circles, maxDistance, out = { distance: 0, facing: 0 }) {
  out.distance = maxDistance;
  out.facing = 0;
  if (dir.y < 0) {
    const t = origin.y / -dir.y;
    if (t < out.distance) {
      out.distance = t;
      out.facing = -dir.y;
    }
  }

  const flat = dir.x * dir.x + dir.z * dir.z;
  for (const c of circles) {
    const radius = c.vr ?? c.r;
    const ox = origin.x - c.x;
    const oz = origin.z - c.z;
    const inside = ox * ox + oz * oz - radius * radius;
    let t;
    let facing;
    if (inside <= 0) {
      t = 0; // already within its radius
      facing = 1;
    } else {
      if (flat === 0) continue; // looking straight up or down
      const b = ox * dir.x + oz * dir.z;
      const disc = b * b - flat * inside;
      if (b >= 0 || disc < 0) continue; // facing away, or a miss
      t = (-b - Math.sqrt(disc)) / flat;
      // Outward normal at the hit point, on the ground plane.
      const nx = (ox + t * dir.x) / radius;
      const nz = (oz + t * dir.z) / radius;
      facing = -(nx * dir.x + nz * dir.z);
    }
    let y = origin.y + t * dir.y;
    if (c.top !== undefined && y > c.top) {
      // Passes over the side: it may still come down through the lid.
      if (dir.y >= 0) continue;
      const tl = (origin.y - c.top) / -dir.y;
      const lx = ox + tl * dir.x;
      const lz = oz + tl * dir.z;
      if (tl < 0 || lx * lx + lz * lz > radius * radius) continue;
      t = tl;
      y = c.top;
      facing = -dir.y;
    }
    if (y < 0) continue;
    if (t < out.distance) {
      out.distance = t;
      out.facing = facing;
    }
  }
  return out;
}
