// The witch's hut (Session 13, #146; DESIGN.md "Destroying the hut").
// Aaron: a taken cabin, the chair rocking when you're close, hand-prints in
// pale ash. A dead settler's 1800s log cabin that she took and the forest
// bent round her: round logs notched at the corners, each warped, the
// whole thing leaning out of true under a steep broken-backed roof of
// rotten shingles and moss; a leaning fieldstone chimney with witchfire at
// its mouth; boarded windows with green light seeping between the boards;
// a door hanging off one hinge onto blackness (you never see inside).
// Her marks: thorned black roots climbing the walls, stick figures and
// bundles of bone and antler hung from the eaves, pale ash hand-prints
// round the door and ritual scratches in the logs. A sagging porch with a
// rocking chair that rocks by itself when you come near; a ring of stick
// totems round the yard and a fire pit of ash and bones.
//
// Destroyed: blown apart. Logs flung outward, roof sections on the
// ground, the porch collapsed, the chimney standing alone; the ruin burns
// (flames, embers), a last green glow dying in the ashes.
//
// Cost: intact, four draw calls (the cabin with its yard, its glow, the
// doorway, the rocking chair); the wreck, three (its pieces, the embers,
// the flames) and the firelight (a point light, dark while it stands).
//
// The hut's frame: x across its front, y up, z out of its door (+z). The
// group is turned to `facing` and stands at the hut's position.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const colour = new THREE.Color();

// A seeded random number in [0, 1) (the hut looks the same every time).
function rand(seed) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// Give a geometry one vertex colour (varied a little by `vary`, seeded).
function tint(g, hex, vary = 0, seed = 0) {
  const n = g.attributes.position.count;
  const rgb = new Float32Array(n * 3);
  colour.set(hex).multiplyScalar(1 - vary / 2 + vary * rand(seed));
  for (let i = 0; i < n; i++) colour.toArray(rgb, i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(rgb, 3));
  return g;
}

// A box [w, h, d], its base at y, turned (x, y, z radians, in that order), then placed.
function box(w, h, d, x, y, z, hex, rx = 0, ry = 0, rz = 0, vary = 0, seed = 0) {
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  g.translate(0, h / 2, 0);
  if (rx) g.rotateX(rx);
  if (ry) g.rotateY(ry);
  if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  return tint(g, hex, vary, seed);
}

// A rod (a twig, a root, a post) from a to b, radius r.
function rod(a, b, r, hex, sides = 5) {
  const A = new THREE.Vector3(...a);
  const B = new THREE.Vector3(...b);
  const dir = new THREE.Vector3().subVectors(B, A);
  const g = new THREE.CylinderGeometry(r * 0.8, r, dir.length(), sides, 1).toNonIndexed();
  g.translate(0, dir.length() / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()));
  g.translate(...a);
  return tint(g, hex);
}

// A log along x (along: 'x') or z, from u0 to u1, its centre at height y
// and (the other axis) at w; warped a little along its length, seeded.
function log(along, u0, u1, y, w, r, hex, seed) {
  const len = u1 - u0;
  const g = new THREE.CylinderGeometry(r, r * (0.92 + 0.1 * rand(seed)), len, 7, 4).toNonIndexed();
  g.rotateZ(Math.PI / 2); // along x
  const bow = (rand(seed + 1) - 0.5) * 0.08;
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = p.getX(i) / len + 0.5;
    p.setY(i, p.getY(i) + Math.sin(t * Math.PI) * bow);
  }
  g.translate(u0 + len / 2, y, 0);
  if (along === 'z') {
    g.rotateY(-Math.PI / 2);
    g.translate(w, 0, 0);
  } else {
    g.translate(0, 0, w);
  }
  g.computeVertexNormals();
  return tint(g, hex, 0.3, seed);
}

// Bend every vertex: the cabin leans out of true and its roof sags.
function warp(g, leanX, sagFrom, sag, halfW) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i);
    let y = p.getY(i);
    x += y * leanX;
    if (y > sagFrom) y -= sag * Math.min(1, (y - sagFrom) / 1.5) * Math.max(0, Math.cos((p.getX(i) / (halfW + 0.6)) * Math.PI * 0.5));
    p.setXYZ(i, x, y, p.getZ(i));
  }
  g.computeVertexNormals();
  return g;
}

function merge(parts) {
  const g = mergeGeometries(parts);
  for (const x of parts) x.dispose();
  return g;
}

// A hand-print in pale ash, flat on a wall facing `normal` ('z' or 'x'):
// a palm and five fingers, splayed.
function handPrint(x, y, z, facing, scale, hex, seed) {
  const parts = [];
  const flat = (w, h, dx, dy, rot) => {
    const g = new THREE.BoxGeometry(w * scale, h * scale, 0.004).toNonIndexed();
    g.rotateZ(rot);
    g.translate(dx * scale, dy * scale, 0);
    parts.push(g);
  };
  flat(0.08, 0.09, 0, 0, 0);
  [-0.6, -0.25, 0, 0.25].forEach((a, i) => flat(0.018, 0.07 + (i === 1 || i === 2 ? 0.015 : 0), Math.sin(a) * 0.075, 0.085 + Math.cos(a) * 0.01, -a * 0.6));
  flat(0.02, 0.055, -0.06, 0.0, 1.0); // the thumb
  const g = mergeGeometries(parts);
  for (const p of parts) p.dispose();
  g.rotateZ((rand(seed) - 0.5) * 0.8);
  if (facing === 'x') g.rotateY(Math.PI / 2);
  g.translate(x, y, z);
  return tint(g, hex, 0.2, seed);
}

// A Blair Witch stick figure: an upright, a crossed pair for arms, two for
// legs, lashed; hung from (x, y, z) on a twine.
function stickFigure(x, y, z, size, look, seed) {
  const s = size;
  const sway = (rand(seed) - 0.5) * 0.3;
  const top = [x, y, z];
  const at = (dx, dy) => [x + dx + sway * dy * 0.2, y - 0.25 - dy, z];
  return [
    rod(top, at(0, 0), 0.006, look.twine),
    rod(at(0, 0), at(0, 0.7 * s), 0.014, look.twig),
    rod(at(-0.28 * s, 0.12 * s), at(0.28 * s, 0.32 * s), 0.011, look.twig),
    rod(at(0.28 * s, 0.12 * s), at(-0.28 * s, 0.32 * s), 0.011, look.twig),
    rod(at(0, 0.6 * s), at(-0.2 * s, 1.0 * s), 0.011, look.twig),
    rod(at(0, 0.6 * s), at(0.2 * s, 1.0 * s), 0.011, look.twig),
    box(0.05 * s, 0.05 * s, 0.03, at(0, 0.5 * s)[0], at(0, 0.5 * s)[1], z, look.twine),
  ];
}

// A thorned root climbing from the ground up a wall, in short wandering
// segments, with thorns. start: [x, z] at the foot; dir: 'x' or 'z' (the
// wall it climbs: its face's normal axis), sign: out of the wall.
function root(sx, sz, height, look, seed) {
  const parts = [];
  let p = [sx, 0, sz];
  const steps = 7;
  for (let i = 0; i < steps; i++) {
    const t = (i + 1) / steps;
    const q = [sx + Math.sin(seed * 3 + i * 1.7) * 0.18, height * t, sz + Math.cos(seed * 5 + i * 1.3) * 0.05];
    parts.push(rod(p, q, 0.035 * (1 - t * 0.6), look.root));
    if (i % 2) parts.push(rod(q, [q[0] + 0.07, q[1] + 0.05, q[2] + 0.04], 0.008, look.root, 4)); // a thorn
    p = q;
  }
  return parts;
}

export class HutRenderer {
  constructor(hutConfig) {
    this.cfg = hutConfig;
  }

  // hut: { x, y, z, facing }.
  init(scene, hut) {
    const c = this.cfg;
    const look = c.look;
    this.group = new THREE.Group();
    this.group.position.set(hut.x, hut.y, hut.z);
    this.group.rotation.y = hut.facing;
    scene.add(this.group);
    this.geometries = [];
    this.lit = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.glowMaterial = new THREE.MeshBasicMaterial({ color: look.glow });
    this.blackMaterial = new THREE.MeshBasicMaterial({ color: 0x020202 });
    this.emberMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    this.fireUniforms = { uTime: { value: 0 } };
    this.fireMaterial = new THREE.ShaderMaterial({
      uniforms: this.fireUniforms,
      vertexShader: FIRE_VERTEX,
      fragmentShader: FIRE_FRAGMENT,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.time = 0;
    this.rock = 0;
    this.buildIntact(c, look);
    this.buildWreck(c, look);
  }

  keep(g) {
    this.geometries.push(g);
    return g;
  }

  // ---- intact ---------------------------------------------------------------------------------

  buildIntact(c, look) {
    const W = c.width;
    const D = c.depth;
    const H = c.height;
    const r = 0.14; // a log's radius
    const base = 0.35; // the footing's top
    const courses = Math.floor((H - 0.05) / (r * 2));
    const front = D / 2;
    // Openings in the walls: [wall, from, to, bottom, top] (along x for front/back, z for the sides).
    const openings = [
      ['front', -0.55, 0.55, 0, 2.05], // the door
      ['front', -2.0, -1.2, 1.1, 1.85], // the windows, boarded
      ['front', 1.2, 2.0, 1.1, 1.85],
      ['east', 0.0, 0.8, 1.1, 1.85],
    ];
    const body = [];
    // The footing: fieldstones round the base.
    let seed = 1;
    for (let u = -W / 2 - 0.2; u < W / 2 + 0.2; u += 0.42) {
      for (const z of [-front - 0.05, front + 0.05]) body.push(box(0.4, base + 0.05, 0.36, u + 0.2, 0, z, look.stone, 0, (rand(seed++) - 0.5) * 0.3, 0, 0.35, seed));
    }
    for (let u = -front; u < front; u += 0.42) {
      for (const x of [-W / 2 - 0.05, W / 2 + 0.05]) body.push(box(0.36, base + 0.05, 0.4, x, 0, u + 0.2, look.stone, 0, (rand(seed++) - 0.5) * 0.3, 0, 0.35, seed));
    }
    body.push(box(W, 0.06, D, 0, base - 0.03, 0, look.floor)); // the floor, seen through the door if at all
    // The log walls: courses alternating (the corners notched, the logs running past them).
    const segments = (wall, from, to, y) => {
      const cuts = openings.filter((o) => o[0] === wall && y + r > o[3] && y - r < o[4]).sort((a, b) => a[1] - b[1]);
      const out = [];
      let u = from;
      for (const o of cuts) {
        if (o[1] > u) out.push([u, o[1]]);
        u = Math.max(u, o[2]);
      }
      if (u < to) out.push([u, to]);
      return out;
    };
    for (let i = 0; i < courses; i++) {
      const y = base + r + i * r * 2;
      const sideY = y; // the side walls' logs sit half a log higher: the corners interlock
      for (const [wall, z] of [
        ['front', front],
        ['back', -front],
      ]) {
        for (const [u0, u1] of segments(wall, -W / 2 - 0.25, W / 2 + 0.25, y)) body.push(log('x', u0, u1, y, z, r, look.log, seed++));
      }
      for (const [wall, x] of [
        ['west', -W / 2],
        ['east', W / 2],
      ]) {
        for (const [u0, u1] of segments(wall, -front - 0.25, front + 0.25, sideY + r)) body.push(log('z', u0, u1, sideY + r, x, r, look.log, seed++));
      }
    }
    const top = base + courses * r * 2;
    // The gables, on the sides (x = +-W/2): shorter logs up to the ridge.
    const slope = 0.8;
    const rise = Math.tan(slope) * (front + 0.3);
    const gableCourses = Math.floor(rise / (r * 2));
    for (let i = 0; i < gableCourses; i++) {
      const y = top + r + i * r * 2;
      const half = front + 0.3 - (y - top) / Math.tan(slope);
      if (half < 0.15) break;
      for (const x of [-W / 2, W / 2]) body.push(log('z', -half, half, y, x, r * 0.95, look.log, seed++));
    }
    // The roof: two steep slabs of rotten shingles (some missing, some
    // mossed), over boards; it sags in the middle (warp()).
    const ridge = top + rise;
    const slabLen = (front + 0.6) / Math.cos(slope);
    for (const side of [-1, 1]) {
      const deck = box(W + 1.0, 0.06, slabLen, 0, 0, 0, look.roofBoard, side * slope);
      deck.translate(0, ridge - Math.sin(slope) * (slabLen / 2) + 0.02, side * (Math.cos(slope) * slabLen) / 2);
      body.push(deck);
      const rows = Math.floor(slabLen / 0.22);
      for (let ri = 0; ri < rows; ri++) {
        const along = 0.11 + ri * 0.22;
        const yy = ridge - Math.sin(slope) * along + 0.06;
        const zz = side * Math.cos(slope) * along;
        for (let u = -W / 2 - 0.45; u < W / 2 + 0.45; u += 0.3) {
          const s = rand(seed++);
          if (s < 0.06) continue; // missing: the boards show
          const hex = s > 0.8 ? look.moss : look.shingle;
          const g = box(0.29, 0.03, 0.26, u + 0.15, 0, 0, hex, side * slope + (rand(seed++) - 0.5) * 0.08, 0, (rand(seed++) - 0.5) * 0.1, 0.4, seed);
          g.translate(0, yy, zz);
          body.push(g);
        }
      }
    }
    body.push(log('x', -W / 2 - 0.5, W / 2 + 0.5, ridge + 0.08, 0, 0.1, look.logDark, seed++)); // the ridge pole
    // The chimney: fieldstones stacked up the west gable end, leaning out.
    const chimX = -W / 2 - 0.42;
    for (let y = 0; y < ridge + 0.6; y += 0.22) {
      const t = y / (ridge + 0.6);
      for (let k = 0; k < 2; k++) {
        const w = 0.75 - t * 0.2;
        body.push(box(w / 2 + 0.05, 0.21, 0.72 - t * 0.2, chimX - t * 0.35 + (k - 0.5) * w * 0.5, y, -0.5, look.stone, 0, (rand(seed++) - 0.5) * 0.2, 0, 0.4, seed));
      }
    }
    // The boards over the windows (the glow seeps between them).
    for (const [wall, u0, u1, y0, y1] of openings.slice(1)) {
      const mid = (u0 + u1) / 2;
      const len = u1 - u0 + 0.2;
      for (const [dy, tilt] of [
        [0.12, 0.05],
        [0.38, -0.12],
        [0.62, 0.08],
      ]) {
        if (wall === 'front') body.push(box(len, 0.13, 0.03, mid, y0 + dy, front + r + 0.02, look.board, 0, 0, tilt, 0.3, seed++));
        else body.push(box(0.03, 0.13, len, W / 2 + r + 0.02, y0 + dy, mid, look.board, tilt, 0, 0, 0.3, seed++));
      }
      void y1;
    }
    // The door frame; the door, hanging off its top hinge, ajar.
    body.push(box(0.12, 2.05, 0.12, -0.6, base, front + 0.05, look.logDark));
    body.push(box(0.12, 2.05, 0.12, 0.6, base, front + 0.05, look.logDark));
    body.push(box(1.32, 0.14, 0.14, 0, base + 2.0, front + 0.05, look.logDark));
    const door = [];
    for (let i = 0; i < 5; i++) door.push(box(0.21, 1.9, 0.05, -0.44 + i * 0.22, 0, 0, look.board, 0, 0, 0, 0.3, seed++));
    for (const y of [0.3, 1.5]) door.push(box(1.05, 0.12, 0.04, 0, y, -0.04, look.board));
    door.push(box(1.0, 0.08, 0.04, 0, 0.9, -0.04, look.board, 0, 0, 0.95)); // the brace
    const doorG = merge(door);
    doorG.translate(0.55, 0, 0); // its hinge side at x = 0
    doorG.rotateZ(-0.12); // sagging off the lower hinge
    doorG.rotateY(-0.9); // swung out
    doorG.translate(-0.55, base + 0.08, front + 0.1);
    body.push(doorG);
    // The porch: a sagging deck, a step, two crooked posts, its roof.
    const porchD = 1.35;
    for (let u = -1.9; u < 1.9; u += 0.2) body.push(box(0.19, 0.05, porchD, u + 0.1, base - 0.02 - Math.abs(u) * 0.015, front + r + porchD / 2, look.board, 0.04, 0, 0, 0.35, seed++));
    body.push(box(1.4, 0.05, 0.35, 0, 0.15, front + r + porchD + 0.2, look.board));
    for (const sx of [-1, 1]) body.push(rod([sx * 1.8, base, front + porchD], [sx * 1.85 + 0.06, 2.35, front + porchD - 0.05], 0.06, look.logDark));
    const porchRoof = box(4.2, 0.1, porchD + 0.5, 0, 0, 0, look.roofBoard, -0.35, 0, 0.03);
    porchRoof.translate(0, 2.45, front + (porchD + 0.5) / 2);
    body.push(porchRoof);
    for (let u = -2.0; u < 2.0; u += 0.3) {
      if (rand(seed++) < 0.12) continue;
      const g = box(0.29, 0.03, porchD + 0.5, u + 0.15, 0, 0, rand(seed++) > 0.7 ? look.moss : look.shingle, -0.35, 0, (rand(seed++) - 0.5) * 0.1, 0.4, seed);
      g.translate(0, 2.56, front + (porchD + 0.5) / 2);
      body.push(g);
    }
    // Her marks: pale ash hand-prints round the door, ritual scratches in the logs.
    const prints = [
      [-0.78, 1.35, 'z', 1.1],
      [-0.85, 0.95, 'z', 0.9],
      [0.75, 1.6, 'z', 1.0],
      [0.82, 1.2, 'z', 1.05],
      [0.35, 2.25, 'z', 0.95],
      [-0.3, 2.3, 'z', 1.0],
      [1.6, 0.8, 'z', 0.9],
    ];
    prints.forEach(([x, y, f, s], i) => body.push(handPrint(x, base + y, front + r + 0.012, f, s, look.ash, i + 7)));
    for (const [x, y] of [
      [-2.2, 0.9],
      [2.3, 1.4],
      [-1.3, 2.2],
    ]) {
      for (let k = 0; k < 4; k++) body.push(box(0.012, 0.32, 0.01, x + k * 0.05, base + y, front + r + 0.01, look.ash, 0, 0, 0.25 + k * 0.03));
    }
    // Thorned roots climbing the walls from the ground.
    for (const [x, z, h] of [
      [-2.3, front + 0.22, 2.2],
      [-1.1, front + 0.22, 1.4],
      [2.4, front + 0.22, 2.6],
      [W / 2 + 0.22, -1.2, 2.0],
      [-W / 2 - 0.22, 1.2, 1.7],
      [1.0, -front - 0.22, 2.3],
    ]) body.push(...root(x, z, h, look, seed++));
    // Stick figures and bundles of bone and antler, hung from the eaves.
    const eave = top + 0.15;
    for (const [x, s] of [
      [-2.4, 1.0],
      [-1.5, 0.8],
      [1.5, 0.9],
      [2.5, 1.1],
    ]) body.push(...stickFigure(x, eave, front + 0.62, s * 0.55, look, seed++));
    for (const x of [-0.9, 0.9]) {
      body.push(rod([x, eave, front + 0.55], [x, eave - 0.35, front + 0.55], 0.006, look.twine));
      body.push(box(0.09, 0.07, 0.11, x, eave - 0.45, front + 0.55, look.bone)); // a skull
      for (const s of [-1, 1]) body.push(rod([x, eave - 0.4, front + 0.55], [x + s * 0.15, eave - 0.6, front + 0.6], 0.012, look.bone));
      body.push(rod([x, eave - 0.45, front + 0.55], [x + 0.05, eave - 0.75, front + 0.58], 0.015, look.bone));
    }
    // The antlered skull over the door, kept from the first hut.
    body.push(box(0.26, 0.22, 0.2, 0, base + 2.15, front + 0.2, look.bone));
    for (const side of [-1, 1]) {
      body.push(rod([side * 0.08, base + 2.33, front + 0.2], [side * 0.4, base + 2.75, front + 0.2], 0.022, look.bone));
      body.push(rod([side * 0.3, base + 2.6, front + 0.2], [side * 0.45, base + 2.62, front + 0.2], 0.015, look.bone));
    }
    // The yard: a ring of stick totems; the fire pit of ash and bones.
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.3;
      if (Math.abs(Math.sin(a)) < 0.35 && Math.cos(a) > 0) continue; // the way in, clear
      const tx = Math.sin(a) * c.totemRing;
      const tz = Math.cos(a) * c.totemRing;
      for (let k = 0; k < 3; k++) {
        const b = (k / 3) * Math.PI * 2;
        body.push(rod([tx + Math.sin(b) * 0.3, 0, tz + Math.cos(b) * 0.3], [tx, 1.5, tz], 0.03, look.twig));
      }
      body.push(box(0.1, 0.08, 0.12, tx, 1.45, tz, look.bone));
      body.push(box(0.12, 0.12, 0.04, tx, 1.25, tz, look.twine));
    }
    const pit = [c.firePit[0], c.firePit[1]];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      body.push(box(0.2, 0.14, 0.16, pit[0] + Math.sin(a) * 0.5, 0, pit[1] + Math.cos(a) * 0.5, look.stone, 0, a, 0, 0.4, i + 50));
    }
    body.push(box(0.8, 0.02, 0.8, pit[0], 0, pit[1], look.ash));
    for (let i = 0; i < 4; i++) body.push(rod([pit[0] - 0.2 + i * 0.1, 0.03, pit[1] - 0.2], [pit[0] + 0.1 + i * 0.05, 0.05, pit[1] + 0.25], 0.02, look.bone));

    const bodyGeometry = this.keep(merge(body));
    warp(bodyGeometry, c.lean, top - 0.2, c.roofSag, W / 2);
    this.intact = new THREE.Group();
    const bodyMesh = new THREE.Mesh(bodyGeometry, this.lit);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    this.intact.add(bodyMesh);
    // The doorway: unlit black, so nothing inside can be seen.
    const doorway = this.keep(new THREE.PlaneGeometry(1.1, 2.0).translate(0, base + 1.0, front + r * 0.5));
    warp(doorway, c.lean, 99, 0, W / 2);
    this.intact.add(new THREE.Mesh(doorway, this.blackMaterial));
    // Witchfire: behind the boarded windows, and at the chimney's mouth.
    const glows = openings.slice(1).map(([wall, u0, u1, y0, y1]) => {
      const g = new THREE.PlaneGeometry(u1 - u0, y1 - y0);
      if (wall === 'front') return g.translate((u0 + u1) / 2, (y0 + y1) / 2, front + r * 0.3);
      return g.rotateY(Math.PI / 2).translate(W / 2 + r * 0.3, (y0 + y1) / 2, (u0 + u1) / 2);
    });
    const mouth = new THREE.BoxGeometry(0.4, 0.06, 0.4).translate(chimX - 0.35, ridge + 0.62, -0.5);
    glows.push(mouth.toNonIndexed());
    const glow = this.keep(merge(glows.map((g) => (g.index ? g.toNonIndexed() : g))));
    warp(glow, c.lean, top - 0.2, c.roofSag, W / 2);
    this.intact.add(new THREE.Mesh(glow, this.glowMaterial));
    // The rocking chair on the porch, its rockers' curve under it; it rocks (update()).
    const chair = [];
    for (const sx of [-0.22, 0.22]) {
      chair.push(box(0.04, 0.05, 0.75, sx, 0, 0, look.board, 0, 0, 0));
      for (const [sz, h] of [
        [-0.2, 1.05],
        [0.2, 0.45],
      ]) chair.push(box(0.04, h, 0.04, sx, 0.04, sz, look.logDark));
    }
    chair.push(box(0.5, 0.04, 0.46, 0, 0.45, 0, look.board));
    for (let k = 0; k < 4; k++) chair.push(box(0.025, 0.55, 0.025, -0.15 + k * 0.1, 0.5, -0.2, look.logDark, 0.12));
    chair.push(box(0.5, 0.05, 0.05, 0, 1.03, -0.27, look.logDark));
    const chairG = this.keep(merge(chair));
    this.chair = new THREE.Mesh(chairG, this.lit);
    this.chair.castShadow = true;
    this.chairPivot = new THREE.Group();
    this.chairPivot.position.set(1.15, base + 0.02, front + r + 0.75);
    this.chairPivot.rotation.y = 0.35;
    this.chairPivot.add(this.chair);
    this.intact.add(this.chairPivot);
    this.group.add(this.intact);
    this.front = front;
  }

  // ---- the wreck ------------------------------------------------------------------------------

  buildWreck(c, look) {
    const W = c.width;
    const D = c.depth;
    const front = D / 2;
    const base = 0.35;
    const r = 0.14;
    const wreck = [];
    let seed = 400;
    // The footing and the scorched floor.
    for (let u = -W / 2; u < W / 2; u += 0.42) for (const z of [-front, front]) wreck.push(box(0.4, base, 0.36, u + 0.2, 0, z, look.stone, 0, 0, 0, 0.35, seed++));
    wreck.push(box(W, 0.06, D, 0, base - 0.03, 0, look.charred));
    // What's left standing: the back corner's lowest courses, burnt.
    for (let i = 0; i < 3; i++) {
      const y = base + r + i * r * 2;
      wreck.push(log('x', -W / 2 - 0.2, -W / 2 + 2.4 - i * 0.6, y, -front, r, look.charred, seed++));
      wreck.push(log('z', -front - 0.2, -front + 1.8 - i * 0.5, y + r, -W / 2, r, look.charred, seed++));
    }
    // The chimney, standing alone, leaning further.
    const chimX = -W / 2 - 0.42;
    for (let y = 0; y < 4.2; y += 0.22) {
      const t = y / 4.2;
      wreck.push(box(0.72 - t * 0.2, 0.21, 0.7 - t * 0.2, chimX - t * 0.6, y, -0.5, look.stone, 0, (rand(seed++) - 0.5) * 0.25, 0, 0.4, seed));
    }
    // Logs flung outward, roof sections and the porch thrown down.
    for (let i = 0; i < 22; i++) {
      const a = rand(seed++) * Math.PI * 2;
      const d = 2.6 + rand(seed++) * 4.5;
      const len = 1.2 + rand(seed++) * 2.6;
      const g = log('x', -len / 2, len / 2, 0, 0, r * 0.9, rand(seed) > 0.4 ? look.charred : look.logDark, seed++);
      g.rotateY(a + (rand(seed++) - 0.5) * 1.2);
      g.rotateZ((rand(seed++) - 0.5) * 0.25);
      g.translate(Math.sin(a) * d, r * 0.8, Math.cos(a) * d);
      wreck.push(g);
    }
    for (const [x, z, ry, rz] of [
      [3.6, 2.4, 0.7, 0.35],
      [-3.9, -2.6, 2.2, -0.25],
      [0.6, -4.6, 0.2, 0.15],
    ]) wreck.push(box(2.6, 0.08, 1.8, x, 0.25, z, look.shingle, 0, ry, rz, 0.3, seed++));
    wreck.push(box(3.6, 0.06, 1.3, 0.2, 0.15, front + 0.9, look.board, 0.18, 0.1, 0.12)); // the porch's deck, broken
    wreck.push(rod([1.8, 0, front + 1.4], [2.9, 0.3, front + 2.6], 0.06, look.charred)); // a post, thrown down
    const wreckGeometry = this.keep(merge(wreck));
    this.wreckGroup = new THREE.Group();
    const wreckMesh = new THREE.Mesh(wreckGeometry, this.lit);
    wreckMesh.castShadow = true;
    wreckMesh.receiveShadow = true;
    this.wreckGroup.add(wreckMesh);
    // Embers: glowing chunks among the ashes, a few still witchfire green.
    const embers = [];
    for (let i = 0; i < 28; i++) {
      const a = rand(i + 900) * Math.PI * 2;
      const d = rand(i + 950) * 2.6;
      const g = new THREE.BoxGeometry(0.18, 0.08, 0.16).toNonIndexed();
      g.rotateY(a);
      g.translate(Math.sin(a) * d, base + 0.05, Math.cos(a) * d);
      embers.push(tint(g, i % 7 === 0 ? look.glow : look.ember, 0.4, i));
    }
    this.wreckGroup.add(new THREE.Mesh(this.keep(merge(embers)), this.emberMaterial));
    // Flames: crossed quads, swaying and flickering in the shader.
    const flames = [];
    const spots = [
      [0, 0.2, 1.6],
      [-1.2, -0.8, 1.2],
      [1.3, 0.6, 1.0],
      [-2.0, -1.6, 1.4],
      [0.8, -1.2, 0.9],
      [-0.6, 1.2, 0.8],
      [chimX + 0.2, -0.5, 0.7],
    ];
    spots.forEach(([x, z, h], i) => {
      for (const ry of [0, Math.PI / 2]) {
        const g = new THREE.PlaneGeometry(h * 0.55, h, 1, 4).translate(0, h / 2, 0).rotateY(ry + i).translate(x, base, z);
        g.setAttribute('aSeed', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(i * 1.7), 1));
        flames.push(g);
      }
    });
    this.wreckGroup.add(new THREE.Mesh(this.keep(merge(flames)), this.fireMaterial));
    // The fire lights the ruin round it, flickering (dark while the hut stands).
    const fl = c.fireLight;
    this.fireLight = new THREE.PointLight(fl.color, 0, fl.distance, fl.decay);
    this.fireLight.position.set(0, 1.2, 0);
    this.group.add(this.fireLight);
    this.wreckGroup.visible = false;
    this.group.add(this.wreckGroup);
  }

  wreck() {
    this.intact.visible = false;
    this.wreckGroup.visible = true;
  }

  update(dt, cameraPosition, drawDistance) {
    this.time += dt;
    const p = this.group.position;
    const d = cameraPosition ? Math.hypot(p.x - cameraPosition.x, p.z - cameraPosition.z) : 0;
    this.group.visible = !cameraPosition || d <= drawDistance + this.cfg.width * 2;
    if (!this.group.visible) return;
    const look = this.cfg.look;
    // The witchfire breathes; the embers flicker; the flames dance.
    this.glowMaterial.color.setHex(look.glow).multiplyScalar(0.7 + 0.3 * Math.sin(this.time * 1.3));
    this.emberMaterial.opacity = 0.65 + 0.35 * Math.sin(this.time * 9) * Math.sin(this.time * 3.7);
    this.fireUniforms.uTime.value = this.time;
    const flicker = 0.8 + 0.12 * Math.sin(this.time * 11) + 0.08 * Math.sin(this.time * 27 + 1.7);
    this.fireLight.intensity = this.wreckGroup.visible ? this.cfg.fireLight.intensity * flicker : 0;
    // The rocking chair rocks by itself when you come near (Aaron), easing in and out.
    const near = cameraPosition && d < this.cfg.rockRange ? 1 : 0;
    this.rock += (near - this.rock) * Math.min(1, dt * 0.8);
    this.chair.rotation.x = Math.sin(this.time * 1.7) * 0.13 * this.rock;
  }

  dispose() {
    this.group.removeFromParent();
    for (const geometry of this.geometries) geometry.dispose();
    for (const m of [this.lit, this.glowMaterial, this.blackMaterial, this.emberMaterial, this.fireMaterial]) m.dispose();
  }
}

// The wreck's flames: each quad sways at its top and flickers in height;
// yellow at the root to deep orange, fading out up and at the sides.
const FIRE_VERTEX = `attribute float aSeed;
uniform float uTime;
varying vec2 vUv;
varying float vSeed;
void main() {
  vUv = uv;
  vSeed = aSeed;
  vec3 p = position;
  float up = uv.y;
  p.x += sin( uTime * 5.0 + aSeed ) * 0.12 * up;
  p.z += cos( uTime * 4.3 + aSeed * 1.3 ) * 0.1 * up;
  p.y += ( sin( uTime * 9.0 + aSeed * 2.1 ) * 0.5 + sin( uTime * 14.0 + aSeed ) * 0.3 ) * 0.15 * up;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( p, 1.0 );
}`;

const FIRE_FRAGMENT = `uniform float uTime;
varying vec2 vUv;
varying float vSeed;
void main() {
  float side = 1.0 - abs( vUv.x - 0.5 ) * 2.0;
  float width = mix( 1.0, 0.25, vUv.y );
  float shape = smoothstep( 0.0, 0.35, side - ( 1.0 - width ) ) * smoothstep( 1.0, 0.55, vUv.y );
  float flicker = 0.8 + 0.2 * sin( uTime * 17.0 + vSeed * 3.0 + vUv.y * 8.0 );
  vec3 col = mix( vec3( 1.0, 0.6, 0.18 ), vec3( 0.75, 0.16, 0.03 ), vUv.y );
  gl_FragColor = vec4( col * shape * flicker * 0.7, shape * flicker );
}`;
