// The witch's hut (M7 step 4; DESIGN.md "Destroying the hut"). A crooked
// shack in the middle of the hut clearing, its door facing the pathway
// that leads in. She leaves and comes home by the door. Only two charges,
// planted on it and set off together, can destroy it (combat/Explosives.js):
// then it's a burning wreck and the final battle begins (step 5).
//
// Events: 'hut:destroyed'.

import { HutRenderer } from '../render/HutRenderer.js';

// Where the hut stands and which way its door faces (pure): in the
// middle of the clearing, the door toward the first pathway out.
// Returns { x, z, facing, door: { x, z } }.
export function hutPlacement(map, hc) {
  const c = map.clearings[map.hutIndex];
  const path = map.paths.find((p) => p.a === map.hutIndex || p.b === map.hutIndex);
  let facing = 0;
  if (path) {
    const pts = path.points;
    const out = path.a === map.hutIndex ? pts[Math.min(3, pts.length - 1)] : pts[Math.max(0, pts.length - 4)];
    facing = Math.atan2(out.x - c.x, out.z - c.z);
  }
  const reach = hc.depth / 2 + hc.doorStep;
  return { x: c.x, z: c.z, facing, door: { x: c.x + Math.sin(facing) * reach, z: c.z + Math.cos(facing) * reach } };
}

export class Hut {
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.hc = cfg.hut;
    this.bus = bus;
  }

  init(scene, world, colliders) {
    const p = hutPlacement(world.map, this.hc);
    Object.assign(this, p);
    this.y = world.ground.heightAt(this.x, this.z);
    this.destroyed = false;
    // One circle round the walls blocks movement and shots.
    this.collider = { x: this.x, z: this.z, r: this.hc.colliderRadius, top: this.y + this.hc.height + 1.5 };
    colliders.insert(this.collider);
    this.renderer = new HutRenderer(this.hc);
    this.renderer.init(scene, this);
  }

  // The nearest point on the hut's walls to (x, z), a little outside them
  // (where a charge is set). Returns { x, z }.
  wallPoint(x, z) {
    const dx = x - this.x;
    const dz = z - this.z;
    const d = Math.hypot(dx, dz) || 1;
    const r = this.hc.colliderRadius + 0.15;
    return { x: this.x + (dx / d) * r, z: this.z + (dz / d) * r };
  }

  // Metres from (x, z) to the hut's walls (0 inside).
  distanceTo(x, z) {
    return Math.max(0, Math.hypot(x - this.x, z - this.z) - this.hc.colliderRadius);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.collider.r = this.hc.wreckRadius; // the wreck is lower and smaller
    this.renderer.wreck();
    this.bus.emit('hut:destroyed', { hut: this });
  }

  update(dt, cameraPosition, drawDistance) {
    this.renderer.update(dt, cameraPosition, drawDistance);
  }

  dispose() {
    this.renderer.dispose();
  }
}
