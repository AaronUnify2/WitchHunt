// The quad bike (Session 15b pass 3, Aaron: "too much walking and
// running"): Earl's four-wheeler, parked behind the gas station by the
// stockroom's back door. Tom rides it to cross the map quicker.
//  - Hold X by it: get on. Hold X while riding (slowed right down): get off.
//  - Riding: left stick up / down is the throttle (down brakes, then
//    reverses), left / right steers (tighter at low speed); the camera
//    turns with it and you can still look round. No shooting from the
//    saddle (the gun's slung): get off to fight.
//  - Off the pathways the undergrowth slows it hard; trunks and rocks stop
//    it dead (a bump, the speed lost); ridden into the dead at speed it
//    knocks them down and hurts them, and slows.
//  - It's loud: every so often while the engine runs, the dead within
//    earshot come; and the witch is faster while Tom's on it (Game sets
//    her speedScale).
// Where it's left is saved; Tom is never saved riding.
//  - Session 16 (Aaron): its own headlamp, to see further ahead. On as Tom
//    gets on in the dark (and when night falls while he rides, unless he's
//    switched it off), off as he gets off; the 'headlamp' button (D-pad
//    right) toggles it while riding.
//  - Session 16 (Aaron): a witch's snare ridden over wraps round the front
//    wheel (Witch's Traps hand it here): it stops dead and won't drive. Tom
//    gets off (his legs are free) and taps X by it to free the wheel.
//
// Events: 'quad:mounted', 'quad:dismounted', 'quad:wheelSnared',
// 'trap:freed' (the wheel's snare torn off).

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { resolveCircles, nearestHit } from './collision.js';
import { HoldAction } from '../player/HoldAction.js';
import { frameToWorld, frameYaw } from './clearingFrame.js';
import { DEBUG } from '../debug/DebugMenu.js';

export class Quad {
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.qc = cfg.quad;
    this.bus = bus;
  }

  // ctx: { scene, ground, colliders, player, combat, frame (the gas
  // station's), notify(text) }.
  init(ctx) {
    Object.assign(this, ctx);
    this.enemies = ctx.combat.enemies;
    this.hold = new HoldAction(this.cfg.station.hold.releaseDrain);
    this.hold.init();
    this.hud = { prompt: '', progress: 0 };
    this.nearby = [];
    this.daylight = 1;
    this.device = 'gamepad';
    this.lampOn = false;
    this.lampTouched = false; // switched by hand this ride (night falling leaves it alone then)
    this.wheelSnare = null; // the witch's snare round the front wheel, or null
    this.mash = 0; // 0..1 toward freeing it
    this.buildMesh();
    this.buildHeadlamp();
    this.home = this.parkedSpot();
    this.reset();
    this.unsubscribers = [
      this.bus.on('player:respawned', () => this.reset()),
      this.bus.on('player:hurt', () => this.hold.interrupt()),
    ];
  }

  // Round 2 (Aaron: "as a forest ranger, Tom should have it from the very beginning"): in its bay in the
  // station's garage (homeSpot: { x, z, heading }), nose out. (Before: behind the gas station.)
  parkedSpot() {
    if (this.homeSpot) return { x: this.homeSpot.x, z: this.homeSpot.z, heading: this.homeSpot.heading };
    const s = this.qc.parked;
    if (!this.frame) return { x: 0, z: 0, heading: 0 };
    const w = frameToWorld(this.frame, s.x, s.z);
    // heading: the player's yaw convention (ahead is (-sin, -cos)); data yaw as the frame's.
    const yaw = frameYaw(this.frame, s.yaw);
    return { x: w.x, z: w.z, heading: Math.atan2(-Math.sin(yaw), -Math.cos(yaw)) };
  }

  reset() {
    if (this.wheelSnare) this.freeWheel(false);
    this.riding = false;
    this.setLamp(false);
    if (this.player?.riding === this) this.player.riding = null;
    this.speed = 0;
    this.place(this.home.x, this.home.z, this.home.heading);
    this.noiseTimer = 0;
    this.combat?.sfx?.engine?.(false);
  }

  // Leave it at (x, z) facing heading, solid.
  place(x, z, heading) {
    this.x = x;
    this.z = z;
    this.heading = heading;
    this.y = this.ground.heightAt(x, z);
    this.park();
    this.pose(0);
  }

  // Solid while parked: a fresh collider where it stands (the grid can't move one).
  park() {
    if (this.collider) this.collider.off = true;
    this.collider = { x: this.x, z: this.z, r: this.qc.parkedRadius, top: this.y + 1.2 };
    this.colliders.insert(this.collider);
  }

  // ---- the model --------------------------------------------------------------------------------

  buildMesh() {
    const k = this.qc.look;
    const parts = new Map();
    const add = (geo, color, x, y, z, rx = 0, rz = 0) => {
      let g = geo.index ? geo.toNonIndexed() : geo;
      if (g !== geo) geo.dispose();
      g.deleteAttribute('uv');
      if (rx) g.rotateX(rx);
      if (rz) g.rotateZ(rz);
      g.translate(x, y, z);
      if (!parts.has(color)) parts.set(color, []);
      parts.get(color).push(g);
    };
    const box = (w, h, d, x, y, z, color, rx = 0, rz = 0) => add(new THREE.BoxGeometry(w, h, d), color, x, y, z, rx, rz);
    // Facing -z (as the player looks at yaw 0): the front is at -z.
    const W = this.qc.wheel;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      add(new THREE.CylinderGeometry(W.radius, W.radius, W.width, 14), k.tyre, sx * 0.58, W.radius, sz * 0.66, 0, Math.PI / 2);
      add(new THREE.CylinderGeometry(W.radius * 0.5, W.radius * 0.5, W.width + 0.02, 10), k.hub, sx * 0.58, W.radius, sz * 0.66, 0, Math.PI / 2);
    }
    box(0.7, 0.28, 1.5, 0, 0.5, 0, k.frame); // the frame and engine
    box(1.05, 0.12, 0.62, 0, 0.72, -0.62, k.body); // front fenders
    box(1.05, 0.12, 0.62, 0, 0.72, 0.62, k.body); // rear fenders
    box(0.58, 0.3, 0.7, 0, 0.78, -0.1, k.body); // the tank
    box(0.42, 0.14, 0.7, 0, 0.92, 0.32, k.seat); // the seat
    box(0.9, 0.04, 0.4, 0, 0.86, -0.82, k.rack); // front rack
    box(0.9, 0.04, 0.42, 0, 0.86, 0.85, k.rack); // rear rack
    box(0.06, 0.42, 0.06, 0, 0.96, -0.5, k.metal, -0.35); // the steering column
    box(0.78, 0.04, 0.04, 0, 1.17, -0.58, k.metal); // the handlebars
    box(0.1, 0.06, 0.06, -0.39, 1.17, -0.58, k.grip);
    box(0.1, 0.06, 0.06, 0.39, 1.17, -0.58, k.grip);
    box(0.24, 0.12, 0.06, 0, 0.82, -0.98, k.lamp); // the headlamp
    box(0.3, 0.22, 0.22, 0, 1.0, 0.92, k.rack); // a fuel can on the rear rack
    this.mesh = new THREE.Group();
    this.mesh.name = 'quad';
    for (const [color, geos] of parts) {
      const mesh = new THREE.Mesh(mergeGeometries(geos), new THREE.MeshLambertMaterial({ color }));
      geos.forEach((g) => g.dispose());
      if (color === k.lamp) this.lampMesh = mesh; // its lens glows while the headlamp's on
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.mesh.add(mesh);
    }
    this.scene.add(this.mesh);
  }

  // The headlamp: a spotlight on the front of the quad, aimed ahead and a
  // little down. Always in the scene (switching a light's visibility makes
  // three.js rebuild its shaders: a hitch), dark at intensity 0 when off.
  buildHeadlamp() {
    const h = this.qc.headlamp;
    this.lamp = new THREE.SpotLight(h.color, 0, h.distance, (h.angle * Math.PI) / 180, h.penumbra, h.decay);
    this.lamp.name = 'quad headlamp';
    this.lamp.castShadow = false;
    this.lamp.position.set(0, h.y, h.front);
    this.lamp.target.position.set(0, h.y - h.aimDrop, h.front - h.aimDistance);
    this.mesh.add(this.lamp, this.lamp.target);
  }

  setLamp(on) {
    this.lampOn = Boolean(on);
    if (this.lamp) this.lamp.intensity = this.lampOn ? this.qc.headlamp.intensity * (this.glare ?? 1) : 0;
    this.lampMesh?.material.emissive.setHex(this.lampOn ? this.qc.headlamp.lens : 0x000000);
  }

  // Sit it on the ground: pitched and rolled to the slope under its wheels.
  pose(dt) {
    const g = this.ground;
    const ax = -Math.sin(this.heading);
    const az = -Math.cos(this.heading);
    const rx = Math.cos(this.heading);
    const rz = -Math.sin(this.heading);
    const L = 0.66;
    const front = g.heightAt(this.x + ax * L, this.z + az * L);
    const back = g.heightAt(this.x - ax * L, this.z - az * L);
    const right = g.heightAt(this.x + rx * 0.58, this.z + rz * 0.58);
    const left = g.heightAt(this.x - rx * 0.58, this.z - rz * 0.58);
    this.y = (front + back + left + right) / 4;
    const pitch = Math.atan2(front - back, 2 * L);
    const roll = Math.atan2(right - left, 1.16);
    this.mesh.position.set(this.x, this.y, this.z);
    // Engine shudder while it's running.
    const shudder = this.riding ? Math.sin(performance.now() * 0.06) * 0.004 * (1 + Math.abs(this.speed) * 0.1) : 0;
    this.mesh.rotation.set(pitch + shudder, this.heading, roll, 'YXZ');
  }

  // ---- getting on and off ---------------------------------------------------------------------------

  // playing: the world runs. canInteract: no other prompt first, no menu.
  // daylight: 0 (night) .. 1 (day), for the headlamp.
  // Build queue item 4: taken (the greys have it): no model, nothing solid, no prompt, off the maps.
  setGone(gone) {
    this.gone = Boolean(gone);
    if (this.gone && this.riding) this.eject();
    this.mesh.visible = !this.gone;
    if (this.collider) this.collider.off = this.gone;
    if (this.gone) this.hud.prompt = '';
  }

  update(dt, input, playing, canInteract, daylight = 1) {
    this.daylight = daylight;
    this.device = input.activeDevice;
    if (this.gone) {
      this.hud.prompt = '';
      this.hud.progress = 0;
      return;
    }
    if (!playing) {
      this.hud.prompt = '';
      if (!this.riding) this.combat.sfx?.engine?.(false);
      return;
    }
    const X = input.activeDevice === 'gamepad' ? 'X' : 'E';
    let offer = null;
    let freeing = false;
    if (this.riding) {
      this.updateLamp(input);
      if (this.lampOn) this.updateLampGlare(dt);
      const off = this.wheelSnare ? `Snare round the front wheel! Hold ${X}: get off` : `Hold ${X}: get off the quad`;
      if (Math.abs(this.speed) < this.qc.dismountSpeed) offer = { key: 'quad-off', prompt: off, seconds: this.qc.dismountSeconds, act: () => this.dismount() };
    } else if (canInteract && !this.player.platform) {
      const p = this.player.position;
      const d = Math.hypot(p.x - this.x, p.z - this.z);
      if (this.wheelSnare) freeing = d < this.qc.snare.range;
      else if (d < this.qc.mountRange) offer = { key: 'quad-on', prompt: `Hold ${X}: ride the quad bike`, seconds: this.qc.mountSeconds, act: () => this.mount() };
    }
    // The wheel's snare: tap X by it to tear it off; the effort drains if he stops.
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
    if (this.riding) this.updateNoise(dt);
  }

  // Session 16 (Aaron): the headlamp glared off trees, cars and rocks close
  // up. As the torch does (player/Flashlight.updateGlare), a few rays from
  // the lamp find the nearest surfaces it's hitting; brighter than a
  // head-on surface at glare.fullDistance, it's dimmed to that.
  updateLampGlare(dt) {
    const h = this.qc.headlamp;
    const g = h.glare;
    const ax = -Math.sin(this.heading);
    const az = -Math.cos(this.heading);
    const o = (this.glareOrigin ??= { x: 0, y: 0, z: 0 });
    o.x = this.x + ax * -h.front;
    o.z = this.z + az * -h.front;
    o.y = this.y + h.y;
    const drop = -h.aimDrop / h.aimDistance;
    const near = this.colliders.query(o.x, o.z, g.fullDistance + 2, this.nearby);
    const hit = (this.glareHit ??= { distance: 0, facing: 0 });
    const dir = (this.glareDir ??= { x: 0, y: 0, z: 0 });
    const rx = Math.cos(this.heading);
    const rz = -Math.sin(this.heading);
    let strongest = 0;
    for (const [side, up] of [[0, 0], [-g.spread, 0], [g.spread, 0], [0, g.spread], [0, -g.spread]]) {
      dir.x = ax + rx * side;
      dir.z = az + rz * side;
      dir.y = drop + up;
      const len = Math.hypot(dir.x, dir.y, dir.z);
      dir.x /= len;
      dir.y /= len;
      dir.z /= len;
      nearestHit(o, dir, near, g.fullDistance, hit, this.ground, 0.5);
      const strength = hit.facing / Math.pow(Math.max(hit.distance, 0.3), h.decay);
      if (strength > strongest) strongest = strength;
    }
    const limit = 1 / Math.pow(g.fullDistance, h.decay);
    const target = strongest > limit ? Math.max(g.minFactor, limit / strongest) : 1;
    this.glare = (this.glare ?? 1) + (target - (this.glare ?? 1)) * (1 - Math.exp(-g.response * dt));
    if (this.lamp) this.lamp.intensity = h.intensity * this.glare;
  }

  // Riding: the button toggles the headlamp; night falling puts it on
  // (unless he's switched it by hand this ride).
  updateLamp(input) {
    if (input.wasPressed('headlamp')) {
      this.lampTouched = true;
      this.setLamp(!this.lampOn);
    } else if (!this.lampTouched && !this.lampOn && this.daylight < this.qc.headlamp.autoBelow) {
      this.setLamp(true);
    }
  }

  // ---- the witch's snare round the wheel ------------------------------------------------------------

  // Called by the witch's Traps when the quad rides over a snare. Returns
  // true if the wheel took it (Tom's legs stay free).
  snareWheel(trap) {
    if (!this.riding || this.wheelSnare) return false;
    this.wheelSnare = trap;
    this.mash = 0;
    trap.held = this;
    // Drawn pulled tight round the front left wheel.
    const ax = -Math.sin(this.heading);
    const az = -Math.cos(this.heading);
    const rx = Math.cos(this.heading);
    const rz = -Math.sin(this.heading);
    trap.x = this.x + ax * 0.66 - rx * 0.58;
    trap.z = this.z + az * 0.66 - rz * 0.58;
    trap.y = this.ground.heightAt(trap.x, trap.z);
    this.speed = 0;
    this.player.shake(this.qc.snare.shake);
    this.combat.sfx?.play('impact', this);
    const pad = this.device !== 'keyboardMouse';
    this.combat.hud?.pickup?.(`A snare's wrapped round the front wheel! Get off and tap ${pad ? 'X' : 'E'} to free it.`);
    this.bus.emit('quad:wheelSnared', { trap });
    return true;
  }

  // The snare's off the wheel. loud: the snap and the event (not on a reset).
  freeWheel(loud = true) {
    const trap = this.wheelSnare;
    this.wheelSnare = null;
    this.mash = 0;
    if (!trap) return;
    trap.held = null;
    trap.active = false;
    if (loud) this.bus.emit('trap:freed', { trap, wheel: true });
  }

  mount() {
    if (this.riding) return;
    this.riding = true;
    this.speed = 0;
    if (this.collider) this.collider.off = true;
    const p = this.player;
    p.riding = this;
    p.crouched = false;
    p.sprinting = false;
    p.yaw = this.heading;
    p.position.set(this.x, this.y, this.z);
    this.combat.sfx?.play('carDoor', this);
    this.combat.sfx?.engine?.(true, 0);
    // The headlamp: on in the dark, off by day; the button toggles it.
    this.lampTouched = false;
    this.setLamp(this.daylight < this.qc.headlamp.autoBelow);
    const pad = this.device !== 'keyboardMouse';
    this.combat.hud?.pickup?.(pad ? 'On the quad: left stick to ride, D-pad right: headlamp, hold X (slow) to get off. No shooting from the saddle.' : 'On the quad: WASD to ride, H: headlamp, hold E (slow) to get off. No shooting from the saddle.');
    this.bus.emit('quad:mounted');
  }

  dismount() {
    if (!this.riding) return;
    this.riding = false;
    this.speed = 0;
    const p = this.player;
    p.riding = null;
    // Step off to the left, or the right if that's blocked.
    const rx = Math.cos(this.heading);
    const rz = -Math.sin(this.heading);
    let spot = null;
    for (const side of [-1, 1]) {
      const c = { x: this.x + rx * side * this.qc.stepOff, z: this.z + rz * side * this.qc.stepOff };
      const before = { ...c };
      resolveCircles(c, this.cfg.player.radius, this.colliders.query(c.x, c.z, this.cfg.player.radius, this.nearby), true);
      if (Math.hypot(c.x - before.x, c.z - before.z) < 0.05) {
        spot = c;
        break;
      }
      spot ??= c;
    }
    p.teleport(spot.x, spot.z, p.yaw);
    this.park();
    this.setLamp(false);
    this.combat.sfx?.engine?.(false);
    this.bus.emit('quad:dismounted');
  }

  // Thrown off (a teleport, a death, a cutscene that moves Tom): left where it is.
  eject() {
    if (!this.riding) return;
    this.riding = false;
    this.speed = 0;
    this.park();
    this.setLamp(false);
    this.combat.sfx?.engine?.(false);
  }

  // ---- riding ------------------------------------------------------------------------------------------

  // Called by the Player while Tom's riding (his own walking is skipped):
  // the stick drives, the quad moves and carries him.
  drive(dt, input, player) {
    const q = this.qc;
    // Snared round the wheel (or Tom's own legs): it won't go.
    const stuck = player.rooted || this.wheelSnare;
    if (this.wheelSnare) this.speed = 0;
    const move = stuck ? { x: 0, y: 0 } : input.getMove();
    const throttle = move.y;
    const steer = move.x;
    // Undergrowth off the pathways holds it back hard.
    const brush = this.ground.undergrowthAt(this.x, this.z);
    const top = q.maxSpeed * (1 + (q.undergrowthMultiplier - 1) * brush);
    let target;
    if (throttle > 0.1) target = throttle * top;
    else if (throttle < -0.1) target = this.speed > 0.4 ? 0 : throttle * q.reverseSpeed;
    else target = 0;
    // Session 21 (Aaron): a cutscene starting brakes it to a stop (Game sets halting), so it doesn't roll on into the dead.
    if (this.halting) target = 0;
    const braking = (throttle < -0.1 && this.speed > 0.4) || (target === 0 && this.speed !== 0);
    const rate = this.halting ? q.brake : braking ? (throttle < -0.1 ? q.brake : q.coast) : q.acceleration;
    this.speed += Math.max(-rate * dt, Math.min(rate * dt, target - this.speed));
    // Steering: tighter slow, gentler fast; backwards it turns the other way.
    const grip = Math.min(1, Math.abs(this.speed) / q.steerFullAt);
    const turn = -steer * q.steerRate * grip * (1 - q.steerFastLoss * Math.min(1, Math.abs(this.speed) / q.maxSpeed)) * Math.sign(this.speed) * dt;
    this.heading += turn;
    player.yaw += turn; // the view turns with it
    // Move, then out of whatever it ran into.
    const ax = -Math.sin(this.heading);
    const az = -Math.cos(this.heading);
    const want = { x: this.x + ax * this.speed * dt, z: this.z + az * this.speed * dt };
    const pos = { ...want };
    resolveCircles(pos, q.radius, this.colliders.query(pos.x, pos.z, q.radius, this.nearby), true);
    this.ground.clamp(pos);
    const pushed = Math.hypot(pos.x - want.x, pos.z - want.z);
    if (pushed > Math.abs(this.speed) * dt * 0.5 && Math.abs(this.speed) > q.bumpSpeed) {
      // A trunk or a wall: a jolt, and most of the speed gone.
      player.shake(Math.min(1, Math.abs(this.speed) / q.maxSpeed) * q.bumpShake);
      this.combat.sfx?.play('impact', pos);
      this.speed *= q.bumpKeep;
    }
    this.x = pos.x;
    this.z = pos.z;
    this.ram(dt, player);
    this.pose(dt);
    // Tom sits on it.
    // His eye q.eyeHeight above the ground, over the seat (seatBack behind its middle).
    player.position.set(this.x - ax * q.seatBack, this.y + q.eyeHeight - player.eyeHeight, this.z - az * q.seatBack);
    player.velocity.x = ax * this.speed;
    player.velocity.z = az * this.speed;
    player.onGround = true;
    player.verticalSpeed = 0;
    this.combat.sfx?.engine?.(true, Math.min(1, Math.abs(this.speed) / q.maxSpeed), Math.abs(throttle));
  }

  // Into the dead at speed: they go down hurt, and it loses some speed.
  ram(dt, player) {
    const q = this.qc;
    if (Math.abs(this.speed) < q.ram.minSpeed) return;
    const ax = -Math.sin(this.heading) * Math.sign(this.speed);
    const az = -Math.cos(this.heading) * Math.sign(this.speed);
    const fx = this.x + ax * 0.9;
    const fz = this.z + az * 0.9;
    for (const z of this.enemies.living) {
      if (z.rammedUntil > performance.now()) continue;
      if (Math.hypot(z.x - fx, z.z - fz) > q.ram.reach + z.radius) continue;
      const k = Math.abs(this.speed) / q.maxSpeed;
      z.rammedUntil = performance.now() + 600;
      this.enemies.damage(z, q.ram.damage * k * (z.kind === 'mutant' ? q.ram.mutantScale : 1), 'body', { stagger: q.ram.stagger, knockback: q.ram.knockback * k }, { x: z.x, y: z.y + 1, z: z.z }, { x: this.x, z: this.z });
      this.speed *= z.kind === 'mutant' ? q.ram.mutantKeep : q.ram.keep;
      player.shake(q.ram.shake);
      this.combat.sfx?.play('fenceHit', z);
    }
  }

  // The engine carries: the dead within earshot come, every so often.
  updateNoise(dt) {
    this.noiseTimer -= dt;
    if (this.noiseTimer > 0) return;
    this.noiseTimer = this.qc.noise.every;
    const r = this.qc.noise.idle + (this.qc.noise.full - this.qc.noise.idle) * Math.min(1, Math.abs(this.speed) / this.qc.maxSpeed);
    this.enemies.alert(this.x, this.z, r);
  }

  // ---- saving and debug -----------------------------------------------------------------------------

  saveState() {
    return { x: this.x, z: this.z, heading: this.heading };
  }

  loadState(d) {
    if (!d || !Number.isFinite(d.x)) return;
    this.eject();
    if (this.player?.riding === this) this.player.riding = null;
    this.place(d.x, d.z, d.heading ?? 0);
  }

  addDebugItems(menu) {
    const cat = menu.category(DEBUG.firstDay);
    const bring = () => {
      if (this.riding) return;
      const p = this.player;
      const ax = -Math.sin(p.yaw);
      const az = -Math.cos(p.yaw);
      this.place(p.position.x + ax * 3, p.position.z + az * 3, p.yaw);
      this.notify?.('The quad bike is in front of you');
    };
    cat.addItem('Quad bike: bring it here', bring);
    menu.category(DEBUG.teleport).addItem('Teleport the quad bike to me', bring); // Session 18 (Aaron): easy to find
    cat.addItem('Quad bike: back behind the gas station', () => {
      if (this.riding) this.dismount();
      this.place(this.home.x, this.home.z, this.home.heading);
      this.notify?.(this.homeSpot ? 'The quad bike is back in the garage' : 'The quad bike is back behind the gas station');
    });
  }

  overlayLine() {
    return `quad ${this.riding ? `riding ${this.speed.toFixed(1)} m/s` : 'parked'}${this.lampOn ? ' lamp' : ''}${this.wheelSnare ? ' SNARED' : ''}`;
  }

  dispose() {
    for (const off of this.unsubscribers ?? []) off();
    this.combat?.sfx?.engine?.(false);
    this.lamp?.dispose();
    this.mesh?.removeFromParent();
    this.mesh?.traverse((o) => {
      o.geometry?.dispose();
      o.material?.dispose();
    });
  }
}
