// The clearing crew's camp in the world (build queue item 1; the model:
// render/dozerCampModel.js). In the story spine's cordonDozer clearing, on
// the cordon strip, every run, facing the way Tom comes in. Solid: the log
// decks, the tent's walls, the job box, the generator, the drums, the felled
// trunks.
//
// Only the set: the arrival, the crew, the keys, the battery and the dozer
// itself are the encounter's (encounters/CordonDozer.js), which finds its
// places in `spots` (world space).

import { buildDozerCamp } from '../render/dozerCampModel.js';
import { weatherFor } from '../render/propKit.js';
import { toWorld } from './CrashSite.js';
import { pathFrame } from './clearingFrame.js';

// Where it stands and which way it faces (pure): in the cordonDozer clearing,
// model +z pointing away from the pathway's way in (so Tom walks up the cut
// to the machine). null if the map has no such clearing.
export function dozerCampPlacement(map) {
  const c = map.clearings.find((k) => k.key === 'cordonDozer');
  if (!c) return null;
  const f = pathFrame(map, 'cordonDozer');
  return { x: c.x, z: c.z, yaw: f?.yaw ?? 0, entrance: f?.entrance ?? null };
}

// The heading the Dozer takes to stand as the model's dozer does (its blade
// toward model +z): the vehicle's front is its own -z, so half a turn on.
export function dozerHeading(place) {
  return place.yaw + Math.PI;
}

export class DozerCampSite {
  // cfg: the whole config (config.dozerCamp inside).
  constructor(cfg) {
    this.cfg = cfg;
    this.dc = cfg.dozerCamp;
    this.place = null;
    this.spots = {};
  }

  init(scene, world, colliders) {
    this.place = dozerCampPlacement(world.map);
    if (!this.place) return;
    const p = this.place;
    const ground = world.ground;
    this.y = ground.heightAt(p.x, p.z);
    const heightAt = (x, z) => {
      const w = toWorld(p, x, z);
      return ground.heightAt(w.x, w.z) - this.y;
    };
    this.model = buildDozerCamp(this.dc.look, { weather: weatherFor(this.cfg.props.weather, this.dc.look.weather), heightAt });
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
        return { seg: true, ax: a.x, az: a.z, bx: b.x, bz: b.z, t: c.t, x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, r: Math.hypot(b.x - a.x, b.z - a.z) / 2 + c.t, base: base - 1, top: base + 0.25 + c.top, blocksShots: c.blocksShots, off: false, what: 'dozerCamp' };
      }
      const w = toWorld(p, c.x, c.z);
      return { x: w.x, z: w.z, r: c.r, top: ground.heightAt(w.x, w.z) + c.top, what: 'dozerCamp' };
    });
    for (const c of this.colliders) colliders?.insert(c);
  }

  // A point of the model (model x, z) in the world.
  toWorld(x, z) {
    return toWorld(this.place, x, z);
  }

  // The spare battery's there until it's taken.
  setBattery(there) {
    if (this.model) this.model.battery.visible = there;
  }

  // Drawn only within the draw distance.
  update(cameraPosition, drawDistance) {
    if (!this.model) return;
    const d = Math.hypot(cameraPosition.x - this.place.x, cameraPosition.z - this.place.z);
    this.model.group.visible = d <= drawDistance + this.dc.radius;
  }

  dispose() {
    this.model?.dispose();
  }
}
