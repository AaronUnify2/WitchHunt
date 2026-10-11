// The abandoned vehicles (placeholder boxes; M5 part 2). Every box of
// every vehicle is one instance of a single unit cube, so the whole
// fleet is one draw call (plus one for the lamps, which are unlit so an
// alarm's flashing shows at night). Shapes and colours come from
// data/vehicles.json; each vehicle sits on the ground, tilted to its
// slope (and a flat tyre now and then).
//
// The moving parts (driver's door, boot, bonnet) swing on their hinges
// as their open amount goes 0..1; the battery shows under a lifted
// bonnet until it's pulled. Vehicles.js owns the state and calls
// refresh(v) when a vehicle's look changes.

import * as THREE from 'three';

const UP_SINK = 0.04; // metres the body sits into the ground

export class VehicleRenderer {
  constructor(cfg, data, rng) {
    this.cfg = cfg;
    this.data = data;
    this.rng = rng;
  }

  // vehicles: Vehicles.js's list (placement plus state).
  init(scene, vehicles, ground) {
    const data = this.data;
    this.colours = Object.fromEntries(Object.entries(data.colours).map(([k, v]) => [k, new THREE.Color(v)]));
    let solids = 0;
    let lamps = 0;
    for (const v of vehicles) {
      const t = data.types[v.type];
      solids += t.parts.length + 3 + 2 + 1; // parts, lids, battery (body and top), engine bay
      lamps += t.lamps.length;
    }
    this.box = new THREE.BoxGeometry(1, 1, 1);
    this.solidMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
    this.lampMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.solid = new THREE.InstancedMesh(this.box, this.solidMaterial, Math.max(1, solids));
    this.lamp = new THREE.InstancedMesh(this.box, this.lampMaterial, Math.max(1, lamps));
    this.solid.castShadow = true;
    this.solid.receiveShadow = true;

    this.base = new THREE.Matrix4();
    this.local = new THREE.Matrix4();
    this.tmp = new THREE.Matrix4();
    this.out = new THREE.Matrix4();
    this.colour = new THREE.Color();
    this.hidden = new THREE.Matrix4().makeScale(0, 0, 0);

    let si = 0;
    let li = 0;
    for (const v of vehicles) {
      const t = data.types[v.type];
      const [length, width] = t.size;
      // Paint: one of the type's, a little dirtier or darker each.
      const dirt = this.cfg.looks.paintBrightness * (1 - this.rng.range(0, this.cfg.looks.dirtiness));
      const paint = new THREE.Color(this.rng.pick(t.paints)).multiplyScalar(dirt);
      const paint2 = t.paints2 ? new THREE.Color(this.rng.pick(t.paints2)).multiplyScalar(dirt) : paint;
      const flat = this.rng.chance(this.cfg.looks.flatTyreChance) ? this.cfg.looks.flatTyreTilt * (this.rng.chance(0.5) ? 1 : -1) : 0;
      // Sit on the slope: pitch from the ground under its nose and tail, roll from its sides.
      const s = Math.sin(v.yaw);
      const c = Math.cos(v.yaw);
      const h = (lx, lz) => ground.heightAt(v.x + s * lz + c * lx, v.z + c * lz - s * lx);
      const front = h(0, length / 2);
      const back = h(0, -length / 2);
      const left = h(-width / 2, 0);
      const right = h(width / 2, 0);
      const y = Math.min((front + back) / 2, (left + right) / 2, ground.heightAt(v.x, v.z)) - UP_SINK;
      const pitch = Math.atan2(back - front, length);
      const roll = Math.atan2(right - left, width) + flat;
      const base = new THREE.Matrix4().compose(
        new THREE.Vector3(v.x, y, v.z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, v.yaw, roll, 'YXZ')),
        new THREE.Vector3(1, 1, 1),
      );
      const look = { base, paint, paint2, solidAt: si, lampAt: li };
      v.look = look;
      v.groundY = y;

      for (const part of t.parts) {
        this.setBox(this.solid, si, base, part);
        this.solid.setColorAt(si, this.resolve(part[6], look));
        si++;
      }
      // The engine bay under the bonnet (hidden by it while it's shut).
      const b = t.lids.bonnet.box;
      look.bay = si;
      this.setBox(this.solid, si++, base, [b[0] - 0.12, 0.02, b[2] - 0.12, b[3], b[4] - b[1] / 2 - 0.005, b[5]]);
      this.solid.setColorAt(look.bay, this.colours.bay);
      look.lids = {};
      for (const name of ['bonnet', 'boot', 'door']) {
        look.lids[name] = si;
        this.solid.setColorAt(si, this.resolve(t.lids[name].colour, look));
        si++;
      }
      look.battery = si;
      this.solid.setColorAt(si++, this.colours.battery);
      this.solid.setColorAt(si++, this.colours.batteryTop);
      look.lampKeys = [];
      for (const lamp of t.lamps) {
        this.setBox(this.lamp, li, base, lamp);
        this.lamp.setColorAt(li, this.colours[lamp[6]]);
        look.lampKeys.push(lamp[6]);
        li++;
      }
      look.lampsOn = false;
      this.refresh(v);
    }
    this.solid.instanceMatrix.needsUpdate = true;
    this.solid.instanceColor.needsUpdate = true;
    this.lamp.instanceMatrix.needsUpdate = true;
    if (this.lamp.instanceColor) this.lamp.instanceColor.needsUpdate = true;
    this.solid.computeBoundingSphere();
    this.lamp.computeBoundingSphere();
    this.group = new THREE.Group();
    this.group.add(this.solid, this.lamp);
    scene.add(this.group);
  }

  resolve(key, look) {
    if (key === 'body') return look.paint;
    if (key === 'body2') return look.paint2;
    return this.colours[key] ?? this.colours.trim;
  }

  // A box [w, h, l, x, y, z] in the vehicle's frame, placed by `base`.
  setBox(mesh, index, base, [w, h, l, x, y, z]) {
    this.local.makeTranslation(x, y, z).multiply(this.tmp.makeScale(w, h, l));
    mesh.setMatrixAt(index, this.out.multiplyMatrices(base, this.local));
  }

  // Redraw a vehicle's moving parts: lids at their open amounts, the
  // battery while the bonnet's up and it's still there.
  refresh(v) {
    const t = this.data.types[v.type];
    const look = v.look;
    for (const name of ['bonnet', 'boot', 'door']) {
      const lid = t.lids[name];
      this.lidMatrix(look.base, lid, v.open[name], this.out);
      this.solid.setMatrixAt(look.lids[name], this.out);
    }
    const showBattery = v.open.bonnet > 0.6 && v.hasBattery;
    if (showBattery) {
      const [bx, by, bz] = t.batteryAt;
      this.setBox(this.solid, look.battery, look.base, [0.26, 0.2, 0.34, bx, by + 0.1, bz]);
      this.setBox(this.solid, look.battery + 1, look.base, [0.2, 0.03, 0.28, bx, by + 0.215, bz]);
    } else {
      this.solid.setMatrixAt(look.battery, this.hidden);
      this.solid.setMatrixAt(look.battery + 1, this.hidden);
    }
    this.solid.instanceMatrix.needsUpdate = true;
  }

  // A lid's matrix: turned about its hinge edge by angle x amount.
  lidMatrix(base, lid, amount, out) {
    const [w, h, l, x, y, z] = lid.box;
    const a = lid.angle * amount;
    let hx = 0;
    let hy = y;
    let hz = z;
    const rot = this.tmp;
    switch (lid.hinge) {
      case 'back': // a bonnet: hinged at its back edge, the front lifts
        hy = y + h / 2;
        hz = z - l / 2;
        rot.makeRotationX(-a);
        break;
      case 'front': // a boot lid: hinged at its front edge, the back lifts
        hy = y + h / 2;
        hz = z + l / 2;
        rot.makeRotationX(a);
        break;
      case 'bottom': // a tailgate drops outward
        hy = y - h / 2;
        rot.makeRotationX(-a);
        break;
      case 'top': // a canvas flap swings out and up
        hy = y + h / 2;
        rot.makeRotationX(a);
        break;
      case 'frontSide': // the driver's door: hinged at its front edge, swings out to the left
        hx = x;
        hz = z + l / 2;
        rot.makeRotationY(a);
        break;
      default:
        rot.identity();
    }
    out.copy(base).multiply(this.local.makeTranslation(hx, hy, hz)).multiply(rot);
    out.multiply(this.local.makeTranslation(x - hx, y - hy, z - hz)).multiply(this.local.makeScale(w, h, l));
    return out;
  }

  // An alarm flashes its lamps.
  setLamps(v, on) {
    const look = v.look;
    if (look.lampsOn === on) return;
    look.lampsOn = on;
    look.lampKeys.forEach((key, k) => this.lamp.setColorAt(look.lampAt + k, this.colours[on ? `${key}On` : key] ?? this.colours[key]));
    this.lamp.instanceColor.needsUpdate = true;
  }

  dispose() {
    this.group?.removeFromParent();
    this.box?.dispose();
    this.solidMaterial?.dispose();
    this.lampMaterial?.dispose();
    this.solid?.dispose();
    this.lamp?.dispose();
  }
}
