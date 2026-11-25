// The Pile's look (Nov 25; ai/Pile.js): the bodies in it as the game's own zombie sprites (a second ZombieRenderer
// drawing from the game's atlas), heaped in a swirling mound round a green glowing core and turning, in the frames
// that look worst (staggered, falling, the lunge); the bodies in the air and the ones being dragged back in, the same
// way; the army charge on its surface, blinking; the seams torn open after a blast; and the green tendrils.
// One draw call for every body, a few small meshes for the rest.

import * as THREE from 'three';
import { ZombieRenderer } from './ZombieRenderer.js';
import { ZOMBIE_FRAMES } from '../ai/Zombie.js';

const LIMP = [ZOMBIE_FRAMES.stagger, ZOMBIE_FRAMES.dying[0], ZOMBIE_FRAMES.dying[1], ZOMBIE_FRAMES.dying[2], ZOMBIE_FRAMES.attackStrike, ZOMBIE_FRAMES.strikeLunge, ZOMBIE_FRAMES.strikeRear];
const GOLDEN = 2.399963; // radians: spreads the bodies evenly round the mound

export class PileRenderer {
  // ctx: { scene, zombieCfg (config.zombies), share (the game's ZombieRenderer), ground, camera () => { x, z } }.
  constructor(pile, ctx) {
    this.pile = pile;
    this.ctx = ctx;
    const look = pile.cfg.look;
    const cap = pile.cfg.bodies + pile.cfg.lastGroup + 24;
    this.sprites = new ZombieRenderer(ctx.zombieCfg);
    this.sprites.init(ctx.scene, cap, ctx.share);
    this.fakes = Array.from({ length: cap }, (_, i) => ({ active: false, kind: 'zombie', tier: 'active', x: 0, y: 0, z: 0, sink: 0, frame: 0, facing: 0, flash: 0, lit: 0, variant: i % 4 === 0 ? 'army' : 'citizen', lookSeed: 1000 + i * 7 }));
    this.group = new THREE.Group();
    this.group.visible = false;
    ctx.scene.add(this.group);
    this.core = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: look.core, transparent: true, opacity: 0.55, depthWrite: false }));
    this.light = new THREE.PointLight(look.coreLight, look.coreIntensity, look.coreReach, 1.6);
    this.group.add(this.core, this.light);
    // The charge: a boxy army pack, a red light on it.
    this.charge = new THREE.Group();
    this.charge.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.34, 0.26), new THREE.MeshLambertMaterial({ color: look.charge })));
    this.chargeLamp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: look.chargeLight }));
    this.chargeLamp.position.set(0, 0.2, 0.1);
    this.charge.add(this.chargeLamp);
    this.group.add(this.charge);
    // The seams: bright green tears.
    const seamGeo = new THREE.SphereGeometry(1, 10, 8);
    const seamMat = new THREE.MeshBasicMaterial({ color: look.seam });
    this.seams = [0, 1, 2].map(() => {
      const m = new THREE.Mesh(seamGeo, seamMat);
      this.group.add(m);
      return m;
    });
    // The tendrils (and the lash, and the lash's coil): stretched green cylinders, a glowing bulb at each tip.
    // Nov 25 (pass 1): thicker and brighter, to be seen and shot at range in daylight.
    const tGeo = new THREE.CylinderGeometry(0.12, 0.2, 1, 7).translate(0, 0.5, 0);
    const tMat = new THREE.MeshBasicMaterial({ color: look.tendril });
    const tipGeo = new THREE.SphereGeometry(0.26, 10, 8);
    const tipMat = new THREE.MeshBasicMaterial({ color: look.seam });
    this.tendrils = Array.from({ length: pile.cfg.tendrils.max + 2 }, () => {
      const m = new THREE.Mesh(tGeo, tMat);
      m.visible = false;
      const tip = new THREE.Mesh(tipGeo, tipMat);
      tip.visible = false;
      m.userData.tip = tip;
      this.group.add(m, tip);
      return m;
    });
    // Its tells (pass 1): a ring on the ground growing out to the slam's reach; a ring where the lash will land.
    const ringMat = (hex) => new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false });
    this.slamRing = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 40).rotateX(-Math.PI / 2), ringMat(look.warn));
    this.lashRing = new THREE.Mesh(new THREE.RingGeometry(0.75, 1, 28).rotateX(-Math.PI / 2), ringMat(look.warn));
    this.slamRing.visible = this.lashRing.visible = false;
    this.group.add(this.slamRing, this.lashRing);
    this.v = new THREE.Vector3();
    this.up = new THREE.Vector3(0, 1, 0);
  }

  heightAt(x, z) {
    return this.ctx.ground?.heightAt?.(x, z) ?? 0;
  }

  update(dt) {
    const p = this.pile;
    const live = p.phase === 'emerge' || p.phase === 'fight';
    let n = 0;
    const put = (x, y, z, i, frame, facing) => {
      if (n >= this.fakes.length) return;
      const f = this.fakes[n++];
      f.active = true;
      f.x = x;
      f.y = y;
      f.z = z;
      f.frame = frame;
      f.facing = facing;
      f.flash = p.flash > 0 ? p.flash : 0;
      f.lookSeed = 1000 + i * 7;
      f.variant = i % 4 === 0 ? 'army' : 'citizen';
    };
    // Pass 2: its death, the core swelling and going out in a flash.
    const dying = p.phase === 'dead' && p.deadT < p.cfg.fx.deathSeconds;
    this.group.visible = live || dying;
    if (dying) {
      const k = p.deadT / p.cfg.fx.deathSeconds;
      const g = this.heightAt(p.x, p.z);
      const r = p.deathRadius ?? 1.5;
      this.core.position.set(p.x, g + r * 0.8, p.z);
      this.core.scale.setScalar(r * (0.6 + 1.6 * Math.sin(Math.min(1, k * 1.4) * Math.PI * 0.5)) * (1 - k * k));
      this.core.material.opacity = 0.8 * (1 - k);
      this.light.position.copy(this.core.position);
      this.light.intensity = p.cfg.look.coreIntensity * 4 * (1 - k);
      for (const m of [this.charge, this.slamRing, this.lashRing, ...this.seams]) m.visible = false;
      for (const t of this.tendrils) {
        t.visible = false;
        t.userData.tip.visible = false;
      }
    }
    if (live) {
      const r = p.radius;
      const g = this.heightAt(p.x, p.z);
      // Coming up out of the ground.
      const rise = p.phase === 'emerge' ? Math.min(1, p.t / p.cfg.emergeSeconds) : 1;
      const sunk = (1 - rise) * r * 2.2;
      // Its tells (pass 1). The attack winding up, 0..1.
      const a = p.attack;
      const wind = a && a.state === 'windup' ? Math.min(1, a.t / p.cfg.attacks[a.kind].windup) : 0;
      const pp = p.player.position;
      const toTom = Math.atan2(pp.x - p.x, pp.z - p.z);
      // The lunge: it draws back away from him, low; the slam: it heaves up.
      let ox = 0;
      let oz = 0;
      let lift = 0;
      if (a?.kind === 'lunge' && a.state === 'windup') {
        ox = -Math.sin(toTom) * wind * 0.9;
        oz = -Math.cos(toTom) * wind * 0.9;
        lift = -wind * 0.35;
      } else if (a?.kind === 'slam' && a.state === 'windup') lift = wind * wind * r * 0.45;
      const slam = a?.kind === 'slam' && a.state === 'windup';
      this.slamRing.visible = slam;
      if (slam) {
        const reach = (r + p.cfg.attacks.slam.reach) * (0.25 + 0.75 * wind);
        this.slamRing.position.set(p.x, g + 0.22, p.z); // (over the road's surface)
        this.slamRing.scale.setScalar(reach);
        this.slamRing.material.opacity = 0.25 + 0.4 * wind + Math.sin(p.t * 20) * 0.1;
      }
      const lashing = a?.kind === 'lash' && a.state === 'windup';
      this.lashRing.visible = lashing;
      if (lashing) {
        const d = p.cfg.attacks.lash.dodge;
        this.lashRing.position.set(a.at.x, this.heightAt(a.at.x, a.at.z) + 0.22, a.at.z);
        this.lashRing.scale.setScalar(d * (1.4 - 0.4 * wind));
        this.lashRing.material.opacity = 0.3 + 0.4 * wind;
      }
      // The mound: bodies spread over a dome, turning one way low and the other high, bobbing.
      const N = p.bodies;
      for (let i = 0; i < N; i++) {
        const u = (i + 0.5) / Math.max(1, N); // 0 at the bottom ring, 1 at the top
        const ring = Math.sqrt(1 - u * u * 0.85) * r * 0.85;
        const dir = i % 2 ? 1 : -1;
        const ang = i * GOLDEN + p.spin * dir * (1.2 - u * 0.5);
        const bob = Math.sin(p.t * 2.3 + i) * 0.12;
        const y = g - sunk + u * r * 1.35 - 0.2 + bob + lift * u;
        const frame = LIMP[(i + Math.floor(p.t * 1.5 + i * 0.37)) % LIMP.length];
        put(p.x + ox + Math.sin(ang) * ring, y, p.z + oz + Math.cos(ang) * ring, i, frame, ang + Math.PI * 0.5 * dir + p.t * dir);
      }
      // The fling: a body held up over the top as it winds up.
      if (a?.kind === 'fling' && a.state === 'windup') put(p.x, g + r * 1.5 + wind * 0.8, p.z, 400, ZOMBIE_FRAMES.dying[0], p.t * 6);
      this.core.position.set(p.x + ox, g - sunk + r * 0.8 + lift * 0.5, p.z + oz);
      this.core.scale.setScalar(r * 0.55 * (1 + Math.sin(p.t * 5) * 0.06));
      this.core.material.opacity = 0.35 + (p.cycle === 'reel' ? 0.35 : 0) + Math.sin(p.t * 3) * 0.08 + wind * 0.25;
      this.light.position.copy(this.core.position);
      this.light.intensity = p.cfg.look.coreIntensity * (p.cycle === 'reel' ? 1.8 : 1);
      // The charge.
      const ch = p.phase === 'fight' && p.cycle === 'charge';
      this.charge.visible = ch;
      if (ch) {
        this.charge.position.set(p.charge.x, p.charge.y, p.charge.z);
        this.charge.rotation.y = Math.atan2(p.charge.x - p.x, p.charge.z - p.z);
        this.chargeLamp.visible = Math.sin(p.cycleT * (6 + p.cycleT * 2)) > 0;
      }
      // The seams.
      const reel = p.phase === 'fight' && p.cycle === 'reel';
      this.seams.forEach((m, i) => {
        m.visible = reel;
        if (!reel) return;
        const s = p.seams[i];
        m.position.set(s.x, s.y + 0.3, s.z);
        m.scale.set(0.22, 0.4 + Math.sin(p.t * 9 + i) * 0.08, 0.22);
      });
      // The tendrils, and the lash at Tom.
      let k = 0;
      const base = { x: p.x, y: g + r * 0.6, z: p.z };
      for (const t of p.tendrils) this.stretch(this.tendrils[k++], base, { x: t.head.x, y: this.heightAt(t.head.x, t.head.z) + 0.6, z: t.head.z });
      if (lashing) {
        // The lash coiling up off its top before it strikes.
        const top = { x: p.x, y: g + r * 1.4, z: p.z };
        this.stretch(this.tendrils[k++], base, { x: top.x + Math.sin(p.t * 9) * 0.8, y: top.y + 1.2 + wind, z: top.z + Math.cos(p.t * 9) * 0.8 });
      }
      if (p.lash) {
        p.lash.t += dt;
        if (p.lash.t < 0.35) this.stretch(this.tendrils[k++], base, { x: p.lash.to.x, y: this.heightAt(p.lash.to.x, p.lash.to.z) + 1.0, z: p.lash.to.z });
        else p.lash = null;
      }
      for (; k < this.tendrils.length; k++) {
        this.tendrils[k].visible = false;
        this.tendrils[k].userData.tip.visible = false;
      }
      // Bodies on the end of a tendril.
      p.tendrils.forEach((t, i) => {
        if (t.body) put(t.body.x, this.heightAt(t.body.x, t.body.z) + 0.15, t.body.z, 200 + i, ZOMBIE_FRAMES.dying[1], p.t * 3);
      });
    }
    // Bodies in the air (also after it's dead: the last group coming down).
    p.flying.forEach((f, i) => put(f.x, f.y, f.z, 300 + i, LIMP[(i + Math.floor(f.t * 8)) % LIMP.length], f.t * 9 + i));
    for (let i = n; i < this.fakes.length; i++) this.fakes[i].active = false;
    const cam = this.ctx.camera?.() ?? { x: p.x ?? 0, z: p.z ?? 0 };
    this.sprites.update(this.fakes, cam, Infinity);
  }

  // A cylinder from a to b.
  stretch(m, a, b) {
    if (!m) return;
    this.v.set(b.x - a.x, b.y - a.y, b.z - a.z);
    const len = this.v.length();
    if (len < 0.01) {
      m.visible = false;
      if (m.userData.tip) m.userData.tip.visible = false;
      return;
    }
    m.visible = true;
    m.position.set(a.x, a.y, a.z);
    m.scale.set(1, len, 1);
    m.quaternion.setFromUnitVectors(this.up, this.v.normalize());
    const tip = m.userData.tip;
    if (tip) {
      tip.visible = true;
      tip.position.set(b.x, b.y, b.z);
      tip.scale.setScalar(1 + Math.sin(this.pile.t * 12) * 0.15);
    }
  }

  dispose() {
    this.sprites.mesh.removeFromParent();
    this.sprites.mesh.geometry.dispose();
    this.sprites.material.dispose();
    this.sprites.depthMaterial.dispose();
    this.group.removeFromParent();
    this.group.traverse((o) => {
      o.geometry?.dispose?.();
      o.material?.dispose?.();
    });
  }
}
