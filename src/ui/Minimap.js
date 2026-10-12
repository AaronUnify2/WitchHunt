// Round minimap, top right (DESIGN.md "HUD"): the map round the player,
// turned so the way they face is up, with an N marker on the rim. Only
// revealed areas show; revealed clearings get a marker and living
// zombies in revealed areas show as red dots. Placeholder look; the
// final HUD is Session 19.

import { MAP_COLORS, drawClearingMarker, drawPlayerArrow, drawSigilMarker, drawWitchMarker, drawVehicleMarker, vehicleShown, vehicleColor, updateFogCanvas, fogRect } from './mapImage.js';

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
    this.vehicles = null; // set by MapUi.setVehicles (M5 part 2)
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
    this.draw(player, enemies, sigils, tierColors, witch);
  }

  resize() {
    const css = this.el.clientWidth;
    const size = Math.round(css * Math.min(window.devicePixelRatio || 1, 2));
    if (this.canvas.width !== size) {
      this.canvas.width = size;
      this.canvas.height = size;
    }
  }

  draw(player, enemies, sigils, tierColors, witch) {
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
    ctx.fillStyle = MAP_COLORS.enemy;
    const dot = this.cfg.enemyDotPixels * (size / 200);
    for (const e of enemies) {
      if (!tierColors && !this.fog.isRevealed(e.x, e.z)) continue;
      const [sx, sy] = toScreen(e.x, e.z);
      if (tierColors) ctx.fillStyle = tierColors[e.tier ?? 'active'];
      ctx.fillRect(sx - dot / 2, sy - dot / 2, dot, dot);
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
