// The detection model (pure): one model for every enemy (DESIGN.md
// "Movement, flashlight and stealth"). Distance, line of sight over the
// hills, light level, the torch, crouching, the brush, and noise.
//
// Sight: how far away the player can be seen depends on the daylight, the
// torch, stance and the undergrowth they stand in, and is shorter behind
// the enemy. It needs a clear line over the ground (trees don't block it;
// the forest is too dense to be worth ray-testing every trunk).
// Hearing: footsteps carry a short way whatever the light; crouched
// footsteps are silent. Gunfire is a separate, louder event (alert()).
// Everything multiplies by the zombie level's `notice`.

import { FLAT_GROUND } from '../world/collision.js';

// 0 at night, 1 by day, ramping through dusk and dawn.
export function daylightLevel(phase, progress) {
  switch (phase) {
    case 'day':
      return 1;
    case 'dusk':
      return 1 - progress;
    case 'dawn':
      return progress;
    default:
      return 0;
  }
}

// How far away (metres) the player can be seen from in front, before line
// of sight. p: { daylight, torchOn, crouched, sprinting, undergrowth }.
export function sightDistance(p, cfg, notice = 1) {
  const s = cfg.sight;
  let d = s.night + (s.day - s.night) * p.daylight;
  if (p.torchOn) d *= cfg.torchNight + (cfg.torchDay - cfg.torchNight) * p.daylight;
  if (p.crouched) d *= cfg.crouch;
  else if (p.sprinting) d *= cfg.sprint;
  d *= 1 + (cfg.undergrowth - 1) * p.undergrowth;
  return d * notice;
}

// How far away (metres) the player's footsteps can be heard. p: { crouched,
// sprinting, speed }.
export function hearingDistance(p, cfg, notice = 1) {
  const h = cfg.hearing;
  if (p.crouched || p.speed < h.minSpeed) return h.crouch * notice;
  return (p.sprinting ? h.sprint : h.walk) * notice;
}

// The facts about the player every check this frame shares. Fills and
// returns `out`. player: { x, z, eyeY, daylight, torchOn, crouched,
// sprinting, speed, undergrowth }.
export function playerSenses(player, cfg, notice, out = {}) {
  out.x = player.x;
  out.z = player.z;
  out.eyeY = player.eyeY;
  out.sight = sightDistance(player, cfg, notice);
  out.hearing = hearingDistance(player, cfg, notice);
  out.touch = cfg.touch;
  return out;
}

const origin = { x: 0, y: 0, z: 0 };
const dir = { x: 0, y: 0, z: 0 };

// Can an eye at (x, y, z) see a point at (tx, ty, tz) over the ground?
export function lineOfSight(x, y, z, tx, ty, tz, ground = FLAT_GROUND, step = 2) {
  const dx = tx - x;
  const dy = ty - y;
  const dz = tz - z;
  const dist = Math.hypot(dx, dy, dz);
  if (dist < 1e-6) return true;
  origin.x = x;
  origin.y = y;
  origin.z = z;
  dir.x = dx / dist;
  dir.y = dy / dist;
  dir.z = dz / dist;
  // A little short of the target, so the ground under the player's feet
  // on a crest doesn't count as blocking.
  const reach = Math.max(0, dist - 0.5);
  return ground.rayDistance(origin, dir, reach, step) >= reach;
}

// Does enemy `e` ({ x, y, z, facing }) notice the player now? senses: from
// playerSenses(). chasing: it is already after the player (sees further).
export function notices(e, senses, cfg, chasing = false, ground = FLAT_GROUND) {
  const dx = senses.x - e.x;
  const dz = senses.z - e.z;
  const dist = Math.hypot(dx, dz);
  if (dist <= senses.touch) return true;
  if (dist <= senses.hearing) return true;
  let sight = senses.sight * (chasing ? cfg.pursuit : 1);
  if (dist > sight) return false;
  // Behind it (outside its front half): seen from closer.
  const ahead = dist > 0 ? (dx * Math.sin(e.facing) + dz * Math.cos(e.facing)) / dist : 1;
  if (ahead < 0) {
    sight *= cfg.rearSight;
    if (dist > sight) return false;
  }
  return lineOfSight(e.x, (e.y ?? 0) + cfg.eyeHeight, e.z, senses.x, senses.eyeY, senses.z, ground, cfg.losStep);
}
