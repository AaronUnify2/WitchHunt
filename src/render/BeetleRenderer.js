// Giant beetles (Session 13; DESIGN.md "Giant beetles"): the model
// (render/beetleModel.js), one skinned mesh and one draw call each, all
// sharing one body. A glossy shell (Phong: the torch glints off it, so it
// reads as armour), the weak spot and eyes glowing (aGlow). Ready for the
// beetles' AI (M9.4: the outpost's crates), which hands update() its
// beetles: { active, x, y, z, facing, state, timer, walked, flash, sink }.
//
// States, posed procedurally and blended:
//  - idle: breathing, its mandibles working, its head turning;
//  - walk, charge: a tripod gait (three legs at a time), charge low and fast;
//  - attack: rears up, mandibles wide, then lunges and snaps (timer);
//  - threat: wing cases flared, mandibles clacking;
//  - flinch: recoils (a shot to the face);
//  - emerge: climbing out (sink 1..0); dying: flips onto its back, its legs
//    curling (timer); corpse.
// Through the heat scope: dim (config thermalGlow).

import * as THREE from 'three';
import { buildFigure, buildBones } from './figureKit.js';
import { beetleSpec, BEETLE_JOINTS, LEG_NAMES } from './beetleModel.js';

const NAMES = BEETLE_JOINTS.map(([name]) => name);
const B = Object.fromEntries(NAMES.map((n, i) => [n, i]));
const ROOT_Y = NAMES.length * 3; // a pose: rotations per bone, then the root's rise
const POSE_SIZE = ROOT_Y + 1;

const GLOW = {
  vertex: 'attribute float aGlow;\nvarying float vGlow;',
  fragment: 'varying float vGlow;\nuniform float uGlow;\nuniform vec3 uThermalNear;',
};

export class BeetleRenderer {
  // cfg: config.beetles.giant.
  constructor(cfg) {
    this.cfg = cfg;
  }

  init(scene, poolSize = this.cfg.poolSize) {
    const { geometry, joints } = buildFigure(beetleSpec(this.cfg));
    this.geometry = geometry;
    this.joints = joints;
    this.time = 0;
    this.base = new THREE.Color().setScalar(this.cfg.albedo);
    this.flashColour = new THREE.Color(...this.cfg.hitFlash);
    this.thermalNear = new THREE.Vector3(1, 0, 1);
    this.pool = Array.from({ length: poolSize }, () => this.makeOne(scene));
    this.meshes = this.pool.map((o) => o.mesh);
    this.tmp = new Float32Array(POSE_SIZE);
  }

  makeOne(scene) {
    const c = this.cfg;
    const { root, list } = buildBones(this.joints);
    const material = new THREE.MeshPhongMaterial({ vertexColors: true, specular: new THREE.Color(c.specular), shininess: c.shininess });
    material.color.copy(this.base);
    const uniforms = { uGlow: { value: 1 }, uThermalNear: { value: this.thermalNear } };
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${GLOW.vertex}`).replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlow = aGlow;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${GLOW.fragment}`)
        .replace(
          '#include <emissivemap_fragment>',
          // The heat scope's glow fades up close; the spot and eyes glow in their own colour.
          '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= mix(uThermalNear.x, 1.0, smoothstep(uThermalNear.y, uThermalNear.z, length(vViewPosition)));\ntotalEmissiveRadiance += vColor.rgb * vGlow * uGlow;',
        );
    };
    material.customProgramCacheKey = () => 'beetle-skinned';
    const mesh = new THREE.SkinnedMesh(this.geometry, material);
    mesh.add(root);
    mesh.bind(new THREE.Skeleton(list));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false; // posed every frame; a handful at most
    mesh.visible = false;
    scene.add(mesh);
    return { mesh, material, uniforms, list, root };
  }

  update(beetles, dt = 0) {
    this.time += dt;
    const c = this.cfg;
    const pulse = 0.75 + 0.25 * Math.sin(this.time * c.spotPulse * Math.PI * 2);
    let n = 0;
    for (const b of beetles) {
      if (!b.active || n >= this.pool.length) continue;
      const one = this.pool[n++];
      const t = this.tmp;
      t.fill(0);
      this.targetPose(b, t);
      if (!b.beetlePose) b.beetlePose = Float32Array.from(t);
      const cur = b.beetlePose;
      const k = Math.min(1, dt * c.poseRate);
      for (let i = 0; i < POSE_SIZE; i++) cur[i] += (t[i] - cur[i]) * k;
      one.list.forEach((bone, i) => bone.rotation.set(cur[i * 3], cur[i * 3 + 1], cur[i * 3 + 2]));
      one.root.position.y = cur[ROOT_Y];
      one.mesh.position.set(b.x, b.y - (b.sink ?? 0) * c.sinkDepth, b.z);
      one.mesh.rotation.set(0, b.facing, 0);
      const f = b.flash > 0 ? Math.min(1, b.flash / c.hitFlashSeconds) : 0;
      one.material.color.copy(this.base).lerp(this.flashColour, f);
      // The spot throbs while it lives; dark once it's dead.
      one.uniforms.uGlow.value = b.state === 'dying' || b.state === 'corpse' ? 0 : pulse;
      one.mesh.visible = true;
    }
    for (let i = n; i < this.pool.length; i++) this.pool[i].mesh.visible = false;
  }

  // ---- poses ---------------------------------------------------------------------------------

  targetPose(b, p) {
    const set = (bone, x = 0, y = 0, z = 0) => {
      const i = B[bone] * 3;
      p[i] = x;
      p[i + 1] = y;
      p[i + 2] = z;
    };
    const add = (bone, x = 0, y = 0, z = 0) => {
      const i = B[bone] * 3;
      p[i] += x;
      p[i + 1] += y;
      p[i + 2] += z;
    };
    const c = this.cfg;
    const t = this.time + (b.seed ?? 0);
    const mandibles = (open) => {
      set('mandR', 0, -open, 0);
      set('mandL', 0, open, 0);
    };
    switch (b.state) {
      case 'walk':
      case 'charge': {
        const charge = b.state === 'charge';
        this.gait(b, p, add, charge ? 1.35 : 1);
        set('thorax', charge ? 0.08 : 0, 0, 0);
        mandibles(charge ? 0.45 + Math.sin(t * 14) * 0.1 : 0.12 + Math.sin(t * 3) * 0.08);
        set('head', 0, Math.sin(t * 1.3) * 0.08, 0);
        p[ROOT_Y] += charge ? -0.05 : 0;
        break;
      }
      case 'attack': {
        // Rearing up, mandibles wide, then the lunge and the snap.
        const up = Math.min(1, (b.timer ?? 0) / c.attackWindup);
        const strike = Math.max(0, Math.min(1, ((b.timer ?? 0) - c.attackWindup) / c.strikeSeconds));
        const rear = up * (1 - strike);
        set('root', -0.55 * rear + 0.12 * strike, 0, 0);
        set('head', 0.35 * rear - 0.15 * strike, 0, 0);
        mandibles(0.75 * up * (1 - strike) + 0.05);
        this.legsBrace(add, rear);
        p[ROOT_Y] = 0.08 * rear;
        break;
      }
      case 'threat':
        // Wing cases flared up and out, front raised, mandibles clacking.
        set('elytraR', -0.35, -0.3, -1.05 + Math.sin(t * 22) * 0.04);
        set('elytraL', -0.35, 0.3, 1.05 - Math.sin(t * 22) * 0.04);
        set('root', -0.2, 0, 0);
        mandibles(0.3 + Math.abs(Math.sin(t * 9)) * 0.4);
        set('head', -0.1, Math.sin(t * 2) * 0.15, 0);
        this.legsBrace(add, 0.5);
        break;
      case 'flinch':
        set('head', -0.45, 0, 0.15);
        set('root', -0.15, 0, 0.05);
        mandibles(0.6);
        break;
      case 'dying':
      case 'corpse':
        this.poseFlip(b, p, set, add, b.state === 'corpse' ? 1 : Math.min(1, (b.timer ?? 0) / c.deathSeconds), t);
        break;
      case 'emerge':
        // Clawing its way out, front legs scrabbling.
        this.gait(b, p, add, 1.6, true);
        set('root', -0.25, 0, 0);
        mandibles(0.4 + Math.sin(t * 12) * 0.15);
        break;
      default: {
        // Idle: breathing, mandibles working, its head turning.
        set('abdomen', Math.sin(t * 1.5) * 0.03, 0, 0);
        mandibles(0.1 + Math.max(0, Math.sin(t * 2.4)) * 0.18);
        set('head', Math.sin(t * 0.7) * 0.05, Math.sin(t * 0.45) * 0.2, 0);
        for (const l of LEG_NAMES) add(l.hip, 0, 0, Math.sin(t * 0.8 + l.pair) * 0.02 * l.side);
        break;
      }
    }
  }

  // The tripod gait: legs front-left, middle-right and back-left swing
  // together, then the other three. scrabble: the front pair only, fast.
  gait(b, p, add, speed, scrabble = false) {
    const s = (scrabble ? this.time * 9 : (b.walked ?? 0) * this.cfg.strideRate) * speed;
    for (const l of LEG_NAMES) {
      if (scrabble && l.pair !== 0) continue;
      const group = (l.pair + (l.side > 0 ? 1 : 0)) % 2;
      const ph = s + group * Math.PI;
      const swing = Math.sin(ph) * 0.38; // forward and back (about y)
      const lift = Math.max(0, Math.cos(ph)) * 0.35; // up, while it swings forward
      add(l.hip, 0, swing * -l.side, lift * l.side);
      add(l.knee, 0, 0, -lift * 0.6 * l.side);
    }
    p[ROOT_Y] += Math.abs(Math.sin(s)) * 0.015;
    add('abdomen', 0, Math.sin(s) * 0.06, 0);
  }

  // The legs splayed and braced (amount 0..1), the back pair pushing.
  legsBrace(add, amount) {
    for (const l of LEG_NAMES) {
      const back = l.pair === 2 ? 1 : l.pair === 1 ? 0.4 : -0.3;
      add(l.hip, 0, back * 0.25 * -l.side * amount, -0.15 * l.side * amount);
    }
  }

  // Killed: it flips onto its back, legs curling in and twitching (k 0..1).
  poseFlip(b, p, set, add, k, t) {
    const flip = Math.min(1, k / 0.5);
    const curl = Math.min(1, k / 0.8);
    set('root', 0, 0, Math.PI * flip);
    p[ROOT_Y] = Math.sin(flip * Math.PI) * 0.25 + 0.55 * flip; // up over, onto its back (its shell on the ground)
    for (const l of LEG_NAMES) {
      const twitch = k < 1 ? Math.sin(t * 25 + l.pair * 2 + l.side) * 0.12 * (1 - k) : 0;
      add(l.hip, 0, 0, -0.9 * l.side * curl + twitch);
      add(l.knee, 0, 0, -1.3 * l.side * curl);
    }
    set('mandR', 0, -0.5 * curl, 0);
    set('mandL', 0, 0.5 * curl, 0);
  }

  // Through the heat scope: dim (t: config.viewModel.thermal).
  setThermal(on, t) {
    for (const o of this.pool) o.material.emissive.setScalar(on ? t.glow * this.cfg.thermalGlow : 0);
    this.thermalNear.set(on ? t.nearGlow : 1, t.nearMetres, t.farMetres);
  }

  dispose() {
    for (const o of this.pool) {
      o.mesh.removeFromParent();
      o.mesh.skeleton.dispose();
      o.material.dispose();
    }
    this.geometry.dispose();
  }
}
