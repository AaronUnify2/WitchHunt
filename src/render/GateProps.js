// The cluster's gates, drawn (M9.1): placeholder-plus props in code, each
// with a shut look and an open one.
//  - pipeGate: a ranger's steel pipe gate on two posts, chained and
//    padlocked, PRIVATE - PRUITT LAND; wire strung on short posts either
//    side. Open: swung back against the verge.
//  - fallenTree: an oak down across the trail, root plate and all, a few
//    dead limbs. Open: the stretch over the trail cut out and rolled aside.
//  - chainGate: the outpost's chain-link double gate on tall posts with
//    chain-link wings. Open: both leaves swung in.
// Session 19 (style pass 2): the pipe gate's chain looped round its post
// and concrete footings; moss and snapped stubs on the fallen oak,
// sawdust once it's cut; barbed wire along the chain-link gate's top.
// Each gate is a group turned so local +z runs along the path (the way
// the path heads through it) and +x across it. No lights; a handful of
// small meshes per gate, near the station or not at all.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
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
    // Session 17 (Aaron: one side read backwards): two faces back to back, each reading right way round.
    const geo = this.hold(new THREE.PlaneGeometry(w, h));
    const mat = this.mat(0xffffff, { map: tex });
    const g = new THREE.Group();
    const front = new THREE.Mesh(geo, mat);
    front.position.z = 0.006;
    const back = new THREE.Mesh(geo, mat);
    back.rotation.y = Math.PI;
    back.position.z = -0.006;
    g.add(front, back);
    return g;
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
    // Session 19 (style pass 2): the chain looped round the post (a few
    // links), concrete footings at the posts' feet.
    // One mesh each (the draw-call budget).
    const linkGeos = [];
    for (let i = 0; i < 5; i++) {
      const g2 = new THREE.TorusGeometry(0.035, 0.009, 4, 8);
      g2.applyMatrix4(new THREE.Matrix4().compose(
        new THREE.Vector3(half + 0.08 + i * 0.03, this.localGround(holder, half, 0) + k.height * 0.8 - 0.06 - i * 0.055, 0.07 - (i % 2) * 0.02),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(i % 2 ? Math.PI / 2 : 0, 0.3, 0)),
        new THREE.Vector3(1, 1, 1),
      ));
      linkGeos.push(g2);
    }
    const chainMesh = new THREE.Mesh(this.hold(mergeGeometries(linkGeos)), this.mat(0x26241e));
    linkGeos.forEach((g2) => g2.dispose());
    holder.add(chainMesh);
    const links = [chainMesh];
    const footGeos = [-1, 1].map((side) => new THREE.CylinderGeometry(0.2, 0.24, 0.18, 8).translate(side * (half + 0.15), this.localGround(holder, side * (half + 0.15), 0) + 0.04, 0));
    holder.add(new THREE.Mesh(this.hold(mergeGeometries(footGeos)), this.mat(0x34322e)));
    footGeos.forEach((g2) => g2.dispose());
    this.wings(holder, half + 0.3, k.wing, k.post, 1.1);
    return {
      setOpen: (open) => {
        hinge.rotation.y = open ? -1.7 : 0; // swings back along the path
        lock.visible = !open;
        for (const l of links) l.visible = !open;
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
    // Dead limbs off the crown end (Session 19: one mesh with the snapped stubs below, was six).
    const limbs = [];
    for (let i = 0; i < 6; i++) {
      const len = 1.5 + (i % 3) * 0.8;
      const x = half * (0.35 + i * 0.1);
      const g2 = new THREE.CylinderGeometry(0.04, 0.12, len, 5);
      g2.applyMatrix4(new THREE.Matrix4().compose(
        new THREE.Vector3(x, this.localGround(holder, x, 0) + rAt(x) + len * 0.35, (i % 2 ? 1 : -1) * 0.3),
        new THREE.Quaternion().setFromEuler(new THREE.Euler((i % 2 ? 1 : -1) * 0.7, 0, 0.5 - i * 0.15)),
        new THREE.Vector3(1, 1, 1),
      ));
      limbs.push(g2);
    }
    // Session 19 (style pass 2): moss along the trunk's top, a few snapped
    // stubs; sawdust round the cut rounds once it's opened.
    // Merged: the moss on the ends one mesh, on the cut stretch another (it goes with it), the stubs one.
    const mossEnds = [];
    const mossMid = [];
    for (let i = 0; i < 7; i++) {
      const x = -half + 0.8 + i * ((k.length - 1.6) / 6);
      const g2 = new THREE.SphereGeometry(1, 7, 4).scale(0.45, 0.06, rAt(x) * 0.7).translate(x, this.localGround(holder, x, 0) + rAt(x) * 2 - 0.1, 0);
      (Math.abs(x) < gap ? mossMid : mossEnds).push(g2);
    }
    const moss = this.mat(0x26301a);
    const mossy = [];
    for (const list of [mossEnds, mossMid]) {
      if (!list.length) continue;
      const m = new THREE.Mesh(this.hold(mergeGeometries(list)), moss);
      list.forEach((g2) => g2.dispose());
      tree.add(m);
      mossy.push({ m, x: list === mossMid ? 0 : half });
    }
    const stubs = limbs;
    for (let i = 0; i < 3; i++) {
      const x = -half + 2 + i * 2.6;
      const g2 = new THREE.CylinderGeometry(0.05, 0.08, 0.35, 5);
      g2.applyMatrix4(new THREE.Matrix4().compose(
        new THREE.Vector3(x, this.localGround(holder, x, 0) + rAt(x) * 1.6 + 0.1, (i % 2 ? 1 : -1) * rAt(x) * 0.5),
        new THREE.Quaternion().setFromEuler(new THREE.Euler((i % 2 ? 1 : -1) * 0.6, 0, 0.3)),
        new THREE.Vector3(1, 1, 1),
      ));
      stubs.push(g2);
    }
    const limbMesh = new THREE.Mesh(this.hold(mergeGeometries(stubs)), branchMat);
    limbMesh.castShadow = true;
    tree.add(limbMesh);
    stubs.forEach((g2) => g2.dispose());
    const dust = new THREE.Mesh(this.hold(new THREE.CircleGeometry(1.4, 10).rotateX(-Math.PI / 2)), this.mat(0x4a3c2a));
    dust.position.set(0, this.localGround(holder, 0, 0) + 0.03, 0);
    dust.visible = false;
    holder.add(dust);
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
        dust.visible = open;
        for (const { m, x } of mossy) if (Math.abs(x) < gap) m.visible = !open;
      },
    };
  }

  // Round 2 (Aaron: "we could even make it a rip in the fence"): the outpost's fence where the Pruitts'
  // land backs onto it: a chain-link gate nobody's opened in a year, and, once the family remember it,
  // the place where the wire's been torn: one leaf peeled back off its frame and hanging, the other
  // shoved in. Built as the chain gate; only how it stands "open" differs.
  // Round 2, the polish pass: torn, it's its own thing, not a gate with a leaf peeled back. The two leaves
  // go; in their place the wire as something left it: a flap peeled inward off the left post and sagging, a
  // flap folded outward off the right with its top corner hanging, the top rail snapped (one half bent down,
  // the other hanging from its post to the ground), the bottom rail kicked aside, loose strands, three
  // gouges down the right post, a strip of somebody's sleeve on the wire. The
  // sign hangs by one corner.
  fenceRip(holder, g) {
    const k = this.cfg.fenceRip;
    const built = this.chainGate(holder, g, k);
    const half = k.width / 2;
    const H = k.height;
    const y0 = this.localGround(holder, 0, 0) + 0.05;
    const steel = this.mat(k.color);
    const tex = this.hold(chainLinkTexture(k.chainLink));
    const flapMat = (w, h) => {
      const t = this.hold(tex.clone());
      t.needsUpdate = true;
      t.repeat.set(w / 0.25, h / 0.25);
      return this.mat(0xffffff, { map: t, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    };
    const torn = new THREE.Group();
    torn.visible = false;
    holder.add(torn);
    const bar = (w, h, d, x, y, z, rx = 0, ry = 0, rz = 0, mat = steel) => {
      const m = new THREE.Mesh(this.box(w, h, d), mat);
      m.position.set(x, y0 + y, z);
      m.rotation.set(rx, ry, rz);
      m.castShadow = true;
      torn.add(m);
      return m;
    };
    // A flap of wire hinged at a post (x: the post; w wide, h tall), swung by `yaw` and slumped by `sag`.
    const flap = (x, w, h, yaw, sag, lift = 0) => {
      const hinge = new THREE.Group();
      hinge.position.set(x, y0 + lift, 0);
      hinge.rotation.set(0, yaw, sag, 'YXZ');
      const dir = x < 0 ? 1 : -1;
      const mesh = new THREE.Mesh(this.hold(new THREE.PlaneGeometry(w, h)), flapMat(w, h));
      mesh.position.set((dir * w) / 2, h / 2, 0);
      hinge.add(mesh);
      torn.add(hinge);
      return { hinge, dir, w, h };
    };
    // Left: peeled inward (toward the outpost), slumping. Right: folded outward, its top corner hanging off it.
    flap(-half, 1.9, H - 0.25, -1.05, 0.1);
    const right = flap(half, 1.5, H - 0.6, 0.85, -0.14);
    const corner = new THREE.Group();
    corner.position.set(right.dir * right.w, right.h, 0);
    corner.rotation.set(1.9, 0, 0.5);
    const cm = new THREE.Mesh(this.hold(new THREE.PlaneGeometry(1.0, 0.9)), flapMat(1.0, 0.9));
    cm.position.set((right.dir * 1.0) / 2 - right.dir * 0.3, -0.4, 0);
    corner.add(cm);
    right.hinge.add(corner);
    // The top rail, snapped: the left half bent down into the gap, the right hanging from its post to the ground.
    bar(1.9, 0.06, 0.06, -half + 0.9, H - 0.28, 0.25, 0, -0.28, -0.3);
    bar(2.5, 0.06, 0.06, half - 0.75, H / 2 + 0.1, -0.35, 0, 0.4, 1.02);
    // The bottom rail: one half where it was, the other kicked round into the outpost.
    bar(1.3, 0.06, 0.06, -half + 0.7, 0.05, 0.05, 0, -0.15, 0);
    bar(1.6, 0.06, 0.06, 1.3, 0.04, 1.1, 0, 1.1, 0.03);
    // Loose strands, hanging from the bent rail and the flaps' edges.
    const strand = this.mat(k.chainLink);
    for (const [x, y, z, len, rz, rx] of [[-1.5, H - 0.75, 0.42, 0.7, 0.15, 0.1], [-1.2, H - 0.95, 0.5, 0.5, -0.2, 0], [-1.85, H - 0.55, 0.33, 0.9, 0.05, -0.1], [-0.95, H - 1.15, 0.56, 0.35, 0.3, 0.2], [1.9, H - 1.0, -0.5, 0.6, -0.12, 0], [2.3, H - 0.7, -0.3, 0.8, 0.1, 0.15], [1.5, 1.2, -0.75, 0.45, 0.4, 0]]) {
      bar(0.014, len, 0.014, x, y - len / 2, z, rx, 0, rz, strand);
    }
    // Three gouges down the right post.
    const dark = this.mat(0x0b0b0b);
    for (let i = 0; i < 3; i++) bar(0.03, 0.62, 0.17, half + 0.1, 1.5 - i * 0.02, -0.005 - 0.0, 0, 0, 0.42, dark).position.x += (i - 1) * 0.11;
    // A strip of an olive sleeve caught on the left flap's edge.
    bar(0.05, 0.34, 0.012, -1.62, 1.25, 0.86, 0.2, -1.0, 0.25, this.mat(0x2f3a24));
    const signAt = { x: built.sign.position.x, y: built.sign.position.y, rz: built.sign.rotation.z };
    return {
      setOpen: (open) => {
        built.setOpen(false);
        torn.visible = Boolean(open);
        for (const { hinge } of built.leaves) hinge.visible = !open;
        built.lock.visible = !open;
        // The sign: square on the gate while it's whole; torn, hanging by one corner off the left wing.
        built.sign.visible = true;
        built.sign.position.set(open ? -half - 1.6 : signAt.x, open ? signAt.y - 0.35 : signAt.y, built.sign.position.z);
        built.sign.rotation.z = open ? -0.5 : signAt.rz;
      },
    };
  }

  chainGate(holder, g, k = this.cfg.chainGate) {
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
    // Session 19 (style pass 2): barbed wire along the top: an arm on each
    // post leaning out (toward the road), three strands between them.
    const barb = this.mat(0x2a2a26);
    const ends = [];
    for (const side of [-1, 1]) {
      const x = side * (half + 0.1);
      const y = this.localGround(holder, x, 0) + k.height + 0.3;
      const arm = new THREE.Mesh(this.box(0.04, 0.5, 0.04), barb);
      arm.position.set(x, y + 0.2, -0.12);
      arm.rotation.x = -0.6;
      holder.add(arm);
      ends.push({ x, y });
    }
    const wire = [];
    for (let i = 0; i < 3; i++) {
      const dz = -0.05 - i * 0.12;
      const dy = 0.05 + i * 0.13;
      wire.push(ends[0].x, ends[0].y + dy, dz, ends[1].x, ends[1].y + dy, dz);
    }
    const wg = this.hold(new THREE.BufferGeometry());
    wg.setAttribute('position', new THREE.Float32BufferAttribute(wire, 3));
    holder.add(new THREE.LineSegments(wg, this.hold(new THREE.LineBasicMaterial({ color: 0x1c1c1a }))));
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
      leaves,
      lock,
      sign,
      setOpen: (open) => {
        // Both leaves swing in, toward the outpost (+z along the path).
        for (const { hinge, side } of leaves) hinge.rotation.set(0, open ? side * 1.5 : 0, 0);
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
