// The end of a run (M7 step 6; DESIGN.md "The ending"). M8: the ending
// and the defeat are cutscenes (src/data/cutscenes.json):
//  - Victory ("ending.victory"): after the witch bursts apart and the red
//    drains away, trail cam after trail cam as the dead fall, Ground Zero
//    going dark, dawn with the family and their closing lines.
//  - Defeat ("ending.defeat"; you died, or the station fell): the screen
//    fades to black as the radio fills with static and the family call
//    Tom's name. No graphic scene.
// Then the run summary. A / Enter skips the cutscene; on the summary it
// starts a new run ('run:newRequested'; Game deletes the save and loads a
// fresh map). The summary's final look is Session 28's.

import { summaryRows } from '../core/runStats.js';

export class RunEndScreen {
  // playCutscene(id, opts): Cutscenes.play (false if it can't).
  constructor(endingConfig, bus, playCutscene) {
    this.cfg = endingConfig;
    this.bus = bus;
    this.playCutscene = playCutscene;
  }

  init(root) {
    this.el = document.createElement('div');
    this.el.className = 'run-end hidden';
    this.el.innerHTML = `
      <div class="run-end-summary">
        <h2></h2>
        <p class="run-end-reason"></p>
        <table></table>
        <p class="run-end-prompt">A / Enter: start a new run</p>
      </div>
    `;
    root.appendChild(this.el);
    const q = (s) => this.el.querySelector(s);
    this.titleEl = q('.run-end-summary h2');
    this.reasonEl = q('.run-end-reason');
    this.tableEl = q('.run-end-summary table');
    this.hide();
  }

  // Open from the moment the run ends (its cutscene playing) until a new run.
  get isOpen() {
    return this.kind !== null;
  }

  // kind: 'victory' | 'defeat'. title, reason: the summary's heading.
  // stats: runStats. nights: nights survived.
  show(kind, title, reason, stats, nights) {
    this.kind = kind;
    this.title = title;
    this.reason = reason;
    this.stats = stats;
    this.nights = nights;
    this.summaryShown = false;
    this.summaryTime = 0;
    if (!this.playCutscene(`ending.${kind}`, { onDone: () => this.showSummary() })) this.showSummary();
  }

  hide() {
    this.kind = null;
    this.summaryShown = false;
    this.el.className = 'run-end hidden';
  }

  showSummary() {
    if (!this.isOpen) return;
    this.summaryShown = true;
    this.summaryTime = 0;
    this.el.className = `run-end ${this.kind}`;
    this.titleEl.textContent = this.title;
    this.reasonEl.textContent = this.reason ?? '';
    this.tableEl.innerHTML = summaryRows(this.stats, this.nights)
      .map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`)
      .join('');
  }

  // input: the raw controls (A / Enter starts a new run, once the summary
  // has been up a moment: the press that skipped the cutscene doesn't count).
  update(dt, input) {
    if (!this.summaryShown) return;
    this.summaryTime += dt;
    if (this.summaryTime > this.cfg.summaryInputDelay && input.wasPressed('menuConfirm')) this.bus.emit('run:newRequested');
  }

  dispose() {
    this.el.remove();
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
