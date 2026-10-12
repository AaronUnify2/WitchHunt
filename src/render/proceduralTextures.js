// Procedural placeholder textures drawn on canvases at load: the moon and
// the flashlight cookie, and the canvas helpers the other texture modules
// share (trees: treeSprites.js; bushes, cliff and signposts: mapTextures.js;
// the ground: groundTextures.js). All seeded, so a seed always
// draws the same forest. Final art replaces these in the art pass.

import * as THREE from 'three';

export function css(hex, alpha = 1) {
  const r = (hex >> 16) & 255;
  const g = (hex >> 8) & 255;
  const b = hex & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

export function makeCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext('2d') };
}

export function toTexture(canvas, { repeat = false, srgb = true } = {}) {
  const texture = new THREE.CanvasTexture(canvas);
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

// ---- sky -------------------------------------------------------------------

// Bright disc with a soft halo; the sprite's size includes the halo.
export function makeMoonTexture(size) {
  const { canvas, ctx } = makeCanvas(size, size);
  const half = size / 2;
  const halo = ctx.createRadialGradient(half, half, 0, half, half, half);
  halo.addColorStop(0, 'rgba(255,255,255,1)');
  halo.addColorStop(0.22, 'rgba(255,255,255,1)');
  halo.addColorStop(0.26, 'rgba(255,255,255,0.35)');
  halo.addColorStop(0.5, 'rgba(255,255,255,0.08)');
  halo.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, size, size);
  return toTexture(canvas);
}

// ---- flashlight ------------------------------------------------------------

// The imperfect torch pattern: a hot centre with a dark bulb spot, faint
// rings and blotches. Projected by the SpotLight.
export function makeFlashlightCookie(cfg, rng) {
  const s = cfg.cookieSize;
  const half = s / 2;
  const { canvas, ctx } = makeCanvas(s, s);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, s, s);

  const beam = ctx.createRadialGradient(half, half, 0, half, half, half);
  beam.addColorStop(0, 'rgba(255,255,255,1)');
  beam.addColorStop(0.35, 'rgba(235,235,235,1)');
  beam.addColorStop(0.8, 'rgba(120,120,120,1)');
  beam.addColorStop(1, 'rgba(40,40,40,1)');
  ctx.fillStyle = beam;
  ctx.fillRect(0, 0, s, s);

  ctx.lineWidth = s * 0.02;
  for (let i = 0; i < cfg.cookieRings; i++) {
    ctx.strokeStyle = `rgba(0,0,0,${cfg.cookieRingStrength})`;
    ctx.beginPath();
    ctx.arc(half, half, half * rng.range(0.4, 0.85), 0, Math.PI * 2);
    ctx.stroke();
  }

  for (let i = 0; i < cfg.cookieBlotches; i++) {
    const x = rng.range(0, s);
    const y = rng.range(0, s);
    const r = rng.range(s * 0.05, s * 0.15);
    const blotch = ctx.createRadialGradient(x, y, 0, x, y, r);
    blotch.addColorStop(0, `rgba(0,0,0,${cfg.cookieBlotchStrength})`);
    blotch.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = blotch;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  const hole = ctx.createRadialGradient(half, half, 0, half, half, half * cfg.cookieHoleSize);
  hole.addColorStop(0, `rgba(0,0,0,${cfg.cookieHoleStrength})`);
  hole.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = hole;
  ctx.fillRect(0, 0, s, s);
  return toTexture(canvas);
}
