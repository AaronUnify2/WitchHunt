// The 1903 railway line, drawn (Session 21, M10.2; world/railway.js has the
// line, world/GroundField.js its bed and grade). A century abandoned:
//  - Rusted rails on rotten ties, half sunk in the ballast: whole stretches
//    of rail buried or gone, ties rotted away or kicked askew.
//  - The old telegraph line along its north side: poles leaning every way,
//    some down in the brush, glass insulators on their crossarms, a few
//    spans of wire still sagging between them.
//  - Where a pathway crosses it, a crossing: planks laid between the rails,
//    a crossbuck (RAILROAD CROSSING) and the old warning on a board (LOOK
//    OUT FOR THE CARS), and a W post (whistle) either side up the line.
//  - At each edge of the map a stone tunnel portal, 1903 cut in its
//    keystone, its bore fallen in: rock and earth to the crown.
// The young trees and brush on its bed are the forest's (render/Forest.js,
// via the ground's regrowth). Same every run (the line is fixed), drawn
// from a fixed seed. One vertex-coloured mesh per stretch (culled with
// distance), the poles instanced, the boards sharing two textures.

import * as THREE from 'three';
import { bakeParts, noise3, weatherFor } from './propKit.js';
import { makeCanvas, toTexture, css } from './proceduralTextures.js';
import { ChunkCuller } from './ChunkCuller.js';
import { railFrame, railCrossings } from '../world/railway.js';
import { Rng } from '../core/Rng.js';

const STRETCH = 64; // metres of line per mesh

export class Railway {
  // cfg: config.map.railway (look inside). weather: config.props.weather.
  constructor(cfg, weather = null) {
    this.cfg = cfg;
    this.k = cfg.look;
    this.weather = weather ? weatherFor(weather, this.k.weather) : null;
    this.rng = new Rng('railway-1903');
    this.keep = [];
  }

  // line: the map's railway. paths: the map's pathways (crossings). ground: heightAt.
  init(scene, colliders, line, paths, ground, geo) {
    this.line = line;
    this.ground = ground;
    this.geo = geo;
    this.group = new THREE.Group();
    this.group.name = 'railway';
    this.culler = new ChunkCuller(STRETCH * 2, 8);
    this.material = this.hold(new THREE.MeshLambertMaterial({ vertexColors: true }));
    this.crossings = railCrossings(line, paths).filter((c) => c.x > geo.walk.xMin - 10 && c.x < geo.walk.xMax + 10);
    // Only what's in or near the walkable area is drawn (the tunnels sit just beyond it).
    const start = Math.max(0, this.alongAtX(geo.walk.xMin - 30));
    const end = Math.min(line.length, this.alongAtX(geo.walk.xMax + 30));
    for (let d0 = start; d0 < end; d0 += STRETCH) this.stretch(d0, Math.min(end, d0 + STRETCH));
    this.buildPoles(colliders, start, end);
    this.buildBoards(colliders);
    for (const t of line.tunnels) this.tunnel(t, colliders);
    scene.add(this.group);
  }

  hold(x) {
    this.keep.push(x);
    return x;
  }

  alongAtX(x) {
    const pts = this.line.points;
    for (let i = 1; i < pts.length; i++) if (pts[i].x >= x) return this.line.along[i - 1] + (x - pts[i - 1].x);
    return this.line.length;
  }

  // ---- rails, ties and crossings ---------------------------------------------------------------------

  stretch(d0, d1) {
    const k = this.k;
    const c = this.cfg;
    const parts = new Map();
    const put = (geo, color, x, y, z, yaw = 0, rx = 0, rz = 0) => {
      const g = geo.index ? geo.toNonIndexed() : geo;
      if (g !== geo) geo.dispose();
      g.deleteAttribute('uv');
      g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, yaw, rz, 'YXZ')), new THREE.Vector3(1, 1, 1)));
      if (!parts.has(color)) parts.set(color, []);
      parts.get(color).push(g);
    };
    const gy = (x, z) => this.ground.heightAt(x, z);
    const half = c.gauge / 2;
    // Ties, one every tieSpacing; some rotted away, some kicked askew, all half sunk.
    for (let d = d0; d < d1; d += c.tieSpacing) {
      const n = noise3(d * 0.23, 3.1, 0.7);
      if (n < c.tiesGone) continue;
      const f = railFrame(this.line, d);
      const yaw = Math.atan2(f.tx, f.tz) + Math.PI / 2 + (this.rng.next() - 0.5) * (n < c.tiesGone + 0.12 ? 0.6 : 0.08);
      const sink = 0.06 + this.rng.next() * 0.08;
      put(new THREE.BoxGeometry(c.tieLength, 0.16, 0.22), n < 0.45 ? k.tieDark : k.tie, f.x, gy(f.x, f.z) - sink, f.z, yaw);
    }
    // The rails: two lines of short pieces, rusted; buried or gone where the noise says.
    const step = 3;
    for (const side of [-1, 1]) {
      for (let d = d0; d < d1; d += step) {
        const gone = noise3(d * 0.031, side * 5.3, 1.9);
        if (gone < c.railsGone) continue;
        const a = railFrame(this.line, d);
        const b = railFrame(this.line, Math.min(d1, d + step));
        const ax = a.x + a.rx * side * half;
        const az = a.z + a.rz * side * half;
        const bx = b.x + b.rx * side * half;
        const bz = b.z + b.rz * side * half;
        const len = Math.hypot(bx - ax, bz - az);
        if (len < 0.1) continue;
        const sunk = gone < c.railsGone + 0.08 ? 0.09 : 0; // nearly buried at the edges of a gap
        const ya = gy(ax, az) + 0.08 - sunk;
        const yb = gy(bx, bz) + 0.08 - sunk;
        const pitch = Math.atan2(yb - ya, len);
        put(new THREE.BoxGeometry(0.07, 0.11, len + 0.02), k.rail, (ax + bx) / 2, (ya + yb) / 2, (az + bz) / 2, Math.atan2(bx - ax, bz - az), -pitch);
      }
    }
    // Crossings in this stretch: planks between and beside the rails.
    for (const x of this.crossings) {
      if (x.along < d0 || x.along >= d1) continue;
      const f = railFrame(this.line, x.along);
      const yaw = Math.atan2(f.tx, f.tz);
      for (let i = -3; i <= 3; i++) {
        const px = f.x + f.tx * i * 0.36;
        const pz = f.z + f.tz * i * 0.36;
        put(new THREE.BoxGeometry(c.gauge + 1.4, 0.06, 0.3), i % 3 ? k.plank : k.plankDark, px, gy(px, pz) + 0.07, pz, yaw + Math.PI / 2 + (this.rng.next() - 0.5) * 0.05);
      }
    }
    const geo = bakeParts(parts, { weather: this.weather, baseAt: (x, y, z) => gy(x, z) - 0.2, seed: 1903 });
    if (!geo) return;
    this.hold(geo);
    const mesh = new THREE.Mesh(geo, this.material);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    mesh.matrixAutoUpdate = false;
    this.group.add(mesh);
    geo.computeBoundingSphere();
    const s = geo.boundingSphere;
    this.culler.add(mesh, s.center.x, s.center.z, s.radius);
  }

  // ---- the telegraph line --------------------------------------------------------------------------

  buildPoles(colliders, d0, d1) {
    const k = this.k;
    const pc = this.cfg.poles;
    const spots = [];
    for (let d = d0 + pc.spacing / 2; d < d1; d += pc.spacing * (0.85 + this.rng.next() * 0.3)) {
      const f = railFrame(this.line, d);
      // Session 27: through the railway cutting the line runs along the top of its bank, not the face.
      const cut = this.ground?.cutting;
      const cc = this.ground?.mapCfg?.railway?.cutting;
      const inCut = cut && cc && Math.abs(d - cut.along) < cc.length + cc.nose * 0.7;
      const off = inCut ? cc.floorHalf + cc.faceRun + 7 : pc.offset; // behind the powder store, which stands on the bank top
      const x = f.x + f.rx * pc.side * off;
      const z = f.z + f.rz * pc.side * off;
      // Keep off the crossings.
      if (this.crossings.some((c) => Math.hypot(c.x - x, c.z - z) < 6)) continue;
      const roll = this.rng.next();
      const down = roll < pc.down;
      const lean = down ? 1.45 + this.rng.next() * 0.1 : (roll < pc.down + pc.leaning ? 0.15 + this.rng.next() * 0.3 : this.rng.next() * 0.06);
      spots.push({ x, z, d, yaw: Math.atan2(f.tx, f.tz), lean, leanDir: this.rng.next() * Math.PI * 2, down });
    }
    // One pole: the post, its crossarm, four insulators.
    const g = [];
    g.push(new THREE.CylinderGeometry(pc.radius * 0.75, pc.radius, pc.height, 6).translate(0, pc.height / 2, 0));
    g.push(new THREE.BoxGeometry(pc.arm, 0.1, 0.1).translate(0, pc.height - 0.45, 0));
    for (const s of [-0.42, -0.18, 0.18, 0.42]) g.push(new THREE.CylinderGeometry(0.03, 0.045, 0.11, 5).translate(pc.arm * s, pc.height - 0.33, 0));
    const merged = mergeFlat(g);
    this.hold(merged);
    this.poleMaterial = this.hold(new THREE.MeshLambertMaterial({ color: k.pole }));
    this.poles = new THREE.InstancedMesh(merged, this.poleMaterial, Math.max(1, spots.length));
    this.poles.count = spots.length;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const tilt = new THREE.Quaternion();
    const wire = [];
    let prev = null;
    spots.forEach((s, i) => {
      const y = this.ground.heightAt(s.x, s.z) - 0.4;
      // Lean about a level axis turned leanDir, then face the line (the arm across it).
      const axis = new THREE.Vector3(Math.cos(s.leanDir), 0, Math.sin(s.leanDir));
      tilt.setFromAxisAngle(axis, s.lean);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.yaw + Math.PI / 2);
      m.compose(new THREE.Vector3(s.x, y, s.z), tilt.multiply(q), new THREE.Vector3(1, 1, 1));
      this.poles.setMatrixAt(i, m);
      if (!s.down) colliders?.insert({ x: s.x, z: s.z, r: pc.radius * 1.5, top: y + pc.height });
      // A span of wire to the last pole when both stand and the noise keeps it.
      const top = new THREE.Vector3(0, pc.height - 0.35, 0).applyMatrix4(m);
      if (prev && !s.down && !prev.down && noise3(s.d * 0.02, 9, 2) > pc.wiresGone) {
        const a = prev.top;
        const b = top;
        for (let w = 0; w < 8; w++) {
          for (const t of [w / 8, (w + 1) / 8]) wire.push(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t - 4 * pc.sag * t * (1 - t), a.z + (b.z - a.z) * t);
        }
      }
      prev = { top, down: s.down };
    });
    this.poles.castShadow = true;
    this.poles.computeBoundingSphere();
    this.group.add(this.poles);
    if (wire.length) {
      const wg = this.hold(new THREE.BufferGeometry());
      wg.setAttribute('position', new THREE.Float32BufferAttribute(wire, 3));
      this.wires = new THREE.LineSegments(wg, this.hold(new THREE.LineBasicMaterial({ color: k.wire })));
      this.group.add(this.wires);
    }
  }

  // ---- crossbucks and whistle posts ------------------------------------------------------------------

  buildBoards(colliders) {
    const k = this.k;
    const c = this.cfg;
    const boardTex = this.hold(paintTexture(512, 96, (ctx, w, h) => {
      ctx.fillStyle = css(k.boardPaint);
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = css(k.boardInk);
      ctx.font = 'bold 58px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('RAILROAD', w * 0.27, h * 0.55);
      ctx.fillText('CROSSING', w * 0.75, h * 0.55);
      weather(ctx, w, h);
    }));
    const warnTex = this.hold(paintTexture(384, 192, (ctx, w, h) => {
      ctx.fillStyle = css(k.boardPaint);
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = css(k.boardInk);
      ctx.lineWidth = 6;
      ctx.strokeRect(8, 8, w - 16, h - 16);
      ctx.fillStyle = css(k.boardInk);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 44px serif';
      ctx.fillText('LOOK OUT', w / 2, h * 0.32);
      ctx.font = 'bold 34px serif';
      ctx.fillText('FOR THE CARS', w / 2, h * 0.68);
      weather(ctx, w, h);
    }));
    const wTex = this.hold(paintTexture(128, 128, (ctx, w, h) => {
      ctx.fillStyle = css(k.boardPaint);
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = css(k.boardInk);
      ctx.font = 'bold 96px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('W', w / 2, h * 0.56);
      weather(ctx, w, h);
    }));
    const boardMat = this.hold(new THREE.MeshLambertMaterial({ map: boardTex }));
    const warnMat = this.hold(new THREE.MeshLambertMaterial({ map: warnTex }));
    const wMat = this.hold(new THREE.MeshLambertMaterial({ map: wTex }));
    const postMat = this.hold(new THREE.MeshLambertMaterial({ color: k.post }));
    const board = this.hold(new THREE.BoxGeometry(2.4, 0.42, 0.05));
    const post = this.hold(new THREE.BoxGeometry(0.16, 3.4, 0.16).translate(0, 1.7, 0));
    const warn = this.hold(new THREE.PlaneGeometry(1.1, 0.55));
    const wBoard = this.hold(new THREE.PlaneGeometry(0.5, 0.5));
    const wPost = this.hold(new THREE.BoxGeometry(0.12, 1.6, 0.12).translate(0, 0.8, 0));
    const gy = (x, z) => this.ground.heightAt(x, z);
    for (const x of this.crossings) {
      // The crossbuck on the pathway's right, before the rails, leaning a little; facing along the pathway.
      for (const side of [1, -1]) {
        const dir = side; // one each side of the line, facing the walker coming toward it
        const back = c.crossbuckBack;
        // Before the rails, on the walker's right ((-tz, tx) on the map as they face (tx, tz)).
        const px = x.x - x.tx * dir * back - x.tz * dir * 2.6;
        const pz = x.z - x.tz * dir * back + x.tx * dir * 2.6;
        const holder = new THREE.Group();
        holder.position.set(px, gy(px, pz) - 0.1, pz);
        holder.rotation.set(0, Math.atan2(-x.tx * dir, -x.tz * dir), (this.rng.next() - 0.5) * 0.12);
        const p = new THREE.Mesh(post, postMat);
        holder.add(p);
        for (const s of [-1, 1]) {
          const b = new THREE.Mesh(board, [postMat, postMat, postMat, postMat, boardMat, boardMat]);
          b.position.set(0, 2.9, 0.1);
          b.rotation.z = s * 0.72;
          holder.add(b);
        }
        // The old warning board under the X, on the near-side post only.
        if (side === 1) {
          const wb = new THREE.Mesh(warn, warnMat);
          wb.position.set(0, 1.85, 0.1);
          holder.add(wb);
        }
        this.group.add(holder);
        this.culler.add(holder, px, pz, 3);
        colliders?.insert({ x: px, z: pz, r: 0.15, vr: 1.2, top: gy(px, pz) + 3.4 });
      }
      // W posts up and down the line, by the rails.
      for (const dir of [-1, 1]) {
        const f = railFrame(this.line, x.along + dir * c.whistleBack);
        const side = this.cfg.poles.side * -1; // the far side from the telegraph line
        const wx = f.x + f.rx * side * 2.6;
        const wz = f.z + f.rz * side * 2.6;
        const holder = new THREE.Group();
        holder.position.set(wx, gy(wx, wz) - 0.05, wz);
        holder.rotation.set(0, Math.atan2(-f.tx * dir, -f.tz * dir) + Math.PI, (this.rng.next() - 0.5) * 0.15);
        holder.add(new THREE.Mesh(wPost, postMat));
        const wb = new THREE.Mesh(wBoard, wMat);
        wb.position.set(0, 1.4, 0.07);
        holder.add(wb);
        this.group.add(holder);
        this.culler.add(holder, wx, wz, 2);
      }
    }
  }

  // ---- the collapsed tunnels -------------------------------------------------------------------------

  tunnel(t, colliders) {
    const k = this.k;
    const tc = this.cfg.tunnelLook;
    const parts = new Map();
    // A frame facing into the map: ahead (facing, 0); across (0, -facing), the
    // way a box's own x turns when it's turned to face ahead.
    const fx = t.facing;
    const rz = -t.facing;
    const at = (lr, ahead) => ({ x: t.x + fx * ahead, z: t.z + rz * lr });
    const base = Math.min(...[-3, 0, 3].map((lr) => this.ground.heightAt(at(lr, 1.5).x, at(lr, 1.5).z))) - 0.4;
    const yaw = Math.atan2(fx, 0);
    const put = (geo, color, lr, y, ahead, rotZ = 0, rotY = 0) => {
      const g = geo.index ? geo.toNonIndexed() : geo;
      if (g !== geo) geo.dispose();
      g.deleteAttribute('uv');
      const p = at(lr, ahead);
      g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(p.x, base + y, p.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw + rotY, rotZ, 'YXZ')), new THREE.Vector3(1, 1, 1)));
      if (!parts.has(color)) parts.set(color, []);
      parts.get(color).push(g);
    };
    const half = tc.width / 2;
    const r = half;
    // The face: cut-stone courses either side of the arch, and over it, set into the hill.
    const course = 0.6;
    for (let y = 0; y < tc.height; y += course) {
      for (let lr = -tc.faceWidth / 2; lr < tc.faceWidth / 2; lr += 1.1) {
        const mid = lr + 0.55;
        const archTop = Math.abs(mid) < half ? tc.spring + Math.sqrt(Math.max(0, r * r - mid * mid)) : -1;
        if (y + course / 2 < archTop + 0.1 && Math.abs(mid) < half + 0.1) continue; // the bore
        const jag = (noise3(mid * 0.7, y * 0.9, 3) - 0.5) * 0.18;
        // Stones in the local frame: across is lr (box x), up is y, depth along ahead (box z).
        put(new THREE.BoxGeometry(1.06, course - 0.04, 0.8 + jag).translate(0, (course - 0.04) / 2, 0), (Math.floor(y / course) + Math.floor(lr)) % 3 ? k.stone : k.stoneDark, mid, y, -0.4 + jag);
      }
    }
    // The arch ring and its keystone (its date is a board: below).
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI * (i / 12);
      const cx = Math.cos(a) * (r + 0.32);
      const cy = tc.spring + Math.sin(a) * (r + 0.32);
      const g = new THREE.BoxGeometry(0.62, i === 6 ? 0.95 : 0.7, 0.25);
      g.rotateZ(a - Math.PI / 2);
      put(g, i === 6 ? k.stoneLight : k.stoneDark, cx, cy, 0.05);
    }
    // The fall: rock and earth heaped in the bore to its crown, spilling out.
    const rand = (a, b) => a + (b - a) * this.rng.next();
    for (let i = 0; i < 30; i++) {
      const lr = rand(-half + 0.3, half - 0.3);
      const top = tc.spring + Math.sqrt(Math.max(0, r * r - lr * lr));
      const s = rand(0.5, 1.3);
      put(new THREE.IcosahedronGeometry(s, 0), i % 3 ? k.rubble : k.stoneDark, lr, rand(0, top - 0.4), rand(-2.5, -0.2), rand(0, 6), rand(0, 6));
    }
    for (let i = 0; i < 16; i++) {
      const lr = rand(-half - 1, half + 1);
      const s = rand(0.3, 0.8);
      put(new THREE.IcosahedronGeometry(s, 0), k.rubble, lr, rand(0, 0.4), rand(0.2, 3.2), rand(0, 6), rand(0, 6));
    }
    // An old timber prop, snapped, and a rail running into the fall.
    put(new THREE.BoxGeometry(0.25, 3.2, 0.25), k.tieDark, -half + 0.8, 0.6, 0.6, 0.5);
    for (const s of [-1, 1]) put(new THREE.BoxGeometry(0.07, 0.11, 3), k.rail, (s * this.cfg.gauge) / 2, 0.15, 1.2);
    const geo = bakeParts(parts, { weather: this.weather, baseAt: () => base + 0.4, seed: 1904 });
    if (geo) {
      this.hold(geo);
      const mesh = new THREE.Mesh(geo, this.material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);
      this.culler.add(mesh, t.x, t.z, tc.faceWidth);
    }
    // The keystone's date.
    const date = this.hold(paintTexture(128, 96, (ctx, w, h) => {
      ctx.fillStyle = css(k.stoneLight);
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = css(k.carve);
      ctx.font = 'bold 44px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('1903', w / 2, h / 2);
      weather(ctx, w, h);
    }));
    const plate = new THREE.Mesh(this.hold(new THREE.PlaneGeometry(0.62, 0.42)), this.hold(new THREE.MeshLambertMaterial({ map: date })));
    const p = at(0, 0.19);
    plate.position.set(p.x, base + tc.spring + r + 0.3, p.z);
    plate.rotation.y = yaw;
    this.group.add(plate);
    this.culler.add(plate, p.x, p.z, 1);
    // Colliders across the face (the fall stops everyone).
    for (let lr = -tc.faceWidth / 2; lr <= tc.faceWidth / 2; lr += 1.6) {
      const q = at(lr, 0.4);
      colliders?.insert({ x: q.x, z: q.z, r: 1.0, top: base + tc.height });
    }
  }

  // ---- each frame ----------------------------------------------------------------------------------

  update(dt, cameraPosition) {
    this.culler.update(cameraPosition.x, cameraPosition.z);
  }

  setDrawDistance(distance) {
    this.culler.setDrawDistance(distance);
  }

  dispose() {
    for (const x of this.keep) x.dispose?.();
    this.group.removeFromParent();
  }
}

function mergeFlat(list) {
  const pos = [];
  const nor = [];
  for (const g0 of list) {
    const g = g0.index ? g0.toNonIndexed() : g0;
    const p = g.getAttribute('position');
    const n = g.getAttribute('normal');
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      nor.push(n.getX(i), n.getY(i), n.getZ(i));
    }
    if (g !== g0) g.dispose();
    g0.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return out;
}

function paintTexture(w, h, draw) {
  const { canvas, ctx } = makeCanvas(w, h);
  draw(ctx, w, h);
  return toTexture(canvas);
}

// A century of weather on a painted board: flaking, stains, runs.
function weather(ctx, w, h) {
  let s = 1903;
  const r = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = `rgba(${18 + r() * 30}, ${14 + r() * 22}, 10, ${0.06 + r() * 0.16})`;
    ctx.beginPath();
    ctx.arc(r() * w, r() * h, 1 + r() * 9, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = 'rgba(26, 20, 12, 0.14)';
    ctx.fillRect(r() * w, 0, 1 + r() * 3, r() * h);
  }
}
