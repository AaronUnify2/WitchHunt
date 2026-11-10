// The crashed plane's set in the world (Session 24; DESIGN.md "Crashed
// plane"; the model: render/crashedPlaneModel.js). The wreck stands in the
// story spine's first clearing, every run: the plane was flying away from
// the checkpoint, so Tom walks up its gouge to it. Solid (the fuselage, the
// wings, the tail, the stumps); the wings and the hull stop shots (cover).
//
// Only the set: the grey, the quick draw and the Mothman are the
// encounter's (Session 25), which finds its places in `spots` (world space).

import { buildCrashedPlane } from '../render/crashedPlaneModel.js';
import { weatherFor } from '../render/propKit.js';

// Where the wreck lies and which way the plane was heading (pure): in the
// crashedPlane clearing, heading away from the checkpoint. null if the map
// has no such clearing.
export function crashSitePlacement(map, checkpoint, yaw = null) {
  const c = map.clearings.find((k) => k.key === 'crashedPlane');
  if (!c) return null;
  const heading = yaw ?? (checkpoint ? Math.atan2(c.x - checkpoint.x, c.z - checkpoint.z) : 0);
  return { x: c.x, z: c.z, yaw: heading };
}

// A point of the model (heading +z) in the world.
export function toWorld(place, x, z) {
  const s = Math.sin(place.yaw);
  const c = Math.cos(place.yaw);
  return { x: place.x + x * c + z * s, z: place.z - x * s + z * c };
}

export class CrashSite {
  // cfg: the whole config (config.crashedPlane inside).
  constructor(cfg) {
    this.cfg = cfg;
    this.pc = cfg.crashedPlane;
    this.place = null;
    this.spots = {};
  }

  init(scene, world, colliders) {
    this.place = crashSitePlacement(world.map, world.cordon?.layout?.checkpoint, this.pc.yaw);
    if (!this.place) return;
    const p = this.place;
    const ground = world.ground;
    this.y = ground.heightAt(p.x, p.z);
    const heightAt = (x, z) => {
      const w = toWorld(p, x, z);
      return ground.heightAt(w.x, w.z) - this.y;
    };
    this.model = buildCrashedPlane(this.pc.look, { weather: weatherFor(this.cfg.props.weather, this.pc.look.weather), heightAt });
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
        return { seg: true, ax: a.x, az: a.z, bx: b.x, bz: b.z, t: c.t, x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, r: Math.hypot(b.x - a.x, b.z - a.z) / 2 + c.t, base: base - 1, top: base + c.top, blocksShots: c.blocksShots, off: false, what: 'crashedPlane' };
      }
      const w = toWorld(p, c.x, c.z);
      return { x: w.x, z: w.z, r: c.r, top: ground.heightAt(w.x, w.z) + c.top, what: 'crashedPlane' };
    });
    for (const c of this.colliders) colliders?.insert(c);
  }

  // Drawn only within the draw distance.
  update(cameraPosition, drawDistance) {
    if (!this.model) return;
    const d = Math.hypot(cameraPosition.x - this.place.x, cameraPosition.z - this.place.z);
    this.model.group.visible = d <= drawDistance + this.pc.radius;
  }

  dispose() {
    this.model?.dispose();
  }
}
