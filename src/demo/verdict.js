// Session 22 (Aaron): Demo mode's device test, as pure logic (tested).
// A frame-rate meter, the verdict on an average, the preset to recommend,
// and stepping a value along a list (the demo panel's left and right).

export const VERDICTS = {
  great: 'Runs great',
  playable: 'Playable',
  struggling: 'Struggling',
};

// The verdict on an average frame rate. frameCap: the preset's cap (0 = none).
// t: config.demo.test ({ great, playable, cappedGreat }).
export function verdictFor(avgFps, frameCap, t) {
  const great = frameCap > 0 && frameCap <= 30 ? t.cappedGreat : t.great;
  const id = avgFps >= great ? 'great' : avgFps >= t.playable ? 'playable' : 'struggling';
  return { id, label: VERDICTS[id] };
}

// The preset to use from now on: one step down the list if it struggled,
// else the one it was tested on. names: the presets, lowest first.
export function recommendPreset(verdictId, current, names) {
  const i = names.indexOf(current);
  if (verdictId !== 'struggling' || i <= 0) return current;
  return names[i - 1];
}

// The value `step` places along `list` from `current`, held at the ends.
export function stepIn(list, current, step) {
  const i = list.indexOf(current);
  const at = i < 0 ? 0 : Math.max(0, Math.min(list.length - 1, i + step));
  return list[at];
}

// Frames counted over a stretch of time: the average frame rate and the
// slowest single frame (a hitch shows there, not in the average).
export class FpsMeter {
  constructor() {
    this.reset();
  }

  reset() {
    this.seconds = 0;
    this.frames = 0;
    this.worst = 0;
  }

  add(dt) {
    if (!(dt > 0)) return;
    this.seconds += dt;
    this.frames += 1;
    this.worst = Math.max(this.worst, dt);
  }

  get average() {
    return this.seconds > 0 ? this.frames / this.seconds : 0;
  }

  // The slowest frame as a frame rate (0 before any frame).
  get low() {
    return this.worst > 0 ? 1 / this.worst : 0;
  }
}
