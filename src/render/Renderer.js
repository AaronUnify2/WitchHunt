// Wraps three.js WebGLRenderer. M0: a fixed render scale from config.
// M1 replaces this with dynamic resolution and post-processing.

import * as THREE from 'three';

export class Renderer {
  constructor(renderConfig, bus) {
    this.cfg = renderConfig;
    this.bus = bus;
    this.bufferSize = new THREE.Vector2();
  }

  init(container) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({
      antialias: this.cfg.antialias,
      powerPreference: this.cfg.powerPreference,
    });
    container.appendChild(this.renderer.domElement);

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
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  get canvas() {
    return this.renderer.domElement;
  }

  get pixelRatio() {
    return Math.min(window.devicePixelRatio || 1, this.cfg.maxDevicePixelRatio) * this.cfg.renderScale;
  }

  resize() {
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(this.width, this.height);
  }

  render(scene, camera) {
    const aspect = this.width / this.height;
    if (camera.aspect !== aspect) {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    }
    this.renderer.render(scene, camera);
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
      renderScale: this.cfg.renderScale,
    };
  }
}
