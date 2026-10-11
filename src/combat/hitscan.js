// Hit-scan and melee maths (pure). Bullets are instant rays; enemies are
// an upright body cylinder with a narrower head cylinder on top, standing
// at their ground height `y`, and maybe a weak spot (a sphere on the
// back: the mutant's); trees and rocks block shots with their
// trunk or rock body, and the ground stops shots aimed into it.

import { FLAT_GROUND, raySegment } from '../world/collision.js';

const GROUND_STEP = 1; // metres per step when marching a shot over the terrain

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

// Distance along a ray to a sphere at (cx, cy, cz), or Infinity.
export function raySphere(origin, dir, cx, cy, cz, r) {
  const ox = origin.x - cx;
  const oy = origin.y - cy;
  const oz = origin.z - cz;
  const b = ox * dir.x + oy * dir.y + oz * dir.z;
  const c = ox * ox + oy * oy + oz * oz - r * r;
  if (c <= 0) return 0; // inside it
  const disc = b * b - c;
  if (b >= 0 || disc < 0) return Infinity;
  return -b - Math.sqrt(disc);
}

// Distance along a ray to an enemy's weak spot (a sphere on its back:
// e.weakSpot = { back, height, radius }, placed from its facing), or
// Infinity if it has none or the ray misses it.
export function rayWeakSpot(origin, dir, e) {
  const w = e.weakSpot;
  if (!w) return Infinity;
  const y = (e.y ?? 0) + w.height;
  return raySphere(origin, dir, e.x - Math.sin(e.facing) * w.back, y, e.z - Math.cos(e.facing) * w.back, w.radius);
}

// Which part a ray hits first: 'weak' (the weak spot, which stands out
// from the body so it's only reachable from behind), 'head' or 'body'.
// Writes { t, part } into `out` (t Infinity on a miss).
function rayParts(origin, dir, e, out) {
  const y = e.y ?? 0;
  const tBody = rayCylinder(origin, dir, e.x, e.z, e.hitRadius, y, y + e.headBottom);
  const tHead = rayCylinder(origin, dir, e.x, e.z, e.headRadius, y + e.headBottom, y + e.height);
  const tWeak = rayWeakSpot(origin, dir, e);
  out.t = Math.min(tBody, tHead);
  out.part = tHead <= tBody ? 'head' : 'body';
  if (tWeak <= out.t) {
    out.t = tWeak;
    out.part = 'weak';
  }
  return out;
}
const parts = { t: 0, part: 'body' };

// Distance to the nearest blocking static collider (tree trunk, rock) or
// the ground along the ray, or maxDistance. Uses the solid radius `r`,
// not a tree's canopy; a collider runs from `base` (or unbounded below)
// to `top` (or unbounded above). ground: anything with rayDistance().
export function rayBlockers(origin, dir, blockers, maxDistance, ground = FLAT_GROUND) {
  let best = maxDistance;
  for (const b of blockers) {
    if (b.off || b.glareOnly) continue; // glare-only shapes (M5) never stop a shot
    if (b.seg) {
      // Wall pieces (M5): walls and doors stop shots; the chain-link fence doesn't.
      if (b.blocksShots) best = Math.min(best, raySegment(origin, dir, b));
      continue;
    }
    const t = rayCylinder(origin, dir, b.x, b.z, b.r, b.base ?? -Infinity, b.top ?? Infinity);
    if (t < best) best = t;
  }
  return Math.min(best, ground.rayDistance(origin, dir, best, GROUND_STEP));
}

// Which enemy a ray hits first, and where. enemies: [{ x, y, z, hitRadius,
// height, headBottom, headRadius, weakSpot? }] (y = the ground they stand
// on, 0 if missing). Returns { enemy, distance, part } ('head', 'body' or
// 'weak') or null if nothing is hit before maxDistance.
export function rayEnemies(origin, dir, enemies, maxDistance) {
  let best = null;
  let bestT = maxDistance;
  for (const e of enemies) {
    rayParts(origin, dir, e, parts);
    if (parts.t < bestT) {
      bestT = parts.t;
      best = { enemy: e, distance: parts.t, part: parts.part };
    }
  }
  return best;
}

// Every enemy a ray passes through before maxDistance, nearest first, for
// bullets that penetrate. Fills `out` with { enemy, distance, part },
// reusing its objects; returns the number of hits.
export function rayEnemiesAll(origin, dir, enemies, maxDistance, out) {
  let n = 0;
  for (const e of enemies) {
    rayParts(origin, dir, e, parts);
    if (parts.t >= maxDistance) continue;
    if (n === out.length) out.push({ enemy: null, distance: 0, part: 'body' });
    const hit = out[n++];
    hit.enemy = e;
    hit.distance = parts.t;
    hit.part = parts.part;
  }
  // Insertion sort: a handful of hits at most.
  for (let i = 1; i < n; i++) {
    const h = out[i];
    let j = i - 1;
    while (j >= 0 && out[j].distance > h.distance) {
      out[j + 1] = out[j];
      j--;
    }
    out[j + 1] = h;
  }
  return n;
}

// How much a hit on `part` is worth: the weak spot's own multiplier, the
// enemy's headshot multiplier (else `headshot`, the weapons' default), or 1.
export function partMultiplier(enemy, part, headshot) {
  if (part === 'weak') return enemy.weakSpot?.multiplier ?? 1;
  if (part === 'head') return enemy.headshotMultiplier ?? headshot;
  return 1;
}

// Is a swing from `eye` coming from behind `e` (inside its weak spot's
// meleeBehindDegrees of straight behind)? Then the shovel lands on the spot.
export function meleeFromBehind(eye, e) {
  const w = e.weakSpot;
  if (!w) return false;
  const dx = eye.x - e.x;
  const dz = eye.z - e.z;
  const d = Math.hypot(dx, dz) || 1;
  const ahead = (dx * Math.sin(e.facing) + dz * Math.cos(e.facing)) / d; // 1 = in front of it
  return ahead <= -Math.cos((w.meleeBehindDegrees * Math.PI) / 180);
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
