// Owns the zombie pool: spawning (singles, hordes and mutants, by level
// and variant), each zombie's brain (detection and targeting), moving
// them, keeping them out of trees and rocks and apart from each other,
// gunfire alerts, thinning out at dawn, and applying hits. Sigils decide
// when and where to spawn (ZombieDirector).
//
// M6: simulation tiers (ai/simTiers.js). Each zombie is active (full
// simulation every frame, at most `lod.activeCap`), nearby (the same
// simulation every few frames, no pushing apart) or abstract (walks the
// pathways in coarse steps about once a second, no collision, not drawn)
// by its distance from the player. The pool grows in chunks as the night
// needs it, up to `population.max`: there's no small fixed ceiling any
// more, so a busy night can fill the whole map. Zombies within the
// station's reach stay at least nearby, so a siege is always simulated
// (Step 3 of M6 resolves it by the margin table while you're away).
// Night marches (M6): a marching zombie walks the pathways home
// (ai/marchRoutes.js); out of sight (abstract) it moves `lod.abstractMarchScale`
// times faster, so far sigils' groups still reach the station in a night.
// Unsticking (M6): a walking zombie that makes almost no headway for a
// moment (a parked car or a rock square in its way) takes a short detour
// to one side, away from what's blocking it, then carries on.
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
import { MarchRoutes } from './marchRoutes.js';
import { playerSenses } from './detection.js';
import { levelStats, clampLevel, speedRoll, speedFromRoll, pickVariant, planSpawn } from './zombieLevels.js';
import { tierFor, capActive, nearbyStepDue } from './simTiers.js';
import { resolveCircles } from '../world/collision.js';

const MODES = ['chase', 'search', 'wander', 'siege', 'march', 'linger', 'held', 'lured'];

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
    this.pool = [];
    this.grow(this.cfg.population.initial);
    this.living = []; // alive zombies (every tier), refreshed every update
    this.activeList = []; // alive zombies in the active tier
    this.candidates = []; // zombies close enough to be active (before the cap)
    this.nearby = [];
    this.frame = 0;
    this.nextSlot = 0;
    this.simMs = 0; // smoothed cost of update() (overlay)
    this.detours = 0; // unstick detours taken (overlay)
    this.tiers = { active: 0, nearby: 0, abstract: 0 };
    this.showTiers = false; // debug: tint sprites and map dots by tier
    this.level = 1;
    this.stats = levelStats(this.cfg.levels, 1);
    this.station = null; // M5: the station's siege hook (see the top of this file)
    this.stationSimulated = this.cfg.lod.stationKeepsSimulated; // M6: false while the player is away (NightWatch)
    this.routeOut = { active: false, x: 0, z: 0, barrier: null };
    this.senses = {};
    this.counts = { citizen: 0, police: 0, army: 0, mutant: 0, horde: 0, chase: 0, search: 0, wander: 0, siege: 0, held: 0, march: 0, linger: 0, lured: 0, rise: 0, stragglers: 0 };
    const map = this.world.map;
    this.routes = new PathRoutes(map);
    this.marches = new MarchRoutes(map, Math.max(0, map.clearings.findIndex((c) => c.kind === 'home')));
    this.brain = new ZombieBrain(this.detCfg, this.cfg.wander, this.routes, this.ground, this.rng.fork('brain'), this.marches);
    this.onStrike = (zombie, barrier) => {
      if (barrier) this.bus.emit('enemy:strikeDefence', { zombie, barrier, damage: zombie.attackDamage * this.stats.defenceDamage });
      else this.bus.emit('enemy:strike', { zombie, damage: zombie.attackDamage * this.stats.damage });
    };
  }

  // Add up to `count` fresh zombies to the pool (never past population.max).
  // Returns how many were added.
  grow(count) {
    const room = Math.max(0, this.cfg.population.max - this.pool.length);
    const n = Math.min(count, room);
    for (let i = 0; i < n; i++) this.pool.push(new Zombie(this.cfg));
    return n;
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

  // A free zombie from the pool, growing it by a chunk if it's full.
  // null once the whole population is out.
  freeSlot() {
    const slot = this.pool.find((p) => !p.active);
    if (slot) return slot;
    const before = this.pool.length;
    return this.grow(this.cfg.population.chunk) > 0 ? this.pool[before] : null;
  }

  // One zombie at (x, z). opts: { kind ('zombie' | 'mutant'), variant,
  // mode ('chase' | 'wander' | 'march' | 'linger'), rise,
  // speedRange [min, max] (multiples of the sprint; else the level's),
  // horde, owner (its sigil), facing, linger { x, z, r } (the clearing
  // to hang about) }.
  // Returns the zombie, or null if the population (or the mutant cap) is full.
  spawnZombie(x, z, opts = {}) {
    const kind = opts.kind ?? 'zombie';
    if (kind === 'mutant' && this.mutantCount >= this.mutantCfg.poolSize) return null;
    const slot = this.freeSlot();
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
    // M6: its tier is worked out on the next update.
    slot.tier = null;
    slot.lodDt = 0;
    slot.lodDistance = Infinity;
    slot.lodSlot = this.nextSlot++ % this.cfg.lod.nearbyEveryFrames;
    slot.lingerX = opts.linger?.x ?? pos.x;
    slot.lingerZ = opts.linger?.z ?? pos.z;
    slot.lingerRadius = opts.linger?.r ?? 0;
    slot.stuckTime = 0;
    slot.detourTime = 0;
    slot.detourSide = 0;
    slot.detourTries = 0;
    slot.clearTime = 0;
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
  // owner, faceX, faceZ, linger, out (an array the spawned zombies are
  // pushed to) }. Returns how many spawned.
  spawnPlanned(plan, cx, cz, opts) {
    const { ringMin, ringMax, mix } = opts;
    const at = this.ringPoint(cx, cz, ringMin, ringMax);
    const face = (p) => (opts.faceX === undefined ? undefined : Math.atan2(opts.faceX - p.x, opts.faceZ - p.z));
    const base = { mode: opts.mode, rise: opts.rise, owner: opts.owner, linger: opts.linger };
    let spawned = 0;
    if (plan.type === 'horde') {
      const h = this.cfg.horde;
      const pack = { leader: null, radius: h.radius };
      for (let i = 0; i < plan.count; i++) {
        const p = this.ringPoint(at.x, at.z, 0, h.radius);
        const z = this.spawnZombie(p.x, p.z, { ...base, variant: pickVariant(mix, this.rng), speedRange: [h.speedMin, h.speedMax], horde: pack, facing: face(p) });
        if (!z) break;
        pack.leader ??= z;
        opts.out?.push(z);
        spawned++;
      }
    } else {
      const kind = plan.type === 'mutant' ? 'mutant' : 'zombie';
      const z = this.spawnZombie(at.x, at.z, { ...base, kind, variant: pickVariant(mix, this.rng), facing: face(at) });
      if (z) {
        opts.out?.push(z);
        spawned++;
      }
    }
    if (spawned > 0) this.bus.emit('enemy:spawned', { count: spawned, type: plan.type });
    return spawned;
  }

  // What one raising at this level is: { type: 'single' | 'horde' | 'mutant', count }.
  rollPlan() {
    return planSpawn(this.stats, this.cfg.horde, this.rng, this.mutantCount < this.mutantCfg.poolSize);
  }

  // M6: zombies setting off together on a march (a pack): the group walks
  // at its slowest member's pace (a little under, so stragglers catch up).
  formMarch(members, pack) {
    let slowest = Infinity;
    for (const z of members) {
      if (!z.alive) continue;
      slowest = Math.min(slowest, z.speed);
      z.horde = pack;
      if (!pack.leader?.alive) pack.leader = z;
    }
    pack.marchSpeed = Number.isFinite(slowest) ? slowest * this.cfg.wander.marchPackPace : undefined;
    return pack;
  }

  // Roll and spawn one raising at this level round (cx, cz).
  spawnRaising(cx, cz, opts) {
    const plan = this.rollPlan();
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

  // Debug (M6): fill the map. About `count` zombies raised at this level
  // (singles, hordes, mutants) at random points along the pathways at
  // least `minDistance` metres from `center`, wandering. Returns how many.
  populate(center, count, minDistance) {
    const paths = this.world.map.paths;
    let spawned = 0;
    for (let tries = 0; spawned < count && tries < count * 10; tries++) {
      const path = this.rng.pick(paths);
      const p = path.points[this.rng.int(0, path.points.length - 1)];
      if (Math.hypot(p.x - center.x, p.z - center.z) < minDistance) continue;
      const opts = { ringMin: 0, ringMax: 2, mix: this.world.variantMixAt(p.x, p.z), mode: 'wander', rise: false };
      const n = this.spawnRaising(p.x, p.z, opts).spawned;
      if (n === 0) break; // the population is full
      spawned += n;
    }
    return spawned;
  }

  // Kill every zombie straight away and return them to the pool.
  clear() {
    for (const z of this.pool) {
      z.state = 'free';
      z.tier = null;
    }
    this.living.length = 0;
    this.activeList.length = 0;
  }

  // ---- each frame ------------------------------------------------------------

  // player: { x, z, eyeY, daylight, torchOn, crouched, sprinting, speed,
  // undergrowth } (see detection.js).
  update(dt, player) {
    const started = performance.now();
    const lod = this.cfg.lod;
    this.frame++;
    const senses = playerSenses(player, this.detCfg, this.stats.notice, this.senses);
    this.brain.tick(dt);
    this.assignTiers(player);

    this.living.length = 0;
    this.activeList.length = 0;
    for (const z of this.pool) {
      if (!z.active) continue;
      z.lodDt += dt;
      if (z.tier === 'active') {
        this.step(z, z.lodDt, player, senses, true);
        z.lodDt = 0;
      } else if (z.tier === 'nearby') {
        if (nearbyStepDue(this.frame, z.lodSlot, lod.nearbyEveryFrames)) {
          this.step(z, z.lodDt, player, senses, true);
          z.lodDt = 0;
        }
      } else if (z.lodDt >= lod.abstractSeconds) {
        this.stepAbstract(z, z.lodDt, player, senses);
        z.lodDt = 0;
      }
      if (z.alive) {
        this.living.push(z);
        if (z.tier === 'active') this.activeList.push(z);
      }
    }
    this.separate(this.activeList);
    for (const z of this.activeList) z.y = this.ground.heightAt(z.x, z.z);
    const ms = performance.now() - started;
    this.simMs += (ms - this.simMs) * lod.timingSmoothing;
  }

  // Sort every zombie into its tier (simTiers.js), keep the active ones
  // under the cap, and settle a zombie coming out of the abstract tier
  // (which walked with no collision) clear of the trees and rocks.
  assignTiers(player) {
    const lod = this.cfg.lod;
    const t = this.tiers;
    t.active = 0;
    t.nearby = 0;
    t.abstract = 0;
    this.candidates.length = 0;
    for (const z of this.pool) {
      if (!z.active) continue;
      const d = Math.hypot(z.x - player.x, z.z - player.z);
      z.lodDistance = d;
      let tier = tierFor(z.tier ?? undefined, d, lod);
      if (tier === 'abstract' && this.keepSimulated(z)) tier = 'nearby';
      if (z.tier === 'abstract' && tier !== 'abstract') this.settle(z);
      z.tier = tier;
      if (tier === 'active') this.candidates.push(z);
    }
    t.active = capActive(this.candidates, lod.activeCap);
    for (const z of this.pool) {
      if (!z.active) continue;
      if (z.tier === 'nearby') t.nearby++;
      else if (z.tier === 'abstract') t.abstract++;
    }
  }

  // Zombies near the station stay simulated (the siege runs for real).
  keepSimulated(z) {
    const st = this.station;
    if (!st || !this.stationSimulated) return false;
    return Math.hypot(z.x - st.x, z.z - st.z) <= st.routeRadius + this.cfg.lod.hysteresis;
  }

  settle(z) {
    if (z.alive) resolveCircles(z, z.radius, this.colliders.query(z.x, z.z, z.radius, this.nearby));
    this.ground.clamp(z);
    z.y = this.ground.heightAt(z.x, z.z);
  }

  // One step of the full simulation over `dt` seconds (active every
  // frame; nearby every few frames with the time saved up).
  // boost: a speed multiplier (the abstract tier's forced march).
  step(z, dt, player, senses, collide, boost = 1) {
    const c = this.cfg;
    if (z.alive && z.state !== 'rise') {
      this.brain.update(z, dt, senses, this.station);
      this.updateFade(z, dt, player);
      this.routeAtStation(z, player);
    }
    z.moveScale = (1 + (c.undergrowthMultiplier - 1) * this.ground.undergrowthAt(z.x, z.z)) * boost;
    if (z.slowTimer > 0) {
      z.slowTimer -= dt;
      z.moveScale *= z.slow;
    }
    // A detour (see unstick()) stands in for the goal while it lasts.
    const detour = z.detourTime > 0 && z.mode !== 'chase' && !z.via;
    const goalX = z.goalX;
    const goalZ = z.goalZ;
    if (detour) {
      z.goalX = z.detourX;
      z.goalZ = z.detourZ;
      z.detourTime -= dt;
    }
    const fromX = z.x;
    const fromZ = z.z;
    z.update(dt, player, this.onStrike);
    if (z.chargeStarted) {
      z.chargeStarted = false;
      this.bus.emit('enemy:charge', { zombie: z });
    }
    if (z.alive && collide) {
      resolveCircles(z, z.radius, this.colliders.query(z.x, z.z, z.radius, this.nearby));
      this.ground.clamp(z);
    }
    if (detour) {
      z.goalX = goalX;
      z.goalZ = goalZ;
    } else if (collide) {
      this.unstick(z, fromX, fromZ, dt);
    }
    if (z.active) z.y = this.ground.heightAt(z.x, z.z);
  }

  // Walking toward a goal but barely moving: after a moment, detour a few
  // metres to the side away from the nearest thing in the way. Stuck again
  // straight after? The same side, further out (up to maxTries, then the
  // other side).
  unstick(z, fromX, fromZ, dt) {
    const u = this.cfg.unstick;
    if (z.state !== 'walk' || z.mode === 'chase' || z.via || !z.hasGoal) {
      z.stuckTime = 0;
      return;
    }
    const gx = z.goalX - z.x;
    const gz = z.goalZ - z.z;
    const toGoal = Math.hypot(gx, gz);
    const expected = z.speed * z.pace * z.moveScale * dt;
    if (toGoal < expected * 2 || toGoal < 0.5) {
      z.stuckTime = 0;
      return;
    }
    const moved = Math.hypot(z.x - fromX, z.z - fromZ);
    if (moved >= expected * u.minProgress) {
      z.stuckTime = Math.max(0, z.stuckTime - dt);
      z.clearTime = (z.clearTime ?? 0) + dt;
      if (z.clearTime >= u.forgetSeconds) {
        z.detourSide = 0; // a good while moving freely: start afresh next time
        z.detourTries = 0;
      }
      return;
    }
    z.clearTime = 0;
    z.stuckTime += dt;
    if (z.stuckTime < u.seconds) return;
    z.stuckTime = 0;
    const dx = gx / toGoal;
    const dz = gz / toGoal;
    z.detourTries = (z.detourTries ?? 0) + 1;
    let side = z.detourSide;
    if (z.detourTries > u.maxTries) {
      side = -side; // that way's no good: try the other
      z.detourTries = 1;
    }
    if (side === 0) {
      // Away from the nearest collider (left of the goal direction is (-dz, dx)).
      let best = null;
      let bestD = Infinity;
      for (const c of this.colliders.query(z.x, z.z, u.lookRadius, this.nearby)) {
        if (c.playerOnly) continue;
        const d = Math.hypot(c.x - z.x, c.z - z.z);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      const leftness = best ? (best.x - z.x) * -dz + (best.z - z.z) * dx : 0;
      side = leftness > 0 ? -1 : 1;
    }
    z.detourSide = side;
    const out = u.detourDistance * z.detourTries;
    z.detourX = z.x - dz * side * out + dx * u.detourAhead;
    z.detourZ = z.z + dx * side * out + dz * u.detourAhead;
    z.detourTime = u.detourSeconds;
    this.detours++;
  }

  // The abstract tier: the time saved up, walked in a few coarse steps
  // along the pathways with no collision, then clamped to the map.
  // Marchers out of sight march faster (lod.abstractMarchScale).
  stepAbstract(z, seconds, player, senses) {
    const lod = this.cfg.lod;
    const n = Math.max(1, Math.ceil(seconds / lod.abstractSubStep - 1e-6));
    const dt = seconds / n;
    for (let i = 0; i < n && z.active; i++) this.step(z, dt, player, senses, false, z.mode === 'march' ? lod.abstractMarchScale : 1);
    if (!z.active) return;
    this.ground.clamp(z);
    z.y = this.ground.heightAt(z.x, z.z);
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

  // Push overlapping zombies apart. Only the active tier (at most
  // lod.activeCap), so pairwise is cheap.
  separate(list) {
    const c = this.cfg;
    const extra = c.separation - c.radius * 2; // gap kept between bodies
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

  // M9.1: a burning flare's pull ({ x, z, radius, mill, breakDistance }), or null.
  setLure(lure) {
    this.brain.lure = lure;
  }

  // ---- noise and dawn ----------------------------------------------------------

  // A loud noise at (x, z), e.g. a gunshot: every living zombie within
  // `radius` (times the level's notice) comes for the player.
  alert(x, z, radius) {
    const r = radius * this.stats.notice;
    let n = 0;
    for (const zb of this.living) {
      if (zb.state === 'rise' || zb.mode === 'held' || Math.hypot(zb.x - x, zb.z - z) > r) continue;
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

  // M7, the witch is dead: every zombie collapses where it stands (no
  // loot, no kills counted).
  collapseAll() {
    let n = 0;
    for (const z of [...this.living]) {
      if (z.hit(z.health + 1, 0, 0, z)) n++;
    }
    return n;
  }

  // Close living zombies as circles for the torch's glare check.
  glareCircles(origin, range, out) {
    out.length = 0;
    for (const z of this.activeList) {
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

  // Tier counts and cost (overlay).
  lodLine() {
    const t = this.tiers;
    const p = this.cfg.population;
    return `tiers: active ${t.active}/${this.cfg.lod.activeCap} nearby ${t.nearby} abstract ${t.abstract}  pool ${this.pool.length}/${p.max}  sim ${this.simMs.toFixed(2)}ms  detours ${this.detours}`;
  }

  dispose() {
    this.clear();
  }
}
