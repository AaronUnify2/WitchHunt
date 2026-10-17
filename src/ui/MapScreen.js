// Full-screen map (D-pad up / M), north up. Shows what the player has
// revealed: terrain, pathways, clearing markers with names, live zombies
// in revealed areas, and the player. The debug "map graph" option shows
// every clearing and pathway regardless of the fog. Placeholder look;
// the final map screen is Session 19.

import { MAP_COLORS, drawClearingMarker, drawPlayerArrow, drawSigilMarker, drawWitchMarker, drawVehicleMarker, drawTrailCams, vehicleShown, vehicleColor, updateFogCanvas, fogRect } from './mapImage.js';

export class MapScreen {
  constructor(mapScreenConfig) {
    this.cfg = mapScreenConfig;
  }

  // nameOf(clearing): its display name.
  init(root, { ground, map, fog, mapCanvas, fogCanvas, nameOf, sigilMarker, witchMarker }) {
    this.sigilMarker = sigilMarker;
    this.witchMarker = witchMarker;
    this.ground = ground;
    this.map = map;
    this.fog = fog;
    this.mapCanvas = mapCanvas;
    this.fogCanvas = fogCanvas;
    this.nameOf = nameOf;
    this.showGraph = false;
    this.isOpen = false;
    this.el = document.createElement('div');
    this.el.className = 'map-screen hidden';
    this.el.style.setProperty('--map-margin', `${this.cfg.marginVmin}vmin`);
    this.canvas = document.createElement('canvas');
    this.legend = document.createElement('div');
    this.legend.className = 'map-screen-legend';
    this.el.append(this.canvas, this.legend);
    root.appendChild(this.el);
    this.ctx = this.canvas.getContext('2d');
    this.timer = 0;
    this.trailCams = null; // set by MapUi.setTrailCams (M8)
    this.vehicles = null; // set by MapUi.setVehicles (M5 part 2)
  }

  open() {
    this.isOpen = true;
    this.timer = 0;
    this.el.classList.remove('hidden');
  }

  close() {
    this.isOpen = false;
    this.el.classList.add('hidden');
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  // sigils: [{ x, z }] or null (debug: shown whatever the fog).
  update(dt, player, enemies, footer, sigils = null, tierColors = null, witch = null) {
    if (!this.isOpen) return;
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 1 / this.cfg.refreshPerSecond;
    this.resize();
    this.draw(player, enemies, sigils, tierColors, witch);
    const sigilKey = (sigils ? '   ◆ (green) Sigil (debug)' : '') + (witch ? '   ✕ (violet) The witch (debug)' : '');
    const vehicleKey = (this.vehicles ? '   ▮ Vehicle (grey: emptied)' : '') + (this.trailCams ? '   ▪ Trail cam (red: saw something)' : '');
    this.legend.textContent = `■ Home   ▲ Witch's hut   ◆ Encounter   ● Sigil ground   ○ Clearing${vehicleKey}${sigilKey}   ${footer}   D-pad up / M / B: close`;
  }

  resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(this.canvas.clientWidth * ratio);
    const h = Math.round(this.canvas.clientHeight * ratio);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  draw(player, enemies, sigils, tierColors, witch) {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const geo = this.ground.geo;
    const cell = this.ground.maskCell;
    const mapW = geo.xMax - geo.xMin;
    const mapD = geo.zMax - geo.zMin;
    const scale = Math.min(W / mapW, H / mapD);
    const ox = (W - mapW * scale) / 2;
    const oy = (H - mapD * scale) / 2;
    const toScreen = (x, z) => [ox + (x - geo.xMin) * scale, oy + (z - geo.zMin) * scale];
    updateFogCanvas(this.fogCanvas, this.fog);

    ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true;
    const [mx, my] = toScreen(geo.xMin - cell / 2, geo.zMin - cell / 2);
    ctx.drawImage(this.mapCanvas, mx, my, this.mapCanvas.width * cell * scale, this.mapCanvas.height * cell * scale);
    if (!this.showGraph) {
      const f = fogRect(this.fog);
      const [fx, fy] = toScreen(f.x, f.z);
      ctx.save();
      ctx.beginPath();
      ctx.rect(ox, oy, mapW * scale, mapD * scale);
      ctx.clip();
      ctx.drawImage(this.fogCanvas.canvas, fx, fy, f.width * scale, f.depth * scale);
      ctx.restore();
    } else {
      this.drawGraph(ctx, toScreen, scale);
    }
    ctx.strokeStyle = 'rgba(240, 232, 208, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(ox, oy, mapW * scale, mapD * scale);

    const marker = Math.max(4, Math.min(W, H) * 0.009);
    const font = Math.round(Math.max(11, Math.min(W, H) * 0.02));
    ctx.font = `${font}px ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const c of this.map.clearings) {
      if (!this.showGraph && !this.fog.isRevealed(c.x, c.z)) continue;
      const [sx, sy] = toScreen(c.x, c.z);
      drawClearingMarker(ctx, c, sx, sy, marker);
      if (c.kind === 'wild' && !this.showGraph) continue;
      const label = this.nameOf(c);
      ctx.fillStyle = MAP_COLORS.labelShadow;
      ctx.fillText(label, sx + 1, sy + marker * 1.5 + 1);
      ctx.fillStyle = MAP_COLORS.label;
      ctx.fillText(label, sx, sy + marker * 1.5);
    }

    if (this.vehicles) {
      const vs = this.vehicleStyle;
      const length = vs.screenPixels * Math.max(1, Math.min(W, H) / 700);
      for (const v of this.vehicles) {
        if (!vehicleShown(v)) continue;
        const [sx, sy] = toScreen(v.x, v.z);
        drawVehicleMarker(ctx, sx, sy, -v.yaw, length, vehicleColor(v, vs));
      }
    }
    if (this.trailCams) drawTrailCams(ctx, this.trailCams, toScreen, this.trailCamStyle.screenPixels * Math.max(1, Math.min(W, H) / 700), this.trailCamStyle, this.trailCamTime());
    ctx.fillStyle = MAP_COLORS.enemy;
    const dot = this.cfg.enemyDotPixels * Math.max(1, Math.min(W, H) / 700);
    for (const e of enemies) {
      if (!this.showGraph && !tierColors && !this.fog.isRevealed(e.x, e.z)) continue;
      const [sx, sy] = toScreen(e.x, e.z);
      if (tierColors) ctx.fillStyle = tierColors[e.tier ?? 'active'];
      ctx.fillRect(sx - dot / 2, sy - dot / 2, dot, dot);
    }
    if (sigils && this.sigilMarker) {
      const size = this.sigilMarker.screenPixels * Math.max(1, Math.min(W, H) / 700);
      for (const s of sigils) {
        const [sx, sy] = toScreen(s.x, s.z);
        drawSigilMarker(ctx, sx, sy, size, this.sigilMarker.color);
      }
    }
    if (witch && this.witchMarker) {
      const [sx, sy] = toScreen(witch.x, witch.z);
      drawWitchMarker(ctx, sx, sy, this.witchMarker.screenPixels * Math.max(1, Math.min(W, H) / 700), this.witchMarker.color);
    }

    const [px, py] = toScreen(player.position.x, player.position.z);
    drawPlayerArrow(ctx, px, py, -player.yaw, marker * 1.8);

    // North marker, top centre.
    ctx.fillStyle = MAP_COLORS.label;
    ctx.font = `bold ${font * 1.4}px ui-monospace, monospace`;
    ctx.fillText('N ▲', ox + (mapW * scale) / 2, oy + font * 0.4);
  }

  // Debug: every pathway as a line and each clearing's reach.
  drawGraph(ctx, toScreen, scale) {
    ctx.strokeStyle = MAP_COLORS.path;
    ctx.lineWidth = 2;
    for (const p of this.map.paths) {
      ctx.beginPath();
      p.points.forEach((pt, i) => {
        const [x, y] = toScreen(pt.x, pt.z);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(240, 220, 170, 0.35)';
    for (const c of this.map.clearings) {
      const [x, y] = toScreen(c.x, c.z);
      ctx.beginPath();
      ctx.arc(x, y, c.radius * scale, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  dispose() {
    this.el.remove();
  }
}
