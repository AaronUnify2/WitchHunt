// The flashlight: a spotlight held low and to the right, projecting a
// procedural torch pattern, and the game's one real-time shadow. The beam
// lags the view slightly so it feels hand-held, has a wide dim spill
// round it so the edges of the view aren't black, and dims when it's right
// up against a tree, rock or the ground so close surfaces don't flood the
// view with glare. Toggled with the 'flashlight' action.
// Emits 'flashlight:toggled' { on }.

import * as THREE from 'three';
import { makeFlashlightCookie } from '../render/proceduralTextures.js';
import { nearestHit } from '../world/collision.js';

const DEG_TO_RAD = Math.PI / 180;

export class Flashlight {
  constructor(flashlightConfig, rng, bus) {
    this.cfg = flashlightConfig;
    this.rng = rng;
    this.bus = bus;
  }

  init(scene, colliders) {
    const c = this.cfg;
    this.colliders = colliders;
    this.nearby = [];
    this.glareFactor = 1;
    this.surfaceDistance = c.glare.fullDistance;
    this.hit = { distance: 0, facing: 0 };
    this.cookie = makeFlashlightCookie(c, this.rng);
    this.light = new THREE.SpotLight(c.color, c.intensity, c.distance, c.angle * DEG_TO_RAD, c.penumbra, c.decay);
    this.light.map = this.cookie;
    this.light.shadow.camera.near = c.shadowNear;
    this.light.shadow.camera.far = c.distance;
    this.light.shadow.bias = c.shadowBias;
    this.light.shadow.normalBias = c.shadowNormalBias;
    scene.add(this.light, this.light.target);
    // Wide, dim spill round the beam; shares the beam's target. No shadow.
    const sp = c.spill;
    this.spill = new THREE.SpotLight(c.color, sp.intensity, sp.distance, sp.angle * DEG_TO_RAD, sp.penumbra, sp.decay);
    this.spill.target = this.light.target;
    scene.add(this.spill);

    this.offset = new THREE.Vector3(c.offset.x, c.offset.y, c.offset.z);
    this.aim = new THREE.Vector3(0, 0, -1);
    this.forward = new THREE.Vector3();
    this.right = new THREE.Vector3();
    this.up = new THREE.Vector3();
    this.ray = new THREE.Vector3();
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
    this.spill.position.copy(this.light.position);
    this.updateGlare(dt);
  }

  // How hard the beam hits a surface goes as facing / distance ^ decay
  // (facing = 1 head-on, near 0 at a glancing angle). If the strongest hit
  // is brighter than a head-on surface at glare.fullDistance, dim the torch
  // so it's no brighter than that: close trees and rocks stop flooding the
  // view, while the ground ahead (a glancing hit) keeps the full beam. The
  // beam is a cone, so a ring of rays is checked as well as the centre.
  updateGlare(dt) {
    const g = this.cfg.glare;
    const decay = this.cfg.decay;
    const origin = this.light.position;
    const nearby = this.colliders.query(origin.x, origin.z, g.fullDistance + g.queryMargin, this.nearby);

    this.right.crossVectors(this.aim, THREE.Object3D.DEFAULT_UP).normalize();
    this.up.crossVectors(this.right, this.aim);
    const spread = Math.tan(this.cfg.angle * DEG_TO_RAD * g.ringSpread);
    let strongest = 0;
    this.surfaceDistance = g.fullDistance;
    for (let i = 0; i <= g.ringRays; i++) {
      this.ray.copy(this.aim);
      if (i > 0) {
        const a = (i / g.ringRays) * Math.PI * 2;
        this.ray.addScaledVector(this.right, Math.cos(a) * spread).addScaledVector(this.up, Math.sin(a) * spread).normalize();
      }
      nearestHit(origin, this.ray, nearby, g.fullDistance, this.hit);
      const strength = this.hit.facing / Math.pow(Math.max(this.hit.distance, g.minDistance), decay);
      if (strength > strongest) {
        strongest = strength;
        this.surfaceDistance = this.hit.distance;
      }
    }

    const limit = 1 / Math.pow(g.fullDistance, decay);
    const target = strongest > limit ? Math.max(g.minFactor, limit / strongest) : 1;
    this.glareFactor += (target - this.glareFactor) * (1 - Math.exp(-g.response * dt));
    this.light.intensity = this.cfg.intensity * this.glareFactor;
    this.spill.intensity = this.cfg.spill.intensity * this.glareFactor;
  }

  setOn(on) {
    this.on = on;
    this.light.visible = on;
    this.spill.visible = on;
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
    this.spill.removeFromParent();
    this.cookie.dispose();
  }
}
