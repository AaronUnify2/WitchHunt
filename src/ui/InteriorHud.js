// Inside an interior (Session 21, M10.2; world/Interiors.js): there's no sky
// to read, so the HUD shows where Tom is, the day and the time, and how
// long until dusk or dawn. Hidden outside.

import { timeUntilTurn } from '../world/Interiors.js';

export class InteriorHud {
  // clockCfg: config.clock.
  constructor(clockCfg) {
    this.clockCfg = clockCfg;
    this.lastText = '';
  }

  init(root) {
    this.el = document.createElement('div');
    this.el.className = 'interior-hud hidden';
    this.nameEl = document.createElement('div');
    this.nameEl.className = 'interior-hud-name';
    this.timeEl = document.createElement('div');
    this.timeEl.className = 'interior-hud-time';
    this.el.append(this.nameEl, this.timeEl);
    root.appendChild(this.el);
  }

  // name: the interior's, or null to hide.
  show(name) {
    if (!this.el) return;
    this.el.classList.toggle('hidden', !name);
    if (name) this.nameEl.textContent = name.toUpperCase();
    this.lastText = '';
  }

  update(clock) {
    if (!this.el || this.el.classList.contains('hidden')) return;
    const text = interiorTimeText(this.clockCfg, clock);
    if (text === this.lastText) return;
    this.lastText = text;
    this.timeEl.textContent = text;
  }
}

// "Day 3 · 16:12 · dusk in 2h 48m" (pure).
export function interiorTimeText(clockCfg, clock) {
  const { until, hours } = timeUntilTurn(clockCfg, clock.phase, clock.hourOfDay);
  const mins = Math.max(0, Math.round(hours * clockCfg.minutesPerHour));
  const h = Math.floor(mins / clockCfg.minutesPerHour);
  const m = mins % clockCfg.minutesPerHour;
  const left = h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
  return `Day ${clock.day} · ${clock.formatTime()} · ${until} in ${left}`;
}
