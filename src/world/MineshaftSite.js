// The abandoned mineshaft's surface set in the world (Session 30; DESIGN.md
// "Abandoned mineshaft"; the set: render/mineshaftModel.js). In the seed's
// mineshaft clearing, the track coming in along the first pathway that
// reaches it. Solid: the sign's posts, the office's walls (its door's the
// way in), desk and locker, the headframe's legs, the cage's sides and
// back, the control box's post, the hoist house, the tub on the rails, the
// spoil heap, the pit props, the spool, the tub on its side, the army's
// crates and lamp stand.
//
// Only the set: the arrival, the searches, the battery, the cage and
// everything below are the beat's (encounters/Mineshaft.js), which finds
// its places in `spots` (world space).

import { buildMineshaft } from '../render/mineshaftModel.js';
import { weatherFor } from '../render/propKit.js';
import { pathFrame } from './clearingFrame.js';
import { toWorld } from './CrashSite.js';

// Where it stands and which way it faces (pure): model +z the way the path
// walks in. null if the map has no mineshaft.
export function mineshaftPlacement(map) {
  const f = pathFrame(map, 'mineshaft');
  return f ? { x: f.x, z: f.z, yaw: f.yaw, radius: f.radius } : null;
}

export class MineshaftSite {
  // cfg: the whole config (config.mineshaft inside).
  constructor(cfg) {
    this.cfg = cfg;
    this.mc = cfg.mineshaft;
    this.place = null;
    this.spots = {};
  }

  init(scene, world, colliders) {
    this.place = mineshaftPlacement(world.map);
    if (!this.place) return;
    const p = this.place;
    const ground = world.ground;
    this.ground = ground;
    this.y = ground.heightAt(p.x, p.z);
    const heightAt = (x, z) => {
      const w = toWorld(p, x, z);
      return ground.heightAt(w.x, w.z) - this.y;
    };
    this.model = buildMineshaft(this.mc, { weather: weatherFor(this.cfg.props.weather, this.mc.look.weather), heightAt });
    this.model.group.position.set(p.x, this.y, p.z);
    this.model.group.rotation.y = p.yaw;
    this.model.group.updateMatrixWorld(true);
    scene.add(this.model.group);
    for (const [name, s] of Object.entries(this.model.spots)) {
      const w = toWorld(p, s.x, s.z);
      this.spots[name] = { x: w.x, y: this.y + s.y, z: w.z };
    }
    this.colliders = this.model.colliders.map((c) => {
      if (c.seg) {
        const a = toWorld(p, c.ax, c.az);
        const b = toWorld(p, c.bx, c.bz);
        const base = Math.min(ground.heightAt(a.x, a.z), ground.heightAt(b.x, b.z));
        return { seg: true, ax: a.x, az: a.z, bx: b.x, bz: b.z, t: c.t, x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, r: Math.hypot(b.x - a.x, b.z - a.z) / 2 + c.t, base: base - 1, top: base + 0.2 + c.top, blocksShots: c.blocksShots, off: false, what: 'mineshaft' };
      }
      const w = toWorld(p, c.x, c.z);
      return { x: w.x, z: w.z, r: c.r, top: ground.heightAt(w.x, w.z) + c.top, what: 'mineshaft' };
    });
    for (const c of this.colliders) colliders?.insert(c);
  }

  get ready() {
    return Boolean(this.place && this.model);
  }

  // A point of the model (model x left, z ahead) in the world.
  at(x, z) {
    return toWorld(this.place, x, z);
  }

  // A piece that changes in play (battery, boxLamp, cageLamp): shown or not.
  show(name, on) {
    const m = this.model?.parts[name];
    if (m) m.visible = on;
  }

  update(cameraPosition, drawDistance) {
    if (!this.model) return;
    const d = Math.hypot(cameraPosition.x - this.place.x, cameraPosition.z - this.place.z);
    this.model.group.visible = d <= drawDistance + this.mc.radius;
  }

  dispose() {
    this.model?.dispose();
  }
}
