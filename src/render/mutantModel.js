// The mutant's model (Session 13; DESIGN.md "Mutants (3D)"): a 2.5 m
// giant that was once a man. Hunched, a small head sunk between hulking
// shoulders, the jaw hanging slack; its right arm swollen into a club with
// bone spurs, the left long and wasted, a small bony fist; a hump of tumours
// on its back with the weak spot, a raw sac, nested in it; torn jeans and a
// strip of shirt from its old life.
//
// Round 2 (the polish pass; Aaron: "improve the model of the mutant"): more of what it was and what it's
// becoming, all of it readable in silhouette and by torch: a ridge of bone spurs breaking out along its
// spine and over the hump; the wasted side's ribs showing through split skin; a jaw that's grown too long,
// hanging crooked, with a row of teeth; a tumour swelling one side of its skull shut over the eye; a small
// dead arm, the start of a third, hanging under the wasted one; his belt still on him with its buckle, and
// the shirt's tails hanging from it in strips; one work boot left, the other foot bare and clawed.
//
// Nov 26 (Aaron's concept art again, close up: "use this one as a frame of reference"): rebuilt to it. A
// man's muscled body, not a pot belly: a broad V of a trunk, a pec, a six-pack, traps sloping up into its
// skull; its chest torn open over the left ribs (the meat dented in behind bare ribs, a torn, bloody rim);
// a skull's face under a swollen, lobed cranium: deep sockets with small pale eyes, a hole for a nose, a
// lipless snarl with both rows of teeth, horns; the club side swallowed by a tumorous growth over the
// shoulder (a blind eye in it, a crown of spurs) down a swollen, spurred forearm to the club; the left arm
// a man's, the hand open; full-length jeans, ragged at the hem and torn open over a bloody right knee; a bare
// foot with toes. Kept (Aaron): the dead third arm, the skull's tumour, the work boot, the belt and the
// shirt's rags (its strip now crosses from the club shoulder to the other hip, under the wound). The back
// (the hump, the weak spot's sac, the spine's spurs) is as it was: the gameplay's.
//
// Built at load from simple shapes (ellipsoid masses, tapered tubes along
// the limbs, spurs), made lumpy with noise, skinned to a small skeleton so
// the flesh bends at the joints, and painted with vertex colours (mottled
// skin, raw patches, darker underneath). One mesh, one draw call per
// mutant; the weak spot and the eyes glow through an attribute (aGlow: x
// the spot, which throbs, y the eyes).
//
// Model space: faces +z, feet at y = 0, its right hand on -x. The weak
// spot sits where its hit sphere is (config.mutant.weakSpot: back, height),
// and the head inside the head's hit cylinder (headBottom to height).

import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// The skeleton: [name, parent, x, y, z] (model space, the rest pose).
export const JOINTS = [
  ['root', null, 0, 0, 0],
  ['hips', 'root', 0, 1.02, -0.02],
  ['spine', 'hips', 0, 1.32, 0],
  ['chest', 'spine', 0, 1.66, 0.08],
  ['neck', 'chest', 0, 1.94, 0.18],
  ['head', 'neck', 0, 2.06, 0.2],
  ['shoulderR', 'chest', -0.58, 1.92, 0.04],
  ['elbowR', 'shoulderR', -0.8, 1.3, 0.16],
  ['wristR', 'elbowR', -0.86, 0.74, 0.26],
  ['shoulderL', 'chest', 0.48, 1.88, 0.06],
  ['elbowL', 'shoulderL', 0.62, 1.3, 0.14],
  ['wristL', 'elbowL', 0.66, 0.82, 0.22],
  ['hipR', 'hips', -0.24, 0.98, -0.02],
  ['kneeR', 'hipR', -0.27, 0.52, 0.08],
  ['ankleR', 'kneeR', -0.27, 0.09, -0.03],
  ['hipL', 'hips', 0.24, 0.98, -0.02],
  ['kneeL', 'hipL', 0.27, 0.52, 0.08],
  ['ankleL', 'kneeL', 0.27, 0.09, -0.03],
];

const JOINT = Object.fromEntries(JOINTS.map(([name, parent, x, y, z], i) => [name, { i, parent, p: new THREE.Vector3(x, y, z) }]));

// ---- the shapes (Nov 26: Aaron's concept art, close up) -------------------------------------------------

// The body's main masses (model space): the ribcage, the belly, the head's face. Shared by the build, the
// ribs and the tests, so the muscles, wound and features sit on their surfaces.
export const BODY = {
  chest: { x: 0, y: 1.7, z: 0.08, rx: 0.4, ry: 0.32, rz: 0.245 },
  belly: { x: 0, y: 1.36, z: 0.05, rx: 0.3, ry: 0.3, rz: 0.22 },
  face: { x: 0, y: 2.2, z: 0.28, rx: 0.11, ry: 0.11, rz: 0.1 },
};

// z on an ellipsoid's front at (x, y), plus `lift` (its centre's z if (x, y) is off it).
function frontOf(e, x, y, lift = 0) {
  const k = 1 - ((x - e.x) / e.rx) ** 2 - ((y - e.y) / e.ry) ** 2;
  return e.z + e.rz * Math.sqrt(Math.max(0, k)) + lift;
}

// The chest wound: torn open over its left ribs, from the breastbone round toward its side. In the ribcage's
// own terms: how far round from the front (radians toward its left) and how high. Pure (the tests).
export const WOUND = { a: 0.5, halfA: 0.62, y: 1.72, halfY: 0.25 };
// 0 at the wound's middle, 1 at its torn edge, more outside (noisy, so the edge is ragged).
export function woundAt(p) {
  const c = BODY.chest;
  if (p.z < c.z) return 9;
  const a = Math.atan2(p.x - c.x, p.z - c.z);
  const e = ((a - WOUND.a) / WOUND.halfA) ** 2 + ((p.y - WOUND.y) / WOUND.halfY) ** 2;
  return Math.sqrt(e) + (noise3(p.x * 13 + 1, p.y * 13, p.z * 13) - 0.5) * 0.35;
}

// Masses: [bone, other bone (shares half) or null, x, y, z, rx, ry, rz, paint, lumps (metres), glow,
// opts (optional: { seg: [width, height] segments, wound: the ribcage (painted and dented by the wound),
// band: the shirt's strip may cross it })] (an ellipsoid). Paints are keys of the look; glow 'sac' is the
// weak spot's, 'veins' its veins running into the hump.
function masses() {
  const { chest, belly, face } = BODY;
  const m = [
    // Jeans: the seat, its top at the belt.
    ['hips', null, 0, 1.02, -0.02, 0.33, 0.2, 0.25, 'jeans', 0.012, null],
    // A muscled trunk, a V: broad ribcage, a narrower waist (no belly).
    ['spine', 'hips', belly.x, belly.y, belly.z, belly.rx, belly.ry, belly.rz, 'skin', 0.01, null, { seg: [22, 14], band: true }],
    ['chest', 'spine', chest.x, chest.y, chest.z, chest.rx, chest.ry, chest.rz, 'skin', 0.01, null, { seg: [36, 26], wound: true, band: true }],
    // Lats and obliques down its flanks.
    ['chest', 'spine', -0.3, 1.5, 0.04, 0.12, 0.2, 0.16, 'skin', 0.01, null, { band: true }],
    ['chest', 'spine', 0.3, 1.5, 0.04, 0.12, 0.2, 0.16, 'skin', 0.01, null],
    // Its right pec, whole (the left's torn away: the wound).
    ['chest', null, -0.17, 1.8, frontOf(chest, -0.17, 1.8, -0.036), 0.18, 0.09, 0.046, 'skin', 0.006, null, { band: true }],
    ['chest', null, 0.2, 1.97, frontOf(chest, 0.2, 1.97, -0.04), 0.14, 0.05, 0.06, 'skin', 0.008, null], // a flap of the left one, over the wound
    // The traps, huge, sloping up from the shoulders into the back of its skull.
    ['chest', 'neck', -0.2, 2.02, 0.03, 0.2, 0.14, 0.17, 'skin', 0.015, null, { band: true }],
    ['chest', 'neck', 0.2, 2.02, 0.03, 0.2, 0.14, 0.17, 'skin', 0.015, null],
    ['neck', 'chest', 0, 1.98, 0.1, 0.13, 0.11, 0.13, 'skin', 0.01, null],
    // Hulking shoulders: the club side's swallowed by a tumorous growth, a blind eye in it.
    ['chest', 'shoulderR', -0.5, 2.02, 0.03, 0.3, 0.28, 0.28, 'growth', 0.07, null],
    ['chest', null, -0.36, 2.2, -0.02, 0.15, 0.13, 0.15, 'growth', 0.035, null],
    ['shoulderR', null, -0.68, 1.8, 0.08, 0.18, 0.2, 0.18, 'growth', 0.04, null],
    ['chest', 'shoulderR', -0.47, 2.0, 0.3, 0.055, 0.055, 0.05, 'eyeball', 0, null, { seg: [12, 8] }],
    ['chest', 'shoulderR', -0.465, 2.0, 0.348, 0.022, 0.022, 0.012, 'mouth', 0, null, { seg: [8, 6] }],
    ['chest', 'shoulderL', 0.46, 1.9, 0.06, 0.14, 0.14, 0.14, 'skin', 0.012, null], // the left: a deltoid
    // The hump and its tumours.
    ['chest', null, 0.04, 1.98, -0.22, 0.44, 0.36, 0.3, 'skinDark', 0.05, 'veins'],
    ['chest', null, -0.22, 2.12, -0.24, 0.17, 0.15, 0.16, 'raw', 0.03, 'veins'],
    ['chest', null, 0.28, 2.06, -0.24, 0.15, 0.14, 0.14, 'skinDark', 0.03, 'veins'],
    ['chest', null, 0.1, 1.68, -0.36, 0.14, 0.12, 0.12, 'raw', 0.02, 'veins'],
    ['chest', 'neck', -0.1, 2.16, -0.06, 0.13, 0.12, 0.13, 'skinDark', 0.02, null],
    // The weak spot: a raw sac bulging from the hump, glowing hottest at its middle.
    ['chest', null, 0, 1.86, -0.53, 0.13, 0.13, 0.08, 'sac', 0.012, 'sac'],
    // The head: a skull's face under a swollen, lobed cranium.
    ['head', null, 0, 2.31, 0.18, 0.155, 0.13, 0.165, 'skin', 0.018, null],
    ['head', null, -0.07, 2.375, 0.2, 0.1, 0.065, 0.11, 'skin', 0.015, null],
    ['head', null, 0.08, 2.372, 0.18, 0.1, 0.065, 0.11, 'skin', 0.015, null],
    ['head', null, 0, 2.38, 0.08, 0.11, 0.06, 0.1, 'skin', 0.015, null],
    ['head', null, 0, 2.355, 0.285, 0.11, 0.06, 0.07, 'skin', 0.012, null], // the forehead bulging over its brow
    ['head', null, face.x, face.y, face.z, face.rx, face.ry, face.rz, 'skin', 0.006, null],
    ['head', null, -0.075, 2.235, 0.33, 0.045, 0.035, 0.045, 'skin', 0.004, null, { seg: [10, 8] }], // cheekbones
    ['head', null, 0.075, 2.235, 0.33, 0.045, 0.035, 0.045, 'skin', 0.004, null, { seg: [10, 8] }],
    ['head', null, 0, 2.302, 0.35, 0.088, 0.02, 0.035, 'skin', 0.004, null, { seg: [12, 6] }], // the brow ridge
    ['head', null, -0.05, 2.265, 0.368, 0.034, 0.026, 0.02, 'mouth', 0, null, { seg: [10, 8] }], // the sockets
    ['head', null, 0.05, 2.265, 0.368, 0.034, 0.026, 0.02, 'mouth', 0, null, { seg: [10, 8] }],
    ['head', null, 0, 2.215, 0.383, 0.017, 0.024, 0.012, 'mouth', 0, null, { seg: [8, 6] }], // no nose: the hole
    ['head', null, 0, 2.115, 0.29, 0.095, 0.05, 0.085, 'skin', 0.005, null], // the jaw
    ['head', null, 0, 2.098, 0.345, 0.045, 0.03, 0.03, 'skin', 0.004, null, { seg: [10, 8] }], // the chin
    ['head', null, 0, 2.148, 0.372, 0.056, 0.03, 0.022, 'mouth', 0, null, { seg: [12, 8] }], // the snarl, lipless...
    ['head', null, 0, 2.176, 0.374, 0.06, 0.01, 0.02, 'raw', 0, null, { seg: [12, 6] }], // ...its gums bared
    ['head', null, 0, 2.121, 0.369, 0.056, 0.01, 0.02, 'raw', 0, null, { seg: [12, 6] }],
    // Round 2, kept (Aaron, Nov 26): a tumour swelling the club side of its skull.
    ['head', null, -0.135, 2.33, 0.16, 0.085, 0.09, 0.09, 'raw', 0.02, null],
    ['head', null, -0.165, 2.265, 0.23, 0.05, 0.05, 0.05, 'skinDark', 0.012, null, { seg: [10, 8] }],
    // His belt, still on him, and its buckle; the shirt's tails hanging from it in strips (kept).
    ['hips', null, 0, 1.13, -0.02, 0.29, 0.04, 0.225, 'belt', 0.004, null],
    ['hips', null, 0.02, 1.13, 0.205, 0.045, 0.036, 0.02, 'buckle', 0, null, { seg: [8, 6] }],
    ['hips', null, -0.3, 0.93, 0.1, 0.02, 0.16, 0.07, 'shirt', 0.012, null],
    ['hips', null, 0.24, 0.98, 0.15, 0.05, 0.12, 0.02, 'shirt', 0.01, null],
    ['hips', null, 0.3, 0.9, -0.14, 0.06, 0.19, 0.02, 'shirt', 0.012, null],
    ['hips', null, -0.1, 0.95, -0.25, 0.08, 0.15, 0.02, 'shirt', 0.012, null],
    // The small dead arm under the left one: the start of a third (kept). Its hand.
    ['chest', null, 0.5, 1.5, 0.2, 0.035, 0.04, 0.04, 'skinDark', 0.006, null, { seg: [8, 6] }],
    // Tumours swelling the club's forearm.
  ['elbowR', null, -1.08, 1.1, 0.14, 0.11, 0.13, 0.11, 'growth', 0.04, null, { seg: [12, 8] }],
  ['elbowR', null, -1.1, 0.88, 0.3, 0.1, 0.12, 0.1, 'growth', 0.04, null, { seg: [12, 8] }],
  ['elbowR', null, -0.86, 0.96, 0.45, 0.1, 0.11, 0.09, 'growth', 0.035, null, { seg: [12, 8] }],
  ['elbowR', null, -0.96, 1.22, -0.06, 0.1, 0.1, 0.1, 'growth', 0.035, null, { seg: [12, 8] }],
  ['elbowR', null, -0.62, 1.02, 0.3, 0.08, 0.1, 0.09, 'growth', 0.03, null, { seg: [12, 8] }],
  // Nodules crusting the shoulder's growth.
  ['chest', 'shoulderR', -0.72, 2.12, 0.12, 0.08, 0.07, 0.08, 'growth', 0.025, null, { seg: [10, 8] }],
  ['chest', 'shoulderR', -0.6, 2.22, 0.18, 0.07, 0.06, 0.07, 'growth', 0.02, null, { seg: [10, 8] }],
  ['chest', 'shoulderR', -0.32, 2.12, 0.24, 0.07, 0.06, 0.07, 'growth', 0.02, null, { seg: [10, 8] }],
  ['chest', 'shoulderR', -0.75, 1.92, 0.24, 0.08, 0.08, 0.07, 'growth', 0.025, null, { seg: [10, 8] }],
  // The club: a swollen fist, its knuckles forward.
    ['wristR', null, -0.88, 0.5, 0.3, 0.24, 0.22, 0.25, 'growth', 0.045, null],
    ['wristR', null, -0.78, 0.44, 0.48, 0.075, 0.07, 0.075, 'growth', 0.01, null, { seg: [10, 8] }],
    ['wristR', null, -0.86, 0.42, 0.5, 0.08, 0.075, 0.08, 'growth', 0.01, null, { seg: [10, 8] }],
    ['wristR', null, -0.94, 0.43, 0.48, 0.075, 0.07, 0.075, 'growth', 0.01, null, { seg: [10, 8] }],
    ['wristR', null, -1.0, 0.46, 0.42, 0.065, 0.06, 0.065, 'growth', 0.01, null, { seg: [10, 8] }],
    // The left hand: a man's, open, hanging (its fingers are tubes, below).
    ['wristL', null, 0.672, 0.73, 0.25, 0.04, 0.075, 0.062, 'skin', 0.005, null, { seg: [10, 8] }],
    // The right foot bare, a man's, its toes.
    ['ankleR', null, -0.27, 0.055, 0.09, 0.105, 0.06, 0.18, 'skin', 0.01, null],
    // The left: one work boot left on it, its sole and its toe cap (kept).
    ['ankleL', null, 0.27, 0.075, 0.08, 0.125, 0.085, 0.215, 'boot', 0.01, null],
    ['ankleL', null, 0.27, 0.025, 0.09, 0.13, 0.03, 0.225, 'belt', 0, null, { seg: [14, 6] }],
    ['ankleL', null, 0.27, 0.19, 0.0, 0.11, 0.1, 0.12, 'boot', 0.01, null],
  ];
  // The abs: three rows of two, on the belly's front.
  for (const y of [1.47, 1.35, 1.23]) {
    for (const s of [-1, 1]) {
      const x = s * 0.075;
      m.push(['spine', null, x, y, frontOf(belly, x, y, -0.022), 0.066, 0.05, 0.028, 'skin', 0.003, null, { seg: [10, 8], band: true }]);
    }
  }
  for (let i = 0; i < 5; i++) {
    const x = -0.32 + i * 0.025;
    m.push(['ankleR', null, x, 0.035, 0.255 - Math.abs(i - 2) * 0.012, 0.022 - (i === 0 ? 0 : 0.004), 0.02, 0.026, 'skin', 0.003, null, { seg: [8, 6] }]);
  }
  return m;
}
const MASSES = masses();

// Eyes: small and pale, deep in their sockets, a steady glow (aGlow.y).
const EYES = [
  [-0.05, 2.262, 0.376],
  [0.05, 2.262, 0.376],
];

// Limbs: [from joint, to joint, radius at from, radius at to, paint,
// lumps, bulge] (a tapered tube on the from joint's bone, bending in from
// its parent's; bulge: how much fatter it swells midway, a muscle).
const LIMBS = [
  ['shoulderR', 'elbowR', 0.22, 0.19, 'skin', 0.04, 0.3],
  ['elbowR', 'wristR', 0.2, 0.24, 'growth', 0.07, 0.3],
  ['shoulderL', 'elbowL', 0.12, 0.095, 'skin', 0.012, 0.25],
  ['elbowL', 'wristL', 0.092, 0.065, 'skin', 0.01, 0.22],
  ['hipR', 'kneeR', 0.18, 0.15, 'jeans', 0.015, 0.12],
  ['kneeR', 'ankleR', 0.145, 0.12, 'shin', 0.015, 0.08],
  ['hipL', 'kneeL', 0.18, 0.15, 'jeans', 0.015, 0.12],
  ['kneeL', 'ankleL', 0.145, 0.12, 'shin', 0.015, 0.08],
];

// Growths skinned to one bone (no joint of their own): [bone, from x, y, z, to x, y, z, radius at from, at
// to, paint, lumps]: the dead third arm, upper and fore (kept); the left hand's fingers and thumb.
const GROWTHS = [
  ['chest', 0.4, 1.62, 0.12, 0.47, 1.52, 0.17, 0.045, 0.032, 'skinDark', 0.008],
  ['chest', 0.47, 1.52, 0.17, 0.5, 1.5, 0.2, 0.032, 0.022, 'skin', 0.006],
  ...[0.205, 0.233, 0.261, 0.288].map((z, i) => ['wristL', 0.668, 0.675, z, 0.655, i === 0 || i === 3 ? 0.56 : 0.535, z + 0.03, 0.019, 0.013, 'skin', 0]),
  ['wristL', 0.655, 0.74, 0.3, 0.64, 0.665, 0.335, 0.019, 0.013, 'skin', 0],
];

// A spur breaking out of an ellipsoid's surface (centre c, radii r) along direction d: [bone, base, tip, radius].
function spurOut(bone, c, r, d, len, rad) {
  const n = Math.hypot(...d);
  const [dx, dy, dz] = d.map((v) => v / n);
  // Where a ray from the centre along d leaves the ellipsoid.
  const t = 1 / Math.sqrt((dx / r[0]) ** 2 + (dy / r[1]) ** 2 + (dz / r[2]) ** 2);
  const b = [c[0] + dx * t * 0.9, c[1] + dy * t * 0.9, c[2] + dz * t * 0.9];
  return [bone, ...b, b[0] + dx * len, b[1] + dy * len, b[2] + dz * len, rad];
}
// A spur out of a limb at `t` of the way from joint a to joint b, round its side along d.
function spurLimb(bone, a, b, t, radius, d, len, rad) {
  const A = JOINT[a].p;
  const B = JOINT[b].p;
  const c = [A.x + (B.x - A.x) * t, A.y + (B.y - A.y) * t, A.z + (B.z - A.z) * t];
  return spurOut(bone, c, [radius, radius, radius], d, len, rad);
}

// Bone spurs: [bone, base x, y, z, tip x, y, z, radius].
const GROWTH = [-0.5, 2.02, 0.03];
const GROWTH_R = [0.3, 0.28, 0.28];
const SPURS = [
  // Nov 26 (the art): a crown of them out of the club side's growth, up, out and back.
  ...[
    [[-0.2, 1, 0.15], 0.24, 0.042],
    [[-0.6, 0.8, 0.25], 0.22, 0.04],
    [[-1, 0.35, 0.3], 0.22, 0.04],
    [[-0.9, 0.45, -0.4], 0.2, 0.038],
    [[0.15, 0.95, -0.35], 0.2, 0.036],
    [[-0.45, 0.4, 0.8], 0.16, 0.034],
    [[-1, -0.15, 0.25], 0.18, 0.036],
    [[-0.5, 0.9, -0.2], 0.2, 0.038],
  ].map(([d, len, rad]) => spurOut('chest', GROWTH, GROWTH_R, d, len, rad)),
  // Out of the club arm: the upper arm, the elbow, the forearm and the fist.
  spurLimb('shoulderR', 'shoulderR', 'elbowR', 0.4, 0.24, [-1, 0.1, 0.2], 0.16, 0.034),
  spurLimb('shoulderR', 'shoulderR', 'elbowR', 0.75, 0.24, [-0.8, 0, -0.6], 0.14, 0.03),
  spurLimb('elbowR', 'elbowR', 'wristR', 0.15, 0.24, [-1, 0.2, -0.2], 0.18, 0.036),
  spurLimb('elbowR', 'elbowR', 'wristR', 0.35, 0.26, [-0.7, 0.1, 0.7], 0.16, 0.034),
  spurLimb('elbowR', 'elbowR', 'wristR', 0.55, 0.27, [-1, -0.1, 0.1], 0.2, 0.038),
  spurLimb('elbowR', 'elbowR', 'wristR', 0.7, 0.27, [0.2, 0, 1], 0.14, 0.03),
  spurLimb('elbowR', 'elbowR', 'wristR', 0.8, 0.28, [-0.6, 0.1, -0.8], 0.15, 0.032),
  ...[
    [[-1, 0.2, 0.1], 0.2, 0.042],
    [[-0.5, -0.3, 0.8], 0.16, 0.036],
    [[-0.6, -0.8, 0.1], 0.18, 0.036],
    [[0.2, -0.6, 0.7], 0.14, 0.032],
    [[-0.8, 0.3, -0.5], 0.16, 0.034],
  ].map(([d, len, rad]) => spurOut('wristR', [-0.88, 0.5, 0.3], [0.24, 0.22, 0.25], d, len, rad)),
  // Round 2: a ridge of them breaking out along the spine and over the hump, crooked, the tallest at its top.
  ['spine', 0.02, 1.36, -0.24, 0.03, 1.4, -0.42, 0.03],
  ['chest', -0.03, 1.62, -0.3, -0.06, 1.66, -0.5, 0.034],
  ['chest', 0.16, 2.12, -0.42, 0.24, 2.3, -0.6, 0.04],
  ['chest', -0.1, 2.26, -0.36, -0.16, 2.52, -0.5, 0.045],
  ['chest', 0.08, 2.3, -0.16, 0.12, 2.56, -0.2, 0.04],
  ['chest', 0.34, 2.14, -0.16, 0.48, 2.3, -0.2, 0.03],
  // Horns out of the top of its skull.
  ['head', -0.06, 2.44, 0.15, -0.1, 2.62, 0.1, 0.032],
  ['head', 0.07, 2.44, 0.14, 0.11, 2.6, 0.1, 0.03],
  ['head', 0.0, 2.45, 0.04, 0.01, 2.58, -0.04, 0.026],
  // The dead arm's three fingers (kept).
  ['chest', 0.5, 1.49, 0.22, 0.5, 1.43, 0.27, 0.01],
  ['chest', 0.52, 1.49, 0.21, 0.54, 1.44, 0.25, 0.01],
  ['chest', 0.48, 1.49, 0.21, 0.47, 1.44, 0.26, 0.009],
];

// The ribs, bare in the wound: bars of bone across it, curving round its left side and sloping down toward
// the back, at these heights; the meat behind them dented in. And its teeth: [x, length], a row along the top
// of the snarl (down) and along the bottom (up).
const RIBS = [1.92, 1.845, 1.77, 1.695, 1.62, 1.545];
const TEETH_TOP = [-0.046, -0.031, -0.016, 0, 0.016, 0.031, 0.046].map((x, i) => [x, i % 2 ? 0.026 : 0.02]);
const TEETH_LOW = [-0.04, -0.024, -0.008, 0.008, 0.024, 0.04].map((x, i) => [x, i % 2 ? 0.02 : 0.024]);

// The head as built is scaled up about the top of its neck and set a little lower (the art's head is big on
// its body, sunk between the traps; it stays in the head's hit cylinder); what's on the head bone goes with it.
export const HEAD_SCALE = 1.22;
const HEAD_PIVOT = new THREE.Vector3(0, 2.0, 0.17);
const HEAD_DROP = 0.1;
function onHeadBone(g, bone) {
  if (bone !== 'head') return g;
  return g
    .translate(-HEAD_PIVOT.x, -HEAD_PIVOT.y, -HEAD_PIVOT.z)
    .scale(HEAD_SCALE, HEAD_SCALE, HEAD_SCALE)
    .translate(HEAD_PIVOT.x, HEAD_PIVOT.y - HEAD_DROP, HEAD_PIVOT.z);
}

// Build the skinned geometry. look: config.mutant.look. Returns { geometry }
// (position, normal, color, skinIndex, skinWeight, aGlow).
export function buildMutantGeometry(look) {
  const parts = [];
  const paint = paints(look);
  const base = { glow: [0, 0], colours: paint };
  for (const [bone, other, x, y, z, rx, ry, rz, key, lumps, glow, opts = {}] of MASSES) {
    const seg = opts.seg ?? [14, 10];
    const g = new THREE.SphereGeometry(1, seg[0], seg[1]);
    g.scale(rx, ry, rz).translate(x, y, z);
    onHeadBone(g, bone);
    const centre = new THREE.Vector3(x, y, z);
    parts.push(finish(g, { ...base, bone, other, share: other ? 0.5 : 0, paint: paint[key], key, lumps, glowKind: glow, centre, radius: new THREE.Vector3(rx, ry, rz), wound: opts.wound, band: opts.band, dent: opts.wound ? woundDent : null }));
  }
  for (const [x, y, z] of EYES) {
    const g = onHeadBone(new THREE.SphereGeometry(0.0105, 8, 6).scale(1, 0.75, 1).translate(x, y, z), 'head');
    parts.push(finish(g, { ...base, bone: 'head', paint: paint.eyes, key: 'eyes', lumps: 0, glow: [0, 1] }));
  }
  for (const [from, to, r0, r1, key, lumps, bulge] of LIMBS) {
    const a = JOINT[from].p;
    const b = JOINT[to].p;
    parts.push(finish(tube(a, b, r0, r1, 14, 8, bulge), { ...base, bone: from, other: JOINT[from].parent, blendStart: true, from: a, to: b, paint: paint[key], key, lumps }));
    // A knob at the joint it starts from, bending with both bones.
    const knob = new THREE.SphereGeometry(r0 * 1.02, 12, 8).translate(a.x, a.y, a.z);
    parts.push(finish(knob, { ...base, bone: from, other: JOINT[from].parent, share: 0.5, paint: paint[key], key, lumps: lumps * 0.6 }));
  }
  for (const [bone, ax, ay, az, bx, by, bz, r] of SPURS) {
    parts.push(finish(onHeadBone(tube(new THREE.Vector3(ax, ay, az), new THREE.Vector3(bx, by, bz), r, 0.004, 6, 2), bone), { ...base, bone, paint: paint.bone, key: 'bone', lumps: 0 }));
  }
  for (const [bone, ax, ay, az, bx, by, bz, r0, r1, key, lumps] of GROWTHS) {
    parts.push(finish(tube(new THREE.Vector3(ax, ay, az), new THREE.Vector3(bx, by, bz), r0, r1, 7, 3, 0.1), { ...base, bone, paint: paint[key], key, lumps }));
  }
  // The ribs, across the wound, each a bar of short straight runs round the ribcage's surface; under each, a
  // darker cleft in the meat.
  const c = BODY.chest;
  const at = (a, y, out) => {
    const k = Math.sqrt(Math.max(0.05, 1 - ((y - c.y) / c.ry) ** 2));
    const s = Math.sin(a);
    const co = Math.cos(a);
    const t = 1 / Math.sqrt((s / (c.rx * k)) ** 2 + (co / (c.rz * k)) ** 2) + out;
    return new THREE.Vector3(c.x + s * t, y, c.z + co * t);
  };
  for (const y of RIBS) {
    const half = WOUND.halfA * Math.sqrt(Math.max(0, 1 - ((y - WOUND.y) / WOUND.halfY) ** 2)) * 0.95;
    const a0 = WOUND.a - half;
    const a1 = WOUND.a + half;
    const runs = 8;
    for (let i = 0; i < runs; i++) {
      const aa = a0 + ((a1 - a0) * i) / runs;
      const ab = a0 + ((a1 - a0) * (i + 1)) / runs;
      const ya = y - (aa - a0) ** 1.4 * 0.1; // curving down toward its side
      const yb = y - (ab - a0) ** 1.4 * 0.1;
      parts.push(finish(tube(at(aa, ya, -0.006), at(ab, yb, -0.006), 0.024, 0.022, 6, 1), { ...base, bone: 'chest', other: 'spine', share: 0.3, paint: paint.bone, key: 'rib', lumps: 0 }));
      parts.push(finish(tube(at(aa, ya - 0.034, -0.04), at(ab, yb - 0.034, -0.04), 0.014, 0.014, 4, 1), { ...base, bone: 'chest', other: 'spine', share: 0.3, paint: paint.mouth, key: 'mouth', lumps: 0 }));
    }
  }
  // The teeth, bared in the snarl: the top row down, the bottom row up.
  const zf = (x) => 0.372 + 0.018 * Math.sqrt(Math.max(0, 1 - (x / 0.06) ** 2)) + 0.002;
  for (const [rows, y0, dir] of [[TEETH_TOP, 2.172, -1], [TEETH_LOW, 2.124, 1]]) {
    for (const [x, len] of rows) {
      parts.push(finish(onHeadBone(tube(new THREE.Vector3(x, y0, zf(x)), new THREE.Vector3(x * 1.04, y0 + dir * len, zf(x) + 0.004), 0.008, 0.003, 5, 1), 'head'), { ...base, bone: 'head', paint: paint.bone, key: 'bone', lumps: 0 }));
    }
  }
  const geometry = mergeGeometries(parts);
  for (const p of parts) p.dispose();
  return { geometry };
}

// The wound's meat sinks in behind the ribs (metres along the normal; 0 outside it).
function woundDent(p) {
  const w = woundAt(p);
  return w < 1 ? -0.045 * Math.min(1, (1 - w) * 4) : 0;
}

// The bones, in JOINTS order, parented and placed (local offsets from
// their parents): { root, bones: { name: Bone }, list: [Bone] }.
export function buildMutantBones() {
  const bones = {};
  const list = JOINTS.map(([name, parent]) => {
    const b = new THREE.Bone();
    b.name = name;
    const p = JOINT[name].p;
    const q = parent ? JOINT[parent].p : new THREE.Vector3();
    b.position.set(p.x - q.x, p.y - q.y, p.z - q.z);
    bones[name] = b;
    return b;
  });
  for (const [name, parent] of JOINTS) if (parent) bones[parent].add(bones[name]);
  return { root: bones.root, bones, list };
}

// ---- building ----------------------------------------------------------------------------------

// A tapered tube from a to b (radii r0, r1), open ended, swelling by
// `bulge` (a share of its radius) midway.
function tube(a, b, r0, r1, radial, rings, bulge = 0) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const g = new THREE.CylinderGeometry(r1, r0, len, radial, rings, true);
  g.translate(0, len / 2, 0); // from y = 0 (a) to y = len (b)
  if (bulge) {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const k = 1 + bulge * Math.sin((p.getY(i) / len) * Math.PI);
      p.setX(i, p.getX(i) * k);
      p.setZ(i, p.getZ(i) * k);
    }
  }
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  g.applyQuaternion(q).translate(a.x, a.y, a.z);
  return g;
}

// The painted colours (linear), by key.
function paints(look) {
  const c = (hex) => new THREE.Color(hex);
  return {
    skin: c(look.skin),
    skinDark: c(look.skinDark),
    raw: c(look.raw),
    sac: c(look.sac),
    mouth: c(look.mouth),
    eyes: c(look.eyes),
    bone: c(look.bone),
    jeans: c(look.jeans),
    shin: c(look.jeans), // the jeans' lower legs: ragged at the hem, torn over the right knee (paintVertex)
    shirt: c(look.shirt),
    growth: c(look.growth ?? look.skinDark), // Nov 26: the club side's tumorous growth
    eyeball: c(look.eyeball ?? look.eyes), // the blind eye in it
    belt: c(look.belt ?? 0x1a1410),
    buckle: c(look.buckle ?? 0x6a644e),
    boot: c(look.boot ?? 0x241a12),
  };
}

const tmp = new THREE.Vector3();
const nrm = new THREE.Vector3();
const along = new THREE.Vector3();
const colour = new THREE.Color();

// Lumps, paint, glow and skin weights for one part. Its seams are welded
// first (a sphere's or tube's edge vertices share a position), so the
// lumps never tear it and the shading has no seam. o: { bone, other,
// share (the other bone's weight), blendStart (a limb: its first quarter
// bends in from the parent bone), from, to, paint, key, lumps, glow:
// [spot, eyes], glowKind ('sac', 'veins' or null) with the mass's centre
// and radius, colours (all the paints) }.
function finish(g, o) {
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  const welded = mergeVertices(g, 1e-5);
  g.dispose();
  g = welded;
  g.computeVertexNormals();
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const count = pos.count;
  // Lumps: push each vertex out along its normal by smooth noise of where it is (and the wound's dent in).
  if (o.lumps > 0 || o.dent) {
    for (let i = 0; i < count; i++) {
      tmp.fromBufferAttribute(pos, i);
      nrm.fromBufferAttribute(nor, i);
      const k = noise3(tmp.x * 7, tmp.y * 7, tmp.z * 7) * 0.7 + noise3(tmp.x * 17 + 5, tmp.y * 17, tmp.z * 17) * 0.3;
      const d = (k - 0.4) * o.lumps * 2 + (o.dent ? o.dent(tmp) : 0);
      tmp.addScaledVector(nrm, d);
      pos.setXYZ(i, tmp.x, tmp.y, tmp.z);
    }
    g.computeVertexNormals();
  }
  const colours = new Float32Array(count * 3);
  const skinIndex = new Uint16Array(count * 4);
  const skinWeight = new Float32Array(count * 4);
  const glow = new Float32Array(count * 2);
  const bone = JOINT[o.bone].i;
  const other = o.other ? JOINT[o.other].i : bone;
  const span = o.from ? new THREE.Vector3().subVectors(o.to, o.from) : null;
  const spanLen2 = span ? span.lengthSq() : 1;
  for (let i = 0; i < count; i++) {
    tmp.fromBufferAttribute(pos, i);
    nrm.fromBufferAttribute(g.attributes.normal, i);
    paintVertex(o, tmp, nrm, colour);
    colour.toArray(colours, i * 3);
    let w = 1 - (o.share ?? 0);
    if (o.blendStart && span) {
      const t = Math.max(0, Math.min(1, along.subVectors(tmp, o.from).dot(span) / spanLen2));
      w = t >= 0.25 ? 1 : 0.5 + (t / 0.25) * 0.5;
    }
    skinIndex[i * 4] = bone;
    skinIndex[i * 4 + 1] = other;
    skinWeight[i * 4] = other === bone ? 1 : w;
    skinWeight[i * 4 + 1] = other === bone ? 0 : 1 - w;
    glow[i * 2] = o.glow[0] + glowAt(o, tmp);
    glow[i * 2 + 1] = o.glow[1];
  }
  g.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeight, 4));
  g.setAttribute('aGlow', new THREE.BufferAttribute(glow, 2));
  return g;
}

// The weak spot's glow at a point: the sac, hottest at its middle (its
// back, where it bulges out); veins on the hump near it, thin ridges of
// noise fading with the distance from the sac.
const SAC = new THREE.Vector3(0, 1.86, -0.53);
function glowAt(o, p) {
  if (o.glowKind === 'sac') {
    const u = Math.max(0, -(p.z - o.centre.z) / o.radius.z); // 0 at its rim, 1 at the back
    return 0.25 + 0.75 * Math.sqrt(u);
  }
  if (o.glowKind === 'veins') {
    const d = p.distanceTo(SAC);
    if (d > 0.42) return 0;
    const ridge = Math.abs(noise3(p.x * 11 + 2, p.y * 11, p.z * 11) - 0.5);
    return ridge < 0.045 ? 0.5 * (1 - d / 0.42) : 0;
  }
  return 0;
}

// One vertex's colour: its paint, mottled; blood smeared on bare skin; the wound (meat, a torn rim, blood
// running from it); the jeans (blood, the torn knee, the ragged hem); the shirt's strip; darker underneath.
function paintVertex(o, p, n, out) {
  const c = o.colours;
  out.copy(o.paint);
  let bare = o.key === 'skin' || o.key === 'skinDark' || o.key === 'growth';
  const denim = o.key === 'jeans' || o.key === 'shin';
  if (denim) {
    // The ragged hem, the ankles bare below it; the right knee torn open, bloody.
    const hem = o.key === 'shin' && p.y < 0.17 + noise3(p.x * 25, p.y * 4, p.z * 25) * 0.08;
    const hole = p.x < 0 && p.z > 0 && Math.hypot(p.x + 0.27, (p.y - 0.53) * 0.8) < 0.1 + (noise3(p.x * 22, p.y * 22, p.z * 22) - 0.5) * 0.08;
    if (hem || hole) {
      out.copy(c.skin);
      bare = true;
      if (hole) out.lerp(c.raw, 0.4 + noise3(p.x * 40, p.y * 40, p.z * 40) * 0.4).lerp(c.mouth, 0.25);
    } else {
      out.multiplyScalar(0.85 + noise3(p.x * 6, p.y * 6 + 2, p.z * 6) * 0.35); // faded and dirty
      if (noise3(p.x * 8 + 4, p.y * 8, p.z * 8 + 1) > 0.7) out.lerp(c.mouth, 0.5).lerp(c.raw, 0.2); // blood soaked in, dried dark
    }
  }
  // The shirt's strip, from the club shoulder down across the chest and belly to the other hip (clear of the wound).
  if (o.band && Math.abs(0.8 * (p.x + 0.4) + 0.7 * (p.y - 1.95)) / 1.063 < 0.085 + noise3(p.x * 14, p.y * 14, p.z * 14) * 0.06) {
    out.copy(c.shirt);
    bare = false;
  }
  if (o.wound && bare) {
    const w = woundAt(p);
    if (w < 1) {
      // Meat: dark, wet, mottled red.
      out.copy(c.mouth).lerp(c.raw, 0.12 + noise3(p.x * 30, p.y * 30, p.z * 30) * 0.5);
      bare = false;
    } else if (w < 1.2) {
      out.copy(c.raw).lerp(c.mouth, 0.3).lerp(c.skin, 0.15); // the torn rim of skin
      bare = false;
    } else if (w < 1.65) {
      out.lerp(c.raw, ((1.65 - w) / 0.45) * 0.6); // blood smeared round it
    }
    // Blood run down from it.
    if (bare && p.y < WOUND.y - WOUND.halfY * 0.5 && p.y > 1.38 && Math.abs(Math.atan2(p.x, p.z - BODY.chest.z) - WOUND.a) < WOUND.halfA && noise3(p.x * 45, 0.5, p.z * 45) > 0.66) out.lerp(c.raw, 0.6);
  }
  if (o.key === 'rib') out.multiplyScalar(0.62).lerp(c.raw, 0.3 + noise3(p.x * 40, p.y * 40, p.z * 40) * 0.4); // bloodied bone
  // Blood smeared over bare skin, and raw patches on the growth.
  if (bare && noise3(p.x * 6 + 3, p.y * 6 + 7, p.z * 6) > (o.key === 'growth' ? 0.6 : 0.7)) out.lerp(c.raw, 0.45);
  out.multiplyScalar(0.7 + noise3(p.x * 9 + 11, p.y * 9, p.z * 9) * 0.4 + noise3(p.x * 31, p.y * 31, p.z * 31) * 0.12); // mottled
  out.multiplyScalar(0.55 + 0.45 * (n.y * 0.5 + 0.5)); // darker underneath
}

// Smooth value noise in [0, 1) (cosmetic: hashed, not the game's RNG).
export function noise3(x, y, z) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const fx = smooth(x - xi);
  const fy = smooth(y - yi);
  const fz = smooth(z - zi);
  const h = (i, j, k) => hash3(xi + i, yi + j, zi + k);
  const lerp = (a, b, t) => a + (b - a) * t;
  return lerp(
    lerp(lerp(h(0, 0, 0), h(1, 0, 0), fx), lerp(h(0, 1, 0), h(1, 1, 0), fx), fy),
    lerp(lerp(h(0, 0, 1), h(1, 0, 1), fx), lerp(h(0, 1, 1), h(1, 1, 1), fx), fy),
    fz,
  );
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}

function hash3(x, y, z) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
