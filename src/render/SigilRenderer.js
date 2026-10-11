// Buried sigils (DESIGN.md "Sigils show as a faint glow and disturbed
// earth, easier to spot at night"): a patch of turned earth that follows
// the slope, with a glowing glyph in it (an emissive map, so it needs no
// light), and a soft halo above it. Faint by day, plain at night. Each
// sigil is two draw calls, only while within the draw distance; at most
// five exist. Placeholder look, drawn on canvases at load.

import * as THREE from 'three';

const RINGS = 6;
const SEGMENTS = 28;

export class SigilRenderer {
  constructor(lookConfig, rng) {
    this.cfg = lookConfig;
    this.rng = rng;
  }

  init(scene) {
    const c = this.cfg;
    this.scene = scene;
    this.earthTexture = makeEarthTexture(c, this.rng);
    this.glyphTexture = makeGlyphTexture(c, this.rng);
    this.haloTexture = makeHaloTexture(c.textureSize / 2);
    this.material = new THREE.MeshLambertMaterial({
      map: this.earthTexture,
      emissiveMap: this.glyphTexture,
      emissive: new THREE.Color(c.glowColor),
      emissiveIntensity: c.emissiveNight,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    this.haloMaterial = new THREE.SpriteMaterial({
      map: this.haloTexture,
      color: c.glowColor,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: c.haloNight,
    });
    this.items = new Map(); // sigil -> { mesh, halo }
    this.time = 0;
  }

  // ground: heightAt(x, z), so the patch lies on the slope.
  add(sigil, ground) {
    const c = this.cfg;
    const geometry = makePatchGeometry(sigil, ground, c.earthRadius, c.lift);
    const mesh = new THREE.Mesh(geometry, this.material);
    mesh.position.set(sigil.x, sigil.y, sigil.z);
    mesh.rotation.y = this.rng.range(0, Math.PI * 2);
    mesh.receiveShadow = true;
    mesh.renderOrder = 1;
    // Each halo has its own material so it can fade as you walk up to it
    // (standing in it would wash the whole view green).
    const halo = new THREE.Sprite(this.haloMaterial.clone());
    halo.position.set(sigil.x, sigil.y + c.haloSize * 0.3, sigil.z);
    halo.scale.setScalar(c.haloSize);
    this.scene.add(mesh, halo);
    this.items.set(sigil, { mesh, halo });
  }

  remove(sigil) {
    const item = this.items.get(sigil);
    if (!item) return;
    item.mesh.geometry.dispose();
    item.mesh.removeFromParent();
    item.halo.material.dispose();
    item.halo.removeFromParent();
    this.items.delete(sigil);
  }

  // daylight: 0 at night, 1 by day.
  update(dt, daylight, cameraPosition, drawDistance) {
    const c = this.cfg;
    this.time += dt;
    const pulse = 1 + Math.sin(this.time * c.pulseSpeed * Math.PI * 2 * 0.25) * c.pulseAmount;
    this.material.emissiveIntensity = (c.emissiveNight + (c.emissiveDay - c.emissiveNight) * daylight) * pulse;
    const halo = (c.haloNight + (c.haloDay - c.haloNight) * daylight) * pulse;
    for (const [sigil, item] of this.items) {
      const d = Math.hypot(sigil.x - cameraPosition.x, sigil.z - cameraPosition.z);
      const near = d <= drawDistance;
      item.mesh.visible = near;
      item.halo.visible = near;
      const fade = Math.min(1, Math.max(0, (d - c.haloFadeNear) / (c.haloFadeFar - c.haloFadeNear)));
      item.halo.material.opacity = halo * fade * fade;
    }
  }

  dispose() {
    for (const sigil of [...this.items.keys()]) this.remove(sigil);
    this.material.dispose();
    this.haloMaterial.dispose();
    this.earthTexture.dispose();
    this.glyphTexture.dispose();
    this.haloTexture.dispose();
  }
}

// A disc of rings, each vertex lifted onto the ground. Local to the sigil's
// centre (and its height); UVs map the disc onto the square texture.
function makePatchGeometry(sigil, ground, radius, lift) {
  const positions = [0, lift, 0];
  const uvs = [0.5, 0.5];
  for (let r = 1; r <= RINGS; r++) {
    const rr = (r / RINGS) * radius;
    for (let s = 0; s < SEGMENTS; s++) {
      const a = (s / SEGMENTS) * Math.PI * 2;
      const x = Math.sin(a) * rr;
      const z = Math.cos(a) * rr;
      positions.push(x, ground.heightAt(sigil.x + x, sigil.z + z) - sigil.y + lift, z);
      uvs.push(0.5 + (x / radius) * 0.5, 0.5 - (z / radius) * 0.5);
    }
  }
  const index = [];
  for (let s = 0; s < SEGMENTS; s++) index.push(0, 1 + s, 1 + ((s + 1) % SEGMENTS));
  for (let r = 1; r < RINGS; r++) {
    const a0 = 1 + (r - 1) * SEGMENTS;
    const b0 = 1 + r * SEGMENTS;
    for (let s = 0; s < SEGMENTS; s++) {
      const s1 = (s + 1) % SEGMENTS;
      index.push(a0 + s, b0 + s, b0 + s1, a0 + s, b0 + s1, a0 + s1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(index); // anticlockwise seen from above: faces up
  geometry.computeVertexNormals();
  return geometry;
}

function canvas2d(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return { canvas, ctx: canvas.getContext('2d') };
}

function css(hex, alpha = 1) {
  return `rgba(${(hex >> 16) & 255},${(hex >> 8) & 255},${hex & 255},${alpha})`;
}

// Dark turned earth in clods, fading out at the edge.
function makeEarthTexture(c, rng) {
  const size = c.textureSize;
  const { canvas, ctx } = canvas2d(size);
  const half = size / 2;
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0, css(c.earthColor, 1));
  grad.addColorStop(0.7, css(c.earthColor, 0.95));
  grad.addColorStop(1, css(c.earthColor, 0));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < 220; i++) {
    const a = rng.range(0, Math.PI * 2);
    const d = Math.sqrt(rng.next()) * half * 0.9;
    const shade = rng.chance(0.5) ? 'rgba(0,0,0,0.35)' : 'rgba(120,96,70,0.18)';
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.ellipse(half + Math.sin(a) * d, half + Math.cos(a) * d, rng.range(2, 9), rng.range(2, 6), rng.range(0, Math.PI), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  return finish(canvas, true);
}

// The glyph as an emissive map: white lines on black (black doesn't glow).
function makeGlyphTexture(c, rng) {
  const size = c.textureSize;
  const { canvas, ctx } = canvas2d(size);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);
  const half = size / 2;
  const R = half * (c.glyphRadius / c.earthRadius);
  ctx.strokeStyle = '#fff';
  ctx.lineCap = 'round';
  ctx.lineWidth = size * 0.018;
  ctx.beginPath();
  ctx.arc(half, half, R * 0.95, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = size * 0.012;
  ctx.beginPath();
  ctx.arc(half, half, R * 0.62, 0, Math.PI * 2);
  ctx.stroke();
  // A seven-pointed star joining the inner ring.
  const points = 7;
  ctx.beginPath();
  for (let i = 0; i <= points; i++) {
    const a = ((i * 3) % points) * ((Math.PI * 2) / points);
    const x = half + Math.sin(a) * R * 0.62;
    const y = half - Math.cos(a) * R * 0.62;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  // Runes round the band between the rings.
  ctx.lineWidth = size * 0.009;
  const runes = 14;
  for (let i = 0; i < runes; i++) {
    const a = (i / runes) * Math.PI * 2;
    const cx = half + Math.sin(a) * R * 0.79;
    const cy = half - Math.cos(a) * R * 0.79;
    const s = R * 0.07;
    ctx.beginPath();
    for (let k = 0; k < 3; k++) {
      ctx.moveTo(cx + rng.range(-s, s), cy + rng.range(-s, s));
      ctx.lineTo(cx + rng.range(-s, s), cy + rng.range(-s, s));
    }
    ctx.stroke();
  }
  // A soft glow round the lines.
  ctx.globalCompositeOperation = 'lighter';
  ctx.filter = `blur(${Math.round(size * 0.012)}px)`;
  ctx.globalAlpha = 0.6;
  ctx.drawImage(canvas, 0, 0);
  return finish(canvas, true);
}

function makeHaloTexture(size) {
  const { canvas, ctx } = canvas2d(size);
  const half = size / 2;
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0, 'rgba(255,255,255,0.8)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.25)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return finish(canvas, false);
}

function finish(canvas, srgb) {
  const texture = new THREE.CanvasTexture(canvas);
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
