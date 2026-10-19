// The flare gun (M9.1; DESIGN.md "Flares"). Y fires a flare along the
// crosshair, a projectile like any round (combat/flareFlight.js): a direct
// hit conks whatever it strikes (Aaron), and it falls where it hit. Down,
// it burns red for burnSeconds. The newest flare is the one that matters:
// the last one fired holds the light, and the last one to land is the lure:
// while it burns every zombie within lureRadius goes to it instead of you
// (ai/ZombieBrain.js 'lured'). Older flares just glow out. Never the witch: she isn't lured, and doesn't hear the pop.
// Carry at most inventory.maxFlares. Each shot adds to the Mothman's
// attention, which drains slowly (used from M10).
//
// Events: 'flare:fired', 'flare:landed' { x, z }, 'weapon:hit' (a conk).

import * as THREE from 'three';
import { stepFlare } from './flareFlight.js';
import { partMultiplier } from './hitscan.js';
import { FlareRenderer } from '../render/FlareRenderer.js';

const AIM_DISTANCE = 30; // metres: the flare flies from the muzzle toward the crosshair's point this far out

export class Flares {
  constructor(cfg, bus) {
    this.cfg = cfg.flares;
    this.headshot = cfg.weapons.headshotMultiplier;
    this.bus = bus;
  }

  // ctx: { player, weapons, enemies, inventory, colliders, ground, sfx }.
  init(scene, ctx) {
    Object.assign(this, ctx);
    this.list = []; // { slot, x, y, z, vx, vy, vz, age, state, burn, seconds }
    this.newest = null; // the last fired: it holds the light
    this.lureFlare = null; // the last landed: the lure while it burns
    this.cooldown = 0;
    this.attention = 0;
    this.blockers = [];
    this.eye = new THREE.Vector3();
    this.fwd = new THREE.Vector3();
    this.right = new THREE.Vector3();
    this.up = new THREE.Vector3();
    this.weapon = { id: 'flare', stagger: this.cfg.stagger, knockback: this.cfg.knockback };
    this.renderer = new FlareRenderer(this.cfg);
    this.renderer.init(scene);
  }

  // canFire: the player has control (not in a menu, not dead, not locked).
  update(dt, input, canFire) {
    const c = this.cfg;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.attention = Math.max(0, this.attention - (c.attentionDrainPerMinute / 60) * dt);
    if (canFire && input.wasPressed('flare')) this.fire();
    for (const f of this.list) {
      if (f.state === 'flying') this.fly(f, dt);
      else if (f.state === 'burning') {
        f.seconds -= dt;
        f.burn = Math.max(0, f.seconds / c.burnSeconds);
        if (f.seconds <= 0) f.state = 'out';
      }
    }
    const l = this.lureFlare;
    this.enemies.setLure(l && l.state === 'burning' ? { x: l.x, z: l.z, radius: c.lureRadius, mill: c.lureMill, breakDistance: c.lureBreakDistance } : null);
    this.renderer.update(dt, this.list, this.newest, (x, z) => this.ground.heightAt(x, z));
  }

  fire() {
    const c = this.cfg;
    const inv = this.inventory;
    if (this.cooldown > 0) return;
    if (inv.flares <= 0) {
      this.sfx.play('empty');
      return;
    }
    inv.flares--;
    this.cooldown = c.fireInterval;
    const cam = this.player.camera;
    cam.getWorldPosition(this.eye);
    cam.getWorldDirection(this.fwd);
    this.right.crossVectors(this.fwd, cam.up).normalize();
    this.up.crossVectors(this.right, this.fwd);
    const m = c.muzzleOffset;
    const start = this.eye.clone().addScaledVector(this.right, m.right).addScaledVector(this.up, -m.down).addScaledVector(this.fwd, m.forward);
    const aim = this.eye.clone().addScaledVector(this.fwd, AIM_DISTANCE).sub(start).normalize();
    const f = { slot: this.freeSlot(), x: start.x, y: start.y, z: start.z, vx: aim.x * c.speed, vy: aim.y * c.speed, vz: aim.z * c.speed, age: 0, state: 'flying', burn: 1, seconds: c.burnSeconds };
    this.list.push(f);
    this.newest = f;
    this.attention += c.attentionPerFlare;
    this.player.kick(c.recoilDegrees);
    this.sfx.play('flareGun');
    this.enemies.alert(this.eye.x, this.eye.z, c.noise);
    this.bus.emit('flare:fired');
  }

  // A pool slot: a free one, else the oldest flare's (spent first).
  freeSlot() {
    const used = new Set(this.list.map((f) => f.slot));
    for (let i = 0; i < this.cfg.poolSize; i++) if (!used.has(i)) return i;
    const oldest = this.list.find((f) => f.state === 'out') ?? this.list.find((f) => f !== this.newest && f !== this.lureFlare);
    this.list.splice(this.list.indexOf(oldest), 1);
    return oldest.slot;
  }

  fly(f, dt) {
    const mid = { x: f.x + f.vx * dt * 0.5, z: f.z + f.vz * dt * 0.5 };
    const reach = Math.hypot(f.vx, f.vz) * dt * 0.5 + 1;
    this.colliders.query(mid.x, mid.z, reach, this.blockers);
    const hit = stepFlare(f, dt, this.cfg, { targets: this.weapons.targets(), blockers: this.blockers, ground: this.ground });
    if (!hit) return;
    if (hit.kind === 'target') this.conk(hit);
    // Down where it stopped: on the ground under a hit.
    f.x = hit.x;
    f.z = hit.z;
    f.y = this.ground.heightAt(f.x, f.z) + 0.05;
    f.state = 'burning';
    f.seconds = this.cfg.burnSeconds;
    this.lureFlare = f;
    this.sfx.play('flareIgnite', f);
    this.bus.emit('flare:landed', { x: f.x, z: f.z });
  }

  // Aaron: a flare to the head. Damage and a stagger, 3x on the head.
  conk(hit) {
    const t = hit.target;
    const amount = this.cfg.hitDamage * partMultiplier(t, hit.part, this.headshot);
    const killed = this.weapons.applyHit(t, amount, hit.part, this.weapon, hit, this.eye);
    this.sfx.play('flareConk', hit);
    this.bus.emit('weapon:hit', { killed, part: hit.part, melee: false });
  }

  // Debug: fill up.
  refill() {
    this.inventory.flares = this.inventory.maxFlares;
  }

  overlayLine() {
    const burning = this.list.filter((f) => f.state === 'burning').length;
    const l = this.lureFlare;
    return `flares ${this.inventory.flares}/${this.inventory.maxFlares} burning ${burning} lure ${l?.state === 'burning' ? Math.ceil(l.seconds) + 's' : '-'} mothman ${this.attention.toFixed(1)}`;
  }

  dispose() {
    this.renderer.dispose();
  }
}
