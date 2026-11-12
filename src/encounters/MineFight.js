// What comes at Tom on the ride down the mine (Session 30; DESIGN.md
// "Abandoned mineshaft": "It rattles down the rails through the tunnels
// while Tom shoots zombie miners, beetles and giant moths"; the ride:
// encounters/MineRide.js; the script: config.mineshaft.fight; the texts:
// data/mineshaft.json).
//
//  - Zombie miners (the last shift: a zombie look, config.zombies): stood
//    about the drift ahead of the cart, on the rails and off them. They
//    come for Tom when he's near. One on the rails in front of the cart at
//    speed is hit by it.
//  - Giant beetles (ai/Beetles.js, a second pool for the mine): up out of
//    the ballast ahead, a threat display, then a charge up the rails.
//  - Giant moths, their real behaviour (ai/Moths.js): roosts hung under
//    the roof timbers, eyes lit, seen before they're reached. The cart
//    coming wakes a roost and it streams after it down the drift, one or
//    two diving at Tom every second or two. Shot at from far off, a roost
//    scatters: most of it flees. At the bottom they break off and go over
//    the bulkhead.
//  - The two stops (the points, the fall): the dead walk in from ahead and
//    behind while Tom's down off the cart; over the fall a roost wakes
//    when he's been at the rock a while.
//
// The mine's a pocket under the map (world/Interiors.js): the dead down
// here can't see or hear as the dead above do (Tom's unseen inside an
// interior), so the fight tells the near ones where he is.
//
// After the cart's been to the bottom once the mine's quiet: begin() deals
// nothing. Nothing here is saved: a ride begun again begins again.
//
// Events: 'mine:rammed' { zombie }.

import { halfAt, pointAt } from '../world/mineTrack.js';
import { ID } from './MineRide.js';
import data from '../data/mineshaft.json';

// ---- the pure parts (tested) ----------------------------------------------------------------

// The script entries the cart has reached and not yet fired: s the cart's place, fired a Set of indices.
export function due(script, s, fired) {
  const out = [];
  script.forEach((e, i) => {
    if (!fired.has(i) && s >= e.at) out.push(i);
  });
  return out;
}

// Where a roost's moths hang: `count` places along [s0, s1], under the caps, alternating sides: [{ s, lat, k }]
// (k: 0..1 along it).
export function roostPlaces(s0, s1, count) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const k = count === 1 ? 0.5 : i / (count - 1);
    out.push({ s: s0 + (s1 - s0) * k, lat: ((i % 3) - 1) * 0.75 + (i % 2 ? 0.2 : -0.2), k });
  }
  return out;
}

// Is a zombie at (zs, zlat) (along the track, across it) in front of the cart's nose at speed?
export function rammed(rc, cartS, speed, zs, zlat) {
  if (speed < rc.speed) return false;
  const ahead = zs - (cartS + 1.2); // from the cart's nose
  return ahead > -0.6 && ahead < rc.reach && Math.abs(zlat) < rc.half;
}

export class MineFight {
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.fc = cfg.mineshaft.fight;
    this.bus = bus;
    this.miners = [];
    this.fired = new Set();
    this.roosts = new Map(); // id -> { s0, s1, woke }
    this.waves = [];
    this.said = new Set();
    this.quiet = true;
    this.token = {};
  }

  // ctx: { enemies, beetles (a Beetles of the mine's own), moths, combat, player, notify, rng }.
  init(ctx) {
    Object.assign(this, ctx);
    this.rng ??= { next: Math.random };
    this.sfx = this.combat?.sfx;
    this.bus.on('moths:roostHit', ({ group }) => this.roostShot(group));
    this.bus.on('mine:stop', ({ id }) => this.halted(id));
    this.bus.on('mine:bottom', () => this.atBottom());
    this.bus.on('beetle:out', ({ beetle }) => {
      if (beetle.space === ID && this.say('beetles')) this.notify?.(data.fight.beetles);
    });
  }

  say(key) {
    if (this.said.has(key)) return false;
    this.said.add(key);
    return true;
  }

  // Going below: the script from the top (or nothing, once the bottom's been reached).
  begin(ride) {
    this.clear();
    this.ride = ride;
    this.quiet = ride.has('mineBottom');
    this.fired = new Set();
    this.said = new Set();
    this.waves = [];
    this.aware = 0;
    this.room = ride.room();
    this.moths?.setHabitat(this.habitat(ride));
  }

  // The brake's off (the ride's hook).
  rolling(ride) {
    if (this.quiet) return;
    if (ride.cart.s > 250 && this.say('steep')) this.ride.after(7, () => this.notify?.(data.fight.steep));
  }

  // Everything of the mine's put away (leaving it, a respawn, a new ride).
  clear() {
    for (const z of this.miners) {
      if (z.mine === this.token && z.state !== 'free') {
        z.state = 'free';
        z.tier = null;
      }
    }
    this.miners = [];
    this.token = {};
    this.beetles?.clear();
    this.moths?.clear();
    this.moths?.setHabitat(null);
    this.roosts.clear();
    this.waves = [];
  }

  // ---- the moths' habitat: the mine as they need it --------------------------------------------

  habitat(ride) {
    const hc = this.fc.moths;
    const track = ride.track;
    const o = ride.offset;
    const p = {};
    const room = this.room;
    return {
      hc,
      // A waking moth's place in the stream: `along` the track from Tom, drifting; across by its own lat.
      slot: (m, t, out) => {
        const sl = m.slot;
        const s = Math.max(track.s0 + 1, Math.min(track.length, ride.cart.s + sl.along + Math.sin(t * 0.7 * sl.speed + sl.phase) * 2.5));
        const half = halfAt(track, s) - 0.6;
        pointAt(track, s, p);
        const lat = sl.lat * half * Math.cos(t * 0.5 * sl.speed + sl.phase);
        out.x = p.x + Math.cos(p.yaw) * lat + o.x;
        out.y = p.y + sl.up + Math.sin(t * 1.3 + sl.phase) * 0.25 + o.y;
        out.z = p.z - Math.sin(p.yaw) * lat + o.z;
        return out;
      },
      // Inside the tunnel: off its walls, its floor and its roof.
      clamp: (m) => {
        const c = room.confine(m, m.y, 0.45);
        const lo = c.floor + o.y + 0.5;
        const hi = c.floor + o.y + track.roof - 0.45;
        if (m.y < lo) {
          m.y = lo;
          if (m.v.y < 0) m.v.y = 0;
        } else if (m.y > hi) {
          m.y = hi;
          if (m.v.y > 0) m.v.y = 0;
        }
      },
      floorAt: (m) => room.floorAt(m.x, m.z, m.y),
      speed: () => Math.max(this.cfg.spikes.moths.millSpeed, ride.cart.speed + hc.speedOver),
      dartSpeed: () => Math.max(this.cfg.spikes.moths.dartSpeed, ride.cart.speed + hc.dartSpeedOver),
      // Away: on down the drift ahead of the cart, up under the roof.
      away: (m, out) => {
        const s = Math.min(track.length, room.sAt(m.x, m.z, m.y) + 30);
        pointAt(track, s, p);
        out.x = p.x + o.x;
        out.y = p.y + track.roof - 0.5 + o.y;
        out.z = p.z + o.z;
        return out;
      },
    };
  }

  // ---- spawning --------------------------------------------------------------------------------

  miner(s, lat, mode = 'linger') {
    const a = this.ride.at(s, lat, 0);
    const cart = this.ride.cart.worldPoint();
    const z = this.enemies?.spawnZombie(a.x, a.z, { variant: 'miner', mode, space: ID, y: a.y, facing: Math.atan2(cart.x - a.x, cart.z - a.z) + (mode === 'linger' ? Math.PI : 0), authored: 'mine', linger: { x: a.x, z: a.z, r: 1.2 } });
    if (!z) return null;
    z.mine = this.token;
    this.miners.push(z);
    return z;
  }

  beetle(s, lat) {
    const a = this.ride.at(s, lat, 0);
    const cart = this.ride.cart.worldPoint();
    return this.beetles?.spawn(a.x, a.z, Math.atan2(cart.x - a.x, cart.z - a.z), { space: ID, y: a.y, floorAt: this.room.floorAt, confine: this.room.confine, speedScale: this.fc.beetleSpeed });
  }

  // A roost hung under the caps from s0 to s1.
  hang(r) {
    const pts = roostPlaces(r.s[0], r.s[1], r.count).map((q) => {
      const a = this.ride.at(q.s, q.lat, this.ride.track.roof - 0.62);
      return { x: a.x, y: a.y, z: a.z, facing: a.yaw + Math.PI };
    });
    const n = this.moths?.roost(pts, r.id) ?? 0;
    this.roosts.set(r.id, { s0: r.s[0], s1: r.s[1], woke: false, wakeAfter: r.wakeAfter ?? null, t: 0 });
    return n;
  }

  fire(e) {
    for (const [s, lat] of e.miners ?? []) this.miner(s, lat);
    for (const [s, lat] of e.beetles ?? []) this.beetle(s, lat);
    if (e.roost) this.hang(e.roost);
    if (e.miners && this.say('first')) this.ride.after(4.5, () => this.notify?.(data.fight.first));
  }

  // ---- each frame (the ride's update, while Tom's below) ---------------------------------------

  update(dt, ride) {
    if (this.quiet || !this.ride) return;
    this.beetles?.update(dt, true);
    const cart = ride.cart;
    for (const i of due(this.fc.script, cart.s, this.fired)) {
      this.fired.add(i);
      this.fire(this.fc.script[i]);
    }
    this.updateWaves(dt);
    this.updateRoosts(dt, ride);
    this.updateMiners(dt, ride);
    this.updateBeetles(ride);
  }

  // The beetles: one on the rails in front of the cart is hit by it (hurt, and shouldered past); those the
  // cart's left far behind are dropped.
  updateBeetles(ride) {
    const list = this.beetles?.list;
    if (!list?.length) return;
    const f = this.fc;
    const cart = ride.cart;
    const aboard = ride.phase === 'aboard';
    for (let i = list.length - 1; i >= 0; i--) {
      const b = list[i];
      const c = this.room.confine({ x: b.x, z: b.z }, b.y, 0);
      if (aboard && c.s < cart.s - f.behind) {
        list.splice(i, 1);
        continue;
      }
      if (!b.alive || b.rammedAt === Math.floor(cart.s / 6)) continue;
      if (aboard && cart.moving && rammed(f.ram, cart.s, cart.speed, c.s, c.lat)) {
        b.rammedAt = Math.floor(cart.s / 6); // once as it passes, not every frame
        this.beetles.hit(b, f.ram.beetle, 'weak');
        this.sfx?.play('cartHit', cart.worldPoint());
        this.player.shake?.(1.1);
      }
    }
  }

  // The stops' waves, on their clocks.
  updateWaves(dt) {
    if (!this.waves.length) return;
    for (const w of this.waves) w.t -= dt;
    const now = this.waves.filter((w) => w.t <= 0);
    this.waves = this.waves.filter((w) => w.t > 0);
    for (const w of now) for (const [s, lat] of w.miners) this.miner(s, lat, 'chase');
  }

  halted(id) {
    if (this.quiet || !this.ride) return;
    const st = this.fc.stops[id];
    if (!st || this.fired.has(`stop:${id}`)) return;
    this.fired.add(`stop:${id}`);
    for (const w of st.waves ?? []) this.waves.push({ t: w.after, miners: w.miners });
    if (st.roost) this.hang(st.roost);
  }

  // The roosts: the first sight of one, the cart waking it, a stop's waking on its clock.
  updateRoosts(dt, ride) {
    const hc = this.fc.moths;
    const s = ride.cart.s;
    for (const [id, r] of this.roosts) {
      if (r.woke) continue;
      if (!this.moths.roosting(id)) {
        r.woke = true;
        continue;
      }
      if (r.wakeAfter !== null) {
        // Over a stop: it wakes once Tom's been down off the cart a while.
        if (ride.phase === 'foot') r.t += dt;
        if (r.t >= r.wakeAfter) this.wakeRoost(id, false);
        continue;
      }
      if (s > r.s0 - 34 && this.say(`roost:${id}`) && this.say('roost')) this.notify?.(data.fight.roost);
      if (s >= r.s0 - hc.wake) this.wakeRoost(id, false);
    }
  }

  wakeRoost(id, scatter) {
    const r = this.roosts.get(id);
    if (!r || r.woke) return;
    r.woke = true;
    const out = this.moths.wake(id, scatter);
    if (!out.count) return;
    if (scatter) this.notify?.(data.fight.scattered);
    else if (this.say('woke')) this.notify?.(data.fight.woke);
  }

  // A shot into a roost: from far enough off it scatters; close, it just wakes.
  roostShot(group) {
    const r = this.roosts.get(group);
    if (!r || r.woke || !this.ride) return;
    const far = r.s0 - this.ride.cart.s > this.fc.moths.scatterBeyond;
    this.wakeRoost(group, far);
  }

  // The bottom: what's left of them breaks off.
  atBottom() {
    if (this.quiet || !this.ride) return;
    for (const id of this.roosts.keys()) this.wakeRoost(id, false);
    if (this.moths?.living > 0) {
      this.moths.dismiss();
      this.ride.after(2.2, () => this.notify?.(data.fight.left));
    }
  }

  // The miners: the near ones told where Tom is; the cart into those on the rails; the ones left behind dropped.
  updateMiners(dt, ride) {
    const f = this.fc;
    const cart = ride.cart;
    this.miners = this.miners.filter((z) => z.mine === this.token && z.state !== 'free');
    this.aware -= dt;
    const look = this.aware <= 0;
    if (look) this.aware = f.awareEvery;
    const p = this.player.position;
    const tomS = ride.phase === 'aboard' ? cart.s : this.room.sAt(p.x, p.z, p.y);
    const n = this.n ?? (this.n = {});
    for (const z of this.miners) {
      if (!z.alive) continue;
      const c = this.room.confine({ x: z.x, z: z.z }, z.y, 0, n);
      const zs = c.s;
      if (ride.phase === 'aboard' && cart.moving && rammed(f.ram, cart.s, cart.speed, zs, c.lat)) {
        this.ram(z, cart);
        continue;
      }
      if (zs < cart.s - f.behind && ride.phase === 'aboard') {
        z.state = 'free';
        z.tier = null;
        continue;
      }
      if (look && Math.abs(zs - tomS) < f.aware) this.enemies.brain?.chase(z, p.x, p.z, 3);
    }
  }

  ram(z, cart) {
    const w = cart.worldPoint();
    this.enemies.damage(z, this.fc.ram.damage, 'body', { id: 'mineCart', stagger: 1, knockback: this.fc.ram.knock }, { x: z.x, y: z.y + 1, z: z.z }, w);
    this.sfx?.play('cartHit', w);
    this.player.shake?.(0.9);
    this.bus.emit('mine:rammed', { zombie: z });
  }

  overlayLine() {
    if (this.quiet) return 'quiet';
    return `miners ${this.miners.filter((z) => z.alive).length} beetles ${this.beetles?.living.length ?? 0} roosting ${this.moths?.roosting() ?? 0} fired ${this.fired.size}`;
  }

  dispose() {}
}
