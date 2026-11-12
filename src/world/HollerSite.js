// The moonshiners' holler's set in the world (Session 29; DESIGN.md
// "Moonshiners' holler"; the ground: world/hollerGround.js, already in the
// ground; the set: render/hollerModel.js). In the seed's moonshinersHoller
// clearing, the hollow walked into along the first pathway that reaches it.
// Solid: the rock ledges at both faces' feet and across the head (gaps where
// the other pathways' gullies come down), the lookout's back and posts, the
// still, the thump keg, the flake stand, the barrels, the sacks, the
// woodpile, Pa's post, the shed's three walls and the gun cabinet.
//
// Only the set: the arrival, the traps going off, the map, the cutters, the
// family getting up, the still and the coil are the beat's
// (encounters/Holler.js), which finds its places in `spots` and the traps in
// `traps` (world space).

import { buildHoller } from '../render/hollerModel.js';
import { weatherFor } from '../render/propKit.js';
import { hollerFrame, gullyKeep, toWorld } from './hollerGround.js';

// The needle's turn (radians about the model's z) for a gauge reading 0..1 (pure).
export function gaugeAngle(v) {
  return (-0.75 + Math.max(0, Math.min(1, v)) * 1.5) * Math.PI;
}

export class HollerSite {
  // cfg: the whole config (config.holler and config.map.holler inside).
  constructor(cfg) {
    this.cfg = cfg;
    this.hc = cfg.holler;
    this.gc = cfg.map.holler;
    this.place = null;
    this.spots = {};
    this.traps = [];
  }

  init(scene, world, colliders) {
    const ground = world.ground;
    const f = ground.holler ?? (this.gc ? hollerFrame(world.map) : null);
    if (!f || !this.gc) return;
    this.place = f;
    this.ground = ground;
    this.y = ground.heightAt(f.x, f.z);
    const heightAt = (x, z) => {
      const w = toWorld(f, x, z);
      return ground.heightAt(w.x, w.z) - this.y;
    };
    const keepAt = (x, z) => {
      const w = toWorld(f, x, z);
      return gullyKeep(f, this.gc, w.x, w.z);
    };
    this.model = buildHoller(this.hc, { weather: weatherFor(this.cfg.props.weather, this.hc.look.weather), heightAt, keepAt, ground: this.gc });
    this.model.group.position.set(f.x, this.y, f.z);
    this.model.group.rotation.y = f.yaw;
    this.model.group.updateMatrixWorld(true);
    scene.add(this.model.group);
    for (const [name, s] of Object.entries(this.model.spots)) {
      const w = toWorld(f, s.x, s.z);
      this.spots[name] = { x: w.x, y: this.y + s.y, z: w.z };
    }
    const pt = (p) => (p ? { ...toWorld(f, p.x, p.z), y: ground.heightAt(toWorld(f, p.x, p.z).x, toWorld(f, p.x, p.z).z) } : null);
    this.traps = this.model.traps.map((t) => {
      const w = pt(t);
      const out = { i: t.i, id: t.id, kind: t.kind, mapped: t.mapped, sprung: t.sprung, x: w.x, y: w.y, z: w.z, a: pt(t.a), b: pt(t.b), tree: pt(t.tree) };
      if (t.gun) {
        const g = toWorld(f, t.gun.x, t.gun.z);
        // The gun's aim in the world: from the stump to the line's middle.
        out.gun = { x: g.x, y: this.y + t.gun.y, z: g.z, dirX: w.x - g.x, dirZ: w.z - g.z };
        const len = Math.hypot(out.gun.dirX, out.gun.dirZ) || 1;
        out.gun.dirX /= len;
        out.gun.dirZ /= len;
      }
      return out;
    });
    this.colliders = this.model.colliders.map((c) => {
      if (c.seg) {
        const a = toWorld(f, c.ax, c.az);
        const b = toWorld(f, c.bx, c.bz);
        const base = Math.min(ground.heightAt(a.x, a.z), ground.heightAt(b.x, b.z));
        return { seg: true, ax: a.x, az: a.z, bx: b.x, bz: b.z, t: c.t, x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, r: Math.hypot(b.x - a.x, b.z - a.z) / 2 + c.t, base: base - 1, top: base + 0.2 + c.top, blocksShots: c.blocksShots, off: false, what: 'holler' };
      }
      const w = toWorld(f, c.x, c.z);
      return { x: w.x, z: w.z, r: c.r, top: ground.heightAt(w.x, w.z) + c.top, what: 'holler' };
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

  // A piece that changes in play (cutters, trapMap, autoShotgun, coil, fireGlow): shown or not.
  show(name, on) {
    const m = this.model?.parts[name];
    if (m) m.visible = on;
  }

  // A trap's look: 'armed' or 'sprung' (sprung and disarmed look the same: the line slack, the jaws shut).
  setTrap(i, look) {
    this.model?.setTrap(i, look);
  }

  // The still's gauge: 0 (cold) .. 1 (it blows). The needle sweeps 270 degrees, clockwise as Tom faces
  // it (from his lower left round to his lower right; the red band's the last stretch).
  setGauge(v) {
    const n = this.model?.parts.needle;
    if (n) n.rotation.z = gaugeAngle(v);
  }

  update(cameraPosition, drawDistance) {
    if (!this.model) return;
    const d = Math.hypot(cameraPosition.x - this.place.x, cameraPosition.z - this.place.z);
    this.model.group.visible = d <= drawDistance + this.hc.radius;
  }

  dispose() {
    this.model?.dispose();
  }
}
