// The Mothman (Session 24; DESIGN.md "The Mothman"): the model
// (render/mothmanModel.js), one skinned mesh, one draw call, no lights.
// Matte dark fur and dusty wings; his eyes glow in their own colour and
// aren't fogged (aGlow), so they show red in the treeline long before the
// rest of him does. Ready for his encounters' AI (Session 25 on), which
// hands update() what he's doing:
// { active, x, y, z, facing, state, timer, flap (radians, the wingbeat's
// phase: his own if left out), pitch, roll (radians, on top of the pose's:
// climbing, diving, banking), look (radians: his head turned toward
// something, from straight ahead), flash, seed }.
//
// Standing states take x, y, z as his feet; flying ones (FLYING) as the
// middle of his body, which he pitches and banks about.
//
// States, posed procedurally and blended:
//  - stand: wings closed behind him like a cloak, breathing, watching;
//  - mantle: wings thrown wide (the eye-spots), claws out, the screech;
//  - perch: landed in a crouch, wings half open, knuckles down;
//  - cling: flat to a wall or trunk, limbs splayed, the head turned right
//    round to look back over his shoulder;
//  - glide, fly: level, the wings held out or beating (flap);
//  - dive: wings swept back, claws reaching ahead; strike: the rake (timer);
//  - flinch: recoils (a hit);
//  - wounded: hunched, one wing dragging (the cave);
//  - dying: goes down on his face, the wings settling over him (timer);
//    corpse: the eyes out.
// Through the heat scope: dim (config thermalGlow).

import * as THREE from 'three';
import { buildFigure, buildBones } from './figureKit.js';
import { mothmanSpec, MOTHMAN_JOINTS } from './mothmanModel.js';

const NAMES = MOTHMAN_JOINTS.map(([name]) => name);
const B = Object.fromEntries(NAMES.map((n, i) => [n, i]));
const ROOT_Y = NAMES.length * 3; // a pose: rotations per bone, then the root's rise,
const PITCH = ROOT_Y + 1; // how far he's tipped forward,
const ANCHOR = ROOT_Y + 2; // and whether he turns about his feet (0) or his middle (1)
const POSE_SIZE = ROOT_Y + 3;

export const FLYING = new Set(['glide', 'fly', 'dive', 'strike']);

const SIDES = [
  ['R', -1],
  ['L', 1],
];

const GLOW = {
  vertex: 'attribute float aGlow;\nvarying float vGlow;',
  fragment: 'varying float vGlow;\nuniform float uGlow;\nuniform vec3 uThermalNear;',
};

const qHeading = new THREE.Quaternion();
const qRoll = new THREE.Quaternion();
const qPitch = new THREE.Quaternion();
const AXIS_X = new THREE.Vector3(1, 0, 0);
const AXIS_Y = new THREE.Vector3(0, 1, 0);
const AXIS_Z = new THREE.Vector3(0, 0, 1);
const middle = new THREE.Vector3();

export class MothmanRenderer {
  // cfg: config.mothman.
  constructor(cfg) {
    this.cfg = cfg;
  }

  init(scene, poolSize = this.cfg.poolSize) {
    const { geometry, joints } = buildFigure(mothmanSpec(this.cfg));
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
    const { root, list } = buildBones(this.joints);
    const material = new THREE.MeshLambertMaterial({ vertexColors: true });
    material.color.copy(this.base);
    const uniforms = { uGlow: { value: 1 }, uThermalNear: { value: this.thermalNear } };
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${GLOW.vertex}`).replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlow = aGlow;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${GLOW.fragment}`)
        .replace(
          '#include <emissivemap_fragment>',
          // The heat scope's glow fades up close; the eyes glow in their own colour.
          '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= mix(uThermalNear.x, 1.0, smoothstep(uThermalNear.y, uThermalNear.z, length(vViewPosition)));\ntotalEmissiveRadiance += vColor.rgb * vGlow * uGlow;',
        )
        // The eyes aren't fogged: they show through it, far off.
        .replace('#include <fog_fragment>', 'vec3 mothUnfogged = gl_FragColor.rgb;\n#include <fog_fragment>\ngl_FragColor.rgb = mix(gl_FragColor.rgb, mothUnfogged, clamp(vGlow * uGlow, 0.0, 1.0));');
    };
    material.customProgramCacheKey = () => 'mothman-skinned';
    const mesh = new THREE.SkinnedMesh(this.geometry, material);
    mesh.add(root);
    mesh.bind(new THREE.Skeleton(list));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false; // posed every frame; one of him
    mesh.visible = false;
    scene.add(mesh);
    return { mesh, material, uniforms, list, root };
  }

  update(mothmen, dt = 0) {
    this.time += dt;
    const c = this.cfg;
    let n = 0;
    for (const m of mothmen) {
      if (!m.active || n >= this.pool.length) continue;
      const one = this.pool[n++];
      const t = this.tmp;
      t.fill(0);
      this.targetPose(m, t);
      if (!m.mothPose) m.mothPose = Float32Array.from(t);
      const cur = m.mothPose;
      const k = Math.min(1, dt * c.poseRate);
      for (let i = 0; i < POSE_SIZE; i++) cur[i] += (t[i] - cur[i]) * k;
      one.list.forEach((bone, i) => bone.rotation.set(cur[i * 3], cur[i * 3 + 1], cur[i * 3 + 2]));
      one.root.position.y = cur[ROOT_Y];
      // Heading, then the bank about the way he's going, then the pitch.
      qHeading.setFromAxisAngle(AXIS_Y, m.facing ?? 0);
      qRoll.setFromAxisAngle(AXIS_Z, m.roll ?? 0);
      qPitch.setFromAxisAngle(AXIS_X, cur[PITCH] + (m.pitch ?? 0));
      one.mesh.quaternion.copy(qHeading).multiply(qRoll).multiply(qPitch);
      // Flying, he turns about his middle (x, y, z is there); standing, about his feet.
      middle.set(0, c.height * c.middle * cur[ANCHOR], 0).applyQuaternion(one.mesh.quaternion);
      one.mesh.position.set(m.x - middle.x, m.y - middle.y, m.z - middle.z);
      const f = m.flash > 0 ? Math.min(1, m.flash / c.hitFlashSeconds) : 0;
      one.material.color.copy(this.base).lerp(this.flashColour, f);
      // The eyes: steady, with a slow swell; they go out as he dies.
      let glow = 1 + c.eyePulse * Math.sin(this.time * c.eyePulseHz * Math.PI * 2);
      if (m.state === 'corpse') glow = 0;
      else if (m.state === 'dying') glow *= Math.max(0, 1 - (m.timer ?? 0) / c.deathSeconds);
      one.uniforms.uGlow.value = glow;
      one.mesh.visible = true;
    }
    for (let i = n; i < this.pool.length; i++) this.pool[i].mesh.visible = false;
  }

  // ---- poses (radians; + x swings a hanging limb back, a torso forward) -------------------------

  targetPose(m, p) {
    const set = (bone, x = 0, y = 0, z = 0) => {
      const i = B[bone] * 3;
      p[i] = x;
      p[i + 1] = y;
      p[i + 2] = z;
    };
    const c = this.cfg;
    const t = this.time + (m.seed ?? 0);
    const flap = m.flap ?? t * c.flapHz * Math.PI * 2;
    const look = Math.max(-c.lookMax, Math.min(c.lookMax, m.look ?? 0));
    // The wings, both sides: `close` turns them back behind him (in flight:
    // up), `sweep` down along his body; the outer forewing and the hindwing
    // each a little of their own; `fold` doubles the outer forewing back up
    // (closed, they hang down his back).
    const wings = (side, close, sweep, outer = 0, hindClose = close, hindSweep = sweep, fold = 0) => {
      for (const [n, s] of SIDES) {
        if (side && side !== s) continue;
        set(`wing${n}`, 0, s * close, -s * sweep);
        set(`wing${n}2`, 0, s * outer, s * fold);
        set(`hind${n}`, 0, s * hindClose, -s * hindSweep);
      }
    };
    // An arm: swung forward (+), out from his side (+), and the elbow bent.
    const arm = (n, s, forward, out, bend, twist = 0) => {
      set(`shoulder${n}`, -forward, s * twist, s * out);
      set(`elbow${n}`, -bend, 0, 0);
    };
    const antennae = (back, quiver = 0) => {
      set('antR', back + Math.sin(t * 7) * quiver, 0, 0);
      set('antL', back + Math.sin(t * 7 + 1.3) * quiver, 0, 0);
    };
    const breathe = Math.sin(t * 1.1);

    switch (m.state) {
      case 'mantle': {
        // Wings thrown wide and cupped forward, shivering; claws out; the head thrust at you.
        const shiver = Math.sin(t * 31) * 0.035;
        wings(0, -0.28 + shiver, -0.12, -0.18 + shiver, -0.2 - shiver, 0.1);
        set('spine', 0.22);
        set('chest', 0.12);
        set('neck', 0.3 + Math.sin(t * 23) * 0.03, look);
        set('head', -0.25);
        for (const [n, s] of SIDES) {
          arm(n, s, 0.5, 0.95, 1.0);
          set(`wrist${n}`, -0.5, 0, 0);
          set(`hip${n}`, -0.25, 0, s * 0.12);
          set(`knee${n}`, 0.5);
          set(`ankle${n}`, -0.25);
        }
        antennae(-0.5, 0.12);
        p[ROOT_Y] = -0.06;
        break;
      }
      case 'perch': {
        // Landed: a deep crouch, knuckles down, wings half open over him.
        wings(0, 0.75 + breathe * 0.04, 0.35, 0.3, 0.95, 0.45);
        set('hips', 0.35);
        set('spine', 0.4);
        set('chest', 0.25);
        set('neck', -0.55, look);
        set('head', -0.3 + Math.sin(t * 0.6) * 0.05, 0, Math.sin(t * 0.43) * 0.12);
        for (const [n, s] of SIDES) {
          arm(n, s, 0.55, 0.12, 0.25);
          set(`hip${n}`, -1.75, 0, s * 0.35);
          set(`knee${n}`, 2.1);
          set(`ankle${n}`, -0.75);
        }
        antennae(-0.2, 0.05);
        p[ROOT_Y] = -0.52;
        break;
      }
      case 'cling': {
        // Flat to a wall (it's in front of him), limbs splayed like a moth
        // on a lamp; wings half open, fanning slowly; the head turned right
        // round to watch you.
        const fan = Math.sin(t * 0.9) * 0.1;
        wings(0, 0.12 + fan, 0.55, 0.05, 0.1 + fan, 0.75);
        set('spine', -0.08);
        set('neck', -0.15, c.clingLook + Math.sin(t * 0.35) * 0.12);
        set('head', 0, 0, Math.sin(t * 0.5) * 0.15);
        for (const [n, s] of SIDES) {
          arm(n, s, 0.25, 2.1, 1.1, -0.4);
          set(`hip${n}`, -0.3, 0, s * 0.95);
          set(`knee${n}`, 1.5);
          set(`ankle${n}`, -0.9);
        }
        antennae(-0.3, 0.08);
        break;
      }
      case 'glide':
      case 'fly': {
        // Level: the wings held out with a slow working (glide) or beating hard (fly).
        const hard = m.state === 'fly' ? 1 : 0.25;
        const beat = Math.sin(flap);
        wings(0, 0.12 + 0.62 * hard * beat, 0.05, 0.4 * hard * Math.sin(flap - 0.9), 0.1 + 0.5 * hard * Math.sin(flap - 0.45), 0.12);
        this.poseFlight(set, arm, 0);
        set('neck', -0.75, look * 0.5);
        set('head', -0.35);
        antennae(0.35, 0.04);
        p[ROOT_Y] = beat * -0.05 * hard;
        p[PITCH] = c.flightPitch;
        p[ANCHOR] = 1;
        break;
      }
      case 'dive': {
        // A stoop: wings half raised and swept back, claws reaching ahead.
        const shudder = Math.sin(t * 40) * 0.02;
        wings(0, 0.5 + shudder, 0.8, 0.25, 0.55, 0.95);
        this.poseFlight(set, arm, 1);
        set('neck', -0.6);
        set('head', -0.3);
        antennae(0.6);
        p[PITCH] = c.flightPitch;
        p[ANCHOR] = 1;
        break;
      }
      case 'strike': {
        // The rake: he flares the wings to brake, swings his legs under him and tears down with both hands.
        const k = Math.min(1, (m.timer ?? 0) / c.strikeSeconds);
        const rake = k * k;
        wings(0, -0.25 * k + 0.4 * (1 - k), 0.25 * (1 - k), -0.2 * k, -0.1 * k + 0.4 * (1 - k), 0.3);
        set('spine', 0.25 * k);
        set('neck', -0.6 + 0.5 * k);
        for (const [n, s] of SIDES) {
          arm(n, s, 2.7 - 1.9 * rake, 0.2, 0.25 + 0.6 * rake);
          set(`wrist${n}`, -0.6, 0, 0);
          set(`hip${n}`, 0.2 - 1.2 * k, 0, s * 0.15);
          set(`knee${n}`, 0.5 + 0.7 * k);
        }
        antennae(0.3);
        p[PITCH] = c.flightPitch * (1 - 0.7 * k);
        p[ANCHOR] = 1;
        break;
      }
      case 'flinch':
        // Recoils: thrown back, the wings jerking open.
        wings(0, 0.55, 0.15, 0.2, 0.7, 0.3);
        set('spine', -0.3, 0, 0.1);
        set('neck', -0.35, 0.4, 0.2);
        for (const [n, s] of SIDES) arm(n, s, 0.6, 0.5, 1.2);
        antennae(0.5);
        break;
      case 'wounded': {
        // Hunched and favouring one side: his left wing drags, an arm held across his chest.
        const sway = Math.sin(t * 1.7);
        wings(-1, 0.85 + sway * 0.04, 0.3, 0.3, 1.0, 0.35);
        wings(1, 0.75, 0.95, 0.55, 0.9, 0.8);
        set('hips', 0.1, 0, 0.06);
        set('spine', 0.4 + sway * 0.03, 0, -0.12);
        set('chest', 0.15);
        set('neck', -0.3 + sway * 0.04, look);
        set('head', 0, 0, 0.2);
        arm('R', -1, 0.25, 0.1, 0.35);
        arm('L', 1, 0.75, -0.55, 1.9);
        for (const [n, s] of SIDES) {
          set(`hip${n}`, -0.45, 0, s * 0.08);
          set(`knee${n}`, 0.8);
          set(`ankle${n}`, -0.35);
        }
        antennae(0.45, 0.1);
        p[ROOT_Y] = -0.12 + sway * 0.01;
        break;
      }
      case 'dying':
      case 'corpse': {
        // Down onto his knees, then his face; the wings spread, shudder and settle flat over him.
        const k = m.state === 'corpse' ? 1 : Math.min(1, (m.timer ?? 0) / c.deathSeconds);
        const kneel = Math.min(1, k / 0.4);
        const fall = Math.max(0, Math.min(1, (k - 0.3) / 0.45));
        const settle = Math.max(0, (k - 0.75) / 0.25);
        const shudder = k < 1 ? Math.sin(t * 27) * 0.08 * (1 - settle) : 0;
        wings(0, 0.9 * (1 - fall) + 0.04 * fall + shudder, 0.3 + 0.25 * fall, 0.2 * (1 - fall), 0.9 * (1 - fall) + 0.08 * fall - shudder, 0.4 + 0.3 * fall);
        set('spine', 0.3 * kneel * (1 - fall));
        set('neck', -0.4 * fall, 0.7 * fall);
        for (const [n, s] of SIDES) {
          arm(n, s, 0.5 * kneel + 1.6 * fall, 0.3 * fall, 0.6 * kneel * (1 - fall) + 0.3 * fall);
          set(`hip${n}`, -0.9 * kneel * (1 - fall), 0, s * 0.1);
          set(`knee${n}`, 1.9 * kneel * (1 - fall) + 0.15 * fall);
          set(`ankle${n}`, 0.6 * fall);
        }
        antennae(0.2 + 0.5 * fall);
        p[ROOT_Y] = -0.55 * kneel * (1 - fall) + 0.2 * fall;
        p[PITCH] = (Math.PI / 2) * fall * fall * (3 - 2 * fall);
        break;
      }
      default: {
        // Standing: wings closed behind him like a cloak, breathing, the head turning to watch.
        wings(0, 1.32 + breathe * 0.02, 0.8, 0.3, 1.38, 0.5);
        set('spine', 0.14 + breathe * 0.012);
        set('chest', 0.06 + breathe * 0.015);
        set('neck', -0.12, look + Math.sin(t * 0.31) * 0.12);
        set('head', Math.sin(t * 0.47) * 0.04, 0, Math.sin(t * 0.23) * 0.1);
        for (const [n, s] of SIDES) {
          arm(n, s, 0.12 + breathe * 0.01, 0.06, 0.3);
          set(`wrist${n}`, -0.2, 0, 0);
        }
        antennae(0.1, 0.06);
        break;
      }
    }
  }

  // The body in flight: legs trailing, arms tucked (reach 0) or stretched ahead of him (reach 1).
  poseFlight(set, arm, reach) {
    set('spine', -0.08);
    for (const [n, s] of SIDES) {
      arm(n, s, 0.5 + 2.2 * reach, 0.15, 1.5 * (1 - reach) + 0.2);
      set(`wrist${n}`, -0.5 * reach, 0, 0);
      set(`hip${n}`, 0.2 - 0.5 * reach, 0, s * 0.06);
      set(`knee${n}`, 0.45 + 0.6 * reach);
      set(`ankle${n}`, 0.5);
    }
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
