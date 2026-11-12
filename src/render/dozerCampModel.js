// The clearing crew's camp at the end of the cordon strip (build queue item 1;
// DESIGN.md "Bigfoot cave and the Mothman fight": "Tom follows the military's
// cordon strip to find the military's dozer, the machine that cut it, parked
// where the clearing crew stopped"). The army's engineers cut the strip for
// the cordon fence, tree by tree, until the night nobody came back to the
// machine. All in code, baked into ONE vertex-coloured mesh (render/propKit.js,
// render/setBuilder.js) plus one small mesh that's taken in play (the spare
// battery). No lights; dull colours (the glare rule).
//
//  - the cut: stumps sawn low across the strip behind, sawdust round each,
//    survey stakes with tape down both edges;
//  - the dozer's place, its blade against the first tree they didn't fell (the
//    dozer itself is the game's Dozer, placed on `dozer` by the encounter);
//  - two trunks felled and not yet bucked, lying where they dropped ahead;
//  - log decks either side, stacked and chained;
//  - the crew's ridge tent with a folding table and two cots, and their steel
//    job box beside it (the keys);
//  - a generator on skids with a dead light mast, and the charger's lead to a
//    spare battery on a pallet (the dozer's own is flat);
//  - fuel drums, one tipped, and jerry cans.
//
// Model space: Tom arrives from -z, up the cut; the uncut forest is ahead
// (+z); the origin is the clearing's middle; +x is his left as he walks in
// (three.js turns +z ahead with +x left: world/DozerCampSite.js converts).
//
// buildDozerCamp(look, { weather, heightAt }) returns { group, mesh, battery,
// spots, colliders, dispose }.

import * as THREE from 'three';
import { bakeParts } from './propKit.js';
import { SetBuilder } from './setBuilder.js';

// The set's measurements (metres, model space).
export const DOZER_CAMP = {
  dozer: { x: 0.5, z: 6.5 }, // the machine, its blade toward +z
  strip: { half: 12.5, back: -19, front: 11 }, // the cut: between the stake lines, from the way in to the standing trees
  tent: { x: -8.6, z: 4.5, w: 3.4, d: 4.6, wall: 1.0, ridge: 2.2, yaw: 0.12 },
  box: { x: -5.9, z: 6.4, yaw: 0.3 },
  generator: { x: 8.2, z: 6.2, yaw: -0.25 },
  battery: { x: 6.7, z: 5.3 },
  drums: { x: 9.6, z: 1.6 },
  decks: [
    { x: -9.5, z: -6.5, yaw: 0.06, layers: 3, length: 7 },
    { x: 9.2, z: -8.5, yaw: -0.05, layers: 4, length: 8 },
  ],
  felled: [
    { x: -3.6, z: 13.2, yaw: 1.25, length: 13, r: 0.34 },
    { x: 5.2, z: 14.6, yaw: -1.05, length: 11, r: 0.3 },
  ],
};

export function buildDozerCamp(look, { weather = null, heightAt = null } = {}) {
  const b = new SetBuilder(look, heightAt, 34);
  const c = look.colors;
  const C = DOZER_CAMP;

  // ---- the cut: stumps and sawdust ----
  const stumps = [];
  for (let i = 0; i < 26; i++) {
    const x = (b.rand() * 2 - 1) * (C.strip.half - 1.2);
    const z = C.strip.back + b.rand() * (C.strip.front - C.strip.back - 1);
    // Keep the way in, the dozer and the camp's pieces clear.
    if (Math.abs(x) < 2.6 && z < 3) continue;
    if (Math.hypot(x - C.dozer.x, z - C.dozer.z) < 4.6) continue;
    if (Math.hypot(x - C.tent.x, z - C.tent.z) < 4.2 || Math.hypot(x - C.generator.x, z - C.generator.z) < 2.6) continue;
    if (C.decks.some((d) => Math.abs(x - d.x) < 2.6 && Math.abs(z - d.z) < d.length / 2 + 1)) continue;
    if (stumps.some((s) => Math.hypot(s.x - x, s.z - z) < 2.4)) continue;
    stumps.push({ x, z, r: 0.28 + b.rand() * 0.22, h: 0.22 + b.rand() * 0.2 });
  }
  for (const s of stumps) {
    b.pushOnGround(s.x, 0, s.z, b.rand() * 6.3, (b.rand() - 0.5) * 0.08, (b.rand() - 0.5) * 0.08);
    b.put(new THREE.CylinderGeometry(s.r, s.r * 1.25, s.h + 0.3, 9), c.bark, 0, (s.h - 0.3) / 2 + 0.15, 0);
    b.put(new THREE.CylinderGeometry(s.r * 0.94, s.r * 0.94, 0.03, 9), c.cut, 0, s.h + 0.3, 0); // the sawn face
    b.put(new THREE.CylinderGeometry(s.r * 2.4, s.r * 2.8, 0.035, 10), c.sawdust, 0.1, 0.02, 0.1);
    b.pop();
  }

  // ---- survey stakes and tape down both edges ----
  for (const side of [-1, 1]) {
    let last = null;
    for (let z = C.strip.back; z <= C.strip.front; z += 6) {
      const x = side * (C.strip.half + (b.rand() - 0.5) * 0.3);
      b.pushOnGround(x, 0, z, 0, (b.rand() - 0.5) * 0.12, (b.rand() - 0.5) * 0.12);
      b.box(0.045, 1.1, 0.045, c.stake, 0, 0.55, 0);
      b.box(0.05, 0.14, 0.05, c.tape, 0, 1.05, 0);
      const top = b.point(0, 0.98, 0);
      b.pop();
      if (last) {
        // the tape, sagging between two stakes: two straight runs to a low middle
        const mid = new THREE.Vector3((last.x + top.x) / 2, (last.y + top.y) / 2 - 0.22, (last.z + top.z) / 2);
        for (const [p, q] of [[last, mid], [mid, top]]) {
          const d = new THREE.Vector3().subVectors(q, p);
          const len = d.length();
          b.push((p.x + q.x) / 2, (p.y + q.y) / 2, (p.z + q.z) / 2, Math.atan2(d.x, d.z), -Math.asin(d.y / len));
          b.box(0.012, 0.045, len, c.tape, 0, 0, 0);
          b.pop();
        }
      }
      last = top;
    }
  }

  // ---- log decks: stacked, chocked, a chain over ----
  for (const d of C.decks) {
    b.pushOnGround(d.x, 0, d.z, d.yaw);
    b.box(0.16, 0.16, 2.6, c.cut, 0, 0.08, -d.length / 2 + 1.0, Math.PI / 2); // bunks under it
    b.box(0.16, 0.16, 2.6, c.cut, 0, 0.08, d.length / 2 - 1.0, Math.PI / 2);
    const r = 0.27;
    for (let layer = 0; layer < d.layers; layer++) {
      const n = 4 - layer;
      if (n <= 0) break;
      for (let i = 0; i < n; i++) {
        const x = (i - (n - 1) / 2) * r * 2.04;
        const y = 0.16 + r + layer * r * 1.76;
        const len = d.length - b.rand() * 0.9;
        b.put(new THREE.CylinderGeometry(r * (0.9 + b.rand() * 0.12), r, len, 9).rotateX(Math.PI / 2), c.bark, x, y, (b.rand() - 0.5) * 0.4);
        b.put(new THREE.CylinderGeometry(r * 0.88, r * 0.88, 0.02, 9).rotateX(Math.PI / 2), c.cut, x, y, -len / 2 - 0.012);
        b.put(new THREE.CylinderGeometry(r * 0.88, r * 0.88, 0.02, 9).rotateX(Math.PI / 2), c.cut, x, y, len / 2 + 0.012);
      }
    }
    const top = 0.16 + d.layers * r * 1.76 + 0.2;
    b.box(0.03, 0.03, 2.3, c.iron, 0, top - 0.1, 0.6, Math.PI / 2); // the chain's run over the top
    b.wall(-1.1, -d.length / 2, -1.1, d.length / 2, 0, 0.25, top);
    b.wall(1.1, -d.length / 2, 1.1, d.length / 2, 0, 0.25, top);
    b.wall(0, -d.length / 2, 0, d.length / 2, 0, 0.8, top);
    b.pop();
  }

  // ---- two felled trunks ahead, not yet bucked: limbs still on ----
  for (const f of C.felled) {
    b.pushOnGround(f.x, f.r * 0.9, f.z, f.yaw, 0.02);
    b.put(new THREE.CylinderGeometry(f.r * 0.55, f.r, f.length, 9).rotateX(Math.PI / 2), c.bark, 0, 0, 0);
    b.put(new THREE.CylinderGeometry(f.r * 0.95, f.r * 0.95, 0.02, 9).rotateX(Math.PI / 2), c.cut, 0, 0, f.length / 2 + 0.012);
    for (let i = 0; i < 7; i++) {
      const z = -f.length / 2 + 1 + b.rand() * (f.length * 0.6);
      const L = 1.2 + b.rand() * 1.6;
      b.push(0, 0, z, b.rand() * 6.3, 0, 0.9 + b.rand() * 0.5);
      b.put(new THREE.CylinderGeometry(0.03, 0.07, L, 5), c.bark, 0, L / 2, 0);
      b.put(new THREE.ConeGeometry(0.5, L * 0.7, 6), c.needles, 0, L * 0.7, 0);
      b.pop();
    }
    b.wall(0, -f.length / 2, 0, f.length / 2, 0, f.r, f.r * 2 + 0.2, false);
    b.pop();
  }
  // The hinge of the next one: a notch cut in the tree the blade's against, the saw still in it.
  b.pushOnGround(C.dozer.x + 0.2, 0, C.strip.front + 1.6, 0.2);
  b.put(new THREE.CylinderGeometry(0.4, 0.52, 3.4, 9), c.bark, 0, 1.7, 0);
  b.box(0.5, 0.16, 0.3, c.cut, 0, 0.75, -0.36, 0, 0.5);
  b.box(0.34, 0.2, 0.2, c.saw, 0.05, 0.95, -0.72); // the chainsaw's body, left in the cut
  b.box(0.05, 0.09, 0.62, c.iron, 0.05, 0.9, -0.4);
  b.post(0, 0, 0, 0.55, 3.4);
  b.pop();

  // ---- the crew's tent: olive canvas on a ridge pole, the front flaps tied back ----
  {
    const T = C.tent;
    b.pushOnGround(T.x, 0, T.z, T.yaw);
    const hw = T.w / 2;
    const hd = T.d / 2;
    const slope = Math.hypot(hw, T.ridge - T.wall);
    const pitch = Math.atan2(T.ridge - T.wall, hw);
    for (const s of [-1, 1]) {
      b.box(0.04, T.wall, T.d, c.canvas, s * hw, T.wall / 2, 0); // side walls
      b.box(slope + 0.12, 0.035, T.d + 0.2, c.canvas, (s * hw) / 2, (T.wall + T.ridge) / 2, 0, 0, 0, -s * pitch); // the roof's two falls
      b.box(0.06, T.ridge, 0.06, c.pole, 0, T.ridge / 2, s * hd); // the two uprights
      for (const e of [-1, 1]) b.box(0.02, 0.02, 1.5, c.rope, s * (hw + 0.55), 0.5, e * (hd - 0.3), 0, 0, s * 0.9); // guy lines
    }
    b.box(0.07, 0.07, T.d + 0.3, c.pole, 0, T.ridge, 0); // the ridge pole
    b.box(T.w, T.ridge - 0.15, 0.03, c.canvas, 0, (T.ridge - 0.15) / 2, hd); // the back wall
    // inside: two cots, a folding table with a map case and a mug, a field phone
    for (const s of [-1, 1]) {
      b.box(0.72, 0.06, 1.9, c.cot, s * 1.05, 0.4, 0.9);
      b.box(0.7, 0.3, 0.04, c.pole, s * 1.05, 0.2, 0.0);
      b.box(0.7, 0.3, 0.04, c.pole, s * 1.05, 0.2, 1.8);
      b.box(0.6, 0.1, 0.5, c.blanket, s * 1.05, 0.48, 1.5, 0.2);
    }
    b.box(0.9, 0.04, 0.6, c.table, 0, 0.72, -1.5);
    for (const [x, z] of [[-0.4, -1.75], [0.4, -1.75], [-0.4, -1.25], [0.4, -1.25]]) b.box(0.03, 0.72, 0.03, c.iron, x, 0.36, z);
    b.box(0.34, 0.03, 0.24, c.paper, -0.15, 0.755, -1.5, 0.2);
    b.box(0.2, 0.14, 0.12, c.radio, 0.28, 0.81, -1.55, -0.3);
    b.spot('tent', 0, 0, -hd - 1.2);
    b.wall(-hw, -hd, -hw, hd, 0, 0.12, T.ridge);
    b.wall(hw, -hd, hw, hd, 0, 0.12, T.ridge);
    b.wall(-hw, hd, hw, hd, 0, 0.12, T.ridge);
    b.pop();
  }

  // ---- the job box: a steel chest, its hasp hanging open ----
  b.pushOnGround(C.box.x, 0, C.box.z, C.box.yaw);
  b.box(1.25, 0.55, 0.6, c.steel, 0, 0.3, 0);
  b.box(1.29, 0.07, 0.64, c.steelDark, 0, 0.6, 0, 0, -0.06);
  b.box(0.08, 0.12, 0.03, c.iron, 0, 0.42, -0.31);
  for (const s of [-1, 1]) b.box(0.05, 0.05, 0.56, c.steelDark, s * 0.55, 0.03, 0);
  b.spot('box', 0, 0.6, -0.9);
  b.post(0, 0, 0, 0.62, 0.65);
  b.pop();

  // ---- the generator on skids, its light mast dead, and the charger ----
  b.pushOnGround(C.generator.x, 0, C.generator.z, C.generator.yaw);
  b.box(0.12, 0.1, 1.9, c.steelDark, -0.45, 0.05, 0);
  b.box(0.12, 0.1, 1.9, c.steelDark, 0.45, 0.05, 0);
  b.box(1.0, 0.75, 1.5, c.plant, 0, 0.5, 0);
  b.box(0.9, 0.5, 0.03, c.steelDark, 0, 0.52, -0.76); // the louvred end
  b.box(0.3, 0.2, 0.28, c.steelDark, 0, 0.98, 0.4); // the filler and the cap
  b.box(0.07, 0.3, 0.07, c.iron, 0.3, 1.02, -0.4); // the exhaust stub
  b.box(0.09, 5.2, 0.09, c.steelDark, 0, 2.6 + 0.85, 0.6, 0, 0.03); // the mast
  b.box(1.3, 0.08, 0.08, c.steelDark, 0, 5.9, 0.75);
  for (const x of [-0.5, 0, 0.5]) b.box(0.34, 0.26, 0.2, c.lampDead, x, 5.72, 0.83, 0, 0.5);
  b.box(0.34, 0.24, 0.2, c.charger, -0.75, 0.22, -0.3); // the battery charger on the ground beside it
  b.post(0, 0, 0, 0.95, 1.3);
  b.pop();
  // The pallet the spare battery sits on (the battery is its own mesh: it's taken).
  b.pushOnGround(C.battery.x, 0, C.battery.z, 0.4);
  b.box(1.0, 0.03, 0.8, c.cut, 0, 0.13, 0);
  for (const z of [-0.33, 0, 0.33]) b.box(1.0, 0.1, 0.09, c.cut, 0, 0.05, z);
  b.box(0.015, 0.015, 1.3, c.cable, -0.5, 0.03, 0.2, 0.9); // the charger's lead
  b.spot('battery', 0, 0.3, -0.8);
  const batteryAt = b.point(0, 0.15, 0);
  b.pop();

  // ---- fuel drums and jerry cans ----
  b.pushOnGround(C.drums.x, 0, C.drums.z, 0.3);
  for (const [x, z] of [[0, 0], [0.64, 0.1], [0.3, 0.6]]) {
    b.put(new THREE.CylinderGeometry(0.29, 0.29, 0.88, 12), c.drum, x, 0.44, z);
    b.put(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 12), c.steelDark, x, 0.3, z);
    b.put(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 12), c.steelDark, x, 0.6, z);
  }
  b.put(new THREE.CylinderGeometry(0.29, 0.29, 0.88, 12).rotateZ(Math.PI / 2), c.drum, -1.1, 0.29, 0.4, 0.5); // one tipped
  for (const [x, z] of [[1.3, -0.2], [1.3, 0.2], [1.62, 0.0]]) b.box(0.16, 0.42, 0.3, c.jerry, x, 0.21, z, b.rand() * 0.4);
  b.post(0.3, 0, 0.25, 0.75, 0.9);
  b.pop();

  // The dozer's own place, and where the sweep looks from.
  b.pushOnGround(C.dozer.x, 0, C.dozer.z, 0);
  b.spot('dozer', 0, 0, 0);
  b.pop();

  const geometry = bakeParts(b.parts, { weather, baseAt: (x, y, z) => b.heightAt(x, z), seed: 34 });
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  // The spare battery (taken in play): a dark case, two terminals, the charger's clamps on them.
  const bat = new SetBuilder(look, null, 3);
  bat.box(0.32, 0.22, 0.18, c.battery, 0, 0.11, 0);
  bat.box(0.3, 0.02, 0.16, c.steelDark, 0, 0.225, 0);
  bat.box(0.03, 0.04, 0.03, c.iron, -0.1, 0.25, 0);
  bat.box(0.03, 0.04, 0.03, c.iron, 0.1, 0.25, 0);
  const batGeo = bakeParts(bat.parts, { weather: null, seed: 5 });
  const battery = new THREE.Mesh(batGeo, material);
  battery.position.copy(batteryAt);
  battery.rotation.y = 0.4;
  battery.castShadow = true;
  const group = new THREE.Group();
  group.name = 'dozerCamp';
  group.add(mesh, battery);
  return {
    group,
    mesh,
    battery,
    spots: b.spots,
    colliders: b.colliders,
    stumps: stumps.length,
    dispose() {
      group.removeFromParent();
      geometry.dispose();
      batGeo.dispose();
      material.dispose();
    },
  };
}
