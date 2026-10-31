// The roadside gas station (M9.3; DESIGN.md "Roadside gas station").
// Session 15b, pass 1 (agreed with Aaron): the set. The store with its
// back office and stockroom, the forecourt, the pump islands under a
// sagging canopy, the HOME OF BIGFOOT sign by the road, and the cars on
// their authored spots. It's solid (walls, shelves, pumps and the rest
// block bodies; walls and the safe stop shots) and the same every run.
// The beats (the arrival sweep, the forecourt pack, the first mutant,
// Earl's note and safe, the scanner, the witch, the radio) are pass 2.
//
// The frame (encounters/GasStation.frame): from the clearing's centre,
// z toward the road (the nearest point of its centre line), x to the right
// as you face it. data/gasStation.json is laid out in it.

import gasData from '../data/gasStation.json';
import { frameToWorld, frameYaw } from '../world/clearingFrame.js';
import { nearestRoadIndex } from '../world/road.js';
import { segmentCollider } from '../world/collision.js';
import { GasStationProps } from '../render/GasStationProps.js';
import { DEBUG } from '../debug/DebugMenu.js';

export class GasStation {
  constructor(cfg, bus, data = gasData) {
    this.cfg = cfg;
    this.bus = bus;
    this.data = data;
  }

  // The gas station's frame: facing the road from the clearing's centre.
  static frame(map) {
    const c = map.clearings.find((x) => x.cluster && x.key === 'gasStation');
    if (!c) return null;
    let fx = 0;
    let fz = 1;
    if (map.road?.points?.length) {
      const p = map.road.points[nearestRoadIndex(map.road, c.x, c.z)];
      const d = Math.hypot(p.x - c.x, p.z - c.z);
      if (d > 0.5) {
        fx = (p.x - c.x) / d;
        fz = (p.z - c.z) / d;
      }
    }
    return { x: c.x, z: c.z, radius: c.radius, yaw: Math.atan2(fx, fz), fx, fz, rx: -fz, rz: fx, entrance: { x: c.x - fx * c.radius, z: c.z - fz * c.radius } };
  }

  // The forecourt's car spots in the world: [{ x, z, yaw }] (Game's vehicles).
  static carSpots(map, data = gasData) {
    const f = GasStation.frame(map);
    if (!f) return [];
    return data.cars.map((s) => {
      const w = frameToWorld(f, s.x, s.z);
      return { x: w.x, z: w.z, yaw: frameYaw(f, s.yaw) };
    });
  }

  // ctx: { world, player, colliders, notify(text) }.
  init(scene, ctx) {
    Object.assign(this, ctx);
    this.ground = ctx.world.ground;
    this.frame = GasStation.frame(ctx.world.map);
    if (!this.frame) return;
    this.floorY = this.levelFloor();
    this.props = new GasStationProps(this.cfg.gasStation.look, this.data);
    this.props.init(scene, this.frame, this.ground, this.floorY);
    this.buildColliders(ctx.colliders);
  }

  // The store sits level on its highest corner (like the station's cabin).
  levelFloor() {
    const b = this.data.building;
    let top = -Infinity;
    for (const [x, z] of [[b.x0, b.z0], [b.x1, b.z0], [b.x0, b.z1], [b.x1, b.z1], [b.door.x, b.z1 + 1]]) {
      const w = frameToWorld(this.frame, x, z);
      top = Math.max(top, this.ground.heightAt(w.x, w.z));
    }
    return top + this.cfg.gasStation.floorLift;
  }

  // ---- what's solid ------------------------------------------------------------------------------

  // A wall or a long thing in the frame, from (ax, az) to (bx, bz).
  line(grid, ax, az, bx, bz, t, base, top, blocksShots) {
    const a = frameToWorld(this.frame, ax, az);
    const b = frameToWorld(this.frame, bx, bz);
    grid.insert(segmentCollider(a.x, a.z, b.x, b.z, t, base, top, blocksShots));
  }

  // A box (w across x, d along z) at (x, z), turned yaw degrees.
  block(grid, x, z, w, d, base, top, blocksShots, yaw = 0) {
    const a = (yaw * Math.PI) / 180;
    // Its long axis, in the frame (x right, z ahead).
    const long = w >= d;
    const half = Math.max(w, d) / 2 - Math.min(w, d) / 2;
    const ux = long ? Math.cos(a) : Math.sin(a);
    const uz = long ? -Math.sin(a) : Math.cos(a);
    this.line(grid, x - ux * half, z - uz * half, x + ux * half, z + uz * half, Math.min(w, d) / 2, base, top, blocksShots);
  }

  buildColliders(grid) {
    const b = this.data.building;
    const t = b.wall / 2 + 0.05;
    const fy = this.floorY;
    const low = fy - 1.5;
    const top = fy + b.height;
    // The shell: back, sides, and the front either side of the door (the windows are glass: solid).
    this.line(grid, b.x0, b.z0, b.x1, b.z0, t, low, top, true);
    this.line(grid, b.x0, b.z0, b.x0, b.z1, t, low, top, true);
    this.line(grid, b.x1, b.z0, b.x1, b.z1, t, low, top, true);
    const d0 = b.door.x - b.door.width / 2;
    const d1 = b.door.x + b.door.width / 2;
    this.line(grid, b.x0, b.z1, d0, b.z1, t, low, top, true);
    this.line(grid, d1, b.z1, b.x1, b.z1, t, low, top, true);
    // The back rooms' partition, with its two doorways, and the wall between the rooms.
    const gaps = [b.officeDoor, b.stockDoor].map((g) => [g.x - g.width / 2, g.x + g.width / 2]).sort((p, q) => p[0] - q[0]);
    let x = b.x0;
    for (const [g0, g1] of gaps) {
      this.line(grid, x, b.partitionZ, g0, b.partitionZ, t, low, top, true);
      x = g1;
    }
    this.line(grid, x, b.partitionZ, b.x1, b.partitionZ, t, low, top, true);
    this.line(grid, b.splitX, b.z0, b.splitX, b.partitionZ, t, low, top, true);

    const s = this.data.store;
    const c = s.counter;
    this.block(grid, c.x, c.z, c.length, c.depth, low, fy + c.height, false, c.yaw);
    for (const sh of s.shelves) {
      if (sh.fallen) this.block(grid, sh.x, sh.z, sh.length, 1.4, low, fy + 0.6, false, sh.yaw - 90);
      else this.block(grid, sh.x, sh.z, sh.length, 0.6, low, fy + 1.7, false, sh.yaw - 90);
    }
    this.line(grid, s.coolers.x, s.coolers.z0, s.coolers.x, s.coolers.z1, 0.45, low, fy + 2, true);
    this.block(grid, s.statue.x, s.statue.z, 0.8, 0.8, low, fy + 2, false);

    const o = this.data.office;
    this.block(grid, o.desk.x, o.desk.z, 1.6, 0.8, low, fy + 0.8, false, o.desk.yaw);
    this.block(grid, o.cabinet.x, o.cabinet.z, 0.6, 0.6, low, fy + 1.3, true);
    this.block(grid, o.safe.x, o.safe.z, 0.95, 0.8, low, fy + 1.5, true);
    for (const bx of this.data.stockroom.boxes) if (!bx.on) this.block(grid, bx.x, bx.z, bx.w, bx.d, low, fy + bx.h, false);
    for (const r of this.data.stockroom.racks) this.block(grid, r.x, r.z, r.length, 0.6, low, fy + 2, false, r.yaw);

    // Outside: the pump islands, the canopy's posts, the sign's pole, the dumpster.
    const look = this.cfg.gasStation.look;
    for (const p of this.data.pumps) {
      const w = frameToWorld(this.frame, p.x, p.z);
      const y = this.ground.heightAt(w.x, w.z);
      this.block(grid, p.x, p.z, look.island.length, look.island.depth, y - 1, y + 1.8, false);
      for (const side of [-1, 1]) {
        const px = p.x + side * (look.island.length / 2 + 0.25);
        const pw = frameToWorld(this.frame, px, p.z);
        const py = this.ground.heightAt(pw.x, pw.z);
        this.block(grid, px, p.z, 0.3, 0.3, py - 1, py + this.data.canopy.height, false);
      }
    }
    const sg = this.data.sign;
    const sw = frameToWorld(this.frame, sg.x, sg.z);
    const sy = this.ground.heightAt(sw.x, sw.z);
    this.block(grid, sg.x, sg.z, 0.4, 0.4, sy - 1, sy + sg.height, false);
    const dp = this.data.dumpster;
    const dw = frameToWorld(this.frame, dp.x, dp.z);
    const dy = this.ground.heightAt(dw.x, dw.z);
    this.block(grid, dp.x, dp.z, 1.9, 1.2, dy - 1, dy + 1.3, true, dp.yaw);
  }

  // ---- each frame ----------------------------------------------------------------------------------

  update(dt) {
    this.props?.update(dt);
  }

  // ---- debug -----------------------------------------------------------------------------------------

  addDebugItems(menu) {
    if (!this.frame) return;
    const cat = menu.category(DEBUG.firstDay);
    const f = this.frame;
    cat.addItem('Gas station: teleport to the forecourt (facing the store)', () => {
      const w = frameToWorld(f, this.data.door?.x ?? this.data.building.door.x, 8);
      this.player.teleport(w.x, w.z, Math.atan2(f.fx, f.fz));
      this.notify('On the gas station forecourt');
    });
    cat.addItem('Gas station: teleport inside the store', () => {
      const b = this.data.building;
      const w = frameToWorld(f, b.door.x, b.z1 - 1.5);
      this.player.teleport(w.x, w.z, Math.atan2(f.fx, f.fz));
      this.notify('Inside the gas station');
    });
    cat.addItem('Gas station: teleport to the trail in from the campsite', () => {
      const w = frameToWorld(f, 0, -f.radius - 4);
      this.player.teleport(w.x, w.z, Math.atan2(-f.fx, -f.fz));
      this.notify('Behind the gas station, on the trail in');
    });
  }

  dispose() {
    this.props?.dispose();
  }
}
