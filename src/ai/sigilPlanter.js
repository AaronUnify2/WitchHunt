// Where a sigil gets planted (pure). The witch's rules (M4's stand-in
// planter, used by the real witch since M7): most plantings go to an empty sigil ground; the rest go
// a little way off a pathway into the forest. Never near the station,
// never close to another sigil or to the player, never in an encounter's
// clearing, home or the hut. M9.1: `within(x, z)` can limit her to an area
// (until Tom crosses the cordon, the opening cluster: Session 11).

import { pointSegmentDistance } from '../world/mapGraph.js';

// Clearings a sigil must stay out of (sigil grounds and plain clearings are fine).
const KEEP_OUT_KINDS = new Set(['home', 'hut', 'encounter']);

// Is (x, z) a valid spot for a new sigil? sigils: [{ x, z }]. player: { x, z } or null.
export function spotAllowed(x, z, map, sigils, player, cfg) {
  const home = map.clearings[map.homeIndex];
  if (Math.hypot(x - home.x, z - home.z) < cfg.homeMinDistance) return false;
  for (const s of sigils) if (Math.hypot(x - s.x, z - s.z) < cfg.minGap) return false;
  if (player && Math.hypot(x - player.x, z - player.z) < cfg.playerMinDistance) return false;
  for (const c of map.clearings) {
    if (KEEP_OUT_KINDS.has(c.kind) && Math.hypot(x - c.x, z - c.z) < c.radius + cfg.keepOut) return false;
  }
  return true;
}

// The nearest clearing to (x, z).
export function nearestClearing(map, x, z) {
  let best = map.clearings[0];
  let bestD = Infinity;
  for (const c of map.clearings) {
    const d = Math.hypot(c.x - x, c.z - z);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

// Choose a spot. ground: { clamp(pos), heightAt(x, z) }. sigils: the
// active sigils. groundFree(id): is that sigil ground empty? within(x, z):
// where she may plant (null: anywhere). Returns
// { x, z, y, groundId, clearingId } or null if nowhere fits.
export function chooseSigilSpot(map, ground, sigils, player, cfg, rng, groundFree = () => true, within = null) {
  const inside = within ?? (() => true);
  const grounds = map.clearings.filter((c) => c.kind === 'sigilGround' && groundFree(c.id) && inside(c.x, c.z));
  const paths = within ? map.paths.filter((path) => path.points.some((q) => within(q.x, q.z))) : map.paths;
  const tryGround = () => {
    const open = [];
    for (const c of grounds) {
      const p = groundSpot(c, cfg, rng);
      if (spotAllowed(p.x, p.z, map, sigils, player, cfg)) open.push({ c, p });
    }
    if (open.length === 0) return null;
    const { c, p } = rng.pick(open);
    return finish(p.x, p.z, c.id, c.id);
  };
  const finish = (x, z, groundId, clearingId) => {
    const pos = ground.clamp({ x, z });
    return { x: pos.x, z: pos.z, y: ground.heightAt(pos.x, pos.z), groundId, clearingId };
  };

  if (grounds.length > 0 && rng.chance(cfg.groundChance)) {
    const spot = tryGround();
    if (spot) return spot;
  }
  for (let i = 0; i < cfg.tries; i++) {
    const p = pathSideSpot(paths, cfg, rng);
    if (!p) break;
    ground.clamp(p);
    if (!inside(p.x, p.z)) continue;
    if (!spotAllowed(p.x, p.z, map, sigils, player, cfg)) continue;
    // Off-path sigils must really be in the forest, not in a clearing.
    if (map.clearings.some((c) => Math.hypot(p.x - c.x, p.z - c.z) < c.radius)) continue;
    if (map.paths.some((path) => distanceToPath(path.points, p.x, p.z) < cfg.pathOffset[0] * 0.75)) continue;
    return finish(p.x, p.z, -1, nearestClearing(map, p.x, p.z).id);
  }
  // Nothing in the forest fitted: a free ground after all, if any.
  return grounds.length > 0 ? tryGround() : null;
}

// Near a sigil ground's centre, off to one side (the signpost stands at
// the middle).
function groundSpot(c, cfg, rng) {
  const a = rng.range(0, Math.PI * 2);
  return { x: c.x + Math.sin(a) * cfg.groundOffset, z: c.z + Math.cos(a) * cfg.groundOffset };
}

// A random point a little way off a random pathway, into the forest.
function pathSideSpot(paths, cfg, rng) {
  if (paths.length === 0) return null;
  const pts = rng.pick(paths).points;
  if (pts.length < 2) return null;
  const i = rng.int(0, pts.length - 2);
  const a = pts[i];
  const b = pts[i + 1];
  const t = rng.next();
  const x = a.x + (b.x - a.x) * t;
  const z = a.z + (b.z - a.z) * t;
  const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  const side = rng.chance(0.5) ? 1 : -1;
  const off = rng.range(cfg.pathOffset[0], cfg.pathOffset[1]) * side;
  // Perpendicular to the pathway.
  return { x: x + (-(b.z - a.z) / len) * off, z: z + ((b.x - a.x) / len) * off };
}

export function distanceToPath(points, x, z) {
  let best = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const d = pointSegmentDistance(x, z, a.x, a.z, b.x, b.z);
    if (d < best) best = d;
  }
  return best;
}
