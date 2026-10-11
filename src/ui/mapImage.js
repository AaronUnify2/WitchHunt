// Drawing the map for the minimap and map screen (placeholder look; the
// final map art is Session 19). The terrain image is drawn once per run;
// the fog image is redrawn when more of the map is revealed; markers are
// drawn live on top, only where the player has been.

// Map palette (placeholder)
export const MAP_COLORS = {
  forest: [44, 58, 40],
  edgeForest: [28, 36, 26], // beyond the walkable area
  grass: [96, 104, 72], // open ground in clearings
  dirt: [150, 128, 92], // pathways and bare ground
  plateau: [52, 54, 50], // above the cliff
  cliff: [20, 20, 18],
  fog: [12, 15, 22],
  background: '#0c0f16',
  player: '#f4e9c8',
  enemy: '#e0403a',
  home: '#f0d890',
  hut: '#b8302a',
  encounter: '#e8c050',
  sigilGround: '#b080e0',
  wild: '#c8c0a8',
  path: 'rgba(240, 220, 170, 0.6)',
  label: '#f0e8d0',
  labelShadow: 'rgba(0, 0, 0, 0.85)',
};

const SHADE = 0.12; // hill shading strength per metre of rise across a pixel

// The terrain as a canvas, one pixel per ground-mask cell (north up):
// forest, open ground, dirt pathways, hill shading, the cliff and the
// plateau above it. typeColors: clearing type id -> CSS colour.
export function drawMapImage(ground, map, typeColors) {
  const nx = ground.maskNx;
  const nz = ground.maskNz;
  const cell = ground.maskCell;
  const geo = ground.geo;
  const canvas = document.createElement('canvas');
  canvas.width = nx;
  canvas.height = nz;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(nx, nz);
  const px = image.data;
  const col = [0, 0, 0];
  for (let j = 0; j < nz; j++) {
    const z = geo.zMin + j * cell;
    for (let i = 0; i < nx; i++) {
      const x = geo.xMin + i * cell;
      const idx = j * nx + i;
      pixelColor(ground, x, z, ground.open[idx], ground.dirt[idx], col);
      // Light from the north-west.
      const slope = ground.heightAt(x - cell, z - cell) - ground.heightAt(x + cell, z + cell);
      const shade = Math.max(0.55, Math.min(1.45, 1 + slope * SHADE));
      const o = idx * 4;
      px[o] = Math.min(255, col[0] * shade);
      px[o + 1] = Math.min(255, col[1] * shade);
      px[o + 2] = Math.min(255, col[2] * shade);
      px[o + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);

  // Tint each clearing by its type.
  ctx.globalAlpha = 0.3;
  for (const c of map.clearings) {
    const color = typeColors[c.clearingType];
    if (!color) continue;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc((c.x - geo.xMin) / cell, (c.z - geo.zMin) / cell, (c.radius * 0.8) / cell, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  return canvas;
}

function pixelColor(ground, x, z, open, dirt, out) {
  const geo = ground.geo;
  const line = ground.cliffZ(x);
  if (z < line - 1) return set(out, MAP_COLORS.plateau);
  if (z < line + 2) return set(out, MAP_COLORS.cliff);
  const w = geo.walk;
  const edge = x < w.xMin || x > w.xMax || z > w.zMax;
  const base = edge ? MAP_COLORS.edgeForest : MAP_COLORS.forest;
  for (let k = 0; k < 3; k++) {
    const grass = base[k] + (MAP_COLORS.grass[k] - base[k]) * open;
    out[k] = grass + (MAP_COLORS.dirt[k] - grass) * dirt;
  }
  return out;
}

function set(out, c) {
  out[0] = c[0];
  out[1] = c[1];
  out[2] = c[2];
  return out;
}

// A canvas of the fog grid: fog colour where unseen, clear where
// revealed, with a one-cell border of fog all round (so the soft edge of
// the scaled-up image never lets the map show past the map's edge).
// Drawn scaled up (smoothed) over the map, for soft edges.
export function makeFogCanvas(fog) {
  const canvas = document.createElement('canvas');
  canvas.width = fog.nx + 2;
  canvas.height = fog.nz + 2;
  const ctx = canvas.getContext('2d');
  return { canvas, ctx, image: ctx.createImageData(canvas.width, canvas.height), version: -1 };
}

// Where to draw the fog canvas, in world metres: { x, z, width, depth }.
export function fogRect(fog) {
  const s = fog.cellSize;
  return { x: fog.bounds.xMin - s, z: fog.bounds.zMin - s, width: (fog.nx + 2) * s, depth: (fog.nz + 2) * s };
}

export function updateFogCanvas(fogCanvas, fog) {
  if (fogCanvas.version === fog.version) return;
  fogCanvas.version = fog.version;
  const px = fogCanvas.image.data;
  const w = fog.nx + 2;
  const [r, g, b] = MAP_COLORS.fog;
  for (let j = 0; j < fog.nz + 2; j++) {
    for (let i = 0; i < w; i++) {
      const o = (j * w + i) * 4;
      const inside = i > 0 && j > 0 && i <= fog.nx && j <= fog.nz;
      px[o] = r;
      px[o + 1] = g;
      px[o + 2] = b;
      px[o + 3] = inside && fog.cells[(j - 1) * fog.nx + (i - 1)] ? 0 : 255;
    }
  }
  fogCanvas.ctx.putImageData(fogCanvas.image, 0, 0);
}

// A clearing marker at (x, y) in canvas pixels; `size` is its radius in
// pixels. Home is a square, the hut a triangle, encounters a diamond,
// sigil grounds a filled circle, plain clearings a ring.
export function drawClearingMarker(ctx, clearing, x, y, size) {
  ctx.lineWidth = Math.max(1, size * 0.3);
  ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  ctx.beginPath();
  switch (clearing.kind) {
    case 'home':
      ctx.fillStyle = MAP_COLORS.home;
      ctx.rect(x - size, y - size, size * 2, size * 2);
      break;
    case 'hut':
      ctx.fillStyle = MAP_COLORS.hut;
      ctx.moveTo(x, y - size * 1.2);
      ctx.lineTo(x + size * 1.1, y + size * 0.9);
      ctx.lineTo(x - size * 1.1, y + size * 0.9);
      ctx.closePath();
      break;
    case 'encounter':
      ctx.fillStyle = MAP_COLORS.encounter;
      ctx.moveTo(x, y - size * 1.2);
      ctx.lineTo(x + size * 1.2, y);
      ctx.lineTo(x, y + size * 1.2);
      ctx.lineTo(x - size * 1.2, y);
      ctx.closePath();
      break;
    case 'sigilGround':
      ctx.fillStyle = MAP_COLORS.sigilGround;
      ctx.arc(x, y, size, 0, Math.PI * 2);
      break;
    default:
      ctx.fillStyle = 'rgba(0,0,0,0)';
      ctx.strokeStyle = MAP_COLORS.wild;
      ctx.arc(x, y, size * 0.8, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.stroke();
}

// The player: an arrowhead at (x, y) pointing `angle` radians clockwise from up.
export function drawPlayerArrow(ctx, x, y, angle, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(size * 0.7, size * 0.8);
  ctx.lineTo(0, size * 0.4);
  ctx.lineTo(-size * 0.7, size * 0.8);
  ctx.closePath();
  ctx.fillStyle = MAP_COLORS.player;
  ctx.strokeStyle = 'rgba(0,0,0,0.9)';
  ctx.lineWidth = Math.max(1, size * 0.2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
