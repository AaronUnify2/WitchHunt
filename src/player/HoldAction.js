// Hold interact to do something (pure): repair, build, fit a battery,
// climb, load the turret, open the ledger. Like digging (Digging.js):
// letting go drains the bar back down (`releaseDrain` times as fast as it
// fills; Aaron, M5), a different target (or none) starts over, taking
// damage loses the progress. After an action completes, interact must be
// let go before the next one can start, so one long hold never chains
// "repair" into "build a barricade".

export class HoldAction {
  // releaseDrain: how many times faster the bar empties than it fills.
  constructor(releaseDrain = 2) {
    this.releaseDrain = releaseDrain;
  }

  init() {
    this.key = null; // what's being held for (any value; compared by identity)
    this.progress = 0; // 0..1
    this.active = false; // holding this frame
    this.needsRelease = false;
  }

  // key: the current target's key, or null. seconds: how long it takes.
  // Returns true on the frame it completes.
  update(dt, key, holding, seconds) {
    if (!holding) this.needsRelease = false;
    if (key !== this.key) {
      this.key = key;
      this.progress = 0;
    }
    this.active = key !== null && holding && !this.needsRelease;
    if (!this.active) {
      if (seconds > 0) this.progress = Math.max(0, this.progress - (dt / seconds) * this.releaseDrain);
      return false;
    }
    this.progress += seconds > 0 ? dt / seconds : 1;
    if (this.progress < 1) return false;
    this.progress = 0;
    this.active = false;
    this.needsRelease = true;
    return true;
  }

  interrupt() {
    const was = this.progress > 0;
    this.progress = 0;
    this.active = false;
    return was;
  }
}
