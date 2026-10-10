// First-person player: look, walk, sprint (stamina), toggle crouch, jump,
// collision against trunks and rocks, and a subtle head bob. Owns the
// main camera. Movement speed carries over from the M0 test camera,
// whose feel was signed off on the tablet.

import * as THREE from 'three';
import { Stamina } from './Stamina.js';
import { resolveCircles, clampToRadius } from '../world/collision.js';

const DEG_TO_RAD = Math.PI / 180;
const TWO_PI = Math.PI * 2;

export class Player {
  constructor(playerConfig, renderConfig, colliders, boundaryRadius) {
    this.cfg = playerConfig;
    this.renderCfg = renderConfig;
    this.colliders = colliders;
    this.boundaryRadius = boundaryRadius;
  }

  init() {
    const c = this.cfg;
    const r = this.renderCfg;
    this.camera = new THREE.PerspectiveCamera(r.fov, 1, r.near, 1);
    this.camera.rotation.order = 'YXZ'; // yaw, then pitch: no roll creep
    this.yaw = c.startYaw * DEG_TO_RAD;
    this.pitch = 0;
    this.position = new THREE.Vector3(c.startPosition.x, 0, c.startPosition.z); // feet
    this.velocity = { x: 0, z: 0 };
    this.verticalSpeed = 0;
    this.onGround = true;
    this.crouched = false;
    this.sprinting = false;
    this.sprintLatched = false; // controller: click L3 once to sprint until you stop
    this.eyeHeight = c.eyeHeight;
    this.bobPhase = 0;
    this.bobOffset = 0;
    this.stamina = new Stamina(c.stamina);
    this.stamina.init();
    this.nearby = [];
    this.applyCamera();
  }

  update(dt, input) {
    this.updateLook(input);
    this.updateStance(input);
    this.updateMovement(dt, input);
    this.updateVertical(dt, input);
    this.updateEyeHeight(dt);
    this.updateHeadBob(dt);
    this.applyCamera();
  }

  dispose() {}

  updateLook(input) {
    const look = input.getLook();
    const limit = this.cfg.pitchLimit * DEG_TO_RAD;
    this.yaw -= look.x;
    this.pitch = THREE.MathUtils.clamp(this.pitch + look.y, -limit, limit);
  }

  updateStance(input) {
    if (input.wasPressed('crouch')) {
      this.crouched = !this.crouched;
      if (this.crouched) this.sprintLatched = false;
    }
    if (input.wasPressed('sprint')) {
      this.crouched = false; // sprinting stands you up
      if (input.activeDevice === 'gamepad') this.sprintLatched = true;
    }
  }

  updateMovement(dt, input) {
    const c = this.cfg;
    const move = input.getMove();
    const amount = Math.hypot(move.x, move.y);
    const moving = amount >= c.sprintMinMove;
    if (!moving || this.stamina.empty) this.sprintLatched = false;

    const wantSprint = (this.sprintLatched || input.isDown('sprint')) && moving && !this.crouched;
    this.sprinting = wantSprint && (this.sprinting ? !this.stamina.empty : this.stamina.canStart);
    this.stamina.update(dt, this.sprinting);

    let speed = c.walkSpeed;
    if (this.sprinting) speed *= c.sprintMultiplier;
    else if (this.crouched) speed *= c.crouchMultiplier;

    // Stick direction relative to where the player faces, flat on the ground.
    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    const targetX = (cos * move.x - sin * move.y) * speed;
    const targetZ = (-sin * move.x - cos * move.y) * speed;

    const speeding = Math.hypot(targetX, targetZ) >= Math.hypot(this.velocity.x, this.velocity.z);
    const maxDelta = (speeding ? c.acceleration : c.deceleration) * dt;
    this.velocity.x += clampDelta(targetX - this.velocity.x, maxDelta);
    this.velocity.z += clampDelta(targetZ - this.velocity.z, maxDelta);

    const p = this.position;
    p.x += this.velocity.x * dt;
    p.z += this.velocity.z * dt;
    resolveCircles(p, c.radius, this.colliders.query(p.x, p.z, c.radius, this.nearby));
    clampToRadius(p, this.boundaryRadius);
  }

  updateVertical(dt, input) {
    const c = this.cfg;
    if (input.wasPressed('jump') && this.onGround) {
      if (this.crouched) this.crouched = false; // jump from a crouch just stands up
      else {
        this.verticalSpeed = c.jumpSpeed;
        this.onGround = false;
      }
    }
    if (!this.onGround) {
      this.verticalSpeed -= c.gravity * dt;
      this.position.y += this.verticalSpeed * dt;
      if (this.position.y <= 0) {
        this.position.y = 0;
        this.verticalSpeed = 0;
        this.onGround = true;
      }
    }
  }

  updateEyeHeight(dt) {
    const c = this.cfg;
    const target = this.crouched ? c.crouchEyeHeight : c.eyeHeight;
    this.eyeHeight += (target - this.eyeHeight) * Math.min(1, c.crouchTransitionSpeed * dt);
  }

  // Bob scales with ground speed relative to walking pace.
  updateHeadBob(dt) {
    const b = this.cfg.headBob;
    const speed = this.onGround ? Math.hypot(this.velocity.x, this.velocity.z) : 0;
    if (speed > 0) {
      this.bobPhase = (this.bobPhase + speed * dt * b.frequency * TWO_PI) % TWO_PI;
      this.bobOffset = Math.sin(this.bobPhase) * b.amplitude * (speed / this.cfg.walkSpeed);
    } else {
      this.bobOffset -= this.bobOffset * Math.min(1, b.returnSpeed * dt);
    }
  }

  applyCamera() {
    const p = this.position;
    this.camera.position.set(p.x, p.y + this.eyeHeight + this.bobOffset, p.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0);
    this.camera.updateMatrixWorld();
  }

  setFar(far) {
    this.camera.far = far;
    this.camera.updateProjectionMatrix();
  }

  get speed() {
    return Math.hypot(this.velocity.x, this.velocity.z);
  }

  get stance() {
    if (!this.onGround) return 'air';
    if (this.sprinting) return 'sprint';
    return this.crouched ? 'crouch' : 'stand';
  }
}

function clampDelta(delta, max) {
  return Math.max(-max, Math.min(max, delta));
}
