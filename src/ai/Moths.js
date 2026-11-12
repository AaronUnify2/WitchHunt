// Session 25 (debug spike; Aaron: "Could you add the giant moths into the
// game, summonable from the debug menu? I'd really love to shoot some of
// them"). A swarm of giant moths (the model and its one-draw-call renderer:
// Session 24, render/MothRenderer.js) that comes for Tom. Rough on purpose,
// a first guess to tune after he plays; not in the story yet (the
// mineshaft, the cave).
//
//  - They mill in a loose cloud round a point 3 to 5 m up near Tom ('fly'),
//    each in its own slot of the cloud, wandering.
//  - Every second or two one or two dart at him ('dart'); one that reaches
//    him nips (a little damage) and peels back up to the cloud.
//  - Each moth is one of the weapons' extra targets (a small hit shape, no
//    aim assist: the aim would stick to the whole cloud). Low health: a
//    shotgun blast can drop several, a service rifle round drops one.
//    Shot: a flinch; killed: it tumbles down ('dying', the eyes going out)
//    and lies on the ground ('corpse') for a few seconds.
//  - With the last one dead, or sent away, the rest leave.
//  - One draw call whatever the number; no lights; one quiet flutter for
//    the swarm, not one per moth per beat.
// Off in Demo mode (Game doesn't run it there).
//
// Session 30 (the mineshaft: their real behaviour, built on the spike):
//  - They roost: hung folded under the roof timbers, eyes lit, in a group
//    (roost(points, group)); still, and a target.
//  - They wake (wake(group, scatter)): they drop, open, and come after Tom
//    in a stream. Woken by a shot from far off they scatter instead: most
//    flee, a few come.
//  - Where they fly is their habitat's say (setHabitat(h)): the mine gives
//    each its place along the track from Tom, keeps them inside the tunnel,
//    tells them how fast the cart's going (they keep up), where the floor
//    is under one that's shot, and which way is away. With no habitat they
//    behave as the spike did, out in the open.
//
// config.spikes.moths (and the habitat's own numbers). Events: 'moths:nipped' { damage },
// 'moths:killed' { left }, 'moths:gone', 'moths:roostHit' { group }, 'moths:woke' { group, count, fled }.

import { DEBUG, ENEMY_TABS } from '../debug/DebugMenu.js';
import { MothRenderer } from '../render/MothRenderer.js';
import { steerTo } from './flyerPath.js';

// ---- the pure parts (tested) ----------------------------------------------------------------

// How many of `want` can join `active` moths in a pool of `pool`.
export function spawnCount(active, pool, want) {
  return Math.max(0, Math.min(want, pool - active));
}

// Moth i's place in the cloud round (cx, cy, cz) at time t: each on its own
// slow orbit at its own radius and height, so the cloud churns.
// slot: { angle, radius, height, speed, bob } (rolled per moth).
export function cloudPoint(cx, cy, cz, slot, t, out = { x: 0, y: 0, z: 0 }) {
  const a = slot.angle + t * slot.speed;
  out.x = cx + Math.sin(a) * slot.radius;
  out.z = cz + Math.cos(a) * slot.radius;
  out.y = cy + slot.height + Math.sin(t * 1.3 + slot.angle * 3) * slot.bob;
  return out;
}

// Has a darting moth at p reached Tom's chest (tx, ty, tz)?
export function dartReached(p, tx, ty, tz, range) {
  return Math.hypot(p.x - tx, p.y - ty, p.z - tz) <= range;
}

// A hit on moth m: returns true if it kills it.
export function hurtMoth(m, amount) {
  if (m.health <= 0) return false;
  m.health -= amount;
  return m.health <= 0;
}

const FLYING = new Set(['fly', 'dart', 'peel', 'flinch', 'leave']);

// Session 30: how many of a roost of `count` flee when it's scattered (the rest come): pure.
export function scatterSplit(count, share) {
  const fled = Math.min(count, Math.round(count * share));
  return { fled, come: count - fled };
}

// A roosting moth's place in the stream once it wakes: rolled from the habitat's ranges with r() (0..1).
export function streamSlot(hc, r) {
  const mix = (a, b, k) => a + (b - a) * k;
  return { along: mix(hc.along[0], hc.along[1], r()), lat: r() * 2 - 1, up: mix(hc.up[0], hc.up[1], r()), speed: mix(0.5, 1.4, r()) * (r() < 0.5 ? 1 : -1), phase: r() * 6.28 };
}

export class Moths {
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.mc = cfg.spikes.moths;
    this.bus = bus;
    this.active = false;
    this.leaving = false;
    this.habitat = null; // Session 30: the mine (encounters/MineFight.js), or null out in the open
  }

  // ctx: { scene, player, combat, ground, sfx, notify, rng }.
  init(ctx) {
    Object.assign(this, ctx);
    const pool = this.cfg.moths.giant.poolSize;
    this.renderer = new MothRenderer(this.cfg.moths.giant);
    this.renderer.init(this.scene, pool);
    const c = this.mc;
    this.moths = [];
    for (let i = 0; i < pool; i++) {
      const m = { active: false, i, x: 0, y: 0, z: 0, facing: 0, pitch: 0, roll: 0, state: 'fly', timer: 0, flash: 0, seed: i * 0.37, health: 0, v: { x: 0, y: 0, z: 0 }, slot: null };
      m.target = {
        x: 0,
        y: 0,
        z: 0,
        targetable: false,
        alive: true,
        hitRadius: c.hitRadius,
        height: c.hitRadius * 2,
        headBottom: c.hitRadius * 2, // all body: no headshot on a moth
        headRadius: c.hitRadius,
        headshotMultiplier: 1,
        noAssist: true,
        takeHit: (amount) => this.hit(m, amount),
      };
      this.moths.push(m);
    }
    this.combat.weapons.extraTargets.push({ group: this.moths.map((m) => m.target) });
    this.time = 0;
    this.dartTimer = 0;
    this.flutterTimer = 0;
    this.centre = { x: 0, y: 0, z: 0 };
    this.goal = { x: 0, y: 0, z: 0 };
  }

  get living() {
    let n = 0;
    for (const m of this.moths) if (m.active && m.health > 0) n++;
    return n;
  }

  // ---- starting and stopping ----------------------------------------------------------------

  // `count` more moths, in from one side, some way off.
  send(count) {
    const c = this.mc;
    const n = spawnCount(this.moths.filter((m) => m.active).length, this.moths.length, count);
    if (n === 0) return 0;
    const t = this.player.position;
    const from = this.rng.range(0, Math.PI * 2);
    let k = 0;
    for (const m of this.moths) {
      if (k >= n) break;
      if (m.active) continue;
      const a = from + this.rng.range(-0.5, 0.5);
      const d = c.startDistance + this.rng.range(-4, 4);
      m.x = t.x + Math.sin(a) * d;
      m.z = t.z + Math.cos(a) * d;
      m.y = t.y + this.rng.range(c.cloudHeight[0], c.cloudHeight[1]) + 4;
      m.v.x = m.v.y = m.v.z = 0;
      m.health = c.health;
      m.flash = 0;
      m.state = 'fly';
      m.timer = 0;
      m.active = true;
      m.roll = 0;
      m.slot = {
        angle: this.rng.range(0, Math.PI * 2),
        radius: this.rng.range(c.cloudRadius[0], c.cloudRadius[1]),
        height: this.rng.range(c.cloudHeight[0], c.cloudHeight[1]),
        speed: this.rng.range(c.orbitSpeed[0], c.orbitSpeed[1]) * (this.rng.chance(0.5) ? 1 : -1),
        bob: this.rng.range(0.2, 0.7),
      };
      m.target.targetable = true;
      k++;
    }
    this.active = true;
    this.leaving = false;
    this.dartTimer = this.rng.range(c.dartEvery[0], c.dartEvery[1]) + 2;
    return n;
  }

  // ---- Session 30: roosts ------------------------------------------------------------------------

  // h: { hc (config: along, up, dartEvery, dartCount, nipDamage, leaveSeconds), slot(m, t, out), clamp(m),
  // floorAt(m), speed(), dartSpeed(), away(m, out) }, or null for the open air.
  setHabitat(h) {
    this.habitat = h;
  }

  // Hang moths at `points` ([{ x, y, z, facing }]) as the roost `group`. Returns how many (the pool may be short).
  roost(points, group) {
    const c = this.mc;
    let n = 0;
    for (const pt of points) {
      const m = this.moths.find((q) => !q.active);
      if (!m) break;
      m.x = pt.x;
      m.y = pt.y;
      m.z = pt.z;
      m.facing = pt.facing ?? 0;
      m.pitch = 0;
      m.roll = Math.PI; // hung by its feet
      m.v.x = m.v.y = m.v.z = 0;
      m.health = c.health;
      m.flash = 0;
      m.state = 'rest';
      m.timer = 0;
      m.group = group;
      m.active = true;
      m.leaveTo = null;
      m.slot = this.habitat ? streamSlot(this.habitat.hc, () => this.rng.next()) : { angle: this.rng.range(0, Math.PI * 2), radius: this.rng.range(c.cloudRadius[0], c.cloudRadius[1]), height: this.rng.range(c.cloudHeight[0], c.cloudHeight[1]), speed: this.rng.range(c.orbitSpeed[0], c.orbitSpeed[1]), bob: 0.4 };
      m.target.targetable = true;
      n++;
    }
    if (n) {
      this.active = true;
      this.leaving = false;
    }
    return n;
  }

  // How many of `group` still hang (all roosts if left out).
  roosting(group = null) {
    let n = 0;
    for (const m of this.moths) if (m.active && m.state === 'rest' && (group === null || m.group === group)) n++;
    return n;
  }

  // The roost `group` wakes: they drop and come (scatter: most flee instead). Returns { count, fled }.
  wake(group, scatter = false) {
    const list = this.moths.filter((m) => m.active && m.state === 'rest' && m.group === group);
    if (!list.length) return { count: 0, fled: 0 };
    const { fled } = scatter ? scatterSplit(list.length, this.habitat?.hc.scatter ?? 0.6) : { fled: 0 };
    list.forEach((m, i) => {
      m.roll = 0;
      m.v.y = -2.5; // it lets go
      m.timer = 0;
      m.state = i < fled ? 'leave' : 'fly';
      m.leaveTo = null;
    });
    const hc = this.habitat?.hc;
    const every = hc?.dartEvery ?? this.mc.dartEvery;
    this.dartTimer = Math.max(this.dartTimer, 0) + this.rng.range(every[0], every[1]) + 1.2;
    this.sfx?.play('mothWake', list[0]);
    this.bus?.emit('moths:woke', { group, count: list.length, fled });
    return { count: list.length, fled };
  }

  // The rest fly off.
  dismiss() {
    if (!this.active) return;
    this.leaving = true;
    const t = this.player.position;
    for (const m of this.moths) {
      if (!m.active || !FLYING.has(m.state)) continue;
      m.state = 'leave';
      m.timer = 0;
      if (this.habitat) {
        m.leaveTo = null; // the habitat says which way's away
        continue;
      }
      const a = Math.atan2(m.x - t.x, m.z - t.z) + this.rng.range(-0.4, 0.4);
      m.leaveTo = { x: t.x + Math.sin(a) * this.mc.leaveDistance * 1.5, y: t.y + 30, z: t.z + Math.cos(a) * this.mc.leaveDistance * 1.5 };
    }
  }

  clear() {
    for (const m of this.moths) {
      m.active = false;
      m.target.targetable = false;
    }
    this.active = false;
    this.leaving = false;
    this.renderer.update(this.moths, 0);
  }

  // ---- each frame ----------------------------------------------------------------------------

  update(dt, playing) {
    if (!this.active) return;
    if (playing) this.step(dt);
    for (const m of this.moths) {
      if (!m.active) continue;
      // The look: facing where it's going, nose with its climb, banked a little.
      const sp = Math.hypot(m.v.x, m.v.z);
      if (FLYING.has(m.state) && sp > 0.3) m.facing = Math.atan2(m.v.x, m.v.z);
      if (FLYING.has(m.state)) m.pitch = Math.max(-0.5, Math.min(0.5, -m.v.y * 0.08));
      m.flash = Math.max(0, m.flash - dt);
      const tg = m.target;
      tg.x = m.x;
      tg.y = m.y - this.mc.hitRadius;
      tg.z = m.z;
    }
    this.renderer.update(this.moths, dt);
  }

  step(dt) {
    const c = this.mc;
    const t = this.player.position;
    const hab = this.habitat;
    const mill = hab ? hab.speed() : c.millSpeed;
    this.time += dt;
    // The cloud's middle drifts after Tom (it lags, so he can step out from under it).
    const k = Math.min(1, dt * c.follow);
    this.centre.x += (t.x - this.centre.x) * k;
    this.centre.z += (t.z - this.centre.z) * k;
    this.centre.y = t.y;
    if (Math.hypot(this.centre.x - t.x, this.centre.z - t.z) > 30) Object.assign(this.centre, { x: t.x, y: t.y, z: t.z });
    // Who darts next.
    if (!this.leaving) {
      this.dartTimer -= dt;
      if (this.dartTimer <= 0) {
        const every = hab?.hc.dartEvery ?? c.dartEvery;
        const each = hab?.hc.dartCount ?? c.dartCount;
        this.dartTimer = this.rng.range(every[0], every[1]);
        const milling = this.moths.filter((m) => m.active && m.state === 'fly');
        const n = Math.min(milling.length, this.rng.int(each[0], each[1]));
        for (let i = 0; i < n; i++) {
          const m = milling.splice(this.rng.int(0, milling.length - 1), 1)[0];
          m.state = 'dart';
          m.timer = 0;
        }
      }
    }
    let flying = 0;
    let anyActive = false;
    for (const m of this.moths) {
      if (!m.active) continue;
      anyActive = true;
      m.timer += dt;
      switch (m.state) {
        case 'rest':
          break; // hung under a timber, still
        case 'fly':
          if (hab) hab.slot(m, this.time, this.goal);
          else cloudPoint(this.centre.x, this.centre.y, this.centre.z, m.slot, this.time, this.goal);
          steerTo(m, m.v, this.goal, mill, c.steer * (hab ? 1.6 : 1), dt);
          break;
        case 'dart': {
          const ty = t.y + c.dartAt;
          const target = { x: t.x, y: ty, z: t.z };
          steerTo(m, m.v, target, hab ? hab.dartSpeed() : c.dartSpeed, c.steer * 2.2, dt);
          if (dartReached(m, t.x, ty, t.z, c.nipRange)) {
            const nip = hab?.hc.nipDamage ?? c.nipDamage;
            this.combat.hurtPlayer?.(nip, 0.4);
            this.bus?.emit('moths:nipped', { damage: nip });
            this.sfx?.play('mothNip', m);
            m.state = 'peel';
            m.timer = 0;
          } else if (m.timer > c.dartMax) {
            m.state = 'peel';
            m.timer = 0;
          }
          break;
        }
        case 'peel':
          // Back up and away to its slot, quickly, then milling again.
          if (hab) hab.slot(m, this.time, this.goal);
          else {
            cloudPoint(this.centre.x, this.centre.y, this.centre.z, m.slot, this.time, this.goal);
            this.goal.y += 1.5;
          }
          steerTo(m, m.v, this.goal, mill * 1.4, c.steer, dt);
          if (m.timer > c.peelSeconds) m.state = 'fly';
          break;
        case 'flinch':
          m.v.x *= 1 - Math.min(1, dt * 4);
          m.v.z *= 1 - Math.min(1, dt * 4);
          m.x += m.v.x * dt;
          m.y += m.v.y * dt;
          m.z += m.v.z * dt;
          if (m.timer > c.flinchSeconds) m.state = this.leaving ? 'leave' : 'fly';
          break;
        case 'leave': {
          if (hab) {
            // Away down the drift, and gone.
            steerTo(m, m.v, hab.away(m, this.goal), mill + 3, c.steer, dt);
            if (m.timer > hab.hc.leaveSeconds) {
              m.active = false;
              m.target.targetable = false;
            }
            break;
          }
          if (!m.leaveTo) {
            const a = Math.atan2(m.x - t.x, m.z - t.z);
            m.leaveTo = { x: t.x + Math.sin(a) * c.leaveDistance * 1.5, y: t.y + 30, z: t.z + Math.cos(a) * c.leaveDistance * 1.5 };
          }
          steerTo(m, m.v, m.leaveTo, c.leaveSpeed, c.steer, dt);
          if (Math.hypot(m.x - t.x, m.z - t.z) > c.leaveDistance) {
            m.active = false;
            m.target.targetable = false;
          }
          break;
        }
        case 'dying': {
          // Tumbling down; on the ground, it lies there.
          m.v.y -= c.fallGravity * dt;
          m.v.x *= 1 - Math.min(1, dt * 1.5);
          m.v.z *= 1 - Math.min(1, dt * 1.5);
          m.x += m.v.x * dt;
          m.y += m.v.y * dt;
          m.z += m.v.z * dt;
          const g = (hab ? hab.floorAt(m) : this.ground?.heightAt(m.x, m.z) ?? t.y) + 0.12;
          if (m.y <= g) {
            m.y = g;
            m.state = 'corpse';
            m.timer = 0;
            m.pitch = 0;
            this.sfx?.play('mothThud', m);
          }
          break;
        }
        case 'corpse':
          if (m.timer > c.corpseSeconds) m.active = false;
          break;
        default:
          break;
      }
      if (FLYING.has(m.state)) {
        flying++;
        if (hab) hab.clamp(m); // inside the tunnel
        else {
          // Never down into the ground.
          const floor = (this.ground?.heightAt(m.x, m.z) ?? t.y) + 0.5;
          if (m.y < floor) {
            m.y = floor;
            if (m.v.y < 0) m.v.y = 0;
          }
        }
      }
    }
    // One quiet flutter for the swarm, from its middle.
    this.flutterTimer -= dt;
    if (flying > 0 && this.flutterTimer <= 0) {
      this.flutterTimer = c.flutterEvery;
      this.sfx?.play('mothFlutter', hab ? { x: t.x, z: t.z } : { x: this.centre.x, z: this.centre.z });
    }
    if (!anyActive) {
      this.active = false;
      this.leaving = false;
      this.bus?.emit('moths:gone');
    }
  }

  // A shot (a pellet's share of a blast arrives as one total) or a swing.
  hit(m, amount) {
    if (!m.active || m.health <= 0) return false;
    m.flash = this.cfg.moths.giant.hitFlashSeconds;
    // Session 30: a shot into a roost: it knows (the habitat's owner decides whether it wakes or scatters).
    const roosting = m.state === 'rest';
    if (roosting) {
      m.roll = 0;
      this.bus?.emit('moths:roostHit', { group: m.group });
    }
    if (hurtMoth(m, amount)) {
      m.state = 'dying';
      m.timer = 0;
      m.target.targetable = false;
      m.v.y = Math.min(m.v.y, 1);
      this.sfx?.play('mothDie', m);
      const left = this.living;
      this.bus?.emit('moths:killed', { left });
      if (left === 0 && !this.habitat) this.notify?.('The last of them drops');
      return true;
    }
    m.state = 'flinch';
    m.timer = 0;
    return false;
  }

  // ---- debug -----------------------------------------------------------------------------------

  addDebugItems(menu) {
    const sp = menu.tab(DEBUG.enemies, ENEMY_TABS.moths); // Session 25: the Enemies menu
    sp.addItem(() => `Moths: send a swarm at me (${this.mc.swarm}; ${this.living} up)`, () => this.send(this.mc.swarm));
    sp.addItem(() => `Moths: send a big swarm (${this.mc.bigSwarm})`, () => this.send(this.mc.bigSwarm));
    sp.addItem('Moths: send them away', () => this.dismiss());
  }

  overlayLine() {
    if (!this.active) return 'moths -';
    const s = {};
    for (const m of this.moths) if (m.active) s[m.state] = (s[m.state] ?? 0) + 1;
    return `moths ${Object.entries(s).map(([k, v]) => `${k} ${v}`).join(' ')}${this.leaving ? ' LEAVING' : ''}`;
  }

  dispose() {
    this.renderer?.dispose();
  }
}
