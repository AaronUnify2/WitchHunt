// Round minimap, top right (DESIGN.md "HUD"): the map round the player,
// turned so the way they face is up, with an N marker on the rim. Only
// revealed areas show; revealed clearings get a marker and living
// zombies in revealed areas show as red dots. Placeholder look; the
// final HUD is Session 19.

import { drawQuadMarker, drawObjectiveMarker, MAP_COLORS, drawClearingMarker, drawPlayerArrow, drawSigilMarker, drawWitchMarker, drawVehicleMarker, drawTrailCams, vehicleShown, vehicleColor, updateFogCanvas, fogRect } from './mapImage.js';

export const MAP_DARK = { fill: '#040506', rim: 'rgba(240, 232, 208, 0.28)' };

export class Minimap {
  constructor(minimapConfig) {
    this.cfg = minimapConfig;
  }

  // mapCanvas: the terrain image; fogCanvas: from makeFogCanvas().
  init(root, { ground, map, fog, mapCanvas, fogCanvas, sigilMarker, witchMarker }) {
    this.sigilMarker = sigilMarker;
    this.witchMarker = witchMarker;
    this.ground = ground;
    this.map = map;
    this.fog = fog;
    this.mapCanvas = mapCanvas;
    this.fogCanvas = fogCanvas;
    this.el = document.createElement('div');
    this.el.className = 'minimap hidden';
    this.el.style.setProperty('--minimap-size', `${this.cfg.sizeVmin}vmin`);
    this.canvas = document.createElement('canvas');
    this.north = document.createElement('div');
    this.north.className = 'minimap-north';
    this.north.textContent = 'N';
    this.el.append(this.canvas, this.north);
    root.appendChild(this.el);
    this.ctx = this.canvas.getContext('2d');
    this.timer = 0;
    this.trailCams = null; // set by MapUi.setTrailCams (M8)
    this.vehicles = null; // set by MapUi.setVehicles (M5 part 2)
    this.objective = null; // Session 16: { text, at } (set by MapUi)
  }

  show(visible) {
    this.el.classList.toggle('hidden', !visible);
  }

  // player: { position, yaw }. enemies: living zombies [{ x, z }].
  // sigils: [{ x, z }] or null (debug).
  update(dt, player, enemies, sigils = null, tierColors = null, witch = null) {
    if (this.el.classList.contains('hidden')) return;
    // refreshPerSecond 0 = every frame (smooth turning; Aaron's M3 test).
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = this.cfg.refreshPerSecond > 0 ? 1 / this.cfg.refreshPerSecond : 0;
    this.resize();
    if (this.dark) this.drawDark();
    else this.draw(player, enemies, sigils, tierColors, witch);
  }

  resize() {
    const css = this.el.clientWidth;
    const size = Math.round(css * Math.min(window.devicePixelRatio || 1, 2));
    if (this.canvas.width !== size) {
      this.canvas.width = size;
      this.canvas.height = size;
    }
  }

  // Session 33 (Aaron: "black it out"): where there's no map to be had (the place beyond, the mine below):
  // a black disc and its rim. No ground, no markers, no arrow, no N.
  drawDark() {
    const ctx = this.ctx;
    const size = this.canvas.width;
    const half = size / 2;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = MAP_DARK.fill;
    ctx.beginPath();
    ctx.arc(half, half, half, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = MAP_DARK.rim;
    ctx.lineWidth = Math.max(1, size * 0.012);
    ctx.beginPath();
    ctx.arc(half, half, half - ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.stroke();
    this.north.style.display = 'none';
  }

  draw(player, enemies, sigils, tierColors, witch) {
    this.north.style.display = '';
    const ctx = this.ctx;
    const size = this.canvas.width;
    const half = size / 2;
    const scale = size / this.cfg.metresAcross; // pixels per metre
    const geo = this.ground.geo;
    const cell = this.ground.maskCell;
    const p = player.position;
    updateFogCanvas(this.fogCanvas, this.fog);

    ctx.save();
    ctx.clearRect(0, 0, size, size);
    ctx.beginPath();
    ctx.arc(half, half, half, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = MAP_COLORS.background;
    ctx.fillRect(0, 0, size, size);

    // World space, turned so the player's facing points up.
    ctx.translate(half, half);
    ctx.rotate(player.yaw);
    ctx.scale(scale, scale);
    ctx.translate(-p.x, -p.z);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.mapCanvas, geo.xMin - cell / 2, geo.zMin - cell / 2, this.mapCanvas.width * cell, this.mapCanvas.height * cell);
    const f = fogRect(this.fog);
    ctx.drawImage(this.fogCanvas.canvas, f.x, f.z, f.width, f.depth);
    ctx.restore();

    // Markers, placed by hand so they stay upright.
    const sin = Math.sin(player.yaw);
    const cos = Math.cos(player.yaw);
    const toScreen = (x, z) => {
      const dx = (x - p.x) * scale;
      const dz = (z - p.z) * scale;
      return [half + dx * cos - dz * sin, half + dx * sin + dz * cos];
    };
    ctx.save();
    ctx.beginPath();
    ctx.arc(half, half, half, 0, Math.PI * 2);
    ctx.clip();
    const marker = size * 0.03;
    for (const c of this.map.clearings) {
      if (!this.fog.isRevealed(c.x, c.z)) continue;
      const [sx, sy] = toScreen(c.x, c.z);
      if (Math.hypot(sx - half, sy - half) > half + marker) continue;
      drawClearingMarker(ctx, c, sx, sy, marker);
    }
    if (this.vehicles) {
      const vs = this.vehicleStyle;
      const length = vs.minimapPixels * (size / 200);
      for (const v of this.vehicles) {
        if (!vehicleShown(v)) continue;
        const [sx, sy] = toScreen(v.x, v.z);
        if (Math.hypot(sx - half, sy - half) > half + length) continue;
        drawVehicleMarker(ctx, sx, sy, player.yaw - v.yaw, length, vehicleColor(v, vs));
      }
    }
    if (this.trailCams) drawTrailCams(ctx, this.trailCams, toScreen, this.trailCamStyle.minimapPixels * (size / 200), this.trailCamStyle, this.trailCamTime(), (sx, sy, s) => Math.hypot(sx - half, sy - half) > half + s);
    ctx.fillStyle = MAP_COLORS.enemy;
    const dot = this.cfg.enemyDotPixels * (size / 200);
    for (const e of enemies) {
      if (e.state === 'dormant' && !tierColors) continue; // Session 15b: the gas station's mutant gives itself away otherwise
      if (!tierColors && !this.fog.isRevealed(e.x, e.z)) continue;
      const [sx, sy] = toScreen(e.x, e.z);
      if (tierColors) ctx.fillStyle = tierColors[e.tier ?? 'active'];
      ctx.fillRect(sx - dot / 2, sy - dot / 2, dot, dot);
    }
    // Session 16: the quad bike, where it was left.
    if (this.quad && !this.quad.riding) {
      const [bx, by] = toScreen(this.quad.x, this.quad.z);
      if (Math.hypot(bx - half, by - half) < half) drawQuadMarker(ctx, bx, by, player.yaw - this.quad.heading, size * 0.045);
    }
    if (sigils && this.sigilMarker) {
      const m = this.sigilMarker;
      for (const s of sigils) {
        const [sx, sy] = toScreen(s.x, s.z);
        drawSigilMarker(ctx, sx, sy, m.minimapPixels * (size / 200), m.color);
      }
    }
    if (witch && this.witchMarker) {
      const [sx, sy] = toScreen(witch.x, witch.z);
      drawWitchMarker(ctx, sx, sy, this.witchMarker.minimapPixels * (size / 200), this.witchMarker.color);
    }
    ctx.restore();

    // Session 16 (Aaron): the objective, or on the rim the way to it when it's off the map.
    // Session 19 round 3: every place the step points at (ats), or its one (at).
    for (const at of this.objective?.ats?.length ? this.objective.ats : this.objective?.at ? [this.objective.at] : []) {
      let [ox, oy] = toScreen(at.x, at.z);
      const m = size * 0.04;
      const dx = ox - half;
      const dy = oy - half;
      const d = Math.hypot(dx, dy);
      const rim = half - m * 0.8; // Session 16 (Aaron): right on the rim, so it reads as "beyond what you can see"
      if (d > rim) {
        ox = half + (dx / d) * rim;
        oy = half + (dy / d) * rim;
      }
      drawObjectiveMarker(ctx, ox, oy, m, d > rim ? 1 : 1 + 0.12 * Math.sin(performance.now() * 0.006));
    }
    drawPlayerArrow(ctx, half, half, 0, size * 0.045);
    ctx.strokeStyle = 'rgba(240, 232, 208, 0.6)';
    ctx.lineWidth = Math.max(1, size * 0.012);
    ctx.beginPath();
    ctx.arc(half, half, half - ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.stroke();

    // N marker on the rim, where north is.
    const r = 0.44;
    this.north.style.left = `${50 + Math.sin(player.yaw) * r * 100}%`;
    this.north.style.top = `${50 - Math.cos(player.yaw) * r * 100}%`;
  }

  dispose() {
    this.el.remove();
  }
}
