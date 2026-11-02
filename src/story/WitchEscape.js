// Escaping the witch, early in the run (Session 17, Aaron: "you're not
// really equipped to fight the witch at this point"). Until Tom has crossed
// the cordon, whenever she's attacking him close by:
//  - ESCAPE THE WITCH stands on the screen (the alert slot) for as long as
//    she is;
//  - the family say to get away (Ellen), or, by the outpost before it's
//    cleared, to leave the checkpoint and come back once she's gone; then,
//    if Earl's quad is near and he isn't on it, Wyatt says to take it;
//  - once she's given up on him (her pursuit's short this early), Wyatt
//    says she's gone (and, at the outpost, to get back to it).
// Encounters ask `engaged` to hold their cutscenes and their next waves
// while she's on him (the outpost's dogfight fired when Aaron scoped her).
// The lines are rate-limited: one escape call per `cooldown` seconds.
//
// Events: 'witch:escape' { on }.

export class WitchEscape {
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.ec = cfg.witchEscape;
    this.bus = bus;
  }

  // ctx: { witch, player, progress, dialogue, alert (a Toast), quad, outpost }.
  init(ctx) {
    Object.assign(this, ctx);
    this.engaged = false;
    this.calm = 0; // seconds she's been off him, while engaged
    this.lastCall = -Infinity;
    this.time = 0;
    this.atOutpost = false;
  }

  get early() {
    return !this.progress?.has('crossedCordon');
  }

  // Is she on him right now (attacking, close enough to matter)?
  onHim() {
    const w = this.witch;
    if (!w || w.state !== 'attacking') return false;
    const p = this.player.position;
    return Math.hypot(w.x - p.x, w.z - p.z) < this.ec.range;
  }

  update(dt, playing) {
    if (!playing) return;
    this.time += dt;
    const on = this.early && this.onHim();
    if (on) {
      this.calm = 0;
      this.alert?.show(this.ec.text, 0.5);
      if (!this.engaged) this.start();
      return;
    }
    if (!this.engaged) return;
    this.calm += dt;
    if (this.calm >= this.ec.goneAfter) this.end();
  }

  start() {
    this.engaged = true;
    this.bus.emit('witch:escape', { on: true });
    const o = this.outpost;
    const p = this.player.position;
    this.atOutpost = Boolean(o?.frame && this.progress?.has('outpostCall') && !this.progress?.has('outpostCleared') && Math.hypot(p.x - o.frame.x, p.z - o.frame.z) < this.ec.outpostRange);
    if (this.time - this.lastCall < this.ec.cooldown) return;
    this.lastCall = this.time;
    this.dialogue?.play(this.atOutpost ? 'witch.escape.outpost' : 'witch.escape');
    const q = this.quad;
    if (q && !this.player.riding && Number.isFinite(q.x) && Math.hypot(q.x - p.x, q.z - p.z) < this.ec.quadRange) this.dialogue?.play('witch.escape.quad');
  }

  end() {
    this.engaged = false;
    this.calm = 0;
    this.bus.emit('witch:escape', { on: false });
    this.dialogue?.play(this.atOutpost ? 'witch.gone.outpost' : 'witch.gone');
  }

  overlayLine() {
    return `escape ${this.engaged ? 'ON' : '-'}${this.early ? '' : ' (past the cordon: off)'}`;
  }
}
