// The roadside gas station, drawn (M9.3; DESIGN.md "Roadside gas station";
// Session 15b pass 1: the set). From data/gasStation.json, in the gas
// station's frame (encounters/GasStation.js: z toward the road, x right).
//  - The store: a low flat-roofed block with a fascia (GAS · GIFTS · BAIT),
//    grimed windows either side of a glass double door hanging open, the
//    back rooms behind a partition (the office behind the counter, the
//    stockroom with its shut back door).
//  - Inside, dark even by day (the roof shades it; no lights): the counter
//    and register, shelf runs (one knocked over) with goods, drinks
//    coolers, a crude carved Bigfoot by the door, a board of blurry
//    sighting photos, plaster footprint casts. The office: desk, chair,
//    filing cabinet and Earl's note. The stockroom: boxes and a rack, the
//    gun safe and Earl's scanner (Session 17, Aaron: the office had too
//    much in it at once).
//  - Outside: the forecourt's concrete (it follows the ground), two pump
//    islands under a canopy that sags at one corner, the HOME OF BIGFOOT
//    sign on its pole by the road, a dumpster out back.
// Session 19 (style pass 2):
//  - the shell: lap siding on the side and back walls, a gutter and
//    downpipes, a parapet cap, an air-conditioning unit and a vent on the
//    roof; outside, an ice chest under the left window, a rack of oil
//    cans by the door, a propane cage on the east wall, an air pump at
//    the forecourt's edge, a stack of tyres and a pallet out back;
//  - inside: a drop ceiling's grid with dead fluorescent tubes (one hangs
//    by a chain), price strips on the shelves' edges, stains on the floor;
//  - the forecourt mottled and oil-dark round the pumps, with expansion
//    joints, cracks and weeds in them;
//  - the pumps: a plinth, a brand band, a hose looping down to its
//    holstered nozzle; blown, twisted black stumps, torn panels and a
//    ragged scorch;
//  - the canopy: its underside's panels, dead light boxes, the band peeled
//    off and hanging at the sagging corner.
// Played straight: faded, dusty, sad. Dull, dark colours (the torch-glare
// rule). Session 19: the static parts are ONE vertex-coloured mesh per
// group, weathered as they're baked (render/propKit.js: grime from the
// ground or the floor up, mottling, rust on the metal): far fewer draw
// calls than the old one per colour. The textured boards (signs, the
// photos, the note) are a few meshes of their own.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { frameToWorld } from '../world/clearingFrame.js';
import { makeCanvas, toTexture } from './proceduralTextures.js';
import { bakeParts, noise3, weatherFor } from './propKit.js';

export class GasStationProps {
  // cfg: config.gasStation.look. data: data/gasStation.json. weather: config.props.weather (shared).
  constructor(cfg, data, weather = null) {
    this.cfg = cfg;
    this.data = data;
    this.weather = weather ? weatherFor(weather, cfg.weather) : null;
    this.keep = [];
    this.parts = new Map(); // colour -> [geometries in world space]
  }

  // frame: the gas station's. ground: heightAt(x, z). floorY: the store's floor.
  init(scene, frame, ground, floorY) {
    this.frame = frame;
    this.ground = ground;
    this.floorY = floorY;
    this.group = new THREE.Group();
    this.group.name = 'gasStation';
    this.seed = 1;
    this.building();
    this.store();
    this.giftShop();
    this.office();
    this.stockroom();
    this.forecourt();
    this.pumps();
    this.canopy();
    this.sign();
    this.dumpster();
    this.dressing();
    this.flush(this.group);
    this.buildPumpUnits(); // Session 18 (Aaron): the pumps go up when shot: each island's its own mesh, whole and wrecked
    scene.add(this.group);
  }

  // The parts so far, baked into ONE vertex-coloured mesh in `into`
  // (Session 19: was one mesh per colour), weathered.
  flush(into) {
    const geo = bakeParts(this.parts, { weather: this.weather, baseAt: (x, y, z) => this.baseAt(x, z), seed: 5 });
    this.parts.clear();
    if (!geo) return;
    if (!this.material) this.material = this.hold(new THREE.MeshLambertMaterial({ vertexColors: true }));
    const mesh = new THREE.Mesh(this.hold(geo), this.material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    into.add(mesh);
  }

  // The world point (x, z) in the frame: { x, z }.
  toFrame(wx, wz) {
    const f = this.frame;
    const dx = wx - f.x;
    const dz = wz - f.z;
    return { x: dx * f.rx + dz * f.rz, z: dx * f.fx + dz * f.fz };
  }

  // What a point stands on (grime runs up from it): the store's floor inside it, else the ground.
  baseAt(wx, wz) {
    const b = this.data.building;
    const p = this.toFrame(wx, wz);
    if (p.x > b.x0 - 0.05 && p.x < b.x1 + 0.05 && p.z > b.z0 - 0.05 && p.z < b.z1 + 0.05) return this.floorY;
    return this.ground.heightAt(wx, wz);
  }

  // A group of its own from the parts added since the last flush.
  ownGroup(name) {
    const g = new THREE.Group();
    g.name = name;
    this.flush(g);
    this.group.add(g);
    return g;
  }

  hold(x) {
    this.keep.push(x);
    return x;
  }

  // A fixed little random (the same every run): 0..1.
  rand() {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  // ---- placing -------------------------------------------------------------------------------------

  // The frame's rotation, turned yawDeg toward the right.
  rotY(yawDeg = 0) {
    return this.frame.yaw - (yawDeg * Math.PI) / 180;
  }

  // A geometry (in its own frame: x across, y up, z along) put at frame
  // (x, z), base height y, turned yawDeg; extra local rotations first.
  put(geo, color, x, z, y, yawDeg = 0, { rotX = 0, rotZ = 0 } = {}) {
    let g = geo.index ? geo.toNonIndexed() : geo;
    if (g !== geo) geo.dispose();
    if (g.getAttribute('uv')) g.deleteAttribute('uv');
    const w = frameToWorld(this.frame, x, z);
    const m = new THREE.Matrix4().compose(new THREE.Vector3(w.x, y, w.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rotX, this.rotY(yawDeg), rotZ, 'YXZ')), new THREE.Vector3(1, 1, 1));
    g.applyMatrix4(m);
    if (!this.parts.has(color)) this.parts.set(color, []);
    this.parts.get(color).push(g);
  }

  // A box: w across (local x), h up from its base, d along (local z).
  // Session 19: big ones are cut into a few segments, so the weathering
  // (grime up from the ground, mottling) has vertices to vary across.
  box(w, h, d, x, z, y, color, yawDeg = 0, opts = {}) {
    const seg = (v) => Math.min(8, Math.max(1, Math.ceil(v / 1.4)));
    const g = new THREE.BoxGeometry(w, h, d, seg(w), Math.min(5, Math.max(1, Math.ceil(h / 0.7))), seg(d)).translate(opts.ox ?? 0, h / 2 + (opts.oy ?? 0), opts.oz ?? 0);
    this.put(g, color, x, z, y, yawDeg, opts);
  }

  // A cylinder standing at frame (x, z), base y (opts.rotX / rotZ tip it, ox/oy/oz shift it first).
  cyl(r, h, x, z, y, color, seg = 8, opts = {}) {
    const g = new THREE.CylinderGeometry(opts.top ?? r, r, h, seg).translate(opts.ox ?? 0, h / 2 + (opts.oy ?? 0), opts.oz ?? 0);
    this.put(g, color, x, z, y, opts.yaw ?? 0, opts);
  }

  // A thin bar between frame points a and b (each [x, y, z], y absolute).
  bar(a, b, r, color) {
    const wa = frameToWorld(this.frame, a[0], a[2]);
    const wb = frameToWorld(this.frame, b[0], b[2]);
    const from = new THREE.Vector3(wa.x, a[1], wa.z);
    const to = new THREE.Vector3(wb.x, b[1], wb.z);
    const len = from.distanceTo(to);
    const g = new THREE.BoxGeometry(r * 2, len, r * 2).translate(0, len / 2, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
    g.applyMatrix4(new THREE.Matrix4().compose(from, q, new THREE.Vector3(1, 1, 1)));
    const n = g.toNonIndexed();
    g.dispose();
    n.deleteAttribute('uv');
    if (!this.parts.has(color)) this.parts.set(color, []);
    this.parts.get(color).push(n);
  }

  // A geometry already in world space.
  putWorld(g, color) {
    const n = g.index ? g.toNonIndexed() : g;
    if (n !== g) g.dispose();
    if (n.getAttribute('uv')) n.deleteAttribute('uv');
    if (!this.parts.has(color)) this.parts.set(color, []);
    this.parts.get(color).push(n);
  }

  // A box spanning frame x0..x1 and z0..z1 (axis-aligned in the frame).
  span(x0, x1, z0, z1, y, h, color) {
    this.box(Math.abs(x1 - x0), h, Math.abs(z1 - z0), (x0 + x1) / 2, (z0 + z1) / 2, y, color);
  }

  groundAt(x, z) {
    const w = frameToWorld(this.frame, x, z);
    return this.ground.heightAt(w.x, w.z);
  }

  // A textured flat board (a sign, the photos, the note): its own mesh.
  board(texture, width, height, x, z, y, yawDeg, { doubleSided = false, tiltX = 0, emissive = 0 } = {}) {
    const mat = this.hold(new THREE.MeshLambertMaterial({ map: this.hold(texture), side: doubleSided ? THREE.DoubleSide : THREE.FrontSide, emissive, emissiveIntensity: emissive ? 1 : 0 }));
    const mesh = new THREE.Mesh(this.hold(new THREE.PlaneGeometry(width, height)), mat);
    const w = frameToWorld(this.frame, x, z);
    mesh.position.set(w.x, y, w.z);
    mesh.rotation.set(tiltX, this.rotY(yawDeg), 0, 'YXZ');
    mesh.receiveShadow = true;
    this.group.add(mesh);
    return mesh;
  }

  // ---- the store's shell ---------------------------------------------------------------------------

  building() {
    const b = this.data.building;
    const k = this.cfg.colors;
    const fy = this.floorY;
    const H = b.height;
    const t = b.wall;
    // The slab it stands on, down into the ground.
    let low = Infinity;
    for (const [x, z] of [[b.x0, b.z0], [b.x1, b.z0], [b.x0, b.z1], [b.x1, b.z1]]) low = Math.min(low, this.groundAt(x, z));
    this.span(b.x0 - 0.3, b.x1 + 0.3, b.z0 - 0.3, b.z1 + 0.5, low - 0.5, fy - (low - 0.5), k.slab);
    // The floor (lino, scuffed dark).
    this.span(b.x0, b.x1, b.z0, b.z1, fy, 0.02, k.floor);
    // Back and side walls (the back one with the stockroom's door in it).
    const bdw = b.backDoor;
    const bd0 = bdw.x - bdw.width / 2;
    const bd1 = bdw.x + bdw.width / 2;
    this.span(b.x0, bd0, b.z0 - t / 2, b.z0 + t / 2, fy, H, k.wall);
    this.span(bd1, b.x1, b.z0 - t / 2, b.z0 + t / 2, fy, H, k.wall);
    this.span(bd0, bd1, b.z0 - t / 2, b.z0 + t / 2, fy + 2.1, H - 2.1, k.wall);
    this.span(b.x0 - t / 2, b.x0 + t / 2, b.z0, b.z1, fy, H, k.wall);
    this.span(b.x1 - t / 2, b.x1 + t / 2, b.z0, b.z1, fy, H, k.wall);
    // The front: wall below the sills and above the window tops; solid
    // piers between the windows and round the door; grimed glass.
    const fz0 = b.z1 - t / 2;
    const fz1 = b.z1 + t / 2;
    const d0 = b.door.x - b.door.width / 2;
    const d1 = b.door.x + b.door.width / 2;
    const doorTop = 2.3;
    const solid = [];
    let x = b.x0;
    const openings = [...b.windows.map((w) => ({ ...w, kind: 'window' })), { x0: d0, x1: d1, kind: 'door' }].sort((p, q) => p.x0 - q.x0);
    for (const o of openings) {
      if (o.x0 > x) solid.push([x, o.x0]);
      x = o.x1;
    }
    if (x < b.x1) solid.push([x, b.x1]);
    for (const [a, c] of solid) this.span(a, c, fz0, fz1, fy, H, k.wall);
    for (const o of openings) {
      if (o.kind === 'window') {
        this.span(o.x0, o.x1, fz0, fz1, fy, b.windowSill, k.wall);
        this.span(o.x0, o.x1, fz0, fz1, fy + b.windowTop, H - b.windowTop, k.wall);
        this.span(o.x0, o.x1, fz0 - 0.02, fz1 + 0.02, fy + b.windowSill - 0.05, 0.06, k.trim);
      } else {
        this.span(o.x0, o.x1, fz0, fz1, fy + doorTop, H - doorTop, k.wall);
      }
    }
    // The grimed glass: one translucent mesh for the windows and the door's leaves.
    const glass = [];
    const pane = (w, h, x0, z0, y0, yawDeg = 0, pivot = 0) => {
      const g = new THREE.PlaneGeometry(w, h).translate(pivot, h / 2, 0);
      g.rotateY(this.rotY(yawDeg));
      const at = frameToWorld(this.frame, x0, z0);
      g.translate(at.x, y0, at.z);
      glass.push(g);
    };
    for (const w of b.windows) pane(w.x1 - w.x0, b.windowTop - b.windowSill, (w.x0 + w.x1) / 2, b.z1, fy + b.windowSill);
    // The door's two glass leaves hang open inward, one wide, one ajar.
    const leaf = b.door.width / 2;
    pane(leaf, doorTop - 0.05, d0, b.z1 - 0.05, fy + 0.02, -70, -leaf / 2);
    pane(leaf, doorTop - 0.05, d1, b.z1 - 0.05, fy + 0.02, 35, leaf / 2);
    const gMat = this.hold(new THREE.MeshLambertMaterial({ color: k.glass, transparent: true, opacity: this.cfg.glassOpacity, side: THREE.DoubleSide, depthWrite: false }));
    const gMesh = new THREE.Mesh(this.hold(mergeGeometries(glass)), gMat);
    glass.forEach((g) => g.dispose());
    this.group.add(gMesh);
    // The door frames' aluminium (dull).
    this.span(d0 - 0.06, d0, fz0, fz1, fy, doorTop, k.trim);
    this.span(d1, d1 + 0.06, fz0, fz1, fy, doorTop, k.trim);
    // The roof: a flat slab overhanging the front, a parapet, the fascia board.
    this.span(b.x0 - 0.3, b.x1 + 0.3, b.z0 - 0.3, b.z1 + 0.9, fy + H, 0.25, k.roof);
    this.span(b.x0 - 0.3, b.x1 + 0.3, b.z1 + 0.85, b.z1 + 0.95, fy + H - 0.5, 1.15, k.fascia);
    this.board(fasciaTexture(this.cfg), (b.x1 - b.x0) * 0.7, 0.75, 0, b.z1 + 0.97, fy + H + 0.08, 0);
    // Session 19: the parapet's cap; lap siding on the sides and back; a
    // gutter along the back and two downpipes; the roof's AC unit and vent.
    const cap = fy + H + 0.25;
    this.span(b.x0 - 0.34, b.x1 + 0.34, b.z0 - 0.34, b.z0 - 0.22, cap, 0.12, k.trim);
    this.span(b.x0 - 0.34, b.x0 - 0.22, b.z0 - 0.34, b.z1 + 0.9, cap, 0.12, k.trim);
    this.span(b.x1 + 0.22, b.x1 + 0.34, b.z0 - 0.34, b.z1 + 0.9, cap, 0.12, k.trim);
    const lap = this.cfg.siding;
    for (let h = lap.from; h < H - 0.1; h += lap.step) {
      const yy = fy + h;
      this.span(b.x0 - t / 2 - lap.out, b.x0 - t / 2, b.z0, b.z1, yy, lap.height, k.wallLap);
      this.span(b.x1 + t / 2, b.x1 + t / 2 + lap.out, b.z0, b.z1, yy, lap.height, k.wallLap);
      if (h < 2.1) {
        this.span(b.x0, bd0, b.z0 - t / 2 - lap.out, b.z0 - t / 2, yy, lap.height, k.wallLap);
        this.span(bd1, b.x1, b.z0 - t / 2 - lap.out, b.z0 - t / 2, yy, lap.height, k.wallLap);
      } else this.span(b.x0, b.x1, b.z0 - t / 2 - lap.out, b.z0 - t / 2, yy, lap.height, k.wallLap);
    }
    this.span(b.x0 - 0.3, b.x1 + 0.3, b.z0 - 0.5, b.z0 - 0.32, fy + H - 0.05, 0.16, k.gutter);
    for (const gx of [b.x0 - 0.1, b.x1 + 0.1]) {
      this.box(0.09, fy + H - low, 0.09, gx, b.z0 - 0.42, low, k.gutter);
      this.box(0.3, 0.09, 0.09, gx, b.z0 - 0.42, this.groundAt(gx, b.z0 - 0.42) + 0.05, k.gutter, 0, { oz: -0.1 });
    }
    const ac = this.cfg.roofUnit;
    this.box(1.3, 0.75, 1.0, ac.x, ac.z, fy + H + 0.25, k.acUnit, 8);
    this.box(1.1, 0.5, 0.02, ac.x, ac.z, fy + H + 0.35, k.acGrille, 8, { oz: 0.51 });
    this.box(0.4, 0.4, 1.6, ac.x, ac.z, fy + H + 0.25, k.acUnit, 8, { oz: -1.2, ox: 0.3 });
    this.cyl(0.08, 0.9, ac.x - 2.5, ac.z + 1.5, fy + H + 0.25, k.gutter, 8);
    this.cyl(0.14, 0.08, ac.x - 2.5, ac.z + 1.5, fy + H + 1.15, k.gutter, 8);
    // The back rooms: the partition with its two doorways, and the wall between the rooms.
    const gaps = [b.officeDoor, b.stockDoor].map((g) => [g.x - g.width / 2, g.x + g.width / 2]).sort((p, q) => p[0] - q[0]);
    x = b.x0;
    for (const [g0, g1] of gaps) {
      this.span(x, g0, b.partitionZ - t / 2, b.partitionZ + t / 2, fy, H, k.wallInside);
      this.span(g0, g1, b.partitionZ - t / 2, b.partitionZ + t / 2, fy + 2.1, H - 2.1, k.wallInside);
      x = g1;
    }
    this.span(x, b.x1, b.partitionZ - t / 2, b.partitionZ + t / 2, fy, H, k.wallInside);
    this.span(b.splitX - t / 2, b.splitX + t / 2, b.z0, b.partitionZ, fy, H, k.wallInside);
    // The stockroom's back door (Session 15b: it swings out as Tom comes to
    // it: setBackDoor), hinged at its east edge; and a dented step outside it.
    const bd = b.backDoor;
    const hinge = frameToWorld(this.frame, bd.x - bd.width / 2, b.z0);
    this.backDoorMesh = new THREE.Group();
    const backLeaf = new THREE.Mesh(this.hold(new THREE.BoxGeometry(bd.width, 2.08, 0.06).translate(-bd.width / 2, 1.04, 0)), this.hold(new THREE.MeshLambertMaterial({ color: k.door })));
    backLeaf.castShadow = true;
    this.backDoorMesh.add(backLeaf);
    this.backDoorMesh.position.set(hinge.x, fy, hinge.z);
    this.backDoorMesh.rotation.y = this.frame.yaw;
    this.group.add(this.backDoorMesh);
    this.span(bd.x - 0.6, bd.x + 0.6, b.z0 - 0.9, b.z0 - t / 2, fy - 0.35, 0.3, k.slab);
    // A front step down to the forecourt where the ground falls away.
    const front = this.groundAt(b.door.x, b.z1 + 1);
    if (fy - front > 0.12) this.span(d0 - 0.4, d1 + 0.4, b.z1 + 0.1, b.z1 + 1.1, front - 0.3, fy - 0.05 - (front - 0.3), k.slab);
  }

  // ---- the shop ----------------------------------------------------------------------------------------

  store() {
    const s = this.data.store;
    const k = this.cfg.colors;
    const fy = this.floorY;
    // The counter, its top and the register.
    const c = s.counter;
    this.box(c.length, c.height, c.depth, c.x, c.z, fy, k.counter, c.yaw);
    this.box(c.length + 0.1, 0.05, c.depth + 0.1, c.x, c.z, fy + c.height, k.counterTop, c.yaw);
    this.box(0.42, 0.22, 0.38, s.register.x, s.register.z, fy + c.height + 0.05, k.metal);
    this.box(0.3, 0.2, 0.06, s.register.x, s.register.z - 0.12, fy + c.height + 0.27, k.screen, 0, { rotX: -0.4 });
    // The phone on the counter (Session 15b: dead).
    if (s.phone) {
      this.box(0.24, 0.08, 0.2, s.phone.x, s.phone.z, fy + c.height + 0.05, k.radio);
      this.box(0.22, 0.05, 0.06, s.phone.x, s.phone.z, fy + c.height + 0.13, k.radio, 0, { oz: -0.04 });
    }
    // Session 19 (Aaron: a brown box beside the phone muddled it): the postcard rack's gone from the counter.
    // Shelf runs, the goods on them, one knocked over.
    for (const sh of s.shelves) this.shelf(sh, k, fy);
    // The drinks coolers along the wall: dark glass fronts, dead.
    const co = s.coolers;
    const len = Math.abs(co.z1 - co.z0);
    this.box(0.8, 2.0, len, co.x, (co.z0 + co.z1) / 2, fy, k.coolerBody);
    for (let i = 0; i < 3; i++) {
      const zc = co.z0 + ((co.z1 - co.z0) * (i + 0.5)) / 3;
      this.box(0.04, 1.6, len / 3 - 0.15, co.x - 0.41, zc, fy + 0.25, k.coolerGlass);
    }
    // The carved Bigfoot by the door: crude, chainsaw-cut, taller than Tom.
    this.statue(s.statue, k, fy);
    // The board of sighting photos on the left wall, and the plaster footprint casts.
    const pb = s.photoBoard;
    this.board(photoBoardTexture(this.cfg), pb.width, 1.3, pb.x, pb.z, fy + 1.9, -90);
    for (const cst of s.casts) this.box(0.24, 0.05, 0.4, cst.x, cst.z, fy + 1.62, k.plaster);
    // Session 19: the drop ceiling's grid under the roof, its dead tubes (one hanging by a chain).
    const b = this.data.building;
    const ceil = fy + b.height - 0.03;
    for (let gx = b.x0 + 1.2; gx < b.x1 - 0.2; gx += 1.2) this.span(gx - 0.02, gx + 0.02, b.partitionZ, b.z1, ceil, 0.03, k.ceilingGrid);
    for (let gz = b.partitionZ + 0.6; gz < b.z1 - 0.2; gz += 1.2) this.span(b.x0, b.x1, gz - 0.02, gz + 0.02, ceil, 0.03, k.ceilingGrid);
    for (const [fx, fz, hang] of this.cfg.fixtures) {
      if (hang) {
        this.bar([fx - 0.5, ceil, fz], [fx - 0.45, ceil - 0.55, fz], 0.008, k.metal);
        this.box(1.2, 0.08, 0.28, fx, fz, ceil - 0.75, k.fixture, 0, { rotZ: 0.55 });
      } else this.box(1.2, 0.07, 0.3, fx, fz, ceil - 0.07, k.fixture);
    }
    // Stains on the lino.
    for (let i = 0; i < 6; i++) {
      const x = b.x0 + 1 + this.rand() * (b.x1 - b.x0 - 2);
      const z = b.partitionZ + 0.8 + this.rand() * (b.z1 - b.partitionZ - 1.6);
      this.box(0.5 + this.rand() * 0.9, 0.005, 0.4 + this.rand() * 0.7, x, z, fy + 0.02, k.stain, this.rand() * 180);
    }
    // Litter: a few fallen goods on the floor.
    for (let i = 0; i < 14; i++) {
      const x = -1 + this.rand() * 8;
      const z = -9.8 + this.rand() * 5.5;
      this.box(0.15 + this.rand() * 0.15, 0.08, 0.1 + this.rand() * 0.1, x, z, fy + 0.02, this.goodsColor(), this.rand() * 360);
    }
  }

  goodsColor() {
    const g = this.cfg.colors.goods;
    return g[Math.floor(this.rand() * g.length)];
  }

  // A shelf unit: long along local z (turned by yaw), shelves both sides, goods.
  shelf(sh, k, fy) {
    const L = sh.length;
    const opts = sh.fallen ? { rotZ: 1.42, oy: 0 } : {};
    const yawDeg = sh.yaw;
    const y = fy + (sh.fallen ? 0.32 : 0);
    // Uprights' back panel and the base.
    this.box(0.08, 1.6, L, sh.x, sh.z, y, k.shelf, yawDeg, opts);
    this.box(0.6, 0.12, L, sh.x, sh.z, y, k.shelfDark, yawDeg, opts);
    for (const h of [0.55, 1.05, 1.55]) this.box(0.6, 0.03, L, sh.x, sh.z, y, k.shelf, yawDeg, { ...opts, oy: h });
    // Session 19: the price strips along the shelves' edges.
    for (const h of [0.12, 0.55, 1.05]) for (const side of [-0.31, 0.31]) this.box(0.02, 0.045, L, sh.x, sh.z, y, k.priceStrip, yawDeg, { ...opts, ox: side, oy: h - 0.03 });
    if (sh.fallen) {
      // Its goods spilled across the floor beside it.
      for (let i = 0; i < 16; i++) this.box(0.18, 0.1, 0.12, sh.x + (this.rand() - 0.5) * L, sh.z + 0.5 + this.rand() * 1.2, fy + 0.02, this.goodsColor(), this.rand() * 360);
      return;
    }
    // Goods: rows of small things on each shelf, both faces, with gaps (looted).
    // Round 2 (the polish pass): not all one box: a packet with its label's band, tins in a pair (some
    // stacked), bottles with their caps, a bag slumped against its neighbour.
    for (const h of [0.15, 0.58, 1.08]) {
      for (const side of [-0.17, 0.17]) {
        for (let zz = -L / 2 + 0.2; zz < L / 2 - 0.15; zz += 0.24) {
          if (this.rand() < 0.4) continue;
          const at = { ox: side, oy: h, oz: zz };
          const col = this.goodsColor();
          const kind = this.rand();
          if (kind < 0.45) {
            const gh = 0.14 + this.rand() * 0.18;
            this.box(0.2, gh, 0.18, sh.x, sh.z, fy, col, yawDeg, at);
            this.box(0.206, gh * 0.3, 0.186, sh.x, sh.z, fy, this.goodsColor(), yawDeg, { ...at, oy: h + gh * 0.4 });
          } else if (kind < 0.7) {
            for (const dz of [-0.05, 0.05]) {
              this.cyl(0.045, 0.11, sh.x, sh.z, fy, col, 7, { ...at, oz: zz + dz, yaw: yawDeg });
              this.cyl(0.046, 0.03, sh.x, sh.z, fy, k.priceStrip, 7, { ...at, oy: h + 0.04, oz: zz + dz, yaw: yawDeg });
            }
            if (this.rand() < 0.4) this.cyl(0.045, 0.11, sh.x, sh.z, fy, col, 7, { ...at, oy: h + 0.11, yaw: yawDeg });
          } else if (kind < 0.86) {
            for (const dz of [-0.05, 0.045]) {
              this.cyl(0.034, 0.17, sh.x, sh.z, fy, col, 6, { ...at, oz: zz + dz, yaw: yawDeg });
              this.cyl(0.016, 0.07, sh.x, sh.z, fy, col, 5, { ...at, oy: h + 0.17, oz: zz + dz, yaw: yawDeg });
              this.cyl(0.02, 0.02, sh.x, sh.z, fy, k.metal, 5, { ...at, oy: h + 0.24, oz: zz + dz, yaw: yawDeg });
            }
          } else {
            this.box(0.19, 0.2, 0.09, sh.x, sh.z, fy, col, yawDeg, { ...at, rotX: 0.22 });
            this.box(0.19, 0.03, 0.095, sh.x, sh.z, fy, k.priceStrip, yawDeg, { ...at, oy: h + 0.17, rotX: 0.22 });
          }
        }
      }
    }
  }

  // Round 2 (the polish pass; Aaron: "improve the aesthetic of... Earl's store"): the gift shop Earl kept
  // (data store.extras; the standing ones are solid: GasStation.buildColliders). HOME OF BIGFOOT was a
  // business: a coffee counter and a magazine rack along the back wall, the LIVE BAIT chest and a rack of
  // rods; cigarettes and a dead beer sign behind the counter, the till's clutter; a table of souvenirs
  // under his photographs (plush Bigfoots, mugs, folded shirts), a round rail of T-shirts, the postcard
  // spinner and the paper stand by the door, a gumball machine; a string of pennants across the room; a
  // mat inside the door. All of it dusty and dead, like the rest.
  giftShop() {
    const e = this.data.store.extras;
    if (!e) return;
    const k = this.cfg.colors;
    const fy = this.floorY;
    const goods = () => this.goodsColor();
    if (e.coffee) {
      const a = e.coffee;
      this.box(a.w, a.h - 0.04, a.d, a.x, a.z, fy, k.counter);
      this.box(a.w + 0.04, 0.04, a.d + 0.04, a.x, a.z, fy + a.h - 0.04, k.counterTop);
      // The machine: its body, two glass pots on their plates, the basket.
      this.box(0.5, 0.42, 0.3, a.x - 0.4, a.z - 0.08, fy + a.h, k.metal);
      this.box(0.5, 0.06, 0.36, a.x - 0.4, a.z - 0.05, fy + a.h + 0.42, k.metal);
      for (const dx of [-0.52, -0.28]) {
        this.cyl(0.07, 0.13, a.x + dx, a.z + 0.14, fy + a.h + 0.02, k.coolerGlass, 8);
        this.cyl(0.075, 0.02, a.x + dx, a.z + 0.14, fy + a.h, k.screen, 8);
        this.box(0.03, 0.09, 0.02, a.x + dx + 0.085, a.z + 0.14, fy + a.h + 0.04, k.screen);
      }
      // Cups in two stacks, lids, a box of stirrers, the sugar; the donut case, three left in it.
      for (const dx of [0.0, 0.14]) this.cyl(0.04, 0.26 - dx, a.x + dx, a.z + 0.02, fy + a.h, k.officePaper ?? k.plaster, 7, { top: 0.046 });
      this.box(0.14, 0.08, 0.12, a.x + 0.02, a.z - 0.16, fy + a.h, goods());
      this.box(0.38, 0.26, 0.3, a.x + 0.5, a.z - 0.04, fy + a.h, k.coolerGlass);
      this.box(0.42, 0.03, 0.34, a.x + 0.5, a.z - 0.04, fy + a.h + 0.26, k.metal);
      for (let i = 0; i < 3; i++) this.cyl(0.045, 0.03, a.x + 0.4 + i * 0.1, a.z - 0.04, fy + a.h + 0.04, k.carving, 7);
      // The price list on the wall over it (a dark board, its lines), a stopped clock.
      this.box(0.9, 0.5, 0.02, a.x - 0.2, a.z - a.d / 2 - 0.03, fy + 1.55, k.screen);
      for (let i = 0; i < 5; i++) this.box(0.5 + (i % 3) * 0.1, 0.02, 0.012, a.x - 0.3 + (i % 2) * 0.04, a.z - a.d / 2 - 0.015, fy + 1.62 + i * 0.08, k.priceStrip);
      this.cyl(0.16, 0.03, a.x + 0.62, a.z - a.d / 2 - 0.03, fy + 1.8, k.plaster, 10, { rotX: Math.PI / 2, oy: -0.015 });
    }
    if (e.gumball) {
      const a = e.gumball;
      this.cyl(0.13, 0.04, a.x, a.z, fy, k.metal, 8);
      this.cyl(0.025, 0.7, a.x, a.z, fy + 0.04, k.metal, 6);
      this.box(0.2, 0.2, 0.2, a.x, a.z, fy + 0.74, k.goods[0]);
      this.cyl(0.13, 0.22, a.x, a.z, fy + 0.94, k.coolerGlass, 8, { top: 0.1 });
      this.cyl(0.07, 0.04, a.x, a.z, fy + 1.16, k.goods[0], 7);
    }
    if (e.magazines) {
      const a = e.magazines;
      // A rack leaning back against the wall: four tiers, covers face out, some gone.
      this.box(a.w, a.h, 0.04, a.x, a.z - a.d / 2 + 0.02, fy, k.shelfDark);
      for (const s of [-1, 1]) this.box(0.03, a.h, a.d, a.x + s * (a.w / 2 - 0.015), a.z, fy, k.shelfDark);
      for (let j = 0; j < 4; j++) {
        const y = fy + 0.12 + j * 0.34;
        this.box(a.w, 0.025, 0.16, a.x, a.z - a.d / 2 + 0.12 + (3 - j) * 0.05, y, k.shelf);
        for (let i = 0; i < 5; i++) {
          if (this.rand() < 0.3) continue;
          const mx = a.x - a.w / 2 + 0.16 + i * ((a.w - 0.32) / 4);
          const mz = a.z - a.d / 2 + 0.13 + (3 - j) * 0.05;
          const col = goods();
          this.box(0.2, 0.27, 0.012, mx, mz, y + 0.03, col, 0, { rotX: -0.22 });
          this.box(0.16, 0.05, 0.014, mx, mz + 0.004, y + 0.24, k.plaster, 0, { rotX: -0.22 }); // its masthead
          this.box(0.1, 0.1, 0.014, mx + 0.02, mz + 0.02, y + 0.08, goods(), 0, { rotX: -0.22 });
        }
      }
    }
    if (e.bait) {
      const a = e.bait;
      this.box(a.w, a.h, a.d, a.x, a.z, fy, k.iceChest);
      this.box(a.w + 0.03, 0.06, a.d + 0.03, a.x, a.z, fy + a.h, k.iceLid);
      this.box(0.3, 0.04, 0.04, a.x, a.z + a.d / 2 + 0.01, fy + a.h - 0.1, k.metal);
      // LIVE BAIT, hand-lettered on a board over it (two words' worth of pale strokes), and a hook drawn under.
      this.box(0.9, 0.36, 0.02, a.x, a.z - a.d / 2 + 0.02, fy + 1.5, k.carvingDark ?? k.shelfDark);
      for (let i = 0; i < 4; i++) this.box(0.1, 0.11, 0.012, a.x - 0.32 + i * 0.13, a.z - a.d / 2 + 0.034, fy + 1.7, k.plaster);
      for (let i = 0; i < 4; i++) this.box(0.1, 0.11, 0.012, a.x - 0.06 + i * 0.13, a.z - a.d / 2 + 0.034, fy + 1.54, k.plaster);
      // Tubs of worms and a scoop on the lid.
      for (let i = 0; i < 3; i++) this.cyl(0.06, 0.07, a.x - 0.35 + i * 0.16, a.z + 0.05, fy + a.h + 0.06, k.plaster, 7);
      this.box(0.2, 0.03, 0.06, a.x + 0.3, a.z + 0.1, fy + a.h + 0.06, k.metal, 30);
    }
    if (e.rods) {
      const a = e.rods;
      this.box(a.w, 0.06, a.d, a.x, a.z, fy + 0.02, k.shelfDark);
      this.box(a.w, 0.04, 0.1, a.x, a.z - 0.06, fy + 1.2, k.shelfDark);
      for (let i = 0; i < 6; i++) {
        const rx = a.x - a.w / 2 + 0.12 + i * ((a.w - 0.24) / 5);
        const len = 1.7 + (i % 3) * 0.12;
        this.box(0.016, len, 0.016, rx, a.z + 0.04, fy + 0.06, i % 2 ? k.shelfDark : k.carving, 0, { rotX: -0.06 });
        this.cyl(0.035, 0.05, rx, a.z + 0.07, fy + 0.3, k.metal, 6, { rotX: Math.PI / 2 });
      }
      // The lure board over them: cards of lures on pegs.
      this.box(a.w, 0.5, 0.02, a.x, a.z - a.d / 2 + 0.02, fy + 2.05, k.shelf);
      for (let i = 0; i < 10; i++) {
        const lx = a.x - a.w / 2 + 0.12 + (i % 5) * ((a.w - 0.24) / 4);
        this.box(0.09, 0.14, 0.012, lx, a.z - a.d / 2 + 0.035, fy + 2.1 + Math.floor(i / 5) * 0.22, k.plaster);
        this.box(0.03, 0.06, 0.016, lx, a.z - a.d / 2 + 0.04, fy + 2.13 + Math.floor(i / 5) * 0.22, goods());
      }
    }
    if (e.smokes) {
      const a = e.smokes;
      // Shelves on the wall behind the counter: packs in rows, cartons under; lighters and jerky on the top.
      this.box(a.w, a.h, a.d, a.x, a.z, fy, k.shelfDark);
      for (let j = 0; j < 5; j++) {
        const y = fy + 0.5 + j * 0.3;
        this.box(a.w + 0.06, 0.02, a.d, a.x + 0.03, a.z, y, k.shelf);
        for (let zz = -a.d / 2 + 0.09; zz < a.d / 2 - 0.05; zz += 0.085) {
          if (this.rand() < 0.25) continue;
          const col = goods();
          this.box(0.03, j < 2 ? 0.1 : 0.12, 0.07, a.x + a.w / 2 + 0.03, a.z + zz, y + 0.02, col);
          if (j >= 2) this.box(0.032, 0.035, 0.072, a.x + a.w / 2 + 0.03, a.z + zz, y + 0.105, k.plaster);
        }
      }
      // The beer sign over it, dead: a dark board, the tube's loops.
      this.box(0.04, 0.42, 0.9, a.x, a.z, fy + a.h + 0.2, k.screen);
      for (const [dz, dy, w, h] of [[-0.26, 0.1, 0.22, 0.2], [0.02, 0.1, 0.22, 0.2], [0.28, 0.1, 0.18, 0.2], [0, 0.04, 0.76, 0.03]]) this.box(0.02, h, w, a.x + 0.03, a.z + dz, fy + a.h + 0.2 + dy, k.neonDead ?? k.calendarTop);
      // On the counter: the lottery stand, a jar, the penny dish, a bell, a charity can, a stack of stickers.
      const c = this.data.store.counter;
      const cy = fy + c.height + 0.05;
      this.box(0.3, 0.26, 0.16, c.x + 1.35, c.z - 0.12, cy, k.shelfDark, 0, { rotX: 0.2 });
      for (let i = 0; i < 6; i++) this.box(0.08, 0.1, 0.012, c.x + 1.25 + (i % 3) * 0.1, c.z - 0.06 + Math.floor(i / 3) * 0.03, cy + 0.04 + Math.floor(i / 3) * 0.12, goods(), 0, { rotX: 0.2 });
      this.cyl(0.07, 0.2, c.x + 0.3, c.z + 0.12, cy, k.coolerGlass, 8);
      this.cyl(0.074, 0.03, c.x + 0.3, c.z + 0.12, cy + 0.2, k.metal, 8);
      this.cyl(0.06, 0.025, c.x - 0.2, c.z + 0.18, cy, k.plaster, 8);
      this.cyl(0.04, 0.04, c.x - 0.5, c.z + 0.15, cy, k.metal, 8, { top: 0.015 });
      this.cyl(0.045, 0.12, c.x + 0.62, c.z + 0.2, cy, k.goods[3], 7);
      for (let i = 0; i < 4; i++) this.box(0.24, 0.006, 0.08, c.x - 0.95, c.z + 0.1, cy + i * 0.006, i % 2 ? k.carving : k.plaster, 8 * i);
    }
    if (e.giftTable) {
      const a = e.giftTable;
      this.box(a.w, 0.05, a.d, a.x, a.z, fy + a.h - 0.05, k.wood);
      for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) this.box(0.06, a.h - 0.05, 0.06, a.x + lx * (a.w / 2 - 0.06), a.z + lz * (a.d / 2 - 0.08), fy, k.wood);
      this.box(a.w + 0.02, 0.3, a.d + 0.02, a.x, a.z, fy + a.h - 0.34, k.goods[1]); // its cloth, hanging
      const ty = fy + a.h;
      // A row of plush Bigfoots, sitting: a body, a head, arms, the feet out front.
      for (let i = 0; i < 5; i++) {
        const z = a.z - 0.9 + i * 0.24;
        const s = 0.8 + (i % 3) * 0.14;
        this.box(0.13 * s, 0.16 * s, 0.13 * s, a.x - 0.12, z, ty, k.plush ?? k.carving);
        this.box(0.1 * s, 0.1 * s, 0.1 * s, a.x - 0.12, z, ty + 0.16 * s, k.plush ?? k.carving);
        this.box(0.07 * s, 0.03, 0.035, a.x - 0.02, z - 0.04 * s, ty, k.carvingDark ?? k.shelfDark);
        this.box(0.07 * s, 0.03, 0.035, a.x - 0.02, z + 0.04 * s, ty, k.carvingDark ?? k.shelfDark);
      }
      // Mugs with the footprint on, in two rows; snow globes; folded shirts in three stacks; a tin of badges.
      for (let i = 0; i < 6; i++) this.cyl(0.04, 0.085, a.x + 0.02 + (i % 2) * 0.13, a.z + 0.34 + Math.floor(i / 2) * 0.12, ty, i % 3 ? k.plaster : k.goods[0], 7);
      for (let i = 0; i < 3; i++) {
        this.cyl(0.045, 0.02, a.x - 0.18, a.z + 0.36 + i * 0.13, ty, k.wood, 7);
        this.cyl(0.04, 0.07, a.x - 0.18, a.z + 0.36 + i * 0.13, ty + 0.02, k.coolerGlass, 7, { top: 0.025 });
      }
      for (let st = 0; st < 3; st++) for (let i = 0; i < 3 + st; i++) this.box(0.26, 0.022, 0.2, a.x + 0.02, a.z + 0.72 + st * 0.0, ty + i * 0.023 + st * 0.0, [k.goods[0], k.goods[1], k.goods[3], k.goods[5]][(i + st) % 4], st * 14 - 10, { oz: st * 0.0 });
      this.box(0.26, 0.022 * 4, 0.2, a.x - 0.02, a.z + 0.98, ty, k.goods[3], 6);
      this.cyl(0.07, 0.03, a.x + 0.16, a.z - 0.02, ty, k.metal, 8);
      // His sign for it, propped at the back: a board and its strokes.
      this.box(0.02, 0.26, 0.6, a.x - a.w / 2 + 0.05, a.z + 0.05, ty + 0.3, k.carvingDark ?? k.shelfDark);
      for (let i = 0; i < 5; i++) this.box(0.012, 0.1, 0.08, a.x - a.w / 2 + 0.065, a.z - 0.17 + i * 0.11, ty + 0.38, k.plaster);
    }
    if (e.shirtRack) {
      const a = e.shirtRack;
      this.cyl(0.03, 1.5, a.x, a.z, fy, k.metal, 6);
      this.cyl(0.28, 0.03, a.x, a.z, fy, k.metal, 8);
      this.put(new THREE.TorusGeometry(a.r - 0.06, 0.012, 4, 14).rotateX(Math.PI / 2), k.metal, a.x, a.z, fy + 1.5);
      for (const yaw of [0, 90]) this.box(0.02, 0.02, (a.r - 0.06) * 2, a.x, a.z, fy + 1.49, k.metal, yaw);
      // The shirts, hanging round it: gaps where they sold, or were taken.
      for (let i = 0; i < 16; i++) {
        if (this.rand() < 0.25) continue;
        const ang = (i / 16) * 360;
        const r = a.r - 0.06;
        const rad = (ang * Math.PI) / 180;
        const x = a.x + Math.sin(rad) * r;
        const z = a.z + Math.cos(rad) * r;
        const col = goods();
        this.box(0.03, 0.56, 0.4, x, z, fy + 0.86, col, -ang + 90);
        this.box(0.034, 0.16, 0.2, x, z, fy + 1.1, k.carving, -ang + 90); // the print on it
        this.box(0.02, 0.06, 0.02, x, z, fy + 1.43, k.metal);
      }
    }
    if (e.spinner) {
      const a = e.spinner;
      this.cyl(0.2, 0.03, a.x, a.z, fy, k.metal, 8);
      this.cyl(0.02, 1.7, a.x, a.z, fy, k.metal, 6);
      for (let j = 0; j < 5; j++) {
        for (let i = 0; i < 4; i++) {
          if (this.rand() < 0.2) continue;
          const ang = i * 90 + j * 20;
          const rad = (ang * Math.PI) / 180;
          const x = a.x + Math.sin(rad) * (a.r - 0.08);
          const z = a.z + Math.cos(rad) * (a.r - 0.08);
          this.box(0.15, 0.11, 0.012, x, z, fy + 0.55 + j * 0.22, i % 2 ? k.photo : goods(), -ang, { rotX: -0.25 });
          this.box(0.06, 0.07, 0.014, x, z, fy + 0.57 + j * 0.22, k.carving, -ang, { rotX: -0.25, ox: 0.02 }); // him, on every card
        }
      }
      this.box(0.3, 0.08, 0.02, a.x, a.z, fy + 1.7, k.carvingDark ?? k.shelfDark);
    }
    if (e.papers) {
      const a = e.papers;
      this.box(a.w, a.h, a.d, a.x, a.z, fy, k.metal);
      this.box(a.w - 0.06, 0.3, 0.02, a.x, a.z - a.d / 2 - 0.011, fy + 0.3, k.coolerGlass);
      for (let i = 0; i < 5; i++) this.box(a.w - 0.12, 0.012, a.d - 0.1, a.x, a.z, fy + a.h + i * 0.012, i === 4 ? k.officePaper ?? k.plaster : k.plaster, i * 2);
      this.box(a.w - 0.2, 0.014, 0.05, a.x, a.z - 0.08, fy + a.h + 0.06, k.screen); // the headline
      this.box(0.16, 0.014, 0.12, a.x - 0.08, a.z + 0.05, fy + a.h + 0.06, k.photo);
    }
    // The mat inside the door; a wet-floor board folded against the wall by the coolers.
    const b = this.data.building;
    this.box(1.5, 0.015, 0.8, b.door.x, b.z1 - 0.65, fy + 0.012, k.mat ?? k.shelfDark);
    this.box(1.3, 0.017, 0.12, b.door.x, b.z1 - 0.65, fy + 0.014, k.carving);
    this.box(0.3, 0.6, 0.02, 6.9, b.z1 - 0.3, fy, k.goods[2], 0, { rotX: 0.12 });
    // The pennants: a sagging string across the shop from wall to wall, a triangle every half metre.
    const ceil = fy + b.height - 0.45;
    const n = 26;
    let prev = null;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = b.x0 + 0.5 + t * (b.x1 - b.x0 - 1.0);
      const y = ceil - Math.sin(t * Math.PI) * 0.35 - Math.abs(Math.sin(t * Math.PI * 3)) * 0.08;
      const z = -4.4 - t * 0.6;
      if (prev) this.bar([prev[0], prev[1], prev[2]], [x, y, z], 0.004, k.metal);
      if (i > 0 && i < n) {
        const col = goods();
        this.box(0.2, 0.09, 0.008, x, z, y - 0.09, col);
        this.box(0.12, 0.08, 0.008, x, z, y - 0.17, col);
        this.box(0.05, 0.07, 0.008, x, z, y - 0.24, col);
      }
      prev = [x, y, z];
    }
  }

  statue(st, k, fy) {
    const at = [st.x, st.z, fy];
    const yaw = st.yaw;
    this.box(0.8, 0.15, 0.8, ...at, k.wood, yaw);
    this.box(0.26, 0.85, 0.3, ...at, k.carving, yaw, { ox: -0.15, oy: 0.15 }); // legs
    this.box(0.26, 0.85, 0.3, ...at, k.carving, yaw, { ox: 0.15, oy: 0.15 });
    this.box(0.7, 0.85, 0.42, ...at, k.carving, yaw, { oy: 0.95 }); // body
    this.box(0.18, 0.95, 0.2, ...at, k.carving, yaw, { ox: -0.45, oy: 0.95, rotZ: 0 }); // arms, long
    this.box(0.18, 0.95, 0.2, ...at, k.carving, yaw, { ox: 0.45, oy: 0.95 });
    this.box(0.36, 0.34, 0.34, ...at, k.carving, yaw, { oy: 1.8, oz: 0.04 }); // head, a little forward
    this.box(0.3, 0.08, 0.05, ...at, k.carvingDark, yaw, { oy: 1.95, oz: 0.22 }); // brow
  }

  // ---- the office -------------------------------------------------------------------------------------

  office() {
    const o = this.data.office;
    const k = this.cfg.colors;
    const fy = this.floorY;
    this.box(1.6, 0.75, 0.8, o.desk.x, o.desk.z, fy, k.wood, o.desk.yaw);
    this.box(1.65, 0.04, 0.85, o.desk.x, o.desk.z, fy + 0.75, k.woodDark, o.desk.yaw);
    // The chair, pushed back and turned.
    this.box(0.45, 0.45, 0.45, o.chair.x, o.chair.z, fy, k.metal, o.chair.yaw);
    this.box(0.45, 0.5, 0.06, o.chair.x, o.chair.z, fy + 0.45, k.metal, o.chair.yaw, { oz: -0.2 });
    // The filing cabinet, a drawer pulled out.
    this.box(0.5, 1.3, 0.6, o.cabinet.x, o.cabinet.z, fy, k.cabinet);
    this.box(0.44, 0.25, 0.5, o.cabinet.x + 0.25, o.cabinet.z, fy + 0.85, k.cabinet, 90);
    this.officeDressing(o, k, fy);
    // Earl's note on the desk. (Session 17, Aaron: the safe and the scanner are in the stockroom now: the note has the office to itself.)
    this.note = this.board(noteTexture(this.cfg), 0.22, 0.29, o.note.x, o.note.z, fy + 0.795, 10, { tiltX: -Math.PI / 2 });
  }

  // Session 19 (Aaron: the office was abnormally empty): a lived-in room, nothing in it to take.
  officeDressing(o, k, fy) {
    const d = o.desk;
    // On the desk: a lamp, a mug, a stack of papers (the note keeps its own corner).
    this.cyl(0.08, 0.03, d.x - 0.62, d.z - 0.25, fy + 0.79, k.metal, 8);
    this.box(0.02, 0.32, 0.02, d.x - 0.62, d.z - 0.25, fy + 0.82, k.metal, 0, { rotZ: 0.25 });
    this.cyl(0.09, 0.12, d.x - 0.55, d.z - 0.25, fy + 1.1, k.lampShade, 8, { top: 0.05, rotZ: 0.5 });
    this.cyl(0.04, 0.09, d.x - 0.25, d.z + 0.25, fy + 0.79, k.mug, 8);
    for (let i = 0; i < 5; i++) this.box(0.22, 0.012, 0.3, d.x - 0.75 + (this.rand() - 0.5) * 0.03, d.z + 0.1, fy + 0.79 + i * 0.013, k.officePaper, 5 + this.rand() * 12);
    if (o.shelf) {
      const s = o.shelf;
      this.box(1.1, 1.85, 0.34, s.x, s.z, fy, k.woodDark);
      for (const h of [0.08, 0.5, 0.92, 1.34, 1.76]) this.box(1.06, 0.03, 0.32, s.x, s.z, fy + h, k.wood);
      for (const h of [0.11, 0.53, 0.95, 1.37]) {
        let x = -0.48;
        while (x < 0.45) {
          const w = 0.05 + this.rand() * 0.04;
          if (this.rand() < 0.85) this.box(w - 0.005, 0.28 + this.rand() * 0.06, 0.26, s.x + x + w / 2, s.z + 0.02, fy + h, k.binders[Math.floor(this.rand() * k.binders.length)], 0, { rotZ: this.rand() < 0.1 ? 0.3 : 0 });
          x += w;
        }
      }
    }
    if (o.coatStand) {
      const c = o.coatStand;
      this.cyl(0.025, 1.75, c.x, c.z, fy, k.woodDark, 6);
      for (let i = 0; i < 3; i++) this.box(0.04, 0.03, 0.35, c.x, c.z, fy + 0.02, k.woodDark, i * 60);
      // Earl's barn jacket on a hook, a cap on the top.
      this.box(0.44, 0.78, 0.18, c.x, c.z, fy + 0.85, k.jacket, 20, { oz: 0.12 });
      this.box(0.14, 0.6, 0.12, c.x, c.z, fy + 0.95, k.jacket, 20, { ox: -0.26, oz: 0.12, rotZ: 0.1 });
      this.box(0.14, 0.6, 0.12, c.x, c.z, fy + 0.95, k.jacket, 20, { ox: 0.26, oz: 0.12, rotZ: -0.1 });
      this.cyl(0.11, 0.08, c.x, c.z, fy + 1.73, k.cap, 10);
      this.box(0.16, 0.015, 0.12, c.x, c.z, fy + 1.73, k.cap, 20, { oz: 0.14 });
    }
    if (o.bin) {
      const b = o.bin;
      this.cyl(0.14, 0.32, b.x, b.z, fy, k.metal, 9, { top: 0.16 });
      for (let i = 0; i < 4; i++) {
        const a = this.rand() * Math.PI * 2;
        const r = i === 0 ? 0 : 0.25 + this.rand() * 0.25;
        this.put(new THREE.DodecahedronGeometry(0.045, 0), k.officePaper, b.x + Math.cos(a) * r, b.z + Math.sin(a) * r, fy + (i === 0 ? 0.3 : 0.04));
      }
    }
    if (o.heater) {
      const h = o.heater;
      this.box(0.5, 0.42, 0.2, h.x, h.z, fy, k.heater, h.yaw ?? 0);
      this.box(0.4, 0.26, 0.02, h.x, h.z, fy + 0.08, k.heaterGrille, h.yaw ?? 0, { oz: 0.11 });
    }
    if (o.antlers) {
      const a = o.antlers;
      this.box(0.3, 0.36, 0.04, a.x, a.z, fy + 1.85, k.wood);
      for (const s of [-1, 1]) {
        this.bar([a.x, fy + 2.0, a.z + 0.06], [a.x + s * 0.32, fy + 2.4, a.z + 0.12], 0.018, k.antler);
        this.bar([a.x + s * 0.18, fy + 2.22, a.z + 0.09], [a.x + s * 0.12, fy + 2.48, a.z + 0.12], 0.014, k.antler);
        this.bar([a.x + s * 0.28, fy + 2.34, a.z + 0.11], [a.x + s * 0.42, fy + 2.52, a.z + 0.13], 0.012, k.antler);
      }
    }
    if (o.photo) {
      const ph = o.photo;
      this.box(0.36, 0.28, 0.03, ph.x, ph.z, fy + 1.6, k.woodDark);
      this.box(0.3, 0.22, 0.01, ph.x, ph.z, fy + 1.63, k.photo, 0, { oz: 0.02 });
    }
    if (o.calendar) {
      const cl = o.calendar;
      this.box(0.34, 0.46, 0.01, cl.x, cl.z, fy + 1.3, k.officePaper, 180);
      this.box(0.34, 0.16, 0.012, cl.x, cl.z, fy + 1.6, k.calendarTop, 180);
    }
  }

  // Session 17 (Aaron: too much in Earl's office at once): the gun safe against
  // the stockroom's back wall (it faces into the room), and Earl's scanner on
  // a crate by the east wall, its aerial up.
  safeAndScanner() {
    const k = this.cfg.colors;
    const fy = this.floorY;
    const st = this.data.stockroom;
    const sf = st.safe;
    this.box(0.9, 1.5, 0.75, sf.x, sf.z, fy, k.safe);
    this.box(0.94, 0.05, 0.79, sf.x, sf.z, fy + 1.5, k.safeTrim);
    const dial = new THREE.CylinderGeometry(0.07, 0.07, 0.04, 16).rotateX(Math.PI / 2).translate(0.15, 1.0, 0.39);
    this.put(dial, k.brass, sf.x, sf.z, fy);
    this.box(0.04, 0.3, 0.05, sf.x, sf.z, fy, k.brass, 0, { ox: -0.2, oy: 0.85, oz: 0.4 });
    const sc = st.scanner;
    const on = fy + (sc.on ?? 0.79);
    this.box(0.38, 0.12, 0.26, sc.x, sc.z, on, k.radio);
    this.box(0.02, 0.35, 0.02, sc.x, sc.z, on + 0.12, k.metal, 0, { ox: 0.15, oz: -0.1 });
  }

  // ---- the stockroom -----------------------------------------------------------------------------------

  stockroom() {
    this.safeAndScanner();
    const s = this.data.stockroom;
    const k = this.cfg.colors;
    const fy = this.floorY;
    for (const b of s.boxes) {
      this.box(b.w, b.h, b.d, b.x, b.z, fy + (b.on ?? 0), k.cardboard, b.fallen ? 25 : this.rand() * 10 - 5, b.fallen ? { rotZ: 1.3 } : {});
    }
    for (const r of s.racks) {
      this.box(0.5, 2.0, r.length, r.x, r.z, fy, k.metal, r.yaw + 90);
      for (const h of [0.4, 1.0, 1.6]) this.box(0.55, 0.03, r.length, r.x, r.z, fy, k.shelfDark, r.yaw + 90, { oy: h });
    }
  }

  // ---- outside -------------------------------------------------------------------------------------------

  // The forecourt's concrete, a grid that follows the ground. Session 19:
  // mottled and oil-dark round the pumps (in its vertices), expansion
  // joints across it, cracks with weeds in them.
  forecourt() {
    const f = this.data.forecourt;
    const k = this.cfg.colors;
    const fc = this.cfg.forecourt;
    const nx = fc.cellsX;
    const nz = fc.cellsZ;
    const g = new THREE.PlaneGeometry(1, 1, nx, nz);
    const pos = g.attributes.position;
    const cols = new Float32Array(pos.count * 3);
    const base = new THREE.Color(k.concrete);
    const oil = new THREE.Color(k.stain);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      // The plane's x, y in -0.5..0.5: across and along the forecourt.
      const u = pos.getX(i) + 0.5;
      const w = pos.getY(i) + 0.5;
      const fx = f.x0 + (f.x1 - f.x0) * u;
      const fz = f.z0 + (f.z1 - f.z0) * w;
      const at = frameToWorld(this.frame, fx, fz);
      pos.setXYZ(i, at.x, this.ground.heightAt(at.x, at.z) + this.cfg.forecourtLift, at.z);
      // Oil soaked in round the islands; mottling everywhere; darker at the edges where the dirt blows on.
      let near = 0;
      for (const p of this.data.pumps) {
        const d = Math.hypot((fx - p.x) / 3.2, (fz - p.z) / 1.8);
        near = Math.max(near, 1 - Math.min(1, d));
      }
      const m = noise3(fx * 0.7, 0, fz * 0.7);
      const edge = Math.min(u, 1 - u, w, 1 - w) * Math.min(f.x1 - f.x0, f.z1 - f.z0);
      c.copy(base).lerp(oil, Math.min(1, near * fc.oil + Math.max(0, m - 0.6) * 0.8));
      c.multiplyScalar((1 + (m - 0.5) * fc.mottle) * (edge < 1.2 ? 0.7 + 0.25 * edge : 1));
      cols[i * 3] = c.r;
      cols[i * 3 + 1] = c.g;
      cols[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    g.computeVertexNormals();
    // Facing up whichever way the frame turned it.
    if (g.attributes.normal.getY(0) < 0) {
      g.index.array.reverse();
      g.computeVertexNormals();
    }
    const mesh = new THREE.Mesh(this.hold(g), this.hold(new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })));
    mesh.receiveShadow = true;
    this.group.add(mesh);
    const lift = this.cfg.forecourtLift + 0.012;
    // A strip on the concrete from a to b (frame x, z), in short runs so it follows the ground.
    const strip = (ax, az, bx, bz, width, color) => {
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 1.2));
      for (let j = 0; j < n; j++) {
        const x0 = ax + ((bx - ax) * j) / n;
        const z0 = az + ((bz - az) * j) / n;
        const x1 = ax + ((bx - ax) * (j + 1)) / n;
        const z1 = az + ((bz - az) * (j + 1)) / n;
        const yaw = (Math.atan2(x1 - x0, z1 - z0) * 180) / Math.PI;
        const len = Math.hypot(x1 - x0, z1 - z0);
        const xm = (x0 + x1) / 2;
        const zm = (z0 + z1) / 2;
        this.box(width, 0.006, len + 0.02, xm, zm, this.groundAt(xm, zm) + lift, color, -yaw);
      }
    };
    // Expansion joints.
    for (let x = f.x0 + fc.joint; x < f.x1 - 0.5; x += fc.joint) strip(x, f.z0 + 0.3, x, f.z1 - 0.3, 0.035, k.joint);
    for (let z = f.z0 + fc.joint; z < f.z1 - 0.5; z += fc.joint) strip(f.x0 + 0.3, z, f.x1 - 0.3, z, 0.035, k.joint);
    // Cracks: short wandering runs, weeds coming up along them.
    for (let i = 0; i < fc.cracks; i++) {
      let x = f.x0 + 2 + this.rand() * (f.x1 - f.x0 - 4);
      let z = f.z0 + 2 + this.rand() * (f.z1 - f.z0 - 4);
      let a = this.rand() * Math.PI * 2;
      for (let j = 0; j < 5; j++) {
        a += (this.rand() - 0.5) * 1.4;
        const nx2 = x + Math.cos(a) * (0.5 + this.rand() * 0.8);
        const nz2 = z + Math.sin(a) * (0.5 + this.rand() * 0.8);
        strip(x, z, nx2, nz2, 0.025, k.crack);
        if (this.rand() < 0.45) this.weed(nx2, nz2, this.groundAt(nx2, nz2) + lift);
        x = nx2;
        z = nz2;
      }
    }
    // Weeds along the forecourt's edges.
    for (let i = 0; i < fc.edgeWeeds; i++) {
      const t = this.rand();
      const side = Math.floor(this.rand() * 3);
      const x = side === 0 ? f.x0 + 0.3 : side === 1 ? f.x1 - 0.3 : f.x0 + t * (f.x1 - f.x0);
      const z = side === 2 ? f.z1 - 0.3 : f.z0 + t * (f.z1 - f.z0);
      this.weed(x, z, this.groundAt(x, z) + lift);
    }
    // Oil stains: a few dark flat patches.
    for (let i = 0; i < 10; i++) {
      const x = f.x0 + 2 + this.rand() * (f.x1 - f.x0 - 4);
      const z = f.z0 + 3 + this.rand() * (f.z1 - f.z0 - 4);
      this.box(0.6 + this.rand() * 1.2, 0.01, 0.4 + this.rand() * 0.8, x, z, this.groundAt(x, z) + this.cfg.forecourtLift + 0.01, k.stain, this.rand() * 180);
    }
  }

  // A tuft of weeds: three thin dark blades.
  weed(x, z, y) {
    const k = this.cfg.colors;
    for (let i = 0; i < 3; i++) {
      const h = 0.12 + this.rand() * 0.18;
      this.put(new THREE.ConeGeometry(0.03, h, 3).translate(0, h / 2, 0), k.weed, x + (this.rand() - 0.5) * 0.12, z + (this.rand() - 0.5) * 0.12, y, this.rand() * 360, { rotX: (this.rand() - 0.5) * 0.5, rotZ: (this.rand() - 0.5) * 0.5 });
    }
  }

  pumps() {
    const k = this.cfg.colors;
    const isl = this.cfg.island;
    for (const p of this.data.pumps) {
      const y = this.groundAt(p.x, p.z) + this.cfg.forecourtLift;
      this.box(isl.length, 0.22, isl.depth, p.x, p.z, y - 0.05, k.kerb);
      this.box(isl.length - 0.2, 0.04, isl.depth - 0.2, p.x, p.z, y + 0.17, k.kerbTop);
      // A rusted bin and a squeegee bucket at the island's end.
      this.box(0.4, 0.7, 0.4, p.x - isl.length / 2 + 0.25, p.z, y + 0.17, k.bin);
    }
  }

  // Each island's two pumps, whole (pumpsN) and wrecked (pumpsNWreck: blackened stumps, a scorch on the slab).
  // Session 19: a plinth, a brand band, the hose looping down to its
  // holstered nozzle; the wreck twisted, torn panels lying about, a ragged scorch.
  buildPumpUnits() {
    const k = this.cfg.colors;
    this.pumpGroups = [];
    this.data.pumps.forEach((p, i) => {
      const y = this.groundAt(p.x, p.z) + this.cfg.forecourtLift;
      for (const side of [-0.95, 0.95]) {
        const x = p.x + side;
        this.box(0.74, 0.1, 0.52, x, p.z, y + 0.17, k.plinth);
        this.box(0.62, 1.55, 0.42, x, p.z, y + 0.21, k.pump);
        this.box(0.64, 0.32, 0.44, x, p.z, y + 1.76, k.pumpTop);
        this.box(0.635, 0.1, 0.43, x, p.z, y + 1.5, k.canopyBand);
        // The faded price window and the nozzle in its holster, both faces.
        for (const face of [-1, 1]) {
          this.box(0.42, 0.24, 0.02, x, p.z, y + 1.2, k.screen, 0, { oz: face * 0.22 });
          this.box(0.3, 0.05, 0.02, x, p.z, y + 1.02, k.screen, 0, { oz: face * 0.22 });
          this.box(0.1, 0.16, 0.08, x, p.z, y + 0.82, k.metal, 0, { ox: 0.26, oz: face * 0.18 });
          this.box(0.04, 0.04, 0.2, x, p.z, y + 0.95, k.metal, 0, { ox: 0.28, oz: face * 0.24, rotX: face * 0.6 });
          // The hose: out of the pump's side high up, slack down in a loop, up into the nozzle.
          const pts = [
            new THREE.Vector3(0.31, 1.45, face * 0.08),
            new THREE.Vector3(0.42, 0.9, face * 0.14),
            new THREE.Vector3(0.4, 0.45, face * 0.2),
            new THREE.Vector3(0.3, 0.7, face * 0.22),
            new THREE.Vector3(0.27, 0.86, face * 0.2),
          ];
          this.put(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.022, 5, false), k.hose, x, p.z, y);
        }
      }
      const whole = this.ownGroup(`pumps${i}`);
      for (const side of [-0.95, 0.95]) {
        const x = p.x + side;
        this.box(0.7, 0.1, 0.5, x, p.z, y + 0.17, k.scorch);
        this.box(0.6, 0.38, 0.42, x, p.z, y + 0.21, k.scorch, side * 8, { rotZ: side * 0.14 });
        // Torn sheet standing up from the stump, curled.
        for (let j = 0; j < 3; j++) {
          const h = 0.3 + this.rand() * 0.45;
          this.box(0.24 + this.rand() * 0.2, h, 0.03, x + (this.rand() - 0.5) * 0.4, p.z + (j - 1) * 0.18, y + 0.45, k.scorch, this.rand() * 90, { rotX: (this.rand() - 0.5) * 0.9, rotZ: (this.rand() - 0.5) * 0.9 });
        }
        // A panel blown off and lying on the slab, a burnt hose stub.
        this.box(0.55, 0.03, 0.4, x + side * 0.9, p.z + 0.8, y + 0.2, k.debris, 30 + side * 40, { rotX: 0.1 });
        this.box(0.04, 0.04, 0.5, x, p.z, y + 0.5, k.hose, side * 50, { rotX: 1.1, oz: 0.2 });
        for (let j = 0; j < 4; j++) this.box(0.08 + this.rand() * 0.12, 0.03, 0.06 + this.rand() * 0.1, x + (this.rand() - 0.5) * 3, p.z + (this.rand() - 0.5) * 3, y + 0.03, k.debris, this.rand() * 180);
      }
      // The scorch: a ragged black patch on the slab.
      const sc = new THREE.CircleGeometry(1, 20);
      const sp = sc.getAttribute('position');
      for (let j = 1; j < sp.count; j++) {
        const kk = 0.7 + 0.45 * noise3(sp.getX(j) * 2 + i * 9, sp.getY(j) * 2, 0);
        sp.setXY(j, sp.getX(j) * kk, sp.getY(j) * kk);
      }
      sc.rotateX(-Math.PI / 2).scale((this.cfg.island.length + 2.6) / 2, 1, (this.cfg.island.depth + 2.8) / 2);
      this.put(sc, k.scorch, p.x, p.z, y + 0.012, 7);
      const wreck = this.ownGroup(`pumps${i}Wreck`);
      wreck.visible = false;
      this.pumpGroups.push({ whole, wreck });
    });
  }

  // Session 18 (Aaron): an island's pumps blown up (or back, on a reset).
  setPumpBlown(i, blown) {
    const g = this.pumpGroups?.[i];
    if (!g) return;
    g.whole.visible = !blown;
    g.wreck.visible = blown;
  }

  // The canopy over the pumps, sagging at one corner, on posts at the islands' ends.
  canopy() {
    const c = this.data.canopy;
    const k = this.cfg.colors;
    const isl = this.cfg.island;
    let base = -Infinity;
    for (const p of this.data.pumps) base = Math.max(base, this.groundAt(p.x, p.z));
    const top = base + c.height;
    const w = c.x1 - c.x0;
    const d = c.z1 - c.z0;
    const cx = (c.x0 + c.x1) / 2;
    const cz = (c.z0 + c.z1) / 2;
    // The sag: the whole roof tips toward one corner.
    const tipX = Math.atan2(c.sag, d);
    const tipZ = Math.atan2(c.sag * 0.6, w);
    this.box(w, 0.4, d, cx, cz, top, k.canopy, 0, { rotX: tipX, rotZ: tipZ, oy: -0.2 });
    // The fascia band round it, faded red.
    this.box(w + 0.1, 0.5, 0.08, cx, cz, top - 0.45, k.canopyBand, 0, { rotX: tipX, rotZ: tipZ, oz: d / 2 + 0.04, oy: 0 });
    this.box(w + 0.1, 0.5, 0.08, cx, cz, top - 0.45, k.canopyBand, 0, { rotX: tipX, rotZ: tipZ, oz: -d / 2 - 0.04, oy: 0 });
    // Session 19: the underside's panel seams and its dead light boxes.
    const tilt = { rotX: tipX, rotZ: tipZ };
    for (let oz = -d / 2 + 0.9; oz < d / 2 - 0.3; oz += 0.9) this.box(w - 0.1, 0.03, 0.05, cx, cz, top, k.canopyUnder, 0, { ...tilt, oy: -0.23, oz });
    for (const [ox, oz] of this.cfg.canopyLights) this.box(1.1, 0.09, 0.45, cx, cz, top, k.lightBox, 0, { ...tilt, ox, oz, oy: -0.29 });
    // The band peeled away at the low corner, hanging.
    const low = this.cfg.peel;
    this.box(1.5, 0.48, 0.05, c.x0 + low.x, c.z1 + 0.1, top - c.sag - 0.95, k.canopyBand, low.yaw, { rotZ: low.tilt });
    for (const p of this.data.pumps) {
      for (const side of [-1, 1]) {
        const x = p.x + side * (isl.length / 2 + 0.25);
        const y = this.groundAt(x, p.z) + this.cfg.forecourtLift;
        this.box(0.25, top - y - 0.25, 0.25, x, p.z, y, k.post);
        this.box(0.34, 0.3, 0.34, x, p.z, y, k.kerb); // its footing
      }
    }
  }

  // The tall pole sign by the road: HOME OF BIGFOOT, faced along the road both ways.
  sign() {
    const s = this.data.sign;
    const k = this.cfg.colors;
    const y = this.groundAt(s.x, s.z);
    this.box(0.3, s.height, 0.3, s.x, s.z, y, k.post);
    const bw = this.cfg.sign.width;
    const bh = this.cfg.sign.height;
    // The board's frame, tipped a little where a bolt's gone.
    this.box(bw + 0.2, bh + 0.2, 0.15, s.x, s.z, y + s.height - 0.1, k.signFrame, 90, { rotZ: 0.04 });
    const tex = signTexture(this.cfg);
    for (const side of [1, -1]) {
      this.board(tex, bw, bh, s.x + side * 0.09, s.z, y + s.height + bh / 2, side > 0 ? 90 : -90, { tiltX: 0 }).rotation.z = 0.04 * side;
    }
  }

  dumpster() {
    const d = this.data.dumpster;
    const k = this.cfg.colors;
    const y = this.groundAt(d.x, d.z);
    this.box(1.9, 1.15, 1.2, d.x, d.z, y, k.dumpster, d.yaw);
    this.box(1.95, 0.06, 0.7, d.x, d.z, y + 1.25, k.dumpster, d.yaw, { oz: -0.25, rotX: -0.35 });
    // A couple of split rubbish bags beside it.
    this.box(0.6, 0.45, 0.5, d.x + 1.4, d.z + 0.2, y, k.bag, 20);
    this.box(0.5, 0.4, 0.5, d.x + 1.2, d.z + 0.9, y, k.bag, -30);
  }

  // Session 19: what stands about the store (data: gasStation.json dressing).
  dressing() {
    const dr = this.data.dressing;
    if (!dr) return;
    const k = this.cfg.colors;
    const fy = this.floorY;
    if (dr.iceChest) {
      const a = dr.iceChest;
      const y = this.groundAt(a.x, a.z);
      this.box(1.2, 0.95, 0.7, a.x, a.z, y, k.iceChest, a.yaw ?? 0);
      this.box(1.24, 0.08, 0.74, a.x, a.z, y + 0.95, k.iceLid, a.yaw ?? 0);
      this.box(0.9, 0.22, 0.02, a.x, a.z, y + 0.55, k.iceLabel, a.yaw ?? 0, { oz: 0.36 });
      this.box(0.3, 0.05, 0.05, a.x, a.z, y + 0.85, k.metal, a.yaw ?? 0, { oz: 0.38 });
    }
    if (dr.oilRack) {
      const a = dr.oilRack;
      const y = Math.max(this.groundAt(a.x, a.z), fy - 0.3);
      for (const sx of [-0.33, 0.33]) this.box(0.03, 1.1, 0.03, a.x, a.z, y, k.metal, a.yaw ?? 0, { ox: sx });
      for (const h of [0.15, 0.55, 0.95]) {
        this.box(0.7, 0.03, 0.32, a.x, a.z, y + h, k.metal, a.yaw ?? 0);
        for (let i = 0; i < 4; i++) {
          if (this.rand() < 0.3) continue;
          const can = k.oilCans[Math.floor(this.rand() * k.oilCans.length)];
          this.box(0.12, 0.22, 0.08, a.x, a.z, y + h + 0.03, can, a.yaw ?? 0, { ox: -0.24 + i * 0.16 });
        }
      }
    }
    if (dr.propane) {
      const a = dr.propane;
      const y = this.groundAt(a.x, a.z);
      const cw = 0.8;
      const cd = 1.3;
      const ch = 1.45;
      // Four tanks inside a mesh cage.
      for (let i = 0; i < 4; i++) this.cyl(0.15, 0.6, a.x + (i % 2 ? 0.18 : -0.18), a.z + (i < 2 ? -0.3 : 0.3), y + 0.05 + (i === 3 ? 0.62 : 0), k.propane, 10);
      for (const sx of [-cw / 2, cw / 2]) {
        for (const sz of [-cd / 2, cd / 2]) this.box(0.04, ch, 0.04, a.x + sx, a.z + sz, y, k.propaneCage);
      }
      for (const h of [0.05, ch / 2, ch - 0.04]) {
        this.box(cw, 0.03, 0.03, a.x, a.z - cd / 2, y + h, k.propaneCage);
        this.box(cw, 0.03, 0.03, a.x, a.z + cd / 2, y + h, k.propaneCage);
        this.box(0.03, 0.03, cd, a.x - cw / 2, a.z, y + h, k.propaneCage);
        this.box(0.03, 0.03, cd, a.x + cw / 2, a.z, y + h, k.propaneCage);
      }
      for (let i = 1; i < 6; i++) this.box(0.015, ch, 0.015, a.x - cw / 2, a.z - cd / 2 + (i * cd) / 6, y, k.propaneCage);
      this.box(cw + 0.06, 0.04, cd + 0.06, a.x, a.z, y + ch, k.propaneCage);
    }
    if (dr.airPump) {
      const a = dr.airPump;
      const y = this.groundAt(a.x, a.z);
      this.box(0.36, 0.1, 0.36, a.x, a.z, y, k.kerb);
      this.box(0.28, 1.15, 0.22, a.x, a.z, y + 0.1, k.airPump, a.yaw ?? 0);
      this.box(0.24, 0.16, 0.02, a.x, a.z, y + 0.95, k.screen, a.yaw ?? 0, { oz: 0.12 });
      this.put(new THREE.TorusGeometry(0.16, 0.018, 4, 10).translate(0.18, 0.55, 0), k.hose, a.x, a.z, y, (a.yaw ?? 0) + 90);
    }
    if (dr.tyres) {
      const a = dr.tyres;
      const y = this.groundAt(a.x, a.z);
      for (let i = 0; i < a.count; i++) {
        const g = new THREE.TorusGeometry(0.32, 0.12, 5, 10).rotateX(Math.PI / 2);
        this.put(g, k.tyre, a.x + (this.rand() - 0.5) * 0.08, a.z + (this.rand() - 0.5) * 0.08, y + 0.12 + i * 0.23, this.rand() * 90, { rotX: (this.rand() - 0.5) * 0.08 });
      }
      const g = new THREE.TorusGeometry(0.32, 0.12, 5, 10);
      this.put(g, k.tyre, a.x + 0.8, a.z + 0.3, y + 0.42, 30, { rotZ: 0.25 }); // one leaning on the stack
    }
    if (dr.pallet) {
      const a = dr.pallet;
      const y = this.groundAt(a.x, a.z);
      for (let i = 0; i < 5; i++) this.box(1.1, 0.1, 0.02, a.x, a.z, y + 0.08 + i * 0.25, k.pallet, a.yaw ?? 0, { rotX: -0.18, oz: 0.02 + i * 0.045 });
      for (const sx of [-0.45, 0, 0.45]) this.box(0.08, 1.2, 0.09, a.x, a.z, y, k.pallet, a.yaw ?? 0, { ox: sx, rotX: -0.18, oz: 0.1 });
    }
  }

  update() {}

  // Session 18 (Aaron): Earl's note leaves the desk once Tom's taken it.
  setNoteTaken(taken) {
    if (this.note) this.note.visible = !taken;
  }

  // The back door: 0 shut .. 1 swung out (about 100 degrees).
  setBackDoor(amount) {
    if (this.backDoorMesh) this.backDoorMesh.rotation.y = this.frame.yaw - amount * 1.75;
  }

  dispose() {
    this.group?.removeFromParent();
    for (const x of this.keep) x.dispose?.();
  }
}

// ---- the boards' pictures (canvas) ---------------------------------------------------------------

// HOME OF BIGFOOT: faded paint on a weathered board, a striding silhouette.
function signTexture(cfg) {
  const { canvas, ctx } = makeCanvas(512, 320);
  ctx.fillStyle = '#4a3c26';
  ctx.fillRect(0, 0, 512, 320);
  // Weathering: streaks and blotches.
  for (let i = 0; i < 140; i++) {
    ctx.fillStyle = `rgba(${20 + ((i * 37) % 40)},${16 + ((i * 23) % 30)},10,${0.08 + ((i * 7) % 10) / 60})`;
    ctx.fillRect((i * 97) % 512, (i * 53) % 320, 4 + ((i * 13) % 40), 2 + ((i * 11) % 30));
  }
  ctx.fillStyle = '#b8a070';
  ctx.font = 'bold 54px serif';
  ctx.textAlign = 'center';
  ctx.fillText('HOME OF', 320, 92);
  ctx.font = 'bold 76px serif';
  ctx.fillText('BIGFOOT', 320, 172);
  ctx.font = 'bold 34px serif';
  ctx.fillStyle = '#9a8458';
  ctx.fillText('GAS · GIFTS · BAIT', 320, 230);
  ctx.font = '26px serif';
  ctx.fillText('PRUITT & SONS  EST. 1971', 320, 280);
  // The striding figure on the left: dark, hunched, one arm swinging.
  ctx.fillStyle = '#1e1810';
  ctx.beginPath();
  ctx.ellipse(86, 90, 20, 22, 0, 0, Math.PI * 2); // head
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(60, 110);
  ctx.quadraticCurveTo(52, 170, 66, 200); // back
  ctx.lineTo(56, 280); // back leg
  ctx.lineTo(76, 282);
  ctx.lineTo(90, 210);
  ctx.lineTo(112, 280); // front leg
  ctx.lineTo(132, 276);
  ctx.lineTo(114, 196);
  ctx.quadraticCurveTo(126, 150, 112, 110);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath(); // the swinging arm
  ctx.moveTo(110, 120);
  ctx.lineTo(150, 196);
  ctx.lineTo(140, 202);
  ctx.lineTo(100, 140);
  ctx.closePath();
  ctx.fill();
  // Rust bleeding from the bolts.
  ctx.fillStyle = 'rgba(90,40,16,0.5)';
  for (const [x, y] of [[14, 14], [498, 14], [14, 306], [498, 306]]) ctx.fillRect(x - 4, y - 4, 8, 30);
  const t = toTexture(canvas);
  t.anisotropy = 4;
  return t;
}

// The fascia over the door: GAS · GIFTS · BAIT, the letters half gone.
function fasciaTexture() {
  const { canvas, ctx } = makeCanvas(512, 64);
  ctx.fillStyle = '#3a3630';
  ctx.fillRect(0, 0, 512, 64);
  ctx.fillStyle = '#8a7a58';
  ctx.font = 'bold 40px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GAS  ·  GIFTS  ·  BAIT', 256, 47);
  // Missing letters: patches of bare board.
  ctx.fillStyle = '#3a3630';
  ctx.fillRect(312, 10, 22, 44);
  ctx.fillRect(96, 30, 16, 26);
  return toTexture(canvas);
}

// The board of blurry sighting photos: cork, pinned prints, captions.
function photoBoardTexture() {
  const { canvas, ctx } = makeCanvas(384, 224);
  ctx.fillStyle = '#5a4428';
  ctx.fillRect(0, 0, 384, 224);
  const captions = ['RIDGE RD 1987', 'CREEK, MAY 94', 'BEHIND THE STORE', 'EARL SAW IT', 'TRACKS 16 IN', '?'];
  for (let i = 0; i < 6; i++) {
    const x = 16 + (i % 3) * 122;
    const y = 14 + Math.floor(i / 3) * 104;
    ctx.save();
    ctx.translate(x + 50, y + 40);
    ctx.rotate(((i * 37) % 11 - 5) / 60);
    ctx.fillStyle = '#c8c0a8';
    ctx.fillRect(-52, -40, 104, 86);
    // The photo: dark woods, a darker smudge somewhere in it.
    ctx.fillStyle = '#2a3022';
    ctx.fillRect(-46, -34, 92, 60);
    ctx.fillStyle = 'rgba(10,8,6,0.85)';
    ctx.beginPath();
    ctx.ellipse(-20 + ((i * 29) % 40), -8, 6, 14, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a3428';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(captions[i], 0, 40);
    ctx.fillStyle = '#7a2a1a';
    ctx.beginPath();
    ctx.arc(0, -38, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  return toTexture(canvas);
}

// Earl's note on the desk: a torn sheet, a few lines of pencil (the words are pass 2's).
function noteTexture() {
  const { canvas, ctx } = makeCanvas(96, 128);
  ctx.fillStyle = '#9a9278';
  ctx.fillRect(0, 0, 96, 128);
  ctx.strokeStyle = 'rgba(40,36,30,0.8)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.moveTo(10, 18 + i * 14);
    for (let x = 10; x < 86 - (i === 6 ? 40 : 0); x += 6) ctx.lineTo(x, 18 + i * 14 + Math.sin(x * 0.7 + i) * 1.5);
    ctx.stroke();
  }
  return toTexture(canvas);
}
