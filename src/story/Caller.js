// The Caller (Session 26; story spine, beats 3 to 7; DESIGN.md "The Caller",
// "Comms in the south"). Based on the Appalachian rule: never answer when
// your name is called from the trees. It has no body and no model and it
// can't be shot. It's a voice, and fog that moves when it shouldn't.
//
// South of the comms line (story/Comms.js) the family can't reach Tom, and
// until the Blessing is buried every voice down there is the Caller's:
//  - over the radio, in the family's voices (Junie's most of all): begging,
//    lying, calm. The same names and colours as the family's own calls,
//    with the tell the player learns (the subtitle's red double, no crackle
//    but a breath; Subtitles' "caller"), while the HUD says NO SIGNAL;
//  - from the trees: Tom's name called from a direction, a real positional
//    sound (Sfx callerVoice), subtitled with which way it came from, and the
//    ground mist streaming toward the voice against the wind, then rolling
//    out of it toward him (render/wrongFog.js).
// A rate from config.caller.every (more at night). Never while a cutscene,
// a paper, a card or a menu is up (canSpeak), never over another line, and
// never two at once. Ellen warns once as Tom nears the line; the first time
// he crosses it her call is cut off; back north the family are back.
// A story beat can make it call from a place (callFrom: the old church).
//
// Not saved: it's ambient. Off in Demo mode.
//
// Events: 'caller:call' { id, speaker, positional, x, z }.

import { DEBUG } from '../debug/DebugMenu.js';

// ---- the pure parts (tested) ----------------------------------------------------------------

// Seconds until the next call: a random point in the phase's range.
export function nextGap(every, phase, r) {
  const [a, b] = every[phase] ?? every.day;
  return a + (b - a) * r;
}

// Which line: one of `pool` (ids) not in `recent`, picked by r (0..1). If
// every one's recent, the oldest recent one.
export function pickFresh(pool, recent, r) {
  const fresh = pool.filter((id) => !recent.includes(id));
  if (!fresh.length) return recent.find((id) => pool.includes(id)) ?? pool[0] ?? null;
  return fresh[Math.min(fresh.length - 1, Math.floor(r * fresh.length))];
}

// Where a voice from the trees comes from: `dist` metres off at an angle
// from Tom's facing (yaw: the game's, forward = (-sin, -cos)). rel: radians,
// 0 ahead, +pi/2 to his right, pi behind.
export function voicePoint(px, pz, yaw, rel, dist) {
  const a = yaw - rel;
  return { x: px - Math.sin(a) * dist, z: pz - Math.cos(a) * dist };
}

// Which way a sound at (x, z) is from Tom (at px, pz facing yaw), in words.
export function bearingWords(px, pz, yaw, x, z) {
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  const rx = Math.cos(yaw);
  const rz = -Math.sin(yaw);
  const dx = x - px;
  const dz = z - pz;
  const ahead = dx * fx + dz * fz;
  const right = dx * rx + dz * rz;
  const ang = Math.atan2(right, ahead); // 0 ahead, + right
  const deg = (ang * 180) / Math.PI;
  if (Math.abs(deg) <= 35) return 'ahead of you';
  if (Math.abs(deg) >= 145) return 'behind you';
  if (deg > 0) return Math.abs(deg) < 80 ? 'ahead, to your right' : deg < 115 ? 'to your right' : 'behind you, to your right';
  return Math.abs(deg) < 80 ? 'ahead, to your left' : deg > -115 ? 'to your left' : 'behind you, to your left';
}

// The fog's pull t seconds into a call from the trees: { inhale, exhale } 0..1,
// or null once it's over. f: config.caller.fog.
export function fogAt(t, f) {
  if (t < 0) return null;
  const inEnd = f.inhale + f.hold;
  const outEnd = inEnd + f.exhale;
  const end = outEnd + f.fade;
  if (t >= end) return null;
  let inhale = 0;
  let exhale = 0;
  if (t < f.inhale) inhale = t / f.inhale;
  else if (t < inEnd) inhale = 1;
  else if (t < inEnd + 0.8) inhale = 1 - (t - inEnd) / 0.8;
  if (t >= inEnd && t < outEnd) exhale = Math.min(1, (t - inEnd) / 0.8);
  else if (t >= outEnd) exhale = 1 - (t - outEnd) / f.fade;
  return { inhale: Math.max(0, inhale), exhale: Math.max(0, exhale) };
}

export class Caller {
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.kc = cfg.caller;
    this.bus = bus;
    this.recent = [];
    this.fog = null; // the pull on the mist while a call from the trees plays (Atmosphere.wrongFog)
  }

  // ctx: { dialogue, subtitles, comms, progress, player, clock, sfx, atmosphere, demo, interiors, rng() }.
  init(ctx) {
    Object.assign(this, ctx);
    this.rng ??= Math.random;
    const lines = this.dialogue.lines.filter((l) => l.caller && l.callerPool);
    this.pools = { radio: lines.filter((l) => l.callerPool === 'radio').map((l) => l.id), trees: lines.filter((l) => l.callerPool === 'trees').map((l) => l.id) };
    this.bus.on('comms:changed', (e) => this.onComms(e));
    this.reset();
  }

  has(flag) {
    return Boolean(this.progress?.has(flag));
  }

  reset() {
    this.timer = this.firstGap();
    this.call = null; // the call from the trees now: { x, z, t, ... }
    this.setFog(null);
    this.lastBack = -Infinity;
    this.time = 0;
  }

  firstGap() {
    const [a, b] = this.kc.firstAfter;
    return a + (b - a) * this.rng();
  }

  get active() {
    // Not inside an interior (the place beyond has its own voice).
    return this.comms?.state === 'south' && this.has(this.kc.needs) && !this.demo?.active && !this.interiors?.inside;
  }

  // ---- crossing the line ----------------------------------------------------------------------

  onComms({ state, was }) {
    if (this.demo?.active) return;
    if (state === 'south' && was === 'ok') {
      this.timer = this.firstGap();
      this.sfx?.play('radioStatic');
      // The first time: Ellen's call breaks up mid-word (shown past the cut, it's the last thing through).
      const cut = this.dialogue.byId.get('comms.cut.ellen');
      if (cut && !this.dialogue.heard.has(cut.id)) {
        this.subtitles?.clear();
        this.dialogue.show(cut, {}, true);
      }
    } else if (state === 'ok' && was === 'south') {
      this.endCall();
      if (!this.dialogue.heard.has('comms.back.ellen')) this.dialogue.play('comms.back.ellen');
      else if (this.time - this.lastBack > this.kc.backCooldown) this.dialogue.play('comms.back.wyatt');
      this.lastBack = this.time;
    }
  }

  // ---- each frame ---------------------------------------------------------------------------

  // canSpeak: playing, and nothing up over the world (no cutscene, paper, card or menu).
  update(dt, canSpeak) {
    this.time += dt;
    // Ellen's warning, once, as he nears the line (the radio still reaches).
    if (canSpeak && this.comms?.state === 'ok' && this.has(this.kc.needs) && !this.dialogue.heard.has('comms.warn.ellen')) {
      const n = this.comms.northOfLine();
      if (n > 0 && n < this.cfg.comms.warnBefore) this.dialogue.play('comms.warn.ellen');
    }
    if (this.call) this.updateCall(dt);
    if (!this.active || !canSpeak) return;
    if (this.call || this.subtitles?.busy) return;
    this.timer -= dt;
    if (this.timer > 0) return;
    const phase = this.clock?.phase ?? 'day';
    this.timer = nextGap(this.kc.every, phase, this.rng());
    const share = this.kc.positionalShare[phase] ?? this.kc.positionalShare.day;
    if (this.rng() < share) this.fromTrees();
    else this.overRadio();
  }

  remember(id) {
    this.recent.push(id);
    while (this.recent.length > this.kc.avoidRepeat) this.recent.shift();
  }

  // Over the radio, in a family voice.
  overRadio(id = null) {
    const pick = id ?? pickFresh(this.pools.radio, this.recent, this.rng());
    if (!pick) return false;
    this.remember(pick);
    const line = this.dialogue.byId.get(pick);
    this.dialogue.play(pick, {}, true);
    this.bus.emit('caller:call', { id: pick, speaker: line?.speaker, positional: false });
    return true;
  }

  // From the trees: somewhere round Tom (behind him, as often as not).
  fromTrees(id = null) {
    const p = this.player.position;
    const behind = this.rng() < this.kc.behindBias;
    const rel = behind ? Math.PI + (this.rng() - 0.5) * 1.6 : (this.rng() * 2 - 1) * Math.PI;
    const [d0, d1] = this.kc.distance;
    const at = voicePoint(p.x, p.z, this.player.yaw, rel, d0 + (d1 - d0) * this.rng());
    return this.callFrom(at, id);
  }

  // A call from a place (a story beat's: inside the old church). dirText:
  // the words under the line, else which way it is from Tom.
  callFrom(at, id = null, dirText = null) {
    const pick = id ?? pickFresh(this.pools.trees, this.recent, this.rng());
    if (!pick) return false;
    this.remember(pick);
    const line = this.dialogue.byId.get(pick);
    const p = this.player.position;
    const dir = dirText ?? `From the trees, ${bearingWords(p.x, p.z, this.player.yaw, at.x, at.z)}`;
    this.calls = (this.calls ?? 0) + 1;
    this.call = { n: this.calls, x: at.x, z: at.z, t: 0, id: pick, voiced: false, speaker: line?.speaker ?? 'junie', dir };
    this.bus.emit('caller:call', { id: pick, speaker: line?.speaker, positional: true, x: at.x, z: at.z });
    return true;
  }

  // The call plays out: the mist starts pulling toward the voice, the voice
  // comes a beat later (so the player sees the fog move first), then the bank rolls out.
  updateCall(dt) {
    const c = this.call;
    c.t += dt;
    if (!c.voiced && c.t >= this.kc.fog.inhale * 0.6) {
      c.voiced = true;
      this.sfx?.play('callerVoice', { x: c.x, z: c.z, range: this.kc.voiceRange, pitch: this.kc.voices[c.speaker] ?? 1 });
      this.dialogue.play(c.id, { dir: c.dir }, false);
    }
    const f = fogAt(c.t, this.kc.fog);
    if (!f) {
      this.endCall();
      return;
    }
    const p = this.player.position;
    const g = this.kc.fog;
    this.setFog({ id: c.n, x: c.x, z: c.z, tx: p.x, tz: p.z, inhale: f.inhale, exhale: f.exhale, radius: g.radius, speed: g.speed, amount: g.amount, reverse: g.reverse, gather: g.gather, spread: g.spread, bank: g.bank });
  }

  endCall() {
    this.call = null;
    this.setFog(null);
  }

  setFog(pull) {
    this.fog = pull;
    if (this.atmosphere) this.atmosphere.wrongFog = pull;
  }

  // ---- debug ----------------------------------------------------------------------------------

  addDebugItems(menu) {
    const cat = menu.category(DEBUG.story);
    cat.addItem(() => `The Caller: ${this.active ? `on, next in ${Math.max(0, Math.round(this.timer))}s` : 'off (north of the comms line, or Junie not taken)'}`, () => (this.timer = 0));
    cat.addItem('The Caller: a call from the trees now', () => this.fromTrees());
    cat.addItem('The Caller: a call over the radio now', () => this.overRadio());
    cat.addItem('Comms: take me just south of the comms line (Junie taken)', () => {
      this.progress?.setFlag('junieTaken');
      const p = this.player.position;
      this.player.teleport(p.x, this.comms.lineZ + this.cfg.comms.line.band + 20);
    });
  }

  overlayLine() {
    return `caller ${this.active ? 'on' : 'off'} ${this.call ? `call ${this.call.t.toFixed(1)}s` : `next ${Math.max(0, this.timer).toFixed(0)}s`}`;
  }
}
