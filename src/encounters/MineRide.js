// The mine below the abandoned mineshaft: the cage down, the landing, the
// turret cart's ride to the bottom and back (Session 30; DESIGN.md
// "Abandoned mineshaft"; the track: world/mineTrack.js; the tunnel and the
// cart's model: render/mineModel.js; the cart: world/MineCart.js; what
// comes at Tom on the way: encounters/MineFight.js; the texts:
// data/mineshaft.json). The surface is encounters/Mineshaft.js, which
// hands over to this while Tom's below.
//
// The mine is an interior (world/Interiors.js): a pocket far under the
// clearing, loaded as the cage starts down and unloaded when it's back up.
//
//  1. The cage: Tom pulls the lever at the collar; the shaft's walls run
//     up past the bars for half a minute, the depth called off as it goes;
//     it hangs once, partway, then drops faster. Ridiculously deep.
//  2. The landing: the cage, a bench, the turret cart on the rails.
//  3. The cart: climb aboard, let off the brake. It runs by itself down the
//     drift; Tom works the gun. It halts where the way's shut:
//      - the points, set for a siding that's fallen in: climb down, throw
//        the lever;
//      - the fall, rock down across the rails: climb down, lever it clear
//        with the pinch bar (the hold drains if he lets go).
//     Each is done once (a flag): the next ride runs straight through.
//  4. The bottom: the buffers, and the bulkhead across the drift, barred,
//     silk all over it and a light under it. What's behind it, and the way
//     out, is encounters/MineBottom.js (Session 31).
//
// A place Tom can walk in is a room platform cut from the track (zone()):
// the landing, each stop, the bottom. Riding, his platform rides with the
// cart (the torch's glare wants the walls).
//
// Flags (RIDE_FLAGS). reset(): back on the surface, the cart at the landing.
// Events: 'mine:below', 'mine:landed', 'mine:stop' { id }, 'mine:cleared'
// { id }, 'mine:bottom', 'mine:up'.

import { HoldAction } from '../player/HoldAction.js';
import { buildTrack, pointAt, halfAt, nearest, confine, rayDistance, nextStop, cageDepth } from '../world/mineTrack.js';
import { buildMine, buildCart } from '../render/mineModel.js';
import { weatherFor } from '../render/propKit.js';
import { MineCart } from '../world/MineCart.js';
import { MineBottom, BOTTOM_FLAGS } from './MineBottom.js';
import data from '../data/mineshaft.json';

export const RIDE_FLAGS = ['mineBelow', 'minePoints', 'mineFall', 'mineBottom'];
export const ID = 'mineshaft';

const STOP_FLAG = { points: 'minePoints', fall: 'mineFall' };

// The stretch of track Tom can walk at each place the cart stands: [from, to] (s), pure.
export function zoneSpan(rc, track, where) {
  if (where === 'landing') return [-1.15, 23];
  if (where === 'bottom') return [rc.end - 5, track.length + (track.endRoom ?? 2.5) - 2.3]; // through the bulkhead to the foot of the cavern's end wall
  const st = rc.stops.find((s) => s.id === where);
  return st ? [st.s - 5, st.s + 12.5] : null;
}

export class MineRide {
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.mc = cfg.mineshaft;
    this.rc = cfg.mineshaft.ride;
    this.lc = cfg.mineshaft.lift;
    this.bus = bus;
    this.flags = [...RIDE_FLAGS, ...BOTTOM_FLAGS];
    this.track = buildTrack(this.mc.track);
    this.cart = new MineCart(cfg, bus);
    this.bottom = new MineBottom(cfg, bus, this); // Session 31: past the bulkhead
    this.phase = 'surface'; // 'descending' | 'foot' | 'aboard' | 'ascending'
    this.where = 'landing'; // where the cart stands (or last stood): 'landing' | a stop's id | 'bottom'
    this.offset = { x: 0, y: 0, z: 0 };
    this.hud = { prompt: '', progress: 0 };
    this.later = [];
    this.fadeK = 0;
  }

  // ctx: { scene, site (MineshaftSite), interiors, player, combat, enemies, progress, flashlight, vhud,
  // world, notify, hud (the surface beat's: one prompt for both), fight (MineFight, optional), rng(), and for
  // the bottom (encounters/MineBottom.js): lore, paper, card, dynamite }.
  init(ctx) {
    Object.assign(this, ctx);
    this.rng ??= Math.random;
    this.sfx = this.combat?.sfx;
    this.hold = new HoldAction(this.cfg.station.hold.releaseDrain);
    this.hold.init();
    this.bottom.init(ctx);
    if (!this.ready) return;
    const p = this.site.place;
    const self = this;
    this.entrance = { x: p.x + this.mc.origin[0], z: p.z + this.mc.origin[1] };
    this.interiors.define({
      id: ID,
      name: 'Black Laurel No. 2',
      entrance: () => this.entrance,
      surfaceY: () => this.world.ground.heightAt(p.x, p.z),
      load: (scene, floorY) => this.load(scene, floorY),
      platform: (floorY) => this.cagePlatform(floorY),
      spawn: () => ({ x: this.entrance.x, z: this.entrance.z, yaw: Math.PI, pitch: 0 }),
      exit: () => this.exitPoint(),
      get light() {
        return self.bottom.light; // the mine's own, until the fire's behind him (encounters/MineBottom.js)
      },
      // What happens down here is in here with him: nothing's muffled.
      onEnter: () => {
        if (this.sfx) this.sfx.muffled = 1;
      },
      onLeave: () => {
        this.phase = 'surface';
      },
    });
    // The mine's own floor, walls and line of fire, for whatever's down there with him.
    const room = this.room();
    this.enemies?.spaces?.set(ID, room);
    this.combat?.weapons?.spaceRays?.set(ID, room.ray);
    this.bus.on('mine:cartStopped', ({ at }) => this.cartStopped(at));
  }

  get ready() {
    return Boolean(this.site?.ready && this.interiors);
  }

  get below() {
    return this.phase !== 'surface';
  }

  has(flag) {
    return Boolean(this.progress?.has(flag));
  }

  set(flag) {
    if (flag) this.progress?.setFlag(flag);
  }

  cleared() {
    const out = new Set();
    for (const [id, flag] of Object.entries(STOP_FLAG)) if (this.has(flag)) out.add(id);
    return out;
  }

  // ---- the mine's space ------------------------------------------------------------------------

  // Mine space <-> the world.
  toWorld(p, out = {}) {
    out.x = p.x + this.offset.x;
    out.y = p.y + this.offset.y;
    out.z = p.z + this.offset.z;
    return out;
  }

  // A point of the track in the world: s along it, lat across, up above the floor.
  at(s, lat = 0, up = 0) {
    const p = pointAt(this.track, s, {});
    return { x: p.x + Math.cos(p.yaw) * lat + this.offset.x, y: p.y + up + this.offset.y, z: p.z - Math.sin(p.yaw) * lat + this.offset.z, yaw: p.yaw, s };
  }

  // How far along the track a world point is.
  sOf(p) {
    return nearest(this.track, p.x - this.offset.x, p.y - this.offset.y, p.z - this.offset.z, null, this.n ?? (this.n = {})).s;
  }

  // What the dead, the beetles and a shot need of the mine (world space in and out).
  room() {
    const t = this.track;
    const o = this.offset;
    const n = {};
    const q = { x: 0, z: 0 };
    const c = {};
    const origin = { x: 0, y: 0, z: 0 };
    return {
      space: ID,
      floorAt: (x, z, y) => nearest(t, x - o.x, y - o.y, z - o.z, null, n).floor + o.y,
      sAt: (x, z, y) => nearest(t, x - o.x, y - o.y, z - o.z, null, n).s,
      confine: (pos, y, r) => {
        q.x = pos.x - o.x;
        q.z = pos.z - o.z;
        confine(t, q, y - o.y, r, null, c);
        pos.x = q.x + o.x;
        pos.z = q.z + o.z;
        return c;
      },
      ray: (from, dir, max) => {
        origin.x = from.x - o.x;
        origin.y = from.y - o.y;
        origin.z = from.z - o.z;
        return rayDistance(t, origin, dir, max, null);
      },
    };
  }

  load(scene, floorY) {
    const weather = weatherFor(this.cfg.props.weather, this.mc.look.weather);
    this.offset.x = this.entrance.x;
    this.offset.y = floorY;
    this.offset.z = this.entrance.z;
    this.model = buildMine(this.mc, this.track, { weather });
    this.model.group.position.set(this.offset.x, floorY, this.offset.z);
    scene.add(this.model.group);
    const cart = buildCart(this.mc, { weather });
    this.model.group.add(cart.root);
    this.cart.init({ model: cart, track: this.track, offset: this.offset, player: this.player, combat: this.combat, vhud: this.vhud });
    this.cart.place(this.rc.start);
    this.dress();
    return {
      group: this.model.group,
      dispose: () => {
        this.fight?.clear();
        this.cart.eject();
        cart.dispose();
        this.model?.dispose();
        this.model = null;
      },
    };
  }

  // The set as the flags say: the lever thrown, the fall cleared.
  dress() {
    if (!this.model) return;
    this.leverK = this.has('minePoints') ? 1 : 0;
    this.model.setLever(this.leverK);
    this.model.parts.fall.visible = !this.has('mineFall');
    this.bottom.dress();
  }

  // The room box Tom's in, cut again (something in it has changed: the bulkhead's open).
  rezone() {
    if (this.phase !== 'foot') return;
    const p = this.player.position;
    this.player.setPlatform(this.zone(this.where), p.x, p.z);
  }

  // A room platform (Player keepInRoom) over the track from s0 to s1, with whatever stands in it.
  zone(where) {
    const [s0, s1] = zoneSpan(this.rc, this.track, where);
    const mid = (s0 + s1) / 2;
    const p = pointAt(this.track, mid, {});
    // The box is as wide as the stretch's narrowest part; the bottom's (the drift, the bulkhead, the cavern)
    // as wide as its widest, with blocks to narrow it (the bottom's own).
    const deep = where === 'bottom';
    let half = deep ? 0 : Infinity;
    for (let s = s0; s <= s1; s += 1) half = deep ? Math.max(half, halfAt(this.track, s)) : Math.min(half, halfAt(this.track, s));
    const blocks = deep ? this.bottom.blocks(mid, half - 0.12, s0, s1) : [];
    const add = (s, hw, hl) => blocks.push([-hw, hw, s - mid - hl, s - mid + hl]);
    add(this.cart.s, 0.66, 1.25); // the cart
    if (where === 'landing') {
      for (const sd of [-1, 1]) blocks.push([sd * 1.0 - 0.06, sd * 1.0 + 0.06, -mid - 1.0, -mid + 1.0]); // the cage's sides
      blocks.push([-3.4, -2.2, 5.2 - mid, 6.8 - mid]); // the bench
    }
    if (where === 'fall' && !this.has('mineFall')) add(this.model.spots.fall.s, 1.0, 0.75);
    if (where === 'points') blocks.push([-2.5, -2.1, this.model.spots.pointsStand.s - mid - 0.2, this.model.spots.pointsStand.s - mid + 0.2]);
    if (where === 'bottom') add(this.rc.end + 3.6, 0.7, 0.2); // the buffers
    return { room: ID, space: ID, where, x: p.x + this.offset.x, z: p.z + this.offset.z, y: p.y + this.offset.y, hx: half - 0.12, hz: (s1 - s0) / 2, rx: Math.cos(p.yaw), rz: -Math.sin(p.yaw), fx: Math.sin(p.yaw), fz: Math.cos(p.yaw), roofY: this.track.roof - 0.4, blocks };
  }

  // The cage, shut round him while it runs.
  cagePlatform(floorY) {
    return { room: ID, space: ID, where: 'cage', x: this.entrance.x, z: this.entrance.z, y: floorY + 0.06, hx: 0.92, hz: 0.92, rx: 1, rz: 0, fx: 0, fz: 1, roofY: 2.2, blocks: [] };
  }

  // The platform that rides with the cart (the torch's glare wants walls; nothing walks on it).
  ridingPlatform() {
    const pl = this.rpl ?? (this.rpl = { room: ID, space: ID, where: 'cart', hz: 40, roofY: this.track.roof, blocks: [] });
    const p = pointAt(this.track, this.cart.s, {});
    pl.x = p.x + this.offset.x;
    pl.z = p.z + this.offset.z;
    pl.y = p.y + this.offset.y;
    pl.hx = halfAt(this.track, this.cart.s);
    pl.rx = Math.cos(p.yaw);
    pl.rz = -Math.sin(p.yaw);
    pl.fx = Math.sin(p.yaw);
    pl.fz = Math.cos(p.yaw);
    return pl;
  }

  // Out: at the cage's gate on the surface, his back to it.
  exitPoint() {
    const g = this.site.spots.gate;
    return { x: g.x, z: g.z, yaw: this.site.place.yaw };
  }

  // ---- the cage --------------------------------------------------------------------------------

  // Down (the surface beat's lever).
  descend() {
    if (!this.ready || this.below || this.has('mineSealed')) return false;
    this.later = [];
    this.interiors.enter(ID);
    this.phase = 'descending';
    this.t = 0;
    this.creak = 0.2;
    this.hung = false;
    this.where = 'landing';
    this.set('mineBelow');
    this.flashlight?.setOn?.(true);
    this.sfx?.play('cageStart', this.player.position);
    this.fight?.begin(this);
    this.bus.emit('mine:below');
    return true;
  }

  updateCage(dt) {
    const L = this.lc;
    const total = L.seconds + L.hang;
    this.t += dt;
    const t = this.t;
    const feet = cageDepth(t, L);
    const hanging = t > L.seconds * L.hangAt && t < L.seconds * L.hangAt + L.hang;
    if (hanging && !this.hung) {
      this.hung = true;
      this.player.shake?.(1.2);
      this.sfx?.play('cageJolt', this.player.position);
      this.notify?.(data.cage.hang);
    }
    // The walls run up past the bars: the sleeve's place repeats every two metres; at the last it lifts clear.
    const arrive = 1.5;
    const left = total - t;
    // For the eye: slow off the top, stopped at the hang, quicker after it.
    const k = hanging ? 0 : t < L.seconds * L.hangAt ? Math.min(1, 0.25 + t / 3) : Math.min(1.7, 0.3 + (t - L.seconds * L.hangAt - L.hang) / 2);
    this.vis = (this.vis ?? 0) + dt * L.speed * k;
    const run = this.vis % 2;
    if (left > arrive) this.model.setSleeve(run, true);
    else this.model.setSleeve(run + (1 - Math.max(0, left) / arrive) * 14, left > 0);
    if (!hanging) {
      this.creak -= dt;
      if (this.creak <= 0) {
        this.creak = L.creakEvery * (0.7 + this.rng() * 0.6);
        this.sfx?.play('cageCreak', this.player.position);
        this.player.shake?.(0.12);
      }
    }
    this.hud.prompt = left > 0.4 ? data.cage.depth.replace('{feet}', String(Math.round(feet / 10) * 10)) : '';
    this.hud.progress = 0;
    if (t >= total) this.land();
  }

  land() {
    this.model.setSleeve(0, false);
    this.phase = 'foot';
    this.player.shake?.(0.8);
    this.sfx?.play('cageJolt', this.player.position);
    const p = this.player.position;
    this.player.setPlatform(this.zone('landing'), p.x, p.z);
    this.notify?.(this.has('mineBottom') ? data.cage.landedAgain : data.cage.landed);
    this.bus.emit('mine:landed');
  }

  // Up: the cage's lever on the landing. Short: a fade, the walls running the other way, the collar.
  ascend() {
    if (this.phase !== 'foot' || this.where !== 'landing') return;
    this.phase = 'ascending';
    this.t = 0;
    const c = this.cagePlatform(this.offset.y);
    this.player.setPlatform(c, c.x, c.z);
    this.sfx?.play('cageStart', this.player.position);
    this.fight?.clear();
    this.fade(this.lc.upSeconds, () => this.surface(true));
  }

  // Back at the collar (the cage arriving, a debug item, or a respawn tidying up).
  surface(arrived = false) {
    if (!this.below) return;
    this.cart.eject();
    this.fight?.clear();
    this.phase = 'surface';
    if (this.interiors.id === ID) this.interiors.leave();
    this.hud.prompt = '';
    if (arrived) {
      this.sfx?.play('cageJolt', this.player.position);
      this.bus.emit('mine:up');
    }
  }

  reset() {
    this.later = [];
    this.fadeK = 0;
    this.fadeJob = null;
    this.showFade();
    this.cart.eject();
    this.fight?.clear();
    this.bottom.reset();
    this.phase = 'surface';
    this.where = 'landing';
  }

  // ---- each frame ------------------------------------------------------------------------------

  update(dt, input, playing, canInteract) {
    if (!this.below || !this.model) return;
    if (playing) {
      this.tickLater(dt);
      this.tickFade(dt);
    }
    if (this.phase === 'descending') {
      if (playing) this.updateCage(dt);
      return;
    }
    if (this.phase === 'cine') {
      // The closing cutscene: the bottom's (it runs while the game's held).
      this.bottom.update(dt, false);
      this.hud.prompt = '';
      this.hud.progress = 0;
      return;
    }
    if (this.phase === 'ascending') {
      if (playing) {
        this.t += dt;
        this.model.setSleeve(2 - ((this.t * this.lc.speed * 1.6) % 2), true);
      }
      this.hud.prompt = '';
      return;
    }
    if (playing) {
      this.cart.idle(dt);
      if (this.phase === 'aboard') this.player.platform = this.ridingPlatform();
      // The points' lever swinging over.
      const want = this.has('minePoints') ? 1 : 0;
      if (this.leverK !== want) {
        this.leverK = Math.min(1, this.leverK + dt * 2.5);
        this.model.setLever(this.leverK);
      }
      this.fight?.update(dt, this);
    }
    this.bottom.update(dt, playing);
    if (!this.below || !this.model) return; // the way out's end took him up (the bottom's finish)
    if (canInteract !== false && input && playing && !this.fadeJob) this.updateInteraction(dt, input);
    else {
      this.hud.prompt = '';
      this.hud.progress = 0;
      this.hold.update(dt, null, false, 1);
    }
  }

  // The cart's come to a halt: at a stop that's still shut, or the bottom.
  cartStopped(at) {
    if (!this.below) return;
    if (at === 'end') {
      this.where = 'bottom';
      if (!this.has('mineBottom')) {
        this.set('mineBottom');
        this.after(1.2, () => this.notify?.(data.bottom.arrive));
      }
      this.bus.emit('mine:bottom');
      return;
    }
    if (at === 'top') {
      this.where = 'landing'; // the way out's end (the bottom's: encounters/MineBottom.js)
      return;
    }
    this.where = at;
    this.notify?.(data.stops[at].halt);
    this.bus.emit('mine:stop', { id: at });
  }

  // ---- hold X ----------------------------------------------------------------------------------

  updateInteraction(dt, input) {
    this.device = input.activeDevice;
    const X = input.activeDevice === 'gamepad' ? 'X' : 'E';
    const best = this.phase === 'aboard' ? this.pickAboard(X) : this.pickFoot(X);
    const key = best?.act ? best.key : null;
    const done = this.hold.update(dt, key, input.isDown('interact'), best?.seconds ?? 1);
    if (done && best?.act) best.act();
    this.hud.prompt = best ? (this.hold.active && best.busy ? best.busy : best.prompt) : '';
    this.hud.progress = this.hold.key !== null ? this.hold.progress : 0;
    // The fuse's count goes over everything (Session 31).
    const banner = this.bottom.banner;
    if (banner) {
      this.hud.prompt = this.hud.prompt ? `${banner} · ${this.hud.prompt}` : banner;
      if (this.hold.key === null) this.hud.progress = Math.max(0, this.bottom.fuse / this.mc.escape.fuse);
    }
    if (this.phase === 'aboard') this.cart.hint = this.hud.prompt || null;
  }

  // Is the way on from where the cart stands open?
  wayOpen() {
    if (this.where === 'bottom') return false;
    const flag = STOP_FLAG[this.where];
    return !flag || this.has(flag);
  }

  pickAboard(X) {
    if (this.cart.moving || this.bottom.esc) return null;
    const H = this.mc.encounter.holds;
    const opt = (key, def, seconds, act) => ({ key, prompt: `Hold ${X}: ${def.prompt}`, busy: def.busy, seconds, act });
    if (this.wayOpen()) return opt('brake', data.cart.brake, H.lever, () => this.release());
    return opt('down', data.cart.down, this.rc.mountSeconds, () => this.climbDown());
  }

  pickFoot(X) {
    const p = this.player.position;
    const r = this.mc.encounter.interactRange;
    const H = this.mc.encounter.holds;
    const dist = (q) => (q ? Math.hypot(p.x - q.x, p.z - q.z) : Infinity);
    const opt = (key, def, seconds, act) => ({ key, prompt: `Hold ${X}: ${def.prompt}`, busy: def.busy, seconds, act });
    const cands = [];
    const add = (q, reach, o) => {
      const dd = dist(q);
      if (dd < reach) cands.push({ dd, o });
    };
    const spot = (name) => this.toWorld(this.model.spots[name]);
    const cart = this.cart.worldPoint();
    if (this.where === 'bottom') {
      // The fuse lit: the cart's the only thing worth reaching (a wide reach, a short hold).
      if (this.bottom.fuse !== null) add(cart, r + 1.4, opt('flee', data.out.board, 0.45, () => this.bottom.flee()));
      else add(cart, r + 0.6, opt('winch', data.cart.winch, H.winch, () => this.winchUp()));
      this.bottom.pick(add, opt, X);
    } else add(cart, r + 0.6, opt('board', data.cart.board, this.rc.mountSeconds, () => this.board()));
    if (this.where === 'landing') add(spot('cageLever'), r, opt('up', data.cage.up, H.lever, () => this.ascend()));
    if (this.where === 'points') {
      if (!this.has('minePoints')) add(spot('pointsLever'), r + 0.2, opt('points', data.stops.points, H.points, () => this.clear('points')));
    }
    if (this.where === 'fall') {
      if (!this.has('mineFall')) add(spot('fallStand'), r + 0.5, { ...opt('fall', data.stops.fall, H.fall, () => this.clear('fall')), stroke: true });
    }
    if (!cands.length) return null;
    cands.sort((a, b) => a.dd - b.dd);
    const best = cands[0].o;
    // Levering the rock: a grunt of iron on stone while he's at it.
    if (best.stroke && this.hold.active) {
      this.strokeT = (this.strokeT ?? 0) - 1 / 30;
      if (this.strokeT <= 0) {
        this.strokeT = 0.8;
        this.sfx?.play(best.strokeSfx ?? 'barPry', p);
      }
    }
    return best;
  }

  // ---- what each does --------------------------------------------------------------------------

  // up: facing back up the drift (the way out).
  board(up = false) {
    if (this.phase !== 'foot') return;
    this.cart.device = this.device;
    this.cart.mount(up);
    this.phase = 'aboard';
    this.player.platform = this.ridingPlatform();
  }

  // Down off the cart, beside it on the side with more room.
  climbDown() {
    if (this.phase !== 'aboard' || this.cart.moving) return;
    this.cart.leave();
    this.phase = 'foot';
    const pl = this.zone(this.where);
    const side = this.where === 'points' ? -1 : 1;
    const a = this.at(this.cart.s, side * 1.25);
    this.player.setPlatform(pl, a.x, a.z);
    this.player.yaw = a.yaw + Math.PI;
    this.sfx?.play('climb');
  }

  // The brake off: on down to the next halt.
  release() {
    if (this.phase !== 'aboard' || this.cart.moving) return;
    this.cart.go(nextStop(this.rc.stops, this.cleared(), this.cart.s + 0.5, this.rc.end));
    this.fight?.rolling(this);
  }

  // A stop's work done: the points thrown, the fall levered off the rails.
  clear(id) {
    this.set(STOP_FLAG[id]);
    this.sfx?.play(id === 'points' ? 'pointsThrow' : 'rockRoll', this.player.position);
    if (id === 'fall') {
      this.model.parts.fall.visible = false;
      // The zone without the rock in it.
      const p = this.player.position;
      this.player.setPlatform(this.zone('fall'), p.x, p.z);
    }
    this.notify?.(data.stops[id].done);
    this.bus.emit('mine:cleared', { id });
  }

  // The bottom's as far as this build goes: the cart winched back up to the landing.
  winchUp() {
    if (this.phase !== 'foot' || this.where !== 'bottom' || this.bottom.fuse !== null) return;
    this.sfx?.play('cartStart', this.player.position);
    this.fade(2.4, () => {
      this.fight?.clear();
      this.cart.place(this.rc.start);
      this.where = 'landing';
      const a = this.at(this.rc.start - 3, 1.2);
      this.player.setPlatform(this.zone('landing'), a.x, a.z);
      this.player.yaw = Math.PI;
      this.notify?.(data.cart.winched);
    });
  }

  // ---- a fade to black and back ----------------------------------------------------------------

  // Out over a third of `seconds`, `mid` at black, held, then up.
  fade(seconds, mid) {
    this.fadeJob = { t: 0, seconds, mid, done: false };
  }

  tickFade(dt) {
    const f = this.fadeJob;
    if (!f) return;
    f.t += dt;
    const edge = Math.min(0.6, f.seconds / 3);
    if (f.t < edge) this.fadeK = f.t / edge;
    else if (f.t < f.seconds - edge) {
      this.fadeK = 1;
      if (!f.done && f.t >= f.seconds / 2) {
        f.done = true;
        f.mid?.();
      }
    } else if (f.t < f.seconds) {
      if (!f.done) {
        f.done = true;
        f.mid?.();
      }
      this.fadeK = (f.seconds - f.t) / edge;
    } else {
      this.fadeK = 0;
      this.fadeJob = null;
    }
    this.showFade();
  }

  showFade() {
    if (typeof document === 'undefined') return;
    if (!this.fadeEl) {
      if (this.fadeK <= 0) return;
      this.fadeEl = document.createElement('div');
      this.fadeEl.style.cssText = 'position:fixed;inset:0;background:#000;pointer-events:none;z-index:40;opacity:0';
      document.body.appendChild(this.fadeEl);
    }
    this.fadeEl.style.opacity = String(Math.max(0, Math.min(1, this.fadeK)));
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

  // ---- debug -------------------------------------------------------------------------------------

  // Straight to a place below, on foot beside the cart (debug).
  jump(where) {
    if (!this.ready) return;
    if (!this.below) {
      this.interiors.enter(ID);
      this.set('mineBelow');
      this.flashlight?.setOn?.(true);
      this.fight?.begin(this);
    }
    this.cart.eject();
    this.model.setSleeve(0, false);
    this.phase = 'foot';
    this.where = where;
    const st = this.rc.stops.find((s) => s.id === where);
    this.cart.place(where === 'landing' ? this.rc.start : where === 'bottom' ? this.rc.end : st.s);
    const a = this.at(this.cart.s - 2.5, where === 'points' ? -1.2 : 1.2);
    this.player.setPlatform(this.zone(where), a.x, a.z);
    this.player.yaw = a.yaw + Math.PI;
  }

  addDebugItems(cat) {
    cat.addItem(() => `Mineshaft: down to the landing (${this.phase} ${this.where})`, () => this.jump('landing'));
    cat.addItem('Mineshaft: to the points', () => this.jump('points'));
    cat.addItem('Mineshaft: to the fall', () => this.jump('fall'));
    cat.addItem('Mineshaft: to the bottom', () => this.jump('bottom'));
    cat.addItem('Mineshaft: push the plunger (from anywhere at the bottom)', () => this.bottom.push());
    cat.addItem('Mineshaft: to the bottom, the bulkhead open', () => {
      this.set('mineBottom');
      this.set('mineBulkhead');
      this.jump('bottom');
      this.dress();
      this.rezone();
      this.fight?.hangCavern?.(this);
    });
  }

  overlayLine() {
    return `${this.phase} ${this.where} ${this.below ? `${this.cart.overlayLine()} ${this.bottom.overlayLine()}` : this.has('mineSealed') ? 'sealed' : ''} ${this.fight?.overlayLine?.() ?? ''}`;
  }

  dispose() {
    this.fadeEl?.remove();
  }
}
