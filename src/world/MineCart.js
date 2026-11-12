// The turret cart (Session 30; DESIGN.md "Abandoned mineshaft": "a mine cart
// with an old mounted gun, like the ute's turret. It rattles down the rails
// through the tunnels while Tom shoots"). A ride on rails: it runs by itself
// along the mine's track (world/mineTrack.js), braking to a halt where the
// way's shut (the beat says where: encounters/MineRide.js), and Tom works
// the gun on its pedestal.
//
//  - The gun's the ute's, older: RT fires, LT steadies it; it never runs
//    dry but it overheats (the ute's stepHeat). It swings all the way round
//    (what's behind the cart matters as much as what's ahead).
//  - A shot stops at the tunnel's walls (the track's rayDistance: the mine
//    is a pocket far under the map, with no ground field and no colliders).
//  - The dead in its way at speed are knocked down the track (the beat's).
//
// The model (render/mineModel.js buildCart) hangs in the mine's group, so
// its place is in mine space; `offset` is the mine's place in the world.
//
// Events: 'mine:cartStopped' { at }, 'mine:cartMoving'.

import * as THREE from 'three';
import { stepHeat } from './Ute.js';
import { rayEnemiesAll, falloff, spreadDirection, partMultiplier, helmetPart } from '../combat/hitscan.js';
import { pointAt, speedAt, rayDistance } from './mineTrack.js';

const DEG = Math.PI / 180;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class MineCart {
  // cfg: the whole config (config.mineshaft.ride inside).
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.rc = cfg.mineshaft.ride;
    this.bus = bus;
    this.hud = { prompt: '', progress: 0 };
    this.riding = false;
    this.s = this.rc.start;
    this.speed = 0;
    this.stopAt = null; // { id, s }: where it has to halt next
    this.moving = false;
    this.heat = 0;
    this.locked = false;
    this.spread = this.rc.gun.spread;
    this.recoil = 0;
    this.shotTimer = 0;
    this.sinceShot = 10;
    this.rounds = 0;
    this.flashTimer = 0;
    this.clack = 0;
    this.rayHits = [];
    this.v = { eye: new THREE.Vector3(), fwd: new THREE.Vector3(), right: new THREE.Vector3(), up: new THREE.Vector3(), dir: { x: 0, y: 0, z: 0 }, muzzle: new THREE.Vector3(), to: new THREE.Vector3(), pivot: new THREE.Vector3() };
    this.p = {};
  }

  // ctx: { model (buildCart's), track, offset { x, y, z } (the mine in the world), player, combat, vhud, rng }.
  init(ctx) {
    Object.assign(this, ctx);
    this.sfx = this.combat?.sfx;
    this.rng ??= { next: Math.random };
    this.pose();
  }

  // ---- where it is ---------------------------------------------------------------------------

  // Put at s, stopped.
  place(s) {
    this.s = s;
    this.speed = 0;
    this.moving = false;
    this.stopAt = null;
    this.pose();
  }

  // The cart's middle in the world: { x, y, z, yaw }.
  worldPoint(out = {}) {
    const p = pointAt(this.track, this.s, this.p);
    out.x = p.x + this.offset.x;
    out.y = p.y + this.offset.y;
    out.z = p.z + this.offset.z;
    out.yaw = p.yaw;
    return out;
  }

  pose() {
    if (!this.model || !this.track) return;
    const p = pointAt(this.track, this.s, this.p);
    const r = this.model.root;
    // A little rattle at speed.
    const j = this.speed > 0.2 ? Math.sin(this.s * 4.1) * 0.006 * Math.min(1, this.speed / 5) : 0;
    r.position.set(p.x, p.y + j, p.z);
    r.rotation.set(p.pitch, p.yaw, j * 1.5, 'YXZ');
    this.heading = p.yaw;
  }

  // Off toward the next halt.
  go(stop) {
    this.stopAt = stop;
    if (!this.moving) {
      this.moving = true;
      this.sfx?.play('cartStart', this.worldPoint());
      this.bus.emit('mine:cartMoving');
    }
  }

  // ---- riding --------------------------------------------------------------------------------

  mount() {
    if (this.riding || this.player.riding) return;
    this.riding = true;
    const p = this.player;
    p.riding = this;
    p.crouched = false;
    p.sprinting = false;
    // Looking down the rails.
    p.yaw = this.heading + Math.PI;
    p.pitch = -0.04;
    this.sfx?.play('climb');
    const pad = this.device !== 'keyboardMouse';
    this.combat.hud?.pickup?.(pad ? 'On the gun: RT fires, LT steadies it. It overheats: let it cool. It swings right round.' : 'On the gun: left mouse fires, right mouse steadies it. It overheats: let it cool. It swings right round.');
    this.carry(p);
  }

  // Off it (the beat puts Tom down where it wants him).
  leave() {
    this.riding = false;
    if (this.player?.riding === this) this.player.riding = null;
    if (this.player) this.player.fovMultiplier = 1;
    this.model.flash.visible = false;
    this.vhud?.hide(this);
  }

  eject() {
    if (this.riding) this.leave();
  }

  strikeScale() {
    return this.rc.strikeScale;
  }

  // Tom's feet, in the tub.
  carry(player) {
    const w = this.worldPoint(this.w ?? (this.w = {}));
    player.position.set(w.x, w.y + this.model.floor, w.z);
    player.velocity.x = 0;
    player.velocity.z = 0;
    player.onGround = true;
  }

  // Called by the Player while Tom's aboard (his own walking is skipped).
  drive(dt, input, player) {
    this.device = input.activeDevice;
    const before = this.heading;
    if (dt > 0 && !this.halting) this.roll(dt);
    this.pose();
    player.yaw += this.heading - before; // his aim turns with the cart round a bend
    this.carry(player);
    const g = this.rc.gun;
    player.pitch = clamp(player.pitch, g.pitchMin, g.pitchMax);
    this.gunYaw = player.yaw;
    this.gunPitch = player.pitch;
    if (dt > 0) this.updateGun(dt, input);
    this.aimGun();
    this.updateFlash(dt);
    this.updateHud(input);
  }

  // Standing empty: the barrel cools.
  idle(dt) {
    if (this.riding) return;
    if (this.heat > 0 || this.locked) {
      const h = stepHeat(this.heat, this.locked, 0, false, 10, dt, this.rc.gun);
      this.heat = h.heat;
      this.locked = h.locked;
      this.glowBarrel();
    }
  }

  roll(dt) {
    if (!this.moving) return;
    const stop = this.stopAt?.s ?? this.rc.end;
    const target = speedAt(this.rc, this.s, stop);
    this.speed = target < this.speed ? target : Math.min(target, this.speed + this.rc.accel * dt);
    const before = this.s;
    this.s = Math.min(stop, this.s + this.speed * dt);
    // The rail joints: a clack each, a shake with it.
    this.clack += this.s - before;
    if (this.clack >= this.rc.clackEvery) {
      this.clack = 0;
      this.sfx?.play('railClack', this.worldPoint());
      this.player.shake?.(0.05 + this.speed * 0.012);
    }
    if (this.s >= stop - 0.02) {
      this.s = stop;
      this.speed = 0;
      this.moving = false;
      this.sfx?.play('cartBrake', this.worldPoint());
      this.bus.emit('mine:cartStopped', { at: this.stopAt?.id ?? 'end' });
    }
  }

  // ---- the view ------------------------------------------------------------------------------

  // The gun's pivot in the world.
  pivotWorld(out) {
    const p = pointAt(this.track, this.s, this.p);
    const pv = this.model.pivot;
    out.set(p.x + Math.sin(p.yaw) * pv.z + this.offset.x, p.y + pv.y - Math.sin(p.pitch) * pv.z + this.offset.y, p.z + Math.cos(p.yaw) * pv.z + this.offset.z);
    return out;
  }

  // Called by the Player after its own camera: his eye behind the gun.
  placeCamera(player) {
    if (!this.riding) return;
    const cam = player.camera;
    const pv = this.pivotWorld(this.v.pivot);
    const e = this.rc.eye;
    const yaw = this.gunYaw ?? player.yaw;
    cam.position.set(pv.x + Math.sin(yaw) * e.back, pv.y + e.up, pv.z + Math.cos(yaw) * e.back);
    const shake = player.shakeAmount ?? 0;
    const sx = Math.sin((player.shakeTime ?? 0) * 47) * shake * 0.02;
    const sy = Math.sin((player.shakeTime ?? 0) * 61 + 1.3) * shake * 0.02;
    cam.rotation.set((this.gunPitch ?? 0) + this.recoil + (player.recoilPitch ?? 0) + sy, yaw + sx, 0, 'YXZ');
    cam.updateMatrixWorld();
  }

  // The gun turned to his aim: its barrel (+z of the model) down his line of sight (the camera's -z).
  aimGun() {
    const m = this.model;
    m.yaw.rotation.y = (this.gunYaw ?? this.heading + Math.PI) + Math.PI - this.heading;
    m.pitch.rotation.x = -((this.gunPitch ?? 0) + this.recoil * 0.6);
  }

  // ---- the gun -------------------------------------------------------------------------------

  updateGun(dt, input) {
    const g = this.rc.gun;
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
    } else this.shotTimer = Math.max(0, this.shotTimer);
    this.sinceShot = shots > 0 ? 0 : this.sinceShot + dt;
    const wasLocked = this.locked;
    const h = stepHeat(this.heat, this.locked, shots, firing, this.sinceShot, dt, g);
    this.heat = h.heat;
    this.locked = h.locked;
    if (this.locked && !wasLocked) {
      this.sfx?.play('gunHot', this.worldPoint());
      this.combat.hud?.pickup?.('The gun has overheated! Let it cool.');
    }
    if (!this.locked && wasLocked) this.sfx?.play('gunCool', this.worldPoint());
    if (!firing) this.spread = Math.max(g.spread, this.spread - g.spreadSettle * dt);
    this.recoil -= this.recoil * Math.min(1, dt * 14);
    this.glowBarrel();
  }

  glowBarrel() {
    const k = Math.max(0, (this.heat - 0.35) / 0.65);
    // The gun's own material: a dull red, then orange (the sight's arc says the rest).
    this.model.gunMaterial?.emissive?.setRGB(0.3 * k * k, 0.07 * k * k, 0);
  }

  // One round: from his eye down the sights, a tracer from the muzzle.
  fireRound(aiming) {
    const g = this.rc.gun;
    const v = this.v;
    const cam = this.player.camera;
    v.eye.copy(cam.position);
    cam.getWorldDirection(v.fwd);
    v.right.set(1, 0, 0).applyQuaternion(cam.quaternion);
    v.up.set(0, 1, 0).applyQuaternion(cam.quaternion);
    const dir = spreadDirection(v.fwd, v.right, v.up, this.spread * (aiming ? g.aimSpread : 1) * DEG, this.rng, v.dir);
    const eye = v.eye;
    // The tunnel's walls, in mine space.
    const o = this.o ?? (this.o = { x: 0, y: 0, z: 0 });
    o.x = eye.x - this.offset.x;
    o.y = eye.y - this.offset.y;
    o.z = eye.z - this.offset.z;
    const blocked = rayDistance(this.track, o, dir, g.range, this.s);
    const targets = this.combat.weapons?.targets?.() ?? this.combat.enemies.living;
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
        const weapon = { id: 'cartGun', stagger: g.stagger, knockback: g.knockback, helmetPierce: true };
        const killed = this.combat.weapons?.applyHit ? this.combat.weapons.applyHit(hit.enemy, dmg, part, weapon, at, eye) : this.combat.enemies.damage(hit.enemy, dmg, part, weapon, at, eye);
        this.bus.emit('weapon:hit', { killed, part, melee: false, id: 'cartGun' });
        carried *= g.pierceKeep;
        end = hit.distance;
      }
    } else if (blocked < g.range) {
      this.bus.emit('weapon:impact', { x: eye.x + dir.x * blocked, y: eye.y + dir.y * blocked, z: eye.z + dir.z * blocked, damage: g.damage * falloff(blocked, fs, fe, fm), id: 'cartGun' });
    }
    this.model.root.updateMatrixWorld(true);
    this.model.muzzle.getWorldPosition(v.muzzle);
    this.rounds++;
    if (this.rounds % g.tracerEvery === 0 && end > eye.distanceTo(v.muzzle) + 0.5) {
      v.to.set(dir.x, dir.y, dir.z).multiplyScalar(Math.min(end, 90)).add(eye);
      this.combat.fx?.tracer?.(v.muzzle, v.to);
    }
    this.combat.fx?.muzzleFlash?.(v.muzzle);
    const f = this.model.flash;
    f.visible = true;
    f.rotation.z = Math.random() * Math.PI; // cosmetic only
    f.scale.setScalar(0.8 + Math.random() * 0.6);
    this.flashTimer = 0.045;
    this.sfx?.play('cartGun', this.worldPoint());
    this.recoil += g.kick * DEG;
    this.player.shake?.(g.shake);
    this.spread = Math.min(g.spreadMax, this.spread + g.spreadGrow);
  }

  updateFlash(dt) {
    if (this.flashTimer <= 0) return;
    this.flashTimer -= dt;
    if (this.flashTimer <= 0) this.model.flash.visible = false;
  }

  updateHud(input) {
    if (!this.vhud || !this.riding) return;
    const pad = input.activeDevice === 'gamepad';
    this.vhud.show(this, 'ute-gun', { heat: this.heat, locked: this.locked, spread: this.spread, aiming: input.isDown('aim'), hint: this.hint ?? (pad ? 'RT fire · LT steady' : 'Mouse fire · Right steady') });
  }

  overlayLine() {
    return `cart s ${this.s.toFixed(0)} ${this.speed.toFixed(1)} m/s${this.moving ? ` -> ${this.stopAt?.id ?? 'end'}` : ' stopped'} heat ${Math.round(this.heat * 100)}%${this.locked ? ' LOCKED' : ''}`;
  }

  dispose() {
    this.model?.dispose();
  }
}
