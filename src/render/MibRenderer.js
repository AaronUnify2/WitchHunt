// The Men in Black, armed (Session 13; DESIGN.md "Men in Black"): the
// model (render/mibModel.js: the cutscenes' Man in Black and his weapon),
// one skinned mesh and one draw call each, one body per weapon, shared.
// Ready for their AI (M11: the Car Armory, the government base, Ground
// Zero), which hands update() its agents: { active, x, y, z, facing,
// state, timer, walked, flash, weapon ('pistol' | 'smg' | 'sniper'),
// aimPitch (radians, + down) }; muzzleOf() says where a shot leaves.
//
// States, posed procedurally and blended:
//  - idle, patrol: unaware (DESIGN.md: until he sees you in light or hears
//    gunfire): standing or walking his beat, the weapon held low;
//  - alert: standing, the weapon at the ready; walk: advancing at the
//    ready; run: running, the weapon across his chest;
//  - aim, fire: the weapon up on his eye line (fire: the kick, timer from
//    the shot); a pistol two-handed at arm's length, a long gun shouldered;
//  - cover: crouched on one knee behind cover, at the ready; coverAim:
//    crouched, aiming over it;
//  - flinch: hit; dying: his knees go and he falls back (timer); corpse.
//
// The arms are solved, not keyed: the weapon is placed where it should be
// (on the eye line, aiming; lower at the ready) and each arm reaches for
// it (two-bone IK), so every hold works standing, crouched or leaning.

import * as THREE from 'three';
import { buildFigure, buildBones } from './figureKit.js';
import { mibAgentSpec, WEAPONS, WEAPON_IDS } from './mibModel.js';

const BUILT = new Map(); // weapon id -> { geometry, joints }

const v1 = new THREE.Vector3();
const v2 = new THREE.Vector3();
const m2 = new THREE.Matrix4();
const m3 = new THREE.Matrix4();
const euler = new THREE.Euler();
const quat = new THREE.Quaternion();
const ONE = new THREE.Vector3(1, 1, 1);

export class MibRenderer {
  // cfg: config.mibAgents; person: config.people.mib.
  constructor(cfg, person) {
    this.cfg = cfg;
    this.person = person;
  }

  init(scene, poolSize = this.cfg.poolSize) {
    const { joints } = this.bodyOf('pistol');
    this.joints = joints;
    this.names = Object.entries(joints)
      .sort((a, b) => a[1].i - b[1].i)
      .map(([name]) => name);
    this.B = Object.fromEntries(this.names.map((n, i) => [n, i]));
    this.ROOT_Y = this.names.length * 3;
    this.POSE_SIZE = this.ROOT_Y + 1;
    this.k = this.person.height / 1.7; // built space -> his size
    this.time = 0;
    this.base = new THREE.Color().setScalar(this.cfg.albedo);
    this.flashColour = new THREE.Color(...this.cfg.hitFlash);
    this.pool = Array.from({ length: poolSize }, () => this.makeOne(scene));
    this.meshes = this.pool.map((o) => o.mesh);
    this.tmp = new Float32Array(this.POSE_SIZE);
  }

  bodyOf(weapon) {
    const id = WEAPONS[weapon] ? weapon : WEAPON_IDS[0];
    if (!BUILT.has(id)) BUILT.set(id, buildFigure(mibAgentSpec(this.person, id, this.cfg.colours)));
    return BUILT.get(id);
  }

  makeOne(scene) {
    const { root, bones, list } = buildBones(this.joints);
    const material = new THREE.MeshLambertMaterial({ vertexColors: true });
    material.color.copy(this.base);
    const mesh = new THREE.SkinnedMesh(this.bodyOf('pistol').geometry, material);
    mesh.add(root);
    mesh.bind(new THREE.Skeleton(list));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false; // posed every frame; a squad at most
    mesh.visible = false;
    scene.add(mesh);
    return { mesh, material, bones, list, root, weapon: 'pistol' };
  }

  update(agents, dt = 0) {
    this.time += dt;
    let n = 0;
    for (const a of agents) {
      if (!a.active || n >= this.pool.length) continue;
      const one = this.pool[n++];
      const weapon = WEAPONS[a.weapon] ? a.weapon : 'pistol';
      if (one.weapon !== weapon) {
        one.mesh.geometry = this.bodyOf(weapon).geometry;
        one.weapon = weapon;
      }
      const t = this.tmp;
      t.fill(0);
      this.targetPose(a, weapon, t);
      if (!a.mibPose) a.mibPose = Float32Array.from(t);
      const cur = a.mibPose;
      // Firing, he follows the kick closely (blending would smooth it away).
      const k = Math.min(1, dt * (a.state === 'fire' || a.firing ? this.cfg.firePoseRate : this.cfg.poseRate));
      for (let i = 0; i < this.POSE_SIZE; i++) cur[i] += (t[i] - cur[i]) * k;
      one.list.forEach((b, i) => b.rotation.set(cur[i * 3], cur[i * 3 + 1], cur[i * 3 + 2]));
      one.root.position.y = cur[this.ROOT_Y];
      one.mesh.position.set(a.x, a.y, a.z);
      one.mesh.rotation.set(0, a.facing, 0);
      const f = a.flash > 0 ? Math.min(1, a.flash / this.cfg.hitFlashSeconds) : 0;
      one.material.color.copy(this.base).lerp(this.flashColour, f);
      one.mesh.visible = true;
    }
    for (let i = n; i < this.pool.length; i++) this.pool[i].mesh.visible = false;
  }

  // Where the n-th shown agent's shots leave his weapon (world space): out.
  muzzleOf(n, out = new THREE.Vector3()) {
    const one = this.pool[n];
    one.mesh.updateMatrixWorld(true);
    const [mx, my, mz] = WEAPONS[one.weapon].muzzle; // from the wrist, in its frame (built space)
    return out.set(mx * this.k, my * this.k, mz * this.k).applyMatrix4(one.bones.wristR.matrixWorld);
  }

  // ---- poses (radians; + x swings a hanging limb back, a torso forward) -------------------

  targetPose(a, weapon, p) {
    const set = (bone, x = 0, y = 0, z = 0) => {
      const i = this.B[bone] * 3;
      p[i] = x;
      p[i + 1] = y;
      p[i + 2] = z;
    };
    const c = this.cfg;
    const k = this.k;
    const t = this.time + (a.seed ?? 0);
    const pitch = a.aimPitch ?? 0;
    switch (a.state) {
      case 'patrol': {
        this.legsWalk(set, p, (a.walked ?? 0) * c.walkRate, 0.4, 0.6);
        set('head', 0, Math.sin(t * 0.5) * 0.25, 0); // looking about
        this.hold(a, weapon, p, set, 'low', WEAPONS[weapon].rifle ? 0.6 : 0.9);
        break;
      }
      case 'walk':
        this.legsWalk(set, p, (a.walked ?? 0) * c.walkRate, 0.4, 0.6);
        this.hold(a, weapon, p, set, 'ready', pitch + 0.35);
        break;
      case 'run': {
        const s = (a.walked ?? 0) * c.runRate;
        this.legsWalk(set, p, s, 0.8, 1.2);
        set('spine', 0.12, Math.sin(s) * 0.05);
        set('chest', 0.12, -Math.sin(s) * 0.12);
        p[this.ROOT_Y] = (Math.abs(Math.sin(s)) * 0.04 - 0.03) * k;
        this.hold(a, weapon, p, set, 'ready', 0.75);
        break;
      }
      case 'aim':
      case 'fire': {
        this.legsStance(set, t);
        const kick = a.state === 'fire' ? Math.exp(-(a.timer ?? 0) * c.recoilDecay) * c.recoil[weapon] : 0;
        if (weapon === 'sniper') {
          set('neck', 0.1);
          set('head', 0.12, 0, 0.05); // his cheek down on the stock
        }
        set('chest', -kick * 0.3);
        this.hold(a, weapon, p, set, 'aim', pitch - kick, kick);
        break;
      }
      case 'cover':
        this.legsKneel(set, p);
        this.hold(a, weapon, p, set, 'ready', 0.6);
        set('head', -0.05, Math.sin(t * 0.4) * 0.2, 0);
        break;
      case 'coverAim': {
        this.legsKneel(set, p);
        set('spine', 0.05);
        const kick = (a.timer ?? -1) >= 0 && a.firing ? Math.exp(-(a.timer ?? 0) * c.recoilDecay) * c.recoil[weapon] : 0;
        this.hold(a, weapon, p, set, 'aim', pitch - kick, kick);
        break;
      }
      case 'flinch':
        this.legsStance(set, t);
        set('chest', -0.3, 0.15, 0);
        set('spine', -0.1);
        set('head', -0.35, 0, 0.25);
        this.hold(a, weapon, p, set, 'ready', 0.2);
        break;
      case 'dying':
      case 'corpse':
        this.poseFall(set, p, a.state === 'corpse' ? 1 : Math.min(1, (a.timer ?? 0) / c.deathSeconds));
        break;
      case 'alert':
        this.legsStance(set, t);
        this.breathe(set, t);
        this.hold(a, weapon, p, set, 'ready', 0.55);
        break;
      default: // idle: unaware, standing his post
        this.breathe(set, t);
        set('head', 0, Math.sin(t * 0.3) * 0.3, 0);
        this.hold(a, weapon, p, set, 'low', WEAPONS[weapon].rifle ? 0.6 : 1.0);
        break;
    }
  }

  breathe(set, t) {
    const b = Math.sin(t * 1.4);
    set('spine', 0.01 * b);
    set('chest', 0.015 * b);
  }

  // Walking or running (stride amplitudes: hips, knees).
  legsWalk(set, p, s, hip, knee) {
    const sin = Math.sin(s);
    set('hipL', -sin * hip);
    set('hipR', sin * hip);
    set('kneeL', (0.5 + 0.5 * Math.sin(s - 1.2)) * knee);
    set('kneeR', (0.5 + 0.5 * Math.sin(s + Math.PI - 1.2)) * knee);
    set('spine', 0.03, sin * 0.05);
    p[this.ROOT_Y] = -Math.abs(Math.cos(s)) * 0.025 * this.k;
  }

  // A shooter's stance: feet apart, the right foot back, knees soft.
  legsStance(set, t) {
    set('hipL', -0.12, 0, 0.08);
    set('hipR', 0.12, 0, -0.08);
    set('kneeL', 0.14);
    set('kneeR', 0.1);
    set('ankleL', -0.02);
    set('spine', 0.06 + Math.sin(t * 1.4) * 0.008);
  }

  // Down on his right knee (behind cover).
  legsKneel(set, p) {
    set('hipL', -1.45);
    set('kneeL', 1.6);
    set('ankleL', -0.15);
    set('hipR', -0.15);
    set('kneeR', 2.25);
    set('ankleR', -0.5);
    set('spine', 0.12);
    p[this.ROOT_Y] = -0.42 * this.k;
  }

  // Killed: his knees go, then he falls back, the weapon flung aside (k 0..1).
  poseFall(set, p, k) {
    const a = Math.min(1, k / 0.4);
    const b = Math.max(0, (k - 0.4) / 0.6);
    set('hipL', -1.2 * a + 0.8 * b);
    set('hipR', -1.0 * a + 0.75 * b);
    set('kneeL', 1.9 * a - 1.3 * b);
    set('kneeR', 1.7 * a - 1.0 * b);
    set('root', -1.48 * b * b);
    set('head', 0.3 * a - 0.4 * b, 0.5 * b, 0);
    set('shoulderL', -0.5 * a + 0.4 * b, 0, 0.55 * b);
    set('elbowL', -0.4 * a);
    set('shoulderR', -0.6 * a * (1 - b), 0, -1.1 * b);
    set('elbowR', -0.5 * (1 - b));
    set('wristR', 0.9 * (1 - b) - 1.4 * b); // the weapon ends up flat beside him
    p[this.ROOT_Y] = (-0.38 * a * (1 - b) + 0.1 * b) * this.k;
  }

  // ---- the weapon and the arms --------------------------------------------------------------

  // Holds the weapon (mode: 'aim' on the eye line, 'ready' lower and
  // pointing down by `pitch`, 'low' hanging at his side or slung), the
  // arms solved to it. pitch: radians, + down. kick: the recoil (0..1).
  hold(a, weapon, p, set, mode, pitch, kick = 0) {
    const wpn = WEAPONS[weapon];
    const k = this.k;
    const J = this.joints;
    // The chest's frame in model space, from the pose so far.
    const chest = this.chainMatrix(p, ['root', 'hips', 'spine', 'chest'], m3);
    // The aim: ahead, pitched (+ down), in model space; and the gun's up.
    const aim = v1.set(0, -Math.sin(pitch), Math.cos(pitch));
    const up = v2.set(0, Math.cos(pitch), Math.sin(pitch));
    // The eye, carried by the chest (the neck's small turns aside).
    const eye = new THREE.Vector3(wpn.rifle ? -0.033 * k : 0, 0.08 * k, 0.085 * k).add(J.head.p).sub(J.chest.p).applyMatrix4(chest);
    let wrist;
    if (mode === 'low') {
      // Hanging at his side (a pistol) or slung low across him (a long gun).
      const s = J.shoulderR.p.clone().sub(J.chest.p).applyMatrix4(chest);
      wrist = wpn.rifle ? s.add(new THREE.Vector3(0.1 * k, -0.4 * k, 0.2 * k)) : s.add(new THREE.Vector3(-0.02 * k, -0.47 * k, 0.1 * k));
    } else {
      // On the eye line ('aim'), or lowered from it ('ready': the same hold, pitched down).
      const reach = wpn.reach * k - kick * 0.04 * k;
      wrist = eye.clone().addScaledVector(aim, reach).addScaledVector(up, -wpn.sight * k);
      if (mode === 'ready') wrist.addScaledVector(up, -0.06 * k);
    }
    // The gun's frame (the wrist's): x to his left, y up, z along the barrel.
    const gun = new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(up, aim), up.clone(), aim.clone());
    this.reach(p, chest, 'R', wrist, gun, [-0.7, -1, -0.25]);
    // The left hand: on the weapon (two-handed), or swinging free with a low pistol.
    if (mode === 'low' && !wpn.rifle) {
      set('shoulderL', 0.03, 0, 0.06);
      set('elbowL', -0.15);
    } else {
      const [sx, sy, sz] = wpn.support;
      const left = new THREE.Vector3(sx * k, sy * k, sz * k).applyMatrix4(gun).add(wrist);
      this.reach(p, chest, 'L', left, gun, [0.7, -1, -0.25]);
    }
    // His head follows the aim.
    if (mode === 'aim') {
      const i = this.B.head * 3;
      p[i] += pitch * 0.6;
    }
  }

  // The chain's frame in model space, from the pose (root's rise included).
  chainMatrix(p, chain, out) {
    out.identity();
    let prev = null;
    for (const name of chain) {
      const j = this.joints[name];
      const i = this.B[name] * 3;
      const off = prev ? v2.copy(j.p).sub(prev) : v2.set(0, p[this.ROOT_Y], 0).add(j.p);
      quat.setFromEuler(euler.set(p[i], p[i + 1], p[i + 2]));
      m2.compose(off, quat, ONE);
      out.multiply(m2);
      prev = j.p;
    }
    return out;
  }

  // Two-bone IK: the side's ('R' | 'L') shoulder and elbow turned so its
  // wrist reaches `target` (model space), the wrist turned to `frame` (a
  // model-space basis; the hand's rest frame is its identity). pole: the
  // way the elbow points (model space, roughly).
  reach(p, chest, side, target, frame, pole) {
    const J = this.joints;
    const S = J[`shoulder${side}`].p;
    const E = J[`elbow${side}`].p;
    const Wr = J[`wrist${side}`].p;
    const a = E.distanceTo(S);
    const b = Wr.distanceTo(E);
    // Into the chest's frame (the shoulder's parent), relative to the shoulder.
    const inv = new THREE.Matrix4().copy(chest).invert();
    const chestRot = new THREE.Matrix4().extractRotation(chest);
    const invRot = chestRot.clone().transpose();
    const sLocal = S.clone().sub(J.chest.p);
    const d = target.clone().applyMatrix4(inv).sub(sLocal);
    const len = Math.min(d.length(), (a + b) * 0.999);
    const dn = d.clone().normalize();
    const pl = new THREE.Vector3(...pole).normalize().applyMatrix4(invRot);
    pl.addScaledVector(dn, -pl.dot(dn)).normalize();
    const cosA = Math.max(-1, Math.min(1, (a * a + len * len - b * b) / (2 * a * len)));
    const alpha = Math.acos(cosA);
    const u = dn.clone().multiplyScalar(Math.cos(alpha)).addScaledVector(pl, Math.sin(alpha)); // the upper arm
    const elbow = u.clone().multiplyScalar(a);
    const f = dn.clone().multiplyScalar(len).sub(elbow).normalize(); // the forearm
    // The shoulder's turn: its rest frame (the upper arm down, bending ahead) onto the solved one.
    const d0 = E.clone().sub(S).normalize();
    const rest = frameOf(d0, new THREE.Vector3(0, 0, 1));
    let bend = f.clone().addScaledVector(u, -f.dot(u));
    if (bend.lengthSq() < 1e-6) bend = pl.clone().negate();
    const solved = frameOf(u, bend.normalize());
    const Rs = solved.multiply(rest.transpose());
    this.setFrom(p, `shoulder${side}`, Rs);
    // The elbow: a hinge about its x, from the rest forearm onto the solved one.
    const f0 = Wr.clone().sub(E).normalize();
    const g = f.clone().applyMatrix4(Rs.clone().transpose());
    const th = Math.atan2(g.z, -g.y) - Math.atan2(f0.z, -f0.y);
    const Re = new THREE.Matrix4().makeRotationX(-th);
    this.setFrom(p, `elbow${side}`, Re);
    // The wrist: the weapon's frame, in the forearm's.
    const Rw = Rs.clone().multiply(Re).transpose().multiply(invRot.clone().multiply(frame));
    this.setFrom(p, `wrist${side}`, Rw);
  }

  setFrom(p, bone, m) {
    euler.setFromRotationMatrix(m);
    const i = this.B[bone] * 3;
    p[i] = euler.x;
    p[i + 1] = euler.y;
    p[i + 2] = euler.z;
  }

  // Through the heat scope they glow, warm and living (t: config.viewModel.thermal).
  setThermal(on, t) {
    for (const o of this.pool) o.material.emissive.setScalar(on ? t.glow * this.cfg.thermalGlow : 0);
  }

  dispose() {
    for (const o of this.pool) {
      o.mesh.removeFromParent();
      o.mesh.skeleton.dispose();
      o.material.dispose();
    }
  }
}

// A rotation whose -y is `down` and whose z leans toward `ahead`.
function frameOf(down, ahead) {
  const y = down.clone().negate();
  const z = ahead.clone().addScaledVector(y, -ahead.dot(y)).normalize();
  const x = new THREE.Vector3().crossVectors(y, z);
  return new THREE.Matrix4().makeBasis(x, y, z);
}
