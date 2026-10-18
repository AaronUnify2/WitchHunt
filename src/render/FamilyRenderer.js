// The family's figures (Session 13, #148): Ellen, Wyatt and Junie, built
// with the figure kit (render/familyLooks.js). One skinned mesh and one draw
// call each, in config.story.family's order, so FamilyTalk can bob them and
// float its markers over their heads as before.
//
// Posed procedurally, blending into each new pose:
//  - stand: breathing, shifting their weight, each in their own way (Ellen
//    with her arms folded, Wyatt with his hands in his pockets, Junie
//    hugging her rabbit); their heads turn to look at you when you're near;
//  - walk, kneel, down: for cutscenes (setPose).
// Lit like the world; through the heat scope they glow (setThermal).

import * as THREE from 'three';
import { buildFigure, buildBones } from './figureKit.js';
import { familySpec } from './familyLooks.js';

const tmp = new THREE.Vector3();

export class FamilyRenderer {
  // cfg: config.family; ids: who, in order (config.story.family).
  constructor(cfg, ids) {
    this.cfg = cfg;
    this.ids = ids;
  }

  // parent: what they're added to; spots: [{ x, z }] where each stands;
  // floorY: the floor; facing: radians (each faces this way).
  init(parent, spots, floorY, facing) {
    this.time = 0;
    this.people = this.ids.map((id, i) => this.makeOne(id, i));
    this.meshes = this.people.map((p) => p.mesh);
    this.people.forEach((p, i) => {
      const s = spots[i] ?? spots[0];
      p.mesh.position.set(s.x, floorY, s.z);
      p.facing = typeof facing === 'function' ? facing(s) : facing;
      p.mesh.rotation.y = p.facing;
      parent.add(p.mesh);
    });
  }

  makeOne(id, i) {
    const person = this.cfg.people[id];
    const { geometry, joints } = buildFigure(familySpec(id, person));
    const { root, bones, list } = buildBones(joints);
    const material = new THREE.MeshLambertMaterial({ vertexColors: true });
    material.color.setScalar(this.cfg.albedo);
    const mesh = new THREE.SkinnedMesh(geometry, material);
    mesh.name = id;
    mesh.add(root);
    mesh.bind(new THREE.Skeleton(list));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false; // posed every frame; three of them
    const names = list.map((b) => b.name);
    return { id, idle: person.idle, mesh, material, bones, list, root, names, pose: 'stand', poseTime: 0, cur: null, target: new Float32Array(names.length * 3 + 2), seed: i * 2.3, headYaw: 0, headPitch: 0 };
  }

  // A pose for one of them (cutscenes, the viewer): 'stand', 'walk',
  // 'kneel' or 'down'.
  setPose(i, pose) {
    const p = this.people[i];
    if (!p || p.pose === pose) return;
    p.pose = pose;
    p.poseTime = 0;
  }

  // lookAt: a point their heads turn to when it's near (the camera), or null.
  update(dt, lookAt = null) {
    this.time += dt;
    for (const p of this.people) {
      p.poseTime += dt;
      const t = p.target;
      t.fill(0);
      this.targetPose(p, t);
      this.lookToward(p, lookAt, dt, t);
      if (!p.cur) p.cur = Float32Array.from(t);
      const k = Math.min(1, dt * this.cfg.poseRate);
      for (let j = 0; j < t.length; j++) p.cur[j] += (t[j] - p.cur[j]) * k;
      p.list.forEach((b, j) => b.rotation.set(p.cur[j * 3], p.cur[j * 3 + 1], p.cur[j * 3 + 2]));
      const n = p.list.length * 3;
      p.root.position.y = p.cur[n];
      p.root.position.z = p.cur[n + 1];
    }
  }

  // ---- poses (radians; + x swings a hanging limb back, a torso forward) -----------------

  targetPose(p, pose) {
    const set = (bone, x = 0, y = 0, z = 0) => {
      const j = p.names.indexOf(bone) * 3;
      pose[j] = x;
      pose[j + 1] = y;
      pose[j + 2] = z;
    };
    const n = p.list.length * 3;
    const t = this.time + p.seed;
    switch (p.pose) {
      case 'walk': {
        const s = p.poseTime * this.cfg.walkRate;
        const sin = Math.sin(s);
        set('hipL', -sin * 0.45);
        set('hipR', sin * 0.45);
        set('kneeL', (0.5 + 0.5 * Math.sin(s - 1.2)) * 0.7);
        set('kneeR', (0.5 + 0.5 * Math.sin(s + Math.PI - 1.2)) * 0.7);
        set('shoulderL', sin * 0.35, 0, 0.05);
        set('shoulderR', -sin * 0.35, 0, -0.05);
        set('elbowL', -0.25);
        set('elbowR', -0.25);
        set('spine', 0.04, sin * 0.06);
        set('chest', 0, -sin * 0.08);
        pose[n] = -Math.abs(Math.cos(s)) * 0.025;
        break;
      }
      case 'kneel':
        this.poseStand(p, set, t);
        set('hipL', -1.5);
        set('hipR', -0.2);
        set('kneeL', 1.55);
        set('kneeR', 2.3);
        set('ankleR', -0.6);
        set('spine', 0.15);
        pose[n] = -0.42 * this.heightOf(p);
        break;
      case 'down':
        // Fallen on their back.
        set('root', -1.48);
        set('shoulderL', -0.3, 0, 0.4);
        set('shoulderR', 0.2, 0, -0.5);
        set('kneeL', 0.4);
        set('hipL', -0.3);
        set('head', 0, 0.4, 0);
        pose[n] = 0.12 * this.heightOf(p);
        pose[n + 1] = 0.4 * this.heightOf(p);
        break;
      default:
        this.poseStand(p, set, t);
        break;
    }
  }

  heightOf(p) {
    return this.cfg.people[p.id].height / 1.7;
  }

  // Standing: breathing, shifting their weight now and then, in their own way.
  poseStand(p, set, t) {
    const breath = Math.sin(t * 1.4);
    const shift = Math.sin(t * 0.23) * 0.5 + Math.sin(t * 0.11) * 0.5; // -1..1, slow
    set('hips', 0, 0, shift * 0.04);
    set('hipL', 0, 0, -shift * 0.04);
    set('hipR', 0, 0, -shift * 0.04);
    set('kneeL', Math.max(0, shift) * 0.12);
    set('kneeR', Math.max(0, -shift) * 0.12);
    set('spine', 0.01 * breath, 0, -shift * 0.02);
    set('chest', 0.015 * breath);
    switch (p.idle) {
      case 'folded': // arms folded across her chest
        set('shoulderR', -0.45, 1.0, 0.2);
        set('elbowR', -1.85);
        set('shoulderL', -0.4, -1.0, -0.2);
        set('elbowL', -1.7);
        break;
      case 'pockets': // hands in his jeans pockets
        set('shoulderR', 0.18, 0, -0.14);
        set('elbowR', -0.38);
        set('wristR', 0.2);
        set('shoulderL', 0.18, 0, 0.14);
        set('elbowL', -0.38);
        set('wristL', 0.2);
        break;
      case 'hug': // hugging her rabbit to her chest
        set('shoulderR', -0.55, 0.9, 0.15);
        set('elbowR', -1.95);
        set('shoulderL', -0.5, -0.95, -0.15);
        set('elbowL', -1.9);
        break;
      default:
        set('shoulderR', 0.02 * breath, 0, -0.06);
        set('shoulderL', 0.02 * breath, 0, 0.06);
        set('elbowR', -0.1);
        set('elbowL', -0.1);
        break;
    }
  }

  // Their heads turn to whoever's near (within cfg.look.range), easing,
  // never further than they could turn; the neck takes a share.
  lookToward(p, at, dt, pose) {
    const l = this.cfg.look;
    let yaw = 0;
    let pitch = 0;
    if (at && p.pose !== 'down') {
      p.mesh.getWorldPosition(tmp);
      const dx = at.x - tmp.x;
      const dz = at.z - tmp.z;
      const d = Math.hypot(dx, dz);
      if (d < l.range) {
        let a = Math.atan2(dx, dz) - p.facing;
        a = Math.atan2(Math.sin(a), Math.cos(a));
        yaw = Math.max(-l.maxYaw, Math.min(l.maxYaw, a));
        const eye = tmp.y + this.cfg.people[p.id].height * 0.93;
        pitch = Math.max(-l.maxPitch, Math.min(l.maxPitch, -Math.atan2(at.y - eye, d)));
      }
    }
    const k = Math.min(1, dt * l.rate);
    p.headYaw += (yaw - p.headYaw) * k;
    p.headPitch += (pitch - p.headPitch) * k;
    const neck = p.names.indexOf('neck') * 3;
    const head = p.names.indexOf('head') * 3;
    pose[neck + 1] += p.headYaw * 0.35;
    pose[head + 1] += p.headYaw * 0.65;
    pose[head] += p.headPitch;
  }

  // Through the heat scope they glow (t: config.viewModel.thermal).
  setThermal(on, t) {
    for (const p of this.people) p.material.emissive.setScalar(on ? t.glow * this.cfg.thermalGlow : 0);
  }

  dispose() {
    for (const p of this.people) {
      p.mesh.removeFromParent();
      p.mesh.skeleton.dispose();
      p.mesh.geometry.dispose();
      p.material.dispose();
    }
  }
}
