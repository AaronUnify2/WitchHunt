// The crashed UFO's set in the world (build queue item 5; the model:
// render/mothershipModel.js buildCrashedUfo). In the story spine's crashedUfo
// clearing, every run, facing the way Tom comes in. Solid: the saucer and the
// snapped trunks. Only the set: the beam and the mothership are the
// encounter's (encounters/Mothership.js), which finds its places in `spots`.

import { buildCrashedUfo } from '../render/mothershipModel.js';
import { toWorld } from './CrashSite.js';
import { pathFrame } from './clearingFrame.js';

// Where it stands and which way it faces (pure): in the crashedUfo clearing,
// model +z pointing away from the pathway's way in (so Tom walks up the cut
// to the machine). null if the map has no such clearing.
export function crashedUfoPlacement(map) {
  const c = map.clearings.find((k) => k.key === 'crashedUfo');
  if (!c) return null;
  const f = pathFrame(map, 'crashedUfo');
  return { x: c.x, z: c.z, yaw: f?.yaw ?? 0, entrance: f?.entrance ?? null };
}

export class CrashedUfoSite {
  // cfg: the whole config (config.crashedUfo inside).
  constructor(cfg) {
    this.cfg = cfg;
    this.uc = cfg.crashedUfo;
    this.place = null;
    this.spots = {};
  }

  init(scene, world, colliders) {
    this.place = crashedUfoPlacement(world.map);
    if (!this.place) return;
    const p = this.place;
    const ground = world.ground;
    this.y = ground.heightAt(p.x, p.z);
    const heightAt = (x, z) => {
      const w = toWorld(p, x, z);
      return ground.heightAt(w.x, w.z) - this.y;
    };
    this.model = buildCrashedUfo(this.uc.look, { heightAt });
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
        return { seg: true, ax: a.x, az: a.z, bx: b.x, bz: b.z, t: c.t, x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, r: Math.hypot(b.x - a.x, b.z - a.z) / 2 + c.t, base: base - 1, top: base + 0.25 + c.top, blocksShots: c.blocksShots, off: false, what: 'crashedUfo' };
      }
      const w = toWorld(p, c.x, c.z);
      return { x: w.x, z: w.z, r: c.r, top: ground.heightAt(w.x, w.z) + c.top, what: 'crashedUfo' };
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
    this.model.group.visible = d <= drawDistance + this.uc.radius;
  }

  dispose() {
    this.model?.dispose();
  }
}
