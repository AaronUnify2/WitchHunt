// The ute (experimental: the debug menu's "Experimental vehicles"): a
// right-hand-drive farm ute with a heavy machine gun on a post in the
// tray. Built on the quad's rules (world/Quad.js: getting on and off with
// a held X, the headlamp and its glare, the engine's noise drawing the
// dead, the witch's snare round a wheel, the witch faster while Tom rides).
//
// Two places to be in it:
//  - The cab (the driver's seat, on the right): the view from inside, the
//    gauges working (speed in km/h, the revs through five gears, fuel,
//    temperature, the odometer), the radio's clock, the rear-view mirror
//    showing what's behind, the wheel turning (no hands on it: Session 25, Aaron).
//    Left stick: drive (up: the gas; down: brake, then reverse); left /
//    right steers. A / Space: the handbrake (the back steps out: slide it
//    round). B / R: the horn (the dead come). D-pad right / H: headlamps.
//    The view can look round the cab and eases back ahead while driving.
//    Ridden into the dead it throws them, blood on the windscreen (the
//    wipers clear it). Hold X (slowed right down): get out.
//  - The gun: Y / F climbs him over into the tray (the ute handbrakes to
//    a stop) to man the gun: RT / left mouse fires (a belt with no end, but
//    it overheats: let it cool, or it locks until it has), LT / right mouse
//    steadies it (the view closes in, the rounds group tighter). Y / F
//    drops him back behind the wheel; hold X to jump down.
//
// The body's three circles are solid while it's stopped; driving, the
// dead are thrown off its nose or shoved off its flanks.
// Not saved: it waits, unseen, until the debug menu brings it.
//
// Events: 'ute:mounted' { seat }, 'ute:dismounted', 'ute:seat' { seat }.

import * as THREE from 'three';
import { Quad } from './Quad.js';
import { resolveCircles } from './collision.js';
import { HoldAction } from '../player/HoldAction.js';
import { buildUte, UTE } from '../render/uteModel.js';
import { rayEnemiesAll, rayBlockers, falloff, spreadDirection, partMultiplier, helmetPart } from '../combat/hitscan.js';
import { DEBUG } from '../debug/DebugMenu.js';

const DEG = Math.PI / 180;
const TWO_PI = Math.PI * 2;

// The angle a wrapped into -PI..PI.
export function wrapAngle(a) {
  return a - TWO_PI * Math.floor((a + Math.PI) / TWO_PI);
}

// The gear the box should be in for a speed (a share of top speed), given
// the gear it's in: up past shiftUp of its range, down below shiftDown of
// the one beneath. Returns the new gear index.
export function pickGear(gears, gear, share, shiftUp, shiftDown, throttle = 1) {
  let g = gear;
  if (g < gears.length - 1 && share > gears[g] * shiftUp && throttle > 0.1) g++;
  else if (g > 0 && share < gears[g - 1] * shiftDown) g--;
  return g;
}

// The revs (x1000) for a speed share in a gear: idle at a stop, the redline at the gear's top.
export function gearRpm(gears, gear, share, idle, redline) {
  const t = Math.max(0, Math.min(1.04, share / gears[gear]));
  return idle + (redline - idle) * t;
}

// The gun's heat after one step: shots fired this step, dt, firing or not.
// Returns { heat, locked } (locked: overheated, until it's cooled to jamUntil).
export function stepHeat(heat, locked, shots, firing, sinceShot, dt, g) {
  let h = heat + shots * g.heatPerShot;
  if (!firing && sinceShot >= g.coolDelay) h -= g.coolRate * dt;
  h = Math.max(0, Math.min(1, h));
  let l = locked;
  if (h >= 1) l = true;
  else if (l && h <= g.jamUntil) l = false;
  return { heat: h, locked: l };
}

export class Ute extends Quad {
  constructor(cfg, bus) {
    super(cfg, bus);
    this.qc = cfg.ute;
  }

  // ctx: { scene, ground, colliders, player, combat, notify(text), renderer
  // (the game's, for the mirror; optional), clock (for the radio's clock;
  // optional), vhud (the vehicles' HUD; optional) }.
  init(ctx) {
    Object.assign(this, ctx);
    this.enemies = ctx.combat.enemies;
    this.rng = ctx.combat.rng?.fork?.('ute') ?? { next: Math.random };
    this.hold = new HoldAction(this.cfg.station.hold.releaseDrain);
    this.hold.init();
    this.hud = { prompt: '', progress: 0 };
    this.nearby = [];
    this.daylight = 1;
    this.device = 'gamepad';
    this.lampOn = false;
    this.lampTouched = false;
    this.wheelSnare = null;
    this.mash = 0;
    this.colliderList = [];
    this.model = buildUte(this.qc);
    this.mesh = this.model.root;
    this.scene.add(this.mesh);
    this.lamp = null; // its lights are made the first time it's brought (ensureLights): none in the scene until then
    this.initGun();
    this.initMirror();
    this.vel = { x: 0, z: 0 };
    this.reset();
    this.unsubscribers = [
      this.bus.on('player:respawned', () => this.reset()),
      this.bus.on('player:hurt', () => this.hold.interrupt()),
    ];
  }

  // Back to waiting, unseen (a respawn, a new run).
  reset() {
    if (this.wheelSnare) this.freeWheel(false);
    if (this.riding) this.leave();
    this.riding = false;
    this.seat = null;
    this.stored = true;
    this.mesh.visible = false;
    this.unpark();
    this.setLamp(false);
    this.x = 0;
    this.z = 0;
    this.y = 0;
    this.heading = 0;
    this.clearMotion();
    this.combat?.sfx?.engine?.(false);
  }

  clearMotion() {
    this.speed = 0;
    this.vel = { x: 0, z: 0 };
    this.steer = 0;
    this.gear = 0;
    this.rpm = this.qc.idleRpm;
    this.shiftTimer = 0;
    this.sus = { pitch: 0, roll: 0, vp: 0, vr: 0 };
    this.yawRate = 0;
    this.prevSpeed = 0;
    this.spin = 0;
    this.noiseTimer = 0;
    this.lookIdle = 0;
    this.lookYaw = 0;
    this.braking = false;
    this.handbrakeOn = false;
    this.temp = 0.2;
    this.odometer = this.qc.look.odometerStart;
    this.fresh = { ax: 0, vx: 0, az: 0, vz: 0 };
    this.climb = null;
  }

  // Its lights: the headlamps (one spot between them) and the gun's lamp.
  // Made once, the first time it's brought (adding a light recompiles the
  // shaders: a hitch, so never while playing normally), then always in the
  // scene, dark at intensity 0 when off.
  ensureLights() {
    if (this.lamp) return;
    this.buildHeadlamp();
    const g = this.qc.gunLamp;
    this.gunLamp = new THREE.SpotLight(g.color, 0, g.distance, (g.angle * Math.PI) / 180, g.penumbra, g.decay);
    this.gunLamp.name = 'ute gun lamp';
    this.gunLamp.castShadow = false;
    this.gunLamp.position.set(0.18, 0.1, -0.5);
    this.gunLamp.target.position.set(0.18, 0.1 - g.aimDrop, -0.5 - g.aimDistance);
    this.model.turret.pitch.add(this.gunLamp, this.gunLamp.target);
    // A small lamp housing clamped to the shield's top, its lens lit with it.
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.09, 12).rotateX(Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x1a1a1a }));
    lens.position.set(0.18, 0.1, -0.46);
    this.model.turret.pitch.add(lens);
    this.gunLens = new THREE.Mesh(new THREE.CircleGeometry(0.05, 12).rotateY(Math.PI), new THREE.MeshLambertMaterial({ color: 0x2a2a26, emissive: 0x000000 }));
    this.gunLens.position.set(0.18, 0.1, -0.507);
    this.model.turret.pitch.add(this.gunLens);
    this.setLamp(this.lampOn);
  }

  // Leave it at (x, z) facing heading, solid, on show.
  place(x, z, heading) {
    this.ensureLights();
    this.stored = false;
    this.mesh.visible = true;
    this.x = x;
    this.z = z;
    this.heading = heading;
    this.vel.x = 0;
    this.vel.z = 0;
    this.speed = 0;
    this.y = this.ground.heightAt(x, z);
    this.park();
    this.pose(0);
  }

  // ---- solid while it stands --------------------------------------------------------------------

  // Its three body circles go into the collider grid (taken out again when it moves).
  park() {
    this.unpark();
    if (this.stored) return;
    const fx = -Math.sin(this.heading);
    const fz = -Math.cos(this.heading);
    for (const o of this.qc.circles) {
      const c = { x: this.x - fx * o, z: this.z - fz * o, r: this.qc.radius, top: this.y + 2.0, ute: true };
      this.colliders.insert(c);
      this.colliderList.push(c);
    }
    this.parked = true;
  }

  unpark() {
    const grid = this.colliders;
    for (const c of this.colliderList) {
      c.off = true;
      const key = grid.key?.(Math.floor(c.x / grid.cellSize), Math.floor(c.z / grid.cellSize));
      const cell = key !== undefined ? grid.cells?.get(key) : null;
      if (cell) {
        const i = cell.indexOf(c);
        if (i >= 0) cell.splice(i, 1);
      }
    }
    this.colliderList.length = 0;
    this.parked = false;
  }

  // ---- the lights ----------------------------------------------------------------------------------

  setLamp(on) {
    this.lampOn = Boolean(on);
    if (this.lamp) this.lamp.intensity = this.lampOn ? this.qc.headlamp.intensity * (this.glare ?? 1) : 0;
    this.updateGunLamp();
    const L = this.model?.lamps;
    if (!L) return;
    const lit = this.qc.look.lit;
    glow(L.head, this.lampOn ? lit.head : 0, 3);
    glow(L.spot, this.lampOn ? lit.spot : 0, 3);
    glow(L.tail, this.lampOn ? lit.tail : 0, 1.5);
  }

  // The gun's lamp: on with the headlamps, while he's on the gun.
  updateGunLamp() {
    if (!this.gunLamp) return;
    const on = this.lampOn && this.riding && this.seat === 'gun' && !this.climb;
    this.gunLamp.intensity = on ? this.qc.gunLamp.intensity : 0;
    this.gunLens.material.emissive.setHex(on ? this.qc.look.lit.spot : 0).multiplyScalar(on ? 3 : 0);
  }

  updateLights() {
    this.updateGunLamp();
    const L = this.model.lamps;
    const lit = this.qc.look.lit;
    glow(L.brake, this.braking || this.handbrakeOn ? lit.brake : 0, 2.5);
    glow(L.reverse, this.speed < -0.3 ? lit.reverse : 0, 2);
  }

  // ---- getting in and out --------------------------------------------------------------------------

  // Where (x, z) is in the ute's own frame: lx to its right, lz behind its middle.
  toLocal(x, z) {
    const dx = x - this.x;
    const dz = z - this.z;
    const rx = Math.cos(this.heading);
    const rz = -Math.sin(this.heading);
    const fx = -Math.sin(this.heading);
    const fz = -Math.cos(this.heading);
    return { lx: dx * rx + dz * rz, lz: -(dx * fx + dz * fz) };
  }

  // A point in the ute's frame (lx right, lz back) to the world.
  toWorld(lx, lz) {
    const rx = Math.cos(this.heading);
    const rz = -Math.sin(this.heading);
    const fx = -Math.sin(this.heading);
    const fz = -Math.cos(this.heading);
    return { x: this.x + rx * lx - fx * lz, z: this.z + rz * lx - fz * lz };
  }

  // How far (x, z) is outside its body's box (0 inside).
  boxDistance(x, z) {
    const { lx, lz } = this.toLocal(x, z);
    const ex = Math.max(0, Math.abs(lx) - UTE.half);
    const ez = Math.max(0, lz < 0 ? -lz - 2.75 : lz - UTE.tray.back);
    return Math.hypot(ex, ez);
  }

  update(dt, input, playing, canInteract, daylight = 1) {
    this.daylight = daylight;
    this.device = input.activeDevice;
    if (this.stored) {
      this.hud.prompt = '';
      this.hud.progress = 0;
      return;
    }
    if (!playing) {
      this.hud.prompt = '';
      if (!this.riding) this.combat.sfx?.engine?.(false);
      this.vhud?.hide(this);
      return;
    }
    const pad = input.activeDevice === 'gamepad';
    const X = pad ? 'X' : 'E';
    let offer = null;
    let freeing = false;
    if (this.riding) {
      if (!this.climb) this.updateLamp(input); // the headlamps (and, on the gun, its lamp)
      if (this.seat === 'cab' && !this.climb && input.wasPressed('reload')) this.honk();
      if (this.lampOn) this.updateLampGlare(dt);
      if (input.wasPressed('flare') && !this.climb) this.swapSeat();
      const slow = Math.abs(this.speed) < this.qc.dismountSpeed;
      if (slow && !this.climb) {
        const text = this.wheelSnare ? `Snare round a wheel! Hold ${X}: get out` : this.seat === 'gun' ? `Hold ${X}: jump down` : `Hold ${X}: get out of the ute`;
        offer = { key: 'ute-off', prompt: text, seconds: this.qc.dismountSeconds, act: () => this.dismount() };
      }
    } else if (canInteract && !this.player.platform && !this.player.riding) {
      const p = this.player.position;
      const d = this.boxDistance(p.x, p.z);
      if (this.wheelSnare) freeing = d < this.qc.snare.range - 1;
      else if (d < this.qc.mountRange - 1.2 && !this.locked) {
        const { lz } = this.toLocal(p.x, p.z);
        const toGun = lz > UTE.tray.front - 0.1;
        offer = toGun
          ? { key: 'ute-gun', prompt: `Hold ${X}: climb up to the gun`, seconds: this.qc.mountSeconds, act: () => this.mount('gun') }
          : { key: 'ute-on', prompt: `Hold ${X}: get in the ute`, seconds: this.qc.mountSeconds, act: () => this.mount('cab') };
      }
    }
    if (this.wheelSnare && !this.riding) {
      if (freeing && input.wasPressed('interact')) this.mash += 1 / this.qc.snare.presses;
      this.mash = Math.max(0, this.mash - this.qc.snare.decay * dt);
      if (this.mash >= 1) this.freeWheel(true);
    }
    const done = this.hold.update(dt, offer?.key ?? null, input.isDown('interact'), offer?.seconds ?? 1);
    if (done && offer) offer.act();
    if (freeing && this.wheelSnare) {
      this.hud.prompt = `Tap ${X} to free the wheel from the snare`;
      this.hud.progress = this.mash;
    } else {
      this.hud.prompt = offer ? offer.prompt : '';
      this.hud.progress = this.hold.key !== null ? this.hold.progress : 0;
    }
    if (this.riding) {
      this.updateNoise(dt);
      if (this.seat === 'gun' && !this.climb) this.updateGun(dt, input);
      else this.coolGun(dt);
    } else {
      this.coolGun(dt);
    }
    this.updateBrass(dt);
    this.updateFlash(dt);
    this.updateSplats(dt);
    this.updateLights();
    if (!this.riding && !this.stored) this.idle(dt);
    this.updateHud(input);
  }

  // Not ridden: it settles on its springs; the barrel cools.
  idle(dt) {
    this.speed = 0;
    this.braking = false;
    this.handbrakeOn = true;
    this.stepSuspension(dt, 0, 0);
    this.pose(dt);
  }

  mount(seat = 'cab') {
    if (this.riding || this.stored || this.player.riding || this.locked) return;
    this.riding = true;
    this.seat = seat;
    this.unpark();
    const p = this.player;
    p.riding = this;
    p.crouched = false;
    p.sprinting = false;
    p.yaw = this.heading;
    p.pitch = seat === 'cab' ? this.qc.restPitch : -0.05;
    this.lookYaw = 0;
    this.lookIdle = 0;
    this.aim = { yaw: this.heading, pitch: -0.05 };
    this.gunYaw = this.heading;
    this.gunPitch = -0.05;
    this.combat.sfx?.play('carDoor', this);
    this.combat.sfx?.engine?.(true, 0, 0, 'ute');
    this.lampTouched = false;
    this.setLamp(this.daylight < this.qc.headlamp.autoBelow);
    this.applySeat();
    const pad = this.device !== 'keyboardMouse';
    this.combat.hud?.pickup?.(
      seat === 'cab'
        ? pad
          ? 'In the ute: left stick to drive, A: handbrake, B: horn, D-pad right: headlamps, Y: up to the gun, hold X (slow) to get out.'
          : 'In the ute: WASD to drive, Space: handbrake, R: horn, H: headlamps, F: up to the gun, hold E (slow) to get out.'
        : pad
          ? 'On the gun: RT fires, LT steadies it. It overheats: let it cool. Y: back to the wheel, hold X to jump down.'
          : 'On the gun: left mouse fires, right mouse steadies it. It overheats: let it cool. F: back to the wheel, hold E to jump down.',
    );
    this.bus.emit('ute:mounted', { seat });
  }

  // Y: over the back of the cab into the tray, or back down behind the wheel.
  swapSeat() {
    const to = this.seat === 'cab' ? 'gun' : 'cab';
    this.climb = { from: this.seat, to, t: 0 };
    this.combat.sfx?.play('climb');
    if (to === 'gun') {
      this.aim = { yaw: this.heading + this.lookYaw, pitch: -0.05 };
      this.gunYaw = this.heading;
      this.gunPitch = 0;
      this.player.yaw = this.heading;
      this.player.pitch = -0.05;
    } else {
      this.player.yaw = this.heading;
      this.player.pitch = this.qc.restPitch;
      this.lookYaw = 0;
    }
    this.seat = to;
    this.applySeat();
    this.bus.emit('ute:seat', { seat: to });
  }

  // What shows for the seat he's in: the cab inside, or his hands on the gun.
  applySeat() {
    const cab = this.riding && this.seat === 'cab';
    this.model.interior.group.visible = cab;
    this.model.turret.hands.visible = this.riding && this.seat === 'gun';
    this.player.fovMultiplier = 1;
  }

  dismount() {
    if (!this.riding) return;
    const seat = this.seat;
    const p = this.player;
    // Out of the driver's door (the right), or down off the tray's side; the other side if that's blocked.
    const options = seat === 'gun' ? [[1.9, UTE.pedestal.z], [-1.9, UTE.pedestal.z], [0, UTE.tray.back + 1.2]] : [[this.qc.stepOff, -0.2], [-this.qc.stepOff, -0.2], [0, -3.5]];
    let spot = null;
    for (const [lx, lz] of options) {
      const c = this.toWorld(lx, lz);
      const before = { ...c };
      this.colliders.query(c.x, c.z, this.cfg.player.radius, this.nearby);
      resolveCircles(c, this.cfg.player.radius, this.nearby, true);
      if (Math.hypot(c.x - before.x, c.z - before.z) < 0.05) {
        spot = c;
        break;
      }
      spot ??= c;
    }
    this.leave();
    p.teleport(spot.x, spot.z, this.heading);
    this.combat.sfx?.play(seat === 'gun' ? 'climb' : 'carDoor', this);
    this.bus.emit('ute:dismounted');
  }

  // Off it (got out, thrown off): it's left where it is, solid.
  leave() {
    this.riding = false;
    this.seat = null;
    this.climb = null;
    if (this.player?.riding === this) this.player.riding = null;
    if (this.player) this.player.fovMultiplier = 1;
    this.vel.x = 0;
    this.vel.z = 0;
    this.speed = 0;
    this.braking = false;
    this.model.interior.group.visible = false;
    this.model.turret.hands.visible = false;
    this.park();
    this.setLamp(false);
    this.combat?.sfx?.engine?.(false);
    this.vhud?.hide(this);
  }

  eject() {
    if (!this.riding) return;
    this.leave();
  }

  // The dead's swipes: through the door in the cab, up at him in the tray.
  // Build queue item 7: the ute is in the story now (encounters/UteChase.js): `locked` keeps Tom out of it until
  // Sheriff's free; where it stands is saved (null while it's stored).
  saveState() {
    return this.stored ? null : { x: this.x, z: this.z, heading: this.heading };
  }

  loadState(d) {
    if (!d || !Number.isFinite(d.x) || !Number.isFinite(d.z)) return;
    if (this.riding) this.leave();
    this.clearMotion();
    this.place(d.x, d.z, d.heading ?? 0);
  }

  strikeScale() {
    return this.seat === 'gun' ? this.qc.strikeScale.gunner : this.qc.strikeScale.cab;
  }

  honk() {
    const h = this.qc.horn;
    this.combat.sfx?.play('horn', this);
    this.enemies.alert(this.x, this.z, h.alert);
  }

  // ---- driving ---------------------------------------------------------------------------------------

  // Called by the Player while Tom's in it (his own walking is skipped).
  drive(dt, input, player) {
    const q = this.qc;
    if (!(dt > 0)) {
      this.carry(player); // a frame with no time in it: nothing moves (and nothing divides by it)
      return;
    }
    const prevHeading = this.heading;
    // His look, kept relative to the ute in the cab (so the view turns with it).
    if (this.seat === 'cab' && !this.climb) {
      const look = input.getLook();
      if (Math.abs(look.x) + Math.abs(look.y) > 0.0005) this.lookIdle = 0;
      else this.lookIdle += dt;
      this.lookYaw = clamp(wrapAngle(player.yaw - prevHeading), -q.view.yawLimit, q.view.yawLimit);
      player.pitch = clamp(player.pitch, q.view.pitchMin, q.view.pitchMax);
      if (this.lookIdle > q.view.recentre && Math.abs(this.speed) > 3) {
        const k = 1 - Math.exp(-q.view.recentreRate * dt);
        this.lookYaw -= this.lookYaw * k;
        player.pitch += (q.restPitch - player.pitch) * k;
      }
    }
    const stuck = player.rooted || this.wheelSnare || this.climb;
    const driving = this.seat === 'cab' && !stuck;
    const move = driving ? input.getMove() : ZERO;
    const throttle = move.y;
    const steerIn = move.x;
    this.handbrakeOn = this.seat === 'gun' || (driving && input.isDown('jump')) || Boolean(this.climb);
    this.step(dt, throttle, steerIn, driving);
    if (this.seat === 'cab' && !this.climb) player.yaw = this.heading + this.lookYaw;
    else if (this.seat === 'cab') player.yaw += this.heading - prevHeading;
    this.pose(dt);
    if (this.climb) {
      this.climb.t += dt / q.gunner.climbSeconds;
      if (this.climb.t >= 1) this.climb = null;
    }
    if (this.seat === 'gun' && !this.climb) this.steerGun(dt, player);
    this.carry(player);
    this.combat.sfx?.engine?.(true, Math.min(1, (this.rpm - q.idleRpm) / (q.redline - q.idleRpm)), driving ? Math.abs(throttle) : 0, 'ute');
  }

  // One step of the physics: throttle -1..1, steer -1..1.
  step(dt, throttle, steerIn, driving) {
    const q = this.qc;
    const sinH = Math.sin(this.heading);
    const cosH = Math.cos(this.heading);
    // Speed along and across it.
    let fx = -sinH;
    let fz = -cosH;
    let vf = this.vel.x * fx + this.vel.z * fz;
    const brush = this.ground.undergrowthAt(this.x, this.z);
    const top = q.maxSpeed * (1 + (q.undergrowthMultiplier - 1) * brush);
    // The front wheels turn toward the stick (less lock at speed).
    const lock = q.maxSteer * (1 - q.steerFastLoss * Math.min(1, Math.abs(vf) / q.maxSpeed));
    this.steer += clamp(steerIn * lock - this.steer, -q.steerSpeed * dt, q.steerSpeed * dt);
    // Turning: a bicycle model (tighter the more lock; backwards turns the other way).
    let yawRate = (-vf * Math.tan(this.steer)) / q.wheelbase;
    if (this.handbrakeOn && driving && Math.abs(vf) > 2) yawRate *= q.handbrake.yawBoost;
    this.heading += yawRate * dt;
    this.yawRate = yawRate;
    fx = -Math.sin(this.heading);
    fz = -Math.cos(this.heading);
    const rx = Math.cos(this.heading);
    const rz = -Math.sin(this.heading);
    vf = this.vel.x * fx + this.vel.z * fz;
    let vl = this.vel.x * rx + this.vel.z * rz;
    // Along: the gas, the brakes, reverse, coasting.
    this.shiftTimer = Math.max(0, this.shiftTimer - dt);
    const cut = this.shiftTimer > 0 ? 0.15 : 1;
    let acc = 0;
    this.braking = false;
    if (this.seat === 'gun' || this.climb) {
      acc = -Math.sign(vf) * Math.min(Math.abs(vf) / dt, q.gunner.brakeStop);
      this.braking = Math.abs(vf) > 0.2;
    } else if (throttle > 0.1) {
      if (vf < -0.5) {
        acc = q.brake * throttle;
        this.braking = true;
      } else {
        const share = Math.max(0, vf) / Math.max(1, top);
        acc = q.acceleration * throttle * Math.max(0, 1 - share * share) * cut;
      }
    } else if (throttle < -0.1) {
      if (vf > 0.5) {
        acc = q.brake * throttle;
        this.braking = true;
      } else {
        const want = q.reverseSpeed * throttle;
        acc = vf > want ? Math.max(-q.acceleration * 0.6 * -throttle, (want - vf) / dt) : 0;
      }
    } else {
      const drag = q.coast + (this.gear <= 1 ? q.engineBrake : 0);
      acc = -Math.sign(vf) * Math.min(Math.abs(vf) / dt, drag);
    }
    // The brush drags; over the brush's top speed it slows hard.
    acc -= Math.sign(vf) * Math.min(Math.abs(vf) / dt, q.brushDrag * brush);
    if (vf > top) acc = Math.min(acc, -(vf - top) * 2);
    if (this.handbrakeOn && driving) acc -= Math.sign(vf) * Math.min(Math.abs(vf) / dt, q.handbrake.drag);
    const before = vf;
    vf += acc * dt;
    if (throttle >= -0.1 && throttle <= 0.1 && Math.sign(vf) !== Math.sign(before) && before !== 0) vf = 0;
    if (this.braking && Math.sign(vf) !== Math.sign(before)) vf = 0;
    // Across: the tyres kill the slide (the handbrake lets the back go).
    const grip = this.handbrakeOn && driving ? q.handbrake.grip : q.grip;
    vl *= Math.exp(-grip * dt);
    this.vel.x = fx * vf + rx * vl;
    this.vel.z = fz * vf + rz * vl;
    // Move, then out of whatever it ran into.
    const want = { x: this.x + this.vel.x * dt, z: this.z + this.vel.z * dt };
    const pos = { x: want.x, z: want.z };
    const push = { x: 0, z: 0 };
    for (let pass = 0; pass < 2; pass++) {
      let best = null;
      let bestLen = 0;
      for (const o of q.circles) {
        const c = { x: pos.x - fx * o, z: pos.z - fz * o };
        const b = { ...c };
        resolveCircles(c, q.radius, this.colliders.query(c.x, c.z, q.radius, this.nearby), true);
        const len = Math.hypot(c.x - b.x, c.z - b.z);
        if (len > bestLen) {
          bestLen = len;
          best = { x: c.x - b.x, z: c.z - b.z };
        }
      }
      if (!best) break;
      pos.x += best.x;
      pos.z += best.z;
      push.x += best.x;
      push.z += best.z;
    }
    this.ground.clamp(pos);
    const pushed = Math.hypot(pos.x - want.x, pos.z - want.z);
    const speed = Math.hypot(this.vel.x, this.vel.z);
    if (pushed > 1e-4) {
      // Slide along it: lose the speed going into it; a hard hit costs most of the rest.
      const nx = (pos.x - want.x) / pushed;
      const nz = (pos.z - want.z) / pushed;
      const into = this.vel.x * nx + this.vel.z * nz;
      if (into < 0) {
        this.vel.x -= nx * into;
        this.vel.z -= nz * into;
      }
      if (pushed > speed * dt * 0.4 && -into > q.bumpSpeed) {
        this.player.shake(Math.min(1, -into / q.maxSpeed) * q.bumpShake);
        this.combat.sfx?.play('carCrash', pos);
        this.vel.x *= q.bumpKeep;
        this.vel.z *= q.bumpKeep;
      }
    }
    this.x = pos.x;
    this.z = pos.z;
    vf = this.vel.x * fx + this.vel.z * fz;
    // The gearbox and the revs.
    const share = Math.abs(vf) / q.maxSpeed;
    if (vf < -0.3) {
      this.gear = -1;
      this.rpmTarget = q.idleRpm + (q.redline - q.idleRpm) * Math.min(1, -vf / q.reverseSpeed) * 0.8;
    } else {
      if (this.gear < 0) this.gear = 0;
      const g = pickGear(q.gears, this.gear, share, q.shiftUp, q.shiftDown, throttle);
      if (g !== this.gear) {
        if (g > this.gear) {
          this.shiftTimer = q.shiftSeconds;
          this.sus.vp -= 0.25; // the nose dips as the drive cuts
        }
        this.gear = g;
        this.combat.sfx?.play('gearShift', this);
      }
      this.rpmTarget = gearRpm(q.gears, this.gear, share, q.idleRpm, q.redline);
      if (Math.abs(vf) < 0.5 && driving) this.rpmTarget = q.idleRpm + Math.max(0, throttle) * 1.4; // revving at a stop
      if (this.shiftTimer > 0) this.rpmTarget *= 0.8;
    }
    this.rpm += (this.rpmTarget - this.rpm) * Math.min(1, dt * 9);
    // The springs: nose up on the gas, down on the brakes, leaning out of turns.
    const along = (vf - this.prevSpeed) / Math.max(dt, 1e-3);
    this.prevSpeed = vf;
    this.stepSuspension(dt, along, vf * -yawRate);
    // The freshener swings; the temperature climbs as it's driven.
    this.stepFreshener(dt, along, vf * -yawRate);
    this.temp = Math.min(0.52, this.temp + dt * 0.004 * (0.3 + share));
    this.odometer += (Math.abs(vf) * dt) / 1000;
    this.speed = vf;
    // The wheels roll.
    this.spin -= (vf / UTE.wheelRadius) * dt;
    this.ram(dt, this.player);
    this.shove();
  }

  // Pitch and roll on the springs: along (m/s², forward +), across (m/s², toward the right +).
  stepSuspension(dt, along, across) {
    const s = this.qc.suspension;
    const tp = clamp(along * s.pitch, -s.maxPitch, s.maxPitch);
    const tr = clamp(across * s.roll, -s.maxRoll, s.maxRoll);
    const n = Math.max(1, Math.ceil(dt / 0.008));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      this.sus.vp += (s.stiffness * (tp - this.sus.pitch) - s.damping * this.sus.vp) * h;
      this.sus.vr += (s.stiffness * (tr - this.sus.roll) - s.damping * this.sus.vr) * h;
      this.sus.pitch += this.sus.vp * h;
      this.sus.roll += this.sus.vr * h;
    }
  }

  stepFreshener(dt, along, across) {
    const f = this.fresh;
    const L = 0.1;
    const g = 9.8;
    const n = Math.max(1, Math.ceil(dt / 0.008));
    const h = dt / n;
    const jiggle = (Math.sin(performance.now() * 0.05) * 0.6 * this.rpm) / 4;
    for (let i = 0; i < n; i++) {
      f.vx += (-(g / L) * Math.sin(f.ax) - 2.2 * f.vx - (along / L) * Math.cos(f.ax) + jiggle) * h;
      f.vz += (-(g / L) * Math.sin(f.az) - 2.2 * f.vz - (across / L) * Math.cos(f.az)) * h;
      f.ax = clamp(f.ax + f.vx * h, -1.2, 1.2);
      f.az = clamp(f.az + f.vz * h, -1.2, 1.2);
    }
  }

  // Sit it on the ground (pitched and rolled to the slope under its wheels),
  // the body on its springs, the wheels rolling and steering, the cab's dials.
  pose() {
    const g = this.ground;
    const ax = -Math.sin(this.heading);
    const az = -Math.cos(this.heading);
    const rx = Math.cos(this.heading);
    const rz = -Math.sin(this.heading);
    const Lf = -UTE.axles[0];
    const Lr = UTE.axles[1];
    const T = UTE.track;
    const front = g.heightAt(this.x + ax * Lf, this.z + az * Lf);
    const back = g.heightAt(this.x - ax * Lr, this.z - az * Lr);
    const right = g.heightAt(this.x + rx * T, this.z + rz * T);
    const left = g.heightAt(this.x - rx * T, this.z - rz * T);
    this.y = (front + back + left + right) / 4;
    const pitch = Math.atan2(front - back, Lf + Lr);
    const roll = Math.atan2(right - left, 2 * T);
    const m = this.model;
    m.root.position.set(this.x, this.y, this.z);
    m.root.rotation.set(pitch, this.heading, roll, 'YXZ');
    const shudder = this.riding ? Math.sin(performance.now() * 0.045) * 0.0025 * (0.6 + this.rpm * 0.25) : 0;
    m.body.rotation.set(this.sus.pitch + shudder, 0, this.sus.roll);
    m.body.position.y = -Math.abs(this.sus.pitch) * 0.3;
    for (const w of m.wheels) {
      w.spin.rotation.x = this.spin;
      w.group.rotation.y = w.front ? -this.steer : 0;
    }
    if (m.interior.group.visible) this.poseCab();
  }

  // The cab's working parts (only drawn from the driver's seat).
  poseCab() {
    const q = this.qc;
    const I = this.model.interior;
    I.steeringWheel.rotation.z = (-this.steer / q.maxSteer) * 1.6;
    this.model.setGauges({ speed: Math.abs(this.speed) * 3.6, rpm: this.rpm, fuel: q.fuel, temp: this.temp, lamp: this.lampOn, brake: this.handbrakeOn });
    this.model.setOdometer(this.odometer);
    if (this.clock) {
      const h = this.clock.hourOfDay;
      const hh = Math.floor(h) % 24;
      const mm = Math.floor((h - Math.floor(h)) * 60);
      this.model.setClock(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
    }
    I.freshPivot.rotation.set(this.fresh.ax, 0, this.fresh.az);
    // The gear lever through its gate: 1 2 / 3 4 / 5 R.
    const gates = { '-1': [0.2, -0.22], 0: [-0.2, 0.22], 1: [-0.2, -0.22], 2: [0, 0.22], 3: [0, -0.22], 4: [0.2, 0.22] };
    const [gz, gx] = gates[this.gear] ?? [0, 0];
    const k = 0.35;
    I.gear.rotation.z += (-gz - I.gear.rotation.z) * k;
    I.gear.rotation.x += (-gx - I.gear.rotation.x) * k;
    I.handbrake.rotation.x += ((this.handbrakeOn ? 0.45 : 0) - I.handbrake.rotation.x) * 0.3;
  }

  // Tom goes with it: his feet under his eye (the cab's seat or the gun), his speed its own.
  carry(player) {
    const cam = this.cameraPose();
    player.position.set(cam.x, cam.y - player.eyeHeight, cam.z);
    player.velocity.x = this.vel.x;
    player.velocity.z = this.vel.z;
    player.onGround = true;
    player.verticalSpeed = 0;
  }

  // Where his eye is: the driver's seat, behind the gun, or partway over the cab's back.
  cameraPose() {
    const q = this.qc;
    const m = this.model;
    m.root.updateMatrixWorld(true);
    const cab = this._cab ?? (this._cab = new THREE.Vector3());
    cab.set(q.eye.x, q.eye.y, q.eye.z).applyMatrix4(m.body.matrixWorld);
    const gun = this._gunEye ?? (this._gunEye = new THREE.Vector3());
    const pivot = this._pivot ?? (this._pivot = new THREE.Vector3());
    m.turret.yaw.getWorldPosition(pivot);
    const yaw = this.gunYaw ?? this.heading;
    gun.set(Math.sin(yaw) * q.gunner.back, 0.24 + q.gunner.up, Math.cos(yaw) * q.gunner.back).add(pivot);
    const out = this._eye ?? (this._eye = new THREE.Vector3());
    if (this.climb) {
      const from = this.climb.from === 'cab' ? cab : gun;
      const to = this.climb.to === 'cab' ? cab : gun;
      const t = smooth(this.climb.t);
      out.lerpVectors(from, to, t);
      out.y += Math.sin(t * Math.PI) * 0.45; // up and over the cab's back
      return out;
    }
    return out.copy(this.seat === 'gun' ? gun : cab);
  }

  // Called by the Player after its own camera: the view from the seat.
  placeCamera(player) {
    if (!this.riding) return;
    const cam = player.camera;
    const eye = this.cameraPose();
    const shake = player.shakeAmount;
    const sx = Math.sin(player.shakeTime * 47) * shake * 0.02;
    const sy = Math.sin(player.shakeTime * 61 + 1.3) * shake * 0.02;
    cam.position.copy(eye);
    const recoil = (this.recoil ?? 0) + player.recoilPitch;
    if (this.seat === 'gun' || this.climb) {
      let yaw = this.gunYaw;
      let pitch = this.gunPitch;
      if (this.climb) {
        const t = smooth(this.climb.t);
        const cabYaw = this.heading + this.lookYaw;
        const fromYaw = this.climb.from === 'cab' ? cabYaw : this.gunYaw;
        const toYaw = this.climb.to === 'cab' ? cabYaw : this.gunYaw;
        yaw = lerpAngle(fromYaw, toYaw, t);
        const fromPitch = this.climb.from === 'cab' ? this.qc.restPitch : this.gunPitch;
        const toPitch = this.climb.to === 'cab' ? this.qc.restPitch : this.gunPitch;
        pitch = fromPitch + (toPitch - fromPitch) * t;
      }
      cam.rotation.set(pitch + recoil + sy, yaw + sx, 0, 'YXZ');
    } else {
      const q = this._q ?? (this._q = new THREE.Quaternion());
      const e = this._e ?? (this._e = new THREE.Euler(0, 0, 0, 'YXZ'));
      this.model.body.getWorldQuaternion(q);
      e.set(player.pitch + recoil + sy, this.lookYaw + sx, 0, 'YXZ');
      const look = this._lq ?? (this._lq = new THREE.Quaternion());
      look.setFromEuler(e);
      cam.quaternion.copy(q).multiply(look);
    }
    cam.updateMatrixWorld();
  }

  // ---- into the dead ---------------------------------------------------------------------------------

  // Off its nose at speed: thrown, hurt; along its flanks they're shoved clear.
  ram(dt, player) {
    const q = this.qc;
    const r = q.ram;
    const speed = Math.abs(this.speed);
    if (speed < r.minSpeed) return;
    const dir = Math.sign(this.speed);
    const now = performance.now();
    for (const z of this.enemies.living) {
      if (Math.abs(z.x - this.x) > 5 || Math.abs(z.z - this.z) > 5) continue;
      if (z.rammedUntil > now) continue;
      const { lx, lz } = this.toLocal(z.x, z.z);
      const reach = UTE.half + 0.15 + z.radius;
      const nose = dir > 0 ? lz < -2.2 && lz > -r.front - r.reach : lz > UTE.tray.back - 0.4 && lz < UTE.tray.back + r.reach;
      if (!nose || Math.abs(lx) > reach) continue;
      const k = Math.min(1.4, speed / q.maxSpeed);
      z.rammedUntil = now + 700;
      const mutant = z.kind === 'mutant';
      const killed = this.enemies.damage(z, r.damage * k * (mutant ? r.mutantScale : 1), 'body', { id: 'ute', stagger: r.stagger, knockback: r.knockback * k }, { x: z.x, y: (z.y ?? 0) + 1, z: z.z }, { x: this.x, z: this.z });
      this.vel.x *= mutant ? r.mutantKeep : r.keep;
      this.vel.z *= mutant ? r.mutantKeep : r.keep;
      player.shake(r.shake * (mutant ? 1.8 : 1));
      this.combat.sfx?.play('fenceHit', z);
      this.bus.emit('weapon:hit', { killed, part: 'body', melee: true });
      if (dir > 0 && speed > q.splats.minSpeed) this.splat();
    }
    // The witch, if she's in the way.
    const w = this.witch;
    if (w?.targetable && !(w.rammedUntil > now)) {
      const { lx, lz } = this.toLocal(w.x, w.z);
      if (Math.abs(lx) < UTE.half + 0.5 && (dir > 0 ? lz < -2.2 && lz > -r.front - r.reach : lz > UTE.tray.back - 0.4 && lz < UTE.tray.back + r.reach)) {
        w.rammedUntil = now + 1200;
        w.takeHit(r.witchDamage * Math.min(1, speed / q.maxSpeed), 'body', { id: 'ute' }, { x: w.x, y: (w.y ?? 0) + 1, z: w.z }, { x: this.x, z: this.z });
        player.shake(1);
      }
    }
  }

  // The dead along its flanks (it's moving: its circles are out of the grid) are pushed clear.
  shove() {
    if (Math.abs(this.speed) < 0.2) return;
    const hw = UTE.half;
    for (const z of this.enemies.living) {
      if (Math.abs(z.x - this.x) > 4 || Math.abs(z.z - this.z) > 4) continue;
      const { lx, lz } = this.toLocal(z.x, z.z);
      const w = hw + z.radius;
      if (Math.abs(lx) >= w || lz < -2.75 || lz > UTE.tray.back) continue;
      const out = this.toWorld(Math.sign(lx || 1) * (w + 0.02), lz);
      z.x = out.x;
      z.z = out.z;
    }
  }

  // ---- the witch's snare round a wheel ---------------------------------------------------------------

  snareWheel(trap) {
    if (!this.riding || this.wheelSnare) return false;
    this.wheelSnare = trap;
    this.mash = 0;
    trap.held = this;
    const at = this.toWorld(UTE.track, UTE.axles[0]);
    trap.x = at.x;
    trap.z = at.z;
    trap.y = this.ground.heightAt(at.x, at.z);
    this.vel.x = 0;
    this.vel.z = 0;
    this.speed = 0;
    this.player.shake(this.qc.snare.shake);
    this.combat.sfx?.play('impact', this);
    const pad = this.device !== 'keyboardMouse';
    this.combat.hud?.pickup?.(`A snare's wrapped round the front wheel! Get out and tap ${pad ? 'X' : 'E'} by it to free it.`);
    this.bus.emit('quad:wheelSnared', { trap });
    return true;
  }

  // ---- the gun ---------------------------------------------------------------------------------------

  initGun() {
    const g = this.qc.gun;
    this.heat = 0;
    this.locked = false;
    this.shotTimer = 0;
    this.sinceShot = 10;
    this.spread = g.spread;
    this.recoil = 0;
    this.flashTimer = 0;
    this.rounds = 0;
    this.noiseClock = 0;
    this.gunYaw = 0;
    this.gunPitch = 0;
    this.rayHits = [];
    this.blockers = [];
    this.v = { eye: new THREE.Vector3(), fwd: new THREE.Vector3(), right: new THREE.Vector3(), up: new THREE.Vector3(), dir: new THREE.Vector3(), muzzle: new THREE.Vector3(), to: new THREE.Vector3() };
    // The brass: a pool of casings (one draw call), bouncing off the tray and the ground.
    const b = g.brass;
    const geo = new THREE.CylinderGeometry(0.009, 0.009, 0.075, 6).rotateZ(Math.PI / 2);
    this.brassMesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: this.qc.look.colours.brass }), b.pool);
    this.brassMesh.frustumCulled = false;
    this.brassMesh.count = 0;
    this.brassMesh.name = 'ute brass';
    this.scene.add(this.brassMesh);
    this.brass = Array.from({ length: b.pool }, () => ({ life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, spin: 0, bounced: 0 }));
    this.brassNext = 0;
    this.brassMatrix = new THREE.Matrix4();
    this.brassQuat = new THREE.Quaternion();
    this.brassEuler = new THREE.Euler();
    this.brassScale = new THREE.Vector3(1, 1, 1);
    this.brassPos = new THREE.Vector3();
    this.tinkleTimer = 0;
  }

  // His look swings the gun (as fast as the mount lets it).
  steerGun(dt, player) {
    const g = this.qc.gun;
    player.pitch = clamp(player.pitch, this.pitchFloor(player.yaw), g.pitchMax);
    // The gun swings toward where he's looking as fast as the mount lets it;
    // a flick further than that is caught up over the next few frames (never lost).
    const d = wrapAngle(player.yaw - this.gunYaw);
    const maxTurn = g.traverse * dt;
    this.gunYaw = wrapAngle(this.gunYaw + clamp(d, -maxTurn, maxTurn));
    this.gunPitch += clamp(player.pitch - this.gunPitch, -maxTurn, maxTurn);
    const lead = wrapAngle(player.yaw - this.gunYaw);
    if (Math.abs(lead) > Math.PI * 0.75) player.yaw = this.gunYaw + Math.sign(lead) * Math.PI * 0.75;
    this.aimGun();
  }

  // Session 25 (Aaron): how far the gun dips, looking `yaw`: a little over
  // the cab, much further over the sides and the back (the dead close in).
  pitchFloor(yaw) {
    const g = this.qc.gun;
    const off = Math.abs(wrapAngle(yaw - this.heading));
    const k = Math.min(1, Math.max(0, (off - 0.5) / 0.6));
    const s = k * k * (3 - 2 * k);
    return g.pitchMin + ((g.pitchMinSide ?? g.pitchMin) - g.pitchMin) * s;
  }

  // The gun's mount, turned to its yaw and pitch in the world (the ute may stand on a slope).
  aimGun() {
    const t = this.model.turret;
    const q = this._bq ?? (this._bq = new THREE.Quaternion());
    const w = this._wq ?? (this._wq = new THREE.Quaternion());
    const e = this._we ?? (this._we = new THREE.Euler(0, 0, 0, 'YXZ'));
    this.model.body.updateMatrixWorld(true);
    this.model.body.getWorldQuaternion(q);
    e.set(0, this.gunYaw, 0, 'YXZ');
    w.setFromEuler(e);
    t.yaw.quaternion.copy(q.invert()).multiply(w);
    t.pitch.rotation.x = this.gunPitch + this.recoil * 0.6;
  }

  updateGun(dt, input) {
    const g = this.qc.gun;
    const firing = input.isDown('attack') && !this.locked;
    const aiming = input.isDown('aim');
    this.player.fovMultiplier = aiming ? g.aimFov : 1;
    this.shotTimer -= dt;
    let shots = 0;
    if (firing) {
      while (this.shotTimer <= 0) {
        this.fireRound(aiming);
        this.shotTimer += 1 / g.rate;
        shots++;
        if (this.heat + shots * g.heatPerShot >= 1) break;
      }
    } else {
      this.shotTimer = Math.max(0, this.shotTimer);
    }
    this.sinceShot = shots > 0 ? 0 : this.sinceShot + dt;
    const wasLocked = this.locked;
    const h = stepHeat(this.heat, this.locked, shots, firing, this.sinceShot, dt, g);
    this.heat = h.heat;
    this.locked = h.locked;
    if (this.locked && !wasLocked) {
      this.combat.sfx?.play('gunHot', this);
      this.combat.hud?.pickup?.('The gun has overheated! Let it cool.');
    }
    if (!this.locked && wasLocked) this.combat.sfx?.play('gunCool', this);
    if (!firing) this.spread = Math.max(g.spread, this.spread - g.spreadSettle * dt);
    this.recoil -= this.recoil * Math.min(1, dt * 14);
    this.noiseClock -= dt;
    if (shots > 0 && this.noiseClock <= 0) {
      this.noiseClock = 0.5;
      this.enemies.alert(this.x, this.z, g.noise);
    }
    this.glowBarrel();
    this.aimGun();
  }

  coolGun(dt) {
    if (this.heat <= 0 && !this.locked) return;
    const h = stepHeat(this.heat, this.locked, 0, false, 10, dt, this.qc.gun);
    this.heat = h.heat;
    this.locked = h.locked;
    this.recoil = 0;
    this.glowBarrel();
  }

  // The barrel glows dull red, then orange, as it heats; it smokes while locked.
  glowBarrel() {
    const t = this.heat;
    const k = Math.max(0, (t - 0.35) / 0.65);
    const mat = this.model.turret.barrel;
    mat.emissive.setHex(this.qc.look.heatGlow).multiplyScalar(k * k * 2.2);
    if (this.locked && Math.random() < 0.3) {
      const m = this.v.muzzle;
      this.model.turret.muzzle.getWorldPosition(m);
      this.combat.fx?.dust?.(m.x, m.y + 0.05, m.z);
    }
  }

  // One round: from his eye down the sights (where the crosshair is), a tracer from the muzzle.
  fireRound(aiming) {
    const g = this.qc.gun;
    const v = this.v;
    const cam = this.player.camera;
    v.eye.copy(cam.position);
    cam.getWorldDirection(v.fwd);
    v.right.set(1, 0, 0).applyQuaternion(cam.quaternion);
    v.up.set(0, 1, 0).applyQuaternion(cam.quaternion);
    const spreadRad = this.spread * (aiming ? g.aimSpread : 1) * DEG;
    const dir = spreadDirection(v.fwd, v.right, v.up, spreadRad, this.rng, v.dir);
    const eye = v.eye;
    const check = Math.min(g.range, 120);
    const half = check / 2;
    this.colliders.query(eye.x + dir.x * half, eye.z + dir.z * half, half + 2, this.blockers);
    const blocked = rayBlockers(eye, dir, this.blockers, g.range, this.ground);
    const targets = this.combat.weapons?.targets?.() ?? this.enemies.living;
    const count = rayEnemiesAll(eye, dir, targets, blocked, this.rayHits);
    let end = blocked;
    const head = this.cfg.weapons?.headshotMultiplier ?? 2;
    const [fs, fe, fm] = g.falloff;
    if (count > 0) {
      const pierce = Math.min(count, g.pierce);
      let carried = 1;
      for (let k = 0; k < pierce; k++) {
        const hit = this.rayHits[k];
        const part = helmetPart(hit.enemy, hit.part, { helmetPierce: true });
        const dmg = g.damage * carried * falloff(hit.distance, fs, fe, fm) * partMultiplier(hit.enemy, part, head);
        const at = { x: eye.x + dir.x * hit.distance, y: eye.y + dir.y * hit.distance, z: eye.z + dir.z * hit.distance };
        const weapon = { id: 'uteGun', stagger: g.stagger, knockback: g.knockback, helmetPierce: true };
        const killed = this.combat.weapons?.applyHit ? this.combat.weapons.applyHit(hit.enemy, dmg, part, weapon, at, eye) : this.enemies.damage(hit.enemy, dmg, part, weapon, at, eye);
        this.bus.emit('weapon:hit', { killed, part, melee: false });
        carried *= g.pierceKeep;
        end = hit.distance;
      }
    } else if (blocked < check) {
      const damage = g.damage * falloff(blocked, fs, fe, fm);
      this.bus.emit('weapon:impact', { x: eye.x + dir.x * blocked, y: eye.y + dir.y * blocked, z: eye.z + dir.z * blocked, damage, id: 'uteGun' });
    }
    // The muzzle: the flash, the light, the tracer, the brass, the kick.
    // Session 25 (Aaron: shots should come from the gun's body, not its tip): the round's ray
    // runs from his eye behind the breech, so the dead inside the barrel's reach are hit; a
    // tracer only shows for a hit past the muzzle.
    this.model.turret.muzzle.getWorldPosition(v.muzzle);
    this.rounds++;
    if (this.rounds % g.tracerEvery === 0 && end > eye.distanceTo(v.muzzle) + 0.5) {
      v.to.copy(dir).multiplyScalar(Math.min(end, 140)).add(eye);
      this.combat.fx?.tracer?.(v.muzzle, v.to);
    }
    this.combat.fx?.muzzleFlash?.(v.muzzle);
    const f = this.model.turret.flash;
    f.visible = true;
    f.rotation.z = Math.random() * Math.PI;
    f.scale.setScalar(0.8 + Math.random() * 0.6);
    this.flashTimer = 0.045;
    this.combat.sfx?.play('uteGun', this);
    this.ejectBrass();
    this.recoil += g.kick * DEG;
    this.player.shake(g.shake);
    this.spread = Math.min(g.spreadMax, this.spread + g.spreadGrow);
  }

  updateFlash(dt) {
    if (this.flashTimer <= 0) return;
    this.flashTimer -= dt;
    if (this.flashTimer <= 0) this.model.turret.flash.visible = false;
  }

  ejectBrass() {
    const b = this.brass[this.brassNext];
    this.brassNext = (this.brassNext + 1) % this.brass.length;
    const p = this.v.muzzle;
    this.model.turret.ejector.getWorldPosition(p);
    const yaw = this.gunYaw;
    const rx = Math.cos(yaw);
    const rz = -Math.sin(yaw);
    const s = 1.6 + Math.random() * 0.8;
    b.x = p.x;
    b.y = p.y;
    b.z = p.z;
    b.vx = rx * s + this.vel.x + (Math.random() - 0.5) * 0.4;
    b.vy = 1.8 + Math.random() * 1.2;
    b.vz = rz * s + this.vel.z + (Math.random() - 0.5) * 0.4;
    b.rx = Math.random() * 6;
    b.ry = Math.random() * 6;
    b.spin = 14 + Math.random() * 12;
    b.life = this.qc.gun.brass.life;
    b.bounced = 0;
  }

  updateBrass(dt) {
    const pool = this.brass;
    if (!pool) return;
    let n = 0;
    const deck = UTE.tray;
    this.tinkleTimer -= dt;
    for (const b of pool) {
      if (b.life <= 0) continue;
      b.life -= dt;
      b.vy -= 9.8 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.z += b.vz * dt;
      b.rx += b.spin * dt;
      b.ry += b.spin * 0.7 * dt;
      // The floor: the tray's deck if it's over it, else the ground.
      let floor = this.ground.heightAt(b.x, b.z);
      if (!this.stored) {
        const { lx, lz } = this.toLocal(b.x, b.z);
        if (Math.abs(lx) < deck.half && lz > deck.front && lz < deck.back) floor = this.y + deck.deck;
      }
      if (b.y < floor + 0.01) {
        b.y = floor + 0.01;
        if (b.vy < 0) {
          b.vy = -b.vy * this.qc.gun.brass.bounce;
          b.vx *= 0.55;
          b.vz *= 0.55;
          b.spin *= 0.5;
          b.bounced++;
          if (b.bounced === 1 && this.tinkleTimer <= 0) {
            this.tinkleTimer = 0.09;
            this.combat.sfx?.play('brass', b);
          }
        }
      }
      if (b.life <= 0) continue;
      this.brassEuler.set(b.rx, b.ry, 0);
      this.brassQuat.setFromEuler(this.brassEuler);
      this.brassPos.set(b.x, b.y, b.z);
      this.brassMatrix.compose(this.brassPos, this.brassQuat, this.brassScale);
      this.brassMesh.setMatrixAt(n++, this.brassMatrix);
    }
    this.brassMesh.count = n;
    if (n > 0) this.brassMesh.instanceMatrix.needsUpdate = true;
  }

  // ---- the windscreen: blood and the wipers --------------------------------------------------------

  splat() {
    const S = this.qc.splats;
    const pool = this.model.interior.splats;
    let s = pool.find((p) => p.life <= 0) ?? pool.reduce((a, b) => (a.life < b.life ? a : b));
    s.u = (Math.random() - 0.5) * 1.3;
    s.v = 0.08 + Math.random() * 0.5;
    s.life = 30;
    s.fade = 1;
    s.wiped = false;
    const size = S.size[0] + Math.random() * (S.size[1] - S.size[0]);
    s.mesh.position.set(s.u, s.v, 0);
    s.mesh.rotation.z = (Math.random() - 0.5) * 0.6;
    s.mesh.scale.set(size, size, 1);
    s.mesh.material.opacity = 0.92;
    s.mesh.visible = true;
    if (!this.wipe) this.wipe = { wait: S.wipeDelay, t: 0, sweep: 0 };
    else if (this.wipe.sweep >= S.sweeps - 1) this.wipe.sweep = Math.max(0, S.sweeps - 2); // one more pass
  }

  updateSplats(dt) {
    const S = this.qc.splats;
    const I = this.model.interior;
    let angle = 0;
    if (this.wipe) {
      const w = this.wipe;
      if (w.wait > 0) w.wait -= dt;
      else {
        w.t += dt / S.sweepSeconds;
        if (w.t >= 1) {
          w.t = 0;
          w.sweep++;
          if (w.sweep >= S.sweeps) this.wipe = null;
        }
        angle = Math.sin(Math.min(1, w.t) * Math.PI) * 1.75;
        if (w.t > 0 && w.t < 0.04 && w.sweep === 0) this.combat.sfx?.play('wiper', this);
      }
    }
    for (const wp of I.wipers) wp.arm.rotation.z = angle;
    for (const s of I.splats) {
      if (s.life <= 0) continue;
      s.life -= dt;
      // A wiper passing over it smears it away.
      if (!s.wiped && angle > 0) {
        for (const wp of I.wipers) {
          const du = s.u - wp.x;
          const d = Math.hypot(du, s.v);
          if (d < 0.56 && angle >= Math.atan2(s.v, du)) s.wiped = true;
        }
      }
      if (s.wiped) {
        s.fade -= dt * 3.5;
        s.mesh.scale.x *= 1 + dt * 2;
      } else if (s.life < S.fade) s.fade = s.life / S.fade;
      s.mesh.material.opacity = 0.92 * Math.max(0, s.fade);
      if (s.fade <= 0) s.life = 0;
      if (s.life <= 0) s.mesh.visible = false;
    }
  }

  // ---- the rear-view mirror -------------------------------------------------------------------------

  // A small camera looking back from the mirror, drawn every few frames into
  // the mirror's glass (only while Tom's in the driver's seat).
  initMirror() {
    const mc = this.qc.mirror;
    if (!mc.live || !this.renderer?.preRender) return;
    this.mirrorTarget = new THREE.WebGLRenderTarget(mc.width, mc.height, { type: THREE.HalfFloatType });
    this.mirrorCam = new THREE.PerspectiveCamera(mc.fov, mc.width / mc.height, 0.05, mc.far);
    this.mirrorCam.rotation.order = 'YXZ';
    const I = this.model.interior;
    I.mirrorMat.map = this.mirrorTarget.texture;
    I.mirrorMat.color.setRGB(0.85, 0.85, 0.85);
    I.mirrorMat.needsUpdate = true;
    // A mirror shows the picture flipped left to right.
    const uv = I.mirror.geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i));
    uv.needsUpdate = true;
    this.mirrorFrame = 0;
    this.mirrorHook = (gl, scene) => this.drawMirror(gl, scene);
    this.renderer.preRender.push(this.mirrorHook);
  }

  drawMirror(gl, scene) {
    if (!this.riding || this.seat !== 'cab' || this.climb) return;
    this.mirrorFrame = (this.mirrorFrame + 1) % this.qc.mirror.every;
    if (this.mirrorFrame !== 0) return;
    const I = this.model.interior;
    const cam = this.mirrorCam;
    I.mirror.getWorldPosition(cam.position);
    const q = this._mq ?? (this._mq = new THREE.Quaternion());
    this.model.body.getWorldQuaternion(q);
    const e = this._me ?? (this._me = new THREE.Euler(0, 0, 0, 'YXZ'));
    e.setFromQuaternion(q, 'YXZ');
    cam.rotation.set(-e.x - 0.05, e.y + Math.PI, 0, 'YXZ');
    cam.updateMatrixWorld();
    I.mirror.visible = false;
    I.freshPivot.visible = false;
    const autoShadow = gl.shadowMap.autoUpdate;
    gl.shadowMap.autoUpdate = false;
    const prev = gl.getRenderTarget();
    gl.setRenderTarget(this.mirrorTarget);
    gl.render(scene, cam);
    gl.setRenderTarget(prev);
    gl.shadowMap.autoUpdate = autoShadow;
    I.mirror.visible = true;
    I.freshPivot.visible = true;
  }

  // ---- the HUD -----------------------------------------------------------------------------------------

  updateHud(input) {
    if (!this.vhud) return;
    if (!this.riding) {
      this.vhud.hide(this);
      return;
    }
    const pad = input.activeDevice === 'gamepad';
    if (this.seat === 'gun' && !this.climb) {
      this.vhud.show(this, 'ute-gun', {
        heat: this.heat,
        locked: this.locked,
        spread: this.spread,
        aiming: input.isDown('aim'),
        hint: pad ? 'RT fire · LT steady · D-pad right lamp · Y wheel · hold X down' : 'Mouse fire · Right steady · H lamp · F wheel · hold E down',
      });
    } else {
      this.vhud.show(this, 'ute-cab', {
        gear: this.gear,
        handbrake: this.handbrakeOn && this.seat === 'cab',
        hint: pad ? 'A handbrake · B horn · Y gun · D-pad right lights' : 'Space handbrake · R horn · F gun · H lights',
      });
    }
  }

  // ---- debug ---------------------------------------------------------------------------------------------

  // Bring it to Tom: a few metres ahead of him, side on (or nose on), facing his way.
  bring() {
    if (this.riding) return;
    const p = this.player;
    const ax = -Math.sin(p.yaw);
    const az = -Math.cos(p.yaw);
    const x = p.position.x + ax * 5.5;
    const z = p.position.z + az * 5.5;
    this.unpark();
    this.clearMotion();
    this.place(x, z, p.yaw + Math.PI / 2);
    this.notify?.('The ute is in front of you (hold X by the cab to drive, by the tray for the gun)');
  }

  addDebugItems(menu) {
    const cat = menu.category(DEBUG.experimental);
    cat.addItem('Ute with a turret: bring it here', () => this.bring());
    cat.addItem('Ute: put me behind the wheel', () => {
      if (this.player.riding && this.player.riding !== this) return;
      if (this.stored) this.bring();
      if (!this.riding) this.mount('cab');
    });
    cat.addItem('Ute: put me on the gun', () => {
      if (this.player.riding && this.player.riding !== this) return;
      if (this.stored) this.bring();
      if (!this.riding) this.mount('gun');
      else if (this.seat === 'cab') this.swapSeat();
    });
    cat.addItem(() => `Ute: rear-view mirror ${this.qc.mirror.live && this.mirrorTarget ? 'live' : 'dark glass'} (toggle)`, () => {
      if (!this.mirrorTarget) return;
      this.mirrorHookOn = !(this.mirrorHookOn ?? true);
      const I = this.model.interior;
      if (this.mirrorHookOn) {
        this.renderer.preRender.push(this.mirrorHook);
        I.mirrorMat.map = this.mirrorTarget.texture;
        I.mirrorMat.color.setRGB(0.85, 0.85, 0.85);
      } else {
        this.renderer.preRender.splice(this.renderer.preRender.indexOf(this.mirrorHook), 1);
        I.mirrorMat.map = null;
        I.mirrorMat.color.set(0x0c0e10);
      }
      I.mirrorMat.needsUpdate = true;
    });
    cat.addItem('Ute: send it away', () => {
      if (this.riding) this.dismount();
      this.reset();
    });
  }

  overlayLine() {
    if (this.stored) return 'ute away';
    const gear = this.gear < 0 ? 'R' : String(this.gear + 1);
    return `ute ${this.riding ? `${this.seat} ${(Math.abs(this.speed) * 3.6).toFixed(0)} km/h g${gear} ${this.rpm.toFixed(1)}k` : 'parked'} heat ${Math.round(this.heat * 100)}%${this.locked ? ' LOCKED' : ''}${this.lampOn ? ' lamp' : ''}`;
  }

  dispose() {
    for (const off of this.unsubscribers ?? []) off();
    this.combat?.sfx?.engine?.(false);
    this.unpark();
    if (this.mirrorHook && this.renderer?.preRender) {
      const i = this.renderer.preRender.indexOf(this.mirrorHook);
      if (i >= 0) this.renderer.preRender.splice(i, 1);
    }
    this.mirrorTarget?.dispose();
    this.lamp?.dispose();
    this.gunLamp?.dispose();
    this.brassMesh?.removeFromParent();
    this.brassMesh?.geometry.dispose();
    this.brassMesh?.material.dispose();
    this.model?.dispose();
  }
}

const ZERO = { x: 0, y: 0 };

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function smooth(t) {
  const c = clamp(t, 0, 1);
  return c * c * (3 - 2 * c);
}

function lerpAngle(a, b, t) {
  return a + wrapAngle(b - a) * t;
}

// A lens lit (its colour, pushed past white by `gain` so the bloom takes it) or dark (0).
function glow(mat, color, gain) {
  if (!mat) return;
  if (!color) {
    mat.emissive.setHex(0x000000);
    return;
  }
  mat.emissive.setHex(color).multiplyScalar(gain);
}
