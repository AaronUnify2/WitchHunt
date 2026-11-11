// The stairs in the woods in the world (Session 26; DESIGN.md "Stairs in the
// woods"; the model: render/stairsModel.js). In the story spine's off-path
// clearing (stairs), every run: the flight climbs away from the old church,
// so its foot is the first thing Tom reaches. Solid at its sides and back.
//
// Only the set: the climb, the place beyond and Junie are the beat's
// (encounters/Stairs.js), which finds its places in `spots` (world space).

import { buildStairs } from '../render/stairsModel.js';
import { toWorld } from './CrashSite.js';

// Where it stands (pure): in the stairs clearing, climbing away from `from`. null if there's no such clearing.
export function stairsPlacement(map, from) {
  const c = map.clearings.find((k) => k.key === 'stairs');
  if (!c) return null;
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
  }

  toWorld(x, z) {
    return toWorld(this.place, x, z);
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
