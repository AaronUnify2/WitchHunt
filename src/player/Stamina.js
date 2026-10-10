// Sprint stamina (pure logic): drains while sprinting, refills after a
// short delay once the player stops.

export class Stamina {
  constructor(staminaConfig) {
    this.cfg = staminaConfig;
  }

  init() {
    this.value = this.cfg.max;
    this.sinceUse = Infinity;
  }

  update(dt, draining) {
    if (draining) {
      this.value = Math.max(0, this.value - this.cfg.drainPerSecond * dt);
      this.sinceUse = 0;
      return;
    }
    this.sinceUse += dt;
    if (this.sinceUse >= this.cfg.regenDelay) {
      this.value = Math.min(this.cfg.max, this.value + this.cfg.regenPerSecond * dt);
    }
  }

  dispose() {}

  get empty() {
    return this.value <= 0;
  }

  // Enough to start a new sprint (stops stutter-sprinting on fumes).
  get canStart() {
    return this.value >= this.cfg.minToStartSprint;
  }

  get fraction() {
    return this.value / this.cfg.max;
  }
}
