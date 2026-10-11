// The player's weapons: switching (RB next, Y previous, keys 1-4), firing
// (RT), aiming down sights (LT: zoom, tighter spread, stronger aim
// assist), reloading (B), the aim and fire slowdown, and aim assist.
// Hits are resolved here with combat/hitscan.js and applied through the
// EnemyManager. The shovel swings in an arc and connects a moment later.
//
// Events: 'weapon:switched' { id }, 'weapon:fired' { id }, 'weapon:swing',
// 'weapon:hit' { killed, part, melee }, 'weapon:impact' { x, y, z },
// 'weapon:reload' { id }, 'weapon:loaded' { id }, 'weapon:empty'.

import * as THREE from 'three';
import { WeaponState } from '../combat/WeaponState.js';
import { aimSlowdown } from '../combat/aimAssist.js';
import { rayEnemies, rayBlockers, falloff, spreadDirection, meleeTarget } from '../combat/hitscan.js';

const DEG_TO_RAD = Math.PI / 180;
const SLOT_ACTIONS = ['weaponSlot1', 'weaponSlot2', 'weaponSlot3', 'weaponSlot4'];
const MISS_CHECK_DISTANCE = 40; // metres: how far a missed shot looks for a tree or the ground to puff

export class Weapons {
  constructor(weaponsConfig, aimingConfig, aimAssistConfig, playerConfig, rng, bus) {
    this.cfg = weaponsConfig;
    this.aimingCfg = aimingConfig;
    this.assistCfg = aimAssistConfig;
    this.playerCfg = playerConfig;
    this.rng = rng;
    this.bus = bus;
  }

  init(player, enemies, colliders) {
    this.player = player;
    this.enemies = enemies;
    this.colliders = colliders;
    this.eye = new THREE.Vector3();
    this.forward = new THREE.Vector3();
    this.right = new THREE.Vector3();
    this.up = new THREE.Vector3();
    this.dir = { x: 0, y: 0, z: 0 };
    this.blockers = [];
    this.pelletHits = new Map(); // zombie -> { damage, head, pellets, x, y, z }
    this.assistTargets = [];
    this.assistCfgAiming = { ...this.assistCfg, slowFactor: this.assistCfg.aimingSlowFactor };
    this.reset();
  }

  reset() {
    this.order = [...this.cfg.startingLoadout];
    this.states = {};
    for (const id of this.order) {
      const state = new WeaponState(this.cfg[id]);
      state.init();
      this.states[id] = state;
    }
    this.index = Math.max(0, this.order.indexOf(this.cfg.startingWeapon));
    this.switchTimer = 0;
    this.aiming = false;
    this.zoom = 0;
    this.fireSlow = 0;
    this.meleeTimer = -1;
    this.requireRelease = true; // the click or tap that starts the game must not fire
    this.swingTime = Infinity; // seconds since the last swing (view model)
    this.shotTime = Infinity; // seconds since the last shot (view model)
  }

  get id() {
    return this.order[this.index];
  }

  get weapon() {
    return this.cfg[this.id];
  }

  get state() {
    return this.states[this.id];
  }

  // 0..1 through a weapon switch (1 = ready).
  get switchProgress() {
    return 1 - this.switchTimer / this.cfg.switchSeconds;
  }

  // Ignore the attack button until it's next released (game start, resume).
  holdFire() {
    this.requireRelease = true;
  }

  select(index) {
    const next = (index + this.order.length) % this.order.length;
    if (next === this.index) return;
    this.state.cancelReload();
    this.index = next;
    this.switchTimer = this.cfg.switchSeconds;
    this.meleeTimer = -1;
    this.bus.emit('weapon:switched', { id: this.id });
  }

  update(dt, input, camera) {
    this.swingTime += dt;
    this.shotTime += dt;
    this.updateSwitching(input, dt);
    for (const id of this.order) {
      if (this.states[id].update(dt) && id === this.id) this.bus.emit('weapon:loaded', { id });
    }

    camera.getWorldPosition(this.eye);
    camera.getWorldDirection(this.forward);
    this.right.crossVectors(this.forward, camera.up).normalize();
    this.up.crossVectors(this.right, this.forward);

    const w = this.weapon;
    const ready = this.switchTimer <= 0;
    this.aiming = ready && w.kind === 'hitscan' && input.isDown('aim');
    const zoomTarget = this.aiming ? 1 : 0;
    this.zoom += (zoomTarget - this.zoom) * Math.min(1, this.aimingCfg.zoomSpeed * dt);
    this.player.fovMultiplier = 1 + ((w.aimFovMultiplier ?? 1) - 1) * this.zoom;

    if (ready && input.wasPressed('reload') && this.state.startReload()) this.bus.emit('weapon:reload', { id: this.id });
    if (ready) this.updateFiring(input);
    this.updateMelee(dt);

    this.fireSlow = Math.max(0, this.fireSlow - dt);
    this.player.moveMultiplier = this.aiming || this.fireSlow > 0 ? this.playerCfg.aimMultiplier : 1;
    this.updateAimAssist();
  }

  updateSwitching(input, dt) {
    this.switchTimer = Math.max(0, this.switchTimer - dt);
    if (input.wasPressed('weaponNext')) this.select(this.index + 1);
    if (input.wasPressed('weaponPrev')) this.select(this.index - 1);
    SLOT_ACTIONS.forEach((action, i) => {
      if (i < this.order.length && input.wasPressed(action)) this.select(i);
    });
  }

  // Guns fire once per trigger pull; the shovel keeps swinging while held.
  updateFiring(input) {
    if (this.requireRelease) {
      if (!input.isDown('attack')) this.requireRelease = false;
      return;
    }
    const w = this.weapon;
    const s = this.state;
    const wants = w.kind === 'melee' ? input.isDown('attack') : input.wasPressed('attack');
    if (!wants) return;
    if (s.usesAmmo && s.mag === 0) {
      if (s.startReload()) this.bus.emit('weapon:reload', { id: this.id });
      else if (input.wasPressed('attack')) this.bus.emit('weapon:empty');
      return;
    }
    if (!s.fire()) return;
    this.fireSlow = this.cfg.fireSlowSeconds;
    if (w.kind === 'melee') {
      this.meleeTimer = w.hitDelay;
      this.swingTime = 0;
      this.bus.emit('weapon:swing');
    } else {
      this.shotTime = 0;
      this.fireHitscan(w);
      this.player.kick(w.recoilDegrees);
      this.player.shake(w.shake ?? 0);
      this.bus.emit('weapon:fired', { id: this.id });
    }
  }

  fireHitscan(w) {
    const eye = this.eye;
    const spread = (this.aiming ? w.aimSpreadDegrees : w.spreadDegrees) * DEG_TO_RAD;
    const check = Math.min(w.range, MISS_CHECK_DISTANCE);
    const half = check / 2;
    this.colliders.query(eye.x + this.forward.x * half, eye.z + this.forward.z * half, half + spread * check, this.blockers);
    const living = this.enemies.living;
    this.pelletHits.clear();

    for (let i = 0; i < w.pellets; i++) {
      const dir = spreadDirection(this.forward, this.right, this.up, spread, this.rng, this.dir);
      const blocked = rayBlockers(eye, dir, this.blockers, w.range);
      const hit = rayEnemies(eye, dir, living, blocked);
      if (!hit) {
        if (blocked < check) {
          this.bus.emit('weapon:impact', { x: eye.x + dir.x * blocked, y: eye.y + dir.y * blocked, z: eye.z + dir.z * blocked });
        }
        continue;
      }
      const head = hit.part === 'head';
      const damage = w.damage * falloff(hit.distance, w.falloffStart, w.falloffEnd, w.falloffMin) * (head ? this.cfg.headshotMultiplier : 1);
      let entry = this.pelletHits.get(hit.enemy);
      if (!entry) {
        entry = { damage: 0, head: false, pellets: 0, x: 0, y: 0, z: 0 };
        this.pelletHits.set(hit.enemy, entry);
      }
      entry.damage += damage;
      entry.head ||= head;
      entry.pellets += 1;
      entry.x = eye.x + dir.x * hit.distance;
      entry.y = eye.y + dir.y * hit.distance;
      entry.z = eye.z + dir.z * hit.distance;
    }

    // One hit per zombie per shot, however many pellets landed.
    for (const [zombie, e] of this.pelletHits) {
      const scaled = { stagger: w.stagger, knockback: w.knockback * e.pellets };
      const killed = this.enemies.damage(zombie, e.damage, e.head ? 'head' : 'body', scaled, e, eye);
      this.bus.emit('weapon:hit', { killed, part: e.head ? 'head' : 'body', melee: false });
    }
  }

  updateMelee(dt) {
    if (this.meleeTimer < 0) return;
    this.meleeTimer -= dt;
    if (this.meleeTimer > 0) return;
    this.meleeTimer = -1;
    const w = this.weapon;
    if (w.kind !== 'melee') return;
    const flat = Math.hypot(this.forward.x, this.forward.z) || 1;
    const target = meleeTarget(this.eye, this.forward.x / flat, this.forward.z / flat, this.enemies.living, w.reach, w.arcDegrees * DEG_TO_RAD);
    if (!target) return;
    const at = { x: target.x, y: this.eye.y - 0.4, z: target.z };
    const killed = this.enemies.damage(target, w.damage, 'body', w, at, this.eye);
    this.player.shake(0.15);
    this.bus.emit('weapon:hit', { killed, part: 'body', melee: true });
  }

  // Controller look slows over a zombie's body or head (stronger aimed).
  updateAimAssist() {
    if (!this.assistCfg.enabled) {
      this.player.lookScale = 1;
      return;
    }
    const targets = this.assistTargets;
    const living = this.enemies.living;
    while (targets.length < living.length * 2) targets.push({ x: 0, y: 0, z: 0, r: 0 });
    let n = 0;
    for (const z of living) {
      const body = targets[n++];
      body.x = z.x;
      body.z = z.z;
      body.y = z.headBottom * 0.55;
      body.r = z.hitRadius;
      const head = targets[n++];
      head.x = z.x;
      head.z = z.z;
      head.y = (z.headBottom + z.height) / 2;
      head.r = z.headRadius;
    }
    this.player.lookScale = aimSlowdown(this.eye, this.forward, targets, this.aiming ? this.assistCfgAiming : this.assistCfg, n);
  }

  giveAmmo(rounds) {
    for (const id of this.order) if (this.states[id].usesAmmo) this.states[id].addAmmo(rounds);
  }

  dispose() {}
}
