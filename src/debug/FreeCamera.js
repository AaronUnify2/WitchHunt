// M0 test camera: first-person look and walk on the ground plane, driven
// by Input actions. No collision, sprint, crouch or jump (those are M1's
// Player). Kept inside the ground bounds.

import * as THREE from 'three';

const DEG_TO_RAD = Math.PI / 180;

export class FreeCamera {
  constructor(cameraConfig, renderConfig, boundsHalfSize) {
    this.cfg = cameraConfig;
    this.renderCfg = renderConfig;
    this.bounds = boundsHalfSize;
  }

  init() {
    const r = this.renderCfg;
    this.camera = new THREE.PerspectiveCamera(r.fov, 1, r.near, r.far);
    this.camera.rotation.order = 'YXZ'; // yaw, then pitch: no roll creep
    this.yaw = this.cfg.startYaw * DEG_TO_RAD;
    this.pitch = 0;
    this.camera.position.set(this.cfg.startPosition.x, this.cfg.eyeHeight, this.cfg.startPosition.z);
    this.applyRotation();
  }

  update(dt, input) {
    const look = input.getLook();
    const limit = this.cfg.pitchLimit * DEG_TO_RAD;
    this.yaw -= look.x;
    this.pitch = THREE.MathUtils.clamp(this.pitch + look.y, -limit, limit);
    this.applyRotation();

    // Move relative to where the camera faces, flat on the ground.
    const move = input.getMove();
    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    const step = this.cfg.moveSpeed * dt;
    const p = this.camera.position;
    p.x += (cos * move.x - sin * move.y) * step;
    p.z += (-sin * move.x - cos * move.y) * step;
    p.x = THREE.MathUtils.clamp(p.x, -this.bounds, this.bounds);
    p.z = THREE.MathUtils.clamp(p.z, -this.bounds, this.bounds);
  }

  dispose() {}

  applyRotation() {
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }
}
