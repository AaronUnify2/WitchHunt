// Combat effects in the world: blood spurts on hits, dust puffs where
// missed shots land, and the muzzle flash light. M5: sparks off the
// electric fence and the turret's tracer streaks (one instanced mesh of
// glowing rods, one draw call). Particles are one pooled
// Points object (one draw call, no allocation while playing). The muzzle
// light is always in the scene and only its intensity changes, so
// toggling it never recompiles shaders; it never casts shadows.

import * as THREE from 'three';

export class CombatFx {
  constructor(feedbackConfig, rng) {
    this.cfg = feedbackConfig;
    this.rng = rng;
  }

  // ground: anything with heightAt(x, z); particles die when they reach it.
  init(scene, ground) {
    this.ground = ground ?? { heightAt: () => 0 };
    const b = this.cfg.blood;
    const n = b.poolSize;
    this.positions = new Float32Array(n * 3);
    this.colors = new Float32Array(n * 3);
    this.velocity = new Float32Array(n * 3);
    this.life = new Float32Array(n); // seconds left; 0 = free
    this.baseColor = new Float32Array(n * 3);
    this.next = 0;
    for (let i = 0; i < n; i++) this.positions[i * 3 + 1] = -1000; // parked out of sight

    const geometry = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage);
    this.colAttr = new THREE.BufferAttribute(this.colors, 3).setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', this.posAttr);
    geometry.setAttribute('color', this.colAttr);
    this.points = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({ size: b.size, vertexColors: true, sizeAttenuation: true, fog: true }),
    );
    this.points.frustumCulled = false;
    scene.add(this.points);

    this.bloodColor = new THREE.Color(b.color);
    this.dustColor = new THREE.Color(b.dustColor);

    const m = this.cfg.muzzleFlash;
    this.light = new THREE.PointLight(m.color, 0, m.distance, 2);
    this.light.castShadow = false;
    scene.add(this.light);
    this.flashTimer = 0;
    this.active = 0;
    this.sparkColor = new THREE.Color(b.sparkColor ?? 0x9ad8ff);
    this.initTracers(scene);
  }

  initTracers(scene) {
    const t = this.cfg.tracers ?? { poolSize: 12, seconds: 0.09, width: 0.05, color: 0xffd27a };
    this.tracerCfg = t;
    const geometry = new THREE.BoxGeometry(1, 1, 1).translate(0, 0, 0.5); // a rod from the origin along +z
    const material = new THREE.MeshBasicMaterial({ color: t.color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    this.tracerMesh = new THREE.InstancedMesh(geometry, material, t.poolSize);
    this.tracerMesh.frustumCulled = false;
    this.tracerLife = new Float32Array(t.poolSize);
    this.tracerFrom = Array.from({ length: t.poolSize }, () => new THREE.Vector3());
    this.tracerTo = Array.from({ length: t.poolSize }, () => new THREE.Vector3());
    this.tracerNext = 0;
    this.tracerMatrix = new THREE.Matrix4();
    this.tracerQuat = new THREE.Quaternion();
    this.tracerScale = new THREE.Vector3();
    this.tracerDir = new THREE.Vector3();
    this.tracerZ = new THREE.Vector3(0, 0, 1);
    this.tracerZero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < t.poolSize; i++) this.tracerMesh.setMatrixAt(i, this.tracerZero);
    this.tracerActive = 0;
    scene.add(this.tracerMesh);
  }

  // A glowing streak from `from` to `to` (Vector3-likes), fading fast.
  tracer(from, to) {
    const t = this.tracerCfg;
    const i = this.tracerNext;
    this.tracerNext = (i + 1) % t.poolSize;
    this.tracerFrom[i].copy(from);
    this.tracerTo[i].copy(to);
    this.tracerLife[i] = t.seconds;
    this.tracerActive = t.poolSize;
  }

  updateTracers(dt) {
    if (this.tracerActive === 0) return;
    const t = this.tracerCfg;
    let alive = 0;
    for (let i = 0; i < t.poolSize; i++) {
      if (this.tracerLife[i] <= 0) continue;
      this.tracerLife[i] -= dt;
      if (this.tracerLife[i] <= 0) {
        this.tracerMesh.setMatrixAt(i, this.tracerZero);
        continue;
      }
      alive++;
      const k = this.tracerLife[i] / t.seconds; // 1 -> 0: thins out and the tail catches up
      const from = this.tracerFrom[i];
      const dir = this.tracerDir.subVectors(this.tracerTo[i], from);
      const len = dir.length();
      dir.divideScalar(len || 1);
      this.tracerQuat.setFromUnitVectors(this.tracerZ, dir);
      this.tracerScale.set(t.width * k, t.width * k, len * k);
      const start = dir.multiplyScalar(len * (1 - k)).add(from);
      this.tracerMesh.setMatrixAt(i, this.tracerMatrix.compose(start, this.tracerQuat, this.tracerScale));
    }
    this.tracerMesh.instanceMatrix.needsUpdate = true;
    this.tracerActive = alive;
  }

  // Blue-white sparks where the electric fence bites.
  sparks(x, y, z) {
    const b = this.cfg.blood;
    this.emit(x, y, z, b.sparksPerZap ?? 10, this.sparkColor, b.speed * 1.3);
  }

  emit(x, y, z, count, color, speed) {
    const b = this.cfg.blood;
    for (let k = 0; k < count; k++) {
      const i = this.next;
      this.next = (this.next + 1) % b.poolSize;
      const theta = this.rng.range(0, Math.PI * 2);
      const up = this.rng.range(0.2, 1);
      const s = speed * this.rng.range(0.4, 1);
      this.positions[i * 3] = x;
      this.positions[i * 3 + 1] = y;
      this.positions[i * 3 + 2] = z;
      this.velocity[i * 3] = Math.cos(theta) * s;
      this.velocity[i * 3 + 1] = up * s;
      this.velocity[i * 3 + 2] = Math.sin(theta) * s;
      this.life[i] = b.seconds * this.rng.range(0.6, 1);
      const shadeK = this.rng.range(0.7, 1.2);
      this.baseColor[i * 3] = color.r * shadeK;
      this.baseColor[i * 3 + 1] = color.g * shadeK;
      this.baseColor[i * 3 + 2] = color.b * shadeK;
    }
    this.active = b.poolSize;
  }

  blood(x, y, z, headshot) {
    const b = this.cfg.blood;
    this.emit(x, y, z, headshot ? b.perHeadshot : b.perHit, this.bloodColor, b.speed);
  }

  dust(x, y, z) {
    const b = this.cfg.blood;
    this.emit(x, y + 0.05, z, b.dustPerImpact, this.dustColor, b.speed * 0.5);
  }

  // Flash the light at a world position.
  muzzleFlash(position) {
    this.light.position.copy(position);
    this.flashTimer = this.cfg.muzzleFlash.seconds;
  }

  update(dt) {
    const m = this.cfg.muzzleFlash;
    this.flashTimer = Math.max(0, this.flashTimer - dt);
    this.light.intensity = this.flashTimer > 0 ? m.intensity * (this.flashTimer / m.seconds) : 0;
    this.updateTracers(dt);
    if (this.active === 0) return;

    const b = this.cfg.blood;
    let alive = 0;
    for (let i = 0; i < b.poolSize; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      const j = i * 3;
      if (this.life[i] <= 0 || this.positions[j + 1] < this.ground.heightAt(this.positions[j], this.positions[j + 2])) {
        this.life[i] = 0;
        this.positions[j + 1] = -1000;
        continue;
      }
      alive++;
      this.velocity[j + 1] -= b.gravity * dt;
      this.positions[j] += this.velocity[j] * dt;
      this.positions[j + 1] += this.velocity[j + 1] * dt;
      this.positions[j + 2] += this.velocity[j + 2] * dt;
      const fade = Math.min(1, this.life[i] / (b.seconds * 0.5)); // darken as it falls
      this.colors[j] = this.baseColor[j] * fade;
      this.colors[j + 1] = this.baseColor[j + 1] * fade;
      this.colors[j + 2] = this.baseColor[j + 2] * fade;
    }
    this.posAttr.needsUpdate = true;
    this.colAttr.needsUpdate = true;
    this.active = alive;
  }

  clear() {
    this.life.fill(0);
    for (let i = 0; i < this.cfg.blood.poolSize; i++) this.positions[i * 3 + 1] = -1000;
    this.posAttr.needsUpdate = true;
    this.active = 0;
    this.tracerLife.fill(0);
    for (let i = 0; i < this.tracerCfg.poolSize; i++) this.tracerMesh.setMatrixAt(i, this.tracerZero);
    this.tracerMesh.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.points.geometry.dispose();
    this.points.material.dispose();
    this.points.removeFromParent();
    this.light.removeFromParent();
    this.tracerMesh.geometry.dispose();
    this.tracerMesh.material.dispose();
    this.tracerMesh.removeFromParent();
  }
}
