// The sawmill's set (Session 28; DESIGN.md "The sawmill"): Harlan Stover's
// mill (a draft name), the crew the government hired to clear ground for
// the portal programme. On their last payday the Men in Black came with a
// payroll case and no money in it. All in code, baked into ONE
// vertex-coloured mesh (render/propKit.js, render/setBuilder.js), plus a
// few small meshes that change in play: no lights, dull colours (the glare
// rule).
//
//  - the agents' two black sedans across the mill road. One's boot is open:
//    bags of quicklime, shovels, a roll of tarp. The other has an axe through
//    its windscreen, and the last agent sitting dead against its sill with
//    the radio handset in his lap and the SMG beside him;
//  - the bunkhouse (walk in): the day shift's bunks, the blankets pulled
//    half off, the mattresses dark; a card table with the hands still laid
//    out and the payroll case open on it; spent brass inside the door;
//  - drag marks from the bunkhouse door across the yard to a row of five
//    shapes wrapped in blue tarp, and beyond them the pit the agents had
//    started, the spoil heaped beside it;
//  - the mill shed, open down its front: the carriage on its track with a
//    log stopped halfway through the head saw, the head rig and its husk,
//    the belt to the power unit, the roller bed and the fresh boards on it,
//    the sawdust conveyor out the back to the pile; the log deck behind,
//    its bottom logs rolled off across a man in a black suit;
//  - where the night shift fought back: an agent on the shed floor with
//    the chainsaw stood in him, another on the bunkhouse porch under a
//    peavey, another face down at the pit's edge with an axe in his back;
//    and the loggers they took with them, by the saw, on the deck, in the
//    yard, against the lumber;
//  - the filing room on the shed's end: the saw filer's bench and vise, a
//    spare blade on the wall, the foreman's desk and his day book.
//
// Model space: Tom arrives from -z along the mill road; the origin is the
// clearing's middle; +x is his left as he walks in (three.js turns +z ahead
// with +x left: world/SawmillSite.js converts).
//
// buildSawmill(cfg, { weather, heightAt }) returns { group, mesh, parts,
// spots, colliders, risers, hideRiser(i), showRisers(), dispose }. parts:
// the small meshes (headSaw, chainsaw, smg, diary). risers: the dead who
// get up, all in one mesh ({ kind: 'logger' | 'mib', group, x, y, z, yaw }
// in model space): hideRiser(i) folds one body's vertices away (the zombie
// that stands up where it lay is the encounter's).

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { bakeParts } from './propKit.js';
import { SetBuilder } from './setBuilder.js';

// The set's measurements (metres, model space).
export const SAWMILL = {
  shed: { x0: -11, x1: 7, z0: 4.5, z1: 11.5, eaves: 3.4, ridge: 5.0, floor: 0.06 },
  track: { z0: 6.9, z1: 8.0, x0: -10.5, x1: 6.5 },
  saw: { x: -2, z: 6.5, y: 1.0, r: 0.76 },
  carriage: { x: 0.8, length: 4.2, bed: 0.62 },
  deck: { x0: 1.5, x1: 6.5, z0: 9.3, z1: 14.5, low: 0.95, high: 1.35 },
  pile: { x: -5.5, z: 15.2, r: 3.0, h: 2.2 },
  filing: { x0: -14.5, x1: -11, z0: 5, z1: 9.5 },
  bunk: { x0: 10.5, x1: 15.5, z0: -10, z1: 0, wall: 2.5, ridge: 3.6, door: -5, doorHalf: 0.6 },
  tarps: { x0: 9, step: 0.95, z: 5, count: 5 },
  pit: { x: 15.6, z: 6.2, w: 2.2, d: 3.2 },
  sedanA: { x: -3.5, z: -14, yaw: 0.45 }, // the last agent's
  sedanB: { x: 4.5, z: -16.5, yaw: -0.35 }, // the one with the boot open
  stacks: [
    { x: -8, z: -3, yaw: 0, layers: 7 },
    { x: -11.5, z: -3.2, yaw: 0.04, layers: 5 },
    { x: -9.6, z: -8.6, yaw: Math.PI / 2 - 0.08, layers: 6 },
  ],
};

// ---- small pieces ------------------------------------------------------------------------------

const UP = new THREE.Vector3(0, 1, 0);

// A round limb from a to b (the current frame), `sides` round.
export function limb(b, a, to, r, color, sides = 5, r2 = r) {
  const av = new THREE.Vector3(...a);
  const bv = new THREE.Vector3(...to);
  const d = bv.clone().sub(av);
  const len = d.length();
  if (len < 0.001) return;
  const g = new THREE.CylinderGeometry(r2, r, len, sides);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, d.normalize()));
  g.translate((av.x + bv.x) / 2, (av.y + bv.y) / 2, (av.z + bv.z) / 2);
  b.put(g, color);
}

// A log along the frame's x, centred at (x, y, z): bark, both ends cut.
export function log(b, len, r, x, y, z, yaw = 0, color = null) {
  const c = b.c;
  b.push(x, y, z, yaw);
  b.put(new THREE.CylinderGeometry(r, r * 1.06, len, 8, 1, true).rotateZ(Math.PI / 2), color ?? (b.rand() < 0.5 ? c.bark : c.barkDark));
  for (const s of [-1, 1]) b.put(new THREE.CircleGeometry(r * (s < 0 ? 1.06 : 1), 8).rotateY((s * Math.PI) / 2), c.endGrain, (s * len) / 2, 0, 0);
  b.pop();
}

// A stickered stack of fresh lumber (its frame: on the ground, boards along z).
function lumberStack(b, layers, len = 4.2, w = 1.2) {
  const c = b.c;
  for (const z of [-len / 2 + 0.4, 0, len / 2 - 0.4]) b.box(w + 0.1, 0.12, 0.14, c.postDark, 0, 0.06, z); // bearers
  for (let i = 0; i < layers; i++) {
    const y = 0.12 + i * 0.16 + 0.055;
    const short = i === layers - 1 ? 0.5 + b.rand() * 0.4 : 0;
    b.box(w - short, 0.11, len - b.rand() * 0.12, i % 3 === 1 ? c.plankNewDark : c.plankNew, short / 2, y, (b.rand() - 0.5) * 0.06);
    if (i < layers - 1) for (const z of [-len / 2 + 0.5, 0, len / 2 - 0.5]) b.box(w, 0.05, 0.05, c.plankDark, 0, y + 0.08, z);
  }
}

// A peavey (a cant hook with a spike): its frame has the spike at the origin, the handle up +y.
function peavey(b) {
  const c = b.c;
  limb(b, [0, 0.12, 0], [0, 1.45, 0], 0.024, c.handle, 5, 0.018);
  limb(b, [0, 0, 0], [0, 0.14, 0], 0.006, c.axe, 4, 0.022);
  b.box(0.03, 0.34, 0.012, c.axe, 0.07, 0.3, 0, 0, 0, -0.35);
}

// An axe: its frame has the bit at the origin, the handle running +y.
function axe(b) {
  const c = b.c;
  b.box(0.19, 0.12, 0.035, c.axe, 0.02, 0.04, 0);
  limb(b, [0.03, 0.04, 0], [0.03, 0.82, 0], 0.02, c.handle, 5, 0.016);
}

// A blood pool on the ground or a floor (its frame's y is the surface).
export function blood(b, r, x = 0, z = 0, y = 0.012) {
  const c = b.c;
  b.put(new THREE.CylinderGeometry(r, r, 0.012, 9).scale(1, 1, 0.7 + b.rand() * 0.5), b.rand() < 0.5 ? c.blood : c.bloodDark, x, y, z, b.rand() * 6);
}

// A dead man on his back (its frame: on the surface, the pelvis at the
// origin, the head toward +z). kind: 'logger' | 'mib'. p: { arms: [left,
// right] angles from "down by his side" (0) round to "above his head" (pi),
// legs: [left, right] splay, knee: [left, right] bend, head: turn, shirt,
// trousers, hat, prone }. prone only turns the head down and hides the
// shirt front.
export function deadMan(b, kind, p = {}) {
  const c = b.c;
  const mib = kind === 'mib';
  const shirt = mib ? c.suit : p.shirt ?? c.flannelRed;
  const trousers = mib ? c.suit : p.trousers ?? c.denim;
  const skin = p.dark ? c.skinDark : c.skin;
  const arms = p.arms ?? [0.3, 0.5];
  const legs = p.legs ?? [0.12, 0.18];
  const knee = p.knee ?? [0, 0.2];
  // The torso and hips.
  b.box(0.4, 0.2, 0.52, shirt, 0, 0.11, 0.3, 0, 0, (b.rand() - 0.5) * 0.1);
  b.box(0.36, 0.18, 0.2, trousers, 0, 0.1, 0);
  if (mib && !p.prone) {
    b.box(0.17, 0.012, 0.42, c.shirt, 0, 0.214, 0.34); // the shirt front
    b.box(0.045, 0.014, 0.34, c.tie, 0.01, 0.222, 0.33, 0.12);
  } else if (!mib && !p.prone) {
    for (const s of [-1, 1]) b.box(0.035, 0.012, 0.46, c.workBrown, s * 0.1, 0.214, 0.31); // braces
  }
  // The head.
  const turn = p.head ?? 0.5;
  b.push(0, 0.12, 0.68, turn);
  b.put(new THREE.SphereGeometry(0.11, 7, 5).scale(0.9, 1, 1.05), skin, 0, 0, 0);
  b.put(new THREE.SphereGeometry(0.115, 7, 4, 0, Math.PI * 2, 0, Math.PI * 0.5).rotateX(p.prone ? 0.2 : -1.2), p.grey ? c.hairGrey : c.hair, 0, 0.005, 0.01);
  if (mib && !p.prone) b.box(0.17, 0.03, 0.035, c.tie, 0, 0.095, 0.02); // the sunglasses, still on
  b.pop();
  // The arms.
  [1, -1].forEach((s, i) => {
    const a = arms[i];
    const sx = s * 0.25;
    const ex = sx + s * Math.sin(a) * 0.3;
    const ez = 0.5 - Math.cos(a) * 0.3;
    const bend = a + (i ? 0.5 : -0.3);
    const hx = ex + s * Math.sin(bend) * 0.27;
    const hz = ez - Math.cos(bend) * 0.27;
    limb(b, [sx, 0.12, 0.5], [ex, 0.07, ez], 0.055, shirt, 5, 0.048);
    limb(b, [ex, 0.07, ez], [hx, 0.05, hz], 0.046, mib || p.sleeves !== false ? shirt : skin, 5, 0.04);
    b.put(new THREE.SphereGeometry(0.045, 5, 4), skin, hx + s * 0.02, 0.05, hz - 0.03);
  });
  // The legs.
  [1, -1].forEach((s, i) => {
    const a = legs[i];
    const kx = s * 0.1 + s * Math.sin(a) * 0.44;
    const kz = -0.08 - Math.cos(a) * 0.44;
    const k2 = a - s * knee[i] * (i ? -1 : 1);
    const fx = kx + s * Math.sin(k2) * 0.42;
    const fz = kz - Math.cos(k2) * 0.42;
    limb(b, [s * 0.1, 0.1, -0.08], [kx, 0.09 + knee[i] * 0.12, kz], 0.075, trousers, 5, 0.062);
    limb(b, [kx, 0.09 + knee[i] * 0.12, kz], [fx, 0.07, fz], 0.06, trousers, 5, 0.05);
    b.box(0.1, mib ? 0.2 : 0.24, 0.12, mib ? c.shoe : c.boot, fx, mib ? 0.1 : 0.12, fz - 0.03, k2 * s);
  });
  if (p.hat) b.put(new THREE.SphereGeometry(0.15, 8, 4, 0, Math.PI * 2, 0, Math.PI * 0.5).scale(1, 0.75, 1.15), c.hardHat, p.hat[0], 0, p.hat[1]);
}

// A dead man sat against something (its frame: on the ground, his back
// against the thing behind him at z = 0, his legs out toward -z).
function slumpedMan(b, kind, p = {}) {
  const c = b.c;
  const mib = kind === 'mib';
  const shirt = mib ? c.suit : p.shirt ?? c.flannelGreen;
  const trousers = mib ? c.suit : p.trousers ?? c.workBrown;
  b.push(0, 0.1, -0.16, 0, -0.28, p.lean ?? 0.12);
  b.box(0.4, 0.52, 0.2, shirt, 0, 0.3, 0);
  if (mib) {
    b.box(0.13, 0.4, 0.012, c.shirt, 0, 0.32, -0.105);
    b.box(0.045, 0.34, 0.014, c.tie, 0.01, 0.33, -0.113);
  } else for (const s of [-1, 1]) b.box(0.035, 0.46, 0.012, c.workBrown, s * 0.1, 0.31, -0.105);
  // The head, down on his chest.
  b.push(0, 0.66, -0.05, p.head ?? 0.2, 0.75, 0);
  b.put(new THREE.SphereGeometry(0.11, 7, 5), c.skin, 0, 0.04, 0);
  b.put(new THREE.SphereGeometry(0.115, 7, 4, 0, Math.PI * 2, 0, Math.PI * 0.5), p.grey ? c.hairGrey : c.hair, 0, 0.045, 0.01);
  if (mib) b.box(0.17, 0.03, 0.035, c.tie, 0, 0.05, -0.095);
  b.pop();
  for (const s of [-1, 1]) {
    limb(b, [s * 0.25, 0.5, 0], [s * 0.3, 0.2, -0.06], 0.055, shirt, 5, 0.048);
    limb(b, [s * 0.3, 0.2, -0.06], [s * (p.hands ?? 0.2), 0.02, -0.3], 0.046, shirt, 5, 0.04);
    b.put(new THREE.SphereGeometry(0.045, 5, 4), c.skin, s * (p.hands ?? 0.2), 0.02, -0.33);
  }
  b.pop();
  b.box(0.36, 0.18, 0.22, trousers, 0, 0.1, -0.2);
  [1, -1].forEach((s, i) => {
    const sp = s * (0.1 + (i ? 0.22 : 0.08));
    limb(b, [s * 0.1, 0.1, -0.26], [sp, 0.09, -0.7], 0.075, trousers, 5, 0.062);
    limb(b, [sp, 0.09, -0.7], [sp * 1.5, 0.07, -1.12], 0.06, trousers, 5, 0.05);
    b.box(0.1, mib ? 0.2 : 0.24, 0.12, mib ? c.shoe : c.boot, sp * 1.5, mib ? 0.1 : 0.12, -1.15, s * 0.3);
  });
}

// A body wrapped in a tarp and roped (its frame: on the ground, the head toward +z).
function wrapped(b, i) {
  const c = b.c;
  b.put(new THREE.SphereGeometry(1, 8, 6).scale(0.27, 0.19, 0.92), i % 2 ? c.tarp : c.tarpDark, 0, 0.17, 0, 0, 0, (b.rand() - 0.5) * 0.1);
  for (const z of [-0.5, 0.05, 0.55]) b.box(0.5, 0.025, 0.03, c.handle, 0, 0.3 - Math.abs(z) * 0.1, z, (b.rand() - 0.5) * 0.2);
  // Boots out of the end of it.
  for (const s of [-1, 1]) b.box(0.1, 0.24, 0.12, c.boot, s * 0.09, 0.13, -0.95, s * 0.3, 0.2);
}

// A black sedan (its frame: on the ground, its nose +z). opts: { boot, door, axe }.
function sedan(b, opts = {}) {
  const c = b.c;
  const W = 1.84;
  b.box(W, 0.5, 4.9, c.car, 0, 0.62, 0);
  b.box(W - 0.04, 0.12, 4.7, c.carDark, 0, 0.34, 0);
  // The cabin: glass all round under a roof.
  b.box(W - 0.3, 0.44, 2.0, c.carGlass, 0, 1.09, -0.25);
  b.box(W - 0.26, 0.06, 1.7, c.car, 0, 1.33, -0.25);
  for (const z of [-1.22, 0.72]) for (const s of [-1, 1]) b.box(0.07, 0.48, 0.08, c.car, s * (W / 2 - 0.17), 1.09, z, 0, z < 0 ? -0.5 : 0.6);
  for (const s of [-1, 1]) b.box(0.06, 0.44, 0.08, c.car, s * (W / 2 - 0.15), 1.09, -0.25);
  // Bumpers, the grille, the lamps (dead).
  for (const s of [-1, 1]) b.box(W + 0.04, 0.14, 0.12, c.chrome, 0, 0.44, s * 2.46);
  b.box(1.0, 0.16, 0.04, c.carDark, 0, 0.7, 2.46);
  for (const s of [-1, 1]) {
    b.box(0.3, 0.14, 0.04, c.carGlass, s * 0.7, 0.72, 2.46);
    b.box(0.34, 0.12, 0.04, c.bloodDark, s * 0.68, 0.72, -2.46);
  }
  for (const s of [-1, 1]) {
    for (const z of [-1.55, 1.55]) {
      b.put(new THREE.CylinderGeometry(0.33, 0.33, 0.22, 10).rotateZ(Math.PI / 2), c.tyre, s * (W / 2 - 0.1), 0.33, z);
      b.put(new THREE.CylinderGeometry(0.17, 0.17, 0.23, 8).rotateZ(Math.PI / 2), c.chrome, s * (W / 2 - 0.1), 0.33, z);
    }
  }
  // The aerial (a government car).
  limb(b, [0.6, 0.87, -2.1], [0.62, 1.9, -2.2], 0.008, c.carDark, 4);
  if (opts.boot) {
    // The boot lid up; in it: bags of quicklime, two shovels, a roll of blue tarp.
    b.box(W - 0.2, 0.05, 1.0, c.car, 0, 1.28, -1.62, 0, 1.05, 0);
    b.box(W - 0.3, 0.02, 0.95, c.hollow, 0, 0.875, -1.92);
    for (let i = 0; i < 3; i++) b.put(new THREE.SphereGeometry(1, 7, 5).scale(0.34, 0.11, 0.24), c.lime, -0.35 + i * 0.36, 0.95 + (i % 2) * 0.06, -1.9 + (i % 2) * 0.1, i * 0.4);
    b.put(new THREE.CylinderGeometry(0.11, 0.11, 1.2, 8).rotateZ(Math.PI / 2), c.tarp, 0.05, 1.0, -2.2);
    limb(b, [-0.6, 0.92, -1.6], [0.75, 1.2, -2.42], 0.02, c.handle, 5);
    b.box(0.2, 0.02, 0.26, c.axe, -0.68, 0.92, -1.55, 0.5);
    b.spot('boot', 0, 0, -3.3);
  } else b.box(W - 0.2, 0.05, 1.0, c.car, 0, 0.89, -1.95);
  if (opts.door) {
    // The driver's door (its +x side) swung wide.
    b.push(W / 2, 0.36, 0.72, 1.15);
    b.box(0.06, 0.52, 1.08, c.car, 0, 0.27, -0.54);
    b.box(0.03, 0.4, 0.9, c.carGlass, 0, 0.73, -0.52);
    b.pop();
    b.box(0.06, 0.5, 1.0, c.hollow, W / 2 - 0.02, 0.63, 0.2); // the doorway, dark
    // The radio's handset on its curly cord, pulled out over the sill.
    limb(b, [W / 2 - 0.2, 0.75, 0.55], [W / 2 + 0.25, 0.32, 0.25], 0.008, c.carDark, 4);
    b.box(0.05, 0.04, 0.14, c.carDark, W / 2 + 0.27, 0.3, 0.22, 0.4);
  }
  if (opts.axe) {
    // A felling axe through the windscreen, the glass starred white round it.
    b.push(-0.28, 1.12, 0.82, 0.3, -1.0, 0.2);
    axe(b);
    b.pop();
    for (let i = 0; i < 5; i++) b.box(0.02, 0.012, 0.22 + b.rand() * 0.25, c.chrome, -0.28, 1.09 + (b.rand() - 0.5) * 0.02, 0.86, i * 1.25, -0.6, 0);
  }
  b.wall(0, -2.0, 0, 2.0, 0, 0.95, 1.4);
}

// A two-tier bunk (its frame: on the floor, its length along z, the wall behind it at -x).
function bunkBed(b, i) {
  const c = b.c;
  for (const sx of [-0.42, 0.42]) for (const sz of [-0.98, 0.98]) b.box(0.07, 1.75, 0.07, c.postDark, sx, 0.875, sz);
  for (const y of [0.42, 1.3]) {
    b.box(0.86, 0.06, 2.0, c.plankDark, 0, y, 0);
    b.box(0.8, 0.1, 1.9, c.mattress, 0, y + 0.08, 0);
    const pulled = b.rand() < 0.6; // the blanket dragged half off, toward the aisle
    b.box(0.82, 0.04, pulled ? 0.9 : 1.2, i % 2 ? c.blanket : c.blanketDark, pulled ? 0.25 : 0, y + 0.15, -0.3, (b.rand() - 0.5) * 0.2, 0, pulled ? -0.25 : 0);
    if (pulled) b.box(0.03, 0.5, 0.8, i % 2 ? c.blanket : c.blanketDark, 0.46, y - 0.08, -0.3, 0, 0, 0.12);
    b.put(new THREE.SphereGeometry(1, 6, 4).scale(0.2, 0.06, 0.14), c.paper, 0, y + 0.17, 0.75);
    if (b.rand() < 0.75) b.box(0.4 + b.rand() * 0.3, 0.012, 0.5 + b.rand() * 0.5, b.rand() < 0.5 ? c.blood : c.bloodDark, (b.rand() - 0.5) * 0.2, y + 0.136, 0.35, b.rand());
  }
  b.box(0.05, 0.9, 0.05, c.postDark, 0.42, 0.87, -0.6); // the ladder
  for (let k = 0; k < 3; k++) b.box(0.05, 0.03, 0.3, c.postDark, 0.42, 0.6 + k * 0.25, -0.75);
}

// The chainsaw (its frame: the bar's tip at the origin, the bar running up +y to the body).
export function chainsawProp(b) {
  const c = b.c;
  b.box(0.012, 0.42, 0.075, c.sawBar, 0, 0.21, 0);
  b.box(0.02, 0.4, 0.09, c.sawDark, 0, 0.22, 0); // the chain round it
  b.box(0.2, 0.26, 0.34, c.saw, 0.0, 0.55, 0.02);
  b.box(0.16, 0.1, 0.16, c.sawDark, 0, 0.72, 0.08);
  b.put(new THREE.TorusGeometry(0.11, 0.014, 4, 8, Math.PI).rotateY(Math.PI / 2), c.sawDark, 0, 0.68, -0.02); // the front handle
  b.box(0.05, 0.06, 0.2, c.sawDark, 0, 0.6, 0.28); // the rear handle
}

// ---- the set -----------------------------------------------------------------------------------

export function buildSawmill(cfg, { weather = null, heightAt = null } = {}) {
  const look = cfg.look;
  const b = new SetBuilder(look, heightAt, 2803);
  const c = b.c;
  const S = SAWMILL;
  const sawB = new SetBuilder(look, heightAt, 2804);
  const chainB = new SetBuilder(look, heightAt, 2805);
  const smgB = new SetBuilder(look, heightAt, 2806);
  const diaryB = new SetBuilder(look, heightAt, 2807);
  const riserBuilders = [];
  const risers = [];
  // One of the dead who gets up: built by fn(rb) in its own frame at (x, y above the ground, z).
  const riser = (kind, group, x, y, z, yaw, fn, tilt = [0, 0]) => {
    const rb = new SetBuilder(look, heightAt, 2810 + risers.length);
    rb.pushOnGround(x, y, z, yaw, tilt[0], tilt[1]);
    fn(rb);
    rb.pop();
    riserBuilders.push(rb);
    risers.push({ kind, group, x, y: b.heightAt(x, z) + y, z, yaw });
  };

  b.spot('arrive', 0, 0, -25);
  b.spot('middle', 0, 0, 0);

  // ---- the mill road in: ruts, and the two sedans across it ----
  for (const s of [-1, 1]) {
    for (let z = -26; z < -19; z += 1.6) {
      b.pushOnGround(s * 0.85 + Math.sin(z) * 0.1, 0, z, Math.sin(z * 0.7) * 0.1);
      b.box(0.3, 0.02, 1.7, c.dirt, 0, 0.002, 0);
      b.pop();
    }
  }
  const A = S.sedanA;
  b.pushOnGround(A.x, 0, A.z, A.yaw);
  sedan(b, { door: true, axe: true });
  // The last agent, sat on the ground against the sill, the handset in his lap. He stays dead.
  b.push(1.32, 0, 0.15, -Math.PI / 2);
  slumpedMan(b, 'mib', { lean: -0.18, head: -0.3, hands: 0.16 });
  blood(b, 0.55, 0.1, -0.5);
  b.spot('agent', 0, 0, -1.0);
  smgB.stack = [b.m.clone()];
  // The SMG on the ground by his hand (its own mesh: Tom takes it).
  smgB.box(0.05, 0.07, 0.36, c.tie, 0.5, 0.04, -0.45, 0.6);
  smgB.box(0.04, 0.2, 0.05, c.tie, 0.47, 0.04, -0.4, 0.6, 0.5, 1.3);
  smgB.box(0.035, 0.035, 0.16, c.shoe, 0.6, 0.045, -0.2, 0.6);
  b.pop();
  // Brass in the dirt where he emptied it across the yard.
  for (let i = 0; i < 14; i++) b.box(0.012, 0.012, 0.03, c.brass, 1.2 + b.rand() * 1.3, 0.01, -0.6 + b.rand() * 1.8, b.rand() * 6);
  b.pop();
  const B = S.sedanB;
  b.pushOnGround(B.x, 0, B.z, B.yaw);
  sedan(b, { boot: true });
  // Another bag dropped behind it, burst.
  b.put(new THREE.SphereGeometry(1, 7, 5).scale(0.36, 0.1, 0.26), c.lime, 0.9, 0.08, -3.2, 0.5);
  b.put(new THREE.CylinderGeometry(0.5, 0.6, 0.015, 9), c.lime, 1.15, 0.012, -3.5);
  b.pop();

  // ---- the lumber yard: stickered stacks of what they'd cut ----
  S.stacks.forEach((st, i) => {
    b.pushOnGround(st.x, 0, st.z, st.yaw);
    lumberStack(b, st.layers);
    b.wall(0, -2.0, 0, 2.0, 0, 0.65, 0.2 + st.layers * 0.16, i !== 1);
    b.pop();
  });
  // A logger sat against the first stack's end, shot where he'd run to. (He gets up.)
  riser('logger', 'yard', S.stacks[0].x + 0.1, 0, S.stacks[0].z - 2.12, 0, (rb) => slumpedMan(rb, 'logger', { shirt: c.flannelGreen, grey: true }));
  b.pushOnGround(S.stacks[0].x + 0.1, 0, S.stacks[0].z - 2.6);
  blood(b, 0.5);
  for (let i = 0; i < 4; i++) b.box(0.05, 0.05, 0.02, c.hollow, -0.3 + i * 0.22 + b.rand() * 0.1, 0.5 + b.rand() * 0.5, 0.5); // the holes in the boards behind him
  b.pop();
  // Another face down in the open yard, a peavey by his hand. (He gets up.)
  riser('logger', 'yard', 1.5, 0, -2.5, 2.9, (rb) => deadMan(rb, 'logger', { prone: true, shirt: c.flannelRed, arms: [2.7, 2.2], legs: [0.1, 0.35], knee: [0, 0.5], hat: [0.5, 1.2] }));
  b.pushOnGround(1.5, 0, -2.5, 2.9);
  blood(b, 0.6, 0, 0.3);
  b.push(0.55, 0.03, 1.1, 0.4, Math.PI / 2 - 0.02, 0);
  peavey(b);
  b.pop();
  b.pop();

  // ---- the bunkhouse ----
  const K = S.bunk;
  const bw = K.x1 - K.x0;
  const bl = K.z1 - K.z0;
  const bcx = (K.x0 + K.x1) / 2;
  const bcz = (K.z0 + K.z1) / 2;
  b.pushOnGround(bcx, 0, bcz);
  {
    const hx = bw / 2;
    const hz = bl / 2;
    const H = K.wall;
    b.box(bw, 0.06, bl, c.floor, 0, 0.03, 0);
    b.box(1.6, 0.05, 3.2, c.plankDark, -hx - 0.8, 0.025, K.door - bcz); // the porch
    // The long walls, round their windows and the door (in the wall toward the yard, -x).
    const longWall = (x, openings) => {
      // openings: [z, half, sill, head] along the wall.
      let z = -hz;
      const sorted = [...openings].sort((p, q) => p[0] - q[0]);
      for (const [oz, half, sill, head] of [...sorted, [hz + 9, 0, 0, 0]]) {
        const end = Math.min(hz, oz - half);
        if (end - z > 0.02) b.box(0.1, H, end - z, c.clap, x, H / 2, (z + end) / 2);
        if (oz < hz) {
          if (sill > 0) b.box(0.1, sill, half * 2, c.clap, x, sill / 2, oz);
          b.box(0.1, H - head, half * 2, c.clapDark, x, (H + head) / 2, oz);
          if (sill > 0) {
            b.box(0.02, head - sill, half * 2, c.glass, x, (sill + head) / 2, oz);
            b.box(0.13, 0.05, half * 2 + 0.1, c.trim, x, sill, oz);
            b.box(0.13, 0.04, 0.04, c.trim, x, (sill + head) / 2, oz);
          }
        }
        z = oz + half;
      }
      // Battens.
      for (let q = -hz + 0.35; q < hz; q += 0.7) {
        if (openings.some(([oz, half]) => Math.abs(q - oz) < half + 0.05)) continue;
        b.box(0.03, H, 0.06, c.clapDark, x + Math.sign(x) * 0.06, H / 2, q);
      }
    };
    const dz = K.door - bcz;
    longWall(-hx, [[dz, K.doorHalf, 0, 2.05], [dz - 3, 0.5, 1.0, 1.9], [dz + 3, 0.5, 1.0, 1.9]]);
    longWall(hx, [[-2.5, 0.5, 1.0, 1.9], [2.5, 0.5, 1.0, 1.9]]);
    for (const s of [-1, 1]) {
      b.box(bw, H, 0.1, c.clap, 0, H / 2, s * hz);
      for (let q = -hx + 0.35; q < hx; q += 0.7) b.box(0.06, H, 0.03, c.clapDark, q, H / 2, s * (hz + 0.06));
      // The gable.
      const rise = K.ridge - H;
      for (let r = 0; r < 5; r++) b.box((bw + 0.5) * (1 - r / 5), rise / 5 + 0.01, 0.08, r % 2 ? c.clapDark : c.clap, 0, H + ((r + 0.5) * rise) / 5, s * hz);
    }
    // The door, pushed in and left.
    b.push(-hx, 0, dz - K.doorHalf, -1.25);
    b.box(0.05, 2.0, K.doorHalf * 2, c.plankDark, 0.03, 1.03, K.doorHalf);
    b.pop();
    // The roof: tin, two slopes along z.
    const slope = Math.hypot(hx + 0.3, K.ridge - H);
    const pitch = Math.atan2(K.ridge - H, hx + 0.3);
    for (const s of [-1, 1]) {
      for (let q = -hz - 0.2; q < hz + 0.2; q += 1.02) {
        const len = Math.min(1.0, hz + 0.2 - q);
        b.box(slope, 0.03, len, Math.floor(q) % 3 ? c.tin : c.tinDark, (s * (hx + 0.3)) / 2, (H + K.ridge) / 2 + 0.04, q + len / 2, 0, 0, -s * pitch);
      }
    }
    b.box(0.2, 0.05, bl + 0.5, c.tinDark, 0, K.ridge + 0.05, 0);
    // The stove's pipe up through it.
    limb(b, [1.2, 0.9, 0.5], [1.2, K.ridge + 0.5, 0.5], 0.07, c.stove, 6);
    // Inside: bunks down the back wall and across the ends.
    const bunkAt = [[hx - 0.5, -3.7, 0], [hx - 0.5, -1.4, 0], [hx - 0.5, 1.9, 0], [hx - 0.5, 4.0, 0], [-hx + 0.5, -3.8, Math.PI], [-hx + 0.5, 3.9, Math.PI]];
    bunkAt.forEach(([x, z, yaw], i) => {
      b.push(x, 0.06, z, yaw + Math.PI);
      bunkBed(b, i);
      b.pop();
      b.post(x, 0, z, 0.55, 1.8);
    });
    b.spot('bunks', hx - 1.4, 0.06, 0.3);
    // The foreman's bunk is the single cot under the far window: his locker at its foot.
    // The stove.
    b.put(new THREE.CylinderGeometry(0.26, 0.3, 0.8, 8), c.stove, 1.2, 0.5, 0.5);
    b.box(0.2, 0.16, 0.04, c.hollow, 1.2, 0.45, 0.2);
    b.post(1.2, 0, 0.5, 0.36, 1.0);
    // The card table inside the door: four hands laid out, tin mugs, and the payroll case, open.
    b.push(-0.6, 0.06, dz + 0.2, 0.2);
    b.put(new THREE.CylinderGeometry(0.6, 0.6, 0.05, 10), c.plank, 0, 0.74, 0);
    b.box(0.1, 0.72, 0.1, c.postDark, 0, 0.36, 0);
    b.box(0.6, 0.04, 0.6, c.postDark, 0, 0.02, 0, 0.78);
    for (let i = 0; i < 4; i++) {
      const a = i * 1.57 + 0.4;
      for (let k = 0; k < 5; k++) b.box(0.06, 0.004, 0.09, c.paper, Math.sin(a) * 0.36 + (k - 2) * 0.05 * Math.cos(a), 0.77, Math.cos(a) * 0.36 - (k - 2) * 0.05 * Math.sin(a), a + (k - 2) * 0.15);
      if (i !== 2) b.put(new THREE.CylinderGeometry(0.04, 0.035, 0.09, 6), c.tin, Math.sin(a + 0.6) * 0.42, 0.81, Math.cos(a + 0.6) * 0.42);
    }
    for (let i = 0; i < 9; i++) b.box(0.03, 0.006, 0.03, i % 3 ? c.brass : c.chrome, (b.rand() - 0.5) * 0.25, 0.77, (b.rand() - 0.5) * 0.25, b.rand()); // the pot: small change
    // The case: its lid up, grey foam inside cut to the shape of a pistol and its suppressor. No money.
    b.box(0.46, 0.05, 0.32, c.case, 0.05, 0.795, -0.02, 0.5);
    b.box(0.4, 0.012, 0.26, c.caseFoam, 0.05, 0.823, -0.02, 0.5);
    b.box(0.2, 0.014, 0.05, c.hollow, 0.03, 0.826, -0.03, 0.5);
    b.box(0.05, 0.014, 0.1, c.hollow, 0.0, 0.826, 0.02, 0.5);
    b.push(0.05, 0.82, -0.02, 0.5);
    b.box(0.46, 0.32, 0.03, c.case, 0, 0.14, -0.17, 0, -0.25, 0);
    b.pop();
    b.spot('case', -0.9, 0, 0.1);
    // Chairs: two knocked over, one pushed back.
    for (const [x, z, yaw, rx] of [[0.75, 0.2, 1.2, 1.45], [-0.2, -0.95, 0.3, 0], [0.4, 0.9, 2.6, -1.5]]) {
      b.push(x, rx ? 0.22 : 0, z, yaw, rx, 0);
      b.box(0.38, 0.04, 0.38, c.plank, 0, 0.44, 0);
      b.box(0.38, 0.45, 0.04, c.plankDark, 0, 0.68, 0.18);
      for (const sx of [-0.16, 0.16]) for (const sz of [-0.16, 0.16]) b.box(0.04, 0.44, 0.04, c.postDark, sx, 0.22, sz);
      b.pop();
    }
    b.pop();
    b.post(-0.6, 0, dz + 0.2, 0.62, 0.8);
    // Spent brass inside the door, and the marks of it: holes stitched along the back wall at bunk height.
    for (let i = 0; i < 16; i++) b.box(0.012, 0.012, 0.03, c.brass, -hx + 0.5 + b.rand() * 1.2, 0.07, dz - 1.2 + b.rand() * 2.2, b.rand() * 6);
    for (let i = 0; i < 22; i++) b.box(0.02, 0.05, 0.05, c.hollow, hx - 0.06, 0.5 + b.rand() * 1.1, -4.4 + i * 0.4 + b.rand() * 0.2);
    b.spot('brass', -hx + 1.1, 0, dz - 0.9);
    // What was dragged out: dark trails from each bunk to the door.
    for (const [x, z] of bunkAt) {
      const n = Math.max(2, Math.round(Math.hypot(x + hx, z - dz) / 0.9));
      for (let k = 1; k < n; k++) {
        const t = k / n;
        b.box(0.3, 0.008, 0.95, k % 2 ? c.blood : c.bloodDark, x + (-hx + 0.3 - x) * t, 0.066, z + (dz - z) * t, Math.atan2(-hx - x, dz - z) + (b.rand() - 0.5) * 0.15);
      }
    }
    // Colliders: the walls (a gap at the door).
    b.wall(-hx, -hz, -hx, dz - K.doorHalf, 0, 0.12, H);
    b.wall(-hx, dz + K.doorHalf, -hx, hz, 0, 0.12, H);
    b.wall(hx, -hz, hx, hz, 0, 0.12, H);
    b.wall(-hx, -hz, hx, -hz, 0, 0.12, H);
    b.wall(-hx, hz, hx, hz, 0, 0.12, H);
    b.spot('bunkDoor', -hx - 1.0, 0, dz);
    b.spot('bunkInside', 0, 0, 0);
  }
  b.pop();
  // The agent on the porch, a peavey through him and into the boards. (He gets up.)
  riser('mib', 'yard', K.x0 - 1.3, 0.05, K.door + 1.5, 1.2, (rb) => deadMan(rb, 'mib', { arms: [1.9, 0.4], legs: [0.3, 0.1], knee: [0.6, 0] }));
  b.pushOnGround(K.x0 - 1.3, 0.05, K.door + 1.5, 1.2);
  blood(b, 0.55, 0, 0.3);
  b.push(0.03, 0.02, 0.36, 0, 0.3, 0.2);
  peavey(b);
  b.pop();
  b.pop();

  // ---- the drag marks across the yard, the row under the tarps, the pit ----
  const T = S.tarps;
  const rowMid = T.x0 + ((T.count - 1) * T.step) / 2;
  const from = { x: K.x0 - 1.4, z: K.door };
  for (let k = 0; k < 11; k++) {
    const t = (k + 0.5) / 11;
    const x = from.x + (rowMid - from.x) * t + Math.sin(t * 5) * 0.4;
    const z = from.z + (T.z - 1.4 - from.z) * t;
    b.pushOnGround(x, 0, z, Math.atan2(rowMid - from.x, T.z - from.z) + Math.cos(t * 5) * 0.2);
    b.box(0.42, 0.02, 1.0, k % 3 ? c.dirtDark : c.bloodDark, 0, 0.004, 0);
    if (k % 2) b.box(0.1, 0.02, 0.9, c.dirtDark, 0.34, 0.004, 0.1); // a heel
    b.pop();
  }
  b.spot('drag', from.x + (rowMid - from.x) * 0.45, 0, from.z + (T.z - from.z) * 0.45);
  for (let i = 0; i < T.count; i++) {
    const x = T.x0 + i * T.step;
    const yaw = (b.rand() - 0.5) * 0.14;
    // What's left when one sits up: the tarp, flat and open.
    b.pushOnGround(x, 0, T.z, yaw);
    b.box(0.62, 0.02, 1.95, i % 2 ? c.tarpDark : c.tarp, 0, 0.006, 0);
    b.pop();
    riser('logger', 'tarps', x, 0, T.z, yaw, (rb) => wrapped(rb, i));
  }
  b.spot('tarps', rowMid, 0, T.z - 1.6);
  // The pit: 2 m by 3, knee deep and no deeper. The spoil, two shovels stood in it, more lime.
  const P = S.pit;
  b.pushOnGround(P.x, 0, P.z, 0.12);
  b.box(P.w, 0.03, P.d, c.hollow, 0, 0.01, 0);
  for (const [x, z, w, d] of [[0, -P.d / 2 - 0.12, P.w + 0.5, 0.3], [0, P.d / 2 + 0.12, P.w + 0.5, 0.3], [-P.w / 2 - 0.12, 0, 0.3, P.d], [P.w / 2 + 0.12, 0, 0.3, P.d]]) b.box(w, 0.1, d, c.dirt, x, 0.04, z, 0, (b.rand() - 0.5) * 0.1, (b.rand() - 0.5) * 0.1);
  b.put(new THREE.SphereGeometry(1, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.3, 0.75, 1.7), c.dirt, P.w / 2 + 1.5, 0, 0.2);
  b.put(new THREE.SphereGeometry(1, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.8, 0.5, 1.0), c.dirtDark, P.w / 2 + 1.2, 0, -1.4);
  b.post(P.w / 2 + 1.5, 0, 0.2, 1.1, 0.7);
  for (const [x, z, t] of [[P.w / 2 + 0.9, 0.9, 0.2], [P.w / 2 + 1.3, -0.6, -0.25]]) {
    b.push(x, 0.35, z, t * 3, t, 0.1);
    limb(b, [0, 0, 0], [0, 1.15, 0], 0.02, c.handle, 5);
    b.box(0.2, 0.28, 0.02, c.axe, 0, -0.1, 0);
    b.pop();
  }
  for (let i = 0; i < 3; i++) b.put(new THREE.SphereGeometry(1, 7, 5).scale(0.36, 0.11, 0.25), c.lime, -P.w / 2 - 0.8, 0.1 + i * 0.17, 1.0 + (i % 2) * 0.1, i * 0.3);
  b.spot('pit', -0.3, 0, -P.d / 2 - 1.0);
  b.pop();
  // The agent who was digging it, face down over its edge, an axe in his back. (He gets up.)
  riser('mib', 'pit', P.x - 0.5, 0.04, P.z - P.d / 2 - 0.2, 0.3, (rb) => deadMan(rb, 'mib', { prone: true, arms: [2.6, 2.9], legs: [0.2, 0.05], knee: [0.3, 0] }));
  b.pushOnGround(P.x - 0.5, 0.04, P.z - P.d / 2 - 0.2, 0.3);
  blood(b, 0.5, 0.1, 0.2);
  b.push(0.04, 0.2, 0.36, 0.5, -0.55, 0);
  axe(b);
  b.pop();
  b.pop();

  // ---- the mill shed ----
  const M = S.shed;
  const ml = M.x1 - M.x0;
  const md = M.z1 - M.z0;
  const mcz = (M.z0 + M.z1) / 2;
  const my = b.heightAt((M.x0 + M.x1) / 2, mcz);
  b.push(0, my, 0);
  {
    const F = M.floor;
    b.box(ml, F, md, c.plankDark, (M.x0 + M.x1) / 2, F / 2, mcz);
    // Sawdust over everything, deepest under the saw.
    for (let i = 0; i < 16; i++) b.put(new THREE.CylinderGeometry(0.5 + b.rand() * 0.9, 0.7 + b.rand() * 0.9, 0.02, 7), i % 2 ? c.sawdust : c.sawdustDark, M.x0 + 1.5 + b.rand() * (ml - 3), F + 0.01, M.z0 + 0.6 + b.rand() * (md - 1.2));
    b.put(new THREE.ConeGeometry(0.7, 0.4, 8), c.sawdust, S.saw.x + 0.2, F + 0.2, S.saw.z - 0.5);
    // Posts, plates, rafters, the tin.
    const bays = 4;
    for (let i = 0; i <= bays; i++) {
      const x = M.x0 + (ml * i) / bays;
      for (const z of [M.z0, M.z1]) {
        b.box(0.22, M.eaves, 0.22, i % 2 ? c.post : c.postDark, x, M.eaves / 2, z);
        b.post(x, 0, z, 0.17, M.eaves);
        b.box(0.1, 0.9, 0.1, c.postDark, x + (i < bays ? 0.38 : -0.38), M.eaves - 0.4, z, 0, 0, i < bays ? -0.8 : 0.8); // a brace
      }
      b.box(0.14, 0.18, md, c.postDark, x, M.eaves - 0.2, mcz); // the tie beam
      const run = Math.hypot(md / 2 + 0.5, M.ridge - M.eaves);
      const pitch = Math.atan2(M.ridge - M.eaves, md / 2 + 0.5);
      for (const s of [-1, 1]) b.box(0.12, 0.16, run, c.post, x, (M.eaves + M.ridge) / 2, mcz + (s * (md / 2 + 0.5)) / 2, 0, s * pitch, 0);
      b.box(0.1, M.ridge - M.eaves - 0.3, 0.1, c.postDark, x, (M.eaves + M.ridge) / 2 - 0.1, mcz); // the king post
    }
    for (const z of [M.z0, M.z1]) b.box(ml + 0.3, 0.2, 0.2, c.post, (M.x0 + M.x1) / 2, M.eaves + 0.1, z);
    b.box(ml + 0.4, 0.14, 0.14, c.postDark, (M.x0 + M.x1) / 2, M.ridge, mcz);
    {
      const run = Math.hypot(md / 2 + 0.6, M.ridge - M.eaves);
      const pitch = Math.atan2(M.ridge - M.eaves, md / 2 + 0.6);
      for (const s of [-1, 1]) {
        let n = 0;
        for (let x = M.x0 - 0.3; x < M.x1 + 0.3; x += 0.92) {
          n++;
          if ((n === 5 && s > 0) || (n === 14 && s < 0)) continue; // a sheet gone
          const lifted = n === 9 && s < 0;
          b.box(0.9, 0.03, run + (lifted ? -0.3 : 0), n % 4 === 1 ? c.tinDark : c.tin, x + 0.45, (M.eaves + M.ridge) / 2 + 0.13 + (lifted ? 0.1 : 0), mcz + (s * (md / 2 + 0.6)) / 2, 0, s * pitch + (lifted ? 0.08 : 0), (b.rand() - 0.5) * 0.02);
        }
      }
    }
    // The back wall: boards from the filing room's end to the log deck, a gap where the sawdust conveyor goes out.
    for (let r = 0; r < 14; r++) {
      const y = 0.3 + r * 0.22;
      if (b.rand() > 0.08) b.box(M.x0 + 6.6 - M.x0 + 0, 0.2, 0.04, r % 3 ? c.plank : c.plankDark, (M.x0 + M.x0 + 6.6) / 2, y, M.z1 + 0.1);
      if (b.rand() > 0.12) b.box(4.0, 0.2, 0.04, r % 4 ? c.plank : c.plankDark, -1.0, y, M.z1 + 0.1);
    }
    b.wall(M.x0, M.z1, M.x0 + 6.6, M.z1, 0, 0.12, 3.2);
    b.wall(-3.0, M.z1, 1.0, M.z1, 0, 0.12, 3.2);
    // The +x end: boarded to shoulder height.
    for (let r = 0; r < 6; r++) b.box(0.04, 0.2, md, r % 3 ? c.plank : c.plankDark, M.x1 + 0.1, 0.3 + r * 0.22, mcz);
    b.wall(M.x1, M.z0, M.x1, M.z1, 0, 0.12, 1.5);

    // The carriage track: two rails on ties, the length of the shed.
    const R = S.track;
    for (const z of [R.z0, R.z1]) b.box(R.x1 - R.x0, 0.07, 0.05, c.iron, (R.x0 + R.x1) / 2, F + 0.16, z);
    for (let x = R.x0 + 0.3; x < R.x1; x += 0.9) b.box(0.16, 0.12, R.z1 - R.z0 + 0.5, c.postDark, x, F + 0.06, (R.z0 + R.z1) / 2);
    // The carriage, stopped: its frame, its bunks, the headblocks' knees, the set works' lever.
    const Cg = S.carriage;
    const cz = (R.z0 + R.z1) / 2;
    b.push(Cg.x, F, cz);
    for (const z of [-0.5, 0.5]) b.box(Cg.length, 0.16, 0.14, c.post, 0, 0.45, z);
    for (const x of [-1.6, 0, 1.6]) {
      b.box(0.22, 0.14, 1.5, c.ironDark, x, Cg.bed - 0.07, 0.05);
      b.box(0.14, 0.75, 0.16, c.iron, x, Cg.bed + 0.37, 0.52); // a knee
      b.box(0.1, 0.1, 0.3, c.ironDark, x, Cg.bed + 0.25, 0.3, 0, 0.4, 0); // its dog, bitten into the log
    }
    for (const x of [-1.8, 1.8]) for (const z of [-0.55, 0.55]) b.put(new THREE.CylinderGeometry(0.17, 0.17, 0.07, 10).rotateX(Math.PI / 2), c.ironDark, x, 0.3, z);
    limb(b, [1.95, Cg.bed, 0.55], [2.15, Cg.bed + 1.0, 0.6], 0.022, c.iron, 5);
    // The log on it, stopped a third of the way through the saw: the slab it was taking hangs off the front.
    log(b, 5.0, 0.36, -0.3, Cg.bed + 0.36, -0.05, 0, c.bark);
    const cutTo = S.saw.x - Cg.x; // the blade's place along the log
    b.box(cutTo + 2.8, 0.5, 0.015, c.plankNew, (cutTo - 2.8) / 2, Cg.bed + 0.38, -0.31); // the cut face
    b.box(cutTo + 2.8 - 0.2, 0.46, 0.06, c.bark, (cutTo - 2.8) / 2 - 0.1, Cg.bed + 0.3, -0.4, 0, 0, 0, 0); // the slab, sagging away
    b.pop();
    b.wall(Cg.x - 2.9, cz - 0.1, Cg.x + 2.3, cz - 0.1, 0, 0.7, 1.5);
    b.spot('carriage', Cg.x + 1.4, F, R.z0 - 1.1);

    // The head rig: the husk (a timber frame), the arbor in its boxes, the collar, the guide, the big pulley.
    const W = S.saw;
    b.push(W.x, F, W.z);
    for (const sx of [-0.95, 0.95]) for (const sz of [-1.25, -0.2]) b.box(0.2, 0.8, 0.2, c.post, sx, 0.4, sz);
    for (const sz of [-1.25, -0.2]) b.box(2.1, 0.18, 0.2, c.postDark, 0, 0.78, sz);
    for (const sx of [-0.95, 0.95]) b.box(0.2, 0.18, 1.25, c.postDark, sx, 0.78, -0.72);
    b.tubeZ(0.05, 0.05, -1.75, 0.06, c.iron, 0, W.y, 8, false);
    for (const sz of [-1.25, -0.2]) b.box(0.3, 0.22, 0.24, c.ironDark, 0, W.y - 0.02, sz);
    b.tubeZ(0.32, 0.32, -1.7, -1.48, c.ironDark, 0, W.y, 12, false);
    b.box(0.08, 0.5, 0.1, c.iron, -0.86, W.y + 0.3, -0.1); // the guide arm
    b.box(0.05, 0.05, 0.3, c.iron, -0.82, W.y + 0.5, 0.0);
    b.box(0.03, 1.1, 0.3, c.ironDark, 0.95, W.y + 0.6, -0.02, 0, 0, 0.1); // the splitter behind the blade
    // The sawyer's levers.
    for (const [x, t] of [[-1.5, 0.2], [-1.7, -0.15]]) limb(b, [x, 0, -1.5], [x + t * 0.5, 1.15, -1.5 - t], 0.022, c.iron, 5);
    // The saw itself (its own mesh: Tom takes it): a 60-inch plate, the collar, inserted teeth all round.
    sawB.stack = [b.m.clone()];
    sawB.put(new THREE.CylinderGeometry(W.r, W.r, 0.014, 40).rotateX(Math.PI / 2), c.blade, 0, W.y, 0);
    sawB.put(new THREE.CylinderGeometry(W.r * 0.55, W.r * 0.55, 0.018, 24).rotateX(Math.PI / 2), c.bladeDark, 0, W.y, 0);
    sawB.put(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 12).rotateX(Math.PI / 2), c.ironDark, 0, W.y, 0);
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      sawB.box(0.07, 0.05, 0.016, i % 2 ? c.blade : c.bladeDark, Math.cos(a) * (W.r + 0.015), W.y + Math.sin(a) * (W.r + 0.015), 0, 0, 0, a + 0.9);
    }
    // Dark along its lower edge: what it last cut wasn't wood.
    for (let i = 0; i < 9; i++) {
      const a = -0.5 - i * 0.24;
      sawB.box(0.16, 0.1, 0.018, c.bloodDark, Math.cos(a) * (W.r - 0.09), W.y + Math.sin(a) * (W.r - 0.09), 0, 0, 0, a);
    }
    b.pop();
    b.post(W.x, 0, W.z - 0.75, 0.95, 1.4);
    b.spot('headSaw', W.x - 0.2, F, W.z - 2.2);
    // The belt from the arbor's pulley to the power unit, and the unit on its skids.
    const E = { x: -6.6, z: W.z - 1.6 };
    b.box(W.x - E.x, 0.012, 0.16, c.belt, (W.x + E.x) / 2, W.y + 0.31, E.z, 0, 0, 0.012);
    b.box(W.x - E.x, 0.012, 0.16, c.belt, (W.x + E.x) / 2, W.y - 0.29, E.z, 0, 0, -0.03);
    b.push(E.x, F, E.z);
    for (const z of [-0.35, 0.35]) b.box(2.2, 0.14, 0.14, c.postDark, -0.5, 0.07, z);
    b.box(1.3, 0.75, 0.7, c.engine, -0.55, 0.6, 0);
    b.box(0.9, 0.2, 0.5, c.ironDark, -0.55, 1.05, 0);
    b.box(0.12, 0.8, 0.8, c.ironDark, -1.35, 0.62, 0); // the radiator
    b.tubeZ(0.36, 0.36, -0.1, 0.1, c.ironDark, 0.32, 1.0, 12, false);
    limb(b, [-0.3, 1.1, 0.2], [-0.3, M.ridge + 0.6, 0.2], 0.05, c.iron, 6); // the stack, up through the tin
    b.box(0.16, 0.1, 0.12, c.iron, -0.3, M.ridge + 0.65, 0.2);
    b.pop();
    b.post(E.x - 0.5, 0, E.z, 0.95, 1.3);
    b.spot('engine', E.x - 0.4, F, E.z - 1.5);
    // The roller bed off the saw, toward the filing room: fresh boards and the last cant on it.
    for (let x = -9.6; x < -3.4; x += 0.55) {
      b.put(new THREE.CylinderGeometry(0.07, 0.07, 0.9, 7).rotateX(Math.PI / 2), c.iron, x, F + 0.72, cz - 0.1);
    }
    for (const z of [cz - 0.58, cz + 0.38]) {
      b.box(6.4, 0.1, 0.06, c.ironDark, -6.5, F + 0.66, z);
      for (const x of [-9.4, -7.4, -5.4, -3.6]) b.box(0.07, 0.66, 0.07, c.ironDark, x, F + 0.33, z);
    }
    b.box(3.6, 0.3, 0.3, c.plankNew, -6.4, F + 0.94, cz - 0.2, 0.02);
    b.box(3.8, 0.05, 0.28, c.plankNewDark, -7.2, F + 0.82, cz + 0.18, -0.04);
    b.wall(-9.6, cz - 0.1, -3.6, cz - 0.1, 0, 0.5, 1.0);
    // The sawdust conveyor: a trough from under the saw out through the back wall and up to the pile's top.
    const Q = S.pile;
    b.push(0, 0, 0);
    {
      const a = new THREE.Vector3(W.x + 0.2, F + 0.25, W.z + 2.2);
      const e = new THREE.Vector3(Q.x + 0.8, Q.h + 0.5, Q.z - 0.8);
      const d = e.clone().sub(a);
      const yaw = Math.atan2(d.x, d.z);
      const pitch = -Math.atan2(d.y, Math.hypot(d.x, d.z));
      const mid = a.clone().add(e).multiplyScalar(0.5);
      b.push(mid.x, mid.y, mid.z, yaw, pitch, 0);
      b.box(0.5, 0.04, d.length(), c.plankDark, 0, 0, 0);
      for (const s of [-1, 1]) b.box(0.04, 0.2, d.length(), c.plank, s * 0.25, 0.1, 0);
      for (let k = -3; k <= 3; k++) b.box(0.4, 0.1, 0.03, c.ironDark, 0, 0.07, (k * d.length()) / 7);
      b.pop();
      for (const t of [0.45, 0.85]) {
        const p = a.clone().lerp(e, t);
        b.box(0.1, p.y, 0.1, c.postDark, p.x - 0.3, p.y / 2, p.z);
        b.box(0.1, p.y, 0.1, c.postDark, p.x + 0.3, p.y / 2, p.z);
      }
    }
    b.pop();
  }
  b.pop();
  // The agent on the shed floor in front of the carriage, the chainsaw stood in him. (He gets up.)
  const cs = { x: 3.1, z: 5.5, yaw: 1.9 };
  riser('mib', 'mill', cs.x, M.floor, cs.z, cs.yaw, (rb) => deadMan(rb, 'mib', { arms: [1.3, 1.7], legs: [0.35, 0.3], knee: [0.2, 0.7], head: -0.7 }));
  b.pushOnGround(cs.x, M.floor, cs.z, cs.yaw);
  blood(b, 0.75, 0, 0.3, 0.014);
  blood(b, 0.4, 0.5, 0.7, 0.014);
  chainB.stack = [b.m.clone()];
  chainB.push(0.02, 0.1, 0.34, 0.6, 0.22, -0.12);
  chainsawProp(chainB);
  chainB.pop();
  b.spot('chainsaw', 0, 0, 0.3);
  b.pop();
  // The sawyer, down at his levers. (He gets up.)
  riser('logger', 'mill', S.saw.x - 1.4, M.floor, S.saw.z - 2.3, -1.2, (rb) => deadMan(rb, 'logger', { shirt: c.flannelMustard, trousers: c.workBrown, arms: [0.9, 2.4], legs: [0.05, 0.4], knee: [0.5, 0.2], head: 1.0, grey: true, hat: [-0.5, 0.9] }));
  b.pushOnGround(S.saw.x - 1.4, M.floor, S.saw.z - 2.3, -1.2);
  blood(b, 0.6, 0.1, 0.35, 0.014);
  b.pop();

  // ---- the log deck behind the shed, and what rolled off it ----
  const D = S.deck;
  b.pushOnGround((D.x0 + D.x1) / 2, 0, (D.z0 + D.z1) / 2);
  {
    const len = D.z1 - D.z0;
    const pitch = Math.atan2(D.high - D.low, len);
    for (const x of [-1.7, 1.7]) {
      b.box(0.24, 0.24, len + 0.2, c.post, x, (D.low + D.high) / 2 - 0.12, 0, 0, -pitch, 0);
      for (const z of [-len / 2 + 0.3, 0, len / 2 - 0.3]) {
        const h = (D.low + D.high) / 2 + (z / len) * (D.high - D.low) - 0.24;
        b.box(0.5, h, 0.5, c.postDark, x, h / 2, z);
      }
    }
    let z = -len / 2 + 1.5;
    for (let i = 0; i < 4; i++) {
      const r = 0.27 + b.rand() * 0.09;
      z += r;
      log(b, 4.4 + b.rand() * 0.5, r, (b.rand() - 0.5) * 0.3, (D.low + D.high) / 2 + (z / len) * (D.high - D.low) + r, z, (b.rand() - 0.5) * 0.05);
      z += r + 0.03;
    }
    b.spot('deck', -3.4, 0, 0.8);
    b.wall(0, -len / 2 + 0.6, 0, len / 2 - 0.2, 0, 2.3, 1.7);
  }
  b.pop();
  // The logger who knocked the chocks out, dead across the top logs. (He gets up.)
  riser('logger', 'mill', 4.3, D.high + 0.62, 12.6, 1.5, (rb) => deadMan(rb, 'logger', { prone: true, shirt: c.flannelRed, trousers: c.denim, arms: [2.2, 0.7], legs: [0.3, 0.2], knee: [0.3, 0.4] }), [0.1, 0]);
  // The logs he let go, down across the shed's back corner, and the man in the suit under them.
  b.pushOnGround(5.2, M.floor, 8.75);
  log(b, 4.6, 0.33, 0, 0.33, 0.1, 0.06);
  log(b, 4.3, 0.3, 0.3, 0.3, -0.55, -0.1);
  log(b, 4.5, 0.31, 0.2, 0.86, -0.2, 0.2);
  // His arm and head out from under, toward the shed's end; a shoe on its own.
  b.push(2.45, 0, -0.25, Math.PI / 2 + 0.2);
  b.box(0.38, 0.16, 0.3, c.suit, 0, 0.08, -0.1);
  b.put(new THREE.SphereGeometry(0.11, 7, 5), c.skin, 0.02, 0.1, 0.2);
  b.put(new THREE.SphereGeometry(0.115, 7, 4, 0, Math.PI * 2, 0, Math.PI * 0.5).rotateX(-1.2), c.hair, 0.02, 0.105, 0.21);
  limb(b, [0.2, 0.08, 0], [0.5, 0.05, 0.2], 0.05, c.suit, 5);
  limb(b, [0.5, 0.05, 0.2], [0.52, 0.04, 0.48], 0.042, c.suit, 5);
  b.put(new THREE.SphereGeometry(0.045, 5, 4), c.skin, 0.52, 0.045, 0.52);
  blood(b, 0.5, 0.1, 0.2, 0.014);
  b.pop();
  b.box(0.1, 0.1, 0.26, c.shoe, -1.2, 0.05, -1.2, 0.8);
  b.spot('pinned', 3.3, 0, -0.1);
  b.wall(-2.2, -0.2, 2.2, -0.2, 0, 0.7, 1.2);
  b.pop();
  // The decked pile out the back: three, two, one.
  b.pushOnGround(10.5, 0, 13.5, 0.3);
  for (const [x, y, n] of [[0, 0.3, 3], [0, 0.82, 2], [0, 1.34, 1]]) for (let i = 0; i < n; i++) log(b, 5 + b.rand() * 0.4, 0.3, 0, y, (i - (n - 1) / 2) * 0.62 + x, (b.rand() - 0.5) * 0.03);
  b.wall(-2.5, 0, 2.5, 0, 0, 1.0, 1.6);
  b.pop();

  // ---- the sawdust pile ----
  const Q = S.pile;
  b.pushOnGround(Q.x, 0, Q.z);
  b.put(new THREE.ConeGeometry(Q.r, Q.h, 14, 3), c.sawdust, 0, Q.h / 2, 0);
  b.put(new THREE.ConeGeometry(Q.r * 0.7, Q.h * 0.55, 10, 2), c.sawdustDark, -1.6, Q.h * 0.27, 1.1);
  b.put(new THREE.ConeGeometry(Q.r * 0.45, Q.h * 0.35, 8, 1), c.sawdust, 1.9, Q.h * 0.17, -0.9);
  b.post(0, 0, 0, Q.r * 0.75, Q.h);
  b.pop();

  // ---- the filing room on the shed's end: the saw filer's bench, the foreman's desk ----
  const G = S.filing;
  const gcx = (G.x0 + G.x1) / 2;
  const gcz = (G.z0 + G.z1) / 2;
  b.pushOnGround(gcx, 0, gcz);
  {
    const hx = (G.x1 - G.x0) / 2;
    const hz = (G.z1 - G.z0) / 2;
    b.box(hx * 2, 0.06, hz * 2, c.plankDark, 0, 0.03, 0);
    // The back and the outer side boarded; the front open under a lean-to roof.
    for (let r = 0; r < 12; r++) {
      const y = 0.2 + r * 0.22;
      b.box(hx * 2, 0.2, 0.04, r % 3 ? c.plank : c.plankDark, 0, y, hz);
      b.box(0.04, 0.2, hz * 2, r % 4 ? c.plank : c.plankDark, -hx, y, 0);
    }
    for (const z of [-hz, hz]) b.box(0.16, 2.5, 0.16, c.post, -hx, 1.25, z);
    b.box(hx * 2 + 0.5, 0.03, hz * 2 + 0.5, c.tin, 0, 2.85, 0, 0, 0, -0.14);
    for (const z of [-hz, 0, hz]) b.box(hx * 2 + 0.3, 0.1, 0.08, c.postDark, 0, 2.76, z, 0, 0, -0.14);
    b.wall(-hx, hz, hx, hz, 0, 0.1, 2.6);
    b.wall(-hx, -hz, -hx, hz, 0, 0.1, 2.6);
    // The filer's bench along the back: a vise with a band of teeth in it, files, an oil can; a spare blade hung above.
    b.box(hx * 2 - 0.4, 0.08, 0.7, c.plank, 0.1, 0.9, hz - 0.42);
    for (const x of [-hx + 0.4, hx - 0.2]) for (const z of [hz - 0.7, hz - 0.14]) b.box(0.1, 0.88, 0.1, c.postDark, x, 0.44, z);
    b.box(0.22, 0.2, 0.26, c.ironDark, 0.9, 1.04, hz - 0.62);
    b.box(0.5, 0.12, 0.012, c.blade, 0.9, 1.2, hz - 0.62);
    for (let i = 0; i < 4; i++) b.box(0.025, 0.012, 0.3, c.iron, -0.3 + i * 0.12, 0.95, hz - 0.45, (b.rand() - 0.5) * 0.5);
    b.put(new THREE.ConeGeometry(0.06, 0.16, 6), c.tin, -0.9, 1.02, hz - 0.3);
    b.put(new THREE.CylinderGeometry(0.55, 0.55, 0.012, 24).rotateX(Math.PI / 2), c.bladeDark, -0.4, 1.95, hz - 0.06);
    b.put(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 8).rotateX(Math.PI / 2), c.ironDark, -0.4, 1.95, hz - 0.07);
    b.wall(-hx + 0.3, hz - 0.42, hx - 0.1, hz - 0.42, 0, 0.36, 1.0);
    // The foreman's desk against the outer wall: the time cards in their rack over it, a mug, the lamp; the day book.
    b.push(-hx + 0.45, 0.06, -0.9, Math.PI / 2);
    b.box(1.3, 0.05, 0.7, c.plank, 0, 0.76, 0);
    for (const x of [-0.45, 0.45]) b.box(0.36, 0.7, 0.62, c.plankDark, x, 0.38, 0);
    b.box(0.5, 0.6, 0.04, c.plankDark, 0, 1.55, 0.3);
    for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) if (b.rand() < 0.8) b.box(0.08, 0.11, 0.012, c.paper, -0.18 + k * 0.12, 1.34 + r * 0.14, 0.27);
    b.put(new THREE.CylinderGeometry(0.04, 0.035, 0.09, 6), c.tin, 0.48, 0.83, 0.1);
    b.box(0.3, 0.012, 0.22, c.paper, -0.35, 0.79, -0.1, 0.3); // a requisition, unsigned
    diaryB.stack = [b.m.clone()];
    diaryB.box(0.17, 0.035, 0.24, c.case, 0.08, 0.805, -0.08, -0.2);
    diaryB.box(0.16, 0.01, 0.23, c.paper, 0.08, 0.81, -0.08, -0.2);
    b.pop();
    b.post(-hx + 0.45, 0, -0.9, 0.6, 0.9);
    // His chair, on its side.
    b.push(-0.2, 0.26, -1.2, 0.9, 1.5, 0);
    b.box(0.4, 0.04, 0.4, c.plank, 0, 0.44, 0);
    b.box(0.4, 0.5, 0.04, c.plankDark, 0, 0.7, 0.19);
    for (const sx of [-0.17, 0.17]) for (const sz of [-0.17, 0.17]) b.box(0.04, 0.44, 0.04, c.postDark, sx, 0.22, sz);
    b.pop();
    b.spot('desk', -hx + 1.35, 0, -0.9);
    b.spot('bench', 0.3, 0, hz - 1.3);
  }
  b.pop();

  // ---- bake ----
  const baseAt = (x, y, z) => b.heightAt(x, z);
  const geometry = bakeParts(b.parts, { weather, baseAt, seed: 28 });
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const group = new THREE.Group();
  group.name = 'sawmill';
  group.add(mesh);
  const small = (builder, name) => {
    const m = new THREE.Mesh(bakeParts(builder.parts, { weather, seed: 28 }), material);
    m.name = name;
    m.castShadow = true;
    group.add(m);
    return m;
  };
  const parts = { headSaw: small(sawB, 'headSaw'), chainsaw: small(chainB, 'chainsawInHim'), smg: small(smgB, 'smg'), diary: small(diaryB, 'dayBook') };
  // The dead who get up: one mesh, each body a run of its vertices.
  let start = 0;
  const geos = riserBuilders.map((rb, i) => {
    const g = bakeParts(rb.parts, { weather, seed: 29 + i });
    risers[i].start = start;
    risers[i].count = g.getAttribute('position').count;
    start += risers[i].count;
    return g;
  });
  const riserGeo = mergeGeometries(geos);
  for (const g of geos) g.dispose();
  const laid = riserGeo.getAttribute('position').array.slice();
  const riserMesh = new THREE.Mesh(riserGeo, material);
  riserMesh.name = 'sawmillDead';
  riserMesh.castShadow = true;
  riserMesh.frustumCulled = false; // its bodies are all over the yard, and some fold away
  group.add(riserMesh);
  parts.risers = riserMesh;
  const fold = (i, away) => {
    const r = risers[i];
    if (!r || r.away === away) return;
    r.away = away;
    const pos = riserGeo.getAttribute('position');
    const a = pos.array;
    for (let k = r.start * 3; k < (r.start + r.count) * 3; k++) a[k] = away ? 0 : laid[k];
    pos.needsUpdate = true;
  };
  return {
    group,
    mesh,
    parts,
    spots: b.spots,
    colliders: b.colliders,
    risers,
    hideRiser: (i) => fold(i, true),
    showRisers: () => risers.forEach((_, i) => fold(i, false)),
    dispose() {
      group.removeFromParent();
      for (const m of [mesh, ...Object.values(parts)]) m.geometry.dispose();
      material.dispose();
    },
  };
}
