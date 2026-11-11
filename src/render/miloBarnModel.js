// Milo's barn (DESIGN.md "Milo's barn"; the story: The Lone Clown): his
// barn and yard, as Tom finds them. Baked into ONE vertex-coloured mesh
// (render/setBuilder.js, render/propKit.js), plus a small unlit glow mesh
// (the heat lamp's amber bulb: no light is added), the painted sign (a canvas
// texture) and the two cars across the lane (their own meshes: they swing).
//
//  - the barn: faded barn-red board and batten, grey-white trim, a gambrel
//    roof of dull tin with a rusty patch, the hayloft door and its hood, the
//    big front doors slid wide (X-braced), clean straw on the floor;
//  - inside, as the story has it: the donkey's and the pony's stalls with
//    full troughs and hay racks; the python's glass tank on a wooden table,
//    a branch in it, the heat lamp hung over it; a wooden chest of blankets
//    by the door; at the back, the knife board, its holes in the outline of
//    a person, on a low stage; a chalk line twelve paces back;
//  - the yard: a split-rail fence round it, the two cars nose to nose across
//    the lane for its gate; the dead laid out in neat rows, a broom at the
//    end of them; hay bales; his white van with a small wooden crucifix on
//    the mirror; the hand-painted sign on the lane outside.
//
// Model space: Tom walks in from -z up the lane; +x is his LEFT (three.js
// turns +z ahead with +x on the left: a frame's right is model -x). The
// config's layout is in the frame (x right), so its x is negated here.
//
// buildMiloBarn(cfg, { weather, heightAt }) -> { group, mesh, glow, sign,
// spots, colliders, dispose }; buildGateCar(colours, colour) -> { mesh, dispose }.

import * as THREE from 'three';
import { bakeParts } from './propKit.js';
import { SetBuilder } from './setBuilder.js';
import { fitText } from './RoadNorthProps.js';

const L = (x) => -x; // a frame x (right) as model x (left)

// The person-shaped outline of knife holes on the board (pure; the tests): points [x, y]
// in metres on the board's face (x across, y up from the floor), about 6 cm apart.
export function holeOutline() {
  const pts = [];
  const add = (x, y) => pts.push([x, y]);
  const line = (a, b, step = 0.06) => {
    const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let i = 0; i < n; i++) add(a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n);
  };
  // The head.
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    add(Math.sin(a) * 0.15, 1.78 + Math.cos(a) * 0.17);
  }
  // Shoulders, arms a little out, the body, the legs (one side, mirrored).
  for (const s of [-1, 1]) {
    const p = [[0.07, 1.6], [0.24, 1.52], [0.36, 1.2], [0.4, 0.92], [0.3, 0.9], [0.26, 1.16], [0.2, 1.0], [0.2, 0.78], [0.18, 0.4], [0.16, 0.08], [0.04, 0.08], [0.03, 0.66]];
    for (let i = 0; i < p.length - 1; i++) line([s * p[i][0], p[i][1]], [s * p[i + 1][0], p[i + 1][1]]);
  }
  return pts;
}

// ---- the sign (a canvas texture) ---------------------------------------------------------------

function signTexture(text, k) {
  if (typeof document === 'undefined') return null;
  const w = 512;
  const h = 320;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  const css = (hex) => `#${hex.toString(16).padStart(6, '0')}`;
  ctx.fillStyle = css(k.sign);
  ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 64) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(0, y, w, 3);
  }
  ctx.fillStyle = css(k.signInk);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Bouncing, show-bill letters (each line tipped a little its own way), stars between.
  ctx.save();
  ctx.translate(w / 2, 78);
  ctx.rotate(-0.04);
  fitText(ctx, text.title, 0, 0, w - 60, 66, 'bold', 'serif');
  ctx.restore();
  text.lines.forEach((line, i) => {
    ctx.save();
    ctx.translate(w / 2, 170 + i * 72);
    ctx.rotate(i % 2 ? 0.035 : -0.025);
    fitText(ctx, line, 0, 0, w - 90, 46, 'bold', 'serif');
    ctx.restore();
  });
  for (const [x, y] of [[44, 78], [w - 44, 78], [40, 250], [w - 40, 250]]) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const r = i % 2 ? 7 : 16;
      ctx.lineTo(x + Math.sin(a) * r, y - Math.cos(a) * r);
    }
    ctx.fill();
  }
  // Weather.
  for (let i = 0; i < 160; i++) {
    ctx.fillStyle = `rgba(30, 22, 12, ${0.04 + Math.random() * 0.1})`; // cosmetic
    ctx.beginPath();
    ctx.arc(Math.random() * w, Math.random() * h, 2 + Math.random() * 10, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---- pieces ------------------------------------------------------------------------------------

// A wall of vertical boards with battens, along the current frame's x from 0 to len, y 0..h(x) (h a function,
// for a gable), facing -z (outside). skip(x0, x1, y): leave a stretch out (a door).
function boards(b, len, h, color, colorDark, batten, skip = () => false) {
  const w = 0.3;
  for (let x = 0; x < len - 0.01; x += w) {
    const x1 = Math.min(len, x + w);
    const top = Math.min(h(x), h(x1));
    if (top < 0.1) continue;
    let y0 = 0;
    // Cut round an opening: from its top up.
    const cut = skip(x, x1);
    if (cut === 'all') continue;
    if (typeof cut === 'number') y0 = cut;
    if (top - y0 < 0.05) continue;
    b.box(x1 - x - 0.01, top - y0, 0.04, (Math.floor(x / w) % 3 ? color : colorDark), (x + x1) / 2, (y0 + top) / 2, 0);
    if (x > 0) b.box(0.06, top - y0, 0.03, batten, x, (y0 + top) / 2, -0.035);
  }
}

// A car, origin at its back end, nose toward +z (a rusted sedan, flat on one tyre).
function car(b, paint) {
  const c = b.c;
  const L2 = 4.5;
  b.box(1.78, 0.55, L2, paint, 0, 0.55, L2 / 2); // the body
  b.box(1.8, 0.12, L2 + 0.06, c.carDark, 0, 0.3, L2 / 2); // the rockers, bumpers
  b.box(1.6, 0.5, 1.9, paint, 0, 1.05, L2 * 0.47); // the cabin
  b.box(1.5, 0.46, 0.04, c.glassCar, 0, 1.06, L2 * 0.47 + 0.97, 0, 0.5, 0); // the windscreen
  b.box(1.5, 0.42, 0.04, c.glassCar, 0, 1.06, L2 * 0.47 - 0.97, 0, -0.55, 0);
  for (const s of [-1, 1]) b.box(0.03, 0.36, 1.6, c.glassCar, s * 0.81, 1.08, L2 * 0.47);
  b.box(0.9, 0.25, 0.7, c.rust, 0.3, 0.84, L2 * 0.8); // rust on the bonnet
  for (const s of [-1, 1]) {
    b.box(0.3, 0.12, 0.05, c.trim, s * 0.6, 0.7, L2 + 0.01); // the lamps
    b.box(0.3, 0.1, 0.05, c.rust, s * 0.6, 0.72, -0.01);
  }
  for (const [x, z, flat] of [[-0.82, 0.85, false], [0.82, 0.85, true], [-0.82, L2 - 0.95, false], [0.82, L2 - 0.95, false]]) {
    b.put(new THREE.CylinderGeometry(0.33, 0.33, 0.22, 12).rotateZ(Math.PI / 2), c.tyre, x, flat ? 0.26 : 0.33, z);
  }
}

// A body, laid out on its back, arms crossed (the dead he's tidied).
function corpse(b, i) {
  const c = b.c;
  const k = (b.rand() - 0.5) * 0.1;
  const skin = i % 3 ? c.corpse : c.corpseDark;
  b.box(0.42, 0.18, 0.62, i % 2 ? c.cloth : c.corpseDark, 0, 0.1, 0.0); // the torso
  b.put(new THREE.SphereGeometry(0.12, 8, 6), skin, 0, 0.11, 0.44 + k);
  for (const s of [-1, 1]) b.box(0.14, 0.14, 0.82, c.cloth, s * 0.11, 0.08, -0.72);
  b.box(0.44, 0.08, 0.14, skin, 0, 0.21, 0.12, 0.3); // the arms crossed
}

// ---- the set -----------------------------------------------------------------------------------

export function buildMiloBarn(cfg, { weather = null, heightAt = null } = {}) {
  const k = cfg.look.colors;
  const b = new SetBuilder({ colors: k }, heightAt, 1983);
  const c = b.c;
  const B = cfg.barn;
  const hw = B.halfW;
  const z0 = B.z - B.depth / 2;
  const z1 = B.z + B.depth / 2;
  // The floor's level (the barn's on the high side of its ground).
  let fy = -Infinity;
  for (const x of [-hw, hw]) for (const z of [z0, z1]) fy = Math.max(fy, b.heightAt(x, z));
  const knee = { x: hw * 0.66, y: B.wallH + B.ridge * 0.55 };
  const ridgeY = B.wallH + B.ridge;
  // The gambrel's height across the barn (|x| from the middle).
  const gable = (ax) => {
    const x = Math.abs(ax);
    if (x >= hw) return B.wallH;
    if (x >= knee.x) return B.wallH + ((hw - x) / (hw - knee.x)) * (knee.y - B.wallH);
    return knee.y + ((knee.x - x) / knee.x) * (ridgeY - knee.y);
  };
  const glowParts = new Map();
  const glow = (geo, color, x, y, z) => {
    const g = geo.toNonIndexed();
    g.deleteAttribute('uv');
    g.applyMatrix4(b.m.clone().multiply(new THREE.Matrix4().makeTranslation(x, y, z)));
    if (!glowParts.has(color)) glowParts.set(color, []);
    glowParts.get(color).push(g);
  };

  b.push(0, fy, 0);
  // ---- the barn ----
  // A stone footing, and clean straw over the floor.
  b.box(hw * 2 + 0.3, 0.5, B.depth + 0.3, c.trough, 0, -0.24, B.z);
  b.box(hw * 2 - 0.1, 0.06, B.depth - 0.1, c.straw, 0, 0.03, B.z);
  for (let i = 0; i < 26; i++) b.box(0.4 + b.rand() * 0.6, 0.03, 0.05, i % 2 ? c.hay : c.straw, (b.rand() - 0.5) * hw * 1.8, 0.07, z0 + 0.4 + b.rand() * (B.depth - 0.8), b.rand() * 3);
  // The side walls (outside faces -z in their frames).
  b.push(hw, 0, z0, -Math.PI / 2); // the left wall (+x), front to back, facing +x
  boards(b, B.depth, () => B.wallH, c.plank, c.plankDark, c.trim);
  b.pop();
  b.push(-hw, 0, z1, Math.PI / 2); // the right wall (-x), back to front, facing -x
  boards(b, B.depth, () => B.wallH, c.plank, c.plankDark, c.trim);
  b.pop();
  b.wall(hw, z0, hw, z1, 0, 0.12, B.wallH);
  b.wall(-hw, z0, -hw, z1, 0, 0.12, B.wallH);
  // The back wall and its gambrel gable (outside faces +z).
  b.push(hw, 0, z1, Math.PI);
  boards(b, hw * 2, (x) => gable(hw - x), c.plank, c.plankDark, c.trim);
  b.pop();
  b.wall(-hw, z1, hw, z1, 0, 0.12, B.wallH);
  // The front: the big doorway (x ±2.6, 3.3 high), the wall either side, the gable over it, the hayloft door.
  const door = { half: 2.6, h: 3.3 };
  b.push(-hw, 0, z0);
  boards(b, hw * 2, (x) => gable(x - hw), c.plank, c.plankDark, c.trim, (x0, x1) => (x1 > hw - door.half && x0 < hw + door.half ? door.h : false));
  b.pop();
  b.wall(-hw, z0, -door.half, z0, 0, 0.12, B.wallH);
  b.wall(door.half, z0, hw, z0, 0, 0.12, B.wallH);
  b.box(door.half * 2 + 0.3, 0.16, 0.12, c.trim, 0, door.h + 0.08, z0 - 0.06); // the header
  b.box(1.4, 1.2, 0.05, c.hole, 0, B.wallH + 1.2, z0 - 0.05); // the hayloft door, open: dark
  b.box(1.6, 0.1, 0.1, c.trim, 0, B.wallH + 1.85, z0 - 0.08);
  b.box(0.16, 0.16, 1.4, c.beam, 0, ridgeY - 0.25, z0 - 0.6); // the hay hood's beam
  b.box(0.6, 0.06, 1.5, c.roof, 0, ridgeY - 0.05, z0 - 0.6, 0, 0, 0.0);
  // The big doors slid wide along the front, X-braced, white-trimmed.
  for (const s of [-1, 1]) {
    b.push(s * (door.half + 1.35), 0, z0 - 0.12);
    b.box(2.6, door.h, 0.06, c.plank, 0, door.h / 2, 0);
    b.box(2.6, 0.12, 0.08, c.trim, 0, door.h - 0.06, -0.04);
    b.box(2.6, 0.12, 0.08, c.trim, 0, 0.1, -0.04);
    for (const t of [-1, 1]) b.box(0.12, door.h, 0.08, c.trim, t * 1.24, door.h / 2, -0.04);
    const diag = Math.hypot(2.5, door.h - 0.2);
    for (const t of [-1, 1]) b.box(0.1, diag, 0.07, c.trim, 0, door.h / 2, -0.05, 0, 0, t * Math.atan2(2.5, door.h - 0.2));
    b.pop();
  }
  b.box(hw * 2 + 0.6, 0.12, 0.12, c.trim, 0, door.h + 0.3, z0 - 0.22); // the door track
  // Trim at the corners.
  for (const sx of [-1, 1]) for (const sz of [z0, z1]) b.box(0.16, B.wallH, 0.16, c.trim, sx * hw, B.wallH / 2, sz);
  // The gambrel roof: tin in strips down each pitch, a rusty patch, the ridge cap.
  for (const s of [-1, 1]) {
    const pitches = [[hw + 0.3, B.wallH - 0.15, knee.x, knee.y], [knee.x, knee.y, 0, ridgeY]];
    pitches.forEach(([ax, ay, bx, by], j) => {
      const len = Math.hypot(ax - bx, ay - by) + 0.08;
      // The box's length along the pitch, from (s*ax, ay) to (s*bx, by): turned about z to lie along it.
      const ang = Math.atan2(by - ay, s * (bx - ax));
      for (let z = z0 - 0.4; z < z1 + 0.4 - 0.01; z += 1.1) {
        const zl = Math.min(1.1, z1 + 0.4 - z);
        const rusty = j === 0 && s > 0 && z > B.z && z < B.z + 3;
        b.box(len, 0.04, zl + 0.02, rusty ? c.roofRust : c.roof, (s * (ax + bx)) / 2, (ay + by) / 2 + 0.05, z + zl / 2, 0, 0, ang);
      }
    });
  }
  b.box(0.3, 0.12, B.depth + 0.9, c.roof, 0, ridgeY + 0.08, B.z);
  // Rafters seen from inside.
  for (let z = z0 + 1; z < z1; z += 2) {
    for (const s of [-1, 1]) {
      b.box(Math.hypot(hw - knee.x, knee.y - B.wallH), 0.14, 0.1, c.beam, (s * (hw + knee.x)) / 2, (B.wallH + knee.y) / 2 - 0.1, z, 0, 0, Math.atan2(knee.y - B.wallH, s * (knee.x - hw)));
      b.box(Math.hypot(knee.x, ridgeY - knee.y), 0.14, 0.1, c.beam, (s * knee.x) / 2, (knee.y + ridgeY) / 2 - 0.1, z, 0, 0, Math.atan2(ridgeY - knee.y, -s * knee.x));
    }
    b.box(hw * 2, 0.16, 0.12, c.beam, 0, B.wallH - 0.1, z);
  }

  // ---- inside ----
  // The stalls down the left (+x): the donkey's and the pony's, low walls, a trough and a hay rack each.
  for (const [i, zc] of [[0, cfg.animals.donkey[1]], [1, cfg.animals.pony[1]]]) {
    const zA = zc - 1.9;
    const zB = zc + 1.9;
    b.box(0.08, 1.25, 0.08, c.stall, 2.3, 0.62, zA);
    b.box(0.08, 1.25, 0.08, c.stall, 2.3, 0.62, zB);
    for (const y of [0.35, 0.75, 1.15]) {
      b.box(hw - 2.3, 0.14, 0.05, c.stall, (hw + 2.3) / 2, y, zA);
      if (i === 1) b.box(hw - 2.3, 0.14, 0.05, c.stall, (hw + 2.3) / 2, y, zB);
    }
    b.box(0.5, 0.35, 1.2, c.trough, hw - 0.35, 0.3, zc + 0.9); // the trough, full
    b.box(0.42, 0.04, 1.1, c.water, hw - 0.35, 0.46, zc + 0.9);
    b.box(0.35, 0.8, 1.3, c.stall, hw - 0.25, 1.3, zc - 0.7); // the hay rack, full
    b.box(0.3, 0.6, 1.2, c.hay, hw - 0.3, 1.32, zc - 0.7);
    if (i === 0) b.wall(2.3, zA, hw, zA, 0, 0.06, 1.25);
  }
  b.wall(2.3, cfg.animals.pony[1] + 1.9, hw, cfg.animals.pony[1] + 1.9, 0, 0.06, 1.25);
  // The python's tank on its table (the right, -x): a glass case (its frame; the glass doesn't show), bark, a branch.
  const T = { x: L(cfg.tank.x), z: cfg.tank.z };
  b.box(1.5, 0.06, 0.8, c.table, T.x, 0.82, T.z);
  for (const [dx, dz] of [[-0.68, -0.34], [0.68, -0.34], [-0.68, 0.34], [0.68, 0.34]]) b.box(0.07, 0.8, 0.07, c.table, T.x + dx, 0.4, T.z + dz);
  b.box(1.3, 0.05, 0.65, c.branch, T.x, 0.88, T.z); // the bark floor
  for (const [dx, dz] of [[-0.64, -0.31], [0.64, -0.31], [-0.64, 0.31], [0.64, 0.31]]) b.box(0.03, 0.62, 0.03, c.vanDark, T.x + dx, 1.16, T.z + dz);
  for (const dz of [-0.31, 0.31]) {
    b.box(1.3, 0.03, 0.03, c.vanDark, T.x, 1.47, T.z + dz);
    b.box(1.3, 0.03, 0.03, c.vanDark, T.x, 0.86, T.z + dz);
  }
  for (const dx of [-0.64, 0.64]) b.box(0.03, 0.03, 0.65, c.vanDark, T.x + dx, 1.47, T.z);
  b.box(0.08, 0.08, 1.0, c.branch, T.x, 1.05, T.z, 0.6, 0.3, 0); // the branch
  // The heat lamp hung over it: a cord, a tin shade, and the amber bulb (the glow mesh: unlit, no light).
  b.box(0.01, ridgeY - 2.1, 0.01, c.vanDark, T.x, (ridgeY + 2.1) / 2, T.z);
  b.put(new THREE.ConeGeometry(0.16, 0.18, 10, 1, true), c.roof, T.x, 2.0, T.z);
  glow(new THREE.SphereGeometry(0.07, 10, 8), c.lampGlow, T.x, 1.92, T.z);
  glow(new THREE.CircleGeometry(0.55, 16).rotateX(-Math.PI / 2), 0x3a2410, T.x, 0.915, T.z); // its warm light on the bark (painted, not lit)
  // A wooden chest of blankets by the door (left).
  b.box(1.0, 0.5, 0.55, c.chest, 3.9, 0.25, z0 + 0.7);
  b.box(0.8, 0.1, 0.45, c.blanket, 3.9, 0.55, z0 + 0.7);
  b.box(0.7, 0.08, 0.4, c.cloth, 3.9, 0.64, z0 + 0.7, 0.2);
  // Hay bales stacked at the back right.
  for (const [x, y, z] of [[-4.3, 0.25, z1 - 1.2], [-3.4, 0.25, z1 - 1.2], [-4.3, 0.75, z1 - 1.2], [-4.3, 0.25, z1 - 2.3]]) b.box(0.85, 0.48, 1.0, c.hay, x, y, z, b.rand() * 0.2);
  // The knife board on its stage at the back: thick planks on posts, the holes in the outline of a person.
  // Lantern-lit: the board and the stage's top are drawn unlit in the lanterns' warm tones (the glow mesh),
  // so the act reads by day and the stage glows a little at night. No light is added.
  const K = cfg.board;
  const gbox = (w, h, d, color, x, y, z) => glow(new THREE.BoxGeometry(w, h, d), color, x, y, z);
  b.box(K.width + 1.2, 0.28, 1.8, c.floor, 0, 0.14, K.z - 0.9); // the stage
  gbox(K.width + 1.2, 0.02, 1.8, c.stageLit, 0, 0.29, K.z - 0.9);
  b.box(K.width + 1.2, 0.05, 0.05, c.trim, 0, 0.3, K.z - 1.8);
  for (let i = 0; i < 9; i++) gbox(K.width / 9 - 0.01, K.height, 0.08, i % 2 ? c.boardLit : c.boardLit2, -K.width / 2 + (i + 0.5) * (K.width / 9), 0.3 + K.height / 2, K.z + 0.04);
  for (const s of [-1, 1]) b.box(0.12, K.height + 0.4, 0.12, c.beam, s * (K.width / 2 + 0.08), 0.3 + (K.height + 0.4) / 2, K.z + 0.1);
  for (const [x, y] of holeOutline()) gbox(0.018, 0.036, 0.012, c.hole, x, 0.3 + y, K.z - 0.002);
  // Two hurricane lanterns: one on a hook by the board, one on the post by the doors.
  for (const [x, y, z] of [[K.width / 2 + 0.35, 2.2, K.z - 0.2], [-door.half - 0.25, 2.1, z0 + 0.25]]) {
    b.box(0.16, 0.03, 0.16, c.vanDark, x, y + 0.18, z);
    b.box(0.02, 0.2, 0.02, c.vanDark, x, y + 0.3, z);
    glow(new THREE.CylinderGeometry(0.06, 0.07, 0.2, 8), c.lampGlow, x, y, z);
    b.box(0.17, 0.03, 0.17, c.vanDark, x, y - 0.11, z);
  }
  b.wall(-K.width / 2 - 0.6, K.z - 1.8, K.width / 2 + 0.6, K.z - 1.8, 0, 0.05, 0.3);
  b.spot('mark', 0, 0.3, cfg.mark.z);
  b.spot('board', 0, 0.3, K.z);
  b.spot('throwFrom', 0, 0, cfg.throwFrom.z);
  // The chalk line twelve paces back, and an X on the stage.
  b.box(1.4, 0.008, 0.06, c.trim, 0, 0.075, cfg.throwFrom.z);
  for (const t of [-1, 1]) b.box(0.4, 0.006, 0.05, c.trim, 0, 0.305, cfg.mark.z, t * 0.78);
  b.pop();

  // ---- the yard ----
  // The split-rail fence round it (an oval), the gate gap where the cars stand.
  const F = cfg.fence;
  const gateHalf = cfg.gate.carLength + 0.2;
  const ptsF = [];
  for (let i = 0; i <= F.posts; i++) {
    const a = (i / F.posts) * Math.PI * 2;
    ptsF.push({ x: F.x + Math.sin(a) * F.rx, z: F.z - Math.cos(a) * F.rz });
  }
  for (let i = 0; i < F.posts; i++) {
    const p = ptsF[i];
    const q = ptsF[i + 1];
    const inGate = (pt) => Math.abs(pt.x) < gateHalf && pt.z < F.z;
    if (inGate(p) && inGate(q)) continue;
    b.pushOnGround(p.x, 0, p.z);
    b.box(0.14, 1.3, 0.14, c.beam, 0, 0.65, 0, b.rand());
    b.pop();
    if (inGate(p) || inGate(q)) continue;
    const yaw = Math.atan2(q.x - p.x, q.z - p.z);
    const len = Math.hypot(q.x - p.x, q.z - p.z);
    for (const h of [0.5, 1.0]) {
      const y = (b.heightAt(p.x, p.z) + b.heightAt(q.x, q.z)) / 2 + h;
      b.box(0.09, 0.11, len + 0.15, c.beam, (p.x + q.x) / 2, y, (p.z + q.z) / 2, yaw, 0, (b.rand() - 0.5) * 0.1);
    }
    b.wall(p.x, p.z, q.x, q.z, 0, 0.08, 1.15, false);
  }
  // A gate post either side of the cars.
  for (const s of [-1, 1]) {
    b.pushOnGround(s * gateHalf, 0, cfg.gate.z);
    b.box(0.2, 1.5, 0.2, c.beam, 0, 0.75, 0);
    b.pop();
  }
  // The dead, laid out in neat rows (frame left: model +x), and a broom at the end.
  const R = cfg.rows;
  let n = 0;
  for (let r = 0; r < R.count; r++) {
    for (let i = 0; i < R.perRow; i++) {
      const x = L(R.x) - i * 0.62;
      const z = R.z + r * 2.1;
      b.pushOnGround(x, 0.02, z, Math.PI);
      corpse(b, n++);
      b.pop();
    }
  }
  b.pushOnGround(L(R.x) - R.perRow * 0.62, 0, R.z + R.count * 2.1, 0.3, 0.5, 0.2);
  b.box(0.035, 1.3, 0.035, c.broom, 0, 0.65, 0);
  b.box(0.3, 0.25, 0.08, c.straw, 0, 0.1, 0);
  b.pop();
  // Hay bales in the yard.
  for (const [x, z] of [[-6.5, 5.5], [-7.2, 6.6], [6.8, 8.2]]) {
    b.pushOnGround(L(x), 0.24, z, b.rand());
    b.box(0.85, 0.48, 1.0, c.hay, 0, 0, 0);
    b.pop();
    b.post(L(x), 0, z, 0.55, 0.5);
  }
  // His white van, the small wooden crucifix on its mirror.
  const V = cfg.van;
  b.pushOnGround(L(V.x), 0, V.z, (-V.yaw * Math.PI) / 180);
  b.box(1.95, 1.6, 4.9, c.van, 0, 1.15, 0);
  b.box(1.95, 0.3, 4.9, c.vanDark, 0, 0.25, 0);
  b.box(1.85, 0.6, 0.05, c.glassCar, 0, 1.55, 2.47, 0, 0.35, 0); // the windscreen
  for (const s of [-1, 1]) b.box(0.04, 0.5, 0.9, c.glassCar, s * 0.98, 1.6, 1.9);
  b.box(0.04, 1.2, 0.03, c.vanDark, -0.98, 1.1, 0.4); // the side door's seam
  for (const [x, zz] of [[-0.9, 1.6], [0.9, 1.6], [-0.9, -1.6], [0.9, -1.6]]) b.put(new THREE.CylinderGeometry(0.36, 0.36, 0.24, 12).rotateZ(Math.PI / 2), c.tyre, x, 0.36, zz);
  b.box(0.01, 0.12, 0.01, c.crucifix, 0, 1.72, 2.3); // the crucifix on its string, inside the windscreen
  b.box(0.05, 0.08, 0.012, c.crucifix, 0, 1.62, 2.3);
  b.box(0.035, 0.012, 0.012, c.crucifix, 0, 1.64, 2.3);
  b.pop();
  {
    const yaw = (-V.yaw * Math.PI) / 180;
    const ax = Math.sin(yaw) * 2.45;
    const az = Math.cos(yaw) * 2.45;
    b.wall(L(V.x) - ax, V.z - az, L(V.x) + ax, V.z + az, 0, 1.0, 2.0);
  }
  // The sign on the lane outside the gate (its painted face is the sign mesh).
  const S = cfg.sign;
  b.pushOnGround(L(S.x), 0, S.z, (-S.yaw * Math.PI) / 180 + Math.PI);
  for (const s of [-1, 1]) b.box(0.1, 1.9, 0.1, c.beam, s * 0.85, 0.95, 0.05);
  b.box(1.8, 1.15, 0.05, c.sign, 0, 1.45, 0.02);
  b.spot('sign', 0, 1.45, 0.06); // the painted face, toward the lane
  b.pop();
  b.spot('gate', 0, 0, cfg.gate.z);
  b.spot('yard', 0, 0, cfg.gate.z + 4);
  b.spot('doors', 0, 0, z0 + 0.5);
  b.spot('outside', 0, 0, cfg.gate.z - 4);

  const geometry = bakeParts(b.parts, { weather, baseAt: (x, y, z) => Math.min(b.heightAt(x, z), Math.abs(x) < hw + 0.2 && z > z0 - 0.2 && z < z1 + 0.2 ? fy : b.heightAt(x, z)), seed: 28 });
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  // Not shadowed: under its own roof the sun's shadow left the act's board in the dark by day (the torch does nights).
  mesh.receiveShadow = false;
  const glowGeo = bakeParts(glowParts, { weather: null });
  const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true });
  const glowMesh = new THREE.Mesh(glowGeo, glowMat);
  const group = new THREE.Group();
  group.name = 'milosBarn';
  group.add(mesh, glowMesh);
  // The sign's face.
  const tex = signTexture(cfg.signText, k);
  let sign = null;
  if (tex) {
    const sm = new THREE.MeshLambertMaterial({ map: tex, color: 0x9a9a9a });
    sign = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.05), sm);
    const sp = b.spots.sign;
    sign.position.set(sp.x, sp.y, sp.z);
    sign.rotation.y = Math.PI - (S.yaw * Math.PI) / 180; // facing back down the lane
    group.add(sign);
  }
  return {
    group,
    mesh,
    glow: glowMesh,
    sign,
    spots: b.spots,
    colliders: b.colliders,
    floorY: fy,
    dispose() {
      group.removeFromParent();
      geometry.dispose();
      material.dispose();
      glowGeo?.dispose();
      glowMat.dispose();
      if (sign) {
        sign.geometry.dispose();
        sign.material.map?.dispose();
        sign.material.dispose();
      }
    },
  };
}

// One of the cars across the lane: its own mesh (it swings open), origin at its back end, nose toward +z.
export function buildGateCar(cfg, paint, weather = null) {
  const b = new SetBuilder({ colors: cfg.look.colors }, null, paint);
  car(b, paint);
  const geometry = bakeParts(b.parts, { weather: weather ? { ...weather, rust: [paint] } : null, baseAt: () => 0, seed: paint & 255 });
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  return {
    mesh,
    dispose() {
      mesh.removeFromParent();
      geometry.dispose();
      material.dispose();
    },
  };
}
