// Digging up a sigil (pure logic; DESIGN.md "The shovel and digging"):
// hold interact beside it for a few seconds. Letting go pauses the dig;
// stepping away (a different target, or none) starts over; taking damage
// interrupts it and loses the progress.

export class Digging {
  constructor(diggingConfig) {
    this.cfg = diggingConfig;
  }

  init() {
    this.target = null;
    this.progress = 0; // 0..1
    this.active = false; // digging this frame
  }

  dispose() {}

  // target: the sigil in reach, or null. holding: interact is held.
  // Returns the target on the frame it's dug up, else null.
  update(dt, target, holding) {
    if (target !== this.target) {
      this.target = target;
      this.progress = 0;
    }
    this.active = target !== null && holding;
    if (!this.active) return null;
    this.progress += dt / this.cfg.seconds;
    if (this.progress < 1) return null;
    const done = this.target;
    this.target = null;
    this.progress = 0;
    this.active = false;
    return done;
  }

  // Taking damage: the dig is lost.
  interrupt() {
    const wasDigging = this.progress > 0;
    this.progress = 0;
    this.active = false;
    return wasDigging;
  }
}
