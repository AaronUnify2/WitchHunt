// A stop at home on the way back from the storm shelter (Session 18,
// Aaron: "when you drive from Earl Pruitt's storm shelter back past the
// ranger station, there should be a prompt to upgrade the fences and top
// up the battery on the way past"). The shelter's east of home and the gas
// station west, so the ride back to the safe goes past the gate.
//
// Once Earl's combination is in hand (and the safe's not open yet):
//  - nearing home (within `callDistance` of the compound's centre, outside
//    the fence), Wyatt radios: stop in, the fence could use the scrap and a
//    battery (once);
//  - inside the fence: the stop's made (the flag `homeStop`); Ellen says
//    what to do (the ledger in the comms room, a battery in the fence box),
//    and a hint on screen says the same;
//  - riding on to the gas station without stopping counts too (the flag's
//    set there, so the objective never points back).
// The objective's step ('homeStop') sits between the shelter's room and the
// safe (story/Objectives.js).
//
// Events: 'homeStop:called', 'homeStop:made'.

export class HomeStop {
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.hc = cfg.homeStop;
    this.bus = bus;
  }

  // ctx: { player, station, gasStation, progress, dialogue, hint(pad, key), combat }.
  init(ctx) {
    Object.assign(this, ctx);
    this.called = false;
  }

  // Due: the combination's in hand, the safe's shut, the stop not made.
  get due() {
    const p = this.progress;
    return Boolean(p?.has('earlCombination') && !p.has('rifleClaimed') && !p.has('homeStop'));
  }

  update(dt, playing) {
    if (!playing || !this.due) return;
    const L = this.station?.layout;
    if (!L) return;
    const p = this.player.position;
    const d = Math.hypot(p.x - L.centre.x, p.z - L.centre.z);
    if (d < L.radius - this.hc.insideMargin) {
      this.make();
      return;
    }
    if (!this.called && d < this.hc.callDistance) {
      this.called = true;
      this.dialogue?.play('home.stop.call');
      this.bus.emit('homeStop:called');
    }
    // On past home to the gas station without stopping: it's skipped, never pointed back to.
    const gas = this.gasStation;
    if (gas?.frame && Math.hypot(p.x - gas.frame.x, p.z - gas.frame.z) < gas.frame.radius) this.progress.setFlag('homeStop');
  }

  make() {
    this.progress.setFlag('homeStop');
    const battery = (this.combat?.inventory?.batteries ?? 0) > 0;
    this.dialogue?.play(battery ? 'home.stop.battery' : 'home.stop.ledger');
    this.hint?.(this.hc.hintPad, this.hc.hintKey);
    this.bus.emit('homeStop:made');
  }

  saveState() {
    return { called: this.called };
  }

  loadState(d) {
    this.called = Boolean(d?.called);
  }

  overlayLine() {
    return `homeStop ${this.progress?.has('homeStop') ? 'made' : this.due ? (this.called ? 'called' : 'due') : '-'}`;
  }
}
