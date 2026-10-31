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
//
// Events: 'quad:mounted', 'quad:dismounted'.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { resolveCircles } from './collision.js';
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
    this.buildMesh();
    this.home = this.parkedSpot();
    this.reset();
    this.unsubscribers = [
      this.bus.on('player:respawned', () => this.reset()),
      this.bus.on('player:hurt', () => this.hold.interrupt()),
    ];
  }

  // Behind the gas station, by the stockroom's back door, nose to the trail.
  parkedSpot() {
    const s = this.qc.parked;
    if (!this.frame) return { x: 0, z: 0, heading: 0 };
    const w = frameToWorld(this.frame, s.x, s.z);
    // heading: the player's yaw convention (ahead is (-sin, -cos)); data yaw as the frame's.
    const yaw = frameYaw(this.frame, s.yaw);
    return { x: w.x, z: w.z, heading: Math.atan2(-Math.sin(yaw), -Math.cos(yaw)) };
  }

  reset() {
    this.riding = false;
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
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.mesh.add(mesh);
    }
    this.scene.add(this.mesh);
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
  update(dt, input, playing, canInteract) {
    if (!playing) {
      this.hud.prompt = '';
      if (!this.riding) this.combat.sfx?.engine?.(false);
      return;
    }
    const X = input.activeDevice === 'gamepad' ? 'X' : 'E';
    let offer = null;
    if (this.riding) {
      if (Math.abs(this.speed) < this.qc.dismountSpeed) offer = { key: 'quad-off', prompt: `Hold ${X}: get off the quad`, seconds: this.qc.dismountSeconds, act: () => this.dismount() };
    } else if (canInteract && !this.player.platform) {
      const p = this.player.position;
      if (Math.hypot(p.x - this.x, p.z - this.z) < this.qc.mountRange) offer = { key: 'quad-on', prompt: `Hold ${X}: ride the quad bike`, seconds: this.qc.mountSeconds, act: () => this.mount() };
    }
    const done = this.hold.update(dt, offer?.key ?? null, input.isDown('interact'), offer?.seconds ?? 1);
    if (done && offer) offer.act();
    this.hud.prompt = offer ? offer.prompt : '';
    this.hud.progress = this.hold.key !== null ? this.hold.progress : 0;
    if (this.riding) this.updateNoise(dt);
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
    this.combat.hud?.pickup?.('On the quad: left stick to ride, hold X (slow) to get off. No shooting from the saddle.');
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
    this.combat.sfx?.engine?.(false);
    this.bus.emit('quad:dismounted');
  }

  // Thrown off (a teleport, a death, a cutscene that moves Tom): left where it is.
  eject() {
    if (!this.riding) return;
    this.riding = false;
    this.speed = 0;
    this.park();
    this.combat.sfx?.engine?.(false);
  }

  // ---- riding ------------------------------------------------------------------------------------------

  // Called by the Player while Tom's riding (his own walking is skipped):
  // the stick drives, the quad moves and carries him.
  drive(dt, input, player) {
    const q = this.qc;
    const move = player.rooted ? { x: 0, y: 0 } : input.getMove();
    const throttle = move.y;
    const steer = move.x;
    // Undergrowth off the pathways holds it back hard.
    const brush = this.ground.undergrowthAt(this.x, this.z);
    const top = q.maxSpeed * (1 + (q.undergrowthMultiplier - 1) * brush);
    let target;
    if (throttle > 0.1) target = throttle * top;
    else if (throttle < -0.1) target = this.speed > 0.4 ? 0 : throttle * q.reverseSpeed;
    else target = 0;
    const braking = (throttle < -0.1 && this.speed > 0.4) || (target === 0 && this.speed !== 0);
    const rate = braking ? (throttle < -0.1 ? q.brake : q.coast) : q.acceleration;
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
    cat.addItem('Quad bike: bring it here', () => {
      if (this.riding) return;
      const p = this.player;
      const ax = -Math.sin(p.yaw);
      const az = -Math.cos(p.yaw);
      this.place(p.position.x + ax * 3, p.position.z + az * 3, p.yaw);
      this.notify?.('The quad bike is in front of you');
    });
    cat.addItem('Quad bike: back behind the gas station', () => {
      if (this.riding) this.dismount();
      this.place(this.home.x, this.home.z, this.home.heading);
      this.notify?.('The quad bike is back behind the gas station');
    });
  }

  overlayLine() {
    return `quad ${this.riding ? `riding ${this.speed.toFixed(1)} m/s` : 'parked'}`;
  }

  dispose() {
    for (const off of this.unsubscribers ?? []) off();
    this.combat?.sfx?.engine?.(false);
    this.mesh?.removeFromParent();
    this.mesh?.traverse((o) => {
      o.geometry?.dispose();
      o.material?.dispose();
    });
  }
}
