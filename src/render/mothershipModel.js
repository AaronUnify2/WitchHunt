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
    glow.push({ geo: at(new THREE.BoxGeometry(0.5, 0.12, 0.2), p.x, p.y, p.z, a + 0.4), color: i % 2 ? look.glow.cyan : look.glow.purple });
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
  glow.push({ geo: at(new THREE.TorusGeometry(B.r + 0.2, 0.06, 6, 28).rotateX(Math.PI / 2), pad.x, pad.y, pad.z), color: look.glow.cyan });
  const geometry = bakeParts(b.parts, { weather: null, baseAt: (x, y, z) => b.heightAt(x, z), seed: 91 });
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const glowM = glowMesh(glow);
  // The beam itself: a tall, faint column (added on), brighter at its foot.
  const beamGeo = new THREE.CylinderGeometry(B.r * 0.7, B.r, B.height, 18, 1, true);
  beamGeo.translate(0, B.height / 2, 0);
  const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: look.glow.cyan, transparent: true, opacity: look.beamOpacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
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
    let k = 1.0;
    if (ny < -0.5) k *= 0.6;
    else if (ny > 0.5) k *= 1.05;
    let glow = 0;
    let wall = 0;
    if (r < 16 && y < 46) {
      glow = 0.7 * Math.exp(-Math.max(0, r - 3) / 7); // (Nov 26: the reactor lights more of the hall, as in the new picture)
      const dy = ((y % 9) + 9) % 9;
      wall = 0.35 * Math.exp(-Math.abs(dy - 2.6) / 1.6) * Math.exp(-Math.max(0, 15 - r) / 3.5);
    } else {
      wall = 0.32; // the rooms: their ceiling lights, all over
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
  const grated = []; // the decks' tops, in the grating (the new core-hall picture): their own textured mesh
  const glowBox = (w, h, d, color, x, y, z, ry = 0, rx = 0) => glow.push({ geo: at(new THREE.BoxGeometry(w, h, d), x, y, z, ry, rx), color });

  // ---- each solid, drawn by its style ----
  for (const s of ship.solids) {
    switch (s.style) {
      case 'floor':
        if (s.kind === 'cyl') grated.push(colourGeo(at(new THREE.RingGeometry(2.9, s.r, 72, 12).rotateX(-Math.PI / 2), s.x, s.y1, s.z), c.deck)); // (rings of vertices: the baked light falls off smoothly)
        else b.box(s.hx * 2, s.y1 - s.y0, s.hz * 2, c.deckDark, s.x, (s.y0 + s.y1) / 2, s.z, s.a ?? 0);
        break;
      case 'roof':
        putGeo(at(new THREE.CircleGeometry(s.r, 72).rotateX(Math.PI / 2), s.x, s.y0, s.z), c.hullDark);
        break;
      case 'column':
        break; // the reactor, below
      case 'catwalk':
        grated.push(colourGeo(sectorGeo(s.r0, s.r1, s.a0, s.a1, s.y0, s.y1), c.deck));
        glow.push({ geo: sectorGeo(s.r1 - 0.06, s.r1 + 0.005, s.a0, s.a1, s.y1 - 0.12, s.y1 + 0.01, { bottom: false, inner: false, ends: false }), color: g.cyan });
        break;
      case 'balcony':
        if (s.kind === 'ring') {
          grated.push(colourGeo(sectorGeo(s.r0, s.r1, s.a0, s.a1, s.y0, s.y1), c.deck)); // (the grating's its plating now)
          glow.push({ geo: sectorGeo(s.r0 - 0.005, s.r0 + 0.06, s.a0, s.a1, s.y1 - 0.12, s.y1 + 0.01, { bottom: false, outer: false, ends: false }), color: g.purple });
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
        drawWall(b, s, c);
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
      // ---- the runway (Nov 26) ----
      case 'track':
      case 'trackRamp':
      case 'trackSlope':
        drawTrack(b, glow, grated, s, c, g);
        break;
      case 'kerb':
        b.box(s.hx * 2, s.y1 - s.y0, s.hz * 2, c.hullDark, s.x, (s.y0 + s.y1) / 2, s.z, s.a ?? 0);
        glow.push({ geo: at(new THREE.BoxGeometry(s.hx * 2 + 0.02, 0.06, s.hz * 2), s.x, s.y1 + 0.01, s.z, s.a ?? 0), color: g.purple });
        break;
      case 'abyss':
        drawAbyss(b, glow, s, c, g);
        break;
      case 'hallCeiling':
        b.box(s.hx * 2, s.y1 - s.y0, s.hz * 2, c.hullDark, s.x, (s.y0 + s.y1) / 2, s.z);
        for (let z = s.z - s.hz + 10; z < s.z + s.hz; z += 20) glowBox(s.hx * 2 - 20, 0.12, 0.5, g.cyanDim, s.x, s.y0 - 0.08, z);
        break;
      case 'hallWall':
        drawHallWall(b, glow, s, c, g);
        break;
      case 'hallWindow':
        drawHallWindow(b, glass, s, c);
        break;
      case 'lift':
        b.box(3.0, 0.16, 3.8, c.liftDark, s.x, s.y0 + 0.08, s.z); // its base on the floor (the top moves: below)
        break;
      default:
        break;
    }
  }

  // ---- the reactor (Nov 26, after the new core-hall picture): plasma crackling inside the glass, panes in a frame of
  // mullions, heavy collars at each deck, eight thick pipes hugging it, a machinery base at its foot with pipes out
  // across the floor, steam rising off the base ----
  const col = ship.solids.find((s) => s.style === 'column');
  const reactor = new THREE.Group();
  const plasmaMat = plasmaMaterial(g.plasma ?? g.reactor);
  const plasma = new THREE.Mesh(new THREE.CylinderGeometry(col.r - 0.45, col.r - 0.45, col.y1 - 1.2, 40, 1, true), plasmaMat);
  plasma.position.y = 1.2 + (col.y1 - 1.2) / 2;
  reactor.add(plasma);
  const glassMat = new THREE.MeshBasicMaterial({ color: g.reactor, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(col.r - 0.05, col.r - 0.05, col.y1, 32, 1, true), glassMat);
  shell.position.y = col.y1 / 2;
  reactor.add(shell);
  // the panes' frame: sixteen mullions, a thin band every 3 m, a heavy collar at each deck and at the floor
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * TAU;
    b.box(0.08, col.y1, 0.1, c.glassRim, Math.sin(a) * (col.r - 0.02), col.y1 / 2, Math.cos(a) * (col.r - 0.02), a);
  }
  for (let y = 3; y < col.y1; y += 3) putGeo(sectorGeo(col.r - 0.05, col.r + 0.03, 0, TAU, y - 0.04, y + 0.04), c.glassRim);
  // what the plasma stands on inside the glass: a plinth, its top ringed in light (and the floor under it closed)
  putGeo(sectorGeo(0, col.r - 0.05, 0, TAU, -0.05, 1.2), c.hullDark);
  glow.push({ geo: sectorGeo(col.r - 0.75, col.r - 0.6, 0, TAU, 1.2, 1.215, { bottom: false, ends: false }), color: g.cyan });
  for (const y of [...ship.levels.slice(1), 44]) {
    putGeo(sectorGeo(col.r - 0.1, col.r + 0.55, 0, TAU, y - 1.0, y - 0.35), c.hullDark);
    putGeo(sectorGeo(col.r - 0.1, col.r + 0.42, 0, TAU, y - 1.15, y - 1.0), c.hullPale);
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * TAU;
      const m = P(col.r + 0.56, a, y - 0.68);
      b.box(0.08, 0.08, 0.06, c.rail, m.x, m.y, m.z, a); // its bolts
    }
  }
  for (let y = 4.5; y < col.y1; y += 9) glow.push({ geo: sectorGeo(col.r + 0.005, col.r + 0.03, 0, TAU, y, y + 0.06, { top: false, bottom: false, inner: false, ends: false }), color: g.cyan });
  // the eight pipes up it, collared every 2.25 m, each bending out into the base at the foot
  for (const s of ship.solids.filter((x) => x.style === 'reactorPipe')) {
    const a = Math.atan2(s.x, s.z);
    b.put(new THREE.CylinderGeometry(s.r, s.r, s.y1 - 1.6, 10), c.pipe, s.x, 1.6 + (s.y1 - 1.6) / 2, s.z);
    for (let y = 2.4; y < s.y1 - 0.5; y += 2.25) b.put(new THREE.CylinderGeometry(s.r + 0.06, s.r + 0.06, 0.16, 10), c.hullDark, s.x, y, s.z);
    const bend = new THREE.TorusGeometry(0.45, s.r, 8, 10, Math.PI / 2);
    bend.rotateY(Math.PI / 2);
    b.push(s.x, 1.6, s.z, a);
    b.put(bend, c.pipe, 0, 0, 0.45, 0, 0, Math.PI);
    b.pop();
  }
  // the base: a ring of machinery, vents glowing in its face, valves and boxes on top
  for (const s of ship.solids.filter((x) => x.style === 'reactorBase')) {
    putGeo(sectorGeo(s.r0, s.r1, s.a0, s.a1, s.y0, s.y1), c.hullDark);
    putGeo(sectorGeo(s.r1 - 0.02, s.r1 + 0.04, s.a0, s.a1, s.y1 - 0.12, s.y1, { ends: false }), c.hullPale);
    for (let a = s.a0 + 0.2; a < s.a1 - 0.15; a += 0.42) {
      const m = P(s.r1 + 0.01, a, 0.5);
      glow.push({ geo: at(new THREE.BoxGeometry(0.5, 0.18, 0.02), m.x, m.y, m.z, a), color: g.cyanDim });
      const top = P((s.r0 + s.r1) / 2 + 0.2, a + 0.2, s.y1 + 0.15);
      b.box(0.34, 0.3, 0.3, c.console, top.x, top.y, top.z, a);
      const v = P((s.r0 + s.r1) / 2 - 0.25, a, s.y1 + 0.22);
      b.put(new THREE.CylinderGeometry(0.12, 0.12, 0.44, 8), c.pipe, v.x, v.y, v.z);
      b.put(new THREE.TorusGeometry(0.14, 0.03, 5, 12).rotateX(Math.PI / 2), c.rail, v.x, v.y + 0.24, v.z);
    }
  }
  // pipes out across the floor, each sinking into a collar in the deck at its end
  for (const s of ship.solids.filter((x) => x.style === 'floorPipe')) {
    b.push(s.x, 0, s.z, s.a);
    b.put(new THREE.CylinderGeometry(0.15, 0.15, s.hz * 2, 10).rotateX(Math.PI / 2), c.pipe, 0, 0.16, 0);
    for (let t = -s.hz + 0.5; t < s.hz; t += 1.0) b.box(0.38, 0.06, 0.12, c.hullDark, 0, 0.02, t);
    b.put(new THREE.CylinderGeometry(0.24, 0.28, 0.12, 10), c.hullDark, 0, 0.06, s.hz);
    b.pop();
  }
  const steam = buildSteam(ship);
  // The reactor's light lying on the wet floor round it (the new core-hall picture): a pool fading out by 11 m.
  const poolGeo = new THREE.RingGeometry(col.r + 1.3, 11, 72, 6).rotateX(-Math.PI / 2);
  const pc = new Float32Array(poolGeo.getAttribute('position').count * 3);
  const pp = poolGeo.getAttribute('position');
  const poolCol = new THREE.Color(g.reactor);
  for (let i = 0; i < pp.count; i++) {
    const r = Math.hypot(pp.getX(i), pp.getZ(i));
    const k = Math.pow(Math.max(0, 1 - (r - col.r - 1.3) / (11 - col.r - 1.3)), 1.6) * 0.2;
    pc.set([poolCol.r * k, poolCol.g * k, poolCol.b * k], i * 3);
  }
  poolGeo.setAttribute('color', new THREE.BufferAttribute(pc, 3));
  const pool = new THREE.Mesh(poolGeo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  pool.position.y = 0.02;
  pool.renderOrder = 1;
  reactor.add(pool);

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
    // the purple outline outside it (the new core-hall picture's doors)
    const pad2 = 0.16 / 15;
    for (const side of [-1, 1]) {
      const a = o.a + side * (o.half + pad2);
      const m = P(14.96, a, (o.y0 + o.y1 + 0.2) / 2);
      glowBox(0.04, o.y1 - o.y0 + 0.2, 0.03, g.purple, m.x, m.y, m.z, a);
    }
    glow.push({ geo: sectorGeo(14.93, 14.97, o.a - o.half - pad2, o.a + o.half + pad2, o.y1 + 0.17, o.y1 + 0.21, { bottom: false, outer: false, ends: false }), color: g.purple });
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
  // Nov 26 (Aaron: "a pillar right in the middle of a door"): the pillars, the walls' ribs and the pipes up the wall
  // are the layout's, placed between the panels and cut round every door, hatch, vent, light and opening.
  for (const pl of ship.pillars ?? []) {
    const h = pl.y1 - pl.y0;
    const m = P(Math.hypot(pl.x, pl.z), pl.a, (pl.y0 + pl.y1) / 2);
    b.box(pl.w, h, 0.3, c.panel, m.x, m.y, m.z, pl.a + Math.PI / 2);
    const f = P(Math.hypot(pl.x, pl.z) - 0.16, pl.a, (pl.y0 + pl.y1) / 2);
    b.box(pl.w * 0.45, h, 0.04, c.hullPale, f.x, f.y, f.z, pl.a + Math.PI / 2);
  }
  for (const r of ship.ribs ?? []) b.box(r.w, r.y1 - r.y0, r.d, c.hullPale, r.x, (r.y0 + r.y1) / 2, r.z, r.a);
  for (const pu of ship.pipesUp ?? []) {
    b.put(new THREE.CylinderGeometry(pu.r, pu.r, pu.y1 - pu.y0, 8), c.pipe, pu.x, (pu.y0 + pu.y1) / 2, pu.z);
    for (let y = pu.y0 + 1.5; y < pu.y1 - 0.5; y += 3) b.put(new THREE.CylinderGeometry(pu.r + 0.05, pu.r + 0.05, 0.14, 8), c.hullDark, pu.x, y, pu.z);
  }

  // ---- what's on the walls (the second pass; picture 1): hatches of cables, junction boxes that spark, vents,
  // sealed doors, pipes; the broken stair's torn ends ----
  const emitters = [];
  for (const d of ship.details ?? []) drawDetail(b, glow, glass, putGeo, emitters, d, c, g);
  drawCircuits(glow, ship, g);

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
  // The big neon rings round the reactor's foot (the new core-hall picture): cyan inside, purple out, ticks between.
  const ring = (r, w, color, y = 0.014) => glow.push({ geo: sectorGeo(r - w / 2, r + w / 2, 0, TAU, y - 0.008, y, { bottom: false, ends: false }), color });
  ring(5.95, 0.1, g.cyan);
  ring(6.25, 0.03, g.cyanDim);
  ring(7.7, 0.12, g.purple);
  ring(8.05, 0.04, g.violet);
  ring(9.4, 0.05, g.cyan);
  ring(12.5, 0.04, g.violet);
  for (let k = 0; k < 64; k++) {
    const a = (k / 64) * TAU;
    const m = P(k % 4 === 0 ? 6.95 : 7.0, a, 0.013);
    glowBox(0.05, 0.008, k % 4 === 0 ? 1.1 : 0.45, k % 2 ? g.purple : g.cyan, m.x, m.y, m.z, a);
  }
  // the arrival pad
  const pad = ship.places.pad;
  b.put(new THREE.CylinderGeometry(1.6, 1.8, 0.12, 32), c.hullPale, pad.x, 0.06, pad.z);
  glow.push({ geo: at(new THREE.TorusGeometry(1.5, 0.05, 6, 40).rotateX(Math.PI / 2), pad.x, 0.13, pad.z), color: g.cyan });
  glow.push({ geo: at(new THREE.TorusGeometry(1.0, 0.03, 6, 32).rotateX(Math.PI / 2), pad.x, 0.13, pad.z), color: g.cyanDim });

  // ---- the hangar's beam: its pad, a faint column of light ----
  const beamAt = ship.places.beam;
  b.put(new THREE.CylinderGeometry(2.2, 2.4, 0.12, 32), c.hullPale, beamAt.x, beamAt.y + 0.06, beamAt.z);
  glow.push({ geo: at(new THREE.TorusGeometry(2.1, 0.06, 6, 44).rotateX(Math.PI / 2), beamAt.x, beamAt.y + 0.13, beamAt.z), color: g.cyan });
  // (Nov 26: at the runway's far end now, and tall: you see where you're going from across the hall)
  const beamH = ship.runway ? ship.runway.hall.ceil - beamAt.y : 9.8;
  const beamCol = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.1, beamH, 24, 1, true), new THREE.MeshBasicMaterial({ color: g.cyan, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beamCol.position.set(beamAt.x, beamAt.y + beamH / 2, beamAt.z);
  // the runway's checkpoints: a lit gate over the track at each
  for (const cp of ship.runway?.checkpoints ?? []) {
    b.push(cp.x, cp.y, cp.z, cp.h);
    for (const sx of [-1, 1]) {
      b.box(0.35, 4.8, 0.35, c.hullPale, sx * 5.2, 2.4, 0);
      const p0 = b.point(sx * 5.0, 2.4, 0);
      glow.push({ geo: at(new THREE.BoxGeometry(0.06, 4.6, 0.06), p0.x, p0.y, p0.z, cp.h), color: g.cyan });
    }
    b.box(10.8, 0.4, 0.4, c.hullPale, 0, 4.9, 0);
    const p1 = b.point(0, 4.65, 0);
    glow.push({ geo: at(new THREE.BoxGeometry(10.2, 0.08, 0.06), p1.x, p1.y, p1.z, cp.h), color: g.cyan });
    b.pop();
  }

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
  // The decks in their grating: baked light like the rest, a tiled texture over it.
  const grateGeo = mergeGeometries(grated.map((x) => (x.index ? x.toNonIndexed() : x)));
  grated.forEach((x) => x.dispose());
  planarUV(grateGeo, 1.1);
  bakeLight(grateGeo, g.reactor, g.cyan);
  const grateTex = gratingTexture();
  const grateMat = new THREE.MeshLambertMaterial({ vertexColors: true, map: grateTex });
  const grateM = new THREE.Mesh(grateGeo, grateMat);
  grateM.receiveShadow = true;
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
  // ---- sparks: a burst from each emitter now and then, falling slow in the low gravity ----
  const sparks = buildSparks(emitters);

  group.add(sky.group, mesh, grateM, glowM, reactor, core, beamCol, ...stripMeshes, liftGroup, curioGroup, netM, winM, sparks.group, steam.group);
  for (const { grp } of lootMeshes.values()) group.add(grp);

  let time = 0;
  let power = 1;
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
      plasmaMat.uniforms.power.value = k;
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
    // Called with each burst's spot (the ship's frame): the encounter plays its crackle if Tom's near.
    onSpark: null,
    update(dt, camera = null) {
      sparks.update(dt, (p) => api.onSpark?.(p));
      time += dt;
      core.rotation.y += dt * 0.9;
      core.children[1].scale.setScalar(1 + Math.sin(time * 3) * 0.08);
      plasmaMat.uniforms.time.value = time;
      // Taken: it stutters (power flickers round its dimmed level).
      plasmaMat.uniforms.power.value = power < 1 ? power * (0.6 + 0.4 * Math.abs(Math.sin(time * 9))) : 1;
      steam.update(dt);
      const blink = 0.55 + 0.45 * Math.abs(Math.sin(time * 3.2));
      for (const s of stripMats.values()) if (s.on) s.mat.color.copy(red).multiplyScalar(blink);
      if (camera) sky.group.position.copy(camera.position).sub(group.position);
    },
    dispose() {
      group.removeFromParent();
      geometry.dispose();
      material.dispose();
      grateGeo.dispose();
      grateMat.dispose();
      grateTex.dispose();
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
        if (o === mesh || o === grateM || o === glowM || o === netM || o === winM || stripMeshes.includes(o)) return;
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

function drawWall(b, s, c) {
  b.box(s.hx * 2, s.y1 - s.y0, s.hz * 2, c.hull, s.x, (s.y0 + s.y1) / 2, s.z, s.a ?? 0);
  // (its ribs come from the layout: ship.ribs, cut round the doors and hatches on it)
}

function drawHull(b, glow, s, c, g) {
  b.put(sectorGeo(s.r0, s.r1, s.a0, s.a1, s.y0, s.y1, { top: false, bottom: false }), c.hull);
  // panels: a seam every 3 m up, ribs every 11.25 degrees round
  for (let y = Math.ceil((s.y0 + 0.01) / 3) * 3; y < s.y1; y += 3) b.put(sectorGeo(s.r0 - 0.03, s.r0, s.a0, s.a1, y - 0.03, y + 0.03, { ends: false }), c.hullDark);
  // (its pillars come from the layout: ship.pillars, between the panels and cut round the doors)
  // (its neon circuits are drawn panel by panel: drawCircuits)
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
  const DIP = 0.035; // the horizon's dip below level, from this high
  const earthGeo = new THREE.SphereGeometry(R * 0.96, 96, 28, 0, TAU, Math.PI / 2 + DIP, Math.PI / 2 - DIP);
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
    const below = -y; // DIP at the limb .. 1 straight down
    // ground coordinates: project onto a plane under the ship (the forest spread out below)
    const k = 1 / Math.max(0.12, below);
    const gx = x * k * 3;
    const gz = z * k * 3;
    const n1 = Math.sin(gx * 1.3 + Math.sin(gz * 0.7) * 2) * Math.cos(gz * 1.1 - gx * 0.4);
    const n2 = Math.sin(gx * 4.1 + gz * 3.3) * Math.sin(gz * 5.2 - gx * 2.7);
    tmp.copy(n1 > 0.55 ? sea : land).multiplyScalar(0.55 + 0.25 * n2);
    const cl = Math.max(0, Math.sin(gx * 0.8 + n2 * 1.5) * Math.sin(gz * 0.9 - gx * 0.3) - 0.35) * 1.6;
    tmp.lerp(cloud, Math.min(0.8, cl));
    const limb = Math.max(0, 1 - (below - DIP) / 0.12);
    tmp.lerp(air, limb * 0.75);
    tmp.multiplyScalar(0.75);
    ec.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  earthGeo.setAttribute('color', new THREE.BufferAttribute(ec, 3));
  const earth = new THREE.Mesh(earthGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false }));
  earth.renderOrder = -1;
  // the moon
  const moon = new THREE.Mesh(new THREE.CircleGeometry(1.6, 24), new THREE.MeshBasicMaterial({ color: 0xe8ecf0, depthWrite: false, depthTest: false, fog: false }));
  moon.position.set(-0.35 * R * 0.9, 0.42 * R * 0.9, 0.84 * R * 0.9);
  moon.lookAt(0, 0, 0);
  moon.renderOrder = -1.2;
  // space behind it all: near black, a little violet toward the top
  const backGeo = new THREE.SphereGeometry(R * 1.02, 48, 64);
  const bp = backGeo.getAttribute('position');
  const bc = new Float32Array(bp.count * 3);
  const deep = new THREE.Color(0x020208);
  const violet = new THREE.Color(0x0c0820);
  const glowAir = new THREE.Color(g.atmosphere);
  for (let i = 0; i < bp.count; i++) {
    const y = bp.getY(i) / (R * 1.02);
    tmp.copy(deep).lerp(violet, Math.max(0, y));
    // the atmosphere's glow just over the limb (opaque: a see-through band here would draw over the ship)
    tmp.lerp(glowAir, 0.55 * Math.exp(-Math.abs(y + DIP * 0.5) / 0.035));
    bc.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  backGeo.setAttribute('color', new THREE.BufferAttribute(bc, 3));
  const back = new THREE.Mesh(backGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false }));
  back.renderOrder = -1.8;
  group.add(back, stars, earth, moon);
  return { group };
}

// ---- the second pass's wall details ------------------------------------------------------------------

// One detail ({ kind, x, y, z, a }: a faces out from its wall), in its own frame: x across the wall, y up, z out.
function drawDetail(b, glow, glass, putGeo, emitters, d, c, g) {
  if (d.kind === 'pipe') {
    const from = new THREE.Vector3(d.from.x, d.from.y, d.from.z);
    const to = new THREE.Vector3(d.to.x, d.to.y, d.to.z);
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    const mid = from.clone().add(to).multiplyScalar(0.5);
    putGeo(new THREE.CylinderGeometry(d.r, d.r, len, 8).applyMatrix4(new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, 1, 1))), c.pipe);
    for (let t = 1; t < len; t += 2) {
      const p = from.clone().addScaledVector(dir, t / len);
      putGeo(new THREE.CylinderGeometry(d.r + 0.04, d.r + 0.04, 0.12, 8).applyMatrix4(new THREE.Matrix4().compose(p, q, new THREE.Vector3(1, 1, 1))), c.hullDark);
    }
    return;
  }
  b.push(d.x, d.y, d.z, d.a);
  const gl = (geo, color, x, y, z, rx = 0) => {
    const p = b.point(x, y, z);
    glow.push({ geo: at(geo, p.x, p.y, p.z, d.a, rx), color });
  };
  switch (d.kind) {
    case 'hatch': {
      // A panel left open behind glass: cables looping down inside it, glowing (picture 1, the left wall).
      b.box(0.85, 1.3, 0.04, c.hullDark, 0, 0, 0.02);
      for (const sy of [-1, 1]) b.box(0.97, 0.08, 0.14, c.hullPale, 0, sy * 0.69, 0.07);
      for (const sx of [-1, 1]) b.box(0.08, 1.46, 0.14, c.hullPale, sx * 0.47, 0, 0.07);
      b.box(0.05, 0.22, 0.06, c.rail, 0.38, 0, 0.17); // its handle
      const cols = [g.cyan, 0xc8f8ff, g.purple];
      cols.forEach((col, i) => {
        const x0 = -0.25 + i * 0.22;
        const pts = [];
        for (let k = 0; k <= 8; k++) {
          const t = k / 8;
          pts.push(b.point(x0 + Math.sin(t * Math.PI * 2 + i) * 0.12, 0.6 - t * 1.2, 0.06 + Math.sin(t * Math.PI * 3 + i * 2) * 0.03));
        }
        glow.push({ geo: new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.022, 5, false), color: col });
      });
      const gp = b.point(0, 0, 0.13);
      glass.push(at(new THREE.PlaneGeometry(0.85, 1.3), gp.x, gp.y, gp.z, d.a));
      break;
    }
    case 'junction': {
      // A junction box, its lid sprung, something inside it shorting (picture 1).
      b.box(0.44, 0.36, 0.2, c.console, 0, 0, 0.1);
      b.box(0.44, 0.04, 0.26, c.hullPale, 0, 0.2, 0.17, 0, -0.5);
      b.box(0.07, 0.9, 0.07, c.pipe, 0.12, 0.62, 0.04);
      gl(new THREE.BoxGeometry(0.3, 0.2, 0.01), 0xff9a40, 0, -0.02, 0.205);
      emitters.push({ p: b.point(0, 0, 0.26), dir: new THREE.Vector3(Math.sin(d.a), 0, Math.cos(d.a)) });
      break;
    }
    case 'vent': {
      b.box(1.12, 0.44, 0.06, c.hullDark, 0, 0, 0.03);
      for (let i = 0; i < 5; i++) b.box(1.02, 0.035, 0.09, c.hullPale, 0, -0.16 + i * 0.08, 0.05, 0, 0.5);
      break;
    }
    case 'sealed': {
      // A door that doesn't open: a recess, two leaves, its seam and lock glowing violet. The wall light over it is its lamp.
      b.box(1.7, 2.42, 0.05, c.hullDark, 0, 1.21, 0.02);
      for (const sx of [-1, 1]) b.box(0.16, 2.6, 0.22, c.hullPale, sx * 0.93, 1.3, 0.09);
      b.box(2.02, 0.18, 0.22, c.hullPale, 0, 2.6, 0.09);
      b.box(1.7, 0.1, 0.12, c.panel, 0, 0.05, 0.06);
      gl(new THREE.BoxGeometry(0.03, 2.2, 0.01), g.violet, 0, 1.15, 0.055);
      gl(new THREE.BoxGeometry(0.14, 0.14, 0.01), g.purple, 0.62, 1.25, 0.06);
      // its neon frame (the new core-hall picture): a bright cyan outline, a purple one outside it
      for (const sx of [-1, 1]) gl(new THREE.BoxGeometry(0.06, 2.5, 0.02), g.cyan, sx * 0.84, 1.25, 0.21);
      gl(new THREE.BoxGeometry(1.74, 0.06, 0.02), g.cyan, 0, 2.5, 0.21);
      for (const sx of [-1, 1]) gl(new THREE.BoxGeometry(0.04, 2.75, 0.02), g.purple, sx * 1.07, 1.38, 0.05);
      gl(new THREE.BoxGeometry(2.18, 0.04, 0.02), g.purple, 0, 2.76, 0.05);
      break;
    }
    case 'pipeSparks': {
      // A reactor pipe split open: a torn collar, the pipe's end bent out, sparking (the new core-hall picture).
      b.box(0.5, 0.18, 0.5, c.hullDark, 0, 0, -0.1, 0.4, 0.3);
      b.box(0.14, 0.4, 0.14, c.pipe, 0.12, -0.25, 0.05, 0, 0.5, 0.3);
      gl(new THREE.BoxGeometry(0.16, 0.05, 0.01), 0xff9a40, 0, 0.02, 0.17);
      emitters.push({ p: b.point(0, 0.02, 0.2), dir: new THREE.Vector3(Math.sin(d.a), 0.4, Math.cos(d.a)) });
      emitters.push({ p: b.point(0.1, -0.4, 0.15), dir: new THREE.Vector3(Math.sin(d.a), -0.2, Math.cos(d.a)) });
      break;
    }
    case 'sparks': {
      // The stair's torn end: bent tread plates hanging, a cable down from it, sparking.
      b.box(1.2, 0.08, 0.5, c.stair, -0.3, -0.25, 0.1, 0, 0.5, 0.2);
      b.box(0.8, 0.06, 0.4, c.stair, 0.5, -0.4, 0.05, 0.3, 0.8, -0.3);
      b.box(0.5, 0.05, 0.3, c.hullDark, 0.1, -0.55, -0.05, 0, 1.1);
      b.put(new THREE.CylinderGeometry(0.025, 0.025, 1.4, 6), c.liftDark, 0.25, -0.95, 0.05, 0, 0.12);
      emitters.push({ p: b.point(0.25, -1.62, 0.12), dir: new THREE.Vector3(0, -0.3, 0) });
      emitters.push({ p: b.point(-0.2, -0.2, 0.3), dir: new THREE.Vector3(Math.sin(d.a), 0, Math.cos(d.a)) });
      break;
    }
    default:
      break;
  }
  b.pop();
}

// Sparks: each emitter bursts every 0.9-3.2 s; its sparks fly out along its facing, fall at the ship's 4.2 m/s², die.
function buildSparks(emitters, per = 14) {
  const n = Math.max(1, emitters.length * per);
  const pos = new Float32Array(n * 3).fill(-1e4);
  const vel = new Float32Array(n * 3);
  const life = new Float32Array(n);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffc878, size: 0.07, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  points.frustumCulled = false;
  points.renderOrder = 2;
  const group = new THREE.Group();
  group.add(points);
  const flashGeo = new THREE.SphereGeometry(0.22, 8, 6);
  let seed = 31;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (const e of emitters) {
    e.t = 0.3 + rnd() * 2.5;
    e.flash = new THREE.Mesh(flashGeo, new THREE.MeshBasicMaterial({ color: 0xffd8a0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    e.flash.position.copy(e.p);
    group.add(e.flash);
  }
  return {
    group,
    update(dt, onBurst) {
      emitters.forEach((e, ei) => {
        e.t -= dt;
        e.flash.material.opacity = Math.max(0, e.flash.material.opacity - dt * 6);
        if (e.t > 0) return;
        e.t = 0.9 + rnd() * 2.3;
        e.flash.material.opacity = 0.9;
        for (let k = 0; k < per; k++) {
          const i = ei * per + k;
          pos.set([e.p.x, e.p.y, e.p.z], i * 3);
          const sp = 0.6 + rnd() * 1.8;
          vel.set([e.dir.x * sp + (rnd() - 0.5) * 2.2, e.dir.y * sp + rnd() * 1.6, e.dir.z * sp + (rnd() - 0.5) * 2.2], i * 3);
          life[i] = 0.35 + rnd() * 0.55;
        }
        onBurst?.(e.p);
      });
      for (let i = 0; i < n; i++) {
        if (life[i] <= 0) continue;
        life[i] -= dt;
        if (life[i] <= 0) {
          pos[i * 3 + 1] = -1e4;
          continue;
        }
        vel[i * 3 + 1] -= 4.2 * dt;
        pos[i * 3] += vel[i * 3] * dt;
        pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
        pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      }
      geo.getAttribute('position').needsUpdate = true;
    },
  };
}

// ---- the reactor's plasma, the base's steam ----------------------------------------------------------

// Electric veins crawling up the inside of the glass (the new core-hall picture): three layers of bright,
// wandering filaments over a dim cyan body. uniforms: time (s), power (0..1: the core taken dims and stutters it).
export function plasmaMaterial(colour) {
  return new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, power: { value: 1 }, colA: { value: new THREE.Color(colour) }, colB: { value: new THREE.Color(0xe6ffff) } },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform float time;
      uniform float power;
      uniform vec3 colA;
      uniform vec3 colB;
      varying vec2 vUv;
      float vein(vec2 p, float s, float t, float k) {
        float x = p.x * s + sin(p.y * k + t) * 0.9 + sin(p.y * k * 2.3 - t * 1.3) * 0.35;
        return 0.04 / (abs(sin(x)) + 0.04);
      }
      void main() {
        vec2 p = vec2(vUv.x * 6.2832, vUv.y * 44.0);
        float t = time;
        float v = vein(p, 2.0, t * 2.1, 0.45) + vein(p + vec2(1.7, 3.1), 3.0, -t * 1.6, 0.7) * 0.8 + vein(p + vec2(4.1, 7.0), 5.0, t * 2.7, 1.1) * 0.5;
        float flick = 0.85 + 0.15 * sin(t * 13.0 + p.y * 0.5);
        vec3 body = colA * (0.3 + 0.12 * sin(p.y * 0.8 - t * 3.0) + 0.06 * sin(p.x * 3.0 + t));
        float bright = clamp(v * 0.3, 0.0, 1.0);
        vec3 c = body + mix(colA, colB, bright) * bright * 0.85 * flick;
        gl_FragColor = vec4(c * (0.2 + 0.8 * power), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side: THREE.FrontSide,
  });
}

// Steam off the reactor's base: soft puffs rising slow from its vents, spreading and fading (additive, so a
// darker colour is a fainter puff).
function buildSteam(ship, per = 10) {
  const vents = [];
  for (const s of ship.solids.filter((x) => x.style === 'reactorBase')) for (let a = s.a0 + 0.3; a < s.a1 - 0.2; a += 0.9) vents.push(P(s.r1 - 0.3, a, s.y1));
  const n = Math.max(1, vents.length * per);
  const pos = new Float32Array(n * 3).fill(-1e4);
  const col = new Float32Array(n * 3);
  const age = new Float32Array(n).map((_, i) => (i / n) * 4.5);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - size / 2 + 0.5, y - size / 2 + 0.5) / (size / 2);
      const v = Math.max(0, 1 - d);
      data.set([255, 255, 255, Math.round(255 * v * v)], (y * size + x) * 4);
    }
  }
  const tex = new THREE.DataTexture(data, size, size);
  tex.needsUpdate = true;
  const points = new THREE.Points(geo, new THREE.PointsMaterial({ size: 2.2, map: tex, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  points.frustumCulled = false;
  points.renderOrder = 2;
  const group = new THREE.Group();
  group.add(points);
  const LIFE = 4.5;
  return {
    group,
    update(dt) {
      for (let i = 0; i < n; i++) {
        age[i] += dt;
        const v = vents[Math.floor(i / per)];
        if (age[i] >= LIFE) age[i] -= LIFE;
        const k = age[i] / LIFE;
        const drift = i * 2.39;
        pos[i * 3] = v.x + Math.sin(drift) * k * 0.9;
        pos[i * 3 + 1] = v.y + k * 3.2;
        pos[i * 3 + 2] = v.z + Math.cos(drift) * k * 0.9;
        const a = Math.sin(Math.PI * k) * 0.05;
        col[i * 3] = a * 0.75;
        col[i * 3 + 1] = a * 0.95;
        col[i * 3 + 2] = a;
      }
      geo.getAttribute('position').needsUpdate = true;
      geo.getAttribute('color').needsUpdate = true;
    },
  };
}

// ---- the second look (the new core-hall picture): grating, circuits --------------------------------------

// A geometry with a flat vertex colour (for meshes baked outside SetBuilder).
function colourGeo(geo, hex) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (g !== geo) geo.dispose();
  if (g.getAttribute('uv')) g.deleteAttribute('uv');
  if (!g.getAttribute('normal')) g.computeVertexNormals();
  const c = new THREE.Color(hex);
  const n = g.getAttribute('position').count;
  const cols = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) cols.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return g;
}

// UVs from x and z (tile metres a side): the grating lies the same way on every deck.
function planarUV(geo, tile) {
  const p = geo.getAttribute('position');
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) uv.set([p.getX(i) / tile, p.getZ(i) / tile], i * 2);
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

// A deck plate's grating (made, not loaded): rows of slots between bars, each slot's lip catching the light.
export function gratingTexture(size = 64) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sx = x % 16;
      const sy = y % 8;
      let v = 0.66; // the plate
      if (sx > 1 && sx < 15 && sy > 1 && sy < 6) v = 0.18; // a slot
      if (sx > 1 && sx < 15 && sy === 1) v = 0.98; // its lip
      if (x % 32 === 0 || y % 32 === 0) v = 0.55; // the plate's seam
      const n = 0.94 + 0.06 * Math.sin(x * 12.9898 + y * 78.233);
      const k = Math.round(255 * Math.min(1, v * n));
      data.set([k, k, k, 255], (y * size + x) * 4);
    }
  }
  const tex = new THREE.DataTexture(data, size, size);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// The walls' neon circuits (the new core-hall picture): on each panel between two pillars, a bold trace or two in
// cyan or purple (up, across, up, to a node), low on each deck's wall and a sparser band higher up. Nothing goes
// over a door, a hatch, a light or an opening (the layout's clear zones).
function drawCircuits(glow, ship, g) {
  const RW = 14.965;
  const onHull = (ship.clear ?? []).filter((z) => Math.abs(Math.hypot(z.x, z.z) - 15) < 1.2);
  const free = (a, y0, y1) =>
    !onHull.some((z) => {
      const d = Math.abs(Math.atan2(Math.sin(a - Math.atan2(z.x, z.z)), Math.cos(a - Math.atan2(z.x, z.z)))) * 15;
      return d < z.half + 1.3 && y0 < z.y1 && z.y0 < y1;
    });
  // Does the hull stand here? (an opening's gap has none)
  const hull = ship.solids.filter((x) => x.style === 'hull');
  const walled = (a, y) => hull.some((h) => y >= h.y0 && y <= h.y1 && ((((a - h.a0) % TAU) + TAU) % TAU) <= h.a1 - h.a0);
  const seg = (a, u0, v0, u1, v1, y, colour, w) => {
    if (Math.abs(u1 - u0) < 1e-6) {
      const m = P(RW, a + u0 / RW, y + (v0 + v1) / 2);
      glow.push({ geo: at(new THREE.BoxGeometry(w, Math.abs(v1 - v0) + w, 0.012), m.x, m.y, m.z, a + u0 / RW), color: colour });
    } else {
      const am = a + (u0 + u1) / 2 / RW;
      const m = P(RW, am, y + v0);
      glow.push({ geo: at(new THREE.BoxGeometry(Math.abs(u1 - u0) + w, w, 0.012), m.x, m.y, m.z, am), color: colour });
    }
  };
  const node = (a, u, v, y, colour) => {
    const m = P(RW - 0.004, a + u / RW, y + v);
    glow.push({ geo: at(new THREE.BoxGeometry(0.13, 0.13, 0.014), m.x, m.y, m.z, a + u / RW), color: colour });
  };
  const PATTERNS = [
    [[-0.8, 0, -0.8, 0.9], [-0.8, 0.9, 0.3, 0.9], [0.3, 0.9, 0.3, 1.6]],
    [[0.7, 0.2, 0.7, 0.6], [0.7, 0.6, -0.4, 0.6], [-0.4, 0.6, -0.4, 1.4], [-0.4, 1.4, 0.2, 1.4]],
    [[-0.9, 1.2, 0.9, 1.2], [-0.3, 1.2, -0.3, 0.3], [0.5, 1.2, 0.5, 1.8]],
  ];
  ship.levels.forEach((ly, li) => {
    for (let k = 0; k < 32; k++) {
      const a = (k / 32) * TAU;
      const bands = [[0.35, 2.15]];
      if ((k + li) % 3 === 0) bands.push([3.6, 5.4]);
      bands.forEach(([b0, b1], bi) => {
        const y = ly + b0;
        if (!walled(a, y + 0.9) || !free(a, y, ly + b1)) return;
        const pat = PATTERNS[(k + li * 2 + bi) % PATTERNS.length];
        const colour = (k + li) % 2 ? g.purple : g.cyan;
        for (const [u0, v0, u1, v1] of pat) seg(a, u0, v0, u1, v1, y, colour, 0.055);
        const end = pat[pat.length - 1];
        node(a, end[2], end[3], y, colour);
        // a fainter twin beside the bold trace
        for (const [u0, v0, u1, v1] of pat) seg(a, u0 + 0.12, v0 - 0.1, u1 + 0.12, v1 - 0.1, y, (k + li) % 2 ? g.violet : g.cyanDim, 0.025);
      });
    }
  });
}

// ---- the runway's pieces (Nov 26) ------------------------------------------------------------------

// A deck, a ramp or a slope of the track: grated on top, a dark truss under it, cyan neon down both edges;
// chevrons on its ramps (purple; cyan, brighter, on a boost's run-up and ramp) pointing the way.
function drawTrack(b, glow, grated, s, c, g) {
  const a = s.a ?? 0;
  const rise = s.kind === 'ramp' ? s.y1 - s.y0 : 0;
  const L = s.hz * 2;
  const thick = s.kind === 'ramp' ? s.thick ?? 0.6 : s.y1 - s.y0;
  const top = (lz) => (s.kind === 'ramp' ? s.y0 + (rise * (lz + s.hz)) / L : s.y1);
  const len = Math.hypot(L, rise);
  const pitch = Math.atan2(rise, L);
  const midTop = top(0);
  grated.push(colourGeo(at(new THREE.BoxGeometry(s.hx * 2, thick, len), s.x, midTop - thick / 2, s.z, a, -pitch), c.deck));
  // the truss under it (narrower, deeper)
  b.box(s.hx * 1.1, 1.0, len, c.hullDark, s.x, midTop - thick - 0.5, s.z, a, -pitch);
  // its edges
  b.push(s.x, 0, s.z, a);
  for (const sx of [-1, 1]) {
    const p = b.point(sx * (s.hx - 0.08), midTop + 0.012, 0);
    glow.push({ geo: at(new THREE.BoxGeometry(0.1, 0.03, len - 0.2), p.x, p.y, p.z, a, -pitch), color: g.cyan });
  }
  // chevrons
  const chev = s.boost ? g.cyan : g.purple;
  if (s.style === 'trackRamp' || s.boost) {
    for (let lz = -s.hz + 1.2; lz < s.hz - 0.6; lz += 2.4) {
      for (const sx of [-1, 1]) {
        const p = b.point(sx * 0.7, top(lz) + 0.02, lz);
        const ang = a + sx * 0.9;
        glow.push({ geo: at(new THREE.BoxGeometry(0.16, 0.02, 1.6), p.x, p.y, p.z, ang, -pitch), color: chev });
      }
    }
  }
  b.pop();
}

// The drop's floor, far below the track: dark, a faint cyan grid every 10 m.
function drawAbyss(b, glow, s, c, g) {
  b.box(s.hx * 2, s.y1 - s.y0, s.hz * 2, c.hullDark, s.x, (s.y0 + s.y1) / 2, s.z);
  for (let x = s.x - s.hx + 10; x < s.x + s.hx; x += 10) glow.push({ geo: at(new THREE.BoxGeometry(0.12, 0.02, s.hz * 2), x, s.y1 + 0.01, s.z), color: g.violet });
  for (let z = s.z - s.hz + 10; z < s.z + s.hz; z += 10) glow.push({ geo: at(new THREE.BoxGeometry(s.hx * 2, 0.02, 0.12), s.x, s.y1 + 0.01, z), color: g.cyanDim });
}

// The hall's walls: dark steel, a pillar every 12 m, neon bands at the track's height and above.
function drawHallWall(b, glow, s, c, g) {
  b.box(s.hx * 2, s.y1 - s.y0, s.hz * 2, c.hull, s.x, (s.y0 + s.y1) / 2, s.z);
  const longX = s.hx >= s.hz;
  const L = longX ? s.hx * 2 : s.hz * 2;
  if (L < 6) return;
  const face = longX ? s.hz : s.hx;
  for (const side of [-1, 1]) {
    for (let t = -L / 2 + 6; t < L / 2; t += 12) {
      const x = longX ? s.x + t : s.x + side * (face + 0.4);
      const z = longX ? s.z + side * (face + 0.4) : s.z + t;
      b.box(longX ? 1.2 : 0.8, s.y1 - s.y0, longX ? 0.8 : 1.2, c.panel, x, (s.y0 + s.y1) / 2, z);
    }
    for (const y of [36.6, 48]) {
      if (y < s.y0 || y > s.y1) continue;
      const x = longX ? s.x : s.x + side * (face + 0.02);
      const z = longX ? s.z + side * (face + 0.02) : s.z;
      glow.push({ geo: at(new THREE.BoxGeometry(longX ? L : 0.04, 0.1, longX ? 0.04 : L), x, y, z), color: y < 40 ? g.cyan : g.violet });
    }
  }
}

// The hall's great window (its far side): glass floor to ceiling, framed every 10 m, the Earth beyond.
function drawHallWindow(b, glass, s, c) {
  const W = s.hx * 2;
  const H = s.y1 - s.y0;
  glass.push(at(new THREE.PlaneGeometry(W, H), s.x, (s.y0 + s.y1) / 2, s.z + s.hz));
  for (let x = s.x - s.hx; x <= s.x + s.hx + 0.01; x += 10) b.box(0.8, H, 0.8, c.hullPale, x, (s.y0 + s.y1) / 2, s.z + s.hz);
  for (const y of [s.y0 + H * 0.35, s.y0 + H * 0.7]) b.box(W, 0.5, 0.8, c.hullPale, s.x, y, s.z + s.hz);
}
