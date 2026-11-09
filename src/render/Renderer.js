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
    this.sizeDirty = false; // a scale change waiting for the next render()
    this.retro = false; // Session 10: the optional retro pixel filter (setRetro)
    this.preRender = []; // functions (webglRenderer, scene) drawn before the frame: the ute's rear-view mirror
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
    this.sizeDirty = true;
  }

  // Render scale = fraction of native resolution. Applied at the start of
  // the next render(): resizing clears the canvas, so a resize between a
  // frame's draw and the browser showing it shows a black frame (Session 22,
  // Aaron's flicker every 5-10 s, from dynamic resolution stepping).
  setScale(scale) {
    if (scale === this.scale) return;
    this.scale = scale;
    this.sizeDirty = true;
  }

  // M8: what's drawn from (a cutscene's camera, or the player's).
  setCamera(camera) {
    this.camera = camera;
    this.postFX.setCamera(camera);
  }

  setPostFX(enabled, bloom) {
    this.postEnabled = enabled;
    this.postFX.setBloom(bloom);
  }

  resize() {
    this.sizeDirty = false;
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(this.width, this.height);
    this.postFX.setSize(this.width, this.height, this.pixelRatio);
  }

  render(dt) {
    if (this.sizeDirty) this.resize();
    const camera = this.camera;
    const aspect = this.width / this.height;
    if (camera.aspect !== aspect) {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    }
    this.renderer.info.reset();
    for (const draw of this.preRender) draw(this.renderer, this.scene);
    // M8: a cutscene's camera look needs the post chain, whatever the quality.
    if (this.postEnabled || this.postFX.lookActive) this.postFX.render(dt);
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
