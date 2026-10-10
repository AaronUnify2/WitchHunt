// Post-processing chain: scene -> bloom -> tone mapping + sRGB (OutputPass)
// -> colour grade, vignette and film grain (one cheap full-screen pass,
// in display space). Uses three.js's own post-processing add-ons, so no
// extra dependency.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uSaturation: { value: 1 },
    uContrast: { value: 1 },
    uTint: { value: new THREE.Color() },
    uTintStrength: { value: 0 },
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
    uniform vec3 uTint;
    uniform float uTintStrength;
    uniform float uVignette;
    uniform float uVignetteStart;
    uniform float uGrain;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec4 src = texture2D(tDiffuse, vUv);
      vec3 col = src.rgb;
      float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(luma), col, uSaturation);
      col = (col - 0.5) * uContrast + 0.5;
      col = mix(col, col * uTint, uTintStrength);
      // 0 at the centre, 1 in the corners.
      float edge = length(vUv - 0.5) * 1.41421356;
      col *= 1.0 - uVignette * smoothstep(uVignetteStart, 1.0, edge);
      col += (hash(vUv * 1024.0 + fract(uTime) * 64.0) - 0.5) * uGrain;
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), src.a);
    }
  `,
};

export class PostFX {
  constructor(postConfig) {
    this.cfg = postConfig;
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
    u.uSaturation.value = c.grade.saturation;
    u.uContrast.value = c.grade.contrast;
    u.uTint.value.set(c.grade.tint);
    u.uTintStrength.value = c.grade.tintStrength;
    u.uVignette.value = c.vignette.strength;
    u.uVignetteStart.value = c.vignette.start;
    u.uGrain.value = c.grain.strength;

    for (const pass of [this.renderPass, this.bloom, this.output, this.grade]) this.composer.addPass(pass);
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
