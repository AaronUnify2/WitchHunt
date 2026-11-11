// Milo's barn in the world (DESIGN.md "Milo's barn"; the set:
// render/miloBarnModel.js). In the milosBarn clearing the seed deals, its
// lane coming in along the pathway that reaches it. Solid: the barn's
// walls (the doorway's open), the stalls, the stage's edge, the yard's
// fence, the van, the bales; and the two cars across the lane, the fence's
// gate, which swing open about their back ends (setGate) and take their
// colliders with them.
//
// Only the set: Milo, his animals, the dead and the act are the beat's
// (encounters/MiloBarn.js), which finds its places in `spots` (world space).

import { buildMiloBarn, buildGateCar } from '../render/miloBarnModel.js';
import { weatherFor } from '../render/propKit.js';
import { pathFrame, frameToWorld } from './clearingFrame.js';

// A point of the model (model x is the frame's left) in the world.
export function modelToWorld(f, mx, mz) {
  return frameToWorld(f, -mx, mz);
}

// A car's yaw in the model (radians about y; +z its nose) for gate side s
// (+1 the left car, -1 the right), open 0..1: closed, the noses meet in the
// lane; open, each has swung about its back end to point up the lane.
export function carYaw(s, open, openAngle) {
  return s * (-Math.PI / 2 + open * openAngle);
}

export class MiloBarnSite {
  constructor(cfg) {
    this.cfg = cfg;
    this.bc = cfg.milosBarn;
    this.frame = null;
    this.spots = {};
    this.open = 0;
  }

  init(scene, world, colliders) {
    this.frame = pathFrame(world.map, 'milosBarn');
    if (!this.frame) return;
    const f = this.frame;
    const ground = world.ground;
    this.ground = ground;
    this.y = ground.heightAt(f.x, f.z);
    const heightAt = (mx, mz) => {
      const w = modelToWorld(f, mx, mz);
      return ground.heightAt(w.x, w.z) - this.y;
    };
    const weather = weatherFor(this.cfg.props.weather, this.bc.look.weather);
    this.model = buildMiloBarn(this.bc, { weather, heightAt });
    const yaw = Math.atan2(f.fx, f.fz);
    this.yaw = yaw;
    this.model.group.position.set(f.x, this.y, f.z);
    this.model.group.rotation.y = yaw;
    scene.add(this.model.group);
    for (const [name, s] of Object.entries(this.model.spots)) {
      const w = modelToWorld(f, s.x, s.z);
      this.spots[name] = { x: w.x, y: this.y + s.y, z: w.z };
    }
    this.colliders = this.model.colliders.map((c) => {
      if (c.seg) {
        const a = modelToWorld(f, c.ax, c.az);
        const b = modelToWorld(f, c.bx, c.bz);
        const base = Math.min(ground.heightAt(a.x, a.z), ground.heightAt(b.x, b.z));
        return { seg: true, ax: a.x, az: a.z, bx: b.x, bz: b.z, t: c.t, x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, r: Math.hypot(b.x - a.x, b.z - a.z) / 2 + c.t, base: base - 1, top: base + 0.2 + c.top, blocksShots: c.blocksShots, off: false, what: 'milosBarn' };
      }
      const w = modelToWorld(f, c.x, c.z);
      return { x: w.x, z: w.z, r: c.r, top: ground.heightAt(w.x, w.z) + c.top, what: 'milosBarn' };
    });
    for (const c of this.colliders) colliders?.insert(c);
    // The two cars across the lane.
    const k = this.bc.look.colors;
    this.cars = [1, -1].map((s) => {
      const built = buildGateCar(this.bc, s > 0 ? k.carA : k.carB, weather);
      const hinge = { x: s * (this.bc.gate.carLength + this.bc.gate.gap), z: this.bc.gate.z };
      scene.add(built.mesh);
      // Keyed in the grid at its hinge, with a reach that covers its whole swing (the grid never moves an entry).
      const hw = modelToWorld(f, hinge.x, hinge.z);
      const col = { seg: true, ax: hw.x, az: hw.z, bx: hw.x, bz: hw.z, t: 0.95, x: hw.x, z: hw.z, r: this.bc.gate.carLength + 1, base: -1000, top: 1000, blocksShots: true, off: false, what: 'gateCar' };
      colliders?.insert(col);
      return { s, built, hinge, col };
    });
    this.setGate(0);
  }

  get ready() {
    return Boolean(this.frame && this.model);
  }

  // The cars' swing: 0 shut across the lane, 1 open.
  setGate(open) {
    if (!this.cars) return;
    this.open = open;
    const f = this.frame;
    const L = this.bc.gate.carLength;
    for (const car of this.cars) {
      const yawM = carYaw(car.s, open, this.bc.gate.openAngle);
      const back = modelToWorld(f, car.hinge.x, car.hinge.z);
      const noseM = { x: car.hinge.x + Math.sin(yawM) * L, z: car.hinge.z + Math.cos(yawM) * L };
      const nose = modelToWorld(f, noseM.x, noseM.z);
      const m = car.built.mesh;
      const y = Math.min(this.ground.heightAt(back.x, back.z), this.ground.heightAt(nose.x, nose.z));
      m.position.set(back.x, y, back.z);
      m.rotation.y = this.yaw + yawM;
      // Its collider: the length of the car, a car's half width round it.
      const c = car.col;
      const inset = 0.6;
      const ax = back.x + ((nose.x - back.x) * inset) / L;
      const az = back.z + ((nose.z - back.z) * inset) / L;
      const bx = nose.x - ((nose.x - back.x) * inset) / L;
      const bz = nose.z - ((nose.z - back.z) * inset) / L;
      Object.assign(c, { ax, az, bx, bz, base: y - 1, top: y + 1.5 });
    }
  }

  // Where a car's nose is (world), for Milo's hand on its bonnet.
  bonnet(s) {
    const car = this.cars?.find((c) => c.s === s);
    if (!car) return null;
    const yawM = carYaw(s, this.open, this.bc.gate.openAngle);
    const d = this.bc.gate.carLength - 0.8;
    return modelToWorld(this.frame, car.hinge.x + Math.sin(yawM) * d, car.hinge.z + Math.cos(yawM) * d);
  }

  // A point in the barn's frame (x right, z ahead) in the world.
  at(x, z) {
    return frameToWorld(this.frame, x, z);
  }

  update(cameraPosition, drawDistance) {
    if (!this.model) return;
    const d = Math.hypot(cameraPosition.x - this.frame.x, cameraPosition.z - this.frame.z);
    const shown = d <= drawDistance + 30;
    this.model.group.visible = shown;
    for (const c of this.cars) c.built.mesh.visible = shown;
  }

  dispose() {
    this.model?.dispose();
    for (const c of this.cars ?? []) c.built.dispose();
  }
}
