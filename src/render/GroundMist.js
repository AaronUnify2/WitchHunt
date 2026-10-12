// Drifting ground mist near the player (Session 10): soft, ragged sheets
// of mist standing in the low ground mist, drifting with the wind and
// billowing through a generated noise texture. One instanced draw call.
// The torch's beam brightens the ones it hits.
//
// Each sheet stays upright and parallel to the screen (it turns only as
// you turn your view, not as you walk past), so it never swings round like
// a door on a hinge (Aaron). Shapes vary (config.fog.puffs.shapes): wide
// low banks, rounder tufts and long thin streaks, each a soft blob with a
// noise-torn edge rather than a rectangle.
//
// They live within config.fog.puffs.radius of you (never past the fog);
// one that drifts out is moved to the far side and fades back in. None
// inside the station's buildings (avoid rectangles).

import * as THREE from 'three';
import { makeNoiseTexture } from './noiseTexture.js';

const VERTEX = /* glsl */ `
  attribute vec3 aCentre;
  attribute vec2 aSize;
  attribute vec2 aShape; // x: noise seed, y: how ragged the edge is
  attribute float aAlpha;
  attribute float aLit;
  uniform vec3 uRight; // the camera's right, flattened to the ground
  varying vec2 vUv;
  varying vec2 vShape;
  varying float vAlpha;
  varying float vLit;
  varying float vDepth;
  varying float vAspect;
  void main() {
    vec3 world = aCentre + uRight * (position.x * aSize.x) + vec3(0.0, position.y * aSize.y, 0.0);
    vec4 mv = viewMatrix * vec4(world, 1.0);
    gl_Position = projectionMatrix * mv;
    vUv = uv;
    vShape = aShape;
    vAlpha = aAlpha;
    vLit = aLit;
    vDepth = -mv.z;
    vAspect = aSize.x / aSize.y;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform sampler2D uNoise;
  uniform vec3 uColor;
  uniform vec3 uLitColor;
  uniform float uOpacity;
  uniform float uTime; // already scaled by the billow speed
  uniform float uPeak;
  uniform float uNoiseScale;
  uniform vec2 uFadeNear;
  uniform vec2 uFadeFar;
  varying vec2 vUv;
  varying vec2 vShape;
  varying float vAlpha;
  varying float vLit;
  varying float vDepth;
  varying float vAspect;
  void main() {
    vec2 p = vec2(vUv.x * vAspect, vUv.y) * uNoiseScale + vShape.x;
    float n = texture2D(uNoise, p + vec2(uTime * 0.021, uTime * 0.004)).r * 0.6
            + texture2D(uNoise, p * 2.3 - vec2(uTime * 0.013, 0.0)).r * 0.4;
    // A soft blob centred at the peak height, its edge torn by the noise.
    vec2 q = vec2(vUv.x * 2.0 - 1.0, (vUv.y - uPeak) / (vUv.y > uPeak ? 1.0 - uPeak : uPeak));
    float d = length(q) + (n - 0.5) * vShape.y;
    float blob = 1.0 - smoothstep(0.25, 1.0, d);
    float base = smoothstep(0.0, uPeak, vUv.y); // nothing at the foot (it's below the ground)
    float shape = blob * base * smoothstep(0.2, 0.75, n);
    float fade = smoothstep(uFadeNear.x, uFadeNear.y, vDepth) * (1.0 - smoothstep(uFadeFar.x, uFadeFar.y, vDepth));
    float a = shape * fade * vAlpha * uOpacity;
    if (a < 0.003) discard;
    gl_FragColor = vec4(uColor + uLitColor * vLit, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export class GroundMist {
  // cfg: config.fog.puffs. maxCount: the most any Quality preset asks for.
  constructor(cfg, maxCount, rng) {
    this.cfg = cfg;
    this.maxCount = maxCount;
    this.rng = rng;
    this.count = 0;
    this.enabled = true;
    this.time = 0;
    this.avoid = []; // rectangles { x0, x1, z0, z1 } where none may stand
    this.shapeWeight = cfg.shapes.reduce((sum, s) => sum + s.weight, 0);
  }

  // ground: heightAt(x, z).
  init(scene, ground) {
    const c = this.cfg;
    const n = this.maxCount;
    this.ground = ground;
    this.noise = makeNoiseTexture(c.noiseSize, [[{ cells: 4, weight: 0.65 }, { cells: 12, weight: 0.35 }]], this.rng);

    const quad = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0); // base at y = 0
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.index = quad.index;
    geometry.setAttribute('position', quad.getAttribute('position'));
    geometry.setAttribute('uv', quad.getAttribute('uv'));
    const attr = (size) => {
      const a = new THREE.InstancedBufferAttribute(new Float32Array(n * size), size);
      a.setUsage(THREE.DynamicDrawUsage);
      return a;
    };
    this.centres = attr(3);
    this.sizes = attr(2);
    this.shapes = attr(2);
    this.alphas = attr(1);
    this.lits = attr(1);
    geometry.setAttribute('aCentre', this.centres);
    geometry.setAttribute('aSize', this.sizes);
    geometry.setAttribute('aShape', this.shapes);
    geometry.setAttribute('aAlpha', this.alphas);
    geometry.setAttribute('aLit', this.lits);
    geometry.instanceCount = 0;
    this.geometry = geometry;

    this.uniforms = {
      uNoise: { value: this.noise },
      uColor: { value: new THREE.Color() },
      uLitColor: { value: new THREE.Color() },
      uOpacity: { value: c.opacity },
      uTime: { value: 0 },
      uPeak: { value: c.peak },
      uNoiseScale: { value: c.noiseScale },
      uRight: { value: new THREE.Vector3(1, 0, 0) },
      uFadeNear: { value: new THREE.Vector2(c.fadeNear[0], c.fadeNear[1]) },
      uFadeFar: { value: new THREE.Vector2(10, 20) },
    };
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      fog: false,
    });
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.frustumCulled = false; // they surround the camera
    this.mesh.renderOrder = 1; // after other see-through things on the ground
    scene.add(this.mesh);

    this.puffs = [];
    for (let i = 0; i < n; i++) this.puffs.push({ x: 0, z: 0, w: 1, h: 1, seed: 0, ragged: 0, alpha: 0, placed: false });
    this.right = new THREE.Vector3();
  }

  setCount(count) {
    this.count = Math.min(count, this.maxCount);
    for (const p of this.puffs) p.placed = false;
  }

  pickShape() {
    let r = this.rng.range(0, this.shapeWeight);
    for (const s of this.cfg.shapes) {
      r -= s.weight;
      if (r <= 0) return s;
    }
    return this.cfg.shapes[0];
  }

  // Scatter one anywhere in the ring round (cx, cz), or, when it drifted
  // out, at the mirrored spot on the far side.
  place(p, cx, cz, mirror) {
    const c = this.cfg;
    if (mirror) {
      const scale = 0.95;
      p.x = cx - (p.x - cx) * scale;
      p.z = cz - (p.z - cz) * scale;
    } else {
      const a = this.rng.range(0, Math.PI * 2);
      // Only where they can be seen: past the near fade.
      const r = Math.sqrt(this.rng.range((this.fadeStart / this.radius) ** 2, 1)) * this.radius;
      p.x = cx + Math.cos(a) * r;
      p.z = cz + Math.sin(a) * r;
    }
    const s = this.pickShape();
    p.w = this.rng.range(s.width[0], s.width[1]);
    p.h = this.rng.range(s.height[0], s.height[1]);
    p.ragged = s.ragged;
    p.seed = this.rng.range(0, 10);
    p.alpha = 0;
    p.placed = true;
  }

  inAvoided(x, z) {
    for (const a of this.avoid) if (x > a.x0 && x < a.x1 && z > a.z0 && z < a.z1) return true;
    return false;
  }

  // camera: the THREE camera. amount: the mist's strength now (0 hides
  // them). color: the mist's colour. fogFar: the fog's end (they stay
  // inside it). wind: { x, z } direction. torch: { on, position, aim,
  // color, range, cosOuter, cosInner, strength }.
  update(dt, camera, amount, color, fogFar, wind, torch) {
    const visible = this.enabled && this.count > 0 && amount > 0.01;
    this.mesh.visible = visible;
    if (!visible) return;
    const c = this.cfg;
    this.time += dt * c.billow;
    this.radius = Math.min(c.radius, fogFar * 0.9);
    // The near fade, pulled in when the fog closes in (fog nights) so
    // there's still a band of them to see.
    const fadeEnd = Math.min(c.fadeNear[1], this.radius * 0.55);
    this.fadeStart = fadeEnd * (c.fadeNear[0] / c.fadeNear[1]);
    const u = this.uniforms;
    u.uTime.value = this.time;
    u.uColor.value.copy(color);
    u.uOpacity.value = c.opacity * Math.min(amount, 1.5);
    u.uFadeNear.value.set(this.fadeStart, fadeEnd);
    u.uFadeFar.value.set(this.radius * 0.8, this.radius);
    u.uLitColor.value.copy(torch.color).multiplyScalar(c.torchLit);
    // The camera's right, flat: every sheet faces the way you look.
    camera.updateMatrixWorld();
    this.right.setFromMatrixColumn(camera.matrixWorld, 0);
    this.right.y = 0;
    if (this.right.lengthSq() < 1e-6) this.right.set(1, 0, 0);
    u.uRight.value.copy(this.right.normalize());

    const cx = camera.position.x;
    const cz = camera.position.z;
    const step = c.drift * dt;
    const fadeStep = dt / c.fadeIn;
    for (let i = 0; i < this.count; i++) {
      const p = this.puffs[i];
      if (!p.placed) this.place(p, cx, cz, false);
      p.x += wind.x * step;
      p.z += wind.z * step;
      if (Math.hypot(p.x - cx, p.z - cz) > this.radius) this.place(p, cx, cz, true);
      const target = this.inAvoided(p.x, p.z) ? 0 : 1;
      p.alpha += Math.max(-fadeStep, Math.min(fadeStep, target - p.alpha));
      const y = this.ground.heightAt(p.x, p.z) - c.sink;

      // The torch: brighter the closer to the beam's centre and the nearer.
      let lit = 0;
      if (torch.on) {
        const dx = p.x - torch.position.x;
        const dy = y + p.h * c.peak - torch.position.y;
        const dz = p.z - torch.position.z;
        const dist = Math.hypot(dx, dy, dz);
        if (dist > 0.001 && dist < torch.range) {
          const cos = (dx * torch.aim.x + dy * torch.aim.y + dz * torch.aim.z) / dist;
          const cone = Math.max(0, Math.min(1, (cos - torch.cosOuter) / (torch.cosInner - torch.cosOuter)));
          lit = cone * (1 - dist / torch.range) * torch.strength;
        }
      }
      this.centres.setXYZ(i, p.x, y, p.z);
      this.sizes.setXY(i, p.w, p.h + c.sink);
      this.shapes.setXY(i, p.seed, p.ragged);
      this.alphas.setX(i, p.alpha);
      this.lits.setX(i, lit);
    }
    this.geometry.instanceCount = this.count;
    for (const a of [this.centres, this.sizes, this.shapes, this.alphas, this.lits]) {
      a.clearUpdateRanges();
      a.addUpdateRange(0, this.count * a.itemSize);
      a.needsUpdate = true;
    }
  }

  dispose() {
    this.mesh.removeFromParent();
    this.geometry.dispose();
    this.material.dispose();
    this.noise.dispose();
  }
}
