// The witch's hexes (pure; M7 step 2): slow glowing bolts she throws at
// where the player is when she casts. They fly straight (no homing), so
// you can sidestep them, and a tree trunk or rock in the way stops them.
// A hex that reaches the player hurts them.

export class Hexes {
  // hc: config.witch.attack.hex. size: how many can be in flight at once.
  constructor(hc, size = 8) {
    this.cfg = hc;
    this.pool = Array.from({ length: size }, () => ({ active: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0 }));
    this.nearby = [];
  }

  // Throw one from (x, y, z) at (tx, ty, tz). Returns it, or null if all are in flight.
  throw(x, y, z, tx, ty, tz) {
    const h = this.pool.find((p) => !p.active);
    if (!h) return null;
    const dx = tx - x;
    const dy = ty - y;
    const dz = tz - z;
    const d = Math.hypot(dx, dy, dz) || 1;
    const s = this.cfg.speed;
    Object.assign(h, { active: true, x, y, z, vx: (dx / d) * s, vy: (dy / d) * s, vz: (dz / d) * s, life: this.cfg.life });
    return h;
  }

  // Move them on. target: { x, z, y0, y1 } (the player's body: feet to
  // eyes). colliders: a SpatialGrid of trees and rocks (null for none).
  // ground: { heightAt(x, z) }. Returns how much damage reached the player.
  update(dt, target, colliders, ground) {
    const r = this.cfg.radius;
    let damage = 0;
    for (const h of this.pool) {
      if (!h.active) continue;
      h.life -= dt;
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      h.z += h.vz * dt;
      if (h.life <= 0 || (ground && h.y < ground.heightAt(h.x, h.z))) {
        h.active = false;
        continue;
      }
      // The player: a hit if it passes within its radius of their body.
      const dp = Math.hypot(h.x - target.x, h.z - target.z);
      if (dp <= r + (target.radius ?? 0.35) && h.y >= target.y0 - r && h.y <= target.y1 + r) {
        h.active = false;
        damage += this.cfg.damage;
        continue;
      }
      if (colliders && this.blocked(h, colliders)) h.active = false;
    }
    return damage;
  }

  // A trunk or rock (a circle collider) in the way stops it.
  blocked(h, colliders) {
    for (const c of colliders.query(h.x, h.z, this.cfg.radius, this.nearby)) {
      if (c.off || c.seg || c.glareOnly) continue;
      if (c.base !== undefined && h.y < c.base) continue;
      if (c.top !== undefined && h.y > c.top) continue;
      if (Math.hypot(h.x - c.x, h.z - c.z) <= c.r) return true;
    }
    return false;
  }

  clear() {
    for (const h of this.pool) h.active = false;
  }

  get count() {
    let n = 0;
    for (const h of this.pool) if (h.active) n++;
    return n;
  }
}
