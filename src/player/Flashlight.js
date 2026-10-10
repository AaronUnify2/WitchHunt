// The flashlight: a spotlight held low and to the right, projecting a
// procedural torch pattern, and the game's one real-time shadow. The beam
// lags the view slightly so it feels hand-held. Toggled with the
// 'flashlight' action. Emits 'flashlight:toggled' { on }.

import * as THREE from 'three';
import { makeFlashlightCookie } from '../render/proceduralTextures.js';

const DEG_TO_RAD = Math.PI / 180;

export class Flashlight {
  constructor(flashlightConfig, rng, bus) {
    this.cfg = flashlightConfig;
    this.rng = rng;
    this.bus = bus;
  }

  init(scene) {
    const c = this.cfg;
    this.cookie = makeFlashlightCookie(c, this.rng);
    this.light = new THREE.SpotLight(c.color, c.intensity, c.distance, c.angle * DEG_TO_RAD, c.penumbra, c.decay);
    this.light.map = this.cookie;
    this.light.shadow.camera.near = c.shadowNear;
    this.light.shadow.camera.far = c.distance;
    this.light.shadow.bias = c.shadowBias;
    this.light.shadow.normalBias = c.shadowNormalBias;
    scene.add(this.light, this.light.target);

    this.offset = new THREE.Vector3(c.offset.x, c.offset.y, c.offset.z);
    this.aim = new THREE.Vector3(0, 0, -1);
    this.forward = new THREE.Vector3();
    this.snapAim = true; // point straight ahead on the first frame
    this.setOn(c.startOn);
  }

  update(dt, input, camera) {
    if (input.wasPressed('flashlight')) this.setOn(!this.on);
    if (!this.on) return;

    this.light.position.copy(this.offset).applyQuaternion(camera.quaternion).add(camera.position);
    camera.getWorldDirection(this.forward);
    if (this.snapAim) {
      this.aim.copy(this.forward);
      this.snapAim = false;
    } else {
      this.aim.lerp(this.forward, 1 - Math.exp(-this.cfg.followRate * dt)).normalize();
    }
    this.light.target.position.copy(this.light.position).addScaledVector(this.aim, this.cfg.aimDistance);
  }

  setOn(on) {
    this.on = on;
    this.light.visible = on;
    if (on) this.snapAim = true;
    this.bus.emit('flashlight:toggled', { on });
  }

  // Quality: shadow on/off and its resolution.
  setShadow(enabled, mapSize) {
    this.light.castShadow = enabled;
    const shadow = this.light.shadow;
    if (shadow.mapSize.x !== mapSize) {
      shadow.mapSize.set(mapSize, mapSize);
      shadow.map?.dispose();
      shadow.map = null; // three.js re-creates it at the new size
    }
  }

  dispose() {
    this.light.shadow.map?.dispose();
    this.light.removeFromParent();
    this.light.target.removeFromParent();
    this.cookie.dispose();
  }
}
