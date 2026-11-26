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
// Round 2 (the polish pass; Aaron: "improve the model of the witch"; still only a silhouette, no face): more
// for the outline to say. A cord round her waist hung with her own work: stick figures tied from twigs,
// small bones, swinging as she moves. A train of long rags dragging behind the cloak. A ridge of knuckled
// spines down her back and a ragged point at each shoulder, so her profile is serrated. Small bones on
// threads from the crown's tips. All of it in the parts she already had: no more draw calls.
//
// Nov 26 (Aaron's concept art: a thing of twisted, thorny wood): rebuilt in vines. No hood or cloak: a body
// of braided, thorned vines, a narrow waist and ribcage, twisted arms with ragged strands streaming from them
// and long jointed branch fingers, a crown that forks and forks again, and below the waist a bundle of vines
// splaying into root-tendrils that stream behind her (the old cloak's flutter, now theirs). Her charms are
// gone (Aaron). Rounder red eyes. Same joints, poses and moves.
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
    // Round 2: uBone: the colour of what's bone and twig on her (aBone: how much; the rest is her shadow).
    this.clothUniforms = { uTime: { value: 0 }, uCloth: { value: new THREE.Vector3() }, uBone: { value: new THREE.Color(c.bone ?? 0x24211b) } };
    this.material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.clothUniforms);
      shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${CLOTH_PARS}`).replace('#include <begin_vertex>', `#include <begin_vertex>\n${CLOTH_VERTEX}`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform vec3 uBone;\nvarying float vBone;')
        .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = mix( diffuseColor.rgb, max( uBone, diffuseColor.rgb ), vBone );');
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
      const g = new THREE.SphereGeometry(0.5, 10, 6);
      g.scale(0.042, 0.03, 0.016); // Nov 26 (the art): bigger, round glows (were thin slits)
      g.rotateZ(side * 0.3);
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

  // Nov 26 (Aaron's concept art: a thing of twisted, thorny wood, no hood or cloak; red eyes): her body is
  // vines, braided and thorned. Still unlit black: only her outline and her eyes read.

  // Her lower body (Session 13's cloak, gone): a bundle of vines twisting down from her waist, splaying into
  // long root-tendrils that thin to points and stream behind her (the flutter grows down them), a dark core
  // through the middle, and a train of tendrils trailing on the ground behind.
  skirtGeometry(thin) {
    const rng = this.rng;
    const c = this.cfg.rags;
    const parts = [];
    const top = 1.42;
    const hang = (x, y) => Math.pow(Math.max(0, top - y) / top, 1.4);
    const add = (g) => parts.push(cloth(g, hang, rng));
    const core = new THREE.CylinderGeometry(0.13, 0.07, 0.62, 8, 3, true).toNonIndexed();
    core.translate(0, top - 0.31, 0);
    add(core);
    for (let i = 0; i < c.vines; i++) {
      const a0 = (i / c.vines) * Math.PI * 2 + rng.range(-0.25, 0.25);
      const turn = rng.range(0.9, 1.6) * (i % 2 ? 1 : -1);
      const tipY = rng.range(0.02, 0.3);
      const pts = [top + 0.02, 1.12, 0.82, 0.52, tipY].map((y, k) => {
        const r = [0.08, 0.12, 0.16, 0.24, 0.34 + rng.range(0, 0.12)][k];
        const a = a0 + turn * (k / 4);
        return new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r * 0.8 - [0, 0.02, 0.06, 0.14, 0.32][k]);
      });
      const r0 = rng.range(0.048, 0.062);
      add(vine(pts, r0, 0.006, 5, 14));
      for (const t of thornsOn(pts, r0, 0.006, c.thorns, rng, 0.05)) add(t);
    }
    // Thinner tendrils from the bundle, longer behind.
    for (let i = 0; i < c.tendrils; i++) {
      const a = rng.range(0, Math.PI * 2);
      const y0 = rng.range(0.75, 1.2);
      const back = Math.max(0, -Math.sin(a)) * 0.3 + 0.08;
      const len = rng.range(0.45, 0.9);
      const pts = [0, 0.33, 0.66, 1].map((k) => new THREE.Vector3(Math.cos(a) * (0.12 + k * 0.18), y0 - k * len, Math.sin(a) * (0.1 + k * 0.12) - k * k * back - 0.03));
      if (pts[3].y < 0.02) pts[3].y = 0.02;
      add(vine(pts, 0.018, 0.003, 4, 10));
    }
    // The train: long tendrils from the back, down and out behind her along the ground.
    for (let i = 0; i < c.train; i++) {
      const x = (i - (c.train - 1) / 2) * 0.09 + rng.range(-0.03, 0.03);
      const len = rng.range(0.7, 1.2);
      const pts = [0, 0.33, 0.66, 1].map((k) => new THREE.Vector3(x * (1 + k), 0.62 - k * 0.56, -0.18 - k * len + Math.sin(k * 4 + i) * 0.03));
      add(vine(pts, 0.022, 0.003, 4, 10));
    }
    return this.merge(parts, thin);
  }

  // Her chest from the waist up (the waist joint is the origin): vines twisting up from a narrow waist round
  // a ribcage, parting to her shoulders and her neck; vines wrapping across her ribs; thorns down her back.
  torsoGeometry(thin) {
    const rng = this.rng;
    const c = this.cfg.rags;
    const parts = [];
    const core = new THREE.CylinderGeometry(0.12, 0.075, 0.66, 8); // inside the vines: they make her outline
    core.scale(1, 1, 0.75);
    core.translate(0, 0.31, 0);
    parts.push(core);
    const targets = [
      [-0.21, 0.6, 0.0], [-0.17, 0.62, -0.02], [0.21, 0.6, 0.0], [0.17, 0.62, -0.02], [0, 0.72, 0.05], [0.025, 0.7, 0.0], [-0.025, 0.7, 0.0],
    ];
    targets.forEach(([tx, ty, tz], i) => {
      const a = (i / targets.length) * Math.PI * 2;
      const pts = [
        new THREE.Vector3(Math.cos(a) * 0.07, -0.1, Math.sin(a) * 0.05),
        new THREE.Vector3(Math.cos(a + 0.7) * 0.15, 0.2, Math.sin(a + 0.7) * 0.11),
        new THREE.Vector3(Math.cos(a + 1.2) * 0.19, 0.42, Math.sin(a + 1.2) * 0.13),
        new THREE.Vector3(tx + rng.range(-0.02, 0.02), ty, tz + rng.range(-0.02, 0.02)),
      ];
      parts.push(vine(pts, 0.044, 0.03, 5, 10));
      for (const t of thornsOn(pts, 0.044, 0.03, c.thorns + 1, rng, 0.075)) parts.push(t);
      parts.push(...knotsOn(pts, 0.044, 2, rng));
    });
    // Vines wrapping across her ribs, round the front and sides.
    for (const [y, r] of [[0.2, 0.15], [0.31, 0.175], [0.42, 0.185]]) {
      const pts = [];
      for (let k = 0; k <= 6; k++) {
        const a = -1.9 + (k / 6) * 3.8; // round the front
        pts.push(new THREE.Vector3(Math.sin(a) * r, y - Math.abs(Math.sin(a)) * 0.05, Math.cos(a) * r * 0.78));
      }
      parts.push(vine(pts, 0.016, 0.016, 4, 14));
      for (const t of thornsOn(pts, 0.016, 0.016, 3, rng, 0.035)) parts.push(t);
    }
    // Round 2's ridge of spines down her back: thorns now.
    for (let i = 0; i < 6; i++) {
      const y = 0.12 + i * 0.1;
      const len = 0.07 + Math.sin((i / 5) * Math.PI) * 0.09 + rng.range(-0.01, 0.02);
      const spine = new THREE.ConeGeometry(0.022, len, 4).toNonIndexed();
      spine.rotateX(-Math.PI / 2 - 0.5 + i * 0.06);
      spine.translate(rng.range(-0.012, 0.012), y, -0.1 - len * 0.42 - Math.sin((i / 5) * Math.PI) * 0.03);
      parts.push(spine);
    }
    return this.merge(parts, thin);
  }

  // Her head (the neck joint is the origin): a gnarled knot of a skull bound in vines, a few thorny twigs
  // hanging at its sides, and the crown: branches spreading up and out, forking two and three times, thorned
  // (kept full width: the silhouette's best feature).
  headGeometry(thin) {
    const rng = this.rng;
    const c = this.cfg.rags;
    const tree = this.cfg.tree;
    const body = [];
    const skull = new THREE.IcosahedronGeometry(1, 1);
    skull.scale(0.075, 0.13, 0.095);
    skull.translate(0, 0.15, 0.08);
    body.push(skull);
    const jaw = new THREE.IcosahedronGeometry(1, 0);
    jaw.scale(0.048, 0.05, 0.06);
    jaw.translate(0, 0.03, 0.11);
    body.push(jaw);
    for (const [x, y, z, s] of [[0, 0.28, 0.04, 0.085], [-0.055, 0.22, -0.03, 0.07], [0.055, 0.23, -0.02, 0.072], [0, 0.17, -0.06, 0.075]]) {
      const knot = new THREE.DodecahedronGeometry(s, 0);
      knot.translate(x, y, z);
      body.push(knot);
    }
    // The neck: vines up from her chest into the skull.
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * 0.025;
      body.push(vine([new THREE.Vector3(x, -0.1, 0.0), new THREE.Vector3(x * 1.4, 0.0, 0.04), new THREE.Vector3(x, 0.08, 0.06)], 0.022, 0.018, 5, 6));
    }
    // Vines binding the skull, up over it from the jaw.
    for (const s of [-1, 1]) body.push(vine([new THREE.Vector3(s * 0.05, 0.02, 0.1), new THREE.Vector3(s * 0.08, 0.14, 0.06), new THREE.Vector3(s * 0.05, 0.27, 0.0)], 0.014, 0.01, 4, 8));
    // Thorny twigs hanging at the sides of her head (where her hair was).
    for (let i = 0; i < c.hangingTwigs; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const len = rng.range(0.25, 0.5);
      const x0 = side * rng.range(0.06, 0.09);
      const pts = [new THREE.Vector3(x0, 0.22, rng.range(-0.04, 0.06)), new THREE.Vector3(x0 + side * 0.06, 0.22 - len * 0.5, 0.0), new THREE.Vector3(x0 + side * 0.1, 0.22 - len, -0.04)];
      const g = vine(pts, 0.01, 0.002, 4, 8);
      cloth(g, (x, y) => Math.max(0, 0.22 - y) * 1.5, rng);
      body.push(g);
    }
    // The crown.
    const crown = [];
    const sticks = tree.crownSticks;
    const [lo, hi] = tree.crownLength;
    for (let i = 0; i < sticks; i++) {
      const t = i / (sticks - 1) - 0.5; // -0.5..0.5, left to right
      const len = rng.range(lo, hi) * (1 - Math.abs(t) * 0.45);
      const dir = new THREE.Vector3(0, 1, 0).applyEuler(new THREE.Euler(rng.range(-0.45, 0.15), 0, -t * 2.4 + rng.range(-0.15, 0.15)));
      branch(crown, rng, new THREE.Vector3(t * 0.13, 0.27, 0.05 - (i % 3) * 0.04), dir, len, 0.024, tree.crownForks, c.thorns > 0);
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

  // An arm in three pieces, each hanging from its joint (the origin) down -y: the upper arm and the forearm
  // each a few vines twisted round a thin core, thorned, with ragged strands streaming from the forearm; and a
  // hand of long, tapering, jointed branch fingers ending in claws.
  armGeometries(thin) {
    const rng = this.rng;
    const c = this.cfg.rags;
    const tree = this.cfg.tree;
    const limb = (length, r0, r1, n) => {
      const parts = [];
      const core = new THREE.CylinderGeometry(r1 * 0.7, r0 * 0.7, length + 0.03, 6); // inside the vines
      core.translate(0, -length / 2, 0);
      parts.push(core);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const pts = [0, 0.33, 0.66, 1].map((k) => {
          const aa = a + k * 2.2;
          const rr = r0 + (r1 - r0) * k;
          return new THREE.Vector3(Math.cos(aa) * rr, 0.015 - k * (length + 0.03), Math.sin(aa) * rr);
        });
        parts.push(vine(pts, r0 * 0.7, r1 * 0.7, 4, 10));
        for (const t of thornsOn(pts, r0 * 0.7, r1 * 0.7, c.thorns, rng, 0.07)) parts.push(t);
        parts.push(...knotsOn(pts, r0 * 0.8, 2, rng));
      }
      return parts;
    };
    const upper = limb(UPPER_ARM, 0.056, 0.042, 3);
    const fore = limb(FOREARM, 0.042, 0.028, 3);
    // Ragged strands streaming from the forearm (where the wide sleeve hung).
    for (let i = 0; i < c.streamers; i++) {
      const y0 = -rng.range(0.08, 0.38);
      const len = rng.range(0.35, 0.75);
      const a = rng.range(0, Math.PI * 2);
      const pts = [0, 0.33, 0.66, 1].map((k) => new THREE.Vector3(Math.cos(a) * 0.03 + k * 0.03 * Math.cos(a), y0 - k * len, Math.sin(a) * 0.03 - k * k * 0.12));
      const g = vine(pts, 0.012, 0.002, 4, 10);
      cloth(g, (x, y) => Math.pow(Math.max(0, y0 - y) / len, 1.2) * 0.9, rng);
      fore.push(g);
    }
    // Thorny twigs off her forearms.
    const twigs = [];
    for (let i = 0; i < tree.armTwigs; i++) {
      const side = i % 2 ? 1 : -1;
      const dir = new THREE.Vector3(0, -1, 0).applyEuler(new THREE.Euler(rng.range(-0.6, 0.3), 0, side * rng.range(1.2, 2.2)));
      branch(twigs, rng, new THREE.Vector3(side * 0.025, -FOREARM * rng.range(0.2, 0.85), rng.range(-0.02, 0.03)), dir, rng.range(0.12, 0.22), 0.01, 1, true);
    }
    fore.push(...twigs);
    // The hand: a knot of a palm, four long fingers and a thumb, each three tapering joints, curling, the last a claw.
    const hand = [];
    const palm = new THREE.DodecahedronGeometry(1, 0);
    palm.scale(0.035, 0.05, 0.016);
    palm.translate(0, -0.045, 0);
    hand.push(palm);
    for (let i = 0; i < 5; i++) {
      const thumb = i === 4;
      const spread = thumb ? 0.6 : (i - 1.5) * 0.15;
      let at = new THREE.Vector3(thumb ? 0.03 : (i - 1.5) * 0.016, thumb ? -0.03 : -0.085, 0.005);
      const fk = tree.fingers;
      const lens = thumb ? [0.09 * fk, 0.07 * fk, c.claw * 0.8] : [rng.range(0.12, 0.15) * fk, rng.range(0.11, 0.14) * fk, c.claw];
      const curl = thumb ? 0.3 : rng.range(0.15, 0.3);
      const widths = [0.015, 0.011, 0.007, 0.0015];
      const pts = [at.clone()];
      let bend = 0;
      for (let k = 0; k < 3; k++) {
        bend += curl * (1 + k * 1.1);
        const d = new THREE.Vector3(0, -1, 0).applyAxisAngle(X_AXIS, bend).applyAxisAngle(Z_AXIS, spread);
        at = at.clone().addScaledVector(d, lens[k]);
        pts.push(at);
      }
      hand.push(vine(pts, widths[0], widths[3], 4, 9));
      for (const t of thornsOn(pts, widths[0], widths[3], thumb ? 0 : 1, rng, 0.022)) hand.push(t);
    }
    return { upper: this.merge(upper, thin), fore: this.merge(fore, thin), hand: this.merge(hand, thin) };
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
  attribute float aBone;
  varying float vBone;
  uniform float uTime;
  uniform vec3 uCloth;
`;
const CLOTH_VERTEX = /* glsl */ `
  vBone = aBone;
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
  if (!g.attributes.aBone) g.setAttribute('aBone', new THREE.BufferAttribute(new Float32Array(p.count), 1));
  return g;
}

// Round 2: mark a geometry as bone or twig (amount 0..1: how far from her shadow toward the bone colour).
function bony(g, amount = 1) {
  g.setAttribute('aBone', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(amount), 1));
  return g;
}

// Mark a geometry as fixed (no flutter), so it merges with cloth.
function rigid(g) {
  const n = g.attributes.position.count;
  g.setAttribute('aFlutter', new THREE.BufferAttribute(new Float32Array(n), 1));
  g.setAttribute('aPhase', new THREE.BufferAttribute(new Float32Array(n), 1));
  if (!g.attributes.aBone) g.setAttribute('aBone', new THREE.BufferAttribute(new Float32Array(n), 1));
  return g;
}

// Nov 26: a tapering vine along a smooth curve through `points` (Vector3s), radius r0 at its start to r1 at
// its end (non-indexed, unmarked).
function vine(points, r0, r1, radial = 5, segments = 10) {
  const curve = new THREE.CatmullRomCurve3(points);
  const g = new THREE.TubeGeometry(curve, segments, 1, radial, false);
  const p = g.attributes.position;
  const c = new THREE.Vector3();
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    curve.getPointAt(t, c);
    const r = r0 + (r1 - r0) * t;
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      p.setXYZ(k, c.x + (p.getX(k) - c.x) * r, c.y + (p.getY(k) - c.y) * r, c.z + (p.getZ(k) - c.z) * r);
    }
  }
  const f = g.toNonIndexed();
  g.dispose();
  return f;
}

// Nov 26: `n` thorns along a vine (as vine() takes it), each a small cone standing out from its surface,
// raked toward its tip.
function thornsOn(points, r0, r1, n, rng, len) {
  const out = [];
  if (!(n > 0)) return out;
  const curve = new THREE.CatmullRomCurve3(points);
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < n; i++) {
    const t = rng.range(0.08, 0.92);
    const c = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    const side = new THREE.Vector3(rng.range(-1, 1), rng.range(-1, 1), rng.range(-1, 1)).cross(tangent);
    if (side.lengthSq() < 1e-4) continue;
    side.normalize();
    const r = r0 + (r1 - r0) * t;
    const l = len * rng.range(0.6, 1.2);
    const dir = side.clone().multiplyScalar(0.85).addScaledVector(tangent, 0.45).normalize();
    const g = new THREE.ConeGeometry(Math.max(0.004, l * 0.22), l, 3).toNonIndexed();
    g.translate(0, l / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, dir));
    g.translate(c.x + side.x * r * 0.8, c.y + side.y * r * 0.8, c.z + side.z * r * 0.8);
    out.push(g);
  }
  return out;
}

// Nov 26: `n` knots swelling a vine (as vine() takes it): small gnarls that break its outline.
function knotsOn(points, r, n, rng) {
  const curve = new THREE.CatmullRomCurve3(points);
  const out = [];
  for (let i = 0; i < n; i++) {
    const c = curve.getPointAt(rng.range(0.15, 0.85));
    const g = new THREE.DodecahedronGeometry(r * rng.range(1.1, 1.5), 0).toNonIndexed();
    g.translate(c.x + rng.range(-0.3, 0.3) * r, c.y, c.z + rng.range(-0.3, 0.3) * r);
    out.push(g);
  }
  return out;
}

// Nov 26: a branch of the crown (or a twig) into `out`: a bending vine from `base` along `dir`, thorned, forking
// `forks` times more (two children, or one), each shorter and thinner.
function branch(out, rng, base, dir, len, width, forks, thorny) {
  const d = dir.clone().normalize();
  const p1 = base.clone().addScaledVector(d, len * 0.5);
  const bent = d.clone().applyEuler(new THREE.Euler(rng.range(-0.4, 0.4), 0, rng.range(-0.4, 0.4))).normalize();
  const p2 = p1.clone().addScaledVector(bent, len * 0.5);
  const pts = [base.clone(), p1, p2];
  out.push(vine(pts, width, width * 0.25, 4, 6));
  if (thorny) out.push(...thornsOn(pts, width, width * 0.25, Math.round(len * 10), rng, Math.max(0.015, width * 1.2)));
  if (forks <= 0) return;
  const n = forks >= 2 || rng.next() < 0.6 ? 2 : 1;
  for (let i = 0; i < n; i++) {
    const t = rng.range(0.4, 0.85);
    const at = t < 0.5 ? base.clone().lerp(p1, t * 2) : p1.clone().lerp(p2, (t - 0.5) * 2);
    const side = i % 2 ? 1 : -1;
    const cd = bent.clone().applyEuler(new THREE.Euler(rng.range(-0.5, 0.5), 0, side * rng.range(0.5, 1.0))).normalize();
    branch(out, rng, at, cd, len * rng.range(0.4, 0.6), width * 0.6, forks - 1, thorny);
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
