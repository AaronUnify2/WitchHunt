// The ground's textures, drawn in code at load (Session 10, style pass 1;
// Aaron: art stays in code). Three tiling textures the ground shader
// blends across the map (world/Terrain.js):
//  - leaf litter: the Appalachian forest floor under the trees: fallen
//    leaves in dull autumn browns, ochres and reds, pine needles, twigs;
//  - moss: dark moss and tufts of grass, with a little dead straw;
//  - path: packed dirt with grit and pebbles, for pathways and clearings.
// Kept dark: the torch lights the ground head-on and light colours glare.
// All seeded, so a seed always draws the same ground. cfg: config.terrain.floor.

import { css, makeCanvas, toTexture } from './proceduralTextures.js';

// Draw at the wrapped copies too, so the texture tiles without seams.
function wrapped(size, x, y, r, draw) {
  for (const ox of [-size, 0, size]) {
    for (const oy of [-size, 0, size]) {
      const px = x + ox;
      const py = y + oy;
      if (px + r >= 0 && px - r <= size && py + r >= 0 && py - r <= size) draw(px, py);
    }
  }
}

// Large, soft light and dark patches, so the base isn't flat.
function mottle(ctx, s, rng, colors, count, rMin, rMax, alpha) {
  for (let i = 0; i < count; i++) {
    const x = rng.range(0, s);
    const y = rng.range(0, s);
    const r = rng.range(rMin, rMax);
    const color = rng.pick(colors);
    wrapped(s, x, y, r, (px, py) => {
      const g = ctx.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, css(color, alpha));
      g.addColorStop(1, css(color, 0));
      ctx.fillStyle = g;
      ctx.fillRect(px - r, py - r, r * 2, r * 2);
    });
  }
}

function specks(ctx, s, rng, colors, count, size, alphaMin, alphaMax) {
  for (let i = 0; i < count; i++) {
    const x = rng.range(0, s);
    const y = rng.range(0, s);
    ctx.fillStyle = css(rng.pick(colors), rng.range(alphaMin, alphaMax));
    wrapped(s, x, y, size, (px, py) => ctx.fillRect(px, py, size, size));
  }
}

// A leaf: a pointed oval with a darker midrib, lit a touch on one side.
function leaf(ctx, s, x, y, length, angle, color, alpha, rng) {
  const w = length * rng.range(0.35, 0.55);
  wrapped(s, x, y, length, (px, py) => {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle);
    ctx.fillStyle = css(color, alpha);
    ctx.beginPath();
    ctx.moveTo(-length / 2, 0);
    ctx.quadraticCurveTo(0, -w, length / 2, 0);
    ctx.quadraticCurveTo(0, w, -length / 2, 0);
    ctx.fill();
    ctx.strokeStyle = css(0x000000, alpha * 0.35);
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(-length / 2, 0);
    ctx.lineTo(length / 2, 0);
    ctx.stroke();
    ctx.restore();
  });
}

// A thin straight stroke (needles, grass blades, twigs).
function stroke(ctx, s, x, y, length, angle, width, color, alpha) {
  const dx = (Math.cos(angle) * length) / 2;
  const dy = (Math.sin(angle) * length) / 2;
  ctx.strokeStyle = css(color, alpha);
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  wrapped(s, x, y, length, (px, py) => {
    ctx.beginPath();
    ctx.moveTo(px - dx, py - dy);
    ctx.lineTo(px + dx, py + dy);
    ctx.stroke();
  });
}

// A small stone: a shaded oval with a highlight and a shadow edge.
function pebble(ctx, s, x, y, r, color, rng) {
  const squash = rng.range(0.6, 1);
  const angle = rng.range(0, Math.PI);
  wrapped(s, x, y, r * 1.4, (px, py) => {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle);
    ctx.fillStyle = css(0x000000, 0.35);
    ctx.beginPath();
    ctx.ellipse(r * 0.25, r * 0.25, r, r * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);
    g.addColorStop(0, css(color, 1));
    g.addColorStop(1, css(color, 0.75));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

export function makeLitterTexture(cfg, rng) {
  const c = cfg.litter;
  const s = cfg.textureSize;
  const { canvas, ctx } = makeCanvas(s, s);
  ctx.fillStyle = css(c.base);
  ctx.fillRect(0, 0, s, s);
  mottle(ctx, s, rng, c.mottle, 40, s * 0.05, s * 0.16, 0.5);
  specks(ctx, s, rng, c.mottle, 2500, 2, 0.3, 0.7);
  // Old, dark leaves underneath, then needles, then fresher leaves on top.
  for (let i = 0; i < c.leafCount * 0.5; i++) leaf(ctx, s, rng.range(0, s), rng.range(0, s), rng.range(c.leafSize[0], c.leafSize[1]), rng.range(0, Math.PI * 2), c.base, 0.9, rng);
  for (let i = 0; i < c.needleCount; i++) stroke(ctx, s, rng.range(0, s), rng.range(0, s), rng.range(5, 12), rng.range(0, Math.PI), 0.8, rng.pick(c.needles), rng.range(0.5, 0.9));
  for (let i = 0; i < c.leafCount; i++) leaf(ctx, s, rng.range(0, s), rng.range(0, s), rng.range(c.leafSize[0], c.leafSize[1]), rng.range(0, Math.PI * 2), rng.pick(c.leaves), rng.range(0.6, 0.95), rng);
  for (let i = 0; i < c.twigCount; i++) {
    const x = rng.range(0, s);
    const y = rng.range(0, s);
    const a = rng.range(0, Math.PI);
    const len = rng.range(14, 34);
    stroke(ctx, s, x, y, len, a, rng.range(1.2, 2.2), c.twig, 0.9);
    stroke(ctx, s, x + Math.cos(a) * len * 0.2, y + Math.sin(a) * len * 0.2, len * 0.4, a + rng.range(0.5, 0.9), 1, c.twig, 0.8);
  }
  const texture = toTexture(canvas, { repeat: true });
  texture.anisotropy = cfg.anisotropy;
  return texture;
}

export function makeMossTexture(cfg, rng) {
  const c = cfg.moss;
  const s = cfg.textureSize;
  const { canvas, ctx } = makeCanvas(s, s);
  ctx.fillStyle = css(c.base);
  ctx.fillRect(0, 0, s, s);
  mottle(ctx, s, rng, c.mottle, 50, s * 0.04, s * 0.14, 0.55);
  specks(ctx, s, rng, c.mottle, 5000, 2, 0.4, 0.9); // the fine fuzz of moss
  for (let i = 0; i < c.bladeCount; i++) {
    const x = rng.range(0, s);
    const y = rng.range(0, s);
    const color = rng.chance(c.strawShare) ? c.straw : rng.pick(c.blades);
    // Tufts: a few blades fanned from one spot.
    const blades = rng.int(2, 5);
    const base = rng.range(-0.4, 0.4) - Math.PI / 2;
    for (let b = 0; b < blades; b++) stroke(ctx, s, x + rng.range(-2, 2), y + rng.range(-2, 2), rng.range(4, 10), base + rng.range(-0.6, 0.6), 0.9, color, rng.range(0.5, 0.9));
  }
  for (let i = 0; i < c.leafCount; i++) leaf(ctx, s, rng.range(0, s), rng.range(0, s), rng.range(cfg.litter.leafSize[0], cfg.litter.leafSize[1]), rng.range(0, Math.PI * 2), rng.pick(cfg.litter.leaves), rng.range(0.5, 0.8), rng);
  const texture = toTexture(canvas, { repeat: true });
  texture.anisotropy = cfg.anisotropy;
  return texture;
}

export function makePathTexture(cfg, rng) {
  const c = cfg.path;
  const s = cfg.textureSize;
  const { canvas, ctx } = makeCanvas(s, s);
  ctx.fillStyle = css(c.base);
  ctx.fillRect(0, 0, s, s);
  mottle(ctx, s, rng, c.mottle, 45, s * 0.04, s * 0.15, 0.5);
  specks(ctx, s, rng, c.grit, 9000, 1.5, 0.3, 0.8);
  for (let i = 0; i < c.pebbleCount; i++) pebble(ctx, s, rng.range(0, s), rng.range(0, s), rng.range(c.pebbleSize[0], c.pebbleSize[1]), rng.pick(c.pebbles), rng);
  for (let i = 0; i < c.leafCount; i++) leaf(ctx, s, rng.range(0, s), rng.range(0, s), rng.range(cfg.litter.leafSize[0], cfg.litter.leafSize[1]), rng.range(0, Math.PI * 2), rng.pick(cfg.litter.leaves), rng.range(0.5, 0.85), rng);
  for (let i = 0; i < c.needleCount; i++) stroke(ctx, s, rng.range(0, s), rng.range(0, s), rng.range(5, 10), rng.range(0, Math.PI), 0.8, rng.pick(cfg.litter.needles), rng.range(0.4, 0.8));
  const texture = toTexture(canvas, { repeat: true });
  texture.anisotropy = cfg.anisotropy;
  return texture;
}
