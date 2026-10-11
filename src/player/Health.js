// Health (pure logic): 0..max, no natural regeneration, death at 0.
// Damage goes through armour first. Healing climbs one point at a time at
// healPerSecond; a second kit used while one is working queues behind it
// rather than stacking, so the rate cap holds. Healing stops at max and
// whatever is left (including queued kits) is lost.

export class Health {
  constructor(healthConfig, armour) {
    this.cfg = healthConfig;
    this.armour = armour;
  }

  init() {
    this.value = this.cfg.start;
    this.queue = []; // points still to heal, one entry per kit
    this.progress = 0; // fraction of the next point
  }

  // Returns { absorbed, taken } so callers can show the right hit effect.
  takeDamage(amount) {
    if (this.dead || amount <= 0) return { absorbed: 0, taken: 0 };
    const left = this.armour ? this.armour.absorb(amount) : amount;
    const taken = Math.min(this.value, left);
    this.value -= taken;
    if (this.dead) this.clearHealing();
    return { absorbed: amount - left, taken };
  }

  // Start (or queue) a heal of `amount` points. False if it can't be used.
  queueHeal(amount) {
    if (this.dead || this.value >= this.cfg.max) return false;
    this.queue.push(amount);
    return true;
  }

  update(dt) {
    if (this.queue.length === 0) return;
    this.progress += this.cfg.healPerSecond * dt;
    while (this.progress >= 1 && this.queue.length > 0) {
      this.progress -= 1;
      this.value += 1;
      this.queue[0] -= 1;
      if (this.queue[0] <= 0) this.queue.shift();
      if (this.value >= this.cfg.max) {
        this.value = this.cfg.max;
        this.clearHealing();
      }
    }
    if (this.queue.length === 0) this.progress = 0;
  }

  dispose() {}

  clearHealing() {
    this.queue.length = 0;
    this.progress = 0;
  }

  get dead() {
    return this.value <= 0;
  }

  get healing() {
    return this.queue.length > 0;
  }

  // Points still waiting to be healed across every queued kit.
  get pendingHeal() {
    let sum = 0;
    for (const p of this.queue) sum += p;
    return sum;
  }

  get fraction() {
    return this.value / this.cfg.max;
  }
}
