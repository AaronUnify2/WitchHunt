// The witch's placeholder 3D figure (M7; Aaron agreed, and she gets more
// detail in the art pass). A thin shadow creature (Aaron, step 1 test):
// tall and stooped, a ragged cloak with a torn hem, a hood, a crown of
// sticks like antlers, long arms with long fingers. Her whole body is
// unlit near-black, so the torch can't light her or glint off her: she
// reads only as a silhouette, with two small glowing eyes.
//
// Jointed so she can contort: the skirt (it squashes and pools when she
// crouches), the torso (folds at the waist), the head (cranes and twists
// on the neck) and two arms (swing from the shoulders). Running, she's
// folded forward with her arms trailing. Planting, she drops into a low
// crouch folded flat over the spot, and her head and arms snap between
// wrong angles, holding still between jerks.
//
// Six draw calls (skirt, torso, head, eyes, two arms) plus the torch
// shadow, only while she's out and near. The ritual ring (two glowing
// rings on the ground) is two more.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Model faces +z, feet at y = 0, about 2.3 m tall before scaling.
const MODEL_HEIGHT = 2.3;
const WAIST = 1.15; // the waist joint's height, standing
const NECK = { y: 0.72, z: 0.06 }; // from the waist
const SHOULDER = { x: 0.21, y: 0.62, z: 0.02 }; // from the waist (x before thinning)

export class WitchRenderer {
  constructor(lookConfig, rng) {
    this.cfg = lookConfig;
    this.rng = rng;
  }

  init(scene) {
    const c = this.cfg;
    const thin = c.thinness;
    this.root = new THREE.Group();
    this.root.visible = false;
    this.root.scale.setScalar(c.height / MODEL_HEIGHT);
    scene.add(this.root);
    // Unlit: the torch can't light her or glint off her. Fog still applies.
    this.material = new THREE.MeshBasicMaterial({ color: c.shadow });

    this.geometries = [];
    const mesh = (geometry, parent) => {
      this.geometries.push(geometry);
      const m = new THREE.Mesh(geometry, this.material);
      m.castShadow = true;
      parent.add(m);
      return m;
    };
    this.skirt = mesh(this.skirtGeometry(thin), this.root);
    this.waist = new THREE.Group();
    this.waist.rotation.order = 'YXZ';
    this.root.add(this.waist);
    mesh(this.torsoGeometry(thin), this.waist);
    this.neck = new THREE.Group();
    this.neck.rotation.order = 'YXZ';
    this.neck.position.set(0, NECK.y, NECK.z);
    this.waist.add(this.neck);
    mesh(this.headGeometry(thin), this.neck);
    const armGeometry = this.armGeometry(thin);
    this.arms = [-1, 1].map((side) => {
      const shoulder = new THREE.Group();
      shoulder.rotation.order = 'YXZ';
      shoulder.position.set(SHOULDER.x * thin * side, SHOULDER.y, SHOULDER.z);
      this.waist.add(shoulder);
      const arm = new THREE.Mesh(armGeometry, this.material);
      arm.castShadow = true;
      shoulder.add(arm);
      return shoulder;
    });
    this.geometries.push(armGeometry);

    const eye = (x) => {
      const g = new THREE.BoxGeometry(0.05, 0.03, 0.02);
      g.translate(x, 0.17, 0.175);
      return g;
    };
    const eyes = [eye(-0.04), eye(0.04)];
    const eyeGeometry = mergeGeometries(eyes);
    for (const g of eyes) g.dispose();
    this.geometries.push(eyeGeometry);
    this.eyeMaterial = new THREE.MeshBasicMaterial({ color: c.eyes });
    this.neck.add(new THREE.Mesh(eyeGeometry, this.eyeMaterial));

    // The ritual: two rings flat on the ground, glowing (unlit, additive,
    // seen through the fog so it reads from further away through the trees).
    const r = c.ritual;
    this.ringMaterial = new THREE.MeshBasicMaterial({ color: r.color, transparent: true, opacity: r.opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide });
    this.ritual = new THREE.Group();
    this.ritual.visible = false;
    const outer = new THREE.RingGeometry(r.radius * 0.88, r.radius, 40);
    const inner = new THREE.RingGeometry(r.radius * 0.38, r.radius * 0.46, 5); // a pentagon
    outer.rotateX(-Math.PI / 2);
    inner.rotateX(-Math.PI / 2);
    this.geometries.push(outer, inner);
    this.innerRing = new THREE.Mesh(inner, this.ringMaterial);
    this.ritual.add(new THREE.Mesh(outer, this.ringMaterial), this.innerRing);
    scene.add(this.ritual);
    this.time = 0;
  }

  // ---- the model ---------------------------------------------------------------

  // Merge parts into one geometry, thinned in width and depth.
  merge(parts, thin) {
    for (const g of parts) g.scale(thin, 1, thin);
    const merged = mergeGeometries(parts);
    for (const g of parts) g.dispose();
    return merged;
  }

  // The cloak from the ground to the waist: an open cone with a torn hem.
  skirtGeometry(thin) {
    const rng = this.rng;
    const cloak = new THREE.ConeGeometry(0.44, 1.4, 9, 3, true);
    const pos = cloak.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) < -0.6) {
        pos.setY(i, pos.getY(i) - rng.range(0, 0.22)); // tatters
        pos.setX(i, pos.getX(i) * rng.range(0.8, 1.2));
        pos.setZ(i, pos.getZ(i) * rng.range(0.8, 1.2));
      }
    }
    cloak.translate(0, 0.72, 0);
    const under = new THREE.CylinderGeometry(0.12, 0.26, 1.1, 6);
    under.translate(0, 0.55, 0);
    return this.merge([cloak.toNonIndexed(), under.toNonIndexed()], thin);
  }

  // Chest and shawl, from the waist up (the waist joint is the origin).
  torsoGeometry(thin) {
    const rng = this.rng;
    const chest = new THREE.BoxGeometry(0.34, 0.6, 0.2);
    chest.translate(0, 0.36, 0);
    const shawl = new THREE.ConeGeometry(0.33, 0.62, 8, 2, true);
    const sp = shawl.attributes.position;
    for (let i = 0; i < sp.count; i++) if (sp.getY(i) < -0.2) sp.setY(i, sp.getY(i) - rng.range(0, 0.18));
    shawl.translate(0, 0.42, 0.02);
    const neck = new THREE.BoxGeometry(0.06, 0.16, 0.06);
    neck.translate(0, 0.68, 0.05);
    return this.merge([chest.toNonIndexed(), shawl.toNonIndexed(), neck.toNonIndexed()], thin);
  }

  // Head, jaw, hood and the crown of sticks (the neck joint is the origin).
  headGeometry(thin) {
    const rng = this.rng;
    const parts = [];
    const head = new THREE.BoxGeometry(0.15, 0.25, 0.18);
    head.translate(0, 0.14, 0.08);
    parts.push(head);
    const jaw = new THREE.BoxGeometry(0.09, 0.1, 0.12);
    jaw.translate(0, 0.0, 0.11);
    parts.push(jaw);
    const hood = new THREE.ConeGeometry(0.16, 0.48, 6, 1, true);
    hood.rotateX(-0.45);
    hood.translate(0, 0.27, 0.02);
    parts.push(hood);
    // The crown: sticks splayed up and out like antlers (kept full width:
    // the silhouette's best feature).
    const sticks = 7;
    const crown = [];
    for (let i = 0; i < sticks; i++) {
      const t = i / (sticks - 1) - 0.5; // -0.5..0.5, left to right
      const len = rng.range(0.35, 0.6) * (1 - Math.abs(t) * 0.5);
      const a = -t * 2.2 + rng.range(-0.15, 0.15); // splay, about z
      const tilt = rng.range(-0.3, 0.1);
      const g = new THREE.BoxGeometry(0.025, len, 0.025);
      g.translate(0, len / 2, 0);
      g.rotateZ(a);
      g.rotateX(tilt);
      g.translate(t * 0.12, 0.27, 0.06);
      crown.push(g);
      // A forked tine from halfway up most of them, splayed further out.
      if (Math.abs(t) > 0.1) {
        const f = new THREE.BoxGeometry(0.018, len * 0.4, 0.018);
        f.translate(0, len * 0.2, 0);
        f.rotateZ(a * 1.6);
        f.rotateX(tilt);
        f.translate(t * 0.12 - Math.sin(a) * len * 0.5, 0.27 + Math.cos(a) * len * 0.5, 0.06);
        crown.push(f);
      }
    }
    const body = parts.map((g) => g.toNonIndexed());
    for (const g of parts) g.dispose();
    for (const g of body) g.scale(thin, 1, thin);
    const all = [...body, ...crown.map((g) => g.toNonIndexed())];
    for (const g of crown) g.dispose();
    const merged = mergeGeometries(all);
    for (const g of all) g.dispose();
    return merged;
  }

  // One arm hanging from the shoulder (origin) down -y: a thin sleeve, a
  // bony forearm and long fingers.
  armGeometry(thin) {
    const parts = [];
    const sleeve = new THREE.BoxGeometry(0.09, 0.6, 0.09);
    sleeve.translate(0, -0.3, 0);
    parts.push(sleeve);
    const forearm = new THREE.BoxGeometry(0.045, 0.46, 0.045);
    forearm.translate(0, -0.82, 0);
    parts.push(forearm);
    for (let i = 0; i < 4; i++) {
      const f = new THREE.BoxGeometry(0.014, 0.28, 0.014);
      f.rotateX(0.18);
      f.rotateZ((i - 1.5) * 0.12); // fanned
      f.translate((i - 1.5) * 0.02, -1.18, 0.02);
      parts.push(f);
    }
    return this.merge(parts, thin);
  }

  // ---- posing --------------------------------------------------------------------

  // w: the Witch (x, y, z, facing, state, tier, moved, walked,
  // plantProgress, spot). Shown while she's out, near and within the draw distance.
  update(w, dt, cameraPosition, drawDistance) {
    this.time += dt;
    const dist = cameraPosition ? Math.hypot(w.x - cameraPosition.x, w.z - cameraPosition.z) : 0;
    const planting = w.state === 'planting';
    this.root.visible = w.state !== 'resting' && w.tier !== 'abstract' && dist <= drawDistance;
    this.ritual.visible = planting && dist <= drawDistance;
    if (this.ritual.visible) this.poseRitual(w);
    if (!this.root.visible) return;
    this.root.position.set(w.x, w.y, w.z);
    this.root.rotation.set(0, w.facing, 0);
    if (planting) this.poseContorted();
    else this.poseRunning(w);
  }

  // Folded forward, head up to see ahead, arms trailing and swinging.
  poseRunning(w) {
    const c = this.cfg;
    const phase = (w.walked / c.stride) * Math.PI;
    const bob = Math.abs(Math.sin(phase)) * c.runBob;
    const swing = Math.sin(phase) * 0.7;
    this.skirt.scale.set(1, 1, 1);
    this.skirt.rotation.z = Math.sin(phase) * 0.05;
    this.waist.position.set(0, WAIST + bob, 0);
    this.waist.rotation.set(c.stoop, 0, Math.sin(phase) * 0.06);
    this.neck.rotation.set(-c.stoop * 0.8, 0, 0);
    const [left, right] = this.arms;
    left.rotation.set(0.35 + swing, 0, -0.1);
    right.rotation.set(0.35 - swing, 0, 0.1);
  }

  // Crouched low and folded flat over the spot. The head cranes up and
  // twists too far; the arms claw at the ground or fling up behind her;
  // every joint jerks to a new angle and holds.
  poseContorted() {
    const c = this.cfg;
    const t = this.time;
    const rate = c.snapsPerSecond;
    const snap = (k, lo, hi, speed = 1) => snapValue(t * speed + k * 0.37, rate, c.snapTime, k, lo, hi);
    const breath = Math.sin(t * 2.2) * 0.04;
    const squash = c.crouch;
    // The cloak puddles out as she sinks.
    this.skirt.scale.set(1 + (1 - squash) * 0.7, squash, 1 + (1 - squash) * 0.7);
    this.skirt.rotation.z = 0;
    this.waist.position.set(0, WAIST * squash * 0.85, 0.12);
    // Folded flat, now and then arching back with a jerk.
    this.waist.rotation.set(c.fold + breath + snap(1, -0.35, 0.15), snap(2, -0.25, 0.25), snap(3, -0.2, 0.2));
    // The head: craned up off the folded body, rolled and twisted too far.
    this.neck.rotation.set(-c.fold - 0.25 + snap(4, -0.3, 0.4, 1.3), snap(5, -1.0, 1.0, 0.9), snap(6, -1.2, 1.2, 1.1));
    // Arms: in the waist's frame, -(fold + 1.35) about x points them
    // forward, just off the ground. They splay out like a spider's legs
    // and jerk between reaching up ahead, clawing low and spreading wide.
    const [left, right] = this.arms;
    const reach = -(c.fold + 1.35);
    left.rotation.set(reach + snap(7, -0.6, 0.75, 0.8), snap(8, -0.5, 0.5), -0.75 + snap(9, -0.6, 0.45));
    right.rotation.set(reach + snap(10, -0.6, 0.75, 0.7), snap(11, -0.5, 0.5), 0.75 + snap(12, -0.45, 0.6));
  }

  // The rings under her: they pulse, and the inner one turns and grows
  // as the ritual goes on.
  poseRitual(w) {
    const r = this.cfg.ritual;
    const at = w.spot ?? w;
    this.ritual.position.set(at.x, w.y + 0.06, at.z);
    const pulse = 0.65 + 0.35 * Math.sin(this.time * r.pulse * Math.PI * 2);
    this.ringMaterial.opacity = r.opacity * pulse;
    this.innerRing.rotation.y = this.time * 0.6;
    this.innerRing.scale.setScalar(0.6 + w.plantProgress * 1.4);
  }

  dispose() {
    this.root.removeFromParent();
    this.ritual.removeFromParent();
    for (const g of this.geometries) g.dispose();
    this.material.dispose();
    this.eyeMaterial.dispose();
    this.ringMaterial.dispose();
  }
}

// A value that jumps to a new random target `rate` times a second: it
// moves for the first `snapTime` of each interval (eased), then holds.
// Cosmetic (hashed from the time, not the game's RNG). Exported for tests.
export function snapValue(t, rate, snapTime, key, lo, hi) {
  const x = t * rate;
  const i = Math.floor(x);
  const f = x - i;
  const from = lo + (hi - lo) * hash(i - 1, key);
  const to = lo + (hi - lo) * hash(i, key);
  const k = Math.min(1, f / Math.max(1e-6, snapTime));
  const e = k * k * (3 - 2 * k);
  return from + (to - from) * e;
}

function hash(i, key) {
  const s = Math.sin(i * 12.9898 + key * 78.233) * 43758.5453;
  return s - Math.floor(s);
}
