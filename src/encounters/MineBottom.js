// The bottom of the mine (Session 31; DESIGN.md "Abandoned mineshaft", "The
// bottom" and "The ending"; the set: render/mineCavernModel.js; the texts:
// data/mineshaft.json "bottom"). The ride (encounters/MineRide.js) owns one
// of these and hands it the bottom's part of each frame.
//
//  1. The bulkhead: barred from the drift's side, the bar swollen into its
//     brackets. Tom levers it out with the pinch bar from the fall.
//  2. The cavern: the seam up the end wall, lit red from inside and
//     humming (a pulse, on an unlit mesh: no lights); the torn cocoon hung
//     beside it; the moths, all of them, up in the silk under the roof,
//     watching the seam (they don't come down unless they're shot at).
//  3. What's there to take: the foreman's logbook, by his hand (a paper,
//     lore); the sticks in the open case (dynamite); the rock drill's head
//     (a card and a lore item: the killdozer's ram, for later).
//  4. The exploder, by the foreman's hand. Tom pushes it: a slow fuse the
//     miners spliced in gives him twenty seconds to be in the cart (the
//     count's on the prompt line, a spark runs up the cable, the moths
//     pour out past him). Not aboard when it's burnt down, he's dead.
//  5. The way out: the haulage rope takes the cart back up the drift at a
//     walk; the charges go, and the blast throws it on far faster, the
//     fire coming up behind (unlit balls of it, and the drift's own light
//     turned orange: no lights). The last of the shift are on the rails
//     ahead (encounters/MineFight.js): each one the cart hits slows it,
//     and the fire gains. It burns him if it catches the cart; it can't
//     kill him.
//  6. The last of it is a cutscene (cutscenes.json mine.out): the cart
//     into the landing, the fire after it, the cage away, the collar.
//     The mine's sealed: the cage won't go down again.
//
// Flags (BOTTOM_FLAGS). The fuse and the ride out aren't saved: a respawn
// or a reload puts it all back as it was before the plunger.
// Events: 'mine:bulkhead', 'mine:cavern', 'mine:fuse', 'mine:blast',
// 'mine:sealed'.

import * as THREE from 'three';
import { halfAt, roofAt, trackPoint } from '../world/mineTrack.js';
import data from '../data/mineshaft.json';

export const BOTTOM_FLAGS = ['mineBulkhead', 'mineCavernSeen', 'foremanLogFound', 'mineSticks', 'drillHeadTaken', 'mineSealed'];

const T = data.bottom;
const O = data.out;
const lerp = (a, b, k) => a + (b - a) * k;
const clamp01 = (v) => Math.max(0, Math.min(1, v));

// ---- the pure parts (tested) ----------------------------------------------------------------

// The seam's brightness t seconds on: a slow breath between lo and hi, with a catch in it.
export function seamPulse(t, period, [lo, hi]) {
  const k = 0.5 - 0.5 * Math.cos((t / period) * Math.PI * 2);
  const catchIt = 0.06 * Math.sin((t / period) * Math.PI * 14) * k;
  return lo + (hi - lo) * Math.max(0, Math.min(1, k * k * (3 - 2 * k) + catchIt));
}

// The blocks that narrow a room box of half width `hx` to the tunnel's own shape from s0 to s1 (the box is
// as wide as its widest part): [x0, x1, z0, z1] in the box's frame, its middle at `mid`. Runs of the same
// width are one block a side.
export function sideBlocks(track, s0, s1, mid, hx, step = 1) {
  const out = [];
  let from = s0;
  let h = null;
  const flush = (to) => {
    if (h !== null && h < hx - 0.05) for (const sd of [-1, 1]) out.push(sd < 0 ? [-hx - 2, -h, from - mid, to - mid] : [h, hx + 2, from - mid, to - mid]);
  };
  for (let s = s0; s < s1; s += step) {
    // The narrowest the stretch gets, to the nearest quarter metre.
    const q = Math.floor(Math.min(halfAt(track, s), halfAt(track, Math.min(s1, s + step))) * 4) / 4;
    if (q !== h) {
      flush(s);
      from = s;
      h = q;
    }
  }
  flush(s1);
  return out;
}

// How fast the fire has to come so that a cart at cartS doing `speed`, slowed by nothing, reaches `stop` with
// the fire `endGap` behind it (never slower than the cart itself).
export function fireSpeed(fireS, cartS, speed, stop, endGap) {
  const t = Math.max(1, (cartS - stop) / speed);
  return Math.max(speed + 0.4, (fireS - stop - endGap) / t);
}

// Seconds between the fuse's ticks with `left` of `total` to burn: slower at first, running together at the end.
export function fuseTick(left, total, hurryAt) {
  if (left <= hurryAt) return lerp(0.12, 0.3, clamp01(left / hurryAt));
  return lerp(0.3, 1.0, clamp01((left - hurryAt) / Math.max(0.1, total - hurryAt)));
}

// What a lick of the fire takes off him: its damage, never below the floor (it can't kill him).
export function lick(health, fc) {
  return Math.max(0, Math.min(fc.lick, health - fc.floor));
}

export class MineBottom {
  constructor(cfg, bus, ride) {
    this.cfg = cfg;
    this.mc = cfg.mineshaft;
    this.bc = cfg.mineshaft.bottom;
    this.bus = bus;
    this.ride = ride;
    this.flags = BOTTOM_FLAGS;
    this.ec = cfg.mineshaft.escape;
    this.t = 0;
    this.hum = 0;
    this.fuse = null; // seconds left on the slow fuse, once the plunger's down
    this.esc = null; // the ride out: { blown, fireS, fireV, roar, lick, said }
    this.cine = null; // the closing cutscene's clock
    this.light = { ...cfg.mineshaft.light }; // the mine's own light (the fire turns it)
    this.c0 = new THREE.Color();
    this.c1 = new THREE.Color();
    this.balls = [];
    this.tp = {};
  }

  // ctx: the ride's own, plus { lore, paper, card, dynamite, cutscenes }.
  init(ctx) {
    Object.assign(this, ctx);
    this.sfx = this.combat?.sfx;
    this.bus.on('mine:cartStopped', ({ at }) => {
      if (at === 'top' && this.esc && !this.cine) this.finish(); // no cutscene to end it (the tests)
    });
    this.bus.on('mine:out', ({ step }) => {
      if (step === 'surface') this.toSurface();
    });
  }

  get sealed() {
    return this.has('mineSealed');
  }

  // The count on the prompt line while the fuse burns.
  get banner() {
    if (this.fuse === null) return '';
    return (this.ride.phase === 'aboard' ? O.fuseAboard : O.fuse).replace('{s}', String(Math.max(0, Math.ceil(this.fuse))));
  }

  has(flag) {
    return this.ride.has(flag);
  }

  set(flag) {
    this.ride.set(flag);
  }

  get model() {
    return this.ride.model;
  }

  get open() {
    return this.has('mineBulkhead');
  }

  // ---- the set as the flags say (the mine's just been loaded, or a flag's changed) -----------------

  dress() {
    const m = this.model;
    if (!m) return;
    m.setDoor(this.open);
    this.ride.track.shutAt = this.open ? null : this.ride.track.door;
    m.parts.log.visible = !this.has('foremanLogFound');
    m.parts.sticks.visible = !this.has('mineSticks');
    m.parts.drillHead.visible = !this.has('drillHeadTaken');
    m.setPlunger(this.fuse === null ? 0 : 1);
    m.setSpark(null);
    m.setFire(null);
    this.setGlow(0);
    m.setSeam(seamPulse(this.t, this.bc.seam.pulse, this.bc.seam.glow), true);
  }

  // What stands in the bottom's room box (the ride's zone('bottom')): [x0, x1, z0, z1], middle at `mid`.
  blocks(mid, hx, s0, s1) {
    const track = this.ride.track;
    const out = sideBlocks(track, s0, s1, mid, hx);
    const add = (s, lat, hw, hl) => out.push([lat - hw, lat + hw, s - mid - hl, s - mid + hl]);
    const d = track.door;
    if (!this.open) add(d, 0, hx + 2, 0.22);
    else for (const sd of [-1, 1]) add(d, sd * (1.3 + hx / 2 + 1), hx / 2 + 1, 0.3); // the frame either side of the way through
    const B = this.bc;
    add(B.cocoon.at[0], B.cocoon.at[1], 0.75, 0.75);
    add(B.plunger[0], B.plunger[1], 0.2, 0.2);
    add(B.foreman[0] + 0.1, B.foreman[1] + 0.2, 0.55, 0.6);
    add(B.drill[0], B.drill[1], 0.6, 0.7);
    add(B.sticks[0] + 0.3, B.sticks[1], 0.5, 0.75);
    add(441.5, 5.4, 0.7, 0.7); // the crib
    for (const [s, lat] of [[443, -3.6], [444.5, 3.9], [452, 0.6], [455, -6.0], [457.5, 6.2], [465, 1.8]]) add(s, lat, 0.2, 0.2); // the props
    return out;
  }

  // ---- each frame (the ride's, while Tom's below) ---------------------------------------------------

  update(dt, playing) {
    const m = this.model;
    if (!m) return;
    this.t += dt;
    const S = this.bc.seam;
    const k = seamPulse(this.t, S.pulse, S.glow);
    m.setSeam(k, !this.esc?.blown);
    if (this.cine) {
      this.updateCine(dt);
      return;
    }
    if (!playing) return;
    const ride = this.ride;
    if (this.fuse !== null) this.updateFuse(dt);
    if (this.esc) this.updateEscape(dt);
    if (ride.where !== 'bottom') return;
    const p = this.player.position;
    const seam = ride.toWorld(m.spots.seam);
    const d = Math.hypot(p.x - seam.x, p.z - seam.z);
    // The hum: a swell with each breath of the light, louder the nearer he is.
    this.hum -= dt;
    if (this.hum <= 0 && d < S.hum + (this.open ? 0 : -8)) {
      this.hum = S.pulse;
      this.sfx?.play('seamHum', seam);
    }
    // Into the cavern for the first time.
    if (ride.phase === 'foot' && this.open && !this.has('mineCavernSeen') && ride.sOf(p) > ride.track.door + 3.5) {
      this.set('mineCavernSeen');
      ride.notify?.(T.inside);
      ride.after(9, () => ride.notify?.(T.roost));
      if (this.bc.hintOnce) ride.after(17, () => ride.notify?.(T.hint));
      this.bus.emit('mine:cavern');
    }
  }

  // ---- hold X: the bottom's part of the ride's pickFoot ----------------------------------------------

  pick(add, opt, X) {
    const ride = this.ride;
    const r = this.mc.encounter.interactRange;
    const H = this.mc.encounter.holds;
    const spot = (name) => ride.toWorld(this.model.spots[name]);
    const look = (name, def) => add(spot(name), r + 0.7, opt(name, def, H.look, () => ride.notify?.(def.text)));
    if (!this.open) {
      add(spot('door'), r + 0.9, { ...opt('door', T.door, H.door, () => this.openDoor()), stroke: true });
      return;
    }
    look('seam', T.seam);
    look('cocoon', T.cocoon);
    if (!this.has('foremanLogFound')) add(spot('log'), r + 0.2, opt('log', T.log, H.log, () => this.takeLog()));
    else look('foreman', T.foreman);
    if (!this.has('mineSticks')) add(spot('sticks'), r + 0.3, opt('sticks', T.sticks, H.sticks, () => this.takeSticks()));
    if (!this.has('drillHeadTaken')) add(spot('drill'), r + 0.3, { ...opt('drill', T.drill, H.drill, () => this.takeDrill()), stroke: true, strokeSfx: 'drillKnock' });
    if (this.fuse === null && !this.esc) add(spot('plunger'), r, opt('plunger', T.plunger, H.plunger, () => this.push()));
  }

  // ---- what each does ------------------------------------------------------------------------------

  openDoor() {
    if (this.open) return;
    this.set('mineBulkhead');
    this.sfx?.play('bulkheadOpen', this.player.position);
    this.player.shake?.(0.5);
    this.dress();
    this.ride.rezone();
    this.ride.notify?.(T.door.done);
    this.ride.fight?.hangCavern?.(this.ride);
    this.bus.emit('mine:bulkhead');
  }

  takeLog() {
    this.set('foremanLogFound');
    this.model.parts.log.visible = false;
    this.sfx?.play('paper');
    this.lore?.give('foremanLog');
    const device = this.ride.device;
    const read = () => this.paper?.open('foremanLog', { device, take: true });
    if (!this.card?.show('foremanLog', { read, keep: () => this.ride.notify?.('Hand it in at home and read it from the ledger') }, device)) read();
  }

  takeSticks() {
    const got = this.dynamite?.give(this.bc.sticksGiven) ?? 0;
    if (this.dynamite && got <= 0) {
      this.ride.notify?.(T.sticks.full);
      return;
    }
    this.set('mineSticks');
    this.model.parts.sticks.visible = false;
    this.sfx?.play('pickup');
    this.combat?.hud?.pickup?.(`${got || this.bc.sticksGiven} sticks of dynamite`);
    this.ride.notify?.(T.sticks.text);
  }

  takeDrill() {
    this.set('drillHeadTaken');
    this.model.parts.drillHead.visible = false;
    this.sfx?.play('drillOff', this.player.position);
    this.lore?.give('drillHead');
    this.card?.show('drillHead', { keep: () => this.ride.notify?.(T.drill.keep) }, this.ride.device);
  }

  // ---- the plunger and the fuse ----------------------------------------------------------------------

  push() {
    if (this.fuse !== null || this.esc || this.sealed) return;
    const E = this.ec;
    this.fuse = E.fuse;
    this.tick = 0.6;
    this.model.setPlunger(1);
    this.sfx?.play('plungerPush', this.player.position);
    this.ride.after(0.5, () => this.sfx?.play('fuseSpit', this.player.position));
    this.ride.notify?.(T.plunger.armed);
    // They know before he does: the roost comes down and goes, out through the bulkhead and up the drift.
    this.ride.fight?.fleeMoths?.(this.ride);
    this.bus.emit('mine:fuse', { seconds: E.fuse });
  }

  updateFuse(dt) {
    const E = this.ec;
    this.fuse -= dt;
    this.model.setSpark(clamp01(1 - this.fuse / E.fuse));
    this.tick -= dt;
    if (this.tick <= 0) {
      this.tick = fuseTick(this.fuse, E.fuse, E.hurryAt);
      this.sfx?.play('fuseTick', this.player.position);
    }
    if (this.fuse <= 0) this.blow();
  }

  // Into the cart with the fuse lit: the rope's clutch thrown, and away up the drift.
  flee() {
    const ride = this.ride;
    if (this.fuse === null || this.esc || ride.phase !== 'foot') return;
    ride.board(true);
    this.esc = { blown: false, fireS: this.ec.fire.from, fireV: 0, roar: 0, licks: 0, said: false };
    ride.cart.runUp(this.ec.stop, () => (this.esc?.blown ? this.ec.speed : this.ec.haul));
    ride.fight?.startEscape?.(ride);
    ride.notify?.(O.haul);
  }

  // The fuse is down: the charges go.
  blow() {
    const ride = this.ride;
    const E = this.ec;
    this.fuse = null;
    this.model.setSpark(null);
    this.sfx?.play('mineBlast');
    this.player.shake?.(3.2);
    if (ride.phase !== 'aboard') {
      // Still in the drift, or in the cavern with it.
      ride.notify?.(T.plunger.late);
      this.combat?.hurtPlayer?.(9999, 4);
      if (this.combat && this.combat.alive === false) return; // the respawn puts it all back
      this.flee(); // (god mode, a debug run: carried out of it)
      if (!this.esc) return;
    }
    const cart = ride.cart;
    const e = this.esc;
    e.blown = true;
    e.fireS = Math.min(E.fire.from, cart.s + E.fire.startGap);
    e.fireV = fireSpeed(e.fireS, cart.s, E.speed, E.stop, E.fire.endGap);
    cart.speed = Math.max(cart.speed, E.kick);
    ride.notify?.(O.blast);
    ride.after(7, () => this.esc && ride.notify?.(O.rails));
    this.bus.emit('mine:blast');
  }

  // ---- the ride out -----------------------------------------------------------------------------------

  get fireS() {
    return this.esc?.blown ? this.esc.fireS : null;
  }

  updateEscape(dt) {
    const e = this.esc;
    const E = this.ec;
    const F = E.fire;
    const cart = this.ride.cart;
    if (!e.blown) return;
    // The fire comes on up; it can't pass the cart.
    e.fireS = Math.max(cart.s + F.min, e.fireS - e.fireV * dt);
    const gap = e.fireS - cart.s;
    const near = clamp01(1 - gap / F.glowFrom);
    this.showFire(e.fireS, 1, dt);
    this.setGlow(near);
    e.roar -= dt;
    if (e.roar <= 0) {
      e.roar = F.roarEvery;
      this.sfx?.play('fireRoar', { near });
      this.player.shake?.(0.1 + near * 0.5);
    }
    // It's caught the cart: it licks over him (never to death), and gutters back before it comes on again.
    if (gap <= F.min + 0.05) {
      const burn = lick(this.combat?.health?.value ?? 100, F);
      if (burn > 0) this.combat?.hurtPlayer?.(burn, 1.4);
      this.sfx?.play('fireLick');
      this.player.shake?.(1.2);
      e.licks = (e.licks ?? 0) + 1;
      if (!e.said) {
        e.said = true;
        this.ride.notify?.(O.singe);
      }
      e.fireS = cart.s + F.fallBack;
    }
    if (cart.s <= E.cutAt) this.startCine();
  }

  // The fire's head at s: balls of it back down the drift from there, each breathing. k: how big (the landing: bigger).
  showFire(s, k, dt = 0) {
    const F = this.ec.fire;
    const track = this.ride.track;
    this.flick = (this.flick ?? 0) + dt;
    const n = this.model.parts.fire.length;
    for (let i = 0; i < n; i++) {
      const b = this.balls[i] ?? (this.balls[i] = {});
      const at = Math.min(track.length, s + i * F.balls);
      const roof = roofAt(track, at);
      const wob = Math.sin(this.flick * (5 + i) + i * 1.7);
      trackPoint(track, at, Math.sin(this.flick * 3.1 + i * 2.2) * 0.5, roof * 0.45 + wob * 0.2, this.tp);
      b.x = this.tp.x;
      b.y = this.tp.y;
      b.z = this.tp.z;
      b.r = (i % 3 === 0 ? F.radius * 0.62 : F.radius) * k * (1 + wob * 0.14) * Math.min(1.6, roof / track.roof);
    }
    this.model.setFire(this.balls);
  }

  // The drift's own light, turned toward the fire's (k 0..1): no lights, so the ambient and the fog do it.
  // boost: x the fire's own share (the cutscene has no torch to see by).
  setGlow(k, boost = 1) {
    const base = this.mc.light;
    const L = this.ec.light;
    const out = this.light;
    out.ambientDay = out.ambientNight = lerp(base.ambientDay, L.ambient * boost, k);
    out.ambientColor = this.c0.setHex(base.ambientColor).lerp(this.c1.setHex(L.color), k).getHex();
    out.fogColor = this.c0.setHex(base.fogColor).lerp(this.c1.setHex(L.fogColor), k).getHex();
  }

  // ---- the last of it: a cutscene ------------------------------------------------------------------------

  startCine() {
    if (this.cine) return;
    const ride = this.ride;
    const cart = ride.cart;
    this.cine = { t: 0, s0: cart.s, f0: this.esc.fireS, up: false };
    this.set('mineSealed');
    ride.fight?.clear();
    cart.moving = false;
    cart.eject();
    ride.phase = 'cine';
    // Tom's in the cage for it (nobody sees him: the camera's the cutscene's).
    const c = ride.cagePlatform(ride.offset.y);
    this.player.setPlatform(c, c.x, c.z);
    const g = this.world?.ground;
    const anchor = (x, y, z, yaw) => ({ x, z, yaw, dy: y - (g?.heightAt(x, z) ?? 0) });
    const o = ride.offset;
    const gate = ride.site?.spots?.gate ?? ride.entrance;
    const place = ride.site?.place ?? { x: gate.x, z: gate.z, yaw: 0 };
    const anchors = {
      // The landing: ahead down the drift from the cage; x to the right of that.
      mineLanding: anchor(o.x, o.y, o.z, Math.PI),
      // The collar: ahead from the yard's gate to the cage.
      mineCollar: { x: place.x, z: place.z, yaw: Math.atan2(-Math.sin(place.yaw), -Math.cos(place.yaw)) },
    };
    const played = this.cutscenes?.play('mine.out', { anchors, onDone: () => this.finish() });
    if (!played) this.finish();
  }

  // The cutscene's own clock: the cart braking into the landing, the fire after it, the cage's walls coming down.
  updateCine(dt) {
    const c = this.cine;
    const C = this.ec.cine;
    const ride = this.ride;
    if (!ride.below || !this.model) return;
    c.t += dt;
    const cart = ride.cart;
    const k = clamp01(c.t / C.arrive);
    cart.s = lerp(c.s0, this.ec.stop, 1 - (1 - k) * (1 - k));
    cart.speed = k < 1 ? 6 * (1 - k) : 0;
    cart.pose();
    const f = clamp01((c.t - 0.2) / (C.fill[1] - 0.2));
    const head = lerp(c.f0, -1.5, f * f * (3 - 2 * f));
    this.showFire(head, 1 + clamp01((c.t - C.fill[0]) / 2) * 0.7, dt);
    this.setGlow(clamp01(0.55 + c.t / 3), C.glow);
    // The cage away: the shaft's walls come down over the view like a shutter, then run.
    if (c.t > C.lift) {
      const u = c.t - C.lift;
      this.model.setSleeve(u < 1.1 ? 14 * (1 - u / 1.1) ** 2 : 2 - ((u * 9) % 2), true);
    }
  }

  // The cut to the surface (the cutscene's 'mine:out' event, behind a black frame).
  toSurface() {
    if (!this.ride.below) return;
    this.model?.setFire(null);
    this.setGlow(0);
    this.ride.surface(true);
  }

  // It's over (the cutscene ended or was skipped, or there was none): Tom at the collar, the mine sealed.
  finish() {
    if (!this.esc && !this.cine) return;
    this.set('mineSealed');
    this.esc = null;
    this.cine = null;
    this.fuse = null;
    this.setGlow(0);
    this.toSurface();
    this.ride.notify?.(O.sealed);
    this.bus.emit('mine:sealed');
  }

  reset() {
    this.hum = 0;
    this.fuse = null;
    this.esc = null;
    this.cine = null;
    this.setGlow(0);
  }

  overlayLine() {
    const e = this.esc;
    return `door ${this.open ? 'open' : 'shut'}${this.fuse !== null ? ` fuse ${this.fuse.toFixed(1)}` : ''}${e ? ` out${e.blown ? ` fire ${(e.fireS - this.ride.cart.s).toFixed(0)} m behind at ${e.fireV.toFixed(1)}` : ''}` : ''}${this.sealed ? ' sealed' : ''}`;
  }
}
