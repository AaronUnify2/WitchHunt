// What each zombie is doing (DESIGN.md "Enemy targeting"). Every
// thinkSeconds (staggered so they don't all think on one frame) a zombie
// looks and listens (ai/detection.js) and picks a goal:
//  1. it notices the player → 'chase' them;
//  2. else the station is within its base radius → 'siege' it (M5);
//  3. else it carries on with its errand:
//     - 'wander': a random walk along the pathway graph;
//     - 'march' (M6): walk the shortest way home along the pathways to
//       lay siege to the station (ai/marchRoutes.js);
//     - 'linger' (M6): hang about a clearing (revisited encounters);
//     - 'held' (M6): gathered outside the station's fence, attacking it
//       while the player is away (NightWatch plays the attack out).
// A chasing zombie that loses the player keeps after them for a few
// seconds (memory), then 'search'es where it last saw them, then goes
// back to its errand: a marcher marches on, the rest wander.
// A pack (a horde, or a marching group) moves together: members follow
// the leader, and when one notices the player the whole pack comes.

import { notices } from './detection.js';

// Modes a zombie keeps between thinks until something better comes along.
const ERRANDS = new Set(['wander', 'march', 'linger', 'held']);

export class ZombieBrain {
  // routes: PathRoutes (wandering). marches: MarchRoutes (M6). ground:
  // for line of sight over the hills.
  constructor(detectionConfig, wanderConfig, routes, ground, rng, marches = null) {
    this.cfg = detectionConfig;
    this.wander = wanderConfig;
    this.routes = routes;
    this.marches = marches;
    this.ground = ground;
    this.rng = rng;
    this.time = 0;
  }

  // Once per frame, before update() for each zombie.
  tick(dt) {
    this.time += dt;
  }

  // A freshly spawned zombie. mode: where to start ('chase' for debug
  // spawns round the player, 'wander' for sigils, 'march' or 'linger' for
  // M6's night marches and revisits).
  reset(z, mode) {
    z.thinkTimer = this.rng.range(0, this.cfg.thinkSeconds);
    z.memory = 0;
    z.searchTimer = 0;
    z.lastX = z.x;
    z.lastZ = z.z;
    z.route = null;
    z.marchLink = null;
    z.marchDone = false;
    z.marcher = mode === 'march'; // marches on after a chase
    z.hasGoal = false;
    z.followX = this.rng.range(-1, 1);
    z.followZ = this.rng.range(-1, 1);
    this.setMode(z, mode);
    if (mode === 'chase') {
      z.memory = this.cfg.memorySeconds;
      z.noticed?.();
    }
  }

  setMode(z, mode) {
    z.mode = mode;
    z.pace = mode === 'wander' || mode === 'linger' || mode === 'held' ? this.wander.pace : 1;
    if (mode === 'wander' || mode === 'linger' || mode === 'held') z.hasGoal = false; // pick a goal on the next step
    if (mode === 'march') {
      z.marcher = true;
      z.marchLink = null; // re-plan from wherever it is
      z.marchDone = false;
      z.hasGoal = false;
    }
  }

  // Go for the player, remembering them for `memory` seconds.
  chase(z, x, zz, memory) {
    if (z.mode !== 'chase') {
      this.setMode(z, 'chase');
      z.noticed?.(); // the mutant charges
    }
    z.memory = Math.max(z.memory, memory);
    z.lastX = x;
    z.lastZ = zz;
  }

  // senses: from detection.playerSenses(). station: { x, z, baseRadius } or null.
  update(z, dt, senses, station = null) {
    z.thinkTimer -= dt;
    if (z.thinkTimer <= 0) {
      z.thinkTimer += this.cfg.thinkSeconds;
      this.think(z, senses, station, this.cfg.thinkSeconds);
    }
    switch (z.mode) {
      case 'wander':
        this.stepWander(z);
        break;
      case 'march':
        this.stepMarch(z);
        break;
      case 'linger':
      case 'held':
        this.stepLinger(z);
        break;
      case 'search':
        if (Math.hypot(z.goalX - z.x, z.goalZ - z.z) < this.wander.waypointReach) z.searchTimer = 0;
        break;
      default:
        break;
    }
  }

  think(z, senses, station, dt) {
    // Held at the fence (M6): NightWatch is playing its attack out while
    // you're away; it pays you no mind until the attack is released.
    if (z.mode === 'held') return;
    const pack = z.horde;
    const sees = notices(z, senses, this.cfg, z.mode === 'chase', this.ground);
    if (sees) {
      this.chase(z, senses.x, senses.z, this.cfg.memorySeconds);
      if (pack) {
        pack.alertTime = this.time;
        pack.lastX = senses.x;
        pack.lastZ = senses.z;
      }
      return;
    }
    if (pack && pack.alertTime !== undefined && this.time - pack.alertTime < this.cfg.memorySeconds) {
      this.chase(z, pack.lastX, pack.lastZ, this.cfg.memorySeconds - (this.time - pack.alertTime));
      return;
    }
    switch (z.mode) {
      case 'chase':
        z.memory -= dt;
        if (z.memory <= 0) {
          this.setMode(z, 'search');
          z.goalX = z.lastX;
          z.goalZ = z.lastZ;
          z.hasGoal = true;
          z.searchTimer = this.cfg.searchSeconds;
        }
        return;
      case 'search':
        z.searchTimer -= dt;
        if (z.searchTimer <= 0) this.setMode(z, z.marcher ? 'march' : 'wander');
        return;
      default:
        break;
    }
    if (station && Math.hypot(station.x - z.x, station.z - z.z) <= station.baseRadius) {
      if (z.mode !== 'siege') this.setMode(z, 'siege');
      z.goalX = station.x;
      z.goalZ = station.z;
      z.hasGoal = true;
      return;
    }
    if (!ERRANDS.has(z.mode)) this.setMode(z, z.marcher ? 'march' : 'wander');
  }

  // A pack member follows a little behind its leader, each at its own spot
  // in the pack, while the leader is on the same errand. Returns true if
  // it's following; false if it should find its own way (it's the leader,
  // or the leader is busy or dead, and then it may become the leader).
  followLeader(z) {
    const pack = z.horde;
    if (!pack) return false;
    const leader = pack.leader;
    if (leader && leader !== z && leader.alive && leader.mode === z.mode) {
      const back = this.wander.hordeFollow;
      const spread = pack.radius ?? 3;
      z.goalX = leader.x - Math.sin(leader.facing) * back + z.followX * spread;
      z.goalZ = leader.z - Math.cos(leader.facing) * back + z.followZ * spread;
      z.hasGoal = true;
      z.route = null; // rejoins the pathways by itself if the leader falls
      z.routeNode = -1;
      z.marchLink = null;
      return true;
    }
    if (!leader || !leader.alive) pack.leader = z; // the pack picks a new leader
    return false;
  }

  stepWander(z) {
    if (this.followLeader(z)) return;
    this.routes.step(z, this.rng, this.wander.waypointReach);
  }

  // M6: on the way home to the station. A group's leader walks at the
  // group's pace (its slowest member's, from formMarch()) so it stays together.
  stepMarch(z) {
    if (this.followLeader(z)) {
      z.pace = 1;
      return;
    }
    const groupSpeed = z.horde?.marchSpeed;
    z.pace = groupSpeed ? Math.min(1, groupSpeed / Math.max(z.speed, 1e-3)) : 1;
    if (this.marches) this.marches.step(z, this.wander.waypointReach);
    else this.routes.step(z, this.rng, this.wander.waypointReach);
  }

  // M6: hang about a clearing, strolling from spot to spot inside it.
  stepLinger(z) {
    if (z.hasGoal && Math.hypot(z.goalX - z.x, z.goalZ - z.z) > this.wander.waypointReach) return;
    const a = this.rng.range(0, Math.PI * 2);
    const r = Math.sqrt(this.rng.next()) * z.lingerRadius;
    z.goalX = z.lingerX + Math.sin(a) * r;
    z.goalZ = z.lingerZ + Math.cos(a) * r;
    z.hasGoal = true;
  }
}
