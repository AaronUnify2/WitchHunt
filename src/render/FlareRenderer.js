// Flares, drawn (M9.1): each a red glow (an additive sprite, seen through
// the mist) on a little stick, with a soft lit patch on the ground round it
// once it's down; in flight, a smaller glow. Pooled (config.flares.poolSize);
// the oldest spent flare is reused. One point light, made at load and never
// removed (adding lights mid-play recompiles every shader: a stutter on the
// tablet), follows the newest flare; the rest only glow.

import * as THREE from 'three';
import { makeCanvas, toTexture } from './proceduralTextures.js';

function radialTexture() {
  const { canvas, ctx } = makeCanvas(64, 64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return toTexture(canvas, { srgb: false });
}

export class FlareRenderer {
  // cfg: config.flares.
  constructor(cfg) {
    this.cfg = cfg;
  }

  init(scene) {
    const c = this.cfg;
    this.group = new THREE.Group();
    this.texture = radialTexture();
    this.glowMaterial = new THREE.SpriteMaterial({ map: this.texture, color: c.color, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true });
    this.patchMaterial = new THREE.MeshBasicMaterial({ map: this.texture, color: c.color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.35, polygonOffset: true, polygonOffsetFactor: -4 });
    this.patchGeometry = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    this.stickGeometry = new THREE.CylinderGeometry(0.025, 0.025, 0.22, 6).translate(0, 0.11, 0);
    this.stickMaterial = new THREE.MeshLambertMaterial({ color: 0x5a1a14, emissive: 0x401008 });
    this.slots = [];
    for (let i = 0; i < c.poolSize; i++) {
      const glow = new THREE.Sprite(this.glowMaterial);
      const patch = new THREE.Mesh(this.patchGeometry, this.patchMaterial);
      patch.scale.setScalar(c.groundGlowRadius * 2);
      const stick = new THREE.Mesh(this.stickGeometry, this.stickMaterial);
      stick.rotation.z = 0.6;
      glow.visible = patch.visible = stick.visible = false;
      this.group.add(glow, patch, stick);
      this.slots.push({ glow, patch, stick });
    }
    this.light = new THREE.PointLight(c.color, 0, c.light.distance, c.light.decay);
    this.group.add(this.light);
    scene.add(this.group);
    this.time = 0;
  }

  // flares: [{ slot, x, y, z, state: 'flying' | 'burning' | 'out', burn (0..1 left) }].
  // newest: the flare that holds the light (or null). groundY(x, z) for the patch.
  update(dt, flares, newest, groundY) {
    const c = this.cfg;
    this.time += dt;
    for (const s of this.slots) s.glow.visible = s.patch.visible = s.stick.visible = false;
    for (const f of flares) {
      if (f.state === 'out') continue;
      const s = this.slots[f.slot];
      // Flicker, and a dying flare's last seconds sputter down.
      const flick = 1 - c.flicker * 0.5 * (1 + Math.sin(this.time * 23 + f.slot * 7) * Math.sin(this.time * 9.3 + f.slot));
      const life = f.state === 'burning' ? Math.min(1, f.burn * 6) : 1;
      s.glow.visible = true;
      s.glow.position.set(f.x, f.y + (f.state === 'burning' ? 0.15 : 0), f.z);
      s.glow.scale.setScalar((f.state === 'flying' ? c.trailSize : c.glowSize) * flick * (0.4 + 0.6 * life));
      if (f.state === 'burning') {
        s.patch.visible = s.stick.visible = true;
        s.patch.position.set(f.x, groundY(f.x, f.z) + 0.05, f.z);
        s.patch.material.opacity = 0.35;
        s.patch.scale.setScalar(c.groundGlowRadius * 2 * (0.6 + 0.4 * life) * flick);
        s.stick.position.set(f.x, f.y, f.z);
      }
      f.flick = flick * life;
    }
    if (newest && newest.state !== 'out') {
      this.light.position.set(newest.x, newest.y + 0.6, newest.z);
      this.light.intensity = c.light.intensity * (newest.flick ?? 1);
    } else {
      this.light.intensity = 0;
    }
  }

  dispose() {
    this.texture.dispose();
    this.glowMaterial.dispose();
    this.patchMaterial.dispose();
    this.patchGeometry.dispose();
    this.stickGeometry.dispose();
    this.stickMaterial.dispose();
    this.group.removeFromParent();
  }
}
