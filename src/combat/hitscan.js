// Hit-scan and melee maths (pure). Bullets are instant rays; enemies are
// an upright body cylinder with a narrower head cylinder on top; trees
// and rocks block shots with their trunk or rock body.

// Distance along a ray (origin + t * dir, dir a unit vector) to an
// upright cylinder at (cx, cz) between heights y0 and y1, or Infinity.
// Hits the side or, coming from above or below, the flat cap.
export function rayCylinder(origin, dir, cx, cz, r, y0, y1) {
  const ox = origin.x - cx;
  const oz = origin.z - cz;
  const flat = dir.x * dir.x + dir.z * dir.z;
  const c = ox * ox + oz * oz - r * r;
  let tEnter = 0;
  let tExit = Infinity;
  if (flat > 1e-12) {
    const b = ox * dir.x + oz * dir.z;
    const disc = b * b - flat * c;
    if (disc < 0) return Infinity;
    const sq = Math.sqrt(disc);
    tEnter = (-b - sq) / flat;
    tExit = (-b + sq) / flat;
  } else if (c > 0) {
    return Infinity; // vertical ray outside the circle
  } else {
    tEnter = -Infinity;
  }
  // Clip against the height slab.
  if (Math.abs(dir.y) < 1e-12) {
    if (origin.y < y0 || origin.y > y1) return Infinity;
  } else {
    let ta = (y0 - origin.y) / dir.y;
    let tb = (y1 - origin.y) / dir.y;
    if (ta > tb) [ta, tb] = [tb, ta];
    tEnter = Math.max(tEnter, ta);
    tExit = Math.min(tExit, tb);
  }
  if (tEnter > tExit || tExit < 0) return Infinity;
  return Math.max(tEnter, 0);
}

// Nearest blocking static collider (tree trunk, rock) along the ray, or
// Infinity. Uses the solid radius `r`, not a tree's canopy.
export function rayBlockers(origin, dir, blockers, maxDistance) {
  let best = maxDistance;
  for (const b of blockers) {
    const t = rayCylinder(origin, dir, b.x, b.z, b.r, 0, b.top ?? Infinity);
    if (t < best) best = t;
  }
  // The ground stops shots aimed downward.
  if (dir.y < 0) best = Math.min(best, origin.y / -dir.y);
  return best;
}

// Which enemy a ray hits first, and where. enemies: [{ x, z, hitRadius,
// height, headBottom, headRadius }]. Returns { enemy, distance, part }
// ('head' or 'body') or null if nothing is hit before maxDistance.
export function rayEnemies(origin, dir, enemies, maxDistance) {
  let best = null;
  let bestT = maxDistance;
  for (const e of enemies) {
    const tBody = rayCylinder(origin, dir, e.x, e.z, e.hitRadius, 0, e.headBottom);
    const tHead = rayCylinder(origin, dir, e.x, e.z, e.headRadius, e.headBottom, e.height);
    if (tHead < bestT && tHead <= tBody) {
      bestT = tHead;
      best = { enemy: e, distance: tHead, part: 'head' };
    } else if (tBody < bestT) {
      bestT = tBody;
      best = { enemy: e, distance: tBody, part: 'body' };
    }
  }
  return best;
}

// Damage multiplier for range: 1 up to start, falling linearly to `min` at end.
export function falloff(distance, start, end, min) {
  if (distance <= start) return 1;
  if (distance >= end) return min;
  return 1 - ((distance - start) / (end - start)) * (1 - min);
}

// A random direction inside a cone of half-angle `spreadRad` round
// `forward`, using the camera's `right` and `up` (all unit vectors).
// Uniform over the cone's disc. Writes into `out` and returns it.
export function spreadDirection(forward, right, up, spreadRad, rng, out) {
  const radius = Math.tan(spreadRad) * Math.sqrt(rng.next());
  const angle = rng.next() * Math.PI * 2;
  const a = Math.cos(angle) * radius;
  const b = Math.sin(angle) * radius;
  out.x = forward.x + right.x * a + up.x * b;
  out.y = forward.y + right.y * a + up.y * b;
  out.z = forward.z + right.z * a + up.z * b;
  const len = Math.hypot(out.x, out.y, out.z);
  out.x /= len;
  out.y /= len;
  out.z /= len;
  return out;
}

// The enemy a melee swing hits: within `reach` (eye to the body's
// surface, on the ground plane) and inside the swing's arc round the
// facing direction (fx, fz unit). Picks the one nearest the centre of
// the arc. Returns the enemy or null.
export function meleeTarget(eye, fx, fz, enemies, reach, arcRad) {
  let best = null;
  let bestAngle = arcRad / 2;
  for (const e of enemies) {
    const dx = e.x - eye.x;
    const dz = e.z - eye.z;
    const dist = Math.hypot(dx, dz);
    if (dist - e.hitRadius > reach) continue;
    if (dist < 1e-6) return e;
    // Widen the arc by the body's angular size, so close bodies are easy to hit.
    const angle = Math.acos(Math.max(-1, Math.min(1, (dx * fx + dz * fz) / dist))) - Math.atan(e.hitRadius / dist);
    if (angle <= bestAngle) {
      bestAngle = angle;
      best = e;
    }
  }
  return best;
}
