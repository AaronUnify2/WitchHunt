// Post-processing chain: scene -> bloom -> tone mapping + sRGB (OutputPass)
// -> colour grade, vignette and film grain (one cheap full-screen pass,
// in display space). Uses three.js's own post-processing add-ons, so no
// extra dependency.
//
// Session 10: the grade follows the time of day (config.postFX.grade.keys,
// keyed by clock-face hour like the sky). It split-tones (cold shadows,
// warm highlights where the torch and fires are), lifts the blacks a
// touch toward the shadow colour (a faded, printed look: Aaron's 1980s
// chainsaw manual), and sets saturation and contrast. The blood night
// pulls it toward grade.blood.
//
// M8: a last, optional pass for a cutscene's camera look (setLook).

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { findKeyframes, lerp } from './skyPalette.js';

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uSaturation: { value: 1 },
    uContrast: { value: 1 },
    uShadows: { value: new THREE.Color(1, 1, 1) },
    uHighlights: { value: new THREE.Color(1, 1, 1) },
    uSplit: { value: 0 },
    uLift: { value: 0 },
    uThermal: { value: 0 },
    uThermalTint: { value: new THREE.Color(1, 1, 1) },
    uVignette: { value: 0 },
    uVignetteStart: { value: 0 },
    uGrain: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uSaturation;
    uniform float uContrast;
    uniform vec3 uShadows;
    uniform vec3 uHighlights;
    uniform float uSplit;
    uniform float uLift;
    uniform float uThermal;
    uniform vec3 uThermalTint;
    uniform float uVignette;
    uniform float uVignetteStart;
    uniform float uGrain;
    varying vec2 vUv;

    const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec4 src = texture2D(tDiffuse, vUv);
      vec3 col = src.rgb;
      float luma = dot(col, LUMA);
      // Split-tone: shadows toward one colour, highlights toward another,
      // keeping the brightness.
      vec3 toned = mix(uShadows, uHighlights, smoothstep(0.04, 0.55, luma));
      toned /= max(dot(toned, LUMA), 0.001);
      col = mix(col, col * toned, uSplit);
      col = mix(vec3(dot(col, LUMA)), col, uSaturation);
      col = (col - 0.5) * uContrast + 0.5;
      // Faded blacks, tinted like the shadows.
      col = col * (1.0 - uLift) + uShadows * uLift;
      // Session 10b: the heat scope's white-hot view: the cold world dim
      // grey, anything glowing (the living) pushed to white.
      if (uThermal > 0.0) {
        float l = dot(src.rgb, LUMA);
        float hot = smoothstep(0.55, 0.9, l);
        float v = mix(pow(l, 0.8) * 0.6, 1.0, hot);
        col = mix(col, vec3(v) * uThermalTint, uThermal);
      }
      // 0 at the centre, 1 in the corners.
      float edge = length(vUv - 0.5) * 1.41421356;
      col *= 1.0 - uVignette * smoothstep(uVignetteStart, 1.0, edge);
      col += (hash(vUv * 1024.0 + fract(uTime) * 64.0) - 0.5) * uGrain;
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), src.a);
    }
  `,
};

// M8: a cutscene's camera look (CCTV, trail cam, camcorder, military,
// government, scope). Off (uOn 0) the pass is disabled, so it costs nothing.
const LookShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uTint: { value: new THREE.Color(1, 1, 1) },
    uSaturation: { value: 1 },
    uContrast: { value: 1 },
    uGain: { value: 1 },
    uNoise: { value: 0 },
    uScanlines: { value: 0 },
    uLines: { value: 240 },
    uBend: { value: 0 },
    uVignette: { value: 0 },
    uTear: { value: 0 },
    uStatic: { value: 0 },
    uChroma: { value: 0 },
    uMask: { value: 0 },
    uAspect: { value: 1 },
    uTexel: { value: new THREE.Vector2(1 / 1024, 1 / 768) },
  },
  vertexShader: GradeShader.vertexShader,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform vec3 uTint;
    uniform float uSaturation;
    uniform float uContrast;
    uniform float uGain;
    uniform float uNoise;
    uniform float uScanlines;
    uniform float uLines;
    uniform float uBend;
    uniform float uVignette;
    uniform float uTear;
    uniform float uStatic;
    uniform float uChroma;
    uniform float uMask;
    uniform float uAspect;
    uniform vec2 uTexel;
    varying vec2 vUv;

    const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      // Barrel lens.
      vec2 c = vUv - 0.5;
      float r2 = dot(c, c);
      vec2 uv = 0.5 + c * (1.0 + uBend * r2);
      // Torn rows: now and then a band of rows slides sideways.
      float row = floor(uv.y * uLines * 0.25);
      float t = floor(uTime * 12.0);
      float tearOn = step(1.0 - uTear * 0.15, hash(vec2(row, t)));
      uv.x += tearOn * (hash(vec2(t, row)) - 0.5) * 0.08;
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
      }
      vec2 off = vec2(uChroma * uTexel.x, 0.0);
      vec3 col = vec3(texture2D(tDiffuse, uv + off).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - off).b);
      col *= uGain;
      float l = dot(col, LUMA);
      col = mix(vec3(l), col, uSaturation) * uTint;
      col = (col - 0.5) * uContrast + 0.5;
      // Scanlines and static.
      col *= 1.0 - uScanlines * (0.5 + 0.5 * sin(uv.y * uLines * 3.14159));
      float n = hash(uv * 900.0 + fract(uTime * 7.0) * 50.0);
      col += (n - 0.5) * uNoise;
      col = mix(col, vec3(n), uStatic);
      // Vignette, and the scope's round mask.
      col *= 1.0 - uVignette * smoothstep(0.15, 0.55, r2 * 2.0);
      if (uMask > 0.0) {
        vec2 m = vec2(c.x * uAspect, c.y);
        float d = length(m);
        col *= 1.0 - smoothstep(0.40, 0.42, d);
        col = mix(col, vec3(0.0), (step(abs(m.x), 0.0015) + step(abs(m.y), 0.0015)) * step(d, 0.4) * 0.9);
      }
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `,
};

const GRADE_COLOURS = ['shadows', 'highlights'];
const GRADE_NUMBERS = ['saturation', 'contrast', 'split', 'lift'];

function toKey(k) {
  const key = { ...k };
  for (const f of GRADE_COLOURS) key[f] = new THREE.Color(k[f]);
  return key;
}

export class PostFX {
  constructor(postConfig, hoursPerDay = 24) {
    this.cfg = postConfig;
    this.hoursPerDay = hoursPerDay;
  }

  init(renderer, scene, camera) {
    const c = this.cfg;
    const size = renderer.getSize(new THREE.Vector2());
    this.composer = new EffectComposer(renderer);
    this.composer.setPixelRatio(renderer.getPixelRatio());
    this.composer.setSize(size.x, size.y);

    this.renderPass = new RenderPass(scene, camera);
    this.bloom = new UnrealBloomPass(size.clone(), c.bloom.strength, c.bloom.radius, c.bloom.threshold);
    this.output = new OutputPass();
    this.grade = new ShaderPass(GradeShader);
    const u = this.grade.uniforms;
    u.uVignette.value = c.vignette.strength;
    u.uVignetteStart.value = c.vignette.start;
    u.uGrain.value = c.grain.strength;
    this.keys = c.grade.keys.map(toKey);
    this.bloodKey = toKey(c.grade.blood);
    this.setTime(12, 0);

    this.look = new ShaderPass(LookShader);
    this.look.enabled = false;
    this.lookName = null;
    this.staticFlash = 0;
    this.staticFade = 1;
    this.dropout = 0;

    for (const pass of [this.renderPass, this.bloom, this.output, this.grade, this.look]) this.composer.addPass(pass);
  }

  // M8: a cutscene's camera look by name (config.postFX.looks), or null for none.
  setLook(name) {
    const k = name ? this.cfg.looks[name] : null;
    this.lookName = k ? name : null;
    this.look.enabled = Boolean(k);
    if (!k) return;
    const u = this.look.uniforms;
    u.uTint.value.setHex(k.tint);
    u.uSaturation.value = k.saturation;
    u.uContrast.value = k.contrast;
    u.uGain.value = k.gain;
    u.uNoise.value = k.noise;
    u.uScanlines.value = k.scanlines;
    u.uLines.value = k.lines;
    u.uBend.value = k.bend;
    u.uVignette.value = k.vignette;
    u.uTear.value = k.tear;
    u.uChroma.value = k.chroma;
    u.uMask.value = k.mask;
    this.dropout = k.dropout;
  }

  // M8: a burst of full static (a feed glitching or dying), 0..1, fading over `seconds`.
  glitch(amount = 1, seconds = 0.4) {
    this.staticFlash = amount;
    this.staticFade = amount / Math.max(0.01, seconds);
  }

  get lookActive() {
    return this.look.enabled;
  }

  // The grade for the clock-face hour, pulled toward the blood night's by blood (0..1).
  setTime(hour, blood) {
    const { a, b, t } = findKeyframes(this.keys, hour, this.hoursPerDay);
    const u = this.grade.uniforms;
    const bl = this.bloodKey;
    u.uShadows.value.lerpColors(a.shadows, b.shadows, t).lerp(bl.shadows, blood);
    u.uHighlights.value.lerpColors(a.highlights, b.highlights, t).lerp(bl.highlights, blood);
    const n = {};
    for (const f of GRADE_NUMBERS) n[f] = lerp(lerp(a[f], b[f], t), bl[f], blood);
    u.uSaturation.value = n.saturation;
    u.uContrast.value = n.contrast;
    u.uSplit.value = n.split;
    u.uLift.value = n.lift;
  }

  // Session 10b: the heat scope's view on (tint: its colour) or off.
  setThermal(on, tint = 0xffffff) {
    this.grade.uniforms.uThermal.value = on ? 1 : 0;
    this.grade.uniforms.uThermalTint.value.setHex(tint);
  }

  setCamera(camera) {
    this.renderPass.camera = camera;
  }

  setBloom(enabled) {
    this.bloom.enabled = enabled;
  }

  setSize(width, height, pixelRatio) {
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(width, height);
    const u = this.look.uniforms;
    u.uAspect.value = width / Math.max(1, height);
    u.uTexel.value.set(1 / Math.max(1, width * pixelRatio), 1 / Math.max(1, height * pixelRatio));
  }

  render(dt) {
    this.grade.uniforms.uTime.value += dt;
    if (this.look.enabled) {
      const u = this.look.uniforms;
      u.uTime.value += dt;
      // A battered feed drops whole frames to static now and then.
      if (this.dropout > 0 && Math.random() < this.dropout * dt) this.glitch(0.8, 0.15); // cosmetic: not gameplay
      this.staticFlash = Math.max(0, this.staticFlash - this.staticFade * dt);
      u.uStatic.value = this.staticFlash;
    }
    this.composer.render(dt);
  }

  dispose() {
    this.bloom.dispose();
    this.output.dispose();
    this.grade.dispose();
    this.look.dispose();
    this.composer.dispose();
  }
}
