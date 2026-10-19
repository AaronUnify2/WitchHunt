// The cluster's gates, drawn (M9.1): placeholder-plus props in code, each
// with a shut look and an open one.
//  - pipeGate: a ranger's steel pipe gate on two posts, chained and
//    padlocked, PRIVATE - PRUITT LAND; wire strung on short posts either
//    side. Open: swung back against the verge.
//  - fallenTree: an oak down across the trail, root plate and all, a few
//    dead limbs. Open: the stretch over the trail cut out and rolled aside.
//  - chainGate: the outpost's chain-link double gate on tall posts with
//    chain-link wings. Open: both leaves swung in.
// Each gate is a group turned so local +z runs along the path (the way
// the path heads through it) and +x across it. No lights; a handful of
// small meshes per gate, near the station or not at all.

import * as THREE from 'three';
import { css, makeCanvas, toTexture } from './proceduralTextures.js';
import { makeSignTexture } from './mapTextures.js';

function chainLinkTexture(color) {
  const { canvas, ctx } = makeCanvas(64, 64);
  ctx.strokeStyle = css(color);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(64, 64);
  ctx.moveTo(64, 0);
  ctx.lineTo(0, 64);
  ctx.stroke();
  return toTexture(canvas, { repeat: true });
}

export class GateProps {
  // cfg: config.map.gates. landmarkCfg: config.landmarks (sign texture size).
  constructor(cfg, landmarkCfg) {
    this.cfg = cfg;
    this.landmarkCfg = landmarkCfg;
    this.keep = [];
    this.byId = new Map();
  }

  hold(x) {
    this.keep.push(x);
    return x;
  }

  mat(color, extra = {}) {
    return this.hold(new THREE.MeshLambertMaterial({ color, ...extra }));
  }

  box(w, h, d) {
    return this.hold(new THREE.BoxGeometry(w, h, d));
  }

  cyl(rTop, rBottom, h, seg = 7) {
    return this.hold(new THREE.CylinderGeometry(rTop, rBottom, h, seg));
  }

  sign(text, w, h) {
    const l = this.landmarkCfg;
    const tex = this.hold(makeSignTexture({ ...l, boardColor: this.cfg.signColor, boardGrain: this.cfg.signColor, textColor: this.cfg.signText }, text, []));
    return new THREE.Mesh(this.hold(new THREE.PlaneGeometry(w, h)), this.mat(0xffffff, { map: tex, side: THREE.DoubleSide }));
  }

  // gates: from world/gates.js gateLayout() (the checkpoint is skipped: the cordon draws it).
  init(scene, gates, ground) {
    this.ground = ground;
    this.group = new THREE.Group();
    for (const g of gates) {
      if (g.kind === 'checkpoint') continue;
      const holder = new THREE.Group();
      holder.position.set(g.x, ground.heightAt(g.x, g.z), g.z);
      holder.rotation.y = Math.atan2(g.tx, g.tz);
      holder.updateMatrixWorld();
      const built = this[g.kind](holder, g);
      this.group.add(holder);
      this.byId.set(g.id, { holder, ...built });
    }
    scene.add(this.group);
  }

  // Ground height under a point in a holder's local frame, relative to its origin.
  localGround(holder, lx, lz) {
    const v = holder.localToWorld(new THREE.Vector3(lx, 0, lz));
    return this.ground.heightAt(v.x, v.z) - holder.position.y;
  }

  pipeGate(holder, g) {
    const k = this.cfg.pipeGate;
    const steel = this.mat(k.color);
    const post = this.mat(k.post);
    const half = k.width / 2;
    for (const side of [-1, 1]) {
      const p = new THREE.Mesh(this.cyl(0.09, 0.1, k.height + 0.5), post);
      p.position.set(side * (half + 0.15), this.localGround(holder, side * (half + 0.15), 0) + (k.height + 0.5) / 2 - 0.2, 0);
      p.castShadow = true;
      holder.add(p);
    }
    // The swinging frame, hinged at the west post (x = -half).
    const hinge = new THREE.Group();
    hinge.position.set(-half, this.localGround(holder, -half, 0), 0);
    const rail = (y) => {
      const r = new THREE.Mesh(this.box(k.width, 0.07, 0.07), steel);
      r.position.set(half, y, 0);
      r.castShadow = true;
      hinge.add(r);
    };
    rail(k.height);
    rail(k.height * 0.45);
    const brace = new THREE.Mesh(this.box(Math.hypot(k.width, k.height * 0.55), 0.05, 0.05), steel);
    brace.position.set(half, k.height * 0.72, 0);
    brace.rotation.z = Math.atan2(k.height * 0.55, k.width);
    hinge.add(brace);
    for (const x of [0.05, k.width - 0.05]) {
      const upright = new THREE.Mesh(this.box(0.07, k.height * 0.6, 0.07), steel);
      upright.position.set(x, k.height * 0.72, 0);
      hinge.add(upright);
    }
    const sign = this.sign(k.sign, 0.9, 0.35);
    sign.position.set(half, k.height * 0.72, 0.05);
    hinge.add(sign);
    holder.add(hinge);
    // The chain and padlock at the free end.
    const lock = new THREE.Mesh(this.box(0.1, 0.14, 0.12), this.mat(0x2a2620));
    lock.position.set(half + 0.12, this.localGround(holder, half, 0) + k.height * 0.8, 0.05);
    holder.add(lock);
    this.wings(holder, half + 0.3, k.wing, k.post, 1.1);
    return {
      setOpen: (open) => {
        hinge.rotation.y = open ? -1.7 : 0; // swings back along the path
        lock.visible = !open;
      },
    };
  }

  // Wire strung on short wooden posts either side of a gate.
  wings(holder, from, length, color, height) {
    const post = this.mat(color);
    const pts = [];
    for (const side of [-1, 1]) {
      let prev = null;
      for (let d = 0; d <= length + 0.01; d += length / 3) {
        const x = side * (from + d);
        const y = this.localGround(holder, x, 0);
        const p = new THREE.Mesh(this.cyl(0.05, 0.06, height), post);
        p.position.set(x, y + height / 2 - 0.1, 0);
        holder.add(p);
        if (prev) for (const h of [0.45, 0.9]) pts.push(prev.x, prev.y + h * height, 0, x, y + h * height, 0);
        prev = { x, y };
      }
    }
    const geo = this.hold(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    holder.add(new THREE.LineSegments(geo, this.hold(new THREE.LineBasicMaterial({ color: 0x1c1c1c }))));
  }

  fallenTree(holder, g) {
    const k = this.cfg.fallenTree;
    const bark = this.mat(k.bark);
    const wood = this.mat(k.wood);
    const branchMat = this.mat(k.branch);
    // The trunk lies across the path, a little askew, root plate to the west.
    const tree = new THREE.Group();
    tree.rotation.y = -0.25;
    holder.add(tree);
    const half = k.length / 2;
    const gap = 2.6; // the stretch over the trail (cut out when it opens)
    const piece = (x0, x1, r0, r1) => {
      const len = x1 - x0;
      const m = new THREE.Mesh(this.cyl(r1, r0, len, 9), bark);
      m.rotation.z = -Math.PI / 2; // lies along +x
      const mid = (x0 + x1) / 2;
      m.position.set(mid, this.localGround(holder, mid, 0) + (r0 + r1) / 2 - 0.08, 0);
      m.castShadow = true;
      m.receiveShadow = true;
      tree.add(m);
      return m;
    };
    const rAt = (x) => k.radius * (1 - 0.55 * ((x + half) / k.length));
    piece(-half, -gap, rAt(-half), rAt(-gap));
    const middle = piece(-gap, gap, rAt(-gap), rAt(gap));
    piece(gap, half, rAt(gap), rAt(half) * 0.8);
    // Root plate: a disc of roots and earth, stood on edge.
    const root = new THREE.Mesh(this.cyl(1.7, 1.9, 0.45, 10), this.mat(0x2e261c));
    root.rotation.z = Math.PI / 2;
    root.position.set(-half - 0.2, this.localGround(holder, -half, 0) + 1.2, 0);
    root.castShadow = true;
    tree.add(root);
    // Dead limbs off the crown end.
    for (let i = 0; i < 6; i++) {
      const len = 1.5 + (i % 3) * 0.8;
      const b = new THREE.Mesh(this.cyl(0.04, 0.12, len, 5), branchMat);
      const x = half * (0.35 + i * 0.1);
      b.position.set(x, this.localGround(holder, x, 0) + rAt(x) + len * 0.35, (i % 2 ? 1 : -1) * 0.3);
      b.rotation.set((i % 2 ? 1 : -1) * 0.7, 0, 0.5 - i * 0.15);
      b.castShadow = true;
      tree.add(b);
    }
    // Cut: the middle rolled aside as two rounds on the verge, fresh-sawn faces showing.
    const rounds = [];
    for (let i = 0; i < 2; i++) {
      const r = new THREE.Mesh(this.cyl(rAt(0), rAt(0), gap * 0.9, 9), [bark, wood, wood]);
      r.rotation.x = Math.PI / 2; // lies along the path
      const x = 4.2 + i * 1.3;
      r.position.set(x, this.localGround(holder, x, 0) + rAt(0) - 0.05, i * 0.6 - 0.3);
      r.castShadow = true;
      r.visible = false;
      holder.add(r);
      rounds.push(r);
    }
    return {
      setOpen: (open) => {
        middle.visible = !open;
        for (const r of rounds) r.visible = open;
      },
    };
  }

  chainGate(holder, g) {
    const k = this.cfg.chainGate;
    const steel = this.mat(k.color);
    const tex = this.hold(chainLinkTexture(k.chainLink));
    const half = k.width / 2;
    tex.repeat.set(half / 0.25, k.height / 0.25);
    const chain = this.mat(0xffffff, { map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    for (const side of [-1, 1]) {
      const p = new THREE.Mesh(this.box(0.16, k.height + 0.4, 0.16), steel);
      p.position.set(side * (half + 0.1), this.localGround(holder, side * (half + 0.1), 0) + (k.height + 0.4) / 2 - 0.1, 0);
      p.castShadow = true;
      holder.add(p);
    }
    // Two leaves, each hinged at its post.
    const leaves = [];
    for (const side of [-1, 1]) {
      const hinge = new THREE.Group();
      hinge.position.set(side * half, this.localGround(holder, side * half, 0) + 0.05, 0);
      const w = half - 0.05;
      const mesh = new THREE.Mesh(this.hold(new THREE.PlaneGeometry(w, k.height - 0.1)), chain);
      mesh.position.set((-side * w) / 2, k.height / 2, 0);
      hinge.add(mesh);
      for (const y of [0.05, k.height]) {
        const r = new THREE.Mesh(this.box(w, 0.06, 0.06), steel);
        r.position.set((-side * w) / 2, y, 0);
        hinge.add(r);
      }
      const end = new THREE.Mesh(this.box(0.06, k.height, 0.06), steel);
      end.position.set(-side * w, k.height / 2, 0);
      hinge.add(end);
      holder.add(hinge);
      leaves.push({ hinge, side });
    }
    const sign = this.sign(k.sign, 1.4, 0.5);
    sign.position.set(-half / 2, this.localGround(holder, -half / 2, 0) + 1.5, -0.04);
    holder.add(sign);
    const lock = new THREE.Mesh(this.box(0.12, 0.4, 0.12), this.mat(0x22201c));
    lock.position.set(0, this.localGround(holder, 0, 0) + 1.2, -0.05);
    holder.add(lock);
    // Chain-link wings either side: the outpost's outer fence.
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(this.hold(new THREE.PlaneGeometry(k.wing, k.height)), chain);
      const x = side * (half + 0.2 + k.wing / 2);
      wing.position.set(x, this.localGround(holder, x, 0) + k.height / 2, 0);
      holder.add(wing);
      const end = new THREE.Mesh(this.box(0.12, k.height + 0.2, 0.12), steel);
      const ex = side * (half + 0.2 + k.wing);
      end.position.set(ex, this.localGround(holder, ex, 0) + k.height / 2, 0);
      holder.add(end);
    }
    return {
      setOpen: (open) => {
        // Both leaves swing in, toward the outpost (+z along the path).
        for (const { hinge, side } of leaves) hinge.rotation.y = open ? side * 1.5 : 0;
        lock.visible = !open;
        sign.visible = !open;
      },
    };
  }

  setOpen(id, open) {
    this.byId.get(id)?.setOpen(open);
  }

  dispose() {
    for (const x of this.keep) x.dispose();
    this.group.removeFromParent();
  }
}
