// Smoke and fire on damaged cars (Session 14, Aaron: cars blow up). A pool
// of sprites shared by every car: dark smoke curling up from a badly hurt
// one; flames licking out of the engine of one on fire, and over a
// burning wreck. Two draw calls (flames additive, smoke blended). No
// lights. cfg: config.vehicles.damage.fx.

import * as THREE from 'three';
import { makeCanvas, toTexture } from './proceduralTextures.js';

function puffTexture() {
  const { canvas, ctx } = makeCanvas(64, 64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return toTexture(canvas, { srgb: false });
}

export class VehicleFire {
  constructor(cfg, rng) {
    this.cfg = cfg;
    this.rng = rng;
  }

  init(scene) {
    const c = this.cfg;
    this.texture = puffTexture();
    this.group = new THREE.Group();
    const make = (color, additive, opacity) => {
      const material = new THREE.SpriteMaterial({ map: this.texture, color, opacity, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
      const list = [];
      for (let i = 0; i < c.pool; i++) {
        const s = new THREE.Sprite(material);
        s.visible = false;
        this.group.add(s);
        list.push({ sprite: s, age: 0, life: 0, vx: 0, vy: 0, vz: 0, size: 1 });
      }
      return { material, list, next: 0 };
    };
    this.flames = make(c.flame, true, 0.9);
    this.smoke = make(c.smoke, false, 0.55);
    scene.add(this.group);
  }

  emit(pool, x, y, z, life, size, rise, spread) {
    const p = pool.list[pool.next];
    pool.next = (pool.next + 1) % pool.list.length;
    const r = this.rng;
    p.age = 0;
    p.life = life * r.range(0.7, 1.3);
    p.size = size * r.range(0.7, 1.3);
    p.vx = r.range(-spread, spread);
    p.vz = r.range(-spread, spread);
    p.vy = rise * r.range(0.7, 1.3);
    p.sprite.position.set(x + r.range(-0.3, 0.3), y, z + r.range(-0.3, 0.3));
    p.sprite.visible = true;
  }

  // burning: [{ x, y, z (where it comes out), smoke 0..1, fire 0..1 }].
  update(dt, burning) {
    const c = this.cfg;
    for (const b of burning) {
      if (b.smoke > 0 && this.rng.chance(c.smokePerSecond * b.smoke * dt)) this.emit(this.smoke, b.x, b.y, b.z, 3.2, 1.4, 1.2, 0.25);
      const flames = c.flamesPerSecond * b.fire * dt;
      for (let n = Math.floor(flames) + (this.rng.chance(flames % 1) ? 1 : 0); n > 0; n--) this.emit(this.flames, b.x, b.y, b.z, 0.7, 0.9, 1.8, 0.35);
    }
    for (const pool of [this.flames, this.smoke]) {
      const flame = pool === this.flames;
      for (const p of pool.list) {
        if (!p.sprite.visible) continue;
        p.age += dt;
        if (p.age >= p.life) {
          p.sprite.visible = false;
          continue;
        }
        const k = p.age / p.life;
        const s = p.sprite;
        s.position.x += p.vx * dt;
        s.position.y += p.vy * dt;
        s.position.z += p.vz * dt;
        // Flames shrink as they rise; smoke swells and thins.
        s.scale.setScalar(flame ? p.size * (1 - k * 0.7) : p.size * (1 + k * 2));
      }
    }
  }

  dispose() {
    this.texture.dispose();
    this.flames.material.dispose();
    this.smoke.material.dispose();
    this.group.removeFromParent();
  }
}
