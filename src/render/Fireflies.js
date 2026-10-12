// Fireflies (Session 10, style pass 1): soft glowing points drifting low
// over the ground at dusk and at night, each blinking now and then. One
// draw call. The points live in a box that wraps round the camera in the
// vertex shader (no per-frame work on the CPU): walk on and new ones are
// always ahead. They're bright enough for the bloom to catch. Heights are
// measured from the ground under you, like the ground mist. No light.

import * as THREE from 'three';

const VERTEX = /* glsl */ `
  attribute float aPhase;
  attribute float aSpeed;
  uniform float uTime;
  uniform vec3 uCamera;
  uniform float uBox; // metres across the wrapping box
  uniform float uGround;
  uniform vec2 uHeight; // metres above the ground: lowest, highest
  uniform float uWander;
  uniform float uBlinkPeriod;
  uniform float uAmount;
  uniform float uSize; // metres
  uniform float uPixels; // pixels per metre at 1 m away
  uniform vec2 uFade; // metres: full inside the first, gone beyond the second
  uniform float uNear;
  varying float vGlow;
  void main() {
    vec2 rel = mod(position.xz * uBox - uCamera.xz + uBox * 0.5, uBox) - uBox * 0.5;
    float t = uTime * aSpeed;
    vec3 world = vec3(uCamera.x + rel.x, uGround + mix(uHeight.x, uHeight.y, position.y), uCamera.z + rel.y);
    world += vec3(sin(t * 0.7 + aPhase * 6.28), sin(t * 0.9 + aPhase * 3.1) * 0.35, cos(t * 0.6 + aPhase * 4.0)) * uWander;
    // A blink: a quick glow, then dark for most of the cycle.
    float cycle = fract(uTime / (uBlinkPeriod * (0.7 + aSpeed * 0.6)) + aPhase);
    float blink = smoothstep(0.0, 0.06, cycle) * (1.0 - smoothstep(0.1, 0.28, cycle));
    float dist = length(world - cameraPosition);
    float fade = (1.0 - smoothstep(uFade.x, uFade.y, dist)) * smoothstep(uNear * 0.5, uNear, dist);
    vGlow = blink * fade * uAmount;
    vec4 mv = viewMatrix * vec4(world, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = vGlow > 0.001 ? max(1.5, uSize * uPixels / -mv.z) : 0.0;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  varying float vGlow;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    a = a * a * vGlow;
    if (a < 0.002) discard;
    gl_FragColor = vec4(uColor * uIntensity, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export class Fireflies {
  // cfg: config.fog.fireflies. maxCount: the most any Quality preset asks for.
  constructor(cfg, maxCount, rng) {
    this.cfg = cfg;
    this.maxCount = maxCount;
    this.rng = rng;
    this.enabled = true;
    this.count = 0;
  }

  init(scene) {
    const c = this.cfg;
    const n = this.maxCount;
    const positions = new Float32Array(n * 3);
    const phases = new Float32Array(n);
    const speeds = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      positions.set([this.rng.next(), this.rng.next(), this.rng.next()], i * 3);
      phases[i] = this.rng.next();
      speeds[i] = this.rng.range(0.6, 1.4);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    geometry.setDrawRange(0, 0);
    this.uniforms = {
      uTime: { value: 0 },
      uCamera: { value: new THREE.Vector3() },
      uBox: { value: c.box },
      uGround: { value: 0 },
      uHeight: { value: new THREE.Vector2(c.height[0], c.height[1]) },
      uWander: { value: c.wander },
      uBlinkPeriod: { value: c.blinkPeriod },
      uAmount: { value: 0 },
      uSize: { value: c.size },
      uPixels: { value: 500 },
      uFade: { value: new THREE.Vector2(c.fade[0], c.fade[1]) },
      uNear: { value: c.near },
      uColor: { value: new THREE.Color(c.color) },
      uIntensity: { value: c.intensity },
    };
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    this.points = new THREE.Points(geometry, this.material);
    this.points.frustumCulled = false; // they surround the camera
    this.points.renderOrder = 2;
    scene.add(this.points);
  }

  setCount(count) {
    this.count = Math.min(count, this.maxCount);
    this.points.geometry.setDrawRange(0, this.count);
  }

  // amount: 0..1 (night, less on fog nights, none on the blood night).
  // ground: the ground height under the camera. pixels: pixels per metre at 1 m.
  update(dt, camera, amount, ground, pixels) {
    const visible = this.enabled && this.count > 0 && amount > 0.01;
    this.points.visible = visible;
    if (!visible) return;
    const u = this.uniforms;
    u.uTime.value += dt;
    u.uCamera.value.copy(camera.position);
    u.uGround.value = ground;
    u.uAmount.value = amount;
    u.uPixels.value = pixels;
  }

  dispose() {
    this.points.removeFromParent();
    this.points.geometry.dispose();
    this.material.dispose();
  }
}
