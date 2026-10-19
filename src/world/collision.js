// Pure 2D collision helpers on the ground plane (x, z), plus ray tests
// against upright cylinders and the ground.

// Flat ground at y = 0: the default wherever a `ground` is optional. The
// real map passes its GroundField, which has the same rayDistance().
export const FLAT_GROUND = {
  rayDistance(origin, dir, maxDistance) {
    return dir.y < 0 ? Math.min(maxDistance, origin.y / -dir.y) : maxDistance;
  },
};

// Push a circle at `pos` with `radius` out of every overlapping static
// collider. Mutates and returns `pos`. Colliders are circles { x, z, r },
// or (M5) wall pieces: segments { seg: true, ax, az, bx, bz, t } with a
// half-thickness t (their x, z, r are a bounding circle for the grid).
// Any collider with `off` set (an open door, a broken fence) is skipped,
// and so is one marked `noBody` (glare-only shapes: the torch sees them,
// bodies walk through). M9.1: one marked `playerOnly` (the cordon's torn
// gaps and closed gates) only stops the player: pass isPlayer = true.
export function resolveCircles(pos, radius, circles, isPlayer = false) {
  for (const c of circles) {
    if (c.off || c.noBody || (c.playerOnly && !isPlayer)) continue;
    if (c.seg) {
      resolveSegment(pos, radius, c);
      continue;
    }
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

// Push a circle out of a thick segment (a wall piece).
export function resolveSegment(pos, radius, c) {
  const ex = c.bx - c.ax;
  const ez = c.bz - c.az;
  const len2 = ex * ex + ez * ez;
  let t = len2 > 0 ? ((pos.x - c.ax) * ex + (pos.z - c.az) * ez) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const px = c.ax + ex * t;
  const pz = c.az + ez * t;
  const dx = pos.x - px;
  const dz = pos.z - pz;
  const minDist = radius + c.t;
  const distSq = dx * dx + dz * dz;
  if (distSq >= minDist * minDist) return pos;
  const dist = Math.sqrt(distSq);
  if (dist < 1e-9) {
    // Dead on the line: push out along its normal.
    const len = Math.sqrt(len2) || 1;
    pos.x += (-ez / len) * minDist;
    pos.z += (ex / len) * minDist;
    return pos;
  }
  const push = (minDist - dist) / dist;
  pos.x += dx * push;
  pos.z += dz * push;
  return pos;
}

// A wall-piece collider: a segment from (ax, az) to (bx, bz), half as thick
// as `t`, from height base to top. blocksShots: shots and the torch stop
// on it (walls and doors do; the chain-link fence doesn't).
export function segmentCollider(ax, az, bx, bz, t, base, top, blocksShots) {
  const len = Math.hypot(bx - ax, bz - az);
  return { seg: true, ax, az, bx, bz, t, x: (ax + bx) / 2, z: (az + bz) / 2, r: len / 2 + t, base, top, blocksShots, off: false };
}

// Distance along a ray (origin + t * dir, dir a unit vector) to a thick
// upright segment (a wall piece: a box from base to top), or Infinity.
// If `hit` is given, hit.facing gets the cosine between the ray and the
// face it meets (1 = head-on).
export function raySegment(origin, dir, c, hit) {
  const ex = c.bx - c.ax;
  const ez = c.bz - c.az;
  const len = Math.hypot(ex, ez);
  if (len < 1e-9) return Infinity;
  const ux = ex / len;
  const uz = ez / len;
  const ox = origin.x - c.ax;
  const oz = origin.z - c.az;
  // The ray in the piece's frame: u along it, v across it, y up. Slab test
  // on each axis, no allocation.
  slab.enter = -Infinity;
  slab.exit = Infinity;
  slab.facing = 1;
  if (!clipSlab(ox * ux + oz * uz, dir.x * ux + dir.z * uz, 0, len)) return Infinity;
  if (!clipSlab(-ox * uz + oz * ux, -dir.x * uz + dir.z * ux, -c.t, c.t)) return Infinity;
  if (!clipSlab(origin.y, dir.y, c.base ?? -Infinity, c.top ?? Infinity)) return Infinity;
  if (slab.enter > slab.exit || slab.exit < 0) return Infinity;
  if (hit) hit.facing = slab.enter < 0 ? 1 : slab.facing;
  return Math.max(0, slab.enter);
}
const slab = { enter: 0, exit: 0, facing: 1 };

// One axis of a ray-box slab test (o: origin, d: direction on that axis).
// False if the ray misses the slab entirely.
function clipSlab(o, d, lo, hi) {
  if (Math.abs(d) < 1e-12) return o >= lo && o <= hi;
  let t0 = (lo - o) / d;
  let t1 = (hi - o) / d;
  if (t0 > t1) {
    const swap = t0;
    t0 = t1;
    t1 = swap;
  }
  if (t0 > slab.enter) {
    slab.enter = t0;
    slab.facing = Math.abs(d);
  }
  if (t1 < slab.exit) slab.exit = t1;
  return true;
}
const segHit = { facing: 0 };

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
// vector): the ground or a circle treated as an upright cylinder of
// radius `c.vr ?? c.r` (from `c.base`, or unbounded below, up to `c.top`,
// with a flat lid there, or unbounded if there's no top). Fills `out`
// with { distance, facing }, where facing is the cosine between the ray
// and the surface (1 = head-on, near 0 = glancing; the ground counts as
// level). If nothing is closer than maxDistance, distance is maxDistance
// and facing is 0. ground: anything with rayDistance(origin, dir, max,
// step). Returns `out`.
export function nearestHit(origin, dir, circles, maxDistance, out = { distance: 0, facing: 0 }, ground = FLAT_GROUND, step = 0.5) {
  out.distance = maxDistance;
  out.facing = 0;
  const tGround = ground.rayDistance(origin, dir, maxDistance, step);
  if (tGround < out.distance) {
    out.distance = tGround;
    out.facing = Math.max(0, -dir.y);
  }

  const flat = dir.x * dir.x + dir.z * dir.z;
  for (const c of circles) {
    if (c.off) continue;
    if (c.seg) {
      if (!c.blocksShots && !c.glare) continue; // chain-link: the beam goes through (unless marked for glare: the gate's frame)
      const t = raySegment(origin, dir, c, segHit);
      if (t < out.distance) {
        out.distance = t;
        out.facing = segHit.facing;
      }
      continue;
    }
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
    if (c.base !== undefined && y < c.base) continue;
    if (t < out.distance) {
      out.distance = t;
      out.facing = facing;
    }
  }
  return out;
}
