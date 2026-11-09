// Dynamic resolution controller (pure logic). Averages frame times over a
// window; drops the render scale one step after a slow window, and raises
// it one step only after a sustained stretch on target, so it doesn't
// flicker between two levels. A raise that's dropped again soon after
// (failedRaiseSeconds) doubles the wait before the next raise
// (raiseBackoff, up to maxRaiseAfterSeconds), so a scene right on the edge
// settles instead of resizing every few seconds (Session 22: each resize
// rebuilds the post chain's targets, a hitch on the tablet).

export class DynamicResolution {
  constructor(drConfig) {
    this.cfg = drConfig;
  }

  init({ scale, min, max, targetFps }) {
    this.enabled = this.cfg.enabled;
    this.min = min;
    this.max = max;
    this.scale = this.clamp(scale);
    this.targetFps = targetFps;
    this.resetBackoff();
  }

  update(dt) {
    if (!this.enabled || dt <= 0) return false;
    this.sinceRaise += dt;
    this.sampleTime += dt;
    this.sampleFrames += 1;
    if (this.sampleTime < this.cfg.sampleSeconds) return false;

    const average = this.sampleTime / this.sampleFrames;
    const window = this.sampleTime;
    this.resetSample();
    const slow = average > (1 / this.targetFps) * (1 + this.cfg.slowTolerance);

    if (slow) {
      this.goodTime = 0;
      const dropped = this.setScale(this.scale - this.cfg.step);
      if (dropped && this.sinceRaise <= (this.cfg.failedRaiseSeconds ?? 0)) {
        this.raiseAfter = Math.min(this.cfg.maxRaiseAfterSeconds ?? this.raiseAfter, this.raiseAfter * (this.cfg.raiseBackoff ?? 1));
      }
      return dropped;
    }
    this.goodTime += window;
    if (this.goodTime >= this.raiseAfter) {
      this.goodTime = 0;
      const raised = this.setScale(this.scale + this.cfg.step);
      if (raised) this.sinceRaise = 0;
      return raised;
    }
    return false;
  }

  dispose() {}

  // Returns true if the scale actually changed.
  setScale(scale) {
    const next = this.clamp(scale);
    if (next === this.scale) return false;
    this.scale = next;
    return true;
  }

  setBounds(min, max) {
    this.min = min;
    this.max = max;
    this.scale = this.clamp(this.scale);
    this.resetBackoff();
  }

  setTarget(fps) {
    this.targetFps = fps;
    this.resetBackoff();
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    this.resetBackoff();
  }

  // A fresh start (new quality, target or on/off): the base wait again.
  resetBackoff() {
    this.goodTime = 0;
    this.raiseAfter = this.cfg.raiseAfterSeconds;
    this.sinceRaise = Infinity;
    this.resetSample();
  }

  resetSample() {
    this.sampleTime = 0;
    this.sampleFrames = 0;
  }

  // Clamp, and round away float drift from repeated steps.
  clamp(scale) {
    const rounded = Math.round(scale * 1000) / 1000;
    return Math.min(this.max, Math.max(this.min, rounded));
  }
}
