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
//  4. The exploder, by the foreman's hand: the way out (the fuse, the cart
//     back up and the fire behind it).
//
// Flags (BOTTOM_FLAGS). Nothing else is saved.
// Events: 'mine:bulkhead', 'mine:cavern'.

import { halfAt } from '../world/mineTrack.js';
import data from '../data/mineshaft.json';

export const BOTTOM_FLAGS = ['mineBulkhead', 'mineCavernSeen', 'foremanLogFound', 'mineSticks', 'drillHeadTaken'];

const T = data.bottom;

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

export class MineBottom {
  constructor(cfg, bus, ride) {
    this.cfg = cfg;
    this.mc = cfg.mineshaft;
    this.bc = cfg.mineshaft.bottom;
    this.bus = bus;
    this.ride = ride;
    this.flags = BOTTOM_FLAGS;
    this.t = 0;
    this.hum = 0;
  }

  // ctx: the ride's own, plus { lore, paper, card, dynamite }.
  init(ctx) {
    Object.assign(this, ctx);
    this.sfx = this.combat?.sfx;
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
    m.setPlunger(0);
    m.setSpark(null);
    m.setFire(null);
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
    m.setSeam(k, true);
    if (!playing) return;
    const ride = this.ride;
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
    add(spot('plunger'), r, { key: 'plunger', prompt: T.plunger.soon, act: null });
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

  reset() {
    this.hum = 0;
  }

  overlayLine() {
    return `door ${this.open ? 'open' : 'shut'}`;
  }
}
