// Tree sprites, drawn in code at load (Session 10, style pass 1; Aaron:
// art stays in code). The Appalachian woods, as billboards in the forest
// atlas (mapTextures.js), one per kind in config.forest.kinds:
//  - hemlock: broad, soft, drooping layered sprays and a nodding tip;
//  - spruce: a narrow spire of jagged, needle-fringed tiers;
//  - white pine: a tall bare trunk, ragged windswept clumps with gaps;
//  - oak: bare, thick crooked limbs, a few dead leaves hanging on;
//  - snag: a dead trunk with a broken top and stubby branches.
// Lit from the upper left (the moon), darker on the right. Each trunk is
// drawn to the kind's trunk sizes (kind.trunk), the same sizes as the 3D
// trunks near the player, so the two match. All seeded.

import { css } from './proceduralTextures.js';

export function drawTree(ctx, kind, w, h, cfg, rng) {
  const draw = { hemlock: drawHemlock, spruce: drawSpruce, whitePine: drawWhitePine, oak: drawOak, snag: drawSnag }[kind.look];
  draw(ctx, kind, w, h, cfg, rng);
}

// ---- shared ----------------------------------------------------------------

// Paint only over what's already drawn (the tree), never the transparent
// background, so the sprite's outline is unchanged.
function paintOnTree(ctx, paint) {
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  paint();
  ctx.restore();
}

// The trunk from the ground (y = h) up to kind.trunk.to of the height:
// tapered, lit on the left, with bark streaks.
function drawTrunk(ctx, kind, w, h, cfg, rng, color = cfg.trunkColor) {
  const t = kind.trunk;
  const cx = w / 2;
  const top = h * (1 - t.to);
  const bottom = (t.base * w) / 2;
  const upper = (t.top * w) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - bottom * 1.25, h);
  ctx.quadraticCurveTo(cx - bottom, h - h * 0.03, cx - upper, top);
  ctx.lineTo(cx + upper, top);
  ctx.quadraticCurveTo(cx + bottom, h - h * 0.03, cx + bottom * 1.25, h);
  ctx.closePath();
  ctx.clip();
  const shade = ctx.createLinearGradient(cx - bottom, 0, cx + bottom, 0);
  shade.addColorStop(0, css(cfg.barkLight));
  shade.addColorStop(0.3, css(color));
  shade.addColorStop(0.7, css(color));
  shade.addColorStop(1, css(cfg.barkDark));
  ctx.fillStyle = shade;
  ctx.fillRect(cx - bottom * 1.3, top, bottom * 2.6, h - top);
  for (let i = 0; i < cfg.barkStreaks; i++) {
    ctx.fillStyle = css(rng.chance(0.6) ? cfg.barkDark : cfg.barkLight, cfg.barkStreakAlpha);
    ctx.fillRect(rng.range(cx - bottom, cx + bottom), rng.range(top, h), rng.int(1, 2), rng.range(h * 0.01, h * 0.05));
  }
  ctx.restore();
}

// Dark speckles (shadow between needle clumps, denser on the right, away
// from the moon) and speckles of varied greens.
function drawDapple(ctx, w, h, cfg, rng, leafColors, count = cfg.dappleCount) {
  paintOnTree(ctx, () => {
    for (let i = 0; i < count; i++) {
      const x = rng.range(0, w);
      const y = rng.range(0, h);
      const size = rng.int(cfg.dappleSizeMin, cfg.dappleSizeMax);
      const shadowChance = cfg.dappleShadowShare * (0.5 + x / w);
      ctx.fillStyle = rng.chance(shadowChance) ? css(cfg.dappleShadowColor, cfg.dappleShadowAlpha) : css(rng.pick(leafColors), cfg.dappleLeafAlpha);
      ctx.fillRect(Math.floor(x), Math.floor(y), size, size);
    }
  });
}

// Short hanging needle strokes along an edge, from (x, y).
function fringe(ctx, x, y, length, color, alpha, rng) {
  ctx.strokeStyle = css(color, alpha);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + rng.range(-length * 0.4, length * 0.4), y + length);
  ctx.stroke();
}

// Lit colour on the left half, dark on the right: x from 0 to w.
function litColor(x, w, light, dark, rng) {
  return rng.chance(0.15 + 0.7 * (1 - x / w)) ? light : dark;
}

// ---- hemlock -----------------------------------------------------------------

function drawHemlock(ctx, kind, w, h, cfg, rng) {
  const c = cfg.hemlock;
  const cx = w / 2;
  drawTrunk(ctx, kind, w, h, cfg, rng);
  const top = h * 0.05;
  const bottom = h * (1 - kind.trunk.to) + h * 0.02;
  const levels = c.levels;
  for (let i = 0; i < levels; i++) {
    const t = (i + 1) / levels; // 0 at the top
    const y = top + (bottom - top) * t;
    const spread = w * 0.47 * (0.12 + 0.88 * Math.pow(t, 0.75));
    // Several drooping sprays a side, of different lengths, so the edge is
    // ragged and the layers overlap.
    for (let k = 0; k < c.spraysPerLevel * 2; k++) {
      const side = k % 2 === 0 ? -1 : 1;
      const reach = spread * rng.range(0.45, 1);
      const sy = y + rng.range(-1, 1) * h * 0.012;
      const droop = reach * rng.range(0.22, 0.45);
      const thick = h * rng.range(0.018, 0.032);
      // Sprays start a little across the trunk, so there's no seam down it.
      const sx = cx - side * spread * rng.range(0, 0.25);
      const ex = cx + side * reach;
      const ey = sy + droop;
      // Shaded across the whole tree (the moon is up and left), so the
      // light falls off smoothly rather than spray by spray.
      const light = rng.pick(c.lit);
      const shade = ctx.createLinearGradient(cx - w * 0.42, 0, cx + w * 0.42, 0);
      shade.addColorStop(0, css(light));
      shade.addColorStop(rng.range(0.35, 0.6), css(rng.chance(0.5) ? light : c.mid));
      shade.addColorStop(1, css(c.dark));
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.moveTo(sx, sy - thick);
      ctx.quadraticCurveTo(sx + (ex - sx) * 0.6, sy - thick * 1.2, ex, ey);
      ctx.quadraticCurveTo(sx + (ex - sx) * 0.55, sy + thick * 0.9, sx, sy + thick);
      ctx.closePath();
      ctx.fill();
      // A lit top edge on the moon side.
      if (ex < cx) {
        ctx.strokeStyle = css(light, 0.6);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(sx + (ex - sx) * 0.3, sy - thick * 1.05);
        ctx.quadraticCurveTo(sx + (ex - sx) * 0.6, sy - thick * 1.2, ex, ey);
        ctx.stroke();
      }
      // Needles hanging from the spray's underside.
      for (let n = 0; n < c.fringePerSpray; n++) {
        const s = rng.range(0.2, 1);
        const fx = sx + (ex - sx) * s;
        const fy = sy + droop * s * s + thick * (1 - s) * 0.6;
        fringe(ctx, fx, fy, rng.range(h * 0.008, h * 0.02), litColor(fx, w, light, c.dark, rng), 0.85, rng);
      }
    }
  }
  // The nodding leader: the tip bends over to one side.
  const bend = rng.chance(0.5) ? 1 : -1;
  ctx.strokeStyle = css(c.dark);
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, top + h * 0.05);
  ctx.quadraticCurveTo(cx, top - h * 0.01, cx + bend * w * 0.06, top + h * 0.015);
  ctx.stroke();
  drawDapple(ctx, w, h, cfg, rng, c.dapple);
  shadeRight(ctx, w, h);
}

// A soft darkening toward the right (away from the moon), over the whole tree.
function shadeRight(ctx, w, h, strength = 0.35) {
  paintOnTree(ctx, () => {
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.45, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(0,0,0,${strength})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

// ---- spruce ------------------------------------------------------------------

function drawSpruce(ctx, kind, w, h, cfg, rng) {
  const c = cfg.spruce;
  const cx = w / 2;
  drawTrunk(ctx, kind, w, h, cfg, rng);
  const tiers = rng.int(c.tiersMin, c.tiersMax);
  const canopyTop = h * 0.02;
  const canopyBottom = h * (1 - kind.trunk.to) + h * 0.03;
  const step = (canopyBottom - canopyTop) / tiers;
  for (let i = 0; i < tiers; i++) {
    const bottom = canopyBottom - i * step;
    const top = Math.max(0, bottom - step * 1.9); // tiers overlap
    const halfWidth = w * c.halfWidth * Math.pow(1 - i / tiers, 0.85) + w * 0.03;
    const light = rng.pick(c.lit);
    const edge = drawTier(ctx, cx, top, bottom, halfWidth, light, c, rng);
    for (const [x, y] of edge) {
      for (let k = 0; k < c.fringePerSpike; k++) fringe(ctx, x + rng.range(-4, 4), y - rng.range(0, 4), rng.range(h * 0.008, h * 0.02), litColor(x, w, light, c.dark, rng), 0.8, rng);
    }
  }
  drawDapple(ctx, w, h, cfg, rng, c.dapple);
}

// A jagged triangle of branches, lit from the upper left (moonlight).
// Returns the spike tips (for the hanging needles).
function drawTier(ctx, cx, top, bottom, halfWidth, lightColor, c, rng) {
  const spikes = c.spikesPerTier;
  const droop = (bottom - top) * 0.12;
  const right = [];
  for (let k = 1; k <= spikes; k++) {
    const t = k / spikes;
    const out = k % 2 === 0 ? rng.range(0.85, 1.1) : rng.range(0.55, 0.8);
    right.push([cx + halfWidth * t * out, top + (bottom - top) * t + (k % 2 === 0 ? droop : 0)]);
  }
  const left = right.map(([x, y]) => [cx - (x - cx) * rng.range(0.9, 1.1), y + rng.range(-droop, droop) * 0.5]);
  ctx.beginPath();
  ctx.moveTo(cx, top);
  for (const [x, y] of right) ctx.lineTo(x, y);
  ctx.lineTo(cx, bottom - droop);
  for (let k = left.length - 1; k >= 0; k--) ctx.lineTo(left[k][0], left[k][1]);
  ctx.closePath();
  const gradient = ctx.createLinearGradient(cx - halfWidth, top, cx + halfWidth, bottom);
  gradient.addColorStop(0, css(lightColor));
  gradient.addColorStop(0.45, css(c.dark));
  gradient.addColorStop(1, css(c.dark));
  ctx.fillStyle = gradient;
  ctx.fill();
  return [...right, ...left].filter((_, k) => k % 2 === 1);
}

// ---- white pine --------------------------------------------------------------

function drawWhitePine(ctx, kind, w, h, cfg, rng) {
  const c = cfg.whitePine;
  const cx = w / 2;
  drawTrunk(ctx, kind, w, h, cfg, rng);
  const trunkTop = h * (1 - kind.trunk.to);
  // The trunk carries on up through the crown, thinning. Not too thin:
  // seen far off the sprite is shrunk, and anything a few pixels wide drops
  // out of the cut-out, leaving the clumps floating (Aaron, Session 10).
  const crownTop = c.crownTrunkTop * w;
  ctx.fillStyle = css(cfg.trunkColor);
  ctx.beginPath();
  ctx.moveTo(cx - (kind.trunk.top * w) / 2, trunkTop + 2);
  ctx.lineTo(cx - crownTop / 2, h * 0.03);
  ctx.lineTo(cx + crownTop / 2, h * 0.03);
  ctx.lineTo(cx + (kind.trunk.top * w) / 2, trunkTop + 2);
  ctx.closePath();
  ctx.fill();
  const lean = rng.chance(0.5) ? 1 : -1; // the wind pushed its branches one way
  const whorls = rng.int(c.whorlsMin, c.whorlsMax);
  for (let i = 0; i < whorls; i++) {
    const t = i / (whorls - 1);
    const y = h * 0.06 + (trunkTop - h * 0.1) * t;
    for (const side of [-1, 1]) {
      if (rng.chance(c.skipChance) && i > 0) continue; // gaps: you can see through a white pine
      // Capped so its outermost tuft stays inside the sprite (Aaron, Session 14:
      // the long low branches spilled into the next tree's cell in the atlas,
      // and floated beside that tree in the game).
      const reach = Math.min(w * 0.38, w * (0.12 + 0.34 * Math.pow(t, 0.6)) * (side === lean ? 1.15 : 0.75) * rng.range(0.7, 1));
      const ex = cx + side * reach;
      const ey = y - h * rng.range(0.01, 0.04); // branches rise a little to their tips
      ctx.strokeStyle = css(cfg.trunkColor);
      ctx.lineWidth = w * (c.branchWidth[0] + (c.branchWidth[1] - c.branchWidth[0]) * t);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx, y + h * 0.01);
      ctx.quadraticCurveTo(cx + side * reach * 0.5, y + h * 0.012, ex, ey);
      ctx.stroke();
      // A flat-topped clump of soft needles along the outer part.
      const blobs = Math.round(c.blobsPerClump * (0.5 + t * 0.6) * (reach / (w * 0.3)));
      for (let k = 0; k < blobs; k++) {
        const s = rng.range(0.3, 1.05);
        const bx = cx + side * reach * s + rng.range(-w * 0.03, w * 0.03);
        const by = y - h * 0.025 * s + h * rng.range(-0.02, 0.025);
        const r = w * rng.range(0.012, 0.03);
        const lit = by < y - h * 0.02 * s && bx < cx + w * 0.2;
        const color = lit ? rng.pick(c.lit) : rng.chance(0.5) ? c.dark : c.mid;
        // A soft tuft of needles: a blob with a few strokes sticking out.
        ctx.fillStyle = css(color);
        ctx.beginPath();
        ctx.ellipse(bx, by, r * 1.5, r * 0.9, rng.range(-0.4, 0.4), 0, Math.PI * 2);
        ctx.fill();
        for (let n = 0; n < 5; n++) {
          const a = rng.range(0, Math.PI * 2);
          stroke(ctx, bx, by, bx + Math.cos(a) * r * 2.2, by + Math.sin(a) * r * 1.4, color);
        }
      }
    }
  }
  // An irregular tuft at the top.
  for (let k = 0; k < 10; k++) {
    ctx.fillStyle = css(k < 5 ? rng.pick(c.lit) : c.mid);
    ctx.beginPath();
    ctx.ellipse(cx + rng.range(-w * 0.05, w * 0.05), h * rng.range(0.02, 0.07), w * 0.035, w * 0.022, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  drawDapple(ctx, w, h, cfg, rng, c.dapple, cfg.dappleCount * 0.6);
  shadeRight(ctx, w, h, 0.25);
}

function stroke(ctx, x0, y0, x1, y1, color) {
  ctx.strokeStyle = css(color, 0.9);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

// ---- oak (bare) --------------------------------------------------------------

function drawOak(ctx, kind, w, h, cfg, rng) {
  const c = cfg.oak;
  const cx = w / 2;
  drawTrunk(ctx, kind, w, h, cfg, rng, c.bark);
  const forkY = h * (1 - kind.trunk.to);
  const tips = [];
  ctx.lineCap = 'round';
  // A crooked limb, then two or three thinner ones off its end.
  const limb = (x, y, angle, length, width, depth) => {
    // Limbs that would leave the sprite turn back up instead.
    let a = angle;
    const room = (side) => (side < 0 ? x - w * 0.04 : w * 0.96 - x);
    if (Math.cos(a) * length < -room(-1) || Math.cos(a) * length > room(1)) a = -Math.PI / 2 + (a + Math.PI / 2) * 0.3;
    const ex = x + Math.cos(a) * length;
    const ey = Math.max(h * 0.03, y + Math.sin(a) * length);
    ctx.strokeStyle = css(ex < cx ? c.barkLit : c.bark);
    ctx.lineWidth = width;
    // A crook halfway along.
    const midX = (x + ex) / 2 + rng.range(-length, length) * 0.12;
    const midY = (y + ey) / 2 + rng.range(-length, length) * 0.08;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(midX, midY, ex, ey);
    ctx.stroke();
    angle = a;
    if (depth === 0 || width < 1.2) {
      tips.push([ex, ey]);
      return;
    }
    const children = rng.int(2, 3);
    for (let k = 0; k < children; k++) {
      const spreadAngle = angle + rng.range(-c.forkSpread, c.forkSpread) + (k - (children - 1) / 2) * 0.25;
      // Limbs reach up and out; the low ones sag a little (it's an old oak).
      const bias = spreadAngle > -Math.PI / 2 ? -c.upPull : c.upPull;
      limb(ex, ey, spreadAngle + bias, length * rng.range(0.62, 0.8), width * 0.62, depth - 1);
    }
  };
  const main = rng.int(2, 3);
  for (let k = 0; k < main; k++) {
    const angle = -Math.PI / 2 + (k / (main - 1) - 0.5) * c.spread + rng.range(-0.15, 0.15);
    limb(cx + rng.range(-w * 0.02, w * 0.02), forkY + h * 0.02, angle, h * rng.range(0.12, 0.16), c.limbWidth * w, c.depth);
  }
  // Twigs at the ends, and a few dead leaves hanging on.
  ctx.lineWidth = 1;
  for (const [x, y] of tips) {
    for (let k = 0; k < 5; k++) {
      ctx.strokeStyle = css(c.bark, 0.9);
      const a = rng.range(-Math.PI, 0);
      const len = rng.range(4, 12);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
      ctx.stroke();
    }
    if (rng.chance(c.leafChance)) {
      ctx.fillStyle = css(rng.pick(c.leaves), 0.9);
      ctx.beginPath();
      ctx.ellipse(x + rng.range(-5, 5), y + rng.range(0, 6), rng.range(2, 4), rng.range(1.5, 3), rng.range(0, Math.PI), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ---- dead snag ---------------------------------------------------------------

function drawSnag(ctx, kind, w, h, cfg, rng) {
  const cx = w / 2;
  const t = kind.trunk;
  const top = h * (1 - t.to);
  const bottom = (t.base * w) / 2;
  const upper = (t.top * w) / 2;
  // The trunk with a jagged, broken top.
  ctx.fillStyle = css(cfg.deadColor);
  ctx.beginPath();
  ctx.moveTo(cx - bottom * 1.2, h);
  ctx.lineTo(cx - upper, top + h * 0.02);
  const jags = 5;
  for (let k = 0; k <= jags; k++) ctx.lineTo(cx - upper + (2 * upper * k) / jags, top + (k % 2 ? 0 : h * rng.range(0.015, 0.05)));
  ctx.lineTo(cx + bottom * 1.2, h);
  ctx.closePath();
  ctx.fill();
  // Stubby broken branches.
  ctx.strokeStyle = css(cfg.deadColor);
  ctx.lineCap = 'round';
  for (let i = 0; i < cfg.deadBranches; i++) {
    const y = rng.range(top + h * 0.05, h * 0.65);
    const side = i % 2 === 0 ? 1 : -1;
    const length = rng.range(w * 0.05, w * 0.16);
    const endY = y - rng.range(-h * 0.01, h * 0.03);
    ctx.lineWidth = rng.range(4, 8);
    ctx.lineCap = 'butt'; // snapped off
    ctx.beginPath();
    ctx.moveTo(cx, y);
    ctx.lineTo(cx + side * length, endY);
    ctx.stroke();
  }
  drawDeadTrunkDetail(ctx, cx - bottom * 1.2, top, bottom * 2.4, h - top, cfg, rng);
}

// Close-up detail for the snag's trunk, seen at face height: rounded
// shading (lit left, dark right), dense bark grain, long cracks and knots.
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
      ctx.fillRect(Math.floor(x + rng.range(0, width)), Math.floor(y + rng.range(0, height)), 1, rng.range(height * 0.01, height * 0.06));
    }
    ctx.strokeStyle = css(cfg.barkDark, cfg.deadCrackAlpha);
    ctx.lineWidth = 1;
    for (let i = 0; i < cfg.deadCracks; i++) {
      let kx = x + rng.range(width * 0.15, width * 0.85);
      let ky = y + rng.range(height * 0.2, height * 0.9);
      const length = rng.range(height * 0.08, height * 0.25);
      ctx.beginPath();
      ctx.moveTo(kx, ky);
      for (let s = 0; s < 6; s++) {
        kx += rng.range(-1.5, 1.5);
        ky -= length / 6;
        ctx.lineTo(kx, ky);
      }
      ctx.stroke();
    }
    for (let i = 0; i < cfg.deadKnots; i++) {
      const kx = x + rng.range(width * 0.25, width * 0.75);
      const ky = y + rng.range(height * 0.3, height * 0.95);
      const ry = rng.range(2, 5);
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
