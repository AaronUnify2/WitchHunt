// Items lying on the ground (pure logic): a fixed pool, no allocation
// while playing. Zombies drop them (Combat rolls the loot); walking over
// one offers it to `take(item, amount)`, which returns false to leave it
// lying (a full armour bar, a full kit bag). Old pickups expire, and the
// oldest is reused when the pool is full.
//
// A pickup: { active, item, amount, x, y, z, age, phase }.

export class Pickups {
  constructor(pickupConfig) {
    this.cfg = pickupConfig;
  }

  init() {
    this.pool = Array.from({ length: this.cfg.poolSize }, () => ({
      active: false, item: null, amount: 0, x: 0, y: 0, z: 0, age: 0, phase: 0,
      glareCircle: { x: 0, z: 0, r: 0, vr: 0, base: 0, top: 0 }, // reused for the torch's glare check
    }));
  }

  dispose() {
    this.clear();
  }

  clear() {
    for (const p of this.pool) p.active = false;
  }

  // Drop one at (x, y, z). Returns the pickup.
  drop(item, amount, x, y, z, phase = 0) {
    let slot = this.pool.find((p) => !p.active);
    if (!slot) slot = this.pool.reduce((a, b) => (b.age > a.age ? b : a)); // the oldest
    slot.active = true;
    slot.item = item;
    slot.amount = amount;
    slot.x = x;
    slot.y = y;
    slot.z = z;
    slot.age = 0;
    slot.phase = phase;
    return slot;
  }

  // Age them, and offer each one within reach of (px, pz) to take().
  // Returns how many were taken.
  update(dt, px, pz, take) {
    let taken = 0;
    const r = this.cfg.radius;
    for (const p of this.pool) {
      if (!p.active) continue;
      p.age += dt;
      if (p.age >= this.cfg.lifeSeconds) {
        p.active = false;
        continue;
      }
      if (take && Math.abs(p.x - px) <= r && Math.abs(p.z - pz) <= r && Math.hypot(p.x - px, p.z - pz) <= r) {
        if (take(p.item, p.amount)) {
          p.active = false;
          taken++;
        }
      }
    }
    return taken;
  }

  // Pickups within `range` of origin as circles for the torch's glare check,
  // appended to `out` (so the beam dims when it's right on one).
  glareCircles(origin, range, out) {
    const c = this.cfg;
    const half = c.size / 2;
    for (const p of this.pool) {
      if (!p.active || Math.hypot(p.x - origin.x, p.z - origin.z) > range) continue;
      const g = p.glareCircle;
      g.x = p.x;
      g.z = p.z;
      g.r = half;
      g.vr = half;
      g.base = p.y;
      g.top = p.y + c.lift + c.bob + c.size * 0.6;
      out.push(g);
    }
    return out;
  }

  get activeCount() {
    let n = 0;
    for (const p of this.pool) if (p.active) n++;
    return n;
  }
}
