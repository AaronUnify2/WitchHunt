// The abandoned campsite, drawn (M9.2; DESIGN.md "Abandoned campsite"):
// placeholder-plus props from data/campsite.json, laid out in the
// campsite's frame (world/clearingFrame.js).
//  - Two A-frame tents and a dome round a cold fire ring; folding chairs
//    (one knocked over), backpacks, a cooler (its lid lifts once it's
//    searched), a dead lantern.
//  - The far tent is slashed open from the inside: a dark slit and a
//    hanging flap on its far side, and blood behind it, so it's found
//    rather than presented.
//  - Stick figures hung high in the trees round the far edge, and X marks
//    cut into a few trunks: easy to miss on the way in.
//  - A thin wisp of smoke above the canopy (the last of the fire), seen
//    from the lookout tower on Day 1 for Junie's line; it's gone once
//    Tom has been to the camp.
// The static props are merged by colour (a handful of draw calls). Dull,
// dark colours: pale props glare under the torch (Aaron). No lights.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { frameToWorld, frameYaw, frameEdge } from '../world/clearingFrame.js';
import { makeCanvas, toTexture } from './proceduralTextures.js';

export class CampsiteProps {
  // cfg: config.campsite.look. data: data/campsite.json.
  constructor(cfg, data) {
    this.cfg = cfg;
    this.data = data;
    this.keep = [];
    this.parts = new Map(); // colour -> [geometry in world space]
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
    for (const s of d.props.sticks) this.stickFigure(s, c);
    for (const m of d.props.marks) this.markedTrunk(m, c);
    for (const [color, geos] of this.parts) {
      const geo = this.hold(mergeGeometries(geos));
      for (const g of geos) g.dispose();
      const mesh = new THREE.Mesh(geo, this.hold(new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide })));
      mesh.matrixAutoUpdate = false;
      this.group.add(mesh);
    }
    this.parts.clear();
    this.initSmoke(d.smoke);
    scene.add(this.group);
  }

  hold(x) {
    this.keep.push(x);
    return x;
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
    g.deleteAttribute('uv');
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
    g.translate(ox, oy, oz);
    this.add(g, color, at, opts);
  }

  // ---- the props -----------------------------------------------------------------------------

  aFrame(t) {
    const at = this.place(t.x, t.z, t.yaw);
    const L = this.cfg.tent;
    const shape = new THREE.Shape();
    shape.moveTo(-L.halfWidth, 0);
    shape.lineTo(0, L.height);
    shape.lineTo(L.halfWidth, 0);
    shape.lineTo(-L.halfWidth, 0);
    const g = new THREE.ExtrudeGeometry(shape, { depth: L.length, bevelEnabled: false });
    g.translate(0, 0, -L.length / 2);
    this.add(g, t.color, at);
    // The ridge pole and guy lines.
    this.boxAt(0.04, 0.04, L.length + 0.4, 0, L.height + 0.02, 0, this.cfg.colors.pole, at);
    const c = this.cfg.colors;
    if (t.slashed) {
      // Torn open from the inside on its far (+x) side: a dark slit down the
      // slope and a flap hanging out of it.
      const lean = Math.atan2(L.halfWidth, L.height);
      this.boxAt(0.05, L.height * 0.85, L.length * 0.5, L.halfWidth / 2 + 0.03, L.height / 2 - 0.05, 0.1, c.slit, at, { tilt: lean });
      this.boxAt(0.03, L.height * 0.45, L.length * 0.28, L.halfWidth / 2 + 0.3, L.height * 0.3, 0.35, t.color, at, { tilt: lean + 0.7 });
    }
  }

  dome(t) {
    const at = this.place(t.x, t.z, t.yaw);
    const L = this.cfg.dome;
    const g = new THREE.SphereGeometry(L.radius, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    g.scale(1, L.height / L.radius, 1);
    this.add(g, t.color, at);
    // The door: a darker panel, half unzipped.
    this.boxAt(0.62, 0.7, 0.03, 0, 0.38, -L.radius * 0.84, this.cfg.colors.slit, at, { pitch: -0.55 });
  }

  fireRing(f, c) {
    const at = this.place(f.x, f.z);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const g = new THREE.DodecahedronGeometry(0.17 + (i % 3) * 0.03, 0);
      g.scale(1, 0.7, 1);
      g.translate(Math.sin(a) * f.radius, 0.08, Math.cos(a) * f.radius);
      this.add(g, c.stone, at);
    }
    const ash = new THREE.CircleGeometry(f.radius * 0.85, 12).rotateX(-Math.PI / 2);
    this.add(ash, c.ash, at, { dy: 0.03 });
    for (const [a, l] of [[0.4, 0.9], [2.1, 0.8], [3.9, 0.7]]) {
      const log = new THREE.CylinderGeometry(0.06, 0.07, l, 6).rotateZ(Math.PI / 2).rotateY(a);
      log.translate(0, 0.09, 0);
      this.add(log, c.char, at);
    }
  }

  chair(ch, c) {
    const at = this.place(ch.x, ch.z, ch.yaw);
    const opts = ch.fallen ? { rotX: -Math.PI / 2 + 0.15, dy: 0.25 } : {};
    for (const sx of [-0.24, 0.24]) {
      for (const sz of [-0.22, 0.22]) this.boxAt(0.03, 0.45, 0.03, sx, 0.22, sz, c.frame, at, opts);
    }
    this.boxAt(0.5, 0.04, 0.46, 0, 0.45, 0, c.cloth, at, opts);
    this.boxAt(0.5, 0.42, 0.04, 0, 0.68, 0.22, c.cloth, at, opts);
  }

  pack(p, c) {
    const at = this.place(p.x, p.z, p.yaw);
    this.boxAt(0.36, 0.5, 0.24, 0, 0.25, 0, c.pack, at, { pitch: 0.2 });
    this.boxAt(0.3, 0.12, 0.22, 0, 0.52, -0.03, c.packFlap, at, { pitch: 0.2 });
  }

  cooler(p, c) {
    const at = this.place(p.x, p.z, p.yaw);
    this.boxAt(0.66, 0.38, 0.42, 0, 0.19, 0, c.cooler, at);
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

  lantern(p, c) {
    const at = this.place(p.x, p.z);
    this.boxAt(0.14, 0.24, 0.14, 0, 0.12, 0, c.frame, at, { tilt: 1.4, dy: 0.02 });
  }

  blood(b, c) {
    const at = this.place(b.x, b.z);
    const g = new THREE.CircleGeometry(b.r, 9).rotateX(-Math.PI / 2);
    g.scale(1, 1, 0.7);
    this.add(g, c.blood, at, { dy: 0.035 });
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
    const trunk = new THREE.CylinderGeometry(r * 0.85, r, 4.5, 8).translate(0, 2.25, 0);
    this.add(trunk, c.bark, at);
    for (const tilt of [0.6, -0.6]) this.boxAt(0.07, 0.75, 0.03, 0, 1.75, r * 0.95, c.cut, at, { tilt });
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

