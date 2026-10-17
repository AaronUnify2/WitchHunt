// The witch's placeholder 3D figure (M7; Aaron agreed, and she gets more
// detail in the art pass). A thin shadow creature (Aaron, step 1 test):
// tall and thin, a ragged cloak with a torn hem, a hood, a crown of
// sticks like antlers, long arms with long fingers. Her whole body is
// unlit near-black, so the torch can't light her or glint off her: she
// reads only as a silhouette, with two small glowing eyes.
//
// Jointed so she can contort: the skirt (it squashes and pools when she
// crouches), the torso (folds at the waist), the head (cranes and twists
// on the neck) and two arms, each with a shoulder, an elbow and a wrist.
// Travelling, she glides (Aaron: walking with swinging arms looked too
// human): no steps, floating a little off the ground with a slow sway,
// upright and tall (Aaron, Session 10), her cloak trailing and her arms
// hanging straight and limp. Planting, she drops into a low crouch folded flat over the
// spot, and her head and arms snap between wrong angles (elbows bending
// the wrong way at times), holding still between jerks.
//
// Session 13 (more detail, still only a silhouette, no face: Aaron): her
// cloak's hem torn into long strips, wide tattered sleeves hanging past her
// wrists, lank hair from under a ragged hood, five long two-jointed fingers
// with claws, a crown of gnarled, forking sticks. The rags flutter in the
// vertex shader (aFlutter: how free each vertex hangs), sway as she floats,
// stream out behind her as she moves and whip about as she contorts.
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
const X_AXIS = new THREE.Vector3(1, 0, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const SHARDS = 72; // pieces she bursts into

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
    this.root.rotation.order = 'YXZ'; // her facing, then a whole-body tilt (pitch)
    this.root.scale.setScalar(c.height / MODEL_HEIGHT);
    scene.add(this.root);
    // Unlit: the torch can't light her or glint off her. Fog still applies.
    this.material = new THREE.MeshBasicMaterial({ color: c.shadow });
    // The rags' flutter: sway (metres), trail (metres back), rate.
    this.clothUniforms = { uTime: { value: 0 }, uCloth: { value: new THREE.Vector3() } };
    this.material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.clothUniforms);
      shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${CLOTH_PARS}`).replace('#include <begin_vertex>', `#include <begin_vertex>\n${CLOTH_VERTEX}`);
    };
    this.material.customProgramCacheKey = () => 'witch-rags';

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

    // Step 6: her death. She bursts apart in embers, sticks and bone.
    const shard = new THREE.BoxGeometry(1, 1, 1);
    this.geometries.push(shard);
    this.shardMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.shards = new THREE.InstancedMesh(shard, this.shardMaterial, SHARDS);
    this.shards.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.shards.frustumCulled = false;
    this.shards.count = 0;
    scene.add(this.shards);
    this.shardState = Array.from({ length: SHARDS }, () => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, spin: 0, size: [0.05, 0.05, 0.05] }));
    this.burstAge = -1;
    this.shardColour = new THREE.Color();
    this.shardEuler = new THREE.Euler();
    this.shardQuat = new THREE.Quaternion();
    this.shardPos = new THREE.Vector3();
    this.shardScale = new THREE.Vector3();
    this.time = 0;
    this.motion = 0; // 0 still .. 1 gliding at full speed (eased)
    this.fleeing = 0; // 0 .. 1, eased into and out of her flight
    this.pivot = new THREE.Vector3();
    this.pitch = 0; // radians the whole of her tilts forward (a lunge, her flight), about her waist
  }

  // ---- the model ---------------------------------------------------------------

  // Merge parts into one geometry, thinned in width and depth. Every part
  // carries the flutter attributes (cloth() or rigid()) so they merge.
  merge(parts, thin) {
    const flat = parts.map((g) => {
      const f = g.index ? g.toNonIndexed() : g;
      if (!f.attributes.aFlutter) rigid(f);
      f.scale(thin, 1, thin);
      return f;
    });
    const merged = mergeGeometries(flat);
    for (const g of parts) g.dispose();
    for (const g of flat) g.dispose();
    return merged;
  }

  // The cloak from the ground to the waist (Session 13): an open cone, as
  // wide as her chest at the top, its hem cut into long uneven strips that
  // flutter and trail (the vertex shader: aFlutter grows down the cloak).
  skirtGeometry(thin) {
    const rng = this.rng;
    const c = this.cfg.rags;
    const height = 1.4;
    const radial = c.cloakStrips * 2; // a strip and a notch each
    const cloak = new THREE.CylinderGeometry(0.19, 0.46, height, radial, 6, true).toNonIndexed();
    const pos = cloak.attributes.position;
    // Each column's tear: strips hang long, notches are cut up into the cloak.
    const tears = Array.from({ length: radial + 1 }, (_, k) => (k % 2 === 0 ? rng.range(0.05, c.cloakTear) : -rng.range(0.05, c.cloakNotch)));
    tears[radial] = tears[0];
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const below = (height / 2 - y) / height; // 0 at the waist, 1 at the hem
      if (below > 0.55) {
        const a = Math.atan2(pos.getZ(i), pos.getX(i));
        const k = Math.round(((a / (Math.PI * 2) + 1) % 1) * radial);
        const deep = (below - 0.55) / 0.45;
        pos.setY(i, y - tears[k] * deep * deep);
        const out = 1 + rng.range(-0.06, 0.1) * deep;
        pos.setX(i, pos.getX(i) * out);
        pos.setZ(i, pos.getZ(i) * out);
      }
    }
    cloak.translate(0, 0.72, 0);
    cloth(cloak, (x, y, z) => Math.pow(Math.max(0, 1.42 - y) / 1.4, 1.6), rng);
    const under = new THREE.CylinderGeometry(0.16, 0.26, 1.1, 6);
    under.translate(0, 0.55, 0);
    return this.merge([cloak, under], thin);
  }

  // Chest and shawl, from the waist up (the waist joint is the origin).
  torsoGeometry(thin) {
    const rng = this.rng;
    // Narrow-waisted, the shoulders sloping (not a box).
    const chest = new THREE.CylinderGeometry(0.15, 0.1, 0.66, 6);
    chest.scale(1, 1, 0.7);
    chest.translate(0, 0.31, 0);
    const shawl = new THREE.ConeGeometry(0.33, 0.62, 12, 2, true).toNonIndexed();
    const sp = shawl.attributes.position;
    for (let i = 0; i < sp.count; i++) if (sp.getY(i) < -0.2) sp.setY(i, sp.getY(i) - rng.range(0, 0.22));
    shawl.translate(0, 0.42, 0.02);
    cloth(shawl, (x, y) => Math.max(0, 0.35 - y) * 0.9, rng);
    const neck = new THREE.BoxGeometry(0.06, 0.16, 0.06);
    neck.translate(0, 0.68, 0.05);
    return this.merge([chest, shawl, neck], thin);
  }

  // Head, jaw, a ragged hood with a drooping point, lank hair hanging to
  // the chest, and the crown of gnarled sticks (the neck joint is the origin).
  headGeometry(thin) {
    const rng = this.rng;
    const c = this.cfg.rags;
    const body = [];
    const head = new THREE.BoxGeometry(0.15, 0.25, 0.18);
    head.translate(0, 0.14, 0.08);
    body.push(head);
    const jaw = new THREE.BoxGeometry(0.09, 0.1, 0.12);
    jaw.translate(0, 0.0, 0.11);
    body.push(jaw);
    // The hood: its rim torn, its point long and drooping back.
    const hood = new THREE.ConeGeometry(0.17, 0.52, 10, 2, true).toNonIndexed();
    const hp = hood.attributes.position;
    for (let i = 0; i < hp.count; i++) {
      if (hp.getY(i) < -0.2) hp.setY(i, hp.getY(i) - rng.range(0, 0.1)); // the torn rim
      if (hp.getY(i) > 0.2) hp.setZ(i, hp.getZ(i) - 0.12); // the point droops back
    }
    hood.rotateX(-0.45);
    hood.translate(0, 0.27, 0.02);
    body.push(hood);
    // Hair: thin strands from under the hood, round the face to the chest.
    for (let i = 0; i < c.hairStrands; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const k = Math.floor(i / 2) / Math.max(1, Math.floor(c.hairStrands / 2) - 1); // front to back
      const len = rng.range(0.35, 0.62);
      const g = new THREE.BoxGeometry(rng.range(0.012, 0.022), len, 0.012).toNonIndexed();
      g.translate(0, -len / 2, 0);
      g.rotateZ(side * rng.range(0.02, 0.12));
      g.translate(side * (0.08 + k * 0.02), 0.2, 0.14 - k * 0.16);
      cloth(g, (x, y) => Math.max(0, 0.2 - y) * 0.6, rng);
      body.push(g);
    }
    // The crown: sticks splayed up and out like antlers (kept full width:
    // the silhouette's best feature), each bending as it grows, with twigs.
    const crown = [];
    const sticks = 7;
    for (let i = 0; i < sticks; i++) {
      const t = i / (sticks - 1) - 0.5; // -0.5..0.5, left to right
      const len = rng.range(0.38, 0.62) * (1 - Math.abs(t) * 0.5);
      const splay = -t * 2.2 + rng.range(-0.15, 0.15);
      gnarledStick(crown, rng, { x: t * 0.12, y: 0.27, z: 0.06 }, splay, rng.range(-0.3, 0.1), len, 0.026, Math.abs(t) > 0.1 ? 2 : 1);
    }
    for (const g of crown) rigid(g);
    // The body is thinned; the crown keeps its full width.
    const thinned = body.map((g) => {
      const f = g.index ? g.toNonIndexed() : g;
      if (!f.attributes.aFlutter) rigid(f);
      f.scale(thin, 1, thin);
      return f;
    });
    const merged = mergeGeometries([...thinned, ...crown]);
    for (const g of [...body, ...thinned, ...crown]) g.dispose();
    return merged;
  }

  // An arm in three pieces, each hanging from its joint (the origin) down
  // -y: a thin sleeve to the elbow; the forearm in a wide, tattered sleeve
  // that hangs past the wrist and flaps; and a narrow hand with five long,
  // two-jointed fingers ending in thin claws.
  armGeometries(thin) {
    const rng = this.rng;
    const c = this.cfg.rags;
    const sleeve = new THREE.BoxGeometry(0.085, UPPER_ARM + 0.04, 0.085);
    sleeve.translate(0, -UPPER_ARM / 2, 0);
    const forearm = new THREE.BoxGeometry(0.045, FOREARM + 0.03, 0.045);
    forearm.translate(0, -FOREARM / 2, 0);
    // The hanging sleeve: an open bell from the elbow, its hem torn into strips.
    const bellLength = FOREARM + c.sleeveHang;
    const bell = new THREE.CylinderGeometry(0.05, 0.15, bellLength, 12, 4, true).toNonIndexed(); // narrow at the elbow, flaring at the wrist
    bell.translate(0, -bellLength / 2, 0);
    const bp = bell.attributes.position;
    const tears = Array.from({ length: 13 }, (_, k) => (k % 2 === 0 ? rng.range(0.02, 0.16) : -rng.range(0.02, 0.1)));
    tears[12] = tears[0];
    for (let i = 0; i < bp.count; i++) {
      const y = bp.getY(i);
      const below = -y / bellLength;
      if (below > 0.6) {
        const k = Math.round((((Math.atan2(bp.getZ(i), bp.getX(i)) / (Math.PI * 2)) + 1) % 1) * 12);
        bp.setY(i, y - tears[k] * ((below - 0.6) / 0.4));
      }
      bp.setZ(i, bp.getZ(i) - below * 0.05); // it hangs back a little
    }
    cloth(bell, (x, y) => Math.pow(Math.max(0, -y) / bellLength, 1.5) * 0.8, rng);
    const parts = [];
    const palm = new THREE.BoxGeometry(0.06, 0.09, 0.025);
    palm.translate(0, -0.045, 0);
    parts.push(palm);
    // Four fingers and a thumb: two joints each, curled in, then a claw.
    for (let i = 0; i < 5; i++) {
      const thumb = i === 4;
      const spread = thumb ? 0.6 : (i - 1.5) * 0.13;
      const base = { x: thumb ? 0.03 : (i - 1.5) * 0.016, y: thumb ? -0.03 : -0.085, z: 0.005 };
      const l1 = thumb ? 0.09 : rng.range(0.12, 0.15);
      const l2 = thumb ? 0.07 : rng.range(0.11, 0.14);
      const curl = thumb ? 0.3 : rng.range(0.15, 0.3);
      const seg = (len, w, x, y, z, bendX) => {
        const g = new THREE.BoxGeometry(w, len, w);
        g.translate(0, -len / 2, 0);
        g.rotateX(bendX);
        g.rotateZ(spread);
        g.translate(x, y, z);
        parts.push(g);
        // The segment's end (turned as the segment is), for the next.
        const end = new THREE.Vector3(0, -len, 0).applyAxisAngle(X_AXIS, bendX).applyAxisAngle(Z_AXIS, spread);
        return { x: x + end.x, y: y + end.y, z: z + end.z };
      };
      const k1 = seg(l1, 0.014, base.x, base.y, base.z, curl);
      const k2 = seg(l2, 0.011, k1.x, k1.y, k1.z, curl * 2.2);
      seg(c.claw, 0.006, k2.x, k2.y, k2.z, curl * 3.2);
    }
    return { upper: this.merge([sleeve], thin), fore: this.merge([forearm, bell], thin), hand: this.merge(parts, thin) };
  }

  // ---- posing --------------------------------------------------------------------

  // w: the Witch (x, y, z, facing, state, tier, moved, walked,
  // plantProgress, spot). Shown while she's out, near and within the draw distance.
  update(w, dt, cameraPosition, drawDistance) {
    this.time += dt;
    // The rags: swaying as she floats, streaming behind as she moves,
    // whipping about as she contorts or fights.
    const r = this.cfg.rags;
    const wild = w.state === 'planting' || w.state === 'attacking' || w.state === 'rising' || w.state === 'dead' ? r.agitated : 1;
    this.clothUniforms.uTime.value = this.time;
    this.clothUniforms.uCloth.value.set(r.sway * wild, r.trail * (w.state === 'fleeing' ? 1 : this.motion), r.rate * Math.sqrt(wild));
    const dist = cameraPosition ? Math.hypot(w.x - cameraPosition.x, w.z - cameraPosition.z) : 0;
    const planting = w.state === 'planting';
    const dead = w.state === 'dead';
    const out = w.state !== 'resting' && (!dead || w.deathTimer < w.wc.deathSeconds);
    this.root.visible = out && w.tier !== 'abstract' && dist <= drawDistance;
    this.ritual.visible = planting && dist <= drawDistance;
    if (this.ritual.visible) this.poseRitual(w);
    if (w.hexes) this.drawHexes(w.hexes.pool);
    this.updateBurst(w, dt);
    if (!this.root.visible) return;
    this.root.position.set(w.x, w.y, w.z);
    this.root.rotation.set(0, w.facing, 0);
    this.root.scale.setScalar(this.cfg.height / MODEL_HEIGHT);
    this.pitch = 0;
    this.fleeing += ((w.state === 'fleeing' ? 1 : 0) - this.fleeing) * Math.min(1, dt * 3);
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
    this.tilt();
  }

  // Swing the cloak about her waist (x: + swings the hem back; z: sideways),
  // so its top stays on her however far it swings.
  // Set its scale first: the pivot is its (squashed) top.
  swingSkirt(x, z) {
    const s = this.skirt;
    s.rotation.set(x, 0, z);
    const top = WAIST * s.scale.y;
    this.pivot.set(0, top, 0).applyEuler(s.rotation);
    s.position.set(-this.pivot.x, top - this.pivot.y, -this.pivot.z);
  }

  // Tilt the whole of her as one piece (never a fold at the waist: Aaron,
  // Session 13), about her waist so she stays where she is.
  tilt() {
    const p = this.pitch;
    if (p === 0) return;
    this.root.rotation.x = p;
    const h = WAIST * this.root.scale.y;
    const back = h * Math.sin(p);
    this.root.position.x -= Math.sin(this.root.rotation.y) * back;
    this.root.position.z -= Math.cos(this.root.rotation.y) * back;
    this.root.position.y += h * (1 - Math.cos(p));
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
    this.swingSkirt(Math.sin(t * 3.1) * 0.02, Math.sin(t * 2.3) * 0.03);
    this.waist.position.set(0, WAIST, 0);
    this.waist.rotation.set(-c.standBack, 0, 0); // upright, looming a little back (never bent over: Aaron)
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
        // Rearing back, then the whole of her lunges into the slash (a tilt, not a bow).
        this.waist.rotation.x = up ? -c.standBack - e * 0.3 : -c.standBack - 0.3 * (1 - e);
        this.pitch = up ? -0.08 * e : c.lunge * e;
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
        this.waist.rotation.x = -c.standBack - e * 0.45;
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
    this.swingSkirt(0, 0);
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

  // Killed (step 6; DESIGN.md "The ending"): she's consumed by her own
  // witchfire, writhing, arms flung up, head thrown back, flickering; then
  // she bursts apart (updateBurst) and is gone.
  poseDying(w) {
    const burstAt = w.wc.look.burstAt;
    if (w.deathTimer >= burstAt) {
      this.root.visible = false;
      return;
    }
    const t = this.time;
    const k = w.deathTimer / burstAt;
    const jitter = (a) => Math.sin(t * 40 + a) * 0.06 * (1 + k * 2);
    this.skirt.scale.set(1 + k * 0.3, 1 - k * 0.25, 1 + k * 0.3);
    this.swingSkirt(jitter(1), jitter(2));
    this.waist.position.set(0, WAIST, 0);
    this.waist.rotation.set(-0.5 - k * 0.3 + jitter(3), jitter(4), jitter(5));
    this.neck.rotation.set(-0.9 + jitter(6), jitter(7) * 4, jitter(8) * 6);
    this.arms.forEach(({ shoulder, elbow, wrist }, i) => {
      const side = i === 0 ? -1 : 1;
      shoulder.rotation.set(-2.8 + jitter(9 + i) * 3, 0, side * (0.9 + jitter(11 + i) * 2));
      elbow.rotation.set(jitter(13 + i) * 6, 0, 0);
      wrist.rotation.set(jitter(15 + i) * 6, 0, 0);
    });
    this.root.scale.setScalar((this.cfg.height / MODEL_HEIGHT) * (1 + Math.sin(t * 55) * 0.03 * k));
  }

  // The burst: embers (glowing), sticks and bones fly out and fall.
  updateBurst(w, dt) {
    const look = this.cfg;
    if (w.state !== 'dead') {
      this.burstAge = -1;
      this.shards.count = 0;
      return;
    }
    if (this.burstAge < 0 && w.deathTimer >= look.burstAt) {
      this.burstAge = 0;
      const rng = (i, k) => {
        const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
        return v - Math.floor(v);
      };
      const colours = [look.burstEmber, look.burstStick, look.burstBone];
      this.shardState.forEach((p, i) => {
        const kind = i % 3; // ember, stick, bone
        const a = rng(i, 1) * Math.PI * 2;
        const out = 2 + rng(i, 2) * 5;
        p.x = w.x;
        p.y = w.y + 0.6 + rng(i, 3) * 1.6;
        p.z = w.z;
        p.vx = Math.sin(a) * out;
        p.vz = Math.cos(a) * out;
        p.vy = 2 + rng(i, 4) * 6;
        p.spin = (rng(i, 5) - 0.5) * 20;
        p.size = kind === 1 ? [0.04, 0.4, 0.04] : kind === 2 ? [0.06, 0.18, 0.06] : [0.09, 0.09, 0.09];
        this.shards.setColorAt(i, this.shardColour.setHex(colours[kind]));
      });
      this.shards.instanceColor.needsUpdate = true;
    }
    if (this.burstAge < 0) return;
    this.burstAge += dt;
    if (this.burstAge > look.burstSeconds) {
      this.shards.count = 0;
      return;
    }
    const fade = 1 - this.burstAge / look.burstSeconds;
    this.shardState.forEach((p, i) => {
      p.vy -= 9.8 * dt;
      p.x += p.vx * dt;
      p.y = Math.max(w.y, p.y + p.vy * dt);
      p.z += p.vz * dt;
      if (p.y <= w.y) {
        p.vx *= 0.8;
        p.vz *= 0.8;
      }
      this.shardEuler.set(this.burstAge * p.spin, this.burstAge * p.spin * 0.7, 0);
      this.shardQuat.setFromEuler(this.shardEuler);
      const sc = i % 3 === 0 ? fade : 1; // embers die out
      this.shardScale.set(p.size[0] * sc, p.size[1] * sc, p.size[2] * sc);
      this.shardPos.set(p.x, p.y, p.z);
      this.hexMatrix.compose(this.shardPos, this.shardQuat, this.shardScale);
      this.shards.setMatrixAt(i, this.hexMatrix);
    });
    this.shards.count = SHARDS;
    this.shards.instanceMatrix.needsUpdate = true;
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
  // sway, upright and tall (Aaron, Session 10: bent over read as an old
  // woman), head level and still, the cloak trailing behind as she moves,
  // arms hanging straight and limp at her sides.
  // Fleeing (Aaron, Session 13): she lifts and flies off head first, the
  // whole of her tilted into it, her back arched backwards, her arms and
  // rags streaming out behind her. Never bent forward at the waist.
  poseGliding(w, dt, fleeing = false) {
    const c = this.cfg;
    const g = c.glide;
    const fl = c.flee;
    const t = this.time;
    // How fast she's moving (0..1), eased so stopping and starting is smooth.
    const speed = fleeing ? 1 : dt > 0 ? Math.min(1, w.moved / dt / g.fullSpeed) : 0;
    this.motion += (speed - this.motion) * Math.min(1, dt * 4);
    const m = this.motion;
    const f = this.fleeing;
    this.root.position.y += g.hover + fl.lift * f + Math.sin(t * g.floatSpeed) * g.float;
    this.skirt.scale.set(1, 1, 1);
    // The hem trails behind (the cloak swinging back from her waist) and ripples.
    this.swingSkirt(g.trail * m + fl.trail * f + Math.sin(t * 3.1) * 0.02, Math.sin(t * 2.3) * 0.03);
    this.waist.position.set(0, WAIST, 0);
    const arch = -fl.arch * f; // bent backwards, never forwards
    this.waist.rotation.set(arch, 0, Math.sin(t * g.floatSpeed * 0.5) * 0.05);
    // The head stays level with the world, or tips back in flight.
    this.neck.rotation.set(-arch * 0.5 - fl.pitch * f - fl.headBack * f, 0, 0);
    this.pitch = fl.pitch * f;
    // Arms hanging straight at her sides, barely moving; hands limp. In
    // flight they stream out behind her.
    const drift = Math.sin(t * 1.7) * 0.03;
    this.arms.forEach(({ shoulder, elbow, wrist }, i) => {
      const side = i === 0 ? -1 : 1;
      const flap = Math.sin(t * 7 + i * 1.3) * 0.08 * f;
      shoulder.rotation.set(c.armsBack + m * 0.1 + drift * side + (fl.armsBack + flap) * f, 0, side * (0.08 + 0.25 * f));
      elbow.rotation.set(-0.08 + 0.3 * f, 0, 0);
      wrist.rotation.set(0.25 + Math.sin(t * 2 + i) * 0.05 + 0.4 * f, 0, 0);
    });
  }

  // Planting (Aaron, Session 13: no fold at the waist): she sinks into
  // her pooled cloak with her torso upright and arched back, her neck
  // craning her head down and round over the spot, too far; her arms
  // splayed down to the ground like a spider's legs, clawing; every joint
  // jerks to a new angle and holds.
  poseContorted() {
    const c = this.cfg;
    const t = this.time;
    const rate = c.snapsPerSecond;
    const snap = (k, lo, hi, speed = 1) => snapValue(t * speed + k * 0.37, rate, c.snapTime, k, lo, hi);
    const breath = Math.sin(t * 2.2) * 0.04;
    const squash = c.crouch;
    // The cloak puddles out as she sinks.
    this.skirt.scale.set(1 + (1 - squash) * 0.7, squash, 1 + (1 - squash) * 0.7);
    this.swingSkirt(0, 0);
    this.waist.position.set(0, WAIST * squash * 0.85, 0);
    // Upright and arched back, jerking further back now and then.
    this.waist.rotation.set(-c.plantArch + breath + snap(1, -0.25, 0.1), snap(2, -0.25, 0.25), snap(3, -0.2, 0.2));
    // The head: craned forward and down over the spot from the neck,
    // rolled and twisted too far.
    this.neck.rotation.set(c.plantArch + c.crane + snap(4, -0.3, 0.3, 1.3), snap(5, -1.0, 1.0, 0.9), snap(6, -1.2, 1.2, 1.1));
    // Arms: down and out to the ground at her sides, splayed like a
    // spider's legs. The elbow bends the forearm to the ground (and now and
    // then the wrong way, up); the wrist curls the claw in or snaps back.
    this.arms.forEach(({ shoulder, elbow, wrist }, i) => {
      const side = i === 0 ? -1 : 1;
      const k = 7 + i * 6;
      shoulder.rotation.set(-0.55 + snap(k, -0.5, 0.5, 0.8 - i * 0.1), snap(k + 1, -0.5, 0.5), side * 1.05 + snap(k + 2, -0.4, 0.4));
      elbow.rotation.set(snap(k + 3, -0.9, 1.7, 0.9 + i * 0.15), snap(k + 4, -0.4, 0.4), side * 0.6);
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

  // Session 10b: through the heat scope she glows white-hot (her shadow
  // goes white; she's unlit, so plain white is as bright as it gets).
  // brightness: 0..1 (her glow fades up close: Aaron).
  setThermal(on, brightness = 1) {
    if (on) this.material.color.setScalar(brightness);
    else this.material.color.set(this.cfg.shadow);
  }

  dispose() {
    this.root.removeFromParent();
    this.ritual.removeFromParent();
    for (const g of this.geometries) g.dispose();
    this.material.dispose();
    this.eyeMaterial.dispose();
    this.ringMaterial.dispose();
    this.shards.removeFromParent();
    this.shardMaterial.dispose();
    this.hexCores.removeFromParent();
    this.hexHalos.removeFromParent();
    this.hexCoreMaterial.dispose();
    this.hexHaloMaterial.dispose();
  }
}

// The rags' flutter, in each part's own space (aFlutter 0 is fixed, 1
// hangs free; aPhase sets each strip apart).
const CLOTH_PARS = /* glsl */ `
  attribute float aFlutter;
  attribute float aPhase;
  uniform float uTime;
  uniform vec3 uCloth;
`;
const CLOTH_VERTEX = /* glsl */ `
  float wcPhase = aPhase * 6.2832;
  float wcT = uTime * uCloth.z;
  transformed.x += sin( wcT + wcPhase + position.y * 4.0 ) * uCloth.x * aFlutter;
  transformed.z += ( cos( wcT * 1.3 + wcPhase ) * 0.6 * uCloth.x - uCloth.y ) * aFlutter;
  transformed.y += sin( wcT * 1.7 + wcPhase * 1.4 ) * uCloth.x * 0.3 * aFlutter;
`;

// Mark a geometry as cloth: aFlutter from weight(x, y, z) (0..1, how free
// it hangs), aPhase by the angle round its axis (a strip flutters as one).
function cloth(g, weight, rng) {
  const p = g.attributes.position;
  const flutter = new Float32Array(p.count);
  const phase = new Float32Array(p.count);
  const offset = rng.next();
  for (let i = 0; i < p.count; i++) {
    flutter[i] = Math.min(1, Math.max(0, weight(p.getX(i), p.getY(i), p.getZ(i))));
    const a = Math.atan2(p.getZ(i), p.getX(i));
    const h = Math.sin(Math.round(a * 4) * 12.9898 + offset * 78.233) * 43758.5453;
    phase[i] = h - Math.floor(h);
  }
  g.setAttribute('aFlutter', new THREE.BufferAttribute(flutter, 1));
  g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  return g;
}

// Mark a geometry as fixed (no flutter), so it merges with cloth.
function rigid(g) {
  const n = g.attributes.position.count;
  g.setAttribute('aFlutter', new THREE.BufferAttribute(new Float32Array(n), 1));
  g.setAttribute('aPhase', new THREE.BufferAttribute(new Float32Array(n), 1));
  return g;
}

// A gnarled stick of the crown into `out`: three bending segments from
// `base`, splayed (about z) and tilted (about x), with `twigs` forking off.
function gnarledStick(out, rng, base, splay, tilt, len, width, twigs) {
  const up = new THREE.Vector3(0, 1, 0);
  const dir = new THREE.Vector3(0, 1, 0).applyEuler(new THREE.Euler(tilt, 0, splay));
  let at = new THREE.Vector3(base.x, base.y, base.z);
  const segments = 3;
  for (let k = 0; k < segments; k++) {
    const l = len / segments;
    const w = width * (1 - k * 0.25);
    const g = new THREE.BoxGeometry(w, l + w, w).toNonIndexed();
    g.translate(0, l / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, dir));
    g.translate(at.x, at.y, at.z);
    out.push(g);
    const end = at.clone().addScaledVector(dir, l);
    // A twig from this joint, further out.
    if (k < twigs) {
      const twigDir = dir.clone().applyEuler(new THREE.Euler(rng.range(-0.4, 0.4), 0, Math.sign(splay || 1) * rng.range(0.5, 0.9)));
      const tl = l * rng.range(0.5, 0.8);
      const t = new THREE.BoxGeometry(w * 0.6, tl, w * 0.6).toNonIndexed();
      t.translate(0, tl / 2, 0);
      t.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, twigDir));
      t.translate(end.x, end.y, end.z);
      out.push(t);
    }
    // Bend for the next segment.
    dir.applyEuler(new THREE.Euler(rng.range(-0.35, 0.35), 0, rng.range(-0.35, 0.35))).normalize();
    at = end;
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
