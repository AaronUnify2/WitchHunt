// The Car Armory's set in the world (build queue item 6; the model:
// render/carArmoryModel.js). In the story spine's carArmory clearing, every
// run, its gate facing the way Tom comes in. Solid: the fence, the hall's
// walls and racks, the truck, the barricade, the cages. Only the set: the
// dead, the survivors, the loot and Sheriff are the encounter's
// (encounters/CarArmory.js), which finds its places in `spots`.

import { buildCarArmory } from '../render/carArmoryModel.js';
import { toWorld } from './CrashSite.js';
import { pathFrame } from './clearingFrame.js';

// Where it stands and which way it faces (pure): in the carArmory clearing,
// model +z pointing away from the pathway's way in (so Tom walks up the cut
// to the machine). null if the map has no such clearing.
export function carArmoryPlacement(map) {
  const c = map.clearings.find((k) => k.key === 'carArmory');
  if (!c) return null;
  const f = pathFrame(map, 'carArmory');
  return { x: c.x, z: c.z, yaw: f?.yaw ?? 0, entrance: f?.entrance ?? null };
}

export class CarArmorySite {
  // cfg: the whole config (config.carArmory inside).
  constructor(cfg) {
    this.cfg = cfg;
    this.ac = cfg.carArmory;
    this.place = null;
    this.spots = {};
  }

  init(scene, world, colliders) {
    this.place = carArmoryPlacement(world.map);
    if (!this.place) return;
    const p = this.place;
    const ground = world.ground;
    this.y = ground.heightAt(p.x, p.z);
    const heightAt = (x, z) => {
      const w = toWorld(p, x, z);
      return ground.heightAt(w.x, w.z) - this.y;
    };
    this.model = buildCarArmory(this.ac.look, { heightAt });
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
        return { seg: true, ax: a.x, az: a.z, bx: b.x, bz: b.z, t: c.t, x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, r: Math.hypot(b.x - a.x, b.z - a.z) / 2 + c.t, base: base - 1, top: base + 0.25 + c.top, blocksShots: c.blocksShots, off: false, what: 'carArmory' };
      }
      const w = toWorld(p, c.x, c.z);
      return { x: w.x, z: w.z, r: c.r, top: ground.heightAt(w.x, w.z) + c.top, what: 'carArmory' };
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
    this.model.group.visible = d <= drawDistance + this.ac.radius;
  }

  dispose() {
    this.model?.dispose();
  }
}
