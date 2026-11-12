// The stairs in the woods in the world (Session 26; DESIGN.md "Stairs in the
// woods"; the model: render/stairsModel.js). In the story spine's off-path
// clearing (stairs), every run: its foot faces the way into the clearing (a
// pathway's end, else the old church's side), so it's the first thing Tom reaches. Solid at its sides and back.
//
// Only the set: the climb, the place beyond and Junie are the beat's
// (encounters/Stairs.js), which finds its places in `spots` (world space).

import { buildStairs } from '../render/stairsModel.js';
import { toWorld } from './CrashSite.js';
import { pathFrame } from './clearingFrame.js';
import * as THREE from 'three';
import { buildBole, buildCrown, buildFern, paint, ringStand } from '../render/oldGrowth.js';

// Where it stands (pure): in the stairs clearing, its foot toward the way in. Session 32 (Aaron: "the bottom
// of the stairs pointing towards the entrance to the clearing"): where a pathway comes into the clearing it
// climbs away from that; with none (it's dealt off the paths) it climbs away from `from` (the old church,
// the way Tom walks in). null if there's no such clearing.
export function stairsPlacement(map, from) {
  const ci = map.clearings.findIndex((k) => k.key === 'stairs');
  if (ci < 0) return null;
  const c = map.clearings[ci];
  const onPath = (map.paths ?? []).some((p) => p.a === ci || p.b === ci);
  if (onPath) {
    const f = pathFrame(map, 'stairs');
    return { x: c.x, z: c.z, yaw: f.yaw, entrance: f.entrance };
  }
  const yaw = from ? Math.atan2(c.x - from.x, c.z - from.z) : 0;
  return { x: c.x, z: c.z, yaw };
}

export class StairsSite {
  constructor(cfg) {
    this.cfg = cfg;
    this.sc = cfg.stairs;
    this.place = null;
    this.spots = {};
  }

  init(scene, world, colliders) {
    const church = world.map.clearings.find((k) => k.key === 'timeCapsule');
    this.place = stairsPlacement(world.map, church);
    if (!this.place) return;
    const p = this.place;
    const ground = world.ground;
    this.y = ground.heightAt(p.x, p.z);
    const heightAt = (x, z) => {
      const w = toWorld(p, x, z);
      return ground.heightAt(w.x, w.z) - this.y;
    };
    this.model = buildStairs(this.sc.look, { heightAt });
    this.model.group.position.set(p.x, this.y, p.z);
    this.model.group.rotation.y = p.yaw;
    this.model.group.updateMatrixWorld(true);
    this.model.mesh.matrixAutoUpdate = false;
    scene.add(this.model.group);
    for (const [name, s] of Object.entries(this.model.spots)) {
      const w = toWorld(p, s.x, s.z);
      this.spots[name] = { x: w.x, y: this.y + s.y, z: w.z };
    }
    this.colliders = this.model.colliders.map((c) => {
      if (c.seg) {
        const a = toWorld(p, c.ax, c.az);
        const b = toWorld(p, c.bx, c.bz);
        const base = this.y + this.model.base;
        return { seg: true, ax: a.x, az: a.z, bx: b.x, bz: b.z, t: c.t, x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, r: Math.hypot(b.x - a.x, b.z - a.z) / 2 + c.t, base: base - 1, top: base + c.top, blocksShots: true, off: false, what: 'stairs' };
      }
      const w = toWorld(p, c.x, c.z);
      return { x: w.x, z: w.z, r: c.r, top: this.y + this.model.base + c.top, what: 'stairs' };
    });
    for (const c of this.colliders) colliders?.insert(c);
    this.buildStand(scene, world, colliders);
  }

  // Session 32: the old growth round the clearing: giants in a ring, open toward the way in, ferns under them.
  buildStand(scene, world, colliders) {
    const og = this.sc.oldGrowth;
    if (!og) return;
    const p = this.place;
    const ground = world.ground;
    const R = this.sc.radius;
    const ent = p.entrance ?? { x: p.x - Math.sin(p.yaw) * R, z: p.z - Math.cos(p.yaw) * R };
    const toward = Math.atan2(ent.x - p.x, ent.z - p.z);
    // A little generator of its own, seeded by where the clearing is: the same stand every time on a seed.
    let seed = (Math.abs(Math.round(p.x * 31 + p.z * 17)) % 2147483646) + 1;
    const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const trees = ringStand(og.count, R + og.ring[0], R + og.ring[1], toward, og.gap, og.apart, rand);
    const bole = paint(buildBole(), og.colors);
    const crown = paint(buildCrown(), og.colors);
    const fern = paint(buildFern(), og.colors);
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    const fernMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
    const group = new THREE.Group();
    group.name = 'stairsOldGrowth';
    const boles = new THREE.InstancedMesh(bole, mat, Math.max(1, trees.length));
    const crowns = new THREE.InstancedMesh(crown, mat, Math.max(1, trees.length));
    const ferns = new THREE.InstancedMesh(fern, fernMat, og.ferns);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const tilt = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const axis = new THREE.Vector3();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    this.stand = [];
    trees.forEach((t, i) => {
      const x = p.x + t.x;
      const z = p.z + t.z;
      const y = ground.heightAt(x, z) - 0.25;
      q.setFromAxisAngle(up, t.yaw);
      tilt.setFromAxisAngle(axis.set(Math.cos(t.leanDir), 0, Math.sin(t.leanDir)), t.lean);
      m.compose(pos.set(x, y, z), tilt.multiply(q), scl.set(t.scale, t.scale, t.scale));
      boles.setMatrixAt(i, m);
      crowns.setMatrixAt(i, m);
      const c = { x, z, r: bole.userData.radius * t.scale * 0.85, top: y + 22 * t.scale, what: 'oldGrowth' };
      colliders?.insert(c);
      this.stand.push(c);
    });
    boles.count = crowns.count = trees.length;
    let f = 0;
    for (let tries = 0; f < og.ferns && tries < og.ferns * 8; tries++) {
      const a = rand() * Math.PI * 2;
      const r = R * 0.45 + rand() * (og.ring[1] + R * 0.55);
      const x = p.x + Math.sin(a) * r;
      const z = p.z + Math.cos(a) * r;
      let d = a - toward;
      d -= Math.round(d / (Math.PI * 2)) * Math.PI * 2;
      if (Math.abs(d) < 0.16) continue; // not on the way in
      if (this.stand.some((c) => Math.hypot(c.x - x, c.z - z) < c.r + 0.3)) continue;
      const k = 0.7 + rand() * 0.8;
      q.setFromAxisAngle(up, rand() * Math.PI * 2);
      m.compose(pos.set(x, ground.heightAt(x, z) - 0.03, z), q, scl.set(k, k, k));
      ferns.setMatrixAt(f++, m);
    }
    ferns.count = f;
    for (const mesh of [boles, crowns, ferns]) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      mesh.castShadow = false;
      group.add(mesh);
    }
    scene.add(group);
    this.standGroup = group;
    this.standOwned = [bole, crown, fern, mat, fernMat];
  }

  toWorld(x, z) {
    return toWorld(this.place, x, z);
  }

  update(cameraPosition, drawDistance) {
    if (!this.model) return;
    const d = Math.hypot(cameraPosition.x - this.place.x, cameraPosition.z - this.place.z);
    this.model.group.visible = d <= drawDistance + this.sc.radius;
    if (this.standGroup) this.standGroup.visible = d <= drawDistance + this.sc.radius + 30;
  }

  dispose() {
    this.model?.dispose();
    this.standGroup?.removeFromParent();
    for (const x of this.standOwned ?? []) x.dispose();
  }
}
