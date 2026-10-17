// Mutant zombies (DESIGN.md "Mutants (3D)"). Session 13: the real model
// (render/mutantModel.js): a skinned giant, one mesh and one draw call per
// mutant (at most four), plus the torch's shadow. All of them share one
// geometry; each has its own skeleton and its own material (for its hit
// flash and its weak spot's throb).
//
// Posed procedurally each frame from the zombie's state, blending toward
// each new pose so it never snaps:
//  - walk: a heavy, lurching walk, the club arm swinging low;
//  - charging: low, galloping, knuckling on the club;
//  - attack: rears up with the club overhead through the wind-up, then
//    slams it down;
//  - stagger: rocks back; dying: drops to its knees, then topples; corpse:
//    lies where it fell, sinking;
//  - rise: claws up out of the ground;
//  - dormant (for the gas station's authored mutant): crouched and folded
//    over, twitching; wake: unfolds to its full height (z.timer of
//    look.wakeSeconds).
// Its weak spot, a throbbing raw sac on its back (8x damage), glows in the
// dark (and catches the bloom); it goes dark when it dies.

import * as THREE from 'three';
import { buildMutantGeometry, buildMutantBones, JOINTS } from './mutantModel.js';

const BONES = JOINTS.length;
// A pose: x, y, z rotations per bone, then the root's drop and its slide
// back (a fallen body is pulled back over its own spot).
const ROOT_Y = BONES * 3;
const ROOT_Z = BONES * 3 + 1;
const POSE_SIZE = BONES * 3 + 2;
const B = Object.fromEntries(JOINTS.map(([name], i) => [name, i]));

const GLOW_VERTEX = /* glsl */ `
  attribute vec2 aGlow;
  varying vec2 vGlow;
`;

const GLOW_FRAGMENT = /* glsl */ `
  varying vec2 vGlow;
  uniform vec3 uSpotColor;
  uniform float uSpot;
  uniform vec3 uEyeColor;
  uniform vec3 uThermalNear;
`;

export class MutantRenderer {
  constructor(mutantConfig, zombieConfig) {
    this.cfg = mutantConfig;
    this.zombieCfg = zombieConfig;
  }

  init(scene) {
    const c = this.cfg;
    const look = c.look;
    this.geometry = buildMutantGeometry(look).geometry;
    this.geometry.scale(1, c.height / look.modelHeight, 1);
    this.thermalNear = new THREE.Vector3(1, 0, 1);
    // Dark, as the zombies' sprites are (the torch blows out anything light).
    this.base = new THREE.Color().setScalar(look.albedo);
    this.flashColour = new THREE.Color(...look.hitFlash);
    this.pool = Array.from({ length: c.poolSize }, () => this.makeOne(scene));
    this.meshes = this.pool.map((m) => m.mesh);
    this.time = 0;
    this.tmpPose = new Float32Array(POSE_SIZE);
  }

  // One mutant's mesh: its skeleton and its own material.
  makeOne(scene) {
    const c = this.cfg;
    const { root, list } = buildMutantBones();
    // Bones are in model units: stretched to the configured height with the geometry.
    for (const b of list) b.position.y *= c.height / c.look.modelHeight;
    const material = new THREE.MeshLambertMaterial({ vertexColors: true });
    const uniforms = {
      uSpotColor: { value: new THREE.Color(c.weakSpot.color) },
      uSpot: { value: 1 },
      uEyeColor: { value: new THREE.Color(c.look.eyesGlow) },
      uThermalNear: { value: this.thermalNear },
    };
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${GLOW_VERTEX}`).replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlow = aGlow;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${GLOW_FRAGMENT}`)
        // The spot is raw, wet and dark where it doesn't glow.
        .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= 1.0 - vGlow.x * 0.7;')
        .replace(
          '#include <emissivemap_fragment>',
          // Session 10b: the heat scope's glow fades up close; the spot and eyes glow on top.
          '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= mix(uThermalNear.x, 1.0, smoothstep(uThermalNear.y, uThermalNear.z, length(vViewPosition)));\ntotalEmissiveRadiance += vGlow.x * uSpotColor * uSpot + vGlow.y * uEyeColor;',
        );
    };
    material.customProgramCacheKey = () => 'mutant-skinned';
    const mesh = new THREE.SkinnedMesh(this.geometry, material);
    mesh.add(root);
    mesh.bind(new THREE.Skeleton(list));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false; // posed every frame; at most four
    mesh.visible = false;
    scene.add(mesh);
    return { mesh, material, uniforms, bones: list, root };
  }

  // zombies: the whole pool; only active mutants are drawn.
  update(zombies, dt = 0) {
    const c = this.cfg;
    const w = c.weakSpot;
    this.time += dt;
    const throb = w.pulseMin + (1 - w.pulseMin) * (0.5 + 0.5 * Math.sin(this.time * w.pulseSpeed * Math.PI * 2));
    let n = 0;
    for (const z of zombies) {
      if (!z.active || z.kind !== 'mutant' || z.tier === 'abstract' || n >= this.pool.length) continue; // M6: abstract ones have no mesh
      const one = this.pool[n++];
      this.pose(one, z, dt);
      const dead = z.state === 'dying' || z.state === 'corpse';
      one.uniforms.uSpot.value = dead ? 0 : throb; // the spot goes dark once it's dead
      const f = z.flash > 0 ? z.flash / this.zombieCfg.hitFlashSeconds : 0;
      one.material.color.copy(this.base).lerp(this.flashColour, f);
      // Rising, burrowing and corpses sink by up to the body's height (lying down, less).
      const depth = dead ? c.look.lyingDepth : z.height;
      one.mesh.position.set(z.x, z.y - z.sink * depth, z.z);
      one.mesh.rotation.set(0, z.facing, 0);
      one.mesh.visible = true;
    }
    for (let i = n; i < this.pool.length; i++) this.pool[i].mesh.visible = false;
  }

  // Blend the mutant's pose (kept on it, so it follows that zombie) toward
  // the one its state wants, and set the bones.
  pose(one, z, dt) {
    const target = this.tmpPose;
    target.fill(0);
    this.targetPose(z, target);
    if (!z.mutantPose) z.mutantPose = Float32Array.from(target);
    const cur = z.mutantPose;
    const k = Math.min(1, dt * this.cfg.look.poseRate);
    for (let i = 0; i < POSE_SIZE; i++) cur[i] += (target[i] - cur[i]) * k;
    for (let i = 0; i < BONES; i++) one.bones[i].rotation.set(cur[i * 3], cur[i * 3 + 1], cur[i * 3 + 2]);
    one.root.position.y = cur[ROOT_Y];
    one.root.position.z = cur[ROOT_Z];
  }

  // ---- poses (radians; + x swings a hanging limb back, a torso forward) -------------------

  targetPose(z, p) {
    const zc = this.zombieCfg;
    const t = this.time + (z.lookSeed ?? 0) * 1.7; // each one breathes out of step
    const set = (bone, x = 0, y = 0, zr = 0) => {
      const i = B[bone] * 3;
      p[i] = x;
      p[i + 1] = y;
      p[i + 2] = zr;
    };
    const add = (bone, x = 0, y = 0, zr = 0) => {
      const i = B[bone] * 3;
      p[i] += x;
      p[i + 1] += y;
      p[i + 2] += zr;
    };
    switch (z.state) {
      case 'walk': {
        this.poseWalk(z, p, set, add, t);
        break;
      }
      case 'attack': {
        this.poseIdle(t, set);
        const up = ease(Math.min(1, z.timer / z.attackWindup));
        const down = z.struck ? Math.min(1, (z.timer - z.attackWindup) / this.cfg.look.slamSeconds) : 0;
        // Wind-up: rear back, the club up overhead, the wasted arm out for balance.
        set('shoulderR', -2.7 * up + 2.3 * down, 0, -0.25 * up);
        set('elbowR', -0.5 * up + 0.4 * down);
        set('chest', -0.3 * up + 0.75 * down);
        set('spine', -0.15 * up + 0.35 * down);
        set('neck', -0.1 * up + 0.2 * down);
        set('head', -0.2 * up + 0.4 * down);
        set('shoulderL', -0.6 * up, 0, 0.5 * up);
        set('elbowL', -0.4 * up);
        set('hipR', -0.35 * up);
        set('kneeR', 0.25 * up);
        set('hipL', 0.15 * up);
        break;
      }
      case 'stagger':
        this.poseIdle(t, set);
        set('chest', -0.4);
        set('spine', -0.15);
        set('head', -0.45, 0, 0.2);
        set('shoulderR', 0.2, 0, -0.5);
        set('shoulderL', 0.3, 0, 0.6);
        set('hipL', 0.25);
        set('kneeL', 0.2);
        break;
      case 'dying':
      case 'corpse': {
        const k = z.state === 'corpse' ? 1 : Math.min(1, z.timer / zc.deathSeconds);
        this.poseFall(k, set, p);
        break;
      }
      case 'rise': {
        // Clawing up out of the ground, arms reaching.
        this.poseIdle(t, set);
        set('shoulderR', -2.2 + Math.sin(t * 6) * 0.25, 0, -0.3);
        set('shoulderL', -2.5 + Math.sin(t * 7 + 1) * 0.3, 0, 0.3);
        set('elbowL', -0.4 + Math.sin(t * 9) * 0.3);
        set('chest', -0.2 + Math.sin(t * 5) * 0.08);
        set('head', -0.5);
        break;
      }
      case 'dormant':
        this.poseDormant(t, set, p);
        break;
      case 'wake': {
        // Unfolding from the crouch to its full height, with a jerk.
        const k = Math.min(1, z.timer / this.cfg.look.wakeSeconds);
        const a = new Float32Array(POSE_SIZE);
        const b = new Float32Array(POSE_SIZE);
        this.poseDormant(t, makeSetter(a), a);
        this.poseIdle(t, makeSetter(b));
        const e = ease(Math.min(1, k * 1.15)) + Math.sin(Math.min(1, k * 1.15) * Math.PI) * 0.12; // a little overshoot
        for (let i = 0; i < POSE_SIZE; i++) p[i] = a[i] + (b[i] - a[i]) * e;
        if (k < 0.6) add('head', 0, Math.sin(t * 23) * 0.15 * (1 - k), Math.sin(t * 17) * 0.2 * (1 - k));
        break;
      }
      default:
        this.poseIdle(t, set);
        break;
    }
  }

  // Standing: breathing heavily, the head lolling.
  poseIdle(t, set) {
    const breath = Math.sin(t * 1.6);
    set('spine', 0.02 * breath);
    set('chest', 0.04 * breath);
    set('neck', 0.05 * Math.sin(t * 0.7));
    set('head', 0.04 * Math.sin(t * 0.9), 0.18 * Math.sin(t * 0.4), 0.06 * Math.sin(t * 0.55));
    set('shoulderR', 0.05 * Math.sin(t * 1.6 + 1), 0, -0.04);
    set('shoulderL', 0.06 * Math.sin(t * 1.3), 0, 0.05);
    set('elbowL', -0.15);
  }

  // Walking (a lurching limp) or charging (low, galloping on the club).
  poseWalk(z, p, set, add, t) {
    const zc = this.zombieCfg;
    const charge = Boolean(z.charging);
    const s = z.walked * zc.walkFrameRate * Math.PI;
    const amp = charge ? 0.75 : 0.45;
    const lean = charge ? this.cfg.charge.lean + 0.15 : 0.1;
    const sin = Math.sin(s);
    // The hips lean, so the legs lean back by as much to stay under it.
    set('hips', lean, sin * 0.12, sin * 0.09);
    set('hipL', -sin * amp - lean);
    set('hipR', sin * amp * 0.8 - lean); // the limp: the right leg swings short
    set('kneeL', (0.5 + 0.5 * Math.sin(s - 1.2)) * amp * 1.5);
    set('kneeR', (0.5 + 0.5 * Math.sin(s + Math.PI - 1.2)) * amp * 1.3);
    set('ankleL', -0.2 * sin);
    set('ankleR', 0.2 * sin);
    set('spine', 0.05, -sin * 0.06);
    set('chest', charge ? 0.2 : 0.05, -sin * 0.12, -sin * 0.05);
    set('neck', charge ? -0.35 : -0.05);
    set('head', 0.06 * Math.sin(2 * s) - (charge ? 0.2 : 0), 0.08 * Math.sin(t * 0.5));
    if (charge) {
      // The club reaches forward and pounds the ground like a gorilla's knuckles.
      set('shoulderR', -0.6 - sin * 0.55, 0, -0.15);
      set('elbowR', -0.25);
    } else {
      set('shoulderR', -sin * 0.3, 0, -0.05);
      set('elbowR', -0.1);
    }
    set('shoulderL', sin * 0.4, 0, 0.08);
    set('elbowL', -0.25 - Math.max(0, sin) * 0.3);
    // Bobbing down as each foot lands (a heavy body).
    p[ROOT_Y] = -Math.abs(Math.cos(s)) * (charge ? 0.1 : 0.06);
  }

  // Killed: drops to its knees, then topples forward and over (k 0..1).
  poseFall(k, set, p) {
    const a = ease(Math.min(1, k / 0.45));
    const b = ease(Math.max(0, (k - 0.45) / 0.55));
    set('hipL', -1.35 * a);
    set('hipR', -1.25 * a);
    set('kneeL', 2.2 * a);
    set('kneeR', 2.1 * a);
    set('chest', 0.3 * a + 0.2 * b);
    set('spine', 0.1 * a);
    set('head', 0.4 * a, 0, 0.3 * b);
    set('shoulderR', 0.2 * a - 0.9 * b, 0, -0.3 * b);
    set('shoulderL', 0.3 * a - 1.2 * b, 0, 0.5 * b);
    set('elbowL', -0.5 * b);
    // Toppling about its knees: the root (at its feet) tips forward and to its club side.
    set('root', b * 1.25, 0, -b * 0.45);
    p[ROOT_Y] = -0.42 * a;
    p[ROOT_Z] = -0.75 * b;
  }

  // Crouched and folded right over, the arms hanging to the floor; now
  // and then a twitch (the head, the fingers).
  poseDormant(t, set, p) {
    const twitch = (k, size) => snap(t, this.cfg.look.twitchesPerSecond, k) * size;
    set('hips', 0.9);
    set('hipL', -2.2);
    set('hipR', -2.1);
    set('kneeL', 2.45);
    set('kneeR', 2.4);
    set('ankleL', -0.5);
    set('ankleR', -0.5);
    set('spine', 0.35 + 0.02 * Math.sin(t * 1.2));
    set('chest', 0.4 + 0.03 * Math.sin(t * 1.2));
    set('neck', 0.3);
    set('head', 0.4 + twitch(1, 0.25), twitch(2, 0.5), twitch(3, 0.4));
    set('shoulderR', -1.45, 0, -0.2);
    set('elbowR', -0.3);
    set('shoulderL', -1.55 + twitch(4, 0.15), 0, 0.25);
    set('elbowL', -0.5 + twitch(5, 0.6));
    p[ROOT_Y] = -0.6;
  }

  // Session 10b: through the heat scope it glows white-hot.
  // t: config.viewModel.thermal (the glow fades up close: Aaron).
  setThermal(on, t) {
    for (const one of this.pool) one.material.emissive.setScalar(on ? t.glow : 0);
    this.thermalNear.set(on ? t.nearGlow : 1, t.nearMetres, t.farMetres);
  }

  dispose() {
    for (const one of this.pool) {
      one.mesh.removeFromParent();
      one.mesh.skeleton.dispose();
      one.material.dispose();
    }
    this.geometry.dispose();
  }
}

// A pose setter writing into array a.
function makeSetter(a) {
  return (bone, x = 0, y = 0, z = 0) => {
    const i = B[bone] * 3;
    a[i] = x;
    a[i + 1] = y;
    a[i + 2] = z;
  };
}

function ease(x) {
  return x * x * (3 - 2 * x);
}

// A twitch: now and then a quick jerk to a new angle (-1..1) and back.
// Cosmetic (hashed from the time).
function snap(t, rate, key) {
  const x = t * rate + key * 0.37;
  const i = Math.floor(x);
  const f = x - i;
  const h = Math.sin(i * 12.9898 + key * 78.233) * 43758.5453;
  const r = h - Math.floor(h);
  if (r < 0.6) return 0; // most moments, still
  return Math.sin(Math.min(1, f * 4) * Math.PI) * (r * 2 - 1.6);
}
