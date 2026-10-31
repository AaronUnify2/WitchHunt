// The Pruitts' storm shelter, drawn (Session 16; DESIGN.md "Storm
// shelter"; data/stormShelter.json, in the shelter's frame: walking in
// from home, x right, z ahead). Aaron: Earl dug it himself, so it's small
// and a bit shabby.
//  - Up top: a low earth mound in the middle of the clearing with a
//    timber collar and a rusted steel hatch on it (the hinge on the far
//    side, a hasp and its padlock hanging open), half buried under leaf
//    litter and earth until Tom digs it clear; a stovepipe vent poking out
//    of the ground; what the family dropped running for it (a lantern on
//    its side, a duffel bag, a jerrycan). Earl's keys glint where he falls.
//  - Open, the hatch swings back and shows a black square and the top of
//    a ladder.
//  - Below (the room is under the hatch, Tom's platform while he's down
//    there): a plank floor and plank walls held up by rough posts, a low
//    joisted ceiling with the shaft up to the hatch, the ladder, a bunk
//    bed made up, a folded cot, shelves of tins and water jugs, a small
//    table (the diary, a board game, a colouring book, a lamp) and a stool,
//    a TV and VCR on the shelves with a box of tapes, a corkboard of trail-
//    cam photos, a stuffed toy on the bunk.
// Dull, dark colours (the torch-glare rule). Static parts merged by
// colour; the moving and vanishing parts (the hatch door, the earth on
// it, the black hole, the keys, the diary, the tapes) are their own.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { frameToWorld } from '../world/clearingFrame.js';
import { makeCanvas, toTexture } from './proceduralTextures.js';

export class StormShelterProps {
  // cfg: config.stormShelter.look. data: data/stormShelter.json.
  constructor(cfg, data) {
    this.cfg = cfg;
    this.data = data;
    this.keep = [];
    this.parts = new Map(); // colour -> [geometries in world space]
  }

  // frame: the shelter's. ground: heightAt(x, z). hatchY: the hatch's
  // ground. floorY: the room's floor.
  init(scene, frame, ground, hatchY, floorY) {
    this.frame = frame;
    this.ground = ground;
    this.hatchY = hatchY;
    this.floorY = floorY;
    this.group = new THREE.Group();
    this.group.name = 'stormShelter';
    this.seed = 7;
    this.mound();
    this.collar();
    this.vent();
    this.litter();
    this.room();
    this.flush(this.group);
    this.buildDoor();
    this.buildSoil();
    this.buildHole();
    this.buildKeys();
    this.buildFinds();
    this.buildCorkboard();
    scene.add(this.group);
    this.setHatch('buried', 0);
  }

  // The parts so far, merged by colour into `into`.
  flush(into) {
    for (const [color, geos] of this.parts) {
      const geo = this.hold(mergeGeometries(geos));
      for (const g of geos) g.dispose();
      const mesh = new THREE.Mesh(geo, this.hold(new THREE.MeshLambertMaterial({ color })));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      into.add(mesh);
    }
    this.parts.clear();
  }

  hold(x) {
    this.keep.push(x);
    return x;
  }

  rand() {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  // ---- placing (as GasStationProps) ---------------------------------------------------------------

  rotY(yawDeg = 0) {
    return this.frame.yaw - (yawDeg * Math.PI) / 180;
  }

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

  box(w, h, d, x, z, y, color, yawDeg = 0, opts = {}) {
    const g = new THREE.BoxGeometry(w, h, d).translate(opts.ox ?? 0, h / 2 + (opts.oy ?? 0), opts.oz ?? 0);
    this.put(g, color, x, z, y, yawDeg, opts);
  }

  cyl(r, h, x, z, y, color, seg = 8, opts = {}) {
    this.put(new THREE.CylinderGeometry(opts.top ?? r, r, h, seg).translate(0, h / 2, 0), color, x, z, y, 0, opts);
  }

  groundAt(x, z) {
    const w = frameToWorld(this.frame, x, z);
    return this.ground.heightAt(w.x, w.z);
  }

  // Room-local (x across, z along from the room's centre) to the frame.
  rx(x) {
    return this.data.room.x + x;
  }

  rz(z) {
    return this.data.room.z + z;
  }

  // A mesh of its own (from the parts added since the last flush), placed in a group at frame (x, z), y.
  own(name) {
    const g = new THREE.Group();
    g.name = name;
    this.flush(g);
    this.group.add(g);
    return g;
  }

  // ---- up top ---------------------------------------------------------------------------------------

  mound() {
    const h = this.data.hatch;
    const k = this.cfg.colors;
    const y = this.hatchY;
    // A low, wide earth mound, lumpy, sunk into the ground round it.
    this.cyl(h.mound, 0.55, h.x, h.z, y - 0.3, k.earth, 14, { top: h.mound * 0.55 });
    for (let i = 0; i < 7; i++) {
      const a = this.rand() * Math.PI * 2;
      const r = h.mound * (0.55 + this.rand() * 0.4);
      const s = 0.35 + this.rand() * 0.3;
      this.put(new THREE.SphereGeometry(s, 7, 5).scale(1.4, 0.35, 1.1), this.rand() < 0.5 ? k.earth : k.leaves, h.x + Math.cos(a) * r, h.z + Math.sin(a) * r, y + 0.02, a * 57);
    }
  }

  // The timber collar the hatch sits in: four rough beams, one sagging.
  collar() {
    const h = this.data.hatch;
    const k = this.cfg.colors;
    const y = this.hatchY + 0.2;
    const t = 0.16;
    this.box(h.w + t * 2, 0.16, t, h.x, h.z - h.d / 2 - t / 2, y, k.timber);
    this.box(h.w + t * 2, 0.16, t, h.x, h.z + h.d / 2 + t / 2, y - 0.03, k.timber, 0, { rotZ: 0.03 });
    this.box(t, 0.16, h.d, h.x - h.w / 2 - t / 2, h.z, y, k.timberDark);
    this.box(t, 0.16, h.d, h.x + h.w / 2 + t / 2, h.z, y, k.timber);
    // A few nails' worth of rust streaks: a strip of tin along the near beam.
    this.box(h.w * 0.7, 0.02, 0.1, h.x - 0.1, h.z - h.d / 2 - t / 2, y + 0.16, k.rust);
  }

  vent() {
    const v = this.data.vent;
    const k = this.cfg.colors;
    const y = this.groundAt(v.x, v.z);
    this.cyl(0.07, 0.75, v.x, v.z, y - 0.1, k.metal, 8);
    this.cyl(0.16, 0.12, v.x, v.z, y + 0.67, k.rust, 8, { top: 0.02 }); // the rain cap
  }

  litter() {
    const k = this.cfg.colors;
    for (const it of this.data.litter) {
      const y = this.groundAt(it.x, it.z);
      if (it.kind === 'lantern') {
        // On its side: a can body and a wire bail.
        this.put(new THREE.CylinderGeometry(0.09, 0.1, 0.28, 8).rotateZ(Math.PI / 2).translate(0, 0.1, 0), k.lantern, it.x, it.z, y, it.yaw);
        this.box(0.03, 0.03, 0.22, it.x, it.z, y + 0.18, k.metal, it.yaw);
      } else if (it.kind === 'duffel') {
        this.put(new THREE.CylinderGeometry(0.2, 0.2, 0.75, 9).rotateZ(Math.PI / 2).scale(1, 0.75, 1).translate(0, 0.15, 0), k.duffel, it.x, it.z, y, it.yaw);
        this.box(0.6, 0.03, 0.05, it.x, it.z, y + 0.3, k.strap, it.yaw);
      } else if (it.kind === 'jerrycan') {
        this.box(0.17, 0.44, 0.34, it.x, it.z, y, k.jerrycan, it.yaw, { rotZ: 1.4 });
      }
    }
  }

  // ---- the hatch: its door, the earth on it, the hole -------------------------------------------------

  // The door pivots on its far edge (the hinge): open swings it up and back.
  buildDoor() {
    const h = this.data.hatch;
    const k = this.cfg.colors;
    // Built round the hinge (frame origin, door lying toward -z), then moved there as a group.
    const keepFrame = this.frame;
    this.frame = { x: 0, z: 0, rx: 1, rz: 0, fx: 0, fz: 1, yaw: 0 };
    this.box(h.w, 0.05, h.d, 0, -h.d / 2, 0, k.hatch);
    for (let i = -2; i <= 2; i++) this.box(0.05, 0.03, h.d * 0.96, i * (h.w / 5), -h.d / 2, 0.05, k.hatchRib); // corrugations
    this.box(0.36, 0.04, 0.05, 0, -h.d + 0.12, 0.06, k.metal); // the handle
    this.box(0.08, 0.02, 0.16, 0.32, -h.d + 0.04, 0.05, k.metal); // the hasp
    this.box(0.07, 0.09, 0.03, 0.32, -h.d - 0.05, -0.02, k.brass); // the padlock, hanging open
    this.frame = keepFrame;
    this.door = this.own('hatch door');
    const w = frameToWorld(this.frame, h.x, h.z + h.d / 2);
    this.door.position.set(w.x, this.hatchY + 0.36, w.z);
    this.door.rotation.set(0, this.frame.yaw, 0, 'YXZ');
    // The pivot's tilt is about its local x (the hinge line).
    this.door.rotation.order = 'YXZ';
  }

  // Leaf litter and earth heaped over the near half of the hatch (dug clear by Tom).
  buildSoil() {
    const h = this.data.hatch;
    const k = this.cfg.colors;
    const y = this.hatchY + 0.3;
    for (let i = 0; i < 6; i++) {
      const x = h.x + (this.rand() - 0.5) * h.w * 1.1;
      const z = h.z - h.d * 0.15 - this.rand() * h.d * 0.45;
      const s = 0.3 + this.rand() * 0.22;
      this.put(new THREE.SphereGeometry(s, 7, 5).scale(1.3, 0.45, 1), i % 2 ? k.leaves : k.earth, x, z, y, this.rand() * 90);
    }
    this.soil = this.own('hatch soil');
  }

  buildHole() {
    const h = this.data.hatch;
    const k = this.cfg.colors;
    this.box(h.w, 0.02, h.d, h.x, h.z, this.hatchY + 0.33, k.void);
    // The ladder's rails, just showing in the hole.
    for (const s of [-1, 1]) this.box(0.05, 0.4, 0.05, h.x + s * 0.22, h.z - h.d / 2 + 0.2, this.hatchY + 0.05, k.timber);
    this.hole = this.own('hatch hole');
  }

  // state: 'buried' | 'clear' | 'open'. open: 0 shut .. 1 thrown back.
  setHatch(state, open = state === 'open' ? 1 : 0) {
    if (this.soil) this.soil.visible = state === 'buried';
    if (this.hole) this.hole.visible = open > 0.05;
    if (this.door) this.door.rotation.x = open * 2.55; // up and over, back onto the mound
  }

  // ---- Earl's keys ------------------------------------------------------------------------------------

  buildKeys() {
    const k = this.cfg.colors;
    const keepFrame = this.frame;
    this.frame = { x: 0, z: 0, rx: 1, rz: 0, fx: 0, fz: 1, yaw: 0 };
    this.box(0.07, 0.01, 0.04, 0, 0, 0.01, k.brass); // the brass tag
    this.cyl(0.035, 0.008, 0.06, 0.03, 0.01, k.metal, 8); // the ring
    this.box(0.012, 0.006, 0.06, 0.09, 0.04, 0.012, k.metal, 30); // a key
    this.box(0.012, 0.006, 0.055, 0.08, 0.07, 0.012, k.metal, -20);
    this.frame = keepFrame;
    this.keys = this.own('earl keys');
    // A glint so they can be found in the leaves.
    const glint = new THREE.Mesh(this.hold(new THREE.SphereGeometry(0.04, 6, 4)), this.hold(new THREE.MeshBasicMaterial({ color: k.glint, transparent: true, opacity: 0.7 })));
    glint.position.set(0, 0.05, 0);
    this.keys.add(glint);
    this.keyGlint = glint;
    this.keys.visible = false;
  }

  // Where Earl fell (world x, z), or null to hide them.
  setKeys(at) {
    if (!this.keys) return;
    this.keys.visible = Boolean(at);
    if (at) this.keys.position.set(at.x, this.ground.heightAt(at.x, at.z) + 0.02, at.z);
  }

  // ---- the room below ---------------------------------------------------------------------------------

  room() {
    const r = this.data.room;
    const k = this.cfg.colors;
    const f = this.floorY;
    const H = r.height;
    const hx = r.hx;
    const hz = r.hz;
    const t = 0.14;
    // Floor: rough planks over earth.
    this.box(hx * 2 + 0.4, 0.3, hz * 2 + 0.4, this.rx(0), this.rz(0), f - 0.3, k.earthDark);
    for (let i = 0; i < 7; i++) {
      const z = -hz + (i + 0.5) * ((hz * 2) / 7);
      this.box(hx * 2, 0.03, (hz * 2) / 7 - 0.03, this.rx(0), this.rz(z), f - 0.03, i % 3 === 1 ? k.plankDark : k.plank);
    }
    // Walls: planks on the earth, rough posts at the corners and between.
    this.box(hx * 2 + t * 2, H, t, this.rx(0), this.rz(-hz - t / 2), f, k.plank);
    this.box(hx * 2 + t * 2, H, t, this.rx(0), this.rz(hz + t / 2), f, k.plankDark);
    this.box(t, H, hz * 2, this.rx(-hx - t / 2), this.rz(0), f, k.plank);
    this.box(t, H, hz * 2, this.rx(hx + t / 2), this.rz(0), f, k.plankDark);
    for (const x of [-hx + 0.06, 0, hx - 0.06]) for (const z of [-hz + 0.06, hz - 0.06]) this.box(0.12, H, 0.12, this.rx(x), this.rz(z), f, k.timberDark);
    // A seam of earth showing where a plank's slipped.
    this.box(0.5, 0.08, 0.02, this.rx(-0.6), this.rz(hz - 0.01), f + 1.2, k.earth);
    // Ceiling: boards on three joists, with the shaft up to the hatch.
    const lad = r.ladder;
    const sx = 0.5; // the shaft's half size
    const top = f + H;
    // The ceiling in pieces round the shaft (it's under the hatch, at the ladder end).
    const zs = this.rz(lad.z);
    const z0 = this.rz(-hz) - t;
    const z1 = this.rz(hz) + t;
    const x0 = this.rx(-hx) - t;
    const x1 = this.rx(hx) + t;
    const slab = (ax, bx, az, bz) => this.box(bx - ax, 0.12, bz - az, (ax + bx) / 2, (az + bz) / 2, top, k.ceiling);
    slab(x0, x1, zs + sx, z1); // beyond the shaft
    slab(x0, this.rx(lad.x) - sx, z0, zs + sx); // left of it
    slab(this.rx(lad.x) + sx, x1, z0, zs + sx); // right of it
    for (const z of [-0.2, 0.55]) this.box(hx * 2, 0.14, 0.12, this.rx(0), this.rz(z), top - 0.14, k.timberDark);
    // The shaft up to the hatch: plank sides from the ceiling to the ground.
    const shaftH = this.hatchY + 0.3 - top;
    const hx2 = this.data.hatch.w / 2;
    const hz2 = this.data.hatch.d / 2;
    const hc = this.data.hatch;
    this.box(hx2 * 2 + 0.2, shaftH, 0.08, hc.x, hc.z - hz2 - 0.04, top, k.plank);
    this.box(hx2 * 2 + 0.2, shaftH, 0.08, hc.x, hc.z + hz2 + 0.04, top, k.plankDark);
    this.box(0.08, shaftH, hz2 * 2, hc.x - hx2 - 0.04, hc.z, top, k.plankDark);
    this.box(0.08, shaftH, hz2 * 2, hc.x + hx2 + 0.04, hc.z, top, k.plank);
    // The ladder, floor to hatch.
    const ly = this.hatchY + 0.3 - f;
    for (const s of [-1, 1]) this.box(0.05, ly, 0.06, this.rx(lad.x + s * 0.22), this.rz(lad.z), f, k.timber);
    for (let y = 0.3; y < ly - 0.1; y += 0.3) this.box(0.44, 0.04, 0.05, this.rx(lad.x), this.rz(lad.z), f + y, k.timber);
    this.bunk();
    this.shelves();
    this.table();
    this.extras();
  }

  // A two-tier bunk, made up.
  bunk() {
    const b = this.data.room.bunk;
    const k = this.cfg.colors;
    const f = this.floorY;
    const x = this.rx(b.x);
    const z = this.rz(b.z);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) this.box(0.06, 1.65, 0.06, x + (sx * b.width) / 2, z + (sz * b.length) / 2, f, k.timber);
    for (const y of [0.32, 1.12]) {
      this.box(b.width, 0.06, b.length, x, z, f + y, k.timberDark); // the boards
      this.box(b.width - 0.08, 0.1, b.length - 0.08, x, z, f + y + 0.06, k.mattress);
      this.box(b.width - 0.06, 0.03, b.length * 0.62, x, z + b.length * 0.17, f + y + 0.16, y < 1 ? k.blanketA : k.blanketB);
      this.box(b.width * 0.55, 0.08, 0.26, x, z - b.length / 2 + 0.2, f + y + 0.16, k.pillow);
    }
  }

  shelves() {
    const s = this.data.room.shelves;
    const k = this.cfg.colors;
    const f = this.floorY;
    const x = this.rx(s.x);
    const z = this.rz(s.z);
    for (const sz of [-1, 0, 1]) this.box(s.depth, 1.9, 0.05, x, z + (sz * s.length) / 2, f, k.timber);
    for (const y of s.levels) {
      this.box(s.depth, 0.03, s.length, x, z, f + y, k.plank);
      // Tins in rows (a label colour each run), water jugs at the ends.
      if (y > 1.6) continue;
      const n = 7;
      for (let i = 0; i < n; i++) {
        if (this.rand() < 0.22) continue;
        const zz = z - s.length / 2 + 0.2 + i * ((s.length - 0.4) / (n - 1));
        if (y > 1.3 && zz > z + 0.2) continue; // the TV's end
        if (i === 0 || i === n - 1) this.box(0.22, 0.3, 0.16, x - 0.02, zz, f + y + 0.03, k.jug);
        else this.cyl(0.05, 0.12, x - 0.06, zz, f + y + 0.03, i % 2 ? k.tinA : k.tinB, 7);
      }
    }
  }

  table() {
    const t = this.data.room.table;
    const k = this.cfg.colors;
    const f = this.floorY;
    const x = this.rx(t.x);
    const z = this.rz(t.z);
    this.box(t.w, 0.04, t.d, x, z, f + t.h - 0.04, k.tableTop);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) this.box(0.05, t.h - 0.04, 0.05, x + sx * (t.w / 2 - 0.05), z + sz * (t.d / 2 - 0.05), f, k.timberDark);
    const st = this.data.room.stool;
    this.cyl(0.16, 0.04, this.rx(st.x), this.rz(st.z), f + 0.44, k.timber, 9);
    for (let i = 0; i < 3; i++) this.box(0.035, 0.44, 0.035, this.rx(st.x) + Math.cos(i * 2.1) * 0.1, this.rz(st.z) + Math.sin(i * 2.1) * 0.1, f, k.timberDark);
    // On the table: a board game set out, a colouring book and crayons, a lamp (cold).
    const y = f + t.h;
    this.box(0.36, 0.015, 0.36, x + 0.2, z - 0.05, y, k.game, 12);
    for (let i = 0; i < 4; i++) this.cyl(0.015, 0.03, x + 0.12 + i * 0.05, z - 0.08 + (i % 2) * 0.06, y + 0.015, i % 2 ? k.blanketA : k.tinB, 6);
    this.box(0.21, 0.01, 0.28, x - 0.08, z + 0.12, y, k.colouring, -18);
    this.cyl(0.05, 0.16, x - 0.33, z + 0.15, y, k.lantern, 8);
    this.cyl(0.035, 0.08, x - 0.33, z + 0.15, y + 0.16, k.glass, 8);
  }

  extras() {
    const r = this.data.room;
    const k = this.cfg.colors;
    const f = this.floorY;
    // The TV and VCR on the top shelf, at the far end.
    const tv = r.tv;
    this.box(0.4, 0.34, 0.38, this.rx(tv.x - 0.02), this.rz(tv.z), f + tv.y + 0.08, k.tv);
    this.box(0.02, 0.26, 0.3, this.rx(tv.x - 0.22), this.rz(tv.z), f + tv.y + 0.12, k.screen);
    this.box(0.36, 0.08, 0.32, this.rx(tv.x - 0.02), this.rz(tv.z), f + tv.y, k.vcr);
    // A stuffed toy on the bottom bunk (a bear: lumps).
    const toy = r.toy;
    const ty = f + 0.48;
    this.put(new THREE.SphereGeometry(0.09, 8, 6).scale(1, 1.1, 0.9), k.toy, this.rx(toy.x), this.rz(toy.z), ty + 0.08);
    this.put(new THREE.SphereGeometry(0.065, 8, 6), k.toy, this.rx(toy.x), this.rz(toy.z), ty + 0.24);
    for (const s of [-1, 1]) this.put(new THREE.SphereGeometry(0.025, 6, 4), k.toy, this.rx(toy.x + s * 0.05), this.rz(toy.z), ty + 0.3);
    // A folded camp cot leaning on the near wall.
    const cot = r.cot;
    this.box(0.62, 1.1, 0.08, this.rx(cot.x), this.rz(cot.z - 0.2), f, k.cot, 0, { rotX: -0.15 });
  }

  // The things Tom takes: the diary on the table, the box of tapes by the VCR.
  buildFinds() {
    const r = this.data.room;
    const k = this.cfg.colors;
    const f = this.floorY;
    const t = r.table;
    this.box(0.15, 0.03, 0.21, this.rx(t.x + 0.05), this.rz(t.z - 0.05), f + t.h, k.diary, 8);
    this.diaryMesh = this.own('diary');
    this.box(0.26, 0.12, 0.16, this.rx(r.tv.x - 0.05), this.rz(r.tv.z - 0.42), f + r.tv.y, k.tapeBox);
    for (let i = 0; i < 4; i++) this.box(0.03, 0.11, 0.12, this.rx(r.tv.x - 0.16 + i * 0.065), this.rz(r.tv.z - 0.42), f + r.tv.y + 0.05, k.tape);
    this.tapesMesh = this.own('tapes');
  }

  setTaken(id, taken) {
    const m = id === 'diary' ? this.diaryMesh : id === 'tapes' ? this.tapesMesh : null;
    if (m) m.visible = !taken;
  }

  // The corkboard of trail-cam photos: mostly empty forest, one with a smear of something fast.
  buildCorkboard() {
    const c = this.data.room.corkboard;
    const w = frameToWorld(this.frame, this.rx(c.x), this.rz(c.z) - 0.01);
    const tex = toTexture(corkTexture());
    const mat = this.hold(new THREE.MeshLambertMaterial({ map: this.hold(tex) }));
    const mesh = new THREE.Mesh(this.hold(new THREE.PlaneGeometry(c.w, c.h)), mat);
    mesh.position.set(w.x, this.floorY + c.y, w.z);
    // Facing back into the room (toward -z in the frame).
    mesh.rotation.set(0, this.rotY(180), 0, 'YXZ');
    this.group.add(mesh);
  }

  update() {
    if (this.keyGlint?.parent?.visible) this.keyGlint.material.opacity = 0.35 + 0.35 * Math.abs(Math.sin(performance.now() * 0.004));
  }

  dispose() {
    this.group?.removeFromParent();
    for (const x of this.keep) x.dispose?.();
  }
}

// ---- the corkboard (canvas) ---------------------------------------------------------------------------

function corkTexture() {
  const { canvas, ctx } = makeCanvas(256, 154);
  ctx.fillStyle = '#4a3622';
  ctx.fillRect(0, 0, 256, 154);
  // Cork speckle.
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = Math.random() < 0.5 ? 'rgba(30,20,10,0.35)' : 'rgba(110,80,50,0.25)';
    ctx.fillRect(Math.random() * 256, Math.random() * 154, 1.5, 1.5);
  }
  // Photos: grainy green-black night frames, pinned askew; the fourth has the smear.
  const spots = [[14, 12], [76, 18], [140, 10], [198, 22], [24, 84], [92, 88], [160, 80]];
  spots.forEach(([x, y], i) => {
    ctx.save();
    ctx.translate(x + 24, y + 20);
    ctx.rotate((((i * 37) % 11) - 5) * 0.025);
    ctx.fillStyle = '#c8c2b0';
    ctx.fillRect(-26, -22, 52, 44);
    const g = ctx.createLinearGradient(0, -18, 0, 18);
    g.addColorStop(0, '#0e1a10');
    g.addColorStop(1, '#1c2c18');
    ctx.fillStyle = g;
    ctx.fillRect(-23, -19, 46, 32);
    // Trunks.
    ctx.fillStyle = 'rgba(70,100,60,0.6)';
    for (let t = 0; t < 4; t++) ctx.fillRect(-20 + t * 12 + (i % 3), -19, 3, 32);
    if (i === 3) {
      // The smear: a pale streak, low and fast.
      ctx.fillStyle = 'rgba(200,220,190,0.7)';
      ctx.beginPath();
      ctx.ellipse(2, 4, 13, 3, -0.15, 0, Math.PI * 2);
      ctx.fill();
    }
    // The timestamp strip.
    ctx.fillStyle = 'rgba(220,180,90,0.8)';
    ctx.fillRect(-21, 8, 18, 2);
    // A red pin.
    ctx.fillStyle = '#7a1a14';
    ctx.beginPath();
    ctx.arc(0, -20, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
  return canvas;
}
