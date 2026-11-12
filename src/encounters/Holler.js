// The moonshiners' holler (an optional encounter; Session 29; DESIGN.md
// "Moonshiners' holler"; the ground: world/hollerGround.js; the set:
// world/HollerSite.js; the traps: combat/hollerTraps.js; the texts:
// data/holler.json). A quiet trap puzzle up a dark, narrow hollow, serious in
// tone: the Rigsbys' still, strung shut against the law.
//
//  1. The traps up the floor: read them (the first of each kind gets a
//     line), step over the lines, disarm them with X (the lines need the
//     wire cutters), or lead the dead into them.
//  2. The lookout halfway up: the wire cutters in the tackle box (a tool on
//     the belt from then on).
//
// Saved through story flags (data/progress.json): FLAGS below and one per
// trap (combat/hollerTraps.js trapFlag). reset() works out the rest. Off in
// Demo mode.
//
// Events: the traps' ('holler:trap', 'holler:alarm', 'holler:disarmed', 'holler:freed').

import { HoldAction } from '../player/HoldAction.js';
import { DEBUG } from '../debug/DebugMenu.js';
import { HollerTraps, trapFlag } from '../combat/hollerTraps.js';
import data from '../data/holler.json';

export const FLAGS = ['wireCuttersTaken'];

export class Holler {
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.hc = cfg.holler;
    this.ec = cfg.holler.encounter;
    this.bus = bus;
    this.hud = { prompt: '', progress: 0 };
    this.data = data;
    this.traps = new HollerTraps(this.hc, bus);
  }

  // ctx: { scene, site (HollerSite), player, combat, enemies, cutscenes, dialogue, subtitles,
  // progress, lore, paper, card, clock, demo, notify, rng() }.
  init(ctx) {
    Object.assign(this, ctx);
    this.rng ??= Math.random;
    this.sfx = this.combat.sfx;
    this.hold = new HoldAction(this.cfg.station.hold.releaseDrain);
    this.hold.init();
    if (this.ready) this.traps.init({ site: this.site, player: this.player, combat: this.combat, enemies: this.enemies, progress: this.progress, sfx: this.sfx, notify: this.notify, texts: data.traps });
    this.bus.on('player:respawned', () => this.reset());
    this.reset();
  }

  get ready() {
    return Boolean(this.site?.ready);
  }

  has(flag) {
    return Boolean(this.progress?.has(flag));
  }

  set(flag) {
    if (flag) this.progress?.setFlag(flag);
  }

  spot(name) {
    return this.site.spots[name];
  }

  distance() {
    const p = this.player.position;
    return Math.hypot(p.x - this.site.place.x, p.z - this.site.place.z);
  }

  get cutters() {
    return this.has('wireCuttersTaken');
  }

  reset() {
    this.later = [];
    if (!this.ready) return;
    this.traps.reset();
    this.site.show('cutters', !this.has('wireCuttersTaken'));
  }

  // ---- each frame ---------------------------------------------------------------------------

  update(dt, input, playing, canInteract) {
    if (!this.ready || this.demo?.active) return;
    if (playing) this.tickLater(dt);
    const d = this.distance();
    if (d < this.site.place.radius + 30) this.traps.update(dt, playing);
    if (canInteract && input && playing && d < this.site.place.radius + 8) this.updateInteraction(dt, input);
    else {
      this.hud.prompt = '';
      this.hud.progress = 0;
      this.hold.update(dt, null, false, 1);
    }
  }

  // ---- hold X ---------------------------------------------------------------------------------

  updateInteraction(dt, input) {
    this.device = input.activeDevice;
    const X = input.activeDevice === 'gamepad' ? 'X' : 'E';
    const best = this.pick(X);
    const key = best?.act ? best.key : null;
    const done = this.hold.update(dt, key, input.isDown('interact'), best?.seconds ?? 1);
    if (done && best?.act) best.act();
    this.hud.prompt = best ? (this.hold.active && best.busy ? best.busy : best.prompt) : '';
    this.hud.progress = this.hold.key !== null ? this.hold.progress : 0;
  }

  // The nearest thing to do: { key, prompt, busy, seconds, act } (act null: only to read).
  pick(X) {
    const p = this.player.position;
    const r = this.ec.interactRange;
    const H = this.ec.holds;
    const dist = (q) => (q ? Math.hypot(p.x - q.x, p.z - q.z) : Infinity);
    const opt = (key, def, seconds, act) => ({ key, prompt: `Hold ${X}: ${def.prompt}`, busy: def.busy, seconds, act });
    // A trap holding him: nothing else.
    const traps = this.traps.options(X, this.cutters);
    if (this.traps.held) return traps[0];
    const cands = traps.map((o) => ({ dd: o.dd, o }));
    const add = (q, reach, o) => {
      const dd = dist(q);
      if (dd < reach) cands.push({ dd, o });
    };
    if (!this.has('wireCuttersTaken')) add(this.spot('cutters'), r + 0.2, opt('cutters', data.cutters, H.cutters, () => this.takeCutters()));
    add(this.spot('sign'), r + 0.6, { key: 'sign', prompt: data.sign, act: null });
    if (!cands.length) return null;
    cands.sort((a, b) => a.dd - b.dd);
    return cands[0].o;
  }

  // ---- what each does ------------------------------------------------------------------------

  takeCutters() {
    this.set('wireCuttersTaken');
    this.site.show('cutters', false);
    this.sfx?.play('pickup');
    this.notify?.(data.cutters.text);
  }

  // ---- a little timer on game time ---------------------------------------------------------------

  after(seconds, fn) {
    this.later.push({ t: seconds, fn });
  }

  tickLater(dt) {
    if (!this.later.length) return;
    for (const l of this.later) l.t -= dt;
    const due = this.later.filter((l) => l.t <= 0);
    this.later = this.later.filter((l) => l.t > 0);
    for (const l of due) l.fn();
  }

  // ---- debug ----------------------------------------------------------------------------------

  allFlags() {
    return [...FLAGS, ...this.hc.traps.filter((t) => !t.sprung).map((t) => trapFlag(t.id))];
  }

  addDebugItems(menu) {
    const cat = menu.category(DEBUG.story);
    cat.addItem(() => `Holler: take me there (${this.allFlags().filter((f) => this.has(f)).length}/${this.allFlags().length})`, () => {
      if (!this.ready) return;
      const a = this.site.at(0, this.cfg.map.holler.mouth - 6);
      this.player.teleport(a.x, a.z, Math.atan2(-Math.sin(this.site.place.yaw), -Math.cos(this.site.place.yaw)));
    });
    cat.addItem('Holler: start it again (flags cleared, traps set)', () => {
      for (const f of this.allFlags()) this.progress?.setFlag(f, false);
      this.reset();
    });
    cat.addItem('Holler: give me the wire cutters', () => {
      this.set('wireCuttersTaken');
      this.reset();
    });
  }

  overlayLine() {
    if (!this.ready) return 'holler -';
    return `holler ${this.traps.overlayLine()}${this.cutters ? ' cutters' : ''}`;
  }

  dispose() {}
}
