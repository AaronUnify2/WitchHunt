// The abandoned mineshaft (an optional encounter; Session 30; DESIGN.md
// "Abandoned mineshaft"; the surface set: world/MineshaftSite.js; the mine
// below and the ride: encounters/MineRide.js; the texts:
// data/mineshaft.json). The Mothman's origin, a big set piece, built in two
// halves: this session the way down, the next the bottom and the way out.
//
//  1. The arrival: an establishing sweep up the track to the headframe,
//     the company's sign and the army's tape, the office's tag board, the
//     lift's control box with its tray empty (sweep.mineshaft).
//  2. The surface: the office (the foreman's desk, the tag board, the lamp
//     rack, his locker), the army's crates by the collar, the tipped tub.
//  3. The cage lift is dead until Tom fits a battery at its control box
//     (an ordinary car battery: the one the fence box would have had).
//  4. The cage down (encounters/MineRide.js): a creaking ride, ridiculously
//     deep, to the landing and the turret cart.
//
// Saved through story flags (data/progress.json): FLAGS below and the
// ride's (MineRide's RIDE_FLAGS). reset() works out the rest. Off in Demo mode.
//
// Events: 'mine:arrived', 'mine:powered', and the ride's.

import { HoldAction } from '../player/HoldAction.js';
import { DEBUG } from '../debug/DebugMenu.js';
import data from '../data/mineshaft.json';

export const FLAGS = ['mineVisited', 'mineDesk', 'mineTags', 'mineLamps', 'mineLocker', 'mineArmy', 'mineCart', 'mineBatteryFitted'];

// ---- the pure parts (tested) ----------------------------------------------------------------

// What the control box offers: 'live' (fitted), 'fit' (he has a battery) or 'none'.
export function boxState(fitted, batteries) {
  if (fitted) return 'live';
  return batteries > 0 ? 'fit' : 'none';
}

export class Mineshaft {
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.mc = cfg.mineshaft;
    this.ec = cfg.mineshaft.encounter;
    this.bus = bus;
    this.hud = { prompt: '', progress: 0 };
    this.data = data;
  }

  // ctx: { scene, site (MineshaftSite), ride (MineRide, optional), player, combat, enemies, cutscenes,
  // dialogue, subtitles, progress, lore, paper, card, clock, demo, notify, rng() }.
  init(ctx) {
    Object.assign(this, ctx);
    this.rng ??= Math.random;
    this.sfx = this.combat.sfx;
    this.hold = new HoldAction(this.cfg.station.hold.releaseDrain);
    this.hold.init();
    if (this.ready) {
      const p = this.site.place;
      // Ahead: the way the track walks in; x: the walker's right (the model's -x).
      this.cutscenes?.namedAnchors?.set('mineshaft', () => ({ x: p.x, z: p.z, yaw: Math.atan2(-Math.sin(p.yaw), -Math.cos(p.yaw)) }));
    }
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

  get powered() {
    return this.has('mineBatteryFitted');
  }

  reset() {
    this.later = [];
    this.creak = 4;
    if (!this.ready) return;
    this.site.show('battery', this.powered);
    this.site.show('boxLamp', this.powered);
    this.site.show('cageLamp', this.powered);
    this.ride?.reset();
  }

  // ---- each frame ---------------------------------------------------------------------------

  update(dt, input, playing, canInteract) {
    if (!this.ready || this.demo?.active) return;
    if (playing) this.tickLater(dt);
    // Below ground it's the ride's.
    if (this.ride?.below) {
      this.ride.update(dt, input, playing, canInteract || this.player.riding === this.ride.cart);
      return;
    }
    const d = this.distance();
    if (playing) this.updateStory(dt, d);
    if (canInteract && input && playing && d < this.site.place.radius + 8) this.updateInteraction(dt, input);
    else {
      this.hud.prompt = '';
      this.hud.progress = 0;
      this.hold.update(dt, null, false, 1);
    }
  }

  updateStory(dt, d) {
    // 1: the arrival sweep, once, as he comes up the track.
    if (!this.has('mineVisited')) {
      const a = this.spot('arrive');
      const p = this.player.position;
      if (Math.hypot(p.x - a.x, p.z - a.z) < this.ec.sweepDistance && !this.cutscenes?.active) this.arrive();
      return;
    }
    // The headframe working in the wind.
    if (d < this.ec.creakDistance) {
      this.creak -= dt;
      if (this.creak <= 0) {
        const [a, b] = this.ec.creakEvery;
        this.creak = a + (b - a) * this.rng();
        this.sfx?.play('frameCreak', this.spot('cage'));
      }
    }
  }

  arrive() {
    this.set('mineVisited');
    this.bus.emit('mine:arrived');
    this.cutscenes?.play('sweep.mineshaft');
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
    const cands = [];
    const add = (q, reach, o) => {
      const dd = dist(q);
      if (dd < reach) cands.push({ dd, o });
    };
    for (const s of data.searches) {
      if (this.has(s.flag)) continue;
      add(this.spot(s.spot), r + 0.3, opt(s.id, s, H[s.hold] ?? H.search, () => this.search(s)));
    }
    add(this.spot('sign'), r + 0.8, { key: 'sign', prompt: data.sign, act: null });
    // 3: the control box.
    const state = boxState(this.powered, this.combat.inventory?.batteries ?? 0);
    if (state === 'fit') add(this.spot('box'), r + 0.2, opt('box', data.box, H.battery, () => this.fitBattery()));
    else add(this.spot('box'), r + 0.2, { key: 'box', prompt: state === 'live' ? data.box.live : data.box.none, act: null });
    // 4: the cage's lever.
    if (!this.powered) add(this.spot('lever'), r, { key: 'lever', prompt: data.cage.dead, act: null });
    else if (this.ride?.ready) add(this.spot('lever'), r, opt('lever', data.cage, H.lever, () => this.ride.descend()));
    else add(this.spot('lever'), r, { key: 'lever', prompt: data.box.live, act: null });
    if (!cands.length) return null;
    cands.sort((a, b) => a.dd - b.dd);
    return cands[0].o;
  }

  // ---- what each does ------------------------------------------------------------------------

  search(s) {
    this.set(s.flag);
    this.sfx?.play('pickup');
    const inv = this.combat.inventory;
    if (s.scrap) {
      inv?.addScrap?.(this.ec.lamps.scrap);
      this.combat.hud?.pickup?.(`${this.ec.lamps.scrap} scrap`);
    }
    if (s.locker) {
      const L = this.ec.locker;
      this.giveRounds('pistol', L.pistol);
      const kept = inv?.addKits?.('firstAid', L.kits) ?? 0;
      this.combat.hud?.pickup?.(`${L.pistol} pistol rounds${kept ? ', a first aid kit' : ''}`);
    }
    if (s.army) {
      this.giveRounds('rifle', this.ec.army.rifle);
      this.combat.hud?.pickup?.(`${this.ec.army.rifle} rifle rounds`);
    }
    if (s.text) this.notify?.(s.text);
  }

  giveRounds(type, n) {
    if (this.combat.weapons?.addAmmo?.(type, n)) return;
    const inv = this.combat.inventory;
    if (inv?.ammo) inv.ammo[type] = (inv.ammo[type] ?? 0) + n;
  }

  // An ordinary car battery, out of Tom's pack into the tray: the lift's live from then on.
  fitBattery() {
    if (this.powered || !this.combat.inventory?.useBattery?.()) return;
    this.set('mineBatteryFitted');
    this.site.show('battery', true);
    this.sfx?.play('batteryFit', this.spot('box'));
    this.after(0.9, () => {
      this.site.show('boxLamp', true);
      this.site.show('cageLamp', true);
      this.sfx?.play('relayClack', this.spot('cage'));
      this.notify?.(data.box.done);
      this.bus.emit('mine:powered');
    });
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
    return [...FLAGS, ...(this.ride?.flags ?? [])];
  }

  addDebugItems(menu) {
    const cat = menu.category(DEBUG.story);
    cat.addItem(() => `Mineshaft: take me there (${this.powered ? 'live' : 'dead'}, ${this.allFlags().filter((f) => this.has(f)).length}/${this.allFlags().length})`, () => {
      if (!this.ready) return;
      this.ride?.surface();
      const a = this.spot('arrive');
      this.player.teleport(a.x, a.z, Math.atan2(-Math.sin(this.site.place.yaw), -Math.cos(this.site.place.yaw)) + Math.PI);
    });
    cat.addItem('Mineshaft: take me to the cage', () => {
      if (!this.ready) return;
      this.ride?.surface();
      const g = this.spot('gate');
      this.player.teleport(g.x, g.z, this.site.place.yaw);
    });
    cat.addItem('Mineshaft: start it again (flags cleared)', () => {
      this.ride?.surface();
      for (const f of this.allFlags()) this.progress?.setFlag(f, false);
      this.reset();
    });
    cat.addItem('Mineshaft: give me a battery', () => this.combat.inventory?.addBattery?.(1));
    this.ride?.addDebugItems?.(cat);
  }

  overlayLine() {
    if (!this.ready) return 'mine -';
    return `mine ${this.powered ? 'live' : 'dead'} ${this.ride?.overlayLine?.() ?? ''}`;
  }

  dispose() {
    this.ride?.dispose?.();
  }
}
