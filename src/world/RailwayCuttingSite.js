// The railway cutting's set in the world (Session 27; DESIGN.md "The railway
// cutting: the 1903 line"; the set: render/railwayCuttingModel.js; the
// ground's banks: world/railCutting.js, already in the ground). In the seed's
// railwayCutting clearing on the 1903 line. Solid: the rock faces (gaps where
// the gullies and the navvies' steps come down), the engine, the tender, the
// coaches (their insides are rooms: the encounter puts Tom aboard), the
// baggage car, the boulders, the powder store's walls and its barred door.
//
// Only the set: the arrival, the searches, the Caller, the maul, the powder
// store's door, the dead and the cowcatcher are the beat's
// (encounters/RailwayCutting.js), which finds its places in `spots` and the
// coaches' insides in `rooms` (world space).

import { buildRailwayCutting } from '../render/railwayCuttingModel.js';
import { weatherFor } from '../render/propKit.js';
import { cuttingFrame, toWorld, lineAt, gullyKeep, liftAt } from './railCutting.js';

// Which end and bank the powder store sits on (pure): the frame's own pick first (the bank fewer
// pathways come down, the end away from them), then the next spots along, then the other bank,
// the first that's well clear of every gully and up on a full bank. Returns { side, z } in the frame.
export function storePlace(f, cut, keep, lift) {
  const e = f.storeEnd ?? 1;
  const zs = [8, 5, 11, 2].flatMap((z) => [e * z, -e * z]);
  for (const side of [f.storeSide ?? 1, -(f.storeSide ?? 1)]) {
    for (const z of zs) {
      const X = side * 13.2;
      if (keep(X, z) > 0.95 && keep(X, z + 3) > 0.9 && keep(X, z - 3) > 0.9 && lift(X, z) > 0.6 * Math.min(...cut.height)) return { side, z };
    }
  }
  return { side: f.storeSide ?? 1, z: e * 8 };
}

export class RailwayCuttingSite {
  // cfg: the whole config (config.railwayCutting and config.map.railway.cutting inside).
  constructor(cfg) {
    this.cfg = cfg;
    this.rc = cfg.railwayCutting;
    this.cut = cfg.map.railway?.cutting;
    this.frame = null;
    this.spots = {};
    this.rooms = {};
  }

  init(scene, world, colliders) {
    const ground = world.ground;
    this.frame = ground.cutting ?? (this.cut ? cuttingFrame(world.map, this.cut) : null);
    if (!this.frame || !this.cut) return;
    const f = this.frame;
    this.ground = ground;
    this.y = ground.heightAt(f.x, f.z);
    const heightAt = (X, Z) => {
      const w = toWorld(f, X, Z);
      return ground.heightAt(w.x, w.z) - this.y;
    };
    const keepAt = (X, Z) => {
      const w = toWorld(f, X, Z);
      return gullyKeep(f, this.cut, w.x, w.z);
    };
    const lift = (X, Z) => {
      const w = toWorld(f, X, Z);
      return liftAt(f, this.cut, w.x, w.z);
    };
    this.store = storePlace(f, this.cut, keepAt, lift);
    const weather = weatherFor(this.cfg.props.weather, this.rc.look.weather);
    this.model = buildRailwayCutting(this.rc, { weather, heightAt, lineAt: (Z) => lineAt(f, Z), keepAt, cut: this.cut, side: this.store.side, storeZ: this.store.z });
    this.model.group.position.set(f.x, this.y, f.z);
    this.model.group.rotation.y = f.yaw;
    this.model.group.updateMatrixWorld(true);
    scene.add(this.model.group);
    for (const [name, s] of Object.entries(this.model.spots)) {
      const w = toWorld(f, s.x, s.z);
      this.spots[name] = { x: w.x, y: this.y + s.y, z: w.z };
    }
    // The coaches' insides, as room platforms (Player.keepInRoom): a box round its middle in its own frame.
    for (const [id, r] of Object.entries(this.model.rooms)) {
      const w = toWorld(f, r.x, r.z);
      const yaw = f.yaw + r.yaw;
      const fx = Math.sin(yaw);
      const fz = Math.cos(yaw);
      this.rooms[id] = { id, x: w.x, z: w.z, y: this.y + r.y + r.floor + 0.04, hx: r.hx, hz: r.hz, rx: fz, rz: -fx, fx, fz, yaw, roof: r.roof, blocks: r.blocks.map((b) => [...b]) };
    }
    this.colliders = this.model.colliders.map((c) => {
      if (c.seg) {
        const a = toWorld(f, c.ax, c.az);
        const b = toWorld(f, c.bx, c.bz);
        const base = Math.min(ground.heightAt(a.x, a.z), ground.heightAt(b.x, b.z));
        return { seg: true, ax: a.x, az: a.z, bx: b.x, bz: b.z, t: c.t, x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, r: Math.hypot(b.x - a.x, b.z - a.z) / 2 + c.t, base: base - 1, top: base + 0.2 + c.top, blocksShots: c.blocksShots, off: false, what: c.face ? 'rockFace' : 'railwayCutting' };
      }
      const w = toWorld(f, c.x, c.z);
      return { x: w.x, z: w.z, r: c.r, top: ground.heightAt(w.x, w.z) + c.top, what: 'railwayCutting' };
    });
    for (const c of this.colliders) colliders?.insert(c);
    // The powder store's door: shut across its doorway until it's knocked open.
    const d = this.spots.storeDoor;
    const ins = this.spots.storeInside;
    if (d && ins) {
      const len = Math.hypot(ins.x - d.x, ins.z - d.z) || 1;
      const ux = (ins.x - d.x) / len;
      const uz = (ins.z - d.z) / len;
      // The doorway is 0.9 m in from the door spot, across it (perpendicular to the way in).
      const cx = d.x + ux * 0.9;
      const cz = d.z + uz * 0.9;
      const hw = this.rc.store.door / 2 + 0.05;
      const top = ground.heightAt(cx, cz) + 2.4;
      this.doorCollider = { seg: true, ax: cx - uz * hw, az: cz + ux * hw, bx: cx + uz * hw, bz: cz - ux * hw, t: 0.12, x: cx, z: cz, r: hw + 0.12, base: top - 4, top, blocksShots: true, off: false, what: 'powderDoor' };
      colliders?.insert(this.doorCollider);
    }
  }

  get ready() {
    return Boolean(this.frame && this.model);
  }

  // A point of the frame (X across, Z along) in the world.
  at(X, Z) {
    return toWorld(this.frame, X, Z);
  }

  // The store's door: 'barred' or 'open'.
  setDoor(state) {
    if (!this.model) return;
    const open = state === 'open';
    this.model.parts.door.visible = !open;
    this.model.parts.doorOpen.visible = open;
    if (this.doorCollider) this.doorCollider.off = open;
  }

  // The cowcatcher and the boiler plate: on the engine, or taken.
  setCowcatcher(on) {
    if (this.model) this.model.parts.cowcatcher.visible = on;
  }

  update(cameraPosition, drawDistance) {
    if (!this.model) return;
    const d = Math.hypot(cameraPosition.x - this.frame.x, cameraPosition.z - this.frame.z);
    this.model.group.visible = d <= drawDistance + this.rc.radius;
  }

  dispose() {
    this.model?.dispose();
  }
}
