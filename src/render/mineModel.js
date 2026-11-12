// The mine below the abandoned mineshaft (Session 30; DESIGN.md "Abandoned
// mineshaft"): the tunnel swept along the track (world/mineTrack.js), and
// the turret cart. All in code: the tunnel is ONE vertex-coloured mesh
// (render/propKit.js, render/setBuilder.js) plus a few small ones that
// change in play; no lights, dull colours (the glare rule).
//
//  - the tunnel: rock walls with the coal seam running through them, a
//    ballast floor, a timber set (two posts and a cap) every four metres,
//    the rails and their sleepers, a string of bulbs along the roof (most
//    dead; the live ones are one unlit mesh);
//  - the landing: the cage (a through cage, as at the collar), the shaft
//    going up out of the roof over it;
//  - the points (the first stop): a switch stand and its lever (its own
//    mesh: it's thrown), the siding it's set for, run into a fall;
//  - the fall (the second stop): rock down across the rails (its own mesh:
//    Tom levers it off), a pinch bar;
//  - the bottom: the buffers, the bulkhead across the end of the drift,
//    barred, silk strung all over it and a dull light under it;
//  - silk on the timbers, thicker the deeper it goes;
//  - the shaft's sleeve (its own mesh): the walls that scroll past the cage
//    on the ride down.
//
// buildMine(cfg, track, { weather }) returns { group, mesh, parts, spots,
// setSleeve(y, on), dispose }. Mine space (world/mineTrack.js).
// buildCart(cfg, { weather }) returns { root, yaw, pitch, muzzle, flash,
// floor, dispose }: the cart at its own origin (on the rails, +z ahead).

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { bakeParts } from './propKit.js';
import { SetBuilder } from './setBuilder.js';
import { limb } from './sawmillModel.js';
import { liftCage, MINESHAFT } from './mineshaftModel.js';
import { pointAt, halfAt, roofAt, trackPoint } from '../world/mineTrack.js';
import { dressCavern } from './mineCavernModel.js';

const LEVER_AXIS = new THREE.Vector3();

// A cheap repeatable hash, 0..1.
function hash(a, b) {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// The tunnel's cross-section at ring i: nine points, [lat, up], from the floor's -lat edge over the roof to its +lat edge.
export function ringProfile(h, roof, i) {
  // A high roof (the cavern): the walls' points go up with it, and the rock's rougher.
  const tall = roof > 3.5;
  const y1 = tall ? roof * 0.3 : 1.1;
  const y2 = tall ? roof * 0.68 : 2.2;
  const base = [
    [-h, 0],
    [-h - 0.14, y1],
    [-h + 0.12, y2],
    [-h * 0.5, roof - 0.18],
    [0, roof],
    [h * 0.5, roof - 0.18],
    [h - 0.12, y2],
    [h + 0.14, y1],
    [h, 0],
  ];
  return base.map(([x, y], k) => {
    if (k === 0 || k === 8) return [x, y];
    const j = tall ? 0.2 + Math.min(0.5, (roof - 3.5) * 0.12) : 0.2;
    // Rock: every point a little out of true, never in past the track's own width.
    return [x + (hash(i, k) - 0.3) * j * Math.sign(x || 1), y + (hash(i, k + 20) - 0.5) * j];
  });
}

// Triangles (flat arrays of xyz) into a geometry with flat normals.
function triGeo(arr) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
  g.computeVertexNormals();
  return g;
}

export function buildMine(cfg, track, { weather = null } = {}) {
  const look = cfg.look;
  const b = new SetBuilder(look, null, 3101);
  const c = b.c;
  const R = cfg.ride;
  const glowB = new SetBuilder(look, null, 3102);
  const leverB = new SetBuilder(look, null, 3104);
  const fallB = new SetBuilder(look, null, 3105);
  const sleeveB = new SetBuilder(look, null, 3106);
  const P = {};
  const frame = (s, lat = 0, up = 0) => trackPoint(track, s, lat, up, P);
  // A frame on the track at s: +z ahead along the rails, +x the track's lat, pitched with the grade.
  const pushAt = (builder, s, lat = 0, up = 0, yaw = 0, flat = false) => {
    const p = frame(s, lat, up);
    builder.push(p.x, p.y, p.z, p.yaw + yaw, flat ? 0 : p.pitch);
  };

  // ---- the tunnel: rings every two metres, joined ----
  const ringStep = 2;
  const sEnd = track.length + (track.endRoom ?? 2.5);
  const rings = [];
  for (let s = track.s0, i = 0; s <= sEnd + 0.01; s += ringStep, i++) {
    const p = pointAt(track, Math.min(s, track.length), {});
    const over = Math.max(0, s - track.length); // past the track's end: straight on
    const cx = p.x + Math.sin(p.yaw) * over;
    const cz = p.z + Math.cos(p.yaw) * over;
    const h = halfAt(track, Math.min(s, track.length));
    const prof = ringProfile(h, roofAt(track, Math.min(s, track.length)), i);
    rings.push({ s, y: p.y, cx, cz, pts: prof.map(([lat, up]) => new THREE.Vector3(cx + Math.cos(p.yaw) * lat, p.y + up, cz - Math.sin(p.yaw) * lat)), mid: new THREE.Vector3(cx, p.y + 1.5, cz) });
  }
  const tris = { rock: [], rockDark: [], seam: [], ballast: [] };
  const n = new THREE.Vector3();
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();
  const cen = new THREE.Vector3();
  // A triangle facing `toward` (wound so its normal points there).
  const tri = (list, a, b2, c2, toward) => {
    e1.subVectors(b2, a);
    e2.subVectors(c2, a);
    n.crossVectors(e1, e2);
    cen.copy(a).add(b2).add(c2).multiplyScalar(1 / 3);
    if (n.dot(cen.sub(toward).negate()) < 0) list.push(a.x, a.y, a.z, c2.x, c2.y, c2.z, b2.x, b2.y, b2.z);
    else list.push(a.x, a.y, a.z, b2.x, b2.y, b2.z, c2.x, c2.y, c2.z);
  };
  for (let i = 0; i < rings.length - 1; i++) {
    const A = rings[i];
    const B = rings[i + 1];
    const mid = cen.clone().copy(A.mid).add(B.mid).multiplyScalar(0.5);
    for (let k = 0; k < 8; k++) {
      // The coal shows in the walls' middle band, in runs.
      const wall = k === 1 || k === 6;
      const seam = wall && hash(Math.floor(i / 3), k) < 0.62;
      const list = seam ? tris.seam : k >= 2 && k <= 5 ? tris.rockDark : tris.rock;
      tri(list, A.pts[k], B.pts[k], B.pts[k + 1], mid);
      tri(list, A.pts[k], B.pts[k + 1], A.pts[k + 1], mid);
    }
    tri(tris.ballast, A.pts[8], B.pts[8], B.pts[0], mid);
    tri(tris.ballast, A.pts[8], B.pts[0], A.pts[0], mid);
  }
  // The end walls: a fan across each end ring.
  for (const [ring, inward] of [[rings[0], rings[1].mid], [rings[rings.length - 1], rings[rings.length - 2].mid]]) {
    const hub = new THREE.Vector3(ring.cx, ring.y + (ring === rings[0] ? 1.4 : roofAt(track, track.length) * 0.45), ring.cz);
    for (let k = 0; k < 8; k++) tri(tris.rock, hub, ring.pts[k], ring.pts[k + 1], inward);
    tri(tris.rock, hub, ring.pts[8], ring.pts[0], inward);
  }
  for (const [name, arr] of Object.entries(tris)) if (arr.length) b.put(triGeo(arr), c[name]);

  // ---- the timber sets, the bulbs, the silk ----
  let set = 0;
  const doorS = track.door ?? track.length + 1;
  for (let s = track.s0 + 1; s < doorS - 1; s += 4, set++) {
    const h = halfAt(track, s);
    if (Math.abs(s) < 2.2) continue; // not through the cage
    pushAt(b, s);
    const lean = (hash(set, 3) - 0.5) * 0.07;
    const broke = hash(set, 5) < 0.08;
    for (const sd of [-1, 1]) b.box(0.2, 2.5, 0.2, hash(set, sd) < 0.5 ? c.post : c.postDark, sd * (h - 0.16), 1.25, 0, 0, 0, lean * sd);
    if (broke) b.box(h * 2 + 0.1, 0.22, 0.22, c.postDark, 0.3, 2.3, 0.1, 0.1, 0, 0.16);
    else b.box(h * 2 + 0.1, 0.22, 0.24, c.post, 0, 2.6, 0);
    // The string of bulbs: one under every second cap.
    if (set % 2 === 0) {
      const lit = (cfg.bulbsLit ?? []).some((q) => Math.abs(q - s) < 2.1);
      (lit ? glowB : b).stack.push(b.m.clone());
      (lit ? glowB : b).put(new THREE.SphereGeometry(0.055, 6, 4), lit ? c.bulbLit : c.bulb, 0.5, 2.42, 0);
      (lit ? glowB : b).stack.pop();
      b.box(0.02, 0.07, 0.02, c.cable, 0.5, 2.48, 0);
    }
    // Silk, from the fall on down: strands post to cap, more of them toward the bottom.
    const deep = (s - 200) / (doorS - 200);
    if (deep > 0 && hash(set, 9) < 0.25 + deep * 0.7) {
      const sd = hash(set, 11) < 0.5 ? -1 : 1;
      limb(b, [sd * (h - 0.2), 0.4 + hash(set, 12) * 0.8, 0.05], [sd * (h * 0.2), 2.5, 0.02], 0.012 + deep * 0.012, c.silk, 3);
      if (deep > 0.5) limb(b, [-sd * (h - 0.2), 1.6, 0], [sd * 0.3, 2.5, 0.3], 0.014, c.silk, 3);
    }
    b.pop();
  }
  // The cable the bulbs hang from, in runs.
  for (let s = track.s0 + 1; s < doorS - 5; s += 4) {
    const a = frame(s, 0.5, 2.5);
    const av = [a.x, a.y, a.z];
    const q = frame(s + 4, 0.5, 2.5);
    limb(b, av, [q.x, q.y, q.z], 0.012, c.cable, 3);
  }

  // ---- the rails and sleepers ----
  for (let s = 5; s < R.end + 3.5; s += 2) {
    pushAt(b, s);
    for (const sd of [-1, 1]) b.box(0.05, 0.08, 2.06, c.iron, sd * 0.36, 0.1, 1);
    for (const z of [0.5, 1.5]) b.box(1.1, 0.07, 0.16, c.postDark, 0, 0.035, z, (hash(s, z) - 0.5) * 0.08);
    b.pop();
  }

  // ---- the landing: the cage, the shaft up out of the roof ----
  b.push(0, 0, 0, 0);
  liftCage(b, c, MINESHAFT.cage);
  b.box(2.5, 0.05, 2.5, c.hollow, 0, track.roof - 0.16, 0);
  glowB.put(new THREE.SphereGeometry(0.06, 6, 4), c.bulbLit, 0, MINESHAFT.cage.roof - 0.02, 0); // the cage's lamp
  limb(b, [0, MINESHAFT.cage.roof + 0.1, 0], [0, track.roof - 0.1, 0], 0.022, c.cable, 4);
  // A bench, a rack of tools, a tub parked off the rails.
  b.box(1.6, 0.06, 0.4, c.plank, -2.6, 0.5, 6);
  for (const z of [5.4, 6.6]) b.box(0.06, 0.5, 0.36, c.plankDark, -2.6, 0.25, z);
  b.box(0.3, 0.14, 0.24, c.helmet, -2.6, 0.6, 6.3, 0.5);
  for (let k = 0; k < 3; k++) limb(b, [2.9, 0, 4 + k * 0.3], [3.05, 1.5, 4 + k * 0.3], 0.02, c.plankDark, 4);
  b.pop();
  const spot = (name, s, lat, up = 0) => {
    const p = frame(s, lat, up);
    b.spots[name] = { x: p.x, y: p.y, z: p.z, s, lat, yaw: p.yaw };
  };
  spot('cage', 0, 0);
  spot('cageLever', 0.2, 0.45, 1.2);
  spot('landing', 3.2, 0);
  spot('cart', R.start, 0);

  // ---- the points (the first stop): the switch stand, its lever, the siding run into a fall ----
  {
    const st = R.stops.find((q) => q.id === 'points');
    const at = st.s + 7.5;
    pushAt(b, at, -2.3, 0, 0, true);
    b.box(0.3, 0.1, 0.3, c.ironDark, 0, 0.05, 0);
    b.box(0.07, 0.9, 0.07, c.iron, 0, 0.5, 0);
    b.box(0.34, 0.22, 0.03, c.lead, 0, 1.0, 0, 0.5); // the target: red, set against him
    leverB.stack = [b.m.clone()];
    b.pop();
    limb(leverB, [0, 0.12, 0], [0, 1.05, 0], 0.022, c.iron, 5);
    leverB.put(new THREE.SphereGeometry(0.045, 6, 4), c.ironDark, 0, 1.08, 0);
    spot('pointsLever', at - 0.2, -1.55, 1.0);
    spot('pointsStand', at, -2.3, 0);
    // The siding: rails bending off to the side wall, and what came down on them.
    for (let k = 0; k < 6; k++) {
      pushAt(b, at + 1.5 + k * 1.6, 0.25 + k * 0.42, 0, -0.26, true);
      for (const sd of [-1, 1]) b.box(0.05, 0.08, 1.7, c.ironDark, sd * 0.36, 0.1, 0.8);
      b.box(1.1, 0.07, 0.16, c.postDark, 0, 0.035, 0.8);
      b.pop();
    }
    pushAt(b, at + 10.6, 2.6, 0, 0, true);
    for (let k = 0; k < 7; k++) b.put(new THREE.DodecahedronGeometry(0.35 + hash(k, 1) * 0.4, 0), k % 2 ? c.rock : c.rockDark, (hash(k, 2) - 0.5) * 1.4, 0.25 + hash(k, 3) * 0.5, (hash(k, 4) - 0.5) * 1.8);
    b.pop();
  }

  // ---- the fall (the second stop): rock across the rails (its own mesh), a pinch bar ----
  {
    const st = R.stops.find((q) => q.id === 'fall');
    const at = st.s + 6.5;
    pushAt(fallB, at, 0, 0, 0, true);
    for (let k = 0; k < 9; k++) fallB.put(new THREE.DodecahedronGeometry(0.3 + hash(k, 21) * 0.38, 0), k % 3 ? c.rock : c.rockDark, (hash(k, 22) - 0.5) * 1.5, 0.22 + hash(k, 23) * 0.5, (hash(k, 24) - 0.5) * 1.2);
    fallB.box(0.22, 2.2, 0.22, c.postDark, 0.2, 0.6, 0.2, 0.3, 0.2, 1.35); // the prop that gave
    fallB.pop();
    pushAt(b, at - 1.6, 1.5, 0, 0, true);
    limb(b, [0, 0.03, 0], [0.9, 0.2, 0.5], 0.016, c.iron, 5); // the pinch bar
    b.pop();
    spot('fall', at, 0, 0.5);
    spot('fallStand', at - 1.3, 0.2, 0);
  }

  // ---- the bottom: the buffers, the bulkhead across the drift (its leaf is its own mesh: it's opened) ----
  const doorB = new SetBuilder(look, null, 3107);
  const doorOpenB = new SetBuilder(look, null, 3108);
  const doorGlowB = new SetBuilder(look, null, 3109);
  {
    pushAt(b, R.end + 3.6, 0, 0, 0, true);
    for (const sd of [-1, 1]) b.box(0.22, 0.9, 0.22, c.postDark, sd * 0.45, 0.45, 0);
    b.box(1.3, 0.22, 0.24, c.post, 0, 0.72, -0.05);
    b.pop();
    const hE = halfAt(track, doorS);
    pushAt(b, doorS, 0, 0, 0, true);
    // The rock packed round the frame, the frame.
    for (const sd of [-1, 1]) b.box(hE - 1.2, 3.3, 0.3, c.rockDark, sd * (1.3 + (hE - 1.2) / 2), 1.65, 0.2);
    b.box(hE * 2 + 0.6, 0.7, 0.3, c.rockDark, 0, 2.95, 0.2);
    for (const sd of [-1, 1]) b.box(0.24, 2.9, 0.24, c.post, sd * 1.45, 1.45, -0.05);
    b.box(3.2, 0.26, 0.26, c.post, 0, 2.85, -0.05);
    for (const sd of [-1, 1]) limb(b, [sd * (hE - 0.2), 2.6, -2.5], [sd * 1.5, 1.2, -0.2], 0.03, c.silk, 3);
    // Shut: the leaf, its battens, the bar across it, silk corner to corner.
    doorB.stack = [b.m.clone()];
    doorB.box(2.6, 2.6, 0.16, c.door, 0, 1.3, 0);
    for (const y of [0.5, 1.3, 2.1]) doorB.box(2.7, 0.2, 0.08, c.postDark, 0, y, -0.1);
    doorB.box(3.0, 0.16, 0.14, c.iron, 0, 1.25, -0.18);
    for (let k = 0; k < 9; k++) limb(doorB, [(hash(k, 31) - 0.5) * 3.2, 0.1 + hash(k, 32) * 0.6, -0.2], [(hash(k, 33) - 0.5) * 3.6, 2.2 + hash(k, 34) * 0.8, -0.25 - hash(k, 35) * 0.5], 0.014 + hash(k, 36) * 0.02, c.silk, 3);
    // Open: the leaf dragged back and leant on the wall, the bar on the floor, the silk torn and hanging.
    doorOpenB.stack = [b.m.clone()];
    doorOpenB.box(2.6, 2.6, 0.16, c.doorOpen, -(hE - 0.45), 1.26, -1.75, Math.PI / 2 - 0.12, 0, 0.1);
    for (const y of [0.5, 1.3, 2.1]) doorOpenB.box(0.08, 0.2, 2.7, c.postDark, -(hE - 0.56), y, -1.75, -0.12);
    doorOpenB.box(3.0, 0.14, 0.16, c.iron, 0.9, 0.08, -1.2, 0.5);
    for (let k = 0; k < 7; k++) limb(doorOpenB, [(k % 2 ? -1 : 1) * (1.0 + hash(k, 41) * 0.35), 2.75, -0.1], [(k % 2 ? -1 : 1) * (0.7 + hash(k, 42) * 0.7), 0.9 + hash(k, 43) * 1.5, -0.2 - hash(k, 44) * 0.4], 0.014 + hash(k, 45) * 0.016, c.silk, 3);
    // The light under and round the leaf while it's shut.
    doorGlowB.stack = [b.m.clone()];
    doorGlowB.box(2.5, 0.05, 0.05, c.seamGlow, 0, 0.03, -0.09);
    for (const sd of [-1, 1]) doorGlowB.box(0.04, 2.5, 0.04, c.seamGlow, sd * 1.28, 1.3, -0.085);
    b.pop();
    spot('door', doorS - 1.2, 0, 1.3);
    spot('bottom', R.end, 0, 0);
  }

  // ---- past it: the cavern, the seam, the cocoon, the charges (render/mineCavernModel.js) ----
  const kit = { b, cfg, track, pushAt, frame, spot, hash, builder: (seed) => new SetBuilder(look, null, seed) };
  const cav = dressCavern(kit);

  // ---- the shaft's sleeve: four walls round the cage, cribbed every two metres (it scrolls) ----
  {
    const hs = 1.42;
    for (let y = -10; y < 30; y += 2) {
      for (const [sx, sz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const shade = hash(y, sx * 3 + sz) < 0.5 ? c.rock : c.rockDark;
        sleeveB.box(sx ? 0.1 : hs * 2, 1.78, sz ? 0.1 : hs * 2, shade, sx * hs, y + 1.0, sz * hs);
        sleeveB.box(sx ? 0.2 : hs * 2 + 0.2, 0.22, sz ? 0.2 : hs * 2 + 0.2, c.postDark, sx * (hs - 0.05), y, sz * (hs - 0.05));
      }
      // A depth board on one wall every other crib, a streak of the seam now and then.
      if ((y / 2) % 2 === 0) sleeveB.box(0.5, 0.2, 0.03, c.signBoard, 0.6, y + 1.2, hs - 0.07);
      if (hash(y, 7) < 0.4) sleeveB.box(0.03, 0.5, hs * 1.6, c.seam, hs - 0.07, y + 0.9, 0);
    }
  }

  // ---- bake ----
  const baseAt = (x, y, z) => {
    // Grime climbs from the floor under each point (the nearest ring will do).
    let best = rings[0];
    let bd = Infinity;
    for (const r of rings) {
      const d = (x - r.cx) * (x - r.cx) + (z - r.cz) * (z - r.cz) + (y - r.y - 1.5) * (y - r.y - 1.5) * 4;
      if (d < bd) {
        bd = d;
        best = r;
      }
    }
    return best.y;
  };
  const geometry = bakeParts(b.parts, { weather, baseAt, seed: 33 });
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false; // Tom's always inside it
  const group = new THREE.Group();
  group.name = 'mine';
  group.add(mesh);
  const owned = [geometry, material];
  const own = (x) => (owned.push(x), x);
  const basic = (builder, colour, name) => {
    const m = new THREE.Mesh(own(bakeParts(builder.parts, {})), own(new THREE.MeshBasicMaterial({ color: colour })));
    m.material.vertexColors = false;
    m.name = name;
    m.frustumCulled = false;
    group.add(m);
    return m;
  };
  const lit = (builder, name, mat = material) => {
    const m = new THREE.Mesh(own(bakeParts(builder.parts, { weather, seed: 34 })), mat);
    m.name = name;
    group.add(m);
    return m;
  };
  const parts = {};
  parts.bulbs = basic(glowB, look.colors.bulbLit, 'mineBulbs');
  parts.doorGlow = basic(doorGlowB, look.colors.seamGlow, 'doorGlow');
  parts.bulkhead = lit(doorB, 'bulkhead');
  parts.bulkheadOpen = lit(doorOpenB, 'bulkheadOpen');
  parts.bulkheadOpen.visible = false;
  // The seam: its own unlit colour (it pulses), and a halo added on round it and on the floor.
  parts.seamGlow = basic(cav.glow, look.colors.seamGlow, 'seamGlow');
  parts.seamHalo = basic(cav.halo, look.colors.seamGlow, 'seamHalo');
  Object.assign(parts.seamHalo.material, { transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const seamColor = new THREE.Color(look.colors.seamGlow);
  parts.log = lit(cav.log, 'foremanLog');
  parts.drillHead = lit(cav.head, 'drillHead');
  parts.sticks = lit(cav.sticks, 'mineSticks');
  // The exploder's handle: it slides down its own rod.
  parts.handle = lit(cav.handle, 'plungerHandle');
  parts.spark = basic(cav.spark, look.colors.fuse, 'fuseSpark');
  parts.spark.visible = false;
  // The fire that comes up the drift: a few unlit balls of it, added on (no lights), hidden until it's lit.
  const fireGeo = own(new THREE.SphereGeometry(1, 12, 8));
  const fireMat = own(new THREE.MeshBasicMaterial({ color: cfg.escape?.look?.fire ?? 0xd8601c, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  const coreMat = own(new THREE.MeshBasicMaterial({ color: cfg.escape?.look?.core ?? 0xf0d090, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  parts.fire = [];
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(fireGeo, i % 3 === 0 ? coreMat : fireMat);
    m.visible = false;
    m.frustumCulled = false;
    m.name = 'mineFire';
    group.add(m);
    parts.fire.push(m);
  }
  const sparkAt = {};
  // The points' lever: its geometry's at the stand's foot, so it turns about it (thrown: over the other way).
  {
    const g = own(bakeParts(leverB.parts, { weather, seed: 35 }));
    const foot = new THREE.Vector3(0, 0, 0).applyMatrix4(leverB.stack[0]);
    g.translate(-foot.x, -foot.y, -foot.z);
    const m = new THREE.Mesh(g, material);
    m.position.copy(foot);
    m.name = 'pointsLever';
    group.add(m);
    parts.pointsLever = m;
    parts.pointsYaw = b.spots.pointsStand.yaw;
  }
  parts.fall = lit(fallB, 'fall');
  // Unlit (the cage's lamp is all the light there is in the shaft, and it isn't a light): dull as baked.
  const sleeveMat = own(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  parts.sleeve = lit(sleeveB, 'shaftSleeve', sleeveMat);
  parts.sleeve.frustumCulled = false;
  parts.sleeve.visible = false;
  // The dark down the shaft round the cage's floor, while it rides.
  parts.skirt = new THREE.Mesh(own(new THREE.BoxGeometry(3.0, 0.02, 3.0)), own(new THREE.MeshBasicMaterial({ color: look.colors.hollow })));
  parts.skirt.position.set(0, 0.03, 0);
  parts.skirt.visible = false;
  group.add(parts.skirt);
  return {
    group,
    mesh,
    parts,
    spots: b.spots,
    // The points' lever: 0 (as found: leaning back) .. 1 (thrown: leaning forward).
    setLever(k) {
      const yaw = parts.pointsYaw;
      parts.pointsLever.quaternion.setFromAxisAngle(LEVER_AXIS.set(Math.cos(yaw), 0, -Math.sin(yaw)), (k - 0.5) * 1.0);
    },
    fuseRun: kit.fuseRun,
    // The bulkhead: shut or open.
    setDoor(open) {
      parts.bulkhead.visible = !open;
      parts.doorGlow.visible = !open;
      parts.bulkheadOpen.visible = open;
    },
    // The seam's light: k 0..1 (its pulse); 0 and hidden once it's sealed.
    setSeam(k, on = true) {
      parts.seamGlow.visible = on;
      parts.seamHalo.visible = on;
      parts.seamGlow.material.color.copy(seamColor).multiplyScalar(k);
      parts.doorGlow.material.color.copy(seamColor).multiplyScalar(k);
      parts.seamHalo.material.opacity = 0.07 * k;
    },
    // The exploder's handle: 0 up .. 1 down.
    setPlunger(k) {
      parts.handle.position.y = -0.3 * k;
    },
    // The spark on the slow fuse: k 0..1 along the cable from the exploder to the face (null: out).
    setSpark(k) {
      parts.spark.visible = k !== null;
      if (k === null) return;
      const run = kit.fuseRun;
      const f = Math.max(0, Math.min(run.length - 1 - 1e-6, k * (run.length - 1)));
      const i = Math.floor(f);
      const a = trackPoint(track, run[i][0], run[i][1], 0.05, sparkAt);
      const ax = a.x;
      const ay = a.y;
      const az = a.z;
      const q = trackPoint(track, run[i + 1][0], run[i + 1][1], 0.05, sparkAt);
      const t = f - i;
      parts.spark.position.set(ax + (q.x - ax) * t, ay + (q.y - ay) * t, az + (q.z - az) * t);
    },
    // The fire: balls at [{ x, y, z, r }] (mine space), the rest hidden.
    setFire(list) {
      parts.fire.forEach((m, i) => {
        const f = list?.[i];
        m.visible = Boolean(f);
        if (f) {
          m.position.set(f.x, f.y, f.z);
          m.scale.setScalar(f.r);
        }
      });
    },
    // The sleeve round the cage: y metres up from where it starts (it repeats every 2), shown or not.
    setSleeve(y, on) {
      parts.sleeve.visible = on;
      parts.skirt.visible = on && y < 9.5;
      parts.sleeve.position.y = y;
    },
    dispose() {
      group.removeFromParent();
      for (const x of owned) x.dispose();
    },
  };
}

// The turret cart: a low steel man-car, an old water-cooled gun on a pedestal at its front.
export function buildCart(cfg, { weather = null } = {}) {
  const look = cfg.look;
  const b = new SetBuilder(look, null, 3120);
  const gb = new SetBuilder(look, null, 3121);
  const c = b.c;
  const floor = 0.42;
  const pivot = { x: 0, y: 1.3, z: 0.55 };
  // The chassis, the wheels, the tub (its front low, for the gun), a step at the back.
  b.box(1.16, 0.12, 2.3, c.ironDark, 0, floor - 0.06, 0);
  for (const sx of [-1, 1]) {
    for (const z of [-0.72, 0.72]) b.put(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 10).rotateZ(Math.PI / 2), c.iron, sx * 0.36, 0.2, z);
    b.box(0.05, 0.56, 2.3, c.cartBody, sx * 0.6, floor + 0.28, 0);
    b.box(0.07, 0.06, 2.34, c.cartTrim, sx * 0.6, floor + 0.58, 0);
  }
  b.box(1.2, 0.56, 0.05, c.cartBody, 0, floor + 0.28, -1.15);
  b.box(1.2, 0.3, 0.05, c.cartBody, 0, floor + 0.15, 1.15);
  b.box(0.5, 0.05, 0.3, c.ironDark, 0, 0.2, -1.32); // the step
  for (const sx of [-1, 1]) b.box(0.14, 0.12, 0.22, c.ironDark, sx * 0.3, floor - 0.02, 1.26); // buffers
  // The pedestal, an ammunition box strapped beside it, sandbags.
  b.put(new THREE.CylinderGeometry(0.06, 0.09, pivot.y - floor, 8), c.iron, pivot.x, (pivot.y + floor) / 2, pivot.z);
  b.box(0.3, 0.2, 0.2, c.army, 0.36, floor + 0.1, 0.75);
  b.box(0.3, 0.2, 0.2, c.armyDark, -0.36, floor + 0.1, 0.8, 0.2);
  b.box(0.5, 0.16, 0.26, c.tarp, 0, floor + 0.38, 1.02);
  // The brake lever at the back, on Tom's right (the cart's -x).
  limb(b, [-0.5, floor, -0.85], [-0.5, floor + 0.85, -0.7], 0.022, c.iron, 5);
  b.put(new THREE.SphereGeometry(0.04, 6, 4), c.lead, -0.5, floor + 0.87, -0.7);
  // The headlamp on the front, dead (Tom's torch does the work).
  b.box(0.2, 0.2, 0.14, c.boxDark, 0.42, floor + 0.42, 1.2);
  b.put(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 10).rotateX(Math.PI / 2), c.lens, 0.42, floor + 0.42, 1.28);
  // Dark: Tom's torch is a hand's breadth from it the whole ride (the glare rule).
  const material = new THREE.MeshLambertMaterial({ vertexColors: true, color: 0x8a8a8a });
  const body = new THREE.Mesh(bakeParts(b.parts, { weather, seed: 36 }), material);
  body.name = 'mineCart';
  // The gun (its frame: the pivot; +z down the barrel).
  gb.box(0.11, 0.15, 0.44, c.gun, 0, 0.1, -0.06);
  gb.put(new THREE.CylinderGeometry(0.058, 0.058, 0.62, 10).rotateX(Math.PI / 2), c.gunJacket, 0, 0.1, 0.47);
  gb.put(new THREE.CylinderGeometry(0.03, 0.036, 0.08, 8).rotateX(Math.PI / 2), c.gun, 0, 0.1, 0.82);
  gb.box(0.02, 0.05, 0.02, c.gun, 0, 0.2, 0.74); // the foresight
  gb.box(0.05, 0.07, 0.02, c.gun, 0, 0.21, -0.2); // the rear sight
  for (const sx of [-1, 1]) gb.box(0.025, 0.14, 0.03, c.grip, sx * 0.07, 0.1, -0.36);
  gb.box(0.18, 0.02, 0.02, c.gun, 0, 0.17, -0.36);
  gb.box(0.18, 0.02, 0.02, c.gun, 0, 0.03, -0.36);
  gb.box(0.13, 0.16, 0.24, c.armyDark, 0.15, -0.04, 0.02); // the belt box
  gb.box(0.05, 0.02, 0.1, c.gunBrass, 0.08, 0.09, 0.02); // the belt, into the feed
  gb.put(new THREE.CylinderGeometry(0.035, 0.05, 0.12, 6), c.iron, 0, -0.03, 0);
  const gunMaterial = material.clone(); // its own: the barrel glows as it heats
  gunMaterial.color.setHex(0x5a5a5a);
  const gun = new THREE.Mesh(bakeParts(gb.parts, { weather, seed: 37 }), gunMaterial);
  gun.name = 'cartGun';
  const root = new THREE.Group();
  root.name = 'turretCart';
  root.rotation.order = 'YXZ';
  root.add(body);
  const yaw = new THREE.Group();
  yaw.position.set(pivot.x, pivot.y, pivot.z);
  const pitch = new THREE.Group();
  yaw.add(pitch);
  pitch.add(gun);
  root.add(yaw);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.1, 0.9);
  pitch.add(muzzle);
  // The muzzle flash: two crossed quads, unlit, hidden between rounds.
  const fg = mergeGeometries([new THREE.PlaneGeometry(0.34, 0.34), new THREE.PlaneGeometry(0.34, 0.34).rotateZ(Math.PI / 4)]);
  const fm = new THREE.MeshBasicMaterial({ color: look.colors.flash, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const flash = new THREE.Mesh(fg, fm);
  flash.position.copy(muzzle.position);
  flash.position.z += 0.08;
  flash.visible = false;
  pitch.add(flash);
  return {
    root,
    body,
    yaw,
    pitch,
    muzzle,
    flash,
    floor,
    pivot,
    gunMaterial,
    dispose() {
      root.removeFromParent();
      body.geometry.dispose();
      gun.geometry.dispose();
      fg.dispose();
      fm.dispose();
      material.dispose();
      gunMaterial.dispose();
    },
  };
}
