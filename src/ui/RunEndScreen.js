// The end of a run (M7 step 6; DESIGN.md "The ending"). Placeholders: the
// cutscene system (M8) replaces the cards, the Narrative Designer the
// lines (src/data/ending.json), Session 19 the look.
//  - Victory: after the witch bursts apart and the red drains away (in the
//    world), cards: trail cam after trail cam, Ground Zero going dark,
//    dawn with the family, their closing lines. Then the run summary.
//  - Defeat (you died, or the station fell): the screen fades to black as
//    the radio fills with static and the family call Tom's name. No
//    graphic scene. Then the run summary.
//  - A / Enter skips a card; on the summary it starts a new run
//    ('run:newRequested'; Game deletes the save and loads a fresh map).

import endingData from '../data/ending.json';
import { summaryRows } from '../core/runStats.js';

export class RunEndScreen {
  constructor(endingConfig, bus, sfx) {
    this.cfg = endingConfig;
    this.bus = bus;
    this.sfx = sfx;
    this.data = endingData;
  }

  init(root) {
    this.el = document.createElement('div');
    this.el.className = 'run-end hidden';
    this.el.innerHTML = `
      <div class="run-end-black"></div>
      <div class="run-end-card">
        <div class="run-end-caption"></div>
        <div class="run-end-text"></div>
        <div class="run-end-speaker"></div>
      </div>
      <div class="run-end-summary hidden">
        <h2></h2>
        <p class="run-end-reason"></p>
        <table></table>
        <p class="run-end-prompt">A / Enter: start a new run</p>
      </div>
      <p class="run-end-skip">A / Enter: skip</p>
    `;
    root.appendChild(this.el);
    const q = (s) => this.el.querySelector(s);
    this.blackEl = q('.run-end-black');
    this.cardEl = q('.run-end-card');
    this.captionEl = q('.run-end-caption');
    this.textEl = q('.run-end-text');
    this.speakerEl = q('.run-end-speaker');
    this.summaryEl = q('.run-end-summary');
    this.titleEl = q('.run-end-summary h2');
    this.reasonEl = q('.run-end-reason');
    this.tableEl = q('.run-end-summary table');
    this.skipEl = q('.run-end-skip');
    this.hide();
  }

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
    this.cards = kind === 'victory' ? this.data.victory : this.data.defeat;
    this.index = -1;
    this.timer = 0;
    this.fade = 0;
    this.staticTimer = 0;
    this.el.className = `run-end ${kind}`;
    this.summaryEl.classList.add('hidden');
    this.cardEl.classList.add('hidden');
    this.skipEl.classList.remove('hidden');
    // Defeat fades to black before the voices; victory cuts to its first card.
    this.blackEl.style.opacity = kind === 'victory' ? '1' : '0';
    if (kind === 'victory') this.next();
  }

  hide() {
    this.kind = null;
    this.el.className = 'run-end hidden';
  }

  next() {
    this.index++;
    this.timer = 0;
    if (this.index >= this.cards.length) {
      this.showSummary();
      return;
    }
    const card = this.cards[this.index];
    this.cardEl.className = `run-end-card ${card.style ?? 'line'}`;
    this.captionEl.textContent = card.caption ?? '';
    // A spoken line is quoted, with who says it; the radio's static isn't.
    const spoken = Boolean(card.speaker) && card.speaker !== 'Radio';
    this.textEl.textContent = spoken ? `"${card.text}"` : card.text;
    this.speakerEl.textContent = spoken ? card.speaker.toUpperCase() : '';
  }

  showSummary() {
    this.index = this.cards.length;
    this.cardEl.classList.add('hidden');
    this.skipEl.classList.add('hidden');
    this.summaryEl.classList.remove('hidden');
    this.titleEl.textContent = this.title;
    this.reasonEl.textContent = this.reason ?? '';
    this.tableEl.innerHTML = summaryRows(this.stats, this.nights)
      .map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`)
      .join('');
  }

  // input: the raw controls (A / Enter skips or starts a new run).
  update(dt, input) {
    if (!this.isOpen) return;
    const c = this.cfg;
    const confirm = input.wasPressed('menuConfirm');
    if (this.index >= this.cards.length) {
      if (confirm) this.bus.emit('run:newRequested');
      return;
    }
    // Defeat: the fade to black, the radio's static under the voices.
    if (this.kind === 'defeat') {
      this.fade = Math.min(1, this.fade + dt / c.defeatFadeSeconds);
      this.blackEl.style.opacity = String(this.fade);
      this.staticTimer -= dt;
      if (this.staticTimer <= 0) {
        this.staticTimer = c.staticEvery;
        this.sfx.play('radioStatic');
      }
      if (this.index < 0) {
        if (this.fade >= 1 || confirm) this.next();
        return;
      }
    }
    this.timer += dt;
    this.cardEl.classList.toggle('hidden', false);
    const card = this.cards[this.index];
    const seconds = card.style === 'line' || this.kind === 'defeat' ? c.lineSeconds : c.cardSeconds;
    if (confirm || this.timer >= seconds) this.next();
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
