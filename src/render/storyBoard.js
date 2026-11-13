// Ellen's string board (Round 2, step 5; Aaron: "a string board with all of these pictures and documents
// with string showing how they are linked"): the things pinned to the cork board in the cabin's main room,
// one small mesh each, shown as the story pins them (story/FamilyStations.js; data/storyBoard.json).
//
// Board coordinates: x across (metres from its left edge as Tom faces it), y up from its bottom edge, z out
// of the cork. Each thing: a sheet of its kind's colour, tilted; what's on it (a photograph's picture, ink
// lines, a drawn figure, a map's bands and pins, a report's black bars); its pin; and its red strings, run
// from the pin to where they're tied.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const DEG = Math.PI / 180;

// One box in board coordinates, turned by `tilt` about the point (px, py): a non-indexed geometry with a
// colour on every vertex.
function slab(w, h, d, x, y, z, hex, tilt = 0, px = x, py = y) {
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  g.translate(x - px, y - py, 0);
  if (tilt) g.rotateZ(tilt);
  g.translate(px, py, z);
  const c = new THREE.Color(hex);
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.deleteAttribute('uv');
  return g;
}

// A string from (ax, ay) to (bx, by), sagging a little: three short runs.
function string(ax, ay, bx, by, z, hex, width) {
  const out = [];
  const len = Math.hypot(bx - ax, by - ay);
  const sag = Math.min(0.03, len * 0.04);
  const pts = [0, 1 / 3, 2 / 3, 1].map((t) => [ax + (bx - ax) * t, ay + (by - ay) * t - Math.sin(t * Math.PI) * sag]);
  for (let i = 0; i < 3; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    out.push(slab(Math.hypot(x1 - x0, y1 - y0) + 0.002, width, width, (x0 + x1) / 2, (y0 + y1) / 2, z, hex, Math.atan2(y1 - y0, x1 - x0)));
  }
  return out;
}

// The parts of one pinned thing (item: data/storyBoard.json; look: config.familyStations): geometries in
// board coordinates. Pure but for three's geometry.
export function boardItemParts(item, look) {
  const [x, y] = item.at;
  const [w, h] = item.size;
  const tilt = (item.tilt ?? 0) * DEG;
  const base = look.kinds[item.kind] ?? look.kinds.note;
  const parts = [];
  const on = (pw, ph, ox, oy, hex, lift = 0.004) => parts.push(slab(pw, ph, 0.002, x + ox, y + oy, lift, hex, tilt, x, y));
  parts.push(slab(w, h, 0.003, x, y, 0.002, base, tilt));
  const shade = (hex, k) => new THREE.Color(hex).multiplyScalar(k).getHex();
  if (item.kind === 'photo' || item.kind === 'print' || item.kind === 'polaroid') {
    // The picture, inside its border (a polaroid's is deep at the bottom).
    const foot = item.kind === 'polaroid' ? 0.04 : 0.012;
    const iw = w - 0.024;
    const ih = h - 0.012 - foot;
    const image = Number(item.image ?? 0x3a4040);
    on(iw, ih, 0, (foot - 0.012) / 2, image);
    // Something in it: a paler shape and a darker one (nobody will ever make it out).
    on(iw * 0.18, ih * 0.55, -iw * 0.12, (foot - 0.012) / 2 - ih * 0.1, shade(image, 1.6), 0.005);
    on(iw * 0.3, ih * 0.22, iw * 0.2, (foot - 0.012) / 2 - ih * 0.3, shade(image, 0.55), 0.005);
  }
  if (item.lines) {
    // Ink lines, ragged at the right; a report's are black bars.
    const top = h / 2 - 0.022;
    const gap = (h - 0.04) / item.lines;
    for (let i = 0; i < item.lines; i++) {
      const frac = 0.55 + (((i * 37 + item.id.length * 11) % 10) / 10) * 0.4;
      const lw = (w - 0.03) * (i === item.lines - 1 ? frac * 0.6 : frac);
      on(lw, item.bars ? 0.012 : 0.004, -(w - 0.03 - lw) / 2, top - i * gap, look.ink);
    }
  }
  if (item.figure) {
    // A drawn figure: a head, a long body, arms; the Mothman's has wings.
    on(0.03, 0.03, 0, h * 0.3, look.ink);
    on(0.036, h * 0.42, 0, h * 0.02, look.ink);
    on(w * 0.42, 0.008, 0, h * 0.16, look.ink);
    if (item.wings) {
      on(w * 0.34, h * 0.3, -w * 0.24, h * 0.04, shade(look.ink, 1.5));
      on(w * 0.34, h * 0.3, w * 0.24, h * 0.04, shade(look.ink, 1.5));
      on(0.008, 0.008, -0.007, h * 0.3, look.pin, 0.006);
      on(0.008, 0.008, 0.007, h * 0.3, look.pin, 0.006);
    }
    for (let i = 0; i < 3; i++) on(w * (0.6 - i * 0.12), 0.004, -w * 0.05, -h * 0.3 - i * 0.014, look.ink);
  }
  if (item.kind === 'map') {
    // Contour bands, a road, a river.
    const bands = [0x44523a, 0x4a4a34, 0x3c4a38, 0x54503a];
    for (let i = 0; i < 4; i++) on(w * (0.86 - i * 0.2), h * (0.82 - i * 0.19), (i - 1.5) * w * 0.04, (1.5 - i) * h * 0.03, bands[i], 0.004 + i * 0.0004);
    on(w * 0.8, 0.005, 0, -h * 0.08, look.ink, 0.006);
    on(0.005, h * 0.7, w * 0.12, 0, 0x2e3a44, 0.006);
  }
  // Its own pins (a map's), in board coordinates, and the pin it hangs by.
  for (const [px, py] of item.pins ?? []) parts.push(slab(0.014, 0.014, 0.012, px, py, 0.008, look.pin));
  const pinX = x - Math.sin(tilt) * (h / 2 - 0.014);
  const pinY = y + Math.cos(tilt) * (h / 2 - 0.014);
  if (item.kind !== 'map') parts.push(slab(0.014, 0.014, 0.012, pinX, pinY, 0.008, look.pin));
  for (const [tx, ty] of item.to ?? []) {
    parts.push(...string(item.kind === 'map' ? x : pinX, item.kind === 'map' ? y + h / 2 - 0.02 : pinY, tx, ty, 0.012, look.string, look.stringWidth));
    parts.push(slab(0.012, 0.012, 0.01, tx, ty, 0.009, look.pin));
  }
  return parts;
}

export class StoryBoard {
  // look: config.familyStations; items: data/storyBoard.json's.
  constructor(look, items) {
    this.look = look;
    this.items = items;
  }

  // board: the layout's (stationLayout.js cabin.board); floorY: the cabin's floor.
  init(parent, board, floorY) {
    this.group = new THREE.Group();
    this.group.position.set(board.x - board.w / 2, floorY + board.bottom, board.z + 0.022);
    this.material = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.meshes = new Map();
    for (const item of this.items) {
      const geometry = mergeGeometries(boardItemParts(item, this.look));
      const mesh = new THREE.Mesh(geometry, this.material);
      mesh.visible = false;
      mesh.name = `board:${item.id}`;
      this.group.add(mesh);
      this.meshes.set(item.id, mesh);
    }
    parent.add(this.group);
  }

  // Show just these (a Set of item ids).
  show(ids) {
    for (const [id, mesh] of this.meshes) mesh.visible = ids.has(id);
  }

  dispose() {
    this.group?.removeFromParent();
    for (const mesh of this.meshes?.values() ?? []) mesh.geometry.dispose();
    this.material?.dispose();
  }
}
