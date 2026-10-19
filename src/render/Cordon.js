// The military cordon, drawn (M9.1): chain-link panels on steel posts with
// a razor-wire coil along the top, edge to edge of the map; torn panels
// peeled in from the far side, their coil sagging; RESTRICTED AREA signs
// facing the cluster; dark, broken floodlight posts; concrete barriers by
// the checkpoint; and the checkpoint itself: two gateposts, a sliding
// chain-link gate, a striped barrier arm and a guard booth. Everything
// but the gate and arm is instanced (one draw call per kind). No lights.
// Layout and colliders: world/cordon.js.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { css, makeCanvas, toTexture } from './proceduralTextures.js';
import { makeSignTexture } from './mapTextures.js';
import { cordonLayout, cordonColliders, checkpointGateCollider } from '../world/cordon.js';

const Y = new THREE.Vector3(0, 1, 0);
const X = new THREE.Vector3(1, 0, 0);

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

// Razor wire seen side on: overlapping loops with barbs, on transparent.
function coilTexture(color) {
  const { canvas, ctx } = makeCanvas(256, 64);
  ctx.strokeStyle = css(color);
  ctx.lineWidth = 2;
  for (let i = -1; i < 9; i++) {
    ctx.beginPath();
    ctx.ellipse(i * 32 + 16, 32, 26, 28, 0.35, 0, Math.PI * 2);
    ctx.stroke();
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + 0.4;
      const x = i * 32 + 16 + Math.cos(a) * 26;
      const y = 32 + Math.sin(a) * 28;
      ctx.beginPath();
      ctx.moveTo(x - 3, y - 3);
      ctx.lineTo(x + 3, y + 3);
      ctx.stroke();
    }
  }
  return toTexture(canvas, { repeat: true });
}

// Red and white stripes for the barrier arm.
function stripeTexture(color) {
  const { canvas, ctx } = makeCanvas(128, 16);
  ctx.fillStyle = css(color);
  ctx.fillRect(0, 0, 128, 16);
  ctx.fillStyle = css(0x5e1c14);
  for (let x = 0; x < 128; x += 32) ctx.fillRect(x, 0, 16, 16);
  return toTexture(canvas);
}

export class Cordon {
  // cfg: config.map.cordon. landmarkCfg: config.landmarks (sign texture size).
  constructor(cfg, landmarkCfg) {
    this.cfg = cfg;
    this.landmarkCfg = landmarkCfg;
    this.keep = [];
    this.m = new THREE.Matrix4();
    this.q = new THREE.Quaternion();
    this.q2 = new THREE.Quaternion();
    this.v = new THREE.Vector3();
    this.s = new THREE.Vector3();
  }

  init(scene, colliders, map, ground) {
    const c = this.cfg;
    this.ground = ground;
    this.layout = cordonLayout(map, c);
    this.group = new THREE.Group();
    for (const col of cordonColliders(this.layout, c, (x, z) => ground.heightAt(x, z))) colliders.insert(col);
    this.gateCollider = checkpointGateCollider(this.layout, c, (x, z) => ground.heightAt(x, z));
    colliders.insert(this.gateCollider);
    this.buildPanels();
    this.buildPosts();
    this.buildSigns();
    this.buildLamps();
    this.buildBarriers();
    this.buildCheckpoint(colliders);
    this.setCheckpointOpen(false, true);
    scene.add(this.group);
  }

  hold(x) {
    this.keep.push(x);
    return x;
  }

  // Panels and their coils: a whole panel stands upright; a torn one is
  // peeled in (its top falls north) and its coil sags with it.
  buildPanels() {
    const c = this.cfg;
    const tex = this.hold(chainLinkTexture(c.chainLinkTexture, c.chainLink));
    tex.repeat.set(c.panelLength / 0.25, c.height / 0.25);
    const chain = this.hold(new THREE.MeshLambertMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    const plane = this.hold(new THREE.PlaneGeometry(1, c.height).translate(0.5, c.height / 2 + 0.05, 0));
    const panels = this.layout.panels;
    this.panels = new THREE.InstancedMesh(plane, chain, panels.length);
    const coilTex = this.hold(coilTexture(c.coilColor));
    coilTex.repeat.set(c.panelLength / 2, 1);
    // Tinted down: wire seen face-on right under the torch still glared.
    const coilMat = this.hold(new THREE.MeshLambertMaterial({ map: coilTex, color: 0x5a5a5a, alphaTest: 0.5, side: THREE.DoubleSide }));
    // Two crossed planes, so the coil has body from any side.
    const a = new THREE.PlaneGeometry(1, c.coilHeight).translate(0.5, 0, 0);
    const b = a.clone().rotateX(Math.PI / 2).scale(1, 1, 1);
    const coilGeo = this.hold(mergeGeometries([a, b]));
    a.dispose();
    b.dispose();
    this.coils = new THREE.InstancedMesh(coilGeo, coilMat, panels.length);
    panels.forEach((p, i) => {
      const torn = p.kind === 'torn';
      const lean = torn ? -c.gapPeel : 0; // negative x-rotation tips the top toward -z (north)
      const y = Math.min(this.ground.heightAt(p.ax, p.az), this.ground.heightAt(p.bx, p.bz));
      const len = Math.hypot(p.bx - p.ax, p.bz - p.az);
      this.q.setFromAxisAngle(Y, Math.atan2(-(p.bz - p.az), p.bx - p.ax));
      this.q2.setFromAxisAngle(X, lean);
      this.q.multiply(this.q2);
      this.panels.setMatrixAt(i, this.m.compose(this.v.set(p.ax, y + (torn ? 0.35 : 0), p.az), this.q, this.s.set(len, torn ? 0.8 : 1, 1)));
      // The coil rides the panel's top edge.
      const top = torn ? c.height * 0.8 : c.height + c.coilHeight * 0.5;
      const dz = torn ? -Math.sin(c.gapPeel) * top : 0;
      const dy = torn ? Math.cos(c.gapPeel) * top + 0.35 : top;
      this.coils.setMatrixAt(i, this.m.compose(this.v.set(p.ax, y + dy, p.az + dz), this.q.setFromAxisAngle(Y, 0), this.s.set(len, 1, 1)));
    });
    this.panels.receiveShadow = true;
    this.panels.computeBoundingSphere();
    this.coils.computeBoundingSphere();
    this.group.add(this.panels, this.coils);
  }

  buildPosts() {
    const c = this.cfg;
    const h = c.height + c.coilHeight;
    const geo = this.hold(new THREE.CylinderGeometry(c.postRadius, c.postRadius, h, 6).translate(0, h / 2, 0));
    const mat = this.hold(new THREE.MeshLambertMaterial({ color: c.post }));
    const posts = this.layout.posts;
    this.posts = new THREE.InstancedMesh(geo, mat, posts.length);
    posts.forEach((p, i) => this.posts.setMatrixAt(i, this.m.makeTranslation(p.x, this.ground.heightAt(p.x, p.z) - 0.1, p.z)));
    this.posts.castShadow = true;
    this.posts.computeBoundingSphere();
    this.group.add(this.posts);
  }

  // Plates wired to the north face of the fence.
  buildSigns() {
    const c = this.cfg;
    const l = this.landmarkCfg;
    const tex = this.hold(makeSignTexture({ ...l, boardColor: c.signColor, boardGrain: c.signColor, textColor: c.signText }, c.signTitle, c.signLines));
    const mat = this.hold(new THREE.MeshLambertMaterial({ map: tex }));
    const geo = this.hold(new THREE.PlaneGeometry(c.signSize[0], c.signSize[1]).rotateY(Math.PI)); // faces north (-z)
    const signs = this.layout.signs;
    this.signs = new THREE.InstancedMesh(geo, mat, signs.length);
    signs.forEach((s, i) => this.signs.setMatrixAt(i, this.m.makeTranslation(s.x, this.ground.heightAt(s.x, s.z) + 1.5, s.z - c.thickness - 0.03)));
    this.signs.computeBoundingSphere();
    this.group.add(this.signs);
  }

  // Floodlight posts on the south side, heads turned in over the fence:
  // dark glass, broken, no light.
  buildLamps() {
    const c = this.cfg;
    const pole = new THREE.CylinderGeometry(0.07, 0.09, c.lampHeight, 6).translate(0, c.lampHeight / 2, 0);
    const arm = new THREE.BoxGeometry(0.08, 0.08, 1.2).translate(0, c.lampHeight - 0.1, -0.55);
    const head = new THREE.BoxGeometry(0.5, 0.32, 0.3).rotateX(0.5).translate(0, c.lampHeight - 0.25, -1.1);
    const geo = this.hold(mergeGeometries([pole.toNonIndexed(), arm.toNonIndexed(), head.toNonIndexed()]));
    pole.dispose();
    arm.dispose();
    head.dispose();
    const mat = this.hold(new THREE.MeshLambertMaterial({ color: c.lampColor }));
    const lamps = this.layout.lamps;
    this.lamps = new THREE.InstancedMesh(geo, mat, lamps.length);
    lamps.forEach((p, i) => this.lamps.setMatrixAt(i, this.m.makeTranslation(p.x, this.ground.heightAt(p.x, p.z + 1.2), p.z + 1.2)));
    this.lamps.castShadow = true;
    this.lamps.computeBoundingSphere();
    this.group.add(this.lamps);
  }

  // Concrete (jersey) barriers: a wide foot, a narrower top.
  buildBarriers() {
    const c = this.cfg;
    const foot = new THREE.BoxGeometry(c.barrierLength, 0.35, 0.6).translate(0, 0.175, 0);
    const top = new THREE.BoxGeometry(c.barrierLength, 0.5, 0.25).translate(0, 0.6, 0);
    const geo = this.hold(mergeGeometries([foot, top]));
    foot.dispose();
    top.dispose();
    const mat = this.hold(new THREE.MeshLambertMaterial({ color: c.barrierColor }));
    const list = this.layout.barriers;
    this.barriers = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((b, i) => this.barriers.setMatrixAt(i, this.m.makeTranslation(b.x, this.ground.heightAt(b.x, b.z) - 0.05, b.z)));
    this.barriers.castShadow = true;
    this.barriers.computeBoundingSphere();
    this.group.add(this.barriers);
  }

  // The checkpoint: gateposts, a sliding gate, the barrier arm and a booth.
  buildCheckpoint(colliders) {
    const c = this.cfg;
    const cp = this.layout.checkpoint;
    const y = this.ground.heightAt(cp.x, cp.z);
    const metal = this.hold(new THREE.MeshLambertMaterial({ color: c.gateColor }));
    const postGeo = this.hold(new THREE.BoxGeometry(0.22, c.height + 0.8, 0.22).translate(0, (c.height + 0.8) / 2, 0));
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(postGeo, metal);
      post.position.set(cp.x + side * cp.half, this.ground.heightAt(cp.x + side * cp.half, cp.z) - 0.1, cp.z);
      post.castShadow = true;
      this.group.add(post);
      colliders.insert({ x: post.position.x, z: cp.z, r: 0.2, top: y + c.height + 0.8 });
    }
    // The gate: a framed chain-link panel the width of the gap, on the north side; it slides east.
    const width = cp.half * 2;
    const tex = this.hold(chainLinkTexture(c.chainLinkTexture, c.chainLink));
    tex.repeat.set(width / 0.25, c.height / 0.25);
    const chain = this.hold(new THREE.MeshLambertMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    this.gate = new THREE.Group();
    const mesh = new THREE.Mesh(this.hold(new THREE.PlaneGeometry(width, c.height - 0.2)), chain);
    mesh.position.y = c.height / 2 + 0.1;
    this.gate.add(mesh);
    const frame = (w, h, px, py) => {
      const f = new THREE.Mesh(this.hold(new THREE.BoxGeometry(w, h, 0.08)), metal);
      f.position.set(px, py, 0);
      f.castShadow = true;
      this.gate.add(f);
    };
    frame(width, 0.08, 0, 0.15);
    frame(width, 0.08, 0, c.height);
    frame(0.08, c.height, -width / 2, c.height / 2);
    frame(0.08, c.height, width / 2, c.height / 2);
    frame(0.06, c.height, 0, c.height / 2);
    this.gateClosed = new THREE.Vector3(cp.x, y, cp.z - 0.35);
    this.gateOpen = new THREE.Vector3(cp.x + width - 0.4, y, cp.z - 0.55);
    this.group.add(this.gate);
    // The barrier arm, pivoting on a post west of the road, north of the gate.
    const stripes = this.hold(stripeTexture(c.armColor));
    this.armPivot = new THREE.Group();
    this.armPivot.position.set(cp.x - cp.half - 0.6, this.ground.heightAt(cp.x - cp.half - 0.6, cp.z - 4) + 1.0, cp.z - 4);
    const arm = new THREE.Mesh(this.hold(new THREE.BoxGeometry(width + 0.4, 0.12, 0.12).translate((width + 0.4) / 2, 0, 0)), this.hold(new THREE.MeshLambertMaterial({ map: stripes })));
    arm.castShadow = true;
    this.armPivot.add(arm);
    this.group.add(this.armPivot);
    const armPost = new THREE.Mesh(this.hold(new THREE.BoxGeometry(0.3, 1.1, 0.3).translate(0, 0.55, 0)), metal);
    armPost.position.set(this.armPivot.position.x, this.armPivot.position.y - 1.0, this.armPivot.position.z);
    this.group.add(armPost);
    colliders.insert({ x: armPost.position.x, z: armPost.position.z, r: 0.25, top: armPost.position.y + 1.1 });
    // The guard booth, north-east of the gate.
    const booth = new THREE.Mesh(this.hold(new THREE.BoxGeometry(2.2, 2.5, 2.2).translate(0, 1.25, 0)), this.hold(new THREE.MeshLambertMaterial({ color: c.boothColor })));
    const roof = new THREE.Mesh(this.hold(new THREE.BoxGeometry(2.6, 0.15, 2.6).translate(0, 2.58, 0)), metal);
    const bx = cp.x + cp.half + 2.2;
    const bz = cp.z - 3.5;
    const by = this.ground.heightAt(bx, bz) - 0.05;
    booth.position.set(bx, by, bz);
    roof.position.set(bx, by, bz);
    booth.castShadow = true;
    this.group.add(booth, roof);
    colliders.insert({ x: bx, z: bz, r: 1.4, top: by + 2.6 });
  }

  // Open: the gate slides aside and the arm swings up. instant skips nothing
  // (there's no animation yet); kept for the gates' interface.
  setCheckpointOpen(open, instant = false) {
    void instant;
    this.checkpointOpen = open;
    this.gate.position.copy(open ? this.gateOpen : this.gateClosed);
    this.armPivot.rotation.z = open ? Math.PI * 0.45 : 0;
    this.gateCollider.off = open;
  }

  dispose() {
    for (const x of this.keep) x.dispose();
    this.group.removeFromParent();
  }
}
