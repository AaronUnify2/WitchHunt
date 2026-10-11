// Owns the zombie pool (no allocation while playing), spawns, steps every
// zombie, keeps them out of trees and rocks and apart from each other,
// and applies hits. M2 has one zombie type; M4 adds levels, variants,
// hordes, detection and targeting, and M6 the LOD tiers.
//
// Events: 'enemy:hit' { x, y, z, part, killed, zombie }, 'enemy:killed'
// { zombie }, 'enemy:strike' { zombie, damage }, 'enemy:spawned' { count }.

import { Zombie, rollSpeed } from './Zombie.js';
import { resolveCircles, clampToRadius } from '../world/collision.js';

export class EnemyManager {
  constructor(zombieConfig, rng, bus, boundaryRadius) {
    this.cfg = zombieConfig;
    this.rng = rng;
    this.bus = bus;
    this.boundaryRadius = boundaryRadius;
  }

  init(colliders) {
    this.colliders = colliders;
    this.pool = Array.from({ length: this.cfg.poolSize }, () => new Zombie(this.cfg));
    this.living = []; // alive zombies, refreshed every update
    this.nearby = [];
    this.level = 1;
    this.onStrike = (zombie) => this.bus.emit('enemy:strike', { zombie, damage: this.cfg.attackDamage });
  }

  // Spawn up to `count` zombies in a ring round `center` (the player).
  // Returns how many spawned (the pool may be full).
  spawnAround(center, count = this.cfg.spawnCount) {
    const c = this.cfg;
    const level = c.levels[this.level];
    let spawned = 0;
    for (const z of this.pool) {
      if (spawned >= count) break;
      if (z.active) continue;
      const angle = this.rng.range(0, Math.PI * 2);
      const dist = this.rng.range(c.spawnDistanceMin, c.spawnDistanceMax);
      const pos = { x: center.x + Math.sin(angle) * dist, z: center.z + Math.cos(angle) * dist };
      clampToRadius(pos, this.boundaryRadius);
      resolveCircles(pos, c.radius, this.colliders.query(pos.x, pos.z, c.radius, this.nearby));
      const facing = Math.atan2(center.x - pos.x, center.z - pos.z);
      z.spawn(pos.x, pos.z, facing, rollSpeed(level, c.sprintSpeed, c.speedSkew, this.rng));
      spawned++;
    }
    if (spawned > 0) this.bus.emit('enemy:spawned', { count: spawned });
    return spawned;
  }

  setLevel(level) {
    this.level = level;
  }

  // Kill every zombie straight away and return them to the pool.
  clear() {
    for (const z of this.pool) z.state = 'free';
    this.living.length = 0;
  }

  update(dt, target) {
    const c = this.cfg;
    this.living.length = 0;
    for (const z of this.pool) {
      if (!z.active) continue;
      z.update(dt, target, this.onStrike);
      if (!z.alive) continue;
      resolveCircles(z, c.radius, this.colliders.query(z.x, z.z, c.radius, this.nearby));
      clampToRadius(z, this.boundaryRadius);
      this.living.push(z);
    }
    this.separate();
  }

  // Push overlapping zombies apart (a pool of 25, so pairwise is cheap).
  separate() {
    const minDist = this.cfg.separation;
    const list = this.living;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const d = Math.hypot(dx, dz);
        if (d >= minDist) continue;
        const nx = d > 1e-6 ? dx / d : 1;
        const nz = d > 1e-6 ? dz / d : 0;
        const push = (minDist - d) / 2;
        a.x -= nx * push;
        a.z -= nz * push;
        b.x += nx * push;
        b.z += nz * push;
      }
    }
  }

  // Apply a hit from a weapon. part: 'head' | 'body'. at: { x, y, z } impact
  // point (for blood). from: { x, z } the shooter.
  damage(zombie, amount, part, weapon, at, from) {
    const killed = zombie.hit(amount, weapon.stagger ?? 0, weapon.knockback ?? 0, from);
    this.bus.emit('enemy:hit', { x: at.x, y: at.y, z: at.z, part, killed, zombie });
    if (killed) this.bus.emit('enemy:killed', { zombie });
    return killed;
  }

  // Close living zombies as circles for the torch's glare check.
  glareCircles(origin, range, out) {
    out.length = 0;
    for (const z of this.living) {
      if (Math.hypot(z.x - origin.x, z.z - origin.z) > range) continue;
      z.glareCircle.x = z.x;
      z.glareCircle.z = z.z;
      out.push(z.glareCircle);
    }
    return out;
  }

  get activeCount() {
    let n = 0;
    for (const z of this.pool) if (z.active) n++;
    return n;
  }

  get livingCount() {
    return this.living.length;
  }

  dispose() {
    this.clear();
  }
}
