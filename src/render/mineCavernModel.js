// The bottom of the mine, past the bulkhead (Session 31; DESIGN.md
// "Abandoned mineshaft", "The bottom": "the seam where the Mothman came
// through, the giant torn cocoon he hatched from, and the miners'
// explosives, packed but never fired, with a plunger"). Dressing for the
// cavern at the end of the mine's track (render/mineModel.js builds the
// rock round it and bakes all this into the tunnel's one mesh; the pieces
// that change in play are builders of their own, handed back).
//
//  - the seam: a crack up the end wall, taller than a house and a hand
//    wide, lit dull red from inside (an unlit mesh that pulses, and a faint
//    halo round it and on the floor: no lights);
//  - the cocoon: four metres of grey silk hung from the roof on ropes of
//    it, split down the side facing the way in, empty; what dried under it;
//  - the charges: shot holes round the seam, each tamped and wired, the
//    powder company's cases at the foot of the face, firing cable back
//    along the floor to the exploder;
//  - the exploder (its handle is its own mesh: it goes down), a length of
//    slow fuse spliced in beside it (the spark is its own mesh), and the
//    foreman sat against a case with his logbook by his hand;
//  - the rock drill on its tripod, where they stopped (its head is its own
//    mesh: Tom takes it), and the open case of sticks they hadn't used;
//  - props up to the roof, cribbing, the army's dead lamps, silk.
//
// dressCavern(kit) returns { glow, halo, handle, spark, log, head, sticks }
// (SetBuilders) and writes the kit's spots. kit: { b, cfg, track, pushAt,
// spot, hash, builder(seed) }.

import * as THREE from 'three';
import { limb } from './sawmillModel.js';
import { roofAt, halfAt } from '../world/mineTrack.js';

// The seam's line up the wall: [x, y, half width] from the floor to its top, pure (hash: a 0..1 noise).
export function seamLine(height, width, hash, steps = 18) {
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const k = i / steps;
    const w = width * Math.sin(Math.PI * Math.min(1, k * 1.08 + 0.04)) ** 0.7;
    out.push([i === 0 ? 0 : (hash(i, 71) - 0.5) * 0.3 + Math.sin(k * 3.1) * 0.3 + Math.sin(k * 11) * 0.06, 0.25 + k * height, Math.max(0.02, w * (0.55 + hash(i, 72) * 0.45)) / 2]);
  }
  return out;
}

// A strip of quads along a line of [x, y, half], facing -z (the way in), at depth z.
function stripGeo(line, z, widen = 1, pad = 0) {
  const arr = [];
  for (let i = 0; i < line.length - 1; i++) {
    const [x0, y0, h0] = line[i];
    const [x1, y1, h1] = line[i + 1];
    const a0 = h0 * widen + pad;
    const a1 = h1 * widen + pad;
    // Wound so the face looks back up the drift (-z).
    arr.push(x0 - a0, y0, z, x1 - a1, y1, z, x0 + a0, y0, z, x0 + a0, y0, z, x1 - a1, y1, z, x1 + a1, y1, z);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
  g.computeVertexNormals();
  return g;
}

export function dressCavern(kit) {
  const { b, cfg, track, pushAt, spot, hash, builder } = kit;
  const c = b.c;
  const B = cfg.bottom;
  const glow = builder(3131);
  const halo = builder(3132);
  const handle = builder(3133);
  const spark = builder(3134);
  const logB = builder(3135);
  const head = builder(3136);
  const sticks = builder(3137);
  const sEnd = track.length + (track.endRoom ?? 2.5);
  const face = sEnd - 0.5; // the end wall, a little proud of the rock's own jitter
  const half = halfAt(track, track.length);

  // ---- the seam: up the end wall ----
  {
    const line = seamLine(B.seam.height, B.seam.width, hash);
    pushAt(b, face, 0, 0, 0, true);
    // The coal either side of it, slabbed and glassy where it's been cooked.
    for (let i = 0; i < line.length - 1; i += 2) {
      const [x, y] = line[i];
      for (const sd of [-1, 1]) b.box(0.5 + hash(i, sd + 80) * 0.5, 0.8, 0.22, i % 2 ? c.seam : c.coalDark, x + sd * (0.42 + hash(i, sd + 83) * 0.2), y + 0.35, 0.16 + hash(i, 85) * 0.1, sd * 0.25, 0, sd * (hash(i, 86) - 0.5) * 0.5);
    }
    glow.stack = [b.m.clone()];
    halo.stack = [b.m.clone()];
    glow.put(stripGeo(line, 0.04), c.seamGlow);
    // The halo: the same line much wider, and a pool of it on the floor in front (both faint, added on).
    // Each layer adds a little: narrow ones over wide ones, so it falls away from the crack.
    for (const [widen, pad, z] of [[2.2, 0.03, 0.03], [4, 0.1, 0.02], [7, 0.25, 0.01], [10, 0.6, 0.0]]) halo.put(stripGeo(line, z, widen, pad), c.seamGlow);
    for (const [rad, y] of [[1.0, 0.034], [1.8, 0.03], [2.8, 0.026], [4.0, 0.022]]) halo.put(new THREE.CircleGeometry(rad, 16).rotateX(-Math.PI / 2).scale(1, 1, 1.6), c.seamGlow, 0, y, -0.4 - rad * 1.1);
    // Silk scorched back from it, and what's grown out of it across the face.
    for (let k = 0; k < 10; k++) {
      const sd = k % 2 ? -1 : 1;
      const y = 0.6 + hash(k, 91) * 5.6;
      limb(b, [sd * 0.4, y, -0.05], [sd * (2 + hash(k, 92) * 4.5), y + (hash(k, 93) - 0.4) * 2.4, -0.3 - hash(k, 94) * 1.2], 0.02 + hash(k, 95) * 0.03, k % 3 ? c.silk : c.fur, 3);
    }
    // The shot holes round it: each tamped, a tail of two wires down the face to the floor.
    const holes = [];
    for (let k = 0; k < B.charges; k++) {
      const sd = k % 2 ? -1 : 1;
      const y = 0.7 + ((k * 0.61) % 1) * 4.6 + 0.3;
      const x = sd * (1.5 + hash(k, 101) * 1.5);
      holes.push([x, y]);
      b.put(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 7).rotateX(Math.PI / 2), c.hollow, x, y, -0.02);
      b.put(new THREE.CylinderGeometry(0.035, 0.035, 0.1, 6).rotateX(Math.PI / 2), c.stick, x, y, -0.06);
      limb(b, [x, y, -0.1], [x + sd * 0.15, 0.06, -0.5], 0.008, c.wire, 3);
      limb(b, [x + sd * 0.15, 0.06, -0.5], [0.9, 0.04, -1.4], 0.008, c.wire, 3);
    }
    // The powder company's cases at the foot of the face, one burst open.
    const cases = [[-2.6, 0, -1.0, 0.2], [-2.5, 0.42, -1.05, -0.1], [-3.5, 0, -0.9, 0.5], [2.4, 0, -1.1, -0.3], [3.3, 0, -0.8, 0.15], [2.6, 0.42, -1.0, 0.4]];
    for (const [x, y, z, yaw] of cases) {
      b.box(0.7, 0.4, 0.45, hash(x, 3) < 0.5 ? c.crate : c.crateDark, x, y + 0.2, z, yaw);
      b.box(0.5, 0.1, 0.01, c.lead, x - Math.sin(yaw) * 0.23, y + 0.24, z - Math.cos(yaw) * 0.23, yaw);
    }
    // The army's instruments, left running and long dead: a case of dials on a tripod, two lamp stands.
    for (const [x, z] of [[-4.6, -3.5], [4.8, -4.2]]) {
      for (let k = 0; k < 3; k++) limb(b, [x + Math.cos(k * 2.1) * 0.5, 0, z + Math.sin(k * 2.1) * 0.5], [x, 1.9, z], 0.018, c.ironDark, 4);
      b.box(0.42, 0.3, 0.16, c.boxDark, x, 2.0, z, x < 0 ? 0.7 : -0.7);
      b.box(0.36, 0.24, 0.02, c.lens, x + (x < 0 ? 0.06 : -0.06), 2.0, z - 0.08, x < 0 ? 0.7 : -0.7);
    }
    b.box(0.6, 0.4, 0.4, c.army, -1.1, 0.2, -2.6, 0.3);
    b.box(0.5, 0.02, 0.3, c.lens, -1.1, 0.41, -2.6, 0.3);
    b.pop();
    spot('seam', face - 2.4, 0, 1.4);
  }

  // ---- the firing cable back along the floor to the exploder; the slow fuse spliced in ----
  const [ps, plat] = B.plunger;
  {
    const run = [[face - 1.4, 0.9], [face - 3.2, 1.6], [face - 5.5, 2.9], [ps + 0.9, plat + 0.2]];
    for (let i = 0; i < run.length - 1; i++) {
      const a = kit.frame(run[i][0], run[i][1], 0.03);
      const av = [a.x, a.y, a.z];
      const q = kit.frame(run[i + 1][0], run[i + 1][1], 0.03);
      limb(b, av, [q.x, q.y, q.z], 0.012, c.wire, 3);
    }
    kit.fuseRun = run.slice().reverse(); // the spark's way: from the exploder to the face
    pushAt(b, ps, plat, 0, 0.5, true);
    b.box(0.3, 0.34, 0.22, c.exploder, 0, 0.17, 0);
    b.box(0.32, 0.03, 0.24, c.ironDark, 0, 0.35, 0);
    for (const sx of [-1, 1]) b.put(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 5), c.wire, sx * 0.09, 0.38, -0.06);
    // A coil of slow fuse beside it, one end at the terminal.
    b.put(new THREE.TorusGeometry(0.14, 0.012, 4, 12).rotateX(Math.PI / 2), c.cable, 0.34, 0.02, 0.1);
    limb(b, [0.09, 0.38, -0.06], [0.34, 0.03, -0.04], 0.008, c.cable, 3);
    handle.stack = [b.m.clone()];
    spark.stack = [new THREE.Matrix4()];
    b.pop();
    // The handle: a rod and a T, drawn up (the model slides it down).
    limb(handle, [0, 0.36, 0.02], [0, 0.72, 0.02], 0.014, c.iron, 5);
    handle.box(0.22, 0.035, 0.035, c.handle, 0, 0.73, 0.02);
    spark.put(new THREE.SphereGeometry(0.05, 6, 4), c.fuse);
    spot('plunger', ps, plat, 0.6);
  }

  // ---- the foreman: sat against a case, his legs out, his hard hat on, one hand toward the box ----
  {
    const [fs, flat] = B.foreman;
    pushAt(b, fs, flat, 0, -2.2, true); // his back to the wall side, facing the exploder
    b.box(0.72, 0.42, 0.46, c.crateDark, 0, 0.21, -0.42);
    b.box(0.44, 0.56, 0.24, c.coat, 0, 0.5, -0.12, 0, -0.22); // his back, slumped
    b.box(0.2, 0.2, 0.2, c.skin, 0.03, 0.86, 0.02, 0.2, 0.5); // his head, down on his chest
    b.box(0.3, 0.1, 0.32, c.helmet, 0.03, 0.97, 0.03, 0.2, 0.45);
    for (const sx of [-1, 1]) {
      limb(b, [sx * 0.12, 0.2, 0.05], [sx * 0.17, 0.12, 0.62], 0.075, c.coatDark, 5); // thighs
      limb(b, [sx * 0.17, 0.12, 0.62], [sx * 0.2, 0.07, 1.1], 0.06, c.coatDark, 5);
      b.box(0.11, 0.2, 0.12, c.leadBlack, sx * 0.2, 0.1, 1.16);
    }
    limb(b, [-0.24, 0.7, -0.06], [-0.34, 0.3, 0.12], 0.055, c.coat, 5); // one arm in his lap
    limb(b, [-0.34, 0.3, 0.12], [-0.12, 0.24, 0.3], 0.045, c.coat, 5);
    limb(b, [0.24, 0.7, -0.06], [0.44, 0.4, 0.1], 0.055, c.coat, 5); // the other out toward the box
    limb(b, [0.44, 0.4, 0.1], [0.56, 0.08, 0.36], 0.045, c.coat, 5);
    b.box(0.09, 0.04, 0.11, c.skin, 0.59, 0.04, 0.42, 0.4);
    b.box(0.16, 0.1, 0.1, c.lamp, 0.5, 0.05, -0.2); // his cap lamp's battery, off his belt
    b.pop();
    const [ls, llat] = B.log;
    pushAt(logB, ls, llat, 0, 0.7, true);
    logB.box(0.2, 0.045, 0.28, c.book, 0, 0.03, 0);
    logB.box(0.18, 0.03, 0.26, c.paper, 0, 0.035, 0.005);
    logB.box(0.2, 0.012, 0.28, c.book, 0, 0.058, 0);
    logB.pop();
    spot('log', ls, llat, 0.2);
    spot('foreman', fs, flat, 0.6);
  }

  // ---- the cocoon: hung from the roof, split down the side facing the way in ----
  {
    const [cs, clat] = B.cocoon.at;
    const K = B.cocoon;
    const L = K.length;
    const r = K.radius;
    const midY = K.top - L / 2;
    pushAt(b, cs, clat, 0, -0.45, true); // the tear toward whoever comes in
    const gap = 1.25;
    const shell = (rad, color, flip) => {
      const g = new THREE.SphereGeometry(1, 12, 10, Math.PI * 1.5 + gap / 2, Math.PI * 2 - gap);
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        // A long drop, heavier at the bottom, lumpy.
        const fat = (0.72 + 0.28 * Math.cos((y + 0.35) * 1.6)) * (1 + (hash(i, 111) - 0.5) * 0.16);
        pos.setXYZ(i, pos.getX(i) * rad * fat, y * (L / 2), pos.getZ(i) * rad * fat);
      }
      if (flip) g.scale(-1, 1, 1); // inside out: the dark of its inside, seen through the tear
      g.computeVertexNormals();
      b.put(g, color, 0, midY, 0);
    };
    shell(r, c.husk, false);
    shell(r * 0.93, c.huskDark, true);
    // The silk's wound round it in bands (broken at the tear).
    for (let k = 0; k < 7; k++) {
      const y = -0.78 + k * 0.26;
      const fat = 0.72 + 0.28 * Math.cos((y + 0.35) * 1.6);
      const rr = r * fat * Math.sqrt(Math.max(0.05, 1 - y * y)) + 0.02;
      b.put(new THREE.TorusGeometry(rr, 0.035, 4, 14, Math.PI * 2 - gap - 0.3).rotateX(Math.PI / 2).rotateY(Math.PI / 2 - (gap + 0.3) / 2), k % 2 ? c.silk : c.husk, 0, midY + y * (L / 2), 0, 0, 0, (hash(k, 115) - 0.5) * 0.12);
    }
    // The tear's lips: ragged strips curled out and back, and what hangs from them.
    for (const sd of [-1, 1]) {
      const a = Math.PI * 1.5 + (sd * gap) / 2;
      const ex = -Math.cos(a) * r * 0.9;
      const ez = Math.sin(a) * r * 0.9;
      for (let k = 0; k < 8; k++) {
        const y = midY - L * 0.36 + k * L * 0.1;
        const w = 0.16 + hash(k, sd + 120) * 0.22;
        const fat = 0.75 + 0.25 * Math.cos(((y - midY) / (L / 2) + 0.35) * 1.6);
        b.box(w, L * 0.11 + hash(k, sd + 125) * 0.2, 0.03, k % 3 ? c.husk : c.silk, ex * fat + sd * w * 0.3, y, ez * fat - 0.06, sd * (1.0 + hash(k, sd + 126) * 0.7), (hash(k, 127) - 0.5) * 0.5, sd * (hash(k, 121) - 0.5) * 0.7);
        if (k % 2) limb(b, [ex * fat + sd * 0.2, y - 0.2, ez * fat - 0.15], [ex * fat + sd * (0.3 + hash(k, 122) * 0.6), Math.max(0.02, y - 1.0 - hash(k, 123) * 2.5), ez - 0.4 - hash(k, 124) * 0.6], 0.012, c.silk, 3);
      }
    }
    // The ropes it hangs by, up to the roof, and the guys out to the walls and the floor.
    const roof = roofAt(track, cs) - 0.25;
    for (let k = 0; k < 6; k++) {
      const a = k * 1.05;
      limb(b, [Math.cos(a) * 0.3, midY + L / 2 - 0.25, Math.sin(a) * 0.3], [Math.cos(a) * (0.6 + hash(k, 131) * 1.6), roof, Math.sin(a) * (0.6 + hash(k, 132) * 1.6)], 0.05, c.husk, 4, 0.03);
    }
    for (let k = 0; k < 7; k++) {
      const a = k * 0.9 + 0.4;
      limb(b, [Math.cos(a) * r * 0.8, midY + (hash(k, 133) - 0.5) * L * 0.6, Math.sin(a) * r * 0.8], [Math.cos(a) * (3 + hash(k, 134) * 2.5), hash(k, 135) < 0.5 ? 0.02 : 2 + hash(k, 136) * 4, Math.sin(a) * (3 + hash(k, 137) * 2.5)], 0.022, c.silk, 3);
    }
    // Under it: what ran out and dried, and drifts of shed fur.
    b.put(new THREE.CylinderGeometry(1.5, 1.5, 0.015, 11).scale(1, 1, 0.7), c.ichor, 0.1, 0.02, -0.4, 0.4);
    b.put(new THREE.CylinderGeometry(0.7, 0.7, 0.016, 9), c.ichor, -0.9, 0.022, -1.5);
    for (let k = 0; k < 9; k++) b.put(new THREE.DodecahedronGeometry(0.14 + hash(k, 141) * 0.16, 0).scale(1, 0.35, 1), c.fur, (hash(k, 142) - 0.5) * 3.2, 0.05, -0.4 + (hash(k, 143) - 0.6) * 2.6);
    b.pop();
    spot('cocoon', cs - 1.9, clat + 0.6, 1.6);
    kit.cocoonMid = midY;
  }
  // Silk from the cocoon over the charges and the cases (the foreman's log: "it's roped the powder in").
  {
    const [cs, clat] = B.cocoon.at;
    for (let k = 0; k < 6; k++) {
      const a = kit.frame(cs + 0.5, clat + 0.4, 2.2 + hash(k, 151) * 2.4);
      const av = [a.x, a.y, a.z];
      const q = kit.frame(face - 0.6 - hash(k, 152) * 1.2, -3.2 + k * 1.25, 0.3 + hash(k, 153) * 2.2);
      limb(b, av, [q.x, q.y, q.z], 0.02 + hash(k, 154) * 0.02, c.silk, 3);
    }
  }

  // ---- the rock drill on its tripod, where they stopped; its head (Tom takes it) ----
  {
    const [ds, dlat] = B.drill;
    pushAt(b, ds, dlat, 0, -Math.PI / 2 - 0.25, true); // pointing at the near wall
    for (const [x, z] of [[-0.55, -0.5], [0.55, -0.5], [0, 0.75]]) {
      limb(b, [x, 0, z], [x * 0.12, 1.0, z * 0.12], 0.035, c.iron, 5);
      b.box(0.22, 0.14, 0.22, c.ironDark, x, 0.07, z); // the leg weights
    }
    b.box(0.2, 0.12, 0.26, c.ironDark, 0, 1.03, 0);
    b.put(new THREE.CylinderGeometry(0.1, 0.1, 0.78, 9).rotateX(Math.PI / 2), c.bit, 0, 1.2, 0.05); // the drifter's body
    b.put(new THREE.CylinderGeometry(0.035, 0.035, 0.9, 6).rotateX(Math.PI / 2), c.iron, 0, 1.06, 0.05); // the feed screw
    b.box(0.06, 0.2, 0.06, c.grip, 0, 1.25, -0.42);
    b.box(0.3, 0.04, 0.04, c.grip, 0, 1.34, -0.42);
    // The air hose back across the floor to a receiver tank.
    limb(b, [0.08, 1.16, -0.3], [0.5, 0.05, -0.9], 0.03, c.hose, 4);
    limb(b, [0.5, 0.05, -0.9], [1.4, 0.04, -2.6], 0.03, c.hose, 4);
    b.put(new THREE.CylinderGeometry(0.3, 0.3, 1.1, 10).rotateZ(Math.PI / 2), c.tinDark, 1.8, 0.36, -3.0, 0.4);
    // Holes it had drilled in this wall already, not yet charged.
    head.stack = [b.m.clone()];
    b.pop();
    // The head: the chuck and a cross bit as big as a bucket, on a short steel.
    head.put(new THREE.CylinderGeometry(0.13, 0.11, 0.26, 9).rotateX(Math.PI / 2), c.bit, 0, 1.2, 0.56);
    head.put(new THREE.CylinderGeometry(0.045, 0.045, 0.5, 6).rotateX(Math.PI / 2), c.iron, 0, 1.2, 0.9);
    for (const a of [0, Math.PI / 2]) head.box(0.42, 0.07, 0.22, c.bitBright, 0, 1.2, 1.22, 0, 0, a);
    head.put(new THREE.ConeGeometry(0.1, 0.16, 8).rotateX(Math.PI / 2), c.bit, 0, 1.2, 1.38);
    spot('drill', ds, dlat + 0.9, 1.1);
  }

  // ---- the open case of sticks they hadn't used ----
  {
    const [ss, slat] = B.sticks;
    pushAt(b, ss, slat, 0, 0.4, true);
    for (const [x, z, h] of [[0, 0, 0.36], [0.85, 0.15, 0.36]]) {
      b.box(0.74, 0.03, 0.46, c.crateDark, x, 0.015, z);
      for (const sz of [-1, 1]) b.box(0.74, h, 0.03, c.crate, x, h / 2, z + sz * 0.23);
      for (const sx of [-1, 1]) b.box(0.03, h, 0.46, c.crate, x + sx * 0.37, h / 2, z);
    }
    b.box(0.74, 0.03, 0.46, c.crate, -0.2, 0.3, -0.5, 0.2, 1.15); // the lid, leant on it
    b.box(0.76, 0.03, 0.48, c.crateDark, 0.85, 0.375, 0.15); // the other's still nailed down
    b.box(0.5, 0.1, 0.01, c.lead, 0.85, 0.22, -0.085);
    sticks.stack = [b.m.clone()];
    b.pop();
    for (let k = 0; k < 10; k++) sticks.put(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 6).rotateZ(Math.PI / 2), c.stick, -0.2 + (k % 2) * 0.26, 0.06 + Math.floor(k / 4) * 0.04, -0.16 + ((k * 0.37) % 1) * 0.32, (hash(k, 161) - 0.5) * 0.3);
    spot('sticks', ss, slat - 0.5, 0.4);
  }

  // ---- the cavern itself: props up to the roof, cribbing, boulders, silk ----
  for (const [s, lat, k] of [[443, -3.6, 0], [444.5, 3.9, 1], [452, 0.6, 2], [455, -6.0, 3], [457.5, 6.2, 4], [465, 1.8, 5]]) {
    const roof = roofAt(track, s);
    pushAt(b, s, lat, 0, hash(k, 171) * 3, true);
    b.put(new THREE.CylinderGeometry(0.13, 0.16, roof, 7), k % 2 ? c.post : c.postDark, 0, roof / 2, 0, 0, (hash(k, 172) - 0.5) * 0.06, (hash(k, 173) - 0.5) * 0.06);
    b.box(0.8, 0.14, 0.5, c.plankDark, 0, roof - 0.1, 0);
    b.pop();
  }
  // A crib of sleepers by the mouth, boulders along the walls.
  pushAt(b, 441.5, 5.4, 0, 0.3, true);
  for (let l = 0; l < 5; l++) for (const o of [-0.45, 0.45]) b.box(l % 2 ? 1.3 : 0.2, 0.18, l % 2 ? 0.2 : 1.3, l % 2 ? c.post : c.postDark, l % 2 ? 0 : o, 0.09 + l * 0.18, l % 2 ? o : 0);
  b.pop();
  for (let k = 0; k < 16; k++) {
    const s = 440 + hash(k, 181) * 29;
    const sd = k % 2 ? -1 : 1;
    const h = halfAt(track, s);
    // Not on top of what Tom has to get at.
    if ([[B.sticks, 1], [B.drill, -1], [[441.5], 1], [B.foreman, 1]].some(([q, side]) => side === sd && Math.abs(q[0] - s) < 2.6)) continue;
    pushAt(b, s, sd * (h - 0.5 - hash(k, 182) * 0.9), 0, hash(k, 183) * 6, true);
    b.put(new THREE.DodecahedronGeometry(0.4 + hash(k, 184) * 0.7, 0), k % 3 ? c.rock : c.rockDark, 0, 0.2 + hash(k, 185) * 0.3, 0);
    b.pop();
  }
  // Silk: curtains of it from the roof, thicker toward the seam.
  for (let k = 0; k < 20; k++) {
    const s = 439 + hash(k, 191) * 31;
    const h = halfAt(track, s) - 0.6;
    const lat = (hash(k, 192) - 0.5) * 2 * h;
    const roof = roofAt(track, s) - 0.2;
    const a = kit.frame(s, lat, roof);
    const av = [a.x, a.y, a.z];
    const down = hash(k, 193) < 0.45;
    const q = kit.frame(s + (hash(k, 194) - 0.5) * 5, Math.max(-h, Math.min(h, lat + (hash(k, 195) - 0.5) * 7)), down ? 0.02 : roof - 0.6 - hash(k, 196) * 3);
    limb(b, av, [q.x, q.y, q.z], 0.014 + hash(k, 197) * 0.026, c.silk, 3);
  }
  void half;
  return { glow, halo, handle, spark, log: logB, head, sticks };
}
