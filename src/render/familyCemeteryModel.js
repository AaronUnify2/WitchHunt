// The Pruitts' family plot (Nov 24, Aaron: "just a few headstones, no fences or anything like that ... a big dead
// tree in the center of the family cemetery, like a big dead tree"). Built in the clearing's own frame (its centre
// at the origin, unturned: x east, z north), one static mesh.
//  - The dead oak: a thick gnarled trunk on flared roots, split and hollowed, three great limbs reaching out over
//    the graves (config familyPlot.oak.limbs), each with a rope tied on near its end; smaller dead branches and
//    twigs against the sky.
//  - Six headstones round it (config familyPlot.stones): round-topped, a cross, a square one, a small one; leaning,
//    mossed, their lettering worn to lines; a low mound before each, and dead flowers on one.
// Returns { group, ropes: [{ x, y, z }] (each limb's rope knot, local), colliders: [{ x, z, r }], dispose }.

import * as THREE from 'three';
import { SetBuilder } from './setBuilder.js';
import { bakeParts } from './propKit.js';

const DEG = Math.PI / 180;

export function buildFamilyCemetery(cfg, { weather = null } = {}) {
  const k = cfg.look.colors;
  const b = new SetBuilder({ colors: k }, null, 91);
  const ropes = oak(b, k, cfg.oak);
  const colliders = [{ x: 0, z: 0, r: cfg.oak.trunk[0] + 0.1 }];
  for (const s of cfg.stones) {
    stone(b, k, s);
    colliders.push({ x: s[0], z: s[1], r: 0.32 });
  }
  const geometry = bakeParts(b.parts, { weather, baseAt: () => 0, seed: 91 });
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  const group = new THREE.Group();
  group.name = 'familyCemetery';
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return {
    group,
    ropes,
    colliders,
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

// A tapered branch from (x0, y0, z0) along a yaw (radians) and a rise (radians up from level), `len` long.
function branch(b, color, x0, y0, z0, yaw, rise, len, r0, r1, sides = 7) {
  const g = new THREE.CylinderGeometry(r1, r0, len, sides, 1, true).translate(0, len / 2, 0);
  b.push(x0, y0, z0, yaw, Math.PI / 2 - rise, 0);
  b.put(g, color);
  b.pop();
  const dx = Math.sin(yaw) * Math.cos(rise) * len;
  const dz = Math.cos(yaw) * Math.cos(rise) * len;
  return { x: x0 + dx, y: y0 + Math.sin(rise) * len, z: z0 + dz };
}

function oak(b, k, o) {
  const r = () => b.rand();
  const [rb, rt] = o.trunk;
  // The trunk, in three leaning sections, thinning; a split down one side and a black hollow.
  let at = { x: 0, y: 0, z: 0 };
  const sections = [[0.12, 0.06, 1.6], [-0.08, 0.1, 1.5], [0.1, -0.04, 1.4]];
  let rr = rb;
  for (const [lx, lz, h] of sections) {
    const r1 = rr - (rb - rt) / 3;
    b.push(at.x, at.y, at.z, 0, lz, -lx);
    b.put(new THREE.CylinderGeometry(r1, rr, h + 0.08, 9, 1, true).translate(0, h / 2, 0), k.bark);
    b.pop();
    at = { x: at.x + lx * h, y: at.y + h, z: at.z + lz * h };
    rr = r1;
  }
  b.box(0.06, 2.4, 0.1, k.barkDark, rb * 0.8, 1.5, 0.2, 0.4, 0, 0.05); // the split
  b.put(new THREE.CircleGeometry(0.22, 8).scale(0.8, 1.4, 1), k.knot, -0.2, 1.35, rb - 0.04); // the hollow
  for (let i = 0; i < 18; i++) b.box(0.05, 0.3 + r() * 0.8, 0.03, r() < 0.5 ? k.barkDark : k.barkPale, Math.cos(i * 2.4) * rb * 0.98, 0.3 + r() * 3, Math.sin(i * 2.4) * rb * 0.98, -i * 2.4, 0, (r() - 0.5) * 0.3); // bark ridges
  // Roots flaring out into the graves.
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + r() * 0.4;
    branch(b, k.bark, Math.sin(a) * rb * 0.6, 0.35, Math.cos(a) * rb * 0.6, a, -0.45 - r() * 0.2, 1.4 + r() * 0.8, 0.28, 0.06);
  }
  // A broken stub at the top, and the three great limbs out over the graves; the ropes near their ends.
  branch(b, k.bark, at.x, at.y - 0.1, at.z, 0.6, 1.3, 1.1, rt, 0.12);
  const ropes = [];
  for (const L of o.limbs) {
    const yaw = L.yaw * DEG;
    // Up from the trunk to the limb's height, then out, sagging a little, then a last kink up at the tip.
    const start = { x: at.x * 0.8, y: o.height * 0.82, z: at.z * 0.8 };
    const rise1 = Math.atan2(L.y - start.y + 0.3, L.reach * 0.55);
    const mid = branch(b, k.bark, start.x, start.y, start.z, yaw, rise1, Math.hypot(L.reach * 0.55, L.y - start.y + 0.3), 0.32, 0.2);
    const end = branch(b, k.bark, mid.x, mid.y, mid.z, yaw + 0.12, -0.12, L.reach * 0.55, 0.2, 0.09);
    branch(b, k.barkDark, end.x, end.y, end.z, yaw + 0.3, 0.6, 1.0, 0.09, 0.03);
    // Smaller dead branches off it, and twigs.
    for (let i = 0; i < 4; i++) {
      const t = 0.3 + i * 0.2;
      const p = { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t + 0.1, z: start.z + (end.z - start.z) * t };
      const by = yaw + (i % 2 ? 1 : -1) * (0.6 + r() * 0.5);
      const tip = branch(b, k.bark, p.x, p.y, p.z, by, 0.5 + r() * 0.6, 0.9 + r() * 0.8, 0.07, 0.025, 5);
      for (let j = 0; j < 3; j++) branch(b, k.barkDark, tip.x, tip.y, tip.z, by + (r() - 0.5) * 1.6, 0.3 + r() * 0.9, 0.3 + r() * 0.4, 0.022, 0.006, 4);
    }
    // The rope: tied round the limb at 85% of its reach (a knot and two turns).
    const tx = Math.sin(yaw) * L.reach * 0.85;
    const tz = Math.cos(yaw) * L.reach * 0.85;
    const ty = L.y - 0.05;
    b.put(new THREE.TorusGeometry(0.13, 0.03, 5, 10), k.rope, tx, ty, tz, yaw, 0, 0);
    b.put(new THREE.SphereGeometry(0.06, 6, 5), k.ropeDark, tx, ty - 0.12, tz);
    ropes.push({ x: tx, y: ty - 0.12, z: tz });
  }
  return ropes;
}

// A headstone: [x, z, yaw degrees, kind], leaning, mossed, its lettering worn; a mound before it.
function stone(b, k, [x, z, yawDeg, kind]) {
  const r = () => b.rand();
  const yaw = yawDeg * DEG;
  const lean = (r() - 0.5) * 0.35;
  const tilt = (r() - 0.3) * 0.25;
  b.push(x, 0, z, yaw, tilt, lean);
  const small = kind === 'small';
  const w = small ? 0.34 : 0.52;
  const h = small ? 0.42 : kind === 'square' ? 0.72 : 0.68;
  if (kind === 'cross') {
    b.box(0.13, 0.95, 0.11, k.stone, 0, 0.47, 0);
    b.box(0.5, 0.12, 0.11, k.stone, 0, 0.72, 0);
  } else {
    b.box(w, h, 0.11, k.stone, 0, h / 2, 0);
    if (kind === 'round' || kind === 'small') b.put(new THREE.CylinderGeometry(w / 2, w / 2, 0.11, 12, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2), k.stone, 0, h, 0);
    // The lettering, worn to lines: a name, the years.
    for (let i = 0; i < 3; i++) b.box(w * (0.55 - i * 0.12) * (0.8 + r() * 0.3), 0.022, 0.006, k.letters, 0, h - 0.14 - i * 0.1, 0.058);
  }
  // Moss up from the ground and lichen in patches.
  b.box(w + 0.02, 0.12 + r() * 0.1, 0.12, k.moss, 0, 0.06, 0);
  for (let i = 0; i < 3; i++) b.box(0.06 + r() * 0.08, 0.05 + r() * 0.06, 0.004, k.lichen, (r() - 0.5) * w * 0.8, 0.15 + r() * (h - 0.2), r() < 0.5 ? 0.057 : -0.057);
  b.box(w + 0.14, 0.06, 0.18, k.stoneDark, 0, 0.03, 0); // its foot
  b.pop();
  // The mound before it (its own frame unturned by the lean), long settled; dead flowers on one.
  b.push(x, 0, z, yaw);
  b.put(new THREE.SphereGeometry(0.5, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.75, 0.22, 1.6), k.mound, 0, 0, 0.95);
  for (let i = 0; i < 6; i++) b.box(0.02, 0.12 + r() * 0.12, 0.02, k.moundGrass, (r() - 0.5) * 0.7, 0.12, 0.3 + r() * 1.3, r() * 3, (r() - 0.5) * 0.6, 0);
  if (kind === 'small') for (let i = 0; i < 5; i++) b.box(0.012, 0.22, 0.012, k.flowersDead, (r() - 0.5) * 0.1, 0.1, 0.18, 0, 0.4 + r() * 0.5, (r() - 0.5) * 0.8);
  b.pop();
}
