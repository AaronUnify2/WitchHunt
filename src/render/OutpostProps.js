// The overrun military outpost, drawn (Session 17, M9.4; DESIGN.md
// "Overrun military outpost"; data/outpost.json, in the outpost's frame:
// facing the checkpoint, x to your right (west), z toward the cordon).
//  - The barricade: a sandbag line across the clearing, a run of the
//    station's steel fence with a torn panel lying flat (the breach), a
//    gap at the road where a truck's jackknifed across it, a collapsed
//    stretch of spilled bags; dead floodlights on poles.
//  - The watchtower on the near side: four braced legs, a platform with a
//    sandbag parapet and a tin roof (the snipers' nest: spent casings, a
//    rifle with its stock smashed, an ammo box of hunting rifle rounds),
//    a ladder on its north side.
//  - The near side: a sandbag gun pit, the HALT sign, what the soldiers
//    dropped (helmets, packs, rifles, ammo cans), blood on the ground.
//  - The compound: two ridge tents, the comms hut (open on its road side:
//    a desk, a field radio, the field report), the armoury's lockers (one
//    forced), containers on flatbed trailers: one empty with its doors
//    blown outward, one open on a grey body set in amber resin, one torn
//    apart from inside (the Mothman's: its roof peeled back, a side bent
//    out, claw gouges high up, scorch, a shed husk, snapped chains), one
//    sealed; the beetles' crates; a clipboard on an upturned crate.
// Dull, dark colours (the torch-glare rule). Static parts merged by colour;
// what changes (the rounds, the report, the charge, each crate whole or
// broken) is its own.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { frameToWorld } from '../world/clearingFrame.js';
import { css, makeCanvas, toTexture } from './proceduralTextures.js';
import { buildFigure } from './figureKit.js';
import { alienSpec } from './alienModel.js';

// A container: 6.06 long, 2.44 wide, 2.6 tall, on a deck this high.
export const CONTAINER = { length: 6.06, width: 2.44, height: 2.6, deck: 1.25 };
export const CRATE = { w: 1.4, h: 1.1, d: 1.1 };

export class OutpostProps {
  // cfg: config.outpost.look. data: data/outpost.json. alienCfg: config.aliens.grey (the body in the resin).
  constructor(cfg, data, alienCfg) {
    this.cfg = cfg;
    this.data = data;
    this.alienCfg = alienCfg;
    this.keep = [];
    this.parts = new Map(); // colour -> [geometries in world space]
    this.own = new Map(); // id -> Group (what changes)
  }

  // frame: the outpost's. ground: heightAt(x, z).
  init(scene, frame, ground) {
    this.frame = frame;
    this.ground = ground;
    this.group = new THREE.Group();
    this.group.name = 'outpost';
    this.seed = 17;
    this.barricade();
    this.lights();
    this.tower();
    this.staging();
    this.tents();
    this.comms();
    this.armoury();
    for (const c of this.data.compound.containers) this.container(c);
    this.manifest();
    this.flush(this.group);
    this.buildFence();
    this.buildResin();
    this.buildOwn();
    this.buildCrates();
    this.buildSigns(); // after the crates: their stencils go with them
    scene.add(this.group);
  }

  // ---- merging and placing (as StormShelterProps) -------------------------------------------------

  // Session 17 (the performance gate): everything since the last flush as
  // ONE mesh, its colours in the vertices (so the whole static set is a
  // draw call or two, not one per colour).
  flush(into) {
    const geos = [];
    for (const [color, list] of this.parts) {
      const c = new THREE.Color(color);
      for (const g of list) {
        const n = g.getAttribute('position').count;
        const cols = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
          cols[i * 3] = c.r;
          cols[i * 3 + 1] = c.g;
          cols[i * 3 + 2] = c.b;
        }
        g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
        geos.push(g);
      }
    }
    this.parts.clear();
    if (!geos.length) return null;
    const geo = this.hold(mergeGeometries(geos));
    for (const g of geos) g.dispose();
    if (!this.material) this.material = this.hold(new THREE.MeshLambertMaterial({ vertexColors: true }));
    const mesh = new THREE.Mesh(geo, this.material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    into.add(mesh);
    return mesh;
  }

  hold(x) {
    this.keep.push(x);
    return x;
  }

  rand() {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  range(a, b) {
    return a + (b - a) * this.rand();
  }

  rotY(yawDeg = 0) {
    return this.frame.yaw - (yawDeg * Math.PI) / 180;
  }

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

  // A box w (local x) by h by d (local z), its base at y; opts.ox/oy/oz shift it in its own frame first.
  box(w, h, d, x, z, y, color, yawDeg = 0, opts = {}) {
    const g = new THREE.BoxGeometry(w, h, d).translate(opts.ox ?? 0, h / 2 + (opts.oy ?? 0), opts.oz ?? 0);
    this.put(g, color, x, z, y, yawDeg, opts);
  }

  cyl(r, h, x, z, y, color, seg = 8, opts = {}) {
    const g = new THREE.CylinderGeometry(opts.top ?? r, r, h, seg).translate(opts.ox ?? 0, h / 2 + (opts.oy ?? 0), opts.oz ?? 0);
    this.put(g, color, x, z, y, opts.yaw ?? 0, opts);
  }

  // A thin bar from frame point a to b (each [x, y, z], y absolute).
  bar(a, b, r, color) {
    const wa = frameToWorld(this.frame, a[0], a[2]);
    const wb = frameToWorld(this.frame, b[0], b[2]);
    const from = new THREE.Vector3(wa.x, a[1], wa.z);
    const to = new THREE.Vector3(wb.x, b[1], wb.z);
    const len = from.distanceTo(to);
    const g = new THREE.BoxGeometry(r * 2, len, r * 2).translate(0, len / 2, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
    g.applyMatrix4(new THREE.Matrix4().compose(from, q, new THREE.Vector3(1, 1, 1)));
    if (g.getAttribute('uv')) g.deleteAttribute('uv');
    const n = g.index ? g.toNonIndexed() : g;
    if (n !== g) g.dispose();
    if (!this.parts.has(color)) this.parts.set(color, []);
    this.parts.get(color).push(n);
  }

  groundAt(x, z) {
    const w = frameToWorld(this.frame, x, z);
    return this.ground.heightAt(w.x, w.z);
  }

  // A textured board facing yawDeg (a plane faces its local +z).
  board(texture, width, height, x, z, y, yawDeg, { doubleSided = false, transparent = false } = {}) {
    const mat = this.hold(new THREE.MeshLambertMaterial({ map: this.hold(texture), transparent, side: doubleSided ? THREE.DoubleSide : THREE.FrontSide }));
    const mesh = new THREE.Mesh(this.hold(new THREE.PlaneGeometry(width, height)), mat);
    const w = frameToWorld(this.frame, x, z);
    mesh.position.set(w.x, y, w.z);
    mesh.rotation.set(0, this.rotY(yawDeg), 0, 'YXZ');
    mesh.receiveShadow = true;
    this.group.add(mesh);
    return mesh;
  }

  // A group of its own (from the parts added since the last flush).
  ownGroup(id) {
    const g = new THREE.Group();
    g.name = id;
    this.flush(g);
    this.group.add(g);
    this.own.set(id, g);
    return g;
  }

  // ---- sandbags -------------------------------------------------------------------------------------

  // One bag: a squashed box, a little turned, sitting at y.
  bag(x, z, y, yawDeg, color) {
    const k = this.cfg.colors;
    this.box(0.62, 0.22, 0.4, x, z, y, color ?? (this.rand() < 0.5 ? k.sandbag : k.sandbagDark), yawDeg + this.range(-6, 6), { rotZ: this.range(-0.05, 0.05) });
  }

  // A wall of bags along the frame's x from x0 to x1 at z: `rows` courses, two bags deep.
  bagWall(x0, x1, z, rows) {
    const len = Math.abs(x1 - x0);
    const dir = Math.sign(x1 - x0) || 1;
    const n = Math.max(1, Math.round(len / 0.6));
    const step = len / n;
    for (let r = 0; r < rows; r++) {
      const off = r % 2 ? step / 2 : 0;
      for (let i = 0; i < n; i++) {
        // The top course is ragged: bags missing, knocked off.
        if (r === rows - 1 && this.rand() < 0.18) continue;
        const x = x0 + dir * (off + (i + 0.5) * step);
        if (dir > 0 ? x > x1 : x < x1) continue;
        for (const dz of [-0.22, 0.22]) {
          const y = this.groundAt(x, z + dz) - 0.04 + r * 0.215;
          this.bag(x, z + dz, y, 90);
        }
      }
    }
  }

  // A ring of bags (the gun pit, the nest).
  bagRing(cx, cz, radius, rows, y0 = null, gapFrom = null, gapTo = null) {
    const n = Math.max(6, Math.round((Math.PI * 2 * radius) / 0.58));
    for (let r = 0; r < rows; r++) {
      for (let i = 0; i < n; i++) {
        const a = ((i + (r % 2 ? 0.5 : 0)) / n) * Math.PI * 2;
        const deg = (a * 180) / Math.PI;
        if (gapFrom !== null && deg >= gapFrom && deg <= gapTo) continue;
        const x = cx + Math.sin(a) * radius;
        const z = cz + Math.cos(a) * radius;
        const y = (y0 ?? this.groundAt(x, z) - 0.04) + r * 0.215;
        this.bag(x, z, y, deg + 90);
      }
    }
  }

  // ---- the barricade --------------------------------------------------------------------------------

  barricade() {
    const B = this.data.barricade;
    const k = this.cfg.colors;
    const rows = Math.round(B.height / 0.215);
    for (const p of B.pieces) {
      if (p.kind === 'sandbags') this.bagWall(p.x0, p.x1, B.z, rows);
      if (p.kind === 'rubble') {
        // Spilled: a low tumble of bags, some split, spread toward the compound.
        for (let i = 0; i < 26; i++) {
          const x = this.range(p.x0, p.x1);
          const z = B.z + this.range(-0.8, 1.6);
          this.bag(x, z, this.groundAt(x, z) - 0.06 + (this.rand() < 0.3 ? 0.18 : 0), this.range(0, 180));
        }
        // The stumps of the wall either side.
        this.bagWall(p.x0, p.x0 - Math.sign(p.x1 - p.x0) * -0.6, B.z, 2);
      }
    }
    // Blood where they held it, on both sides.
    for (let i = 0; i < 12; i++) this.stain(this.range(-26, 26), B.z + this.range(-4, 6), this.range(0.7, 1.5), k.blood);
  }

  // The steel fence run (the station's kind): posts and rails, chain-link panels, one torn flat.
  buildFence() {
    const B = this.data.barricade;
    const k = this.cfg.colors;
    const f = B.pieces.find((p) => p.kind === 'fence');
    if (!f) return;
    const H = 2.4;
    const z = B.z;
    const n = Math.max(1, Math.round(Math.abs(f.x1 - f.x0) / 2.5));
    const step = (f.x1 - f.x0) / n;
    for (let i = 0; i <= n; i++) {
      const x = f.x0 + i * step;
      const y = this.groundAt(x, z);
      this.cyl(0.05, H + 0.15, x, z, y - 0.1, k.steel, 6);
    }
    const tex = chainLinkTexture(128, k.wire);
    tex.repeat.set(1 / 0.5, 1 / 0.5);
    const mat = this.hold(new THREE.MeshLambertMaterial({ map: this.hold(tex), transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    const [b0, b1] = [Math.min(...f.breach), Math.max(...f.breach)];
    const panels = [];
    for (let i = 0; i < n; i++) {
      const xa = f.x0 + i * step;
      const xb = xa + step;
      const mid = (xa + xb) / 2;
      const y = Math.min(this.groundAt(xa, z), this.groundAt(xb, z));
      const torn = mid > b0 - 0.5 && mid < b1 + 0.5;
      // UVs in metres (the texture repeats every half metre).
      const g = new THREE.PlaneGeometry(Math.abs(step), H);
      const uv = g.getAttribute('uv');
      for (let j = 0; j < uv.count; j++) uv.setXY(j, uv.getX(j) * Math.abs(step), uv.getY(j) * H);
      const w = frameToWorld(this.frame, mid, torn ? z + H / 2 - 0.1 : z);
      // A plane faces its +z; along the fence it lies in the frame's x. Torn: laid flat toward the compound, crumpled up a little.
      const e = new THREE.Euler(torn ? -Math.PI / 2 + 0.12 : 0, this.rotY(0), torn ? 0.06 : 0, 'YXZ');
      g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(w.x, torn ? y + 0.12 : y + H / 2 + 0.05, w.z), new THREE.Quaternion().setFromEuler(e), new THREE.Vector3(1, 1, 1)));
      panels.push(g);
      // The top rail, but not over the torn panel.
      if (!torn) this.bar([xa, y + H, z], [xb, y + H, z], 0.03, k.steel);
      else {
        // The posts either side bent out, the rail's ends dangling.
        this.bar([xa, y + H, z], [xa + step * 0.25, y + H - 0.9, z + 0.5], 0.03, k.steel);
        this.bar([xb, y + H, z], [xb - step * 0.25, y + H - 1.1, z + 0.4], 0.03, k.steel);
      }
    }
    const merged = this.hold(mergeGeometries(panels));
    for (const g of panels) g.dispose();
    this.group.add(new THREE.Mesh(merged, mat));
    this.flush(this.group);
  }

  // Dead floodlights: a pole on a concrete foot, a lamp head with its glass dark.
  lights() {
    const k = this.cfg.colors;
    for (const [x, z, yaw] of this.data.barricade.lights) {
      const y = this.groundAt(x, z);
      this.box(0.6, 0.35, 0.6, x, z, y - 0.15, k.concrete);
      this.cyl(0.09, 6, x, z, y, k.steel, 8);
      this.box(1.2, 0.1, 0.1, x, z, y + 5.9, k.steel, yaw);
      for (const s of [-0.4, 0.4]) {
        this.box(0.36, 0.3, 0.26, x, z, y + 5.75, k.lamp, yaw, { ox: s, oz: 0.12, rotX: 0.25 });
        this.box(0.3, 0.24, 0.02, x, z, y + 5.78, k.lampGlass, yaw, { ox: s, oz: 0.26, rotX: 0.25 });
      }
    }
  }

  // ---- the watchtower -------------------------------------------------------------------------------

  // Its platform's height (absolute): the highest ground under its legs + its height.
  static towerTop(frame, ground, t) {
    let base = -Infinity;
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const w = frameToWorld(frame, t.x + dx * t.legs, t.z + dz * t.legs);
      base = Math.max(base, ground.heightAt(w.x, w.z));
    }
    return base + t.height;
  }

  tower() {
    const t = this.data.tower;
    const k = this.cfg.colors;
    const top = OutpostProps.towerTop(this.frame, this.ground, t);
    this.towerY = top;
    const legs = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([dx, dz]) => [t.x + dx * t.legs, t.z + dz * t.legs]);
    for (const [x, z] of legs) {
      const y = this.groundAt(x, z) - 0.3;
      this.box(0.2, top - y, 0.2, x, z, y, k.timber);
      this.box(0.5, 0.3, 0.5, x, z, this.groundAt(x, z) - 0.15, k.concrete);
    }
    // Cross braces on each side, two levels.
    const sides = [[0, 1], [1, 3], [3, 2], [2, 0]];
    for (const [a, b] of sides) {
      const [ax, az] = legs[a];
      const [bx, bz] = legs[b];
      const ya = this.groundAt(ax, az);
      const yb = this.groundAt(bx, bz);
      const mid = (ya + top) / 2;
      this.bar([ax, ya + 0.4, az], [bx, mid, bz], 0.05, k.timberDark);
      this.bar([bx, yb + 0.4, bz], [ax, mid, az], 0.05, k.timberDark);
      this.bar([ax, mid, az], [bx, top - 0.3, bz], 0.05, k.timberDark);
      this.bar([bx, mid, bz], [ax, top - 0.3, az], 0.05, k.timberDark);
      this.bar([ax, mid, az], [bx, mid, bz], 0.05, k.timber);
    }
    // The platform and its parapet of sandbags (open at the ladder, on the north side).
    const P = t.half * 2 + 0.2;
    this.box(P, 0.16, P, t.x, t.z, top - 0.16, k.timber);
    for (let i = 0; i < 9; i++) this.box(P, 0.02, 0.06, t.x, t.z - P / 2 + 0.2 + i * 0.36, top, k.timberDark);
    const h = t.half;
    for (let r = 0; r < 4; r++) {
      const y = top + r * 0.215;
      const runs = [
        [[-h, h], [h, h]], // south
        [[-h, -h], [-h, h]], // east
        [[h, -h], [h, h]], // west
        [[-h, -h], [-0.55, -h]], // north, east of the ladder
        [[0.55, -h], [h, -h]], // north, west of the ladder
      ];
      for (const [[x0, z0], [x1, z1]] of runs) {
        const len = Math.hypot(x1 - x0, z1 - z0);
        const n = Math.max(1, Math.round(len / 0.6));
        for (let i = 0; i < n; i++) {
          const f = (i + 0.5 + (r % 2 ? 0.25 : 0)) / n;
          if (f > 1) continue;
          const x = t.x + x0 + (x1 - x0) * f;
          const z = t.z + z0 + (z1 - z0) * f;
          this.bag(x, z, y, x1 === x0 ? 0 : 90);
        }
      }
    }
    // Corner posts and a tin roof.
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) this.box(0.12, 2.6, 0.12, t.x + dx * (h + 0.02), t.z + dz * (h + 0.02), top, k.timber);
    this.box(P + 0.5, 0.06, P + 0.5, t.x, t.z, top + 2.6, k.steelDark, 0, { rotX: 0.06 }); // as high as the station tower's (config.flashlight's platform roofY)
    // The ladder: two rails and rungs up the north side.
    const lz = t.z - h - 0.35;
    const ly = this.groundAt(t.x, lz);
    for (const s of [-0.28, 0.28]) this.box(0.07, top - ly + 1.0, 0.07, t.x + s, lz, ly, k.timberDark);
    for (let y = ly + 0.3; y < top; y += 0.32) this.box(0.6, 0.05, 0.06, t.x, lz, y, k.timberDark);
    // The nest: spent casings, the smashed rifle on the parapet, ammo cans.
    for (let i = 0; i < 40; i++) {
      const x = t.x + this.range(-h + 0.3, h - 0.3);
      const z = t.z + this.range(-h + 0.3, h - 0.3);
      this.cyl(0.012, 0.055, x, z, top + 0.01, k.casing, 5, { rotX: Math.PI / 2, yaw: this.range(0, 180) });
    }
    this.box(0.06, 0.08, 1.05, t.x - 0.4, t.z + h, top + 0.86, k.rifle, 80, { rotZ: 0.2 });
    this.box(0.08, 0.14, 0.3, t.x - 0.05, t.z + h - 0.1, top + 0.86, k.timber, 95, { rotX: 0.5 });
    this.box(0.4, 0.28, 0.22, t.x + h - 0.4, t.z + h - 0.4, top, k.can, 20);
  }

  // A dark, irregular stain on the ground (blood, scorch): a few flattened discs.
  stain(x, z, size, color) {
    for (let i = 0; i < 3; i++) {
      const r = size * this.range(0.35, 0.6);
      const g = new THREE.CylinderGeometry(r, r, 0.02, 9).scale(1, 1, this.range(0.5, 1));
      const ox = this.range(-size, size) * 0.4;
      const oz = this.range(-size, size) * 0.4;
      this.put(g, color, x + ox, z + oz, this.groundAt(x + ox, z + oz) + 0.012 + i * 0.001, this.range(0, 180));
    }
  }

  // ---- the near side ----------------------------------------------------------------------------------

  staging() {
    const s = this.data.staging;
    const k = this.cfg.colors;
    const g = s.gunPit;
    this.bagRing(g.x, g.z, g.r, 4, null, 300, 360);
    this.box(0.12, 0.6, 0.12, g.x, g.z, this.groundAt(g.x, g.z), k.steel); // the gun's mount, the gun long gone
    for (const [x, z, kind, yaw] of s.gear) this.gear(x, z, kind, yaw);
    // Blood trails up the road from the barricade.
    for (let i = 0; i < 10; i++) this.stain(this.range(-6, 6), this.range(-18, 2), this.range(0.5, 1.1), k.blood);
    // The HALT sign's posts (its board is drawn with the signs).
    const h = s.halt;
    const y = this.groundAt(h.x, h.z);
    for (const d of [-0.8, 0.8]) this.box(0.1, 2.2, 0.1, h.x, h.z, y, k.timberDark, h.yaw, { ox: d });
  }

  gear(x, z, kind, yaw) {
    const k = this.cfg.colors;
    const y = this.groundAt(x, z);
    if (kind === 'helmet') {
      const g = new THREE.SphereGeometry(0.15, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.8, 1.1);
      this.put(g, k.helmet, x, z, y + 0.02, yaw, { rotX: this.range(-0.4, 0.4), rotZ: this.range(-0.5, 0.5) });
      this.cyl(0.19, 0.02, x, z, y, k.helmet, 10);
    } else if (kind === 'pack') {
      this.box(0.42, 0.28, 0.55, x, z, y, k.pack, yaw, { rotZ: 0.2 });
      this.box(0.3, 0.16, 0.2, x, z, y + 0.18, k.oliveDark, yaw, { oz: 0.3 });
    } else if (kind === 'rifle') {
      this.box(0.06, 0.07, 1.0, x, z, y + 0.02, k.rifle, yaw);
      this.box(0.05, 0.16, 0.08, x, z, y + 0.02, k.rifle, yaw, { oz: 0.1 });
    } else if (kind === 'can') {
      this.box(0.3, 0.2, 0.16, x, z, y, k.can, yaw);
    }
  }

  // ---- the compound -----------------------------------------------------------------------------------

  // Ridge tents: long axis across (frame x), the door at the road end.
  tents() {
    const k = this.cfg.colors;
    for (const t of this.data.compound.tents) {
      const y = this.groundAt(t.x, t.z) - 0.05;
      const L = t.d; // along x
      const W = t.w; // across z
      const wall = 0.9;
      const ridge = 2.7;
      // The low walls, the roof as a prism, the poles at each end.
      this.box(L, wall, W, t.x, t.z, y, k.canvas, 90);
      const roof = new THREE.CylinderGeometry(1, 1, L, 3, 1).rotateX(-Math.PI / 2);
      roof.scale(W / 1.732, (ridge - wall) / 1.5, 1).translate(0, (ridge - wall) / 3, 0);
      this.put(roof, k.canvasDark, t.x, t.z, y + wall, 90);
      // Sag: a couple of guy ropes and pegs off each side.
      for (const s of [-1, 1]) {
        for (const f of [-0.35, 0.35]) {
          const px = t.x + f * L;
          this.bar([px, y + wall + 0.3, t.z + s * (W / 2)], [px, this.groundAt(px, t.z + s * (W / 2 + 1.2)), t.z + s * (W / 2 + 1.2)], 0.012, k.canvasDark);
        }
      }
      // The door at the road end (east: the frame's -x side): a dark opening, the flap tied back.
      const ex = t.x - L / 2 - 0.02;
      this.box(0.04, 1.7, 1.2, ex, t.z, y, k.void);
      this.box(0.06, 1.6, 0.5, ex - 0.05, t.z - 0.75, y, k.canvas, 0, { rotZ: 0.1 });
    }
    // A footlocker by the second tent.
    const f = this.data.searches.find((s) => s.id === 'footlocker');
    if (f) this.box(0.8, 0.45, 0.45, f.x + 0.6, f.z, this.groundAt(f.x + 0.6, f.z), k.oliveDark, 90);
  }

  // The comms hut: plank walls on three sides, open toward the road; a desk, a radio, a chair over.
  comms() {
    const c = this.data.compound.comms;
    const k = this.cfg.colors;
    let base = Infinity;
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) base = Math.min(base, this.groundAt(c.x + (dx * c.w) / 2, c.z + (dz * c.d) / 2));
    let top = -Infinity;
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) top = Math.max(top, this.groundAt(c.x + (dx * c.w) / 2, c.z + (dz * c.d) / 2));
    const fy = top + 0.12;
    this.floorY = fy;
    const H = c.height;
    this.box(c.w + 0.2, fy - base + 0.3, c.d + 0.2, c.x, c.z, base - 0.3, k.concrete);
    const t = 0.12;
    const west = c.x + c.w / 2;
    this.box(t, H, c.d, west, c.z, fy, k.timber); // the back (west) wall
    this.box(c.w, H, t, c.x, c.z - c.d / 2, fy, k.timber); // north
    this.box(c.w, H, t, c.x, c.z + c.d / 2, fy, k.timber); // south
    // The road side: posts at the corners, a header, sandbags halfway along its foot.
    for (const s of [-1, 1]) this.box(0.14, H, 0.14, c.x - c.w / 2, c.z + (s * c.d) / 2, fy, k.timberDark);
    this.box(0.14, 0.3, c.d, c.x - c.w / 2, c.z, fy + H - 0.3, k.timberDark);
    this.box(c.w + 0.6, 0.08, c.d + 0.6, c.x, c.z, fy + H, k.steelDark, 0, { rotZ: 0.06 });
    for (let i = 0; i < 4; i++) this.bag(c.x - c.w / 2 - 0.45, c.z + c.d / 2 - 0.4 - i * 0.62, this.groundAt(c.x - c.w / 2 - 0.45, c.z) - 0.04, 0);
    // The desk against the back wall, the field radio, a map board, a chair on its back.
    this.box(0.8, 0.76, 1.8, west - 0.5, c.z, fy, k.desk);
    this.box(0.4, 0.28, 0.5, west - 0.45, c.z - 0.5, fy + 0.76, k.radio);
    this.box(0.04, 0.32, 0.02, west - 0.45, c.z - 0.62, fy + 1.04, k.steel); // its aerial stub
    this.box(0.03, 0.9, 1.4, west - 0.07, c.z + 0.1, fy + 1.1, k.paper);
    this.box(0.45, 0.45, 0.45, west - 1.4, c.z + 0.6, fy, k.timberDark, 30, { rotX: 1.4 });
    // The mast beside it, with its guy wires.
    const [mx, mz] = c.mast;
    const my = this.groundAt(mx, mz);
    this.cyl(0.05, 7, mx, mz, my, k.steel, 6);
    for (const [dx, dz] of [[2.2, 0], [-1.1, 1.9], [-1.1, -1.9]]) this.bar([mx, my + 6.5, mz], [mx + dx, this.groundAt(mx + dx, mz + dz), mz + dz], 0.008, k.wire);
    this.box(0.9, 0.05, 0.05, mx, mz, my + 6.6, k.steel, 45);
  }

  // The armoury: a row of steel lockers facing the road, the end one forced open.
  armoury() {
    const a = this.data.compound.armoury;
    const k = this.cfg.colors;
    for (let i = 0; i < 3; i++) {
      const z = a.z + (i - 1) * 0.64;
      const y = this.groundAt(a.x, z);
      this.box(0.6, 1.9, 0.55, a.x, z, y, k.locker, -90);
      if (i === 2) {
        // Forced: the door hanging off one hinge, the inside black.
        this.box(0.5, 1.7, 0.02, a.x - 0.28, z, y + 0.1, k.void, -90);
        this.box(0.03, 1.7, 0.56, a.x - 0.5, z - 0.32, y + 0.1, k.locker, -50);
      } else {
        this.box(0.02, 0.04, 0.12, a.x - 0.29, z + 0.18, y + 1.0, k.steelDark); // the handle
      }
    }
    // A low sandbag wall in front of them.
    for (let i = 0; i < 3; i++) this.bag(a.x - 1.4, a.z - 0.6 + i * 0.62, this.groundAt(a.x - 1.4, a.z) - 0.04, 0);
  }

  // ---- the containers -----------------------------------------------------------------------------------

  // A flatbed trailer and its container. Local: z along it (the doors at +z), x across.
  container(c) {
    const k = this.cfg.colors;
    const C = CONTAINER;
    const y = this.groundAt(c.x, c.z);
    const L = C.length + 0.6;
    // The trailer: deck, beams, wheels at the back, the landing legs at the front.
    this.box(C.width + 0.1, 0.22, L, c.x, c.z, y + C.deck - 0.22, k.flatbed, c.yaw);
    for (const s of [-0.5, 0.5]) this.box(0.18, 0.35, L, c.x, c.z, y + C.deck - 0.55, k.steelDark, c.yaw, { ox: s });
    for (const oz of [-2.0, -2.9]) {
      for (const s of [-1, 1]) {
        const g = new THREE.CylinderGeometry(0.48, 0.48, 0.3, 12).rotateZ(Math.PI / 2).translate(s * (C.width / 2 - 0.1), 0.48, oz);
        this.put(g, k.tyre, c.x, c.z, y, c.yaw);
      }
    }
    for (const s of [-0.8, 0.8]) this.box(0.12, C.deck - 0.4, 0.12, c.x, c.z, y, k.steelDark, c.yaw, { ox: s, oz: 2.4 });
    const base = y + C.deck;
    const paint = { empty: k.containerA, resin: k.containerC, mothman: k.containerB, sealed: k.containerD }[c.kind] ?? k.containerA;
    if (c.kind === 'mothman') this.tornContainer(c, base, paint);
    else this.shell(c, base, paint, c.kind);
  }

  // A whole container: walls with ribs, the roof, doors at +z (shut, open or blown out).
  shell(c, base, paint, kind) {
    const k = this.cfg.colors;
    const C = CONTAINER;
    const hl = C.length / 2;
    const hw = C.width / 2;
    const t = 0.06;
    // Floor, sides, roof, the closed end (-z).
    this.box(C.width, 0.08, C.length, c.x, c.z, base, k.flatbed, c.yaw);
    for (const s of [-1, 1]) this.box(t, C.height, C.length, c.x, c.z, base, paint, c.yaw, { ox: s * (hw - t / 2) });
    this.box(C.width, t, C.length, c.x, c.z, base + C.height - t, paint, c.yaw);
    this.box(C.width, C.height, t, c.x, c.z, base, paint, c.yaw, { oz: -hl + t / 2 });
    // Corrugation ribs down both sides.
    for (let f = -hl + 0.25; f < hl - 0.1; f += 0.42) {
      for (const s of [-1, 1]) this.box(0.04, C.height - 0.2, 0.12, c.x, c.z, base + 0.1, paint, c.yaw, { ox: s * (hw + 0.02), oz: f });
    }
    // Corner posts.
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) this.box(0.14, C.height, 0.14, c.x, c.z, base, k.steelDark, c.yaw, { ox: sx * (hw - 0.05), oz: sz * (hl - 0.05) });
    // The inside: dark.
    this.box(C.width - 0.2, C.height - 0.2, C.length - 0.3, c.x, c.z, base + 0.08, k.void, c.yaw, { oz: -0.1 });
    // The doors.
    const dz = hl;
    if (kind === 'sealed') {
      for (const s of [-1, 1]) this.box(hw, C.height - 0.1, t, c.x, c.z, base + 0.05, paint, c.yaw, { ox: (s * hw) / 2, oz: dz });
      // Locking bars and a chain and padlock across them.
      for (const ox of [-0.8, -0.3, 0.3, 0.8]) this.box(0.04, C.height - 0.3, 0.05, c.x, c.z, base + 0.15, k.steelDark, c.yaw, { ox, oz: dz + 0.05 });
      this.box(1.4, 0.05, 0.04, c.x, c.z, base + 1.3, k.chain, c.yaw, { oz: dz + 0.08 });
      this.box(0.1, 0.14, 0.06, c.x, c.z, base + 1.2, k.steel, c.yaw, { oz: dz + 0.1 });
    } else if (kind === 'empty') {
      // Blown outward: both doors flung back past square, buckled; soot round the opening.
      for (const s of [-1, 1]) {
        const deg = c.yaw + s * 115;
        const p = this.local(c, s * hw, dz);
        this.box(t, C.height - 0.2, hw, p.x, p.z, base + 0.15, paint, deg, { oz: hw / 2, rotZ: s * 0.08 });
      }
      for (let i = 0; i < 8; i++) {
        const p = this.local(c, this.range(-hw, hw), dz + 0.02);
        this.box(this.range(0.3, 0.8), this.range(0.3, 0.9), 0.02, p.x, p.z, base + this.range(0.2, C.height - 0.8), k.scorch, c.yaw);
      }
      // Debris spat out onto the ground in front.
      for (let i = 0; i < 10; i++) {
        const p = this.local(c, this.range(-2, 2), dz + this.range(0.8, 3.5));
        this.box(this.range(0.1, 0.5), 0.04, this.range(0.1, 0.4), p.x, p.z, this.groundAt(p.x, p.z) + 0.01, this.rand() < 0.5 ? k.steelDark : k.scorch, this.range(0, 180));
      }
    } else if (kind === 'resin') {
      // Open, the doors swung right back flat against the sides.
      for (const s of [-1, 1]) {
        const p = this.local(c, s * (hw + 0.06), dz);
        this.box(t, C.height - 0.2, hw, p.x, p.z, base + 0.15, paint, c.yaw, { oz: -hw / 2 });
      }
      // Straps over the block, bolted to the floor.
      for (const oz of [hl - 1.6, hl - 0.6]) this.box(1.6, 0.05, 0.08, c.x, c.z, base + 2.05, k.chain, c.yaw, { oz });
    }
  }

  // The Mothman's: torn apart from inside. One side bent out and down, the roof
  // peeled back like a lid, the doors gone (one on the ground in front), claw
  // gouges high up inside and out, scorch, a shed husk, snapped restraints.
  tornContainer(c, base, paint) {
    const k = this.cfg.colors;
    const C = CONTAINER;
    const hl = C.length / 2;
    const hw = C.width / 2;
    const t = 0.06;
    this.box(C.width, 0.08, C.length, c.x, c.z, base, k.flatbed, c.yaw);
    // The closed end, scorched.
    this.box(C.width, C.height, t, c.x, c.z, base, paint, c.yaw, { oz: -hl + t / 2 });
    // The left side whole (the inside's dark), the right bent out and hanging.
    this.box(t, C.height, C.length, c.x, c.z, base, paint, c.yaw, { ox: -(hw - t / 2) });
    for (const [oz, len, bend] of [[-1.6, 2.6, 0.55], [1.3, 3.2, 1.05]]) {
      const p = this.local(c, hw, oz);
      this.box(t, C.height, len, p.x, p.z, base, paint, c.yaw, { rotZ: -bend, ox: 0, oy: 0 });
    }
    // The roof peeled back over the closed end, standing up at an angle.
    const r = this.local(c, 0, -hl + 0.2);
    this.box(C.width, t, C.length * 0.8, r.x, r.z, base + C.height, paint, c.yaw, { oz: C.length * 0.4, rotX: -1.15 });
    // Ribs on the whole side.
    for (let f = -hl + 0.25; f < hl - 0.1; f += 0.42) this.box(0.04, C.height - 0.2, 0.12, c.x, c.z, base + 0.1, paint, c.yaw, { ox: -(hw + 0.02), oz: f });
    // Claw gouges high up the walls: long dark rakes in threes, far above a man.
    for (const [ox, oz, tilt] of [[-hw + 0.05, -1.2, 0.5], [-hw + 0.05, 0.8, -0.4], [-hw - 0.04, 1.9, 0.6], [-hw - 0.04, -0.4, -0.5]]) {
      for (let i = 0; i < 3; i++) {
        const p = this.local(c, ox, oz + i * 0.16);
        this.box(0.02, 1.1, 0.04, p.x, p.z, base + 1.3 + i * 0.05, k.gouge, c.yaw, { rotX: tilt });
      }
    }
    // Scorch and soot.
    for (let i = 0; i < 14; i++) {
      const p = this.local(c, this.range(-hw, hw), this.range(-hl, hl));
      this.box(this.range(0.4, 1.2), 0.02, this.range(0.4, 1.2), p.x, p.z, base + 0.09, k.scorch, this.range(0, 180));
    }
    // Restraints: thick chains bolted to the floor, snapped, the ends flung.
    for (const [ox, oz] of [[-0.8, -1.5], [0.8, -1.5], [-0.8, 1.5], [0.8, 1.5]]) {
      const p = this.local(c, ox, oz);
      this.box(0.18, 0.08, 0.18, p.x, p.z, base + 0.08, k.steelDark, c.yaw);
      for (let i = 0; i < 4; i++) this.box(0.07, 0.07, 0.16, p.x, p.z, base + 0.12, k.chain, c.yaw + this.range(-60, 60), { oz: i * 0.15 });
    }
    // A door on the ground in front, crumpled; the other gone.
    const d = this.local(c, -0.6, hl + 2.2);
    this.box(hw, 0.06, C.height - 0.3, d.x, d.z, this.groundAt(d.x, d.z) + 0.02, paint, c.yaw + 25, { rotZ: 0.15 });
    // The husk: a long, pale, papery shell lying half out of the back of the trailer.
    const hsk = this.local(c, 0.3, hl + 0.6);
    const g = new THREE.SphereGeometry(1, 12, 8).scale(0.45, 0.35, 1.3);
    this.put(g, k.husk, hsk.x, hsk.z, this.groundAt(hsk.x, hsk.z) + 0.25, c.yaw + 15, { rotX: 0.3 });
    for (let i = 0; i < 5; i++) {
      const p = this.local(c, this.range(-1.2, 1.4), hl + this.range(0.5, 3));
      this.box(this.range(0.2, 0.6), 0.03, this.range(0.3, 0.8), p.x, p.z, this.groundAt(p.x, p.z) + 0.02, k.husk, this.range(0, 180), { rotZ: this.range(-0.3, 0.3) });
    }
  }

  // A point in a container's own frame (x across, z along) in the outpost's frame.
  local(c, x, z) {
    const a = (c.yaw * Math.PI) / 180;
    // yaw turns its +z toward the frame's +x (right).
    return { x: c.x + z * Math.sin(a) + x * Math.cos(a), z: c.z + z * Math.cos(a) - x * Math.sin(a) };
  }

  // The body in the resin, in the open container: a grey alien set in an amber block, lit faintly.
  buildResin() {
    const c = this.data.compound.containers.find((x) => x.kind === 'resin');
    if (!c) return;
    const k = this.cfg.colors;
    const y = this.groundAt(c.x, c.z) + CONTAINER.deck + 0.08;
    const p = this.local(c, 0, CONTAINER.length / 2 - 1.1);
    const w = frameToWorld(this.frame, p.x, p.z);
    const yaw = this.rotY(c.yaw);
    if (this.alienCfg) {
      const { geometry } = buildFigure(alienSpec(this.alienCfg, { id: 'none' }));
      const mat = this.hold(new THREE.MeshLambertMaterial({ vertexColors: true }));
      mat.color.setScalar(0.55);
      const body = new THREE.Mesh(this.hold(geometry), mat);
      body.position.set(w.x, y + 0.25, w.z);
      body.rotation.set(-0.1, yaw, 0.05, 'YXZ');
      body.castShadow = true;
      this.group.add(body);
      this.alien = body;
    }
    const block = new THREE.Mesh(
      this.hold(new THREE.BoxGeometry(1.2, 1.95, 0.9).translate(0, 0.975, 0)),
      this.hold(new THREE.MeshLambertMaterial({ color: k.resin, transparent: true, opacity: 0.55, emissive: k.resin, emissiveIntensity: 0.12, depthWrite: false })),
    );
    block.position.set(w.x, y, w.z);
    block.rotation.y = yaw;
    this.group.add(block);
    this.resin = block;
  }

  manifest() {
    const m = this.data.compound.manifest;
    const k = this.cfg.colors;
    const y = this.groundAt(m.x, m.z);
    this.box(0.7, 0.75, 0.55, m.x, m.z, y, k.crate, 20);
    this.box(0.24, 0.02, 0.32, m.x, m.z, y + 0.75, k.timber, 30);
    this.box(0.2, 0.01, 0.27, m.x, m.z, y + 0.765, k.paper, 30);
  }

  // ---- what changes ----------------------------------------------------------------------------------

  // The nest's ammo box, the field report on the desk, the charge in the forced locker.
  buildOwn() {
    const t = this.data.tower;
    const k = this.cfg.colors;
    this.box(0.36, 0.2, 0.2, t.x + 0.6, t.z + t.half - 0.3, this.towerY, k.can, -10);
    this.box(0.36, 0.02, 0.2, t.x + 0.6, t.z + t.half - 0.3, this.towerY + 0.2, k.casing, -10);
    this.ownGroup('rounds');
    const c = this.data.compound.comms;
    this.box(0.24, 0.02, 0.32, c.x + c.w / 2 - 0.55, c.z + 0.35, this.floorY + 0.765, k.paper, 10);
    this.box(0.22, 0.01, 0.06, c.x + c.w / 2 - 0.55, c.z + 0.2, this.floorY + 0.78, k.blood, 10);
    this.ownGroup('report');
    const a = this.data.compound.armoury;
    const z = a.z + 0.64;
    this.box(0.3, 0.18, 0.2, a.x - 0.05, z, this.groundAt(a.x, z) + 0.95, k.oliveDark, -90);
    this.box(0.08, 0.04, 0.04, a.x - 0.2, z + 0.06, this.groundAt(a.x, z) + 1.13, k.blood, -90);
    this.ownGroup('charge');
  }

  // Each crate whole, or broken open (its slats split outward).
  buildCrates() {
    const k = this.cfg.colors;
    this.crates = [];
    this.data.compound.crates.forEach(([x, z, yaw], i) => {
      const y = this.groundAt(x, z) - 0.02;
      const { w, h, d } = CRATE;
      // Whole: planks, steel bands, a stencil (its board), air holes.
      this.box(w, h, d, x, z, y, k.crate, yaw);
      for (const f of [-0.35, 0.35]) this.box(w + 0.04, 0.08, d + 0.04, x, z, y + h * (0.5 + f), k.crateBand, yaw);
      for (const f of [-0.5, 0, 0.5]) this.box(0.08, 0.08, 0.02, x, z, y + h * 0.75, k.void, yaw, { ox: f, oz: d / 2 + 0.01 });
      const whole = this.ownGroup(`crate${i}`);
      // Broken: the lid flung, two sides fallen out, the inside black and wet.
      this.box(w - 0.1, 0.06, d - 0.1, x, z, y, k.void, yaw);
      this.box(w, h * 0.45, 0.06, x, z, y, k.crate, yaw, { oz: -d / 2 });
      this.box(0.06, h * 0.6, d, x, z, y, k.crate, yaw, { ox: w / 2 });
      this.box(w, 0.06, h, x, z, y + 0.02, k.crate, yaw, { oz: d / 2 + h / 2 + 0.05 });
      this.box(0.06, 0.06, d, x, z, y + 0.02, k.crate, yaw + 30, { ox: -w / 2 - 0.6 });
      this.box(w * 0.9, 0.05, d * 0.8, x, z, y + 0.05, k.crate, yaw + 70, { ox: -1.4, oz: 0.6, rotZ: 0.3 });
      for (let j = 0; j < 4; j++) this.box(this.range(0.3, 0.7), 0.03, 0.12, x, z, this.groundAt(x, z) + 0.01, k.crate, yaw + this.range(0, 180), { ox: this.range(-1.5, 1.5), oz: this.range(-1.5, 1.5) });
      const broken = this.ownGroup(`crate${i}Broken`);
      broken.visible = false;
      this.crates.push({ whole, broken });
    });
  }

  // ---- signs and stencils (canvas) -----------------------------------------------------------------

  buildSigns() {
    const s = this.data.staging.halt;
    const y = this.groundAt(s.x, s.z);
    this.board(signTexture(['HALT', 'MILITARY CHECKPOINT', 'NO CIVILIANS BEYOND THIS POINT', 'USE OF DEADLY FORCE AUTHORIZED'], '#5a2018'), 2.0, 1.25, s.x, s.z, y + 1.55, s.yaw, { doubleSided: true });
    // The containers' codes, on both long sides (C-7 is the Mothman's: CONTAINMENT C-7 on the feed).
    const codes = { empty: 'C-3', resin: 'C-4', mothman: 'C-7', sealed: 'C-9' };
    for (const c of this.data.compound.containers) {
      const y0 = this.groundAt(c.x, c.z) + CONTAINER.deck + 1.6;
      const tex = stencilTexture(codes[c.kind] ?? 'C-?', c.kind === 'sealed' ? 'LIVE · DO NOT OPEN' : 'BIOHAZARD · CLASS IV');
      for (const s2 of c.kind === 'mothman' ? [-1] : [-1, 1]) {
        const p = this.local(c, s2 * (CONTAINER.width / 2 + 0.08), 0.6);
        this.board(tex, 2.0, 0.85, p.x, p.z, y0, c.yaw + s2 * -90 + 180, { transparent: true });
      }
    }
    // LIVE SPECIMEN on the crates' road-facing sides.
    const crateMat = this.hold(new THREE.MeshLambertMaterial({ map: this.hold(stencilTexture('LIVE SPECIMEN', 'THIS SIDE UP')), transparent: true }));
    const plane = this.hold(new THREE.PlaneGeometry(1.1, 0.5));
    this.data.compound.crates.forEach(([x, z, yaw], i) => {
      const a = (yaw * Math.PI) / 180;
      const w = frameToWorld(this.frame, x + Math.sin(a) * (CRATE.d / 2 + 0.01), z + Math.cos(a) * (CRATE.d / 2 + 0.01));
      const m = new THREE.Mesh(plane, crateMat);
      m.position.set(w.x, this.groundAt(x, z) + 0.45, w.z);
      m.rotation.y = this.rotY(yaw);
      this.crates[i]?.whole.add(m);
    });
  }

  // ---- the crash sites' smoke (the dogfight's, Session 17) -----------------------------------------

  // A rising column over each site: soft puffs, past the fog (seen from far off), slowly climbing.
  buildCrashSmoke(scene, sites) {
    if (!scene) return;
    const tex = this.hold(puffCanvasTexture());
    this.smoke = sites.map((s, i) => {
      const g = new THREE.Group();
      g.name = `crashSmoke${i}`;
      const y = this.ground.heightAt(s.x, s.z);
      g.position.set(s.x, y, s.z);
      const puffs = [];
      const H = i === 0 ? 110 : 150; // tall enough to show over the trees from far off
      for (let k = 0; k < 16; k++) {
        const mat = this.hold(new THREE.SpriteMaterial({ map: tex, color: i === 0 ? 0x34302c : 0x3a4038, transparent: true, depthWrite: false, fog: false }));
        const sp = new THREE.Sprite(mat);
        sp.userData.phase = k / 16;
        g.add(sp);
        puffs.push(sp);
      }
      g.visible = false;
      scene.add(g);
      this.keep.push({ dispose: () => g.removeFromParent() });
      return { group: g, puffs, H, t: 0 };
    });
  }

  setCrashSmoke(i, on) {
    const s = this.smoke?.[i];
    if (s) s.group.visible = on;
  }

  updateSmoke(dt) {
    for (const s of this.smoke ?? []) {
      if (!s.group.visible) continue;
      s.t += dt * 0.05;
      for (const sp of s.puffs) {
        const k = (sp.userData.phase + s.t) % 1;
        sp.position.set(k * k * s.H * 0.35, k * s.H, k * s.H * 0.08);
        const w = s.H * (0.1 + k * 0.45);
        sp.scale.set(w, w, 1);
        sp.material.opacity = 0.55 * Math.min(1, k * 6) * (1 - k);
      }
    }
  }

  // ---- state ------------------------------------------------------------------------------------------

  setTaken(id, taken) {
    const g = this.own.get(id);
    if (g) g.visible = !taken;
  }

  setCrate(i, broken) {
    const c = this.crates?.[i];
    if (!c) return;
    c.whole.visible = !broken;
    c.broken.visible = broken;
  }

  update(dt = 0) {
    this.updateSmoke(dt);
  }

  dispose() {
    this.group?.removeFromParent();
    for (const x of this.keep) x.dispose?.();
  }
}

// ---- canvases ----------------------------------------------------------------------------------------

function chainLinkTexture(size, color) {
  const { canvas, ctx } = makeCanvas(size, size);
  ctx.strokeStyle = css(color);
  ctx.lineWidth = Math.max(2, size / 22);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(size, size);
  ctx.moveTo(size, 0);
  ctx.lineTo(0, size);
  ctx.stroke();
  const t = toTexture(canvas, { repeat: true });
  t.anisotropy = 4;
  return t;
}

// A soft round puff (the crash sites' smoke).
function puffCanvasTexture() {
  const { canvas, ctx } = makeCanvas(64, 64);
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  return toTexture(canvas);
}

// A painted board: a big first line, smaller lines under it. Dark (the torch-glare rule).
function signTexture(lines, colour) {
  const { canvas, ctx } = makeCanvas(512, 320);
  ctx.fillStyle = '#3e3a30';
  ctx.fillRect(0, 0, 512, 320);
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, 512, 104);
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = `rgba(20,16,10,${0.06 + ((i * 7) % 10) / 80})`;
    ctx.fillRect((i * 97) % 512, (i * 53) % 320, 4 + ((i * 13) % 40), 2 + ((i * 11) % 24));
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = '#a8a08a';
  ctx.font = 'bold 84px sans-serif';
  ctx.fillText(lines[0], 256, 86);
  ctx.fillStyle = '#9a9078';
  ctx.font = 'bold 34px sans-serif';
  lines.slice(1).forEach((l, i) => {
    ctx.font = i === 0 ? 'bold 38px sans-serif' : 'bold 25px sans-serif';
    ctx.fillText(l, 256, 160 + i * 52);
  });
  // Bullet holes.
  ctx.fillStyle = '#0c0a08';
  for (const [x, y] of [[88, 212], [402, 140], [300, 270], [140, 60]]) {
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = toTexture(canvas);
  t.anisotropy = 4;
  return t;
}

// A stencilled code on steel: a big code and a line under it, the paint flaking.
function stencilTexture(code, line) {
  const { canvas, ctx } = makeCanvas(256, 112);
  ctx.clearRect(0, 0, 256, 112);
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, 256, 112);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#6a6656';
  ctx.font = 'bold 54px monospace';
  ctx.fillText(code, 128, 56);
  ctx.font = 'bold 18px monospace';
  ctx.fillText(line, 128, 92);
  // Flaking.
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 70; i++) {
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect((i * 67) % 256, (i * 41) % 112, 2 + ((i * 5) % 6), 2 + ((i * 3) % 4));
  }
  const t = toTexture(canvas);
  return t;
}
