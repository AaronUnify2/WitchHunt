// The crashed UFO and the mothership (story spine, beat 9; DESIGN.md "Crashed
// UFO and the mothership"). Nov 26: rebuilt as a low-gravity tower climb after
// Aaron's four concept pictures and his answers (docs/MOTHERSHIP_PLAN.md). The
// story beats are still the scaffolding's draft lines: they're to be settled
// once the dungeon is.
//
//  1. The crashed ship in its clearing (world/CrashedUfoSite.js), and beside
//     it the beam. After the mega night, hold X in the beam: up (an interior:
//     world/Interiors.js). Flag shipEntered.
//  2. Aboard: the core hall is a tower (world/mothershipTower.js): a deck
//     every 9 m round the reactor's glass column, low gravity throughout
//     (Player.updateTower; config.mothership.physics). Up by the spiral stair
//     (its second flight broken: jump it), the hover discs in the nets' holes,
//     the service wells (each with a side room of loot), the lounge's ramps.
//     A fall drops a deck, never to the bottom.
//  3. The greys: busy until they notice Tom (workers at consoles, loungers on
//     the sofas, slow to react; guards watching). A zone on alert turns its
//     strips red; a shot alerts everything near and its whole zone; deck 2 is
//     the red zone from the start. Alert greys aim, fire with a clear line,
//     sidestep, aim again. More cowboy the higher Tom goes (render/alienModel.js
//     KIT_STAGES).
//  4. The top: the workshop first (picture 4), where Earl's quad stands on its
//     lift and two mechanics drop their tools and run for the alarm panel. The
//     quad won't let him take it until he has the core. The core: pulled from
//     the reactor's socket on the crown (shipCoreTaken); the column dims and
//     the whole ship goes red.
//  5. The ride: hold X at the quad, the lift lowers, and Tom drives it through
//     the bay door into the hangar and onto the beam: down at the crash site on
//     the alien quad (world/AlienQuad.js; quadReturned). The pad on deck 0 and
//     the hangar's beam take him down on foot, too.
//  6. Home: the core into the fence box (base/Station.js fitShipCore).
//
// Saved through story flags (the side rooms' loot too). Saved aboard, Tom's put
// back at the beam's foot; the greys aboard are back at their posts. Off in
// Demo mode.
//
// Events: 'ship:entered', 'ship:alarm' { zone }, 'ship:core', 'ship:quad', 'ship:left'.

import * as THREE from 'three';
import { HoldAction } from '../player/HoldAction.js';
import { AlienRenderer } from '../render/AlienRenderer.js';
import { buildMothership } from '../render/mothershipModel.js';
import { buildAlienQuad } from '../render/alienQuadModel.js';
import { buildShipTower, LEVELS } from '../world/mothershipTower.js';
import { towerShape } from '../world/towerShape.js';
import { DEBUG } from '../debug/DebugMenu.js';

export const ID = 'mothership';
export const SHIP_FLAGS = ['shipEntered', 'shipCoreTaken', 'quadReturned', 'shipCoreFitted'];
export const LOOT_FLAGS = { well1: 'shipLootWell1', well2: 'shipLootWell2', deck2: 'shipLootDeck2' };
export const SHIP = buildShipTower();
export const TOWER = towerShape(SHIP.solids);
export const SHIP_PLACES = SHIP.places;
const TOP = LEVELS[4];
const EYE = 1.3; // a grey's eyes above its feet
const LIFT_UP = 1.3;
const LIFT_DOWN = 0.15;

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// The zone a point (the ship's frame, feet) is in.
export function zoneAt(p) {
  return SHIP.zones.find((z) => TOWER.contains(z.solid, p.x, p.y + 0.5, p.z))?.id ?? null;
}

// ---- the pure parts (tested) ----------------------------------------------------------------

// A busy grey, one step on: has it noticed Tom? g: { x, y, z, facing, suspicion }; tom: { x, y, z, crouched };
// n: config.mothership.greys.notice[its role]; touch: within this, any way it faces; clear: a clear line to him.
// It notices once it's seen him for n.react seconds (the seeing builds while he's in sight and fades slower).
export function noticeStep(g, tom, dt, n, touch, clear) {
  const dx = tom.x - g.x;
  const dz = tom.z - g.z;
  const d = Math.hypot(dx, (tom.y ?? 0) - (g.y ?? 0), dz);
  const range = tom.crouched ? n.crouched : n.range;
  const off = Math.abs(wrap(Math.atan2(dx, dz) - (g.facing ?? 0)));
  const sees = clear && (d < touch || (d < range && off < n.cone));
  g.suspicion = sees ? (g.suspicion ?? 0) + dt : Math.max(0, (g.suspicion ?? 0) - dt * 0.5);
  return g.suspicion >= n.react;
}

// An alert grey, one step on. g: { x, y, z, post, state, t, side, off }; tom: { x, y, z }; a: config greys;
// clear: a clear line to Tom. Waiting ('post'), it aims once he's within a.see and in sight; aiming
// (a.aim s), it fires if it still sees him (fired: true once), else waits again; then a sidestep across its
// line to him (g.off: metres along g.ax, g.az from its post, the caller keeps it on its floor), and aims again.
export function greyStep(g, tom, dt, a, clear = true) {
  const dx = tom.x - g.x;
  const dz = tom.z - g.z;
  const d = Math.hypot(dx, (tom.y ?? 0) - (g.y ?? 0), dz);
  let fired = false;
  if (g.state === 'post') {
    if (d < a.see && clear) {
      g.state = 'aim';
      g.t = a.aim;
    }
    return { fired, d };
  }
  g.t -= dt;
  if (g.state === 'aim' && g.t <= 0) {
    if (clear && d < a.see * 1.4) {
      fired = true;
      g.state = 'fired';
      g.t = a.after;
    } else g.state = 'post';
  } else if (g.state === 'fired' && g.t <= 0) {
    g.state = 'step';
    g.t = a.step;
    g.side = -(g.side || 1);
    const h = Math.hypot(dx, dz) || 1;
    g.ax = dz / h;
    g.az = -dx / h;
    g.off0 = g.off ?? 0;
  } else if (g.state === 'step') {
    const want = g.side * a.strafe;
    const off = g.off ?? 0;
    g.off = off + Math.max(-a.speed * dt, Math.min(a.speed * dt, want - off));
    if (g.t <= 0) {
      g.state = 'aim';
      g.t = a.aim;
    }
  }
  return { fired, d };
}

// A mechanic running for the panel: along its way (points), at speed; returns true there.
export function runStep(g, way, dt, speed) {
  while (g.leg < way.length) {
    const w = way[g.leg];
    const dx = w.x - g.x;
    const dz = w.z - g.z;
    const d = Math.hypot(dx, dz);
    const step = speed * dt;
    g.facing = Math.atan2(dx, dz);
    if (d > step) {
      g.x += (dx / d) * step;
      g.z += (dz / d) * step;
      return false;
    }
    g.x = w.x;
    g.z = w.z;
    g.leg++;
  }
  return true;
}

// ---- the quad's ride out (Player.riding while it's on: drive / eject) ---------------------------

class ShipRide {
  constructor(ship) {
    this.ship = ship;
    this.riding = false;
    this.speed = 0;
  }

  // On, at the lift: it lowers first (seconds), then he drives.
  start() {
    const s = this.ship;
    const rc = s.sc.ride;
    this.riding = true;
    this.speed = 0;
    this.x = SHIP_PLACES.quad.x;
    this.z = SHIP_PLACES.quad.z;
    this.y = TOP + LIFT_UP;
    this.heading = -Math.PI / 2; // facing the bay door (+x)
    this.lowering = rc.lowerSeconds;
    const p = s.player;
    p.riding = this;
    p.crouched = false;
    p.sprinting = false;
    p.yaw = this.heading;
    p.pitch = 0;
    s.sfx?.play('carDoor', p.position);
    s.sfx?.engine?.(true, 0);
    s.combat?.hud?.pickup?.(s.device === 'gamepad' ? 'Left stick to ride: through the bay door, onto the beam' : 'WASD to ride: through the bay door, onto the beam');
    this.place(0);
  }

  drive(dt, input, player) {
    const s = this.ship;
    const rc = s.sc.ride;
    if (this.lowering > 0) {
      this.lowering = Math.max(0, this.lowering - dt);
      const k = 1 - this.lowering / rc.lowerSeconds;
      const h = LIFT_UP + (LIFT_DOWN - LIFT_UP) * (k * k * (3 - 2 * k));
      s.setLift(h);
      this.y = TOP + h;
    } else {
      const move = input.getMove();
      const throttle = move.y;
      const steer = move.x;
      let target = 0;
      if (throttle > 0.1) target = throttle * rc.maxSpeed;
      else if (throttle < -0.1) target = this.speed > 0.4 ? 0 : throttle * rc.reverse;
      const braking = (throttle < -0.1 && this.speed > 0.4) || (target === 0 && this.speed !== 0);
      const rate = braking ? (throttle < -0.1 ? rc.brake : rc.coast) : rc.accel;
      this.speed += Math.max(-rate * dt, Math.min(rate * dt, target - this.speed));
      const grip = Math.min(1, Math.abs(this.speed) / rc.steerFullAt);
      const turn = -steer * rc.steerRate * grip * Math.sign(this.speed) * dt;
      this.heading += turn;
      player.yaw += turn;
      const ax = -Math.sin(this.heading);
      const az = -Math.cos(this.heading);
      const want = { x: this.x + ax * this.speed * dt, z: this.z + az * this.speed * dt };
      const pos = { ...want };
      TOWER.confine(pos, rc.radius, TOP, 1.4, 0.45);
      if (Math.hypot(pos.x - want.x, pos.z - want.z) > Math.abs(this.speed) * dt * 0.5 && Math.abs(this.speed) > 2) {
        player.shake(0.4);
        s.sfx?.play('impact', player.position);
        this.speed *= 0.4;
      }
      this.x = pos.x;
      this.z = pos.z;
      this.y = TOP + Math.max(0, TOWER.floorAt(this.x, this.z, TOP + 0.3) - TOP);
      if (Math.hypot(this.x - SHIP_PLACES.beam.x, this.z - SHIP_PLACES.beam.z) < rc.beamWithin) {
        this.place(dt);
        s.takeQuad();
        return;
      }
    }
    this.place(dt);
    const ax = -Math.sin(this.heading);
    const az = -Math.cos(this.heading);
    const w = s.toWorld(this.x - ax * rc.seatBack, this.z - az * rc.seatBack);
    player.position.set(w.x, s.floorY + this.y + rc.eyeHeight - player.eyeHeight, w.z);
    player.velocity.x = ax * this.speed;
    player.velocity.z = az * this.speed;
    player.onGround = true;
    player.verticalSpeed = 0;
    s.sfx?.engine?.(true, Math.min(1, Math.abs(this.speed) / rc.maxSpeed), Math.abs(input.getMove().y));
  }

  place(dt) {
    const q = this.ship.quadShow;
    if (!q) return;
    const w = this.ship.toWorld(this.x, this.z);
    q.root.position.set(w.x, this.ship.floorY + this.y, w.z);
    q.root.rotation.set(0, this.heading, 0);
    q.spin = (q.spin ?? 0) + this.speed * dt;
  }

  eject() {
    if (!this.riding) return;
    this.riding = false;
    this.speed = 0;
    if (this.ship.player?.riding === this) this.ship.player.riding = null;
    this.ship.sfx?.engine?.(false);
  }
}

// ---- the encounter -----------------------------------------------------------------------------

export class Mothership {
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.sc = cfg.mothership;
    this.bus = bus;
    this.hud = { prompt: '', progress: 0 };
  }

  // ctx: { scene, world, site (CrashedUfoSite), interiors, player, combat, station, megaNight, alienQuad,
  // flashlight, dialogue, subtitles, progress, demo, notify, sfx, card, rng() }.
  init(ctx) {
    Object.assign(this, ctx);
    this.rng ??= Math.random;
    this.device = 'gamepad';
    this.hold = new HoldAction(this.cfg.station.hold.releaseDrain);
    this.hold.init();
    this.ride = new ShipRide(this);
    const h = this.cfg.crashedPlane.encounter.hit;
    const G = this.sc.greys;
    this.greys = SHIP.posts.map((p, i) => {
      const mech = p.role === 'mechanic';
      const g = { i, zone: p.zone, role: p.role, stage: p.stage, waitAlarm: Boolean(p.waitAlarm), post: { x: p.x, y: p.y, z: p.z, facing: p.facing }, x: p.x, y: p.y, z: p.z, facing: p.facing, alive: true };
      g.health = mech ? G.mechanic.health : G.health;
      g.look = { active: true, x: 0, y: 0, z: 0, facing: p.facing, state: 'idle', timer: 0, walked: 0, flash: 0, stage: p.stage, seed: i * 1.7 };
      g.target = { x: 0, y: 0, z: 0, targetable: false, alive: true, hitRadius: h.hitRadius, height: h.height, headBottom: h.headBottom, headRadius: h.headRadius, headshotMultiplier: h.headshotMultiplier, takeHit: (amount) => this.hitGrey(g, amount) };
      this.combat?.weapons?.extraTargets?.push(g.target);
      return g;
    });
    if (this.ready) {
      this.interiors.define({
        id: ID,
        name: 'The mothership',
        entrance: () => this.beamAt,
        surfaceY: () => this.world.ground.heightAt(this.beamAt.x, this.beamAt.z),
        load: (scene, floorY) => this.load(scene, floorY),
        platform: (floorY) => this.platformAt(floorY),
        spawn: () => ({ ...this.toWorld(SHIP_PLACES.pad.x, SHIP_PLACES.pad.z), yaw: Math.PI }),
        exit: () => ({ x: this.beamAt.x + 2.4, z: this.beamAt.z, yaw: 0 }),
        light: this.sc.light,
        onEnter: () => this.onEnter(),
        onLeave: () => this.onLeave(),
      });
      // Shots stop at the hull, the decks, the column (they pass the nets, the rails, the glass's frames).
      this.rayO = { x: 0, y: 0, z: 0 };
      this.combat?.weapons?.spaceRays?.set(ID, (origin, dir, max) => {
        this.rayO.x = origin.x - this.beamAt.x;
        this.rayO.y = origin.y - this.floorY;
        this.rayO.z = origin.z - this.beamAt.z;
        return TOWER.ray(this.rayO, dir, max);
      });
    }
    this.unsub = [
      this.bus.on('player:respawned', () => this.reset()),
      this.bus.on('weapon:fired', () => this.heardShot()),
    ];
    this.reset();
  }

  get beamAt() {
    return this.site?.spots?.beam ?? null;
  }

  get ready() {
    return Boolean(this.beamAt && this.interiors);
  }

  get inside() {
    return this.interiors?.id === ID;
  }

  has(flag) {
    return Boolean(this.progress?.has(flag));
  }

  set(flag) {
    this.progress?.setFlag(flag);
  }

  toWorld(x, z) {
    return { x: this.beamAt.x + x, z: this.beamAt.z + z };
  }

  toShip(p) {
    return { x: p.x - this.beamAt.x, z: p.z - this.beamAt.z };
  }

  // Tom in the ship's frame: { x, y (feet), z, eye, crouched }.
  tom() {
    const p = this.player.position;
    const t = (this.tomAt ??= {});
    t.x = p.x - this.beamAt.x;
    t.z = p.z - this.beamAt.z;
    t.y = p.y - (this.floorY ?? 0);
    t.eye = t.y + (this.player.eyeHeight ?? 1.7);
    t.crouched = Boolean(this.player.crouched);
    return t;
  }

  reset() {
    this.ride?.eject();
    this.alerts = new Set(['deck2']); // the red zone, on alert from the start
    this.alarmed = false; // the ship-wide alarm (the panel, or the core)
    this.told = new Set();
    for (const g of this.greys ?? []) this.resetGrey(g);
    // The quad he came home on: there if it's been taken down, wherever it was last left (it isn't saved).
    if (this.has('quadReturned') && this.alienQuad?.stored && this.beamAt) this.alienQuad.place(this.beamAt.x + 4.5, this.beamAt.z + 1, 0);
  }

  resetGrey(g) {
    const mech = g.role === 'mechanic';
    Object.assign(g, { x: g.post.x, y: g.post.y, z: g.post.z, facing: g.post.facing, t: 0, side: 1, off: 0, ax: 1, az: 0, suspicion: 0, leg: 0, alive: true, health: mech ? this.sc.greys.mechanic.health : this.sc.greys.health, seeT: 0, sees: false });
    g.state = this.alerts?.has(g.zone) && !mech && g.role !== 'lounger' ? 'post' : 'busy';
    g.look.state = 'idle';
    g.look.timer = 0;
    g.target.targetable = false;
  }

  // ---- the interior ---------------------------------------------------------------------------

  // A room platform with the tower in it (Player.updateTower walks it; the torch's glare reads it).
  platformAt(floorY) {
    const b = TOWER.bounds;
    return {
      room: ID,
      tower: TOWER,
      x: this.beamAt.x,
      z: this.beamAt.z,
      y: floorY,
      hx: Math.max(-b.x0, b.x1),
      hz: Math.max(-b.z0, b.z1),
      rx: 1,
      rz: 0,
      fx: 0,
      fz: 1,
      roofY: b.y1,
      blocks: [],
      physics: this.sc.physics,
      physicsAt: (p) => this.physicsAt(p),
    };
  }

  // The hook for gravity by zone (config.mothership.gravityZones: nothing in it yet).
  physicsAt(p) {
    const zones = this.sc.gravityZones;
    if (!zones || !Object.keys(zones).length) return this.sc.physics;
    const z = zoneAt({ x: p.x - this.beamAt.x, y: p.y - this.floorY, z: p.z - this.beamAt.z });
    return zones[z] ? { ...this.sc.physics, ...zones[z] } : this.sc.physics;
  }

  load(scene, floorY) {
    this.floorY = floorY;
    this.model = buildMothership(this.sc.look, SHIP);
    this.model.group.position.set(this.beamAt.x, floorY, this.beamAt.z);
    this.model.setCore(!this.has('shipCoreTaken'));
    this.model.setReactor(this.has('shipCoreTaken') ? 0.25 : 1);
    for (const [id, flag] of Object.entries(LOOT_FLAGS)) if (this.has(flag)) this.model.setLooted(id);
    scene.add(this.model.group);
    this.renderer = new AlienRenderer({ ...this.cfg.aliens.grey, albedo: this.sc.greyAlbedo ?? this.cfg.aliens.grey.albedo }); // (paler aboard: the ship's light is dim and blue)
    this.renderer.init(scene, this.greys.length);
    // Earl's quad on its lift: the alien quad's own model, standing still until he rides it.
    this.setLift(this.has('quadReturned') ? LIFT_DOWN : LIFT_UP);
    if (!this.has('quadReturned')) {
      this.quadShow = buildAlienQuad(this.cfg.alienQuad);
      const at = this.toWorld(SHIP_PLACES.quad.x, SHIP_PLACES.quad.z);
      this.quadShow.root.position.set(at.x, floorY + TOP + LIFT_UP, at.z);
      this.quadShow.root.rotation.y = -Math.PI / 2;
      // Lit by the workshop's glow (no lights are added aboard): a faint cast of its own so it reads on the lift.
      this.quadShow.root.traverse((o) => {
        if (o.material?.emissive && !o.material.userData.shipLit) {
          o.material = o.material.clone();
          o.material.emissive.lerp(new THREE.Color(this.sc.look.glow.cyanDim), 0.35);
          o.material.userData.shipLit = true;
        }
      });
      scene.add(this.quadShow.root);
    }
    for (const g of this.greys) g.target.targetable = g.alive;
    this.applyAlerts();
    return {
      update: () => {},
      dispose: () => {
        this.ride.eject();
        this.model?.dispose();
        this.model = null;
        this.renderer?.dispose();
        this.renderer = null;
        this.quadShow?.root.removeFromParent();
        this.quadShow = null;
        for (const g of this.greys) g.target.targetable = false;
      },
    };
  }

  // The lift's top, metres over the workshop's floor (solid and drawn).
  setLift(h) {
    SHIP.lift.y1 = TOP + h;
    this.model?.setLift(h);
  }

  onEnter() {
    this.set('shipEntered');
    // Back aboard: the alarms have settled, the greys are at their posts.
    this.alerts = new Set(['deck2']);
    this.alarmed = this.has('shipCoreTaken');
    if (this.alarmed) for (const z of SHIP.zones) this.alerts.add(z.id);
    for (const g of this.greys) this.resetGrey(g);
    this.applyAlerts();
    if (this.sfx) this.sfx.muffled = 1;
    this.bus.emit('ship:entered');
    this.notify?.('Light, then no weight, then a floor. A hall of glass and metal going up and up, and everything floats a little');
    if (!this.dialogue?.heard?.has('ship.up.wyatt')) this.dialogue?.play('ship.up.wyatt');
  }

  onLeave() {
    this.ride.eject();
    this.bus.emit('ship:left');
  }

  enter() {
    if (!this.ready || this.inside) return false;
    this.player.riding?.dismount?.();
    this.sfx?.play('zap');
    return this.interiors.enter(ID);
  }

  leave() {
    this.ride.eject();
    if (this.inside) this.interiors.leave();
  }

  // ---- alerts ---------------------------------------------------------------------------------

  alertZone(zone, why = '') {
    if (!zone || this.alerts.has(zone)) return;
    this.alerts.add(zone);
    for (const g of this.greys) if (g.zone === zone) this.alertGrey(g);
    this.applyAlerts();
    this.sfx?.play('shipAlarm');
    if (!this.told.has('alarm')) {
      this.told.add('alarm');
      this.notify?.('A howl through the hull, and the light goes red');
    }
    this.bus.emit('ship:alarm', { zone, why });
  }

  alertAll(why) {
    this.alarmed = true;
    for (const z of SHIP.zones) this.alertZone(z.id, why);
  }

  alertGrey(g) {
    if (!g.alive || g.state !== 'busy') return;
    if (g.role === 'mechanic') {
      g.state = 'flee';
      g.leg = 0;
      g.way = this.fleeWay(g);
      return;
    }
    if (g.role === 'lounger') {
      g.state = 'rise';
      g.t = 0.8;
      return;
    }
    g.state = 'post';
    g.t = 0;
  }

  fleeWay(g) {
    const k = this.greys.filter((x) => x.role === 'mechanic').indexOf(g);
    return [...(SHIP_PLACES.fleeFrom[k] ?? []), SHIP_PLACES.panelStand];
  }

  applyAlerts() {
    if (!this.model) return;
    for (const z of SHIP.zones) this.model.setZoneAlert(z.id, this.alerts.has(z.id));
  }

  // A shot (any gun): every grey within earshot, and the zone he's in.
  heardShot() {
    if (!this.inside || !this.model) return;
    const tom = this.tom();
    const hear = this.sc.greys.hear;
    for (const g of this.greys) if (g.alive && Math.hypot(g.x - tom.x, g.y - tom.y, g.z - tom.z) < hear) this.alertZone(g.zone, 'shot');
    this.alertZone(zoneAt(tom), 'shot');
  }

  // ---- each frame ---------------------------------------------------------------------------

  update(dt, input, playing, canInteract) {
    if (!this.ready || this.demo?.active) return;
    if (input) this.device = input.activeDevice;
    if (this.inside && this.model) {
      if (playing) this.updateGreys(dt);
      if (!this.inside || !this.model) return;
      this.model.update(dt, this.player.camera);
      this.renderer.update(this.greys.map((g) => g.look), dt);
      this.updateTold();
    }
    const best = canInteract && input && playing && !this.ride.riding ? this.pick(input.activeDevice === 'gamepad' ? 'X' : 'E') : null;
    const key = best?.act ? best.key : null;
    const done = this.hold.update(dt, key, Boolean(input?.isDown('interact')) && Boolean(best), best?.seconds ?? 1);
    if (done && best?.act) best.act();
    this.hud.prompt = best ? (this.hold.active && best.busy ? best.busy : best.prompt) : '';
    this.hud.progress = this.hold.key !== null ? this.hold.progress : 0;
  }

  // The first sight of the lounge's windows, of the workshop.
  updateTold() {
    const z = zoneAt(this.tom());
    if (z === 'lounge' && !this.told.has('lounge')) {
      this.told.add('lounge');
      this.notify?.('The whole forest, down there under the clouds. Somewhere in it, the station');
    }
    if (z === 'workshop' && !this.told.has('workshop')) {
      this.told.add('workshop');
      this.notify?.(this.has('quadReturned') ? 'The workshop, empty now' : "Earl's quad, up on a lift, glowing under the hood. Two of them at it with tools");
    }
  }

  updateGreys(dt) {
    const a = this.sc.greys;
    const tom = this.tom();
    const tomEye = { x: tom.x, y: tom.eye, z: tom.z };
    const fy = this.floorY;
    for (const g of this.greys) {
      const k = g.look;
      k.timer += dt;
      k.flash = Math.max(0, k.flash - dt);
      if (g.alive) {
        const dist = Math.hypot(tom.x - g.x, tom.y - g.y, tom.z - g.z);
        // Its line to him, checked every 0.2 s, and only when he's near enough to matter.
        g.seeT -= dt;
        if (g.seeT <= 0) {
          g.seeT = 0.2 + (g.i % 5) * 0.01;
          g.sees = dist < a.see * 1.4 && TOWER.clear({ x: g.x, y: g.y + EYE, z: g.z }, tomEye);
        }
        this.stepGrey(g, tom, dt, dist);
      }
      const w = this.toWorld(g.x, g.z);
      k.x = w.x;
      k.y = fy + g.y;
      k.z = w.z;
      g.target.x = w.x;
      g.target.y = fy + g.y;
      g.target.z = w.z;
    }
  }

  stepGrey(g, tom, dt, dist) {
    const a = this.sc.greys;
    const k = g.look;
    switch (g.state) {
      case 'busy': {
        const n = a.notice[g.role] ?? a.notice.worker;
        k.state = g.role === 'worker' || g.role === 'mechanic' ? 'work' : g.role === 'lounger' ? 'sit' : 'idle';
        k.facing = g.facing;
        if (dist < Math.max(n.range, a.touch) + 1 && noticeStep(g, tom, dt, n, a.touch, g.sees)) {
          this.alertZone(g.zone, 'seen');
          this.alertGrey(g);
        }
        break;
      }
      case 'rise':
        g.t -= dt;
        k.state = 'rise';
        k.facing = Math.atan2(tom.x - g.x, tom.z - g.z);
        if (g.t <= 0) {
          g.state = 'post';
          g.t = 0;
        }
        break;
      case 'flee': {
        k.state = 'run';
        k.walked += dt * 2.4;
        const there = runStep(g, g.way, dt, a.mechanic.runSpeed);
        k.facing = g.facing;
        if (there) {
          g.state = 'panel';
          g.t = a.mechanic.panelSeconds;
        }
        break;
      }
      case 'panel':
        k.state = 'work';
        k.facing = 0; // at the wall
        g.t -= dt;
        if (g.t <= 0) {
          g.state = 'cower';
          if (!this.alarmed) {
            this.notify?.('It slaps the panel on the wall. Every light in the ship goes red');
            this.alertAll('panel');
          }
        }
        break;
      case 'cower':
        k.state = 'flinch';
        k.facing = Math.atan2(tom.x - g.x, tom.z - g.z);
        break;
      default: {
        // Alert: aim, fire, sidestep.
        const before = g.off ?? 0;
        const { fired, d } = greyStep(g, tom, dt, a, g.sees);
        if (g.state === 'step' && g.off !== before) {
          // Keep it on its own floor and out of the walls.
          const nx = g.post.x + g.ax * g.off;
          const nz = g.post.z + g.az * g.off;
          const floor = TOWER.floorAt(nx, nz, g.post.y + 0.3);
          const p = { x: nx, z: nz };
          TOWER.confine(p, 0.3, g.post.y, 1.4);
          if (Math.abs(floor - g.post.y) < 0.25 && Math.hypot(p.x - nx, p.z - nz) < 0.05) {
            g.x = nx;
            g.z = nz;
          } else g.off = before;
        }
        k.facing = Math.atan2(tom.x - g.x, tom.z - g.z);
        g.facing = k.facing;
        if (fired) {
          k.state = 'fire';
          k.timer = 0;
          this.sfx?.play('greyShot', this.toWorld(g.x, g.z));
          if (d < a.range && this.rng() < a.hitChance) this.combat.hurtPlayer(a.damage, 1);
          else this.sfx?.play('ricochet', this.player.position);
        } else if (g.state === 'aim') k.state = 'aim';
        else if (g.state === 'step') {
          k.state = 'walk';
          k.walked += dt * 1.5;
        } else if (g.state === 'post') k.state = 'idle';
      }
    }
  }

  hitGrey(g, amount) {
    if (!this.inside || !g.alive) return false;
    g.health -= amount;
    g.look.flash = this.cfg.aliens.grey.hitFlashSeconds;
    this.alertZone(g.zone, 'hit');
    this.alertGrey(g);
    if (g.state === 'post') {
      g.state = 'aim';
      g.t = this.sc.greys.aim;
    }
    if (g.health > 0) return false;
    g.alive = false;
    g.state = 'dead';
    g.look.state = 'dying';
    g.look.timer = 0;
    g.target.targetable = false;
    if (g.role !== 'mechanic') {
      const n = this.sc.greys.shells;
      if (!this.combat.weapons.addAmmo('alienShells', n)) this.combat.inventory?.addAmmo?.('alienShells', n);
      this.combat?.hud?.pickup?.(`${n} alien shells`);
    }
    this.sfx?.play('mothDie', this.toWorld(g.x, g.z));
    return true;
  }

  // ---- hold X ---------------------------------------------------------------------------------

  pick(X) {
    const r = this.sc.interactRange;
    if (this.inside) {
      const t = this.tom();
      const near = (q, within) => Math.hypot(t.x - q.x, t.z - q.z) < within && Math.abs(t.y - q.y) < 1.6;
      if (!this.has('shipCoreTaken') && near(SHIP_PLACES.core, r + 0.6)) return { key: 'core', prompt: `Hold ${X}: pull the core out of the reactor`, busy: 'Pulling it free…', seconds: 2, act: () => this.takeCore() };
      const quadAt = { x: SHIP_PLACES.quad.x, y: TOP, z: SHIP_PLACES.quad.z };
      if (!this.has('quadReturned') && near(quadAt, 2.9)) {
        if (!this.has('shipCoreTaken')) return { key: 'quad-info', prompt: "Your quad, rebuilt. The core first: that's what you came for", act: null };
        return { key: 'quad', prompt: `Hold ${X}: lower the lift and ride it out`, seconds: 1.2, act: () => this.ride.start() };
      }
      for (const c of SHIP.curios) if (near({ ...c.at, y: TOP }, this.sc.curioRange)) return { key: c.id, prompt: `Hold ${X}: look at it`, seconds: 0.4, act: () => this.lookAt(c) };
      for (const l of SHIP.loot) if (!this.has(LOOT_FLAGS[l.id]) && near(l.at, r)) return { key: `loot-${l.id}`, prompt: `Hold ${X}: open it`, seconds: 0.8, act: () => this.takeLoot(l) };
      if (near(SHIP_PLACES.beam, this.sc.ride.beamWithin)) {
        const without = !this.has('quadReturned') && this.has('shipCoreTaken');
        return { key: 'down', prompt: `Hold ${X}: step into the beam (down)${without ? ', without your quad' : ''}`, seconds: 0.8, act: () => this.leave() };
      }
      if (near(SHIP_PLACES.pad, r)) return { key: 'down', prompt: `Hold ${X}: step onto the pad (down)`, seconds: 0.8, act: () => this.leave() };
      return null;
    }
    if (this.player.riding) return null;
    const p = this.player.position;
    if (this.has('megaNightDone') && Math.hypot(p.x - this.beamAt.x, p.z - this.beamAt.z) < this.sc.beamRange) return { key: 'up', prompt: `Hold ${X}: step into the light`, seconds: 1.0, act: () => this.enter() };
    return null;
  }

  takeCore() {
    this.set('shipCoreTaken');
    this.model?.setCore(false);
    this.model?.setReactor(0.25);
    this.sfx?.play('pickup');
    this.combat?.hud?.pickup?.("The ship's core: the size of a football, warm, heavier than it should be. Ellen's fence will never want for power again");
    this.dialogue?.play('ship.core.ellen');
    this.alertAll('core');
    this.bus.emit('ship:core');
  }

  takeLoot(l) {
    this.set(LOOT_FLAGS[l.id]);
    this.model?.setLooted(l.id);
    const inv = this.combat?.inventory;
    let kept = true;
    if (l.kits) kept = (inv?.addKits?.('alienMed', l.kits) ?? 0) > 0;
    if (!kept) this.station?.state?.stashKits?.('alienMed', l.kits);
    if (l.shells && !this.combat.weapons.addAmmo('alienShells', l.shells)) inv?.addAmmo?.('alienShells', l.shells);
    if (l.energy) this.combat?.armour?.add?.('energy', l.energy);
    this.sfx?.play('pickup');
    const parts = [];
    if (l.energy) parts.push(`an alien shield (energy armour +${l.energy})`);
    if (l.kits) parts.push(`${l.kits === 1 ? 'an alien med kit' : `${l.kits} alien med kits`}${kept ? '' : ' (sent home: your healing is full)'}`);
    if (l.shells) parts.push(`${l.shells} alien shells`);
    this.combat?.hud?.pickup?.(`In the locker: ${parts.join(', ')}`);
  }

  lookAt(c) {
    if (!this.card?.show(c.id, { ok: () => {} }, this.device)) this.combat?.hud?.pickup?.(c.id);
  }

  // Down the beam on it: back on the ground at the crash site, on the alien quad.
  takeQuad() {
    this.ride.eject();
    this.megaNight?.returnQuad?.();
    if (!this.megaNight) this.set('quadReturned');
    this.leave();
    const b = this.beamAt;
    this.alienQuad?.place?.(b.x + 4.5, b.z + 1, 0);
    this.alienQuad?.mount?.();
    this.sfx?.play('zap');
    this.notify?.("Down the light on your own quad, or what they've made of it. It hums. It has guns");
    this.dialogue?.play('ship.quad.wyatt');
    this.bus.emit('ship:quad');
  }

  // ---- debug ----------------------------------------------------------------------------------

  addDebugItems(menu) {
    const cat = menu.category(DEBUG.story);
    cat.addItem(() => `The mothership: go up (${this.inside ? 'aboard' : this.has('shipCoreTaken') ? 'core taken' : 'not yet'})`, () => {
      this.set('megaNightDone');
      this.enter();
    });
    const spots = {
      'deck 1': { x: 12.5, y: LEVELS[1], z: 1.5 },
      'deck 2': { x: -12.5, y: LEVELS[2], z: -1.5 },
      'deck 3': { x: 0, y: LEVELS[3], z: 12.5 },
      'the lounge': SHIP_PLACES.lounge,
      'the top (the core)': SHIP_PLACES.core,
      'the workshop': SHIP_PLACES.workshop,
      'the hangar': SHIP_PLACES.hangar,
    };
    for (const [name, at] of Object.entries(spots)) {
      cat.addItem(`The mothership: put me on ${name}`, () => {
        this.set('megaNightDone');
        if (!this.inside) this.enter();
        if (!this.inside) return;
        const w = this.toWorld(at.x, at.z);
        this.player.position.set(w.x, this.floorY + at.y + 0.2, w.z);
        this.player.onGround = false;
        this.player.verticalSpeed = 0;
      });
    }
    cat.addItem('The mothership: kill the greys aboard', () => this.greys.forEach((g) => this.hitGrey(g, 1e6)));
    cat.addItem('The mothership: start it again (flags cleared)', () => {
      this.leave();
      for (const f of [...SHIP_FLAGS, ...Object.values(LOOT_FLAGS)]) this.progress?.setFlag(f, false);
      this.reset();
    });
  }

  overlayLine() {
    if (!this.inside) return `ship -${this.has('shipCoreTaken') ? ' core' : ''}`;
    const t = this.tom();
    return `ship ${zoneAt(t) ?? '?'} y ${t.y.toFixed(1)} greys ${this.greys.filter((g) => g.alive).length} alert ${[...this.alerts].join(',')}${this.has('shipCoreTaken') ? ' core' : ''}`;
  }

  dispose() {
    this.leave();
    this.unsub?.forEach((u) => u?.());
  }
}
