// The witch's placeholder 3D figure (M7; Aaron agreed, and she gets more
// detail in the art pass). A thin shadow creature (Aaron, step 1 test):
// tall and stooped, a ragged cloak with a torn hem, a hood, a crown of
// sticks like antlers, long arms with long fingers. Her whole body is
// unlit near-black, so the torch can't light her or glint off her: she
// reads only as a silhouette, with two small glowing eyes.
//
// Jointed so she can contort: the skirt (it squashes and pools when she
// crouches), the torso (folds at the waist), the head (cranes and twists
// on the neck) and two arms, each with a shoulder, an elbow and a wrist.
// Travelling, she glides (Aaron: walking with swinging arms looked too
// human): no steps, floating a little off the ground with a slow sway,
// folded forward, her cloak trailing and her arms held back, limp at the
// wrists. Planting, she drops into a low crouch folded flat over the
// spot, and her head and arms snap between wrong angles (elbows bending
// the wrong way at times), holding still between jerks.
//
// Ten draw calls (skirt, torso, head, eyes, three per arm) plus the torch
// shadow, only while she's out and near. The ritual ring (two glowing
// rings on the ground) is two more.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Model faces +z, feet at y = 0, about 2.3 m tall before scaling.
const MODEL_HEIGHT = 2.3;
const WAIST = 1.15; // the waist joint's height, standing
const NECK = { y: 0.72, z: 0.06 }; // from the waist
const SHOULDER = { x: 0.21, y: 0.62, z: 0.02 }; // from the waist (x before thinning)
const UPPER_ARM = 0.55; // shoulder to elbow
const FOREARM = 0.5; // elbow to wrist
const HEX_POOL = 8; // most hexes drawn at once

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
    const { upper, fore, hand } = this.armGeometries(thin);
    this.geometries.push(upper, fore, hand);
    const joint = (parent, geometry, y) => {
      const g = new THREE.Group();
      g.rotation.order = 'YXZ';
      g.position.y = y;
      parent.add(g);
      const m = new THREE.Mesh(geometry, this.material);
      m.castShadow = true;
      g.add(m);
      return g;
    };
    // Each arm: { shoulder, elbow, wrist } joints, each hanging down -y.
    this.arms = [-1, 1].map((side) => {
      const shoulder = joint(this.waist, upper, 0);
      shoulder.position.set(SHOULDER.x * thin * side, SHOULDER.y, SHOULDER.z);
      const elbow = joint(shoulder, fore, -UPPER_ARM);
      const wrist = joint(elbow, hand, -FOREARM);
      return { shoulder, elbow, wrist };
    });

    // Narrow slits slanting down to the middle (Aaron: square eyes read
    // as glasses): thin diamonds, tilted.
    const eye = (side) => {
      const g = new THREE.OctahedronGeometry(0.5, 0);
      g.scale(0.055, 0.011, 0.012);
      g.rotateZ(side * 0.42);
      g.translate(side * 0.042, 0.165, 0.176);
      return g;
    };
    const eyes = [eye(-1), eye(1)];
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

    // Step 2: her hexes in flight: a bright core inside a faint halo
    // (unlit, additive, so the bloom makes them glow).
    const hx = c.hex;
    const core = new THREE.SphereGeometry(hx.core, 10, 8);
    const halo = new THREE.SphereGeometry(hx.halo, 12, 8);
    this.geometries.push(core, halo);
    this.hexCoreMaterial = new THREE.MeshBasicMaterial({ color: hx.color, fog: false });
    this.hexHaloMaterial = new THREE.MeshBasicMaterial({ color: hx.color, transparent: true, opacity: hx.haloOpacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    this.hexCores = new THREE.InstancedMesh(core, this.hexCoreMaterial, HEX_POOL);
    this.hexHalos = new THREE.InstancedMesh(halo, this.hexHaloMaterial, HEX_POOL);
    for (const m of [this.hexCores, this.hexHalos]) {
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false;
      m.count = 0;
      scene.add(m);
    }
    this.hexMatrix = new THREE.Matrix4();
    this.time = 0;
    this.motion = 0; // 0 still .. 1 gliding at full speed (eased)
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
    // A tapered cloak whose top is as wide as her chest (Aaron: not a cone
    // narrowing to a point at the waist).
    const cloak = new THREE.CylinderGeometry(0.19, 0.44, 1.4, 9, 3, true);
    const pos = cloak.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) < -0.6) {
        pos.setY(i, pos.getY(i) - rng.range(0, 0.22)); // tatters
        pos.setX(i, pos.getX(i) * rng.range(0.8, 1.2));
        pos.setZ(i, pos.getZ(i) * rng.range(0.8, 1.2));
      }
    }
    cloak.translate(0, 0.72, 0);
    const under = new THREE.CylinderGeometry(0.16, 0.26, 1.1, 6);
    under.translate(0, 0.55, 0);
    return this.merge([cloak.toNonIndexed(), under.toNonIndexed()], thin);
  }

  // Chest and shawl, from the waist up (the waist joint is the origin).
  torsoGeometry(thin) {
    const rng = this.rng;
    const chest = new THREE.BoxGeometry(0.34, 0.66, 0.22);
    chest.translate(0, 0.31, 0);
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

  // An arm in three pieces, each hanging from its joint (the origin) down
  // -y: a thin sleeve to the elbow, a bony forearm to the wrist, and a
  // narrow hand with long fanned fingers.
  armGeometries(thin) {
    const sleeve = new THREE.BoxGeometry(0.085, UPPER_ARM + 0.04, 0.085);
    sleeve.translate(0, -UPPER_ARM / 2, 0);
    const forearm = new THREE.BoxGeometry(0.045, FOREARM + 0.03, 0.045);
    forearm.translate(0, -FOREARM / 2, 0);
    const parts = [];
    const palm = new THREE.BoxGeometry(0.06, 0.09, 0.025);
    palm.translate(0, -0.045, 0);
    parts.push(palm);
    for (let i = 0; i < 4; i++) {
      const f = new THREE.BoxGeometry(0.013, 0.26, 0.013);
      f.translate(0, -0.13, 0);
      f.rotateX(0.25); // curled in
      f.rotateZ((i - 1.5) * 0.14); // fanned
      f.translate((i - 1.5) * 0.017, -0.085, 0.005);
      parts.push(f);
    }
    return { upper: this.merge([sleeve], thin), fore: this.merge([forearm], thin), hand: this.merge(parts, thin) };
  }

  // ---- posing --------------------------------------------------------------------

  // w: the Witch (x, y, z, facing, state, tier, moved, walked,
  // plantProgress, spot). Shown while she's out, near and within the draw distance.
  update(w, dt, cameraPosition, drawDistance) {
    this.time += dt;
    const dist = cameraPosition ? Math.hypot(w.x - cameraPosition.x, w.z - cameraPosition.z) : 0;
    const planting = w.state === 'planting';
    const dead = w.state === 'dead';
    const out = w.state !== 'resting' && (!dead || w.deathTimer < w.wc.deathSeconds);
    this.root.visible = out && w.tier !== 'abstract' && dist <= drawDistance;
    this.ritual.visible = planting && dist <= drawDistance;
    if (this.ritual.visible) this.poseRitual(w);
    if (w.hexes) this.drawHexes(w.hexes.pool);
    if (!this.root.visible) return;
    this.root.position.set(w.x, w.y, w.z);
    this.root.rotation.set(0, w.facing, 0);
    if (dead) this.poseDying(w);
    else if (w.state === 'rising') this.poseRising(w);
    else if (planting) this.poseContorted();
    else if (w.state === 'attacking') this.poseAttacking(w);
    else this.poseGliding(w, dt, w.state === 'fleeing');
    // Hit: she jerks back.
    const f = w.flinch > 0 ? w.flinch / w.wc.flinchSeconds : 0;
    if (f > 0) {
      this.waist.rotation.x -= 0.5 * f;
      this.neck.rotation.z += 0.6 * f;
    }
  }

  // Facing you: upright and still, claws out, head jerking. Then the
  // hex (one arm drawn back and flung forward), the swipe (both arms
  // raised high, then slashed down) or the summoning (arms flung up, head
  // thrown back).
  poseAttacking(w) {
    const c = this.cfg;
    const t = this.time;
    const p = w.actionProgress;
    const ease = (x) => x * x * (3 - 2 * x);
    this.root.position.y += c.glide.hover + Math.sin(t * c.glide.floatSpeed) * c.glide.float;
    this.skirt.scale.set(1, 1, 1);
    this.skirt.rotation.set(Math.sin(t * 3.1) * 0.02, 0, Math.sin(t * 2.3) * 0.03);
    this.waist.position.set(0, WAIST, 0);
    this.waist.rotation.set(0.18, 0, 0);
    const snap = (k, lo, hi) => snapValue(t + k * 0.37, c.snapsPerSecond * 0.6, c.snapTime, k, lo, hi);
    this.neck.rotation.set(-0.1 + snap(20, -0.15, 0.2), snap(21, -0.35, 0.35), snap(22, -0.5, 0.5));
    // Claws out, ready.
    this.arms.forEach(({ shoulder, elbow, wrist }, i) => {
      const side = i === 0 ? -1 : 1;
      shoulder.rotation.set(-0.45 + Math.sin(t * 2 + i) * 0.06, 0, side * 0.55);
      elbow.rotation.set(-0.9, 0, 0);
      wrist.rotation.set(-0.5, 0, 0);
    });
    const [left, right] = this.arms;
    switch (w.action) {
      case 'hex': {
        const e = ease(p);
        right.shoulder.rotation.set(0.9 - e * 2.6, 0, 0.25);
        right.elbow.rotation.set(-1.4 + e * 1.3, 0, 0);
        right.wrist.rotation.set(-0.2 - e * 0.5, 0, 0);
        this.waist.rotation.y = 0.35 - e * 0.6; // winding up, then flinging
        break;
      }
      case 'swipe': {
        const up = !w.struck;
        const e = up ? ease(p) : Math.min(1, p * 5); // the strike is fast
        for (const [arm, side] of [
          [left, -1],
          [right, 1],
        ]) {
          if (up) arm.shoulder.rotation.set(-0.45 - e * 2.3, 0, side * (0.55 - e * 0.1));
          else arm.shoulder.rotation.set(-2.75 + e * 2.2, 0, side * 0.25);
          arm.elbow.rotation.set(up ? -0.9 + e * 0.4 : -0.2, 0, 0);
          arm.wrist.rotation.set(-0.6, 0, 0);
        }
        this.waist.rotation.x = up ? 0.18 - e * 0.3 : -0.12 + e * 0.8;
        break;
      }
      case 'summon': {
        const e = ease(Math.min(1, p * 2));
        const tremble = Math.sin(t * 30) * 0.05;
        for (const [arm, side] of [
          [left, -1],
          [right, 1],
        ]) {
          arm.shoulder.rotation.set(-0.45 - e * 2.45 + tremble * side, 0, side * (0.55 + e * 0.35));
          arm.elbow.rotation.set(-0.9 + e * 0.7, 0, 0);
          arm.wrist.rotation.set(0.3 + tremble, 0, 0);
        }
        this.waist.rotation.x = 0.18 - e * 0.45;
        this.neck.rotation.x = -0.1 - e * 0.7;
        break;
      }
      default:
        break;
    }
  }

  // The final battle: she claws up out of the wreck of her hut, arms
  // flung up, head thrown back, jerking.
  poseRising(w) {
    const t = this.time;
    const k = w.riseProgress;
    this.skirt.scale.set(1, 1, 1);
    this.skirt.rotation.set(0, 0, 0);
    this.waist.position.set(0, WAIST, 0);
    this.waist.rotation.set(-0.35 + Math.sin(t * 7) * 0.05, 0, Math.sin(t * 3) * 0.1);
    const snap = (key, lo, hi) => snapValue(t + key * 0.37, this.cfg.snapsPerSecond * 1.5, this.cfg.snapTime, key, lo, hi);
    this.neck.rotation.set(-0.8 + snap(30, -0.2, 0.3), snap(31, -0.5, 0.5), snap(32, -0.8, 0.8));
    this.arms.forEach(({ shoulder, elbow, wrist }, i) => {
      const side = i === 0 ? -1 : 1;
      shoulder.rotation.set(-2.9 + Math.sin(t * 30 + i) * 0.06, 0, side * 0.75);
      elbow.rotation.set(snap(33 + i, -0.6, 0.6), 0, 0);
      wrist.rotation.set(snap(35 + i, -0.8, 0.8), 0, 0);
    });
    this.root.position.y -= (1 - k) * this.cfg.height * 1.1;
  }

  // Killed: she buckles, folds over and sinks into the ground.
  poseDying(w) {
    const k = Math.min(1, w.deathTimer / (w.wc.deathSeconds * 0.4));
    const sink = Math.max(0, (w.deathTimer - w.wc.deathSeconds * 0.4) / (w.wc.deathSeconds * 0.6));
    const squash = 1 - k * 0.6;
    this.skirt.scale.set(1 + k * 0.5, squash, 1 + k * 0.5);
    this.skirt.rotation.set(0, 0, 0);
    this.waist.position.set(0, WAIST * squash * 0.9, 0);
    this.waist.rotation.set(-0.4 + k * 1.9, 0, k * 0.3);
    this.neck.rotation.set(0.6 * k, 0, 1.1 * k);
    this.arms.forEach(({ shoulder, elbow, wrist }, i) => {
      const side = i === 0 ? -1 : 1;
      shoulder.rotation.set(-2.6 * (1 - k) - 0.3, 0, side * (0.9 - k * 0.5));
      elbow.rotation.set(1.2 * k, 0, 0);
      wrist.rotation.set(1 * k, 0, 0);
    });
    this.root.position.y -= sink * 2.2;
  }

  // Her hexes in flight.
  drawHexes(pool) {
    let n = 0;
    const m = this.hexMatrix;
    for (const h of pool) {
      if (!h.active) continue;
      const pulse = 0.85 + Math.sin(this.time * 25 + n) * 0.15;
      m.makeScale(pulse, pulse, pulse).setPosition(h.x, h.y, h.z);
      this.hexCores.setMatrixAt(n, m);
      this.hexHalos.setMatrixAt(n, m);
      n++;
      if (n >= HEX_POOL) break;
    }
    this.hexCores.count = n;
    this.hexHalos.count = n;
    if (n > 0) {
      this.hexCores.instanceMatrix.needsUpdate = true;
      this.hexHalos.instanceMatrix.needsUpdate = true;
    }
  }

  // Gliding: no steps. Floating a little off the ground with a slow
  // sway, folded forward, head up and still, the cloak trailing behind
  // as she moves, arms held back and limp at the wrists.
  // fleeing: folded further forward, streaming behind her.
  poseGliding(w, dt, fleeing = false) {
    const c = this.cfg;
    const g = c.glide;
    const t = this.time;
    // How fast she's moving (0..1), eased so stopping and starting is smooth.
    const speed = fleeing ? 1 : dt > 0 ? Math.min(1, w.moved / dt / g.fullSpeed) : 0;
    this.motion += (speed - this.motion) * Math.min(1, dt * 4);
    const m = this.motion;
    this.root.position.y += g.hover + Math.sin(t * g.floatSpeed) * g.float;
    this.skirt.scale.set(1, 1, 1);
    // The hem trails behind (tilting the skirt back) and ripples.
    this.skirt.rotation.set(-g.trail * m + Math.sin(t * 3.1) * 0.02, 0, Math.sin(t * 2.3) * 0.03);
    this.waist.position.set(0, WAIST, 0);
    this.waist.rotation.set(c.stoop + m * 0.12 + (fleeing ? 0.25 : 0), 0, Math.sin(t * g.floatSpeed * 0.5) * 0.05);
    this.neck.rotation.set(-c.stoop * 0.9 - m * 0.1, 0, 0);
    // Arms swept back, slightly out, barely moving; hands hanging limp.
    const drift = Math.sin(t * 1.7) * 0.05;
    this.arms.forEach(({ shoulder, elbow, wrist }, i) => {
      const side = i === 0 ? -1 : 1;
      shoulder.rotation.set(0.45 + m * 0.35 + drift * side, 0, side * (0.18 + m * 0.1));
      elbow.rotation.set(-0.35 - m * 0.2, 0, 0);
      wrist.rotation.set(0.7 + Math.sin(t * 2 + i) * 0.08, 0, 0);
    });
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
    // Arms: in the waist's frame, -(fold + 1.35) about x points the upper
    // arm forward, just off the ground; splayed out like a spider's legs.
    // The elbow bends the forearm down to the ground (and now and then
    // the wrong way, up); the wrist curls the claw in or snaps back.
    const reach = -(c.fold + 1.35);
    this.arms.forEach(({ shoulder, elbow, wrist }, i) => {
      const side = i === 0 ? -1 : 1;
      const k = 7 + i * 6;
      shoulder.rotation.set(reach + snap(k, -0.7, 0.6, 0.8 - i * 0.1), snap(k + 1, -0.5, 0.5), side * 0.8 + snap(k + 2, -0.5, 0.5));
      elbow.rotation.set(snap(k + 3, -0.9, 1.7, 0.9 + i * 0.15), snap(k + 4, -0.4, 0.4), 0);
      wrist.rotation.set(snap(k + 5, -0.9, 1.2, 1.2), 0, 0);
    });
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
    this.hexCores.removeFromParent();
    this.hexHalos.removeFromParent();
    this.hexCoreMaterial.dispose();
    this.hexHaloMaterial.dispose();
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
