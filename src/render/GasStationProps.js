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
// Played straight: faded, dusty, sad. Dull, dark colours (the torch-glare
// rule). Static parts merged by colour; the textured boards (signs, the
// photos, the note) are a few meshes of their own.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { frameToWorld } from '../world/clearingFrame.js';
import { makeCanvas, toTexture } from './proceduralTextures.js';

export class GasStationProps {
  // cfg: config.gasStation.look. data: data/gasStation.json.
  constructor(cfg, data) {
    this.cfg = cfg;
    this.data = data;
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
    this.office();
    this.stockroom();
    this.forecourt();
    this.pumps();
    this.canopy();
    this.sign();
    this.dumpster();
    for (const [color, geos] of this.parts) {
      const geo = this.hold(mergeGeometries(geos));
      for (const g of geos) g.dispose();
      const mesh = new THREE.Mesh(geo, this.hold(new THREE.MeshLambertMaterial({ color })));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      this.group.add(mesh);
    }
    this.parts.clear();
    scene.add(this.group);
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
    g.deleteAttribute('uv');
    const w = frameToWorld(this.frame, x, z);
    const m = new THREE.Matrix4().compose(new THREE.Vector3(w.x, y, w.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rotX, this.rotY(yawDeg), rotZ, 'YXZ')), new THREE.Vector3(1, 1, 1));
    g.applyMatrix4(m);
    if (!this.parts.has(color)) this.parts.set(color, []);
    this.parts.get(color).push(g);
  }

  // A box: w across (local x), h up from its base, d along (local z).
  box(w, h, d, x, z, y, color, yawDeg = 0, opts = {}) {
    const g = new THREE.BoxGeometry(w, h, d).translate(opts.ox ?? 0, h / 2 + (opts.oy ?? 0), opts.oz ?? 0);
    this.put(g, color, x, z, y, yawDeg, opts);
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
    // A rack of dusty postcards and a jar of keyrings on the counter.
    this.box(0.25, 0.4, 0.25, c.x - 1.2, c.z, fy + c.height + 0.05, k.wood);
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
    if (sh.fallen) {
      // Its goods spilled across the floor beside it.
      for (let i = 0; i < 16; i++) this.box(0.18, 0.1, 0.12, sh.x + (this.rand() - 0.5) * L, sh.z + 0.5 + this.rand() * 1.2, fy + 0.02, this.goodsColor(), this.rand() * 360);
      return;
    }
    // Goods: rows of small boxes on each shelf, both faces, with gaps (looted).
    for (const h of [0.15, 0.58, 1.08]) {
      for (const side of [-0.17, 0.17]) {
        for (let zz = -L / 2 + 0.2; zz < L / 2 - 0.15; zz += 0.24) {
          if (this.rand() < 0.45) continue;
          const gh = 0.14 + this.rand() * 0.18;
          this.box(0.2, gh, 0.18, sh.x, sh.z, fy, this.goodsColor(), yawDeg, { ox: side, oy: h, oz: zz });
        }
      }
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
    // Earl's note on the desk. (Session 17, Aaron: the safe and the scanner are in the stockroom now: the note has the office to itself.)
    this.note = this.board(noteTexture(this.cfg), 0.22, 0.29, o.note.x, o.note.z, fy + 0.795, 10, { tiltX: -Math.PI / 2 });
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

  // The forecourt's concrete, a grid that follows the ground.
  forecourt() {
    const f = this.data.forecourt;
    const k = this.cfg.colors;
    const nx = 26;
    const nz = 14;
    const g = new THREE.PlaneGeometry(1, 1, nx, nz);
    const pos = g.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      // The plane's x, y in -0.5..0.5: across and along the forecourt.
      const u = pos.getX(i) + 0.5;
      const w = pos.getY(i) + 0.5;
      const fx = f.x0 + (f.x1 - f.x0) * u;
      const fz = f.z0 + (f.z1 - f.z0) * w;
      const at = frameToWorld(this.frame, fx, fz);
      v.set(at.x, this.ground.heightAt(at.x, at.z) + this.cfg.forecourtLift, at.z);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    // Facing up whichever way the frame turned it.
    if (g.attributes.normal.getY(0) < 0) {
      g.index.array.reverse();
      g.computeVertexNormals();
    }
    const mesh = new THREE.Mesh(this.hold(g), this.hold(new THREE.MeshLambertMaterial({ color: k.concrete, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })));
    mesh.receiveShadow = true;
    this.group.add(mesh);
    // Oil stains and cracks: a few dark flat patches.
    for (let i = 0; i < 10; i++) {
      const x = f.x0 + 2 + this.rand() * (f.x1 - f.x0 - 4);
      const z = f.z0 + 3 + this.rand() * (f.z1 - f.z0 - 4);
      this.box(0.6 + this.rand() * 1.2, 0.01, 0.4 + this.rand() * 0.8, x, z, this.groundAt(x, z) + this.cfg.forecourtLift + 0.01, k.stain, this.rand() * 180);
    }
  }

  pumps() {
    const k = this.cfg.colors;
    const isl = this.cfg.island;
    for (const p of this.data.pumps) {
      const y = this.groundAt(p.x, p.z) + this.cfg.forecourtLift;
      this.box(isl.length, 0.22, isl.depth, p.x, p.z, y - 0.05, k.kerb);
      this.box(isl.length - 0.2, 0.04, isl.depth - 0.2, p.x, p.z, y + 0.17, k.kerbTop);
      for (const side of [-0.95, 0.95]) {
        const x = p.x + side;
        this.box(0.62, 1.55, 0.42, x, p.z, y + 0.21, k.pump);
        this.box(0.64, 0.32, 0.44, x, p.z, y + 1.76, k.pumpTop);
        // The faded price window and the nozzle on its hook, both sides.
        for (const face of [-1, 1]) {
          this.box(0.42, 0.24, 0.02, x, p.z, y + 1.25, k.screen, 0, { oz: face * 0.22 });
          this.box(0.08, 0.22, 0.1, x, p.z, y + 0.85, k.metal, 0, { ox: 0.22, oz: face * 0.24 });
        }
        // The hose, slack to the ground.
        this.box(0.04, 0.04, 0.9, x, p.z, y + 0.4, k.hose, 0, { ox: 0.24, oz: 0.5, rotX: 0.7 });
      }
      // A rusted bin and a squeegee bucket at the island's end.
      this.box(0.4, 0.7, 0.4, p.x - isl.length / 2 + 0.25, p.z, y + 0.17, k.bin);
    }
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
    for (const p of this.data.pumps) {
      for (const side of [-1, 1]) {
        const x = p.x + side * (isl.length / 2 + 0.25);
        const y = this.groundAt(x, p.z) + this.cfg.forecourtLift;
        this.box(0.25, top - y - 0.25, 0.25, x, p.z, y, k.post);
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

  update() {}

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
