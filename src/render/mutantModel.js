// The mutant's model (Session 13; DESIGN.md "Mutants (3D)"): a 2.5 m
// giant that was once a man. Hunched, a small head sunk between hulking
// shoulders, the jaw hanging slack; its right arm swollen into a club with
// bone spurs, the left long and wasted with long claws; a hump of tumours
// on its back with the weak spot, a raw sac, nested in it; torn jeans and a
// strip of shirt from its old life.
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

// Masses: [bone, other bone (shares half) or null, x, y, z, rx, ry, rz,
// paint, lumps (metres), glow] (an ellipsoid). Paints are keys of the look;
// glow 'sac' is the weak spot's, 'veins' its veins running into the hump.
const MASSES = [
  ['hips', null, 0, 1.0, -0.02, 0.36, 0.22, 0.27, 'jeans', 0.02, null],
  ['spine', 'hips', 0, 1.27, 0.08, 0.4, 0.3, 0.34, 'skin', 0.03, null],
  ['chest', 'spine', 0, 1.67, 0.12, 0.52, 0.34, 0.38, 'shirtBand', 0.035, null],
  // Hulking shoulders, higher than the head: the club side's bigger.
  ['chest', 'shoulderR', -0.46, 1.98, 0, 0.34, 0.3, 0.31, 'skinDark', 0.045, null],
  ['chest', 'shoulderL', 0.4, 1.92, 0.04, 0.2, 0.18, 0.2, 'skin', 0.025, null],
  // The hump and its tumours.
  ['chest', null, 0.04, 1.98, -0.22, 0.44, 0.36, 0.3, 'skinDark', 0.05, 'veins'],
  ['chest', null, -0.22, 2.12, -0.24, 0.17, 0.15, 0.16, 'raw', 0.03, 'veins'],
  ['chest', null, 0.28, 2.06, -0.24, 0.15, 0.14, 0.14, 'skinDark', 0.03, 'veins'],
  ['chest', null, 0.1, 1.68, -0.36, 0.14, 0.12, 0.12, 'raw', 0.02, 'veins'],
  ['chest', 'neck', -0.1, 2.16, -0.06, 0.13, 0.12, 0.13, 'skinDark', 0.02, null],
  // The weak spot: a raw sac bulging from the hump, glowing hottest at its middle.
  ['chest', null, 0, 1.86, -0.53, 0.13, 0.13, 0.08, 'sac', 0.012, 'sac'],
  ['neck', 'chest', 0, 1.98, 0.16, 0.17, 0.13, 0.16, 'skin', 0.02, null],
  // The head: small and low, the brow heavy, the jaw hanging open.
  ['head', null, 0, 2.2, 0.22, 0.15, 0.17, 0.16, 'skin', 0.018, null],
  ['head', null, 0, 2.26, 0.33, 0.13, 0.045, 0.06, 'skinDark', 0.01, null],
  ['head', null, 0, 2.14, 0.35, 0.065, 0.05, 0.03, 'mouth', 0, null],
  ['head', null, 0, 2.06, 0.29, 0.1, 0.06, 0.1, 'skin', 0.01, null],
  // The club: a swollen fist, its knuckles forward.
  ['wristR', null, -0.88, 0.5, 0.3, 0.24, 0.22, 0.25, 'skinDark', 0.045, null],
  ['wristR', null, -0.78, 0.44, 0.48, 0.075, 0.07, 0.075, 'skinDark', 0.01, null],
  ['wristR', null, -0.86, 0.42, 0.5, 0.08, 0.075, 0.08, 'skinDark', 0.01, null],
  ['wristR', null, -0.94, 0.43, 0.48, 0.075, 0.07, 0.075, 'skinDark', 0.01, null],
  ['wristR', null, -1.0, 0.46, 0.42, 0.065, 0.06, 0.065, 'skinDark', 0.01, null],
  // Feet.
  ['ankleR', null, -0.27, 0.06, 0.08, 0.11, 0.065, 0.19, 'skinDark', 0.015, null],
  ['ankleL', null, 0.27, 0.06, 0.08, 0.11, 0.065, 0.19, 'skinDark', 0.015, null],
];

// Eyes: small, pale, a steady glow (aGlow.y).
const EYES = [
  [-0.058, 2.215, 0.365],
  [0.058, 2.215, 0.365],
];

// Limbs: [from joint, to joint, radius at from, radius at to, paint,
// lumps, bulge] (a tapered tube on the from joint's bone, bending in from
// its parent's; bulge: how much fatter it swells midway, a muscle).
const LIMBS = [
  ['shoulderR', 'elbowR', 0.21, 0.18, 'skin', 0.045, 0.3],
  ['elbowR', 'wristR', 0.2, 0.22, 'skinDark', 0.05, 0.35],
  ['shoulderL', 'elbowL', 0.1, 0.07, 'skin', 0.015, 0.15],
  ['elbowL', 'wristL', 0.075, 0.05, 'skin', 0.012, 0.15],
  ['hipR', 'kneeR', 0.19, 0.14, 'jeans', 0.02, 0.15],
  ['kneeR', 'ankleR', 0.13, 0.09, 'shin', 0.02, 0.25],
  ['hipL', 'kneeL', 0.19, 0.14, 'jeans', 0.02, 0.15],
  ['kneeL', 'ankleL', 0.13, 0.09, 'shin', 0.02, 0.25],
];

// The wasted hand's long claws: from the wrist to these tips.
const CLAWS = [
  [0.6, 0.42, 0.32],
  [0.68, 0.4, 0.34],
  [0.76, 0.44, 0.3],
];

// Bone spurs out of the club and the club side's shoulder: [bone, base x, y, z, tip x, y, z, radius].
const SPURS = [
  ['wristR', -1.04, 0.52, 0.3, -1.22, 0.58, 0.32, 0.045],
  ['wristR', -0.94, 0.62, 0.42, -1.04, 0.74, 0.58, 0.04],
  ['wristR', -0.98, 0.38, 0.44, -1.1, 0.32, 0.62, 0.035],
  ['elbowR', -0.98, 1.0, 0.18, -1.18, 1.06, 0.12, 0.035],
  ['chest', -0.66, 2.02, -0.06, -0.8, 2.22, -0.14, 0.04],
];

// Build the skinned geometry. look: config.mutant.look. Returns { geometry }
// (position, normal, color, skinIndex, skinWeight, aGlow).
export function buildMutantGeometry(look) {
  const parts = [];
  const paint = paints(look);
  for (const [bone, other, x, y, z, rx, ry, rz, key, lumps, glow] of MASSES) {
    const g = new THREE.SphereGeometry(1, 14, 10);
    g.scale(rx, ry, rz).translate(x, y, z);
    const centre = new THREE.Vector3(x, y, z);
    parts.push(finish(g, { bone, other, share: other ? 0.5 : 0, paint: paint[key], key, lumps, glow: [0, 0], glowKind: glow, centre, radius: new THREE.Vector3(rx, ry, rz), colours: paint }));
  }
  for (const [x, y, z] of EYES) {
    const g = new THREE.SphereGeometry(0.026, 6, 4).translate(x, y, z);
    parts.push(finish(g, { bone: 'head', paint: paint.eyes, key: 'eyes', lumps: 0, glow: [0, 1], colours: paint }));
  }
  for (const [from, to, r0, r1, key, lumps, bulge] of LIMBS) {
    const a = JOINT[from].p;
    const b = JOINT[to].p;
    parts.push(finish(tube(a, b, r0, r1, 10, 6, bulge), { bone: from, other: JOINT[from].parent, blendStart: true, from: a, to: b, paint: paint[key], key, lumps, glow: [0, 0], colours: paint }));
    // A knob at the joint it starts from, bending with both bones.
    const knob = new THREE.SphereGeometry(r0 * 1.02, 10, 7).translate(a.x, a.y, a.z);
    parts.push(finish(knob, { bone: from, other: JOINT[from].parent, share: 0.5, paint: paint[key], key, lumps: lumps * 0.6, glow: [0, 0], colours: paint }));
  }
  const wrist = JOINT.wristL.p;
  for (const [x, y, z] of CLAWS) parts.push(finish(tube(wrist, new THREE.Vector3(x, y, z), 0.03, 0.006, 5, 3), { bone: 'wristL', paint: paint.bone, key: 'bone', lumps: 0, glow: [0, 0], colours: paint }));
  for (const [bone, ax, ay, az, bx, by, bz, r] of SPURS) {
    parts.push(finish(tube(new THREE.Vector3(ax, ay, az), new THREE.Vector3(bx, by, bz), r, 0.004, 5, 2), { bone, paint: paint.bone, key: 'bone', lumps: 0, glow: [0, 0], colours: paint }));
  }
  const geometry = mergeGeometries(parts);
  for (const p of parts) p.dispose();
  return { geometry };
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
    shin: c(look.skin), // torn jeans: skin below the knee, rags above (paintVertex)
    shirtBand: c(look.skin), // a strip of shirt across the chest (paintVertex)
    shirt: c(look.shirt),
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
  // Lumps: push each vertex out along its normal by smooth noise of where it is.
  if (o.lumps > 0) {
    for (let i = 0; i < count; i++) {
      tmp.fromBufferAttribute(pos, i);
      nrm.fromBufferAttribute(nor, i);
      const k = noise3(tmp.x * 7, tmp.y * 7, tmp.z * 7) * 0.7 + noise3(tmp.x * 17 + 5, tmp.y * 17, tmp.z * 17) * 0.3;
      tmp.addScaledVector(nrm, (k - 0.4) * o.lumps * 2);
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

// One vertex's colour: its paint, mottled; raw patches on bare skin;
// rags (torn jeans above the knee, a strip of shirt across the chest);
// darker underneath and in the creases.
function paintVertex(o, p, n, out) {
  const c = o.colours;
  out.copy(o.paint);
  const bare = o.key === 'skin' || o.key === 'skinDark' || o.key === 'shin' || o.key === 'shirtBand';
  let cloth = o.key === 'jeans';
  // The jeans' legs, torn off ragged above the knee.
  if (o.key === 'shin' && p.y > 0.42 + noise3(p.x * 20, p.y * 3, p.z * 20) * 0.14) {
    out.copy(c.jeans);
    cloth = true;
  }
  // A strip of shirt from the left shoulder down across the chest, torn.
  if (o.key === 'shirtBand' && Math.abs(p.x * 0.75 + (p.y - 1.66) * 1.2) < 0.13 + noise3(p.x * 14, p.y * 14, p.z * 14) * 0.08) {
    out.copy(c.shirt);
    cloth = true;
  }
  // Raw patches on bare skin.
  if (bare && !cloth && noise3(p.x * 5 + 3, p.y * 5 + 7, p.z * 5) > 0.76) out.lerp(c.raw, 0.5);
  out.multiplyScalar(0.65 + noise3(p.x * 9 + 11, p.y * 9, p.z * 9) * 0.55 + noise3(p.x * 31, p.y * 31, p.z * 31) * 0.15); // mottled
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
