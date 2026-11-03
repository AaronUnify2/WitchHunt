// The abandoned campsite, drawn (M9.2; DESIGN.md "Abandoned campsite";
// Session 19, style pass 2): props from data/campsite.json, laid out in
// the campsite's frame (world/clearingFrame.js).
//  - Two A-frame tents and a dome round a cold fire ring. The A-frames'
//    fabric sags between the poles and bellies in on the slopes; guy lines
//    run out to pegs. The dome is a little lumpy, its two poles crossing
//    over it.
//  - The fire ring: stones, ash, charred logs, a blackened scorch round
//    it, a grate across it and a coffee pot left on the grate.
//  - Folding chairs (one knocked over), backpacks with bedrolls, a cooler
//    (its lid lifts once it's searched), a dead lantern.
//  - Life before: a woodpile, a chopping stump with an axe in it, a
//    folding table with a camp stove, a clothesline with a towel and a
//    shirt, tins and bottles and paper plates in the grass.
//  - The far tent is slashed open from the inside: a dark slit and a
//    hanging flap on its far side, blood behind it, a sleeping bag dragged
//    half out of its door, so it's found rather than presented.
//  - X marks cut into a few trunks at the edge: easy to miss on the way in.
//  - A thin wisp of smoke above the canopy (the last of the fire), seen
//    from the lookout tower on Day 1 for Junie's line; it's gone once
//    Tom has been to the camp.
// Session 19: the static props are ONE vertex-coloured mesh, weathered as
// it's baked (render/propKit.js: grime from the ground up, mottling, rust
// on the metal): fewer draw calls than the old one-per-colour. Dull, dark
// colours: pale props glare under the torch (Aaron). No lights.

import * as THREE from 'three';
import { frameToWorld, frameYaw, frameEdge } from '../world/clearingFrame.js';
import { makeCanvas, toTexture } from './proceduralTextures.js';
import { bakeParts, noise3, weatherFor } from './propKit.js';

export class CampsiteProps {
  // cfg: config.campsite.look. data: data/campsite.json. weather: config.props.weather (shared).
  constructor(cfg, data, weather = null) {
    this.cfg = cfg;
    this.data = data;
    this.weather = weather ? weatherFor(weather, cfg.weather) : null;
    this.keep = [];
    this.parts = new Map(); // colour -> [geometry in world space]
    this.seed = 41;
  }

  // frame: the campsite's (clearingFrame). ground: heightAt(x, z).
  init(scene, frame, ground) {
    this.frame = frame;
    this.ground = ground;
    this.group = new THREE.Group();
    this.group.name = 'campsite';
    const d = this.data;
    const c = this.cfg.colors;
    for (const t of d.tents) (t.kind === 'dome' ? this.dome(t) : this.aFrame(t));
    this.fireRing(d.props.fire, c);
    for (const ch of d.props.chairs) this.chair(ch, c);
    for (const p of d.props.packs) this.pack(p, c);
    this.cooler(d.props.cooler, c);
    this.lantern(d.props.lantern, c);
    for (const b of d.props.blood) this.blood(b, c);
    for (const s of d.props.sticks ?? []) this.stickFigure(s, c); // Session 16 (Aaron): none now
    for (const m of d.props.marks) this.markedTrunk(m, c);
    const dr = d.props.dressing;
    if (dr) this.dressing(dr, c);
    const geo = bakeParts(this.parts, { weather: this.weather, baseAt: (x, y, z) => this.ground.heightAt(x, z), seed: 3 });
    this.parts.clear();
    if (geo) {
      const mesh = new THREE.Mesh(this.hold(geo), this.hold(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })));
      mesh.matrixAutoUpdate = false;
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }
    this.initSmoke(d.smoke);
    scene.add(this.group);
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

  // ---- placing parts ---------------------------------------------------------------------

  // A spot in the frame: world x, z, ground y and the yaw.
  place(x, z, yawDeg = 0) {
    const w = frameToWorld(this.frame, x, z);
    return { x: w.x, z: w.z, y: this.ground.heightAt(w.x, w.z), yaw: frameYaw(this.frame, yawDeg) };
  }

  // Add a geometry (in the prop's own frame) at a spot, turned, raised by dy.
  add(geo, color, at, { dy = 0, rotX = 0, rotZ = 0, extraYaw = 0 } = {}) {
    let g = geo.index ? geo.toNonIndexed() : geo;
    if (g !== geo) geo.dispose();
    if (g.getAttribute('uv')) g.deleteAttribute('uv');
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rotX, at.yaw + extraYaw, rotZ, 'YXZ'));
    m.compose(new THREE.Vector3(at.x, at.y + dy, at.z), q, new THREE.Vector3(1, 1, 1));
    g.applyMatrix4(m);
    if (!this.parts.has(color)) this.parts.set(color, []);
    this.parts.get(color).push(g);
  }

  // A box at an offset (ox, oy, oz) in the prop's own frame.
  boxAt(w, h, d, ox, oy, oz, color, at, opts = {}) {
    const g = new THREE.BoxGeometry(w, h, d);
    if (opts.tilt) g.rotateZ(opts.tilt);
    if (opts.pitch) g.rotateX(opts.pitch);
    if (opts.turn) g.rotateY(opts.turn);
    g.translate(ox, oy, oz);
    this.add(g, color, at, opts);
  }

  // A thin bar from a to b ([x, y, z] in the prop's own frame), r thick.
  barAt(a, b, r, color, at) {
    const from = new THREE.Vector3(...a);
    const to = new THREE.Vector3(...b);
    const len = from.distanceTo(to);
    const g = new THREE.BoxGeometry(r * 2, len, r * 2).translate(0, len / 2, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
    g.applyMatrix4(new THREE.Matrix4().compose(from, q, new THREE.Vector3(1, 1, 1)));
    this.add(g, color, at);
  }

  // A cylinder lying along the prop's local x (a log, a bedroll, a tin on its side).
  logAt(r, len, ox, oy, oz, color, at, { turn = 0, seg = 7, ends = null } = {}) {
    const g = new THREE.CylinderGeometry(r, r * 1.04, len, seg, 1, ends !== null).rotateZ(Math.PI / 2).rotateY(turn).translate(ox, oy, oz);
    this.add(g, color, at);
    if (ends !== null) {
      for (const s of [-1, 1]) {
        const cap = new THREE.CircleGeometry(r * 0.98, seg).rotateY((s * Math.PI) / 2).translate((s * len) / 2, 0, 0).rotateY(turn).translate(ox, oy, oz);
        this.add(cap, ends, at);
      }
    }
  }

  // ---- the tents -----------------------------------------------------------------------------

  // An A-frame: two fabric slopes off a ridge that sags between its poles,
  // the slopes bellying in; the end triangles, a door on the front; guy
  // lines and pegs at both ends and the corners.
  aFrame(t) {
    const at = this.place(t.x, t.z, t.yaw);
    const L = this.cfg.tent;
    const c = this.cfg.colors;
    const hw = L.halfWidth;
    const H = L.height;
    const half = L.length / 2;
    const segL = 8;
    const segS = 4;
    const ridgeSag = 0.09;
    const belly = 0.1;
    const pt = (side, u, v) => {
      // u: 0..1 along the length; v: 0 at the ridge, 1 at the hem.
      const z = -half + u * L.length;
      const sagU = Math.sin(Math.PI * u);
      const ry = H - ridgeSag * sagU;
      const x = side * hw * v * 1.02;
      let y = ry * (1 - v);
      // Belly: pulled in toward the tent's middle line, most mid-slope and mid-length.
      const b = belly * Math.sin(Math.PI * v) * (0.4 + 0.6 * sagU);
      const nx = side * Math.cos(Math.atan2(hw, H));
      const ny = Math.sin(Math.atan2(hw, H));
      return [x - nx * b, y - ny * b, z];
    };
    for (const side of [-1, 1]) {
      const verts = [];
      for (let i = 0; i < segL; i++) {
        for (let j = 0; j < segS; j++) {
          const a = pt(side, i / segL, j / segS);
          const b = pt(side, (i + 1) / segL, j / segS);
          const cc = pt(side, (i + 1) / segL, (j + 1) / segS);
          const d = pt(side, i / segL, (j + 1) / segS);
          verts.push(...a, ...b, ...cc, ...a, ...cc, ...d);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      g.computeVertexNormals();
      this.add(g, t.color, at);
    }
    // The ends: a triangle each; the front's door a darker triangle on it, its flap tied back.
    for (const s of [-1, 1]) {
      const tri = new THREE.BufferGeometry();
      const z = s * half;
      tri.setAttribute('position', new THREE.Float32BufferAttribute([-hw, 0, z, hw, 0, z, 0, H, z], 3));
      tri.computeVertexNormals();
      this.add(tri, t.color, at);
    }
    const door = new THREE.BufferGeometry();
    const dz = -half - 0.012;
    door.setAttribute('position', new THREE.Float32BufferAttribute([-hw * 0.5, 0, dz, hw * 0.5, 0, dz, 0, H * 0.82, dz], 3));
    door.computeVertexNormals();
    this.add(door, c.slit, at);
    this.boxAt(0.22, H * 0.55, 0.05, -hw * 0.42, H * 0.3, -half - 0.05, t.color, at, { tilt: 0.5 }); // the flap rolled aside
    // The poles: one at each end, the ridge between.
    for (const s of [-1, 1]) this.boxAt(0.035, H, 0.035, 0, H / 2, s * (half + 0.03), c.tentPole, at);
    this.barAt([0, H + 0.01, -half - 0.15], [0, H - ridgeSag + 0.01, 0], 0.012, c.tentPole, at);
    this.barAt([0, H - ridgeSag + 0.01, 0], [0, H + 0.01, half + 0.15], 0.012, c.tentPole, at);
    // Guy lines: from each pole's top out to a peg, and from the hem's corners.
    const out = this.cfg.guyOut;
    for (const s of [-1, 1]) {
      this.guy([0, H, s * (half + 0.03)], [0, 0, s * (half + out * 1.3)], at);
      for (const side of [-1, 1]) this.guy([side * hw, 0.05, s * half * 0.9], [side * (hw + out * 0.5), 0, s * (half + out * 0.3)], at);
    }
    if (t.slashed) {
      // Torn open from the inside on its far (+x) side: a dark slit down the
      // slope and a flap hanging out of it.
      const lean = Math.atan2(hw, H);
      this.boxAt(0.05, H * 0.85, L.length * 0.5, hw / 2 + 0.03, H / 2 - 0.05, 0.1, c.slit, at, { tilt: lean });
      this.boxAt(0.03, H * 0.45, L.length * 0.28, hw / 2 + 0.3, H * 0.3, 0.35, t.color, at, { tilt: lean + 0.7 });
      // A second, shorter rip, and a tatter on the ground below.
      this.boxAt(0.04, H * 0.35, 0.05, hw / 2 + 0.06, H * 0.55, -0.55, c.slit, at, { tilt: lean, turn: 0.4 });
      this.boxAt(0.4, 0.015, 0.22, hw + 0.35, 0.01, 0.4, t.color, at, { turn: 0.6 });
    }
  }

  // A guy line from a to b (prop-local) and its peg at b.
  guy(a, b, at) {
    const c = this.cfg.colors;
    this.barAt(a, [b[0], b[1] + 0.08, b[2]], 0.006, c.guy, at);
    this.boxAt(0.025, 0.16, 0.025, b[0], 0.05, b[2], c.peg, at, { tilt: 0.3 });
  }

  // A dome: a lumpy hemisphere (the fabric's slack), two poles crossing over
  // it, a door half unzipped, guy lines.
  dome(t) {
    const at = this.place(t.x, t.z, t.yaw);
    const L = this.cfg.dome;
    const c = this.cfg.colors;
    const g = new THREE.SphereGeometry(L.radius, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2);
    g.scale(1, L.height / L.radius, 1);
    const p = g.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      if (y < 0.02) continue; // the hem stays on the ground
      const k = 1 - 0.07 * noise3(x * 2.2 + 5, y * 2.2, z * 2.2);
      p.setXYZ(i, x * k, y * k, z * k);
    }
    g.computeVertexNormals();
    this.add(g, t.color, at);
    // The poles, two arcs crossing at the top.
    for (const turn of [Math.PI / 4, -Math.PI / 4]) {
      const pts = [];
      for (let i = 0; i <= 10; i++) {
        const a = (i / 10) * Math.PI;
        pts.push(new THREE.Vector3(Math.cos(a) * L.radius * 1.01, Math.sin(a) * L.height * 1.02, 0));
      }
      const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.014, 4, false).rotateY(turn);
      this.add(tube, c.tentPole, at);
    }
    // The door: a darker panel, half unzipped.
    this.boxAt(0.62, 0.7, 0.03, 0, 0.38, -L.radius * 0.84, c.slit, at, { pitch: -0.55 });
    const out = this.cfg.guyOut;
    for (const a of [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4]) {
      const sx = Math.cos(a);
      const sz = Math.sin(a);
      this.guy([sx * L.radius * 0.72, L.height * 0.68, sz * L.radius * 0.72], [sx * (L.radius + out), 0, sz * (L.radius + out)], at);
    }
  }

  // ---- the fire ------------------------------------------------------------------------------

  fireRing(f, c) {
    const at = this.place(f.x, f.z);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const g = new THREE.DodecahedronGeometry(0.17 + (i % 3) * 0.03, 0);
      g.scale(1, 0.7, 1);
      g.rotateY(i * 1.3);
      g.translate(Math.sin(a) * f.radius, 0.08, Math.cos(a) * f.radius);
      this.add(g, c.stone, at);
    }
    const ash = new THREE.CircleGeometry(f.radius * 0.85, 12).rotateX(-Math.PI / 2);
    this.add(ash, c.ash, at, { dy: 0.03 });
    const scorchR = this.data.props.dressing?.scorch;
    if (scorchR) {
      // A ragged blackened ring round the stones.
      const g = new THREE.CircleGeometry(scorchR, 18).rotateX(-Math.PI / 2);
      const p = g.getAttribute('position');
      for (let i = 1; i < p.count; i++) {
        const k = 0.8 + 0.35 * noise3(p.getX(i) * 1.7, 0, p.getZ(i) * 1.7);
        p.setX(i, p.getX(i) * k);
        p.setZ(i, p.getZ(i) * k);
      }
      this.add(g, c.scorch, at, { dy: 0.02 });
    }
    for (const [a, l] of [[0.4, 0.9], [2.1, 0.8], [3.9, 0.7], [5.2, 0.55]]) {
      const log = new THREE.CylinderGeometry(0.06, 0.07, l, 6).rotateZ(Math.PI / 2 - 0.12).rotateY(a);
      log.translate(Math.cos(a) * 0.1, 0.1, -Math.sin(a) * 0.1);
      this.add(log, c.char, at);
    }
    // A grate across two stones and a coffee pot left on it.
    for (let i = -2; i <= 2; i++) this.boxAt(0.012, 0.012, f.radius * 1.5, i * 0.08, 0.24, 0.1, c.grate, at, { turn: 0.3 });
    this.boxAt(0.4, 0.015, 0.02, 0, 0.24, 0.1 - f.radius * 0.7, c.grate, at, { turn: 0.3 });
    this.boxAt(0.4, 0.015, 0.02, 0, 0.24, 0.1 + f.radius * 0.7, c.grate, at, { turn: 0.3 });
    const pot = new THREE.CylinderGeometry(0.07, 0.09, 0.2, 8).translate(0.05, 0.35, 0.15);
    this.add(pot, c.pot, at);
    this.barAt([0.13, 0.36, 0.15], [0.2, 0.44, 0.15], 0.012, c.pot, at); // the spout
    this.boxAt(0.02, 0.12, 0.02, -0.04, 0.37, 0.15, c.pot, at); // the handle
  }

  // ---- the camp ------------------------------------------------------------------------------

  chair(ch, c) {
    const at = this.place(ch.x, ch.z, ch.yaw);
    const opts = ch.fallen ? { rotX: -Math.PI / 2 + 0.15, dy: 0.25 } : {};
    // The folding frame: crossed legs each side, armrests.
    for (const sx of [-0.24, 0.24]) {
      this.boxAt(0.025, 0.55, 0.025, sx, 0.24, 0, c.frame, at, { ...opts, pitch: 0.6 });
      this.boxAt(0.025, 0.55, 0.025, sx, 0.24, 0, c.frame, at, { ...opts, pitch: -0.6 });
      this.boxAt(0.03, 0.03, 0.42, sx, 0.62, 0.02, c.frame, at, opts);
    }
    this.boxAt(0.5, 0.03, 0.44, 0, 0.45, 0, c.cloth, at, { ...opts, pitch: 0.06 });
    this.boxAt(0.5, 0.42, 0.03, 0, 0.68, 0.22, c.cloth, at, { ...opts, pitch: -0.15 });
  }

  pack(p, c) {
    const at = this.place(p.x, p.z, p.yaw);
    this.boxAt(0.36, 0.5, 0.24, 0, 0.25, 0, c.pack, at, { pitch: 0.2 });
    this.boxAt(0.3, 0.12, 0.22, 0, 0.52, -0.03, c.packFlap, at, { pitch: 0.2 });
    this.boxAt(0.24, 0.18, 0.06, 0, 0.2, -0.15, c.packFlap, at, { pitch: 0.2 }); // a front pocket
    for (const sx of [-0.11, 0.11]) this.boxAt(0.04, 0.42, 0.02, sx, 0.28, 0.14, c.packFlap, at, { pitch: 0.2 }); // straps
    this.logAt(0.08, 0.46, 0, 0.6, 0.06, c.sleepingBag, at); // a bedroll on top
  }

  cooler(p, c) {
    const at = this.place(p.x, p.z, p.yaw);
    this.boxAt(0.66, 0.38, 0.42, 0, 0.19, 0, c.cooler, at);
    for (const sx of [-0.35, 0.35]) this.boxAt(0.04, 0.05, 0.16, sx, 0.3, 0, c.frame, at); // the handles
    // The lid: its own mesh, so it can lift once the cooler's searched.
    const lid = new THREE.Mesh(this.hold(new THREE.BoxGeometry(0.68, 0.07, 0.44).translate(0, 0.035, 0.22)), this.hold(new THREE.MeshLambertMaterial({ color: c.coolerLid })));
    const pivot = new THREE.Group();
    pivot.position.set(at.x, at.y + 0.38, at.z);
    pivot.rotation.y = at.yaw;
    const hinge = new THREE.Group();
    hinge.position.set(0, 0, -0.22);
    hinge.add(lid);
    pivot.add(hinge);
    this.group.add(pivot);
    this.lid = hinge;
  }

  // A dead lantern on its side: a base, a dark glass cage, a cap and its bail.
  lantern(p, c) {
    const at = this.place(p.x, p.z, 30);
    const o = { rotZ: 1.45, dy: 0.08 };
    this.add(new THREE.CylinderGeometry(0.07, 0.08, 0.06, 8).translate(0, -0.08, 0), c.frame, at, o);
    this.add(new THREE.CylinderGeometry(0.055, 0.055, 0.14, 8).translate(0, 0.02, 0), c.slit, at, o);
    this.add(new THREE.ConeGeometry(0.075, 0.07, 8).translate(0, 0.125, 0), c.frame, at, o);
    this.add(new THREE.TorusGeometry(0.07, 0.006, 4, 10, Math.PI).translate(0, 0.16, 0), c.frame, at, o);
  }

  blood(b, c) {
    const at = this.place(b.x, b.z);
    const g = new THREE.CircleGeometry(b.r, 11).rotateX(-Math.PI / 2);
    g.scale(1, 1, 0.7);
    const p = g.getAttribute('position');
    for (let i = 1; i < p.count; i++) {
      const k = 0.7 + 0.5 * noise3(p.getX(i) * 4 + b.x, 0, p.getZ(i) * 4 + b.z);
      p.setX(i, p.getX(i) * k);
      p.setZ(i, p.getZ(i) * k);
    }
    this.add(g, c.blood, at, { dy: 0.035 });
  }

  // The rest of the camp (data: props.dressing).
  dressing(dr, c) {
    if (dr.woodpile) {
      const at = this.place(dr.woodpile.x, dr.woodpile.z, dr.woodpile.yaw);
      const rows = [4, 3, 2];
      rows.forEach((n, r) => {
        for (let i = 0; i < n; i++) {
          const x = (i - (n - 1) / 2) * 0.2;
          this.logAt(0.085 + this.range(-0.015, 0.015), 0.7 + this.range(-0.06, 0.06), 0, 0.09 + r * 0.16, x, c.wood, at, { turn: Math.PI / 2 + this.range(-0.08, 0.08), ends: c.woodEnd });
        }
      });
      this.logAt(0.07, 0.6, 0.55, 0.07, 0.1, c.wood, at, { turn: 1.1, ends: c.woodEnd }); // one rolled off
    }
    if (dr.stump) {
      const at = this.place(dr.stump.x, dr.stump.z, dr.stump.yaw);
      this.add(new THREE.CylinderGeometry(0.3, 0.36, 0.45, 9).translate(0, 0.22, 0), c.stump, at);
      this.add(new THREE.CircleGeometry(0.29, 9).rotateX(-Math.PI / 2).translate(0, 0.452, 0), c.woodEnd, at);
      // The axe: its head bitten into the top, the handle up at an angle.
      this.boxAt(0.18, 0.1, 0.03, 0.02, 0.47, 0, c.axeHead, at, { tilt: -0.3 });
      this.barAt([0.08, 0.48, 0], [0.62, 0.86, 0.04], 0.018, c.axeHandle, at);
      // Split pieces and chips round it.
      for (let i = 0; i < 5; i++) {
        const a = this.range(0, Math.PI * 2);
        const r = this.range(0.45, 0.8);
        this.boxAt(0.08, 0.04, this.range(0.12, 0.3), Math.cos(a) * r, 0.02, Math.sin(a) * r, c.woodEnd, at, { turn: this.range(0, 3) });
      }
    }
    if (dr.table) {
      const at = this.place(dr.table.x, dr.table.z, dr.table.yaw);
      this.boxAt(0.9, 0.035, 0.55, 0, 0.7, 0, c.table, at);
      for (const sx of [-0.4, 0.4]) {
        this.boxAt(0.025, 0.78, 0.025, sx, 0.35, 0, c.frame, at, { pitch: 0.42 });
        this.boxAt(0.025, 0.78, 0.025, sx, 0.35, 0, c.frame, at, { pitch: -0.42 });
      }
      // A two-burner stove, its lid up as a windshield.
      this.boxAt(0.5, 0.1, 0.28, -0.12, 0.77, 0, c.stove, at);
      this.boxAt(0.5, 0.26, 0.02, -0.12, 0.95, 0.15, c.stove, at, { pitch: -0.15 });
      for (const sx of [-0.24, 0]) this.add(new THREE.CylinderGeometry(0.06, 0.06, 0.01, 8).translate(sx, 0.83, 0), c.grate, at);
      this.add(new THREE.CylinderGeometry(0.035, 0.035, 0.18, 8).translate(0.3, 0.81, -0.1), c.tin, at); // a fuel can
      this.add(new THREE.CylinderGeometry(0.05, 0.045, 0.1, 8).translate(0.3, 0.77, 0.14), c.pot, at); // a mug
    }
    if (dr.clothesline) {
      const A = dr.clothesline.a;
      const B = dr.clothesline.b;
      const yaw = (Math.atan2(B.x - A.x, B.z - A.z) * 180) / Math.PI;
      const at = this.place(A.x, A.z, yaw);
      const len = Math.hypot(B.x - A.x, B.z - A.z);
      const yB = this.place(B.x, B.z).y - at.y;
      const top = 1.75;
      this.add(new THREE.CylinderGeometry(0.035, 0.045, top + 0.1, 6).translate(0, top / 2, 0), c.stump, at);
      this.add(new THREE.CylinderGeometry(0.035, 0.045, top + 0.1, 6).translate(0, yB + top / 2, len), c.stump, at);
      // The line, sagging, as a few short bars.
      const sag = 0.22;
      const yAt = (t) => top + yB * t - Math.sin(Math.PI * t) * sag;
      const n = 6;
      for (let i = 0; i < n; i++) {
        const t0 = i / n;
        const t1 = (i + 1) / n;
        this.barAt([0, yAt(t0), t0 * len], [0, yAt(t1), t1 * len], 0.006, c.line, at);
      }
      // A towel, then a shirt, pegged on.
      const t1 = 0.35;
      this.boxAt(0.02, 0.6, 0.45, 0, yAt(t1) - 0.3, t1 * len, c.towel, at, { tilt: 0.05 });
      const t2 = 0.66;
      const y2 = yAt(t2);
      this.boxAt(0.02, 0.5, 0.42, 0, y2 - 0.27, t2 * len, c.shirt, at, { tilt: -0.04 });
      for (const s of [-1, 1]) this.boxAt(0.02, 0.24, 0.12, 0, y2 - 0.14, t2 * len + s * 0.26, c.shirt, at, { pitch: s * 0.5 });
    }
    if (dr.sleepingBag) {
      const at = this.place(dr.sleepingBag.x, dr.sleepingBag.z, dr.sleepingBag.yaw);
      // Dragged out of the torn tent's door: twisted, the lining turned out at the top.
      this.logAt(0.16, 1.5, 0, 0.1, 0, c.sleepingBag, at, { turn: Math.PI / 2 + 0.15, seg: 8 });
      this.boxAt(0.34, 0.04, 0.4, 0.05, 0.12, 0.8, c.bagLining, at, { turn: 0.3, pitch: 0.2 });
    }
    for (const l of dr.litter ?? []) {
      const at = this.place(l.x, l.z, this.range(0, 360));
      if (l.kind === 'tin') {
        this.logAt(0.035, 0.1, 0, 0.035, 0, c.tin, at);
        this.logAt(0.036, 0.06, 0, 0.035, 0, c.tinLabel, at);
      } else if (l.kind === 'bottle') {
        this.logAt(0.035, 0.18, 0, 0.035, 0, c.bottle, at);
        this.logAt(0.013, 0.08, 0.12, 0.035, 0, c.bottle, at);
      } else {
        this.add(new THREE.CylinderGeometry(0.11, 0.1, 0.012, 10), c.paper, at, { dy: 0.012, rotX: this.range(-0.1, 0.1) });
      }
    }
  }

  // A stick figure hung from a branch high over the far edge, turning a little.
  stickFigure(s, c) {
    const w = frameEdge(this.frame, s.angle, s.out);
    const at = { x: w.x, z: w.z, y: this.ground.heightAt(w.x, w.z), yaw: frameYaw(this.frame, s.angle + 180) };
    const h = s.height;
    this.boxAt(0.008, 1.6, 0.008, 0, h + 0.8, 0, c.twine, at);
    this.boxAt(0.05, 0.7, 0.05, 0, h - 0.35, 0, c.stick, at);
    this.boxAt(0.55, 0.04, 0.04, 0, h - 0.2, 0, c.stick, at);
    for (const side of [-1, 1]) this.boxAt(0.04, 0.45, 0.04, side * 0.1, h - 0.85, 0, c.stick, at, { tilt: side * 0.35 });
    this.boxAt(0.14, 0.14, 0.05, 0, h + 0.05, 0, c.stick, at); // a knot of twigs for the head
  }

  // A trunk at the edge with an X cut into the bark, facing the camp.
  markedTrunk(m, c) {
    const w = frameEdge(this.frame, m.angle, m.out);
    const at = { x: w.x, z: w.z, y: this.ground.heightAt(w.x, w.z), yaw: frameYaw(this.frame, m.angle + 180) };
    const r = this.cfg.trunkRadius;
    const trunk = new THREE.CylinderGeometry(r * 0.85, r * 1.1, 4.5, 9, 3).translate(0, 2.25, 0);
    this.add(trunk, c.bark, at);
    for (const tilt of [0.6, -0.6]) this.boxAt(0.07, 0.75, 0.03, 0, 1.75, r * 0.95, c.cut, at, { tilt });
    // Bark chips at its foot.
    for (let i = 0; i < 3; i++) this.boxAt(0.06, 0.015, 0.04, this.range(-0.3, 0.3), 0.01, r + this.range(0.1, 0.4), c.cut, at, { turn: this.range(0, 3) });
  }

  // ---- the smoke ------------------------------------------------------------------------------

  initSmoke(s) {
    const tex = this.hold(smokeTexture());
    const mat = this.hold(new THREE.SpriteMaterial({ map: tex, color: s.color, transparent: true, opacity: s.opacity, depthWrite: false }));
    const base = frameToWorld(this.frame, s.x, s.z);
    this.smokeBase = { x: base.x, y: this.ground.heightAt(base.x, base.z), z: base.z };
    this.smoke = [];
    this.smokeCfg = s;
    this.smokeGroup = new THREE.Group();
    for (let i = 0; i < s.puffs; i++) {
      const sprite = new THREE.Sprite(mat.clone());
      this.hold(sprite.material);
      this.smokeGroup.add(sprite);
      this.smoke.push({ sprite, t: i / s.puffs });
    }
    this.group.add(this.smokeGroup);
    this.smokeTime = 0;
  }

  setSmoke(on) {
    this.smokeGroup.visible = on;
  }

  // ---- each frame ----------------------------------------------------------------------------------

  update(dt, coolerOpen) {
    if (this.lid) {
      const want = coolerOpen ? -1.9 : 0;
      this.lid.rotation.x += (want - this.lid.rotation.x) * Math.min(1, dt * 6);
    }
    if (!this.smokeGroup.visible) return;
    const s = this.smokeCfg;
    this.smokeTime += dt;
    for (const p of this.smoke) {
      p.t = (p.t + (dt * s.rise) / s.height * 1.5) % 1;
      const k = p.t;
      // Rising and leaning off with the breeze, widening, fading at both ends.
      const sway = Math.sin(this.smokeTime * 0.3 + k * 4) * 1.2 * k;
      p.sprite.position.set(this.smokeBase.x + k * k * 6 + sway, this.smokeBase.y + 1 + k * s.height, this.smokeBase.z + k * 2);
      const size = s.width * (0.6 + k * 2.2);
      p.sprite.scale.set(size, size, 1);
      p.sprite.material.opacity = s.opacity * Math.min(1, k * 6) * (1 - k);
    }
  }

  dispose() {
    this.group?.removeFromParent();
    for (const x of this.keep) x.dispose?.();
  }
}

// A soft grey puff.
function smokeTexture() {
  const { canvas, ctx } = makeCanvas(64, 64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return toTexture(canvas);
}
