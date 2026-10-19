// Explosives (M7 step 4; DESIGN.md "Explosives" and "Destroying the hut").
//  - Charges come from the debug menu for now (the mineshaft, outpost and
//    Car Armory give them in M9-M11). You carry at most two.
//  - Planting: hold X. At the hut a charge goes on its wall ("1 of 2");
//    anywhere else you plant one at your feet with the detonator in hand
//    (a trap on a path, or dropped while chased).
//  - Detonating: the detonator is a weapon slot (RB / LB) while you have
//    charges out or in hand; RT sets off every planted charge at once.
//    Always by hand, never by proximity.
//  - A blast kills zombies, hurts the witch, breaks traps and hurts you
//    if you're in it (radius and damage are config), and every zombie
//    near enough hears it.
//  - The hut falls only to two charges on it set off together. One alone
//    just shakes it. Destroying it is the point of no return (step 5: the
//    final battle).
//
// Events: 'charge:planted' { charge, onHut }, 'hut:armed' (both charges are
// on the hut), 'explosion' { x, z, radius }, 'charge:hutHeld' (one charge on
// the hut wasn't enough).

import * as THREE from 'three';
import { HoldAction } from '../player/HoldAction.js';

const round1 = (v) => Math.round(v * 10) / 10;

export class Explosives {
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.ec = cfg.explosives;
    this.bus = bus;
  }

  // ctx: { combat, player, hut, witch, ground, notify, busy: [{ prompt }] }.
  init(scene, ctx) {
    Object.assign(this, ctx);
    this.placed = []; // [{ x, y, z, onHut }]
    this.hold = new HoldAction(this.cfg.digging.releaseDrain);
    this.hold.init();
    this.hud = { prompt: '', progress: 0 };
    this.initRenderer(scene);
  }

  get inventory() {
    return this.combat.inventory;
  }

  // Charges in hand or planted.
  get anyOut() {
    return this.inventory.charges > 0 || this.placed.length > 0;
  }

  give(count) {
    const room = this.ec.carryMax - this.inventory.charges - this.placed.length;
    const n = Math.max(0, Math.min(count, room));
    this.inventory.charges += n;
    return n;
  }

  // playing: the world is running and the player's controls are theirs.
  update(dt, input, playing) {
    const weapons = this.combat.weapons;
    weapons.setSlot('detonator', this.anyOut);
    this.combat.chargesPlaced = this.placed.length;
    this.hud.prompt = '';
    this.hud.progress = 0;
    if (playing && this.combat.alive) {
      if (weapons.id === 'detonator' && weapons.consumeTrigger()) this.detonate();
      this.updatePlanting(dt, input, weapons.id === 'detonator');
    }
    this.updateRenderer(dt);
  }

  // Hold X to plant: on the hut's wall when you're by it, else (with the
  // detonator in hand) at your feet.
  updatePlanting(dt, input, detonatorInHand) {
    const p = this.player.position;
    const inv = this.inventory;
    const busy = this.busy.some((b) => b.prompt);
    const hut = this.hut;
    const atHut = !hut.destroyed && hut.distanceTo(p.x, p.z) <= this.ec.hutPlantRange;
    const can = inv.charges > 0 && !busy && (atHut || detonatorInHand) && !this.player.platform;
    const key = can ? (atHut ? 'hut' : 'here') : null;
    const done = this.hold.update(dt, key, input.isDown('interact'), this.ec.plantSeconds);
    if (can) {
      const pad = input.activeDevice === 'gamepad';
      const onHut = this.placed.filter((c) => c.onHut).length;
      this.hud.prompt = atHut ? `Hold ${pad ? 'X' : 'E'}: plant a charge on the hut (${onHut} of 2 placed)` : `Hold ${pad ? 'X' : 'E'}: plant a charge here`;
      this.hud.progress = this.hold.progress;
    }
    if (done) this.plant(atHut);
  }

  plant(onHut) {
    const p = this.player.position;
    const at = onHut ? this.hut.wallPoint(p.x, p.z) : { x: p.x, z: p.z };
    const charge = { x: at.x, z: at.z, y: this.ground.heightAt(at.x, at.z), onHut };
    this.inventory.charges -= 1;
    this.placed.push(charge);
    this.combat.sfx.play('chargePlant');
    this.bus.emit('charge:planted', { charge, onHut });
    const n = this.placed.filter((c) => c.onHut).length;
    // Both on: the point of no return's radio call and pop-up (ui/NoReturnNotice.js).
    if (onHut && n >= 2) this.bus.emit('hut:armed');
    else if (onHut) this.notify('A charge on the hut. It will take two, set off together.');
    return charge;
  }

  // Every planted charge goes off at once.
  detonate() {
    if (this.placed.length === 0) {
      this.combat.sfx.play('empty');
      return 0;
    }
    const charges = this.placed;
    this.placed = [];
    for (const c of charges) this.blast(c.x, c.y, c.z);
    const onHut = charges.filter((c) => c.onHut).length;
    if (onHut >= 2) this.hut.destroy();
    else if (onHut === 1) {
      this.bus.emit('charge:hutHeld');
      this.notify('The hut shudders, but holds. It takes two charges, set off together.');
    }
    return charges.length;
  }

  // One blast at (x, y, z). e: its size (config.explosives, or a car's:
  // config.vehicles.damage.blast). source: what went up (a car), if anything.
  blast(x, y, z, e = this.ec, source = null) {
    const at = { x, y: y + 1, z };
    const falloff = (d) => Math.max(0, 1 - d / e.radius) * (1 - e.edge) + e.edge;
    // Zombies.
    const enemies = this.combat.enemies;
    for (const zb of [...enemies.living]) {
      const d = Math.hypot(zb.x - x, zb.z - z);
      if (d > e.radius) continue;
      enemies.damage(zb, e.damage * falloff(d), 'body', { stagger: 1, knockback: e.knockback }, at, at);
    }
    // The witch.
    const w = this.witch;
    if (w?.targetable && Math.hypot(w.x - x, w.z - z) <= e.radius) w.takeHit(e.damage * falloff(Math.hypot(w.x - x, w.z - z)), 'body', {}, at, at);
    // Traps.
    for (const t of w?.traps.list ?? []) {
      if (t.active && Math.hypot(t.x - x, t.z - z) <= e.radius) w.traps.destroy(t, null);
    }
    // You.
    const p = this.player.position;
    const dp = Math.hypot(p.x - x, p.z - z);
    if (dp <= e.radius) this.combat.hurtPlayer(e.playerDamage * falloff(dp), 3);
    this.player.shake(e.shake * Math.max(0.15, 1 - dp / (e.radius * 6)));
    enemies.alert(x, z, e.alert);
    this.combat.sfx.play('explosion', { x, z, range: e.alert });
    this.spawnFx(x, y, z, e.radius / this.ec.radius);
    this.bus.emit('explosion', { x, z, radius: e.radius, source });
  }

  // ---- saving (M7 step 6) -----------------------------------------------------------

  saveState() {
    return { carried: this.inventory.charges, placed: this.placed.map((c) => [round1(c.x), round1(c.z), c.onHut ? 1 : 0]) };
  }

  // d: saveState()'s, or undefined (an older save: none).
  loadState(d) {
    if (!d) return;
    const placed = Array.isArray(d.placed) ? d.placed.filter((c) => Array.isArray(c) && Number.isFinite(c[0]) && Number.isFinite(c[1])) : [];
    this.placed = placed.slice(0, this.ec.carryMax).map(([x, z, onHut]) => ({ x, z, y: this.ground.heightAt(x, z), onHut: onHut === 1 }));
    const carried = Number.isFinite(d.carried) ? d.carried : 0;
    this.inventory.charges = Math.max(0, Math.min(this.ec.carryMax - this.placed.length, carried));
  }

  // ---- the visuals: planted charges (a blinking red light) and blasts -------------

  initRenderer(scene) {
    const look = this.ec.look;
    this.scene = scene;
    this.chargeGeometry = new THREE.BoxGeometry(0.28, 0.16, 0.2);
    this.chargeGeometry.translate(0, 0.08, 0);
    this.chargeMaterial = new THREE.MeshLambertMaterial({ color: look.charge });
    this.ledGeometry = new THREE.BoxGeometry(0.04, 0.04, 0.04);
    this.ledGeometry.translate(0.08, 0.18, 0.06);
    this.ledMaterial = new THREE.MeshBasicMaterial({ color: look.led });
    this.charges = new THREE.InstancedMesh(this.chargeGeometry, this.chargeMaterial, this.ec.carryMax);
    this.leds = new THREE.InstancedMesh(this.ledGeometry, this.ledMaterial, this.ec.carryMax);
    for (const m of [this.charges, this.leds]) {
      m.frustumCulled = false;
      m.count = 0;
      scene.add(m);
    }
    // A blast: a white-hot core and an orange fireball that swell and fade.
    this.fireGeometry = new THREE.SphereGeometry(1, 16, 10);
    this.fireballs = [];
    this.matrix = new THREE.Matrix4();
    this.time = 0;
  }

  spawnFx(x, y, z, scale = 1) {
    const look = this.ec.look;
    const make = (color) => {
      const m = new THREE.Mesh(this.fireGeometry, new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      m.position.set(x, y + 1, z);
      this.scene.add(m);
      return m;
    };
    this.fireballs.push({ core: make(look.core), fire: make(look.fire), age: 0, scale });
  }

  updateRenderer(dt) {
    this.time += dt;
    const blink = Math.sin(this.time * Math.PI * 2 * this.ec.look.blinkPerSecond) > 0;
    let n = 0;
    for (const c of this.placed) {
      this.matrix.makeTranslation(c.x, c.y, c.z);
      this.charges.setMatrixAt(n, this.matrix);
      this.leds.setMatrixAt(n, this.matrix);
      n++;
    }
    this.charges.count = n;
    this.leds.count = blink ? n : 0;
    if (n > 0) {
      this.charges.instanceMatrix.needsUpdate = true;
      this.leds.instanceMatrix.needsUpdate = true;
    }
    const life = this.ec.look.fireSeconds;
    for (const f of this.fireballs) {
      f.age += dt;
      const t = Math.min(1, f.age / life);
      const r = this.ec.radius * f.scale * (0.3 + 0.7 * Math.sqrt(t));
      f.fire.scale.setScalar(r * 0.75);
      f.core.scale.setScalar(r * 0.35 * (1 - t));
      f.fire.material.opacity = (1 - t) * 0.85;
      f.core.material.opacity = (1 - t) * (1 - t);
      if (t >= 1) {
        for (const m of [f.core, f.fire]) {
          m.removeFromParent();
          m.material.dispose();
        }
      }
    }
    this.fireballs = this.fireballs.filter((f) => f.age < life);
  }

  dispose() {
    for (const m of [this.charges, this.leds]) m.removeFromParent();
    for (const f of this.fireballs) for (const m of [f.core, f.fire]) m.removeFromParent();
    this.chargeGeometry.dispose();
    this.ledGeometry.dispose();
    this.fireGeometry.dispose();
    this.chargeMaterial.dispose();
    this.ledMaterial.dispose();
  }
}
