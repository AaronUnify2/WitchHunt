// A flare in flight (pure; M9.1). Fired from the flare gun like a round,
// it flies fast, slowed by the air and pulled down, so a shot straight up
// arcs over and drifts back down (Aaron); each step it's a short ray from where
// it was to where it's going, tested against the targets (zombies, the
// witch: rayEnemiesAll), solid things (trunks, rocks, walls) and the ground.
//  - hits a target: a conk (Aaron); it falls to the ground below the hit;
//  - hits something solid: it drops there, just short of it;
//  - hits the ground: it lands and burns (maxFlight is only a safety net).

import { rayEnemiesAll, rayBlockers } from './hitscan.js';

const hits = [];
const dir = { x: 0, y: 0, z: 0 };

// f: { x, y, z, vx, vy, vz, age }. cfg: config.flares. world: { targets
// (array), blockers (array near the step), ground (rayDistance, heightAt) }.
// Moves f by dt. Returns null while it's still flying, else
// { kind: 'target' | 'solid' | 'ground', x, y, z, target?, part? }: where
// it stopped (on the ground for 'ground'; at the impact for the others).
export function stepFlare(f, dt, cfg, world) {
  f.age += dt;
  // Drag slows it all over; gravity pulls it down. Move by the average velocity.
  const keep = Math.exp(-(cfg.drag ?? 0) * dt);
  const nvx = f.vx * keep;
  const nvy = f.vy * keep - cfg.gravity * dt;
  const nvz = f.vz * keep;
  const mx = (f.vx + nvx) * 0.5 * dt;
  const my = (f.vy + nvy) * 0.5 * dt;
  const mz = (f.vz + nvz) * 0.5 * dt;
  const len = Math.hypot(mx, my, mz);
  if (len < 1e-6) return null;
  dir.x = mx / len;
  dir.y = my / len;
  dir.z = mz / len;
  const origin = { x: f.x, y: f.y, z: f.z };
  const solid = rayBlockers(origin, dir, world.blockers, len, { rayDistance: () => len });
  const ground = world.ground.rayDistance(origin, dir, len, Math.min(0.5, len));
  const stop = Math.min(solid, ground);
  const n = rayEnemiesAll(origin, dir, world.targets, stop, hits);
  if (n > 0) {
    const h = hits[0];
    return { kind: 'target', x: f.x + dir.x * h.distance, y: f.y + dir.y * h.distance, z: f.z + dir.z * h.distance, target: h.enemy, part: h.part };
  }
  if (stop < len) {
    const back = solid < ground ? Math.max(0, stop - 0.3) : stop; // short of a trunk, not inside it
    const at = { x: f.x + dir.x * back, y: f.y + dir.y * back, z: f.z + dir.z * back };
    return { kind: solid < ground ? 'solid' : 'ground', ...at };
  }
  f.x += mx;
  f.y += my;
  f.z += mz;
  f.vx = nvx;
  f.vy = nvy;
  f.vz = nvz;
  if (f.age >= cfg.maxFlight) return { kind: 'ground', x: f.x, y: world.ground.heightAt(f.x, f.z), z: f.z };
  return null;
}
