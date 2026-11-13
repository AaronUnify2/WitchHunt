// The Pruitt farm (Round 2; Aaron's play-test of Nov 13: the old storm shelter clearing becomes a
// new encounter, "A: the Pruitt homestead"). Earl and Marcy's house on the land the army's fence
// cuts across: a small clapboard farmhouse with a porch, lived in until a few days ago and left in
// a hurry. Everything says a family that liked each other.
//
// The frame (encounters/PruittFarm.js): walking in from home, x to your right, z ahead; the
// clearing's centre at (0, 0), the path in at z = -22. The path on to the family plot leaves ahead
// and to the right, so the house stands to the left of it:
//  - the house: x -12..-2, z 1.5..8.5, its porch across the front (z -0.7..1.5), the door at
//    x -6. Inside, the main room (kitchen and sitting room in one) and, through a doorway on the
//    left, the children's room. A flat board ceiling under a tin gable roof.
//  - round it: the generator's lean-to on the right-hand wall (it runs the porch light and the
//    bulb over the kitchen table), the yard lamp's pole out by the track, the lightning-struck
//    oak with the tyre swing, the clothes line, the kitchen garden, the hen house, the mailbox.
// One baked mesh for the set, and small meshes of their own for what changes (the two bulbs' glow,
// Marcy's journal, the shotgun on its pegs). Spots and colliders come back in the frame.

import * as THREE from 'three';
import { SetBuilder } from './setBuilder.js';
import { bakeParts, pillowGeometry } from './propKit.js';

export const FARM = {
  house: { x0: -12, x1: -2, z0: 1.5, z1: 8.5, wall: 2.6, ridge: 4.3, floor: 0.1, part: -7.9 }, // floor: a board's height off the ground (Tom walks on the ground: no steps to climb)
  porch: { z0: -0.7, roofDrop: 0.4 },
  door: { x: -6, w: 1.05, h: 2.05 },
  inner: { z: 5.2, w: 0.95 }, // the doorway to the children's room, in the partition
  lamp: { x: 6, z: -8, h: 4.2 },
  oak: { x: 11, z: 4.5, h: 8.5 },
  generator: { x: -0.9, z: 6.2 },
};

const rgb = (hex) => new THREE.Color(hex);

// The set is laid out in the encounter's frame (x to the right of the way in). A model turned by its yaw
// has +x to the walker's left, so the baked geometry is mirrored in x (and its triangles re-wound).
function mirrorX(geometry) {
  for (const name of ['position', 'normal', 'color']) {
    const a = geometry.getAttribute(name);
    if (!a) continue;
    const n = a.itemSize;
    const arr = a.array;
    for (let i = 0; i + 2 < a.count; i += 3) {
      for (let k = 0; k < n; k++) {
        const t = arr[(i + 1) * n + k];
        arr[(i + 1) * n + k] = arr[(i + 2) * n + k];
        arr[(i + 2) * n + k] = t;
      }
    }
    if (name !== 'color') for (let i = 0; i < a.count; i++) arr[i * n] = -arr[i * n];
    a.needsUpdate = true;
  }
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();
  return geometry;
}

// A flat-shaded box mesh of its own (something that's taken, or that glows).
function ownMesh(parts, material) {
  const b = new SetBuilder({ colors: {} }, null, 7);
  for (const [w, h, d, color, x, y, z, yaw = 0, rx = 0, rz = 0] of parts) b.box(w, h, d, color, x, y, z, yaw, rx, rz);
  const geometry = mirrorX(bakeParts(b.parts, {}));
  return new THREE.Mesh(geometry, material);
}

export function buildPruittFarm(cfg, { weather = null, heightAt = null } = {}) {
  const look = cfg.look;
  const b = new SetBuilder(look, heightAt, 5121);
  const c = b.c;
  const H = FARM.house;
  const F = H.floor;
  const W = H.wall;
  const midX = (H.x0 + H.x1) / 2;
  const midZ = (H.z0 + H.z1) / 2;
  const wide = H.x1 - H.x0;
  const deep = H.z1 - H.z0;
  const D = FARM.door;

  // ---- the house: footings, floor, walls (inside and out), ceiling, roof ----
  // Stone piers under the sills, and a skirt of boards between them.
  for (const x of [H.x0 + 0.3, midX, H.x1 - 0.3]) for (const z of [FARM.porch.z0 + 0.2, H.z0, midZ, H.z1 - 0.2]) b.box(0.5, F + 0.3, 0.5, c.stone, x, (F - 0.3) / 2, z);
  b.box(wide, 0.34, deep, c.skirt, midX, F / 2 - 0.02, midZ);
  b.box(wide + 0.1, 0.07, deep + 0.1, c.floor, midX, F - 0.035, midZ);
  // Floorboards' seams.
  for (let z = H.z0 + 0.5; z < H.z1; z += 0.5) b.box(wide - 0.3, 0.004, 0.02, c.floorDark, midX, F + 0.002, z);

  // A wall piece along x at z (clapboard outside, plaster-and-board inside), from xa to xb, y0 to y1.
  const wallX = (xa, xb, z, y0 = F, y1 = F + W, out = -1) => {
    const w = xb - xa;
    b.box(w, y1 - y0, 0.07, c.clap, (xa + xb) / 2, (y0 + y1) / 2, z + out * 0.04);
    b.box(w, y1 - y0, 0.05, c.plaster, (xa + xb) / 2, (y0 + y1) / 2, z - out * 0.03);
    // The clapboards' shadow lines.
    for (let y = y0 + 0.16; y < y1; y += 0.16) b.box(w, 0.012, 0.012, c.clapDark, (xa + xb) / 2, y, z + out * 0.08);
  };
  const wallZ = (za, zb, x, y0 = F, y1 = F + W, out = -1) => {
    const d = zb - za;
    b.box(0.07, y1 - y0, d, c.clap, x + out * 0.04, (y0 + y1) / 2, (za + zb) / 2);
    b.box(0.05, y1 - y0, d, c.plaster, x - out * 0.03, (y0 + y1) / 2, (za + zb) / 2);
    for (let y = y0 + 0.16; y < y1; y += 0.16) b.box(0.012, 0.012, d, c.clapDark, x + out * 0.08, y, (za + zb) / 2);
  };
  // A window in a wall along x: its frame, four panes gone grey, a sill; a curtain inside.
  const windowX = (x, z, out = -1, curtain = c.curtain) => {
    b.box(1.1, 1.1, 0.1, c.trim, x, F + 1.45, z + out * 0.02);
    b.box(0.96, 0.96, 0.11, c.glass, x, F + 1.45, z + out * 0.02);
    b.box(0.05, 0.96, 0.12, c.trim, x, F + 1.45, z + out * 0.02);
    b.box(0.96, 0.05, 0.12, c.trim, x, F + 1.45, z + out * 0.02);
    b.box(1.24, 0.06, 0.2, c.trim, x, F + 0.9, z + out * 0.06);
    for (const s of [-1, 1]) b.box(0.3, 1.0, 0.03, curtain, x + s * 0.36, F + 1.48, z - out * 0.1);
  };

  // Front wall, with the door's gap and a window either side.
  const dl = D.x - D.w / 2;
  const dr = D.x + D.w / 2;
  wallX(H.x0, dl, H.z0);
  wallX(dr, H.x1, H.z0);
  wallX(dl, dr, H.z0, F + D.h, F + W);
  windowX(-9.6, H.z0);
  windowX(-3.6, H.z0);
  // The door: its frame, and the door itself standing open inward, a screen door hanging off one hinge outside.
  for (const x of [dl - 0.05, dr + 0.05]) b.box(0.1, D.h + 0.1, 0.16, c.trim, x, F + D.h / 2 + 0.03, H.z0);
  b.box(D.w + 0.2, 0.1, 0.16, c.trim, D.x, F + D.h + 0.05, H.z0);
  b.box(0.05, D.h - 0.05, D.w - 0.08, c.door, dl + 0.05, F + D.h / 2, H.z0 + D.w / 2 + 0.02); // swung in against the wall's line
  b.box(0.06, 0.04, 0.05, c.iron, dl + 0.09, F + 1.0, H.z0 + D.w - 0.14);
  b.push(dr + 0.02, F, H.z0 - 0.1, -0.9, 0, 0.06);
  b.box(D.w - 0.1, D.h - 0.1, 0.03, c.screen, -(D.w - 0.1) / 2, D.h / 2, 0);
  b.box(D.w - 0.02, 0.07, 0.04, c.trim, -(D.w - 0.1) / 2, D.h - 0.08, 0);
  b.box(D.w - 0.02, 0.07, 0.04, c.trim, -(D.w - 0.1) / 2, 0.06, 0);
  b.box(D.w - 0.02, 0.06, 0.04, c.trim, -(D.w - 0.1) / 2, D.h * 0.45, 0);
  b.pop();
  // Back wall (a window over the sink), the two end walls (the children's window open on the left).
  wallX(H.x0, H.x1, H.z1, F, F + W, 1);
  windowX(-4.0, H.z1, 1, c.curtainKitchen);
  wallZ(H.z0, H.z1, H.x1, F, F + W, 1);
  wallZ(H.z0, 4.2, H.x0);
  wallZ(5.5, H.z1, H.x0);
  wallZ(4.2, 5.5, H.x0, F, F + 0.9);
  wallZ(4.2, 5.5, H.x0, F + 2.0, F + W);
  // The children's window: the sash thrown up, a curtain pulled out through it.
  b.box(0.1, 0.07, 1.4, c.trim, H.x0 - 0.02, F + 0.9, 4.85);
  b.box(0.1, 0.07, 1.4, c.trim, H.x0 - 0.02, F + 2.0, 4.85);
  b.box(0.08, 0.5, 1.26, c.glass, H.x0 - 0.02, F + 1.74, 4.85);
  b.put(pillowGeometry(0.5, 0.75, 0.05), c.curtainKids, H.x0 - 0.3, F + 1.2, 5.25, 0.5, 0, 0.5);
  // The gables, in boards.
  for (const x of [H.x0, H.x1]) {
    const s = new THREE.Shape();
    s.moveTo(H.z0 - 0.05, 0);
    s.lineTo(H.z1 + 0.05, 0);
    s.lineTo(midZ, H.ridge - W);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: false });
    g.rotateY(-Math.PI / 2);
    b.put(g, c.clap, x + 0.035, F + W, 0);
  }
  // The partition between the main room and the children's room, with its doorway.
  const P = H.part;
  const I = FARM.inner;
  b.box(0.08, W, I.z - I.w / 2 - H.z0, c.plaster, P, F + W / 2, (H.z0 + I.z - I.w / 2) / 2);
  b.box(0.08, W, H.z1 - (I.z + I.w / 2), c.plaster, P, F + W / 2, (I.z + I.w / 2 + H.z1) / 2);
  b.box(0.08, W - 2.0, I.w, c.plaster, P, F + 2.0 + (W - 2.0) / 2, I.z);
  for (const z of [I.z - I.w / 2, I.z + I.w / 2]) b.box(0.14, 2.04, 0.07, c.trim, P, F + 1.02, z);
  b.box(0.14, 0.08, I.w + 0.14, c.trim, P, F + 2.04, I.z);
  // The children's height marks up the doorway's frame.
  for (let i = 0; i < 7; i++) b.box(0.15, 0.008, 0.012, i % 2 ? c.crayonBlue : c.crayonRed, P, F + 0.82 + i * 0.085, I.z - I.w / 2 - 0.005);
  // The ceiling (boards), and the tin roof over it with a brick chimney for the stove.
  b.box(wide, 0.05, deep, c.ceiling, midX, F + W + 0.025, midZ);
  const slope = Math.atan2(H.ridge - W, deep / 2);
  const run = Math.hypot(deep / 2, H.ridge - W) + 0.45;
  for (const s of [-1, 1]) {
    b.push(midX, F + (W + H.ridge) / 2 + 0.06, midZ + s * (deep / 4 + 0.12), 0, -s * slope, 0);
    b.box(wide + 0.7, 0.04, run, c.tin, 0, 0, 0);
    for (let x = -wide / 2 - 0.2; x <= wide / 2 + 0.2; x += 0.62) b.box(0.05, 0.03, run, b.rand() < 0.2 ? c.tinRust : c.tinDark, x, 0.03, 0);
    b.pop();
  }
  b.box(wide + 0.75, 0.07, 0.2, c.tinDark, midX, F + H.ridge + 0.09, midZ);
  b.box(0.55, 1.7, 0.55, c.brick, -10.2, F + H.ridge - 0.25, 7.6);
  b.box(0.65, 0.1, 0.65, c.brickDark, -10.2, F + H.ridge + 0.62, 7.6);

  // ---- the porch ----
  const pz0 = FARM.porch.z0;
  const pd = H.z0 - pz0;
  b.box(wide + 0.2, 0.07, pd + 0.1, c.porch, midX, F - 0.045, (pz0 + H.z0) / 2);
  for (let x = H.x0 + 0.25; x < H.x1; x += 0.5) b.box(0.02, 0.004, pd, c.floorDark, x, F - 0.008, (pz0 + H.z0) / 2);
  b.box(wide + 0.2, 0.3, 0.07, c.skirt, midX, F / 2 - 0.05, pz0);
  const posts = [H.x0 + 0.12, -8.2, D.x - 1.0, D.x + 1.0, -3.9, H.x1 - 0.12];
  const eave = F + W - FARM.porch.roofDrop;
  for (const x of posts) {
    b.box(0.13, eave - F, 0.13, c.trim, x, (F + eave) / 2, pz0 + 0.1);
    b.post(x, 0, pz0 + 0.1, 0.1, eave);
  }
  b.box(wide + 0.3, 0.14, 0.12, c.trim, midX, eave - 0.07, pz0 + 0.1);
  // Rails between the posts (not across the steps), with their balusters.
  for (let i = 0; i < posts.length - 1; i++) {
    if (i === 2) continue;
    const xa = posts[i];
    const xb = posts[i + 1];
    b.box(xb - xa, 0.06, 0.07, c.trim, (xa + xb) / 2, F + 0.85, pz0 + 0.1);
    b.box(xb - xa, 0.05, 0.05, c.trim, (xa + xb) / 2, F + 0.18, pz0 + 0.1);
    for (let x = xa + 0.2; x < xb - 0.1; x += 0.2) b.box(0.03, 0.64, 0.03, c.trim, x, F + 0.52, pz0 + 0.1);
    b.wall(xa, pz0 + 0.1, xb, pz0 + 0.1, 0, 0.06, F + 0.9, false);
  }
  for (const x of [H.x0 + 0.05, H.x1 - 0.05]) {
    b.box(0.07, 0.06, pd, c.trim, x, F + 0.85, (pz0 + H.z0) / 2);
    for (let z = pz0 + 0.3; z < H.z0; z += 0.2) b.box(0.03, 0.64, 0.03, c.trim, x, F + 0.52, z);
    b.wall(x, pz0, x, H.z0, 0, 0.06, F + 0.9, false);
  }
  // The porch roof: tin, falling from the wall to the posts.
  const pslope = Math.atan2(FARM.porch.roofDrop + 0.1, pd + 0.4);
  b.push(midX, F + W - 0.12, (pz0 + H.z0) / 2 - 0.15, 0, -pslope, 0);
  b.box(wide + 0.6, 0.04, pd + 0.75, c.tin, 0, 0, 0);
  for (let x = -wide / 2 - 0.1; x <= wide / 2 + 0.1; x += 0.62) b.box(0.05, 0.03, pd + 0.75, c.tinDark, x, 0.03, 0);
  b.pop();
  for (const x of posts) b.box(0.07, 0.1, pd + 0.2, c.trim, x, F + W - 0.2, (pz0 + H.z0) / 2, 0, -pslope, 0);
  // One broad step, worn in the middle.
  b.box(2.2, 0.07, 0.5, c.porch, D.x, 0.035, pz0 - 0.3);
  b.box(0.9, 0.012, 0.44, c.porchWorn, D.x, 0.076, pz0 - 0.3);
  // The porch light's fixture over the door (the bulb's glow is its own mesh), and the moths' dust on the wall round it.
  b.box(0.14, 0.05, 0.14, c.iron, D.x, F + D.h + 0.33, H.z0 - 0.12);
  b.put(new THREE.CylinderGeometry(0.06, 0.075, 0.16, 8), c.jar, D.x, F + D.h + 0.22, H.z0 - 0.14);
  for (let i = 0; i < 9; i++) b.box(0.3 + b.rand() * 0.3, 0.2 + b.rand() * 0.25, 0.006, c.mothDust, D.x + (b.rand() - 0.5) * 2.2, F + 1.7 + b.rand() * 0.9, H.z0 - 0.085, 0, 0, b.rand() * 3);
  b.spot('porchLight', D.x, F + D.h + 0.2, H.z0 - 0.16);
  b.spot('porch', D.x, F, (pz0 + H.z0) / 2);
  b.spot('door', D.x, F, H.z0 - 0.5);
  b.spot('steps', D.x, 0, pz0 - 1.6);
  // On the porch: a glider seat with a folded quilt, two rockers, a pair of small rubber boots by the door,
  // a row of jars of flowers gone over, a wind chime.
  b.push(-9.9, F, 0.6);
  b.box(1.5, 0.07, 0.5, c.seat, 0, 0.45, 0);
  b.box(1.5, 0.5, 0.06, c.seat, 0, 0.75, 0.24, 0, -0.15, 0);
  for (const x of [-0.72, 0.72]) b.box(0.05, 0.62, 0.5, c.seatDark, x, 0.34, 0);
  b.put(pillowGeometry(0.5, 0.12, 0.4), c.quilt, -0.35, 0.56, 0);
  b.put(pillowGeometry(0.36, 0.3, 0.1), c.curtainKids, 0.45, 0.7, 0.14, 0, -0.2, 0);
  b.pop();
  for (const [x, yaw] of [[-3.4, 0.35], [-4.6, -0.2]]) {
    b.push(x, F, 0.45, yaw);
    b.box(0.5, 0.05, 0.46, c.seat, 0, 0.42, 0);
    b.box(0.5, 0.6, 0.05, c.seat, 0, 0.78, 0.22, 0, -0.2, 0);
    for (const s of [-1, 1]) {
      b.box(0.04, 0.42, 0.04, c.seatDark, s * 0.23, 0.22, -0.18);
      b.box(0.04, 0.42, 0.04, c.seatDark, s * 0.23, 0.22, 0.18);
      b.box(0.04, 0.035, 0.7, c.seatDark, s * 0.23, 0.02, 0, 0, 0.05, 0);
    }
    b.pop();
  }
  for (const s of [0, 1]) b.box(0.09, 0.16, 0.2, c.bootYellow, D.x + 0.75 + s * 0.13, F + 0.08, 1.2, 0.3 * s);
  for (let i = 0; i < 4; i++) {
    b.put(new THREE.CylinderGeometry(0.045, 0.045, 0.13, 7), c.jar, -8.9 + i * 0.22, F + 0.94, pz0 + 0.1);
    b.box(0.02, 0.16, 0.02, c.stalk, -8.9 + i * 0.22, F + 1.07, pz0 + 0.1, 0, 0.2 * (i - 1.5), 0.1);
  }
  for (let i = 0; i < 5; i++) b.box(0.012, 0.2 + i * 0.03, 0.012, c.iron, -2.9 + Math.cos(i * 1.26) * 0.05, F + 2.0 - i * 0.015, 0.2 + Math.sin(i * 1.26) * 0.05);
  b.put(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 8), c.seat, -2.9, F + 2.12, 0.2);

  // ---- inside: the main room ----
  // The cookstove on the back wall under the chimney's side... the stove's in the corner by the partition.
  b.push(-7.0, F, 7.9);
  b.box(0.95, 0.75, 0.6, c.stove, 0, 0.4, 0);
  b.box(1.0, 0.05, 0.66, c.stoveTop, 0, 0.8, 0);
  b.box(0.36, 0.26, 0.03, c.iron, -0.2, 0.42, -0.31);
  b.put(new THREE.CylinderGeometry(0.08, 0.08, W - 0.85, 8), c.stove, 0.25, 0.85 + (W - 0.85) / 2, 0.12);
  b.put(new THREE.CylinderGeometry(0.13, 0.16, 0.18, 8), c.kettle, -0.2, 0.92, 0.02);
  b.pop();
  b.wall(-7.5, 7.9, -6.5, 7.9, 0, 0.32, F + 0.85);
  // The shotgun's pegs on the back wall beside the stove (the gun is its own mesh), and the box of shells on a shelf under them.
  for (const x of [-5.9, -5.0]) b.box(0.04, 0.04, 0.12, c.trim, x, F + 1.72, H.z1 - 0.1);
  b.box(0.7, 0.03, 0.16, c.shelf, -5.45, F + 1.35, H.z1 - 0.12);
  b.box(0.2, 0.09, 0.11, c.shellBox, -5.6, F + 1.41, H.z1 - 0.12, 0.2);
  b.spot('shotgun', -5.45, F, H.z1 - 0.9);
  // The kitchen along the right-hand end: counter, sink under... the sink's under the back window; a dresser of plates.
  b.box(2.6, 0.9, 0.6, c.cabinet, -3.5, F + 0.45, H.z1 - 0.36);
  b.box(2.7, 0.05, 0.66, c.counter, -3.5, F + 0.92, H.z1 - 0.36);
  b.box(0.7, 0.03, 0.46, c.sink, -4.0, F + 0.94, H.z1 - 0.36);
  b.box(0.03, 0.2, 0.03, c.iron, -4.0, F + 1.05, H.z1 - 0.14);
  b.box(0.03, 0.03, 0.18, c.iron, -4.0, F + 1.15, H.z1 - 0.22);
  for (let i = 0; i < 3; i++) b.put(new THREE.CylinderGeometry(0.11, 0.11, 0.015, 10), c.plate, -3.0 + i * 0.03, F + 0.96 + i * 0.018, H.z1 - 0.36);
  b.box(0.2, 0.12, 0.14, c.breadTin, -2.5, F + 1.0, H.z1 - 0.3);
  b.wall(-4.8, H.z1 - 0.36, -2.2, H.z1 - 0.36, 0, 0.33, F + 0.95);
  // The fridge by the right-hand wall, children's drawings under magnets on its door.
  b.box(0.7, 1.65, 0.66, c.fridge, H.x1 - 0.42, F + 0.83, 6.4);
  b.box(0.03, 0.5, 0.03, c.iron, H.x1 - 0.78, F + 1.1, 6.15);
  for (const [dy, dz, col, tilt] of [[1.25, 6.28, c.paper, 0.08], [1.2, 6.58, c.paper, -0.1], [0.8, 6.4, c.paperYellow, 0.04]]) {
    b.box(0.006, 0.26, 0.2, col, H.x1 - 0.775, F + dy, dz, 0, tilt, 0);
    b.box(0.008, 0.13, 0.05, c.crayonBrown, H.x1 - 0.78, F + dy + 0.01, dz, 0, tilt, 0); // the tall brown shape
    b.box(0.008, 0.05, 0.11, c.crayonGreen, H.x1 - 0.78, F + dy - 0.09, dz, 0, tilt, 0);
    b.box(0.012, 0.03, 0.03, c.crayonRed, H.x1 - 0.78, F + dy + 0.11, dz + 0.06);
  }
  b.wall(H.x1 - 0.42, 6.1, H.x1 - 0.42, 6.7, 0, 0.36, F + 1.7);
  b.spot('fridge', H.x1 - 1.3, F, 6.4);
  // The pantry cupboard by the door on the right-hand wall.
  b.box(0.5, 1.9, 1.0, c.cabinet, H.x1 - 0.32, F + 0.95, 2.6);
  b.box(0.03, 1.7, 0.02, c.cabinetDark, H.x1 - 0.58, F + 0.95, 2.6);
  for (const z of [2.4, 2.8]) b.box(0.03, 0.08, 0.03, c.iron, H.x1 - 0.6, F + 1.0, z);
  b.wall(H.x1 - 0.32, 2.1, H.x1 - 0.32, 3.1, 0, 0.27, F + 1.9);
  b.spot('pantry', H.x1 - 1.2, F, 2.6);
  // The kitchen table: an oilcloth, four chairs (one pushed back, one on its side), a lamp, a mug,
  // a plate with a meal left on it. Marcy's journal lies on it (its own mesh).
  b.push(-4.6, F, 4.6, 0.08);
  b.box(1.5, 0.05, 0.9, c.table, 0, 0.75, 0);
  b.box(1.56, 0.012, 0.96, c.oilcloth, 0, 0.782, 0);
  for (const [x, z] of [[-0.66, -0.36], [0.66, -0.36], [-0.66, 0.36], [0.66, 0.36]]) b.box(0.07, 0.75, 0.07, c.tableDark, x, 0.375, z);
  b.put(new THREE.CylinderGeometry(0.045, 0.05, 0.1, 8), c.mug, 0.45, 0.84, -0.2);
  b.put(new THREE.CylinderGeometry(0.12, 0.12, 0.015, 10), c.plate, -0.4, 0.795, 0.15);
  b.box(0.1, 0.03, 0.08, c.breadTin, -0.4, 0.815, 0.15);
  b.put(new THREE.CylinderGeometry(0.035, 0.05, 0.14, 7), c.jar, 0.1, 0.86, 0.28);
  b.pop();
  const chair = (x, z, yaw, tip = 0) => {
    b.push(x, F + (tip ? 0.22 : 0), z, yaw, 0, tip);
    b.box(0.42, 0.04, 0.42, c.chair, 0, 0.45, 0);
    b.box(0.42, 0.5, 0.04, c.chair, 0, 0.72, 0.2);
    for (const [sx, sz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) b.box(0.04, 0.45, 0.04, c.tableDark, sx, 0.225, sz);
    b.pop();
  };
  chair(-5.1, 3.85, Math.PI);
  chair(-4.1, 3.75, Math.PI + 0.3);
  chair(-5.0, 5.5, 0.1);
  chair(-3.5, 5.6, -0.5, 1.45);
  b.wall(-5.3, 4.6, -3.9, 4.6, 0, 0.42, F + 0.8);
  b.spot('journal', -4.75, F, 3.4);
  b.spot('journalOn', -4.35, F + 0.795, 4.5);
  b.spot('bulb', -4.6, F + 2.3, 4.6);
  // The bulb's flex and shade over the table.
  b.box(0.012, 0.3, 0.012, c.iron, -4.6, F + 2.46, 4.6);
  b.put(new THREE.CylinderGeometry(0.05, 0.16, 0.1, 10, 1, true), c.shade, -4.6, F + 2.32, 4.6);
  // The family's photographs on the partition wall, in frames from Earl's own rack; Earl's county map by the door.
  for (const [z, y, w, h] of [[2.35, 1.55, 0.34, 0.26], [2.85, 1.7, 0.24, 0.3], [3.3, 1.5, 0.3, 0.22], [2.6, 1.2, 0.22, 0.18], [3.15, 1.15, 0.26, 0.2]]) {
    b.box(0.03, h + 0.05, w + 0.05, c.frame, P + 0.06, F + y, z);
    b.box(0.034, h, w, c.photo, P + 0.062, F + y, z);
    b.box(0.036, h * 0.45, w * 0.5, c.photoFigures, P + 0.063, F + y - h * 0.12, z);
    b.box(0.037, 0.035, 0.07, c.capRed, P + 0.064, F + y + h * 0.16, z - w * 0.1); // a red cap in every one
  }
  b.spot('photos', P + 0.95, F, 2.9);
  // (On the right-hand wall, between the pantry and the fridge.)
  b.box(0.02, 0.7, 0.9, c.paper, H.x1 - 0.07, F + 1.55, 4.5);
  for (let i = 0; i < 11; i++) b.box(0.025, 0.03, 0.03, i % 3 ? c.crayonRed : c.crayonBlue, H.x1 - 0.08, F + 1.3 + b.rand() * 0.5, 4.15 + b.rand() * 0.7);
  b.box(0.03, 0.03, 0.96, c.frame, H.x1 - 0.07, F + 1.91, 4.5);
  b.spot('map', H.x1 - 0.95, F, 4.5);
  // Earl's chair by the front window, a radio on the sill, his boots, a rag rug.
  b.push(-9.0, F, 2.5, 2.4);
  b.box(0.75, 0.38, 0.75, c.armchair, 0, 0.26, 0);
  b.box(0.75, 0.62, 0.18, c.armchair, 0, 0.72, 0.3);
  for (const s of [-1, 1]) b.box(0.14, 0.26, 0.7, c.armchairDark, s * 0.34, 0.56, 0);
  b.put(pillowGeometry(0.5, 0.1, 0.5), c.quilt, 0, 0.5, -0.02);
  b.pop();
  b.wall(-9.3, 2.5, -8.7, 2.5, 0, 0.4, F + 0.9);
  b.put(pillowGeometry(1.7, 0.02, 1.1), c.rug, -6.2, F + 0.012, 3.2, 0.2);
  b.box(0.3, 0.2, 0.14, c.radio, -9.6, F + 1.04, H.z0 + 0.14);
  for (const s of [0, 1]) b.box(0.1, 0.26, 0.26, c.bootBrown, -8.2 - s * 0.14, F + 0.13, H.z0 + 0.3 + s * 0.05, 0.2);
  // Coats on pegs by the door: a big one, a woman's, two small.
  for (const [x, h2, col] of [[-6.9, 0.95, c.coatBrown], [-7.2, 0.85, c.coatBlue], [-7.45, 0.55, c.coatRed], [-7.65, 0.5, c.coatYellow]]) {
    b.box(0.04, 0.04, 0.08, c.trim, x, F + 1.72, H.z0 + 0.08);
    b.put(pillowGeometry(0.26, h2, 0.1), col, x, F + 1.68 - h2 / 2, H.z0 + 0.13);
  }

  // ---- inside: the children's room ----
  const bed = (x, z, quilt) => {
    b.push(x, F, z);
    b.box(0.85, 0.3, 1.7, c.bedFrame, 0, 0.2, 0);
    b.put(pillowGeometry(0.8, 0.14, 1.6), quilt, 0, 0.42, 0.03);
    b.put(pillowGeometry(0.5, 0.1, 0.32), c.pillow, 0, 0.5, 0.62);
    b.box(0.85, 0.6, 0.05, c.bedFrame, 0, 0.5, 0.86);
    b.pop();
    b.wall(x, z - 0.8, x, z + 0.8, 0, 0.4, F + 0.6);
  };
  bed(-11.4, 7.3, c.quilt);
  bed(-9.0, 7.3, c.quiltBlue);
  b.spot('beds', -10.2, F, 5.9);
  // A chair pulled under the open window; a hook by the doorway with nothing on it; toys; a night light; a rug.
  chair(-11.55, 4.85, Math.PI / 2);
  b.box(0.05, 0.03, 0.08, c.iron, P - 0.07, F + 1.4, I.z - 0.75);
  b.put(pillowGeometry(1.2, 0.02, 0.9), c.rugKids, -10.1, F + 0.012, 5.5);
  for (const [x, z, col] of [[-10.4, 5.3, c.crayonRed], [-9.9, 5.7, c.crayonBlue], [-10.0, 5.2, c.crayonGreen]]) b.box(0.12, 0.1, 0.12, col, x, F + 0.07, z, b.rand() * 3);
  b.put(new THREE.SphereGeometry(0.12, 8, 6), c.ball, -11.3, F + 0.13, 3.1);
  b.box(0.5, 0.75, 0.32, c.cabinet, -8.3, F + 0.38, 2.0);
  b.box(0.22, 0.3, 0.16, c.plush, -8.3, F + 0.9, 2.0); // a stuffed bear, brown, tall-eared
  b.box(0.06, 0.1, 0.05, c.plush, -8.36, F + 1.08, 2.0);
  b.box(0.06, 0.1, 0.05, c.plush, -8.24, F + 1.08, 2.0);
  b.spot('marks', P + 0.6, F, I.z);

  // ---- the generator's lean-to on the right-hand wall, and its cables ----
  const G = FARM.generator;
  b.push(G.x, 0, G.z);
  b.box(1.5, 0.08, 1.9, c.stone, 0, 0.04, 0);
  for (const z of [-0.85, 0.85]) b.box(0.09, 1.7, 0.09, c.trim, 0.65, 0.85, z);
  b.box(1.7, 0.04, 2.2, c.tin, -0.05, 1.82, 0, 0, 0, 0.18);
  b.box(0.75, 0.55, 1.0, c.genBody, 0, 0.42, 0);
  b.box(0.5, 0.2, 0.6, c.genTank, 0, 0.8, 0.05);
  b.put(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6), c.iron, 0.2, 0.95, -0.38, 0, 0, 0.3);
  b.put(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 10).rotateZ(Math.PI / 2), c.iron, 0.4, 0.42, -0.3);
  for (const x of [-0.3, 0.3]) for (const z of [-0.4, 0.4]) b.box(0.06, 0.14, 0.06, c.iron, x, 0.12, z);
  b.box(0.2, 0.38, 0.3, c.fuelCan, 0.1, 0.27, 0.78, 0.3);
  // The switch box on the house wall: a lever, two cables up to the eaves.
  b.box(0.08, 0.36, 0.28, c.iron, -1.05, 1.35, -0.5);
  b.box(0.05, 0.2, 0.04, c.switchRed, -0.98, 1.4, -0.5, 0, 0, 0.5);
  for (const z of [-0.56, -0.44]) b.box(0.02, 1.5, 0.02, c.cable, -1.06, 2.25, z);
  b.pop();
  b.post(G.x, 0, G.z, 0.55, 0.9);
  b.spot('generator', G.x + 1.0, 0, G.z - 0.5);
  b.spot('switch', G.x - 0.95, 1.4, G.z - 0.5);

  // ---- the yard ----
  // The yard lamp on its pole by the track, the cable sagging to it from the eaves.
  const Lp = FARM.lamp;
  b.put(new THREE.CylinderGeometry(0.07, 0.1, Lp.h, 8), c.pole, Lp.x, Lp.h / 2, Lp.z);
  b.box(0.7, 0.05, 0.05, c.iron, Lp.x - 0.3, Lp.h - 0.1, Lp.z);
  b.put(new THREE.CylinderGeometry(0.08, 0.2, 0.14, 10, 1, true), c.shade, Lp.x - 0.6, Lp.h - 0.2, Lp.z);
  b.post(Lp.x, 0, Lp.z, 0.12, Lp.h);
  b.spot('yardLamp', Lp.x - 0.6, Lp.h - 0.3, Lp.z);
  for (let i = 0; i < 10; i++) {
    const t0 = i / 10;
    const t1 = (i + 1) / 10;
    const at = (t) => [H.x1 + (Lp.x - H.x1) * t, F + W + 0.1 + (Lp.h - 0.2 - F - W - 0.1) * t - Math.sin(t * Math.PI) * 0.55, 4.5 + (Lp.z - 4.5) * t];
    const p = at(t0);
    const q = at(t1);
    const len = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
    b.box(0.018, 0.018, len, c.cable, (p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2, Math.atan2(q[0] - p[0], q[2] - p[2]), -Math.atan2(q[1] - p[1], Math.hypot(q[0] - p[0], q[2] - p[2])), 0);
  }
  // The lightning-struck oak: a split trunk, three bare limbs, the tyre swing on its rope.
  const O = FARM.oak;
  b.put(new THREE.CylinderGeometry(0.34, 0.62, O.h * 0.62, 9), c.oak, O.x, O.h * 0.31, O.z);
  b.put(new THREE.CylinderGeometry(0.12, 0.3, O.h * 0.42, 7), c.oak, O.x + 0.25, O.h * 0.8, O.z + 0.1, 0, 0.1, -0.12);
  b.put(new THREE.CylinderGeometry(0.02, 0.2, O.h * 0.3, 6), c.oakScar, O.x - 0.3, O.h * 0.74, O.z - 0.15, 0, -0.2, 0.25);
  for (const [len, yaw, lift, at] of [[4.2, 0.6, 0.5, 0.52], [3.4, 2.7, 0.75, 0.6], [2.8, -1.6, 0.4, 0.45], [2.0, 4.1, 1.0, 0.7]]) {
    b.push(O.x, O.h * at, O.z, yaw, -lift, 0);
    b.put(new THREE.CylinderGeometry(0.05, 0.17, len, 6).rotateX(Math.PI / 2), c.oak, 0, 0, len / 2);
    b.put(new THREE.CylinderGeometry(0.02, 0.06, len * 0.5, 5).rotateX(Math.PI / 2), c.oak, 0.2, 0.25, len * 0.8, 0.5, -0.5, 0);
    b.pop();
  }
  b.post(O.x, 0, O.z, 0.6, O.h);
  b.spot('oakTop', O.x + 0.2, O.h * 0.99, O.z + 0.1);
  b.box(0.025, 2.9, 0.025, c.rope, O.x + 2.2, 2.75, O.z + 1.5);
  b.put(new THREE.TorusGeometry(0.34, 0.13, 7, 14), c.rubber, O.x + 2.2, 1.0, O.z + 1.5, 0.6);
  // The clothes line: two posts, a line, three sheets and small clothes still pegged out.
  for (const z of [1.5, 8.5]) {
    b.box(0.09, 2.0, 0.09, c.trim, -15.5, 1.0, z);
    b.box(0.8, 0.07, 0.07, c.trim, -15.5, 1.95, z);
    b.post(-15.5, 0, z, 0.08, 2.0);
  }
  b.box(0.012, 0.012, 7.0, c.rope, -15.5, 1.93, 5);
  for (const [z, w, h, col] of [[2.8, 1.5, 1.3, c.sheet], [4.7, 1.3, 1.2, c.sheetDark], [6.3, 0.45, 0.5, c.coatRed], [6.9, 0.4, 0.42, c.coatYellow], [7.6, 0.6, 0.7, c.coatBlue]]) {
    b.put(pillowGeometry(0.03, h, w), col, -15.5, 1.92 - h / 2, z, 0, 0, 0.04);
  }
  // The kitchen garden: four rows, bean poles, a spade stuck in.
  for (let r = 0; r < 4; r++) {
    b.box(0.5, 0.12, 5.0, c.soil, -15.2 + r * 0.9 + 6.2, 0.06, 13.5, 0.06);
    for (let i = 0; i < 6; i++) b.box(0.18 + b.rand() * 0.14, 0.14 + b.rand() * 0.2, 0.2, c.stalk, -9.0 + r * 0.9, 0.2, 11.4 + i * 0.8 + b.rand() * 0.2, b.rand() * 3);
  }
  for (let i = 0; i < 5; i++) for (const s of [-1, 1]) b.box(0.03, 1.9, 0.03, c.trim, -9.0 + 2.7 + s * 0.22, 0.93, 11.6 + i * 0.95, 0, 0, s * 0.22);
  // The hen house, its door open, a few feathers; the well pump with a bucket.
  b.push(-1.5, 0, 13.2, -0.3);
  b.box(1.5, 1.0, 1.1, c.coop, 0, 0.8, 0);
  b.box(1.7, 0.05, 1.35, c.tin, 0, 1.36, 0, 0, 0, 0.14);
  for (const [x, z] of [[-0.65, -0.45], [0.65, -0.45], [-0.65, 0.45], [0.65, 0.45]]) b.box(0.07, 0.34, 0.07, c.trim, x, 0.17, z);
  b.box(0.4, 0.5, 0.03, c.coopDark, -0.2, 0.7, -0.57);
  b.box(0.4, 0.03, 0.7, c.coop, -0.2, 0.33, -0.9, 0, 0.35, 0);
  for (let i = 0; i < 6; i++) b.box(0.07, 0.006, 0.03, c.feather, -0.6 + b.rand() * 1.2, 0.02, -1.2 - b.rand() * 0.8, b.rand() * 3);
  b.pop();
  b.post(-1.5, 0, 13.2, 0.85, 1.3);
  b.put(new THREE.CylinderGeometry(0.06, 0.07, 1.0, 7), c.iron, 3.2, 0.5, 1.0);
  b.box(0.05, 0.05, 0.6, c.iron, 3.2, 1.0, 1.2, 0, 0.5, 0);
  b.box(0.04, 0.04, 0.22, c.iron, 3.2, 0.72, 0.86);
  b.put(new THREE.CylinderGeometry(0.15, 0.12, 0.26, 9, 1, true), c.bucket, 3.2, 0.14, 0.6);
  b.post(3.2, 0, 1.0, 0.12, 1.0);
  // The mailbox at the track in, a child's bicycle on its side, a dog's kennel and its chain, the woodpile.
  b.box(0.08, 1.05, 0.08, c.trim, -2.4, 0.52, -17.5);
  b.box(0.2, 0.2, 0.42, c.mailbox, -2.4, 1.14, -17.5);
  b.box(0.02, 0.16, 0.05, c.switchRed, -2.28, 1.24, -17.6);
  b.spot('mailbox', -1.6, 0, -17.5);
  b.push(-1.2, 0.16, -4.6, 0.7, 0, 1.45);
  for (const z of [-0.42, 0.42]) b.put(new THREE.TorusGeometry(0.22, 0.025, 5, 12).rotateY(Math.PI / 2), c.rubber, 0, 0.22, z);
  b.box(0.03, 0.03, 0.8, c.bikeRed, 0, 0.36, 0, 0, 0.25, 0);
  b.box(0.03, 0.34, 0.03, c.bikeRed, 0, 0.42, 0.34);
  b.box(0.3, 0.03, 0.03, c.iron, 0, 0.6, 0.36);
  b.box(0.1, 0.04, 0.18, c.rubber, 0, 0.5, -0.2);
  b.pop();
  b.push(-13.4, 0, -1.8, 0.4);
  b.box(0.8, 0.6, 1.0, c.coop, 0, 0.3, 0);
  for (const s of [-1, 1]) b.box(0.5, 0.04, 1.1, c.tin, s * 0.22, 0.7, 0, 0, 0, -s * 0.6);
  b.box(0.32, 0.36, 0.03, c.coopDark, 0, 0.2, -0.51);
  for (let i = 0; i < 9; i++) b.put(new THREE.TorusGeometry(0.035, 0.01, 4, 6).rotateX(Math.PI / 2), c.iron, 0.2 + i * 0.05, 0.02, -0.75 - i * 0.12);
  b.pop();
  b.post(-13.4, 0, -1.8, 0.6, 0.7);
  for (let row = 0; row < 4; row++) {
    for (let x = -0.1; x < 2.4; x += 0.26) {
      const r = 0.1 + b.rand() * 0.03;
      b.put(new THREE.CylinderGeometry(r, r, 0.45, 6).rotateX(Math.PI / 2), c.firewood, -1.6 + x, 0.14 + row * 0.21, 9.0);
      b.put(new THREE.CylinderGeometry(r * 0.93, r * 0.93, 0.012, 6).rotateX(Math.PI / 2), c.firewoodEnd, -1.6 + x, 0.14 + row * 0.21, 9.23);
    }
  }
  // A split-rail fence along the front on the left, a gap where the path to the porch goes.
  for (let x = -17; x <= -9; x += 2.0) {
    b.box(0.12, 1.0, 0.12, c.rail, x, 0.5, -5.2);
    if (x < -9) for (const y of [0.4, 0.8]) b.box(2.05, 0.08, 0.06, c.rail, x + 1.0, y, -5.2, 0, 0, (b.rand() - 0.5) * 0.05);
  }
  b.wall(-17, -5.2, -9, -5.2, 0, 0.08, 1.0, false);
  // The worn path from the track to the steps: flat stones.
  for (let i = 0; i < 7; i++) b.put(new THREE.CylinderGeometry(0.3 + b.rand() * 0.1, 0.32, 0.04, 7), c.stone, D.x * (0.25 + i * 0.12) + (b.rand() - 0.5) * 0.2, 0.02, -8.5 + i * 1.05, b.rand() * 3);

  // The walls a body can't walk through: the house (the door's gap open), the partition (its doorway open).
  b.wall(H.x0, H.z0, dl, H.z0, 0, 0.1, F + W);
  b.wall(dr, H.z0, H.x1, H.z0, 0, 0.1, F + W);
  b.wall(H.x0, H.z1, H.x1, H.z1, 0, 0.1, F + W);
  b.wall(H.x0, H.z0, H.x0, H.z1, 0, 0.1, F + W);
  b.wall(H.x1, H.z0, H.x1, H.z1, 0, 0.1, F + W);
  b.wall(P, H.z0, P, I.z - I.w / 2, 0, 0.07, F + W);
  b.wall(P, I.z + I.w / 2, P, H.z1, 0, 0.07, F + W);

  const geometry = mirrorX(bakeParts(b.parts, { weather, baseAt: () => 0, seed: 53 }));
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  const group = new THREE.Group();
  group.name = 'pruittFarm';
  const set = new THREE.Mesh(geometry, material);
  set.castShadow = true;
  set.receiveShadow = true;
  group.add(set);

  // ---- what changes ----
  const glowMat = new THREE.MeshBasicMaterial({ color: rgb(look.glow.bulb) });
  const sp = b.spots;
  const porchBulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), glowMat);
  porchBulb.position.set(-sp.porchLight.x, sp.porchLight.y, sp.porchLight.z);
  const innerBulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), glowMat);
  innerBulb.position.set(-sp.bulb.x, sp.bulb.y, sp.bulb.z);
  const yardBulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), glowMat);
  yardBulb.position.set(-sp.yardLamp.x, sp.yardLamp.y, sp.yardLamp.z);
  group.add(porchBulb, innerBulb, yardBulb);
  const journal = ownMesh(
    [
      [0.2, 0.035, 0.27, look.colors.journal, 0, 0.018, 0, 0.3],
      [0.17, 0.008, 0.24, look.colors.paper, 0, 0.04, 0, 0.3],
      [0.012, 0.012, 0.16, look.colors.crayonBlue, 0.14, 0.01, 0.05, 1.1], // her pen beside it
    ],
    material,
  );
  journal.position.set(-sp.journalOn.x, sp.journalOn.y, sp.journalOn.z);
  const gun = ownMesh(
    [
      [0.95, 0.045, 0.04, look.colors.gunSteel, 0.05, 0, 0],
      [0.4, 0.09, 0.045, look.colors.gunWood, -0.52, -0.03, 0, 0, 0, 0.12],
      [0.3, 0.05, 0.05, look.colors.gunWood, 0.12, -0.045, 0],
    ],
    material,
  );
  gun.position.set(5.45, F + 1.76, H.z1 - 0.13);
  group.add(journal, gun);

  // Out in the model's own coordinates (mirrored, as the geometry is).
  const spots = Object.fromEntries(Object.entries(b.spots).map(([k, v]) => [k, { x: -v.x, y: v.y, z: v.z }]));
  const colliders = b.colliders.map((col) => (col.seg ? { ...col, ax: -col.ax, bx: -col.bx } : { ...col, x: -col.x }));
  return {
    group,
    spots,
    colliders,
    parts: { porchBulb, innerBulb, yardBulb, journal, shotgun: gun },
    dispose() {
      geometry.dispose();
      material.dispose();
      glowMat.dispose();
      for (const m of [porchBulb, innerBulb, yardBulb, journal, gun]) m.geometry.dispose();
    },
  };
}
