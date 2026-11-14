// The station plan on the cabin wall (Nov 14, Aaron: "a poster on the wall that shows the diagram that's in
// the ledger system in real time that you can interact with... to the right of Ellen's poster in the main
// room, in between the door to the comms room and her poster. Interact with it to repair the fence, to put
// battery in the fence, and to upgrade the comms room door").
//
// It draws the ledger's fence plan (base/fencePlan.js: the fence, the barricades, the doors, the fence box,
// each in its colour for its health) onto a canvas, every `refresh` seconds while Tom's near, as a texture on a
// sheet pinned to the partition's main-room face. Holding X at it opens that plan on its own
// (Ledger.open('fence')): repair a panel, fit a battery, reinforce a door, build a barricade. The desk's
// ledger keeps everything else (the turret, the upgrades, the forecast, the monitors, the papers).
//
// No light of its own (the lighting rule): an unlit-ish sheet (a little emissive, so it reads at night).

import * as THREE from 'three';

// The plan's look, from style.css's .ledger-plan rules: an image of an SVG doesn't see the page's CSS.
export const PLAN_STYLE = `
.cliff{fill:#1a130c}
.lbl{fill:#8a7858;font-size:2px;text-anchor:middle;letter-spacing:.15px;font-family:monospace}
.lbl.small{font-size:1.5px}
.cabin{fill:#3a2c1e;stroke:#6a5640;stroke-width:.3}
.cabin-wall{stroke:#6a5640;stroke-width:.25}
.tower{fill:none;stroke:#6a5640;stroke-width:.3}
.pad{fill:none;stroke:#5a4630;stroke-width:.25;stroke-dasharray:.5 .4}
.hit{display:none}
.shape.fence{fill:none;stroke-width:1.5;stroke-linecap:butt}
.shape.barricade{fill:none;stroke-width:1.1}
.ok .shape{stroke:#7a9a58}
.hurt .shape{stroke:#d8a040}
.down .shape{stroke:#c04030;stroke-dasharray:.8 .6}
.gate .shape.fence{stroke-width:2.2}
.barricade.empty .shape{stroke:#6a5640;stroke-width:.5;stroke-dasharray:.4 .5}
.door .shape{stroke-width:.3}
.door.ok .shape{fill:#7a9a58}
.door.hurt .shape{fill:#d8a040}
.door.down .shape{fill:#c04030}
.door.reinforced .shape{stroke:#c8ccd0;stroke-width:.45}
.box .shape{fill:#2a2016;stroke-width:.35}
.box .charge{fill:#6ab0e8}
.box .glyph{fill:#f0c870;font-size:2.2px;text-anchor:middle}
.head{fill:#e8d8b0;font-size:2.6px;font-family:monospace;letter-spacing:.3px}
.sub{fill:#c8b890;font-size:1.7px;font-family:monospace}
`;

// The whole sheet as SVG markup: a title, a line of numbers, and the plan. plan: buildFencePlan's;
// info: { scrap, charge, capacity, batteries }. Pure.
export function posterSvg(plan, info, size = { w: 1024, h: 860 }) {
  const [vx, vy, vw, vh] = plan.viewBox.split(/\s+/).map(Number);
  const head = 9; // plan units above the plan for the title and numbers
  const parts = plan.items.map((it) => `<g class="${it.cls ?? ''}">${it.svg}</g>`).join('');
  const line = `SCRAP ${info.scrap}   CHARGE ${info.charge}/${info.capacity}   BATTERIES ${info.batteries}`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size.w}" height="${size.h}" viewBox="${vx - 2} ${vy - head} ${vw + 4} ${vh + head + 2}">` +
    `<style>${PLAN_STYLE}</style>` +
    `<rect x="${vx - 2}" y="${vy - head}" width="${vw + 4}" height="${vh + head + 2}" fill="#241b12"/>` +
    `<text class="head" x="${vx + 1}" y="${vy - head + 3.6}">STATION PLAN</text>` +
    `<text class="sub" x="${vx + 1}" y="${vy - head + 6.6}">${line}</text>` +
    `${plan.back ?? ''}${parts}</svg>`
  );
}

export class FencePoster {
  // cfg: config.station.poster; at: the layout's cabin.poster ({ x, z, w, h, bottom, spot }).
  constructor(cfg, at) {
    this.cfg = cfg;
    this.at = at;
  }

  // getPlan(): buildFencePlan's; getInfo(): posterSvg's info.
  init(scene, floorY, getPlan, getInfo) {
    this.getPlan = getPlan;
    this.getInfo = getInfo;
    this.timer = 0;
    this.drawing = false;
    const a = this.at;
    this.group = new THREE.Group();
    this.group.position.set(a.x, floorY + a.bottom + a.h / 2, a.z);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(a.w + 0.06, a.h + 0.06, 0.02), new THREE.MeshLambertMaterial({ color: this.cfg.frame }));
    frame.position.z = 0.01;
    this.group.add(frame);
    if (typeof document !== 'undefined') {
      this.canvas = document.createElement('canvas');
      this.canvas.width = this.cfg.pixels[0];
      this.canvas.height = this.cfg.pixels[1];
      this.texture = new THREE.CanvasTexture(this.canvas);
      this.texture.colorSpace = THREE.SRGBColorSpace;
    }
    this.material = new THREE.MeshLambertMaterial({ color: 0xffffff, map: this.texture ?? null, emissive: 0xffffff, emissiveMap: this.texture ?? null, emissiveIntensity: this.cfg.glow });
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(a.w, a.h), this.material);
    sheet.position.z = 0.022;
    sheet.name = 'stationPoster';
    this.group.add(sheet);
    scene.add(this.group);
    this.redraw();
  }

  // Redrawn every cfg.refresh seconds while Tom's within cfg.near metres (it's live, as the ledger is).
  update(dt, playerPos) {
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = this.cfg.refresh;
    if (playerPos && Math.hypot(playerPos.x - this.at.x, playerPos.z - this.at.z) > this.cfg.near) return;
    this.redraw();
  }

  redraw() {
    if (!this.canvas || this.drawing || typeof Image === 'undefined') return;
    const svg = posterSvg(this.getPlan(), this.getInfo(), { w: this.canvas.width, h: this.canvas.height });
    if (svg === this.lastSvg) return;
    this.lastSvg = svg;
    this.drawing = true;
    const img = new Image();
    img.onload = () => {
      const g = this.canvas.getContext('2d');
      g.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
      this.texture.needsUpdate = true;
      this.drawing = false;
    };
    img.onerror = () => {
      this.drawing = false;
    };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  dispose() {
    this.group?.removeFromParent();
    this.group?.traverse((o) => o.geometry?.dispose());
    this.material?.dispose();
    this.texture?.dispose();
  }
}
