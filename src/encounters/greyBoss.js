// The grey at the crashed plane as a boss (Nov 16, Aaron: "The Player can easily kill the alien with the
// hunting rifle – this needs to play like a boss fight"). Used by encounters/CrashedPlane.js from the
// quick draw on (its 'boss' state, in place of the old shootout).
//  - Its own bar, the witch's style (Hud.boss, named, with its shield in blue over its health).
//  - An energy shield round it like an orb: hits wear the shield down first (no head bonus through it); left
//    alone `shield.delay` seconds it refills over `shield.refill` seconds, Master Chief style. The quick draw's
//    hit no longer kills it: it shatters the shield as it first blooms.
//  - It still flits: blink-dashes of a few metres round the wreck every second or few (more often bare), with
//    an after-image, and still takes its pistol shots.
//  - The mind scramble ray: it stops, rings gather at its hand (`ray.charge` s, the tell: a window to hit it),
//    then rings run out along a cone (`ray.range` m, `ray.halfAngle` degrees each side). Caught in it, Tom's
//    controls turn round for `ray.seconds` s (Player.scramble: W is back, A is right, mouse and sticks inverted).
//  - Too close while its shield's up, a bolt arcs to him every `arc.every` s: damage and a shove back. Bare, no
//    arcs: the reward for closing in once the shield pops.
//
// Pure parts (exported for the tests): absorb(), regen(), inCone(), pickFlit().

import * as THREE from 'three';
import { resolveCircles } from '../world/collision.js';

// A hit on it: the shield takes it first (all of it, no spill: the shot that pops the shield is spent).
// Returns { shield, health, popped }.
export function absorb(state, amount) {
  if (state.shield > 0) {
    const shield = Math.max(0, state.shield - amount);
    return { shield, health: state.health, popped: shield <= 0 };
  }
  return { shield: 0, health: state.health - amount, popped: false };
}

// The shield over dt: waiting out its delay since the last hit, then refilling to max over refill seconds.
export function regen(state, dt, cfg) {
  const since = state.since + dt;
  let shield = state.shield;
  if (since >= cfg.delay && shield < cfg.max) shield = Math.min(cfg.max, shield + (cfg.max / cfg.refill) * dt);
  return { since, shield };
}

// Is (px, pz) inside the cone from (x, z) along (dx, dz) (unit), range metres, halfAngle degrees?
export function inCone(x, z, dx, dz, px, pz, range, halfAngle) {
  const vx = px - x;
  const vz = pz - z;
  const d = Math.hypot(vx, vz);
  if (d > range) return false;
  if (d < 0.5) return true;
  return (vx * dx + vz * dz) / d >= Math.cos((halfAngle * Math.PI) / 180);
}

// Where it blinks to: dash metres from where it is, inside the ring round centre, clear (clear(x, z) true),
// and not straight at Tom. rand: () => 0..1. Returns { x, z } or null.
export function pickFlit(from, centre, tom, dash, ring, rand, clear) {
  for (let i = 0; i < 14; i++) {
    const a = rand() * Math.PI * 2;
    const r = dash[0] + (dash[1] - dash[0]) * rand();
    const x = from.x + Math.sin(a) * r;
    const z = from.z + Math.cos(a) * r;
    const c = Math.hypot(x - centre.x, z - centre.z);
    if (c < ring[0] || c > ring[1]) continue;
    if (Math.hypot(x - tom.x, z - tom.z) < 4) continue;
    if (!clear(x, z)) continue;
    return { x, z };
  }
  return null;
}

export class GreyBoss {
  // ctx: { scene, player, combat, colliders, ground, sfx, cutscenes, crashSite, hasLineTo(from, to) }.
  constructor(cfg, ctx) {
    this.bc = cfg.crashedPlane.encounter.boss;
    Object.assign(this, ctx);
    this.buildFx();
    this.active = false;
  }

  buildFx() {
    const b = this.bc;
    // The orb: a faint skin and a thin lattice over it.
    this.orb = new THREE.Group();
    this.orbSkin = new THREE.Mesh(new THREE.SphereGeometry(b.shieldRadius, 24, 16), new THREE.MeshBasicMaterial({ color: b.shieldColor, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    this.orbLattice = new THREE.Mesh(new THREE.IcosahedronGeometry(b.shieldRadius * 1.02, 2), new THREE.MeshBasicMaterial({ color: b.shieldColor, wireframe: true, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    this.orb.add(this.orbSkin, this.orbLattice);
    this.orb.visible = false;
    this.scene.add(this.orb);
    // The ray's rings.
    this.rings = [];
    const ringGeo = new THREE.TorusGeometry(1, 0.05, 6, 28);
    for (let i = 0; i < b.ray.rings; i++) {
      const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: b.ray.color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      m.visible = false;
      this.scene.add(m);
      this.rings.push({ mesh: m, t: -1 });
    }
    // The bolt: a jagged run of glowing rods (a white core in a blue glow), one per segment.
    this.bolt = new THREE.Group();
    this.boltCore = new THREE.MeshBasicMaterial({ color: 0xeef8ff, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    this.boltGlow = new THREE.MeshBasicMaterial({ color: b.shieldColor, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const rod = new THREE.CylinderGeometry(1, 1, 1, 5, 1, true);
    rod.translate(0, 0.5, 0);
    rod.rotateX(Math.PI / 2); // along +z, from its start
    this.boltRods = [];
    for (let i = 0; i < b.arc.segments; i++) {
      const core = new THREE.Mesh(rod, this.boltCore);
      const glow = new THREE.Mesh(rod, this.boltGlow);
      core.frustumCulled = glow.frustumCulled = false;
      this.bolt.add(core, glow);
      this.boltRods.push({ core, glow });
    }
    this.bolt.visible = false;
    this.scene.add(this.bolt);
    this.boltT = 0;
  }

  // From the quick draw: its shield blooms. shattered: the quick draw's hit landed (it starts bare).
  start(grey, shattered = false) {
    const b = this.bc;
    this.active = true;
    this.grey = grey;
    this.health = b.health;
    this.shield = shattered ? 0 : b.shield;
    this.since = 0;
    this.bloom = 0;
    this.flitT = this.range(b.flit.every);
    this.shotT = this.range(b.shots.every);
    this.rayT = b.ray.first;
    this.arcT = b.arc.every;
    this.ray = null;
    this.blink = null;
    this.aiming = 0;
    this.orb.visible = true;
  }

  stop() {
    this.active = false;
    this.orb.visible = false;
    this.bolt.visible = false;
    for (const r of this.rings) r.mesh.visible = false;
    this.combat.hud?.boss?.(null);
  }

  rand() {
    return Math.random();
  }

  range([a, b]) {
    return a + (b - a) * this.rand();
  }

  get shieldUp() {
    return this.shield > 0;
  }

  // The quick draw's hit: the shield shatters as it blooms.
  shatter() {
    if (this.shield <= 0) return;
    this.shield = 0;
    this.since = 0;
    this.popFx();
  }

  // A hit (amount after the weapon's head bonus; part 'head' | 'body'). Returns true if it's dead.
  hit(amount, part, headshotMultiplier) {
    const b = this.bc;
    // No head bonus through the shield: the orb takes the round, wherever it was aimed.
    const dmg = this.shield > 0 && part === 'head' ? amount / headshotMultiplier : amount;
    const r = absorb({ shield: this.shield, health: this.health }, dmg);
    this.shield = r.shield;
    this.health = r.health;
    this.since = 0;
    this.shieldFlash = 1;
    if (r.popped) this.popFx();
    else if (this.shield > 0) this.sfx?.play('plasmaFizzle', this.grey);
    // Hit bare: it blinks away sooner.
    if (this.shield <= 0) this.flitT = Math.min(this.flitT, this.range(b.flit.hitBare));
    return this.health <= 0;
  }

  popFx() {
    const g = this.grey;
    this.sfx?.play('plasmaBurst', g);
    this.combat.fx?.emit?.(g.x, g.y + 0.8, g.z, 40, new THREE.Color(this.bc.shieldColor), 7);
    this.player.shake?.(0.4);
  }

  // Each frame of the fight. tom: the player's position. Returns 'fire' on a frame it shoots (CrashedPlane
  // fires its pistol), else null.
  update(dt) {
    const b = this.bc;
    const g = this.grey;
    const P = this.player;
    const tom = P.position;
    const d = Math.hypot(tom.x - g.x, tom.z - g.z);
    let fire = null;
    // The shield.
    const r = regen({ since: this.since, shield: this.shield }, dt, { max: b.shield, delay: b.shieldDelay, refill: b.shieldRefill });
    if (this.shield <= 0 && r.shield > 0) this.sfx?.play('plasmaCharge', g);
    this.since = r.since;
    this.shield = r.shield;
    this.bloom = Math.min(1, this.bloom + dt / 0.4);
    this.shieldFlash = Math.max(0, (this.shieldFlash ?? 0) - dt * 4);
    // The ray: charging, then firing; it stands still for both.
    if (this.ray) this.updateRay(dt);
    else if (this.blink) this.updateBlink(dt);
    else {
      this.flitT -= dt;
      this.shotT -= dt;
      this.rayT -= dt;
      this.facing(tom);
      if (this.rayT <= 0 && d <= b.ray.range * 1.15 && !P.scrambled) this.startRay();
      else if (this.flitT <= 0) this.startBlink();
      else if (this.aiming > 0) {
        this.aiming -= dt;
        g.state = 'aim';
        if (this.aiming <= 0) {
          fire = 'fire';
          this.shotT = this.range(b.shots.every);
        }
      } else if (this.shotT <= 0) {
        this.aiming = b.shots.aim;
      } else g.state = this.shield > 0 ? 'idle' : 'sneak';
    }
    // The arcs: close in while its shield's up and they find him.
    this.arcT -= dt;
    if (this.shield > 0 && d < b.arc.range && this.arcT <= 0 && !this.blink) {
      this.arcT = b.arc.every;
      this.zap();
    }
    this.updateFx(dt);
    // Its bar.
    this.combat.hud?.boss?.(Math.max(0, this.health / b.health), { name: b.name, shield: this.shield / b.shield });
    return fire;
  }

  // Before the fight proper (the quick draw, its scramble to cover): only its orb and its bar.
  passive(dt) {
    const b = this.bc;
    this.bloom = Math.min(1, this.bloom + dt / 0.4);
    this.shieldFlash = Math.max(0, (this.shieldFlash ?? 0) - dt * 4);
    this.updateFx(dt);
    this.combat.hud?.boss?.(Math.max(0, this.health / b.health), { name: b.name, shield: this.shield / b.shield });
  }

  facing(tom) {
    const g = this.grey;
    g.facing = Math.atan2(tom.x - g.x, tom.z - g.z);
  }

  startBlink() {
    const b = this.bc;
    const g = this.grey;
    const centre = this.crashSite.spots.cover;
    const clear = (x, z) => {
      const p = { x, z };
      const near = this.colliders.query(x, z, 0.8, (this.nearList ??= []));
      resolveCircles(p, 0.6, near);
      return Math.hypot(p.x - x, p.z - z) < 0.05;
    };
    const to = pickFlit(g, centre, this.player.position, b.flit.dash, b.flit.ring, () => this.rand(), clear);
    this.flitT = this.range(this.shield > 0 ? b.flit.every : b.flit.everyBare);
    if (!to) return;
    this.blink = { fromX: g.x, fromZ: g.z, toX: to.x, toZ: to.z, t: 0 };
    this.sfx?.play('boostEnd', g);
    // The after-image: a puff of its colour where it was.
    this.combat.fx?.emit?.(g.x, g.y + 0.8, g.z, 14, new THREE.Color(this.bc.afterImage), 2.5);
  }

  updateBlink(dt) {
    const b = this.bc;
    const g = this.grey;
    const k = this.blink;
    k.t += dt;
    const u = Math.min(1, k.t / b.flit.seconds);
    g.x = k.fromX + (k.toX - k.fromX) * u;
    g.z = k.fromZ + (k.toZ - k.fromZ) * u;
    g.state = 'ambush';
    if (u >= 1) {
      this.blink = null;
      this.combat.fx?.emit?.(g.x, g.y + 0.8, g.z, 10, new THREE.Color(this.bc.afterImage), 2);
    }
    g.y = this.ground.heightAt(g.x, g.z);
  }

  // ---- the mind scramble ray ----

  startRay() {
    const g = this.grey;
    this.ray = { phase: 'charge', t: 0, dirX: 0, dirZ: 1, caught: false };
    this.aiming = 0;
    g.state = 'aim';
    this.sfx?.play('plasmaCharge', g);
    this.bus?.emit?.('plane:rayCharge', {});
  }

  updateRay(dt) {
    const b = this.bc;
    const g = this.grey;
    const ry = this.ray;
    const tom = this.player.position;
    ry.t += dt;
    if (ry.phase === 'charge') {
      // Turning on him as the rings gather; the aim locks a beat before it fires.
      if (ry.t < b.ray.charge - b.ray.lock) this.facing(tom);
      g.state = 'aim';
      ry.dirX = Math.sin(g.facing);
      ry.dirZ = Math.cos(g.facing);
      if (ry.t >= b.ray.charge) {
        ry.phase = 'fire';
        ry.t = 0;
        g.state = 'fire';
        g.timer = 0;
        this.sfx?.play('plasmaShot', g);
        this.player.shake?.(0.3);
        for (let i = 0; i < this.rings.length; i++) this.rings[i].t = -i * (b.ray.sweep / this.rings.length);
      }
      return;
    }
    // Firing: Tom inside the cone (with nothing in the way) is caught.
    if (!ry.caught && ry.t >= b.ray.hitAt && inCone(g.x, g.z, ry.dirX, ry.dirZ, tom.x, tom.z, b.ray.range, b.ray.halfAngle) && (this.hasLineTo?.(g, tom) ?? true)) {
      ry.caught = true;
      this.player.scramble(b.ray.seconds);
      this.sfx?.play('radioStatic');
      this.bus?.emit?.('plane:scrambled', {});
    }
    if (ry.t >= b.ray.sweep + b.ray.travel) {
      this.ray = null;
      this.rayT = b.ray.every;
    }
  }

  // ---- the bolt ----

  zap() {
    const b = this.bc;
    const g = this.grey;
    const P = this.player;
    const from = new THREE.Vector3(g.x, g.y + 0.9, g.z);
    const to = new THREE.Vector3(P.position.x, P.position.y + 1.2, P.position.z);
    this.boltFrom = from;
    this.boltTo = to;
    this.shapeBolt();
    this.boltT = b.arc.show;
    this.bolt.visible = true;
    this.sfx?.play('zap', P.position);
    this.combat.fx?.sparks?.(to.x, to.y, to.z);
    this.combat.hurtPlayer(b.arc.damage, 1.5);
    const d = Math.hypot(P.position.x - g.x, P.position.z - g.z) || 1;
    P.push(((P.position.x - g.x) / d) * b.arc.push, ((P.position.z - g.z) / d) * b.arc.push, 1.2);
  }

  // A fresh jag for the bolt between boltFrom and boltTo (it re-forks as it flickers).
  shapeBolt() {
    const b = this.bc;
    const from = this.boltFrom;
    const to = this.boltTo;
    const n = b.arc.segments;
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      const j = i === 0 || i === n ? 0 : b.arc.jitter * Math.sin(Math.PI * k);
      pts.push(new THREE.Vector3(from.x + (to.x - from.x) * k + (this.rand() - 0.5) * j, from.y + (to.y - from.y) * k + (this.rand() - 0.5) * j, from.z + (to.z - from.z) * k + (this.rand() - 0.5) * j));
    }
    for (let i = 0; i < n; i++) {
      const { core, glow } = this.boltRods[i];
      const len = pts[i].distanceTo(pts[i + 1]);
      for (const [m, r] of [[core, 0.018], [glow, 0.06]]) {
        m.position.copy(pts[i]);
        m.lookAt(pts[i + 1]);
        m.scale.set(r, r, len);
      }
    }
  }

  updateFx(dt) {
    const b = this.bc;
    const g = this.grey;
    // The orb.
    const share = this.shield / b.shield;
    this.orb.visible = share > 0.001;
    if (this.orb.visible) {
      this.orb.position.set(g.x, g.y + 0.7, g.z);
      const s = (0.6 + 0.4 * this.bloom) * (0.85 + 0.15 * share);
      this.orb.scale.setScalar(s);
      this.orbSkin.material.opacity = (0.08 + 0.12 * share + 0.35 * this.shieldFlash) * this.bloom;
      this.orbLattice.material.opacity = (0.15 + 0.3 * share + 0.5 * this.shieldFlash) * this.bloom;
      this.orbLattice.rotation.y += dt * 0.6;
      this.orbLattice.rotation.x += dt * 0.25;
    }
    // The ray's rings: gathering at its hand while it charges; running out along the cone as it fires.
    const ry = this.ray;
    const hand = { x: g.x + Math.sin(g.facing) * 0.35, y: g.y + 1.0, z: g.z + Math.cos(g.facing) * 0.35 };
    const tan = Math.tan((b.ray.halfAngle * Math.PI) / 180);
    for (let i = 0; i < this.rings.length; i++) {
      const r = this.rings[i];
      const m = r.mesh;
      if (!ry) {
        m.visible = false;
        continue;
      }
      let dist;
      let opacity;
      if (ry.phase === 'charge') {
        const k = Math.min(1, ry.t / b.ray.charge);
        dist = 0.15 + i * 0.12 * k;
        opacity = 0.25 + 0.6 * k;
        m.scale.setScalar(0.1 + 0.25 * k * (1 - i / this.rings.length) + Math.sin(ry.t * 20 + i) * 0.02);
      } else {
        r.t += dt;
        if (r.t < 0) {
          m.visible = false;
          continue;
        }
        const k = Math.min(1, r.t / b.ray.travel);
        dist = k * b.ray.range;
        opacity = 0.9 * (1 - k);
        m.scale.setScalar(Math.max(0.15, dist * tan));
      }
      m.visible = opacity > 0.02;
      m.material.opacity = opacity;
      m.position.set(hand.x + ry.dirX * dist, hand.y, hand.z + ry.dirZ * dist);
      m.lookAt(hand.x + ry.dirX * (dist + 1), hand.y, hand.z + ry.dirZ * (dist + 1));
    }
    // The bolt flickers out.
    if (this.boltT > 0) {
      this.boltT -= dt;
      const k = Math.max(0, this.boltT / b.arc.show);
      this.boltCore.opacity = k;
      this.boltGlow.opacity = 0.5 * k;
      if (this.rand() < 0.5) this.shapeBolt();
      if (this.boltT <= 0) this.bolt.visible = false;
    }
  }

  dispose() {
    for (const o of [this.orb, this.bolt, ...this.rings.map((r) => r.mesh)]) o.removeFromParent();
  }
}
