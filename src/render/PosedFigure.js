// One figure-kit character posed in code (Session 24): the shared part of
// Bigfoot, Milo and the barn's animals. A figure is a spec (the kit's:
// render/figureKit.js) and a pose function; this builds it, skins it,
// blends from pose to pose and draws it as one mesh, one draw call, no
// lights.
//
// new PosedFigure({ spec, pose, albedo, poseRate, hitFlash, thermalGlow })
//  - pose(h, m, t): sets the target pose for what `m` is doing. h is
//    { set(bone, x, y, z), add(bone, x, y, z), rise(metres), tip(radians:
//    the whole figure pitched forward about its feet), k (the figure's
//    scale: its height / 1.7, for drops and rises) }. t: seconds, with m.seed.
//  - m: { x, y, z (the feet), facing, state, timer, walked, look, flash,
//    seed, ... } (whatever the pose function reads).

import * as THREE from 'three';
import { buildFigure, buildBones } from './figureKit.js';

const GLOW = {
  vertex: 'attribute float aGlow;\nvarying float vGlow;',
  fragment: 'varying float vGlow;\nuniform float uGlow;',
};

export class PosedFigure {
  constructor({ spec, pose, albedo = 1, poseRate = 10, hitFlash = [1.6, 1.4, 1.2], hitFlashSeconds = 0.12, thermalGlow = 1 }) {
    this.spec = spec;
    this.pose = pose;
    this.albedo = albedo;
    this.poseRate = poseRate;
    this.hitFlash = hitFlash;
    this.hitFlashSeconds = hitFlashSeconds;
    this.thermalGlow = thermalGlow;
  }

  init(scene) {
    const { geometry, joints } = buildFigure(this.spec);
    this.geometry = geometry;
    this.joints = joints;
    const names = Object.entries(joints)
      .sort((a, b) => a[1].i - b[1].i)
      .map(([name]) => name);
    this.B = Object.fromEntries(names.map((n, i) => [n, i]));
    this.ROOT_Y = names.length * 3;
    this.TIP = this.ROOT_Y + 1;
    this.size = this.ROOT_Y + 2;
    this.k = (this.spec.height ?? 1.7) / 1.7;
    const { root, list } = buildBones(joints);
    this.root = root;
    this.list = list;
    this.bones = Object.fromEntries(list.map((b) => [b.name, b]));
    this.material = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.base = new THREE.Color().setScalar(this.albedo);
    this.flashColour = new THREE.Color(...this.hitFlash);
    this.material.color.copy(this.base);
    this.uniforms = { uGlow: { value: 1 } };
    if (geometry.getAttribute('aGlow')) {
      this.material.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, this.uniforms);
        shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${GLOW.vertex}`).replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlow = aGlow;');
        shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\n${GLOW.fragment}`).replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vColor.rgb * vGlow * uGlow;');
      };
      this.material.customProgramCacheKey = () => 'posed-figure-glow';
    }
    this.mesh = new THREE.SkinnedMesh(geometry, this.material);
    this.mesh.add(root);
    this.mesh.bind(new THREE.Skeleton(list));
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false; // posed every frame; one of it
    this.mesh.visible = false;
    scene.add(this.mesh);
    this.meshes = [this.mesh];
    this.target = new Float32Array(this.size);
    this.current = null;
    this.time = 0;
    const p = this.target;
    const B = this.B;
    this.helpers = {
      set: (bone, x = 0, y = 0, z = 0) => {
        const i = B[bone] * 3;
        p[i] = x;
        p[i + 1] = y;
        p[i + 2] = z;
      },
      add: (bone, x = 0, y = 0, z = 0) => {
        const i = B[bone] * 3;
        p[i] += x;
        p[i + 1] += y;
        p[i + 2] += z;
      },
      rise: (metres) => {
        p[this.ROOT_Y] = metres;
      },
      tip: (radians) => {
        p[this.TIP] = radians;
      },
      k: this.k,
    };
  }

  // snap: jump straight to the pose (no blend).
  update(m, dt = 0, snap = false) {
    this.time += dt;
    if (!m?.active) {
      this.mesh.visible = false;
      return;
    }
    this.target.fill(0);
    this.pose(this.helpers, m, this.time + (m.seed ?? 0));
    if (!this.current || snap) this.current = Float32Array.from(this.target);
    const cur = this.current;
    const k = Math.min(1, dt * this.poseRate);
    for (let i = 0; i < this.size; i++) cur[i] += (this.target[i] - cur[i]) * k;
    this.list.forEach((b, i) => b.rotation.set(cur[i * 3], cur[i * 3 + 1], cur[i * 3 + 2]));
    this.root.position.y = cur[this.ROOT_Y];
    this.mesh.position.set(m.x, m.y, m.z);
    this.mesh.rotation.set(cur[this.TIP], m.facing ?? 0, 0, 'YXZ');
    const f = m.flash > 0 ? Math.min(1, m.flash / this.hitFlashSeconds) : 0;
    this.material.color.copy(this.base).lerp(this.flashColour, f);
    this.mesh.visible = true;
  }

  // Through the heat scope (t: config.viewModel.thermal).
  setThermal(on, t) {
    this.material.emissive.setScalar(on ? t.glow * this.thermalGlow : 0);
  }

  dispose() {
    this.mesh.removeFromParent();
    this.mesh.skeleton.dispose();
    this.material.dispose();
    this.geometry.dispose();
  }
}

// ---- pose pieces shared by the two-legged ------------------------------------------------------

// A walk: s is the stride's phase (radians), swing and bend how far the legs go.
export function legsWalk(h, s, swing = 0.4, bend = 0.6) {
  for (const [n, o] of [
    ['R', 0],
    ['L', Math.PI],
  ]) {
    const a = Math.sin(s + o);
    h.set(`hip${n}`, -a * swing);
    h.set(`knee${n}`, Math.max(0, Math.cos(s + o)) * bend + 0.08);
  }
  h.rise(Math.abs(Math.sin(s)) * 0.025 * h.k - 0.015 * h.k);
}

// Down on one knee (the right one on the ground). drop: how far the hips sink, in the built scale.
export function legsKneel(h, drop = 0.42) {
  h.set('hipR', 0.15);
  h.set('kneeR', 1.75);
  h.set('ankleR', 0.6);
  h.set('hipL', -1.5);
  h.set('kneeL', 1.6);
  h.rise(-drop * h.k);
}

// An arm: swung forward (+), out from the side (+), the elbow bent, the upper arm twisted.
export function arm(h, n, forward = 0, out = 0, bend = 0, twist = 0) {
  const s = n === 'R' ? -1 : 1;
  h.set(`shoulder${n}`, -forward, s * twist, s * out);
  h.set(`elbow${n}`, -bend, 0, 0);
}
