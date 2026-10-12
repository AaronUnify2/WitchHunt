// Shafts of light in the clearings (Session 10, style pass 1): soft,
// faint, striped beams slanting down from the moon (or the low sun at
// dawn) where the canopy opens, the Evil Dead 2 look. Fake: additive
// billboards, each turning about its own slanted axis to face you. One
// instanced draw call for every shaft on the map; the shader fades the
// ones far off or right on top of you. They show most in the mist (and on
// fog nights), and not at all on the blood night.

import * as THREE from 'three';
import { makeNoiseTexture } from './noiseTexture.js';

const VERTEX = /* glsl */ `
  attribute vec3 aBase; // where it meets the ground
  attribute vec2 aSize; // width, length (metres)
  attribute float aSeed;
  uniform vec3 uLightDir; // unit, toward the light
  uniform float uSpread; // how much wider at the top
  varying vec2 vUv;
  varying float vSeed;
  varying float vDepth;
  varying float vDist;
  void main() {
    vec3 axis = uLightDir;
    vec3 centre = aBase + axis * aSize.y * 0.5;
    vec3 toCam = normalize(cameraPosition - centre);
    vec3 side = cross(axis, toCam);
    side = length(side) > 0.001 ? normalize(side) : vec3(1.0, 0.0, 0.0);
    float width = aSize.x * mix(1.0, uSpread, position.y);
    vec3 world = aBase + axis * (position.y * aSize.y) + side * (position.x * width);
    vec4 mv = viewMatrix * vec4(world, 1.0);
    gl_Position = projectionMatrix * mv;
    vUv = vec2(position.x + 0.5, position.y);
    vSeed = aSeed;
    vDepth = -mv.z;
    vDist = length(centre.xz - cameraPosition.xz);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform sampler2D uNoise;
  uniform vec3 uColor;
  uniform float uAmount;
  uniform float uTime;
  uniform vec2 uFadeNear; // metres
  uniform vec2 uFadeFar; // metres
  varying vec2 vUv;
  varying float vSeed;
  varying float vDepth;
  varying float vDist;
  void main() {
    float across = 1.0 - abs(vUv.x - 0.5) * 2.0;
    float edge = smoothstep(0.0, 0.7, across);
    float along = smoothstep(0.0, 0.12, vUv.y) * (1.0 - smoothstep(0.45, 1.0, vUv.y));
    // Stripes of light and shadow along the shaft (leaves in the way), drifting slowly.
    float stripes = texture2D(uNoise, vec2(vUv.x * 1.3 + vSeed + uTime * 0.01, vUv.y * 0.15 + vSeed)).r;
    float fade = smoothstep(uFadeNear.x, uFadeNear.y, vDepth) * (1.0 - smoothstep(uFadeFar.x, uFadeFar.y, vDist));
    float a = edge * along * mix(0.35, 1.0, stripes) * fade * uAmount;
    if (a < 0.002) discard;
    gl_FragColor = vec4(uColor, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export class LightShafts {
  // cfg: config.fog.shafts. map: from generateMap() (its clearings).
  constructor(cfg, map, rng) {
    this.cfg = cfg;
    this.map = map;
    this.rng = rng;
    this.enabled = true;
    this.quality = 0; // the preset's strength (0 = off)
  }

  // ground: heightAt(x, z).
  init(scene, ground) {
    const c = this.cfg;
    // A few shafts in every clearing, scattered inside it.
    const spots = [];
    for (const clearing of this.map.clearings) {
      const n = this.rng.int(c.perClearing[0], c.perClearing[1]);
      for (let k = 0; k < n; k++) {
        const a = this.rng.range(0, Math.PI * 2);
        const r = clearing.radius * Math.sqrt(this.rng.range(0.05, 0.8));
        const x = clearing.x + Math.cos(a) * r;
        const z = clearing.z + Math.sin(a) * r;
        spots.push({ x, y: ground.heightAt(x, z), z, w: this.rng.range(c.width[0], c.width[1]), seed: this.rng.range(0, 10) });
      }
    }
    const n = spots.length;
    const quad = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0); // x -0.5..0.5, y 0..1
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.index = quad.index;
    geometry.setAttribute('position', quad.getAttribute('position'));
    const base = new Float32Array(n * 3);
    const size = new Float32Array(n * 2);
    const seed = new Float32Array(n);
    spots.forEach((s, i) => {
      base.set([s.x, s.y, s.z], i * 3);
      size.set([s.w, c.length], i * 2);
      seed[i] = s.seed;
    });
    geometry.setAttribute('aBase', new THREE.InstancedBufferAttribute(base, 3));
    geometry.setAttribute('aSize', new THREE.InstancedBufferAttribute(size, 2));
    geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 1));
    geometry.instanceCount = n;
    this.count = n;
    this.noise = makeNoiseTexture(64, [[{ cells: 8, weight: 0.6 }, { cells: 24, weight: 0.4 }]], this.rng.fork('noise'));
    this.uniforms = {
      uNoise: { value: this.noise },
      uLightDir: { value: new THREE.Vector3(0, 1, 0) },
      uSpread: { value: c.spread },
      uColor: { value: new THREE.Color() },
      uAmount: { value: 0 },
      uTime: { value: 0 },
      uFadeNear: { value: new THREE.Vector2(c.fadeNear[0], c.fadeNear[1]) },
      uFadeFar: { value: new THREE.Vector2(40, 60) },
    };
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: false,
    });
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
    scene.add(this.mesh);
  }

  // From the Quality preset: strength (0 = off).
  setQuality(strength) {
    this.quality = strength;
  }

  // lightDir: unit vector toward the moon or sun. color: its colour.
  // amount: 0..1 (mist, fog night, blood night already taken in). fogFar: the fog's end.
  update(dt, lightDir, color, amount, fogFar) {
    const c = this.cfg;
    // A light low on the horizon would lay the shafts flat: fade them out.
    const high = Math.max(0, Math.min(1, (lightDir.y - c.minElevation) / 0.15));
    const strength = this.quality * amount * high * c.strength;
    const visible = this.enabled && strength > 0.002;
    this.mesh.visible = visible;
    if (!visible) return;
    const u = this.uniforms;
    u.uTime.value += dt;
    u.uLightDir.value.copy(lightDir);
    u.uColor.value.copy(color);
    u.uAmount.value = strength;
    u.uFadeFar.value.set(fogFar * 0.55, fogFar * 0.9);
  }

  dispose() {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.noise.dispose();
  }
}
