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
//
// Session 26 (story spine, beat 5): promoted to the story. Climbing the
// stairs (encounters/Stairs.js) enters it with enter({ story: true }):
//  - its look (config.spikes.placeBeyond.story): thicker fog, bone-grey
//    trunks under blue-black crowns, and every tree leaning a little in
//    toward the clearing's middle, as if they were watching it;
//  - Junie's voice comes down the two calling paths, a positional sound
//    with a subtitle that says which path (the Caller's tell on it: it
//    isn't her). Back at the start after a calling path, it says so;
//  - the silent path, three times in a row: the last clearing is empty but
//    for her, and 'beyond:found' { x, z, yaw, dy } lets the beat stage the
//    find (Stairs plays it, then leave() takes them both down the stairs).
// Events: 'beyond:entered', 'beyond:found', 'beyond:out'.

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

  // ctx: { world, player, interiors, sfx, notify }; Session 26, set after
  // init: dialogue (Junie's voice's subtitles), stairsSite (the foot of the stairs: in and out).
  init(ctx) {
    Object.assign(this, ctx);
    this.stairs = this.world.map.clearings.find((c) => c.spine && c.key === 'stairs') ?? null;
    this.rng = new Rng(`${this.world.seed ?? 'beyond'}:placeBeyond`);
    if (!this.stairs) return;
    const pc = this.pc;
    const self = this;
    this.interiors.define({
      id: ID,
      name: 'The place beyond',
      entrance: () => this.foot(),
      surfaceY: () => this.world.ground.heightAt(this.stairs.x, this.stairs.z),
      load: (scene, floorY) => this.load(scene, floorY),
      platform: (floorY) => this.platformAt(floorY),
      spawn: () => this.arrival('south'),
      exit: () => this.exitPoint(),
      // Session 26: the story's closer fog and colder light, or the spike's.
      get light() {
        return self.story ? pc.storyLight : pc.light;
      },
      onEnter: () => {
        this.walk = startWalk(this.rng, pc.needed);
        this.found = null;
        this.applyLook();
        this.deal(0);
        this.callTimer = 1.5;
        this.callNext = 0;
        this.bus.emit('beyond:entered', { story: this.story });
        if (!this.story) this.notify?.('The place beyond (spike): four paths. Never follow the voice.');
      },
      onLeave: () => (this.walk = null),
    });
  }

  get inside() {
    return this.interiors?.id === ID;
  }

  // Session 26: the stairs' foot (the set's spot), else the clearing's middle.
  foot() {
    const f = this.stairsSite?.spots?.foot;
    return f ? { x: f.x, z: f.z } : { x: this.stairs.x, z: this.stairs.z };
  }

  // Out: a step back from the foot of the stairs, facing them.
  exitPoint() {
    const f = this.stairsSite?.spots?.foot;
    const p = this.stairsSite?.place;
    if (!f || !p) return { x: this.stairs.x, z: this.stairs.z + 6, yaw: 0 };
    const bx = -Math.sin(p.yaw) * 1.4;
    const bz = -Math.cos(p.yaw) * 1.4;
    return { x: f.x + bx, z: f.z + bz, yaw: p.yaw + Math.PI };
  }

  // In, for the story (the spike's debug item goes in without).
  enter({ story = false } = {}) {
    if (!this.stairs) return false;
    this.story = story;
    this.interiors.enter(ID);
    return true;
  }

  leave() {
    if (this.inside) this.interiors.leave();
  }

  // Session 26: the story's look (or the spike's), set as Tom goes in.
  applyLook() {
    const pc = this.pc;
    const look = this.story ? { ...pc, ...pc.story } : pc;
    this.lean = this.story ? pc.story.lean : 0;
    if (this.trunks) this.trunks.material.color.setHex(look.trunkColor ?? pc.trunk.color);
    if (this.canopies) this.canopies.material.color.setHex(look.canopyColor ?? pc.canopy.color);
    if (this.floorMesh) this.floorMesh.material.color.setHex(look.floorColor ?? pc.floor.color);
    if (this.dome) this.dome.material.color.setHex(look.fogColor ?? pc.light.fogColor);
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
    this.floorMesh = floor;
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
    const lean = new THREE.Quaternion();
    const axis = new THREE.Vector3();
    this.blocks = [];
    let i = 0;
    for (const sp of this.spots) {
      const x = sp.x + rng.range(-pc.treeJitter, pc.treeJitter);
      const z = sp.z + rng.range(-pc.treeJitter, pc.treeJitter);
      const keep = rng.next() < pc.treeKeep;
      const onPath = Math.abs(x) < pc.pathHalf + 0.8 || Math.abs(z) < pc.pathHalf + 0.8;
      if (!keep || onPath || Math.hypot(x, z) < pc.clearingRadius * (this.wide ? 1.5 : 1)) continue;
      const k = 1 + rng.range(-pc.sizeJitter, pc.sizeJitter);
      q.setFromAxisAngle(up, rng.range(0, Math.PI * 2));
      // Session 26 (the story's look): every tree leans a little in toward the clearing's middle.
      if (this.lean) {
        const d = Math.hypot(x, z) || 1;
        lean.setFromAxisAngle(axis.set(-z / d, 0, x / d), -this.lean);
        q.premultiply(lean);
      }
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
  arrival(side, dist = null) {
    const v = sideVector(side);
    const d = dist ?? this.pc.half - this.pc.entryInset;
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
      if (this.story) this.voice(dir);
      else this.notify?.(`"Dad?" (down the ${dir} path)`);
      this.callTimer = this.rng.range(pc.callEvery[0], pc.callEvery[1]);
    }
  }

  take(side) {
    const { walk, outcome } = choosePath(this.walk, side, this.rng);
    this.walk = walk;
    if (outcome === 'out') {
      this.interiors.leave();
      this.bus.emit('beyond:out');
      if (!this.story) this.notify?.('Back down the stairs');
      return;
    }
    if (outcome === 'found') {
      if (!this.story) {
        this.interiors.leave();
        this.notify?.('Junie! You found her (spike: she comes home with you)');
        this.bus.emit('spike:junieFound');
        return;
      }
      // Session 26: the last clearing, wider, empty but for her; the beat stages the find.
      this.wide = true;
      this.deal(walk.step + 7);
      this.wide = false;
      const s = this.arrival(opposite(side), this.findDistance ?? 6.5);
      this.player.setPlatform(this.platform, s.x, s.z);
      this.player.yaw = s.yaw;
      this.walk = null;
      this.found = { x: this.stairs.x, z: this.stairs.z, yaw: s.yaw, dy: this.floorY - this.world.ground.heightAt(this.stairs.x, this.stairs.z) };
      this.bus.emit('beyond:found', this.found);
      return;
    }
    // On to a clearing: in from the side opposite the path taken (a loop: from the stairs' side, the start again).
    this.deal(outcome === 'loop' ? 0 : walk.step);
    const s = this.arrival(outcome === 'loop' ? 'south' : opposite(side));
    this.player.setPlatform(this.platform, s.x, s.z);
    this.player.yaw = s.yaw;
    this.callTimer = 1.5;
    if (this.story) {
      if (outcome === 'loop') {
        this.callTimer = 4;
        this.dialogue?.play(this.pickLine('loop'), { dir: 'All round you' }, false);
      } else this.notify?.(`It's quiet this way. (${walk.step} of ${walk.needed})`);
      return;
    }
    this.notify?.(outcome === 'loop' ? 'The path bends back… the first clearing again' : `Quiet. (${walk.step} of ${walk.needed})`);
  }

  // ---- Session 26: Junie's voice, down a calling path ---------------------------------------------

  // A line from the pool (dialogue.json's callerPool 'beyond' / 'beyondLoop'), not the last one.
  pickLine(kind) {
    const pool = (this.dialogue?.lines ?? []).filter((l) => l.callerPool === (kind === 'loop' ? 'beyondLoop' : 'beyond')).map((l) => l.id);
    if (!pool.length) return null;
    let id = pool[this.rng.int(0, pool.length - 1)];
    if (id === this.lastLine && pool.length > 1) id = pool[(pool.indexOf(id) + 1) % pool.length];
    this.lastLine = id;
    return id;
  }

  voice(dir) {
    const id = this.pickLine('call');
    if (id && !this.dialogue?.subtitles?.busy) this.dialogue?.play(id, { dir: `Down the ${dir} path` }, false);
  }

  // ---- debug -------------------------------------------------------------------------------------

  addDebugItems(menu) {
    const sp = menu.category(DEBUG.spikes);
    sp.addItem('Place beyond: go in (from the stairs)', () => {
      if (!this.stairs) return this.notify?.('No stairs on this map');
      this.enter({ story: false });
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
