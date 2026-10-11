// Combat effects in the world: blood spurts on hits, dust puffs where
// missed shots land, and the muzzle flash light. Particles are one pooled
// Points object (one draw call, no allocation while playing). The muzzle
// light is always in the scene and only its intensity changes, so
// toggling it never recompiles shaders; it never casts shadows.

import * as THREE from 'three';

export class CombatFx {
  constructor(feedbackConfig, rng) {
    this.cfg = feedbackConfig;
    this.rng = rng;
  }

  init(scene) {
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
    if (this.active === 0) return;

    const b = this.cfg.blood;
    let alive = 0;
    for (let i = 0; i < b.poolSize; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      const j = i * 3;
      if (this.life[i] <= 0 || this.positions[j + 1] < 0) {
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
  }

  dispose() {
    this.points.geometry.dispose();
    this.points.material.dispose();
    this.points.removeFromParent();
    this.light.removeFromParent();
  }
}
