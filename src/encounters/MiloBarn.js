// Milo's barn (an optional encounter, Session 28's planned work, built
// after Session 26 on Aaron's ask; DESIGN.md "Milo's barn"; the story: The
// Lone Clown; the set: world/MiloBarnSite.js). Milo is alive, in his barn,
// permanently in character, rehearsing his act while the world ends. He
// never attacks Tom, and he can't be hurt.
//
//  1. The siege: the first time Tom comes near, the barn's ringed by the
//     dead and Milo's out in the yard putting them down with thrown knives,
//     bounding and chuckling (sweep.milosBarn, the world running). The
//     family over the radio: Wyatt's thrilled, Ellen isn't.
//  2. The car gates: the dead down and Tom at the cars across the lane, Milo
//     bounds over, takes a bonnet in one hand and swings each car aside like
//     a gate, bows and beckons (milo.gates); once Tom's through he slides
//     them shut. After that they open for Tom whenever he comes and goes.
//  3. The act: in the barn, Milo at his chalk line twelve paces back, Tom on
//     the X in front of the knife board (hold X). Three knives, each humming
//     a note: right shoulder, left shoulder, just over his head. Move (or
//     fire) and he's a flincher: from the top. Hold still for all three and
//     Milo breaks character for one line in his own warm voice ("Three for
//     three. You didn't flinch."), then hands over his calliope horn (a
//     killdozer part, for later).
//  4. Shoot at him, at any point: the shot fails, knocked aside with a knife.
//     "I was in character!", and Tom's thrown out (milo.thrownOut). The show
//     is closed to him for good: no reward.
//  5. The morning after the act: Milo outside the barn as just a man,
//     flannel, a tin mug of instant held out. "Instant. Sorry."
//  6. Comedy: the donkey stares at Tom, always; the turkey judges him; the
//     sign; the dead stacked in neat rows. After the act, by day, the donkey
//     turns up at the station's treeline, staring, and is gone when he looks
//     for her up close.
//
// Saved through story flags: miloSiege, miloGates, miloAct, miloRefused,
// miloMorning (the first dawn after the act: data/progress.json), miloCoffee.
// Off in Demo mode.
//
// Events: 'milo:siege', 'milo:gates', 'milo:act', 'milo:refused'.

import * as THREE from 'three';
import { PosedFigure } from '../render/PosedFigure.js';
import { miloSpec, miloPose } from '../render/miloModel.js';
import { ANIMALS } from '../render/barnAnimals.js';
import { HoldAction } from '../player/HoldAction.js';
import { frameAnchor } from '../world/clearingFrame.js';
import { DEBUG } from '../debug/DebugMenu.js';

// ---- the pure parts (tested) ----------------------------------------------------------------

// Has Tom flinched? moved more than `allow` metres from the mark, or fired.
export function flinched(mark, pos, allow, fired) {
  return fired || Math.hypot(pos.x - mark.x, pos.z - mark.z) > allow;
}

// When each of the act's knives leaves his hand (seconds from the act's start).
export function throwTimes(act) {
  return [act.first, act.first + act.between, act.first + act.between * 2];
}

// Turn toward an angle by at most `rate` radians.
function turnToward(from, to, rate) {
  let d = to - from;
  d -= Math.round(d / (Math.PI * 2)) * Math.PI * 2;
  return from + Math.max(-rate, Math.min(rate, d));
}

const FLAGS = ['miloSiege', 'miloGates', 'miloAct', 'miloRefused', 'miloMorning', 'miloCoffee'];
const KNIFE_POOL = 8;

export class MiloBarn {
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.bc = cfg.milosBarn;
    this.ec = cfg.milosBarn.encounter;
    this.bus = bus;
    this.hud = { prompt: '', progress: 0 };
  }

  // ctx: { scene, site (MiloBarnSite), player, combat, enemies, ground, station, cutscenes, dialogue, subtitles,
  // progress, lore, card, clock, demo, notify, rng() }.
  init(ctx) {
    Object.assign(this, ctx);
    this.rng ??= Math.random;
    this.sfx = this.combat.sfx;
    this.hold = new HoldAction(this.cfg.station.hold.releaseDrain);
    this.hold.init();
    if (!this.ready) return;
    const mc = this.cfg.milo;
    this.clown = new PosedFigure({ spec: miloSpec(mc, 'clown'), pose: miloPose, albedo: mc.albedo, poseRate: mc.poseRate });
    this.clown.init(this.scene);
    this.man = new PosedFigure({ spec: miloSpec(mc, 'man'), pose: miloPose, albedo: mc.albedo, poseRate: mc.poseRate });
    this.man.init(this.scene);
    const ac = this.cfg.barnAnimals;
    this.animals = Object.entries(this.bc.animals).map(([kind, [x, z, yaw]]) => {
      const f = new PosedFigure({ spec: ANIMALS[kind].spec(ac[kind]), pose: ANIMALS[kind].pose, albedo: ac.albedo, poseRate: ac.poseRate });
      f.init(this.scene);
      const w = this.site.at(x, z);
      const floor = this.site.y + this.site.model.floorY;
      const y = kind === 'python' ? floor + 0.9 : floor + 0.06;
      return { kind, f, m: { active: true, x: w.x, y, z: w.z, facing: this.site.yaw - (yaw * Math.PI) / 180, state: 'stand', timer: 0, walked: 0, look: 0, seed: x * 3 + z } };
    });
    // The donkey at the station's treeline, after the act (her twin: the same spec).
    this.treeDonkey = new PosedFigure({ spec: ANIMALS.donkey.spec(ac.donkey), pose: ANIMALS.donkey.pose, albedo: ac.albedo, poseRate: ac.poseRate });
    this.treeDonkey.init(this.scene);
    this.buildKnives();
    // Milo can't be hurt: a shot at him is knocked aside.
    this.target = { x: 0, y: 0, z: 0, targetable: false, alive: true, hitRadius: 0.25, height: 1.4, headBottom: 1.1, headRadius: 0.16, headshotMultiplier: 1, takeHit: () => this.shotAt() };
    this.combat.weapons.extraTargets.push(this.target);
    this.cutscenes?.namedAnchors?.set('milosBarn', () => frameAnchor(this.site.frame));
    this.cutscenes?.namedAnchors?.set('milo', () => ({ x: this.milo.x, z: this.milo.z, yaw: 0, dy: (this.milo.y - this.ground.heightAt(this.milo.x, this.milo.z)) - 0.25 }));
    this.bus.on('milo:gatesOpen', () => (this.scene_ = 'open'));
    this.bus.on('milo:bow', () => this.setMilo('bow'));
    this.bus.on('milo:beckon', () => this.setMilo('beckon'));
    this.bus.on('milo:out', () => this.putOut());
    this.bus.on('weapon:fired', () => (this.fired = true));
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
    this.progress?.setFlag(flag);
  }

  // As the flags say (a new run, a load, a respawn): gates shut, Milo in the yard, no act on.
  reset() {
    if (!this.ready) return;
    this.state = 'idle';
    this.timer = 0;
    this.siege = [];
    this.siegeOn = false;
    this.throwTimer = 1;
    this.knives.forEach((k) => (k.on = false));
    this.gateOpen = 0;
    this.gateWant = 0;
    this.scene_ = null;
    this.act = null;
    this.chatter = this.range(this.ec.chatterEvery);
    this.donkeyGoneDay = -1;
    this.fired = false;
    this.timers = [];
    this.coffeeAt = undefined;
    this.coffeeGone = false;
    const yard = this.site.spots.yard;
    this.milo = { active: true, x: yard.x, y: 0, z: yard.z, facing: this.site.yaw, state: 'idle', timer: 0, walked: 0, look: 0, flash: 0 };
    this.goal = null;
    this.site.setGate(0);
  }

  range([a, b]) {
    return a + (b - a) * this.rng();
  }

  // The man, the mornings after the act, waiting with his mug until Tom's taken it
  // (and gone off with it), else the clown.
  get manToday() {
    const phase = this.clock?.phase;
    if (!this.has('miloMorning') || this.has('miloRefused') || !(phase === 'dawn' || phase === 'day')) return false;
    return !this.has('miloCoffee') || (this.coffeeAt !== undefined && !this.coffeeGone);
  }

  // fn in `seconds` of game time.
  later(seconds, fn) {
    this.timers.push({ at: seconds, fn });
  }

  runTimers(dt) {
    for (const t of this.timers) t.at -= dt;
    const due = this.timers.filter((t) => t.at <= 0);
    this.timers = this.timers.filter((t) => t.at > 0);
    for (const t of due) t.fn();
  }

  setMilo(state) {
    this.milo.state = state;
    this.milo.timer = 0;
  }

  // ---- each frame ---------------------------------------------------------------------------

  update(dt, input, playing, canInteract) {
    if (!this.ready || this.demo?.active) return;
    const p = this.player.position;
    const f = this.site.frame;
    const dBarn = Math.hypot(p.x - f.x, p.z - f.z);
    if (playing) {
      this.runTimers(dt);
      this.updateStory(dt, dBarn);
    }
    if (dBarn < 160) {
      this.updateMilo(dt);
      this.updateAnimals(dt);
      this.updateKnives(dt);
    } else if (this.clown.mesh.visible || this.man.mesh.visible) {
      this.clown.update({ active: false });
      this.man.update({ active: false });
      for (const a of this.animals) a.f.update({ active: false });
    }
    this.updateGate(dt);
    this.updateTreeDonkey(dt);
    if (canInteract && input && playing && dBarn < 40) this.updateInteraction(dt, input);
    else {
      this.hud.prompt = '';
      this.hold.update(dt, null, false, 1);
    }
    this.fired = false;
  }

  // Tom's place in the barn's frame (x right, z ahead).
  local(p = this.player.position) {
    const f = this.site.frame;
    const dx = p.x - f.x;
    const dz = p.z - f.z;
    return { x: dx * f.rx + dz * f.rz, z: dx * f.fx + dz * f.fz };
  }

  updateStory(dt, dBarn) {
    this.timer += dt;
    const lp = this.local();
    const inside = lp.z > this.bc.gate.z + 0.8;
    const refused = this.has('miloRefused');
    // 1: the siege, the first time he comes near.
    if (!this.has('miloSiege') && !this.siegeOn && dBarn < this.ec.siegeDistance && !refused && !this.cutscenes?.active) this.startSiege();
    if (this.siegeOn) {
      this.siege = this.siege.filter((z) => z.alive && z.active);
      if (!this.siege.length) {
        this.siegeOn = false;
        this.set('miloSiege');
        this.sfx?.play('miloChuckle', this.milo);
        this.goal = this.site.spots.yard;
      }
    }
    // 2: the gates, once the dead are down.
    const gate = this.site.spots.gate;
    const dGate = Math.hypot(this.player.position.x - gate.x, this.player.position.z - gate.z);
    if (this.has('miloSiege') && !this.has('miloGates') && !refused && !inside && dGate < this.ec.gatesDistance && this.state === 'idle' && !this.cutscenes?.active) {
      this.state = 'gates';
      this.goal = this.site.spots.gate;
      this.cutscenes?.play('milo.gates', { onDone: () => (this.state = 'letIn') });
    }
    if (this.state === 'letIn' && inside && lp.z > this.bc.gate.z + 3) {
      this.set('miloGates');
      this.bus.emit('milo:gates');
      this.state = 'idle';
      this.scene_ = null;
      this.timer = 0;
      this.dialogue?.play('milo.stage', {}, false);
    }
    // The gates afterwards: Tom near them, either side (never once he's been thrown out).
    if (this.state === 'gates' || this.state === 'letIn') this.gateWant = this.scene_ === 'open' ? 1 : 0;
    else if (this.manToday) this.gateWant = 1; // the morning after, he's left them open
    else if (this.has('miloGates') && !refused) this.gateWant = dGate < 7 ? 1 : 0;
    else this.gateWant = 0;
    if (refused && !inside && dGate < 6 && !this.subtitles?.busy && this.timer > 12) {
      this.timer = 0;
      this.dialogue?.play('milo.closed', {}, false);
    }
    // 3: the act.
    if (this.act) this.updateAct(dt);
    // Chatter, now and then, while Tom's near and nothing's on.
    if (!this.act && !this.siegeOn && dBarn < 22 && !this.manToday && !this.cutscenes?.active) {
      this.chatter -= dt;
      if (this.chatter <= 0 && !this.subtitles?.busy) {
        this.chatter = this.range(this.ec.chatterEvery);
        this.dialogue?.play(`milo.chatter.${1 + Math.floor(this.rng() * 5)}`, {}, false);
        this.sfx?.play('miloChuckle', this.milo);
      }
    }
  }

  // ---- the siege ----------------------------------------------------------------------------

  startSiege() {
    this.siegeOn = true;
    this.bus.emit('milo:siege');
    const s = this.ec.siege;
    const f = this.site.frame;
    for (let i = 0; i < s.count; i++) {
      const a = (i / s.count) * Math.PI * 2 + this.rng() * 0.5;
      const r = this.range(s.ring);
      const x = f.x + Math.sin(a) * r * 1.25;
      const z = f.z + Math.cos(a) * r * 1.25;
      const zed = this.enemies.spawnZombie(x, z, { variant: 'citizen', mode: 'linger', linger: { x: f.x, z: f.z, r: 8 }, rise: false, facing: Math.atan2(f.x - x, f.z - z), authored: 'milosBarn' });
      if (zed) this.siege.push(zed);
    }
    if (!this.cutscenes?.active) this.cutscenes?.play('sweep.milosBarn', { onDone: () => this.dialogue?.play('milo.siege.wyatt') });
  }

  // Milo at the dead with his knives: the nearest within reach, one at a time.
  siegeThrow(dt) {
    this.throwTimer -= dt;
    if (this.throwTimer > 0 || this.milo.state === 'throw') return;
    const m = this.milo;
    let best = null;
    let bestD = this.ec.throwReach;
    for (const z of this.enemies.living) {
      const d = Math.hypot(z.x - m.x, z.z - m.z);
      if (d < bestD) {
        best = z;
        bestD = d;
      }
    }
    if (!best) return;
    this.throwTimer = this.range(this.ec.throwEvery);
    this.throwAt({ x: best.x, y: (best.y ?? this.ground.heightAt(best.x, best.z)) + 1.5, z: best.z }, { zombie: best });
  }

  // A knife from his hand to `to` (a zombie's head: it drops; or a spot on the board).
  throwAt(to, opts = {}) {
    const m = this.milo;
    m.facing = Math.atan2(to.x - m.x, to.z - m.z);
    this.setMilo('throw');
    this.pendingThrow = { to, opts, at: this.ec.throwSeconds };
  }

  launch({ to, opts }) {
    const m = this.milo;
    const k = this.knives.find((x) => !x.on);
    if (!k) return;
    const from = { x: m.x + Math.sin(m.facing + 1.2) * 0.25, y: m.y + 1.25, z: m.z + Math.cos(m.facing + 1.2) * 0.25 };
    const d = Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z);
    Object.assign(k, { on: true, stuck: false, from, to, t: 0, seconds: Math.max(0.12, d / this.ec.knifeSpeed), opts });
    this.sfx?.play('knifeThrow', m);
    if (opts.note !== undefined) this.sfx?.play('knifeHum', { x: m.x, z: m.z, note: opts.note });
  }

  // ---- Milo -----------------------------------------------------------------------------------

  updateMilo(dt) {
    const m = this.milo;
    const p = this.player.position;
    m.timer += dt;
    m.flash = Math.max(0, m.flash - dt);
    if (this.pendingThrow) {
      this.pendingThrow.at -= dt;
      if (this.pendingThrow.at <= 0) {
        const t = this.pendingThrow;
        this.pendingThrow = null;
        this.launch(t);
      }
    } else if (m.state === 'throw' && m.timer > 0.95) m.state = 'idle';
    // Round 2 (Aaron: he stayed bent over after the knives): a bow, or his huff, is held a moment, then he's
    // back to what he does (the bounce on his toes; walking where he's going).
    else if ((m.state === 'bow' || m.state === 'indignant') && m.timer > (this.ec.poseSeconds ?? 3.2) && this.state !== 'out') this.setMilo(this.manToday ? 'stand' : 'idle');
    if (this.siegeOn) this.siegeThrow(dt);
    // Where he's going: the act's chalk line, the gate, the morning's spot, or bounding about the yard near Tom.
    const man = this.manToday;
    let goal = this.goal;
    if (man) goal = this.morningSpot();
    else if (this.act || (this.has('miloGates') && this.local().z > this.bc.barn.z - this.bc.barn.depth / 2 - 1)) goal = this.site.spots.throwFrom;
    else if (this.gateWant > 0 || this.state === 'gates') goal = this.gateSpot();
    if (goal && !['throw', 'bow', 'indignant'].includes(m.state)) {
      const dx = goal.x - m.x;
      const dz = goal.z - m.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.3) {
        const v = Math.min(d, (man ? 1.4 : 3.6) * dt);
        m.x += (dx / d) * v;
        m.z += (dz / d) * v;
        m.facing = turnToward(m.facing, Math.atan2(dx, dz), 8 * dt);
        m.walked += v;
        if (m.state !== 'walk') this.setMilo('walk');
      } else if (m.state === 'walk') this.setMilo(man ? 'stand' : 'idle');
    }
    if (this.gateMoving && !man) this.setMilo('push');
    else if (m.state === 'push') this.setMilo('idle');
    // Facing Tom when he's standing still; his head always on Tom.
    const toTom = Math.atan2(p.x - m.x, p.z - m.z);
    if (['idle', 'stand', 'beckon', 'offer', 'indignant'].includes(m.state)) m.facing = turnToward(m.facing, toTom, 3 * dt);
    let look = toTom - m.facing;
    look -= Math.round(look / (Math.PI * 2)) * Math.PI * 2;
    m.look = Math.max(-1, Math.min(1, look));
    if (man && m.state === 'idle') m.state = 'stand';
    if (!man && (m.state === 'stand' || m.state === 'offer')) m.state = 'idle';
    m.y = this.groundAt(m.x, m.z);
    this.clown.update({ ...m, active: !man }, dt);
    this.man.update({ ...m, active: man }, dt);
    const t = this.target;
    t.x = m.x;
    t.y = m.y;
    t.z = m.z;
    t.targetable = Math.hypot(p.x - m.x, p.z - m.z) < 80;
  }

  // The barn's floor inside it, the ground outside.
  groundAt(x, z) {
    const lp = this.local({ x, z });
    const B = this.bc.barn;
    if (Math.abs(lp.x) < B.halfW && lp.z > B.z - B.depth / 2 && lp.z < B.z + B.depth / 2) return this.site.y + this.site.model.floorY + 0.06 + (lp.z > this.bc.board.z - 1.8 ? 0.24 : 0);
    return this.ground.heightAt(x, z);
  }

  gateSpot() {
    const lp = this.local();
    // Between the cars' noses, on the yard's side (or Tom's, once he's in).
    return this.site.at(0, this.bc.gate.z + (lp.z > this.bc.gate.z ? 1.2 : 1.4));
  }

  morningSpot() {
    const v = this.bc.van;
    return this.site.at(v.x - 2.2, v.z - 1.5);
  }

  // ---- the cars -------------------------------------------------------------------------------

  updateGate(dt) {
    const want = this.gateWant;
    const m = this.milo;
    const g = this.site.spots.gate;
    const miloThere = Math.hypot(m.x - g.x, m.z - g.z) < 3.2 || this.manToday;
    const step = dt / this.bc.gate.seconds;
    const before = this.gateOpen;
    if (miloThere) this.gateOpen = want > this.gateOpen ? Math.min(want, this.gateOpen + step) : Math.max(want, this.gateOpen - step);
    this.gateMoving = this.gateOpen !== before;
    if (this.gateMoving && !this.groaning) {
      this.groaning = true;
      this.sfx?.play('carGroan', g);
    }
    if (!this.gateMoving) this.groaning = false;
    if (this.gateMoving || this.site.open !== this.gateOpen) this.site.setGate(this.gateOpen);
  }

  // ---- the act --------------------------------------------------------------------------------

  updateInteraction(dt, input) {
    const X = input.activeDevice === 'gamepad' ? 'X' : 'E';
    const best = this.pick(X);
    const done = this.hold.update(dt, best?.act ? best.key : null, input.isDown('interact'), best?.seconds ?? 1);
    if (done && best?.act) best.act();
    this.hud.prompt = best ? (this.hold.active && best.busy ? best.busy : best.prompt) : '';
    this.hud.progress = this.hold.key !== null ? this.hold.progress : 0;
  }

  pick(X) {
    const p = this.player.position;
    const mark = this.site.spots.mark;
    if (!this.act && this.has('miloGates') && !this.has('miloAct') && !this.has('miloRefused') && !this.manToday && Math.hypot(p.x - mark.x, p.z - mark.z) < 1.3) {
      return { key: 'mark', prompt: `Hold ${X}: step onto the X (and hold still)`, busy: 'Stepping up…', seconds: 0.8, act: () => this.startAct() };
    }
    if (this.manToday && !this.has('miloCoffee') && Math.hypot(p.x - this.milo.x, p.z - this.milo.z) < 2.2) {
      return { key: 'mug', prompt: `Hold ${X}: take the mug`, busy: 'Taking it…', seconds: 0.6, act: () => this.takeMug() };
    }
    return null;
  }

  startAct() {
    const mark = this.site.spots.mark;
    const toward = this.site.spots.throwFrom;
    this.player.teleport(mark.x, mark.z, Math.atan2(-(toward.x - mark.x), -(toward.z - mark.z)));
    this.act = { t: 0, thrown: 0, landed: 0, mark: { x: mark.x, z: mark.z }, times: throwTimes(this.ec.act), done: false };
    this.fired = false;
    this.knives.forEach((k) => (k.on = false));
    this.sfx?.play('miloChuckle', this.milo);
  }

  updateAct(dt) {
    const a = this.act;
    a.t += dt;
    if (a.done) return;
    // Flinch: moved off the mark, or fired. From the top.
    if (flinched(a.mark, this.player.position, this.ec.act.flinchMove, this.fired)) {
      this.act = null;
      this.setMilo('indignant');
      this.dialogue?.play('milo.flinch', {}, false);
      this.later(1.5, () => this.knives.forEach((k) => k.stuck && (k.on = false)));
      return;
    }
    const lines = ['milo.one', 'milo.two', 'milo.three'];
    if (a.thrown < 3 && a.t >= a.times[a.thrown]) {
      const i = a.thrown++;
      const [x, y] = this.ec.act.landAt[i];
      // Into the board, beside Tom, in the board's frame (x across, up from the stage).
      const lp = this.local(a.mark);
      const at = this.site.at(lp.x + x, this.bc.board.z - 0.04);
      const floor = this.site.y + this.site.model.floorY + 0.3;
      this.dialogue?.play(lines[i], {}, false);
      this.throwAt({ x: at.x, y: floor + y, z: at.z }, { note: i, stick: true, onLand: () => (a.landed += 1) });
    }
    if (a.landed >= 3 && !a.done) {
      a.done = true;
      this.later(0.7, () => this.actDone());
    }
  }

  actDone() {
    if (!this.act) return;
    this.act = null;
    this.set('miloAct');
    this.bus.emit('milo:act');
    this.setMilo('bow');
    this.dialogue?.play('milo.warm', {}, false);
    const give = () => {
      this.sfx?.play('calliope');
      if (this.lore?.give('calliopeHorn')) this.card?.show('calliopeHorn', { keep: () => {} });
      this.dialogue?.playLater?.('milo.act.wyatt', 6);
      this.later(4, () => this.knives.forEach((k) => (k.on = false)));
    };
    this.later(5.2, give);
  }

  // ---- shot at ----------------------------------------------------------------------------------

  shotAt() {
    const m = this.milo;
    this.sfx?.play('knifeDeflect', m);
    this.sfx?.play('ricochet', this.player.position);
    m.flash = 0.1;
    if (this.manToday) return false; // the man, the morning after: it just misses
    if (this.has('miloRefused') || this.state === 'out') return false;
    this.state = 'out';
    this.act = null;
    this.siegeOn = false;
    this.setMilo('indignant');
    this.dialogue?.play('milo.character.1', {}, false);
    this.later(this.ec.deflectSeconds, () => {
      const lp = this.local();
      if (lp.z > this.bc.gate.z) this.cutscenes?.play('milo.thrownOut', { onDone: () => this.refuse() });
      else this.refuse();
    });
    return false;
  }

  putOut() {
    const o = this.site.spots.outside;
    const g = this.site.spots.gate;
    this.site.setGate(0);
    this.gateOpen = 0;
    this.player.teleport(o.x, o.z, Math.atan2(-(g.x - o.x), -(g.z - o.z)));
  }

  refuse() {
    this.set('miloRefused');
    this.state = 'idle';
    this.gateWant = 0;
    this.timer = 0;
    this.bus.emit('milo:refused');
  }

  // ---- the morning after ---------------------------------------------------------------------------

  takeMug() {
    this.set('miloCoffee');
    this.setMilo('offer');
    this.sfx?.play('pickup');
    this.dialogue?.play('milo.morning.1', {}, false);
    this.notify?.('A tin mug of instant coffee. It is, in fact, terrible');
    this.coffeeAt = 0;
    this.later(30, () => (this.coffeeGone = true)); // back in character by the time Tom's gone
  }

  // ---- the animals --------------------------------------------------------------------------------

  updateAnimals(dt) {
    const p = this.player.position;
    for (const a of this.animals) {
      const m = a.m;
      m.timer += dt;
      let look = Math.atan2(p.x - m.x, p.z - m.z) - m.facing;
      look -= Math.round(look / (Math.PI * 2)) * Math.PI * 2;
      m.look = Math.max(-1, Math.min(1, look));
      if (a.kind === 'donkey') m.state = 'stare'; // she never looks away
      else if (a.kind === 'turkey') m.state = 'judge';
      else if (a.kind === 'python') m.state = Math.hypot(p.x - m.x, p.z - m.z) < 3 ? 'watch' : 'coiled';
      else m.state = Math.sin(m.timer * 0.2 + m.seed) > 0.3 ? 'graze' : 'stand';
      a.f.update(m, dt);
    }
  }

  updateTreeDonkey(dt) {
    const show = this.has('miloAct') && this.clock?.phase === 'day' && this.donkeyGoneDay !== this.clock.day;
    const st = this.station?.layout;
    if (!show || !st) {
      this.treeDonkey.update({ active: false });
      return;
    }
    // Out past the fence on the south-west, among the first trees, facing in.
    const a = 3.6;
    const r = st.radius + 16;
    const x = st.centre.x + Math.sin(a) * r;
    const z = st.centre.z + Math.cos(a) * r;
    const p = this.player.position;
    if (Math.hypot(p.x - x, p.z - z) < 18) {
      this.donkeyGoneDay = this.clock.day; // looked for up close: gone
      this.treeDonkey.update({ active: false });
      return;
    }
    let look = Math.atan2(p.x - x, p.z - z) - Math.atan2(st.centre.x - x, st.centre.z - z);
    look -= Math.round(look / (Math.PI * 2)) * Math.PI * 2;
    this.treeDonkey.update({ active: true, x, y: this.ground.heightAt(x, z), z, facing: Math.atan2(st.centre.x - x, st.centre.z - z), state: 'stare', timer: 0, look: Math.max(-1, Math.min(1, look)) }, dt);
  }

  // ---- knives (one instanced mesh) -------------------------------------------------------------------

  buildKnives() {
    const blade = new THREE.BoxGeometry(0.03, 0.004, 0.2).translate(0, 0, 0.13);
    const handle = new THREE.BoxGeometry(0.026, 0.02, 0.1).translate(0, 0, -0.02);
    const geo = new THREE.BufferGeometry();
    const pos = [];
    const col = [];
    const steel = new THREE.Color(this.cfg.milo.looks.clown.steel);
    const leather = new THREE.Color(this.cfg.milo.looks.clown.leather);
    for (const [g, c] of [[blade, steel], [handle, leather]]) {
      const n = g.toNonIndexed();
      const p = n.getAttribute('position');
      for (let i = 0; i < p.count; i++) {
        pos.push(p.getX(i), p.getY(i), p.getZ(i));
        col.push(c.r, c.g, c.b);
      }
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.computeVertexNormals();
    // Unlit: the blades catch the light whatever the light (a glint, so the act's knives show in the board).
    this.knifeMesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true }), KNIFE_POOL);
    this.knifeMesh.count = 0;
    this.knifeMesh.frustumCulled = false;
    this.scene.add(this.knifeMesh);
    this.knives = Array.from({ length: KNIFE_POOL }, () => ({ on: false }));
    this.tmpM = new THREE.Matrix4();
    this.tmpQ = new THREE.Quaternion();
    this.tmpV = new THREE.Vector3();
    this.tmpD = new THREE.Vector3();
    this.one = new THREE.Vector3(1.3, 1.3, 1.3); // a throwing knife, a touch big, so it reads at twelve paces
    this.zAxis = new THREE.Vector3(0, 0, 1);
  }

  updateKnives(dt) {
    let n = 0;
    for (const k of this.knives) {
      if (!k.on) continue;
      if (!k.stuck) {
        k.t += dt;
        const u = Math.min(1, k.t / k.seconds);
        if (u >= 1) this.land(k);
      }
      const u = k.stuck ? 1 : Math.min(1, k.t / k.seconds);
      this.tmpD.set(k.to.x - k.from.x, k.to.y - k.from.y, k.to.z - k.from.z).normalize();
      // Stuck: a third of the blade in the wood, the rest and the handle standing out of it.
      const back = k.stuck ? 0.17 : 0;
      const x = k.from.x + (k.to.x - k.from.x) * u - this.tmpD.x * back;
      const y = k.from.y + (k.to.y - k.from.y) * u + Math.sin(u * Math.PI) * 0.15 - this.tmpD.y * back;
      const z = k.from.z + (k.to.z - k.from.z) * u - this.tmpD.z * back;
      this.tmpQ.setFromUnitVectors(this.zAxis, this.tmpD);
      this.tmpM.compose(this.tmpV.set(x, y, z), this.tmpQ, this.one);
      this.knifeMesh.setMatrixAt(n++, this.tmpM);
    }
    this.knifeMesh.count = n;
    this.knifeMesh.instanceMatrix.needsUpdate = true;
  }

  land(k) {
    const o = k.opts;
    if (o.zombie) {
      k.on = false;
      if (o.zombie.alive) this.enemies.damage(o.zombie, 1000, 'head', { stagger: 0, knockback: 0.4 }, k.to, { x: k.from.x, z: k.from.z });
      return;
    }
    k.stuck = true;
    this.sfx?.play('knifeThunk', k.to);
    o.onLand?.();
  }

  // ---- debug ------------------------------------------------------------------------------------------

  addDebugItems(menu) {
    const cat = menu.category(DEBUG.story);
    cat.addItem(() => `Milo's barn: take me to the lane (${this.ready ? (this.has('miloRefused') ? 'refused' : this.has('miloAct') ? 'act done' : this.has('miloGates') ? 'let in' : 'not yet') : 'not on this map'})`, () => {
      if (!this.ready) return this.notify?.("No barn on this map");
      const o = this.site.at(0, this.bc.gate.z - this.ec.siegeDistance + 6);
      const g = this.site.spots.gate;
      this.player.teleport(o.x, o.z, Math.atan2(-(g.x - o.x), -(g.z - o.z)));
    });
    cat.addItem("Milo's barn: the next morning now (after the act)", () => {
      this.set('miloAct');
      this.set('miloMorning');
    });
    cat.addItem("Milo's barn: start it again (flags cleared)", () => {
      for (const f of FLAGS) this.progress?.setFlag(f, false);
      this.coffeeGone = false;
      this.reset();
    });
  }

  overlayLine() {
    if (!this.ready) return 'milo -';
    return `milo ${this.state} ${this.milo.state}${this.siegeOn ? ` siege ${this.siege.length}` : ''}${this.act ? ` act ${this.act.landed}/3` : ''} gate ${this.gateOpen.toFixed(2)}`;
  }

  dispose() {
    this.clown?.dispose();
    this.man?.dispose();
    this.treeDonkey?.dispose();
    for (const a of this.animals ?? []) a.f.dispose();
    if (this.knifeMesh) {
      this.knifeMesh.removeFromParent();
      this.knifeMesh.geometry.dispose();
      this.knifeMesh.material.dispose();
    }
  }
}
