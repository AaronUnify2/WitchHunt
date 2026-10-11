// Owns the zombie pool (no allocation while playing): spawning (singles,
// hordes and mutants, by level and variant), each zombie's brain
// (detection and targeting), moving them, keeping them out of trees and
// rocks and apart from each other, gunfire alerts, thinning out at dawn,
// and applying hits. Sigils decide when and where to spawn
// (ZombieDirector); M6 adds the simulation tiers.
//
// The zombie level (1-5) sets each spawn's speed range, health and the
// horde and mutant chances, and live: every zombie's speed (from its own
// roll), its damage and how far it notices the player.
//
// Events: 'enemy:hit' { x, y, z, part, killed, zombie }, 'enemy:killed'
// { zombie }, 'enemy:strike' { zombie, damage }, 'enemy:spawned' { count },
// 'enemy:charge' { zombie } (a mutant bursts forward), 'enemy:strikeDefence'
// { zombie, barrier, damage } (M5: a swipe at the station's defences).
//
// M5: `station` is the ranger station's siege hook (base/Station.js):
// { x, z (where the family are), baseRadius, routeRadius, reach,
// route(fromX, fromZ, toX, toZ, out) }. Zombies near it follow its route
// through the fence and doors and claw whatever's in the way.

import { Zombie } from './Zombie.js';
import { ZombieBrain } from './ZombieBrain.js';
import { PathRoutes } from './pathRoutes.js';
import { playerSenses } from './detection.js';
import { levelStats, clampLevel, speedRoll, speedFromRoll, pickVariant, planSpawn } from './zombieLevels.js';
import { resolveCircles } from '../world/collision.js';

const MODES = ['chase', 'search', 'wander', 'siege'];

export class EnemyManager {
  // cfg: the whole config (zombies, mutant, detection). world: { map,
  // ground, variantMixAt(x, z) }.
  constructor(cfg, rng, bus, world) {
    this.cfg = cfg.zombies;
    this.mutantCfg = cfg.mutant;
    this.detCfg = cfg.detection;
    this.rng = rng;
    this.bus = bus;
    this.world = world;
    this.ground = world.ground;
  }

  init(colliders) {
    this.colliders = colliders;
    this.pool = Array.from({ length: this.cfg.poolSize }, () => new Zombie(this.cfg));
    this.living = []; // alive zombies, refreshed every update
    this.nearby = [];
    this.level = 1;
    this.stats = levelStats(this.cfg.levels, 1);
    this.station = null; // M5: the station's siege hook (see the top of this file)
    this.routeOut = { active: false, x: 0, z: 0, barrier: null };
    this.senses = {};
    this.counts = { citizen: 0, police: 0, army: 0, mutant: 0, horde: 0, chase: 0, search: 0, wander: 0, siege: 0, rise: 0, stragglers: 0 };
    this.routes = new PathRoutes(this.world.map);
    this.brain = new ZombieBrain(this.detCfg, this.cfg.wander, this.routes, this.ground, this.rng.fork('brain'));
    this.onStrike = (zombie, barrier) => {
      if (barrier) this.bus.emit('enemy:strikeDefence', { zombie, barrier, damage: zombie.attackDamage * this.stats.defenceDamage });
      else this.bus.emit('enemy:strike', { zombie, damage: zombie.attackDamage * this.stats.damage });
    };
  }

  // ---- level ---------------------------------------------------------------

  setLevel(level) {
    level = clampLevel(level);
    if (level === this.level) return;
    this.level = level;
    this.stats = levelStats(this.cfg.levels, level);
    for (const z of this.pool) if (z.active && !z.speedRange) z.speed = this.speedFor(z.speedRoll, null);
  }

  speedFor(roll, range) {
    const [lo, hi] = range ?? [this.stats.speedMin, this.stats.speedMax];
    return speedFromRoll(roll, lo, hi, this.cfg.sprintSpeed);
  }

  // ---- spawning ------------------------------------------------------------

  // One zombie at (x, z). opts: { kind ('zombie' | 'mutant'), variant,
  // mode ('chase' | 'wander'), rise, speedRange [min, max] (multiples of
  // the sprint; else the level's), horde, owner (its sigil), facing }.
  // Returns the zombie, or null if the pool (or the mutant cap) is full.
  spawnZombie(x, z, opts = {}) {
    const kind = opts.kind ?? 'zombie';
    if (kind === 'mutant' && this.mutantCount >= this.mutantCfg.poolSize) return null;
    const slot = this.pool.find((p) => !p.active);
    if (!slot) return null;
    const c = this.cfg;
    const m = this.mutantCfg;
    const mutant = kind === 'mutant';
    const variant = mutant ? 'mutant' : opts.variant ?? 'citizen';
    const body = mutant ? m : c;
    const pos = { x, z };
    this.ground.clamp(pos);
    resolveCircles(pos, body.radius, this.colliders.query(pos.x, pos.z, body.radius, this.nearby));
    const range = opts.speedRange ?? (mutant ? [m.speedMin, m.speedMax] : null);
    const roll = speedRoll(this.rng, c.speedSkew);
    const baseHealth = mutant ? m.health : c.health * (c.variants[variant]?.health ?? 1);
    const facing = opts.facing ?? this.rng.range(0, Math.PI * 2);
    slot.spawn(pos.x, pos.z, facing, this.speedFor(roll, range), {
      kind,
      variant,
      body,
      health: baseHealth * this.stats.health,
      rise: opts.rise,
    });
    slot.y = this.ground.heightAt(slot.x, slot.z);
    slot.speedRoll = roll;
    slot.speedRange = range;
    slot.horde = opts.horde ?? null;
    slot.owner = opts.owner ?? null;
    slot.straggler = false;
    slot.fadeTimer = -1;
    slot.slowTimer = 0; // M5: spike traps slow it for a moment
    slot.slow = 1;
    this.brain.reset(slot, opts.mode ?? 'chase');
    return slot;
  }

  // A point at a random angle, `min`-`max` metres from (cx, cz).
  ringPoint(cx, cz, min, max) {
    const a = this.rng.range(0, Math.PI * 2);
    const d = this.rng.range(min, max);
    return { x: cx + Math.sin(a) * d, z: cz + Math.cos(a) * d };
  }

  // Spawn what planSpawn() rolled (a single, a mutant or a horde) round
  // (cx, cz). opts: { ringMin, ringMax, mix (variant mix), mode, rise,
  // owner, faceX, faceZ }. Returns how many spawned.
  spawnPlanned(plan, cx, cz, opts) {
    const { ringMin, ringMax, mix } = opts;
    const at = this.ringPoint(cx, cz, ringMin, ringMax);
    const face = (p) => (opts.faceX === undefined ? undefined : Math.atan2(opts.faceX - p.x, opts.faceZ - p.z));
    const base = { mode: opts.mode, rise: opts.rise, owner: opts.owner };
    let spawned = 0;
    if (plan.type === 'horde') {
      const h = this.cfg.horde;
      const pack = { leader: null, radius: h.radius };
      for (let i = 0; i < plan.count; i++) {
        const p = this.ringPoint(at.x, at.z, 0, h.radius);
        const z = this.spawnZombie(p.x, p.z, { ...base, variant: pickVariant(mix, this.rng), speedRange: [h.speedMin, h.speedMax], horde: pack, facing: face(p) });
        if (!z) break;
        pack.leader ??= z;
        spawned++;
      }
    } else {
      const kind = plan.type === 'mutant' ? 'mutant' : 'zombie';
      const z = this.spawnZombie(at.x, at.z, { ...base, kind, variant: pickVariant(mix, this.rng), facing: face(at) });
      if (z) spawned++;
    }
    if (spawned > 0) this.bus.emit('enemy:spawned', { count: spawned, type: plan.type });
    return spawned;
  }

  // Roll and spawn one raising at this level round (cx, cz).
  spawnRaising(cx, cz, opts) {
    const plan = planSpawn(this.stats, this.cfg.horde, this.rng, this.mutantCount < this.mutantCfg.poolSize);
    return { plan, spawned: this.spawnPlanned(plan, cx, cz, opts) };
  }

  // Debug: `count` singles in a ring round `center` (the player), coming
  // for them, with the local variant mix.
  spawnAround(center, count = this.cfg.spawnCount) {
    let spawned = 0;
    for (let i = 0; i < count; i++) spawned += this.spawnPlanned({ type: 'single', count: 1 }, center.x, center.z, this.debugOpts(center));
    return spawned;
  }

  // Debug: a horde or a mutant near `center`.
  spawnTypeNear(center, type) {
    const h = this.cfg.horde;
    const count = type === 'horde' ? this.rng.int(h.countMin, h.countMax) : 1;
    return this.spawnPlanned({ type, count }, center.x, center.z, this.debugOpts(center));
  }

  debugOpts(center) {
    const c = this.cfg;
    return { ringMin: c.spawnDistanceMin, ringMax: c.spawnDistanceMax, mix: this.world.variantMixAt(center.x, center.z), mode: 'chase', faceX: center.x, faceZ: center.z };
  }

  // Kill every zombie straight away and return them to the pool.
  clear() {
    for (const z of this.pool) z.state = 'free';
    this.living.length = 0;
  }

  // ---- each frame ------------------------------------------------------------

  // player: { x, z, eyeY, daylight, torchOn, crouched, sprinting, speed,
  // undergrowth } (see detection.js).
  update(dt, player) {
    const c = this.cfg;
    const senses = playerSenses(player, this.detCfg, this.stats.notice, this.senses);
    this.brain.tick(dt);
    this.living.length = 0;
    for (const z of this.pool) {
      if (!z.active) continue;
      if (z.alive && z.state !== 'rise') {
        this.brain.update(z, dt, senses, this.station);
        this.updateFade(z, dt, player);
        this.routeAtStation(z, player);
      }
      z.moveScale = 1 + (c.undergrowthMultiplier - 1) * this.ground.undergrowthAt(z.x, z.z);
      if (z.slowTimer > 0) {
        z.slowTimer -= dt;
        z.moveScale *= z.slow;
      }
      z.update(dt, player, this.onStrike);
      if (z.chargeStarted) {
        z.chargeStarted = false;
        this.bus.emit('enemy:charge', { zombie: z });
      }
      if (z.alive) {
        resolveCircles(z, z.radius, this.colliders.query(z.x, z.z, z.radius, this.nearby));
        this.ground.clamp(z);
        this.living.push(z);
      }
    }
    this.separate();
    for (const z of this.pool) if (z.active) z.y = this.ground.heightAt(z.x, z.z);
  }

  // M5: near the station, where to walk to get through its defences to
  // what it's after (the player, the family, or where it last saw you).
  routeAtStation(z, player) {
    const st = this.station;
    if (!st || Math.hypot(z.x - st.x, z.z - st.z) > st.routeRadius) {
      if (z.via) z.clearVia();
      return;
    }
    let tx;
    let tz;
    if (z.mode === 'chase') {
      // Aaron (M5): whichever is nearer, you or the defence between it and
      // the family. If a door or fence on the way in is closer, it claws that.
      const inward = st.route(z.x, z.z, st.x, st.z, this.routeOut);
      if (inward.active && inward.barrier && Math.hypot(inward.x - z.x, inward.z - z.z) < Math.hypot(player.x - z.x, player.z - z.z)) {
        this.setVia(z, inward, st);
        return;
      }
      tx = player.x;
      tz = player.z;
    } else if (z.mode === 'siege') {
      tx = st.x;
      tz = st.z;
    } else if (z.mode === 'search') {
      tx = z.goalX;
      tz = z.goalZ;
    } else {
      if (z.via) z.clearVia();
      return;
    }
    this.setVia(z, st.route(z.x, z.z, tx, tz, this.routeOut), st);
  }

  setVia(z, out, st) {
    z.via = out.active;
    z.viaX = out.x;
    z.viaZ = out.z;
    z.barrier = out.active ? out.barrier : null;
    z.viaReach = st.reach;
  }

  // Push overlapping zombies apart (a pool of 64, so pairwise is cheap).
  separate() {
    const c = this.cfg;
    const extra = c.separation - c.radius * 2; // gap kept between bodies
    const list = this.living;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        const minDist = a.radius + b.radius + extra;
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        if (dx > minDist || dx < -minDist || dz > minDist || dz < -minDist) continue;
        const d = Math.hypot(dx, dz);
        if (d >= minDist) continue;
        const nx = d > 1e-6 ? dx / d : 1;
        const nz = d > 1e-6 ? dz / d : 0;
        // The bigger body gives way less (a mutant shoulders zombies aside).
        const share = b.radius / (a.radius + b.radius);
        const push = minDist - d;
        a.x -= nx * push * share;
        a.z -= nz * push * share;
        b.x += nx * push * (1 - share);
        b.z += nz * push * (1 - share);
      }
    }
  }

  // ---- noise and dawn ----------------------------------------------------------

  // A loud noise at (x, z), e.g. a gunshot: every living zombie within
  // `radius` (times the level's notice) comes for the player.
  alert(x, z, radius) {
    const r = radius * this.stats.notice;
    let n = 0;
    for (const zb of this.living) {
      if (zb.state === 'rise' || Math.hypot(zb.x - x, zb.z - z) > r) continue;
      this.brain.chase(zb, x, z, this.detCfg.gunfireMemory);
      n++;
    }
    return n;
  }

  // Dawn: most zombies sink back into the ground over the next
  // `withinSeconds`; a few (config) stay as daytime stragglers.
  thinOut(withinSeconds) {
    const d = this.cfg.dawn;
    for (const z of this.living) {
      if (z.straggler) continue;
      if (this.rng.chance(d.stragglers)) z.straggler = true;
      else z.fadeTimer = this.rng.range(0, withinSeconds);
    }
  }

  // Nightfall: nobody is thinning out any more.
  cancelThinning() {
    for (const z of this.pool) z.fadeTimer = -1;
  }

  updateFade(z, dt, player) {
    if (z.fadeTimer < 0) return;
    z.fadeTimer -= dt;
    if (z.fadeTimer > 0) return;
    const d = this.cfg.dawn;
    // Never in front of the player or while it's after them: try again soon.
    if (z.mode === 'chase' || Math.hypot(z.x - player.x, z.z - player.z) < d.minPlayerDistance) {
      z.fadeTimer = d.retrySeconds;
      return;
    }
    z.fadeTimer = -1;
    z.burrow();
  }

  // ---- hits ----------------------------------------------------------------

  // Apply a hit from a weapon. part: 'head' | 'body'. at: { x, y, z } impact
  // point (for blood). from: { x, z } the shooter.
  damage(zombie, amount, part, weapon, at, from) {
    const killed = zombie.hit(amount, weapon.stagger ?? 0, weapon.knockback ?? 0, from);
    this.bus.emit('enemy:hit', { x: at.x, y: at.y, z: at.z, part, killed, zombie });
    if (killed) this.bus.emit('enemy:killed', { zombie });
    return killed;
  }

  // Close living zombies as circles for the torch's glare check.
  glareCircles(origin, range, out) {
    out.length = 0;
    for (const z of this.living) {
      if (Math.hypot(z.x - origin.x, z.z - origin.z) > range) continue;
      z.glareCircle.x = z.x;
      z.glareCircle.z = z.z;
      z.glareCircle.base = z.y;
      z.glareCircle.top = z.y + z.height * (1 - z.sink);
      out.push(z.glareCircle);
    }
    return out;
  }

  // ---- counts ----------------------------------------------------------------

  // Living zombies raised by `owner` (a sigil).
  ownedCount(owner) {
    let n = 0;
    for (const z of this.living) if (z.owner === owner) n++;
    return n;
  }

  // Forget a dug-up sigil: its zombies carry on as strays.
  disown(owner) {
    for (const z of this.pool) if (z.owner === owner) z.owner = null;
  }

  get mutantCount() {
    let n = 0;
    for (const z of this.pool) if (z.active && z.kind === 'mutant') n++;
    return n;
  }

  get activeCount() {
    let n = 0;
    for (const z of this.pool) if (z.active) n++;
    return n;
  }

  get livingCount() {
    return this.living.length;
  }

  // Living zombies by variant and by what they're doing (overlay).
  tally() {
    const t = this.counts;
    for (const k of Object.keys(t)) t[k] = 0;
    for (const z of this.living) {
      t[z.variant] = (t[z.variant] ?? 0) + 1;
      if (z.horde) t.horde++;
      if (z.straggler) t.stragglers++;
      if (z.state === 'rise') t.rise++;
      else if (MODES.includes(z.mode)) t[z.mode]++;
    }
    return t;
  }

  dispose() {
    this.clear();
  }
}
