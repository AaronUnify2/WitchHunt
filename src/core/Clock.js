// The day/night clock. Advances through the phases in config.clock,
// counts days, and maps the current moment onto a clock-face time.
// Emits 'clock:phaseChanged' { from, to, day } when a phase begins.

export class Clock {
  constructor(clockConfig, bus) {
    this.cfg = clockConfig;
    this.bus = bus;
  }

  init() {
    this.timeScale = this.cfg.timeScale;
    const index = this.cfg.phases.findIndex((p) => p.name === this.cfg.startPhase);
    this.phaseIndex = Math.max(0, index);
    this.day = this.cfg.startDay;
    this.phaseElapsed = 0;
    this.paused = false;
  }

  update(dt) {
    if (this.paused) return;
    this.phaseElapsed += dt * this.timeScale;
    // A loop, not an if: a long frame or a big time skip can cross
    // several phases at once.
    while (this.phaseElapsed >= this.currentPhase.seconds) {
      this.phaseElapsed -= this.currentPhase.seconds;
      this.advancePhase();
    }
  }

  dispose() {}

  advancePhase() {
    const from = this.currentPhase.name;
    this.phaseIndex = (this.phaseIndex + 1) % this.cfg.phases.length;
    if (this.phaseIndex === 0) this.day += 1;
    this.bus?.emit('clock:phaseChanged', { from, to: this.phase, day: this.day });
  }

  setPaused(paused) {
    this.paused = paused;
  }

  setTimeScale(scale) {
    this.timeScale = scale;
  }

  // Jump to the start of the next phase (debug tool).
  skipPhase() {
    this.phaseElapsed = 0;
    this.advancePhase();
  }

  get currentPhase() {
    return this.cfg.phases[this.phaseIndex];
  }

  get phase() {
    return this.currentPhase.name;
  }

  // 0..1 through the current phase.
  get phaseProgress() {
    return this.phaseElapsed / this.currentPhase.seconds;
  }

  // Real seconds left in the current phase (at timeScale 1).
  get phaseRemaining() {
    return this.currentPhase.seconds - this.phaseElapsed;
  }

  // Clock-face time in hours, 0 <= h < hoursPerDay.
  get hourOfDay() {
    const { phases, hoursPerDay } = this.cfg;
    const start = this.currentPhase.startHour;
    const nextStart = phases[(this.phaseIndex + 1) % phases.length].startHour;
    const span = (nextStart - start + hoursPerDay) % hoursPerDay;
    return (start + span * this.phaseProgress) % hoursPerDay;
  }

  // "HH:MM" on a 24-hour clock face.
  formatTime() {
    const minutesPerHour = this.cfg.minutesPerHour;
    const totalMinutes = Math.floor(this.hourOfDay * minutesPerHour);
    const h = Math.floor(totalMinutes / minutesPerHour);
    const m = totalMinutes % minutesPerHour;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
}
