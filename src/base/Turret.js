// The automated turret at work (DESIGN.md "The automated turret"). With
// the player at home it really fires, only when it has a target: it picks
// a zombie (inside the fence first, then any clawing at the defences,
// then the nearest), swings round to it at a limited rate, and fires one
// round every `seconds` of its fire mode. Each round is a hit-scan ray
// that carves through a line of zombies (Aaron: "even more so than the
// rifle... make a bit of a spectacle of this"): a heavy tracer, a muzzle
// flash, impact blood and a loud report every zombie nearby hears.
// Needs power (fence charge) and rounds; StationState keeps both.
//
// Events: 'turret:fired' { kills }.

import * as THREE from 'three';
import { pickTarget, turnToward, angleBetween } from './turretMath.js';
import { rayBlockers, rayEnemiesAll, partMultiplier, spreadDirection } from '../combat/hitscan.js';
import { zoneOf } from './stationLayout.js';

const DEG = Math.PI / 180;

export class Turret {
  // ctx: { cfg (config), state (StationState), layout, enemies, colliders,
  // ground, fx (CombatFx), sfx, bus, rng }.
  constructor(ctx) {
    Object.assign(this, ctx);
    this.tc = ctx.cfg.station.turret;
  }

  init() {
    const pad = this.layout.turretPad;
    this.x = pad.x;
    this.z = pad.z;
    this.baseY = this.ground.heightAt(pad.x, pad.z);
    // Idle, it faces the gate, out over the fence (yaw: sin/cos like the
    // zombies, so 0 is south; Aaron's M5 test: at pi it faced the cabin).
    const gate = this.layout.gate.mid;
    this.idleYaw = Math.atan2(gate.x - pad.x, gate.z - pad.z);
    this.yaw = this.idleYaw;
    this.pitch = 0;
    this.idleTimer = 0;
    this.target = null;
    this.targetTimer = 0;
    this.fireTimer = 0;
    this.recoil = 0; // 0..1, for the renderer
    this.muzzle = new THREE.Vector3();
    this.dir = { x: 0, y: 0, z: 0 };
    this.aim = new THREE.Vector3();
    this.right = new THREE.Vector3();
    this.up = new THREE.Vector3();
    this.blockers = [];
    this.hits = [];
    this.end = new THREE.Vector3();
    this.barrel = new THREE.Vector3();
    this.status = 'not installed';
    this.canSee = (z) => this.lineOfSight(z);
    this.isInside = (z) => zoneOf(this.layout, z.x, z.z) > 0;
    this.isClawing = (z) => z.state === 'attack' && z.attackBarrier !== null;
  }

  get muzzleY() {
    return this.baseY + this.tc.muzzleHeight;
  }

  // Is there a clear shot from the muzzle to the zombie's chest?
  lineOfSight(z) {
    const m = this.muzzle.set(this.x, this.muzzleY, this.z);
    const tx = z.x - m.x;
    const ty = z.y + z.headBottom * 0.6 - m.y;
    const tz = z.z - m.z;
    const d = Math.hypot(tx, ty, tz);
    if (d < 1e-3) return true;
    this.dir.x = tx / d;
    this.dir.y = ty / d;
    this.dir.z = tz / d;
    this.colliders.query((m.x + z.x) / 2, (m.z + z.z) / 2, d / 2 + 1, this.blockers);
    return rayBlockers(m, this.dir, this.blockers, d, this.ground) >= d - 0.3;
  }

  update(dt) {
    const s = this.state;
    this.recoil = Math.max(0, this.recoil - dt * 6);
    this.fireTimer = Math.max(0, this.fireTimer - dt);
    if (!s.turret.installed) {
      this.status = s.turret.available ? 'not installed' : 'none';
      return;
    }
    if (!s.powered) {
      this.status = 'no power';
      this.target = null;
      return;
    }
    if (s.turret.rounds < 1) {
      this.status = 'no ammo';
      this.target = null;
      return;
    }
    this.targetTimer -= dt;
    if (this.targetTimer <= 0 || (this.target && !this.target.alive)) {
      this.targetTimer = this.tc.targetEvery;
      this.target = pickTarget(this, this.enemies.living, this.tc.range, this.canSee, this.isInside, this.isClawing);
    }
    const t = this.target;
    if (!t) {
      this.status = 'watching';
      this.returnToIdle(dt);
      return;
    }
    this.idleTimer = 0;
    this.status = 'firing';
    const want = Math.atan2(t.x - this.x, t.z - this.z);
    this.yaw = turnToward(this.yaw, want, this.tc.turnRate * DEG * dt);
    const flat = Math.hypot(t.x - this.x, t.z - this.z);
    this.pitch = Math.atan2(t.y + t.headBottom * 0.6 - this.muzzleY, flat);
    if (this.fireTimer > 0 || angleBetween(this.yaw, want) > this.tc.aimTolerance * DEG) return;
    this.fire(t);
  }

  // With nothing to shoot for a moment, swing back to face the gate.
  returnToIdle(dt) {
    this.idleTimer += dt;
    if (this.idleTimer < this.tc.idleDelay) return;
    this.yaw = turnToward(this.yaw, this.idleYaw, this.tc.idleTurnRate * DEG * dt);
    this.pitch = turnToward(this.pitch, 0, this.tc.idleTurnRate * DEG * dt);
  }

  fire(target) {
    const tc = this.tc;
    const s = this.state;
    this.fireTimer = s.turretMode.seconds;
    const m = this.muzzle.set(this.x, this.muzzleY, this.z);
    // Aim at the chest, with a little spread.
    this.aim.set(target.x - m.x, target.y + target.headBottom * 0.6 - m.y, target.z - m.z).normalize();
    this.right.set(this.aim.z, 0, -this.aim.x).normalize();
    this.up.crossVectors(this.right, this.aim);
    const dir = spreadDirection(this.aim, this.right, this.up, tc.spreadDegrees * DEG, this.rng, this.dir);
    const range = tc.range * 1.5;
    this.colliders.query(m.x + dir.x * range * 0.5, m.z + dir.z * range * 0.5, range * 0.5 + 1, this.blockers);
    const blocked = rayBlockers(m, dir, this.blockers, range, this.ground);
    const count = rayEnemiesAll(m, dir, this.enemies.living, blocked, this.hits);
    const pierce = Math.min(count, tc.pierce);
    let carried = 1;
    let kills = 0;
    let last = blocked;
    for (let k = 0; k < pierce; k++) {
      const hit = this.hits[k];
      const damage = tc.roundDamage * carried * partMultiplier(hit.enemy, hit.part, this.cfg.weapons.headshotMultiplier);
      const at = { x: m.x + dir.x * hit.distance, y: m.y + dir.y * hit.distance, z: m.z + dir.z * hit.distance };
      if (this.enemies.damage(hit.enemy, damage, hit.part, tc, at, m)) kills++;
      carried *= tc.pierceKeep;
      last = hit.distance;
    }
    // The tracer runs on past the last zombie it went through.
    const reach = pierce < count || count === 0 ? Math.min(blocked, range) : Math.min(blocked, last + 6);
    this.end.set(m.x + dir.x * reach, m.y + dir.y * reach, m.z + dir.z * reach);
    // From the end of the barrel, not its pivot.
    const barrel = this.barrel.copy(this.aim).multiplyScalar(0.9).add(m);
    this.fx.tracer(barrel, this.end);
    this.fx.muzzleFlash(barrel);
    if (count === 0 && blocked < range) this.fx.dust(this.end.x, this.end.y, this.end.z);
    this.sfx.play('turret', this);
    this.enemies.alert(this.x, this.z, tc.noise);
    s.turretFired();
    this.recoil = 1;
    this.bus.emit('turret:fired', { kills });
  }

  reset() {
    this.target = null;
    this.fireTimer = 0;
    this.idleTimer = 0;
    this.yaw = this.idleYaw;
    this.pitch = 0;
  }
}
