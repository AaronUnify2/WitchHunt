// What each zombie is doing (DESIGN.md "Enemy targeting"). Every
// thinkSeconds (staggered so they don't all think on one frame) a zombie
// looks and listens (ai/detection.js) and picks a goal:
//  1. it notices the player → 'chase' them;
//  2. else the station is within its base radius → 'siege' it (M5: the
//     station passes itself in; until then this never happens);
//  3. else → 'wander': a random walk along the pathway graph.
// A chasing zombie that loses the player keeps after them for a few
// seconds (memory), then 'search'es where it last saw them, then wanders.
// A horde moves as a pack: members follow the leader, and when one
// notices the player the whole pack comes.

import { notices } from './detection.js';

export class ZombieBrain {
  // routes: PathRoutes. ground: for line of sight over the hills.
  constructor(detectionConfig, wanderConfig, routes, ground, rng) {
    this.cfg = detectionConfig;
    this.wander = wanderConfig;
    this.routes = routes;
    this.ground = ground;
    this.rng = rng;
    this.time = 0;
  }

  // Once per frame, before update() for each zombie.
  tick(dt) {
    this.time += dt;
  }

  // A freshly spawned zombie. mode: where to start ('chase' for debug
  // spawns round the player, 'wander' for sigils).
  reset(z, mode) {
    z.thinkTimer = this.rng.range(0, this.cfg.thinkSeconds);
    z.memory = 0;
    z.searchTimer = 0;
    z.lastX = z.x;
    z.lastZ = z.z;
    z.route = null;
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
    z.pace = mode === 'wander' ? this.wander.pace : 1;
    if (mode === 'wander') z.hasGoal = false; // pick up a route on the next step
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
    if (z.mode === 'wander') this.stepWander(z);
    else if (z.mode === 'search' && Math.hypot(z.goalX - z.x, z.goalZ - z.z) < this.wander.waypointReach) z.searchTimer = 0;
  }

  think(z, senses, station, dt) {
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
        if (z.searchTimer <= 0) this.setMode(z, 'wander');
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
    if (z.mode !== 'wander') this.setMode(z, 'wander');
  }

  stepWander(z) {
    const pack = z.horde;
    const leader = pack?.leader;
    if (leader && leader !== z && leader.alive && leader.mode === 'wander') {
      // Follow a little behind the leader, each at its own spot in the pack.
      const back = this.wander.hordeFollow;
      const spread = pack.radius ?? 3;
      z.goalX = leader.x - Math.sin(leader.facing) * back + z.followX * spread;
      z.goalZ = leader.z - Math.cos(leader.facing) * back + z.followZ * spread;
      z.hasGoal = true;
      z.route = null; // rejoins the pathways by itself if the leader falls
      z.routeNode = -1;
      return;
    }
    if (pack && leader && !leader.alive) pack.leader = z; // the pack picks a new leader
    this.routes.step(z, this.rng, this.wander.waypointReach);
  }
}
