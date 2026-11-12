// Dynamite (Session 27; DESIGN.md "Weapons"; config.dynamite): the game's
// first handheld throwable. Old, sweating sticks from the railway cutting's
// powder store, scarce (Aaron).
//
//  - In hand (the weapon cross's down arm, or RB / LB to the explosive kind)
//    while Tom has sticks. RT strikes a match and lights the fuse; the fuse
//    burns while it's held (cook it); let go and it's thrown, on the arc
//    that's drawn while it's lit. A tap lights it and throws it at once.
//  - Held too long, it goes off in his hand (Aaron).
//  - Switching away with it lit drops it at his feet, still lit.
//  - Thrown, it bounces and rolls (combat/dynamiteFlight.js) and goes off
//    when the fuse runs out, with its own blast (combat/Explosives.js's
//    blast(), config.dynamite.blast). A lit stick lying there goes off at
//    once if it's shot or struck (it's a target: Weapons' extraTargets).
//  - Other things that go up when they're knocked (the powder store's
//    crate) join as hazards: addHazard({ x, y, z, r, h, blast, onBlow }).
//
// The fuse's left in the prompt bar (the HUD's progress bar) while it's in
// hand: "Release RT: throw", then "THROW IT" near the end.
//
// Saved: the sticks carried (saveState / loadState). A lit one isn't.
//
// Events: 'dynamite:lit', 'dynamite:thrown' { x, z }, 'dynamite:blast' { x, z, inHand }.

import * as THREE from 'three';
import { throwVelocity, throwArc, stepStick } from './dynamiteFlight.js';

const MAX_STICKS = 12; // in the world at once (drawn)

export class Dynamite {
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.dc = cfg.dynamite;
    this.bus = bus;
  }

  // ctx: { combat, player, explosives, ground, colliders, notify }.
  init(scene, ctx) {
    Object.assign(this, ctx);
    this.scene = scene;
    this.hud = { prompt: '', progress: 0 };
    this.lit = null; // { fuse, held } while one's lit in hand
    this.cooldown = 0;
    this.thrownAgo = Infinity;
    this.sticks = []; // thrown, in the world: { x, y, z, vx, vy, vz, fuse, resting, target }
    this.hazards = [];
    this.blockers = [];
    this.hissTimer = 0;
    this.combat.inventory.dynamite = this.combat.inventory.dynamite ?? 0;
    // Lit sticks lying about (and the hazards) are targets: a shot or a swing sets them off.
    this.targets = { group: [] };
    this.combat.weapons.extraTargets.push(this.targets);
    this.initRenderer(scene);
  }

  get count() {
    return this.combat.inventory.dynamite ?? 0;
  }

  set count(n) {
    this.combat.inventory.dynamite = Math.max(0, Math.min(this.dc.carryMax, n));
  }

  // Sticks found: up to the carry limit; returns how many fitted.
  give(n) {
    const before = this.count;
    this.count = before + n;
    return this.count - before;
  }

  get inHand() {
    return this.combat.weapons.id === 'dynamite';
  }

  // playing: the world is running and the controls are Tom's.
  update(dt, input, playing) {
    const weapons = this.combat.weapons;
    // The last one's gone: back to what was in hand before (once the throw's done).
    if (this.inHand && !this.lit && this.count <= 0 && this.cooldown <= 0 && this.before && this.before !== 'dynamite' && weapons.order.includes(this.before)) weapons.selectId(this.before);
    weapons.setSlot('dynamite', this.count > 0 || Boolean(this.lit) || (this.inHand && this.cooldown > 0));
    this.hud.prompt = '';
    this.hud.progress = 0;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.thrownAgo += dt;
    if (playing) {
      this.updateHand(dt, input);
      this.updateSticks(dt);
    }
    this.updateTargets(playing ? dt : 0);
    this.updateRenderer(dt);
    this.updateViewModel();
  }

  // ---- in hand -------------------------------------------------------------------------------

  updateHand(dt, input) {
    const weapons = this.combat.weapons;
    // Put away while lit: it's dropped where he stands, still burning.
    if (this.lit && !this.inHand) {
      this.drop();
      return;
    }
    if (!this.inHand) {
      this.before = weapons.id; // what to go back to once the last stick's thrown
      return;
    }
    if (!this.combat.alive) return;
    if (!this.lit && this.count <= 0) return;
    const pad = input?.activeDevice === 'gamepad';
    if (!this.lit) {
      if (weapons.requireRelease || weapons.switchProgress < 1 || this.cooldown > 0 || this.count <= 0) return;
      if (input?.wasPressed('attack')) this.light();
      return;
    }
    this.lit.fuse -= dt;
    this.lit.held += dt;
    // The hiss: quicker as it burns down.
    this.hissTimer -= dt;
    if (this.hissTimer <= 0) {
      this.combat.sfx.play(this.lit.fuse < this.dc.hurryAt ? 'fuseHissFast' : 'fuseHiss');
      this.hissTimer = this.lit.fuse < this.dc.hurryAt ? 0.18 : 0.42;
    }
    if (this.lit.fuse <= 0) {
      this.blowInHand();
      return;
    }
    const hurry = this.lit.fuse < this.dc.hurryAt;
    this.hud.prompt = hurry ? `THROW IT! (release ${pad ? 'RT' : 'the mouse'})` : `Release ${pad ? 'RT' : 'the mouse'}: throw · the fuse is burning`;
    this.hud.progress = this.lit.fuse / this.dc.fuseSeconds;
    if (!input?.isDown('attack') && this.lit.held >= this.dc.minHold) this.throwIt();
  }

  light() {
    this.lit = { fuse: this.dc.fuseSeconds, held: 0 };
    this.hissTimer = 0.3;
    this.combat.sfx.play('matchStrike');
    this.bus.emit('dynamite:lit');
  }

  // Where it leaves the hand and how fast (from the camera).
  launch() {
    const cam = this.player.camera;
    const eye = new THREE.Vector3();
    const f = new THREE.Vector3();
    cam.getWorldPosition(eye);
    cam.getWorldDirection(f);
    const right = new THREE.Vector3().crossVectors(f, cam.up).normalize();
    const o = { x: eye.x + f.x * 0.45 + right.x * 0.2, y: eye.y - 0.12 + f.y * 0.45, z: eye.z + f.z * 0.45 + right.z * 0.2 };
    const v = throwVelocity(f.x, f.y, f.z, this.dc.throwSpeed, this.dc.throwLift);
    // Tom's own way of going carries into it.
    v.x += this.player.velocity?.x ?? 0;
    v.z += this.player.velocity?.z ?? 0;
    return { o, v };
  }

  throwIt() {
    const { o, v } = this.launch();
    this.addStick(o, v, this.lit.fuse);
    this.lit = null;
    this.count = this.count - 1;
    this.cooldown = this.dc.cooldown;
    this.thrownAgo = 0;
    this.combat.sfx.play('dynamiteThrow');
    this.bus.emit('dynamite:thrown', { x: o.x, z: o.z });
  }

  // Dropped at his feet, still lit (he put it away).
  drop() {
    const p = this.player.position;
    this.addStick({ x: p.x, y: p.y + 0.8, z: p.z }, { x: 0, y: 0, z: 0 }, this.lit.fuse);
    this.lit = null;
    this.count = this.count - 1;
    this.notify?.('You dropped the lit stick');
  }

  // Aaron: held too long, it goes off in his hand.
  blowInHand() {
    const p = this.player.position;
    this.lit = null;
    this.count = this.count - 1;
    this.blast(p.x, p.y, p.z, true);
    this.notify?.('It went off in your hand');
  }

  addStick(o, v, fuse) {
    if (this.sticks.length >= MAX_STICKS) this.explodeStick(this.sticks[0]);
    const s = { x: o.x, y: o.y, z: o.z, vx: v.x, vy: v.y, vz: v.z, fuse, resting: false, bounces: 0 };
    s.target = { x: s.x, y: s.y, z: s.z, hitRadius: this.dc.hitBox, headBottom: this.dc.hitBox, height: this.dc.hitBox + 0.01, headRadius: 0.01, targetable: true, noAssist: true, takeHit: () => this.explodeStick(s) };
    this.sticks.push(s);
    return s;
  }

  // ---- in the world ------------------------------------------------------------------------

  updateSticks(dt) {
    const ground = this.ground;
    const bodies = this.combat.enemies.living;
    for (const s of [...this.sticks]) {
      if (!s.resting) {
        this.colliders?.query(s.x, s.z, 1.5, this.blockers);
        const ev = stepStick(s, dt, this.dc, { heightAt: (x, z) => ground.heightAt(x, z), blockers: this.blockers, bodies });
        if (ev === 'bounce') this.combat.sfx.play('stickBounce', s);
      }
      s.fuse -= dt;
      if (s.fuse <= 0) this.explodeStick(s);
    }
  }

  explodeStick(s) {
    const i = this.sticks.indexOf(s);
    if (i < 0) return false;
    this.sticks.splice(i, 1);
    this.blast(s.x, s.y - this.dc.radius, s.z, false);
    return true;
  }

  blast(x, y, z, inHand) {
    this.explosives.blast(x, y, z, inHand ? { ...this.dc.blast, playerDamage: this.dc.inHandDamage, edge: 1 } : this.dc.blast);
    this.bus.emit('dynamite:blast', { x, z, inHand });
    // Anything else sweating near enough goes up with it (a moment later: a chain).
    for (const h of [...this.hazards]) {
      if (h.blown || Math.hypot(h.x - x, h.z - z) > this.dc.blast.radius * 0.8) continue;
      h.chain = 0.25;
    }
    for (const s of this.sticks) if (Math.hypot(s.x - x, s.z - z) < this.dc.blast.radius * 0.6) s.fuse = Math.min(s.fuse, 0.2);
  }

  // ---- hazards (the powder store's crate) ---------------------------------------------------

  // h: { x, y, z, r, h, blast (config.explosives' shape), onBlow() }. Shot, struck or caught in a
  // blast, it goes up. Returns h (call removeHazard(h) to take it away unblown).
  addHazard(h) {
    h.blown = false;
    h.chain = null;
    h.target = { x: h.x, y: h.y, z: h.z, hitRadius: h.r, headBottom: h.h, height: h.h + 0.01, headRadius: 0.01, targetable: true, noAssist: true, takeHit: () => this.blowHazard(h) };
    this.hazards.push(h);
    return h;
  }

  removeHazard(h) {
    this.hazards = this.hazards.filter((x) => x !== h);
  }

  blowHazard(h) {
    if (h.blown) return false;
    h.blown = true;
    this.removeHazard(h);
    this.explosives.blast(h.x, h.y, h.z, h.blast ?? this.dc.blast);
    this.bus.emit('dynamite:blast', { x: h.x, z: h.z, inHand: false, hazard: true });
    h.onBlow?.();
    return true;
  }

  updateTargets(dt) {
    const list = this.targets.group;
    list.length = 0;
    for (const s of this.sticks) {
      s.target.x = s.x;
      s.target.z = s.z;
      s.target.y = s.y - this.dc.hitBox * 0.5;
      list.push(s.target);
    }
    for (const h of [...this.hazards]) {
      if (h.chain !== null) {
        h.chain -= dt;
        if (h.chain <= 0) this.blowHazard(h);
        continue;
      }
      list.push(h.target);
    }
  }

  // ---- what's drawn: the sticks, their sparks, the arc ---------------------------------------

  initRenderer(scene) {
    const k = this.dc.look;
    this.stickGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.2, 8).rotateZ(Math.PI / 2);
    this.stickMat = new THREE.MeshLambertMaterial({ color: k.stick });
    this.stickMesh = new THREE.InstancedMesh(this.stickGeo, this.stickMat, MAX_STICKS);
    this.sparkGeo = new THREE.SphereGeometry(0.05, 6, 4);
    this.sparkMat = new THREE.MeshBasicMaterial({ color: k.spark, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    this.sparkMesh = new THREE.InstancedMesh(this.sparkGeo, this.sparkMat, MAX_STICKS);
    this.dotGeo = new THREE.SphereGeometry(0.035, 6, 4);
    this.dotMat = new THREE.MeshBasicMaterial({ color: k.arc, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    this.dots = new THREE.InstancedMesh(this.dotGeo, this.dotMat, this.dc.arcDots);
    this.ringGeo = new THREE.RingGeometry(0.55, 0.68, 24).rotateX(-Math.PI / 2);
    this.ringMat = new THREE.MeshBasicMaterial({ color: k.ring, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide });
    this.ring = new THREE.Mesh(this.ringGeo, this.ringMat);
    for (const m of [this.stickMesh, this.sparkMesh, this.dots]) {
      m.count = 0;
      m.frustumCulled = false;
      scene.add(m);
    }
    this.ring.visible = false;
    scene.add(this.ring);
    this.m4 = new THREE.Matrix4();
    this.q = new THREE.Quaternion();
    this.v3 = new THREE.Vector3();
    this.s3 = new THREE.Vector3();
    this.time = 0;
  }

  updateRenderer(dt) {
    this.time += dt;
    let n = 0;
    for (const s of this.sticks) {
      // Tumbling in flight, lying still when it's stopped.
      const spin = s.resting ? 0.6 : this.time * 9 + n;
      this.q.setFromEuler(new THREE.Euler(s.resting ? 0 : spin * 0.7, Math.atan2(s.vx, s.vz) + spin, 0));
      this.m4.compose(this.v3.set(s.x, s.y, s.z), this.q, this.s3.set(1, 1, 1));
      this.stickMesh.setMatrixAt(n, this.m4);
      // The spark at the fuse's end: flickering, bigger as it burns down.
      const flick = 0.7 + 0.6 * Math.abs(Math.sin(this.time * 37 + n * 3.1)) + (s.fuse < this.dc.hurryAt ? 0.6 : 0);
      this.v3.set(0.11, 0, 0).applyQuaternion(this.q).add(this.s3.set(s.x, s.y, s.z));
      this.m4.compose(this.v3, this.q.identity(), this.s3.set(flick, flick, flick));
      this.sparkMesh.setMatrixAt(n, this.m4);
      n++;
    }
    this.stickMesh.count = n;
    this.sparkMesh.count = n;
    if (n) {
      this.stickMesh.instanceMatrix.needsUpdate = true;
      this.sparkMesh.instanceMatrix.needsUpdate = true;
    }
    // The arc, while one's lit in hand.
    if (this.lit && this.inHand) {
      const { o, v } = this.launch();
      const arc = throwArc(o, v, this.dc.gravity, (x, z) => this.ground.heightAt(x, z), this.dc.arcDots, this.dc.arcStep);
      let k = 0;
      for (let i = 2; i < arc.points.length; i++) {
        const p = arc.points[i];
        this.m4.makeTranslation(p.x, p.y, p.z);
        this.dots.setMatrixAt(k++, this.m4);
      }
      this.dots.count = k;
      this.dots.instanceMatrix.needsUpdate = true;
      this.ring.visible = Boolean(arc.land);
      if (arc.land) this.ring.position.set(arc.land.x, arc.land.y + 0.04, arc.land.z);
      const urgent = this.lit.fuse < this.dc.hurryAt;
      this.dotMat.opacity = urgent ? 0.35 + 0.35 * Math.abs(Math.sin(this.time * 14)) : 0.55;
    } else {
      this.dots.count = 0;
      this.ring.visible = false;
    }
  }

  // The view model's stick: lit or not, how much fuse is left, the throw.
  updateViewModel() {
    const vm = this.combat.viewModel;
    if (!vm) return;
    vm.dyn = { lit: Boolean(this.lit), fuse: this.lit ? this.lit.fuse / this.dc.fuseSeconds : 1, thrownAgo: this.thrownAgo, cooldown: this.dc.cooldown, empty: this.count <= 0 && !this.lit };
  }

  // ---- saving -------------------------------------------------------------------------------

  saveState() {
    return { carried: this.count };
  }

  loadState(d) {
    this.lit = null;
    this.sticks = [];
    this.count = Number.isFinite(d?.carried) ? d.carried : 0;
  }

  // Back to none (a new run, a respawn).
  reset() {
    this.lit = null;
    this.sticks = [];
    this.count = 0;
  }

  addDebugItems(menu, category) {
    const cat = menu.category(category);
    cat.addItem(() => `Give dynamite (+4; ${this.count} carried)`, () => this.give(4));
  }

  dispose() {
    for (const m of [this.stickMesh, this.sparkMesh, this.dots, this.ring]) m.removeFromParent();
    for (const x of [this.stickGeo, this.stickMat, this.sparkGeo, this.sparkMat, this.dotGeo, this.dotMat, this.ringGeo, this.ringMat]) x.dispose();
    const i = this.combat.weapons.extraTargets.indexOf(this.targets);
    if (i >= 0) this.combat.weapons.extraTargets.splice(i, 1);
  }
}
