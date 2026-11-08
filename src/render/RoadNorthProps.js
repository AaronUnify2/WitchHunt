// The end of the road north, drawn (Session 21, M10.2; world/roadNorth.js
// has the layout and the story). Same every run, all in code:
//  - The old road tunnel: a concrete headwall set into the cliff, its arch
//    and a coping along the top, pilasters, wing walls stepping down into
//    the rock, a cast name plaque (LAUREL GAP TUNNEL 1936) and a faded
//    clearance board. A few metres in, the roof has come down: a heap of
//    rock and broken lining fills the bore to the crown.
//  - The ROAD CLOSED barrier in front of it: two striped barricades with
//    their ROAD CLOSED boards and amber lamps still blinking on their
//    batteries (no light, just the lamps' faces), concrete jersey barriers
//    behind them across the road and its shoulders, and the army's
//    stencilled notice wired to the middle.
//  - The spur of rock east of the road, out from the cliff: big weathered
//    boulders (the cliff's own rock texture) heaped round a dark opening in
//    its south face, the cave's mouth.
//  - The brush packed in front of the mouth: thick, dark bushes, briars and
//    deadfall leaned against the rock. Gone (setBrush(false)) once the
//    dozer's cleared it: then the mouth shows, a black hole into the rock.
//  - Earl's hand-painted signs on the way up (BIGFOOT XING; HOME OF
//    BIGFOOT for anyone coming out of the tunnel), and three huge prints
//    in the soft ground by the brush.
// Dull, dark colours (the glare rule). The static parts are baked into one
// vertex-coloured mesh (render/propKit.js); the rock is one mesh on the
// cliff's material; the brush, the lamps and each painted board their own.
// The whole lot is drawn only within the draw distance.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { bakeParts, noise3, weatherFor } from './propKit.js';
import { makeCanvas, toTexture, css } from './proceduralTextures.js';
import { ChunkCuller } from './ChunkCuller.js';

export class RoadNorthProps {
  // cfg: config.map.roadNorth (look inside). weather: config.props.weather.
  constructor(cfg, weather = null) {
    this.cfg = cfg;
    this.k = cfg.look;
    this.weather = weather ? weatherFor(weather, this.k.weather) : null;
    this.parts = new Map();
    this.keep = [];
    this.seed = 21;
  }

  // layout: roadNorthLayout(). ground: heightAt(x, z). rockMaterial: the cliff's.
  init(scene, layout, ground, rockMaterial) {
    this.layout = layout;
    this.ground = ground;
    this.root = new THREE.Group();
    this.root.name = 'roadNorth';
    this.group = new THREE.Group(); // the road's end (culled as one)
    this.root.add(this.group);
    this.culler = new ChunkCuller(64, 8);
    this.portal();
    this.barrier();
    this.flush();
    this.rock(rockMaterial);
    this.mouthDark();
    this.buildBrush();
    this.buildLamps();
    this.boards();
    this.printDecals();
    scene.add(this.root);
    const l = layout;
    this.culler.add(this.group, (l.portal.x + l.mouth.x) / 2, (l.portal.face + l.brush.z) / 2, 40);
  }

  hold(x) {
    this.keep.push(x);
    return x;
  }

  rand() {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  // ---- parts ---------------------------------------------------------------------------------------

  // A geometry into the baked mesh, placed at (x, y, z) turned yaw (radians) about y.
  put(geo, color, x, y, z, yaw = 0, rotX = 0, rotZ = 0) {
    let g = geo.index ? geo.toNonIndexed() : geo;
    if (g !== geo) geo.dispose();
    if (g.getAttribute('uv')) g.deleteAttribute('uv');
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rotX, yaw, rotZ, 'YXZ')), new THREE.Vector3(1, 1, 1)));
    if (!this.parts.has(color)) this.parts.set(color, []);
    this.parts.get(color).push(g);
  }

  // A box whose base centre is at (x, y, z).
  box(w, h, d, x, y, z, color, yaw = 0, rotX = 0, rotZ = 0) {
    this.put(new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0), color, x, y, z, yaw, rotX, rotZ);
  }

  flush() {
    const baseAt = (x, y, z) => this.ground.heightAt(x, z);
    const geo = bakeParts(this.parts, { weather: this.weather, baseAt, seed: 21 });
    this.parts.clear();
    if (!geo) return;
    this.material = this.hold(new THREE.MeshLambertMaterial({ vertexColors: true }));
    const mesh = new THREE.Mesh(this.hold(geo), this.material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    this.group.add(mesh);
  }

  // ---- the tunnel ----------------------------------------------------------------------------------

  portal() {
    const k = this.k;
    const p = this.layout.portal;
    const o = p.opening;
    const x0 = p.x;
    const base = Math.min(this.ground.heightAt(x0, p.face + 1), this.ground.heightAt(x0 - p.width / 2, p.face + 1), this.ground.heightAt(x0 + p.width / 2, p.face + 1)) - 0.6;
    this.base = base;
    const depth = p.face - p.back;
    const zc = (p.face + p.back) / 2;
    const half = o.width / 2;
    const r = half; // a round arch on the springline
    const pier = (p.width - o.width) / 2;
    // The piers either side of the bore.
    for (const s of [-1, 1]) this.box(pier, p.height, depth, x0 + s * (half + pier / 2), base, zc, k.concrete);
    // Over the bore: thin slices whose bottoms follow the arch.
    const slices = 18;
    for (let i = 0; i < slices; i++) {
      const xa = -half + (o.width * i) / slices;
      const xb = -half + (o.width * (i + 1)) / slices;
      const xm = (xa + xb) / 2;
      const archY = o.spring + Math.sqrt(Math.max(0, r * r - xm * xm));
      this.box(xb - xa + 0.02, p.height - archY, depth, x0 + xm, base + archY, zc, k.concrete);
      // The soffit: the arch's underside, darker (soot from a century of exhaust).
      this.box(xb - xa + 0.02, 0.12, depth - 0.2, x0 + xm, base + archY - 0.12, zc - 0.1, k.soot);
    }
    // The arch ring: voussoir blocks proud of the face, each laid radially, the keystone paler.
    const ring = 15;
    for (let i = 0; i <= ring; i++) {
      const a = Math.PI * (i / ring);
      const rr = r + 0.38;
      const key = i === Math.floor(ring / 2) || i === Math.ceil(ring / 2);
      this.put(new THREE.BoxGeometry(0.66, key ? 0.95 : 0.76, 0.3), key ? k.concreteLight : k.concreteDark, x0 + Math.cos(a) * rr, base + o.spring + Math.sin(a) * rr, p.face + 0.15, 0, 0, a - Math.PI / 2);
    }
    // Pilasters, the coping and a band course.
    for (const s of [-1, 1]) this.box(1.1, p.height + 0.3, 0.5, x0 + s * (p.width / 2 - 0.55), base, p.face + 0.25, k.concreteDark);
    this.box(p.width + 0.6, 0.55, depth + 0.7, x0, base + p.height, zc + 0.2, k.concreteDark);
    this.box(p.width, 0.25, 0.3, x0, base + p.height - 2.1, p.face + 0.15, k.concreteDark);
    // The jambs: the bore's side walls, inside.
    for (const s of [-1, 1]) this.box(0.15, o.spring, depth, x0 + s * (half - 0.07), base, zc, k.soot);
    // Wing walls, angled back into the rock, stepping down.
    for (const s of [-1, 1]) {
      const yaw = s * p.wing.angle;
      const steps = 6;
      for (let i = 0; i < steps; i++) {
        const t = (i + 0.5) / steps;
        const along = t * p.wing.length;
        const h = p.height * (1 - t * 0.7);
        const wx = x0 + s * (p.width / 2) + s * Math.cos(p.wing.angle) * along;
        const wz = p.face - 0.4 - Math.sin(p.wing.angle) * along;
        this.box(p.wing.length / steps + 0.05, h, 0.9, wx, base, wz, k.concrete, yaw);
        this.box(p.wing.length / steps + 0.1, 0.3, 1.1, wx, base + h, wz, k.concreteDark, yaw);
      }
    }
    // The fall: rock and broken lining heaped in the bore to the crown, a little way in.
    const fallZ = p.back + 0.6;
    for (let i = 0; i < 26; i++) {
      const fx = (this.rand() * 2 - 1) * (half - 0.4);
      const top = o.spring + Math.sqrt(Math.max(0, r * r - fx * fx));
      const fy = this.rand() * top * 0.9;
      const size = 0.6 + this.rand() * 1.3;
      const g = new THREE.IcosahedronGeometry(size, 0);
      this.put(g, i % 4 === 0 ? k.concreteDark : k.rubble, x0 + fx, base + fy + size * 0.3, fallZ + this.rand() * 1.4, this.rand() * 6, this.rand() * 6, this.rand() * 6);
    }
    // A slope of rubble spilling forward onto the road bed.
    for (let i = 0; i < 14; i++) {
      const fx = (this.rand() * 2 - 1) * half * 0.9;
      const size = 0.25 + this.rand() * 0.5;
      this.put(new THREE.IcosahedronGeometry(size, 0), k.rubble, x0 + fx, this.ground.heightAt(x0 + fx, p.face) + size * 0.2, p.back + 2.2 + this.rand() * (depth - 1.6), this.rand() * 6, this.rand() * 6);
    }
    // An old tunnel lamp on its bracket over the arch, and a conduit along the face.
    this.box(0.12, 0.12, 0.6, x0, base + o.spring + r + 1.1, p.face + 0.3, k.metal);
    this.box(0.5, 0.3, 0.35, x0, base + o.spring + r + 0.85, p.face + 0.62, k.metal);
    this.box(p.width * 0.8, 0.07, 0.07, x0, base + p.height - 2.6, p.face + 0.04, k.metal);
    // Weeps of grime down the face from the coping (thin dark streaks proud by a hair).
    for (let i = 0; i < 12; i++) {
      const sx = x0 + (this.rand() * 2 - 1) * (p.width / 2 - 1);
      if (Math.abs(sx - x0) < half + 0.8) continue;
      const h = 1.5 + this.rand() * 4;
      this.box(0.08 + this.rand() * 0.18, h, 0.02, sx, base + p.height - h - 0.1, p.face + 0.01, k.moss);
    }
  }

  // ---- the barrier ---------------------------------------------------------------------------------

  barrier() {
    const k = this.k;
    const b = this.layout.barrier;
    const y = (x, z) => this.ground.heightAt(x, z);
    // Jersey barriers end to end across the road and its shoulders.
    const n = Math.round((b.half * 2) / 3);
    for (let i = 0; i < n; i++) {
      const jx = b.x - b.half + (i + 0.5) * ((b.half * 2) / n);
      const jy = y(jx, b.jersey) - 0.05;
      const yaw = (this.rand() - 0.5) * 0.08;
      this.box(2.9, 0.25, 0.62, jx, jy, b.jersey, k.jersey, yaw);
      this.box(2.9, 0.55, 0.36, jx, jy + 0.25, b.jersey, k.jersey, yaw);
      this.box(2.9, 0.06, 0.4, jx, jy + 0.8, b.jersey, k.jerseyDark, yaw);
    }
    // Two striped barricades in front.
    this.lampSpots = [];
    for (const s of [-1, 1]) {
      const cx = b.x + s * 2.15;
      const cy = y(cx, b.z);
      const w = 3.7;
      for (const lx of [-w / 2 + 0.3, w / 2 - 0.3]) {
        // A-frame legs.
        for (const lean of [-0.22, 0.22]) this.box(0.08, 1.75, 0.08, cx + lx, cy, b.z + lean * 0.9, k.leg, 0, lean);
        this.box(0.08, 0.08, 0.8, cx + lx, cy + 0.15, b.z, k.leg);
      }
      // Three boards, diagonal stripes as short blocks.
      for (const by of [0.55, 1.0, 1.45]) {
        const stripes = 10;
        for (let i = 0; i < stripes; i++) {
          const sx = cx - w / 2 + (i + 0.5) * (w / stripes);
          this.box(w / stripes + 0.005, 0.24, 0.035, sx, cy + by, b.z + 0.06, i % 2 ? k.stripeWhite : k.stripeOrange, 0, 0, s * 0.0);
        }
      }
      this.lampSpots.push({ x: cx - w / 2 + 0.3, y: cy + 1.85, z: b.z + 0.06 }, { x: cx + w / 2 - 0.3, y: cy + 1.85, z: b.z + 0.06 });
      // The ROAD CLOSED board's frame on top (its face is a painted board: boards()).
      this.box(0.06, 0.5, 0.06, cx - 0.5, cy + 1.55, b.z + 0.05, k.leg);
      this.box(0.06, 0.5, 0.06, cx + 0.5, cy + 1.55, b.z + 0.05, k.leg);
    }
    // Sandbags weighing the barricades' feet, and a coil of wire across the shoulder.
    for (let i = 0; i < 8; i++) {
      const sx = b.x + (i < 4 ? -1 : 1) * (0.9 + (i % 4) * 0.95);
      this.put(new THREE.SphereGeometry(0.32, 6, 4).scale(1.3, 0.55, 0.8), k.sandbag, sx, y(sx, b.z + 0.5) + 0.12, b.z + 0.5, this.rand());
    }
    for (const s of [-1, 1]) {
      const cx = b.x + s * (b.half - 0.8);
      for (let i = 0; i < 5; i++) this.put(new THREE.TorusGeometry(0.42, 0.025, 4, 10), k.wire, cx + (i - 2) * 0.35 * s, y(cx, b.z) + 0.42, b.z + 0.2, Math.PI / 2 + 0.2 * i, 0.15);
    }
  }

  // ---- the spur of rock and the cave ------------------------------------------------------------------

  // Boulders round the mouth, on the cliff's material (its texture projected on each face's broad side).
  rock(material) {
    const l = this.layout;
    const o = l.outcrop;
    const m = l.mouth;
    const base = this.ground.heightAt(m.x, m.z + 1) - 0.8;
    this.mouthBase = base + 0.8;
    const half = m.width / 2;
    const blobs = [
      // [x, y, z, rx, ry, rz] (world x, height above the base, world z)
      [m.x - half - 3.4, 3.2, m.z - 3.8, 3.6, 4.2, 4.2],
      [m.x + half + 3.7, 3.6, m.z - 4.2, 4.0, 4.6, 4.6],
      [m.x, m.height + 1.9, m.z - 3.2, half + 2.2, 2.1, 3.6],
      [m.x - 1, 6.5, m.z - 10.5, (o.x1 - o.x0) / 2 + 0.5, 8, 6.5],
      [(o.x0 + o.x1) / 2, 9, o.line + 4.5, (o.x1 - o.x0) / 2 + 1, 11, 5.5],
      [o.x0 + 3.5, 8, o.line + 9, 3.5, 9, 4.5],
      [o.x1 - 3, 10, o.line + 8, 4, 11, 4.5],
      [o.x0 + 2.5, 2.4, m.z - 9, 3, 3.4, 5],
      [o.x1 - 2.2, 2.8, m.z - 8, 3, 3.8, 5],
      // Fallen boulders at its foot.
      [m.x - half - 6.5, 0.9, m.z + 0.8, 1.4, 1.2, 1.3],
      [m.x + half + 6.2, 0.7, m.z + 1.6, 1.1, 0.9, 1.0],
      [o.x0 - 0.6, 0.8, (o.z0 + o.z1) / 2, 1.2, 1.1, 1.6],
    ];
    const geos = blobs.map(([x, y, z, rx, ry, rz], i) => rockBlob(rx, ry, rz, 31 + i).translate(x, base + y, z));
    // The bore of the cave behind the mouth: a short, rough tube, dark rock fading to black.
    geos.push(caveBore(m, this.mouthBase));
    const merged = mergeLoose(geos);
    projectRockUvs(merged, this.cfg.look.rockTextureMeters);
    darkenInside(merged, m, this.mouthBase);
    this.rockMaterial = material ?? this.hold(new THREE.MeshLambertMaterial({ color: 0x4a4640 }));
    this.rockMaterialTinted = this.hold(this.rockMaterial.clone());
    this.rockMaterialTinted.vertexColors = true;
    const mesh = new THREE.Mesh(this.hold(merged), this.rockMaterialTinted);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.group.add(mesh);
  }

  // The mouth's black: a dark card deep in the bore, so the hole reads as deep under the torch.
  mouthDark() {
    const m = this.layout.mouth;
    const g = this.hold(new THREE.PlaneGeometry(m.width * 1.2, m.height * 1.2));
    const mat = this.hold(new THREE.MeshBasicMaterial({ color: 0x030303 }));
    const card = new THREE.Mesh(g, mat);
    card.position.set(m.x, this.mouthBase + m.height * 0.5, m.z - m.depth + 0.3);
    this.group.add(card);
  }

  // ---- the brush -----------------------------------------------------------------------------------

  // Session 21 (Aaron: it should clear a piece at a time): each piece of the
  // brush (world/roadNorth.js brushPieces) is baked on its own, then all are
  // merged into one mesh, each piece's vertices a known range, so a piece can
  // be knocked away by itself (popPiece) and the brush is still one draw call.
  buildBrush() {
    const k = this.k;
    const br = this.layout.brush;
    const gy = (x, z) => this.ground.heightAt(x, z);
    const geos = [];
    this.pieces = [];
    let start = 0;
    br.pieces.forEach((p, i) => {
      const parts = new Map();
      const add = (geo, color, x, y, z, yaw = 0, rx = 0, rz = 0) => {
        const g = geo.index ? geo.toNonIndexed() : geo;
        if (g !== geo) geo.dispose();
        g.deleteAttribute('uv');
        g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, yaw, rz)), new THREE.Vector3(1, 1, 1)));
        if (!parts.has(color)) parts.set(color, []);
        parts.get(color).push(g);
      };
      const y0 = gy(p.x, p.z);
      if (p.kind === 'bush') {
        // A lumpy clump (two lobes), a couple of dead sticks through it, briar canes arching over the front.
        const s = p.r * (1.15 + p.back * 0.5);
        add(rockBlob(s * (0.9 + this.rand() * 0.3), s * (0.75 + p.back * 0.45), s * 0.9, p.seed, 0.32), [k.leafDark, k.leaf, k.leafBrown][i % 3], p.x, y0 + s * 0.45, p.z, this.rand() * 6);
        add(rockBlob(s * 0.6, s * 0.55, s * 0.6, p.seed + 50, 0.35), [k.leaf, k.leafDark, k.leafDark][i % 3], p.x + (this.rand() - 0.5) * s, y0 + s * 0.35, p.z + (this.rand() - 0.5) * s * 0.6, this.rand() * 6);
        for (let t = 0; t < 2; t++) {
          const len = 1.6 + this.rand() * 2;
          add(new THREE.CylinderGeometry(0.03, 0.06, len, 4).translate(0, len / 2, 0), t ? k.twig : k.deadwood, p.x + (this.rand() - 0.5) * s, y0 - 0.1, p.z + (this.rand() - 0.5) * s * 0.5, this.rand() * 6, -0.4 - this.rand() * 0.5, (this.rand() - 0.5) * 0.7);
        }
        for (let t = 0; t < 3; t++) {
          const len = 1.2 + this.rand() * 1.2;
          add(new THREE.CylinderGeometry(0.012, 0.02, len, 3).translate(0, len / 2, 0), k.briar, p.x + (this.rand() - 0.5) * s * 1.2, y0, p.z + s * 0.3, this.rand() * 6, 0.6 + this.rand() * 0.5, (this.rand() - 0.5) * 0.6);
        }
      } else {
        // A deadfall trunk leaned against the rock, a couple of its branches.
        const len = 6.5;
        add(new THREE.CylinderGeometry(0.2, 0.28, len, 7).translate(0, len / 2, 0), k.deadwood, p.x, y0 - 0.2, p.z, 0, -0.95, p.lean);
        for (let t = 0; t < 2; t++) add(new THREE.CylinderGeometry(0.04, 0.08, 1.8, 4).translate(0, 0.9, 0), k.twig, p.x + (t ? 0.3 : -0.3), y0 + 1.2 + t * 1.1, p.z - 0.8 - t * 0.7, this.rand() * 6, -0.3, t ? 0.8 : -0.8);
      }
      const geo = bakeParts(parts, { weather: this.weather, baseAt: (x, y, z) => gy(x, z), seed: 22 + i });
      const count = geo.getAttribute('position').count;
      this.pieces.push({ start, count, x: p.x, y: y0 + p.r * 0.6, z: p.z, state: 'up', t: 0, dx: 0, dz: 1 });
      start += count;
      geos.push(geo);
    });
    const merged = mergeGeometries(geos);
    for (const g of geos) g.dispose();
    this.brushBase = Float32Array.from(merged.getAttribute('position').array);
    merged.getAttribute('position').setUsage(THREE.DynamicDrawUsage);
    merged.computeBoundingSphere();
    this.brushMesh = new THREE.Mesh(this.hold(merged), this.material ?? this.hold(new THREE.MeshLambertMaterial({ vertexColors: true })));
    this.brushMesh.castShadow = true;
    this.brushMesh.receiveShadow = true;
    this.brushMesh.name = 'cave brush';
    this.group.add(this.brushMesh);
    // What's left once the dozer's been through: churned earth and a few snapped canes.
    const left = new Map();
    const put = (geo, color, x, y, z, yaw, rx) => {
      const g = geo.toNonIndexed();
      geo.dispose();
      g.deleteAttribute('uv');
      g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, yaw, 0)), new THREE.Vector3(1, 1, 1)));
      if (!left.has(color)) left.set(color, []);
      left.get(color).push(g);
    };
    for (let i = 0; i < 10; i++) {
      const bx = br.x + (this.rand() * 2 - 1) * br.hx * 1.3;
      const bz = br.z + br.hz + 1 + this.rand() * 3;
      put(new THREE.CylinderGeometry(0.06, 0.09, 1.2 + this.rand() * 2, 5).rotateZ(Math.PI / 2), i % 2 ? k.twig : k.deadwood, bx, gy(bx, bz) + 0.08, bz, this.rand() * 6, 0);
    }
    for (let i = 0; i < 8; i++) {
      const bx = br.x + (this.rand() * 2 - 1) * br.hx * 1.3;
      const bz = br.z + br.hz + 0.5 + this.rand() * 3.5;
      put(rockBlob(0.7 + this.rand() * 0.5, 0.18, 0.6, 400 + i, 0.4), k.earth, bx, gy(bx, bz), bz, this.rand() * 6, 0);
    }
    const leftGeo = bakeParts(left, { weather: this.weather, seed: 23 });
    this.clearedMesh = new THREE.Mesh(this.hold(leftGeo), this.brushMesh.material);
    this.clearedMesh.visible = false;
    this.clearedMesh.receiveShadow = true;
    this.group.add(this.clearedMesh);
  }

  // Shown (true) until the dozer clears it: every piece back, or all gone and the churned ground left.
  setBrush(on) {
    if (!this.brushMesh) return;
    for (let i = 0; i < this.pieces.length; i++) {
      const p = this.pieces[i];
      p.state = on ? 'up' : 'gone';
      p.t = on ? 0 : 1;
      this.posePiece(p);
    }
    this.clearedMesh.visible = !on;
  }

  // Knock piece i away from the blade (dx, dz: the way it's shoved): it tumbles off and shrinks to nothing.
  // instant: gone at once (loading a save).
  popPiece(i, dx = 0, dz = 1, instant = false) {
    const p = this.pieces?.[i];
    if (!p || p.state !== 'up') return;
    const len = Math.hypot(dx, dz) || 1;
    p.dx = dx / len;
    p.dz = dz / len;
    p.state = instant ? 'gone' : 'going';
    p.t = instant ? 1 : 0;
    if (instant) this.posePiece(p);
  }

  // Lay a piece's vertices out for its t (0 standing .. 1 gone).
  posePiece(p) {
    const pos = this.brushMesh.geometry.getAttribute('position');
    const a = pos.array;
    const b = this.brushBase;
    const t = p.t;
    const scale = 1 - t * t;
    const ox = p.dx * t * 3.2;
    const oz = p.dz * t * 3.2;
    const oy = Math.sin(Math.PI * Math.min(1, t * 1.2)) * 1.4 - t * 0.6;
    // A tumble: turn about the shove's sideways axis as it goes.
    const ang = t * 2.2;
    const c = Math.cos(ang);
    const sn = Math.sin(ang);
    for (let v = p.start; v < p.start + p.count; v++) {
      const k = v * 3;
      let x = (b[k] - p.x) * scale;
      let y = (b[k + 1] - p.y) * scale;
      let z = (b[k + 2] - p.z) * scale;
      // Rotate in the plane of the shove (along it, and up).
      const along = x * p.dx + z * p.dz;
      const side = -x * p.dz + z * p.dx;
      const al = along * c - y * sn;
      y = along * sn + y * c;
      x = al * p.dx - side * p.dz;
      z = al * p.dz + side * p.dx;
      a[k] = p.x + x + ox;
      a[k + 1] = p.y + y + oy;
      a[k + 2] = p.z + z + oz;
    }
    pos.needsUpdate = true;
  }

  // Each frame: the pieces on their way.
  updatePieces(dt) {
    if (!this.pieces) return;
    for (const p of this.pieces) {
      if (p.state !== 'going') continue;
      p.t = Math.min(1, p.t + dt / this.k.popSeconds);
      if (p.t >= 1) p.state = 'gone';
      this.posePiece(p);
    }
  }

  // Once the last piece has gone, the churned ground and snapped canes left behind.
  showCleared() {
    if (this.clearedMesh) this.clearedMesh.visible = true;
  }

  // ---- the lamps -----------------------------------------------------------------------------------

  buildLamps() {
    const k = this.k;
    this.lampOff = this.hold(new THREE.MeshLambertMaterial({ color: k.lampLens }));
    this.lampOn = this.hold(new THREE.MeshBasicMaterial({ color: k.lampLit }));
    const g = this.hold(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 10).rotateX(Math.PI / 2));
    const housing = this.hold(new THREE.BoxGeometry(0.26, 0.26, 0.12));
    const hMat = this.hold(new THREE.MeshLambertMaterial({ color: k.leg }));
    this.lamps = (this.lampSpots ?? []).map((s, i) => {
      const h = new THREE.Mesh(housing, hMat);
      h.position.set(s.x, s.y, s.z - 0.02);
      this.group.add(h);
      const lens = new THREE.Mesh(g, this.lampOff);
      lens.position.set(s.x, s.y, s.z + 0.06);
      this.group.add(lens);
      return { lens, phase: i % 2 ? 0.5 : 0 };
    });
    this.time = 0;
  }

  // ---- painted boards ------------------------------------------------------------------------------

  boards() {
    const k = this.k;
    const l = this.layout;
    const b = l.barrier;
    const y = (x, z) => this.ground.heightAt(x, z);
    // ROAD CLOSED on each barricade.
    const roadClosed = this.texture(512, 256, (ctx, w, h) => {
      ctx.fillStyle = css(k.boardWhite);
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = css(k.boardInk);
      ctx.lineWidth = 12;
      ctx.strokeRect(10, 10, w - 20, h - 20);
      ctx.fillStyle = css(k.boardInk);
      ctx.font = 'bold 92px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ROAD', w / 2, h * 0.32);
      ctx.fillText('CLOSED', w / 2, h * 0.7);
      grime(ctx, w, h, 220);
    });
    for (const s of [-1, 1]) {
      const cx = b.x + s * 2.15;
      this.board(roadClosed, 1.5, 0.75, cx, y(cx, b.z) + 2.0, b.z + 0.1, 0);
    }
    // The army's notice, wired to the middle of the jersey barriers.
    const notice = this.texture(512, 384, (ctx, w, h) => {
      ctx.fillStyle = css(k.plywood);
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = css(0x000000, 0.05);
        ctx.fillRect(0, Math.random() * h, w, 2);
      }
      ctx.fillStyle = css(k.stencil);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 64px monospace';
      ctx.fillText('NO ENTRY', w / 2, h * 0.2);
      ctx.font = 'bold 34px monospace';
      ctx.fillText('ROAD CLOSED BY ORDER OF', w / 2, h * 0.43);
      ctx.fillText('THE U.S. ARMY', w / 2, h * 0.55);
      ctx.font = 'bold 30px monospace';
      ctx.fillText('QUARANTINE ZONE', w / 2, h * 0.73);
      ctx.fillText('VIOLATORS WILL BE DETAINED', w / 2, h * 0.86);
      grime(ctx, w, h, 160);
    });
    this.board(notice, 1.2, 0.9, b.x, y(b.x, b.jersey) + 0.95, b.jersey + 0.2, 0, 0.04);
    // The tunnel's plaque, cast into the headwall over the arch.
    const p = l.portal;
    const plaque = this.texture(512, 128, (ctx, w, h) => {
      ctx.fillStyle = css(k.plaque);
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = css(k.plaqueInk);
      ctx.lineWidth = 6;
      ctx.strokeRect(8, 8, w - 16, h - 16);
      ctx.fillStyle = css(k.plaqueInk);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 50px serif';
      ctx.fillText(this.cfg.tunnelName, w / 2, h * 0.42);
      ctx.font = '30px serif';
      ctx.fillText(this.cfg.tunnelYear, w / 2, h * 0.8);
      grime(ctx, w, h, 300);
    });
    this.board(plaque, 4.2, 1.05, p.x, this.base + p.height - 1.3, p.face + 0.32, 0);
    // The clearance board over the arch's crown.
    const clearance = this.texture(256, 64, (ctx, w, h) => {
      ctx.fillStyle = css(k.boardYellow);
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = css(k.boardInk);
      ctx.font = 'bold 38px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText("CLEARANCE 13'-6\"", w / 2, h / 2);
      grime(ctx, w, h, 120);
    });
    this.board(clearance, 2.0, 0.5, p.x, this.base + p.opening.spring + p.opening.width / 2 + 0.75, p.face + 0.33, 0);
    // Earl's signs on the way up.
    for (const s of l.signs) {
      const tex = this.texture(512, 384, (ctx, w, h) => earlSign(ctx, w, h, s, k));
      const sy = y(s.x, s.z);
      const holder = new THREE.Group();
      holder.position.set(s.x, sy, s.z);
      holder.rotation.y = s.yaw;
      const face = new THREE.Mesh(this.hold(new THREE.PlaneGeometry(1.8, 1.35)), this.hold(new THREE.MeshLambertMaterial({ map: tex })));
      face.position.set(0, 2.1, 0.05);
      holder.add(face);
      const back = new THREE.Mesh(this.hold(new THREE.BoxGeometry(1.86, 1.41, 0.04)), this.hold(new THREE.MeshLambertMaterial({ color: k.signBack })));
      back.position.set(0, 2.1, 0.01);
      holder.add(back);
      for (const px of [-0.6, 0.6]) {
        const post = new THREE.Mesh(this.hold(new THREE.BoxGeometry(0.1, 2.8, 0.1)), back.material);
        post.position.set(px, 1.2, -0.06);
        holder.add(post);
      }
      this.root.add(holder); // down the road, culled on its own
      this.culler.add(holder, s.x, s.z, 3);
    }
  }

  texture(w, h, draw) {
    const { canvas, ctx } = makeCanvas(w, h);
    draw(ctx, w, h);
    return this.hold(toTexture(canvas));
  }

  board(texture, w, h, x, y, z, yaw, tilt = 0) {
    const mesh = new THREE.Mesh(this.hold(new THREE.PlaneGeometry(w, h)), this.hold(new THREE.MeshLambertMaterial({ map: texture })));
    mesh.position.set(x, y, z);
    mesh.rotation.set(-tilt, yaw, 0);
    this.group.add(mesh);
  }

  // ---- prints --------------------------------------------------------------------------------------

  printDecals() {
    const tex = this.texture(128, 256, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(14, 11, 8, 0.85)';
      // The sole, wide at the ball, a heel, five toes.
      ctx.beginPath();
      ctx.ellipse(w * 0.5, h * 0.62, w * 0.3, h * 0.3, 0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(w * 0.52, h * 0.38, w * 0.36, h * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
      [[0.24, 0.16, 0.08], [0.39, 0.12, 0.075], [0.53, 0.11, 0.07], [0.66, 0.13, 0.065], [0.78, 0.18, 0.06]].forEach(([tx, ty, tr]) => {
        ctx.beginPath();
        ctx.ellipse(w * tx, h * ty, w * tr, w * tr * 1.15, 0, 0, Math.PI * 2);
        ctx.fill();
      });
    });
    const mat = this.hold(new THREE.MeshLambertMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
    const g = this.hold(new THREE.PlaneGeometry(0.42, 0.85).rotateX(-Math.PI / 2));
    for (const p of this.layout.prints) {
      const m = new THREE.Mesh(g, mat);
      m.position.set(p.x, this.ground.heightAt(p.x, p.z) + 0.03, p.z);
      m.rotation.y = p.yaw;
      this.group.add(m);
    }
  }

  // ---- each frame ----------------------------------------------------------------------------------

  update(dt, cameraPosition) {
    this.culler.update(cameraPosition.x, cameraPosition.z);
    this.updatePieces(dt);
    if (!this.group.visible || !this.lamps) return;
    this.time += dt;
    const period = this.k.lampPeriod;
    for (const l of this.lamps) {
      const on = ((this.time / period + l.phase) % 1) < 0.35;
      l.lens.material = on ? this.lampOn : this.lampOff;
    }
  }

  setDrawDistance(distance) {
    this.culler.setDrawDistance(distance + 20);
  }

  dispose() {
    for (const x of this.keep) x.dispose?.();
    this.root.removeFromParent();
  }
}

// ---- shapes --------------------------------------------------------------------------------------

// A lumpy rock (or bush): an icosphere stretched to rx, ry, rz with its
// surface pushed in and out by noise (`rough` of the radius).
function rockBlob(rx, ry, rz, seed, rough = 0.22) {
  const g = new THREE.IcosahedronGeometry(1, 2);
  const pos = g.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const n = noise3(x * 1.7 + seed, y * 1.7, z * 1.7) * 0.7 + noise3(x * 4.1, y * 4.1 + seed, z * 4.1) * 0.3;
    const k = 1 + (n - 0.5) * 2 * rough;
    // Flatter on top and squared at the base, like weathered stone.
    const flat = y > 0.6 ? 0.92 : 1;
    pos.setXYZ(i, x * rx * k, y * ry * k * flat, z * rz * k);
  }
  g.computeVertexNormals();
  return g;
}

// The cave's bore: an open-fronted rough tube from the mouth back into the rock.
function caveBore(m, base) {
  const seg = 10;
  const rings = 5;
  const positions = [];
  const idx = [];
  for (let r = 0; r <= rings; r++) {
    const t = r / rings;
    const z = m.z + 0.4 - t * m.depth;
    const shrink = 1 - t * 0.35;
    for (let s = 0; s <= seg; s++) {
      // From the floor's left, up over the roof, to the floor's right (an arch).
      const a = Math.PI * (s / seg);
      const n = noise3(s * 0.9, r * 0.8, 7) - 0.5;
      const x = m.x - Math.cos(a) * (m.width / 2) * shrink * (1 + n * 0.25);
      const y = base - 0.2 + Math.sin(a) * m.height * shrink * (1 + n * 0.2);
      positions.push(x, y, z);
    }
  }
  // The floor.
  const floor0 = positions.length / 3;
  for (let r = 0; r <= rings; r++) {
    const t = r / rings;
    const z = m.z + 0.4 - t * m.depth;
    const shrink = 1 - t * 0.35;
    positions.push(m.x - (m.width / 2) * shrink, base - 0.15, z, m.x + (m.width / 2) * shrink, base - 0.15, z);
  }
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < seg; s++) {
      const a = r * (seg + 1) + s;
      const b = a + seg + 1;
      // Faces inward (seen from inside the bore).
      idx.push(a, a + 1, b, a + 1, b + 1, b);
    }
    const f = floor0 + r * 2;
    idx.push(f, f + 2, f + 1, f + 1, f + 2, f + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Merge geometries that may or may not be indexed (positions and normals only).
function mergeLoose(geos) {
  const pos = [];
  const nor = [];
  for (const g0 of geos) {
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
  out.computeBoundingSphere();
  return out;
}

// The rock texture laid on each face from the side it faces most (no stretch on any face).
function projectRockUvs(g, metres) {
  const p = g.getAttribute('position');
  const n = g.getAttribute('normal');
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i += 3) {
    // Per triangle, so a face doesn't smear across two projections.
    let ax = 0;
    let ay = 0;
    let az = 0;
    for (let k = 0; k < 3; k++) {
      ax += Math.abs(n.getX(i + k));
      ay += Math.abs(n.getY(i + k));
      az += Math.abs(n.getZ(i + k));
    }
    for (let k = 0; k < 3; k++) {
      const x = p.getX(i + k);
      const y = p.getY(i + k);
      const z = p.getZ(i + k);
      let u;
      let v;
      if (ay >= ax && ay >= az) [u, v] = [x, z];
      else if (ax >= az) [u, v] = [z, y];
      else [u, v] = [x, y];
      uv[(i + k) * 2] = u / metres;
      uv[(i + k) * 2 + 1] = v / metres;
    }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

// Vertex colours: white on the outside, darker toward the back of the bore,
// black at its end (so the hole reads as deep), and a little darker low down.
function darkenInside(g, m, base) {
  const p = g.getAttribute('position');
  const c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    let k = 1;
    const inside = Math.abs(x - m.x) < m.width * 0.75 && y < base + m.height + 0.5 && z < m.z + 0.6;
    if (inside) k = Math.max(0.02, Math.min(1, 1 - (m.z + 0.6 - z) / (m.depth * 0.8)));
    k *= 0.75 + 0.25 * Math.min(1, Math.max(0, (y - base) / 4));
    c[i * 3] = k;
    c[i * 3 + 1] = k;
    c[i * 3 + 2] = k;
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
}

// Dirt and wear over a painted board.
function grime(ctx, w, h, n) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = `rgba(${20 + Math.random() * 30}, ${16 + Math.random() * 20}, 10, ${0.05 + Math.random() * 0.12})`;
    const r = 2 + Math.random() * 14;
    ctx.beginPath();
    ctx.arc(Math.random() * w, Math.random() * h, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Runs from the top edge.
  for (let i = 0; i < n / 10; i++) {
    ctx.fillStyle = 'rgba(30, 24, 14, 0.12)';
    ctx.fillRect(Math.random() * w, 0, 2 + Math.random() * 4, Math.random() * h * 0.6);
  }
}

// Earl's hand-painted signs: wobbly lettering on a board, and on the
// crossing sign the figure striding (the famous film still, his way).
function earlSign(ctx, w, h, s, k) {
  ctx.fillStyle = css(s.art === 'bigfoot' ? k.boardYellow : k.earlBoard);
  ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 48) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.fillRect(0, y, w, 3);
  }
  ctx.strokeStyle = css(k.earlInk);
  ctx.lineWidth = 10;
  ctx.strokeRect(12, 12, w - 24, h - 24);
  ctx.fillStyle = css(k.earlInk);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let top = h * 0.2;
  if (s.art === 'bigfoot') {
    // Striding, mid-turn, one arm swinging: a dark silhouette.
    ctx.save();
    ctx.translate(w * 0.5, h * 0.42);
    ctx.beginPath();
    ctx.ellipse(0, -62, 22, 26, 0, 0, Math.PI * 2); // head
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-34, -40);
    ctx.quadraticCurveTo(-46, 10, -30, 40);
    ctx.lineTo(28, 40);
    ctx.quadraticCurveTo(46, 0, 34, -42);
    ctx.closePath();
    ctx.fill(); // body
    ctx.lineCap = 'round';
    ctx.strokeStyle = css(k.earlInk);
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.moveTo(-30, -26);
    ctx.lineTo(-62, 30); // the arm swinging back
    ctx.moveTo(30, -26);
    ctx.lineTo(52, 22);
    ctx.moveTo(-14, 36);
    ctx.lineTo(-40, 92); // striding legs
    ctx.moveTo(16, 36);
    ctx.lineTo(30, 94);
    ctx.stroke();
    ctx.restore();
    top = h * 0.78;
    ctx.font = 'bold 54px serif';
    ctx.fillText(s.title, w / 2, top);
    ctx.font = 'italic 28px serif';
    s.lines.forEach((line, i) => ctx.fillText(line, w / 2 + (i % 2 ? 30 : -20), top + 46 + i * 30));
  } else {
    ctx.font = 'bold 64px serif';
    ctx.fillText(s.title, w / 2, top + 10);
    ctx.font = 'bold 34px serif';
    s.lines.forEach((line, i) => ctx.fillText(line, w / 2 + Math.sin(i * 2.3) * 8, top + 90 + i * 52));
  }
  grime(ctx, w, h, 200);
}

