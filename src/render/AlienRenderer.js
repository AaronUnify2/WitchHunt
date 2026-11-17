// Grey aliens (Session 13; DESIGN.md "Aliens"): the model (render/
// alienModel.js), one skinned mesh and one draw call each, all sharing one
// body. Ready for the aliens' AI (M10: the crashed plane; M11: the ship),
// which hands update() its aliens: { active, x, y, z, facing, state,
// timer, walked, flash, stage (its cowboy kit: an index into KIT_STAGES) }.
//
// States, posed procedurally and blended:
//  - idle: breathing, its head tilting now and then, curious;
//  - examine: crouched, head cocked, its free hand reaching out (the wreck);
//  - sneak: a low creep, for hiding behind cover; walk: upright;
//  - ambush: springs up out of a crouch (timer: seconds in);
//  - aim, fire: the shotgun up (fire: the kick, each timer from the shot);
//  - flinch: rocks back; dying: its knees go, it falls back; corpse.
// Through the heat scope it reads faint and cold (config: thermalGlow).
//
// Nov 17 (Aaron: the crashed plane's cutscenes were too dark): opts.watch fits a dull glowing watch on its
// left forearm (the crashed plane's grey only: its power cell is what drops when it dies) that casts a soft
// light round it. Each alien's watchGlow (0..1, default 1) dims it; 0 is dark. The light is always in the scene
// (dark when off), so it never changes the scene's light count: no shader recompiles mid-fight.

import * as THREE from 'three';
import { buildFigure, buildBones } from './figureKit.js';
import { alienSpec, ALIEN_JOINTS, KIT_STAGES } from './alienModel.js';

const NAMES = ALIEN_JOINTS.map(([name]) => name);
const B = Object.fromEntries(NAMES.map((n, i) => [n, i]));
const ROOT_Y = NAMES.length * 3; // a pose: rotations per bone, then the root's drop
const POSE_SIZE = ROOT_Y + 1;

export class AlienRenderer {
  // cfg: config.aliens.grey.
  constructor(cfg) {
    this.cfg = cfg;
  }

  // opts: { watch } (config.crashedPlane.encounter.watch).
  init(scene, poolSize = this.cfg.poolSize, opts = {}) {
    this.watchCfg = opts.watch ?? null;
    // One body per kit stage, built when first needed; all share the skeleton.
    this.bodies = new Map();
    const { geometry, joints } = this.bodyOf(0);
    this.geometry = geometry;
    this.joints = joints;
    this.time = 0;
    this.base = new THREE.Color().setScalar(this.cfg.albedo);
    this.flashColour = new THREE.Color(...this.cfg.hitFlash);
    if (this.watchCfg) this.buildWatchParts();
    this.pool = Array.from({ length: poolSize }, () => this.makeOne(scene));
    this.meshes = this.pool.map((o) => o.mesh);
    this.tmp = new Float32Array(POSE_SIZE);
  }

  bodyOf(stage) {
    const k = Math.max(0, Math.min(KIT_STAGES.length - 1, stage | 0));
    if (!this.bodies.has(k)) this.bodies.set(k, buildFigure(alienSpec(this.cfg, KIT_STAGES[k])));
    return this.bodies.get(k);
  }

  makeOne(scene) {
    const { root, list } = buildBones(this.joints);
    const material = new THREE.MeshLambertMaterial({ vertexColors: true });
    material.color.copy(this.base);
    const mesh = new THREE.SkinnedMesh(this.geometry, material);
    mesh.add(root);
    mesh.bind(new THREE.Skeleton(list));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false; // posed every frame; a handful at most
    mesh.visible = false;
    scene.add(mesh);
    const one = { mesh, material, list, root };
    if (this.watchCfg) this.fitWatch(one, scene);
    return one;
  }

  // ---- the watch (Nov 17) -----------------------------------------------------------------------------

  // Shared by every body: a band round the forearm, a face on its outside (+x: the left arm's), a faint halo.
  buildWatchParts() {
    const w = this.watchCfg;
    const k = this.cfg.height / 1.7; // the figure kit builds at 1.7 m
    this.watchK = k;
    this.watchGeo = {
      band: new THREE.CylinderGeometry(w.bandRadius * k, w.bandRadius * k, w.bandWidth * k, 12),
      face: new THREE.BoxGeometry(w.faceDepth * k, w.faceSize[1] * k, w.faceSize[0] * k),
      halo: new THREE.SphereGeometry(w.haloRadius * k, 10, 6),
    };
    this.watchColor = new THREE.Color(w.color);
  }

  // On the left forearm (the elbowL bone), `at` of the way from elbow to wrist; its light lives in the scene.
  fitWatch(one, scene) {
    const w = this.watchCfg;
    const k = this.watchK;
    const el = this.joints.elbowL.p;
    const wr = this.joints.wristL.p;
    const g = new THREE.Group();
    g.name = 'alienWatch';
    g.position.set((wr.x - el.x) * w.at, (wr.y - el.y) * w.at, (wr.z - el.z) * w.at);
    g.rotation.z = Math.atan2(wr.x - el.x, -(wr.y - el.y)); // along the forearm
    const bandMat = new THREE.MeshLambertMaterial({ color: w.bandColor });
    const faceMat = new THREE.MeshBasicMaterial({ color: this.watchColor.clone() });
    const haloMat = new THREE.MeshBasicMaterial({ color: w.color, transparent: true, opacity: w.haloOpacity, blending: THREE.AdditiveBlending, depthWrite: false });
    const band = new THREE.Mesh(this.watchGeo.band, bandMat);
    const face = new THREE.Mesh(this.watchGeo.face, faceMat);
    face.position.x = (w.bandRadius + w.faceDepth * 0.5) * k;
    const halo = new THREE.Mesh(this.watchGeo.halo, haloMat);
    halo.position.copy(face.position);
    g.add(band, face, halo);
    one.list.find((b) => b.name === 'elbowL').add(g);
    const light = new THREE.PointLight(w.color, 0, w.light.distance, w.light.decay);
    light.castShadow = false;
    light.name = 'alienWatchLight';
    scene.add(light);
    Object.assign(one, { watch: g, watchFace: face, watchHalo: halo, watchLight: light, watchMats: [bandMat, faceMat, haloMat] });
  }

  // Where the first alien's watch face is in the world (into out): false if there's no watch or it isn't drawn.
  watchPosition(out) {
    const one = this.pool?.[0];
    if (!one?.watchFace || !one.mesh.visible) return false;
    one.watchFace.getWorldPosition(out);
    return true;
  }

  // Glow 0..1: the face from dark to its dull colour, the halo and the light with it (a slow throb).
  updateWatch(one, a) {
    if (!one.watchLight) return;
    const w = this.watchCfg;
    const on = a ? Math.max(0, Math.min(1, a.watchGlow ?? 1)) : 0;
    const throb = 1 - w.throb + w.throb * Math.sin(this.time * w.throbRate * Math.PI * 2);
    const glow = on * throb;
    one.watchFace.material.color.copy(this.watchColor).multiplyScalar(w.faceDim * (w.faceDark + (1 - w.faceDark) * glow));
    one.watchHalo.material.opacity = w.haloOpacity * glow;
    one.watchHalo.visible = glow > 0.01;
    one.watchLight.intensity = w.light.intensity * glow;
    // Its skin catches the watch's light a little (a faint teal cast, so the body reads at the standoff's range).
    one.watchTint = glow * (w.bodyTint ?? 0);
    if (!this.thermalOn) one.material.emissive.copy(this.watchColor).multiplyScalar(one.watchTint);
    if (!a) return;
    // Its light sits just off the watch, a little ahead of the grey and up: on its hand, its face and chest, and
    // what it's working on, more than on the wreck behind it.
    one.mesh.updateMatrixWorld(true);
    one.watchFace.getWorldPosition(one.watchLight.position);
    const fwd = (w.light.forward ?? 0) * this.watchK;
    one.watchLight.position.x += Math.sin(a.facing) * fwd;
    one.watchLight.position.z += Math.cos(a.facing) * fwd;
    one.watchLight.position.y += w.light.lift * this.watchK;
  }

  update(aliens, dt = 0) {
    this.time += dt;
    let n = 0;
    for (const a of aliens) {
      if (!a.active || n >= this.pool.length) continue;
      const one = this.pool[n++];
      const body = this.bodyOf(a.stage ?? 0).geometry;
      if (one.mesh.geometry !== body) one.mesh.geometry = body;
      const t = this.tmp;
      t.fill(0);
      this.targetPose(a, t);
      if (!a.alienPose) a.alienPose = Float32Array.from(t);
      const cur = a.alienPose;
      const k = Math.min(1, dt * this.cfg.poseRate);
      for (let i = 0; i < POSE_SIZE; i++) cur[i] += (t[i] - cur[i]) * k;
      one.list.forEach((b, i) => b.rotation.set(cur[i * 3], cur[i * 3 + 1], cur[i * 3 + 2]));
      one.root.position.y = cur[ROOT_Y];
      one.mesh.position.set(a.x, a.y, a.z);
      one.mesh.rotation.set(0, a.facing, 0);
      const f = a.flash > 0 ? Math.min(1, a.flash / this.cfg.hitFlashSeconds) : 0;
      one.material.color.copy(this.base).lerp(this.flashColour, f);
      one.mesh.visible = true;
      this.updateWatch(one, a);
    }
    for (let i = n; i < this.pool.length; i++) {
      this.pool[i].mesh.visible = false;
      this.updateWatch(this.pool[i], null);
    }
  }

  // ---- poses (radians; + x swings a hanging limb back, a torso forward) -------------------

  targetPose(a, p) {
    const set = (bone, x = 0, y = 0, z = 0) => {
      const i = B[bone] * 3;
      p[i] = x;
      p[i + 1] = y;
      p[i + 2] = z;
    };
    const h = this.cfg.height / 1.7; // the root's drops are in the built scale
    const t = this.time + (a.seed ?? 0);
    switch (a.state) {
      case 'examine':
        this.poseCrouch(set, p, h, 1);
        set('neck', -0.25, 0, 0);
        set('head', -0.2 + Math.sin(t * 0.9) * 0.08, Math.sin(t * 0.37) * 0.3, 0.4 + Math.sin(t * 0.5) * 0.1);
        set('shoulderL', -1.15 + Math.sin(t * 0.8) * 0.12, -0.2, 0.15); // reaching out, feeling
        set('elbowL', -0.35 + Math.sin(t * 1.3) * 0.15);
        set('wristL', 0.4);
        this.holdGunLow(set);
        break;
      case 'sneak': {
        this.poseCrouch(set, p, h, 0.6);
        const s = (a.walked ?? 0) * this.cfg.walkRate * 1.4;
        p[B.hipL * 3] += -Math.sin(s) * 0.3;
        p[B.hipR * 3] += Math.sin(s) * 0.3;
        set('head', -0.25, Math.sin(t * 0.6) * 0.25, 0);
        this.holdGunLow(set);
        break;
      }
      case 'walk': {
        const s = (a.walked ?? 0) * this.cfg.walkRate;
        const sin = Math.sin(s);
        set('hipL', -sin * 0.45);
        set('hipR', sin * 0.45);
        set('kneeL', (0.5 + 0.5 * Math.sin(s - 1.2)) * 0.8);
        set('kneeR', (0.5 + 0.5 * Math.sin(s + Math.PI - 1.2)) * 0.8);
        set('shoulderL', sin * 0.4, 0, 0.08);
        set('elbowL', -0.2);
        set('head', Math.sin(2 * s) * 0.05, Math.sin(t * 0.4) * 0.2, 0);
        this.holdGunLow(set);
        p[ROOT_Y] = -Math.abs(Math.cos(s)) * 0.02 * h;
        break;
      }
      case 'ambush': {
        // Coiled low, then it springs up and out, then lands crouched.
        const k = Math.min(1, (a.timer ?? 0) / this.cfg.ambushSeconds);
        const coil = k < 0.5 ? 1 : k < 0.7 ? 1 - (k - 0.5) / 0.2 : (k - 0.7) / 0.3 * 0.6;
        const leap = k >= 0.5 && k < 0.85 ? Math.sin(((k - 0.5) / 0.35) * Math.PI) : 0;
        this.poseCrouch(set, p, h, coil);
        p[ROOT_Y] += leap * 0.35 * h;
        set('shoulderL', -1.6 * leap - 0.3, 0, 0.5 * leap);
        set('shoulderR', -1.2 * leap - 0.2, 0, -0.4 * leap);
        set('wristR', 1.2 * leap);
        set('head', -0.3 * leap, 0, 0);
        break;
      }
      case 'aim':
      case 'fire': {
        this.poseIdle(set, t, 0.4);
        // The shotgun levelled at its hip, both hands on it, barrel ahead:
        // it hasn't learned to shoulder an Earth gun. Fire: it kicks up.
        const kick = a.state === 'fire' ? Math.exp(-(a.timer ?? 0) * this.cfg.recoilDecay) : 0;
        set('shoulderR', -0.45 - kick * 0.2, 0.15, -0.05);
        set('elbowR', -1.05 - kick * 0.35);
        set('wristR', 1.5 + kick * 0.1);
        set('shoulderL', -0.75, -0.55, -0.1);
        set('elbowL', -1.0);
        set('chest', 0.08 - kick * 0.15, 0.15, 0);
        set('head', 0.25 - kick * 0.1, -0.1, 0.12);
        break;
      }
      case 'flinch':
        this.poseIdle(set, t, 0);
        set('chest', -0.35);
        set('spine', -0.1);
        set('head', -0.4, 0, 0.3);
        set('shoulderL', 0.2, 0, 0.6);
        set('shoulderR', 0.2, 0, -0.4);
        this.holdGunLow(set, 0.3);
        break;
      case 'dying':
      case 'corpse':
        this.poseFall(set, p, h, a.state === 'corpse' ? 1 : Math.min(1, (a.timer ?? 0) / this.cfg.deathSeconds));
        break;
      default:
        this.poseIdle(set, t, 1);
        this.holdGunLow(set);
        break;
    }
  }

  // Standing: breathing; now and then its head tilts, curious (curious: 0..1).
  poseIdle(set, t, curious) {
    const breath = Math.sin(t * 1.9);
    set('chest', 0.02 * breath);
    set('spine', 0.01 * breath);
    // A tilt that holds, then shifts: quick, birdlike.
    const step = Math.floor(t * 0.7);
    const tilt = Math.sin(step * 12.9898) * 43758.5453;
    const r = tilt - Math.floor(tilt);
    set('head', 0.05, (r - 0.5) * 0.6 * curious, (r - 0.5) * 0.7 * curious);
    set('shoulderL', 0.03 * breath, 0, 0.06);
    set('elbowL', -0.15);
  }

  // The shotgun held low in its right hand, the barrel ahead.
  holdGunLow(set, slack = 0) {
    set('shoulderR', -0.25 + slack, 0, -0.08);
    set('elbowR', -0.55);
    set('wristR', 0.8);
  }

  // Crouched (amount 0..1): knees bent, leaning in, low.
  poseCrouch(set, p, h, amount) {
    set('hips', 0.3 * amount);
    set('hipL', -1.1 * amount - 0.3 * amount);
    set('hipR', -0.9 * amount - 0.3 * amount);
    set('kneeL', 1.6 * amount);
    set('kneeR', 1.5 * amount);
    set('ankleL', -0.4 * amount);
    set('ankleR', -0.4 * amount);
    set('spine', 0.2 * amount);
    set('chest', 0.15 * amount);
    set('neck', -0.35 * amount);
    p[ROOT_Y] = -0.3 * amount * h;
  }

  // Killed: its knees go, then it falls back (k 0..1).
  poseFall(set, p, h, k) {
    const a = Math.min(1, k / 0.4);
    const b = Math.max(0, (k - 0.4) / 0.6);
    set('hipL', -1.3 * a + 0.8 * b);
    set('hipR', -1.2 * a + 0.9 * b);
    set('kneeL', 2.0 * a - 1.2 * b);
    set('kneeR', 1.9 * a - 1.1 * b);
    set('root', -1.45 * b * b);
    set('head', 0.3 * a - 0.5 * b, 0.6 * b, 0);
    set('shoulderL', -0.4 * a + 0.3 * b, 0, 0.5 * b);
    set('shoulderR', -0.2 * a * (1 - b), 0, -1.0 * b); // the gun arm flung out to its side
    set('wristR', 0.8 * (1 - b) - 1.5 * b); // the gun ends up flat on the ground beside it
    p[ROOT_Y] = -0.38 * a * h * (1 - b) + 0.08 * h * b;
  }

  // Through the heat scope: faint and cold (t: config.viewModel.thermal).
  setThermal(on, t) {
    this.thermalOn = on;
    for (const o of this.pool) {
      if (on) o.material.emissive.setScalar(t.glow * this.cfg.thermalGlow);
      else if (this.watchColor) o.material.emissive.copy(this.watchColor).multiplyScalar(o.watchTint ?? 0);
      else o.material.emissive.setScalar(0);
    }
  }

  dispose() {
    for (const o of this.pool) {
      o.mesh.removeFromParent();
      o.mesh.skeleton.dispose();
      o.material.dispose();
      o.watchLight?.removeFromParent();
      o.watchMats?.forEach((m) => m.dispose());
    }
    if (this.watchGeo) Object.values(this.watchGeo).forEach((g) => g.dispose());
    for (const b of this.bodies.values()) b.geometry.dispose();
  }
}
