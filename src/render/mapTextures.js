// Procedural placeholder textures for the map (M3): the forest atlas (tree
// sprites plus undergrowth), the cliff's rock face and the signposts that
// stand in for encounters.
// Seeded, so a seed always draws the same map. Final art replaces these
// in the art pass.

import { css, makeCanvas, toTexture, drawTreeVariant } from './proceduralTextures.js';

// ---- forest atlas --------------------------------------------------------

// Trees in the first columns (textureWidth x textureHeight each), then one
// more column holding the bush sprites stacked top to bottom. Returns
// { texture, rects }: rects[i] = [u0, v0, uWidth, vHeight] for sprite i
// (trees first, then bushes), in texture coordinates (v up).
export function makeForestAtlas(cfg, rng) {
  const u = cfg.undergrowth;
  const { textureWidth: w, textureHeight: h, textureVariants: n } = cfg;
  const rows = Math.floor(h / u.textureHeight);
  const columns = n + Math.ceil(u.variants / rows);
  const W = w * columns;
  const { canvas, ctx } = makeCanvas(W, h);
  const rects = [];
  for (let v = 0; v < n; v++) {
    ctx.save();
    ctx.translate(v * w, 0);
    drawTreeVariant(ctx, v, n, w, h, cfg, rng);
    ctx.restore();
    rects.push([(v * w) / W, 0, w / W, 1]);
  }
  for (let b = 0; b < u.variants; b++) {
    const col = n + Math.floor(b / rows);
    const row = b % rows;
    ctx.save();
    ctx.translate(col * w, row * u.textureHeight);
    ctx.beginPath();
    ctx.rect(0, 0, u.textureWidth, u.textureHeight);
    ctx.clip();
    drawBush(ctx, b, u.textureWidth, u.textureHeight, u, rng);
    ctx.restore();
    rects.push([(col * w) / W, 1 - ((row + 1) * u.textureHeight) / h, u.textureWidth / W, u.textureHeight / h]);
  }
  return { texture: toTexture(canvas), rects };
}

// Four kinds of undergrowth: a round leafy bush, ferns, a bramble with
// berries and a low wide shrub. Lit from the upper left, like the trees.
function drawBush(ctx, kind, w, h, u, rng) {
  if (kind % 4 === 1) {
    drawFern(ctx, w, h, u, rng);
    return;
  }
  const wide = kind % 4 === 3;
  const blobs = u.blobs;
  for (let i = 0; i < blobs; i++) {
    // Dome-shaped spread, densest low down.
    const t = rng.next();
    const x = w / 2 + (rng.next() - 0.5) * w * (wide ? 0.95 : 0.75) * (1 - t * 0.5);
    const y = h - 4 - Math.pow(t, 0.8) * h * (wide ? 0.55 : 0.85);
    const r = rng.range(w * 0.025, w * 0.06);
    const lit = (w - x) / w * 0.6 + (1 - y / h) * 0.6; // upper left is lit
    const color = rng.chance(Math.min(0.85, lit)) ? rng.pick(u.leafColors) : 0x14200f;
    ctx.fillStyle = css(color, 0.95);
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.75, rng.range(0, Math.PI), 0, Math.PI * 2);
    ctx.fill();
  }
  if (kind % 4 === 2) {
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = css(u.berryColor, 0.9);
      ctx.fillRect(Math.floor(rng.range(w * 0.2, w * 0.8)), Math.floor(rng.range(h * 0.3, h - 8)), 3, 3);
    }
  }
}

function drawFern(ctx, w, h, u, rng) {
  const fronds = 9;
  for (let f = 0; f < fronds; f++) {
    const angle = -Math.PI / 2 + (f / (fronds - 1) - 0.5) * 2.4 + rng.range(-0.1, 0.1);
    const len = h * rng.range(0.65, 0.95);
    const baseX = w / 2 + rng.range(-6, 6);
    const baseY = h - 2;
    ctx.strokeStyle = css(u.fernColor, 0.9);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    const tipX = baseX + Math.cos(angle) * len;
    const tipY = baseY + Math.sin(angle) * len * 0.9;
    ctx.quadraticCurveTo(baseX + Math.cos(angle) * len * 0.5, baseY + Math.sin(angle) * len * 0.3 - 10, tipX, tipY);
    ctx.stroke();
    // Leaflets along the frond
    for (let k = 1; k < 12; k++) {
      const t = k / 12;
      const px = baseX + (tipX - baseX) * t;
      const py = baseY + (tipY - baseY) * t - Math.sin(t * Math.PI) * 10;
      const size = (1 - t) * 9 + 2;
      ctx.fillStyle = css(rng.pick(u.leafColors), 0.9);
      ctx.beginPath();
      ctx.ellipse(px, py, size, size * 0.35, angle + Math.PI / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ---- cliff ---------------------------------------------------------------

// Tiling rock face: horizontal strata, vertical cracks and moss patches.
export function makeCliffTexture(t, rng) {
  const s = t.cliffTextureSize;
  const { canvas, ctx } = makeCanvas(s, s);
  ctx.fillStyle = css(t.cliffColor);
  ctx.fillRect(0, 0, s, s);
  // Strata: wavy bands, wrapped vertically by drawing at y and y + s.
  for (let i = 0; i < 14; i++) {
    const y = rng.range(0, s);
    const thick = rng.range(2, 10);
    ctx.fillStyle = css(rng.chance(0.5) ? t.cliffDark : t.cliffLight, rng.range(0.2, 0.45));
    for (const oy of [-s, 0, s]) ctx.fillRect(0, y + oy, s, thick);
  }
  // Blotches
  for (let i = 0; i < 500; i++) {
    ctx.fillStyle = css(rng.pick([t.cliffDark, t.cliffLight, t.cliffColor]), 0.25);
    const x = rng.range(0, s);
    const y = rng.range(0, s);
    const r = rng.range(2, 9);
    for (const ox of [-s, 0, s]) for (const oy of [-s, 0, s]) ctx.fillRect(x + ox - r, y + oy - r * 0.5, r * 2, r);
  }
  // Cracks
  ctx.strokeStyle = css(t.cliffDark, 0.8);
  for (let i = 0; i < 18; i++) {
    let x = rng.range(0, s);
    let y = rng.range(0, s);
    ctx.lineWidth = rng.range(1, 2.5);
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 6; k++) {
      x += rng.range(-6, 6);
      y += rng.range(6, 16);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // Moss on ledges
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = css(t.cliffMoss, rng.range(0.3, 0.6));
    ctx.fillRect(rng.range(0, s), rng.range(0, s), rng.range(6, 24), rng.range(2, 4));
  }
  return toTexture(canvas, { repeat: true });
}

// ---- signposts -----------------------------------------------------------

// A painted wooden board: a title and up to two smaller lines.
export function makeSignTexture(cfg, title, lines) {
  const { canvas, ctx } = makeCanvas(cfg.textureWidth, cfg.textureHeight);
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = css(cfg.boardColor);
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = css(cfg.boardGrain, 0.35);
  for (let y = 6; y < h; y += 11) ctx.fillRect(0, y, w, 2);
  ctx.strokeStyle = css(cfg.textColor, 0.8);
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, w - 8, h - 8);
  ctx.fillStyle = css(cfg.textColor);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${fitFont(ctx, title, w * 0.9, h * 0.3)}px sans-serif`;
  ctx.fillText(title, w / 2, h * 0.36);
  ctx.font = `${Math.round(h * 0.12)}px sans-serif`;
  lines.forEach((line, i) => ctx.fillText(line, w / 2, h * (0.66 + i * 0.16)));
  return toTexture(canvas);
}

// The largest font size (up to max) at which `text` fits `width`.
function fitFont(ctx, text, width, max) {
  let size = Math.round(max);
  ctx.font = `bold ${size}px sans-serif`;
  while (size > 10 && ctx.measureText(text).width > width) {
    size -= 2;
    ctx.font = `bold ${size}px sans-serif`;
  }
  return size;
}
