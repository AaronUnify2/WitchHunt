// The railway cutting's set (Session 27; DESIGN.md "The railway cutting: the
// 1903 line"): the last train out of Hemlock Gap, stopped in the cut on the
// night of October 13, 1903 and never moved again. All in code, baked into
// ONE vertex-coloured mesh (render/propKit.js, render/setBuilder.js): one
// draw call for the set, no lights, dull colours (the glare rule). Pieces
// that change in play are their own small meshes: the cowcatcher and boiler
// plate (taken: the killdozer's armour), the powder store's barred door,
// the lantern on the line (an unlit glow).
//
//  - the faces: blasted rock up both banks (slabs, ledges of strata, the
//    half-barrel drill holes the navvies left), rubble at their feet, moss
//    and ferns on the ledges, roots hanging over the tops; broken where a
//    pathway's gully comes down (world/railCutting.js);
//  - the engine: a 4-4-0, black gone to rust, its stack, domes and bell,
//    the headlamp's lens dark, its cab's roof sagging with a sapling up
//    through it; the cowcatcher (pilot) and a sheet of its boiler plate
//    hanging loose; a lantern set down neat on the sleepers ahead of it;
//  - the tender, a sapling up through the coal;
//  - two coaches in faded Tuscan red, clerestory roofs, windows out, doors
//    hanging at their end platforms, a young tree up through the first's
//    floor and out its roof; inside, the plush benches, the racks, the
//    stove, and a town's belongings where they were left;
//  - the baggage car off the rails at the back, leaning on the bank, its
//    door slid open on trunks and crates;
//  - the powder store up the bank: a squat stone hut, POWDER on its lintel,
//    its plank door barred with iron in staples; the navvies' timber steps
//    up the face beside it.
//
// Model space: the cutting's frame (world/railCutting.js): Z along the line
// (toward the east), X across it (+X its north side), the origin on the line
// in the clearing's middle.
//
// buildRailwayCutting(cfg, opts) returns { group, mesh, parts: { cowcatcher,
// door, doorOpen, lantern, doll, maul, crates }, spots, colliders, rooms, dispose }. opts:
// { weather, heightAt(X, Z) (the ground, relative to the origin), lineAt(Z)
// ({ x, yaw }: the real line), cut (config.map.railway.cutting), keepAt(X, Z)
// (0 in a pathway's gully, 1 clear), side (the store's bank, +1 / -1), storeZ }.
// rooms: each coach's inside as a room platform's numbers (model space).

import * as THREE from 'three';
import { bakeParts, noise3 } from './propKit.js';
import { SetBuilder } from './setBuilder.js';

const TAU = Math.PI * 2;

// A lump of blasted rock: a box broken up by noise (corners knocked in and out; shared corners
// moved alike, so it stays closed).
function rockGeo(w, h, d, seed) {
  const g = new THREE.BoxGeometry(w, h, d, 2, 2, 1);
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const k = 1.9;
    p.setXYZ(i, x + (noise3(x * k + seed, y * k, z * k) - 0.5) * w * 0.35, y + (noise3(x * k, y * k + seed, z * k + 7) - 0.5) * h * 0.35, z + (noise3(x * k + 3, y * k, z * k + seed) - 0.5) * d * 0.5);
  }
  g.computeVertexNormals();
  return g;
}

// The cars' places along the line (pure): [{ ...car, z0 (front end), z1 (back end), zc }] with the
// engine's front at train.front, in the heading's direction.
export function trainLayout(train) {
  const out = [];
  let z = train.front;
  for (const car of train.cars) {
    z -= car.gap;
    const z0 = z;
    const z1 = z - car.length;
    out.push({ ...car, z0: z0 * train.heading, z1: z1 * train.heading, zc: ((z0 + z1) / 2) * train.heading });
    z = z1;
  }
  return out;
}

// ---- small pieces --------------------------------------------------------------------------------

// A wheel (its axle along x), at (x, y, z) in the current frame.
function wheel(b, r, x, y, z, color, spokes = 0) {
  const c = b.c;
  b.put(new THREE.CylinderGeometry(r, r, 0.12, r > 0.6 ? 14 : 10).rotateZ(Math.PI / 2), color, x, y, z);
  b.put(new THREE.CylinderGeometry(r * 0.22, r * 0.22, 0.2, 6).rotateZ(Math.PI / 2), c.ironDark, x, y, z);
  for (let i = 0; i < spokes; i++) b.box(0.05, r * 1.8, 0.07, c.ironDark, x + Math.sign(x) * 0.065, y, z, 0, (i / spokes) * Math.PI);
}

// A sapling: a young tree up through whatever it's grown through (its frame: the ground under it).
function sapling(b, h, lean = 0) {
  const c = b.c;
  b.push(0, 0, 0, b.rand() * TAU, lean, lean * 0.5);
  b.put(new THREE.CylinderGeometry(0.035, 0.08, h, 6), c.bark, 0, h / 2, 0);
  for (let i = 0; i < 4; i++) {
    const y = h * (0.55 + i * 0.13);
    b.push(0, y, 0, b.rand() * TAU, 0, 0.9 + b.rand() * 0.4);
    b.put(new THREE.CylinderGeometry(0.012, 0.025, 1.1, 4), c.bark, 0, 0.55, 0);
    b.put(new THREE.IcosahedronGeometry(0.42 + b.rand() * 0.2, 0).scale(1.2, 0.7, 1.2), i % 2 ? c.leaf : c.leafDark, 0, 1.05, 0);
    b.pop();
  }
  b.put(new THREE.IcosahedronGeometry(0.5, 0).scale(1, 0.8, 1), c.leaf, 0, h + 0.2, 0);
  b.pop();
}

// A fern clump on the ground (its frame).
function fern(b, s = 1) {
  const c = b.c;
  for (let i = 0; i < 5; i++) b.box(0.08 * s, 0.02, 0.55 * s, i % 2 ? c.fern : c.mossDark, 0, 0.12 * s, 0, (i / 5) * TAU, -0.5, 0);
}

// ---- the faces ------------------------------------------------------------------------------------

function faces(b, cfg, o) {
  const c = b.c;
  const cut = o.cut;
  const reach = cut.length + cut.nose * 0.8;
  const step = 1.4;
  for (const s of [-1, 1]) {
    for (let z = -reach; z <= reach; z += step) {
      const zz = z + (b.rand() - 0.5) * 0.5;
      const line = o.lineAt(zz).x;
      const foot = o.heightAt(line + s * cut.floorHalf, zz);
      const top = o.heightAt(line + s * (cut.floorHalf + cut.faceRun + 1.5), zz);
      const H = top - foot;
      if (H < 1.2 || o.keepAt(line + s * (cut.floorHalf + cut.faceRun * 0.5), zz) < 0.7) continue;
      if (o.side === s && Math.abs(zz - o.stepsZ) < 1.6) continue; // the navvies' steps
      // Slabs up the face where the ground is steep (read off the real ground: its 4 m grid softens
      // the banks' shape), each tipped back into the slope, overlapping.
      for (let X = cut.floorHalf - 0.6; X < cut.floorHalf + cut.faceRun + 2.5; X += 1.15) {
        const gx = line + s * X;
        const y0 = o.heightAt(gx, zz);
        const slope = (o.heightAt(gx + s * 0.5, zz) - o.heightAt(gx - s * 0.5, zz));
        if (slope < 0.4) continue;
        const w = 1.4 + b.rand() * 1.0;
        const h = 1.2 + b.rand() * 0.8;
        const tone = b.rand();
        const col = tone < 0.45 ? c.rock : tone < 0.75 ? c.rockDark : c.rockLight;
        const tilt = Math.atan(slope);
        b.push(gx - s * 0.15, y0 + 0.2, zz + (b.rand() - 0.5) * 0.6, s > 0 ? Math.PI / 2 : -Math.PI / 2, Math.PI / 2 - tilt + (b.rand() - 0.5) * 0.35, (b.rand() - 0.5) * 0.5);
        b.put(rockGeo(w, h, 0.8, b.rand() * 50), col, 0, 0, 0.1);
        // A ledge of strata, a lip of moss on it.
        if (b.rand() < 0.35) b.box(w * 0.9, 0.1, 0.9, c.strata, 0, h * 0.42, 0.1);
        if (b.rand() < 0.3) b.box(w * 0.6, 0.05, 0.5, b.rand() < 0.5 ? c.moss : c.mossDark, (b.rand() - 0.5) * 0.3, h * 0.45, 0.05);
        // The drill holes: dark half-barrel grooves down the face.
        if (b.rand() < 0.4) b.box(0.07, h * 0.85, 0.05, c.drill, (b.rand() - 0.5) * w * 0.6, 0, -0.33);
        b.pop();
      }
      // Rubble at the foot.
      if (b.rand() < 0.7) {
        const X = line + s * (cut.floorHalf - 0.2 + b.rand() * 0.6);
        b.pushOnGround(X, -0.05, zz + (b.rand() - 0.5) * 1.2, b.rand() * TAU);
        b.put(new THREE.DodecahedronGeometry(0.25 + b.rand() * 0.3, 0).scale(1.3, 0.7, 1), b.rand() < 0.5 ? c.rockDark : c.rock, 0, 0.12, 0);
        b.pop();
      }
      // Ferns on the top's lip, roots hanging over it.
      const lipX = line + s * (cut.floorHalf + cut.faceRun + 0.4);
      if (b.rand() < 0.45) {
        b.pushOnGround(lipX + s * b.rand(), 0, zz, b.rand() * TAU);
        fern(b, 0.8 + b.rand() * 0.6);
        b.pop();
      }
      if (b.rand() < 0.3) {
        const y = o.heightAt(lipX, zz);
        b.push(lipX - s * 0.4, y - 0.1, zz, 0, 0, s * (0.3 + b.rand() * 0.4));
        b.box(0.04, 1.4 + b.rand(), 0.04, c.root, 0, -0.7, 0);
        b.pop();
      }
    }
  }
}

// A boulder down off the face onto the floor.
function boulder(b, X, Z, r) {
  const c = b.c;
  b.pushOnGround(X, -r * 0.3, Z, b.rand() * TAU);
  b.put(new THREE.DodecahedronGeometry(r, 0).scale(1.2, 0.8, 1), c.rock, 0, r * 0.6, 0);
  b.box(r * 1.3, 0.04, r * 0.9, c.moss, 0, r * 1.22, 0, 0.3);
  b.pop();
  b.post(X, 0, Z, r * 1.05, r * 1.4);
}

// ---- the engine -------------------------------------------------------------------------------------

// A 4-4-0 (its frame: on the rails, its front toward +z, length L, the front end at z = L/2).
// The cowcatcher and the loose boiler plate go in `part` (their own mesh: taken).
function engine(b, L, part) {
  const c = b.c;
  const f = L / 2;
  const by = 2.15; // the boiler's axis
  const br = 0.72;
  // Frames, running boards, the buffer beam.
  b.box(1.1, 0.35, L - 1.6, c.ironDark, 0, 1.0, -0.4);
  for (const s of [-1, 1]) b.box(0.32, 0.05, L - 3.6, c.iron, s * 1.18, 1.42, 0.4);
  b.box(2.5, 0.38, 0.22, c.rustDark, 0, 1.0, f - 1.3);
  // The leading truck's four small wheels; the four drivers, their splashers; rods.
  for (const s of [-1, 1]) {
    for (const z of [f - 2.2, f - 3.25]) wheel(b, 0.42, s * 0.72, 0.42, z, c.iron, 8);
    for (const z of [-0.6, -2.5]) {
      wheel(b, 0.86, s * 0.72, 0.86, z, c.rust, 14);
      b.box(0.16, 0.08, 1.9, c.iron, s * 0.75, 1.76, z, 0, 0, 0); // the splasher's top
    }
    b.box(0.07, 0.12, 2.1, c.ironDark, s * 0.86, 0.95, -1.55, 0, 0.12); // the coupling rod, dropped at one end
    b.box(0.06, 0.1, 2.6, c.iron, s * 0.84, 1.05, 0.55, 0, -0.18); // the main rod
    // The cylinder and its steam chest.
    b.tubeZ(0.3, 0.3, f - 3.6, f - 2.6, c.boiler, s * 1.05, 1.1, 10, false);
    b.box(0.32, 0.5, 0.9, c.rustDark, s * 0.95, 1.55, f - 3.1);
  }
  // The boiler (lagged, banded), the smokebox and its door.
  b.tubeZ(br, br, -2.3, f - 2.0, c.boiler, 0, by, 16, false);
  for (const z of [-1.6, -0.4, 0.8]) b.tubeZ(br + 0.02, br + 0.02, z, z + 0.08, c.brass, 0, by, 16, false);
  b.tubeZ(br + 0.06, br + 0.06, f - 2.0, f - 1.25, c.ironDark, 0, by, 16, false);
  b.put(new THREE.CylinderGeometry(br * 0.92, br * 0.92, 0.08, 16).rotateX(Math.PI / 2), c.rustDark, 0, by, f - 1.22);
  b.box(0.08, 0.12, 0.08, c.brass, 0, by, f - 1.16);
  // The stack: tall, flared at the top.
  b.put(new THREE.CylinderGeometry(0.24, 0.2, 1.3, 10, 1, true), c.boiler, 0, by + br + 0.55, f - 1.65);
  b.put(new THREE.CylinderGeometry(0.42, 0.26, 0.4, 10, 1, true), c.rustDark, 0, by + br + 1.35, f - 1.65);
  // The domes (steam, sand), the bell between, the whistle.
  b.put(new THREE.CylinderGeometry(0.28, 0.34, 0.55, 12), c.boiler, 0, by + br + 0.18, -0.2);
  b.put(new THREE.SphereGeometry(0.29, 10, 5, 0, TAU, 0, Math.PI / 2), c.brass, 0, by + br + 0.45, -0.2);
  b.put(new THREE.CylinderGeometry(0.25, 0.3, 0.4, 12), c.boiler, 0, by + br + 0.1, 1.5);
  b.put(new THREE.SphereGeometry(0.26, 10, 5, 0, TAU, 0, Math.PI / 2), c.rustDark, 0, by + br + 0.3, 1.5);
  b.box(0.06, 0.45, 0.06, c.iron, -0.18, by + br + 0.25, 0.65);
  b.box(0.06, 0.45, 0.06, c.iron, 0.18, by + br + 0.25, 0.65);
  b.box(0.42, 0.06, 0.06, c.iron, 0, by + br + 0.48, 0.65);
  b.put(new THREE.CylinderGeometry(0.1, 0.2, 0.28, 10, 1, true), c.brass, 0, by + br + 0.3, 0.65, 0, 0, 0.35); // the bell, hung askew
  b.put(new THREE.CylinderGeometry(0.035, 0.05, 0.3, 6), c.brass, 0.15, by + br + 0.32, -0.6);
  // The headlamp: a big box lamp on the smokebox, its lens dark.
  b.box(0.62, 0.7, 0.66, c.lamp, 0, by + br + 0.25, f - 1.55);
  b.box(0.7, 0.08, 0.72, c.lamp, 0, by + br + 0.64, f - 1.55);
  b.put(new THREE.CylinderGeometry(0.24, 0.24, 0.04, 12).rotateX(Math.PI / 2), c.lampGlass, 0, by + br + 0.25, f - 1.2);
  // The firebox and the cab: wooden, its roof sagging, a window out, a sapling up through it.
  b.box(1.5, 1.0, 1.6, c.boiler, 0, 1.7, -3.1);
  const cz = -f + 1.25;
  b.box(2.6, 0.08, 2.5, c.woodDark, 0, 1.5, cz);
  for (const s of [-1, 1]) {
    b.box(0.07, 2.2, 2.5, c.wood, s * 1.27, 2.6, cz);
    b.box(0.08, 0.7, 0.9, c.hollow, s * 1.3, 3.05, cz + 0.45); // the window
    b.box(0.08, 0.7, 0.9, c.hollow, s * 1.3, 3.05, cz - 0.6);
  }
  b.box(2.6, 2.2, 0.07, c.woodDark, 0, 2.6, cz + 1.22);
  for (const [x, w, d] of [[0.85, 0.5, 0.6], [-0.85, 0.5, 0.6]]) b.box(w, 0.6, d, c.hollow, x, 3.2, cz + 1.26); // the spectacle plates' holes
  b.push(0, 3.75, cz, 0, 0.08, 0.05);
  b.box(2.9, 0.08, 1.4, c.roof, 0, 0, 0.7, 0, 0, 0);
  b.box(2.9, 0.08, 1.2, c.roofDark, 0, -0.12, -0.6, 0, -0.18, 0);
  b.pop();
  b.push(0.6, 1.55, cz - 0.3);
  sapling(b, 4.8, 0.1);
  b.pop();
  // The gauges and the throttle in the cab, the firebox door.
  b.box(0.7, 0.5, 0.05, c.ironDark, 0, 2.5, cz + 1.17);
  b.box(0.12, 0.12, 0.06, c.brass, -0.2, 2.65, cz + 1.13);
  b.box(0.12, 0.12, 0.06, c.brass, 0.15, 2.6, cz + 1.13);
  b.box(0.05, 0.6, 0.05, c.iron, 0.4, 2.3, cz + 1.0, 0, -0.4);

  // ---- the part: the cowcatcher and the boiler plate --------------------------------------------
  const pc = part.c;
  part.stack = [b.m.clone()];
  // The pilot: a wedge of slats from the buffer beam down to the rails, its point ahead.
  const tip = f;
  const beam = f - 1.25;
  for (let i = -4; i <= 4; i++) {
    const x = i * 0.27;
    const len = Math.hypot(tip - beam, 0.85);
    const yaw = Math.atan2(-x * 0.9, tip - beam);
    part.push(x * 0.5, 0.48, (tip + beam) / 2, yaw, Math.atan2(0.85, tip - beam) * -1 + 0.0, 0);
    part.box(0.08, 0.07, len, i % 2 ? pc.rust : pc.rustDark, 0, 0, 0);
    part.pop();
  }
  part.box(2.4, 0.12, 0.12, pc.rustDark, 0, 0.88, beam);
  part.box(0.6, 0.1, 0.1, pc.rust, 0, 0.12, tip - 0.05);
  for (const s of [-1, 1]) part.box(0.1, 0.1, 1.45, pc.iron, s * 0.75, 0.48, (tip + beam) / 2, s * -0.62, -0.5);
  // A sheet of boiler plate, sprung from its bolts, hanging down the side.
  part.push(br + 0.06, by + 0.1, 0.5, 0, 0, -0.35);
  part.box(0.05, 1.4, 1.9, pc.rustDark, 0, -0.5, 0);
  for (const z of [-0.8, 0, 0.8]) part.box(0.07, 0.07, 0.07, pc.brass, 0.03, 0.15, z);
  part.pop();
}

// ---- the tender ----------------------------------------------------------------------------------------

function tender(b, L) {
  const c = b.c;
  for (const s of [-1, 1]) for (const z of [L / 2 - 1.2, L / 2 - 2.1, -L / 2 + 1.2, -L / 2 + 2.1]) wheel(b, 0.42, s * 0.72, 0.42, z, c.iron, 8);
  b.box(2.3, 0.3, L, c.ironDark, 0, 0.98, 0);
  b.box(2.5, 1.5, L - 0.2, c.boiler, 0, 1.9, 0);
  b.box(2.56, 0.12, L - 0.1, c.rustDark, 0, 2.66, 0); // the coping
  b.box(2.56, 0.06, L - 0.1, c.rust, 0, 1.2, 0);
  // The coal, heaped and sunk, with leaves in it; a sapling up through it; the water hatch.
  for (let i = 0; i < 9; i++) b.put(new THREE.DodecahedronGeometry(0.35 + b.rand() * 0.25, 0), c.coal, (b.rand() - 0.5) * 1.6, 2.65, L / 2 - 0.6 - b.rand() * 2.4);
  for (let i = 0; i < 4; i++) b.box(0.5, 0.03, 0.4, c.litter, (b.rand() - 0.5) * 1.6, 2.86, L / 2 - 0.8 - b.rand() * 2.2, b.rand() * 3);
  b.put(new THREE.CylinderGeometry(0.32, 0.32, 0.14, 12), c.ironDark, 0, 2.75, -L / 2 + 1.0);
  b.push(-0.4, 2.7, 0.9);
  sapling(b, 3.3, -0.15);
  b.pop();
}

// ---- a coach ------------------------------------------------------------------------------------------

// A wooden day coach (its frame: on the rails, length L, ends at z = ±L/2). The inside is the
// encounter's room (rooms). opts: { tree (a sapling up through it), doors: [front, back]: 'hanging'
// | 'gone' | 'shut', luggage (fill(b, inside) for this coach's belongings) }.
function coach(b, cfg, L, opts) {
  const c = b.c;
  const W = cfg.width;
  const fy = cfg.floor;
  const wh = cfg.wall;
  const pl = cfg.platform;
  const body = L / 2 - pl; // the body's half length
  // The trucks, the underframe, the truss rods.
  for (const zt of [L / 2 - 2.0, -L / 2 + 2.0]) {
    b.box(1.9, 0.3, 2.2, c.ironDark, 0, 0.62, zt);
    for (const s of [-1, 1]) for (const dz of [-0.7, 0.7]) wheel(b, 0.42, s * 0.72, 0.42, zt + dz, c.iron, 0);
  }
  b.box(W - 0.2, 0.22, L - 0.4, c.woodDark, 0, fy - 0.15, 0);
  for (const s of [-1, 1]) b.box(0.04, 0.04, L - 4.4, c.iron, s * 0.9, fy - 0.55, 0);
  // The floor, the end platforms with their railings and steps.
  b.box(W, 0.07, L - 0.2, c.woodGrey, 0, fy, 0);
  for (const e of [-1, 1]) {
    const ez = e * (L / 2 - pl / 2);
    for (const s of [-1, 1]) {
      b.box(0.05, 0.9, 0.05, c.iron, s * (W / 2 - 0.08), fy + 0.45, e * (L / 2 - 0.12));
      b.box(0.04, 0.04, pl, c.iron, s * (W / 2 - 0.08), fy + 0.88, ez);
      // The steps down: two treads off the side.
      b.box(0.5, 0.04, 0.6, c.iron, s * (W / 2 - 0.35), fy - 0.45, ez);
      b.box(0.5, 0.04, 0.6, c.iron, s * (W / 2 - 0.35), fy - 0.85, ez);
    }
    b.box(W - 0.6, 0.04, 0.04, c.iron, 0, fy + 0.88, e * (L / 2 - 0.12));
    // The end wall with its door (hanging, gone, or shut).
    const wz = e * body;
    for (const s of [-1, 1]) b.box(W / 2 - 0.45, wh, 0.06, c.coach, s * (W / 4 + 0.225), fy + wh / 2, wz);
    b.box(0.9, wh - 1.95, 0.06, c.coach, 0, fy + 1.95 + (wh - 1.95) / 2, wz);
    const kind = opts.doors[e > 0 ? 0 : 1];
    if (kind === 'hanging') {
      b.push(0.45, fy + 0.05, wz + e * 0.05, e > 0 ? 1.9 : -1.9 - Math.PI, 0, 0.12);
      b.box(0.86, 1.88, 0.05, c.coachDark, -0.43, 0.94, 0);
      b.box(0.5, 0.6, 0.06, c.hollow, -0.43, 1.4, 0);
      b.pop();
    } else if (kind === 'shut') b.box(0.86, 1.88, 0.05, c.coachDark, 0, fy + 0.95, wz);
  }
  // The side walls: panelling below, the windows, the letterboard; rotted through here and there.
  const n = Math.round((body * 2) / 1.0);
  const winW = 0.62;
  for (const s of [-1, 1]) {
    for (let i = 0; i < n; i++) {
      const z = -body + (i + 0.5) * ((body * 2) / n);
      const seg = (body * 2) / n;
      if (b.rand() > 0.1) b.box(0.06, 0.82, seg + 0.01, i % 4 === 0 ? c.coachDark : c.coach, s * W / 2, fy + 0.45, z);
      else b.box(0.06, 0.3, seg, c.coachDark, s * W / 2, fy + 0.15, z); // a panel rotted through, only its foot left
      // Posts between the windows; the dark of the window; a shard left in one in five.
      b.box(0.07, 0.75, seg - winW, c.coachDark, s * W / 2, fy + 1.24, z - seg / 2 + (seg - winW) / 4);
      if (b.rand() < 0.2) b.box(0.01, 0.3, 0.2, c.glass, s * (W / 2 - 0.01), fy + 1.05, z + 0.1, 0, 0.3);
      b.box(0.07, wh - 1.62, seg + 0.01, c.coach, s * W / 2, fy + 1.62 + (wh - 1.62) / 2, z);
    }
    b.box(0.08, 0.06, body * 2, c.letter, s * (W / 2 + 0.01), fy + 1.82, 0);
    b.box(0.08, 0.05, body * 2, c.coachDark, s * (W / 2 + 0.01), fy + 0.86, 0);
  }
  // The roof: two pitches either side of the clerestory, its little windows, moss; a hole for the tree.
  const ry = fy + wh;
  for (const s of [-1, 1]) {
    b.box(W / 2 - 0.3 + 0.18, 0.06, L - 0.1, c.roof, s * (W / 4 + 0.13), ry + 0.12, 0, 0, 0, s * -0.16);
    b.box(0.06, 0.38, body * 2, c.coachDark, s * 0.42, ry + 0.42, 0);
    for (let i = 0; i < 7; i++) b.box(0.07, 0.2, 0.32, c.hollow, s * 0.42, ry + 0.44, -body + 0.8 + i * ((body * 2 - 1.6) / 6));
  }
  const holeZ = opts.tree ? opts.tree.z : 99;
  for (const s of [-1, 1]) {
    // The clerestory's own roof in two halves (a gap where the tree comes out).
    if (holeZ < 90) {
      b.box(0.5, 0.05, body + holeZ - 0.6, c.roofDark, s * 0.22, ry + 0.64, (-body + holeZ - 0.6) / 2, 0, 0, s * -0.08);
      b.box(0.5, 0.05, body - holeZ - 0.6, c.roofDark, s * 0.22, ry + 0.64, (body + holeZ + 0.6) / 2, 0, 0, s * -0.08);
    } else b.box(0.5, 0.05, L - 0.4, c.roofDark, s * 0.22, ry + 0.64, 0, 0, 0, s * -0.08);
  }
  for (let i = 0; i < 6; i++) b.box(0.6 + b.rand() * 0.8, 0.03, 0.5 + b.rand(), b.rand() < 0.5 ? c.moss : c.mossDark, (b.rand() - 0.5) * 1.6, ry + 0.2 + b.rand() * 0.1, (b.rand() - 0.5) * (L - 2));
  // Inside: the benches either side of the aisle (walkover backs), the luggage racks, the stove, the lamps.
  const aisle = cfg.aisle;
  const rows = Math.floor((body * 2 - 1.4) / cfg.bench);
  const benches = [];
  for (let r = 0; r < rows; r++) {
    const z = -body + 1.2 + r * cfg.bench;
    for (const s of [-1, 1]) {
      const x = s * (aisle + (W / 2 - 0.08 - aisle) / 2);
      const bw = W / 2 - 0.08 - aisle;
      const broken = b.rand() < 0.15;
      b.box(bw, 0.08, 0.5, broken ? c.plushDark : c.plush, x, fy + 0.45, z, 0, 0, broken ? s * 0.25 : 0);
      b.box(bw, 0.5, 0.06, c.plushDark, x, fy + 0.78, z - 0.24, 0, broken ? 0.5 : 0, 0);
      b.box(0.06, 0.5, 0.5, c.wood, s * (aisle + 0.03), fy + 0.25, z);
      b.box(0.06, 0.07, 0.5, c.wood, s * (aisle + 0.03), fy + 0.66, z); // the arm
      benches.push([s > 0 ? aisle : -W / 2, s > 0 ? W / 2 : -aisle, z - 0.3, z + 0.28]);
    }
  }
  for (const s of [-1, 1]) {
    b.box(0.32, 0.03, body * 2 - 0.6, c.iron, s * (W / 2 - 0.25), fy + 1.72, 0); // the racks
    for (let i = 0; i < 6; i++) b.box(0.03, 0.2, 0.03, c.iron, s * (W / 2 - 0.1), fy + 1.82, -body + 0.6 + i * ((body * 2 - 1.2) / 5));
  }
  // The stove at the front end, its pipe up through the roof; the oil lamps on their brackets.
  const sz = body - 0.55;
  b.put(new THREE.CylinderGeometry(0.24, 0.28, 0.9, 10), c.ironDark, -0.85, fy + 0.45, sz);
  b.put(new THREE.CylinderGeometry(0.06, 0.06, wh, 6), c.iron, -0.85, fy + 0.9 + wh / 2, sz);
  for (let i = 0; i < 3; i++) {
    const z = -body + (i + 1) * ((body * 2) / 4);
    b.box(0.03, 0.4, 0.03, c.brass, 0, ry - 0.1, z);
    b.put(new THREE.CylinderGeometry(0.1, 0.06, 0.24, 8), c.lampGlass, 0, ry - 0.42, z);
  }
  // Leaves drifted in down the aisle.
  for (let i = 0; i < 8; i++) b.box(0.35 + b.rand() * 0.4, 0.02, 0.3 + b.rand() * 0.4, c.litter, (b.rand() - 0.5) * aisle * 1.6, fy + 0.045, (b.rand() - 0.5) * body * 1.8, b.rand() * 3);
  if (opts.tree) {
    b.push(opts.tree.x, 0, opts.tree.z);
    sapling(b, 6.8, 0.04);
    b.pop();
    b.box(0.5, 0.03, 0.5, c.hollow, opts.tree.x, fy + 0.04, opts.tree.z); // the hole it came up through
  }
  const blocks = [...benches, [-W / 2, -0.55, sz - 0.4, sz + 0.4]];
  if (opts.tree) blocks.push([opts.tree.x - 0.2, opts.tree.x + 0.2, opts.tree.z - 0.2, opts.tree.z + 0.2]);
  opts.luggage?.(b, { fy, body, aisle, W, blocks, dollB: opts.dollB });
  return { hx: W / 2 - 0.12, hz: body - 0.08, floor: fy, roof: wh, blocks };
}

// ---- belongings ---------------------------------------------------------------------------------------

function suitcase(b, x, y, z, yaw, col, tag = true) {
  const c = b.c;
  b.push(x, y, z, yaw);
  b.box(0.62, 0.4, 0.2, col, 0, 0.2, 0);
  b.box(0.64, 0.04, 0.22, c.leatherDark, 0, 0.3, 0);
  b.box(0.16, 0.05, 0.04, c.leatherDark, 0, 0.43, 0);
  if (tag) b.box(0.07, 0.11, 0.01, c.tag, 0.2, 0.36, 0.115, 0, 0, 0.3);
  b.pop();
}

function trunk(b, x, y, z, yaw, open = false) {
  const c = b.c;
  b.push(x, y, z, yaw);
  b.box(0.9, 0.5, 0.55, c.wood, 0, 0.25, 0);
  for (const s of [-0.3, 0.3]) b.box(0.06, 0.52, 0.57, c.iron, s, 0.25, 0);
  if (open) {
    b.push(0, 0.5, -0.27, 0, -1.9, 0);
    b.box(0.9, 0.06, 0.55, c.woodDark, 0, 0, 0.27);
    b.pop();
    b.box(0.82, 0.04, 0.47, c.hollow, 0, 0.46, 0);
    b.box(0.5, 0.08, 0.3, c.cloth, -0.1, 0.48, 0.05, 0.2); // folded clothes
    b.box(0.3, 0.06, 0.25, c.clothBlue, 0.22, 0.5, -0.05, -0.3);
  } else b.box(0.92, 0.06, 0.57, c.woodDark, 0, 0.52, 0);
  b.box(0.08, 0.13, 0.01, c.tag, 0.38, 0.4, 0.285, 0, 0, -0.2);
  b.pop();
}

function carpetbag(b, x, y, z, yaw) {
  const c = b.c;
  b.push(x, y, z, yaw);
  b.put(new THREE.CylinderGeometry(0.2, 0.2, 0.55, 8).rotateZ(Math.PI / 2).scale(1, 1, 0.7), c.clothRose, 0, 0.2, 0);
  b.box(0.04, 0.2, 0.04, c.leatherDark, -0.1, 0.43, 0);
  b.box(0.04, 0.2, 0.04, c.leatherDark, 0.1, 0.43, 0);
  b.box(0.22, 0.04, 0.04, c.leatherDark, 0, 0.53, 0);
  b.box(0.07, 0.11, 0.01, c.tag, 0.22, 0.3, 0.15, 0, 0, 0.2);
  b.pop();
}

function hatbox(b, x, y, z) {
  const c = b.c;
  b.put(new THREE.CylinderGeometry(0.2, 0.2, 0.24, 10), c.canvas, x, y + 0.12, z);
  b.put(new THREE.CylinderGeometry(0.21, 0.21, 0.04, 10), c.clothRose, x, y + 0.25, z);
}

// A rag doll on a seat (Hattie Bell's): sitting up, its arms out, a faded print dress.
function doll(b, x, y, z, yaw) {
  const c = b.c;
  b.push(x, y, z, yaw, -0.25);
  b.box(0.16, 0.2, 0.09, c.clothRose, 0, 0.12, 0); // the dress
  b.box(0.2, 0.05, 0.12, c.clothRose, 0, 0.02, 0.02);
  b.put(new THREE.SphereGeometry(0.07, 8, 6), c.canvas, 0, 0.29, 0); // the head
  b.box(0.14, 0.04, 0.12, c.leatherDark, 0, 0.35, -0.01); // the yarn hair
  for (const s of [-1, 1]) {
    b.box(0.04, 0.13, 0.04, c.canvas, s * 0.11, 0.15, 0.02, 0, 0, s * 0.6);
    b.box(0.045, 0.04, 0.16, c.canvas, s * 0.05, 0.0, 0.1);
  }
  b.pop();
}

// ---- the powder store -----------------------------------------------------------------------------------

// A squat stone hut (its frame: on the bank, its door facing -z, toward the line... here, toward
// local -z). The door's in `door` (its own mesh: barred, then knocked open).
function powderStore(b, cfg, door, doorOpen) {
  const c = b.c;
  const w = cfg.width;
  const d = cfg.depth;
  const h = cfg.height;
  // Coursed stone: blocks in rows, a few gone.
  const course = 0.32;
  const rows = Math.round(h / course);
  const runs = [
    [-w / 2, -d / 2, w / 2, -d / 2, true],
    [w / 2, -d / 2, w / 2, d / 2, false],
    [w / 2, d / 2, -w / 2, d / 2, false],
    [-w / 2, d / 2, -w / 2, -d / 2, false],
  ];
  for (const [ax, az, bx, bz, front] of runs) {
    const L = Math.hypot(bx - ax, bz - az);
    const yaw = Math.atan2(bx - ax, bz - az);
    b.push(ax, 0, az, yaw);
    for (let r = 0; r < rows; r++) {
      const y = (r + 0.5) * course;
      let t = r % 2 ? -0.25 : 0;
      while (t < L) {
        const len = 0.45 + b.rand() * 0.3;
        const t0 = Math.max(0, t);
        const t1 = Math.min(L, t + len);
        const mid = (t0 + t1) / 2;
        const inDoor = front && Math.abs(mid - L / 2) < cfg.door / 2 + 0.05 && y < 1.75;
        if (!inDoor && t1 - t0 > 0.1) b.box(0.42, course - 0.02, t1 - t0 - 0.02, (r + Math.floor(t * 3)) % 4 === 0 ? c.stoneDark : c.stone, 0, y, mid);
        t += len;
      }
    }
    b.pop();
  }
  // The roof: a slab of stone flags, sod and moss over it; the lintel, POWDER cut and painted on it.
  b.box(w + 0.7, 0.2, d + 0.7, c.stoneDark, 0, h + 0.1, 0);
  b.box(w + 0.5, 0.14, d + 0.5, c.earth, 0, h + 0.27, 0);
  for (let i = 0; i < 5; i++) b.box(0.8 + b.rand() * 0.6, 0.05, 0.6 + b.rand() * 0.5, b.rand() < 0.5 ? c.moss : c.mossDark, (b.rand() - 0.5) * w, h + 0.36, (b.rand() - 0.5) * d);
  fern(b, 1.1);
  b.box(cfg.door + 0.6, 0.3, 0.46, c.stoneDark, 0, 1.92, -d / 2);
  const letters = 6;
  for (let i = 0; i < letters; i++) b.box(0.1, 0.16, 0.02, c.paint, -0.36 + i * 0.145, 1.92, -d / 2 - 0.24);
  // Inside: dark, the crates on a plank shelf (the encounter's dynamite is its own), a coil of fuse.
  b.box(w - 0.9, 0.04, d - 0.9, c.hollow, 0, 0.03, 0);
  b.box(w - 1.0, 0.06, 0.6, c.plank, 0, 0.75, d / 2 - 0.6);
  for (const s of [-1, 1]) b.box(0.06, 0.75, 0.6, c.plankDark, s * (w / 2 - 0.6), 0.37, d / 2 - 0.6);
  // The crates of sweating sticks (their own mesh: they go up if they're knocked).
  const cr = b.crates;
  if (cr) {
    cr.stack = [b.m.clone()];
    for (let i = 0; i < 3; i++) {
      cr.box(0.55, 0.32, 0.38, c.wood, -0.6 + i * 0.6, 0.94, d / 2 - 0.6, (cr.rand() - 0.5) * 0.2);
      cr.box(0.4, 0.08, 0.01, c.hollow, -0.6 + i * 0.6, 0.98, d / 2 - 0.8); // stencilled, a dark stain under it
      cr.box(0.5, 0.02, 0.33, c.hollow, -0.6 + i * 0.6, 0.79, d / 2 - 0.6); // sweated through onto the shelf
    }
  }
  b.box(0.7, 0.03, 0.5, c.hollow, 0.3, 0.06, d / 2 - 0.9); // the stain on the floor where it's sweated
  b.put(new THREE.TorusGeometry(0.18, 0.04, 4, 12).rotateX(Math.PI / 2), c.cloth, -0.7, 0.08, -0.2);
  // The door (barred) and the door knocked open: their own meshes.
  door.push(0, 0, -d / 2 - 0.02);
  for (let i = 0; i < 5; i++) door.box(cfg.door / 5 - 0.01, 1.72, 0.07, i % 2 ? door.c.plank : door.c.plankDark, -cfg.door / 2 + (i + 0.5) * (cfg.door / 5), 0.87, 0);
  door.box(cfg.door, 0.12, 0.09, door.c.plankDark, 0, 0.4, -0.02);
  door.box(cfg.door, 0.12, 0.09, door.c.plankDark, 0, 1.4, -0.02);
  // The bar across in its staples, a padlock hung on a hasp.
  door.box(cfg.door + 0.6, 0.1, 0.08, door.c.rust, 0, 0.95, -0.1);
  for (const s of [-1, 1]) door.box(0.06, 0.2, 0.12, door.c.iron, s * (cfg.door / 2 + 0.22), 0.95, -0.08);
  door.box(0.1, 0.13, 0.05, door.c.rustDark, 0.12, 0.82, -0.15);
  door.pop();
  // Open: the door hanging in, off one hinge; the bar in the grass below.
  doorOpen.push(-cfg.door / 2, 0, -d / 2 + 0.02, -1.25, 0, 0.06);
  for (let i = 0; i < 5; i++) doorOpen.box(cfg.door / 5 - 0.01, 1.72, 0.07, i % 2 ? doorOpen.c.plank : doorOpen.c.plankDark, (i + 0.5) * (cfg.door / 5), 0.87, 0);
  doorOpen.pop();
  doorOpen.box(cfg.door + 0.6, 0.1, 0.08, doorOpen.c.rust, 0.3, 0.05, -d / 2 - 0.7, 0.5);
}

// The navvies' steps: timber treads pegged into the face (its frame: at the foot, climbing +x).
function steps(b, o, X0, X1, Z) {
  const c = b.c;
  const n = Math.round(Math.abs(X1 - X0) / 0.45);
  for (let i = 0; i <= n; i++) {
    const X = X0 + ((X1 - X0) * i) / n;
    const y = o.heightAt(X, Z);
    if (b.rand() < 0.12) continue; // a tread rotted out
    b.box(0.22, 0.12, 1.3, i % 3 ? c.plank : c.plankDark, X, y + 0.04, Z, (b.rand() - 0.5) * 0.12);
    for (const s of [-1, 1]) b.box(0.06, 0.25, 0.06, c.plankDark, X - Math.sign(X1 - X0) * 0.1, y + 0.05, Z + s * 0.6);
  }
}

// The lantern set down on the sleepers ahead of the engine, neat, its flame still lit: a railway
// hand lantern (its glass a glow in its own unlit mesh).
function lantern(b, glow) {
  const c = b.c;
  b.put(new THREE.CylinderGeometry(0.11, 0.12, 0.05, 10), c.lamp, 0, 0.025, 0);
  for (let i = 0; i < 4; i++) b.box(0.015, 0.2, 0.015, c.lamp, Math.cos(i * 1.57) * 0.1, 0.15, Math.sin(i * 1.57) * 0.1);
  b.put(new THREE.CylinderGeometry(0.06, 0.12, 0.08, 10), c.lamp, 0, 0.29, 0);
  b.put(new THREE.TorusGeometry(0.08, 0.012, 4, 10), c.lamp, 0, 0.42, 0);
  glow.put(new THREE.CylinderGeometry(0.085, 0.09, 0.18, 10), glow.c.glass, 0, 0.15, 0);
  glow.put(new THREE.ConeGeometry(0.025, 0.08, 6), glow.c.flame, 0, 0.13, 0);
}

// ---- the whole set ----------------------------------------------------------------------------------

export function buildRailwayCutting(cfg, opts) {
  const look = cfg.look;
  const o = {
    heightAt: opts.heightAt ?? (() => 0),
    lineAt: opts.lineAt ?? (() => ({ x: 0, yaw: 0 })),
    keepAt: opts.keepAt ?? (() => 1),
    cut: opts.cut,
    side: opts.side ?? 1,
    storeZ: opts.storeZ ?? cfg.store.steps,
  };
  o.stepsZ = o.storeZ - Math.sign(o.storeZ || 1) * cfg.store.steps;
  const b = new SetBuilder(look, o.heightAt, 27);
  const part = new SetBuilder(look, o.heightAt, 28);
  const door = new SetBuilder(look, o.heightAt, 29);
  const doorOpen = new SetBuilder(look, o.heightAt, 30);
  const glow = new SetBuilder({ colors: { glass: look.flame, flame: 0xd8b070 } }, o.heightAt, 31);
  const dollB = new SetBuilder(look, o.heightAt, 32);
  const maulB = new SetBuilder(look, o.heightAt, 33);
  const crateB = new SetBuilder(look, o.heightAt, 34);
  const c = b.c;
  const t = cfg.train;
  const rooms = {};

  faces(b, cfg, o);

  // ---- the train, car by car, on the real rails ----
  const layout = trainLayout(t);
  const lineY = (z) => o.heightAt(o.lineAt(z).x, z);
  for (const car of layout) {
    const at = o.lineAt(car.zc);
    const y = Math.min(lineY(car.z0), lineY(car.z1)) - t.sink;
    const yaw = at.yaw + (t.heading < 0 ? Math.PI : 0);
    const L = car.length;
    if (car.kind === 'engine') {
      b.push(at.x, y, car.zc, yaw, 0, 0.035);
      part.stack = [b.m.clone()];
      engine(b, L, part);
      b.spot('cab', -0.4, 1.6, -L / 2 + 1.0);
      b.spot('cabStep', -1.9, 0, -L / 2 + 1.2);
      b.spot('cowcatcher', 0, 0, L / 2 + 0.7);
      b.spot('plate', 1.9, 0, 0.5);
      b.spot('engineSide', -2.2, 0, 0);
      b.wall(0, -L / 2 + 0.2, 0, L / 2 - 1.3, 0, 1.35, 4.8);
      b.wall(0, L / 2 - 1.3, 0, L / 2 - 0.1, 0, 0.9, 1.0);
      b.pop();
      // The lantern on the line, a little ahead of the cowcatcher.
      const lz = car.z0 + t.heading * 3.4;
      const la = o.lineAt(lz);
      b.pushOnGround(la.x + 0.35, 0.02, lz, 0.4);
      glow.stack = [b.m.clone()];
      lantern(b, glow);
      b.spot('lantern', 0, 0, 0);
      b.pop();
      // The maul, driven into a loose tie beside the engine, its handle up at a slant (its own mesh:
      // Tom works it loose and takes it).
      const mz = car.z0 - t.heading * 3.8;
      const mx = at.x - 2.1;
      b.pushOnGround(mx, 0, mz, 0.5);
      b.box(2.3, 0.16, 0.24, c.woodDark, 0, 0.06, 0, 0, 0, 0.04); // the tie
      maulB.stack = [b.m.clone()];
      maulB.box(0.07, 0.24, 0.07, c.rustDark, 0.2, 0.12, 0); // the head, half in the tie
      maulB.push(0.2, 0.2, 0, 0.3, 0, -0.42);
      maulB.put(new THREE.CylinderGeometry(0.019, 0.023, 0.95, 6), c.wood, 0, 0.47, 0);
      maulB.pop();
      b.pop();
      b.spot('maul', mx, 0, mz);
    } else if (car.kind === 'tender') {
      b.push(at.x, y, car.zc, yaw, 0, 0.025);
      tender(b, L);
      b.wall(0, -L / 2 + 0.2, 0, L / 2 - 0.2, 0, 1.3, 3.0);
      b.pop();
    } else if (car.kind === 'coach') {
      const first = car.id === 'coach1';
      b.push(at.x, y, car.zc, yaw, 0, first ? -0.02 : 0.03);
      const room = coach(b, t.coach, L, {
        doors: first ? ['hanging', 'gone'] : ['shut', 'hanging'],
        tree: first ? { x: 0.35, z: -1.4 } : null,
        luggage: (bb, inside) => (first ? luggageCoach1(bb, inside) : luggageCoach2(bb, inside)),
        dollB: first ? null : dollB,
      });
      const pz = L / 2 - t.coach.platform / 2;
      // The ways on and off: the end platforms' steps on the walking side (-x, the far side's +x too).
      for (const e of [-1, 1]) for (const s of [-1, 1]) b.spot(`${car.id}.board${e > 0 ? 'F' : 'B'}${s > 0 ? 'R' : 'L'}`, s * (t.coach.width / 2 + 0.6), 0, e * pz);
      b.spot(`${car.id}.middle`, 0, room.floor, 0);
      b.wall(0, -L / 2 + 0.1, 0, L / 2 - 0.1, 0, t.coach.width / 2 + 0.05, 3.9);
      rooms[car.id] = { ...room, x: at.x, z: car.zc, y, yaw, length: L, platform: t.coach.platform };
      b.pop();
    } else if (car.kind === 'baggage') {
      // Off the rails: skewed off the line, rolled onto the bank, its back end in the brush.
      const side = -o.side;
      b.push(at.x + side * 0.9, y - 0.3, car.zc, yaw + side * car.skew, 0, side * -car.roll);
      baggageCar(b, L);
      b.spot('baggageDoor', 2.2 * -side, 0.0, 0.4);
      b.wall(0, -L / 2 + 0.2, 0, L / 2 - 0.2, 0, 1.45, 3.4);
      b.pop();
    }
  }

  // Boulders down on the floor, off the line.
  for (const [X, Z, r] of [[-3.6, -8.5, 0.7], [3.7, 4.4, 0.55], [-3.9, 12.6, 0.5], [3.4, -15.5, 0.8]]) boulder(b, o.lineAt(Z).x + X, Z, r);

  // ---- the powder store up the bank, and the steps up to it ----
  const sc = cfg.store;
  const sideX = (z) => o.lineAt(z).x + o.side * sc.across;
  const sz = o.storeZ;
  const sy = o.heightAt(sideX(sz), sz);
  // Its door faces the line (local -z toward the cutting).
  const syaw = o.side > 0 ? -Math.PI / 2 : Math.PI / 2;
  b.push(sideX(sz), sy - 0.1, sz, syaw);
  door.stack = [b.m.clone()];
  doorOpen.stack = [b.m.clone()];
  b.crates = crateB;
  powderStore(b, sc, door, doorOpen);
  b.spot('storeDoor', 0, 0.1, -sc.depth / 2 - 0.9);
  b.spot('storeInside', 0, 0.1, sc.depth / 2 - 1.2);
  b.spot('storeShelf', 0, 0.9, sc.depth / 2 - 0.6);
  b.wall(-sc.width / 2, sc.depth / 2, sc.width / 2, sc.depth / 2, 0, 0.25, 2.6);
  b.wall(-sc.width / 2, -sc.depth / 2, -sc.width / 2, sc.depth / 2, 0, 0.25, 2.6);
  b.wall(sc.width / 2, -sc.depth / 2, sc.width / 2, sc.depth / 2, 0, 0.25, 2.6);
  b.wall(-sc.width / 2, -sc.depth / 2, -sc.door / 2 - 0.05, -sc.depth / 2, 0, 0.25, 2.6);
  b.wall(sc.door / 2 + 0.05, -sc.depth / 2, sc.width / 2, -sc.depth / 2, 0, 0.25, 2.6);
  b.pop();
  const lx = o.lineAt(o.stepsZ).x;
  steps(b, o, lx + o.side * (o.cut.floorHalf - 0.2), lx + o.side * (o.cut.floorHalf + o.cut.faceRun + 0.8), o.stepsZ);
  b.spot('stepsFoot', lx + o.side * (o.cut.floorHalf - 1.2), 0, o.stepsZ);
  b.spot('stepsTop', lx + o.side * (o.cut.floorHalf + o.cut.faceRun + 1.6), 0, o.stepsZ);

  // ---- the faces' colliders (gaps for the gullies and the steps), and the arrival spots ----
  const fc = cfg.faceCollider;
  const run = 1.5;
  for (const s of [-1, 1]) {
    for (let z = -o.cut.length - 2; z < o.cut.length + 2; z += run) {
      const zm = z + run / 2;
      const X = o.lineAt(zm).x + s * fc;
      const lift = o.heightAt(o.lineAt(zm).x + s * (o.cut.floorHalf + o.cut.faceRun), zm) - lineY(zm);
      if (lift < 1.6 || o.keepAt(X + s * 2, zm) < 0.8) continue;
      if (s === o.side && Math.abs(zm - o.stepsZ) < 1.4) continue;
      b.colliders.push({ seg: true, ...segAt(o, s, fc, z, z + run), t: 0.3, top: Math.max(0.5, lift - 0.8), blocksShots: true, face: true });
    }
  }
  b.spot('middle', 0, 0, 0);

  // ---- bake ----
  const weather = opts.weather;
  const geometry = bakeParts(b.parts, { weather, baseAt: (x, y, z) => b.heightAt(x, z), seed: 27 });
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const group = new THREE.Group();
  group.name = 'railwayCutting';
  group.add(mesh);
  const small = (builder, name, lit = true) => {
    const g = bakeParts(builder.parts, { weather: lit ? weather : null, seed: 27 });
    const m = new THREE.Mesh(g, lit ? new THREE.MeshLambertMaterial({ vertexColors: true }) : new THREE.MeshBasicMaterial({ vertexColors: true, fog: true }));
    m.name = name;
    m.castShadow = lit;
    group.add(m);
    return m;
  };
  const parts = {
    cowcatcher: small(part, 'cowcatcher'),
    door: small(door, 'storeDoor'),
    doorOpen: small(doorOpen, 'storeDoorOpen'),
    lantern: small(glow, 'lanternGlow', false),
    doll: small(dollB, 'doll'),
    maul: small(maulB, 'maulInTie'),
    crates: small(crateB, 'powderCrates'),
  };
  parts.doorOpen.visible = false;
  // A soft halo round the lantern's flame (additive, no light): it reads from down the line at night.
  if (b.spots.lantern) {
    // Two shells, a brighter small one in a faint big one, so it falls off rather than ending at an edge.
    const mat = new THREE.MeshBasicMaterial({ color: look.flame, transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false });
    const geo = new THREE.SphereGeometry(1, 10, 8);
    const halo = new THREE.Group();
    for (const r of [0.16, 0.26, 0.42]) {
      const m = new THREE.Mesh(geo, mat);
      m.scale.setScalar(r);
      halo.add(m);
    }
    halo.position.set(b.spots.lantern.x, b.spots.lantern.y + 0.15, b.spots.lantern.z);
    halo.name = 'lanternHalo';
    halo.material = mat;
    halo.geometry = geo;
    group.add(halo);
    parts.halo = halo;
  }
  return {
    group,
    mesh,
    parts,
    spots: b.spots,
    colliders: b.colliders,
    rooms,
    layout,
    dispose() {
      group.removeFromParent();
      for (const m of [mesh, ...Object.values(parts)]) {
        m.geometry.dispose();
        m.material.dispose();
      }
    },
  };
}

// A face's collider from z0 to z1 at `fc` across (following the line).
function segAt(o, s, fc, z0, z1) {
  return { ax: o.lineAt(z0).x + s * fc, az: z0, bx: o.lineAt(z1).x + s * fc, bz: z1 };
}

// ---- the baggage car and the coaches' belongings ------------------------------------------------------------

function baggageCar(b, L) {
  const c = b.c;
  const W = 2.8;
  const fy = 1.15;
  for (const zt of [L / 2 - 1.6, -L / 2 + 1.6]) {
    b.box(1.9, 0.3, 2.0, c.ironDark, 0, 0.62, zt);
    for (const s of [-1, 1]) for (const dz of [-0.65, 0.65]) wheel(b, 0.42, s * 0.72, 0.42, zt + dz, c.iron, 0);
  }
  b.box(W, 0.1, L, c.woodGrey, 0, fy, 0);
  // Plank walls, one side's big door slid open.
  for (const s of [-1, 1]) {
    for (let i = 0; i < 14; i++) {
      const y = fy + 0.1 + i * 0.16;
      if (s < 0 && y < fy + 2.0) {
        b.box(0.06, 0.15, L / 2 - 0.9, c.woodGrey, s * W / 2, y, -L / 4 - 0.45);
        b.box(0.06, 0.15, L / 2 - 0.9, c.woodGrey, s * W / 2, y, L / 4 + 0.45);
      } else if (b.rand() > 0.06) b.box(0.06, 0.15, L, i % 3 ? c.woodGrey : c.woodDark, s * W / 2, y, 0);
    }
  }
  b.box(0.06, 2.0, 1.9, c.woodDark, -W / 2 - 0.08, fy + 1.0, -L / 4 - 0.4); // the door, slid back
  b.box(0.05, 0.05, L - 0.6, c.iron, -W / 2 - 0.1, fy + 2.05, 0);
  for (const e of [-1, 1]) b.box(W, 2.3, 0.07, c.coachDark, 0, fy + 1.15, e * L / 2);
  b.box(W + 0.2, 0.08, L + 0.2, c.roof, 0, fy + 2.35, 0, 0, 0, 0.04);
  for (let i = 0; i < 5; i++) b.box(0.6 + b.rand(), 0.03, 0.6 + b.rand(), c.moss, (b.rand() - 0.5) * 2, fy + 2.4, (b.rand() - 0.5) * (L - 1.5));
  // Trunks and crates, slid to the low side; mailbags; a bicycle.
  for (let i = 0; i < 4; i++) trunk(b, 0.5 + (b.rand() - 0.5) * 0.4, fy + 0.05, -2.5 + i * 1.3, (b.rand() - 0.5) * 0.5, i === 1);
  for (let i = 0; i < 3; i++) b.box(0.6, 0.5, 0.6, c.wood, -0.5, fy + 0.3, 1.8 + i * 0.7, b.rand());
  for (let i = 0; i < 3; i++) b.put(new THREE.SphereGeometry(0.32, 8, 6).scale(1, 0.7, 1.4), c.canvas, -0.6 + i * 0.4, fy + 0.25, -0.4 - i * 0.3);
  b.put(new THREE.TorusGeometry(0.33, 0.025, 4, 14).rotateY(Math.PI / 2), c.iron, -0.9, fy + 0.42, 3.0);
  b.put(new THREE.TorusGeometry(0.33, 0.025, 4, 14).rotateY(Math.PI / 2), c.iron, -0.9, fy + 0.42, 2.0);
  b.box(0.04, 0.04, 1.0, c.iron, -0.9, fy + 0.62, 2.5);
}

// Coach 1: the families' coach. A trunk open in the aisle (the Tullys'), cases on the racks,
// a hatbox, a coat over a seat, a Bible face down.
function luggageCoach1(b, x) {
  const c = b.c;
  const y = x.fy + 0.05;
  trunk(b, 0, y, -2.4, 0.15, true);
  x.blocks.push([-0.5, 0.5, -2.75, -2.05]);
  b.spot('coach1.trunk', 0, y, -1.6);
  for (let i = 0; i < 5; i++) {
    const s = i % 2 ? 1 : -1;
    suitcase(b, s * (x.W / 2 - 0.25), x.fy + 1.75, -x.body + 1.2 + i * 1.9, Math.PI / 2, i % 3 ? c.leather : c.clothBlue, i !== 2);
  }
  hatbox(b, -0.9, x.fy + 0.49, 1.25);
  b.box(0.55, 0.06, 0.9, c.clothBlue, 0.92, x.fy + 0.52, -0.15, 0, 0.2, 0.1); // a coat left over a seat
  b.box(0.16, 0.04, 0.22, c.leatherDark, 0.85, x.fy + 0.51, 2.45, 0.4); // the Bible, face down
  b.spot('coach1.rack', -0.2, y, 2.6);
  carpetbag(b, -0.15, y, 3.2, 0.6);
  x.blocks.push([-0.45, 0.15, 2.95, 3.45]);
}

// Coach 2: the Caller's. Levi Pruitt's carpetbag, the conductor's punch on the floor, and on a seat
// halfway down, sitting up as if somebody sat it there, Hattie Bell's rag doll.
function luggageCoach2(b, x) {
  const c = b.c;
  const y = x.fy + 0.05;
  carpetbag(b, 0.25, y, -3.1, -0.4);
  x.blocks.push([0.0, 0.5, -3.35, -2.85]);
  b.spot('coach2.bag', 0, y, -2.4);
  // The doll on the right-hand bench nearest the middle (its own mesh: Tom takes it).
  const rowZ = -x.body + 1.2 + Math.floor((x.body * 2 - 1.4) / 1.15 / 2) * 1.15;
  if (x.dollB) {
    x.dollB.stack = [b.m.clone()];
    doll(x.dollB, x.aisle + 0.3, x.fy + 0.5, rowZ + 0.02, Math.PI);
  }
  b.spot('coach2.doll', 0, y, rowZ + 0.35);
  b.spot('coach2.voice', 0.8, x.fy + 1.0, rowZ);
  for (let i = 0; i < 4; i++) suitcase(b, -(x.W / 2 - 0.25), x.fy + 1.75, -x.body + 2 + i * 2.2, Math.PI / 2, i % 2 ? c.leather : c.leatherDark, i % 2 === 0);
  b.box(0.12, 0.03, 0.05, c.brass, -0.2, y + 0.01, 1.8, 0.7); // the conductor's punch
  b.put(new THREE.CylinderGeometry(0.11, 0.13, 0.12, 8), c.leatherDark, 0.3, y + 0.06, 3.4, 0, 0, 1.4); // a bowler on its side
  b.spot('coach2.punch', 0, y, 1.8);
}
