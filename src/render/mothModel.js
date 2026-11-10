// A giant moth (Session 24; DESIGN.md "Giant moths"): the Mothman's kin,
// dog sized (Aaron), met in swarms in the mineshaft and in his lair. A fat
// furred body about 0.8 m long, a banded abdomen, a small head with his red
// eyes, feathery antennae, six thin legs trailing, and his wings in small:
// dusty, eye-spotted, about 1.7 m across.
//
// One plain geometry (no skeleton), for an instanced mesh: a whole swarm is
// one draw call (render/MothRenderer.js). The wings beat in the vertex
// shader: every wing vertex carries aWing (-1 its right wing, 1 its left, 0
// the body), and the shader turns it about the hinge.
//
// Model space: faces +z, its back up, the middle of its body at the origin.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { forewingPoint, hindwingPoint, paintWing, FORE_SPOT, HIND_SPOT } from './mothmanModel.js';

// Where the wings hinge (x either side), for the shader.
export const MOTH_HINGE = { x: 0.07, y: 0.05, z: 0.04 };
const WING_SCALE = 0.33; // the Mothman's wings, this much smaller

const tmp = new THREE.Color();
const at = new THREE.Vector3();
const nrm = new THREE.Vector3();

// Colour, wing side and glow for one part (its normals already set).
function finish(g, colour, { wing = 0, glow = 0, paint = null } = {}) {
  const pos = g.getAttribute('position');
  const nor = g.getAttribute('normal');
  const uv = g.getAttribute('uv');
  const n = pos.count;
  const colours = new Float32Array(n * 3);
  const uvAt = new THREE.Vector2();
  for (let i = 0; i < n; i++) {
    tmp.copy(colour);
    at.fromBufferAttribute(pos, i);
    nrm.fromBufferAttribute(nor, i);
    paint?.(tmp, at, uv ? uvAt.fromBufferAttribute(uv, i) : null);
    if (!wing) tmp.multiplyScalar(0.7 + 0.3 * (nrm.y * 0.5 + 0.5)); // darker underneath
    tmp.toArray(colours, i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  g.setAttribute('aWing', new THREE.BufferAttribute(new Float32Array(n).fill(wing), 1));
  g.setAttribute('aGlow', new THREE.BufferAttribute(new Float32Array(n).fill(glow), 1));
  if (uv) g.deleteAttribute('uv');
  return g.index ? g.toNonIndexed() : g;
}

// One wing as a two-faced sheet lying flat (the xz plane), uv = (u, v).
// flip: -1 where the shape's u and v run the other way round (the hindwing's fan).
function wingSheet(point, root, side, nu, nv, flip = 1) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const index = [];
  for (const face of [1, -1]) {
    const base = positions.length / 3;
    for (let i = 0; i <= nu; i++) {
      for (let k = 0; k <= nv; k++) {
        const [x, y] = point(i / nu, k / nv);
        positions.push(side * (root.x + x * WING_SCALE), root.y + face * 0.003, root.z + y * WING_SCALE);
        normals.push(0, face, 0);
        uvs.push(i / nu, k / nv);
      }
    }
    for (let i = 0; i < nu; i++) {
      for (let k = 0; k < nv; k++) {
        const a = base + i * (nv + 1) + k;
        const b = a + nv + 1;
        if (face * side * flip > 0) index.push(a, b, a + 1, b, b + 1, a + 1);
        else index.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(index);
  return g;
}

// c: config.moths.giant.
export function buildMothGeometry(c) {
  const colours = Object.fromEntries(Object.entries(c.colours).map(([k, hex]) => [k, new THREE.Color(hex)]));
  const parts = [];
  const blob = (rx, ry, rz, x, y, z, key, opts) => {
    const g = new THREE.SphereGeometry(1, 10, 7).scale(rx, ry, rz).translate(x, y, z);
    g.deleteAttribute('uv');
    g.computeVertexNormals();
    parts.push(finish(g, colours[key], opts));
  };
  const stick = (ax, ay, az, bx, by, bz, r, key) => {
    const a = new THREE.Vector3(ax, ay, az);
    const dir = new THREE.Vector3(bx, by, bz).sub(a);
    const len = dir.length();
    const g = new THREE.CylinderGeometry(r * 0.3, r, len, 4, 1).translate(0, len / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())).translate(ax, ay, az);
    g.deleteAttribute('uv');
    parts.push(finish(g, colours[key]));
  };
  const fur = (out, p) => out.multiplyScalar(0.82 + 0.3 * Math.abs(Math.sin(p.x * 70 + p.y * 53) * Math.sin(p.z * 61)));
  const bands = (out, p) => {
    if (Math.abs(Math.sin(p.z * 26)) < 0.3) out.multiplyScalar(0.65);
  };
  // The body: a fat furred thorax, a banded abdomen, a small head, his eyes.
  blob(0.15, 0.14, 0.2, 0, 0, 0.04, 'ruff', { paint: fur });
  blob(0.115, 0.105, 0.3, 0, -0.025, -0.3, 'belly', { paint: bands });
  blob(0.09, 0.085, 0.085, 0, 0.01, 0.26, 'fur', { paint: fur });
  for (const s of [-1, 1]) {
    blob(0.04, 0.042, 0.03, s * 0.055, 0.03, 0.32, 'eyes', { glow: c.eyeGlow });
    // An antenna: swept up and back, feathered.
    const stem = [
      [s * 0.04, 0.08, 0.3],
      [s * 0.13, 0.2, 0.26],
      [s * 0.2, 0.25, 0.12],
    ];
    for (let i = 0; i < 2; i++) {
      const a = stem[i];
      const b = stem[i + 1];
      stick(...a, ...b, 0.012 - i * 0.004, 'furDark');
      for (const t of [0.3, 0.7]) {
        const p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
        stick(...p, p[0] + s * 0.06, p[1] - 0.01, p[2] - 0.04, 0.006, 'ruff');
        stick(...p, p[0] - s * 0.04, p[1] + 0.03, p[2] - 0.04, 0.006, 'ruff');
      }
    }
    // Three legs a side, trailing under it.
    for (let i = 0; i < 3; i++) {
      const z = 0.14 - i * 0.1;
      stick(s * 0.08, -0.08, z, s * 0.17, -0.2, z - 0.05, 0.014, 'furDark');
      stick(s * 0.17, -0.2, z - 0.05, s * 0.14, -0.3, z - 0.2, 0.01, 'furDark');
    }
    // The wings.
    const h = MOTH_HINGE;
    const fore = wingSheet(forewingPoint, new THREE.Vector3(h.x, h.y, h.z + 0.04), s, 12, 5);
    parts.push(finish(fore, colours.wing, { wing: s, paint: (out, p, uv) => paintWing(out, colours, uv, FORE_SPOT) }));
    const hind = wingSheet((u, v) => hindwingPoint(u, v), new THREE.Vector3(h.x, h.y - 0.008, h.z - 0.04), s, 9, 4, -1); // the fan runs the other way round
    parts.push(finish(hind, colours.wing, { wing: s, paint: (out, p, uv) => paintWing(out, colours, uv, HIND_SPOT) }));
  }
  const geometry = mergeGeometries(parts);
  for (const p of parts) p.dispose();
  geometry.computeBoundingSphere();
  return geometry;
}
