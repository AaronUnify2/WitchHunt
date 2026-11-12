// The Car Armory's set (build queue item 6; DESIGN.md "The Car Armory,
// Sheriff and the ute"): the government's supply point for its portal
// programme, alien and human technology side by side, overrun. SCAFFOLDING:
// a first-pass compound, one baked vertex-coloured mesh plus one unlit mesh
// for what glows. No lights; dull colours.
//
//  - a chain-link perimeter with the gate on the way in, hanging open;
//  - the motor pool just inside on the left: a canopy, oil drums, the bay
//    where the ute stands (the ute itself is the game's Ute: item 7);
//  - the supply hall along the right: an open-fronted shed of racked crates
//    (the loot), the turret's crate, the explosives locker, a desk of files;
//  - the armoured truck backed up at the far left, its rear doors open on a
//    ring of the portal's light (a crude copy of the ship's);
//  - the survivors' barricade across the middle: sandbags and an upturned
//    table, three firing positions looking down the lane to the cells;
//  - the holding block at the back: a row of cages, the last one Sheriff's.
//
// Model space: Tom arrives from -z; the origin is the clearing's middle; +x
// is his left as he walks in (world/CarArmorySite.js converts).
//
// buildCarArmory(look, { heightAt }) returns { group, mesh, glow, spots,
// colliders, dispose }.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { bakeParts } from './propKit.js';
import { SetBuilder } from './setBuilder.js';

// The set's measurements (metres, model space).
export const ARMORY = {
  fence: { half: 21, gateHalf: 3 },
  ute: { x: 13, z: -13 },
  hall: { x0: -19, x1: -9, z0: -8, z1: 8 }, // on Tom's right (model -x)
  truck: { x: 14, z: 13 },
  barricade: { z: 4, x0: -7, x1: 8 },
  posts: [[-4, 5.4], [1, 5.6], [6, 5.3]], // the survivors, behind the barricade, looking toward -z
  lane: { x0: -8, x1: 10, z0: -9, z1: 3 }, // what they can see: the open yard between the gate and the barricade
  cages: { z: 17, x0: -8, step: 4, count: 4 }, // Sheriff's is the last (x0 + 3 * step)
};

export function buildCarArmory(look, { heightAt = null } = {}) {
  const b = new SetBuilder(look, heightAt, 71);
  const c = look.colors;
  const A = ARMORY;
  const glow = [];
  const F = A.fence.half;
  // ---- the perimeter: posts and mesh panels, the gate's two leaves swung in ----
  const run = (ax, az, bx, bz, solid = true) => {
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.round(len / 3));
    for (let i = 0; i <= n; i++) {
      const x = ax + ((bx - ax) * i) / n;
      const z = az + ((bz - az) * i) / n;
      b.pushOnGround(x, 0, z, 0);
      b.box(0.08, 2.4, 0.08, c.post, 0, 1.2, 0);
      b.pop();
    }
    b.pushOnGround((ax + bx) / 2, 0, (az + bz) / 2, Math.atan2(bx - ax, bz - az));
    b.box(0.03, 2.0, len, c.mesh, 0, 1.1, 0);
    b.box(0.05, 0.05, len, c.post, 0, 2.3, 0);
    b.pop();
    if (solid) b.wall(ax, az, bx, bz, 0, 0.12, 2.4, false);
  };
  run(-F, -F, -A.fence.gateHalf, -F);
  run(A.fence.gateHalf, -F, F, -F);
  run(-F, F, F, F);
  run(-F, -F, -F, F);
  run(F, -F, F, F);
  for (const s of [-1, 1]) {
    b.pushOnGround(s * A.fence.gateHalf, 0, -F, s * 1.1);
    b.box(0.04, 2.0, 2.8, c.mesh, 0, 1.1, 1.4);
    b.box(0.06, 0.06, 2.8, c.post, 0, 2.1, 1.4);
    b.pop();
  }
  b.spot('gate', 0, 0, -F);
  // ---- the motor pool: a canopy on four posts, drums, the ute's bay marked on the ground ----
  b.pushOnGround(A.ute.x, 0, A.ute.z, 0);
  for (const [x, z] of [[-3, -4], [3, -4], [-3, 4], [3, 4]]) b.box(0.14, 3.2, 0.14, c.post, x, 1.6, z);
  b.box(6.6, 0.1, 8.6, c.roof, 0, 3.25, 0);
  b.box(4.2, 0.02, 0.1, c.paint, 0, 0.02, -3.4);
  b.box(4.2, 0.02, 0.1, c.paint, 0, 0.02, 3.4);
  for (const [x, z] of [[-2.6, 5.2], [-1.9, 5.5], [2.5, 5.3]]) b.put(new THREE.CylinderGeometry(0.29, 0.29, 0.88, 10), c.drum, x, 0.44, z);
  b.spot('ute', 0, 0, 0);
  b.pop();
  // ---- the supply hall: a long shed open down its front (+x side), racks of crates ----
  {
    const H = A.hall;
    const cx = (H.x0 + H.x1) / 2;
    const cz = (H.z0 + H.z1) / 2;
    const w = H.x1 - H.x0;
    const d = H.z1 - H.z0;
    b.pushOnGround(cx, 0, cz, 0);
    b.box(w, 0.08, d, c.slab, 0, 0.04, 0);
    b.box(0.2, 3.4, d, c.wall, -w / 2, 1.7, 0);
    b.box(w, 3.4, 0.2, c.wall, 0, 1.7, -d / 2);
    b.box(w, 3.4, 0.2, c.wall, 0, 1.7, d / 2);
    b.box(w + 0.6, 0.14, d + 0.6, c.roof, 0, 3.5, 0);
    for (const z of [-d / 2 + 0.4, 0, d / 2 - 0.4]) b.box(0.18, 3.4, 0.18, c.post, w / 2, 1.7, z);
    // racks of crates along the back wall
    for (let i = 0; i < 6; i++) {
      const z = -d / 2 + 1.4 + i * 2.5;
      b.box(1.4, 0.06, 2.0, c.rack, -w / 2 + 1.0, 1.3, z);
      b.box(1.4, 0.06, 2.0, c.rack, -w / 2 + 1.0, 0.25, z);
      b.box(1.1, 0.9, 1.5, i % 2 ? c.crate : c.crateDark, -w / 2 + 1.0, 0.75, z, (i % 3) * 0.05);
      b.box(1.0, 0.7, 1.3, i % 2 ? c.crateDark : c.crate, -w / 2 + 1.0, 1.7, z, -(i % 3) * 0.06);
    }
    b.spot('crates', -w / 2 + 2.6, 0, -3.5);
    // the turret's crate: long, stencilled, on a pallet
    b.box(2.2, 0.9, 1.0, c.crateGreen, 1.5, 0.55, 5.2, 0.15);
    b.box(2.4, 0.1, 1.2, c.rack, 1.5, 0.05, 5.2, 0.15);
    b.spot('turret', 1.5, 0, 3.9);
    // the explosives locker: steel, a warning diamond on its door
    b.box(1.2, 1.9, 0.7, c.locker, 2.6, 0.95, -6.8);
    b.box(0.5, 0.5, 0.02, c.warn, 2.6, 1.3, -6.44, 0, 0, Math.PI / 4);
    b.spot('charges', 2.6, 0, -5.6);
    // a desk of files, a dead terminal
    b.box(1.8, 0.06, 0.8, c.desk, -0.5, 0.76, 0.2);
    for (const [x, z] of [[-1.3, -0.1], [0.3, -0.1], [-1.3, 0.5], [0.3, 0.5]]) b.box(0.05, 0.76, 0.05, c.post, x, 0.38, z);
    b.box(0.5, 0.4, 0.4, c.locker, -0.9, 0.99, 0.1);
    for (let i = 0; i < 5; i++) b.box(0.3, 0.02, 0.22, c.paper, -0.2 + i * 0.12, 0.8 + i * 0.012, 0.3, i * 0.2);
    b.spot('docs', -0.3, 0, 1.4);
    b.wall(-w / 2, -d / 2, -w / 2, d / 2, 0, 0.2, 3.4);
    b.wall(-w / 2, -d / 2, w / 2, -d / 2, 0, 0.2, 3.4);
    b.wall(-w / 2, d / 2, w / 2, d / 2, 0, 0.2, 3.4);
    b.wall(-w / 2 + 1.0, -d / 2 + 0.6, -w / 2 + 1.0, d / 2 - 0.6, 0, 0.8, 2.2);
    b.pop();
  }
  // ---- the armoured truck, its back doors open on the portal's ring ----
  b.pushOnGround(A.truck.x, 0, A.truck.z, -2.2);
  b.box(2.5, 2.3, 6.2, c.truck, 0, 1.75, 0);
  b.box(2.4, 1.6, 2.0, c.truckDark, 0, 1.4, -4.0);
  for (const [x, z] of [[-1.2, -3.6], [1.2, -3.6], [-1.2, 1.6], [1.2, 1.6], [-1.2, 2.7], [1.2, 2.7]]) b.put(new THREE.CylinderGeometry(0.5, 0.5, 0.36, 12).rotateZ(Math.PI / 2), c.tyre, x, 0.5, z);
  for (const s of [-1, 1]) b.box(0.06, 2.1, 1.25, c.truckDark, s * 1.3, 1.75, 3.7, s * 0.9);
  const ringAt = b.point(0, 1.75, 3.0);
  const ringYaw = -2.2;
  b.post(0, 0, 0, 2.6, 3);
  b.post(0, 0, -3.6, 1.6, 2.4);
  b.spot('portal', 0, 0, 5.4);
  b.pop();
  glow.push({ geo: new THREE.TorusGeometry(0.85, 0.07, 8, 26).applyMatrix4(new THREE.Matrix4().compose(ringAt, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ringYaw, 0)), new THREE.Vector3(1, 1, 1))), color: look.glow.portal });
  glow.push({ geo: new THREE.CircleGeometry(0.8, 20).applyMatrix4(new THREE.Matrix4().compose(ringAt, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ringYaw, 0)), new THREE.Vector3(1, 1, 1))), color: look.glow.portalDim });
  // ---- the survivors' barricade: sandbags, an upturned table, a filing cabinet on its side ----
  {
    const B = A.barricade;
    for (let x = B.x0; x <= B.x1; x += 0.9) {
      for (let row = 0; row < 3; row++) {
        b.pushOnGround(x + (row % 2) * 0.45, 0, B.z + (b.rand() - 0.5) * 0.15, (b.rand() - 0.5) * 0.3);
        b.box(0.86, 0.26, 0.45, row % 2 ? c.sand : c.sandDark, 0, 0.13 + row * 0.25, 0);
        b.pop();
      }
    }
    b.pushOnGround(-1.5, 0, B.z + 0.5, 0.1);
    b.box(1.8, 1.0, 0.08, c.desk, 0, 0.9, 0, 0, 0.12);
    b.pop();
    b.pushOnGround(3.5, 0, B.z + 0.5, -0.1);
    b.box(1.4, 0.5, 0.6, c.locker, 0, 1.0, 0);
    b.pop();
    b.wall(B.x0 - 0.4, B.z, B.x1 + 0.4, B.z, 0, 0.3, 0.8, false);
    A.posts.forEach(([x, z], i) => {
      b.pushOnGround(x, 0, z, 0);
      b.spot(`post${i}`, 0, 0, 0);
      b.pop();
    });
  }
  // ---- the holding block: a slab, a roof on posts, four cages; the last is Sheriff's ----
  {
    const K = A.cages;
    const w = K.step * K.count;
    b.pushOnGround(K.x0 + w / 2 - K.step / 2, 0, K.z, 0);
    b.box(w + 1, 0.08, 4.4, c.slab, 0, 0.04, 0);
    b.box(w + 1.4, 0.12, 5, c.roof, 0, 3.0, 0);
    b.box(w + 1, 2.9, 0.2, c.wall, 0, 1.5, 2.1);
    for (let i = 0; i <= K.count; i++) {
      const x = -w / 2 + i * K.step;
      // a side of bars
      for (let k = 0; k < 9; k++) b.box(0.035, 2.6, 0.035, c.bar, x, 1.4, -1.9 + k * 0.48);
      b.box(0.06, 0.06, 4.0, c.bar, x, 2.7, 0);
      b.wall(x, -2, x, 2.1, 0, 0.1, 2.7, false);
    }
    for (let i = 0; i < K.count; i++) {
      const x = -w / 2 + i * K.step;
      // the front: bars, with a door's worth left open on the three empty ones
      const open = i < K.count - 1;
      for (let k = 0; k <= 8; k++) {
        const bx = x + (k * K.step) / 8;
        if (open && k >= 2 && k <= 5) continue;
        b.box(0.035, 2.6, 0.035, c.bar, bx, 1.4, -2.0);
      }
      b.box(K.step, 0.06, 0.06, c.bar, x + K.step / 2, 2.7, -2.0);
      b.box(1.6, 0.06, 0.7, c.cot, x + K.step / 2, 0.4, 1.5);
      if (!open) b.wall(x, -2.0, x + K.step, -2.0, 0, 0.1, 2.7, false);
    }
    b.wall(-w / 2, 2.1, w / 2, 2.1, 0, 0.2, 2.9);
    const sx = -w / 2 + (K.count - 0.5) * K.step;
    b.spot('sheriff', sx, 0, 0.3);
    b.spot('cage', sx, 0, -3.0);
    b.spot('out', sx - 1.2, 0, -4.2);
    b.pop();
  }
  const geometry = bakeParts(b.parts, { weather: null, baseAt: (x, y, z) => b.heightAt(x, z), seed: 71 });
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const geos = glow.map(({ geo, color }) => {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const col = new THREE.Color(color);
    const n = g.getAttribute('position').count;
    const cols = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) cols.set([col.r, col.g, col.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    g.deleteAttribute('uv');
    g.deleteAttribute('normal');
    return g;
  });
  const glowGeo = mergeGeometries(geos);
  geos.forEach((g) => g.dispose());
  const glowM = new THREE.Mesh(glowGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  const group = new THREE.Group();
  group.name = 'carArmory';
  group.add(mesh, glowM);
  return {
    group,
    mesh,
    glow: glowM,
    spots: b.spots,
    colliders: b.colliders,
    dispose() {
      group.removeFromParent();
      geometry.dispose();
      material.dispose();
      glowGeo.dispose();
      glowM.material.dispose();
    },
  };
}
