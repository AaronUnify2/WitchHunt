// The Bigfoot cave's set (build queue item 3; world/bigfootCaveShape.js).
// SCAFFOLDING: rough rock boxed round the shape, eggs, and a few of Bigfoot's
// things in the last chamber; one baked vertex-coloured mesh, no lights, dull
// colours. Its real dressing (his beadwork, carvings, the nest closing in) is
// for the encounter's design session.
//
// buildBigfootCave(look) returns { group, mesh, eggs: [{ x, z }], dispose }.
// Model space is the cave's frame, the floor at y = 0.

import * as THREE from 'three';
import { bakeParts } from './propKit.js';
import { SetBuilder } from './setBuilder.js';
import { CAVE_SECTIONS, CAVE } from '../world/bigfootCaveShape.js';

export function buildBigfootCave(look) {
  const b = new SetBuilder(look, null, 61);
  const c = look.colors;
  const eggs = [];
  for (const s of CAVE_SECTIONS) {
    const len = s.z1 - s.z0;
    const mid = (s.z0 + s.z1) / 2;
    b.box(s.half * 2 + 2, 0.4, len, c.floor, 0, -0.2, mid);
    b.box(s.half * 2 + 2, 0.6, len, c.roof, 0, s.roof + 0.3, mid);
    // Walls: slabs leaning in a little, broken into lengths so they read as rock, not a corridor.
    for (const side of [-1, 1]) {
      for (let z = s.z0; z < s.z1; z += 4) {
        const l = Math.min(4, s.z1 - z);
        const jut = b.rand() * 0.5;
        b.box(1.6, s.roof + 0.6, l + 0.3, b.rand() < 0.5 ? c.rock : c.rockDark, side * (s.half + 0.8 - jut), s.roof / 2, z + l / 2, (b.rand() - 0.5) * 0.12, 0, side * 0.06);
      }
    }
    // The step where the cave opens out or closes in: rock across the difference.
    const next = CAVE_SECTIONS[CAVE_SECTIONS.indexOf(s) + 1];
    if (next) {
      const wide = Math.max(s.half, next.half);
      const narrow = Math.min(s.half, next.half);
      const roof = Math.max(s.roof, next.roof);
      for (const side of [-1, 1]) b.box(wide - narrow + 1.6, roof + 0.6, 1.2, c.rockDark, side * ((wide + narrow) / 2 + 0.8), roof / 2, s.z1);
      if (s.roof !== next.roof) b.box(narrow * 2, Math.abs(s.roof - next.roof), 1.0, c.rock, 0, (s.roof + next.roof) / 2 + 0.3, s.z1);
    }
    // Lumps on the floor against the walls.
    for (let i = 0; i < Math.round(len / 3); i++) {
      const side = b.rand() < 0.5 ? -1 : 1;
      const r = 0.25 + b.rand() * 0.5;
      b.put(new THREE.DodecahedronGeometry(r, 0), c.rockDark, side * (s.half - r * 0.6), r * 0.4, s.z0 + b.rand() * len, b.rand() * 6);
    }
  }
  b.box(CAVE.maxHalf * 2, 8, 1.2, c.rockDark, 0, 3.5, CAVE.length + 0.6); // the back wall
  // The Mothman's eggs: clutches in the egg chamber, a few in the tunnel and the throat.
  const clutch = (x, z, n) => {
    for (let i = 0; i < n; i++) {
      const ex = x + (b.rand() - 0.5) * 1.6;
      const ez = z + (b.rand() - 0.5) * 1.6;
      const r = 0.22 + b.rand() * 0.14;
      const g = new THREE.SphereGeometry(r, 8, 6);
      g.scale(1, 1.45, 1);
      b.put(g, b.rand() < 0.3 ? c.eggDark : c.egg, ex, r * 1.2, ez, 0, (b.rand() - 0.5) * 0.5, (b.rand() - 0.5) * 0.5);
    }
    eggs.push({ x, z });
  };
  for (const [x, z, n] of [[-4.2, 25, 7], [4.4, 27.5, 8], [-3.6, 31.5, 6], [3.8, 33.5, 7], [0.4, 29.5, 5], [1.5, 14, 3], [-1.5, 40, 3], [6.5, 47, 5], [-7, 58, 4]]) clutch(x, z, n);
  // Bigfoot's home, what's left of it, in the last chamber: a hearth ring, carved posts, a woven mat, a rack of tools.
  const h = CAVE.hearth;
  for (let i = 0; i < 9; i++) b.put(new THREE.DodecahedronGeometry(0.2, 0), c.rockDark, h.x + Math.sin(i * 0.7) * 0.8, 0.12, h.z + Math.cos(i * 0.7) * 0.8, i);
  b.box(1.0, 0.06, 1.0, c.ash, h.x, 0.03, h.z, 0.4);
  b.box(2.6, 0.04, 1.7, c.mat, h.x - 0.4, 0.03, h.z + 3, 0.2);
  for (const [x, z, ht] of [[h.x - 2.4, h.z + 1.2, 2.4], [h.x - 2.6, h.z + 4.4, 1.9], [h.x + 1.8, h.z + 5.2, 2.7]]) {
    b.put(new THREE.CylinderGeometry(0.16, 0.2, ht, 7), c.wood, x, ht / 2, z);
    b.box(0.5, 0.14, 0.12, c.wood, x, ht * 0.75, z, 0.3);
    b.put(new THREE.DodecahedronGeometry(0.22, 0), c.woodPale, x, ht + 0.15, z, 1);
  }
  b.box(0.06, 1.5, 0.06, c.wood, h.x + 3.2, 0.75, h.z + 1.2);
  b.box(0.06, 1.5, 0.06, c.wood, h.x + 4.6, 0.75, h.z + 1.2);
  b.box(1.5, 0.05, 0.05, c.wood, h.x + 3.9, 1.4, h.z + 1.2);
  for (let i = 0; i < 4; i++) b.box(0.04, 0.5 + (i % 2) * 0.2, 0.04, c.woodPale, h.x + 3.4 + i * 0.35, 1.1, h.z + 1.2, 0, 0, 0.1);
  const geometry = bakeParts(b.parts, { weather: null, seed: 61 });
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  const group = new THREE.Group();
  group.name = 'bigfootCave';
  group.add(mesh);
  return {
    group,
    mesh,
    eggs,
    dispose() {
      group.removeFromParent();
      geometry.dispose();
      material.dispose();
    },
  };
}
