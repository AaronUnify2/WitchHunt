// Wraps three.js WebGLRenderer: render scale (driven by dynamic
// resolution), tone mapping, the flashlight's shadow map, and the
// optional post-processing chain. Emits 'render:contextLost'.

import * as THREE from 'three';
import { PostFX } from './PostFX.js';

export class Renderer {
  constructor(renderConfig, postConfig, bus, hoursPerDay = 24) {
    this.cfg = renderConfig;
    this.postCfg = postConfig;
    this.hoursPerDay = hoursPerDay;
    this.bus = bus;
    this.bufferSize = new THREE.Vector2();
    this.scale = renderConfig.renderScale;
    this.postEnabled = false;
    this.retro = false; // Session 10: the optional retro pixel filter (setRetro)
  }

  init(container, scene, camera) {
    this.container = container;
    this.scene = scene;
    this.camera = camera;
    this.renderer = new THREE.WebGLRenderer({
      antialias: this.cfg.antialias,
      powerPreference: this.cfg.powerPreference,
    });
    this.renderer.toneMapping = THREE[`${this.cfg.toneMapping}ToneMapping`];
    this.renderer.toneMappingExposure = this.cfg.exposure;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    // Post passes each call render(); count the whole frame, not the last pass.
    this.renderer.info.autoReset = false;
    container.appendChild(this.renderer.domElement);

    this.postFX = new PostFX(this.postCfg, this.hoursPerDay);
    this.postFX.init(this.renderer, scene, camera);

    this.onResize = () => this.resize();
    window.addEventListener('resize', this.onResize);
    this.onContextLost = (e) => {
      e.preventDefault();
      this.bus.emit('render:contextLost');
    };
    this.renderer.domElement.addEventListener('webglcontextlost', this.onContextLost);
    this.resize();
  }

  update() {}

  dispose() {
    window.removeEventListener('resize', this.onResize);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLost);
    this.postFX.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  get canvas() {
    return this.renderer.domElement;
  }

  get pixelRatio() {
    // The retro filter renders a fixed number of lines and lets the
    // browser blow them up with hard, nearest-neighbour pixels.
    if (this.retro) return this.cfg.retro.lines / Math.max(1, this.container.clientHeight);
    return Math.min(window.devicePixelRatio || 1, this.cfg.maxDevicePixelRatio) * this.scale;
  }

  // Session 10 (DESIGN.md "Rendering pipeline" step 4): the optional retro
  // pixel filter. Overrides the render scale while it's on.
  setRetro(on) {
    this.retro = on;
    this.renderer.domElement.style.imageRendering = on ? 'pixelated' : '';
    this.resize();
  }

  // Render scale = fraction of native resolution.
  setScale(scale) {
    this.scale = scale;
    this.resize();
  }

  setPostFX(enabled, bloom) {
    this.postEnabled = enabled;
    this.postFX.setBloom(bloom);
  }

  resize() {
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(this.width, this.height);
    this.postFX.setSize(this.width, this.height, this.pixelRatio);
  }

  render(dt) {
    const camera = this.camera;
    const aspect = this.width / this.height;
    if (camera.aspect !== aspect) {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    }
    this.renderer.info.reset();
    if (this.postEnabled) this.postFX.render(dt);
    else this.renderer.render(this.scene, camera);
  }

  // Numbers for the debug overlay (valid after render()).
  get stats() {
    const info = this.renderer.info.render;
    this.renderer.getDrawingBufferSize(this.bufferSize);
    return {
      drawCalls: info.calls,
      triangles: info.triangles,
      bufferWidth: this.bufferSize.x,
      bufferHeight: this.bufferSize.y,
      renderScale: this.scale,
    };
  }
}
