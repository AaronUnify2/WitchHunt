// A kit for building people in code (Session 13): a figure is ellipsoid
// masses, tapered limbs, tubes (braids, a zip) and rings (glasses), skinned
// to a human skeleton and painted with vertex colours. One mesh, one draw
// call. The family are built with it (render/familyLooks.js); the cutscene
// people can be too.
//
// Model space: faces +z, feet at y = 0, the figure's right hand on -x;
// built at an adult's 1.7 m and scaled to each person (spec.scale).

import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// The human skeleton: [name, parent, x, y, z] (model space, the rest pose:
// standing straight, arms hanging at the sides).
export const HUMAN_JOINTS = [
  ['root', null, 0, 0, 0],
  ['hips', 'root', 0, 0.95, 0],
  ['spine', 'hips', 0, 1.12, 0],
  ['chest', 'spine', 0, 1.32, 0],
  ['neck', 'chest', 0, 1.46, 0],
  ['head', 'neck', 0, 1.53, 0.01],
  ['shoulderR', 'chest', -0.19, 1.42, 0],
  ['elbowR', 'shoulderR', -0.22, 1.14, 0],
  ['wristR', 'elbowR', -0.23, 0.88, 0.02],
  ['shoulderL', 'chest', 0.19, 1.42, 0],
  ['elbowL', 'shoulderL', 0.22, 1.14, 0],
  ['wristL', 'elbowL', 0.23, 0.88, 0.02],
  ['hipR', 'hips', -0.1, 0.92, 0],
  ['kneeR', 'hipR', -0.1, 0.5, 0.01],
  ['ankleR', 'kneeR', -0.1, 0.08, -0.02],
  ['hipL', 'hips', 0.1, 0.92, 0],
  ['kneeL', 'hipL', 0.1, 0.5, 0.01],
  ['ankleL', 'kneeL', 0.1, 0.08, -0.02],
];

const HEIGHT = 1.7; // the skeleton's height, as built

// spec: { joints (default HUMAN_JOINTS), height (metres), width (x and z
// scale), head (the head's own scale, about the neck), colours: { key: hex },
// masses: [[bone, other bone or null, x, y, z, rx, ry, rz, key, turn (optional:
// [x, y, z] radians, the ellipsoid turned before it's placed)]],
// limbs: [[from joint, to joint, r0, r1, key, bulge, flat (depth / width:
// an oval, for a trunk), knob (the joint's knob, as a share of r0: default
// 1.01, none for a trunk)]], tubes: [[bone, ax,
// ay, az, bx, by, bz, r0, r1, key]], rings: [[bone, x, y, z, radius, tube,
// key, turn (optional, as masses')]] (facing +z unturned), paint(key, p, out) (optional: patterns; p in the
// built space), deform(p, n, bone) (optional: how far to push a vertex out
// along its normal, in metres: one smooth field moves every surface there
// together, so shapes reshape without creases), glow: { key: 0..1 }
// (optional: an aGlow attribute, how much each part glows in its own colour,
// for the renderer's shader) }. Returns { geometry, joints } (joints: { name: { i,
// parent, p } }, scaled).
export function buildFigure(spec) {
  const joints = jointMap(spec.joints ?? HUMAN_JOINTS);
  const colours = Object.fromEntries(Object.entries(spec.colours).map(([k, hex]) => [k, new THREE.Color(hex)]));
  const parts = [];
  const add = (g, o) => parts.push(finish(g, { ...o, joints, colours, paint: spec.paint, glow: spec.glow }));
  for (const [bone, other, x, y, z, rx, ry, rz, key, turn] of spec.masses) {
    const g = new THREE.SphereGeometry(1, 16, 12);
    g.scale(rx, ry, rz);
    if (turn) g.rotateX(turn[0]).rotateY(turn[1]).rotateZ(turn[2]);
    g.translate(x, y, z);
    add(g, { bone, other, share: other ? 0.5 : 0, key });
  }
  for (const [from, to, r0, r1, key, bulge = 0, flat = 1, knob = flat === 1 ? 1.01 : 0] of spec.limbs) {
    const a = joints[from].p;
    const b = joints[to].p;
    add(tube(a, b, r0, r1, 12, 6, bulge, flat), { bone: from, other: joints[from].parent, blendStart: true, from: a, to: b, key });
    // A knob over the joint it starts from (not a trunk's: it would show below the hips).
    if (knob) add(new THREE.SphereGeometry(r0 * knob, 12, 8).translate(a.x, a.y, a.z), { bone: from, other: joints[from].parent, share: 0.5, key });
  }
  for (const [bone, ax, ay, az, bx, by, bz, r0, r1, key] of spec.tubes ?? []) {
    add(tube(new THREE.Vector3(ax, ay, az), new THREE.Vector3(bx, by, bz), r0, r1, 8, 4), { bone, key });
  }
  for (const [bone, x, y, z, radius, thickness, key, turn] of spec.rings ?? []) {
    const g = new THREE.TorusGeometry(radius, thickness, 6, 20);
    if (turn) g.rotateX(turn[0]).rotateY(turn[1]).rotateZ(turn[2]);
    add(g.translate(x, y, z), { bone, key });
  }
  let geometry = mergeGeometries(parts);
  for (const p of parts) p.dispose();
  if (spec.deform) deformFigure(geometry, joints, spec.deform);
  // The head's own scale (a child's is bigger for their height), about the neck.
  if (spec.head && spec.head !== 1) scaleBone(geometry, joints, 'head', joints.neck.p, spec.head);
  // To the person's height and build.
  const k = (spec.height ?? HEIGHT) / HEIGHT;
  const w = spec.width ?? 1;
  geometry.scale(k * w, k, k * w);
  for (const j of Object.values(joints)) j.p.set(j.p.x * k * w, j.p.y * k, j.p.z * k * w);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return { geometry, joints };
}

// Bones for a figure's joints, parented and placed: { root, bones: { name:
// Bone }, list: [Bone] } (in the joints' order, as the skin indices are).
export function buildBones(joints) {
  const bones = {};
  const entries = Object.entries(joints).sort((a, b) => a[1].i - b[1].i);
  const list = entries.map(([name, j]) => {
    const b = new THREE.Bone();
    b.name = name;
    const q = j.parent ? joints[j.parent].p : new THREE.Vector3();
    b.position.set(j.p.x - q.x, j.p.y - q.y, j.p.z - q.z);
    bones[name] = b;
    return b;
  });
  for (const [name, j] of entries) if (j.parent) bones[j.parent].add(bones[name]);
  return { root: bones.root, bones, list };
}

// Push each vertex out along its normal by deform(p, n, bone name), then
// smooth the normals again.
function deformFigure(geometry, joints, deform) {
  const names = Object.entries(joints).sort((a, b) => a[1].i - b[1].i).map(([name]) => name);
  const pos = geometry.attributes.position;
  const nor = geometry.attributes.normal;
  const si = geometry.attributes.skinIndex;
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    n.fromBufferAttribute(nor, i);
    const d = deform(p, n, names[si.getX(i)]);
    if (d) pos.setXYZ(i, p.x + n.x * d, p.y + n.y * d, p.z + n.z * d);
  }
  geometry.computeVertexNormals();
}

function jointMap(list) {
  return Object.fromEntries(list.map(([name, parent, x, y, z], i) => [name, { i, parent, p: new THREE.Vector3(x, y, z) }]));
}

// Scale the vertices skinned wholly to `bone` (and its children's, here the
// head has none) about `pivot`.
function scaleBone(geometry, joints, bone, pivot, s) {
  const index = joints[bone].i;
  const pos = geometry.attributes.position;
  const si = geometry.attributes.skinIndex;
  const sw = geometry.attributes.skinWeight;
  for (let i = 0; i < pos.count; i++) {
    if (si.getX(i) !== index || sw.getX(i) < 0.99) continue;
    pos.setXYZ(i, pivot.x + (pos.getX(i) - pivot.x) * s, pivot.y + (pos.getY(i) - pivot.y) * s, pivot.z + (pos.getZ(i) - pivot.z) * s);
  }
  geometry.computeVertexNormals();
}

// A tapered tube from a to b (radii r0, r1), open ended, swelling by
// `bulge` (a share of its radius) midway; flat < 1 squashes it to an oval
// (its depth, before it's turned to point from a to b).
export function tube(a, b, r0, r1, radial, rings, bulge = 0, flat = 1) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const g = new THREE.CylinderGeometry(r1, r0, len, radial, rings, true);
  g.translate(0, len / 2, 0); // from y = 0 (a) to y = len (b)
  if (bulge || flat !== 1) {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const k = 1 + bulge * Math.sin((p.getY(i) / len) * Math.PI);
      p.setX(i, p.getX(i) * k);
      p.setZ(i, p.getZ(i) * k * flat);
    }
  }
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  g.applyQuaternion(q).translate(a.x, a.y, a.z);
  return g;
}

const tmp = new THREE.Vector3();
const nrm = new THREE.Vector3();
const along = new THREE.Vector3();
const colour = new THREE.Color();

// Paint and skin weights for one part, its seams welded first (smooth
// shading). o: { bone, other, share, blendStart (a limb: its first quarter
// bends in from the parent bone), from, to, key, joints, colours, paint }.
function finish(g, o) {
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  const welded = mergeVertices(g, 1e-5);
  g.dispose();
  welded.computeVertexNormals();
  const pos = welded.attributes.position;
  const nor = welded.attributes.normal;
  const count = pos.count;
  const colours = new Float32Array(count * 3);
  const skinIndex = new Uint16Array(count * 4);
  const skinWeight = new Float32Array(count * 4);
  const bone = o.joints[o.bone].i;
  const other = o.other ? o.joints[o.other].i : bone;
  const span = o.from ? new THREE.Vector3().subVectors(o.to, o.from) : null;
  const spanLen2 = span ? span.lengthSq() : 1;
  for (let i = 0; i < count; i++) {
    tmp.fromBufferAttribute(pos, i);
    nrm.fromBufferAttribute(nor, i);
    colour.copy(o.colours[o.key] ?? o.colours.skin);
    o.paint?.(o.key, tmp, colour, o.colours);
    // Soft shading baked in: a touch darker underneath (an ambient-occlusion stand-in).
    colour.multiplyScalar(0.7 + 0.3 * (nrm.y * 0.5 + 0.5));
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
  }
  welded.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  welded.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4));
  welded.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeight, 4));
  if (o.glow) welded.setAttribute('aGlow', new THREE.BufferAttribute(new Float32Array(count).fill(o.glow[o.key] ?? 0), 1));
  return welded;
}
