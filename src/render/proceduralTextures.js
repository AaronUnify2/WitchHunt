// Procedural placeholder textures drawn on canvases at load: tree sprites,
// ground, the clearing's dirt patch, the moon and the flashlight cookie.
// All seeded, so a seed always draws the same forest. Final art replaces
// these in the art pass.

import * as THREE from 'three';

function css(hex, alpha = 1) {
  const r = (hex >> 16) & 255;
  const g = (hex >> 8) & 255;
  const b = hex & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function makeCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext('2d') };
}

function toTexture(canvas, { repeat = false, srgb = true } = {}) {
  const texture = new THREE.CanvasTexture(canvas);
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

// ---- trees ---------------------------------------------------------------

// One row of tree sprites: conifers, with the last variant a dead tree.
export function makeTreeAtlas(cfg, rng) {
  const { textureWidth: w, textureHeight: h, textureVariants: n } = cfg;
  const { canvas, ctx } = makeCanvas(w * n, h);
  for (let v = 0; v < n; v++) {
    ctx.save();
    ctx.translate(v * w, 0);
    if (v === n - 1 && n > 1) drawDeadTree(ctx, w, h, cfg, rng);
    else drawConifer(ctx, w, h, cfg, rng);
    ctx.restore();
  }
  return toTexture(canvas);
}

function drawConifer(ctx, w, h, cfg, rng) {
  const cx = w / 2;
  // Trunk, visible below the lowest branches.
  ctx.fillStyle = css(cfg.trunkColor);
  ctx.fillRect(cx - w * 0.03, h * 0.5, w * 0.06, h * 0.5);

  const tiers = rng.int(cfg.tiersMin, cfg.tiersMax);
  const canopyTop = h * 0.02;
  const canopyBottom = h * 0.86;
  const step = (canopyBottom - canopyTop) / tiers;
  for (let i = 0; i < tiers; i++) {
    const bottom = canopyBottom - i * step;
    const top = bottom - step * 1.9; // tiers overlap
    const halfWidth = (w * 0.47) * Math.pow(1 - i / tiers, 0.85) + w * 0.04;
    drawTier(ctx, cx, Math.max(top, 0), bottom, halfWidth, cfg, rng);
  }
}

// A jagged triangle of branches, lit from the upper left (moonlight).
function drawTier(ctx, cx, top, bottom, halfWidth, cfg, rng) {
  const spikes = cfg.spikesPerTier;
  const droop = (bottom - top) * 0.12;
  const right = [];
  for (let k = 1; k <= spikes; k++) {
    const t = k / spikes;
    const out = k % 2 === 0 ? rng.range(0.85, 1.1) : rng.range(0.55, 0.8);
    right.push([cx + halfWidth * t * out, top + (bottom - top) * t + (k % 2 === 0 ? droop : 0)]);
  }
  ctx.beginPath();
  ctx.moveTo(cx, top);
  for (const [x, y] of right) ctx.lineTo(x, y);
  ctx.lineTo(cx, bottom - droop);
  for (let k = right.length - 1; k >= 0; k--) {
    const [x, y] = right[k];
    ctx.lineTo(cx - (x - cx) * rng.range(0.9, 1.1), y + rng.range(-droop, droop) * 0.5);
  }
  ctx.closePath();
  const gradient = ctx.createLinearGradient(cx - halfWidth, top, cx + halfWidth, bottom);
  gradient.addColorStop(0, css(cfg.needleLight));
  gradient.addColorStop(0.45, css(cfg.needleDark));
  gradient.addColorStop(1, css(cfg.needleDark));
  ctx.fillStyle = gradient;
  ctx.fill();
}

function drawDeadTree(ctx, w, h, cfg, rng) {
  const cx = w / 2;
  const top = h * 0.06;
  ctx.fillStyle = css(cfg.deadColor);
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.05, h);
  ctx.lineTo(cx - w * 0.008, top);
  ctx.lineTo(cx + w * 0.008, top);
  ctx.lineTo(cx + w * 0.05, h);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = css(cfg.deadColor);
  ctx.lineCap = 'round';
  for (let i = 0; i < cfg.deadBranches; i++) {
    const y = rng.range(h * 0.12, h * 0.6);
    const side = i % 2 === 0 ? 1 : -1;
    const length = rng.range(w * 0.2, w * 0.45);
    const endX = cx + side * length;
    const endY = y - rng.range(h * 0.03, h * 0.15);
    ctx.lineWidth = rng.range(2, 6);
    ctx.beginPath();
    ctx.moveTo(cx, y);
    ctx.quadraticCurveTo(cx + side * length * 0.5, y, endX, endY);
    ctx.stroke();
    // A twig off the branch.
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + side * length * 0.6, y - (y - endY) * 0.4);
    ctx.lineTo(cx + side * length * rng.range(0.7, 0.95), endY - rng.range(h * 0.02, h * 0.06));
    ctx.stroke();
  }
}

// ---- ground -----------------------------------------------------------

// Seamless tiling forest floor: grass, moss, dirt and leaf litter.
export function makeGroundTexture(cfg, rng) {
  const s = cfg.textureSize;
  const { canvas, ctx } = makeCanvas(s, s);
  ctx.fillStyle = css(cfg.grassColor);
  ctx.fillRect(0, 0, s, s);
  const colors = [cfg.dirtColor, cfg.mossColor, cfg.litterColor, cfg.grassColor];
  for (let i = 0; i < cfg.blotchCount; i++) {
    const x = rng.range(0, s);
    const y = rng.range(0, s);
    const r = rng.range(cfg.blotchSizeMin, cfg.blotchSizeMax);
    ctx.fillStyle = css(rng.pick(colors), cfg.blotchAlpha);
    drawWrapped(s, x, y, r, (ox, oy) => {
      ctx.beginPath();
      ctx.arc(ox, oy, r, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  for (let i = 0; i < cfg.speckCount; i++) {
    ctx.fillStyle = css(rng.pick(colors), rng.range(0.3, 0.8));
    ctx.fillRect(rng.range(0, s), rng.range(0, s), cfg.speckSize, cfg.speckSize);
  }
  return toTexture(canvas, { repeat: true });
}

// Draw at the wrapped copies too, so the texture tiles without seams.
function drawWrapped(size, x, y, r, draw) {
  for (const ox of [-size, 0, size]) {
    for (const oy of [-size, 0, size]) {
      const px = x + ox;
      const py = y + oy;
      if (px + r >= 0 && px - r <= size && py + r >= 0 && py - r <= size) draw(px, py);
    }
  }
}

// Round dirt patch for the clearing, fading out at the edge.
export function makeClearingTexture(cfg, rng) {
  const s = cfg.clearingTextureSize;
  const { canvas, ctx } = makeCanvas(s, s);
  ctx.fillStyle = css(cfg.dirtColor);
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < cfg.clearingNoiseCount; i++) {
    ctx.fillStyle = css(rng.pick([cfg.litterColor, cfg.mossColor, cfg.dirtColor]), cfg.blotchAlpha);
    ctx.beginPath();
    ctx.arc(rng.range(0, s), rng.range(0, s), rng.range(cfg.blotchSizeMin, cfg.blotchSizeMax), 0, Math.PI * 2);
    ctx.fill();
  }
  // Keep only a soft-edged disc.
  const half = s / 2;
  const mask = ctx.createRadialGradient(half, half, half * (1 - cfg.clearingEdge), half, half, half);
  mask.addColorStop(0, 'rgba(0,0,0,1)');
  mask.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalCompositeOperation = 'destination-in';
  ctx.fillStyle = mask;
  ctx.fillRect(0, 0, s, s);
  return toTexture(canvas);
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
