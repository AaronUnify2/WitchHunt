// Milo (Session 24; DESIGN.md "Milo's barn"): the knife thrower from
// Aaron's story The Lone Clown, alive in his barn and permanently in
// character. Two looks:
//  - the clown. Nov 26: as Aaron's concept art has him (clownBody below:
//    the striped, bloodied jumpsuit, the scalloped collar, the green puffs of
//    hair round a bald head, the red nose). Kept from Sessions 25-26 on his
//    word: very big shoes, very long arms (his wrists below his knees), too
//    long fingers, eyes that glow faintly, the knife in his hand. (The white
//    polka-dot suit of Sessions 25-26, after docs/reference/milo-lone-clown.jpg,
//    is gone.)
//  - the man (the morning after): 1.75 m, a head taller than the clown (Aaron), broad-shouldered, dark-haired, in
//    a flannel shirt, jeans and boots, his face washed clean, a tin mug of
//    instant coffee in his hand. Session 26 (Aaron: the man's clothes skin
//    tight and his belt far too loose): redone (manBody below).
// He never attacks Tom and can't be hurt.
//
// The figure kit's specs and his poses (for render/PosedFigure.js). Model
// space: faces +z, feet at y = 0, right hand on -x; built in the kit's
// 1.7 m scale and stretched to his height.

import * as THREE from 'three';
import { arm, legsWalk } from './PosedFigure.js';

const SIDES = [
  ['R', -1],
  ['L', 1],
];

// Where his wrists hang (the kit's scale), by look: the clown's below his
// knees (0.5); the man's near them.
const WRIST = { clown: 0.44, man: 0.74 };

// The human skeleton with his arms.
function joints(look = 'clown') {
  const w = WRIST[look];
  const j = [
    ['root', null, 0, 0, 0],
    ['hips', 'root', 0, 0.95, 0],
    ['spine', 'hips', 0, 1.12, 0],
    ['chest', 'spine', 0, 1.32, 0],
    ['neck', 'chest', 0, 1.46, 0],
    ['head', 'neck', 0, 1.53, 0.01],
  ];
  for (const [n, s] of SIDES) {
    j.push([`shoulder${n}`, 'chest', s * 0.19, 1.42, 0]);
    j.push([`elbow${n}`, `shoulder${n}`, s * 0.23, (1.42 + w) / 2 + 0.01, 0]);
    j.push([`wrist${n}`, `elbow${n}`, s * 0.24, w, 0.02]);
    j.push([`hip${n}`, 'hips', s * 0.1, 0.92, 0]);
    j.push([`knee${n}`, `hip${n}`, s * 0.1, 0.5, 0.01]);
    j.push([`ankle${n}`, `knee${n}`, s * 0.1, 0.08, -0.02]);
  }
  return j;
}

export const MILO_JOINTS = joints('clown');
export const MILO_LOOKS = ['clown', 'man'];

// The man's body. Session 26 (Aaron: "his human form is in skin tight
// clothing and his belt is super loose"): a loose flannel shirt tucked in and
// bloused over the belt, its sleeves rolled to the elbow, roomy jeans,
// work boots, and a belt that sits snug on his waist (an oval band the shape
// of his hips there, not a hoop) with its buckle.
function manBody(W) {
  const masses = [
    // Jeans: a straight, roomy seat.
    ['hips', null, 0, 0.97, 0, 0.17, 0.15, 0.125, 'trousers'], // its top at the belt, near full width
    // The shirt: loose, hanging straight from his chest, its tail out over the hips.
    ['spine', 'chest', 0, 1.15, 0.005, 0.185, 0.2, 0.13, 'shirt'],
    ['chest', 'spine', 0, 1.32, 0.008, 0.195, 0.14, 0.13, 'shirt'],
    ['hips', 'spine', 0, 1.06, 0.004, 0.18, 0.05, 0.132, 'shirt'], // bloused out over the belt
    ['chest', null, -0.085, 1.43, -0.012, 0.085, 0.036, 0.06, 'shirt', [0, 0, 0.42]],
    ['chest', null, 0.085, 1.43, -0.012, 0.085, 0.036, 0.06, 'shirt', [0, 0, -0.42]],
    // A button placket and two chest pockets.
    ['chest', 'spine', 0, 1.25, 0.136, 0.012, 0.2, 0.006, 'check'],
    ['neck', null, 0, 1.475, 0, 0.044, 0.05, 0.044, 'face'],
    ['head', null, 0, 1.6, 0.012, 0.082, 0.128, 0.098, 'face'],
    ['head', null, 0, 1.59, 0.106, 0.014, 0.022, 0.018, 'face'],
    // The belt: just above the shirt's tail at the front, where it's tucked in at the buckle;
    // an oval band a hair proud of the jeans (it's inside them but for its rim), and the buckle.
    ['hips', null, 0, 1.03, 0, 0.166, 0.02, 0.124, 'leather'],
    ['hips', null, 0, 1.03, 0.13, 0.03, 0.024, 0.008, 'tin'],
    // Dark hair.
    ['head', null, 0, 1.665, -0.01, 0.088, 0.075, 0.1, 'hair'],
    ['head', null, 0, 1.62, -0.07, 0.082, 0.09, 0.05, 'hair'],
    ['head', null, 0, 1.675, 0.06, 0.07, 0.04, 0.04, 'hair'], // falling across his forehead
  ];
  const limbs = [];
  for (const [n, s] of SIDES) {
    masses.push(['chest', `shoulder${n}`, s * 0.17, 1.405, 0, 0.068, 0.06, 0.068, 'shirt']);
    masses.push(['head', null, s * 0.086, 1.6, 0, 0.012, 0.028, 0.018, 'face']);
    masses.push(['head', null, s * 0.032, 1.62, 0.092, 0.012, 0.011, 0.006, 'eyes']);
    masses.push([`wrist${n}`, null, s * 0.24, W - 0.05, 0.03, 0.028, 0.052, 0.02, 'face']);
    masses.push(['chest', null, s * 0.085, 1.36, 0.13, 0.045, 0.045, 0.012, 'shirt']); // a pocket
    // Work boots: chunky, with a heel.
    masses.push([`ankle${n}`, null, s * 0.1, 0.05, 0.05, 0.06, 0.055, 0.13, 'shoes']);
    // The sleeves: loose to the elbow, rolled there in a fat cuff; bare forearms.
    limbs.push([`shoulder${n}`, `elbow${n}`, 0.066, 0.062, 'shirt', 0.18]);
    masses.push([`elbow${n}`, null, s * 0.235, (1.42 + W) / 2 - 0.02, 0, 0.064, 0.03, 0.064, 'shirt']);
    limbs.push([`elbow${n}`, `wrist${n}`, 0.042, 0.032, 'face', 0.08]);
    // Jeans: a roomy straight leg, a little bagged at the knee, breaking over the boot.
    limbs.push([`hip${n}`, `knee${n}`, 0.1, 0.088, 'trousers', 0.12]);
    limbs.push([`knee${n}`, `ankle${n}`, 0.088, 0.084, 'trousers', 0.06]);
    masses.push([`ankle${n}`, null, s * 0.1, 0.13, 0.0, 0.088, 0.04, 0.09, 'trousers']);
  }
  return { masses, limbs };
}

// The clown. Nov 26 (Aaron's concept art, "match this image as closely as
// possible"; the white polka-dot suit of Sessions 25-26 is gone): a slim,
// gangly figure in a loose one-piece jumpsuit, off-white with narrow rust
// pinstripes, grimy and blotched with old blood. Dropped shoulders under a
// two-tier scalloped collar of the same stripe; loose sleeves bloused into
// rust cuffs; straight loose legs gathered at the ankle into rust cuffs;
// three big red buttons down the front. A bald, white-painted head with big
// frizzy green puffs of hair round the sides and back; a red ball nose; a
// red smirk with painted lines up to the nose; sleepy, half-lidded eyes in
// grey shadow under thin painted arches. Bare, bony, pale hands.
// Kept from before, on Aaron's word (Nov 26): huge shoes (now in the art's
// red-brown leather, laced), his eyes' faint glow, the knife in his hand,
// and arms so long his wrists hang below his knees (and his fingers are too
// long).
//
// The stripes are painted in vertex colours, so the striped parts are built
// fine enough to carry them, each round its own axis (a limb's stripes run
// down the limb): STRIPES below. Each stripe falls on a column of vertices.

const TAU = Math.PI * 2;
const FLAT = 0.74; // the trunk's depth / width
// Stripes round each striped part: how many, and the segments its mesh is built with (4 to a stripe).
export const STRIPES = { suit: 21, arm: 8, leg: 10 };
const SEG = { suit: STRIPES.suit * 4, arm: STRIPES.arm * 4, leg: STRIPES.leg * 4 };
const COLLAR = [18, 16]; // the collar's scallops, in its two tiers
// The puffs of hair: centre, radii, and how many wisps of frizz stand out of each.
const HAIR = [
  [-0.135, 1.615, -0.03, 0.082, 0.098, 0.102, 40],
  [0.135, 1.615, -0.03, 0.082, 0.098, 0.102, 40],
  [0, 1.605, -0.108, 0.125, 0.082, 0.066, 34],
];

// Where the axis of the clown's arm and leg runs at height y (the rest pose; the kit's scale; s: -1 right, 1 left).
function armAxis(y, s, W) {
  const elbowY = (1.42 + W) / 2 + 0.01;
  if (y >= elbowY) return { x: s * (0.19 + (0.04 * (1.42 - y)) / (1.42 - elbowY)), z: 0 };
  const t = Math.min(1, (elbowY - y) / (elbowY - W));
  return { x: s * (0.23 + 0.01 * t), z: 0.02 * t };
}
function legAxis(y, s) {
  return { x: s * 0.1, z: y >= 0.5 ? (0.01 * (0.92 - y)) / 0.42 : 0.01 - (0.03 * (0.5 - y)) / 0.42 };
}

// How much of a stripe a point at angle `a` round its axis is in, of `n` round (1 on a stripe's column of
// vertices, 0 between). Pure (the tests).
export function stripeAt(a, n, width = 0.13) {
  const f = (a / TAU) * n;
  return Math.abs(f - Math.round(f)) < width ? 1 : 0;
}

// Smooth value noise in [0, 1): the grime and the blood.
function hash3(x, y, z) {
  const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return h - Math.floor(h);
}
function noise3(x, y, z) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const w = fz * fz * (3 - 2 * fz);
  const l = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => hash3(ix + dx, iy + dy, iz + dz);
  return l(l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v), l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v), w);
}

// The old blood on the suit, 0 (none) to 1: blotches a hand across, heavier down the front and the legs. Pure (the tests).
export function bloodAt(q, m = {}) {
  const n = turned(q, 18, 0) * 0.55 + turned(q, 40, 1) * 0.3 + turned(q, 80, 2) * 0.15;
  const front = q.z > 0.05 ? 0.03 : 0;
  const low = q.y < 0.6 ? 0.03 : 0;
  const t = (m.blood ?? 0.55) - front - low;
  return Math.max(0, Math.min(1, (n - t) / 0.06));
}

// Noise at frequency f in a turned frame (each octave its own), so no blotch lines up with the axes.
const TURNS = [
  [0.36, 0.48, -0.8, -0.8, 0.6, 0, 0.48, 0.64, 0.6],
  [0.6, -0.64, 0.48, 0.8, 0.48, -0.36, 0, 0.6, 0.8],
  [-0.48, 0.6, 0.64, 0.64, 0.8, -0.36, -0.6, 0, -0.8],
];
function turned(q, f, i) {
  const r = TURNS[i];
  return noise3((r[0] * q.x + r[1] * q.y + r[2] * q.z) * f + i * 17.1, (r[3] * q.x + r[4] * q.y + r[5] * q.z) * f + 3.7, (r[6] * q.x + r[7] * q.y + r[8] * q.z) * f + i * 5.3);
}

// The head's surface (the clown's head mass, before the kit's head scale): z at (x, y), plus `lift`.
const HEAD = { y: 1.6, z: 0.012, rx: 0.09, ry: 0.122, rz: 0.1 };
function onHead(x, y, lift = 0) {
  const k = 1 - (x / HEAD.rx) ** 2 - ((y - HEAD.y) / HEAD.ry) ** 2;
  return HEAD.z + HEAD.rz * Math.sqrt(Math.max(0, k)) + lift;
}

// A ring of flat, scalloped pieces lying round the neck (the collar): each a flattened ellipsoid,
// its long axis pointing out, drooping by `droop` (radians).
function collarTier(out, cy, rx, rz, n, size, droop, offset = 0) {
  for (let i = 0; i < n; i++) {
    const a = ((i + offset) / n) * TAU;
    out.push(['chest', 'neck', Math.sin(a) * rx, cy, Math.cos(a) * rz, size[0], size[1], size[2], 'collar', [droop, a, 0], false, [8, 4]]);
  }
}

// A puff of the clown's hair: a sphere roughed up by noise into a lumpy, frizzy cloud (a sheet: the kit takes the
// geometry as it is).
function hairPuff(cx, cy, cz, rx, ry, rz) {
  const g = new THREE.SphereGeometry(1, 30, 20);
  g.deleteAttribute('uv');
  const p = g.attributes.position;
  const q = { x: 0, y: 0, z: 0 };
  for (let i = 0; i < p.count; i++) {
    const nx = p.getX(i);
    const ny = p.getY(i);
    const nz = p.getZ(i);
    q.x = cx + nx * rx;
    q.y = cy + ny * ry;
    q.z = cz + nz * rz;
    const bump = (turned(q, 22, 0) - 0.5) * 0.045 + (turned(q, 50, 1) - 0.5) * 0.022 + (turned(q, 110, 2) - 0.5) * 0.01;
    p.setXYZ(i, cx + nx * (rx + bump), cy + ny * (ry + bump), cz + nz * (rz + bump));
  }
  return g;
}

function clownBody(W, c) {
  const masses = [];
  const limbs = [];
  const tubes = [];
  const sheets = [];
  // The jumpsuit's trunk: loose and boxy, an oval, fine enough round to carry the stripes. The lowest piece
  // starts at the seat's widest.
  tubes.push(['hips', 0, 0.87, 0, 0, 1.12, 0, 0.176, 0.178, 'suit', FLAT, 0.02, [SEG.suit, 8]]);
  limbs.push(['spine', 'chest', 0.178, 0.19, 'suit', 0.03, FLAT, 0, [SEG.suit, 8]]);
  limbs.push(['chest', 'neck', 0.19, 0.14, 'suit', 0, FLAT, 0, [SEG.suit, 6]]);
  masses.push(['hips', null, 0, 0.87, 0, 0.174, 0.1, 0.174 * FLAT, 'suit', null, false, [SEG.suit, 10]]); // the seat: its widest where the trunk starts, so they meet without a rim
  // Bands of cloth under the trunk's joins (the waist, the chest): hidden when he stands straight, they close
  // the gap when he bends or twists.
  masses.push(['spine', 'hips', 0, 1.12, 0, 0.174, 0.045, 0.174 * FLAT, 'suit', null, false, [SEG.suit, 4]]);
  masses.push(['chest', 'spine', 0, 1.32, 0, 0.186, 0.045, 0.186 * FLAT, 'suit', null, false, [SEG.suit, 4]]);
  masses.push(['neck', null, 0, 1.475, 0, 0.042, 0.05, 0.042, 'face']);
  // The collar: two tiers of scalloped pieces lying over his shoulders, out to their edges, and a band round the neck.
  collarTier(masses, 1.43, 0.165, 0.14, COLLAR[0], [0.062, 0.018, 0.1], 0.3);
  collarTier(masses, 1.47, 0.11, 0.095, COLLAR[1], [0.05, 0.017, 0.07], 0.42, 0.5);
  tubes.push(['neck', 0, 1.47, 0, 0, 1.505, 0, 0.055, 0.05, 'collar', 1, 0, [20, 2]]);
  // Three big red buttons down the front.
  for (const [bone, y, z] of [['chest', 1.33, 0.147], ['spine', 1.2, 0.146], ['spine', 1.07, 0.14]]) masses.push([bone, null, 0, y, z, 0.034, 0.034, 0.018, 'button', null, false, [12, 8]]);
  // The head: white, bald; a chin under the paint.
  masses.push(['head', null, 0, HEAD.y, HEAD.z, HEAD.rx, HEAD.ry, HEAD.rz, 'face']);
  masses.push(['head', null, 0, 1.502, onHead(0, 1.502) - 0.022, 0.042, 0.024, 0.026, 'face', null, false, [12, 8]]);
  // The hair: big frizzy puffs round the sides and the back (lumpy clouds, wisps of frizz standing out of
  // them), none over the crown.
  let seed = 1;
  for (const [cx, cy, cz, rx, ry, rz, wisps] of HAIR) {
    sheets.push({ bone: 'head', geometry: hairPuff(cx, cy, cz, rx, ry, rz), key: 'wig', from: [cx, cy, cz], to: [cx, cy, cz] });
    for (let i = 0; i < wisps; i++) {
      const y = 1 - (2 * (i + 0.5)) / wisps;
      const r = Math.sqrt(1 - y * y);
      const a = i * 2.39996;
      const nx = Math.cos(a) * r;
      const nz = Math.sin(a) * r;
      const px = cx + nx * rx * 0.95;
      const py = cy + y * ry * 0.95;
      const pz = cz + nz * rz * 0.95;
      if (pz > 0.03 && Math.abs(px) < 0.1) continue; // clear of his face
      if (onHead(px, py) > pz && Math.abs(px) < HEAD.rx * 0.9) continue; // inside his head
      const h = hash3(seed++, 3, 7);
      const l = 0.01 + h * 0.016;
      const dx = nx + (hash3(seed, 1, 5) - 0.5) * 1.2;
      const dy = y + (hash3(seed, 7, 2) - 0.5) * 1.2;
      const dz = nz + (hash3(seed, 4, 9) - 0.5) * 1.2;
      const d = Math.hypot(dx, dy, dz) || 1;
      tubes.push(['head', px, py, pz, px + (dx / d) * l, py + (dy / d) * l, pz + (dz / d) * l, 0.006, 0.0012, 'wig2', 1, 0, [3, 1]]);
    }
  }
  // The face, painted on: a red ball nose; the smirk, its corners turned up, and thin red lines from the nose
  // down to its corners; sleepy eyes (a slit of the glow under a heavy lid) in grey shadow; thin dark arches above.
  masses.push(['head', null, 0, 1.588, onHead(0, 1.588) + 0.012, 0.027, 0.026, 0.026, 'nose']);
  for (const [y0, h0, up] of [[1.552, 0.0062, 0.003], [1.5435, 0.0075, 0.0045]]) {
    // The upper lip and the lower.
    for (let i = -2; i <= 2; i++) {
      const t = i / 2;
      const x = t * 0.03;
      const y = y0 + up * t * t;
      masses.push(['head', null, x, y, onHead(x, y, -0.0025), 0.012, h0 * (1 - 0.45 * t * t), 0.005, 'grin', [0, 0, t * up * 30], true]);
    }
  }
  for (const [n, s] of SIDES) {
    masses.push(['head', null, s * (HEAD.rx + 0.003), 1.6, 0, 0.012, 0.028, 0.018, 'face', null, false, [8, 6]]); // an ear
    tubes.push(['head', s * 0.021, 1.574, onHead(s * 0.021, 1.574, 0.0004), s * 0.038, 1.558, onHead(s * 0.038, 1.558, 0.0004), 0.0016, 0.0012, 'grin']);
    const ex = s * 0.034;
    masses.push(['head', null, ex, 1.617, onHead(ex, 1.617, -0.006), 0.026, 0.019, 0.009, 'socket', [0, s * 0.35, 0], false, [10, 6]]);
    masses.push(['head', null, ex, 1.6155, onHead(ex, 1.6155, -0.001), 0.012, 0.0045, 0.005, 'eyes', [0, s * 0.35, 0], true]); // they glow (glow.eyes)
    masses.push(['head', null, ex, 1.6205, onHead(ex, 1.6205, -0.0005), 0.0145, 0.0026, 0.005, 'brow', [0, s * 0.35, 0], true]); // the heavy lid's line
    // The painted arches: up from beside his nose to a peak high on the brow, and down again.
    const arch = [[0.014, 1.638], [0.035, 1.669], [0.059, 1.643]];
    for (let k = 0; k < 2; k++) {
      const [x0, y0] = arch[k];
      const [x1, y1] = arch[k + 1];
      tubes.push(['head', s * x0, y0, onHead(s * x0, y0, 0.0008), s * x1, y1, onHead(s * x1, y1, 0.0008), 0.0021, 0.0021, 'brow']);
    }
    // The sleeves: loose, their tops dropped off the shoulder (under the collar), bloused into a rust cuff at the wrist.
    const elbowY = (1.42 + W) / 2 + 0.01;
    masses.push(['chest', `shoulder${n}`, s * 0.18, 1.4, 0, 0.088, 0.074, 0.084, 'plain', null, false, [14, 10]]); // the dropped shoulder, over the sleeve's top
    limbs.push([`shoulder${n}`, `elbow${n}`, 0.078, 0.068, `arm${n}`, 0.1, 1, 0, [SEG.arm, 10]]);
    masses.push([`elbow${n}`, null, s * 0.23, elbowY, 0, 0.065, 0.065, 0.065, `arm${n}`, null, false, [SEG.arm, 8]]); // under the sleeve (shows when he bends it)
    limbs.push([`elbow${n}`, `wrist${n}`, 0.068, 0.048, `arm${n}`, 0.28, 1, 0, [SEG.arm, 12]]);
    tubes.push([`elbow${n}`, s * 0.239, W + 0.055, 0.019, s * 0.24, W - 0.004, 0.02, 0.052, 0.05, 'cuff', 1, 0, [16, 3]]);
    // The hand: bare, pale, big and bony, the fingers too long.
    tubes.push([`wrist${n}`, s * 0.24, W + 0.01, 0.02, s * 0.241, W - 0.035, 0.022, 0.023, 0.022, 'hand', 1, 0, [10, 2]]);
    masses.push([`wrist${n}`, null, s * 0.244, W - 0.068, 0.028, 0.02, 0.055, 0.037, 'hand', null, false, [12, 8]]);
    for (let f = 0; f < 4; f++) {
      const fz = 0.004 + f * 0.015;
      const len = f === 1 || f === 2 ? 0.12 : 0.105;
      masses.push([`wrist${n}`, null, s * 0.244, W - 0.113, fz, 0.0115, 0.011, 0.0105, 'hand', null, true]); // a knuckle
      tubes.push([`wrist${n}`, s * 0.244, W - 0.113, fz, s * 0.233, W - 0.113 - len, fz + 0.009, 0.0095, 0.006, 'hand', 1, 0, [6, 3]]);
    }
    tubes.push([`wrist${n}`, s * 0.236, W - 0.045, 0.06, s * 0.226, W - 0.117, 0.076, 0.0105, 0.0065, 'hand']); // the thumb
    // The legs: straight and loose, gathered at the ankle into a rust cuff, the cloth bunched over it.
    masses.push([`hip${n}`, 'hips', s * 0.1, 0.92, 0, 0.1, 0.1, 0.1, `leg${n}`, null, false, [SEG.leg, 8]]); // the top of the leg, under the trunk
    limbs.push([`hip${n}`, `knee${n}`, 0.104, 0.09, `leg${n}`, 0.05, 1, 0, [SEG.leg, 10]]);
    masses.push([`knee${n}`, null, s * 0.1, 0.5, 0.01, 0.086, 0.084, 0.086, `leg${n}`, null, false, [SEG.leg, 8]]); // under the trouser (shows when he bends it)
    limbs.push([`knee${n}`, `ankle${n}`, 0.09, 0.06, `leg${n}`, 0.2, 1, 0, [SEG.leg, 12]]);
    tubes.push([`ankle${n}`, s * 0.1, 0.195, -0.015, s * 0.1, 0.13, -0.02, 0.068, 0.066, 'cuff', 1, 0, [16, 3]]);
    // The shoes: very long, round-toed, red-brown leather, laced, on a dark sole; a boot's shaft round the ankle.
    const shoe = c.shoe ?? 0.2;
    const sx = s * 0.11;
    masses.push([`ankle${n}`, null, sx, 0.065, 0.05 + shoe * 0.5, 0.08, 0.065, 0.12 + shoe, 'shoes']);
    masses.push([`ankle${n}`, null, sx, 0.078, 0.2 + shoe * 0.7, 0.088, 0.07, 0.11, 'shoes']); // the bulb of the toe
    masses.push([`ankle${n}`, null, sx, 0.016, 0.06 + shoe * 0.5, 0.086, 0.02, 0.13 + shoe, 'sole', null, false, [16, 6]]);
    tubes.push([`ankle${n}`, s * 0.1, 0.05, -0.02, s * 0.1, 0.16, -0.02, 0.062, 0.059, 'shoes', 1, 0, [12, 2]]);
    for (let k = 0; k < 4; k++) {
      const z = 0.02 + k * 0.035;
      const y = 0.065 + 0.065 * Math.sqrt(Math.max(0, 1 - ((z - (0.05 + shoe * 0.5)) / (0.12 + shoe)) ** 2)) + 0.003;
      tubes.push([`ankle${n}`, sx - 0.028, y - 0.006, z, sx + 0.028, y - 0.006, z + 0.01, 0.0045, 0.0045, 'lace', 1, 0, [5, 1]]);
    }
  }
  return { masses, limbs, tubes, sheets };
}

// The clown's paint: the stripes round each part's own axis, the grime, the blood; the collar's stripes
// run out from his neck; his crown a shade pinker than the greasepaint on his face.
function paintClown(key, q, out, colours, W, m) {
  let a = null;
  let n = 0;
  if (key === 'suit') {
    a = Math.atan2(q.x, q.z / FLAT);
    n = STRIPES.suit;
  } else if (key === 'armR' || key === 'armL') {
    const ax = armAxis(q.y, key === 'armR' ? -1 : 1, W);
    a = Math.atan2(q.x - ax.x, q.z - ax.z);
    n = STRIPES.arm;
  } else if (key === 'legR' || key === 'legL') {
    const ax = legAxis(q.y, key === 'legR' ? -1 : 1);
    a = Math.atan2(q.x - ax.x, q.z - ax.z);
    n = STRIPES.leg;
  } else if (key === 'collar') {
    // Rust, with a pale line down the middle of each piece where it catches the light.
    a = Math.atan2(q.x, q.z);
    const lower = q.y < 1.452;
    if (stripeAt(lower ? a : a - (0.5 / COLLAR[1]) * TAU, COLLAR[lower ? 0 : 1], 0.09)) out.lerp(colours.suit, 0.6);
    out.lerp(colours.stain, bloodAt(q, m) * 0.6);
    return;
  } else if (key === 'wig') {
    // Frizz: light and dark in tangles.
    const t = turned(q, 45, 2);
    out.lerp(t > 0.5 ? colours.wig3 : colours.wig2, Math.min(1, Math.abs(t - 0.5) * 2.2));
    return;
  } else if (key === 'face') {
    const k = Math.max(0, Math.min(1, (q.y - 1.665) / 0.04));
    if (k) out.lerp(colours.scalp, k);
    return;
  } else if (key !== 'plain') {
    return;
  }
  if (a !== null && stripeAt(a, n)) out.copy(colours.stripe);
  // Grime: a dull, uneven dirt, heavier low down.
  const g = 0.18 + turned(q, 5, 1) * 0.35 + Math.max(0, Math.min(1, (0.45 - q.y) / 0.4)) * 0.3;
  out.lerp(colours.grime, g);
  out.lerp(colours.stain, bloodAt(q, m) * 0.9);
}

// m: config.milo. look: 'clown' or 'man'.
export function miloSpec(m, look = 'clown') {
  const clown = look === 'clown';
  const W = WRIST[look];
  const built = clown ? clownBody(W, m.clown ?? {}) : manBody(W);
  const { masses, limbs } = built;
  const tubes = built.tubes ?? [];
  const sheets = built.sheets ?? [];
  const rings = [];
  const looks = m.looks[look];
  if (clown) {
    // His knife, in his right hand (the ones he throws are the barn's: encounters/MiloBarn.js).
    tubes.push(['wristR', -0.238, W - 0.09, 0.06, -0.238, W - 0.15, 0.075, 0.01, 0.009, 'leather']); // the handle
    tubes.push(['wristR', -0.238, W - 0.15, 0.075, -0.238, W - 0.3, 0.105, 0.014, 0.002, 'steel', 0.25, 0, [8, 2]]); // the blade
  } else {
    // The flannel's collar; the tin mug in his right hand: "Instant. Sorry."
    rings.push(['neck', 0, 1.45, 0.005, 0.062, 0.017, 'shirt', [Math.PI / 2, 0, 0]]);
    tubes.push(['wristR', -0.24, W - 0.14, 0.075, -0.24, W - 0.05, 0.075, 0.036, 0.038, 'tin']);
    masses.push(['wristR', null, -0.24, W - 0.057, 0.075, 0.032, 0.004, 0.032, 'coffee']);
    rings.push(['wristR', -0.24, W - 0.095, 0.118, 0.022, 0.006, 'tin', [0, Math.PI / 2, 0]]);
  }
  return {
    joints: joints(look),
    masses,
    limbs,
    tubes,
    rings,
    sheets,
    height: clown ? m.height : (m.manHeight ?? m.height),
    width: m.widths[look],
    head: clown ? 1.18 : 1.04, // Session 26: the clown's a touch bigger (Nov 26: bigger again, as in the art)
    // The clown's striped parts share the suit's colour (each key is a part, so its stripes know their axis).
    colours: clown ? { ...looks, armR: looks.suit, armL: looks.suit, legR: looks.suit, legL: looks.suit, plain: looks.suit } : looks,
    // Session 26: the clown's eyes give off a faint light of their own (no light is added: the
    // figure's shader shows their colour in the dark).
    glow: clown ? { eyes: m.eyeGlow ?? 1 } : undefined,
    paint(key, q, out, colours) {
      if (clown) paintClown(key, q, out, colours, W, m.clown ?? {});
      else if (key === 'shirt') {
        // Flannel: a check.
        const a = Math.sin(q.x * 70) > 0.2;
        const b = Math.sin(q.y * 70) > 0.2;
        if (a && b) out.copy(colours.check);
        else if (a || b) out.lerp(colours.check, 0.5);
      }
    },
  };
}

// ---- his poses ---------------------------------------------------------------------------------

// m.state, the clown's: 'idle' (bouncing on his toes), 'dance', 'bow',
// 'beckon', 'throw' (timer: the wind-up and the knife away), 'push' (the
// car gates: one hand), 'indignant' ("I was in character!"). The man's:
// 'stand', 'offer' (the mug held out). 'walk' for either.
export function miloPose(h, m, t) {
  const look = Math.max(-1, Math.min(1, m.look ?? 0));
  switch (m.state) {
    case 'dance': {
      // Chaos: nothing in time with anything else.
      const a = Math.sin(t * 7.1);
      const b = Math.sin(t * 5.3 + 1);
      const c = Math.sin(t * 9.7 + 2);
      h.set('hips', 0, b * 0.3, a * 0.18);
      h.set('spine', 0.1 * c, -b * 0.25, -a * 0.2);
      h.set('chest', 0.1, 0, a * 0.12);
      h.set('neck', 0, look * 0.5, -a * 0.25);
      h.set('head', -0.1, 0, c * 0.3);
      arm(h, 'R', 1.4 + a * 1.1, 0.6 + c * 0.5, 0.9 + b * 0.7);
      arm(h, 'L', 1.1 - c * 1.2, 0.8 + a * 0.5, 0.9 - a * 0.7);
      h.set('hipR', -0.5 - Math.max(0, a) * 0.9, 0, -0.15);
      h.set('kneeR', 0.5 + Math.max(0, a) * 1.3);
      h.set('hipL', -0.2 - Math.max(0, -a) * 0.9, 0, 0.15);
      h.set('kneeL', 0.3 + Math.max(0, -a) * 1.3);
      h.rise((Math.abs(b) * 0.1 - 0.06) * h.k);
      break;
    }
    case 'bow': {
      // A deep, slow bow from the hips, one arm swept out wide, a foot drawn back.
      const k = 0.5 - 0.5 * Math.cos(Math.min(1, (m.timer ?? 0) / 0.9) * Math.PI);
      h.set('hips', 0.5 * k);
      h.set('spine', 0.5 * k);
      h.set('chest', 0.3 * k);
      h.set('neck', -0.5 * k, look * 0.4);
      arm(h, 'R', 0.2, 1.3 * k, 0.15);
      arm(h, 'L', 0.9 * k, -0.4 * k, 1.9 * k); // across his middle
      h.set('hipL', 0.35 * k);
      h.set('kneeL', 0.3 * k);
      h.set('hipR', -0.5 * k);
      h.set('kneeR', 0.25 * k);
      break;
    }
    case 'beckon': {
      // Leaning in, one long arm out, the hand curling you closer.
      const curl = Math.sin(t * 5);
      h.set('spine', 0.18, 0.15);
      h.set('chest', 0.1, 0.15);
      h.set('neck', 0, look * 0.5, 0.25);
      h.set('head', -0.1, 0, 0.15 + Math.sin(t * 1.3) * 0.1);
      arm(h, 'L', 1.35, 0.25, 0.5 + Math.max(0, curl) * 0.9);
      h.set('wristL', -Math.max(0, curl) * 0.9, 0, 0);
      arm(h, 'R', -0.2, 0.25, 0.4);
      h.set('kneeR', 0.2);
      h.set('hipR', -0.1);
      h.rise(Math.abs(Math.sin(t * 2.5)) * 0.02 * h.k);
      break;
    }
    case 'throw': {
      // The wind-up (the knife back past his ear), the throw, the follow-through.
      const T = m.timer ?? 0;
      const wind = Math.min(1, T / 0.55);
      const snap = Math.max(0, Math.min(1, (T - 0.55) / 0.12));
      const back = wind * (1 - snap);
      h.set('hips', 0, 0.35 * back - 0.3 * snap);
      h.set('spine', -0.12 * back + 0.3 * snap, 0.25 * back - 0.3 * snap);
      h.set('chest', -0.1 * back + 0.2 * snap, 0.3 * back - 0.4 * snap);
      h.set('neck', 0, look * 0.3 - 0.4 * back + 0.5 * snap);
      arm(h, 'R', 2.6 * back + 1.5 * snap, 0.35 * back, 1.9 * back + 0.1 * snap);
      h.set('wristR', 0.6 * back - 0.8 * snap, 0, 0);
      arm(h, 'L', 1.2 * back + 0.2 * snap, 0.3, 0.3); // the other hand points at the target
      h.set('hipL', -0.45 * back - 0.7 * snap);
      h.set('kneeL', 0.2 + 0.6 * snap);
      h.set('hipR', 0.3 * back + 0.4 * snap);
      h.set('kneeR', 0.3 * back + 0.3 * snap);
      h.rise(-0.06 * snap * h.k);
      break;
    }
    case 'push': {
      // One hand flat against the car, shoving it aside without looking; the other on his hip. Grinning at you.
      const shove = 0.5 + 0.5 * Math.sin(t * 1.4);
      h.set('spine', 0.05, 0, 0.12);
      h.set('chest', 0, 0, 0.1);
      h.set('neck', 0, look * 0.6, -0.2);
      h.set('head', -0.05, 0, Math.sin(t * 2.2) * 0.12);
      arm(h, 'L', 0.1, 1.45, 0.9 - shove * 0.8);
      h.set('wristL', 0, 0, 1.2);
      arm(h, 'R', -0.3, 0.75, 1.9);
      h.set('hipR', -0.05, 0, -0.2);
      h.set('hipL', -0.05, 0, 0.12);
      break;
    }
    case 'indignant':
      // Fists on his hips, leaning right at you, the head wagging: "I was in character!"
      h.set('spine', 0.25);
      h.set('chest', 0.2);
      h.set('neck', -0.3, look * 0.4 + Math.sin(t * 9) * 0.22);
      h.set('head', -0.1, 0, Math.sin(t * 4.5) * 0.1);
      for (const [n] of SIDES) arm(h, n, -0.25, 0.8, 2.0);
      h.set('hipR', -0.12, 0, -0.12);
      h.set('hipL', -0.12, 0, 0.12);
      h.rise(Math.abs(Math.sin(t * 9)) * 0.015 * h.k);
      break;
    case 'offer':
      // The mug held out to you; the other hand in a pocket. Tired, kind.
      h.set('spine', 0.06);
      h.set('chest', 0.04 + Math.sin(t * 0.9) * 0.01);
      h.set('neck', 0.05, look * 0.6);
      h.set('head', 0.05, 0, 0.06);
      arm(h, 'R', 1.0, -0.05, 1.05);
      h.set('wristR', 1.45, 0, 0);
      arm(h, 'L', -0.1, 0.12, 0.5);
      h.set('kneeL', 0.1);
      break;
    case 'stand':
      // The man: easy, his weight on one leg, the mug at his chest.
      h.set('hips', 0, 0, 0.03);
      h.set('spine', 0.05, 0, -0.03);
      h.set('chest', 0.03 + Math.sin(t * 0.9) * 0.012);
      h.set('neck', 0.04, look * 0.6);
      arm(h, 'R', 0.35, 0.05, 1.7, -0.5);
      h.set('wristR', 0.2, 0, 0);
      arm(h, 'L', -0.1, 0.12, 0.5);
      h.set('kneeL', 0.12);
      h.set('hipL', -0.06);
      break;
    case 'walk': {
      const s = (m.walked ?? 0) * 5;
      legsWalk(h, s, 0.5, 0.8);
      h.set('spine', 0.05, Math.sin(s) * 0.08);
      h.set('chest', 0, -Math.sin(s) * 0.15);
      h.set('neck', 0, look * 0.5);
      arm(h, 'R', -Math.sin(s) * 0.6, 0.12, 0.3);
      arm(h, 'L', Math.sin(s) * 0.6, 0.12, 0.3);
      break;
    }
    default: {
      // The clown at rest, which isn't rest: up on his toes, bouncing, the head tipping side to side.
      const bounce = Math.abs(Math.sin(t * 3.2));
      h.set('spine', 0.04, Math.sin(t * 1.6) * 0.08, Math.sin(t * 1.6) * 0.05);
      h.set('chest', 0.02);
      h.set('neck', 0, look * 0.6, Math.sin(t * 1.6) * 0.3);
      h.set('head', -0.05, 0, Math.sin(t * 1.6) * 0.12);
      arm(h, 'R', 0.15 + Math.sin(t * 3.2) * 0.15, 0.2, 0.5);
      h.set('wristR', -0.6 + Math.sin(t * 6.4) * 0.5, 0, 0); // the knife turning in his fingers
      arm(h, 'L', 0.1 - Math.sin(t * 3.2) * 0.15, 0.3, 0.4 + bounce * 0.3);
      for (const [n] of SIDES) {
        h.set(`hip${n}`, -0.1 - bounce * 0.08);
        h.set(`knee${n}`, 0.2 + bounce * 0.16);
        h.set(`ankle${n}`, 0.25);
      }
      h.rise((bounce * 0.04 + 0.01) * h.k);
      break;
    }
  }
}
