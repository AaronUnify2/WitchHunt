// Session 22 (M10.3 spike, debug only): the place beyond the stairs, on
// the interior system (DESIGN.md "Stairs in the woods: the place beyond").
// Rough on purpose: it answers "can the procedural four-path forest be
// built on Interiors, cheaply, on the tablet?", not what it should look like.
//
//  - One interior, 'placeBeyond', under the stairs' fixed clearing.
//  - Its space: a square pocket (config.spikes.placeBeyond.half) of foggy
//    forest, a clearing in the middle and four paths out. Two instanced
//    meshes (trunks, canopies), a floor and a fog-coloured dome (no sky
//    shows through): four draw calls, whatever the
//    tree count. The trees are re-dealt in place (instance matrices) for
//    each new clearing; the first clearing always deals the same, so a
//    loop back to the start looks like the start.
//  - The trunks are blocks in the room platform, so they stop Tom; the
//    pocket's walls are lost in the fog.
//  - The rules are world/placeBeyond.js (tested). Junie's voice comes down
//    the two calling paths in turn (a placeholder sound, and a caption).
//
// Debug (Spikes): enter it; show which path is silent.

import * as THREE from 'three';
import { DEBUG } from '../debug/DebugMenu.js';
import { Rng } from '../core/Rng.js';
import { startWalk, choosePath, exitSide, sideVector, opposite } from '../world/placeBeyond.js';

const ID = 'placeBeyond';

export class PlaceBeyond {
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.pc = cfg.spikes.placeBeyond;
    this.bus = bus;
    this.walk = null;
    this.showSilent = false;
  }

  // ctx: { world, player, interiors, sfx, notify }.
  init(ctx) {
    Object.assign(this, ctx);
    this.stairs = this.world.map.clearings.find((c) => c.spine && c.key === 'stairs') ?? null;
    this.rng = new Rng(`${this.world.seed ?? 'beyond'}:placeBeyond`);
    if (!this.stairs) return;
    const pc = this.pc;
    this.interiors.define({
      id: ID,
      name: 'The place beyond',
      entrance: () => ({ x: this.stairs.x, z: this.stairs.z }),
      surfaceY: () => this.world.ground.heightAt(this.stairs.x, this.stairs.z),
      load: (scene, floorY) => this.load(scene, floorY),
      platform: (floorY) => this.platformAt(floorY),
      spawn: () => this.arrival('south'),
      exit: () => ({ x: this.stairs.x, z: this.stairs.z + 6, yaw: 0 }),
      light: pc.light,
      onEnter: () => {
        this.walk = startWalk(this.rng, pc.needed);
        this.deal(0);
        this.callTimer = 1.5;
        this.callNext = 0;
        this.notify?.('The place beyond (spike): four paths. Never follow the voice.');
      },
      onLeave: () => (this.walk = null),
    });
  }

  get inside() {
    return this.interiors?.id === ID;
  }

  // ---- the space ---------------------------------------------------------------------------------

  load(scene, floorY) {
    const pc = this.pc;
    this.floorY = floorY;
    const cx = this.stairs.x;
    const cz = this.stairs.z;
    const group = new THREE.Group();
    group.position.set(cx, floorY, cz);
    const owned = [];
    const own = (x) => (owned.push(x), x);

    const floor = new THREE.Mesh(own(new THREE.PlaneGeometry(pc.half * 2, pc.half * 2)), own(new THREE.MeshLambertMaterial({ color: pc.floor.color })));
    floor.rotation.x = -Math.PI / 2;
    group.add(floor);
    // A fog-coloured dome round Tom, just past the fog (the camera's far
    // plane closes in to it in here): no sky shows past the trees (one draw call).
    const dome = new THREE.Mesh(own(new THREE.SphereGeometry(pc.light.fogFar + 2, 16, 8)), own(new THREE.MeshBasicMaterial({ color: pc.light.fogColor, side: THREE.BackSide, fog: false })));
    dome.frustumCulled = false;
    group.add(dome);
    this.dome = dome;

    // Every grid spot that could hold a tree; each clearing keeps some of them.
    this.spots = [];
    const s = pc.treeSpacing;
    for (let x = -pc.half + s / 2; x < pc.half; x += s) for (let z = -pc.half + s / 2; z < pc.half; z += s) this.spots.push({ x, z });
    const n = this.spots.length;
    const t = pc.trunk;
    const trunkGeo = own(new THREE.CylinderGeometry(t.radiusTop, t.radiusBottom, t.height, 6));
    trunkGeo.translate(0, t.height / 2, 0);
    const c = pc.canopy;
    const canopyGeo = own(new THREE.ConeGeometry(c.radius, c.height, 7));
    canopyGeo.translate(0, c.base + c.height / 2, 0);
    this.trunks = new THREE.InstancedMesh(trunkGeo, own(new THREE.MeshLambertMaterial({ color: t.color })), n);
    this.canopies = new THREE.InstancedMesh(canopyGeo, own(new THREE.MeshLambertMaterial({ color: c.color })), n);
    for (const m of [this.trunks, this.canopies]) {
      m.frustumCulled = false; // one pocket, always round Tom
      group.add(m);
    }
    scene.add(group);
    this.group = group;
    return {
      group,
      update: (dt) => this.update(dt),
      dispose: () => {
        scene.remove(group);
        for (const x of owned) x.dispose();
        this.group = null;
      },
    };
  }

  // Deal clearing number `n`'s trees (0, the first, always the same).
  // Fills this.blocks (the trunks Tom bumps into).
  deal(n) {
    if (!this.trunks) return;
    const pc = this.pc;
    const rng = new Rng(`placeBeyond:${n === 0 ? 'start' : `${n}:${this.rng.int(0, 1e9)}`}`);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    this.blocks = [];
    let i = 0;
    for (const sp of this.spots) {
      const x = sp.x + rng.range(-pc.treeJitter, pc.treeJitter);
      const z = sp.z + rng.range(-pc.treeJitter, pc.treeJitter);
      const keep = rng.next() < pc.treeKeep;
      const onPath = Math.abs(x) < pc.pathHalf + 0.8 || Math.abs(z) < pc.pathHalf + 0.8;
      if (!keep || onPath || Math.hypot(x, z) < pc.clearingRadius) continue;
      const k = 1 + rng.range(-pc.sizeJitter, pc.sizeJitter);
      q.setFromAxisAngle(up, rng.range(0, Math.PI * 2));
      m.compose(pos.set(x, 0, z), q, scl.set(k, k, k));
      this.trunks.setMatrixAt(i, m);
      this.canopies.setMatrixAt(i, m);
      const r = pc.trunk.radiusBottom * k + 0.05;
      this.blocks.push([x - r, x + r, z - r, z + r]);
      i++;
    }
    for (const mesh of [this.trunks, this.canopies]) {
      mesh.count = i;
      mesh.instanceMatrix.needsUpdate = true;
    }
    if (this.platform) this.platform.blocks = this.blocks;
  }

  // The room platform (Player keepInRoom): the pocket, the trunks as blocks.
  platformAt(floorY) {
    const pc = this.pc;
    this.platform = { room: ID, x: this.stairs.x, z: this.stairs.z, y: floorY, half: pc.half, hx: pc.half - 0.5, hz: pc.half - 0.5, rx: 1, rz: 0, fx: 0, fz: 1, roofY: 30, blocks: this.blocks ?? [] };
    return this.platform;
  }

  // Where Tom stands coming in from `side`: at that edge, on its path, facing the middle.
  arrival(side) {
    const v = sideVector(side);
    const d = this.pc.half - this.pc.entryInset;
    return { x: this.stairs.x + v.x * d, z: this.stairs.z + v.z * d, yaw: Math.atan2(v.x, v.z), pitch: 0 };
  }

  // ---- each frame --------------------------------------------------------------------------------

  update(dt) {
    if (!this.inside || !this.walk) return;
    const pc = this.pc;
    const p = this.player.position;
    this.dome?.position.set(p.x - this.stairs.x, p.y - this.floorY, p.z - this.stairs.z);
    const lx = p.x - this.stairs.x;
    const lz = p.z - this.stairs.z;
    const side = exitSide(lx, lz, pc.exitReach, pc.pathHalf + 0.6);
    if (side) this.take(side);
    this.callTimer -= dt;
    if (this.callTimer <= 0 && this.walk) {
      const c = this.walk.clearing;
      const dir = c.calling[this.callNext % c.calling.length];
      this.callNext++;
      const v = sideVector(dir);
      const at = { x: this.stairs.x + v.x * pc.half, z: this.stairs.z + v.z * pc.half };
      this.sfx?.play('junieCall', at);
      this.notify?.(`"Dad?" (down the ${dir} path)`);
      this.callTimer = this.rng.range(pc.callEvery[0], pc.callEvery[1]);
    }
  }

  take(side) {
    const { walk, outcome } = choosePath(this.walk, side, this.rng);
    this.walk = walk;
    if (outcome === 'out') {
      this.interiors.leave();
      this.notify?.('Back down the stairs');
      return;
    }
    if (outcome === 'found') {
      this.interiors.leave();
      this.notify?.('Junie! You found her (spike: she comes home with you)');
      this.bus.emit('spike:junieFound');
      return;
    }
    // On to a clearing: in from the side opposite the path taken (a loop: from the stairs' side, the start again).
    this.deal(outcome === 'loop' ? 0 : walk.step);
    const s = this.arrival(outcome === 'loop' ? 'south' : opposite(side));
    this.player.setPlatform(this.platform, s.x, s.z);
    this.player.yaw = s.yaw;
    this.callTimer = 1.5;
    this.notify?.(outcome === 'loop' ? 'The path bends back… the first clearing again' : `Quiet. (${walk.step} of ${walk.needed})`);
  }

  // ---- debug -------------------------------------------------------------------------------------

  addDebugItems(menu) {
    const sp = menu.category(DEBUG.spikes);
    sp.addItem('Place beyond: go in (from the stairs)', () => {
      if (!this.stairs) return this.notify?.('No stairs on this map');
      this.interiors.enter(ID);
    });
    sp.addItem(() => `Place beyond: which path is silent? (${this.walk ? this.walk.clearing.silent : 'not inside'})`, () => {
      if (this.walk) this.notify?.(`Silent: ${this.walk.clearing.silent}; calling: ${this.walk.clearing.calling.join(' and ')}; ${this.walk.step} of ${this.walk.needed}`);
    });
  }

  overlayLine() {
    const w = this.walk;
    return w ? `beyond step ${w.step}/${w.needed} came ${w.clearing.cameFrom} silent ${w.clearing.silent} trees ${this.trunks?.count ?? 0}` : 'beyond -';
  }
}
