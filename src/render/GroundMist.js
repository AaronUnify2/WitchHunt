// Drifting ground mist near the player (Session 10): a handful of wide,
// soft, camera-facing billboards standing in the low mist, drifting with
// the wind and billowing through a generated noise texture. One instanced
// draw call. The torch's beam brightens the ones it hits. They live
// within config.fog.puffs.radius of you (never past the fog); one that
// drifts out is moved to the far side and fades back in. None inside the
// station's fence.

import * as THREE from 'three';

const VERTEX = /* glsl */ `
  attribute vec3 aCentre;
  attribute vec2 aSize;
  attribute float aSeed;
  attribute float aAlpha;
  attribute float aLit;
  varying vec2 vUv;
  varying float vSeed;
  varying float vAlpha;
  varying float vLit;
  varying float vDepth;
  varying float vAspect;
  void main() {
    // Turn about the vertical axis to face the camera.
    vec2 d = cameraPosition.xz - aCentre.xz;
    float len = length(d);
    vec2 f = len > 0.0001 ? d / len : vec2(0.0, 1.0);
    vec3 right = vec3(f.y, 0.0, -f.x);
    vec3 world = aCentre + right * (position.x * aSize.x) + vec3(0.0, position.y * aSize.y, 0.0);
    vec4 mv = viewMatrix * vec4(world, 1.0);
    gl_Position = projectionMatrix * mv;
    vUv = uv;
    vSeed = aSeed;
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
  uniform float uTime;
  uniform float uPeak;
  uniform float uNoiseScale;
  uniform vec2 uFadeNear;
  uniform vec2 uFadeFar;
  varying vec2 vUv;
  varying float vSeed;
  varying float vAlpha;
  varying float vLit;
  varying float vDepth;
  varying float vAspect;
  void main() {
    float sides = smoothstep(0.0, 0.3, vUv.x) * smoothstep(1.0, 0.7, vUv.x);
    float rise = smoothstep(0.0, uPeak, vUv.y) * (1.0 - smoothstep(uPeak, 1.0, vUv.y));
    vec2 p = vec2(vUv.x * vAspect, vUv.y) * uNoiseScale + vSeed;
    float n = texture2D(uNoise, p + vec2(uTime * 0.021, uTime * 0.004)).r * 0.6
            + texture2D(uNoise, p * 2.3 - vec2(uTime * 0.013, 0.0)).r * 0.4;
    float shape = sides * rise * smoothstep(0.3, 0.8, n);
    float fade = smoothstep(uFadeNear.x, uFadeNear.y, vDepth) * (1.0 - smoothstep(uFadeFar.x, uFadeFar.y, vDepth));
    float a = shape * fade * vAlpha * uOpacity;
    if (a < 0.003) discard;
    gl_FragColor = vec4(uColor + uLitColor * vLit, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// A tiling value-noise texture, made in code (two octaves).
function makeNoiseTexture(size, rng) {
  const grid = (cells) => {
    const g = new Float32Array(cells * cells);
    for (let i = 0; i < g.length; i++) g[i] = rng.next();
    return (x, y) => {
      const fx = (x / size) * cells;
      const fy = (y / size) * cells;
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const tx = fx - x0;
      const ty = fy - y0;
      const sx = tx * tx * (3 - 2 * tx);
      const sy = ty * ty * (3 - 2 * ty);
      const at = (i, j) => g[((j + cells) % cells) * cells + ((i + cells) % cells)];
      const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx;
      const bottom = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
      return top + (bottom - top) * sy;
    };
  };
  const coarse = grid(4);
  const fine = grid(12);
  const data = new Uint8Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) data[y * size + x] = Math.round((coarse(x, y) * 0.65 + fine(x, y) * 0.35) * 255);
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RedFormat, THREE.UnsignedByteType);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

export class GroundMist {
  // cfg: config.fog.puffs. maxCount: the most any Quality preset asks for.
  constructor(cfg, maxCount, rng) {
    this.cfg = cfg;
    this.maxCount = maxCount;
    this.rng = rng;
    this.count = 0;
    this.enabled = true;
    this.time = 0;
    this.avoid = []; // [{ x, z, r }]
  }

  // ground: heightAt(x, z).
  init(scene, ground) {
    const c = this.cfg;
    const n = this.maxCount;
    this.ground = ground;
    this.noise = makeNoiseTexture(c.noiseSize, this.rng);

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
    this.seeds = attr(1);
    this.alphas = attr(1);
    this.lits = attr(1);
    geometry.setAttribute('aCentre', this.centres);
    geometry.setAttribute('aSize', this.sizes);
    geometry.setAttribute('aSeed', this.seeds);
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

    // Puffs: { x, z, w, h, seed, alpha, lit }
    this.puffs = [];
    for (let i = 0; i < n; i++) this.puffs.push({ x: 0, z: 0, w: 1, h: 1, seed: 0, alpha: 0, lit: 0, placed: false });
  }

  setCount(count) {
    this.count = Math.min(count, this.maxCount);
    for (const p of this.puffs) p.placed = false;
  }

  // Scatter one anywhere in the ring round (cx, cz), or, when it drifted
  // out, at the mirrored spot on the far side.
  place(p, cx, cz, mirror) {
    const c = this.cfg;
    if (mirror) {
      const dx = p.x - cx;
      const dz = p.z - cz;
      const scale = 0.95;
      p.x = cx - dx * scale;
      p.z = cz - dz * scale;
    } else {
      const a = this.rng.range(0, Math.PI * 2);
      const r = Math.sqrt(this.rng.range((c.nearRadius / this.radius) ** 2, 1)) * this.radius;
      p.x = cx + Math.cos(a) * r;
      p.z = cz + Math.sin(a) * r;
    }
    p.w = this.rng.range(c.width[0], c.width[1]);
    p.h = this.rng.range(c.height[0], c.height[1]);
    p.seed = this.rng.range(0, 10);
    p.alpha = 0;
    p.placed = true;
  }

  inAvoided(x, z) {
    for (const a of this.avoid) if (Math.hypot(x - a.x, z - a.z) < a.r) return true;
    return false;
  }

  // amount: the mist's strength now (0 hides them). color: the mist's
  // colour. fogFar: the fog's end (they stay inside it). wind: {x, z}
  // unit-ish direction. torch: { on, position, aim, color, range, cosOuter, cosInner, strength }.
  update(dt, camera, amount, color, fogFar, wind, torch) {
    const visible = this.enabled && this.count > 0 && amount > 0.01;
    this.mesh.visible = visible;
    if (!visible) return;
    const c = this.cfg;
    this.time += dt;
    this.radius = Math.max(c.nearRadius + 4, Math.min(c.radius, fogFar * 0.9));
    const u = this.uniforms;
    u.uTime.value = this.time;
    u.uColor.value.copy(color);
    u.uOpacity.value = c.opacity * Math.min(amount, 1.5);
    u.uFadeFar.value.set(this.radius * 0.6, this.radius);
    u.uLitColor.value.copy(torch.color).multiplyScalar(c.torchLit);

    const cx = camera.x;
    const cz = camera.z;
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
      this.seeds.setX(i, p.seed);
      this.alphas.setX(i, p.alpha);
      this.lits.setX(i, lit);
    }
    this.geometry.instanceCount = this.count;
    for (const a of [this.centres, this.sizes, this.seeds, this.alphas, this.lits]) {
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
