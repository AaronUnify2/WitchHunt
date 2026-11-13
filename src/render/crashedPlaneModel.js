// The crashed plane's set (Session 24; DESIGN.md "Crashed plane"): the
// military patrol plane the dogfight brought down, as Tom finds it. All in
// code, baked into ONE vertex-coloured mesh (render/propKit.js): one draw
// call, no lights, dull colours (the glare rule).
//
// It came in low from behind (-z) and tore a furrow through the trees:
//  - the gouge: a long trench of churned earth with heaped banks, trees
//    snapped off either side, panels and a wheel thrown clear;
//  - the sheared wing, back along the gouge, leaning on a broken trunk,
//    its gun pod scorched; the engine it lost, burnt, further back;
//  - the tail, snapped off and rolled over, the fin canted up;
//  - the front of the plane, its nose ploughed into a heap of earth, held
//    up off the ground by the engine under the wing it kept. The canopy's
//    broken open; the pilot's still in his seat;
//  - that wing, waist high: the grey's workbench. One gun pod's been taken
//    off and pried open beside it, and its gun laid out along the wing in
//    neat rows, like a dissection: barrel, receiver, bolt, springs, the
//    feed chute, a belt of rounds, the spent cases sorted;
//  - the pilot's survival kit, open on the ground under the cockpit: the
//    flare pistol and its flares (the signal flare), his knee-board (the log).
//
// Model space: the plane was heading +z; the origin is in the gouge just
// behind the wreck (the clearing's middle: clear ground to stand on).
//
// buildCrashedPlane(look, { weather, heightAt }) returns { group, mesh,
// spots, colliders, dispose }:
//  - heightAt(x, z): the ground under a point of the model (model space;
//    flat if left out), so every piece sits on the real ground;
//  - spots: { name: { x, y, z } } for the encounter (Session 25): where the
//    grey works, where it takes cover, the cockpit, the kit, the log;
//  - colliders: circles { x, z, r, top } and segments { seg, ax, az, bx,
//    bz, t, top, blocksShots } in model space (top: metres above its ground).

import * as THREE from 'three';
import { bakeParts } from './propKit.js';
import { SetBuilder as Builder } from './setBuilder.js';

const FUSELAGE_R = 0.75;

// ---- pieces ------------------------------------------------------------------------------------

// A torn end of the fuselage at z (facing dir: 1 toward +z, -1 toward -z):
// dark inside, a frame ring, the skin peeled back in flaps, cables hanging.
function tornEnd(b, z, dir, r) {
  const c = b.c;
  b.put(new THREE.CircleGeometry(r * 0.97, 12), c.hollow, 0, 0, z - dir * 0.25, dir > 0 ? 0 : Math.PI);
  b.put(new THREE.TorusGeometry(r * 0.94, 0.04, 5, 14), c.frame, 0, 0, z - dir * 0.08);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + b.rand();
    const len = 0.25 + b.rand() * 0.45;
    const out = 0.25 + b.rand() * 0.7;
    // A flap: hinged on the rim, bent outward.
    b.push(Math.cos(a) * r, Math.sin(a) * r, z, 0, 0, a - Math.PI / 2);
    b.box(0.3 + b.rand() * 0.25, 0.02, len, i % 3 ? c.body : c.bodyDark, 0, Math.sin(out) * len * 0.5, dir * Math.cos(out) * len * 0.5, 0, -dir * out, 0);
    b.pop();
  }
  for (let i = 0; i < 4; i++) {
    const x = (b.rand() - 0.5) * r;
    const len = 0.3 + b.rand() * 0.5;
    b.box(0.02, len, 0.02, c.hollow, x, r * 0.55 - len / 2, z + dir * (0.05 + b.rand() * 0.2), 0, dir * 0.3, (b.rand() - 0.5) * 0.4);
  }
}

// The star-in-a-disc marking, faded, on a surface facing +x (side 1) or -x (side -1) at (x, y, z).
function marking(b, x, y, z, side, r) {
  const c = b.c;
  b.put(new THREE.CircleGeometry(r, 16), c.markingDark, x, y, z, (side * Math.PI) / 2);
  const star = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const k = i % 2 ? r * 0.36 : r * 0.9;
    if (i === 0) star.moveTo(Math.cos(a) * k, Math.sin(a) * k);
    else star.lineTo(Math.cos(a) * k, Math.sin(a) * k);
  }
  b.put(new THREE.ShapeGeometry(star), c.marking, x + side * 0.006, y, z, (side * Math.PI) / 2);
}

// A wing panel lying in the frame's xz plane: from x0 to x1 (the tip), its
// chord tapering, a flap hanging loose, the tip torn.
function wingPanel(b, x0, x1, z, chord, torn) {
  const c = b.c;
  const dir = Math.sign(x1 - x0);
  const len = Math.abs(x1 - x0);
  const g = new THREE.BoxGeometry(len, 0.22, chord, 6, 1, 2);
  const pos = g.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const t = pos.getX(i) / len + 0.5; // 0 at the -x end, 1 at the +x end
    const out = dir > 0 ? t : 1 - t;
    pos.setZ(i, pos.getZ(i) * (1 - 0.3 * out) - 0.12 * out * chord);
    pos.setY(i, pos.getY(i) * (1 - 0.45 * out));
  }
  g.computeVertexNormals();
  b.put(g, c.body, (x0 + x1) / 2, 0, z);
  // Panel lines and the walkway strip by the root.
  for (const k of [0.25, 0.5, 0.75]) b.box(0.03, 0.225, chord * (1 - 0.3 * k), c.bodyDark, x0 + dir * len * k, 0.002, z - 0.12 * k * chord);
  b.box(0.5, 0.012, chord * 0.7, c.bodyDark, x0 + dir * 0.45, 0.112, z);
  // The flap, hanging off its hinges.
  b.box(len * 0.4, 0.04, 0.45, c.bodyDark, x0 + dir * len * 0.4, -0.22, z - chord * 0.5 - 0.1, 0, 0.8, 0);
  if (torn) {
    for (let i = 0; i < 5; i++) b.box(0.25 + b.rand() * 0.3, 0.02, 0.3 + b.rand() * 0.4, i % 2 ? c.body : c.frame, x1 + dir * 0.05, (b.rand() - 0.5) * 0.25, z - 0.3 + (i - 2) * 0.3, b.rand(), (b.rand() - 0.5) * 1.2, (b.rand() - 0.5) * 1.2);
  }
}

// An engine along z at (x, y, z): the cowl, the spinner, three blades bent back by the ground.
function engine(b, x, y, z, burnt) {
  const c = b.c;
  const cowl = burnt ? c.scorch : c.bodyDark;
  b.tubeZ(0.4, 0.44, z - 1.3, z + 1.1, cowl, x, y, 10, false);
  b.put(new THREE.ConeGeometry(0.2, 0.5, 8).rotateX(Math.PI / 2), c.frame, x, y, z + 1.35);
  b.put(new THREE.TorusGeometry(0.4, 0.05, 5, 12), c.frame, x, y, z + 1.1);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    b.push(x, y, z + 1.2, 0, 0, a);
    b.box(0.16, 0.6, 0.03, c.prop, 0, 0.45, 0);
    b.box(0.14, 0.6, 0.03, c.prop, 0, 0.95, -0.14, 0, -0.5, 0); // the outer half, curled back
    b.pop();
  }
}

// A gun pod along z: scorched and whole, or pried open (its top off, its gun gone).
function gunPod(b, x, y, z, open) {
  const c = b.c;
  if (!open) {
    b.tubeZ(0.19, 0.19, z - 0.8, z + 0.7, c.scorch, x, y, 8, false);
    b.put(new THREE.ConeGeometry(0.19, 0.4, 8).rotateX(Math.PI / 2), c.scorch, x, y, z + 0.9);
    b.tubeZ(0.035, 0.035, z + 0.9, z + 1.35, c.gunmetal, x, y, 6, false);
    return;
  }
  // The lower half as a trough, the upper cowl lying beside it, empty mounts inside.
  b.put(new THREE.CylinderGeometry(0.19, 0.19, 1.5, 8, 1, true, Math.PI / 2, Math.PI).rotateX(Math.PI / 2), c.bodyDark, x, y, z);
  b.box(0.3, 0.02, 1.4, c.hollow, x, y - 0.02, z);
  for (const dz of [-0.5, 0, 0.5]) b.box(0.3, 0.07, 0.04, c.frame, x, y, z + dz);
  b.put(new THREE.CylinderGeometry(0.19, 0.19, 1.5, 8, 1, true, Math.PI / 2, Math.PI).rotateX(Math.PI / 2), c.body, x + 0.55, y + 0.02, z + 0.15, 0.25, 0, Math.PI);
}

// The gun, taken apart and laid out along the wing's top (y: its surface)
// from x0 outward: every part square to the next, sorted by kind and size.
function dissection(b, x0, y, z) {
  const c = b.c;
  // A square of canvas under it all (cut from the pilot's kit), so nothing rolls off and nothing's lost.
  b.box(2.5, 0.012, 1.25, c.canvas, x0 + 0.95, y + 0.006, z);
  const k = 1.35; // the parts drawn a little large, to read from where Tom stands
  const lay = (geo, color, x, dz, h, yaw = 0) => b.put(geo.scale(k, k, k), color, x0 + (x - x0) * k, y + 0.012 + h * k, z + dz * k, yaw);
  // The barrel, the receiver and its cover, the bolt, the feed chute.
  lay(new THREE.CylinderGeometry(0.03, 0.035, 1.15, 8).rotateX(Math.PI / 2), c.gunmetal, x0, 0, 0.035);
  lay(new THREE.BoxGeometry(0.13, 0.12, 0.55), c.gunmetal, x0 + 0.22, -0.25, 0.06);
  lay(new THREE.BoxGeometry(0.12, 0.02, 0.5), c.gunmetal, x0 + 0.22, 0.38, 0.01);
  lay(new THREE.BoxGeometry(0.06, 0.06, 0.3), c.steel, x0 + 0.42, -0.35, 0.03);
  lay(new THREE.BoxGeometry(0.1, 0.04, 0.5), c.gunmetal, x0 + 0.42, 0.2, 0.02);
  // Springs and pins, longest first.
  for (let i = 0; i < 4; i++) lay(new THREE.CylinderGeometry(0.012, 0.012, 0.4 - i * 0.07, 6).rotateX(Math.PI / 2), c.steel, x0 + 0.58 + i * 0.06, -0.4 + (0.4 - i * 0.07) / 2, 0.012);
  for (let i = 0; i < 6; i++) lay(new THREE.BoxGeometry(0.02, 0.02, 0.05), c.steel, x0 + 0.58 + i * 0.045, 0.25, 0.01);
  // A belt of live rounds in a row, and the spent cases stood up in ranks.
  for (let i = 0; i < 16; i++) lay(new THREE.CylinderGeometry(0.011, 0.011, 0.1, 6).rotateX(Math.PI / 2), c.brass, x0 + 0.95 + i * 0.035, -0.3, 0.011);
  for (let i = 0; i < 12; i++) lay(new THREE.CylinderGeometry(0.011, 0.011, 0.07, 6), c.brass, x0 + 0.95 + (i % 6) * 0.045, 0.1 + Math.floor(i / 6) * 0.06, 0.035);
  // The cowl's screws, in a line; the access panel they came from.
  for (let i = 0; i < 8; i++) lay(new THREE.BoxGeometry(0.014, 0.014, 0.014), c.steel, x0 + 0.95 + i * 0.04, 0.4, 0.007);
  lay(new THREE.BoxGeometry(0.4, 0.015, 0.3), c.bodyDark, x0 + 1.75, 0.05, 0.008, 0.06);
}

// The pilot, dead in his seat: slumped forward against the straps, helmet down.
function pilot(b, z) {
  const c = b.c;
  b.box(0.5, 0.75, 0.12, c.seat, 0, 0.5, z - 0.32, 0, -0.1, 0); // the seat's back
  b.box(0.42, 0.5, 0.26, c.flightSuit, 0, 0.42, z, 0, 0.45, 0);
  b.put(new THREE.SphereGeometry(0.15, 10, 8), c.helmet, 0.03, 0.7, z + 0.26);
  b.box(0.2, 0.08, 0.06, c.hollow, 0.03, 0.66, z + 0.38, 0, 0.5, 0); // the visor
  for (const s of [-1, 1]) {
    b.box(0.11, 0.42, 0.11, c.flightSuit, s * 0.27, 0.38, z + 0.1, 0, 0.7, s * 0.2);
    b.box(0.05, 0.5, 0.012, c.strap, s * 0.11, 0.48, z + 0.13, 0, 0.45, 0);
  }
}

// The cockpit, from z0 (its back) to z1 (the windscreen's foot): the sill,
// what's left of the canopy's frame, broken glass, the pilot.
function cockpit(b, z0, z1) {
  const c = b.c;
  const len = z1 - z0;
  const mid = (z0 + z1) / 2;
  b.push(0, 0.33, 0); // up on the hull's back: he sits head and shoulders above it
  b.box(0.82, 0.1, len, c.hollow, 0, 0.4, mid); // the opening, dark
  for (const s of [-1, 1]) b.box(0.07, 0.07, len + 0.1, c.frame, s * 0.43, 0.68, mid);
  // The windscreen's frame, still standing, and the hoop behind the seat.
  for (const s of [-1, 1]) b.box(0.05, 0.62, 0.05, c.frame, s * 0.36, 0.93, z1 - 0.12, 0, -0.55, s * 0.12);
  b.box(0.7, 0.05, 0.05, c.frame, 0, 1.17, z1 - 0.3);
  b.put(new THREE.TorusGeometry(0.42, 0.035, 5, 10, Math.PI), c.frame, 0, 0.68, z0 + 0.1);
  // Glass: one pane left in the windscreen, cracked across; shards along the sill.
  b.box(0.3, 0.5, 0.012, c.glass, -0.17, 0.93, z1 - 0.13, 0, -0.55, 0);
  for (let i = 0; i < 6; i++) b.box(0.012, 0.08 + b.rand() * 0.18, 0.1 + b.rand() * 0.12, c.glass, (i % 2 ? 1 : -1) * 0.43, 0.76, z0 + 0.2 + (i / 6) * (len - 0.4), 0, b.rand() - 0.5, 0);
  b.box(0.7, 0.2, 0.25, c.bodyDark, 0, 0.62, z1 - 0.2); // the instrument cowl
  pilot(b, mid - 0.15);
  b.pop();
}

// A heap of turned earth: n lumps round (x, z), about `spread` across and `high` tall.
function earthHeap(b, x, z, spread, high, n, color) {
  for (let i = 0; i < n; i++) {
    const a = b.rand() * Math.PI * 2;
    const d = Math.sqrt(b.rand()) * spread;
    const px = x + Math.cos(a) * d;
    const pz = z + Math.sin(a) * d;
    const k = 1 - (d / spread) * 0.6;
    const g = new THREE.SphereGeometry(1, 9, 6).scale(0.55 + b.rand() * 0.5, high * k * (0.6 + b.rand() * 0.5), 0.55 + b.rand() * 0.5);
    b.put(g, color, px, b.heightAt(px, pz) - 0.05, pz, b.rand() * 3);
  }
}

// A tree snapped off at `high`: the trunk, a splintered top, bark hanging.
function snappedTrunk(b, x, z, r, high, lean) {
  const c = b.c;
  b.pushOnGround(x, -0.2, z, b.rand() * 6, lean, 0);
  b.put(new THREE.CylinderGeometry(r * 0.85, r * 1.15, high + 0.2, 8), c.bark, 0, (high + 0.2) / 2, 0);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + b.rand();
    const len = 0.3 + b.rand() * 0.6;
    b.put(new THREE.ConeGeometry(r * 0.3, len, 4), c.heartwood, Math.cos(a) * r * 0.5, high + 0.2 + len / 2 - 0.05, Math.sin(a) * r * 0.5, 0, (b.rand() - 0.5) * 0.4, (b.rand() - 0.5) * 0.4);
  }
  b.post(0, 0, 0, r + 0.1, high);
  b.pop();
}

// ---- the set -----------------------------------------------------------------------------------

export function buildCrashedPlane(look, { weather = null, heightAt = null } = {}) {
  const b = new Builder(look, heightAt);
  const c = b.c;
  const R = FUSELAGE_R;

  // The gouge: a dark trench down the middle, banks heaped either side, growing toward the wreck.
  for (let z = -23; z < 3.5; z += 1.3) {
    const k = (z + 23) / 26; // 0 where it first touched, 1 at the wreck
    const wander = Math.sin(z * 0.23) * 0.5;
    earthHeap(b, wander, z, 0.8 + k * 0.4, 0.1, 2, c.earthDark); // the trench's floor, churned
    for (const s of [-1, 1]) earthHeap(b, wander + s * (1.6 + k * 0.6), z, 0.7, 0.18 + k * 0.3, 2, c.earth);
  }

  // Snapped trees along it (taller, the further back: it was still coming down).
  snappedTrunk(b, -3.4, -21, 0.26, 4.6, 0.05);
  snappedTrunk(b, 3.8, -18.5, 0.3, 3.9, -0.04);
  snappedTrunk(b, -4.2, -15, 0.24, 3.0, 0.08);
  snappedTrunk(b, 4.6, -12.5, 0.28, 2.2, 0.03);
  snappedTrunk(b, -5.6, -8.2, 0.3, 1.25, -0.05); // the sheared wing leans on this one
  snappedTrunk(b, 4.2, -5.5, 0.25, 1.0, 0.1);

  // Thrown clear: skin panels, a main wheel on its leg.
  for (let i = 0; i < 16; i++) {
    const x = (b.rand() - 0.5) * 17;
    const z = -21 + b.rand() * 29;
    if (Math.abs(x) < 1.6 && z > -1.5 && z < 2.5) continue; // not where Tom arrives
    b.pushOnGround(x, 0.04, z, b.rand() * 6, (b.rand() - 0.5) * 0.5, (b.rand() - 0.5) * 0.5);
    b.box(0.3 + b.rand() * 0.8, 0.02, 0.25 + b.rand() * 0.6, i % 4 ? c.body : c.bodyDark, 0, 0, 0);
    b.pop();
  }
  b.pushOnGround(3.0, 0.3, -9.5, 0.7, 0, 1.2);
  b.put(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 12).rotateZ(Math.PI / 2), c.rubber, 0, 0, 0);
  b.put(new THREE.CylinderGeometry(0.12, 0.12, 0.22, 8).rotateZ(Math.PI / 2), c.steel, 0, 0, 0);
  b.put(new THREE.CylinderGeometry(0.045, 0.045, 1.1, 6), c.steel, 0.15, 0.55, 0);
  b.pop();

  // The wing it lost, back along the gouge: one end in the dirt, the other up on a broken trunk.
  b.pushOnGround(-4.4, 0.62, -9.4, 0.38, 0, 0.19);
  wingPanel(b, 3, -3, 0, 2.1, true);
  gunPod(b, -1.6, -0.3, 0.3, false);
  for (let i = 0; i < 4; i++) b.box(0.5 + b.rand() * 0.6, 0.012, 0.4 + b.rand() * 0.5, c.scorch, -1.8 + i * 0.5, 0.115, (b.rand() - 0.5) * 0.9, b.rand());
  b.wall(-3, 0, 3, 0, 0, 1.0, 1.4);
  b.pop();
  // Its engine, torn out and burnt, in a patch of scorched ground.
  b.pushOnGround(-2.6, 0.36, -14.6, 2.2, 0.12, 0.3);
  engine(b, 0, 0, 0, true);
  b.post(0, 0, 0, 0.9, 0.9);
  b.pop();
  earthHeap(b, -2.6, -14.6, 1.6, 0.06, 7, c.scorch);

  // The tail: snapped off behind the wing, rolled onto its side, the fin canted up.
  b.pushOnGround(-5.2, 0.62, 5.0, -0.9, -0.04, 0.95);
  b.tubeZ(0.38, 0.7, -4.6, 0, c.body, 0, 0);
  b.put(new THREE.ConeGeometry(0.38, 0.7, 12).rotateX(-Math.PI / 2), c.body, 0, 0, -4.95);
  tornEnd(b, 0, 1, 0.7);
  b.box(0.14, 2.0, 1.5, c.body, 0, 1.3, -3.8, 0, -0.25, 0); // the fin
  b.box(0.15, 0.5, 1.2, c.bodyDark, 0, 2.15, -4.15, 0, -0.25, 0); // its cap, the tail's band
  b.box(2.4, 0.12, 1.15, c.body, 1.35, 0.3, -3.9); // one tailplane, up in the air
  b.box(1.3, 0.12, 1.1, c.body, -0.9, 0.2, -3.9, 0, 0, 0.5); // the other, folded under it
  marking(b, 0, 0.05, -1.6, 1, 0.3);
  b.wall(0, -4.9, 0, 0, 0, 0.75, 1.7);
  b.pop();

  // The front of the plane: the nose in a heap of earth, rolled a little
  // toward the wing it lost, held up by the engine under the one it kept.
  earthHeap(b, 0.9, 12.6, 2.0, 0.75, 14, c.earth);
  b.pushOnGround(0.6, 0.7, 8.0, 0.1, 0.07, 0.12);
  b.tubeZ(R, R, -3, 2.6, c.body, 0, 0);
  b.put(new THREE.SphereGeometry(R, 12, 8).scale(1, 0.92, 2.1), c.body, 0, 0, 2.6);
  b.box(0.05, 0.03, 5.4, c.bodyDark, 0, R, -0.3); // the spine's panel line
  for (const z of [-1.9, -0.6, 0.6]) b.put(new THREE.TorusGeometry(R + 0.004, 0.012, 4, 14), c.bodyDark, 0, 0, z);
  tornEnd(b, -3, -1, R);
  cockpit(b, 0.7, 2.4);
  marking(b, R + 0.005, 0.1, -1.4, 1, 0.34);
  marking(b, -R - 0.005, 0.1, -1.4, -1, 0.34);
  // The stub where the other wing tore away: spars and skin.
  for (let i = 0; i < 6; i++) b.box(0.4 + b.rand() * 0.5, 0.03, 0.2 + b.rand() * 0.3, i % 2 ? c.frame : c.body, -R - 0.3, -0.1 + (b.rand() - 0.5) * 0.2, -1.4 + i * 0.3, 0, (b.rand() - 0.5) * 0.9, (b.rand() - 0.5) * 0.9);
  // The wing it kept (the workbench), its engine under it on the ground, the other gun pod's empty rack.
  const wingY = 0; // the wing's middle, in the hull's frame
  const wingZ = -0.6;
  wingPanel(b, R - 0.1, 6.6, wingZ, 2.1, true);
  engine(b, 3.2, wingY - 0.5, wingZ + 0.5, false);
  b.box(0.1, 0.16, 0.9, c.frame, 5.1, wingY - 0.19, wingZ + 0.2);
  dissection(b, 1.5, wingY + 0.11, wingZ + 0.05);
  // The pod itself, pried open on the ground in front of the wing; its cowl panels leaned on the leading edge.
  b.push(4.4, wingY - 1.1, wingZ + 2.0, 0.4, 0, -0.12);
  gunPod(b, 0, 0.19, 0, true);
  b.pop();
  b.box(0.5, 0.02, 0.7, c.body, 2.2, wingY - 0.5, wingZ + 1.2, 0, -1.1, 0);
  b.box(0.4, 0.02, 0.55, c.bodyDark, 2.9, wingY - 0.6, wingZ + 1.22, 0.1, -1.15, 0);
  // For the encounter: where the grey works (in front of the wing, facing it), and its cover (behind it).
  b.spot('work', 2.4, wingY - 0.9, wingZ + 1.75);
  b.spot('cover', 3.6, wingY - 1.1, wingZ - 1.9);
  b.spot('bench', 2.4, wingY + 0.11, wingZ);
  b.spot('cockpit', 0, 0.75, 1.5);
  b.wall(0, -3, 0, 4.1, 0, R, 1.75);
  b.wall(R, wingZ, 6.6, wingZ - 0.4, 0, 0.95, 1.45);
  b.post(3.2, 0, wingZ + 1.2, 0.5, 1.0);
  b.pop();

  // The pilot's survival kit, open on the ground under the cockpit (the
  // side with no wing): the flare pistol and three flares; his knee-board.
  b.pushOnGround(-0.9, 0, 9.9, 0.5);
  b.box(0.42, 0.12, 0.3, c.kit, 0, 0.06, 0);
  b.box(0.42, 0.02, 0.3, c.kit, 0, 0.2, -0.2, 0, -1.2, 0); // the lid, thrown back
  b.box(0.36, 0.02, 0.24, c.hollow, 0, 0.125, 0);
  b.box(0.05, 0.05, 0.2, c.gunmetal, -0.08, 0.15, 0.02, 0.2);
  b.box(0.045, 0.1, 0.045, c.gunmetal, -0.085, 0.1, -0.06, 0.2);
  for (let i = 0; i < 3; i++) b.put(new THREE.CylinderGeometry(0.02, 0.02, 0.11, 8).rotateX(Math.PI / 2), c.flare, 0.04 + i * 0.05, 0.15, 0);
  b.spot('kit', 0, 0.15, 0);
  b.pop();
  b.pushOnGround(-1.5, 0.012, 9.2, -0.7);
  b.box(0.2, 0.012, 0.28, c.bodyDark, 0, 0, 0);
  b.box(0.17, 0.004, 0.24, c.paper, 0, 0.008, -0.01);
  b.spot('log', 0, 0.03, 0);
  b.pop();

  const geometry = bakeParts(b.parts, { weather, baseAt: (x, y, z) => b.heightAt(x, z), seed: 24 });
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const group = new THREE.Group();
  group.name = 'crashedPlane';
  group.add(mesh);
  return {
    group,
    mesh,
    spots: b.spots,
    colliders: b.colliders,
    dispose() {
      group.removeFromParent();
      geometry.dispose();
      material.dispose();
    },
  };
}
