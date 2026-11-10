// Giant moths (Session 24; DESIGN.md "Giant moths"): the model
// (render/mothModel.js) drawn as ONE instanced mesh, so a whole swarm is
// one draw call, no lights. The wings beat in the vertex shader (each
// moth's own wing angle and fold); the eyes glow and aren't fogged, like
// the Mothman's. Ready for their AI (the mineshaft, the cave), which hands
// update() its moths:
// { active, x, y, z (the middle of its body), facing, pitch, roll, state,
// timer, flap (radians: its own if left out), flash, seed }.
//
// States:
//  - fly: wings beating wide; hover: beating fast and shallow, nose up;
//  - dart: wings half swept, a fast shallow beat (the lunge);
//  - rest: settled, the wings folded back in a tent (on a wall or a roof:
//    the caller turns it with pitch and roll);
//  - flinch: knocked askew (a hit);
//  - dying: tumbling, the wings fluttering out of time (timer); corpse: on
//    its back, the eyes out.

import * as THREE from 'three';
import { buildMothGeometry, MOTH_HINGE } from './mothModel.js';

const SHADER = {
  vertexPars: /* glsl */ `
attribute float aWing;
attribute float aGlow;
attribute vec3 aBeat; // this moth's wing angle, fold, and glow
uniform vec3 uHinge;
varying float vGlow;
vec3 mothWing( vec3 p, float pivot ) {
  if ( aWing == 0.0 ) return p;
  vec3 q = p - vec3( aWing * uHinge.x, uHinge.y, uHinge.z ) * pivot;
  float sweep = aWing * aBeat.y * 1.15;
  float cs = cos( sweep ), ss = sin( sweep );
  q = vec3( q.x * cs + q.z * ss, q.y, -q.x * ss + q.z * cs );
  float lift = aWing * aBeat.x;
  float cl = cos( lift ), sl = sin( lift );
  q = vec3( q.x * cl - q.y * sl, q.x * sl + q.y * cl, q.z );
  return q + vec3( aWing * uHinge.x, uHinge.y, uHinge.z ) * pivot;
}`,
  fragmentPars: 'varying float vGlow;',
};

const qHeading = new THREE.Quaternion();
const qRoll = new THREE.Quaternion();
const qPitch = new THREE.Quaternion();
const AXIS_X = new THREE.Vector3(1, 0, 0);
const AXIS_Y = new THREE.Vector3(0, 1, 0);
const AXIS_Z = new THREE.Vector3(0, 0, 1);
const matrix = new THREE.Matrix4();
const place = new THREE.Vector3();
const size = new THREE.Vector3();
const quat = new THREE.Quaternion();
const colour = new THREE.Color();

export class MothRenderer {
  // cfg: config.moths.giant.
  constructor(cfg) {
    this.cfg = cfg;
  }

  init(scene, poolSize = this.cfg.poolSize) {
    const c = this.cfg;
    this.geometry = buildMothGeometry(c);
    this.beat = new THREE.InstancedBufferAttribute(new Float32Array(poolSize * 3), 3);
    this.beat.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('aBeat', this.beat);
    this.material = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.material.color.setScalar(c.albedo);
    const uniforms = { uHinge: { value: new THREE.Vector3(MOTH_HINGE.x, MOTH_HINGE.y, MOTH_HINGE.z) } };
    this.material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${SHADER.vertexPars}`)
        .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nobjectNormal = mothWing( objectNormal, 0.0 );')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed = mothWing( transformed, 1.0 );\nvGlow = aGlow * aBeat.z;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${SHADER.fragmentPars}`)
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vColor.rgb * vGlow;')
        // The eyes aren't fogged: a swarm shows as red points before it shows as moths.
        .replace('#include <fog_fragment>', 'vec3 mothUnfogged = gl_FragColor.rgb;\n#include <fog_fragment>\ngl_FragColor.rgb = mix(gl_FragColor.rgb, mothUnfogged, clamp(vGlow, 0.0, 1.0));');
    };
    this.material.customProgramCacheKey = () => 'giant-moth';
    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, poolSize);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false; // a swarm, moved every frame
    this.mesh.castShadow = true;
    this.poolSize = poolSize;
    this.base = new THREE.Color(1, 1, 1);
    this.flashColour = new THREE.Color(...c.hitFlash);
    this.time = 0;
    this.thermal = 0;
    scene.add(this.mesh);
    this.meshes = [this.mesh];
  }

  update(moths, dt = 0) {
    this.time += dt;
    const c = this.cfg;
    const beat = this.beat.array;
    let n = 0;
    for (const m of moths) {
      if (!m.active || n >= this.poolSize) continue;
      const t = this.time + (m.seed ?? 0) * 7.3;
      const p = this.pose(m, t);
      // The fold settles in and out; the beat is as it is.
      m.mothFold = m.mothFold === undefined ? p.fold : m.mothFold + (p.fold - m.mothFold) * Math.min(1, dt * c.foldRate);
      qHeading.setFromAxisAngle(AXIS_Y, m.facing ?? 0);
      qRoll.setFromAxisAngle(AXIS_Z, (m.roll ?? 0) + p.roll);
      qPitch.setFromAxisAngle(AXIS_X, (m.pitch ?? 0) + p.pitch);
      quat.copy(qHeading).multiply(qPitch).multiply(qRoll);
      place.set(m.x, m.y + p.bob, m.z);
      matrix.compose(place, quat, size.setScalar(c.scale * (m.scale ?? 1)));
      this.mesh.setMatrixAt(n, matrix);
      const f = m.flash > 0 ? Math.min(1, m.flash / c.hitFlashSeconds) : 0;
      this.mesh.setColorAt(n, colour.copy(this.base).lerp(this.flashColour, f).addScalar(this.thermal));
      beat[n * 3] = p.lift;
      beat[n * 3 + 1] = m.mothFold;
      beat[n * 3 + 2] = p.glow;
      n++;
    }
    this.mesh.count = n;
    this.mesh.visible = n > 0;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.beat.needsUpdate = true;
  }

  // What one moth's doing, as { lift (the wings' angle), fold, pitch, roll, bob, glow }.
  pose(m, t) {
    const c = this.cfg;
    const hz = (k) => (m.flap !== undefined ? m.flap * k : t * c.flapHz * k * Math.PI * 2);
    switch (m.state) {
      case 'hover':
        return { lift: 0.25 + 0.5 * Math.sin(hz(1.6)), fold: 0, pitch: -0.55, roll: Math.sin(t * 2.1) * 0.08, bob: Math.sin(t * 3.3) * 0.04, glow: 1 };
      case 'dart':
        return { lift: 0.35 + 0.3 * Math.sin(hz(2.2)), fold: 0.35, pitch: 0.25, roll: 0, bob: 0, glow: 1 };
      case 'rest':
        return { lift: -0.5 + Math.sin(t * 0.9) * 0.04, fold: 1, pitch: 0, roll: 0, bob: 0, glow: 1 };
      case 'flinch':
        return { lift: 0.9, fold: 0.15, pitch: -0.5, roll: 0.7, bob: 0, glow: 1 };
      case 'dying': {
        const k = Math.min(1, (m.timer ?? 0) / c.deathSeconds);
        return { lift: 0.3 + 0.7 * Math.sin(t * 43) * (1 - k), fold: 0.3 * k, pitch: 0.4 * (1 - k), roll: k * Math.PI + Math.sin(t * 9) * 0.5 * (1 - k), bob: 0, glow: 1 - k };
      }
      case 'corpse':
        return { lift: 0.25, fold: 0.3, pitch: 0, roll: Math.PI, bob: 0, glow: 0 };
      default: {
        const b = Math.sin(hz(1));
        return { lift: 0.15 + 0.75 * b, fold: 0, pitch: 0.1, roll: 0, bob: -b * 0.05, glow: 1 };
      }
    }
  }

  // Through the heat scope: dim (t: config.viewModel.thermal).
  setThermal(on, t) {
    this.thermal = on ? t.glow * this.cfg.thermalGlow : 0;
  }

  dispose() {
    this.mesh.removeFromParent();
    this.mesh.dispose();
    this.geometry.dispose();
    this.material.dispose();
  }
}
