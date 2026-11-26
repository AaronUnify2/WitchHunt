// The crashed UFO's set (build queue item 5) and the mothership's interior
// (Nov 26: rebuilt as the tower climb after Aaron's four concept pictures;
// world/mothershipTower.js is the layout this draws, solid for solid).
//
// buildCrashedUfo(look) -> { group, mesh, glow, beam, spots, colliders, dispose }:
//   the saucer down on its edge at the end of its own gouge, a rim of light
//   still running round it, and the beam standing off the ground beside it.
//   Model space: Tom arrives from -z; the origin is the clearing's middle.
//
// buildMothership(look, ship) -> { group, core, setCore(on), setReactor(k), setZoneAlert(zone, on),
//   setLift(h), setLooted(id), update(dt, camera), dispose }: the inside, in the ship's frame (the shaft's
//   axis at the origin, deck 0 at y = 0). The look of the pictures: dark navy and purple metal, cyan
//   tube lights, circuit lines, the reactor's glass column glowing up the middle, energy nets you see
//   through, red alarm strips by zone. One baked vertex-coloured mesh (its light baked in: the reactor's
//   glow, the wall lights; no lights added, so nothing recompiles on the way in), one unlit mesh for what
//   glows, a few see-through ones (the nets, the glass), and the Earth and the stars drawn behind
//   everything, round the camera (seen through the lounge's windows, the hangar's field, the porthole).

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { bakeParts } from './propKit.js';
import { SetBuilder } from './setBuilder.js';

export const UFO = { saucer: { x: 2, z: 7, r: 7.5 }, beam: { x: -6, z: -1, r: 1.5, height: 46 } };
const TAU = Math.PI * 2;

// Unlit pieces, by colour, merged into one mesh.
function glowMesh(pieces, material = null) {
  if (!pieces.length) return new THREE.Mesh(new THREE.BufferGeometry(), material ?? new THREE.MeshBasicMaterial());
  const geos = pieces.map(({ geo, color }) => {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const c = new THREE.Color(color);
    const n = g.getAttribute('position').count;
    const cols = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) cols.set([c.r, c.g, c.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    if (g.getAttribute('uv')) g.deleteAttribute('uv');
    if (g.getAttribute('normal')) g.deleteAttribute('normal');
    return g;
  });
  const merged = mergeGeometries(geos);
  geos.forEach((g) => g.dispose());
  return new THREE.Mesh(merged, material ?? new THREE.MeshBasicMaterial({ vertexColors: true }));
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

// ---- the mothership ---------------------------------------------------------------------------------

const P = (r, a, y) => new THREE.Vector3(r * Math.sin(a), y, r * Math.cos(a));

// An annulus sector as a solid (flat faces): r0..r1, a0..a1 (from +z toward +x), y0..y1.
export function sectorGeo(r0, r1, a0, a1, y0, y1, { top = true, bottom = true, inner = true, outer = true, ends = true, step = TAU / 72 } = {}) {
  const n = Math.max(1, Math.ceil((a1 - a0) / step));
  const pos = [];
  const tri = (a, b, c, want) => {
    const ab = new THREE.Vector3().subVectors(b, a);
    const ac = new THREE.Vector3().subVectors(c, a);
    const nrm = new THREE.Vector3().crossVectors(ab, ac);
    if (want && nrm.dot(want) < 0) pos.push(a.x, a.y, a.z, c.x, c.y, c.z, b.x, b.y, b.z);
    else pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  };
  const quad = (a, b, c, d, want) => {
    tri(a, b, c, want);
    tri(a, c, d, want);
  };
  const up = new THREE.Vector3(0, 1, 0);
  const down = new THREE.Vector3(0, -1, 0);
  for (let i = 0; i < n; i++) {
    const t0 = a0 + ((a1 - a0) * i) / n;
    const t1 = a0 + ((a1 - a0) * (i + 1)) / n;
    const tm = (t0 + t1) / 2;
    const out = new THREE.Vector3(Math.sin(tm), 0, Math.cos(tm));
    if (top) quad(P(r0, t0, y1), P(r1, t0, y1), P(r1, t1, y1), P(r0, t1, y1), up);
    if (bottom) quad(P(r0, t0, y0), P(r1, t0, y0), P(r1, t1, y0), P(r0, t1, y0), down);
    if (outer) quad(P(r1, t0, y0), P(r1, t1, y0), P(r1, t1, y1), P(r1, t0, y1), out);
    if (inner && r0 > 0.01) quad(P(r0, t0, y0), P(r0, t1, y0), P(r0, t1, y1), P(r0, t0, y1), out.clone().negate());
  }
  if (ends && a1 - a0 < TAU - 1e-6) {
    for (const [t, s] of [[a0, -1], [a1, 1]]) {
      const tan = new THREE.Vector3(Math.cos(t), 0, -Math.sin(t)).multiplyScalar(s);
      quad(P(r0, t, y0), P(r1, t, y0), P(r1, t, y1), P(r0, t, y1), tan);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

// The light baked into the ship's colours: the reactor's cyan glow off everything near the column, a pool
// under each ring of wall lights, the rooms' ceiling lights; undersides darker. tint: the glow's colour.
function bakeLight(geometry, tint, wallTint) {
  const pos = geometry.getAttribute('position');
  const nor = geometry.getAttribute('normal');
  const col = geometry.getAttribute('color');
  const t = new THREE.Color(tint);
  const w = new THREE.Color(wallTint);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const ny = nor ? nor.getY(i) : 0;
    const r = Math.hypot(x, z);
    let k = 0.8;
    if (ny < -0.5) k *= 0.55;
    else if (ny > 0.5) k *= 1.05;
    let glow = 0;
    let wall = 0;
    if (r < 16 && y < 46) {
      glow = 0.5 * Math.exp(-Math.max(0, r - 3) / 5.5);
      const dy = ((y % 9) + 9) % 9;
      wall = 0.35 * Math.exp(-Math.abs(dy - 2.6) / 1.6) * Math.exp(-Math.max(0, 15 - r) / 3.5);
    } else {
      wall = 0.18; // the rooms: their ceiling lights, all over
    }
    const cr = col.getX(i) * k + t.r * glow * 0.45 + w.r * wall * 0.5;
    const cg = col.getY(i) * k + t.g * glow * 0.45 + w.g * wall * 0.5;
    const cb = col.getZ(i) * k + t.b * glow * 0.45 + w.b * wall * 0.5;
    col.setXYZ(i, cr, cg, cb);
  }
  col.needsUpdate = true;
}

export function buildMothership(look, ship) {
  const b = new SetBuilder(look, null, 93);
  const c = look.colors;
  const g = look.glow;
  const glow = [];
  const nets = [];
  const glass = [];
  const strips = new Map(); // zone -> [geo]
  const putGeo = (geo, color) => {
    const g2 = geo.index ? geo.toNonIndexed() : geo;
    if (g2 !== geo) geo.dispose();
    if (g2.getAttribute('uv')) g2.deleteAttribute('uv');
    if (!b.parts.has(color)) b.parts.set(color, []);
    b.parts.get(color).push(g2);
  };
  const glowBox = (w, h, d, color, x, y, z, ry = 0, rx = 0) => glow.push({ geo: at(new THREE.BoxGeometry(w, h, d), x, y, z, ry, rx), color });

  // ---- each solid, drawn by its style ----
  for (const s of ship.solids) {
    switch (s.style) {
      case 'floor':
        if (s.kind === 'cyl') putGeo(at(new THREE.CircleGeometry(s.r, 72).rotateX(-Math.PI / 2), s.x, s.y1, s.z), c.deck);
        else b.box(s.hx * 2, s.y1 - s.y0, s.hz * 2, c.deckDark, s.x, (s.y0 + s.y1) / 2, s.z, s.a ?? 0);
        break;
      case 'roof':
        putGeo(at(new THREE.CircleGeometry(s.r, 72).rotateX(Math.PI / 2), s.x, s.y0, s.z), c.hullDark);
        break;
      case 'column':
        break; // the reactor, below
      case 'catwalk':
        putGeo(sectorGeo(s.r0, s.r1, s.a0, s.a1, s.y0, s.y1), c.deck);
        glow.push({ geo: sectorGeo(s.r1 - 0.06, s.r1 + 0.005, s.a0, s.a1, s.y1 - 0.12, s.y1 + 0.01, { bottom: false, inner: false, ends: false }), color: g.cyan });
        break;
      case 'balcony':
        if (s.kind === 'ring') {
          putGeo(sectorGeo(s.r0, s.r1, s.a0, s.a1, s.y0, s.y1), c.deck);
          glow.push({ geo: sectorGeo(s.r0 - 0.005, s.r0 + 0.06, s.a0, s.a1, s.y1 - 0.12, s.y1 + 0.01, { bottom: false, outer: false, ends: false }), color: g.purple });
          // plates: a seam every 10 degrees
          for (let a = Math.ceil(s.a0 / (TAU / 36)) * (TAU / 36); a < s.a1; a += TAU / 36) {
            const m = P((s.r0 + s.r1) / 2, a, s.y1 + 0.005);
            b.box(0.05, 0.012, s.r1 - s.r0, c.deckDark, m.x, m.y, m.z, a);
          }
        } else b.box(s.hx * 2, s.y1 - s.y0, s.hz * 2, c.deck, s.x, (s.y0 + s.y1) / 2, s.z, s.a ?? 0);
        break;
      case 'net': {
        nets.push(sectorGeo(s.r0, s.r1, s.a0, s.a1, s.y1 - 0.02, s.y1 - 0.02, { bottom: false, inner: false, outer: false, ends: false }));
        // its grid: radial lines every 7.5 degrees, rings every 1.5 m; a bright edge where it meets the catwalk and balcony
        for (let a = Math.ceil(s.a0 / (TAU / 48)) * (TAU / 48); a < s.a1; a += TAU / 48) {
          const m = P((s.r0 + s.r1) / 2, a, s.y1 - 0.02);
          glowBox(0.03, 0.02, s.r1 - s.r0, g.cyanDim, m.x, m.y, m.z, a);
        }
        for (let r = s.r0 + 1.5; r < s.r1 - 0.2; r += 1.5) glow.push({ geo: sectorGeo(r - 0.015, r + 0.015, s.a0, s.a1, s.y1 - 0.03, s.y1 - 0.01, { bottom: false, ends: false }), color: g.cyanDim });
        break;
      }
      case 'rail':
        drawRail(b, glow, s, c, g);
        break;
      case 'stair':
        drawSteps(b, s, c);
        break;
      case 'disc': {
        const h = s.y1 - s.y0;
        b.put(new THREE.CylinderGeometry(s.r, s.r * 0.86, h, 24), c.hullPale, s.x, (s.y0 + s.y1) / 2, s.z);
        glow.push({ geo: at(new THREE.TorusGeometry(s.r - 0.02, 0.045, 6, 32).rotateX(Math.PI / 2), s.x, s.y1 + 0.01, s.z), color: g.cyan });
        glow.push({ geo: at(new THREE.CircleGeometry(s.r * 0.6, 24).rotateX(Math.PI / 2), s.x, s.y0 - 0.01, s.z), color: g.cyan });
        glow.push({ geo: at(new THREE.CircleGeometry(s.r * 0.3, 16).rotateX(-Math.PI / 2), s.x, s.y1 + 0.012, s.z), color: g.cyanDim });
        break;
      }
      case 'bridge':
        b.box(s.hx * 2, s.y1 - s.y0, s.hz * 2, c.deck, s.x, (s.y0 + s.y1) / 2, s.z, s.a ?? 0);
        b.push(s.x, s.y1, s.z, s.a ?? 0);
        for (const side of [-1, 1]) glow.push({ geo: at(new THREE.BoxGeometry(0.06, 0.02, s.hz * 2), ...b.point(side * (s.hx - 0.05), 0.01, 0).toArray(), s.a ?? 0), color: g.cyan });
        b.pop();
        break;
      case 'corridor':
      case 'lounge':
      case 'workshop':
      case 'hangar':
        b.box(s.hx * 2, s.y1 - s.y0, s.hz * 2, s.style === 'corridor' ? c.deckDark : c.deck, s.x, (s.y0 + s.y1) / 2, s.z, s.a ?? 0);
        if (s.style !== 'corridor') floorLines(glow, s, g);
        break;
      case 'wall':
        drawWall(b, s, c, ship);
        break;
      case 'ceiling':
        b.box(s.hx * 2, s.y1 - s.y0, s.hz * 2, c.hullDark, s.x, (s.y0 + s.y1) / 2, s.z, s.a ?? 0);
        break;
      case 'hull':
        drawHull(b, glow, s, c, g);
        break;
      case 'conduit':
        glow.push({ geo: at(new THREE.CylinderGeometry(s.r * 0.8, s.r * 0.8, s.y1 - s.y0 - 0.9, 16), s.x, (s.y0 + s.y1) / 2, s.z), color: g.cyan });
        b.put(new THREE.CylinderGeometry(s.r + 0.08, s.r + 0.12, 0.45, 16), c.hullDark, s.x, s.y0 + 0.22, s.z);
        b.put(new THREE.CylinderGeometry(s.r + 0.12, s.r + 0.08, 0.45, 16), c.hullDark, s.x, s.y1 - 0.22, s.z);
        glass.push(at(new THREE.CylinderGeometry(s.r, s.r, s.y1 - s.y0 - 0.9, 16, 1, true), s.x, (s.y0 + s.y1) / 2, s.z));
        break;
      case 'window':
        drawWindow(b, glass, s, c);
        break;
      case 'field':
        glass.push(at(new THREE.PlaneGeometry(s.hz * 2, s.y1 - s.y0).rotateY(Math.PI / 2), s.x - 0.2, (s.y0 + s.y1) / 2, s.z));
        glowBox(0.06, 0.06, s.hz * 2, g.cyan, s.x - 0.25, s.y0 + 0.05, s.z);
        glowBox(0.06, 0.06, s.hz * 2, g.cyan, s.x - 0.25, s.y1 - 0.1, s.z);
        break;
      case 'sofa':
        drawSofa(b, s, c);
        break;
      case 'console':
        drawConsole(b, glow, s, c, g);
        break;
      case 'bench':
        drawBench(b, glow, s, c, g);
        break;
      case 'shelf':
        drawShelf(b, s, c);
        break;
      case 'crate':
        b.box(s.hx * 2, s.y1 - s.y0, s.hz * 2, c.crate, s.x, (s.y0 + s.y1) / 2, s.z, s.a ?? 0);
        b.push(s.x, s.y1, s.z, s.a ?? 0);
        glow.push({ geo: at(new THREE.BoxGeometry(s.hx * 2 + 0.02, 0.04, 0.06), ...b.point(0, -0.25, s.hz + 0.005).toArray(), s.a ?? 0), color: g.purple });
        b.pop();
        break;
      case 'lift':
        b.box(3.0, 0.16, 3.8, c.liftDark, s.x, s.y0 + 0.08, s.z); // its base on the floor (the top moves: below)
        break;
      default:
        break;
    }
  }

  // ---- the reactor: the glass column, the glowing core up its middle, its frame; the crown's socket ----
  const col = ship.solids.find((s) => s.style === 'column');
  const reactor = new THREE.Group();
  const coreMat = new THREE.MeshBasicMaterial({ color: g.reactor });
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, col.y1 - 1.5, 24, 1, true), coreMat);
  inner.position.y = (col.y1 + 1.5) / 2;
  reactor.add(inner);
  const glassMat = new THREE.MeshBasicMaterial({ color: g.reactor, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(col.r - 0.05, col.r - 0.05, col.y1, 32, 1, true), glassMat);
  shell.position.y = col.y1 / 2;
  reactor.add(shell);
  // pods up the core (picture 2): dark clamps and rings, every 3 m
  for (let y = 2; y < col.y1 - 1; y += 3) {
    b.put(new THREE.TorusGeometry(1.45, 0.16, 8, 28).rotateX(Math.PI / 2), c.hullPale, 0, y, 0);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * TAU + y * 0.3;
      b.box(0.3, 0.9, 0.3, c.hullDark, Math.sin(a) * 1.4, y, Math.cos(a) * 1.4, a);
    }
  }
  // the glass's frame: struts, a ring at each deck and a heavy one at the floor
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * TAU;
    b.box(0.16, col.y1, 0.16, c.glassRim, Math.sin(a) * col.r, col.y1 / 2, Math.cos(a) * col.r, a);
  }
  for (const y of [...ship.levels, 1.2, 44]) putGeo(sectorGeo(col.r - 0.08, col.r + 0.08, 0, TAU, y + 0.6, y + 1.0), c.glassRim);
  putGeo(sectorGeo(col.r - 0.1, col.r + 0.45, 0, TAU, 0, 1.1), c.hullDark);
  for (let y = 4.5; y < col.y1; y += 9) glow.push({ geo: sectorGeo(col.r + 0.005, col.r + 0.03, 0, TAU, y, y + 0.08, { top: false, bottom: false, inner: false, ends: false }), color: g.cyan });
  // the crown's socket, facing the bridge to the workshop: a cradle on the glass, the core in it
  const sock = ship.places.socket;
  b.box(0.7, 2.0, 1.5, c.hullDark, sock.x + 0.3, sock.y, sock.z);
  b.box(0.5, 0.25, 1.7, c.hullPale, sock.x + 0.45, sock.y - 0.95, sock.z);
  b.box(0.5, 0.25, 1.7, c.hullPale, sock.x + 0.45, sock.y + 0.95, sock.z);
  glowBox(0.04, 1.4, 0.06, g.cyan, sock.x + 0.66, sock.y, sock.z - 0.62);
  glowBox(0.04, 1.4, 0.06, g.cyan, sock.x + 0.66, sock.y, sock.z + 0.62);
  const core = new THREE.Group();
  core.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.36, 1), new THREE.MeshBasicMaterial({ color: g.core })));
  core.add(new THREE.Mesh(new THREE.SphereGeometry(0.85, 12, 8), new THREE.MeshBasicMaterial({ color: g.core, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false })));
  core.position.set(sock.x + 0.75, sock.y, sock.z);

  // ---- the shaft's details: wall lights, door frames, pipes, braces under the balconies ----
  for (const l of ship.lights) {
    glowBox(0.14, 0.11, l.len, g.cyan, l.x, l.y, l.z, l.a);
    b.push(l.x, l.y, l.z, l.a);
    b.box(0.22, 0.18, 0.2, c.pipe, 0, 0, l.len / 2 + 0.05);
    b.box(0.22, 0.18, 0.2, c.pipe, 0, 0, -l.len / 2 - 0.05);
    b.pop();
  }
  for (const o of ship.openings) {
    for (const side of [-1, 1]) {
      const a = o.a + side * o.half;
      const m = P(14.95, a, (o.y0 + o.y1) / 2);
      glowBox(0.08, o.y1 - o.y0, 0.08, g.cyan, m.x, m.y, m.z, a);
    }
    glow.push({ geo: sectorGeo(14.9, 14.97, o.a - o.half, o.a + o.half, o.y1 - 0.05, o.y1 + 0.03, { bottom: false, outer: false, ends: false }), color: g.cyan });
  }
  for (const y of ship.levels) {
    // a pipe round the wall over each deck, and its brackets
    putGeo(at(new THREE.TorusGeometry(14.65, 0.16, 6, 96).rotateX(Math.PI / 2), 0, y + 5.6, 0), c.pipe);
    putGeo(at(new THREE.TorusGeometry(14.7, 0.1, 6, 96).rotateX(Math.PI / 2), 0, y + 6.1, 0), c.pipe);
    if (y > 0) {
      for (let k = 0; k < 24; k++) {
        const a = (k + 0.5) * (TAU / 24);
        const m = P(14.2, a, y - 1.1);
        b.box(0.12, 1.6, 1.6, c.hullDark, m.x, m.y, m.z, a, 0, 0); // a brace under the balcony's edge
      }
    }
  }
  // vertical pipes up the wall where there's no door
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU + 0.21;
    if (ship.openings.some((o) => Math.abs(Math.atan2(Math.sin(a - o.a), Math.cos(a - o.a))) < o.half + 0.12)) continue;
    const m = P(14.55, a, 23);
    b.put(new THREE.CylinderGeometry(0.2, 0.2, 46, 8), c.pipe, m.x, m.y, m.z);
  }

  // ---- the floor's circuit lines (pictures 2 and 4): cyan traces out from the column ----
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * TAU + 0.07;
    const r0 = 4.2 + (k % 3) * 0.6;
    const r1 = 9 + (k % 4) * 1.4;
    const m = P((r0 + r1) / 2, a, 0.012);
    glowBox(0.05, 0.01, r1 - r0, k % 2 ? g.cyanDim : g.violet, m.x, m.y, m.z, a);
    const bend = a + (k % 2 ? 0.08 : -0.08);
    const e = P(r1, a, 0.012);
    const f = P(r1, bend, 0.012);
    glowBox(0.05, 0.01, e.distanceTo(f), g.cyanDim, (e.x + f.x) / 2, 0.012, (e.z + f.z) / 2, Math.atan2(f.x - e.x, f.z - e.z));
  }
  for (const r of [6.5, 12.5]) glow.push({ geo: sectorGeo(r - 0.03, r + 0.03, 0, TAU, 0.005, 0.015, { bottom: false, ends: false }), color: g.violet });
  // the arrival pad
  const pad = ship.places.pad;
  b.put(new THREE.CylinderGeometry(1.6, 1.8, 0.12, 32), c.hullPale, pad.x, 0.06, pad.z);
  glow.push({ geo: at(new THREE.TorusGeometry(1.5, 0.05, 6, 40).rotateX(Math.PI / 2), pad.x, 0.13, pad.z), color: g.cyan });
  glow.push({ geo: at(new THREE.TorusGeometry(1.0, 0.03, 6, 32).rotateX(Math.PI / 2), pad.x, 0.13, pad.z), color: g.cyanDim });

  // ---- the hangar's beam: its pad, a faint column of light ----
  const beamAt = ship.places.beam;
  b.put(new THREE.CylinderGeometry(2.2, 2.4, 0.12, 32), c.hullPale, beamAt.x, beamAt.y + 0.06, beamAt.z);
  glow.push({ geo: at(new THREE.TorusGeometry(2.1, 0.06, 6, 44).rotateX(Math.PI / 2), beamAt.x, beamAt.y + 0.13, beamAt.z), color: g.cyan });
  const beamCol = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.1, 9.8, 24, 1, true), new THREE.MeshBasicMaterial({ color: g.cyan, transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beamCol.position.set(beamAt.x, beamAt.y + 4.9, beamAt.z);

  // ---- the workshop (picture 4): the alarm panel; holo blueprints of the quad over the benches; the porthole ----
  const pn = ship.places.panel;
  b.box(0.9, 1.2, 0.12, c.console, pn.x, pn.y, pn.z);
  glowBox(0.6, 0.5, 0.02, g.red, pn.x, pn.y + 0.15, pn.z - 0.07);
  for (const [x, z, ry] of [[17.5, 5.2, Math.PI], [24.5, 5.2, Math.PI], [21.2, -5.9, 0]]) blueprint(glow, x, 36 + 1.9, z, ry, g.holo);
  const porthole = { x: 25.2, y: 39.2, z: 7.0 };
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU + TAU / 16;
    const r = 1.35;
    b.box(1.15, 0.22, 0.3, c.hullPale, porthole.x + Math.cos(a) * r, porthole.y + Math.sin(a) * r, porthole.z - 0.1, 0, 0, a + Math.PI / 2);
  }
  glass.push(at(new THREE.CircleGeometry(1.3, 8), porthole.x, porthole.y, porthole.z - 0.05, Math.PI));

  // ---- the alarm strips, by zone ----
  for (const s of ship.strips) {
    if (!strips.has(s.zone)) strips.set(s.zone, []);
    strips.get(s.zone).push(at(new THREE.BoxGeometry(0.06, 0.07, s.len), s.x, s.y, s.z, s.a));
  }

  // ---- bake ----
  const geometry = bakeParts(b.parts, { weather: null, seed: 93 });
  bakeLight(geometry, g.reactor, g.cyan);
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  const glowM = glowMesh(glow);
  const netMat = new THREE.MeshBasicMaterial({ color: g.net, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const netGeo = nets.length ? mergeGeometries(nets.map((x) => (x.deleteAttribute('normal'), x))) : new THREE.BufferGeometry();
  nets.forEach((x) => x.dispose());
  const netM = new THREE.Mesh(netGeo, netMat);
  netM.renderOrder = 1;
  const winMat = new THREE.MeshBasicMaterial({ color: 0x6a7ab8, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const winGeo = glass.length ? mergeGeometries(glass.map((x) => (x.index ? x.toNonIndexed() : x)).map((x) => (x.deleteAttribute('uv'), x.deleteAttribute('normal'), x))) : new THREE.BufferGeometry();
  const winM = new THREE.Mesh(winGeo, winMat);
  winM.renderOrder = 1;
  const stripMats = new Map();
  const stripMeshes = [];
  for (const [zone, list] of strips) {
    const m = new THREE.MeshBasicMaterial({ color: g.violet });
    const mesh2 = new THREE.Mesh(mergeGeometries(list), m);
    list.forEach((x) => x.dispose());
    stripMats.set(zone, { mat: m, on: false });
    stripMeshes.push(mesh2);
  }

  // ---- the lift: its top and its scissor arms move ----
  const liftSolid = ship.lift;
  const liftTop = new THREE.Group();
  const liftMat = new THREE.MeshLambertMaterial({ color: c.lift });
  const liftTopMesh = new THREE.Mesh(new THREE.BoxGeometry(liftSolid.hx * 2, 0.16, liftSolid.hz * 2), liftMat);
  liftTopMesh.position.y = -0.08;
  liftTop.add(liftTopMesh);
  const liftGlow = new THREE.Mesh(new THREE.BoxGeometry(liftSolid.hx * 2 + 0.02, 0.03, 0.06), new THREE.MeshBasicMaterial({ color: g.quadNeon }));
  liftGlow.position.set(0, -0.06, liftSolid.hz);
  liftTop.add(liftGlow);
  const liftGlow2 = liftGlow.clone();
  liftGlow2.position.z = -liftSolid.hz;
  liftTop.add(liftGlow2);
  liftTop.position.set(liftSolid.x, liftSolid.y1, liftSolid.z);
  const armMat = new THREE.MeshLambertMaterial({ color: c.liftDark });
  const arms = [];
  for (const side of [-1, 1]) {
    for (const dir of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 1), armMat);
      arm.userData = { side, dir };
      arms.push(arm);
    }
  }
  const liftGroup = new THREE.Group();
  liftGroup.add(liftTop, ...arms);

  // ---- the loot: a locker with a lit seam (it goes dark once emptied) ----
  const lootMeshes = new Map();
  for (const l of ship.loot) {
    const grp = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.6), new THREE.MeshLambertMaterial({ color: c.crate }));
    box.position.y = 0.35;
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.05, 0.62), new THREE.MeshBasicMaterial({ color: g.quadNeon }));
    seam.position.y = 0.55;
    grp.add(box, seam);
    grp.position.set(l.at.x, l.at.y, l.at.z);
    grp.rotation.y = Math.atan2(l.at.x, l.at.z);
    lootMeshes.set(l.id, { grp, seam });
  }

  // ---- the curios on the shelf (picture 4: figurines, toys) ----
  const curioGroup = new THREE.Group();
  const toyCols = [c.toy, c.toyRed, c.toyBlue, c.star];
  ship.curios.forEach((cu, i) => {
    const m = new THREE.Mesh(i === 1 ? new THREE.CylinderGeometry(0.11, 0.11, 0.02, 5).rotateX(Math.PI / 2) : new THREE.BoxGeometry(i === 2 ? 0.16 : 0.08, i === 2 ? 0.12 : 0.18, i === 2 ? 0.1 : 0.06), new THREE.MeshLambertMaterial({ color: toyCols[i + 1] ?? c.toy, emissive: toyCols[i + 1] ?? c.toy, emissiveIntensity: 0.25 }));
    m.position.set(cu.at.x, cu.at.y, cu.at.z + 0.1);
    curioGroup.add(m);
  });

  // ---- the Earth and the stars, drawn behind everything round the camera ----
  const sky = buildEarthSky(g);

  const group = new THREE.Group();
  group.name = 'mothership';
  group.add(sky.group, mesh, glowM, reactor, core, beamCol, ...stripMeshes, liftGroup, curioGroup, netM, winM);
  for (const { grp } of lootMeshes.values()) group.add(grp);

  let time = 0;
  let power = 1;
  const reactorColour = new THREE.Color(g.reactor);
  const red = new THREE.Color(g.red);
  const calm = new THREE.Color(g.violet);
  const api = {
    group,
    mesh,
    glow: glowM,
    core,
    setCore(on) {
      core.visible = Boolean(on);
    },
    // The reactor's brightness (1 full; taken: dim).
    setReactor(k) {
      power = k;
      coreMat.color.copy(reactorColour).multiplyScalar(0.25 + 0.75 * k);
      glassMat.opacity = 0.04 + 0.06 * k;
    },
    setZoneAlert(zone, on) {
      const s = stripMats.get(zone);
      if (!s) return;
      s.on = Boolean(on);
      s.mat.color.copy(on ? red : calm);
    },
    // The lift's top h metres over the floor; its arms fold with it.
    setLift(h) {
      liftTop.position.y = liftSolid.y0 + h;
      const span = Math.max(0.2, h - 0.2);
      const len = Math.hypot(span, liftSolid.hz * 1.6);
      for (const a of arms) {
        a.scale.z = len;
        a.position.set(liftSolid.x + a.userData.side * (liftSolid.hx - 0.15), liftSolid.y0 + 0.1 + span / 2, liftSolid.z);
        a.rotation.set(a.userData.dir * Math.atan2(span, liftSolid.hz * 1.6), 0, 0);
      }
    },
    setLooted(id) {
      const l = lootMeshes.get(id);
      if (l) l.seam.material.color.setHex(0x1a1a22);
    },
    update(dt, camera = null) {
      time += dt;
      core.rotation.y += dt * 0.9;
      core.children[1].scale.setScalar(1 + Math.sin(time * 3) * 0.08);
      const pulse = 0.85 + 0.15 * Math.sin(time * 1.7);
      coreMat.color.copy(reactorColour).multiplyScalar((0.25 + 0.75 * power) * (power < 1 ? 0.7 + 0.3 * Math.abs(Math.sin(time * 9)) : pulse));
      const blink = 0.55 + 0.45 * Math.abs(Math.sin(time * 3.2));
      for (const s of stripMats.values()) if (s.on) s.mat.color.copy(red).multiplyScalar(blink);
      if (camera) sky.group.position.copy(camera.position).sub(group.position);
    },
    dispose() {
      group.removeFromParent();
      geometry.dispose();
      material.dispose();
      glowM.geometry.dispose();
      glowM.material.dispose();
      netGeo.dispose();
      netMat.dispose();
      winGeo.dispose();
      winMat.dispose();
      for (const m of stripMeshes) {
        m.geometry.dispose();
        m.material.dispose();
      }
      group.traverse((o) => {
        if (o === mesh || o === glowM || o === netM || o === winM || stripMeshes.includes(o)) return;
        if (o.isMesh || o.isPoints) {
          o.geometry?.dispose();
          o.material?.dispose?.();
        }
      });
    },
  };
  api.setLift(liftSolid.y1 - liftSolid.y0);
  return api;
}

// ---- pieces ----------------------------------------------------------------------------------------

function drawRail(b, glow, s, c, g) {
  if (s.kind === 'ring') {
    const rm = (s.r0 + s.r1) / 2;
    b.put(sectorGeo(rm - 0.04, rm + 0.04, s.a0, s.a1, s.y1 - 0.07, s.y1), c.rail);
    b.put(sectorGeo(rm - 0.025, rm + 0.025, s.a0, s.a1, s.y0 + 0.5, s.y0 + 0.54), c.rail);
    const n = Math.max(1, Math.round(((s.a1 - s.a0) * rm) / 1.6));
    for (let i = 0; i <= n; i++) {
      const a = s.a0 + ((s.a1 - s.a0) * i) / n;
      const m = P(rm, a, (s.y0 + s.y1) / 2);
      b.box(0.06, s.y1 - s.y0, 0.06, c.rail, m.x, m.y, m.z, a);
    }
    glow.push({ geo: sectorGeo(rm - 0.012, rm + 0.012, s.a0, s.a1, s.y1 + 0.001, s.y1 + 0.02, { bottom: false, ends: false }), color: g.cyanDim });
    return;
  }
  if (s.kind === 'ramp') {
    const len = Math.hypot(s.hz * 2, s.y1 - s.y0);
    const pitch = Math.atan2(s.y1 - s.y0, s.hz * 2);
    b.box(0.07, 0.07, len, c.rail, s.x, (s.y0 + s.y1) / 2 - 0.03, s.z, s.a ?? 0, -pitch);
    const n = Math.max(1, Math.round(len / 1.6));
    b.push(s.x, 0, s.z, s.a ?? 0);
    for (let i = 0; i <= n; i++) {
      const lz = -s.hz + (2 * s.hz * i) / n;
      const top = s.y0 + ((s.y1 - s.y0) * i) / n;
      b.box(0.06, s.thick, 0.06, c.rail, 0, top - s.thick / 2, lz);
    }
    b.pop();
    return;
  }
  // a straight rail: its posts and its bar
  b.push(s.x, 0, s.z, s.a ?? 0);
  const long = s.hz >= s.hx;
  const L = long ? s.hz * 2 : s.hx * 2;
  b.box(long ? 0.07 : L, 0.07, long ? L : 0.07, c.rail, 0, s.y1 - 0.035, 0);
  const n = Math.max(1, Math.round(L / 1.6));
  for (let i = 0; i <= n; i++) {
    const t = -L / 2 + (L * i) / n;
    b.box(0.06, s.y1 - s.y0, 0.06, c.rail, long ? 0 : t, (s.y0 + s.y1) / 2, long ? t : 0);
  }
  b.pop();
}

// A ramp drawn as steps (the collision's a slope: it walks the same), on a slab under them.
function drawSteps(b, s, c) {
  const rise = s.y1 - s.y0;
  const L = s.hz * 2;
  const n = Math.max(2, Math.round(Math.abs(rise) / 0.3));
  b.push(s.x, 0, s.z, s.a ?? 0);
  for (let k = 0; k < n; k++) {
    const top = s.y0 + (rise * (k + 1)) / n;
    const lz = -s.hz + (L * (k + 0.5)) / n;
    b.box(s.hx * 2, 0.22, L / n + 0.02, c.stair, 0, top - 0.11, lz);
    b.box(s.hx * 2 - 0.1, 0.02, 0.04, c.hullPale, 0, top + 0.005, lz + L / n / 2 - 0.03);
  }
  const len = Math.hypot(L, rise);
  const pitch = Math.atan2(rise, L);
  b.box(s.hx * 2, 0.12, len, c.hullDark, 0, (s.y0 + s.y1) / 2 - 0.32, 0, 0, -pitch);
  b.pop();
}

function drawWall(b, s, c, ship) {
  b.box(s.hx * 2, s.y1 - s.y0, s.hz * 2, c.hull, s.x, (s.y0 + s.y1) / 2, s.z, s.a ?? 0);
  // ribs along it
  const long = s.hz >= s.hx;
  const L = long ? s.hz * 2 : s.hx * 2;
  if (L < 2.5 || s.y1 - s.y0 < 2) return;
  b.push(s.x, 0, s.z, s.a ?? 0);
  const n = Math.floor(L / 2.4);
  const thick = long ? s.hx : s.hz;
  for (let i = 1; i < n; i++) {
    const t = -L / 2 + (L * i) / n;
    for (const side of [-1, 1]) {
      const off = side * (thick + 0.06);
      b.box(long ? 0.12 : 0.2, s.y1 - s.y0, long ? 0.2 : 0.12, c.hullPale, long ? off : t, (s.y0 + s.y1) / 2, long ? t : off);
    }
  }
  b.pop();
}

function drawHull(b, glow, s, c, g) {
  b.put(sectorGeo(s.r0, s.r1, s.a0, s.a1, s.y0, s.y1, { top: false, bottom: false }), c.hull);
  // panels: a seam every 3 m up, ribs every 11.25 degrees round
  for (let y = Math.ceil((s.y0 + 0.01) / 3) * 3; y < s.y1; y += 3) b.put(sectorGeo(s.r0 - 0.03, s.r0, s.a0, s.a1, y - 0.03, y + 0.03, { ends: false }), c.hullDark);
  const step = TAU / 32;
  for (let a = Math.ceil(s.a0 / step) * step; a < s.a1 - 0.01; a += step) {
    if (a - s.a0 < 0.02) continue;
    const m = P(s.r0 - 0.08, a, (s.y0 + s.y1) / 2);
    b.box(0.3, s.y1 - s.y0, 0.16, c.panel, m.x, m.y, m.z, a + Math.PI / 2);
  }
  // circuit lines on the panels (the pictures' walls): a few short violet traces, up then across
  const span = s.a1 - s.a0;
  if (span < 0.1 || s.y1 - s.y0 < 2) return;
  const n = Math.min(6, Math.floor((span * 15 * (s.y1 - s.y0)) / 60));
  for (let i = 0; i < n; i++) {
    const h1 = Math.sin(i * 12.9898 + s.a0 * 78.233) * 43758.5453;
    const u = h1 - Math.floor(h1);
    const h2 = Math.sin(i * 39.346 + s.y0 * 11.135) * 24634.6345;
    const v = h2 - Math.floor(h2);
    const a = s.a0 + span * (0.1 + 0.8 * u);
    const y = s.y0 + (s.y1 - s.y0) * (0.15 + 0.7 * v);
    const m = P(s.r0 - 0.012, a, y);
    glow.push({ geo: at(new THREE.BoxGeometry(0.04, 1.4, 0.01), m.x, m.y, m.z, a), color: g.violet });
    const da = 0.6 / s.r0;
    const e = P(s.r0 - 0.012, a + da / 2, y + 0.7);
    glow.push({ geo: at(new THREE.BoxGeometry(0.6, 0.04, 0.01), e.x, e.y, e.z, a + da / 2), color: g.violet });
  }
}

function drawWindow(b, glass, s, c) {
  const W = s.hx * 2;
  const H = s.y1 - s.y0;
  glass.push(at(new THREE.PlaneGeometry(W, H), s.x, (s.y0 + s.y1) / 2, s.z - 0.15, Math.PI));
  // mullions, the angled frames of picture 3
  const n = Math.round(W / 3);
  for (let i = 0; i <= n; i++) {
    const x = s.x - W / 2 + (W * i) / n;
    b.box(0.3, H, 0.4, c.hullPale, x, (s.y0 + s.y1) / 2, s.z - 0.2);
  }
  b.box(W, 0.3, 0.4, c.hullPale, s.x, s.y0 + H * 0.45, s.z - 0.2);
}

function drawSofa(b, s, c) {
  b.push(s.x, s.y0, s.z, s.a ?? 0);
  const L = s.hx * 2;
  b.box(L, 0.45, 0.9, c.sofa, 0, 0.225, 0.05);
  b.box(L, 0.5, 0.25, c.sofa, 0, 0.6, -0.38);
  for (const side of [-1, 1]) b.box(0.22, 0.65, 1.0, c.sofaPale, side * (L / 2 - 0.11), 0.32, 0);
  b.box(L - 0.5, 0.12, 0.7, c.sofaPale, 0, 0.5, 0.12);
  b.pop();
}

function drawConsole(b, glow, s, c, g) {
  b.push(s.x, s.y0, s.z, s.a ?? 0);
  b.box(s.hx * 2, 0.9, s.hz * 2, c.console, 0, 0.45, 0);
  b.box(s.hx * 2 + 0.06, 0.08, s.hz * 2 + 0.25, c.consoleTop, 0, 0.98, -0.08, 0, 0.35);
  const scr = b.point(0, 1.65, s.hz * 0.2);
  glow.push({ geo: at(new THREE.BoxGeometry(s.hx * 1.6, 0.7, 0.01), scr.x, scr.y, scr.z, s.a ?? 0, -0.12), color: g.holo });
  const base = b.point(0, 1.0, 0.05);
  glow.push({ geo: at(new THREE.BoxGeometry(s.hx * 1.5, 0.02, 0.3), base.x, base.y, base.z, s.a ?? 0, 0.35), color: g.cyanDim });
  b.pop();
}

function drawBench(b, glow, s, c, g) {
  b.push(s.x, s.y0, s.z, s.a ?? 0);
  b.box(s.hx * 2, 0.08, s.hz * 2, c.bench, 0, 0.91, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(0.08, 0.9, 0.08, c.liftDark, sx * (s.hx - 0.1), 0.45, sz * (s.hz - 0.1));
  b.box(s.hx * 2 - 0.2, 0.05, s.hz * 2 - 0.2, c.liftDark, 0, 0.25, 0);
  // clutter: tools, boxes, coils of neon cable (picture 4)
  for (let i = 0; i < 5; i++) {
    const x = -s.hx + 0.3 + (i / 4) * (s.hx * 2 - 0.6);
    b.box(0.18 + (i % 2) * 0.1, 0.08 + (i % 3) * 0.06, 0.14, i % 2 ? c.hullPale : c.console, x, 0.99 + (i % 3) * 0.03, (i % 2 ? 0.15 : -0.12));
  }
  const coil = b.point(s.hx * 0.4, 0.97, 0.05);
  glow.push({ geo: at(new THREE.TorusGeometry(0.16, 0.018, 5, 18).rotateX(Math.PI / 2), coil.x, coil.y, coil.z), color: g.purple });
  const coil2 = b.point(-s.hx * 0.5, 0.97, -0.1);
  glow.push({ geo: at(new THREE.TorusGeometry(0.12, 0.016, 5, 16).rotateX(Math.PI / 2), coil2.x, coil2.y, coil2.z), color: g.cyan });
  b.pop();
}

function drawShelf(b, s, c) {
  b.push(s.x, s.y0, s.z, s.a ?? 0);
  for (const side of [-1, 1]) b.box(0.08, s.y1 - s.y0, s.hz * 2, c.shelf, side * s.hx, (s.y1 - s.y0) / 2, 0);
  for (const y of [0.6, 1.4, 2.2]) {
    b.box(s.hx * 2, 0.05, s.hz * 2, c.shelf, 0, y, 0);
    // what they've taken (picture 4): figures, boxes, tins
    for (let i = 0; i < 6; i++) {
      const x = -s.hx + 0.2 + i * ((s.hx * 2 - 0.4) / 5);
      const h = 0.12 + ((i * 7 + y * 10) % 5) * 0.04;
      b.box(0.1, h, 0.1, [c.toy, c.toyRed, c.toyBlue, c.wood][(i + Math.round(y * 3)) % 4], x, y + 0.025 + h / 2, (i % 2 ? 0.06 : -0.04));
    }
  }
  b.pop();
}

// A holo blueprint of the quad (pictures 4): its outline in light, floating over a bench.
function blueprint(glow, x, y, z, ry, colour) {
  const lines = [
    [-0.55, 0.0, 0.55, 0.0], // the frame
    [-0.55, 0.0, -0.55, 0.22],
    [0.55, 0.0, 0.55, 0.18],
    [-0.3, 0.22, 0.3, 0.22], // the seat
    [0.3, 0.22, 0.45, 0.4], // the bars
  ];
  const frame = new THREE.BoxGeometry(1.5, 0.9, 0.01);
  const edge = (w, h, ox, oy) => glow.push({ geo: at(new THREE.BoxGeometry(w, h, 0.012), x + Math.cos(ry) * ox, y + oy, z - Math.sin(ry) * ox, ry), color: colour });
  frame.dispose();
  edge(1.5, 0.02, 0, 0.45);
  edge(1.5, 0.02, 0, -0.45);
  edge(0.02, 0.9, -0.75, 0);
  edge(0.02, 0.9, 0.75, 0);
  for (const [x0, y0, x1, y1] of lines) {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const g = new THREE.BoxGeometry(len, 0.015, 0.012);
    g.rotateZ(Math.atan2(y1 - y0, x1 - x0));
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2 - 0.1;
    glow.push({ geo: at(g, x + Math.cos(ry) * mx, y + my, z - Math.sin(ry) * mx, ry), color: colour });
  }
  for (const wx of [-0.45, 0.45]) glow.push({ geo: at(new THREE.TorusGeometry(0.16, 0.012, 4, 16), x + Math.cos(ry) * wx, y - 0.2, z - Math.sin(ry) * wx, ry), color: colour });
}

// A floor's circuit lines (the rooms): a border, a few traces.
function floorLines(glow, s, g) {
  const y = s.y1 + 0.006;
  const box = (w, d, x, z) => glow.push({ geo: at(new THREE.BoxGeometry(w, 0.01, d), x, y, z, s.a ?? 0), color: g.cyanDim });
  box(s.hx * 2 - 0.6, 0.04, s.x, s.z - s.hz + 0.3);
  box(s.hx * 2 - 0.6, 0.04, s.x, s.z + s.hz - 0.3);
  for (let i = 1; i < 4; i++) box(0.04, s.hz * 1.2, s.x - s.hx + (s.hx * 2 * i) / 4, s.z);
}

// The Earth below and the stars over it (Aaron: the Earth below, stars above; the moon), drawn first and
// round the camera (no depth): the hull hides it but for the windows, the hangar's field and the porthole.
function buildEarthSky(g) {
  const group = new THREE.Group();
  group.name = 'earthSky';
  const R = 40;
  // the stars
  const n = 900;
  const pos = new Float32Array(n * 3);
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < n; i++) {
    const u = rnd() * 2 - 1;
    const t = rnd() * TAU;
    const y = Math.abs(u) * 0.95 + 0.02;
    const r = Math.sqrt(1 - y * y);
    pos.set([Math.cos(t) * r * R, y * R, Math.sin(t) * r * R], i * 3);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xdfe8ff, size: 1.6, sizeAttenuation: false, depthWrite: false, depthTest: false, fog: false }));
  stars.renderOrder = -1.5;
  // the Earth: a cap below the horizon, the dark forest and its cloud, the limb's blue glow
  const earthGeo = new THREE.SphereGeometry(R * 0.96, 96, 28, 0, TAU, Math.PI / 2 + 0.1, Math.PI / 2 - 0.1);
  const ep = earthGeo.getAttribute('position');
  const ec = new Float32Array(ep.count * 3);
  const land = new THREE.Color(g.earthLand);
  const sea = new THREE.Color(g.earth);
  const air = new THREE.Color(g.atmosphere);
  const cloud = new THREE.Color(0xc8d0dc);
  const tmp = new THREE.Color();
  for (let i = 0; i < ep.count; i++) {
    const x = ep.getX(i) / R;
    const y = ep.getY(i) / R;
    const z = ep.getZ(i) / R;
    const below = -y; // 0.1 at the limb .. 1 straight down
    // ground coordinates: project onto a plane under the ship (the forest spread out below)
    const k = 1 / Math.max(0.12, below);
    const gx = x * k * 3;
    const gz = z * k * 3;
    const n1 = Math.sin(gx * 1.3 + Math.sin(gz * 0.7) * 2) * Math.cos(gz * 1.1 - gx * 0.4);
    const n2 = Math.sin(gx * 4.1 + gz * 3.3) * Math.sin(gz * 5.2 - gx * 2.7);
    tmp.copy(n1 > 0.55 ? sea : land).multiplyScalar(0.55 + 0.25 * n2);
    const cl = Math.max(0, Math.sin(gx * 0.8 + n2 * 1.5) * Math.sin(gz * 0.9 - gx * 0.3) - 0.35) * 1.6;
    tmp.lerp(cloud, Math.min(0.8, cl));
    const limb = Math.max(0, 1 - (below - 0.1) / 0.18);
    tmp.lerp(air, limb * 0.75);
    tmp.multiplyScalar(0.75);
    ec.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  earthGeo.setAttribute('color', new THREE.BufferAttribute(ec, 3));
  const earth = new THREE.Mesh(earthGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false }));
  earth.renderOrder = -1;
  // the atmosphere's band over the limb
  const haloGeo = new THREE.SphereGeometry(R * 0.97, 96, 4, 0, TAU, Math.PI / 2 - 0.06, 0.18);
  const halo = new THREE.Mesh(haloGeo, new THREE.MeshBasicMaterial({ color: g.atmosphere, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false }));
  halo.renderOrder = -0.9;
  // the moon
  const moon = new THREE.Mesh(new THREE.CircleGeometry(1.6, 24), new THREE.MeshBasicMaterial({ color: 0xe8ecf0, depthWrite: false, depthTest: false, fog: false }));
  moon.position.set(-0.35 * R * 0.9, 0.42 * R * 0.9, 0.84 * R * 0.9);
  moon.lookAt(0, 0, 0);
  moon.renderOrder = -1.2;
  group.add(stars, earth, halo, moon);
  return { group };
}
