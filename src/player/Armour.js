// Armour (pure logic): three separate bars (ballistic, energy, nature),
// each 0..max. Pickups add to their bar on the spot; nothing regenerates.
// Damage is soaked point for point in config.damageOrder before it
// reaches health, so the commonest armour goes first.

export class Armour {
  constructor(armourConfig) {
    this.cfg = armourConfig;
  }

  init() {
    this.values = {};
    for (const type of Object.keys(this.cfg.types)) this.values[type] = 0;
  }

  update() {}

  dispose() {}

  // Add a pickup to its bar. Returns how much was actually added
  // (a full bar wastes the rest).
  add(type, amount) {
    const max = this.cfg.types[type].max;
    const before = this.values[type];
    this.values[type] = Math.min(max, before + amount);
    return this.values[type] - before;
  }

  // Soak `damage` through the bars in order. Returns what's left for health.
  absorb(damage) {
    let left = damage;
    for (const type of this.cfg.damageOrder) {
      if (left <= 0) break;
      const soaked = Math.min(this.values[type], left);
      this.values[type] -= soaked;
      left -= soaked;
    }
    return left;
  }

  get(type) {
    return this.values[type];
  }

  fraction(type) {
    return this.values[type] / this.cfg.types[type].max;
  }

  get total() {
    let sum = 0;
    for (const v of Object.values(this.values)) sum += v;
    return sum;
  }
}
