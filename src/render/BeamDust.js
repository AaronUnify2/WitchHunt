// Dust in the torch beam (Session 10, style pass 1): tiny motes drifting
// in the air that only show where the beam catches them. One draw call.
// Like the fireflies, the motes live in a small box that wraps round the
// camera in the vertex shader; each is lit by how far inside the torch's
// cone it is and how near. Brightest at night.

import * as THREE from 'three';

const VERTEX = /* glsl */ `
  attribute float aPhase;
  uniform float uTime;
  uniform vec3 uCamera;
  uniform float uBox;
  uniform vec3 uTorch; // the torch's position
  uniform vec3 uAim; // unit
  uniform vec2 uCone; // cos of the outer and inner angles
  uniform float uRange; // metres
  uniform float uAmount;
  uniform float uSize;
  uniform float uPixels;
  uniform float uNear;
  varying float vLit;
  void main() {
    vec3 rel = mod(position * uBox - uCamera + uBox * 0.5, uBox) - uBox * 0.5;
    vec3 world = uCamera + rel;
    world += vec3(sin(uTime * 0.21 + aPhase * 6.28), sin(uTime * 0.17 + aPhase * 2.1), cos(uTime * 0.19 + aPhase * 4.4)) * 0.25;
    vec3 toMote = world - uTorch;
    float dist = length(toMote);
    float cone = smoothstep(uCone.x, uCone.y, dot(toMote / max(dist, 0.001), uAim));
    float near = smoothstep(uNear * 0.5, uNear, length(world - cameraPosition));
    vLit = cone * (1.0 - smoothstep(uRange * 0.4, uRange, dist)) * near * uAmount;
    vec4 mv = viewMatrix * vec4(world, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = vLit > 0.001 ? max(1.0, uSize * uPixels / -mv.z) : 0.0;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  varying float vLit;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.1, d) * vLit;
    if (a < 0.002) discard;
    gl_FragColor = vec4(uColor, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export class BeamDust {
  // cfg: config.fog.beamDust. maxCount: the most any Quality preset asks for.
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
    for (let i = 0; i < n; i++) {
      positions.set([this.rng.next(), this.rng.next(), this.rng.next()], i * 3);
      phases[i] = this.rng.next();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geometry.setDrawRange(0, 0);
    this.uniforms = {
      uTime: { value: 0 },
      uCamera: { value: new THREE.Vector3() },
      uBox: { value: c.box },
      uTorch: { value: new THREE.Vector3() },
      uAim: { value: new THREE.Vector3(0, 0, -1) },
      uCone: { value: new THREE.Vector2(0.9, 0.95) },
      uRange: { value: c.range },
      uAmount: { value: 0 },
      uSize: { value: c.size },
      uPixels: { value: 500 },
      uNear: { value: c.near },
      uColor: { value: new THREE.Color() },
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
    this.points.frustumCulled = false;
    this.points.renderOrder = 2;
    scene.add(this.points);
  }

  setCount(count) {
    this.count = Math.min(count, this.maxCount);
    this.points.geometry.setDrawRange(0, this.count);
  }

  // torch: { on, position, aim, color, cosOuter, cosInner, strength }.
  // amount: 0..1 (brighter at night).
  update(dt, camera, torch, amount, pixels) {
    const visible = this.enabled && this.count > 0 && torch.on && amount > 0.01;
    this.points.visible = visible;
    if (!visible) return;
    const c = this.cfg;
    const u = this.uniforms;
    u.uTime.value += dt;
    u.uCamera.value.copy(camera.position);
    u.uTorch.value.copy(torch.position);
    u.uAim.value.copy(torch.aim);
    u.uCone.value.set(torch.cosOuter, torch.cosInner);
    u.uAmount.value = amount * torch.strength;
    u.uColor.value.copy(torch.color).multiplyScalar(c.brightness);
    u.uPixels.value = pixels;
  }

  dispose() {
    this.points.removeFromParent();
    this.points.geometry.dispose();
    this.material.dispose();
  }
}
