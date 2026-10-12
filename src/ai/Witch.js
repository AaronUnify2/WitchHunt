// The witch (M7, DESIGN.md "The witch"). Step 1: she exists, roams and
// plants. Fighting, fleeing, wounds and traps come in the next steps.
//
//  - Resting: by day she hides in her hut, unseen (Aaron, M7: you can
//    stake it out and catch her coming out in the early evening).
//  - At dusk she sets out. Night 1 is safe; from night 2 she plants one
//    sigil a night, from night 3 sometimes two. She picks tonight's spots
//    as she leaves (mostly empty sigil grounds: ZombieDirector.chooseSpot()),
//    so the dusk forecast can count them.
//  - Roaming: she travels the pathways (ai/witchRoutes.js), keeping clear
//    of the ranger station. Near the player (within the zombies' nearby
//    radius) she runs for real, with collision; further out she's a
//    point on the graph moving abstractScale times faster.
//  - Planting: at the spot she kneels for plantSeconds with a glowing
//    ring and singing that carries; the sigil appears when she's done
//    (ZombieDirector.plant()). Then the next spot, or home.
//  - At dawn she heads home (a ritual already under way is finished).
//
// Events: 'witch:setOut' { night, planned }, 'witch:ritualStarted'
// { spot }, 'witch:planted' { sigil }, 'witch:home'.

import { GraphRoutes, routeLength, advanceAlong } from './witchRoutes.js';
import { tierFor } from './simTiers.js';
import { resolveCircles } from '../world/collision.js';
import { WitchRenderer } from '../render/WitchRenderer.js';
import { DEBUG } from '../debug/DebugMenu.js';

// How many sigils she sets out to plant on night `night` (pure).
export function plantingsTonight(night, wc, rng) {
  if (night < wc.firstNight) return 0;
  if (night >= wc.secondFromNight && rng.chance(wc.secondChance)) return 2;
  return 1;
}

export class Witch {
  constructor(cfg, rng, bus) {
    this.cfg = cfg;
    this.wc = cfg.witch;
    this.rng = rng;
    this.bus = bus;
  }

  // ctx: { world, director, player, colliders, combat, clock }.
  init(scene, ctx) {
    Object.assign(this, ctx);
    this.ground = ctx.world.ground;
    this.map = ctx.world.map;
    this.routes = new GraphRoutes(this.map, [this.map.homeIndex]);
    this.planRng = this.rng.fork('witch-plan');
    this.renderer = new WitchRenderer(this.wc.look, this.rng.fork('witch-look'));
    this.renderer.init(scene);
    this.nearbyColliders = [];
    this.drawDistance = Infinity;
    this.showOnMap = false; // debug
    this.radius = this.wc.radius;
    this.reset();
    this.wireEvents();
  }

  // In the hut, resting.
  reset() {
    const hut = this.world.hut;
    this.x = hut.x;
    this.z = hut.z;
    this.y = this.ground.heightAt(hut.x, hut.z);
    this.facing = 0;
    this.state = 'resting';
    this.goal = null; // 'plant' | 'home' while roaming
    this.spot = null; // the spot she's going to, or planting at
    this.plan = []; // tonight's spots still to come after this one
    this.route = [];
    this.routeIndex = 0;
    this.tier = 'abstract';
    this.plantTimer = 0;
    this.songTimer = 0;
    this.stuckTime = 0;
    this.detourSide = 1;
    this.moved = 0; // metres this step (the renderer's stride)
    this.walked = 0;
    this.plantedTonight = 0;
    this.night = 0;
  }

  wireEvents() {
    const { bus } = this;
    this.unsubscribers = [
      bus.on('phase:dusk', ({ day }) => this.setOut(day ?? 0)),
      bus.on('phase:dawn', () => this.callHome()),
    ];
  }

  get hut() {
    return this.world.hut;
  }

  // 0 to 1 through the ritual.
  get plantProgress() {
    return this.state === 'planting' ? 1 - Math.max(0, this.plantTimer) / this.wc.plantSeconds : 0;
  }

  // ---- the night's plan -------------------------------------------------------

  // Dusk: choose tonight's spots and set out for the first.
  setOut(night, count = plantingsTonight(night, this.wc, this.planRng)) {
    this.night = night;
    this.plantedTonight = 0;
    if (count <= 0) return false;
    const plan = [];
    for (let i = 0; i < count; i++) {
      const spot = this.director.chooseSpot(plan);
      if (spot) plan.push(spot);
    }
    if (plan.length === 0) return false;
    this.plan = plan;
    this.bus.emit('witch:setOut', { night, planned: plan.length });
    this.goPlant();
    return true;
  }

  // Head for the next spot in the plan.
  goPlant() {
    this.spot = this.plan.shift();
    this.state = 'roaming';
    this.goal = 'plant';
    this.setRoute(this.spot.x, this.spot.z);
  }

  goHome() {
    this.plan.length = 0;
    this.spot = null;
    this.state = 'roaming';
    this.goal = 'home';
    this.setRoute(this.hut.x, this.hut.z);
  }

  // Dawn: home, unless a ritual is under way (she finishes it first).
  callHome() {
    this.plan.length = 0;
    if (this.state === 'roaming' && this.goal === 'plant') this.goHome();
  }

  setRoute(tx, tz) {
    this.route = this.routes.route(this.x, this.z, tx, tz);
    this.routeIndex = 0;
    this.stuckTime = 0;
  }

  // ---- each step -----------------------------------------------------------------

  // playing: false while a menu or the map is open.
  update(dt, playing, cameraPosition) {
    const p = this.player.position;
    const dist = Math.hypot(this.x - p.x, this.z - p.z);
    this.distance = dist;
    this.tier = tierFor(this.tier, dist, this.cfg.zombies.lod);
    this.moved = 0;
    if (playing) {
      if (this.state === 'roaming') {
        if (this.move(dt)) this.arrive();
      } else if (this.state === 'planting') {
        this.ritual(dt);
      }
    }
    this.renderer.update(this, dt, cameraPosition, this.drawDistance);
  }

  // Along the route. Returns true on arriving.
  move(dt) {
    const wc = this.wc;
    if (this.tier === 'abstract') {
      const done = advanceAlong(this, wc.roamSpeed * wc.abstractScale * dt);
      this.y = this.ground.heightAt(this.x, this.z);
      return done;
    }
    // Near the player: a real run, with collision.
    let target = this.route[this.routeIndex];
    while (target && Math.hypot(target.x - this.x, target.z - this.z) <= (this.routeIndex === this.route.length - 1 ? wc.reach * 0.4 : wc.reach)) {
      this.routeIndex++;
      target = this.route[this.routeIndex];
    }
    if (!target) return true;
    const dx = target.x - this.x;
    const dz = target.z - this.z;
    const d = Math.hypot(dx, dz);
    this.facing = turnToward(this.facing, Math.atan2(dx, dz), wc.turnRate * dt);
    const step = Math.min(d, wc.roamSpeed * dt);
    const fromX = this.x;
    const fromZ = this.z;
    this.x += (dx / d) * step;
    this.z += (dz / d) * step;
    resolveCircles(this, this.radius, this.colliders.query(this.x, this.z, this.radius, this.nearbyColliders));
    this.ground.clamp(this);
    this.y = this.ground.heightAt(this.x, this.z);
    this.moved = Math.hypot(this.x - fromX, this.z - fromZ);
    this.walked += this.moved;
    this.unstick(step, dx / d, dz / d, dt);
    return false;
  }

  // Barely moving toward the waypoint: sidestep round whatever is in the
  // way (she's agile: a short detour, alternating sides if it keeps up).
  unstick(expected, dirX, dirZ, dt) {
    const wc = this.wc;
    if (this.moved >= expected * 0.3) {
      this.stuckTime = Math.max(0, this.stuckTime - dt);
      return;
    }
    this.stuckTime += dt;
    if (this.stuckTime < wc.unstickSeconds) return;
    this.stuckTime = 0;
    const side = this.detourSide;
    this.detourSide = -side;
    const out = wc.unstickDistance;
    // Left of the direction of travel is (-dirZ, dirX).
    this.route.splice(this.routeIndex, 0, { x: this.x - dirZ * side * out + dirX, z: this.z + dirX * side * out + dirZ });
  }

  arrive() {
    if (this.goal === 'plant') {
      this.state = 'planting';
      this.plantTimer = this.wc.plantSeconds;
      this.songTimer = 0;
      this.bus.emit('witch:ritualStarted', { spot: this.spot });
      return;
    }
    this.state = 'resting';
    this.goal = null;
    this.bus.emit('witch:home');
  }

  // Kneeling at the spot, singing. The sigil appears when she's done.
  ritual(dt) {
    this.plantTimer -= dt;
    this.songTimer -= dt;
    if (this.songTimer <= 0) {
      this.songTimer = this.wc.soundEvery;
      this.combat.sfx.play('witchSong', { x: this.x, z: this.z, range: this.wc.songRange });
    }
    if (this.plantTimer > 0) return;
    this.finishPlanting();
  }

  finishPlanting() {
    const spot = this.spot;
    const d = this.director;
    const groundTaken = spot.groundId >= 0 && !d.sigils.groundFree(spot.groundId);
    const sigil = groundTaken ? null : d.plant({ ...spot, y: this.ground.heightAt(spot.x, spot.z) });
    if (sigil) {
      this.plantedTonight++;
      this.combat.sfx.play('witchPlanted', { x: spot.x, z: spot.z, range: this.wc.songRange });
      this.bus.emit('witch:planted', { sigil });
    }
    this.spot = null;
    const c = this.clock;
    const outTonight = c.phase === 'dusk' || (c.phase === 'night' && c.phaseProgress < this.wc.lateCutoff);
    if (this.plan.length > 0 && outTonight) this.goPlant();
    else this.goHome();
  }

  // ---- the forecast ----------------------------------------------------------------

  // The sigils she's still to plant tonight, with when (seconds from now,
  // travelling out of sight): [{ x, z, inSeconds }].
  pendingPlantings() {
    const wc = this.wc;
    const speed = wc.roamSpeed * wc.abstractScale;
    const out = [];
    let t = 0;
    let x = this.x;
    let z = this.z;
    if (this.state === 'planting') {
      t = this.plantTimer;
      out.push({ x: this.spot.x, z: this.spot.z, inSeconds: t });
    } else if (this.state === 'roaming' && this.goal === 'plant') {
      t = routeLength(x, z, this.route, this.routeIndex) / speed + wc.plantSeconds;
      out.push({ x: this.spot.x, z: this.spot.z, inSeconds: t });
    }
    if (this.spot) {
      x = this.spot.x;
      z = this.spot.z;
    }
    for (const s of this.plan) {
      const r = this.routes.route(x, z, s.x, s.z);
      t += routeLength(x, z, r) / speed + wc.plantSeconds;
      out.push({ x: s.x, z: s.z, inSeconds: t });
      x = s.x;
      z = s.z;
    }
    return out;
  }

  // ---- debug tools ------------------------------------------------------------------

  addDebugItems(menu, notify) {
    const witch = menu.category(DEBUG.witch);
    witch.addItem(() => `Now: ${this.stateText()}`, () => notify(this.stateText()));
    witch.addItem('Send her out to plant now', () => {
      const plan = this.plan.slice();
      this.plan = [];
      const spot = this.director.chooseSpot(this.spot ? [this.spot, ...plan] : plan);
      if (!spot) {
        notify('Nowhere left for her to plant');
        return;
      }
      this.plan = [spot];
      this.goPlant();
      notify(`The witch is out, heading ${this.director.describe(spot)}`);
    });
    witch.addItem('Finish her ritual now', () => {
      if (this.state !== 'planting') notify('She is not planting');
      else this.plantTimer = 0;
    });
    witch.addItem('Send her home', () => {
      if (this.state === 'resting') notify('She is already home');
      else this.goHome();
    });
    const teleportNear = () => {
      const back = this.cfg.debug.witchTeleportBack;
      const a = this.state === 'resting' ? 0 : this.facing;
      // In front of her, looking back at her (the camera looks down -z at yaw 0).
      const x = this.x + Math.sin(a) * back;
      const z = this.z + Math.cos(a) * back;
      this.player.teleport(x, z, Math.atan2(x - this.x, z - this.z));
      notify(this.state === 'resting' ? 'At the hut: she is hiding inside' : `Near the witch: ${this.stateText()}`);
    };
    witch.addItem('Teleport near her', teleportNear);
    witch.addItem(() => `Show her on the map: ${this.showOnMap ? 'on' : 'off'}`, () => (this.showOnMap = !this.showOnMap));
    menu.category(DEBUG.teleport).addItem('Teleport: near the witch', teleportNear);
  }

  stateText() {
    const where = (s) => (s ? this.director.describe(s) : '');
    switch (this.state) {
      case 'resting':
        return 'resting in her hut';
      case 'planting':
        return `planting ${where(this.spot)}, ${Math.ceil(this.plantTimer)}s left`;
      default:
        return this.goal === 'home'
          ? `going home, ${Math.round(routeLength(this.x, this.z, this.route, this.routeIndex))}m to go`
          : `heading ${where(this.spot)}, ${Math.round(routeLength(this.x, this.z, this.route, this.routeIndex))}m to go`;
    }
  }

  overlayLine() {
    const more = this.plan.length ? `  ${this.plan.length} more planned` : '';
    return `witch: ${this.stateText()}  (${this.tier}, ${Math.round(this.distance ?? 0)}m from you)  planted tonight ${this.plantedTonight}${more}`;
  }

  setDrawDistance(distance) {
    this.drawDistance = distance;
  }

  dispose() {
    for (const off of this.unsubscribers ?? []) off();
    this.renderer.dispose();
  }
}

// Turn angle `from` toward `to` by at most `max` radians.
function turnToward(from, to, max) {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return from + Math.max(-max, Math.min(max, d));
}
