// Old-growth forest (Session 32; Aaron: the place beyond's trees were
// "kind of placeholder trees... give this area a more old growth forest
// kind of look, and then apply that same style to the forest clearing where
// the stair in the woods is"). Three pieces, each ONE geometry meant to be
// drawn instanced (a whole stand is three draw calls), all in code, no
// lights, dull colours (the glare rule):
//
//  - the bole: a trunk a man couldn't reach round, 22 m of it, furrowed
//    bark, buttress roots flaring out of the ground and running off across
//    it, moss up its north side, a few dead stubs, great limbs high up;
//  - the crown: heavy flat masses of needles far overhead, with moss
//    hanging from them;
//  - a fern: a ring of arching fronds for the floor between.
//
// Every vertex carries a `role` (ROLES) rather than a colour, so one
// geometry can be painted for different places: paint(geometry, palette)
// writes its `color` attribute (the forest's own browns and greens by the
// stairs; bone grey under blue-black in the place beyond).
//
// buildBole(), buildCrown(), buildFern() return a BufferGeometry (dispose
// it yourself). bole.userData.radius is the trunk's at the ground, for a
// collider; .reach is how far its roots run.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const ROLES = ['bark', 'barkDark', 'moss', 'crown', 'crownDark', 'fern', 'fernDark'];
const R = Object.fromEntries(ROLES.map((r, i) => [r, i]));

export const OLD_GROWTH = { height: 22, radius: 0.95, top: 0.5, crownFrom: 13 };

// A cheap repeatable hash, 0..1.
function hash(a, b) {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// Give a geometry one role on every vertex (or a role per vertex from fn(x, y, z, i)).
function withRole(g, role) {
  const geo = g.index ? g.toNonIndexed() : g;
  const pos = geo.attributes.position;
  const arr = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) arr[i] = typeof role === 'function' ? role(pos.getX(i), pos.getY(i), pos.getZ(i), i) : role;
  geo.setAttribute('role', new THREE.BufferAttribute(arr, 1));
  geo.deleteAttribute('uv');
  return geo;
}

const UP = new THREE.Vector3(0, 1, 0);

// A tapered limb from a to b.
function limb(a, b, r0, r1, sides = 5) {
  const av = new THREE.Vector3(...a);
  const d = new THREE.Vector3(...b).sub(av);
  const len = d.length();
  const g = new THREE.CylinderGeometry(r1, r0, len, sides, 1, true);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, d.clone().normalize()));
  g.translate(av.x + d.x / 2, av.y + d.y / 2, av.z + d.z / 2);
  return g;
}

// The bole: the trunk, its buttresses and roots, its stubs and high limbs.
export function buildBole() {
  const T = OLD_GROWTH;
  const parts = [];
  // The trunk: ten sides, seven rings, every ring a little out of round; bark in furrows (a role a side).
  const trunk = new THREE.CylinderGeometry(T.top, T.radius, T.height, 10, 7, true).translate(0, T.height / 2, 0);
  {
    const pos = trunk.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const a = Math.atan2(z, x);
      const ring = Math.round((y / T.height) * 7);
      const side = Math.round(((a + Math.PI) / (Math.PI * 2)) * 10) % 10;
      // Fatter and more gnarled toward the ground; a slow sway of the whole stem.
      const k = 1 + (hash(side, ring) - 0.5) * 0.22 + Math.max(0, 1 - y / 3.5) * 0.28;
      pos.setXYZ(i, x * k + Math.sin(y * 0.21) * 0.18, y, z * k + Math.cos(y * 0.17) * 0.12);
    }
    trunk.computeVertexNormals();
  }
  parts.push(
    withRole(trunk, (x, y, z, i) => {
      // Moss up the north (-z) side, thick at the foot, thinning by head height and gone by six metres.
      const north = -z / (Math.hypot(x, z) || 1);
      if (north > 0.25 && y < 6 * north && hash(Math.floor(i / 6), 7) < 0.85 - y * 0.1) return R.moss;
      return Math.floor(i / 6) % 2 ? R.bark : R.barkDark;
    }),
  );
  // Buttress roots: six fins leaning into the foot of it, each running off as a root over the ground.
  for (let k = 0; k < 6; k++) {
    const a = k * 1.047 + hash(k, 1) * 0.5;
    const out = 1.7 + hash(k, 2) * 0.7;
    const cx = Math.cos(a);
    const cz = Math.sin(a);
    const h = 2.2 + hash(k, 3) * 1.6;
    parts.push(withRole(limb([cx * out, 0, cz * out], [cx * 0.62, h, cz * 0.62], 0.42, 0.16, 5), k % 2 ? R.bark : R.barkDark));
    const run = out + 1.6 + hash(k, 4) * 1.8;
    const bend = a + (hash(k, 5) - 0.5) * 0.7;
    parts.push(withRole(limb([cx * out, 0.12, cz * out], [Math.cos(bend) * run, 0.02, Math.sin(bend) * run], 0.3, 0.06, 5), cz < -0.2 ? R.moss : R.barkDark));
  }
  // Dead stubs, broken off short; and the great limbs up where the crown begins.
  for (let k = 0; k < 3; k++) {
    const a = 0.9 + k * 2.3;
    const y = 5 + k * 2.4;
    const r = 0.72 - y * 0.012;
    parts.push(withRole(limb([Math.cos(a) * r, y, Math.sin(a) * r], [Math.cos(a) * (r + 1.1 + hash(k, 8) * 0.8), y + 0.35, Math.sin(a) * (r + 1.1 + hash(k, 8) * 0.8)], 0.11, 0.05, 4), R.barkDark));
  }
  for (let k = 0; k < 5; k++) {
    const a = k * 1.26 + 0.4;
    const y = T.crownFrom + k * 1.5;
    const len = 4.2 + hash(k, 9) * 2.2;
    parts.push(withRole(limb([Math.cos(a) * 0.4, y, Math.sin(a) * 0.4], [Math.cos(a) * len, y + 1.6 + hash(k, 10) * 1.6, Math.sin(a) * len], 0.24, 0.08, 5), R.bark));
  }
  const g = mergeGeometries(parts);
  for (const p of parts) p.dispose();
  g.userData = { radius: T.radius * 1.2, reach: 2.4 };
  return g;
}

// The crown: flat masses of needles on the limbs and over the top, moss hanging under them.
export function buildCrown() {
  const T = OLD_GROWTH;
  const parts = [];
  const clump = (x, y, z, rx, ry, k) => {
    const g = new THREE.IcosahedronGeometry(1, 0);
    g.scale(rx, ry, rx * (0.85 + hash(k, 21) * 0.3));
    g.rotateY(hash(k, 22) * 3);
    g.translate(x, y, z);
    parts.push(withRole(g, k % 2 ? R.crown : R.crownDark));
  };
  for (let k = 0; k < 5; k++) {
    const a = k * 1.26 + 0.4;
    const len = 4.2 + hash(k, 9) * 2.2;
    const y = T.crownFrom + k * 1.5 + 1.9 + hash(k, 10) * 1.6;
    clump(Math.cos(a) * len * 0.92, y, Math.sin(a) * len * 0.92, 3.0 + hash(k, 23) * 1.0, 1.1 + hash(k, 24) * 0.5, k);
    // Moss hanging from the limb's end.
    for (let j = 0; j < 2; j++) {
      const hx = Math.cos(a) * len * (0.6 + j * 0.3);
      const hz = Math.sin(a) * len * (0.6 + j * 0.3);
      const drop = 1.6 + hash(k, 25 + j) * 2.6;
      parts.push(withRole(new THREE.BoxGeometry(0.07, drop, 0.07).translate(hx, y - 1.0 - drop / 2, hz), R.moss));
    }
  }
  clump(0.3, T.height - 0.6, -0.2, 3.4, 1.5, 7);
  clump(-0.8, T.height + 1.4, 0.5, 2.2, 1.3, 8);
  const g = mergeGeometries(parts);
  for (const p of parts) p.dispose();
  return g;
}

// A fern: seven fronds arching out of one crown, knee high.
export function buildFern() {
  const parts = [];
  for (let k = 0; k < 7; k++) {
    const a = k * 0.9 + hash(k, 31) * 0.4;
    const len = 0.75 + hash(k, 32) * 0.45;
    // A frond: a long leaf in two bent halves (up and out, then drooping), a hand wide.
    const mid = [Math.cos(a) * len * 0.5, 0.42 + hash(k, 33) * 0.16, Math.sin(a) * len * 0.5];
    const tip = [Math.cos(a) * len, 0.2 + hash(k, 34) * 0.14, Math.sin(a) * len];
    const sx = -Math.sin(a) * 0.11;
    const sz = Math.cos(a) * 0.11;
    const arr = [
      0, 0.03, 0, mid[0] - sx, mid[1], mid[2] - sz, mid[0] + sx, mid[1], mid[2] + sz,
      mid[0] - sx, mid[1], mid[2] - sz, tip[0], tip[1], tip[2], mid[0] + sx, mid[1], mid[2] + sz,
    ];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    g.computeVertexNormals();
    parts.push(withRole(g, k % 2 ? R.fern : R.fernDark));
  }
  const g = mergeGeometries(parts);
  for (const p of parts) p.dispose();
  return g;
}

// Colour a geometry by its roles: palette { bark, barkDark, moss, crown, crownDark, fern, fernDark } (hex).
const _c = new THREE.Color();
export function paint(geometry, palette) {
  const role = geometry.attributes.role;
  let col = geometry.attributes.color;
  if (!col) {
    col = new THREE.BufferAttribute(new Float32Array(role.count * 3), 3);
    geometry.setAttribute('color', col);
  }
  for (let i = 0; i < role.count; i++) {
    _c.setHex(palette[ROLES[role.getX(i)]] ?? 0x404040);
    col.setXYZ(i, _c.r, _c.g, _c.b);
  }
  col.needsUpdate = true;
  return geometry;
}

// A stand of them round a clearing (pure): `count` places on a ring between r0 and r1 from the middle, none
// within `gap` radians of the way in (`toward`: the bearing of the entrance from the middle), none closer
// together than `apart`. rand(): 0..1. Returns [{ x, z, yaw, scale, lean, leanDir }].
export function ringStand(count, r0, r1, toward, gap, apart, rand) {
  const out = [];
  for (let tries = 0; out.length < count && tries < count * 40; tries++) {
    const a = rand() * Math.PI * 2;
    let d = a - toward;
    d -= Math.round(d / (Math.PI * 2)) * Math.PI * 2;
    if (Math.abs(d) < gap) continue;
    const r = r0 + (r1 - r0) * rand();
    const x = Math.sin(a) * r;
    const z = Math.cos(a) * r;
    if (out.some((o) => Math.hypot(o.x - x, o.z - z) < apart)) continue;
    out.push({ x, z, yaw: rand() * Math.PI * 2, scale: 0.78 + rand() * 0.5, lean: rand() * 0.05, leanDir: rand() * Math.PI * 2 });
  }
  return out;
}
