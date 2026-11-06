// Land clearing (the experimental dozer: world/Dozer.js). What the dozer
// does to the woods, and keeps doing for the rest of the run:
//  - Trees pushed over: the sprite and its solid trunk go, the collider
//    goes, and a falling tree takes its place (two crossed cards of the
//    tree's own sprite, tipping over about its base, quicker as it goes,
//    a thud and a burst of needles and dust where it lands). It leaves a
//    log lying where it fell and a pale-topped stump. Big trees hold a
//    moment (strain) before they go.
//  - Bushes flattened under the tracks and the blade.
//  - The ground: the tracks crush the undergrowth (open ground: it no
//    longer slows anyone); the blade, down, cuts bare earth (dirt). The
//    ground's masks change (GroundField.carve), the terrain's texture is
//    re-sent a few times a second while it's working, and the map's
//    image is repainted there: cut trails show on the map and the minimap.
// It's all saved (the trees felled, the ground carved), so cut trails last.
//
// Events: 'tree:felled' { index, x, z }.

import * as THREE from 'three';
import { repaintMapCells } from '../ui/mapImage.js';

const UP = new THREE.Vector3(0, 1, 0);

export class LandClearing {
  // cfg: config.dozer.clearing; forestCfg: config.forest.
  constructor(cfg, forestCfg, bus) {
    this.cfg = cfg;
    this.fc = forestCfg;
    this.bus = bus;
  }

  // ctx: { world (forest, ground, terrain), mapUi (optional), colliders, sfx, fx (CombatFx), player (shake) }.
  init(scene, ctx) {
    Object.assign(this, ctx);
    this.scene = scene;
    this.forest = ctx.world.forest;
    this.ground = ctx.world.ground;
    this.terrain = ctx.world.terrain;
    this.felled = []; // tree indices, in order
    this.stamps = []; // [x, z, r, dirt] the ground carved, thinned (for the save)
    this.box = null; // mask cells waiting to be sent
    this.flushTimer = 0;
    this.carvedMetres = 0;
    this.near = [];
    this.bushes = [];
    this.falling = [];
    this.built = false;
  }

  // The meshes: made on the first tree (none until the dozer's used).
  build() {
    if (this.built) return;
    this.built = true;
    const c = this.cfg;
    const bark = new THREE.MeshLambertMaterial({ color: c.look.bark });
    this.logs = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 0.7, 1, 9, 1).rotateZ(Math.PI / 2), bark, c.logs);
    this.logs.name = 'felled logs';
    this.stumps = new THREE.InstancedMesh(stumpGeometry(c.look), new THREE.MeshLambertMaterial({ vertexColors: true }), c.stumps);
    this.stumps.name = 'stumps';
    for (const m of [this.logs, this.stumps]) {
      m.count = 0;
      m.castShadow = true;
      m.receiveShadow = true;
      m.frustumCulled = false;
      this.scene.add(m);
    }
    this.logNext = 0;
    this.stumpNext = 0;
    this.logCount = 0;
    this.stumpCount = 0;
    // The falling trees: crossed cards of the forest's own sprites.
    this.cardMat = new THREE.MeshLambertMaterial({ map: this.forest.atlas, alphaTest: this.fc.alphaTest, side: THREE.DoubleSide });
    this.cards = [];
    for (let i = 0; i < c.fallingPool; i++) {
      const geo = crossedCards();
      const mesh = new THREE.Mesh(geo, this.cardMat);
      mesh.visible = false;
      mesh.castShadow = true;
      mesh.frustumCulled = false;
      const pivot = new THREE.Group();
      pivot.add(mesh);
      this.scene.add(pivot);
      this.cards.push({ pivot, mesh, busy: false });
    }
    this.m = new THREE.Matrix4();
    this.q = new THREE.Quaternion();
    this.s = new THREE.Vector3();
    this.p = new THREE.Vector3();
    this.axis = new THREE.Vector3();
  }

  // ---- what's there --------------------------------------------------------------------------

  // The standing trees whose trunks are within r of (x, z): [{ tree, index, d }].
  treesNear(x, z, r, out = []) {
    out.length = 0;
    for (const c of this.colliders.query(x, z, r, this.near)) {
      if (c.tree === undefined || c.off) continue;
      const d = Math.hypot(c.x - x, c.z - z);
      if (d <= r + c.r) out.push({ tree: this.forest.trees[c.tree], index: c.tree, d });
    }
    return out;
  }

  // How long a tree holds against the blade (seconds): the tall and the thick hold longest.
  strainOf(tree) {
    const c = this.cfg;
    const kind = this.fc.kinds[tree.variant];
    const thick = (kind.trunk.base * tree.width) / 2;
    return Math.max(0, (tree.height - c.strain.freeHeight) * c.strain.perMetre + (thick - c.strain.freeRadius) * c.strain.perRadius);
  }

  // ---- felling -------------------------------------------------------------------------------

  // Tree `index` goes over, falling along (dx, dz).
  fell(index, dx, dz, quiet = false) {
    const tree = this.forest.trees[index];
    if (!tree || tree.felled) return;
    this.build();
    this.forest.fellTree(index);
    this.felled.push(index);
    const len = Math.hypot(dx, dz) || 1;
    const fx = dx / len;
    const fz = dz / len;
    this.addStump(tree);
    if (quiet) {
      this.addLog(tree, fx, fz);
      return;
    }
    // A card from the free pool (or the oldest), set to this tree's sprite and size.
    const slot = this.cards.find((c) => !c.busy) ?? this.falling.shift()?.slot;
    if (!slot) {
      this.addLog(tree, fx, fz);
      return;
    }
    const rect = this.forest.rects[tree.variant] ?? [0, 0, 1, 1];
    setCardUv(slot.mesh.geometry, rect);
    slot.mesh.scale.set(tree.width, tree.height, tree.width);
    slot.mesh.visible = true;
    slot.mesh.position.set(0, 0, 0);
    slot.busy = true;
    slot.pivot.position.set(tree.x, tree.y, tree.z);
    slot.pivot.quaternion.identity();
    slot.pivot.rotation.y = Math.atan2(fx, fz); // card faces across the fall
    const f = { slot, tree, fx, fz, angle: 0.04, speed: 0.15, landed: false, after: 0, bounce: 0 };
    this.falling.push(f);
    this.sfx?.play('treeCrack', tree);
    this.bus.emit('tree:felled', { index, x: tree.x, z: tree.z });
  }

  addStump(tree) {
    const kind = this.fc.kinds[tree.variant];
    const r = ((kind.trunk.base * tree.width) / 2) * 1.05;
    const h = this.cfg.look.stumpHeight * (0.7 + ((tree.x * 7.13 + tree.z * 3.7) % 1 + 1) % 1 * 0.6);
    this.p.set(tree.x, tree.y - 0.05, tree.z);
    this.q.setFromAxisAngle(UP, tree.x * 1.7);
    this.s.set(r, h, r);
    this.stumps.setMatrixAt(this.stumpNext, this.m.compose(this.p, this.q, this.s));
    this.stumpNext = (this.stumpNext + 1) % this.cfg.stumps;
    this.stumpCount = Math.min(this.cfg.stumps, this.stumpCount + 1);
    this.stumps.count = this.stumpCount;
    this.stumps.instanceMatrix.needsUpdate = true;
  }

  // The trunk lying where it fell, from its stump along (fx, fz).
  addLog(tree, fx, fz) {
    const kind = this.fc.kinds[tree.variant];
    const r = ((kind.trunk.base * tree.width) / 2) * 0.95;
    const length = tree.height * Math.max(0.45, kind.trunk.to * kind.trunk.solid * 2.2);
    const mid = length / 2 + 0.3;
    const x = tree.x + fx * mid;
    const z = tree.z + fz * mid;
    const y = this.ground.heightAt(x, z) + r * 0.7;
    this.p.set(x, y, z);
    this.q.setFromAxisAngle(UP, Math.atan2(-fz, fx));
    this.s.set(length, r, r);
    this.logs.setMatrixAt(this.logNext, this.m.compose(this.p, this.q, this.s));
    this.logNext = (this.logNext + 1) % this.cfg.logs;
    this.logCount = Math.min(this.cfg.logs, this.logCount + 1);
    this.logs.count = this.logCount;
    this.logs.instanceMatrix.needsUpdate = true;
  }

  // Each falling tree tips over faster and faster; landed, the canopy settles and sinks away.
  updateFalling(dt) {
    const g = this.cfg.fall;
    for (const f of this.falling) {
      const s = f.slot;
      if (!f.landed) {
        f.speed += Math.sin(f.angle) * g.gravity * dt + g.push * dt;
        f.angle += f.speed * dt;
        if (f.angle >= Math.PI / 2 - 0.06) {
          f.angle = Math.PI / 2 - 0.06;
          f.landed = true;
          f.bounce = f.speed * 0.12;
          this.land(f);
        }
      } else {
        f.after += dt;
        // A little bounce, then the canopy sinks into the ground and goes.
        f.bounce -= dt * 1.2;
        const lift = Math.max(0, Math.sin(Math.min(1, f.after * 5) * Math.PI) * 0.06);
        f.angle = Math.PI / 2 - 0.06 - lift;
        const sink = Math.max(0, f.after - g.lie) / g.sink;
        s.mesh.position.y = 0;
        s.mesh.scale.y = f.tree.height;
        s.pivot.position.y = f.tree.y - sink * f.tree.width * 0.6;
        if (sink >= 1) {
          s.mesh.visible = false;
          s.busy = false;
          f.done = true;
        }
      }
      // The card along the fall flattens as it goes down (lying, it would stand up as a wall of needles).
      if (!f.done) s.mesh.scale.z = f.tree.width * Math.max(0.1, 1 - (f.angle / (Math.PI / 2)) * 0.92);
      // Tip it about the horizontal axis across the fall direction.
      this.axis.set(f.fz, 0, -f.fx);
      s.pivot.quaternion.setFromAxisAngle(this.axis, f.angle);
      const turn = this.q.setFromAxisAngle(UP, Math.atan2(f.fx, f.fz));
      s.pivot.quaternion.multiply(turn);
    }
    this.falling = this.falling.filter((f) => !f.done);
  }

  land(f) {
    const t = f.tree;
    this.addLog(t, f.fx, f.fz);
    const mid = t.height * 0.55;
    const x = t.x + f.fx * mid;
    const z = t.z + f.fz * mid;
    this.sfx?.play('treeFall', { x, z, range: 120 });
    const fx = this.fx;
    if (fx?.emit) {
      const dust = new THREE.Color(this.cfg.look.dust);
      const needles = new THREE.Color(this.cfg.look.needles);
      for (let k = 0; k < 5; k++) {
        const d = t.height * (0.25 + k * 0.15);
        const px = t.x + f.fx * d;
        const pz = t.z + f.fz * d;
        fx.emit(px, this.ground.heightAt(px, pz) + 0.3, pz, 6, k % 2 ? dust : needles, 3.5);
      }
    }
    const p = this.player?.position;
    if (p) {
      const dist = Math.hypot(p.x - x, p.z - z);
      this.player.shake(Math.max(0, this.cfg.fall.shake * (1 - dist / 40)));
    }
    // It flattens the bushes it lands on.
    for (let d = 2; d < t.height * 0.8; d += 2) this.flatten(t.x + f.fx * d, t.z + f.fz * d, 1.4, false);
  }

  // ---- the ground ---------------------------------------------------------------------------

  // Under the tracks: the undergrowth crushed (open ground), the bushes flattened.
  flatten(x, z, r, mark = true) {
    for (const b of this.forest.bushesNear(x, z, r, this.bushes)) this.forest.clearBush(b);
    if (mark) this.mark(x, z, r, this.cfg.trackDirt, this.cfg.trackOpen);
  }

  // Under the blade, down: bare earth.
  carve(x, z, r) {
    for (const b of this.forest.bushesNear(x, z, r + 0.5, this.bushes)) this.forest.clearBush(b);
    this.mark(x, z, r, 1, 1);
  }

  mark(x, z, r, dirt, open) {
    const box = this.ground.carve(x, z, r, dirt, this.cfg.soft, open);
    if (!box) return;
    this.grow(box);
    // Thinned for the save: a new stamp once it's moved on a little from
    // the last of its kind nearby (the tracks' and the blade's apart).
    this.lastStamp ??= new Map();
    const key = `${r}:${dirt}`;
    const recent = (this.lastStamp.get(key) ?? []);
    const near = recent.some((s) => Math.hypot(s[0] - x, s[1] - z) < this.cfg.stampSpacing);
    if (!near) {
      const stamp = [round1(x), round1(z), r, dirt, open];
      this.stamps.push(stamp);
      recent.push(stamp);
      if (recent.length > 6) recent.shift();
      this.lastStamp.set(key, recent);
      // The trail's length: how far the blade's cut has come along (the blade carves three stamps abreast).
      if (dirt >= 1) this.carvedMetres += this.cfg.stampSpacing / 3;
    }
  }

  grow(box) {
    if (!this.box) this.box = [...box];
    else {
      this.box[0] = Math.min(this.box[0], box[0]);
      this.box[1] = Math.min(this.box[1], box[1]);
      this.box[2] = Math.max(this.box[2], box[2]);
      this.box[3] = Math.max(this.box[3], box[3]);
    }
  }

  // Send what's changed: the terrain's mask texture, the map's image.
  flush() {
    if (!this.box) return;
    this.terrain?.updateMasks?.(this.box);
    const canvas = this.mapUi?.shared?.mapCanvas;
    if (canvas) repaintMapCells(canvas, this.ground, this.box);
    this.box = null;
  }

  update(dt) {
    if (this.built) this.updateFalling(dt);
    this.flushTimer -= dt;
    if (this.flushTimer <= 0 && this.box) {
      this.flushTimer = this.cfg.flushEvery;
      this.flush();
    }
  }

  get felledCount() {
    return this.felled.length;
  }

  // ---- saving -------------------------------------------------------------------------------

  saveState() {
    if (!this.felled.length && !this.stamps.length) return undefined;
    return { felled: [...this.felled], stamps: this.stamps.map((s) => [...s]) };
  }

  loadState(d) {
    if (!d) return;
    for (const i of d.felled ?? []) {
      if (Number.isInteger(i) && this.forest.trees[i] && !this.forest.trees[i].felled) this.fell(i, Math.cos(i), Math.sin(i), true);
    }
    for (const s of d.stamps ?? []) {
      if (!Array.isArray(s) || !Number.isFinite(s[0]) || !Number.isFinite(s[1])) continue;
      const [x, z, r, dirt, open = 1] = s;
      for (const b of this.forest.bushesNear(x, z, r, this.bushes)) this.forest.clearBush(b);
      const box = this.ground.carve(x, z, r, dirt, this.cfg.soft, open);
      if (box) this.grow(box);
      this.stamps.push([x, z, r, dirt, open]);
    }
    this.flush();
  }

  dispose() {
    if (!this.built) return;
    for (const m of [this.logs, this.stumps]) {
      m.removeFromParent();
      m.geometry.dispose();
      m.material.dispose();
    }
    for (const c of this.cards) {
      c.pivot.removeFromParent();
      c.mesh.geometry.dispose();
    }
    this.cardMat.dispose();
  }
}

function round1(v) {
  return Math.round(v * 10) / 10;
}

// Two unit cards crossed at right angles, their base at y = 0 (the tree's sprite on each).
function crossedCards() {
  const a = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
  const b = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0).rotateY(Math.PI / 2);
  const pos = [...a.attributes.position.array, ...b.attributes.position.array];
  const nor = [...a.attributes.normal.array, ...b.attributes.normal.array];
  const uv = [...a.attributes.uv.array, ...b.attributes.uv.array];
  const idx = [...a.index.array, ...[...b.index.array].map((i) => i + 4)];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.userData.baseUv = uv;
  g.setIndex(idx);
  a.dispose();
  b.dispose();
  return g;
}

// Point a card's uvs at the atlas rectangle [u, v, w, h].
function setCardUv(g, [u, v, w, h]) {
  const base = g.userData.baseUv;
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u + base[i * 2] * w, v + base[i * 2 + 1] * h);
  uv.needsUpdate = true;
}

// A stump: a short cylinder, bark round the side, the pale cut face on top.
function stumpGeometry(look) {
  const g = new THREE.CylinderGeometry(1, 1.15, 1, 10, 1).translate(0, 0.5, 0).toNonIndexed();
  const n = g.attributes.normal;
  const col = new Float32Array(n.count * 3);
  const bark = new THREE.Color(look.bark);
  const cut = new THREE.Color(look.cut);
  for (let i = 0; i < n.count; i++) (n.getY(i) > 0.5 ? cut : bark).toArray(col, i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.deleteAttribute('uv');
  return g;
}
