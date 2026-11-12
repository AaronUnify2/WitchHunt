// The crashed UFO's set and the mothership's interior (build queue item 5;
// DESIGN.md "Crashed UFO and the mothership"). SCAFFOLDING: first-pass shapes
// in the ship's own look (clean metal, purple and green light), each one
// baked vertex-coloured mesh plus one unlit mesh for what glows. No lights.
//
// buildCrashedUfo(look) -> { group, mesh, glow, beam, spots, colliders, dispose }:
//   the saucer down on its edge at the end of its own gouge, a rim of light
//   still running round it, and the beam standing off the ground beside it.
//   Model space: Tom arrives from -z; the origin is the clearing's middle.
// buildMothership(look, shape) -> { group, mesh, glow, dispose }: the inside,
//   sections along +z (world/sectionShape.js), the floor at y = 0.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { bakeParts } from './propKit.js';
import { SetBuilder } from './setBuilder.js';

export const UFO = { saucer: { x: 2, z: 7, r: 7.5 }, beam: { x: -6, z: -1, r: 1.5, height: 46 } };

// Unlit pieces, by colour, merged into one mesh.
function glowMesh(pieces) {
  const geos = pieces.map(({ geo, color }) => {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const c = new THREE.Color(color);
    const n = g.getAttribute('position').count;
    const cols = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) cols.set([c.r, c.g, c.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    g.deleteAttribute('uv');
    g.deleteAttribute('normal');
    return g;
  });
  const merged = mergeGeometries(geos);
  geos.forEach((g) => g.dispose());
  return new THREE.Mesh(merged, new THREE.MeshBasicMaterial({ vertexColors: true }));
}

const at = (geo, x, y, z, ry = 0, rx = 0, rz = 0) => geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(1, 1, 1)));

export function buildCrashedUfo(look, { heightAt = null } = {}) {
  const b = new SetBuilder(look, heightAt, 91);
  const c = look.colors;
  const S = UFO.saucer;
  const glow = [];
  // The gouge it cut coming in: a trench of thrown earth along the way Tom walks up.
  for (let i = 0; i < 9; i++) {
    const z = -18 + i * 2.6;
    for (const side of [-1, 1]) {
      b.pushOnGround(S.x + side * (2.4 + b.rand() * 0.8), 0, z, b.rand() * 6);
      b.put(new THREE.DodecahedronGeometry(0.7 + b.rand() * 0.6, 0), c.earth, 0, 0.2, 0);
      b.pop();
    }
  }
  // Snapped and scorched trunks either side.
  for (const [x, z, h] of [[-7, -8, 2.6], [8, -5, 3.4], [10, 3, 1.8], [-9, 9, 4.2], [-3, 15, 2.2]]) {
    b.pushOnGround(x, 0, z, 0, (b.rand() - 0.5) * 0.3, (b.rand() - 0.5) * 0.3);
    b.put(new THREE.CylinderGeometry(0.2, 0.34, h, 7), c.char, 0, h / 2, 0);
    b.post(0, 0, 0, 0.4, h);
    b.pop();
  }
  // The saucer: a lens, down on one edge, a dome on top, a torn panel underneath.
  b.pushOnGround(S.x, 1.5, S.z, 0.4, -0.2, 0.34);
  const lens = new THREE.SphereGeometry(S.r, 28, 10);
  lens.scale(1, 0.2, 1);
  b.put(lens, c.hull, 0, 0, 0);
  const dome = new THREE.SphereGeometry(2.4, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  b.put(dome, c.hullPale, 0, 1.0, 0);
  b.box(2.2, 0.12, 1.4, c.hullDark, 3.2, -1.2, 1.5, 0.5, 0.3, 0.2);
  // its rim light, in segments, some dead
  for (let i = 0; i < 24; i++) {
    if (i % 5 === 3) continue;
    const a = (i / 24) * Math.PI * 2;
    const p = b.point(Math.sin(a) * (S.r - 0.15), 0, Math.cos(a) * (S.r - 0.15));
    glow.push({ geo: at(new THREE.BoxGeometry(0.5, 0.12, 0.2), p.x, p.y, p.z, a + 0.4), color: i % 2 ? look.glow.green : look.glow.purple });
  }
  b.pop();
  b.post(S.x, 0, S.z, S.r * 0.72, 3.5);
  // The beam's pad: a ring of its light pressed into the ground.
  const B = UFO.beam;
  b.pushOnGround(B.x, 0, B.z, 0);
  b.put(new THREE.CylinderGeometry(B.r + 0.5, B.r + 0.7, 0.08, 20), c.hullDark, 0, 0.04, 0);
  b.spot('beam', 0, 0, 0);
  const pad = b.point(0, 0.1, 0);
  b.pop();
  glow.push({ geo: at(new THREE.TorusGeometry(B.r + 0.2, 0.06, 6, 28).rotateX(Math.PI / 2), pad.x, pad.y, pad.z), color: look.glow.green });
  const geometry = bakeParts(b.parts, { weather: null, baseAt: (x, y, z) => b.heightAt(x, z), seed: 91 });
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const glowM = glowMesh(glow);
  // The beam itself: a tall, faint column (added on), brighter at its foot.
  const beamGeo = new THREE.CylinderGeometry(B.r * 0.7, B.r, B.height, 18, 1, true);
  beamGeo.translate(0, B.height / 2, 0);
  const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: look.glow.green, transparent: true, opacity: look.beamOpacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  beam.position.set(pad.x, pad.y, pad.z);
  const group = new THREE.Group();
  group.name = 'crashedUfo';
  group.add(mesh, glowM, beam);
  return {
    group,
    mesh,
    glow: glowM,
    beam,
    spots: b.spots,
    colliders: b.colliders,
    dispose() {
      group.removeFromParent();
      geometry.dispose();
      material.dispose();
      glowM.geometry.dispose();
      glowM.material.dispose();
      beamGeo.dispose();
      beam.material.dispose();
    },
  };
}

export function buildMothership(look, shape, places) {
  const b = new SetBuilder(look, null, 93);
  const c = look.colors;
  const glow = [];
  for (const s of shape.sections) {
    const len = s.z1 - s.z0;
    const mid = (s.z0 + s.z1) / 2;
    b.box(s.half * 2 + 1, 0.3, len, c.deck, 0, -0.15, mid);
    b.box(s.half * 2 + 1, 0.3, len, c.hullDark, 0, s.roof + 0.15, mid);
    for (const side of [-1, 1]) {
      b.box(0.5, s.roof, len, c.hull, side * (s.half + 0.25), s.roof / 2, mid);
      // ribs, and a strip of light down each wall
      for (let z = s.z0 + 1.5; z < s.z1; z += 3) b.box(0.3, s.roof, 0.3, c.hullPale, side * (s.half - 0.05), s.roof / 2, z);
      glow.push({ geo: at(new THREE.BoxGeometry(0.06, 0.1, len - 0.6), side * (s.half - 0.02), s.roof * 0.62, mid), color: side < 0 ? look.glow.purple : look.glow.green });
      glow.push({ geo: at(new THREE.BoxGeometry(0.06, 0.05, len - 0.6), side * (s.half - 0.02), 0.25, mid), color: look.glow.purple });
    }
    // deck plates' seams
    for (let z = s.z0 + 2; z < s.z1; z += 2) b.box(s.half * 2, 0.02, 0.05, c.hullDark, 0, 0.011, z);
    const next = shape.sections[shape.sections.indexOf(s) + 1];
    if (next) {
      const wide = Math.max(s.half, next.half);
      const narrow = Math.min(s.half, next.half);
      const roof = Math.max(s.roof, next.roof);
      for (const side of [-1, 1]) b.box(wide - narrow + 0.5, roof, 0.5, c.hull, side * ((wide + narrow) / 2 + 0.25), roof / 2, s.z1);
      if (s.roof !== next.roof) b.box(narrow * 2, Math.abs(s.roof - next.roof), 0.5, c.hull, 0, (s.roof + next.roof) / 2, s.z1);
      glow.push({ geo: at(new THREE.BoxGeometry(narrow * 2, 0.08, 0.1), 0, Math.min(s.roof, next.roof) - 0.06, s.z1), color: look.glow.green }); // a doorway's lintel
    }
  }
  b.box(shape.maxHalf * 2 + 1, 8, 0.5, c.hull, 0, 4, shape.length + 0.25);
  b.box(shape.maxHalf * 2 + 1, 8, 0.5, c.hull, 0, 4, -0.25);
  // The pad he arrives on, and the core's plinth, and the hangar's cradle.
  const ring = (x, z, r, color) => glow.push({ geo: at(new THREE.TorusGeometry(r, 0.05, 6, 28).rotateX(Math.PI / 2), x, 0.04, z), color });
  ring(places.pad.x, places.pad.z, 1.6, look.glow.green);
  b.put(new THREE.CylinderGeometry(0.9, 1.2, 1.0, 12), c.hullPale, places.core.x, 0.5, places.core.z);
  ring(places.core.x, places.core.z, 1.9, look.glow.purple);
  b.box(3.0, 0.2, 4.0, c.hullDark, places.quad.x, 0.1, places.quad.z);
  ring(places.quad.x, places.quad.z, 2.6, look.glow.green);
  // The hangar: crates of taken things along one wall (a first hint of the greys collecting Americana).
  for (let i = 0; i < 6; i++) b.box(1.2, 1.0 + (i % 3) * 0.4, 1.2, i % 2 ? c.crate : c.crateDark, -shape.sections.at(-1).half + 1.2, 0.5 + (i % 3) * 0.2, places.quad.z - 6 + i * 2.2, (i % 4) * 0.1);
  const geometry = bakeParts(b.parts, { weather: null, seed: 93 });
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  const glowM = glowMesh(glow);
  // The core: an unlit orb with a wider faint shell (taken in play).
  const core = new THREE.Group();
  core.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), new THREE.MeshBasicMaterial({ color: look.glow.core })));
  core.add(new THREE.Mesh(new THREE.SphereGeometry(1.5, 12, 8), new THREE.MeshBasicMaterial({ color: look.glow.core, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false })));
  core.position.set(places.core.x, 1.6, places.core.z);
  const group = new THREE.Group();
  group.name = 'mothership';
  group.add(mesh, glowM, core);
  return {
    group,
    mesh,
    glow: glowM,
    core,
    dispose() {
      group.removeFromParent();
      geometry.dispose();
      material.dispose();
      glowM.geometry.dispose();
      glowM.material.dispose();
      core.children.forEach((m) => {
        m.geometry.dispose();
        m.material.dispose();
      });
    },
  };
}
