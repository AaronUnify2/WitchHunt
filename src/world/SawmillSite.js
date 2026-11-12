// The sawmill's set in the world (Session 28; DESIGN.md "The sawmill"; the
// set: render/sawmillModel.js). In the sawmill clearing the seed deals, the
// mill road coming in along the pathway that reaches it. Solid: the
// sedans, the lumber stacks, the bunkhouse's walls (its door's the way in),
// the shed's posts and back wall, the carriage, the head rig, the power
// unit, the roller bed, the log deck and the logs off it, the sawdust
// pile, the filing room's walls, bench and desk.
//
// Only the set: the arrival, the searches, the day book, the SMG, the
// chainsaw, the dead getting up and the head saw are the beat's
// (encounters/Sawmill.js), which finds its places in `spots` and the dead
// who rise in `risers` (world space).

import { buildSawmill } from '../render/sawmillModel.js';
import { weatherFor } from '../render/propKit.js';
import { pathFrame } from './clearingFrame.js';
import { toWorld } from './CrashSite.js';

// Where it stands and which way it faces (pure): model +z the way the path
// walks in. null if the map has no sawmill.
export function sawmillPlacement(map) {
  const f = pathFrame(map, 'sawmill');
  return f ? { x: f.x, z: f.z, yaw: f.yaw, radius: f.radius } : null;
}

export class SawmillSite {
  // cfg: the whole config (config.sawmill inside).
  constructor(cfg) {
    this.cfg = cfg;
    this.sc = cfg.sawmill;
    this.place = null;
    this.spots = {};
    this.risers = [];
  }

  init(scene, world, colliders) {
    this.place = sawmillPlacement(world.map);
    if (!this.place) return;
    const p = this.place;
    const ground = world.ground;
    this.ground = ground;
    this.y = ground.heightAt(p.x, p.z);
    const heightAt = (x, z) => {
      const w = toWorld(p, x, z);
      return ground.heightAt(w.x, w.z) - this.y;
    };
    this.model = buildSawmill(this.sc, { weather: weatherFor(this.cfg.props.weather, this.sc.look.weather), heightAt });
    this.model.group.position.set(p.x, this.y, p.z);
    this.model.group.rotation.y = p.yaw;
    this.model.group.updateMatrixWorld(true);
    scene.add(this.model.group);
    for (const [name, s] of Object.entries(this.model.spots)) {
      const w = toWorld(p, s.x, s.z);
      this.spots[name] = { x: w.x, y: this.y + s.y, z: w.z };
    }
    this.risers = this.model.risers.map((r, i) => {
      const w = toWorld(p, r.x, r.z);
      return { i, kind: r.kind, group: r.group, x: w.x, y: this.y + r.y, z: w.z, yaw: p.yaw + r.yaw };
    });
    this.colliders = this.model.colliders.map((c) => {
      if (c.seg) {
        const a = toWorld(p, c.ax, c.az);
        const b = toWorld(p, c.bx, c.bz);
        const base = Math.min(ground.heightAt(a.x, a.z), ground.heightAt(b.x, b.z));
        return { seg: true, ax: a.x, az: a.z, bx: b.x, bz: b.z, t: c.t, x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, r: Math.hypot(b.x - a.x, b.z - a.z) / 2 + c.t, base: base - 1, top: base + 0.2 + c.top, blocksShots: c.blocksShots, off: false, what: 'sawmill' };
      }
      const w = toWorld(p, c.x, c.z);
      return { x: w.x, z: w.z, r: c.r, top: ground.heightAt(w.x, w.z) + c.top, what: 'sawmill' };
    });
    for (const c of this.colliders) colliders?.insert(c);
  }

  get ready() {
    return Boolean(this.place && this.model);
  }

  // A point of the model (model x, z) in the world.
  at(x, z) {
    return toWorld(this.place, x, z);
  }

  // A piece that changes in play (headSaw, chainsaw, smg, diary): shown or not.
  show(name, on) {
    const m = this.model?.parts[name];
    if (m) m.visible = on;
  }

  // One of the dead gets up: its body folds out of the set (the zombie's the beat's).
  raise(i) {
    this.model?.hideRiser(i);
  }

  // All of them lying where they fell again.
  layAll() {
    this.model?.showRisers();
  }

  update(cameraPosition, drawDistance) {
    if (!this.model) return;
    const d = Math.hypot(cameraPosition.x - this.place.x, cameraPosition.z - this.place.z);
    this.model.group.visible = d <= drawDistance + this.sc.radius;
  }

  dispose() {
    this.model?.dispose();
  }
}
