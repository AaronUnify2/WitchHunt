// Round 2 (Aaron: "the garage should be in the west side of the forest ranger compound within the
// fence... there from the beginning of the game, and the quad bike should be parked in there... we can
// put the workbench outside of the house, and it gives us a more logical place for the shovel").
//
// The rangers' vehicle shed: three open bays under one tin roof, post-and-beam, board-and-batten
// at the back and the ends, on a poured slab. A working place, not a showroom:
//  - bay 0 (nearest the cabin): the quad's. Spare tyres, fuel cans, a pair of ramps, a wall shelf.
//  - bay 1: the workbench along the back wall under a board of tools and a hanging lamp; a vise,
//    files, an oil can; a drum and a stool beside it. The shovel leans here (the station draws it).
//  - bay 2: kept clear for a truck, one day. Firewood along the end wall, a wheelbarrow, fence
//    posts and a roll of wire for the fence, something under a tarp.
// The frame: x across the bays (bay 0 at -x), z from the open front (-z) to the back wall (+z).
// One mesh, baked with the prop kit's weathering. base/stationLayout.js garageLayout() has the
// same measurements for the colliders and the spots.

import * as THREE from 'three';
import { SetBuilder } from './setBuilder.js';
import { bakeParts, pillowGeometry } from './propKit.js';

// A wall panel whose top slopes: thickness t (along x), from z0 (height h0) to z1 (height h1).
function slopedWall(t, z0, h0, z1, h1) {
  const s = new THREE.Shape();
  s.moveTo(z0, 0);
  s.lineTo(z1, 0);
  s.lineTo(z1, h1);
  s.lineTo(z0, h0);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false });
  // The shape is in (x = z, y); the extrusion runs along its z: turn it so the panel's plane is (z, y).
  g.rotateY(-Math.PI / 2);
  g.translate(t / 2, 0, 0);
  return g;
}

// g: the garage's layout (stationLayout.garageLayout). colors: config.station.look.garage.
// Returns { geometry } in the garage's frame, its floor at y = 0.
export function buildGarage(g, colors, { weather = null } = {}) {
  const b = new SetBuilder({ colors }, null, 4107);
  const c = b.c;
  const hw = g.w / 2;
  const hd = g.depth / 2;
  const FH = g.frontHeight;
  const BH = g.backHeight;
  const slope = Math.atan2(FH - BH, g.depth);
  const run = Math.hypot(g.depth, FH - BH);
  const heightAt = (z) => FH + ((BH - FH) * (z + hd)) / g.depth; // the eaves' line over z
  const bayX = (i) => -hw + g.bayWidth * (i + 0.5);

  // ---- the slab, its apron, the stains ----
  b.box(g.w + 0.7, 0.14, g.depth + 0.5, c.slab, 0, 0.0, 0);
  b.box(g.w + 0.7, 0.08, 1.3, c.slab, 0, -0.02, -hd - 0.85, 0, 0.05, 0); // the apron, falling to the yard
  for (const [x, z, w, d] of [[bayX(0) + 0.2, 0.5, 1.1, 1.6], [bayX(0) - 0.5, -1.2, 0.5, 0.4], [bayX(2), 0.3, 1.6, 2.4], [bayX(2) + 0.7, -1.6, 0.6, 0.5], [bayX(1) - 0.9, 1.4, 0.7, 0.5]]) {
    b.box(w, 0.012, d, c.slabStain, x, 0.076, z, b.rand() * 3);
  }
  // Expansion joints between the bays.
  for (let i = 1; i < 3; i++) b.box(0.03, 0.012, g.depth + 0.4, c.slabStain, -hw + i * g.bayWidth, 0.074, 0);

  // ---- the frame ----
  for (let i = 0; i <= 3; i++) {
    const x = -hw + i * g.bayWidth;
    b.box(0.22, FH - 0.07, 0.22, c.post, x, (FH + 0.07) / 2, -hd + 0.15); // front post
    b.box(0.3, 0.18, 0.3, c.slab, x, 0.16, -hd + 0.15); // its footing
    b.box(0.18, BH - 0.07, 0.18, c.post, x, (BH + 0.07) / 2, hd - 0.12); // back post
    // Knee braces under the header, either side of each front post.
    for (const s of [-1, 1]) {
      if ((i === 0 && s < 0) || (i === 3 && s > 0)) continue;
      b.box(0.1, 0.1, 0.85, c.beam, x + s * 0.3, FH - 0.48, -hd + 0.15, Math.PI / 2, s * 0.78, 0);
    }
  }
  b.box(g.w + 0.5, 0.3, 0.2, c.beam, 0, FH - 0.15, -hd + 0.15); // the header
  b.box(g.w + 0.3, 0.2, 0.16, c.beam, 0, BH - 0.1, hd - 0.12); // the back plate
  // Tie beams over the posts, and rafters between.
  for (let x = -hw; x <= hw + 0.01; x += g.bayWidth / 4) {
    const tie = Math.abs(((x + hw) / g.bayWidth) % 1) < 0.01 || Math.abs(((x + hw) / g.bayWidth) % 1) > 0.99;
    b.box(tie ? 0.16 : 0.08, tie ? 0.22 : 0.16, run + 0.9, c.beam, x, (FH + BH) / 2 - (tie ? 0.02 : 0.0), 0, 0, slope, 0);
  }

  // ---- the walls: board and batten, the boards' ends ragged at the eaves ----
  b.box(g.w, BH - 0.1, 0.05, c.board, 0, (BH + 0.1) / 2, hd);
  for (let x = -hw + 0.3; x < hw; x += 0.6) b.box(0.07, BH - 0.14, 0.03, c.batten, x, (BH + 0.1) / 2, hd - 0.04);
  for (const s of [-1, 1]) {
    b.put(slopedWall(0.05, -hd + 0.3, heightAt(-hd + 0.3) - 0.12, hd, BH - 0.06), c.board, s * hw, 0.07, 0);
    for (let z = -hd + 0.6; z < hd; z += 0.6) b.box(0.03, heightAt(z) - 0.2, 0.07, c.batten, s * (hw - 0.04), (heightAt(z) - 0.2) / 2 + 0.07, z);
    // A small square window high in each end wall, its glass gone grey.
    b.box(0.07, 0.62, 0.72, c.batten, s * hw, 1.75, 0.6);
    b.box(0.08, 0.5, 0.6, c.glass, s * hw, 1.75, 0.6);
    b.box(0.09, 0.04, 0.62, c.batten, s * hw, 1.75, 0.6);
    b.box(0.09, 0.52, 0.04, c.batten, s * hw, 1.75, 0.6);
  }

  // ---- the roof: tin sheets on purlins, their ribs, a rust-eaten corner, the gutter ----
  b.push(0, (FH + BH) / 2 + 0.12, 0, 0, slope, 0);
  for (let z = -run / 2 + 0.2; z < run / 2; z += 1.1) b.box(g.w + 0.9, 0.07, 0.09, c.beam, 0, 0, z); // purlins
  const sheet = 0.92;
  const sheets = Math.ceil((g.w + 1.3) / sheet);
  for (let i = 0; i < sheets; i++) {
    const x = -(g.w + 1.3) / 2 + sheet * (i + 0.5);
    const rusty = b.rand() < 0.22;
    const lift = (b.rand() - 0.5) * 0.012;
    b.box(sheet - 0.02, 0.025, run + 1.25 + (b.rand() - 0.5) * 0.12, rusty ? c.tinRust : i % 2 ? c.tin : c.tinDark, x, 0.06 + lift, -0.1);
    for (const r of [-0.3, 0, 0.3]) b.box(0.07, 0.03, run + 1.2, c.tinDark, x + r, 0.085 + lift, -0.1); // the ribs
  }
  b.box(g.w + 1.3, 0.06, 0.16, c.beam, 0, -0.02, -run / 2 - 0.68); // the fascia at the front
  b.box(g.w + 1.2, 0.1, 0.14, c.steelDark, 0, -0.06, run / 2 + 0.6); // the gutter along the back
  b.pop();
  // The downpipe at the east end, into a rain barrel.
  b.box(0.08, BH - 0.5, 0.08, c.steelDark, -hw - 0.12, (BH - 0.5) / 2 + 0.5, hd + 0.2);
  b.put(new THREE.CylinderGeometry(0.34, 0.3, 0.92, 12), c.barrel, -hw - 0.45, 0.46, hd - 0.3);
  b.put(new THREE.CylinderGeometry(0.345, 0.345, 0.04, 12), c.steelDark, -hw - 0.45, 0.72, hd - 0.3);
  b.put(new THREE.CylinderGeometry(0.31, 0.31, 0.04, 12), c.steelDark, -hw - 0.45, 0.24, hd - 0.3);

  // ---- the sign on the header, over the middle bay ----
  b.box(2.3, 0.44, 0.05, c.sign, 0, FH - 0.15, -hd + 0.03);
  b.box(2.36, 0.05, 0.07, c.signBand, 0, FH + 0.06, -hd + 0.03);
  b.box(2.36, 0.05, 0.07, c.signBand, 0, FH - 0.36, -hd + 0.03);
  // The service's shield at its end, and three worn blocks where the words were.
  b.box(0.3, 0.3, 0.06, c.green, -0.88, FH - 0.15, -hd + 0.02);
  b.box(0.2, 0.12, 0.07, c.signBand, -0.88, FH - 0.1, -hd + 0.015);
  for (const [x, w] of [[-0.3, 0.55], [0.32, 0.5], [0.85, 0.36]]) b.box(w, 0.1, 0.06, c.signBand, x, FH - 0.15, -hd + 0.02);

  // ---- bay 1: the workbench ----
  const B = g.bench;
  const bx = B.lx;
  const bz = B.lz;
  b.push(bx, 0.07, bz);
  b.box(B.w, 0.09, B.d, c.bench, 0, B.h - 0.045, 0); // the top: two thick planks
  b.box(B.w, 0.012, 0.02, c.benchDark, 0, B.h + 0.002, 0.02);
  for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(0.1, B.h - 0.09, 0.1, c.benchDark, lx * (B.w / 2 - 0.09), (B.h - 0.09) / 2, lz * (B.d / 2 - 0.08));
  b.box(B.w - 0.2, 0.04, B.d - 0.14, c.benchDark, 0, 0.26, 0); // the shelf under
  b.box(B.w - 0.2, 0.09, 0.04, c.benchDark, 0, 0.55, -B.d / 2 + 0.07); // the front rail
  // On the shelf: a red toolbox, paint tins, a coil of chain.
  b.box(0.55, 0.22, 0.26, c.red, -0.7, 0.39, 0.02);
  b.box(0.3, 0.03, 0.05, c.steelDark, -0.7, 0.515, 0.02);
  for (const [x, col] of [[0.1, c.green], [0.36, c.steel], [0.62, c.yellow]]) {
    b.put(new THREE.CylinderGeometry(0.09, 0.09, 0.2, 10), col, x, 0.38, 0.05);
    b.put(new THREE.CylinderGeometry(0.093, 0.093, 0.02, 10), c.steelDark, x, 0.485, 0.05);
  }
  b.put(new THREE.TorusGeometry(0.13, 0.035, 6, 12).rotateX(Math.PI / 2), c.steelDark, 0.95, 0.31, 0.0);
  // The vise at the east end: its body, the jaws, the screw and its bar.
  b.box(0.2, 0.14, 0.26, c.steel, -B.w / 2 + 0.3, B.h + 0.07, -0.12);
  b.box(0.22, 0.1, 0.06, c.steelDark, -B.w / 2 + 0.3, B.h + 0.19, -0.02);
  b.box(0.22, 0.1, 0.06, c.steelDark, -B.w / 2 + 0.3, B.h + 0.19, -0.2);
  b.tubeZ(0.022, 0.022, -0.5, -0.2, c.steel, -B.w / 2 + 0.3, B.h + 0.1, 6, false);
  b.box(0.3, 0.025, 0.025, c.steel, -B.w / 2 + 0.3, B.h + 0.1, -0.5);
  // The saw chain's place: a bar clamp, three files in a row, an oil can, a jar of nails, a rag.
  for (let i = 0; i < 3; i++) {
    b.box(0.02, 0.016, 0.26, c.steel, 0.05 + i * 0.07, B.h + 0.01, -0.08, 0.1 * i);
    b.box(0.03, 0.03, 0.1, c.yellow, 0.05 + i * 0.07 + 0.013 * i, B.h + 0.016, 0.09, 0.1 * i);
  }
  b.put(new THREE.CylinderGeometry(0.05, 0.065, 0.12, 8), c.red, 0.55, B.h + 0.06, 0.1); // the oil can
  b.put(new THREE.CylinderGeometry(0.008, 0.02, 0.16, 5).rotateZ(-0.9), c.steel, 0.63, B.h + 0.15, 0.1);
  b.put(new THREE.CylinderGeometry(0.05, 0.05, 0.13, 8), c.glass, 0.8, B.h + 0.065, 0.14);
  b.put(new THREE.CylinderGeometry(0.052, 0.052, 0.015, 8), c.steelDark, 0.8, B.h + 0.137, 0.14);
  b.put(pillowGeometry(0.26, 0.03, 0.18), c.tarp, -0.35, B.h + 0.02, 0.05, 0.5);
  // The pegboard on the wall behind, and what hangs on it.
  const py = B.h + 0.85;
  const pz = B.d / 2 + 0.06;
  b.box(B.w + 0.5, 1.15, 0.04, c.pegboard, 0, py, pz);
  b.box(B.w + 0.56, 0.05, 0.06, c.benchDark, 0, py + 0.58, pz - 0.01);
  b.box(B.w + 0.56, 0.05, 0.06, c.benchDark, 0, py - 0.58, pz - 0.01);
  // A hand saw: blade and grip.
  b.box(0.56, 0.13, 0.012, c.steel, -0.75, py + 0.25, pz - 0.035, 0, 0, -0.12);
  b.box(0.14, 0.15, 0.03, c.bench, -1.08, py + 0.3, pz - 0.035, 0, 0, -0.12);
  // A bow saw.
  b.put(new THREE.TorusGeometry(0.26, 0.014, 5, 10, Math.PI), c.red, 0.9, py + 0.12, pz - 0.035);
  b.box(0.52, 0.02, 0.012, c.steel, 0.9, py + 0.12, pz - 0.035);
  // A claw hammer, a mallet, three spanners, a pair of pliers, a square.
  b.box(0.035, 0.34, 0.03, c.bench, -0.3, py + 0.1, pz - 0.035);
  b.box(0.14, 0.05, 0.045, c.steelDark, -0.3, py + 0.28, pz - 0.035);
  b.box(0.04, 0.3, 0.035, c.bench, -0.05, py + 0.12, pz - 0.035);
  b.box(0.16, 0.1, 0.09, c.benchDark, -0.05, py + 0.3, pz - 0.035);
  for (let i = 0; i < 3; i++) {
    b.box(0.03, 0.2 + i * 0.05, 0.012, c.steel, 0.22 + i * 0.1, py + 0.2 - i * 0.025, pz - 0.03);
    b.put(new THREE.TorusGeometry(0.026, 0.01, 4, 8), c.steel, 0.22 + i * 0.1, py + 0.32, pz - 0.03);
  }
  b.box(0.32, 0.035, 0.012, c.steel, 0.42, py - 0.25, pz - 0.03);
  b.box(0.035, 0.24, 0.012, c.steel, 0.28, py - 0.14, pz - 0.03);
  // A coil of rope on a peg, a roll of tape, a row of screwdrivers in a strip.
  b.put(new THREE.TorusGeometry(0.16, 0.04, 6, 14), c.rope, -0.75, py - 0.22, pz - 0.05);
  b.put(new THREE.TorusGeometry(0.07, 0.03, 5, 10), c.steelDark, -0.3, py - 0.3, pz - 0.045);
  b.box(0.6, 0.04, 0.03, c.benchDark, 0.95, py - 0.3, pz - 0.035);
  for (let i = 0; i < 5; i++) {
    b.box(0.03, 0.09, 0.03, [c.red, c.yellow, c.blue, c.red, c.green][i], 0.72 + i * 0.11, py - 0.23, pz - 0.04);
    b.box(0.012, 0.13, 0.012, c.steel, 0.72 + i * 0.11, py - 0.38, pz - 0.04);
  }
  b.pop();
  // The lamp over it: a tin shade on two chains from a rafter.
  b.box(1.3, 0.05, 0.2, c.steelDark, bx, 2.05, bz - 0.15);
  b.box(1.2, 0.03, 0.12, c.glass, bx, 2.02, bz - 0.15);
  for (const s of [-1, 1]) b.box(0.012, heightAt(bz - 0.15) - 2.1, 0.012, c.steelDark, bx + s * 0.5, (heightAt(bz - 0.15) + 2.07) / 2, bz - 0.15);
  // A drum of oil with a hand pump, and a stool.
  const dx = bx + B.w / 2 + 0.6;
  b.put(new THREE.CylinderGeometry(0.29, 0.29, 0.88, 12), c.blue, dx, 0.51, hd - 0.5);
  for (const y of [0.3, 0.72]) b.put(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 12), c.steelDark, dx, y, hd - 0.5);
  b.box(0.04, 0.5, 0.04, c.steel, dx + 0.1, 1.15, hd - 0.5);
  b.box(0.2, 0.03, 0.03, c.steel, dx + 0.18, 1.36, hd - 0.5);
  b.put(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 10), c.bench, bx + 0.5, 0.67, bz - 0.95);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    b.box(0.035, 0.6, 0.035, c.benchDark, bx + 0.5 + Math.cos(a) * 0.12, 0.37, bz - 0.95 + Math.sin(a) * 0.12, 0, Math.sin(a) * 0.14, -Math.cos(a) * 0.14);
  }

  // ---- bay 0: the quad's ----
  const qx = bayX(0);
  // Spare tyres stacked in the back corner by the end wall, one leaning.
  for (let i = 0; i < 2; i++) b.put(new THREE.TorusGeometry(0.22, 0.11, 7, 14).rotateX(Math.PI / 2), c.rubber, -hw + 0.5, 0.18 + i * 0.22, hd - 0.55);
  b.put(new THREE.TorusGeometry(0.22, 0.11, 7, 14), c.rubber, -hw + 1.15, 0.4, hd - 0.28, 0, -0.22, 0);
  // Fuel cans: two red, one green.
  for (const [x, z, col, yaw] of [[qx + 1.3, hd - 0.4, c.can, 0.1], [qx + 0.95, hd - 0.45, c.can, -0.2], [qx + 1.2, hd - 0.85, c.green, 0.6]]) {
    b.box(0.17, 0.42, 0.3, col, x, 0.28, z, yaw);
    b.box(0.04, 0.05, 0.16, c.steelDark, x, 0.52, z, yaw);
    b.put(new THREE.CylinderGeometry(0.025, 0.025, 0.07, 6), c.steelDark, x, 0.52, z + 0.1);
  }
  // A pair of loading ramps leaning on the end wall.
  for (const z of [-0.9, -0.45]) {
    b.box(0.05, 1.9, 0.3, c.steel, -hw + 0.22, 0.98, z, 0, 0, 0.16);
    for (let y = 0.3; y < 1.8; y += 0.3) b.box(0.06, 0.03, 0.3, c.steelDark, -hw + 0.22 + (y - 0.98) * 0.16, y + 0.05, z, 0, 0, 0.16);
  }
  // A shelf on the back wall: oil bottles, a helmet, a box of rags.
  b.box(1.5, 0.04, 0.26, c.bench, qx - 0.3, 1.5, hd - 0.17);
  for (const x of [-0.6, 0.6]) b.box(0.04, 0.2, 0.22, c.steelDark, qx - 0.3 + x, 1.39, hd - 0.17, 0, 0.5, 0);
  for (let i = 0; i < 4; i++) b.put(new THREE.CylinderGeometry(0.045, 0.05, 0.2, 7), [c.yellow, c.blue, c.steelDark, c.yellow][i], qx - 0.85 + i * 0.13, 1.62, hd - 0.18);
  b.put(new THREE.SphereGeometry(0.15, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.6), c.green, qx - 0.05, 1.56, hd - 0.2);
  b.box(0.34, 0.16, 0.2, c.board, qx + 0.3, 1.6, hd - 0.17);
  // A hose reel on the wall, and a broom.
  b.put(new THREE.TorusGeometry(0.2, 0.06, 6, 14), c.green, qx + 1.5, 1.3, hd - 0.1);
  b.box(0.03, 1.5, 0.03, c.bench, qx - 1.6, 0.82, hd - 0.2, 0, 0.12, 0.05);
  b.box(0.3, 0.1, 0.06, c.rope, qx - 1.62, 0.12, hd - 0.3);

  // ---- bay 2: kept clear down the middle ----
  const wx = hw - 0.42;
  // Firewood along the end wall: split rounds in rows between two stakes, bark out, pale ends to the bay.
  for (let row = 0; row < 5; row++) {
    for (let z = -1.9 + (row % 2) * 0.12; z < 1.5; z += 0.26) {
      const r = 0.105 + b.rand() * 0.035;
      b.put(new THREE.CylinderGeometry(r, r, 0.5, 6).rotateZ(Math.PI / 2), c.firewood, wx, 0.2 + row * 0.22, z + (b.rand() - 0.5) * 0.04, 0, b.rand() * 3, 0);
      b.put(new THREE.CylinderGeometry(r * 0.94, r * 0.94, 0.012, 6).rotateZ(Math.PI / 2), c.firewoodEnd, wx - 0.255, 0.2 + row * 0.22, z);
    }
  }
  for (const z of [-2.1, 1.7]) b.box(0.07, 1.4, 0.07, c.post, wx - 0.1, 0.77, z);
  // A chopping block with an axe head's wedge left in it (no axe to take: only the splitting wedge).
  b.put(new THREE.CylinderGeometry(0.26, 0.28, 0.42, 9), c.firewood, wx - 0.75, 0.28, -2.3);
  b.put(new THREE.CylinderGeometry(0.25, 0.25, 0.012, 9), c.firewoodEnd, wx - 0.75, 0.496, -2.3);
  b.box(0.05, 0.1, 0.12, c.steelDark, wx - 0.75, 0.53, -2.3, 0.4, 0, 0.2);
  // Fence posts and a roll of chain-link in the back corner: what the ledger's repairs are made of.
  for (let i = 0; i < 5; i++) b.put(new THREE.CylinderGeometry(0.035, 0.035, 2.3, 6), c.steel, wx - 0.2 - i * 0.09, 1.2, hd - 0.2 - (i % 2) * 0.07, 0, -0.06 - i * 0.008, 0.02 * i);
  b.put(new THREE.CylinderGeometry(0.24, 0.24, 1.2, 12), c.wire, wx - 1.0, 0.67, hd - 0.42);
  b.put(new THREE.CylinderGeometry(0.16, 0.16, 1.21, 10), c.steelDark, wx - 1.0, 0.67, hd - 0.42);
  // A wheelbarrow, tipped up against the back wall.
  const bw = bayX(2) - 0.9;
  b.push(bw, 0.07, hd - 0.55, 0.15, -1.15, 0);
  b.box(0.62, 0.3, 0.85, c.green, 0, 0.45, 0);
  b.box(0.56, 0.02, 0.8, c.steelDark, 0, 0.59, 0);
  for (const s of [-1, 1]) b.box(0.035, 0.035, 1.5, c.bench, s * 0.27, 0.3, 0.3);
  b.put(new THREE.TorusGeometry(0.15, 0.05, 6, 12).rotateY(Math.PI / 2), c.rubber, 0, 0.2, -0.55);
  b.pop();
  // Something under a tarp by the back wall, roped down.
  b.put(pillowGeometry(1.5, 0.75, 0.9), c.tarp, bayX(2) + 0.55, 0.45, hd - 0.62, 0.06);
  for (const x of [-0.4, 0.35]) b.box(0.025, 0.02, 1.0, c.rope, bayX(2) + 0.55 + x, 0.83, hd - 0.62, 0.06);

  return { geometry: bakeParts(b.parts, { weather, baseAt: () => 0, seed: 41 }) };
}
