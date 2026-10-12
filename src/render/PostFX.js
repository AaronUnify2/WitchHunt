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
      // 0 at the centre, 1 in the corners.
      float edge = length(vUv - 0.5) * 1.41421356;
      col *= 1.0 - uVignette * smoothstep(uVignetteStart, 1.0, edge);
      col += (hash(vUv * 1024.0 + fract(uTime) * 64.0) - 0.5) * uGrain;
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), src.a);
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

    for (const pass of [this.renderPass, this.bloom, this.output, this.grade]) this.composer.addPass(pass);
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

  setCamera(camera) {
    this.renderPass.camera = camera;
  }

  setBloom(enabled) {
    this.bloom.enabled = enabled;
  }

  setSize(width, height, pixelRatio) {
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(width, height);
  }

  render(dt) {
    this.grade.uniforms.uTime.value += dt;
    this.composer.render(dt);
  }

  dispose() {
    this.bloom.dispose();
    this.output.dispose();
    this.grade.dispose();
    this.composer.dispose();
  }
}
