// The ranger station's placeholder look (boxes and planes; the real models
// are the art pass). Built to stay cheap: the static parts (the cabin, its
// roof and furniture, the lookout tower, fence posts and rails, the fence
// box, the turret pad) are one merged mesh; everything that changes is an
// instanced mesh or a small mesh of its own, so the whole compound is
// about 16 draw calls, all hidden when it's beyond the draw distance.
//  - Fence panels lean as they're damaged and lie flat when broken; the
//    top wires glow blue while the fence is charged.
//  - The gate slides open, doors swing; broken ones fall.
//  - Barricades, spike traps and floodlights appear when built.
//  - The turret turns, pitches and kicks back as it fires.
//  - Windows and the CCTV monitors glow at night; the family (placeholder
//    figures) wait in the comms room.
//  - Session 13 (#147): the furnished interior (render/stationInterior.js),
//    merged into the static mesh; lit warm inside by a point light a room
//    (dimmer while the fence has no charge), the woodstove's fire
//    flickering through its door, static on the monitors.

import * as THREE from 'three';
import { FamilyRenderer } from './FamilyRenderer.js';
import { buildInterior } from './stationInterior.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export class StationRenderer {
  constructor(stationConfig, rng, family) {
    this.cfg = stationConfig;
    this.look = stationConfig.look;
    this.rng = rng;
    this.familyOpts = family; // Session 13: { cfg (config.family), ids (config.story.family) }
  }

  // floorY: the cabin's floor height.
  init(scene, layout, ground, state, floorY) {
    this.layout = layout;
    this.ground = ground;
    this.state = state;
    this.floorY = floorY;
    this.group = new THREE.Group();
    this.disposables = [];
    this.drawDistance = Infinity;
    this.wirePulse = 0;
    this.time = 0;
    this.m4 = new THREE.Matrix4();
    this.q = new THREE.Quaternion();
    this.q2 = new THREE.Quaternion();
    this.v = new THREE.Vector3();
    this.s = new THREE.Vector3();
    this.e = new THREE.Euler();
    this.zero = new THREE.Matrix4().makeScale(0, 0, 0);
    this.lambert = this.keep(new THREE.MeshLambertMaterial({ vertexColors: true }));

    this.buildStatic();
    this.buildFencePanels();
    this.buildGate();
    this.buildDoors();
    this.buildBarricades();
    this.buildSpikes();
    this.buildFloodlights();
    this.buildTurret();
    this.buildGlow();
    this.buildFamily();
    // Instanced meshes measure their bounds once, on the first frame: built
    // later (barricades, spikes, floodlights) they'd stay culled forever.
    // The whole compound is hidden by distance instead (update()).
    this.group.traverse((o) => {
      if (o.isInstancedMesh) o.frustumCulled = false;
    });
    scene.add(this.group);
    this.lastLevels = new Map(); // what each instance was last drawn as
    this.refresh(true);
  }

  keep(thing) {
    this.disposables.push(thing);
    return thing;
  }

  setDrawDistance(distance) {
    this.drawDistance = distance;
  }

  // The fence hums up when a battery goes in.
  pulseWire() {
    this.wirePulse = 1;
  }

  // ---- building blocks ----------------------------------------------------------

  // A box (w x h x d), base at y, at (x, z), turned by `yaw`, in `color`:
  // returns a geometry with a colour attribute, ready to merge.
  box(w, h, d, x, y, z, color, yaw = 0, tilt = 0) {
    const g = new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0);
    if (tilt) g.rotateX(tilt);
    if (yaw) g.rotateY(yaw);
    g.translate(x, y, z);
    return paint(g, color);
  }

  // A beam between two 3D points (posts, rails, braces).
  beam(ax, ay, az, bx, by, bz, thick, color) {
    const len = Math.hypot(bx - ax, by - ay, bz - az);
    const g = new THREE.BoxGeometry(thick, thick, len).translate(0, 0, len / 2);
    const dir = new THREE.Vector3(bx - ax, by - ay, bz - az).normalize();
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir));
    g.translate(ax, ay, az);
    return paint(g, color);
  }

  merged(parts, material, shadow = true) {
    const geometry = this.keep(mergeGeometries(parts));
    for (const p of parts) p.dispose();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    this.group.add(mesh);
    return mesh;
  }

  // ---- the static parts -----------------------------------------------------------

  buildStatic() {
    const L = this.layout;
    const k = this.look;
    const c = L.cabin;
    const parts = [];
    const fy = this.floorY;
    const H = c.wallHeight;
    const yaw0 = 0;
    // Floor slab (with a skirt down into the ground) and a porch step.
    parts.push(this.box(c.halfW * 2 + 0.3, 1.2, c.halfD * 2 + 0.3, c.x, fy - 1.2, c.z, k.floor));
    parts.push(this.box(2.2, 0.25, 1.1, c.x, fy - 0.25, c.z + c.halfD + 0.55, k.woodDark));
    // Walls: each wall piece as a plank box, a little thicker than its collider.
    for (const w of c.walls) parts.push(this.wallBox(w, fy, H, k.wood));
    // Gable roof: two sloping slabs from the long walls up to the ridge (east-west).
    const rise = c.roofRise;
    const run = c.halfD + 0.6;
    const slope = Math.atan2(rise, run);
    const slabW = Math.hypot(run, rise);
    for (const side of [-1, 1]) {
      const g = new THREE.BoxGeometry(c.halfW * 2 + 1, 0.14, slabW).translate(0, 0, (side * slabW) / 2);
      g.rotateX(side * slope);
      g.translate(c.x, fy + H + rise, c.z);
      parts.push(paint(g, k.roof));
    }
    // Gable ends (triangles approximated by stacked boards).
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const t = i / 4;
        parts.push(this.box(0.16, rise / 4, (c.halfD * 2 + 0.2) * (1 - t), c.x + side * c.halfW, fy + H + rise * t, c.z, k.trim));
      }
    }
    // Corner posts and a trim line under the eaves.
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(this.box(0.3, H, 0.3, c.x + sx * c.halfW, fy, c.z + sz * c.halfD, k.woodDark));
    // Session 13 (#147): the furnished interior; what glows is kept for buildGlow().
    this.interior = buildInterior(c, fy, k, (...a) => this.box(...a), this.rng);
    parts.push(...this.interior.parts);
    // The lookout tower: four legs, cross braces, the platform, rails, a cab roof, a ladder.
    const t = L.tower;
    const gy = this.ground.heightAt(t.x, t.z);
    const top = gy + t.height;
    const spread = t.legSpread;
    const legs = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (const [sx, sz] of legs) parts.push(this.beam(t.x + sx * spread, gy - 0.3, t.z + sz * spread, t.x + sx * t.half * 0.9, top, t.z + sz * t.half * 0.9, 0.22, k.towerDark));
    for (let lvl = 0; lvl < 3; lvl++) {
      const y0 = gy + 1 + lvl * 2.6;
      const y1 = y0 + 2.4;
      const r0 = spread - ((spread - t.half * 0.9) * (y0 - gy)) / t.height;
      const r1 = spread - ((spread - t.half * 0.9) * (y1 - gy)) / t.height;
      for (let i = 0; i < 4; i++) {
        const [ax, az] = legs[i];
        const [bx, bz] = legs[(i + 1) % 4];
        parts.push(this.beam(t.x + ax * r0, y0, t.z + az * r0, t.x + bx * r1, y1, t.z + bz * r1, 0.1, k.tower));
      }
    }
    parts.push(this.box(t.half * 2, 0.2, t.half * 2, t.x, top - 0.2, t.z, k.towerPlank));
    for (const [sx, sz] of legs) parts.push(this.box(0.12, 2.6, 0.12, t.x + sx * t.half, top, t.z + sz * t.half, k.towerDark));
    for (const side of [-1, 1]) {
      parts.push(this.box(t.half * 2, 0.08, 0.08, t.x, top + 1, t.z + side * t.half, k.tower));
      parts.push(this.box(0.08, 0.08, t.half * 2, t.x + side * t.half, top + 1, t.z, k.tower));
    }
    parts.push(this.box(t.half * 2 + 0.6, 0.15, t.half * 2 + 0.6, t.x, top + 2.6, t.z, k.roof));
    const lad = L.tower.ladder;
    for (const sx of [-0.25, 0.25]) parts.push(this.beam(lad.x + sx, gy, lad.z, lad.x + sx, top, t.z + t.half, 0.07, k.towerLadder));
    for (let y = gy + 0.4; y < top; y += 0.4) {
      const f = (y - gy) / (top - gy);
      parts.push(this.box(0.5, 0.05, 0.05, lad.x, y, lad.z + (t.z + t.half - lad.z) * f, k.towerLadder));
    }
    // Fence posts and rails (the panels themselves are instanced).
    const H2 = this.cfg.layout.fenceHeight;
    const posts = [];
    for (const s of L.segments) for (const p of s.pieces) posts.push([p.ax, p.az], [p.bx, p.bz]);
    for (const p of L.gate.pieces) posts.push([p.ax, p.az], [p.bx, p.bz]);
    for (const [x, z] of posts) parts.push(this.box(0.09, H2 + 0.25, 0.09, x, this.ground.heightAt(x, z) - 0.15, z, k.metal));
    // The fence box by the gate, on its own post, with a hazard stripe.
    const fb = L.fenceBox;
    const fby = this.ground.heightAt(fb.x, fb.z);
    parts.push(this.box(0.12, 1.1, 0.12, fb.x, fby, fb.z, k.metalDark));
    parts.push(this.box(0.55, 0.65, 0.3, fb.x, fby + 0.9, fb.z, k.metal, fb.angle));
    parts.push(this.box(0.56, 0.08, 0.31, fb.x, fby + 1.3, fb.z, k.hazard, fb.angle));
    // The turret pad: a low concrete slab.
    const pad = L.turretPad;
    parts.push(this.box(1.6, 0.2, 1.6, pad.x, this.ground.heightAt(pad.x, pad.z) - 0.05, pad.z, k.concrete));
    // Empty floodlight footings, so the slots read before they're built.
    for (const f of L.floods) parts.push(this.box(0.4, 0.15, 0.4, f.x, this.ground.heightAt(f.x, f.z) - 0.05, f.z, k.emptySlot));
    void yaw0;
    this.staticMesh = this.merged(parts, this.lambert);
  }

  // A wall piece from (ax, az) to (bx, bz), standing on the floor.
  wallBox(w, fy, H, color) {
    const len = Math.hypot(w.bx - w.ax, w.bz - w.az);
    const yaw = Math.atan2(w.bz - w.az, w.bx - w.ax);
    const g = new THREE.BoxGeometry(len + 0.2, H, 0.22).translate(0, H / 2, 0);
    g.rotateY(-yaw);
    g.translate((w.ax + w.bx) / 2, fy, (w.az + w.bz) / 2);
    return paint(g, color);
  }

  // ---- fence panels and wires --------------------------------------------------------

  buildFencePanels() {
    const H = this.cfg.layout.fenceHeight;
    const tex = this.keep(chainLinkTexture(this.look.chainLinkTexture, this.look.chainLink));
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(this.cfg.layout.panelLength / 0.25, H / 0.25);
    // Blended, not alpha-tested: far away the mesh averages into a faint
    // grey haze (as real chain-link does) instead of vanishing.
    this.chainMaterial = this.keep(new THREE.MeshLambertMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    const geometry = this.keep(new THREE.PlaneGeometry(1, H).translate(0.5, H / 2 + 0.05, 0));
    this.panelPieces = []; // { seg (state), piece, i }
    this.layout.segments.forEach((s, si) => {
      for (const p of s.pieces) this.panelPieces.push({ si, piece: p });
    });
    this.panels = new THREE.InstancedMesh(geometry, this.chainMaterial, this.panelPieces.length);
    this.panels.receiveShadow = true;
    this.group.add(this.panels);
    // Two strands of wire along the top, glowing while charged.
    const wireGeo = this.keep(new THREE.BoxGeometry(1, 0.03, 0.03).translate(0.5, 0, 0));
    this.wireMaterial = this.keep(new THREE.MeshBasicMaterial({ color: this.look.wireDead }));
    this.wires = new THREE.InstancedMesh(wireGeo, this.wireMaterial, this.panelPieces.length * 2);
    this.group.add(this.wires);
  }

  // Matrix for a panel-like piece along p: leaning by `lean` (radians,
  // positive = top falls outward), lifted by `lift`, its height scaled.
  pieceMatrix(p, lean, lift = 0, scaleY = 1) {
    const len = Math.hypot(p.bx - p.ax, p.bz - p.az);
    const yaw = Math.atan2(-(p.bz - p.az), p.bx - p.ax);
    // Which way is outward for this piece: lean the top away from the centre.
    const nx = Math.sin(yaw);
    const nz = Math.cos(yaw);
    const c = this.layout.centre;
    const out = (p.ax + p.bx) / 2 - c.x;
    const outZ = (p.az + p.bz) / 2 - c.z;
    const sign = nx * out + nz * outZ >= 0 ? 1 : -1;
    this.q.setFromAxisAngle(Y_AXIS, yaw);
    this.q2.setFromAxisAngle(X_AXIS, sign * lean);
    this.q.multiply(this.q2);
    const y = Math.min(this.ground.heightAt(p.ax, p.az), this.ground.heightAt(p.bx, p.bz)) + lift;
    this.v.set(p.ax, y, p.az);
    this.s.set(len, scaleY, 1);
    return this.m4.compose(this.v, this.q, this.s);
  }

  // How far a barrier leans: up at full health, over at half, flat when broken.
  leanFor(b) {
    if (b.health <= 0) return this.cfg.brokenTilt;
    const f = b.health / b.max;
    return f >= 0.99 ? 0 : this.cfg.damagedTilt * (1 - f) * 2 * (f < 0.5 ? 1.4 : 1);
  }

  updatePanels() {
    const s = this.state;
    const H = this.cfg.layout.fenceHeight;
    this.panelPieces.forEach(({ si, piece }, i) => {
      const seg = s.segments[si];
      const lean = this.leanFor(seg);
      this.panels.setMatrixAt(i, this.pieceMatrix(piece, lean));
      // Wires sit on the panel's top edge (they fall with it).
      for (let w = 0; w < 2; w++) {
        const lift = H - w * 0.35;
        if (seg.health <= 0) this.wires.setMatrixAt(i * 2 + w, this.zero);
        else this.wires.setMatrixAt(i * 2 + w, this.pieceMatrix(piece, lean * 0.0, lift - lift * (1 - Math.cos(lean))));
      }
    });
    this.panels.instanceMatrix.needsUpdate = true;
    this.wires.instanceMatrix.needsUpdate = true;
  }

  // ---- the gate and doors ----------------------------------------------------------------

  buildGate() {
    const H = this.cfg.layout.fenceHeight;
    const p = this.layout.gate.pieces[0];
    const len = Math.hypot(p.bx - p.ax, p.bz - p.az);
    const frame = [
      this.box(len, 0.08, 0.08, len / 2, 0.1, 0, this.look.metal),
      this.box(len, 0.08, 0.08, len / 2, H, 0, this.look.metal),
      this.box(0.08, H, 0.08, 0.04, 0.1, 0, this.look.metal),
      this.box(0.08, H, 0.08, len - 0.04, 0.1, 0, this.look.metal),
      this.beam(0.05, 0.15, 0, len - 0.05, H, 0, 0.06, this.look.metal),
    ];
    this.gate = new THREE.Group();
    const frameMesh = new THREE.Mesh(this.keep(mergeGeometries(frame)), this.lambert);
    frame.forEach((g) => g.dispose());
    const panel = new THREE.Mesh(this.keep(new THREE.PlaneGeometry(len, H).translate(len / 2, H / 2 + 0.1, 0)), this.chainMaterial);
    frameMesh.castShadow = true;
    this.gate.add(frameMesh, panel);
    this.gatePiece = p;
    this.gateLen = len;
    this.group.add(this.gate);
  }

  buildDoors() {
    const c = this.layout.cabin;
    const H = c.wallHeight - 0.6;
    this.doorMeshes = {};
    for (const [id, d] of [['front', c.frontDoor], ['comms', c.commsDoor]]) {
      const parts = [
        this.box(d.width, H, 0.1, d.width / 2, 0, 0, this.look.plank),
        this.box(d.width, 0.12, 0.13, d.width / 2, H * 0.25, 0, this.look.woodDark),
        this.box(d.width, 0.12, 0.13, d.width / 2, H * 0.75, 0, this.look.woodDark),
      ];
      const plain = new THREE.Mesh(this.keep(mergeGeometries(parts)), this.lambert);
      parts.forEach((g) => g.dispose());
      // Reinforced: steel bands across it.
      const bands = [0.15, 0.5, 0.85].map((f) => this.box(d.width + 0.02, 0.16, 0.15, d.width / 2, H * f, 0, this.look.metal));
      const steel = new THREE.Mesh(this.keep(mergeGeometries(bands)), this.lambert);
      bands.forEach((g) => g.dispose());
      const g = new THREE.Group();
      g.add(plain, steel);
      plain.castShadow = steel.castShadow = true;
      g.position.set(d.hinge.x, this.floorY, d.hinge.z);
      g.userData = { steel };
      this.group.add(g);
      this.doorMeshes[id] = g;
    }
  }

  updateGateAndDoors() {
    const s = this.state;
    const p = this.gatePiece;
    const gl = this.gate;
    const yaw = Math.atan2(-(p.bz - p.az), p.bx - p.ax);
    const g = s.gate;
    const y = Math.min(this.ground.heightAt(p.ax, p.az), this.ground.heightAt(p.bx, p.bz));
    gl.rotation.set(0, yaw, 0);
    if (g.health <= 0) {
      gl.position.set(p.ax, y, p.az);
      gl.rotation.set(-1.45, yaw, 0, 'YXZ');
    } else {
      const slide = g.openAmount * this.gateLen * 0.92;
      gl.position.set(p.ax + Math.cos(yaw) * slide, y, p.az - Math.sin(yaw) * slide);
      gl.rotation.set(-this.leanFor(g) * 0.5, yaw, 0, 'YXZ');
    }
    for (const [id, mesh] of Object.entries(this.doorMeshes)) {
      const d = s.doors[id];
      mesh.userData.steel.visible = d.reinforced;
      if (d.health <= 0) {
        mesh.rotation.set(-Math.PI / 2, 0.2, 0, 'YXZ');
        mesh.position.y = this.floorY + 0.06;
      } else {
        mesh.rotation.set(0, -d.openAmount * Math.PI * 0.5, 0, 'YXZ');
        mesh.position.y = this.floorY;
      }
    }
  }

  // ---- barricades, spikes, floodlights ------------------------------------------------

  buildBarricades() {
    const k = this.look;
    const parts = [
      this.box(1, 0.4, 0.5, 0.5, 0, 0, k.sandbag),
      this.box(1, 0.22, 0.08, 0.5, 0.55, 0.12, k.plank),
      this.box(1, 0.22, 0.08, 0.5, 0.95, 0.12, k.plank),
      this.box(1, 0.22, 0.08, 0.5, 1.35, 0.12, k.plank),
      this.box(0.1, 1.7, 0.1, 0.15, 0, 0.2, k.woodDark),
      this.box(0.1, 1.7, 0.1, 0.85, 0, 0.2, k.woodDark),
    ];
    const geometry = this.keep(mergeGeometries(parts));
    parts.forEach((g) => g.dispose());
    this.barPieces = [];
    this.layout.segments.forEach((s, si) => {
      for (const p of s.barricade.pieces) this.barPieces.push({ si, piece: p });
    });
    this.barricades = new THREE.InstancedMesh(geometry, this.lambert, this.barPieces.length);
    this.barricades.castShadow = true;
    this.group.add(this.barricades);
  }

  updateBarricades() {
    this.barPieces.forEach(({ si, piece }, i) => {
      const b = this.state.segments[si].barricade;
      if (!b.built) this.barricades.setMatrixAt(i, this.zero);
      else this.barricades.setMatrixAt(i, this.pieceMatrix(piece, this.leanFor(b) * 0.4, 0, 0.45 + 0.55 * (b.health / b.max)));
    });
    this.barricades.instanceMatrix.needsUpdate = true;
  }

  buildSpikes() {
    const k = this.look;
    const parts = [this.box(1.8, 0.08, 0.9, 0, 0, 0, k.woodDark)];
    for (let i = 0; i < 14; i++) {
      const x = this.rng.range(-0.8, 0.8);
      const z = this.rng.range(-0.38, 0.38);
      const h = this.rng.range(0.35, 0.6);
      const cone = new THREE.ConeGeometry(0.05, h, 5).translate(0, h / 2 + 0.08, 0);
      cone.rotateX(this.rng.range(-0.35, 0.35));
      cone.translate(x, 0, z);
      parts.push(paint(cone, k.spike));
    }
    const geometry = this.keep(mergeGeometries(parts));
    parts.forEach((g) => g.dispose());
    this.spikes = new THREE.InstancedMesh(geometry, this.lambert, this.layout.segments.length);
    this.group.add(this.spikes);
  }

  updateSpikes() {
    this.layout.segments.forEach((g, i) => {
      const trap = this.state.segments[i].spike;
      if (!trap.built) {
        this.spikes.setMatrixAt(i, this.zero);
        return;
      }
      const a = (g.a0 + g.a1) / 2;
      this.q.setFromAxisAngle(Y_AXIS, a); // the board runs along the fence
      this.v.set(g.spike.x, this.ground.heightAt(g.spike.x, g.spike.z) - 0.04, g.spike.z);
      const worn = trap.durability > 0 ? 1 : 0.25;
      this.s.set(1, worn, 1);
      this.spikes.setMatrixAt(i, this.m4.compose(this.v, this.q, this.s));
    });
    this.spikes.instanceMatrix.needsUpdate = true;
  }

  buildFloodlights() {
    const k = this.look;
    const f = this.cfg.floodlight;
    const H = f.poleHeight;
    const parts = [this.box(0.16, H, 0.16, 0, 0, 0, k.metalDark), this.box(0.1, 0.1, 0.8, 0, H - 0.2, 0.35, k.metalDark), this.box(0.5, 0.4, 0.3, 0, H - 0.45, 0.75, k.metal)];
    const poleGeo = this.keep(mergeGeometries(parts));
    parts.forEach((g) => g.dispose());
    const n = this.layout.floods.length;
    this.floodPoles = new THREE.InstancedMesh(poleGeo, this.lambert, n);
    this.floodPoles.castShadow = true;
    this.lampMaterial = this.keep(new THREE.MeshBasicMaterial({ color: f.color }));
    this.lamps = new THREE.InstancedMesh(this.keep(new THREE.BoxGeometry(0.42, 0.32, 0.04).translate(0, H - 0.25, 0.92)), this.lampMaterial, n);
    // Fake light: a soft cone and a pool on the ground (additive, no real
    // light, so the light budget and shaders don't change). No fog on them:
    // additive fog adds the fog's colour and turns the beam into a grey wall.
    const coneLen = Math.hypot(f.poolOutside + this.cfg.layout.floodInside, H);
    const cone = new THREE.ConeGeometry(f.poolRadius * 0.75, coneLen, 20, 1, true).translate(0, -coneLen / 2, 0);
    this.coneMaterial = this.keep(new THREE.MeshBasicMaterial({ color: f.color, transparent: true, opacity: f.coneOpacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide, fog: false })); // one side: both doubled it
    this.cones = new THREE.InstancedMesh(this.keep(cone), this.coneMaterial, n);
    this.poolMaterial = this.keep(new THREE.MeshBasicMaterial({ map: this.keep(radialTexture()), color: f.color, transparent: true, opacity: f.poolOpacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    this.pools = new THREE.InstancedMesh(this.keep(new THREE.CircleGeometry(f.poolRadius, 28).rotateX(-Math.PI / 2)), this.poolMaterial, n);
    this.group.add(this.floodPoles, this.lamps, this.cones, this.pools);
  }

  updateFloodlights(lit) {
    const f = this.cfg.floodlight;
    const H = f.poleHeight;
    this.layout.floods.forEach((fl, i) => {
      const built = this.state.floods[i].built;
      if (!built) {
        for (const m of [this.floodPoles, this.lamps, this.cones, this.pools]) m.setMatrixAt(i, this.zero);
        return;
      }
      const gy = this.ground.heightAt(fl.x, fl.z);
      this.q.setFromAxisAngle(Y_AXIS, fl.angle); // local +z faces outward
      this.v.set(fl.x, gy, fl.z);
      this.s.set(1, 1, 1);
      this.floodPoles.setMatrixAt(i, this.m4.compose(this.v, this.q, this.s));
      this.lamps.setMatrixAt(i, this.m4);
      if (!lit) {
        this.cones.setMatrixAt(i, this.zero);
        this.pools.setMatrixAt(i, this.zero);
        return;
      }
      const reach = f.poolOutside + this.cfg.layout.floodInside;
      const px = fl.x + Math.sin(fl.angle) * reach;
      const pz = fl.z + Math.cos(fl.angle) * reach;
      const py = this.ground.heightAt(px, pz);
      this.v.set(px, py + 0.06, pz);
      this.pools.setMatrixAt(i, this.m4.compose(this.v, this.q.identity(), this.s));
      // The cone hangs from the lamp toward the pool.
      const lamp = this.v.set(fl.x + Math.sin(fl.angle) * 0.9, gy + H - 0.3, fl.z + Math.cos(fl.angle) * 0.9);
      const dir = new THREE.Vector3(px - lamp.x, py - lamp.y, pz - lamp.z).normalize();
      this.q.setFromUnitVectors(DOWN, dir);
      this.cones.setMatrixAt(i, this.m4.compose(lamp, this.q, this.s));
    });
    for (const m of [this.floodPoles, this.lamps, this.cones, this.pools]) m.instanceMatrix.needsUpdate = true;
    this.lampMaterial.color.set(lit ? f.color : this.look.emptySlot);
  }

  // ---- the turret ------------------------------------------------------------------

  buildTurret() {
    const k = this.look;
    const tc = this.cfg.turret;
    const pad = this.layout.turretPad;
    const gy = this.ground.heightAt(pad.x, pad.z) + 0.15;
    const baseParts = [];
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      baseParts.push(this.beam(Math.sin(a) * 0.7, 0, Math.cos(a) * 0.7, 0, tc.muzzleHeight - 0.35, 0, 0.08, k.metalDark));
    }
    baseParts.push(this.box(0.3, 0.3, 0.3, 0, tc.muzzleHeight - 0.5, 0, k.metalDark));
    this.turretBase = new THREE.Mesh(this.keep(mergeGeometries(baseParts)), this.lambert);
    baseParts.forEach((g) => g.dispose());
    this.turretBase.position.set(pad.x, gy, pad.z);
    this.turretBase.castShadow = true;
    const headParts = [
      this.box(0.55, 0.35, 0.75, 0, -0.18, -0.05, k.metal),
      this.box(0.3, 0.25, 0.35, 0.38, -0.2, -0.05, k.ammoCan), // ammo can
      this.box(0.2, 0.12, 0.2, 0, 0.17, -0.1, k.metalDark), // sight
    ];
    const barrel = new THREE.CylinderGeometry(0.05, 0.06, 1.05, 10).rotateX(Math.PI / 2).translate(0, 0, 0.75);
    headParts.push(paint(barrel, k.metalDark));
    const shroud = new THREE.CylinderGeometry(0.09, 0.09, 0.4, 10).rotateX(Math.PI / 2).translate(0, 0, 0.45);
    headParts.push(paint(shroud, k.metal));
    this.turretHead = new THREE.Mesh(this.keep(mergeGeometries(headParts)), this.lambert);
    headParts.forEach((g) => g.dispose());
    this.turretHead.rotation.order = 'YXZ';
    this.turretHead.position.set(pad.x, gy + tc.muzzleHeight - 0.15, pad.z);
    this.turretHead.castShadow = true;
    this.turretHeadY = this.turretHead.position.y;
    this.group.add(this.turretBase, this.turretHead);
  }

  updateTurret(turret) {
    const on = this.state.turret.installed;
    this.turretBase.visible = on;
    this.turretHead.visible = on;
    if (!on || !turret) return;
    const h = this.turretHead;
    h.rotation.y = turret.yaw;
    h.rotation.x = -turret.pitch;
    // Kick back along the barrel as it fires.
    const back = turret.recoil * 0.12;
    h.position.x = turret.x - Math.sin(turret.yaw) * back;
    h.position.z = turret.z - Math.cos(turret.yaw) * back;
  }

  // ---- windows, monitors, the family ---------------------------------------------------

  buildGlow() {
    const c = this.layout.cabin;
    const fy = this.floorY;
    const k = this.look;
    const parts = [];
    // Windows: either side of the front door, and in the east and west walls.
    for (const sx of [-1, 1]) parts.push(this.box(1.1, 0.8, 0.24, c.x + sx * 3.2, fy + 1.3, c.z + c.halfD, k.windowGlow));
    for (const sx of [-1, 1]) parts.push(this.box(0.24, 0.8, 1.1, c.x + sx * c.halfW, fy + 1.3, c.z + c.halfD - 2.2, k.windowGlow));
    // The interior's bulbs, the lantern, the radio's meter.
    parts.push(...this.interior.glow);
    this.glowMaterial = this.keep(new THREE.MeshBasicMaterial({ vertexColors: true }));
    this.glow = this.merged(parts, this.glowMaterial, false);
    // The woodstove's fire, through its door: flickers (update()).
    this.fireMaterial = this.keep(new THREE.MeshBasicMaterial({ vertexColors: true }));
    this.merged(this.interior.fire, this.fireMaterial, false);
    // The monitors: static, rolling (update()).
    this.staticUniforms = { uTime: { value: 0 }, uTint: { value: new THREE.Color(k.monitorGlow) }, uLevel: { value: 1 } };
    const screens = this.keep(
      new THREE.ShaderMaterial({
        uniforms: this.staticUniforms,
        vertexShader: 'varying vec2 vUv;\nvoid main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }',
        fragmentShader: STATIC_FRAGMENT,
      }),
    );
    this.screens = this.merged(this.interior.screens, screens, false);
    this.screens.receiveShadow = false;
    // The rooms' light: a warm point light at each room's lamp (the main
    // room's bulb, the comms room's desk lamp), no shadows.
    const il = this.look.interiorLight;
    this.interiorLights = this.interior.lamps.map((at) => {
      const light = new THREE.PointLight(il.color, il.intensity, il.distance, il.decay);
      light.position.set(at.x, at.y, at.z);
      this.group.add(light);
      return light;
    });
  }

  // Session 13 (#148): the real family (render/FamilyRenderer.js). One
  // mesh each, standing at its spot facing into the comms room, so each
  // can bob as they talk (story/FamilyTalk.js, M8).
  buildFamily() {
    const { cfg, ids } = this.familyOpts;
    const c = this.layout.cabin.commsCentre;
    this.familyRenderer = new FamilyRenderer(cfg, ids);
    this.familyRenderer.init(this.group, this.layout.cabin.family, this.floorY, (s) => Math.atan2(c.x - s.x, c.z - s.z));
    this.family = this.familyRenderer.meshes;
  }

  // Through the heat scope the family glow too.
  setThermal(on, t) {
    this.familyRenderer.setThermal(on, t);
  }

  // ---- each frame -------------------------------------------------------------------------

  // Redraw the instances whose state changed (cheap to check every frame).
  refresh(force = false) {
    const s = this.state;
    // A number that changes whenever anything drawn here changes (no strings per frame).
    let key = 0;
    s.segments.forEach((seg, i) => {
      const bar = seg.barricade.built ? 1 + Math.round((seg.barricade.health / seg.barricade.max) * 10) : 0;
      const spike = seg.spike.built ? (seg.spike.durability > 0 ? 1 : 2) : 0;
      key = (key * 31 + Math.round((seg.health / seg.max) * 20) * 41 + bar * 3 + spike + i) % 1e9;
    });
    if (force || key !== this.lastKey) {
      this.lastKey = key;
      this.updatePanels();
      this.updateBarricades();
      this.updateSpikes();
      this.floodKey = -1; // floodlights redraw below
    }
  }

  update(dt, cameraPosition, daylight, turret) {
    this.time += dt;
    const c = this.layout.centre;
    const near = Math.hypot(cameraPosition.x - c.x, cameraPosition.z - c.z) <= this.drawDistance + this.look.cullMargin;
    this.group.visible = near;
    if (!near) return;
    this.refresh();
    this.updateGateAndDoors();
    this.updateTurret(turret);
    const night = 1 - daylight;
    const lit = night > 0.35 && this.state.powered;
    let floodKey = lit ? 1 : 0;
    for (const f of this.state.floods) floodKey = floodKey * 2 + (f.built ? 1 : 0);
    if (floodKey !== this.floodKey) {
      this.floodKey = floodKey;
      this.updateFloodlights(lit);
    }
    // Windows and monitors: faint by day, bright at night.
    this.glowMaterial.color.setScalar(0.3 + 0.7 * night);
    // The fire flickers; the room's light breathes with it, dimmer without the fence's charge.
    const flame = 0.75 + 0.15 * Math.sin(this.time * 9.1) + 0.1 * Math.sin(this.time * 23.7 + 1.3);
    this.fireMaterial.color.setScalar(flame);
    const il = this.look.interiorLight;
    for (const light of this.interiorLights) light.intensity = il.intensity * (this.state.powered ? 1 : il.unpowered) * (0.95 + 0.05 * flame);
    this.staticUniforms.uTime.value = this.time;
    this.staticUniforms.uLevel.value = 0.55 + 0.45 * night;
    this.familyRenderer.update(dt, cameraPosition);
    // The wires glow while charged, flickering, and flare when a battery goes in.
    this.wirePulse = Math.max(0, this.wirePulse - dt * 0.8);
    if (this.state.powered) {
      const flicker = 0.75 + 0.25 * Math.sin(this.time * 31) * Math.sin(this.time * 7.3);
      this.wireMaterial.color.set(this.look.wireCharged).multiplyScalar((0.35 + 0.65 * night) * flicker + this.wirePulse);
    } else {
      this.wireMaterial.color.set(this.look.wireDead);
    }
  }

  dispose() {
    this.familyRenderer.dispose();
    for (const d of this.disposables) d.dispose();
    this.group.removeFromParent();
  }
}

// The monitors' static: snow, a rolling bar, scanlines, in the monitors' tint.
const STATIC_FRAGMENT = `uniform float uTime;
uniform vec3 uTint;
uniform float uLevel;
varying vec2 vUv;
float h( vec2 p ) { return fract( sin( dot( p, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 ); }
void main() {
  vec2 px = floor( vUv * vec2( 96.0, 72.0 ) );
  float snow = h( px + floor( uTime * 24.0 ) * vec2( 7.0, 13.0 ) );
  float roll = smoothstep( 0.0, 0.08, abs( fract( vUv.y + uTime * 0.23 ) - 0.5 ) - 0.38 );
  float lines = 0.75 + 0.25 * sin( vUv.y * 72.0 * 3.14159 );
  float vignette = smoothstep( 0.75, 0.3, length( vUv - 0.5 ) );
  float v = ( 0.25 + 0.6 * snow ) * lines * vignette * ( 0.75 + 0.25 * roll );
  gl_FragColor = vec4( uTint * v * uLevel, 1.0 );
}`;

const X_AXIS = new THREE.Vector3(1, 0, 0);
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const DOWN = new THREE.Vector3(0, -1, 0);

// Give a geometry one flat vertex colour (for merged vertex-coloured meshes).
function paint(geometry, color) {
  const g = geometry.index ? geometry : geometry;
  const n = g.attributes.position.count;
  const c = new THREE.Color(color);
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

// Chain-link: a diamond mesh of wire on a transparent background.
function chainLinkTexture(size, color) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = `#${new THREE.Color(color).getHexString()}`;
  ctx.lineWidth = Math.max(2, size / 22);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(size, size);
  ctx.moveTo(size, 0);
  ctx.lineTo(0, size);
  ctx.stroke();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// A soft round spot for the floodlights' pools.
function radialTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}
