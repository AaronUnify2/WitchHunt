// Plasma (the alien quad's guns; experimental): glowing balls that fly,
// arc a little, pull gently toward the dead near where they were aimed,
// and burst on whatever they meet: a direct hit hurts most (a head takes
// the headshot bonus), the burst throws and hurts everything round it
// (the witch too, and Tom a little if he's too close), knocks cars and
// crates about like a round (it sends 'weapon:impact'), and the dead hear it.
//
// Two kinds (config.alienQuad.plasma): the bolt (small, quick, cheap) and
// the orb (charged up: big, slower, a wide burst). power 0..1 scales an
// orb by how long it was charged.
//
// Drawn in three instanced meshes (the cores, their halos, the trails:
// three draw calls however many are flying) plus a few pooled bursts, all
// additive and pushed past white for the bloom. A few point lights are
// always in the scene (at 0 when unused: switching lights on and off
// recompiles every shader) and are handed to the nearest balls; one more
// flashes on a burst.
//
// Events: 'weapon:hit' (hit markers), 'weapon:impact' { x, y, z, damage, id: 'plasma' }.

import * as THREE from 'three';
import { rayEnemies, rayBlockers, partMultiplier } from './hitscan.js';

const TRAIL = 7; // puffs behind each ball

// Splash damage at distance d from a burst of radius r: full at the middle, `edge` at the rim.
export function splashFalloff(d, r, edge = 0.3) {
  if (d >= r) return 0;
  return edge + (1 - edge) * (1 - d / r);
}

export class Plasma {
  // cfg: config.alienQuad.plasma; look: config.alienQuad.look.
  constructor(cfg, look, bus) {
    this.cfg = cfg;
    this.look = look;
    this.bus = bus;
  }

  // ctx: { combat, colliders, ground, player, witch (optional), headshot (multiplier) }.
  init(scene, ctx) {
    Object.assign(this, ctx);
    this.scene = scene;
    const pool = 24;
    this.balls = Array.from({ length: pool }, () => ({ active: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, kind: null, power: 1, trail: [], target: null, age: 0 }));
    for (const b of this.balls) for (let i = 0; i < TRAIL; i++) b.trail.push({ x: 0, y: -1000, z: 0 });
    const additive = (color) => new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const sphere = new THREE.IcosahedronGeometry(1, 2);
    this.cores = new THREE.InstancedMesh(sphere, additive(0xffffff), pool);
    this.halos = new THREE.InstancedMesh(sphere, additive(0xffffff), pool);
    this.halos.material.opacity = 0.35;
    this.trails = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), additive(0xffffff), pool * TRAIL);
    this.trails.material.opacity = 0.55;
    for (const m of [this.cores, this.halos, this.trails]) {
      m.frustumCulled = false;
      m.count = 0;
      m.renderOrder = 4;
      scene.add(m);
    }
    this.colors = {
      bolt: new THREE.Color(this.look.plasma),
      orb: new THREE.Color(this.look.orb),
      white: new THREE.Color(1, 1, 1),
    };
    // Bursts: an expanding shell and a ring along the ground, pooled.
    this.bursts = [];
    const shellGeo = new THREE.IcosahedronGeometry(1, 2);
    const ringGeo = new THREE.RingGeometry(0.7, 1, 32).rotateX(-Math.PI / 2);
    for (let i = 0; i < 8; i++) {
      const shell = new THREE.Mesh(shellGeo, additive(0xffffff));
      const ring = new THREE.Mesh(ringGeo, additive(0xffffff));
      ring.material.side = THREE.DoubleSide;
      for (const m of [shell, ring]) {
        m.visible = false;
        m.frustumCulled = false;
        m.renderOrder = 4;
        scene.add(m);
      }
      this.bursts.push({ shell, ring, age: 0, life: 0, r: 1, color: new THREE.Color() });
    }
    this.burstNext = 0;
    this.lights = []; // made by ensureLights (the quad's first visit), not before
    this.flash = null;
    this.flashT = 0;
    this.m = new THREE.Matrix4();
    this.q = new THREE.Quaternion();
    this.s = new THREE.Vector3();
    this.p = new THREE.Vector3();
    this.c = new THREE.Color();
    this.o = { x: 0, y: 0, z: 0 };
    this.d = { x: 0, y: 0, z: 0 };
    this.near = [];
    this.flying = 0;
  }

  // The lights: a few for the balls in flight, one for the bursts. Made
  // once (adding lights recompiles the shaders), then always in the scene.
  ensureLights() {
    if (this.flash) return;
    for (let i = 0; i < this.cfg.lights; i++) {
      const l = new THREE.PointLight(this.look.plasma, 0, this.cfg.lightDistance, 2);
      l.castShadow = false;
      this.scene.add(l);
      this.lights.push(l);
    }
    this.flash = new THREE.PointLight(this.look.plasma, 0, this.cfg.lightDistance * 2.2, 2);
    this.flash.castShadow = false;
    this.scene.add(this.flash);
  }

  // Launch one from `from` along `dir` (unit), carrying `carry` ({ x, z }: the quad's speed).
  fire(from, dir, kind = 'bolt', power = 1, carry = null) {
    const k = this.cfg[kind];
    const b = this.balls.find((x) => !x.active) ?? this.balls.reduce((a, x) => (a.life < x.life ? a : x));
    b.active = true;
    b.kind = kind;
    b.power = power;
    b.x = from.x;
    b.y = from.y;
    b.z = from.z;
    const sp = k.speed * (kind === 'orb' ? 0.85 + 0.15 * power : 1);
    b.vx = dir.x * sp + (carry?.x ?? 0);
    b.vy = dir.y * sp;
    b.vz = dir.z * sp + (carry?.z ?? 0);
    b.life = k.life;
    b.age = 0;
    b.target = null;
    for (const t of b.trail) {
      t.x = from.x;
      t.y = from.y;
      t.z = from.z;
    }
    return b;
  }

  update(dt, camera) {
    let flying = 0;
    for (const b of this.balls) {
      if (!b.active) continue;
      this.step(b, dt);
      if (b.active) flying++;
    }
    this.flying = flying;
    this.draw(camera);
    this.updateBursts(dt);
    this.flashT = Math.max(0, this.flashT - dt);
    if (this.flash) this.flash.intensity = this.flashT > 0 ? this.cfg.lightIntensity * 3.5 * (this.flashT / 0.25) ** 2 : 0;
  }

  step(b, dt) {
    const k = this.cfg[b.kind];
    b.age += dt;
    b.life -= dt;
    if (b.life <= 0) {
      this.burst(b, b.x, b.y, b.z, null, 0.4);
      return;
    }
    // A gentle pull toward the dead near its line (bolts more than orbs).
    const h = this.cfg.homing;
    const speed = Math.hypot(b.vx, b.vy, b.vz);
    if (b.age > 0.04) {
      if (!b.target?.alive || b.target.health <= 0) b.target = this.pickTarget(b, speed, h);
      const t = b.target;
      if (t) {
        const tx = t.x - b.x;
        const ty = (t.y ?? 0) + (t.headBottom ?? 1.2) * 0.7 - b.y;
        const tz = t.z - b.z;
        const len = Math.hypot(tx, ty, tz) || 1;
        const turn = h.turn * (b.kind === 'orb' ? 0.4 : 1) * dt;
        b.vx += ((tx / len) * speed - b.vx) * Math.min(1, turn);
        b.vy += ((ty / len) * speed - b.vy) * Math.min(1, turn);
        b.vz += ((tz / len) * speed - b.vz) * Math.min(1, turn);
      }
    }
    b.vy -= k.gravity * dt;
    // March it along, in short legs: the first thing it meets bursts it.
    const dist = Math.hypot(b.vx, b.vy, b.vz) * dt;
    const legs = Math.max(1, Math.ceil(dist / 0.6));
    const o = this.o;
    const d = this.d;
    for (let i = 0; i < legs; i++) {
      const leg = dist / legs;
      o.x = b.x;
      o.y = b.y;
      o.z = b.z;
      const len = Math.hypot(b.vx, b.vy, b.vz) || 1;
      d.x = b.vx / len;
      d.y = b.vy / len;
      d.z = b.vz / len;
      const reach = leg + k.radius * (b.kind === 'orb' ? 0.5 + 0.5 * b.power : 1);
      const targets = this.combat.weapons?.targets?.() ?? this.combat.enemies.living;
      const hit = rayEnemies(o, d, targets, reach);
      this.colliders.query(o.x + d.x * leg * 0.5, o.z + d.z * leg * 0.5, leg + 1, this.near);
      const blocked = rayBlockers(o, d, this.near, reach, this.ground);
      if (hit && hit.distance <= blocked) {
        const at = { x: o.x + d.x * hit.distance, y: o.y + d.y * hit.distance, z: o.z + d.z * hit.distance };
        this.burst(b, at.x, at.y, at.z, hit, 1);
        return;
      }
      if (blocked < reach) {
        const t = Math.max(0, blocked - 0.05);
        this.burst(b, o.x + d.x * t, o.y + d.y * t, o.z + d.z * t, null, 1);
        return;
      }
      b.x += d.x * leg;
      b.y += d.y * leg;
      b.z += d.z * leg;
    }
    // The trail follows.
    const tr = b.trail;
    for (let i = tr.length - 1; i > 0; i--) {
      tr[i].x = tr[i - 1].x;
      tr[i].y = tr[i - 1].y;
      tr[i].z = tr[i - 1].z;
    }
    tr[0].x = b.x;
    tr[0].y = b.y;
    tr[0].z = b.z;
  }

  // The living one nearest its line, inside the homing cone and range.
  pickTarget(b, speed, h) {
    let best = null;
    let bestA = h.cone;
    const ix = b.vx / speed;
    const iy = b.vy / speed;
    const iz = b.vz / speed;
    for (const z of this.combat.enemies.living) {
      const tx = z.x - b.x;
      const ty = (z.y ?? 0) + 1 - b.y;
      const tz = z.z - b.z;
      const len = Math.hypot(tx, ty, tz);
      if (len > h.range || len < 0.5) continue;
      const a = Math.acos(Math.max(-1, Math.min(1, (tx * ix + ty * iy + tz * iz) / len)));
      if (a < bestA) {
        bestA = a;
        best = z;
      }
    }
    return best;
  }

  // It bursts at (x, y, z): `hit` is the enemy it struck ({ enemy, part }) or null; scale shrinks a fizzle.
  burst(b, x, y, z, hit, scale = 1) {
    b.active = false;
    const k = this.cfg[b.kind];
    const orb = b.kind === 'orb';
    const power = orb ? 0.45 + 0.55 * b.power : 1;
    const at = { x, y, z };
    const weapon = { id: 'plasma', stagger: k.stagger, knockback: k.knockback * power };
    let direct = null;
    if (hit) {
      direct = hit.enemy;
      const dmg = k.damage * power * partMultiplier(direct, hit.part, this.headshot ?? 2);
      const killed = this.applyHit(direct, dmg, hit.part, weapon, at, at);
      this.bus.emit('weapon:hit', { killed, part: hit.part, melee: false });
    }
    // The burst.
    const r = k.splash * power * scale;
    if (scale >= 1) {
      for (const e of [...this.combat.enemies.living]) {
        if (e === direct) continue;
        const d = Math.hypot(e.x - x, e.z - z, ((e.y ?? 0) + 1 - y) * 0.5);
        const f = splashFalloff(d, r);
        if (f <= 0) continue;
        const killed = this.combat.enemies.damage(e, k.splashDamage * power * f, 'body', weapon, { x: e.x, y: (e.y ?? 0) + 1, z: e.z }, at);
        if (killed || f > 0.5) this.bus.emit('weapon:hit', { killed, part: 'body', melee: false });
      }
      const w = this.witch;
      if (w?.targetable && w !== direct) {
        const f = splashFalloff(Math.hypot(w.x - x, w.z - z), r);
        if (f > 0) w.takeHit(k.splashDamage * power * f, 'body', weapon, at, at);
      }
      const p = this.player.position;
      const fp = splashFalloff(Math.hypot(p.x - x, p.z - z, (p.y + 1 - y) * 0.5), r * 0.8);
      if (fp > 0) this.combat.hurtPlayer(k.splashDamage * power * fp * this.cfg.selfSplash, 1.5);
      this.player.shake(Math.max(0, (orb ? 1.2 : 0.35) * (1 - Math.hypot(p.x - x, p.z - z) / (r * 6))));
      this.combat.enemies.alert(x, z, this.cfg.noise * (orb ? 1.8 : 1));
      if (!hit) this.bus.emit('weapon:impact', { x, y, z, damage: k.splashDamage * power, id: 'plasma' });
    }
    // The look: sparks, a shell and a ground ring, a flash of light, the sound.
    const color = orb ? this.colors.orb : this.colors.bolt;
    const fx = this.combat.fx;
    if (fx?.emit) {
      const c = this.c.copy(color).multiplyScalar(2);
      fx.emit(x, y, z, Math.round((orb ? 40 : 14) * scale), c, (orb ? 7 : 4.5) * scale);
    }
    this.spawnBurst(x, y, z, Math.max(0.6, r), color, orb ? 0.55 : 0.32);
    this.flash?.position.set(x, y + 0.4, z);
    this.flash?.color.copy(color);
    this.flashT = orb ? 0.35 : 0.22;
    this.combat.sfx?.play(orb ? 'plasmaBoom' : 'plasmaBurst', at);
  }

  applyHit(target, amount, part, weapon, at, from) {
    if (this.combat.weapons?.applyHit) return this.combat.weapons.applyHit(target, amount, part, weapon, at, from);
    return this.combat.enemies.damage(target, amount, part, weapon, at, from);
  }

  spawnBurst(x, y, z, r, color, life) {
    const b = this.bursts[this.burstNext];
    this.burstNext = (this.burstNext + 1) % this.bursts.length;
    b.age = 0;
    b.life = life;
    b.r = r;
    b.color.copy(color);
    b.shell.position.set(x, y, z);
    const gy = this.ground.heightAt(x, z);
    b.ring.position.set(x, Math.max(gy + 0.05, Math.min(y, gy + 0.6)), z);
    b.shell.visible = true;
    b.ring.visible = y - gy < 2.5;
  }

  updateBursts(dt) {
    for (const b of this.bursts) {
      if (!b.shell.visible) continue;
      b.age += dt;
      const t = b.age / b.life;
      if (t >= 1) {
        b.shell.visible = false;
        b.ring.visible = false;
        continue;
      }
      const ease = 1 - (1 - t) * (1 - t);
      b.shell.scale.setScalar(b.r * (0.25 + 0.55 * ease));
      b.shell.material.color.copy(b.color).multiplyScalar(3 * (1 - t) * (1 - t));
      b.ring.scale.setScalar(b.r * (0.3 + 1.0 * ease));
      b.ring.material.color.copy(b.color).multiplyScalar(2.2 * (1 - t));
    }
  }

  // Cores, halos and trails into their instanced meshes; the lights to the nearest.
  draw(camera) {
    let n = 0;
    let nt = 0;
    const m = this.m;
    const s = this.s;
    const p = this.p;
    const q = this.q;
    const c = this.c;
    const lit = [];
    for (const b of this.balls) {
      if (!b.active) continue;
      const orb = b.kind === 'orb';
      const k = this.cfg[b.kind];
      const size = k.radius * (orb ? 0.6 + 0.4 * b.power : 1);
      const color = orb ? this.colors.orb : this.colors.bolt;
      const flicker = 0.85 + 0.15 * Math.sin(b.age * 40 + b.x);
      p.set(b.x, b.y, b.z);
      s.setScalar(size * flicker);
      m.compose(p, q, s);
      this.cores.setMatrixAt(n, m);
      this.cores.setColorAt(n, c.copy(color).lerp(this.colors.white, 0.55).multiplyScalar(3.5));
      s.setScalar(size * 2.6 * flicker);
      m.compose(p, q, s);
      this.halos.setMatrixAt(n, m);
      this.halos.setColorAt(n, c.copy(color).multiplyScalar(1.6));
      n++;
      for (let i = 1; i < b.trail.length; i++) {
        const t = b.trail[i];
        const f = 1 - i / b.trail.length;
        p.set(t.x, t.y, t.z);
        s.setScalar(size * (0.35 + 0.9 * f));
        m.compose(p, q, s);
        this.trails.setMatrixAt(nt, m);
        this.trails.setColorAt(nt, c.copy(color).multiplyScalar(1.4 * f * f));
        nt++;
      }
      if (camera) lit.push({ b, d: camera.position.distanceToSquared(p) });
    }
    for (const mesh of [this.cores, this.halos]) {
      mesh.count = n;
      if (n > 0) {
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
    }
    this.trails.count = nt;
    if (nt > 0) {
      this.trails.instanceMatrix.needsUpdate = true;
      if (this.trails.instanceColor) this.trails.instanceColor.needsUpdate = true;
    }
    lit.sort((a, b) => a.d - b.d);
    this.lights.forEach((l, i) => {
      const e = lit[i];
      if (!e) {
        l.intensity = 0;
        return;
      }
      l.position.set(e.b.x, e.b.y, e.b.z);
      l.color.set(e.b.kind === 'orb' ? this.look.orb : this.look.plasma);
      l.intensity = this.cfg.lightIntensity * (e.b.kind === 'orb' ? 2 : 1);
    });
  }

  clear() {
    for (const b of this.balls) b.active = false;
    for (const b of this.bursts) {
      b.shell.visible = false;
      b.ring.visible = false;
    }
    this.draw(null);
    for (const l of this.lights) l.intensity = 0;
    if (this.flash) this.flash.intensity = 0;
  }

  dispose() {
    for (const m of [this.cores, this.halos, this.trails]) {
      m.removeFromParent();
      m.geometry.dispose();
      m.material.dispose();
    }
    for (const b of this.bursts) {
      for (const m of [b.shell, b.ring]) {
        m.removeFromParent();
        m.material.dispose();
      }
    }
    this.bursts[0]?.shell.geometry.dispose();
    this.bursts[0]?.ring.geometry.dispose();
    for (const l of [...this.lights, this.flash].filter(Boolean)) {
      l.removeFromParent();
      l.dispose();
    }
  }
}
