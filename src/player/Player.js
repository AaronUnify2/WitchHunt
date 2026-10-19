// First-person player: look, walk, sprint (stamina), toggle crouch, jump,
// collision against trunks and rocks, and a subtle head bob. Owns the
// main camera. Movement speed carries over from the M0 test camera,
// whose feel was signed off on the tablet. Walks on the map's rolling
// ground, is slowed by undergrowth off the pathways, and stays inside the
// map (the cliff to the north, dense forest at the other edges).
//
// Combat hooks (set by Weapons each frame): moveMultiplier (aim and fire
// slowdown), lookScale (aim assist, controller only), fovMultiplier
// (aim zoom), kick() (recoil) and shake().

import * as THREE from 'three';
import { Stamina } from './Stamina.js';
import { resolveCircles } from '../world/collision.js';

const DEG_TO_RAD = Math.PI / 180;
const TWO_PI = Math.PI * 2;

export class Player {
  // ground: the GroundField (heightAt, undergrowthAt, clamp).
  constructor(playerConfig, renderConfig, feedbackConfig, colliders, ground) {
    this.cfg = playerConfig;
    this.renderCfg = renderConfig;
    this.fbCfg = feedbackConfig;
    this.colliders = colliders;
    this.ground = ground;
    this.spawn = { x: 0, z: 0, yaw: playerConfig.startYaw * DEG_TO_RAD };
  }

  init() {
    const c = this.cfg;
    const r = this.renderCfg;
    this.camera = new THREE.PerspectiveCamera(r.fov, 1, r.near, 1);
    this.camera.rotation.order = 'YXZ'; // yaw, then pitch: no roll creep
    this.position = new THREE.Vector3(); // feet
    this.velocity = { x: 0, z: 0 };
    this.stamina = new Stamina(c.stamina);
    this.nearby = [];
    this.reset();
  }

  // Where reset() puts the player (home, on the real map). yaw in radians.
  setSpawn(x, z, yaw = this.spawn.yaw) {
    this.spawn = { x, z, yaw };
  }

  // Back to the start: position, facing, stance, stamina, combat hooks.
  reset() {
    const c = this.cfg;
    this.teleport(this.spawn.x, this.spawn.z, this.spawn.yaw);
    this.pitch = 0;
    this.undergrowth = 0;
    this.velocity.x = 0;
    this.velocity.z = 0;
    this.verticalSpeed = 0;
    this.onGround = true;
    this.crouched = false;
    this.sprinting = false;
    this.sprintLatched = false; // controller: click L3 once to sprint until you stop
    this.eyeHeight = c.eyeHeight;
    this.bobPhase = 0;
    this.bobOffset = 0;
    this.stamina.init();
    this.moveMultiplier = 1;
    this.lookScale = 1;
    this.fovMultiplier = 1;
    this.scopeLookScale = 1; // Session 10b: set by Weapons while looking through a scope
    this.platform = null; // M5: { x, z, y, half } while standing up on the lookout tower
    this.rooted = false; // M7: caught in the witch's snare: no moving or jumping (looking and shooting still work)
    this.recoilPitch = 0; // camera kick on top of the aim pitch, settles back
    this.shakeAmount = 0;
    this.shakeTime = 0;
    this.applyCamera();
  }

  // Jump straight to (x, z) on the ground, optionally facing yaw (radians).
  teleport(x, z, yaw = this.yaw) {
    this.platform = null;
    this.position.set(x, 0, z);
    this.ground.clamp(this.position);
    this.position.y = this.ground.heightAt(this.position.x, this.position.z);
    this.yaw = yaw;
    this.velocity.x = 0;
    this.velocity.z = 0;
    this.verticalSpeed = 0;
    this.onGround = true;
    if (this.camera) this.applyCamera();
  }

  update(dt, input) {
    this.updateLook(input);
    this.updateFeedback(dt);
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
    const scale = (input.activeDevice === 'gamepad' ? this.lookScale : 1) * this.scopeLookScale; // the mouse is never assisted
    const limit = this.cfg.pitchLimit * DEG_TO_RAD;
    this.yaw -= look.x * scale;
    this.pitch = THREE.MathUtils.clamp(this.pitch + look.y * scale, -limit, limit);
  }

  // Recoil: kick the view up; most of it settles back, recoilKeep stays.
  kick(degrees) {
    const rad = degrees * DEG_TO_RAD;
    const keep = rad * this.fbCfg.recoilKeep;
    const limit = this.cfg.pitchLimit * DEG_TO_RAD;
    this.pitch = Math.min(limit, this.pitch + keep);
    this.recoilPitch += rad - keep;
  }

  shake(amount) {
    this.shakeAmount = Math.max(this.shakeAmount, amount);
  }

  updateFeedback(dt) {
    const f = this.fbCfg;
    this.recoilPitch -= this.recoilPitch * Math.min(1, f.recoilRecover * dt);
    this.shakeAmount -= this.shakeAmount * Math.min(1, f.shakeDecay * dt);
    this.shakeTime += dt;
    const fov = this.renderCfg.fov * this.fovMultiplier;
    if (Math.abs(this.camera.fov - fov) > 1e-3) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
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

    // No sprinting while aiming or just after firing (moveMultiplier < 1).
    const wantSprint = (this.sprintLatched || input.isDown('sprint')) && moving && !this.crouched && this.moveMultiplier >= 1 && !this.rooted;
    this.sprinting = wantSprint && (this.sprinting ? !this.stamina.empty : this.stamina.canStart);
    this.stamina.update(dt, this.sprinting);

    let speed = this.rooted ? 0 : c.walkSpeed * this.moveMultiplier;
    if (this.sprinting) speed *= c.sprintMultiplier;
    else if (this.crouched) speed *= c.crouchMultiplier;
    // Undergrowth off the pathways slows every pace.
    this.undergrowth = this.ground.undergrowthAt(this.position.x, this.position.z);
    speed *= 1 + (c.undergrowthMultiplier - 1) * this.undergrowth;

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
    const pl = this.platform;
    if (pl) {
      // Up on the tower: the railing keeps you on the platform.
      const lim = pl.half - c.radius;
      p.x = Math.max(pl.x - lim, Math.min(pl.x + lim, p.x));
      p.z = Math.max(pl.z - lim, Math.min(pl.z + lim, p.z));
      return;
    }
    resolveCircles(p, c.radius, this.colliders.query(p.x, p.z, c.radius, this.nearby), true);
    this.ground.clamp(p);
  }

  // M5: step onto a raised platform (the lookout tower), or back down to
  // (x, z) on the ground with platform null.
  setPlatform(platform, x, z) {
    this.platform = platform;
    this.position.x = x;
    this.position.z = z;
    this.position.y = platform ? platform.y : this.ground.heightAt(x, z);
    this.verticalSpeed = 0;
    this.onGround = true;
    this.velocity.x = 0;
    this.velocity.z = 0;
    this.applyCamera();
  }

  updateVertical(dt, input) {
    const c = this.cfg;
    if (input.wasPressed('jump') && this.onGround && !this.rooted) {
      if (this.crouched) this.crouched = false; // jump from a crouch just stands up
      else {
        this.verticalSpeed = c.jumpSpeed;
        this.onGround = false;
      }
    }
    const floor = this.platform ? this.platform.y : this.ground.heightAt(this.position.x, this.position.z);
    if (!this.onGround) {
      this.verticalSpeed -= c.gravity * dt;
      this.position.y += this.verticalSpeed * dt;
      if (this.position.y <= floor) {
        this.position.y = floor;
        this.verticalSpeed = 0;
        this.onGround = true;
      }
    } else {
      this.position.y = floor; // walk over the hills
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
    // Shake: two out-of-step sines, small angles (radians).
    const sx = Math.sin(this.shakeTime * 47) * this.shakeAmount * 0.02;
    const sy = Math.sin(this.shakeTime * 61 + 1.3) * this.shakeAmount * 0.02;
    this.camera.position.set(p.x, p.y + this.eyeHeight + this.bobOffset, p.z);
    this.camera.rotation.set(this.pitch + this.recoilPitch + sy, this.yaw + sx, 0);
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
