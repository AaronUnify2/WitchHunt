// Dynamic resolution controller (pure logic). Averages frame times over a
// window; drops the render scale one step after a slow window, and raises
// it one step only after a sustained stretch on target, so it doesn't
// flicker between two levels.

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
    this.resetSample();
    this.goodTime = 0;
  }

  update(dt) {
    if (!this.enabled || dt <= 0) return false;
    this.sampleTime += dt;
    this.sampleFrames += 1;
    if (this.sampleTime < this.cfg.sampleSeconds) return false;

    const average = this.sampleTime / this.sampleFrames;
    const window = this.sampleTime;
    this.resetSample();
    const slow = average > (1 / this.targetFps) * (1 + this.cfg.slowTolerance);

    if (slow) {
      this.goodTime = 0;
      return this.setScale(this.scale - this.cfg.step);
    }
    this.goodTime += window;
    if (this.goodTime >= this.cfg.raiseAfterSeconds) {
      this.goodTime = 0;
      return this.setScale(this.scale + this.cfg.step);
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
  }

  setTarget(fps) {
    this.targetFps = fps;
    this.goodTime = 0;
    this.resetSample();
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    this.goodTime = 0;
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
