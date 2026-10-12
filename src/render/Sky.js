// Sky dome, stars, moon, the sun/moon directional light, ambient light
// and fog colour, all driven by the clock's hour through config.sky.keys.
// The dome follows the camera and sits just inside the far plane.

import * as THREE from 'three';
import { findKeyframes, lerp, sunDirection } from './skyPalette.js';
import { makeMoonTexture } from './proceduralTextures.js';

const DOME_VERTEX = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const DOME_FRAGMENT = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform float uExponent;
  varying vec3 vDir;
  void main() {
    float h = pow(clamp(vDir.y, 0.0, 1.0), uExponent);
    gl_FragColor = vec4(mix(uHorizon, uTop, h), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const STAR_VERTEX = /* glsl */ `
  attribute float aPhase;
  uniform float uTime;
  uniform float uSize;
  uniform float uTwinkleSpeed;
  uniform float uTwinkleAmount;
  varying float vTwinkle;
  void main() {
    vTwinkle = 1.0 - uTwinkleAmount * (0.5 + 0.5 * sin(uTime * uTwinkleSpeed + aPhase));
    gl_PointSize = uSize;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const STAR_FRAGMENT = /* glsl */ `
  uniform float uOpacity;
  varying float vTwinkle;
  void main() {
    gl_FragColor = vec4(vec3(1.0), uOpacity * vTwinkle);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const COLOR_FIELDS = ['skyTop', 'horizon', 'ambient', 'light'];

export class Sky {
  constructor(skyConfig, fogConfig, clockConfig, rng) {
    this.cfg = skyConfig;
    this.fogCfg = fogConfig;
    this.clockCfg = clockConfig;
    this.rng = rng;
  }

  init(scene) {
    const c = this.cfg;
    // Pre-convert key colours once; blending reuses scratch colours.
    this.keys = c.keys.map((k) => {
      const key = { ...k };
      for (const f of COLOR_FIELDS) key[f] = new THREE.Color(k[f]);
      return key;
    });
    this.scratch = Object.fromEntries(COLOR_FIELDS.map((f) => [f, new THREE.Color()]));
    this.sunDir = { x: 0, y: 0, z: 0 };
    this.moonDir = new THREE.Vector3(c.moonDirection.x, c.moonDirection.y, c.moonDirection.z).normalize();
    this.lightDir = new THREE.Vector3();

    this.group = new THREE.Group();
    this.group.add(this.buildDome(), this.buildStars(), this.buildMoon());
    this.ambient = new THREE.AmbientLight();
    this.light = new THREE.DirectionalLight();
    scene.add(this.group, this.ambient, this.light, this.light.target);

    this.fog = new THREE.Fog(0x000000, 1, 2);
    scene.fog = this.fog;
    this.time = 0;
    this.blood = 0; // M7: the blood night (setBlood)
  }

  buildDome() {
    const segments = this.cfg.domeSegments;
    this.domeUniforms = {
      uTop: { value: new THREE.Color() },
      uHorizon: { value: new THREE.Color() },
      uExponent: { value: this.cfg.gradientExponent },
    };
    this.dome = new THREE.Mesh(
      new THREE.SphereGeometry(1, segments, segments / 2),
      new THREE.ShaderMaterial({
        uniforms: this.domeUniforms,
        vertexShader: DOME_VERTEX,
        fragmentShader: DOME_FRAGMENT,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    );
    this.dome.renderOrder = -2;
    this.dome.frustumCulled = false;
    return this.dome;
  }

  buildStars() {
    const c = this.cfg;
    const positions = new Float32Array(c.starCount * 3);
    const phases = new Float32Array(c.starCount);
    for (let i = 0; i < c.starCount; i++) {
      // Uniform on the upper part of a sphere.
      const y = this.rng.range(c.starMinHeight, 1);
      const angle = this.rng.range(0, Math.PI * 2);
      const ring = Math.sqrt(1 - y * y);
      positions.set([Math.cos(angle) * ring, y, Math.sin(angle) * ring], i * 3);
      phases[i] = this.rng.range(0, Math.PI * 2);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    this.starUniforms = {
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uSize: { value: c.starSize },
      uTwinkleSpeed: { value: c.starTwinkleSpeed },
      uTwinkleAmount: { value: c.starTwinkleAmount },
    };
    this.stars = new THREE.Points(
      geometry,
      new THREE.ShaderMaterial({
        uniforms: this.starUniforms,
        vertexShader: STAR_VERTEX,
        fragmentShader: STAR_FRAGMENT,
        transparent: true,
        depthWrite: false,
        fog: false,
      }),
    );
    this.stars.renderOrder = -1;
    this.stars.frustumCulled = false;
    return this.stars;
  }

  buildMoon() {
    this.moon = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: makeMoonTexture(this.cfg.moonTextureSize),
        color: this.cfg.moonColor,
        transparent: true,
        depthWrite: false,
        fog: false,
      }),
    );
    this.moon.renderOrder = -1;
    this.moon.position.copy(this.moonDir);
    this.moon.scale.setScalar(this.cfg.moonSize);
    return this.moon;
  }

  // M7: the blood night. amount 0..1 blends the sky, fog and light toward
  // colours { skyTop, horizon, ambient, light } (hex), and hides the stars.
  setBlood(amount, colours = null) {
    this.blood = Math.max(0, Math.min(1, amount));
    if (colours && !this.bloodColours) {
      this.bloodColours = {};
      for (const f of COLOR_FIELDS) this.bloodColours[f] = new THREE.Color(colours[f]);
    }
  }

  // hour: clock-face hour. Call after the camera has moved this frame.
  update(dt, hour, camera) {
    this.time += dt;
    const { a, b, t } = findKeyframes(this.keys, hour, this.clockCfg.hoursPerDay);
    const s = this.scratch;
    for (const f of COLOR_FIELDS) s[f].lerpColors(a[f], b[f], t);
    let stars = lerp(a.stars, b.stars, t);
    if (this.blood > 0 && this.bloodColours) {
      for (const f of COLOR_FIELDS) s[f].lerp(this.bloodColours[f], this.blood);
      stars *= 1 - this.blood;
    }

    this.domeUniforms.uTop.value.copy(s.skyTop);
    this.domeUniforms.uHorizon.value.copy(s.horizon);
    this.fog.color.copy(s.horizon);
    this.ambient.color.copy(s.ambient);
    this.ambient.intensity = lerp(a.ambientIntensity, b.ambientIntensity, t);
    this.light.color.copy(s.light);
    this.light.intensity = lerp(a.lightIntensity, b.lightIntensity, t);

    this.starUniforms.uTime.value = this.time;
    this.starUniforms.uOpacity.value = stars;
    this.stars.visible = stars > 0;
    this.moon.material.opacity = stars;
    this.moon.visible = stars > 0;

    // Sunlight by day, moonlight by night.
    sunDirection(hour, this.cfg, this.sunDir);
    if (this.sunDir.y > 0) this.lightDir.set(this.sunDir.x, this.sunDir.y, this.sunDir.z);
    else this.lightDir.copy(this.moonDir);

    this.group.position.copy(camera.position);
    this.group.scale.setScalar(camera.far * this.cfg.domeFraction);
    this.light.target.position.copy(camera.position);
    this.light.position.copy(camera.position).addScaledVector(this.lightDir, this.cfg.lightDistance);
  }

  setDrawDistance(distance) {
    this.fog.near = distance * this.fogCfg.nearFraction;
    this.fog.far = distance;
  }

  dispose() {
    this.group.traverse((obj) => {
      obj.geometry?.dispose();
      obj.material?.map?.dispose();
      obj.material?.dispose();
    });
    this.group.removeFromParent();
    this.ambient.removeFromParent();
    this.light.removeFromParent();
    this.light.target.removeFromParent();
  }
}
