// Procedural placeholder textures drawn on canvases at load: tree sprites,
// the moon and the flashlight cookie (the map's bushes, cliff and
// signposts are in mapTextures.js; the ground's in groundTextures.js). All seeded, so a seed always
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

// ---- trees ---------------------------------------------------------------

// Tree sprite `v` of `n` into a w x h area at the context's origin:
// conifers, with the last variant a dead tree.
export function drawTreeVariant(ctx, v, n, w, h, cfg, rng) {
  if (v === n - 1 && n > 1) drawDeadTree(ctx, w, h, cfg, rng);
  else drawConifer(ctx, w, h, cfg, rng);
}

function drawConifer(ctx, w, h, cfg, rng) {
  const cx = w / 2;
  // Trunk, visible below the lowest branches, with bark streaks.
  const trunkX = cx - w * 0.03;
  const trunkWidth = w * 0.06;
  ctx.fillStyle = css(cfg.trunkColor);
  ctx.fillRect(trunkX, h * 0.5, trunkWidth, h * 0.5);
  drawBark(ctx, trunkX, h * 0.5, trunkWidth, h * 0.5, cfg, rng);

  const tiers = rng.int(cfg.tiersMin, cfg.tiersMax);
  const canopyTop = h * 0.02;
  const canopyBottom = h * 0.86;
  const step = (canopyBottom - canopyTop) / tiers;
  for (let i = 0; i < tiers; i++) {
    const bottom = canopyBottom - i * step;
    const top = bottom - step * 1.9; // tiers overlap
    const halfWidth = (w * 0.47) * Math.pow(1 - i / tiers, 0.85) + w * 0.04;
    drawTier(ctx, cx, Math.max(top, 0), bottom, halfWidth, rng.pick(cfg.needleVariants), cfg, rng);
  }
  drawDapple(ctx, w, h, cfg, rng);
}

// Paint only over what's already drawn (the tree), never the transparent
// background, so the sprite's outline is unchanged.
function paintOnTree(ctx, paint) {
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  paint();
  ctx.restore();
}

// Dark speckles (shadow between needle clumps, denser on the right, away
// from the moon) and speckles of varied greens (different leaves).
function drawDapple(ctx, w, h, cfg, rng) {
  paintOnTree(ctx, () => {
    for (let i = 0; i < cfg.dappleCount; i++) {
      const x = rng.range(0, w);
      const y = rng.range(0, h);
      const size = rng.int(cfg.dappleSizeMin, cfg.dappleSizeMax);
      const shadowChance = cfg.dappleShadowShare * (0.5 + x / w); // 0.5x on the left, 1.5x on the right
      ctx.fillStyle = rng.chance(shadowChance)
        ? css(cfg.dappleShadowColor, cfg.dappleShadowAlpha)
        : css(rng.pick(cfg.dappleLeafColors), cfg.dappleLeafAlpha);
      ctx.fillRect(Math.floor(x), Math.floor(y), size, size);
    }
  });
}

// Vertical dark and light streaks inside a rectangle.
function drawBark(ctx, x, y, width, height, cfg, rng) {
  paintOnTree(ctx, () => {
    for (let i = 0; i < cfg.barkStreaks; i++) {
      ctx.fillStyle = css(rng.chance(0.6) ? cfg.barkDark : cfg.barkLight, cfg.barkStreakAlpha);
      const sx = x + rng.range(0, width);
      const sy = y + rng.range(0, height);
      ctx.fillRect(Math.floor(sx), Math.floor(sy), rng.int(1, 2), rng.range(height * 0.03, height * 0.15));
    }
  });
}

// A jagged triangle of branches, lit from the upper left (moonlight).
function drawTier(ctx, cx, top, bottom, halfWidth, lightColor, cfg, rng) {
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
  gradient.addColorStop(0, css(lightColor));
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
  drawDeadTrunkDetail(ctx, cx - w * 0.05, top, w * 0.1, h - top, cfg, rng);

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
  drawBark(ctx, 0, 0, w, h, cfg, rng);
}

// Close-up detail for the dead tree's trunk, which is seen at face height:
// rounded shading (lit left, dark right), dense bark grain, long cracks
// and a few knots. Painted only over the trunk, so the outline is kept.
function drawDeadTrunkDetail(ctx, x, y, width, height, cfg, rng) {
  paintOnTree(ctx, () => {
    const shade = ctx.createLinearGradient(x, 0, x + width, 0);
    shade.addColorStop(0, css(cfg.barkLight, cfg.deadShadeLight));
    shade.addColorStop(0.35, css(cfg.barkLight, 0));
    shade.addColorStop(0.6, css(cfg.barkDark, 0));
    shade.addColorStop(1, css(cfg.barkDark, cfg.deadShadeDark));
    ctx.fillStyle = shade;
    ctx.fillRect(x, y, width, height);

    for (let i = 0; i < cfg.deadBarkStreaks; i++) {
      ctx.fillStyle = css(rng.chance(0.6) ? cfg.barkDark : cfg.barkLight, cfg.barkStreakAlpha);
      const sx = x + rng.range(0, width);
      const sy = y + rng.range(0, height);
      ctx.fillRect(Math.floor(sx), Math.floor(sy), 1, rng.range(height * 0.01, height * 0.06));
    }

    ctx.strokeStyle = css(cfg.barkDark, cfg.deadCrackAlpha);
    ctx.lineWidth = 1;
    for (let i = 0; i < cfg.deadCracks; i++) {
      let cxk = x + rng.range(width * 0.15, width * 0.85);
      let cyk = y + rng.range(height * 0.2, height * 0.9);
      const length = rng.range(height * 0.08, height * 0.25);
      ctx.beginPath();
      ctx.moveTo(cxk, cyk);
      for (let s = 0; s < 6; s++) {
        cxk += rng.range(-1.5, 1.5);
        cyk -= length / 6;
        ctx.lineTo(cxk, cyk);
      }
      ctx.stroke();
    }

    for (let i = 0; i < cfg.deadKnots; i++) {
      const kx = x + rng.range(width * 0.25, width * 0.75);
      const ky = y + rng.range(height * 0.3, height * 0.95);
      const ry = rng.range(2, 4);
      ctx.fillStyle = css(cfg.barkLight, cfg.deadKnotRimAlpha);
      ctx.beginPath();
      ctx.ellipse(kx, ky, ry * 0.8, ry * 1.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = css(cfg.barkDark, 0.9);
      ctx.beginPath();
      ctx.ellipse(kx, ky, ry * 0.45, ry * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });
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
