// The radio's reach (Session 26; DESIGN.md "The radio", "Comms in the south").
//
// The family can reach Tom on the radio unless:
//  - his radio's smashed: the Mothman's last strike at the crashed plane as
//    it was driven off (flag radioSmashed), until Wyatt hands him the spare
//    at home (radioMended);
//  - he's south of the comms line (config.comms.line), until the Blessing's
//    buried (config.comms.until, a later session's flag). Down there every
//    voice on the radio is the Caller's (story/Caller.js).
// The line has hysteresis: the cut comes south of dz + band, the family come
// back north of dz - band, so stepping about on it can't flicker it.
//
// The pure parts (tested): southOfLine(), commsState().
//
// Events: 'comms:changed' { state, was } ('ok' | 'dead' | 'south').

// With hysteresis: was Tom south of the line (wasSouth), is he now? z: world
// z (south is +z); lineZ: the line's world z.
export function southOfLine(z, lineZ, band, wasSouth) {
  if (wasSouth) return z > lineZ - band;
  return z > lineZ + band;
}

// What the radio can do now: 'dead' (smashed, not mended), 'south' (cut off by
// the interference, not yet ended by the Blessing), else 'ok'. A dead radio
// wins: nothing comes through it at all, not even the Caller.
export function commsState({ smashed = false, mended = false, south = false, blessed = false } = {}) {
  if (smashed && !mended) return 'dead';
  if (south && !blessed) return 'south';
  return 'ok';
}

export class Comms {
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.cc = cfg.comms;
    this.bus = bus;
    this.south = false;
    this.state = 'ok';
  }

  // ctx: { progress, player, homeZ (home's centre, world z), demo }.
  init(ctx) {
    Object.assign(this, ctx);
    this.lineZ = (this.homeZ ?? 0) + this.cc.line.dz;
    this.refresh();
  }

  has(flag) {
    return Boolean(this.progress?.has(flag));
  }

  // Each frame (cheap): where Tom is against the line, and the radio's state.
  update() {
    const z = this.player?.position.z ?? 0;
    this.south = !this.demo?.active && southOfLine(z, this.lineZ, this.cc.line.band, this.south);
    this.refresh();
  }

  refresh() {
    const next = commsState({ smashed: this.has('radioSmashed'), mended: this.has('radioMended'), south: this.south, blessed: this.has(this.cc.until) });
    if (next !== this.state) {
      const was = this.state;
      this.state = next;
      this.bus?.emit('comms:changed', { state: next, was });
    }
  }

  // Can the family's voices get through to Tom now?
  get reachesFamily() {
    return this.state === 'ok';
  }

  // Is this line one the radio can't carry now? A family speaker over the
  // radio while it can't reach (the Caller's own lines carry "caller").
  blocks(line) {
    if (this.state === 'ok' || line.caller) return false;
    return this.cc.family.includes(line.speaker);
  }

  // How far north of the line Tom is (metres; negative once he's over it).
  northOfLine() {
    return this.lineZ - (this.player?.position.z ?? 0);
  }

  // A load or a respawn: Tom's side of the line is worked out afresh.
  reset() {
    const z = this.player?.position.z ?? 0;
    this.south = !this.demo?.active && z > this.lineZ;
    this.refresh();
  }

  overlayLine() {
    return `comms ${this.state}${this.south ? ' (south)' : ''} line ${Math.round(this.northOfLine())}m`;
  }
}
