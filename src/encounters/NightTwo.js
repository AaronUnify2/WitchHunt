// Night 2 at the station (Round 2, Aaron's play-test of Nov 13: "you return to the compound... and
// you spend the evening there, fighting a much bigger wave of zombies... throw some of the new types
// of zombies... This also gives us a chance to use the electric fence and introduce new enemy types").
// The second night is a real, scripted defence, as Night 1 was the first small one.
//
//  1. Homeward (the hunting rifle and Wyatt's lever-action out of Earl's safe: rifleClaimed). The
//     goal is home. Dusk waits a while for Tom (the clock holds at the end of dusk, config
//     night2.holdMax); if he walks in by day, the day fades to dusk as he comes through the gate.
//  2. Prep (night2Prep), once he's inside the fence: Ellen's word on the board, Wyatt up the tower
//     with Earl's lever gun, a box of the station's rifle rounds; `prepMax` at most to put a battery in
//     the fence box and spend scrap at the ledger. Then night.
//  3. The night (night2Started), in three acts:
//      - a horde up the campground trail, and a second group from the south behind it;
//      - two mutants, one from each side, each with a few of the dead round it;
//      - the Screamer at the treeline south of the gate, calling more in every few seconds until
//        it's put down (ai/Screamers.js).
//     The clock holds short of dawn until it's over.
//  4. After: the camera at the Pruitts' family plot (held back while the fight was on) has caught
//     the witch burying another; the family's talk; the night fades to dawn (night2Done). At that
//     dawn Ellen sends Tom to the military checkpoint (Outpost.call: it used to come at the safe).
//
// Saved through story flags (night2Prep, night2Started, night2Done). A night under way when the run
// is saved starts again from its first act. Off in Demo mode.
//
// Events: 'night2:prep', 'night2:started', 'night2:act' { index }, 'night2:done'.

import { zoneOf } from '../base/stationLayout.js';
import { DEBUG } from '../debug/DebugMenu.js';

export const NIGHT2_FLAGS = ['night2Prep', 'night2Started', 'night2Done'];

// ---- the pure parts (tested) ----------------------------------------------------------------

// How many of the dead the night sends before the Screamer's calls (pure): the hordes, the mutants' escorts.
export function night2Count(n) {
  return n.horde.count + n.horde.second + n.mutants.escort * n.mutants.sides.length;
}

// Is act 2 due? left: act 1's dead still up; t: seconds since act 1's second group.
export function act2Due(left, t, n) {
  return left <= n.mutants.whenLeft || t >= n.mutants.after;
}

// Is act 3 due? mutantsLeft: how many of the two still stand; t: seconds since the second mutant.
export function act3Due(mutantsLeft, t, n) {
  return mutantsLeft === 0 || t >= n.screamer.after;
}

// Is the night over? screamerDone: it was sent and is down; left: the living near home.
export function night2Over({ screamerSent, screamerAlive, left, endLeft, t, timeout }) {
  return (screamerSent && !screamerAlive && left <= endLeft) || t >= timeout;
}

export class NightTwo {
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.nc = cfg.night2;
    this.bus = bus;
  }

  // ctx: { station, enemies, world, player, clock, combat, progress, dialogue, subtitles, cutscenes, screamers,
  // sniper, trailCams, nightWatch, demo, sfx, notify, skipToPhase(name) }.
  init(ctx) {
    Object.assign(this, ctx);
    this.unsubscribers = [
      this.bus.on('fade:mid', ({ id } = {}) => this.onFadeMid(id)),
      this.bus.on('screamer:screamed', () => this.onScream()),
      this.bus.on('screamer:down', () => this.onScreamerDown()),
    ];
    // The forecast shows what's coming (the forecast must match what happens).
    this.nightWatch?.scripted?.push(() => this.forecastPart());
    // The family plot's camera doesn't call while the fence is being fought over.
    if (this.trailCams) this.trailCams.holdReports = () => this.state === 'prep' || this.state === 'night' || (this.state === 'after' && this.afterT > 0);
    // The handover on the tower's platform (Station.pickInteraction asks).
    if (this.station) this.station.towerOffer = (X) => this.towerOffer(X);
    this.reset();
  }

  has(flag) {
    return Boolean(this.progress?.has(flag));
  }

  set(flag) {
    this.progress?.setFlag(flag);
  }

  // As the flags say (a night under way starts again from prep).
  reset() {
    this.restoreOverrun();
    this.state = this.has('night2Done') ? 'done' : 'idle';
    if (!this.has('night2Done')) {
      this.progress?.setFlag('night2Started', false);
      this.progress?.setFlag('night2Prep', false);
      this.progress?.setFlag('wyattArmed', false); // (the handover's part of the night: it comes again)
    }
    this.t = 0;
    this.act = 0;
    this.actT = 0;
    this.prepT = 0;
    this.held = 0;
    this.first = [];
    this.mutants = [];
    this.screamer = null;
    this.screamerSent = false;
    this.afterT = -1;
    this.fading = null;
    this.said = new Set();
    if (this.sniper) this.sniper.force = false;
  }

  get active() {
    return this.state === 'prep' || this.state === 'night' || this.state === 'after';
  }

  // The Screamer's zombie while it's up (the goal's marker).
  get screamerAt() {
    const z = this.screamer?.z;
    return z?.alive ? { x: z.x, z: z.z } : null;
  }

  // ---- each frame ------------------------------------------------------------------------------

  update(dt, playing) {
    if (!playing || this.demo?.active || this.state === 'done') return;
    if (this.state === 'idle') {
      if (!this.has('rifleClaimed')) return;
      this.state = 'homeward';
    }
    if (this.state === 'homeward') this.updateHomeward(dt);
    else if (this.state === 'prep') this.updatePrep(dt);
    else if (this.state === 'night') this.updateNight(dt);
    else if (this.state === 'after') this.updateAfter(dt);
  }

  home() {
    const p = this.player.position;
    return zoneOf(this.station.layout, p.x, p.z) >= 1;
  }

  // The clock stops `margin` seconds short of the end of `phase` (as Day 1 and Night 1 hold theirs).
  holdPhase(phase, margin) {
    const c = this.clock;
    if (c.phase !== phase) return false;
    const at = c.currentPhase.seconds - margin;
    if (c.phaseElapsed > at) {
      c.phaseElapsed = at;
      return true;
    }
    return false;
  }

  // 1: the way home. Dusk waits for him a while.
  updateHomeward(dt) {
    if (this.held < this.nc.holdMax && this.holdPhase('dusk', 2)) this.held += dt;
    if (!this.said.has('homeward') && !this.cutscenes?.active) {
      this.said.add('homeward');
      this.dialogue?.play('night2.homeward');
    }
    if (!this.home() || this.cutscenes?.active || this.fading) return;
    const ph = this.clock.phase;
    if (ph === 'day' || ph === 'dawn') {
      // In by daylight: the day goes to dusk as he comes through the gate.
      this.fading = 'dusk';
      if (!this.cutscenes?.play('fade.nightfall', { onDone: () => this.fadeDone('dusk') })) this.fadeDone('dusk');
      return;
    }
    this.startPrep();
  }

  onFadeMid() {
    if (!this.fading) return;
    this.applyFade();
  }

  applyFade() {
    const to = this.fading;
    if (!to || this.faded === to) return;
    this.faded = to;
    this.skipToPhase?.(to);
  }

  fadeDone(to) {
    if (this.fading !== to) return;
    this.applyFade();
    this.fading = null;
    this.faded = null;
    if (to === 'dusk') this.startPrep();
    if (to === 'night') this.start();
    if (to === 'dawn') this.finish();
  }

  // 2: inside the fence. A little time to get ready.
  startPrep() {
    if (this.state !== 'homeward') return;
    this.state = 'prep';
    this.prepT = 0;
    this.set('night2Prep');
    if (this.sniper) this.sniper.force = true;
    // SCAFFOLDING for the first play-tests (config night2.cantFall): the station can't be overrun tonight.
    // The numbers are untried, and an untuned set piece shouldn't end a run. The dead still break in and hurt Tom.
    if (this.nc.cantFall && this.station.overrunEnabled) {
      this.station.overrunEnabled = false;
      this.heldOut = true;
    }
    const w = this.combat?.weapons;
    if (w && this.nc.reserveRounds > 0) {
      w.addAmmo('rifle', this.nc.reserveRounds);
      this.combat.hud?.pickup?.(`+${this.nc.reserveRounds} rifle rounds: the station's reserve`);
    }
    this.dialogue?.play('night2.prep.ellen');
    this.dialogue?.play('night2.prep.wyatt');
    this.bus.emit('night2:prep');
  }

  // Aaron (Nov 14): "a story beat when you get back to the ranger station where you hand over the rifle to
  // Wyatt. Climb up in the tower, hand over the rifle, and then nighttime begins." The dusk holds while Tom
  // gets ready (a battery, his scrap); Wyatt waits on the tower; the night falls when the lever gun's in his
  // hands (handOver, from the tower's top: Station.towerOffer). Left too long (prepMax, or prepLate if it's
  // night already), Wyatt comes for it himself and the night begins anyway.
  updatePrep(dt) {
    this.prepT += dt;
    this.holdPhase('dusk', 2);
    if (this.cutscenes?.active || this.fading) return;
    const n = this.nc;
    if (!this.said.has('ask') && this.prepT > n.askAfter && !this.subtitles?.busy) {
      this.said.add('ask');
      this.dialogue?.play('night2.prep.ask');
    }
    const late = this.clock.phase === 'night';
    if (this.prepT < (late ? n.prepLate : n.prepMax)) return;
    this.handOver(false);
  }

  // The offer on the tower's platform while he's getting ready.
  towerOffer(X) {
    if (this.state !== 'prep' || this.fading || this.has('wyattArmed')) return null;
    return { key: 'give-rifle', prompt: `Hold ${X}: hand Wyatt Earl's rifle`, seconds: this.nc.handSeconds, act: () => this.handOver(true) };
  }

  // The lever gun changes hands, and the light goes. byHand: Tom gave it to him up the tower.
  handOver(byHand) {
    if (this.state !== 'prep' || this.fading) return;
    this.set('wyattArmed');
    this.combat?.sfx?.play('loaded', this.player.position);
    this.dialogue?.play(byHand ? 'night2.hand.wyatt' : 'night2.hand.late');
    this.dialogue?.play('night2.hand.ellen');
    this.bus.emit('night2:handover', { byHand });
    if (this.clock.phase === 'night') {
      this.start();
      return;
    }
    this.fading = 'night';
    if (!this.cutscenes?.play('fade.nightfall', { onDone: () => this.fadeDone('night') })) this.fadeDone('night');
  }

  // 3: the night.
  start() {
    if (this.state === 'night') return;
    this.state = 'night';
    this.t = 0;
    this.act = 0;
    this.actT = 0;
    this.set('night2Started');
    if (this.clock.phase !== 'night') this.skipToPhase?.('night');
    this.nightWatch?.closeForecast?.();
    this.notify?.('Night. They are coming');
    this.bus.emit('night2:started');
  }

  updateNight(dt) {
    const n = this.nc;
    this.t += dt;
    this.actT += dt;
    this.holdPhase('night', n.holdBeforeDawn);
    const alive = (list) => list.filter((z) => z.alive).length;
    if (this.act === 0 && this.t >= n.horde.first) {
      this.act = 1;
      this.actT = 0;
      this.first.push(...this.sendGroup(this.pathAngle(), n.horde.out, n.horde.count));
      this.dialogue?.play('night2.horde.wyatt');
      this.bus.emit('night2:act', { index: 1 });
    }
    if (this.act === 1 && !this.said.has('second') && this.actT >= n.horde.secondAfter) {
      this.said.add('second');
      this.first.push(...this.sendGroup(0, n.horde.out, n.horde.second));
      this.secondT = 0;
    }
    if (this.act === 1 && this.said.has('second')) {
      this.secondT += dt;
      if (act2Due(alive(this.first), this.secondT, n)) {
        this.act = 2;
        this.actT = 0;
        this.mutantIndex = 0;
        this.bus.emit('night2:act', { index: 2 });
      }
    }
    if (this.act === 2) {
      const m = n.mutants;
      if (this.mutantIndex < m.sides.length && this.actT >= this.mutantIndex * m.gap) {
        const side = m.sides[this.mutantIndex];
        const a = (side * Math.PI) / 180;
        const at = this.ringPoint(a, m.out);
        const z = this.enemies.spawnZombie(at.x, at.z, { kind: 'mutant', mode: 'chase', facing: a + Math.PI, authored: 'night2' });
        if (z) {
          z.maxHealth = m.health;
          z.health = m.health;
          const p = this.player.position;
          this.enemies.brain.chase(z, p.x, p.z, 60);
          this.mutants.push(z);
        }
        this.sendGroup(a, m.out + 4, m.escort);
        this.dialogue?.play(this.mutantIndex === 0 ? 'night2.mutant.ellen' : 'night2.mutant.wyatt');
        this.mutantIndex++;
        if (this.mutantIndex === m.sides.length) this.lastMutantT = 0;
      }
      if (this.mutantIndex >= m.sides.length) {
        this.lastMutantT += dt;
        if (act3Due(alive(this.mutants), this.lastMutantT, n)) {
          this.act = 3;
          this.actT = 0;
          const a = (n.screamer.side * Math.PI) / 180;
          const at = this.ringPoint(a, n.screamer.out);
          const L = this.station.layout;
          this.screamer = this.screamers?.spawn(at.x, at.z, { faceX: L.centre.x, faceZ: L.centre.z, authored: 'night2' }) ?? null;
          this.screamerSent = true;
          this.bus.emit('night2:act', { index: 3 });
        }
      }
    }
    const L = this.station.layout;
    const left = this.enemies.living.filter((z) => z.alive && Math.hypot(z.x - L.centre.x, z.z - L.centre.z) < n.nearHome).length;
    if (night2Over({ screamerSent: this.screamerSent, screamerAlive: Boolean(this.screamer?.z?.alive), left, endLeft: n.endLeft, t: this.t, timeout: n.timeout })) this.over();
  }

  onScream() {
    if (this.state !== 'night' || this.said.has('scream')) return;
    this.said.add('scream');
    this.notify?.('Something at the treeline is screaming, and they answer it. Put it down');
    this.dialogue?.play('night2.screamer.junie');
    this.dialogue?.play('night2.screamer.ellen');
  }

  onScreamerDown() {
    if (this.state !== 'night') return;
    this.dialogue?.play('night2.screamer.down');
  }

  // The bearing of the campground trail from the fence's middle (0 = due south, + toward east).
  pathAngle() {
    const home = this.world.home;
    const c = this.station.layout.centre;
    const path = this.world.map.paths.find((p) => p.cluster && (this.world.map.clearings[p.a].key === 'campsite' || this.world.map.clearings[p.b].key === 'campsite') && (p.a === home.id || p.b === home.id));
    const q = (path?.points ?? []).find((pt) => Math.hypot(pt.x - home.x, pt.z - home.z) >= 60) ?? { x: home.x - 60, z: home.z + 20 };
    return Math.atan2(q.x - c.x, q.z - c.z);
  }

  // A point at bearing `a`, `out` metres past the fence, on the ground the dead can stand on.
  ringPoint(a, out) {
    const L = this.station.layout;
    // Never north of the fence's ends (the cliff): swing toward due south until it's clear.
    let b = Math.max(-1.9, Math.min(1.9, a));
    for (let i = 0; i < 12; i++) {
      const p = { x: L.centre.x + Math.sin(b) * (L.radius + out), z: L.centre.z + Math.cos(b) * (L.radius + out) };
      const q = this.world.ground.clamp({ ...p });
      if (Math.hypot(q.x - p.x, q.z - p.z) < 3) return q;
      b *= 0.85;
    }
    return { x: L.centre.x, z: L.centre.z + L.radius + out };
  }

  // `count` of the dead risen together at bearing `a`, marching on the fence as one.
  sendGroup(a, out, count) {
    const at = this.ringPoint(a, out);
    const list = [];
    for (let i = 0; i < count; i++) {
      this.enemies.spawnPlanned({ type: 'single', count: 1 }, at.x, at.z, { ringMin: 0, ringMax: 6, mix: this.world.variantMixAt(at.x, at.z), mode: 'march', rise: true, out: list });
    }
    for (const z of list) z.authored = 'night2';
    if (list.length) this.enemies.formMarch(list, { leader: null, radius: this.cfg.zombies.horde.radius });
    return list;
  }

  restoreOverrun() {
    if (!this.heldOut) return;
    this.heldOut = false;
    if (this.station) this.station.overrunEnabled = true;
  }

  // 4: it's over. The camera's call, the talk, the fade.
  over() {
    if (this.state !== 'night') return;
    this.state = 'after';
    this.afterT = this.nc.afterDelay;
    this.restoreOverrun();
    // What's left of tonight's dead are strays now (dawn thins them like any).
    for (const z of this.enemies.living) if (z.authored === 'night2') z.authored = null;
    this.notify?.('The yard goes quiet');
  }

  updateAfter(dt) {
    this.holdPhase('night', this.nc.holdBeforeDawn);
    if (this.cutscenes?.active || this.fading) return;
    if (this.afterT > 0) {
      this.afterT -= dt;
      if (this.afterT > 0) return;
      // The family plot's camera, held back while the fight was on; else the family's own word.
      const camera = this.trailCams?.releaseHeld?.() ?? false;
      this.dialogue?.play(camera ? 'night2.after.camera' : 'night2.after.ellen');
      this.dialogue?.play('night2.after.wyatt');
      this.talkT = this.nc.talkMin;
      return;
    }
    this.talkT -= dt;
    if (this.talkT > 0 || this.subtitles?.busy || this.dialogue?.pending?.length) return;
    this.fading = 'dawn';
    if (!this.cutscenes?.play('fade.dawn', { onDone: () => this.fadeDone('dawn') })) this.fadeDone('dawn');
  }

  finish() {
    if (this.state === 'done') return;
    this.state = 'done';
    this.restoreOverrun();
    if (this.sniper) this.sniper.force = false;
    this.set('night2Done');
    this.bus.emit('night2:done');
  }

  // Tonight on the forecast: what's gathering, before any of it has risen.
  forecastPart() {
    if (this.state === 'done' || this.state === 'idle' || this.act >= 1) return null;
    if (!this.has('rifleClaimed')) return null;
    const n = night2Count(this.nc);
    const threat = this.cfg.danger.perZombie;
    return { label: 'The dead gathering in the woods', marchers: n, arriving: 1, firstArrival: this.nc.horde.first + 30, value: n * threat };
  }

  // ---- debug ----------------------------------------------------------------------------------

  addDebugItems(menu) {
    const cat = menu.category(DEBUG.story);
    cat.addItem(() => `Night 2: ${this.state}${this.state === 'night' ? ` act ${this.act} t${Math.round(this.t)}` : ''} (select: start it now, at home)`, () => {
      for (const f of ['shelterCall', 'earlCombination', 'rifleClaimed', 'wyattRifle']) this.set(f);
      const g = this.station.layout.gate.mid;
      const c = this.station.layout.centre;
      this.player.teleport(g.x + (c.x - g.x) * 0.3, g.z + (c.z - g.z) * 0.3, 0);
      if (this.state === 'done') {
        for (const f of NIGHT2_FLAGS) this.progress?.setFlag(f, false);
        this.reset();
      }
      this.state = 'homeward';
    });
    cat.addItem('Night 2: straight to the fight (no prep)', () => {
      for (const f of ['shelterCall', 'earlCombination', 'rifleClaimed', 'wyattRifle']) this.set(f);
      if (this.state !== 'prep') {
        this.state = 'homeward';
        this.startPrep();
      }
      this.start();
    });
    cat.addItem('Night 2: end it now (the fade to dawn)', () => {
      if (this.state === 'night') this.over();
    });
  }

  overlayLine() {
    return `night2 ${this.state}${this.state === 'night' ? ` act${this.act} t${Math.round(this.t)}` : ''}`;
  }

  dispose() {
    for (const off of this.unsubscribers ?? []) off();
    this.restoreOverrun();
  }
}
