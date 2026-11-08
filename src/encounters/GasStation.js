// The roadside gas station (M9.3; DESIGN.md "Roadside gas station";
// Session 15b, agreed with Aaron: pass 1 the set, pass 2 the beats). The
// guaranteed second outing: Ellen sent Tom to check on the Pruitts at
// first light (and to find a phone or a radio).
//  1. The forecourt pack: a handful of citizens hanging about the pumps
//     and cars (they're there before Tom arrives: risen as he nears).
//  2. Arrival: the establishing sweep from the road, across the pumps to
//     the HOME OF BIGFOOT sign; Wyatt: no lights, their truck's gone.
//     Sets gasStationVisited.
//  3. The first mutant: crouched and still at the back of the centre aisle
//     (dormant). A few steps into the dark shop, a first-person moment
//     takes the camera: the torch finds it, it unfolds to its full height
//     (wake), then it charges. Its own reduced health (config). Ellen after
//     it's down: that wasn't like the others.
//  4. Looting: hold-X searches (the counter: Session 17, Aaron, Earl's bulk
//     ammunition, 20 shells and 20 rifle rounds; shelves, coolers, the
//     office's cabinet, the stockroom's boxes and rack); the phone on the
//     counter (dead); Earl's note on the office desk (read in close-up,
//     Session 16; the office has only that now); in the stockroom, Earl's
//     scanner (a clipped military broadcast about a quarantine line, and
//     Ellen) and the gun safe (locked until Tom has Earl's combination:
//     the storm shelter's, Session 16; then the hunting rifle, empty).
//  5. The witch: once the mutant's down, stepping back out onto the
//     forecourt, a first-person moment: she stands at the clearing's edge
//     across the road, looking at the store, then turns and runs into the
//     trees. Ellen: that was her; Junie (once the note's been read): the
//     Pruitts went to the shelter, where the camera was.
//  6. The forecourt's cars: one has a sure battery.
// Each beat happens once; it's saved. The frame (GasStation.frame): from
// the clearing's centre, z toward the road, x to the right as you face it.
//
// Events: 'gasStation:arrived', 'gasStation:mutant' (it wakes),
// 'gasStation:mutantDown', 'gasStation:note', 'gasStation:scanner',
// 'gasStation:witch', 'gasStation:searched' { id }.

import gasData from '../data/gasStation.json';
import { frameToWorld, frameYaw, frameAnchor } from '../world/clearingFrame.js';
import { nearestRoadIndex } from '../world/road.js';
import { segmentCollider } from '../world/collision.js';
import { rollLoot } from '../combat/loot.js';
import { HoldAction } from '../player/HoldAction.js';
import { GasStationProps } from '../render/GasStationProps.js';
import { Rng } from '../core/Rng.js';
import { DEBUG } from '../debug/DebugMenu.js';

export class GasStation {
  constructor(cfg, bus, data = gasData) {
    this.cfg = cfg;
    this.gc = cfg.gasStation;
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

  // ctx: { world, player, combat, colliders, vehicles, cutscenes, dialogue,
  // progress, notify(text) }.
  init(scene, ctx) {
    Object.assign(this, ctx);
    this.ground = ctx.world.ground;
    this.frame = GasStation.frame(ctx.world.map);
    if (!this.frame) return;
    this.enemies = ctx.combat?.enemies;
    this.floorY = this.levelFloor();
    this.props = new GasStationProps(this.gc.look, this.data, this.cfg.props?.weather);
    this.props.init(scene, this.frame, this.ground, this.floorY);
    if (ctx.colliders) this.buildColliders(ctx.colliders);
    const at = (s) => ({ ...s, ...frameToWorld(this.frame, s.x, s.z) });
    this.points = this.data.searches.map(at);
    this.spots = this.data.interactions.map(at);
    this.lootRng = new Rng(`${this.cfg.map.cluster.seed}:gas-loot`);
    this.hold = new HoldAction(this.cfg.station.hold.releaseDrain);
    this.hold.init();
    this.hud = { prompt: '', progress: 0 }; // read by Combat's HUD
    this.cutscenes?.namedAnchors?.set('gasStation', () => frameAnchor(this.frame));
    this.reset();
    this.sureBattery();
    this.unsubscribers = [
      this.bus.on('player:hurt', () => this.hold.interrupt()),
      this.bus.on('enemy:killed', ({ zombie }) => this.onKilled(zombie)),
      this.bus.on('gasStation:wake', () => this.wakeMutant()),
      this.bus.on('quad:mounted', () => (this.quadTold = true)),
      // Session 18 (Aaron): the pumps go up when they're shot (or caught in a blast).
      this.bus.on('weapon:impact', (at) => this.pumpShot(at)),
      this.bus.on('explosion', (e) => this.pumpBlast(e)),
      // Session 15b (Aaron): the shovel picked up on the way out to the shelter: it's a weapon too.
      this.bus.on('station:shovel', () => {
        if (this.progress?.has('shelterCall') && !this.weaponTold) {
          this.weaponTold = true;
          this.dialogue?.play('shovel.weapon');
        }
      }),
    ];
  }

  reset() {
    this.searched = new Set();
    this.done = new Set(); // interactions done: phone, note, scanner, safe
    this.packSent = false;
    this.pack = [];
    this.arrived = false;
    this.mutant = null; // the authored mutant while it's up
    this.mutantState = 'waiting'; // waiting -> dormant -> awake -> down
    this.wasInside = false;
    this.witchSeen = false;
    this.witchIn = -1; // seconds until the witch's moment (after the mutant's down, outside)
    this.junieDue = false; // Junie's line about the note, once both the witch and the note have happened
    this.safeOpen = false;
    this.backDoor = 0; // 0 shut .. 1 open
    this.quadTold = false; // the family have said to take Earl's quad
    this.shelterTalk = false; // Session 15b: due: the family's word about the shelter and the shovel, as Tom leaves
    this.weaponTold = false; // ...and Wyatt's, that the shovel's a weapon too
    this.props?.setNoteTaken(false);
    // Session 18 (Aaron): each pump island: its damage, its fuse (-1: none lit), blown.
    this.pumps = (this.data.pumps ?? []).map(() => ({ hurt: 0, fuse: -1, blown: false }));
    this.pumps.forEach((_, i) => this.props?.setPumpBlown(i, false));
  }

  // The store sits level on its highest corner (like the station's cabin).
  levelFloor() {
    const b = this.data.building;
    let top = -Infinity;
    for (const [x, z] of [[b.x0, b.z0], [b.x1, b.z0], [b.x0, b.z1], [b.x1, b.z1], [b.door.x, b.z1 + 1]]) {
      const w = frameToWorld(this.frame, x, z);
      top = Math.max(top, this.ground.heightAt(w.x, w.z));
    }
    return top + this.gc.floorLift;
  }

  // One car on the forecourt (the first spot's) has a sure battery and no alarm.
  sureBattery() {
    if (!this.vehicles?.list || !this.data.cars.length) return;
    const s = frameToWorld(this.frame, this.data.cars[0].x, this.data.cars[0].z);
    let best = null;
    let bestD = 4;
    for (const v of this.vehicles.list) {
      const d = Math.hypot(v.x - s.x, v.z - s.z);
      if (d < bestD) {
        best = v;
        bestD = d;
      }
    }
    if (!best) return;
    best.battery = true;
    best.hasBattery = true;
    best.alarm = false;
    this.sureCar = best;
  }

  // ---- what's solid ------------------------------------------------------------------------------

  // A wall or a long thing in the frame, from (ax, az) to (bx, bz).
  line(grid, ax, az, bx, bz, t, base, top, blocksShots) {
    const a = frameToWorld(this.frame, ax, az);
    const b = frameToWorld(this.frame, bx, bz);
    const col = segmentCollider(a.x, a.z, b.x, b.z, t, base, top, blocksShots);
    col.glare = true; // Session 15b (Aaron): the torch dims up close on everything here (shelves glared)
    grid.insert(col);
    return col;
  }

  // A box (w across x, d along z) at (x, z), turned yaw degrees.
  block(grid, x, z, w, d, base, top, blocksShots, yaw = 0) {
    const a = (yaw * Math.PI) / 180;
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
    // The back wall, with the stockroom's back door (Session 15b: it opens for Tom).
    const bd = b.backDoor;
    this.line(grid, b.x0, b.z0, bd.x - bd.width / 2, b.z0, t, low, top, true);
    this.line(grid, bd.x + bd.width / 2, b.z0, b.x1, b.z0, t, low, top, true);
    this.backDoorCol = this.line(grid, bd.x - bd.width / 2, b.z0, bd.x + bd.width / 2, b.z0, t, low, top, true);
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
    if (o.shelf) this.block(grid, o.shelf.x, o.shelf.z, 1.1, 0.36, low, fy + 1.85, true); // Session 19: the office's dressing
    if (o.coatStand) this.block(grid, o.coatStand.x, o.coatStand.z, 0.4, 0.4, low, fy + 1.8, false);
    const sf = this.data.stockroom.safe; // Session 17 (Aaron): the safe's in the stockroom now
    this.block(grid, sf.x, sf.z, 0.95, 0.8, low, fy + 1.5, true);
    for (const bx of this.data.stockroom.boxes) if (!bx.on) this.block(grid, bx.x, bx.z, bx.w, bx.d, low, fy + bx.h, false);
    for (const r of this.data.stockroom.racks) this.block(grid, r.x, r.z, r.length, 0.6, low, fy + 2, false, r.yaw);

    // Outside: the pump islands, the canopy's posts, the sign's pole, the dumpster.
    const look = this.gc.look;
    for (const p of this.data.pumps) {
      const w = frameToWorld(this.frame, p.x, p.z);
      const y = this.ground.heightAt(w.x, w.z);
      this.block(grid, p.x, p.z, look.island.length, look.island.depth, y - 1, y + 1.8, true); // Session 18: shots stop on the pumps (they go up)
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
    // Session 19 (style pass 2): the dressing round the store.
    const dr = this.data.dressing ?? {};
    const solid = (a, w, d, h, stops) => {
      if (!a) return;
      const aw = frameToWorld(this.frame, a.x, a.z);
      const ay = this.ground.heightAt(aw.x, aw.z);
      this.block(grid, a.x, a.z, w, d, ay - 1, ay + h, stops, a.yaw ?? 0);
    };
    solid(dr.iceChest, 1.2, 0.7, 1.05, true);
    solid(dr.oilRack, 0.7, 0.35, 1.1, false);
    solid(dr.propane, 0.85, 1.35, 1.5, true);
    solid(dr.airPump, 0.35, 0.35, 1.25, false);
    solid(dr.tyres, 0.8, 0.8, 0.12 + (dr.tyres?.count ?? 0) * 0.23, true);
  }

  // ---- where Tom is ----------------------------------------------------------------------------------

  // Tom's position in the frame: { x, z }.
  local() {
    const p = this.player.position;
    const f = this.frame;
    const dx = p.x - f.x;
    const dz = p.z - f.z;
    return { x: dx * f.rx + dz * f.rz, z: dx * f.fx + dz * f.fz };
  }

  inside(l = this.local()) {
    const b = this.data.building;
    return l.x > b.x0 && l.x < b.x1 && l.z > b.z0 && l.z < b.z1;
  }

  // ---- each frame -----------------------------------------------------------------------------------

  // playing: the world runs. canInteract: the controls are Tom's (no ledger, no other prompt first).
  update(dt, input, playing, canInteract) {
    this.props?.update(dt);
    if (!this.frame) return;
    if (!playing) {
      this.hud.prompt = '';
      return;
    }
    this.updatePumps(dt);
    const l = this.local();
    const d = Math.hypot(l.x, l.z);
    const near = d < this.frame.radius + this.gc.packDistance;
    if (!this.packSent && near) this.sendPack();
    if (this.mutantState === 'waiting' && near) this.placeMutant();
    if (!this.arrived && d <= this.frame.radius - this.gc.arriveInset) this.arrive();
    if (this.mutantState === 'dormant') this.updateDormant(l);
    if (this.mutantState === 'awake') this.updateAwake();
    this.updateWitch(dt, l);
    this.updateBackDoor(dt, l);
    this.updateShelterTalk(l);
    if (canInteract && input) this.updateInteraction(dt, input);
    else {
      this.hud.prompt = '';
      this.hud.progress = 0;
      this.hold.update(dt, null, false, 1);
    }
  }

  // ---- the pumps (Session 18, Aaron: shoot them and they go up) -------------------------------------

  // Island i's pump units in the world: two, either side of its middle.
  pumpUnits(i) {
    const p = this.data.pumps[i];
    return [-0.95, 0.95].map((side) => frameToWorld(this.frame, p.x + side, p.z));
  }

  pumpShot({ x, z, damage = 0 } = {}) {
    if (!this.frame || !this.pumps || damage <= 0) return;
    const pc = this.gc.pumps;
    this.pumps.forEach((pump, i) => {
      if (pump.blown || pump.fuse >= 0) return;
      if (!this.pumpUnits(i).some((u) => Math.hypot(u.x - x, u.z - z) < pc.hitRadius)) return;
      pump.hurt += damage;
      if (pump.hurt >= pc.health) this.lightPump(i, pc.fuse);
    });
  }

  // A blast that reaches an island sets it off a beat later (not one of its own).
  pumpBlast({ x, z, radius = 0, source } = {}) {
    if (!this.frame || !this.pumps) return;
    this.pumps.forEach((pump, i) => {
      if (pump.blown || pump.fuse >= 0 || source === `pumps${i}`) return;
      const c = frameToWorld(this.frame, this.data.pumps[i].x, this.data.pumps[i].z);
      if (Math.hypot(c.x - x, c.z - z) < radius + this.gc.look.island.length / 2) this.lightPump(i, this.gc.pumps.chainFuse);
    });
  }

  lightPump(i, fuse) {
    const pump = this.pumps[i];
    pump.fuse = fuse;
    const c = this.pumpCentre(i);
    this.combat?.sfx?.play('gasHiss', c);
    this.bus.emit('gasStation:pumpLit', { index: i });
  }

  pumpCentre(i) {
    const p = this.data.pumps[i];
    const w = frameToWorld(this.frame, p.x, p.z);
    return { x: w.x, y: this.ground.heightAt(w.x, w.z), z: w.z };
  }

  updatePumps(dt) {
    for (let i = 0; i < (this.pumps?.length ?? 0); i++) {
      const pump = this.pumps[i];
      if (pump.blown || pump.fuse < 0) continue;
      pump.fuse -= dt;
      if (pump.fuse < 0) this.blowPump(i);
    }
  }

  blowPump(i) {
    const pump = this.pumps[i];
    pump.blown = true;
    pump.fuse = -1;
    this.props?.setPumpBlown(i, true);
    const c = this.pumpCentre(i);
    if (this.explosives?.blast) this.explosives.blast(c.x, c.y, c.z, { ...this.cfg.explosives, ...this.gc.pumps.blast }, `pumps${i}`);
    else this.combat?.sfx?.play('explosion', c);
    this.bus.emit('gasStation:pumpBlown', { index: i });
  }

  // ---- the forecourt pack and the arrival ----------------------------------------------------------

  // A handful of citizens hanging about the forecourt, there before Tom
  // gets close enough to see (no rising out of the ground).
  sendPack() {
    this.packSent = true;
    if (!this.enemies) return;
    const n = this.gc.pack.count;
    const spots = this.data.pack.slice(0, n);
    const centre = frameToWorld(this.frame, 0, this.gc.pack.centreZ);
    for (const s of spots) {
      const w = frameToWorld(this.frame, s.x, s.z);
      const out = [];
      this.enemies.spawnPlanned({ type: 'single', count: 1 }, w.x, w.z, { ringMin: 0, ringMax: 1, mix: this.world.variantMixAt(w.x, w.z), mode: 'linger', linger: { x: centre.x, z: centre.z, r: this.gc.pack.lingerRadius }, rise: false, out });
      this.pack.push(...out);
    }
  }

  arrive() {
    this.arrived = true;
    this.progress?.setFlag('gasStationVisited');
    this.bus.emit('gasStation:arrived');
    if (!this.packSent) this.sendPack();
    if (!this.cutscenes?.active) this.cutscenes?.play('sweep.gasStation', { anchors: { gasStation: frameAnchor(this.frame) } });
    else this.dialogue?.play('gas.arrive');
  }

  // ---- the first mutant ----------------------------------------------------------------------------

  placeMutant() {
    if (this.mutantState !== 'waiting' || !this.enemies) return;
    const m = this.data.mutant;
    const w = frameToWorld(this.frame, m.x, m.z);
    // Held (it pays Tom no mind) until it wakes; then it comes for him.
    const z = this.enemies.spawnZombie(w.x, w.z, { kind: 'mutant', mode: 'held', linger: { x: w.x, z: w.z, r: 0 }, facing: frameYaw(this.frame, m.yaw) });
    if (!z) return;
    // Its own tuned health (DESIGN.md: beatable close up with the shotgun).
    z.maxHealth = this.gc.mutant.health;
    z.health = z.maxHealth;
    z.state = 'dormant';
    z.timer = 0;
    z.authored = 'gasStation';
    this.mutant = z;
    this.mutantState = 'dormant';
  }

  // A few steps into the shop (and it's in front of him): the moment.
  updateDormant(l) {
    const z = this.mutant;
    if (!z || !z.alive) {
      // Gone without being put down (a pool slot reused): placed again next time Tom's near.
      this.mutant = null;
      this.mutantState = 'waiting';
      return;
    }
    // Shot in its sleep: it's already waking (Zombie.hit).
    if (z.state !== 'dormant') {
      this.mutantState = 'awake';
      this.bus.emit('gasStation:mutant');
      return;
    }
    // Session 15b (Aaron): it's down the west aisle; the moment comes as Tom reaches the aisle's
    // mouth in the centre aisle (it's in plain view down it then), or gets close any other way.
    const w = this.data.wake;
    const m = this.data.mutant;
    const inAisle = this.inside(l) && l.z < w.z && l.z > this.data.building.partitionZ && l.x > w.x0 && l.x < w.x1;
    // (Inside only: it woke through the wall from the forecourt; Aaron.)
    const near = this.inside(l) && l.z > this.data.building.partitionZ && Math.hypot(l.x - m.x, l.z - m.z) < w.near;
    if (!(inAisle || near) || this.cutscenes?.active) return;
    const anchor = { x: z.x, z: z.z, yaw: 0, dy: this.gc.mutant.lookHeight };
    if (!this.cutscenes?.play('gas.mutant', { anchors: { mutant: anchor } })) this.wakeMutant();
  }

  wakeMutant() {
    const z = this.mutant;
    if (!z || this.mutantState !== 'dormant') return;
    z.wake(this.cfg.mutant.look.wakeSeconds);
    this.combat?.sfx?.play('mutantGroan', z);
    this.mutantState = 'awake';
    this.bus.emit('gasStation:mutant');
  }

  // Once it's up on its feet it comes for Tom (its charge, as any mutant noticing him).
  updateAwake() {
    const z = this.mutant;
    if (!z || !z.alive) {
      this.mutantDown();
      return;
    }
    if (z.state !== 'wake' && z.mode !== 'chase') {
      const p = this.player.position;
      this.enemies.brain.chase(z, p.x, p.z, this.gc.mutant.memory);
    }
  }

  onKilled(zombie) {
    const i = this.pack.indexOf(zombie);
    if (i >= 0) this.pack.splice(i, 1);
    if (zombie === this.mutant) this.mutantDown();
  }

  mutantDown() {
    if (this.mutantState === 'down') return;
    this.mutantState = 'down';
    this.mutant = null;
    this.progress?.setFlag('gasMutantKilled');
    this.bus.emit('gasStation:mutantDown');
    this.dialogue?.play('gas.mutant.after');
  }

  // ---- the back door -------------------------------------------------------------------------------------

  // Session 15b (Aaron): the stockroom's back door swings open as Tom comes
  // to it (either side), out onto Earl's quad, and shuts behind him.
  updateBackDoor(dt, l) {
    const b = this.data.building;
    const bd = b.backDoor;
    const near = Math.hypot(l.x - bd.x, l.z - b.z0) < this.gc.backDoor.openDistance;
    const before = this.backDoor;
    this.backDoor = Math.max(0, Math.min(1, this.backDoor + ((near ? 1 : -1) * dt) / this.gc.backDoor.swingSeconds));
    if ((before === 0 && this.backDoor > 0) || (before === 1 && this.backDoor < 1)) this.combat?.sfx?.play('door', this.player.position);
    if (this.backDoorCol) this.backDoorCol.off = this.backDoor > 0.4;
    this.props?.setBackDoor(this.backDoor);
  }

  // ---- the witch ------------------------------------------------------------------------------------------

  // Once the mutant's down: the first time Tom's back out on the forecourt
  // after being in the store, a moment later, she's there.
  updateWitch(dt, l) {
    const inside = this.inside(l);
    if (inside) this.wasInside = true;
    if (this.witchSeen || this.mutantState !== 'down') return;
    const b = this.data.building;
    const onForecourt = !inside && l.z > b.z1 && l.z < this.data.forecourt.z1 + 4 && Math.abs(l.x) < this.frame.radius;
    if (this.witchIn < 0) {
      if (this.wasInside && onForecourt) this.witchIn = this.gc.witch.delay;
      return;
    }
    this.witchIn -= dt;
    if (this.witchIn > 0 || this.cutscenes?.active) return;
    this.showWitch();
  }

  showWitch() {
    this.witchSeen = true;
    this.witchIn = -1;
    this.progress?.setFlag('gasWitchSeen');
    this.bus.emit('gasStation:witch');
    const w = this.data.witch;
    const store = frameToWorld(this.frame, 0, this.data.building.z1 - 4);
    const at = (x, z) => {
      const p = frameToWorld(this.frame, x, z);
      return { ...p, yaw: Math.atan2(store.x - p.x, store.z - p.z), dy: this.gc.witch.lookHeight }; // she faces the store
    };
    const done = () => {
      this.dialogue?.play('gas.witch.ellen');
      if (this.done.has('note')) this.dialogue?.play('gas.witch.junie');
      else this.junieDue = true;
      // Session 17 (Aaron: one idea at a time): the phone a while later, if it's not been tried.
      this.dialogue?.playLater?.('gas.phone.hint', this.gc.lineGap, () => !this.done.has('phone'));
      this.checkShelterCall();
    };
    const played = this.cutscenes?.play('gas.witch', {
      anchors: { gasStation: frameAnchor(this.frame), herSpot: at(w.x, w.z), herRun: at(w.runTo.x, w.runTo.z) },
      onDone: done,
    });
    if (!played) done();
  }

  // ---- searches and the things to use ---------------------------------------------------------------

  updateInteraction(dt, input) {
    this.device = input.activeDevice;
    const X = input.activeDevice === 'gamepad' ? 'X' : 'E';
    const best = this.pickPoint();
    const key = best ? best.id : null;
    const done = this.hold.update(dt, key, input.isDown('interact'), best?.seconds ?? 1);
    if (done && best) (best.interaction ? this.use(best) : this.search(best));
    const busy = best?.interaction ? '…' : 'Searching…';
    this.hud.prompt = best ? (this.hold.active ? busy : `Hold ${X}: ${best.label}`) : '';
    this.hud.progress = this.hold.key !== null ? this.hold.progress : 0;
  }

  // The nearest thing in reach to search or use, or null.
  pickPoint() {
    const p = this.player.position;
    // Only inside the store (the walls are thin: don't reach through them).
    if (!this.inside()) return null;
    const reach = this.gc.interactRange;
    let best = null;
    let bestD = reach;
    for (const pt of this.points) {
      if (this.searched.has(pt.id)) continue;
      const d = Math.hypot(pt.x - p.x, pt.z - p.z);
      if (d < bestD) {
        best = pt;
        bestD = d;
      }
    }
    for (const s of this.spots) {
      if (this.done.has(s.id) && s.id !== 'safe') continue; // Session 18 (Aaron): the note's taken (read it again from the ledger)
      if (s.id === 'safe' && this.safeOpen) continue;
      const d = Math.hypot(s.x - p.x, s.z - p.z);
      if (d < bestD) {
        best = { ...s, interaction: true, label: this.labelFor(s) };
        bestD = d;
      }
    }
    return best;
  }

  labelFor(s) {
    if (s.id === 'safe' && this.progress?.has('earlCombination')) return "open the safe (Earl's combination)";
    if (s.id === 'scanner' && this.done.has('scannerTried')) return (this.combat?.inventory?.batteries ?? 0) > 0 ? "wire a battery into Earl's scanner" : "try Earl's scanner (it needs a battery)";
    return s.label;
  }

  search(pt) {
    this.searched.add(pt.id);
    let any = false;
    for (const g of pt.gives ?? []) any = this.give(g.item, g.amount ?? 1, pt) || any;
    for (const { item, amount } of rollLoot(pt.loot ?? [], this.lootRng)) any = this.give(item, amount, pt) || any;
    if (!any) {
      this.combat?.hud.pickup('Nothing useful');
      this.combat?.sfx.play('denied');
    }
    this.bus.emit('gasStation:searched', { id: pt.id });
  }

  give(item, amount, pt) {
    if (this.combat.takePickup(item, amount)) return true;
    this.combat.pickups.drop(item, amount, pt.x, this.floorY, pt.z, 0);
    return true;
  }

  use(s) {
    const first = !this.done.has(s.id);
    this.done.add(s.id);
    switch (s.id) {
      case 'phone':
        this.combat?.sfx.play('denied');
        this.notify?.('Dead. Not even a dial tone.');
        if (first) {
          this.dialogue?.play('gas.phone');
          // Session 16 (Aaron): then Earl's radio in the office (unless it's already been tried).
          if (!this.done.has('scanner')) this.dialogue?.play('gas.phone.radio');
        }
        break;
      case 'note':
        this.readNote(first);
        break;
      case 'scanner':
        this.useScanner();
        break;
      case 'safe':
        this.trySafe();
        break;
      default:
        break;
    }
  }

  // Session 18 (Aaron: the gas station's beats were crowded): Earl ran his scanner off a car battery,
  // and it's flat. Without one in Tom's pack: dead, and Wyatt says where to get one (the forecourt's
  // cars). With one: wired in, and the reward's a longer stretch of the military's chatter.
  useScanner() {
    if (!this.combat?.inventory?.useBattery?.()) {
      this.done.delete('scanner');
      this.combat?.sfx.play('denied');
      this.notify?.("Earl's scanner: dead. He ran it off a car battery.");
      if (!this.done.has('scannerTried')) {
        this.done.add('scannerTried');
        this.dialogue?.play('gas.scanner.dead');
      }
      return;
    }
    this.done.add('scanner');
    this.combat?.sfx.play('battery');
    this.combat?.sfx.play('radioStatic');
    this.combat?.hud?.pickup?.('A battery wired into the scanner');
    for (const id of this.gc.scannerLines) this.dialogue?.play(id);
    this.dialogue?.playLater?.('gas.scanner.wyatt', this.gc.lineGap);
    this.progress?.setFlag('scannerHeard');
    this.bus.emit('gasStation:scanner');
  }

  // Earl's note: Session 16 (Aaron), read in close-up (ui/PaperNote.js);
  // the family speak once it's put down. (Without a screen for it, its
  // words go in the subtitle strip as before.)
  readNote(first) {
    const after = () => this.noteRead(first);
    // Session 18 (Aaron): A takes it, and it's gone from the desk.
    this.props?.setNoteTaken(true);
    if (this.paper?.open('earlNote', { onClose: after, device: this.device, take: true })) return;
    this.dialogue?.play('gas.note', {}, false); // read on the spot: no radio crackle
    after();
  }

  noteRead(first) {
    if (!first) return;
    this.lore?.give('earlNote'); // Session 17 (Aaron): taken: hand it in at the ledger to read it again any time
    this.progress?.setFlag('earlNoteRead');
    this.bus.emit('gasStation:note');
    if (this.junieDue) {
      this.junieDue = false;
      this.dialogue?.play('gas.witch.junie');
    }
    this.checkShelterCall();
  }

  // Session 15b (Aaron): with the witch seen and Earl's note read, the
  // family send Tom out to the Pruitts' shelter (its spur opens), and say
  // more as he leaves: the shovel by the cabin's door, and that it's a weapon.
  checkShelterCall() {
    if (!this.witchSeen || !this.done.has('note') || this.progress?.has('shelterCall')) return;
    this.progress?.setFlag('shelterCall');
    this.shelterTalk = true;
    // Session 15b (Aaron): it's a long way to the Pruitts' gate: take Earl's quad. Session 17: on its own, a little later.
    this.dialogue?.playLater?.('gas.quad', this.gc.lineGap, () => {
      if (this.quadTold) return false;
      this.quadTold = true;
      return true;
    });
  }

  updateShelterTalk(l) {
    if (!this.shelterTalk || this.cutscenes?.active) return;
    if (Math.hypot(l.x, l.z) < this.frame.radius + this.gc.shelterTalkDistance) return;
    this.shelterTalk = false;
    const shovel = this.combat?.weapons.has('shovel');
    this.dialogue?.play(shovel ? 'gas.shovel.have' : 'gas.shovel');
    if (shovel && !this.weaponTold) {
      this.weaponTold = true;
      this.dialogue?.play('shovel.weapon');
    }
  }

  // The gun safe: locked until Tom has Earl's combination (the storm
  // shelter, Session 16). Then the hunting rifle, empty (its rounds are at
  // the outpost; any already found load into it).
  trySafe() {
    if (!this.progress?.has('earlCombination')) {
      this.combat?.sfx.play('denied');
      this.notify?.("Locked. A heavy combination dial. A shovel or a shotgun won't touch it.");
      return;
    }
    this.safeOpen = true;
    this.combat?.sfx.play('loaded');
    const id = this.gc.safe.weapon;
    this.combat.giveWeapon(id, 0);
    // Empty: no rounds came with it.
    const w = this.combat.weapons;
    const st = w.states[id];
    if (st) {
      const stored = w.ammoRounds(w.ammoType(id)) ?? 0;
      st.mag = 0;
      w.pools[w.ammoType(id)].rounds = Math.max(0, stored - (this.cfg.weapons[id].startReserve ?? 0));
    }
    this.combat?.hud.pickup(`${this.cfg.weapons[id].name} (no rounds)`);
    this.progress?.setFlag('rifleClaimed');
    this.dialogue?.play('gas.safe.open');
  }

  // ---- saving ------------------------------------------------------------------------------------------

  saveState() {
    return {
      searched: [...this.searched],
      done: [...this.done],
      arrived: this.arrived,
      pack: this.packSent,
      mutant: this.mutantState === 'down' ? 'down' : 'waiting',
      witch: this.witchSeen,
      junie: this.junieDue,
      safe: this.safeOpen,
      shelterTalk: this.shelterTalk,
      weaponTold: this.weaponTold,
      quadTold: this.quadTold,
      pumps: this.pumps?.map((p) => (p.blown ? 1 : 0)), // Session 18
    };
  }

  // A save with the mutant still up brings it back crouched where it was
  // (it's placed again as Tom comes near); the forecourt pack isn't saved.
  loadState(d) {
    if (!d) return;
    this.searched = new Set(d.searched ?? []);
    this.done = new Set(d.done ?? []);
    this.props?.setNoteTaken(this.done.has('note'));
    this.arrived = Boolean(d.arrived);
    this.packSent = false;
    this.pack = [];
    this.mutant = null;
    this.mutantState = d.mutant === 'down' ? 'down' : 'waiting';
    this.witchSeen = Boolean(d.witch);
    this.junieDue = Boolean(d.junie);
    this.safeOpen = Boolean(d.safe);
    this.shelterTalk = Boolean(d.shelterTalk);
    this.weaponTold = Boolean(d.weaponTold);
    this.quadTold = Boolean(d.quadTold);
    // Back to the forecourt with the pack gone (it was dealt with, or it will be again).
    if (d.pack) this.packSent = this.mutantState === 'down';
    // Session 18: blown pumps stay blown (a lit fuse in the save goes up as it loads: counted blown).
    this.pumps = (this.data.pumps ?? []).map((_, i) => ({ hurt: 0, fuse: -1, blown: Boolean(d.pumps?.[i]) }));
    this.pumps.forEach((p, i) => this.props?.setPumpBlown(i, p.blown));
  }

  // ---- debug -----------------------------------------------------------------------------------------

  addDebugItems(menu) {
    if (!this.frame) return;
    const cat = menu.category(DEBUG.firstDay);
    const f = this.frame;
    const b = this.data.building;
    const tp = (x, z, facing, text) => () => {
      const w = frameToWorld(f, x, z);
      this.player.teleport(w.x, w.z, facing);
      this.notify(text);
    };
    cat.addItem('Gas station: teleport to the forecourt (facing the store)', tp(b.door.x, 8, Math.atan2(f.fx, f.fz), 'On the gas station forecourt'));
    cat.addItem('Gas station: set the pumps off (the nearest island)', () => {
      const p = this.player.position;
      let best = -1;
      let bestD = Infinity;
      this.pumps.forEach((pump, i) => {
        const c = this.pumpCentre(i);
        const d = Math.hypot(c.x - p.x, c.z - p.z);
        if (!pump.blown && pump.fuse < 0 && d < bestD) {
          best = i;
          bestD = d;
        }
      });
      if (best >= 0) this.lightPump(best, this.gc.pumps.fuse);
      this.notify(best >= 0 ? 'A pump island is lit' : 'No pumps left to blow');
    });
    cat.addItem('Gas station: teleport inside the door', tp(b.door.x, b.z1 - 0.8, Math.atan2(f.fx, f.fz), 'Inside the gas station door'));
    cat.addItem('Gas station: teleport to the office', tp(b.officeDoor.x, b.partitionZ - 1, Math.atan2(f.fx, f.fz), "In Earl's office"));
    cat.addItem('Gas station: teleport to the trail in from the campsite', tp(0, -f.radius - 4, Math.atan2(-f.fx, -f.fz), 'Behind the gas station, on the trail in'));
    cat.addItem('Gas station: wake the mutant now', () => {
      if (this.mutantState === 'waiting') this.placeMutant();
      this.wakeMutant();
    });
    cat.addItem('Gas station: the witch now', () => {
      this.mutantState = 'down';
      this.witchSeen = false;
      this.showWitch();
    });
    cat.addItem(() => `Gas station: give Earl's combination (${this.progress?.has('earlCombination') ? 'have it' : 'not yet'})`, () => this.progress?.setFlag('earlCombination'));
    cat.addItem('Gas station: reset it (as Tom first finds it)', () => {
      for (const z of this.pack) if (z.alive) this.enemies.damage(z, 1e6, 'body', {}, z, z);
      if (this.mutant?.alive) this.enemies.damage(this.mutant, 1e6, 'body', {}, this.mutant, this.mutant);
      this.reset();
      this.notify('The gas station is as Tom first finds it (the cars as they are)');
    });
  }

  overlayLine() {
    if (!this.frame) return '';
    return `gas ${this.arrived ? 'visited' : 'unvisited'} pack ${this.pack.filter((z) => z.alive).length} mutant ${this.mutantState} searched ${this.searched.size}/${this.points.length} ${[...this.done].join(',')}${this.witchSeen ? ' witch-seen' : ''}`;
  }

  dispose() {
    for (const off of this.unsubscribers ?? []) off();
    this.props?.dispose();
  }
}
