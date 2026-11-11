// The old church's set in the world (Session 26; DESIGN.md "Time capsule and
// the old church"; the model: render/oldChurchModel.js). In the story spine's
// graveyard clearing (timeCapsule), every run, its door facing the way Tom
// comes from (the crashed plane). Solid: the walls (the door's the way in),
// the steeple, the stones, the lychgate's posts, the plaque stone, the oak.
//
// Only the set: the arrival, the Caller in the church, the plaque, the dig
// and the capsule are the encounter's (encounters/OldChurch.js), which finds
// its places in `spots` (world space).

import { buildOldChurch } from '../render/oldChurchModel.js';
import { weatherFor } from '../render/propKit.js';
import { toWorld } from './CrashSite.js';

// Where it stands and which way it faces (pure): in the timeCapsule clearing,
// model +z pointing away from `from` (Tom comes from there, up the path to its
// door). null if the map has no such clearing.
export function churchPlacement(map, from) {
  const c = map.clearings.find((k) => k.key === 'timeCapsule');
  if (!c) return null;
  const yaw = from ? Math.atan2(c.x - from.x, c.z - from.z) : 0;
  return { x: c.x, z: c.z, yaw };
}

export class OldChurchSite {
  // cfg: the whole config (config.oldChurch inside).
  constructor(cfg) {
    this.cfg = cfg;
    this.oc = cfg.oldChurch;
    this.place = null;
    this.spots = {};
  }

  // from: where Tom comes from (the crashed plane's clearing).
  init(scene, world, colliders) {
    const plane = world.map.clearings.find((k) => k.key === 'crashedPlane');
    this.place = churchPlacement(world.map, plane);
    if (!this.place) return;
    const p = this.place;
    const ground = world.ground;
    this.y = ground.heightAt(p.x, p.z);
    const heightAt = (x, z) => {
      const w = toWorld(p, x, z);
      return ground.heightAt(w.x, w.z) - this.y;
    };
    this.model = buildOldChurch(this.oc.look, { weather: weatherFor(this.cfg.props.weather, this.oc.look.weather), heightAt });
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
        const base = Math.min(ground.heightAt(a.x, a.z), ground.heightAt(b.x, b.z));
        return { seg: true, ax: a.x, az: a.z, bx: b.x, bz: b.z, t: c.t, x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, r: Math.hypot(b.x - a.x, b.z - a.z) / 2 + c.t, base: base - 1, top: base + 0.25 + c.top, blocksShots: c.blocksShots, off: false, what: 'oldChurch' };
      }
      const w = toWorld(p, c.x, c.z);
      return { x: w.x, z: w.z, r: c.r, top: ground.heightAt(w.x, w.z) + c.top, what: 'oldChurch' };
    });
    for (const c of this.colliders) colliders?.insert(c);
  }

  // A point of the model (model x, z) in the world.
  toWorld(x, z) {
    return toWorld(this.place, x, z);
  }

  // Drawn only within the draw distance.
  update(cameraPosition, drawDistance) {
    if (!this.model) return;
    const d = Math.hypot(cameraPosition.x - this.place.x, cameraPosition.z - this.place.z);
    this.model.group.visible = d <= drawDistance + this.oc.radius;
  }

  dispose() {
    this.model?.dispose();
  }
}
