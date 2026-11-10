// Session 23 (Aaron): a gun found with its slot full asks what to do, instead
// of going to the rack by itself. The hunting rifle at the gas station's safe
// went to the rack every run (the shotgun and service rifle fill both long-gun
// slots by then), so Tom reached the outpost without the scope its dogfight
// needs. Now: take it and leave one of the guns in that slot (that one goes to
// the comms room's rack, its rounds kept), or send the new one to the rack.
// It holds the world like an inspect card. D-pad / arrows move, A / Enter
// picks; B / Esc sends it to the rack. Taps and clicks pick too.
//
// ctx: { weapons (player/Weapons.js), notify(text), sfx }.

import { swapCandidates } from '../player/loadout.js';

const GRACE_MS = 250;
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

// The choices for gun `id`, found with its slot full (exported for the tests):
// one row per carried gun in its slot, then the rack. { id, label, note, out }.
export function gunChoiceRows(weaponsCfg, order, id) {
  const L = weaponsCfg.loadout;
  const name = (x) => weaponsCfg[x]?.name ?? x;
  const rows = swapCandidates(L, order, id).map((out) => ({
    id: `leave-${out}`,
    label: `Take it, leave the ${name(out).toLowerCase()}`,
    note: `the ${name(out).toLowerCase()} goes to ${L.rackName}`,
    out,
  }));
  rows.push({ id: 'rack', label: `Send it to ${L.rackName}`, note: 'take it down there later', out: null });
  return rows;
}

export class GunChoice {
  constructor(weaponsCfg) {
    this.cfg = weaponsCfg;
    this.isOpen = false;
    this.pending = []; // guns waiting to be asked about (one at a time)
    this.rows = [];
    this.focus = 0;
  }

  init(root, ctx) {
    this.weapons = ctx.weapons;
    this.notify = ctx.notify;
    this.sfx = ctx.sfx;
    if (typeof document === 'undefined' || !root) return;
    this.el = document.createElement('div');
    this.el.className = 'pause gun-choice hidden';
    this.el.innerHTML = `
      <div class="pause-panel">
        <h2 class="pause-title gun-choice-title"></h2>
        <p class="gun-choice-line"></p>
        <div class="pause-choices"></div>
        <p class="pause-hint"></p>
      </div>
    `;
    root.appendChild(this.el);
    this.titleEl = this.el.querySelector('.gun-choice-title');
    this.lineEl = this.el.querySelector('.gun-choice-line');
    this.choicesEl = this.el.querySelector('.pause-choices');
    this.hintEl = this.el.querySelector('.pause-hint');
    this.onPointerUp = (e) => {
      if (!this.isOpen) return;
      e.preventDefault();
      e.stopPropagation();
      const b = e.target.closest('[data-choice]');
      if (b) this.pick(b.dataset.choice);
    };
    this.el.addEventListener('pointerup', this.onPointerUp);
  }

  // A gun just found with no room for it (it's already on the rack: Weapons.take()).
  ask(id) {
    if (!this.pending.includes(id) && this.id !== id) this.pending.push(id);
  }

  open(id, device) {
    const w = this.weapons;
    this.rows = gunChoiceRows(this.cfg, w.order, id);
    if (this.rows.length < 2) return false; // nothing to swap: it stays on the rack
    this.id = id;
    this.isOpen = true;
    this.openedAt = now();
    this.device = device ?? 'gamepad';
    this.focus = 0;
    this.render();
    this.el?.classList.remove('hidden');
    return true;
  }

  close() {
    this.isOpen = false;
    this.id = null;
    this.el?.classList.add('hidden');
  }

  render() {
    if (!this.el) return;
    const name = this.cfg[this.id]?.name ?? this.id;
    this.titleEl.textContent = name.toUpperCase();
    this.lineEl.textContent = "No room for it: you're carrying two long guns already.";
    this.choicesEl.innerHTML = this.rows
      .map((r, i) => `<button type="button" class="start-choice${i === this.focus ? ' focused' : ''}" data-choice="${r.id}">${r.label}<span class="start-note">${r.note}</span></button>`)
      .join('');
    const pad = this.device !== 'keyboardMouse';
    this.hintEl.textContent = pad ? 'D-pad: move · A: pick · B: send it to the rack' : 'Arrows: move · Enter: pick · Esc: send it to the rack';
  }

  move(step) {
    const n = this.rows.length;
    this.focus = (this.focus + step + n) % n;
    this.render();
  }

  pick(choice) {
    const row = this.rows.find((r) => r.id === choice);
    if (!row || !this.isOpen) return;
    const id = this.id;
    const w = this.weapons;
    const L = this.cfg.loadout;
    const name = (x) => (this.cfg[x]?.name ?? x).toLowerCase();
    this.close();
    if (row.out && w.swap(id, row.out)) {
      w.select(w.order.indexOf(id));
      this.sfx?.play('loaded');
      this.notify?.(`The ${name(row.out)}: sent to ${L.rackName}`);
    } else {
      this.notify?.(`${this.cfg[id]?.name ?? id}: sent to ${L.rackName}`);
    }
  }

  // Before the world's step, once no card or paper is up. Returns true while it holds the game.
  update(input, free = true) {
    if (!this.isOpen) {
      if (!free || !this.pending.length) return false;
      if (!this.open(this.pending.shift(), input?.activeDevice)) return false;
      return true;
    }
    if (input.activeDevice && input.activeDevice !== this.device) {
      this.device = input.activeDevice;
      this.render();
    }
    if (now() - this.openedAt < GRACE_MS) return true; // the hold that found it mustn't pick
    if (input.wasPressed('menuUp')) this.move(-1);
    else if (input.wasPressed('menuDown')) this.move(1);
    else if (input.wasPressed('menuConfirm')) {
      input.swallowHeld?.();
      this.pick(this.rows[this.focus].id);
    } else if (input.wasPressed('menuBack')) {
      input.swallowHeld?.();
      this.pick('rack');
    }
    return this.isOpen;
  }

  dispose() {
    this.el?.removeEventListener('pointerup', this.onPointerUp);
    this.el?.remove();
  }
}
