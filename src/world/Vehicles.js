// Abandoned vehicles (M5 part 2, DESIGN.md "Vehicles and batteries"):
// cars, pickup trucks, police cars and army trucks along the pathways and
// in clearings (vehiclePlacement.js). Each is looted once per run, at
// its hold-X spots:
//  - either front door (Aaron: from the driver's or the passenger's
//    side): search the cabin (loot), once;
//  - the boot (a pickup's bed, an army truck's back): search it (loot);
//  - the bonnet: hold to lift it, then hold again to unbolt and pull the
//    battery (Aaron: about 60% still have one). Pulling one is noisy.
// Some with a battery have an alarm (every police car: Aaron): opening a
// door or the boot, or putting a bullet in it, sets it off. It wails,
// flashes its lamps and draws every zombie in earshot until the battery
// is pulled (Aaron: "pulling the battery would kill the alarm") or it
// runs flat. Searched doors and boots are left open a crack.
// Vehicles block bodies and shots. Once you've been close, a vehicle
// shows on the minimap and the map screen (dimmed once there's nothing
// left in it). "Try again" restocks them all.
//
// Events: 'vehicle:searched' { vehicle, spot }, 'vehicle:battery' { vehicle },
// 'vehicle:alarm' { vehicle }.

import { placeVehicles, spotsOf } from './vehiclePlacement.js';
import { segmentCollider } from './collision.js';
import { rollLoot } from '../combat/loot.js';
import { HoldAction } from '../player/HoldAction.js';
import { VehicleRenderer } from '../render/VehicleRenderer.js';
import vehicleData from '../data/vehicles.json';
import { DEBUG } from '../debug/DebugMenu.js';

const SPOTS = ['door', 'door2', 'boot', 'bonnet']; // door2: the passenger door
// What each spot searches: either door searches the cabin.
const LOOT_OF = { door: 'door', door2: 'door', boot: 'boot' };

export class Vehicles {
  constructor(cfg, rng, bus) {
    this.cfg = cfg;
    this.vc = cfg.vehicles;
    this.rng = rng;
    this.bus = bus;
    this.data = vehicleData;
  }

  // ctx: { world, combat, player, colliders, mapUi, notify(text), avoid: [{ x, z, r }],
  // busy: [{ prompt }] (other prompt sources that come first: digging, the station) }.
  init(scene, ctx) {
    const vc = this.vc;
    this.world = ctx.world;
    this.ground = ctx.world.ground;
    this.combat = ctx.combat;
    this.enemies = ctx.combat.enemies;
    this.player = ctx.player;
    this.notify = ctx.notify;
    this.busy = ctx.busy ?? [];
    const off = this.cfg.landmarks.offset;
    const signs = this.world.map.clearings.map((c) => ({ x: c.x + off, z: c.z - off }));
    // The road's poles and sign (M9.1) are kept clear the same way.
    if (this.world.roadProps) signs.push(...this.world.roadProps.poles, this.world.roadProps.sign);
    const placed = placeVehicles(this.world.map, this.ground, this.data, vc, this.rng.fork('placement'), ctx.avoid ?? [], signs);
    this.list = placed.map((p) => ({ ...p, def: this.data.types[p.type], spots: spotsOf(p, this.data.types[p.type], vc.spotOut) }));
    this.time = 0;
    this.restock();
    this.buildColliders(ctx.colliders);
    this.renderer = new VehicleRenderer(vc, this.data, this.rng.fork('looks'));
    this.renderer.init(scene, this.list, this.ground);
    this.hold = new HoldAction(this.cfg.station.hold.releaseDrain);
    this.hold.init();
    this.hud = { prompt: '', progress: 0 }; // read by Combat's HUD each frame
    this.heldKey = null;
    this.showAll = false;
    ctx.mapUi?.setVehicles(this.list, vc.map);
    this.unsubscribers = [
      this.bus.on('player:hurt', () => this.hold.interrupt()),
      this.bus.on('player:respawned', () => this.reset()),
      this.bus.on('weapon:impact', (at) => this.onImpact(at)),
    ];
  }

  // Every vehicle as found: shut, unsearched, its battery (if any) in place.
  restock() {
    for (const v of this.list) {
      v.searched = { door: false, boot: false };
      v.opened = { door: false, door2: false, boot: false }; // swung open (from the start of a search)
      v.bonnetUp = false;
      v.hasBattery = v.battery;
      v.flat = false; // the alarm ran the battery flat
      v.alarmArmed = v.alarm;
      v.ringing = false;
      v.ringTime = 0;
      v.open = { door: 0, door2: 0, boot: 0, bonnet: 0 };
      v.seen = v.seen ?? false;
      v.lootRng = this.rng.fork(`loot-${v.id}`);
    }
  }

  // "Try again": a fresh run on the same map restocks every vehicle.
  reset() {
    this.restock();
    for (const v of this.list) {
      this.renderer.refresh(v);
      this.renderer.setLamps(v, false);
    }
    this.hold.init();
  }

  // Each body: thick segments along its length, solid to bodies and shots.
  buildColliders(grid) {
    const piece = this.vc.colliderPiece;
    for (const v of this.list) {
      const [length, width, height] = v.def.size;
      const core = Math.max(0.01, length - width);
      const n = Math.max(1, Math.ceil(core / piece));
      const s = Math.sin(v.yaw);
      const c = Math.cos(v.yaw);
      const y = this.ground.heightAt(v.x, v.z);
      for (let i = 0; i < n; i++) {
        const a = -core / 2 + (core * i) / n;
        const b = -core / 2 + (core * (i + 1)) / n;
        const col = segmentCollider(v.x + s * a, v.z + c * a, v.x + s * b, v.z + c * b, width / 2, y - 0.5, y + height, true);
        grid.insert(col);
      }
    }
  }

  // ---- each frame ----------------------------------------------------------------

  // playing: false while a menu or the map is open.
  update(dt, input, playing) {
    const p = this.player.position;
    if (playing) {
      this.time += dt;
      for (const v of this.list) {
        if (!v.seen && Math.hypot(v.x - p.x, v.z - p.z) < this.vc.seenDistance) v.seen = true;
        this.animateLids(v, dt);
        if (v.ringing) this.updateAlarm(v, dt);
      }
    }
    const blocked = this.busy.some((b) => b.prompt);
    const canInteract = playing && this.combat.alive && !blocked && !this.player.platform;
    if (canInteract) this.updateInteraction(dt, input);
    else {
      this.hud.prompt = '';
      this.hud.progress = 0;
      this.hold.update(dt, null, false, 1);
      this.heldKey = null;
    }
  }

  // Doors, boots and bonnets swing to where they should be.
  animateLids(v, dt) {
    const want = { door: v.opened.door, door2: v.opened.door2, boot: v.opened.boot, bonnet: v.bonnetUp };
    let moved = false;
    for (const name of SPOTS) {
      const target = want[name] ? 1 : 0;
      if (v.open[name] === target) continue;
      const step = dt / this.vc.lidSeconds;
      v.open[name] = target > v.open[name] ? Math.min(target, v.open[name] + step) : Math.max(target, v.open[name] - step);
      moved = true;
    }
    if (moved) this.renderer.refresh(v);
  }

  // A ringing alarm: wails, flashes and keeps calling zombies in.
  updateAlarm(v, dt) {
    const a = this.vc.alarm;
    const before = v.ringTime;
    v.ringTime += dt;
    const crossed = (every) => Math.floor(v.ringTime / every) !== Math.floor(before / every);
    if (before === 0 || crossed(a.beepEvery)) this.combat.sfx.play(Math.floor(v.ringTime / a.beepEvery) % 2 ? 'carAlarmLow' : 'carAlarm', v);
    if (before === 0 || crossed(a.alertEvery)) this.enemies.alert(v.x, v.z, a.noise);
    this.renderer.setLamps(v, Math.floor(v.ringTime / a.flashEvery) % 2 === 0);
    if (v.ringTime >= a.seconds) {
      // It runs the battery flat.
      v.ringing = false;
      v.hasBattery = false;
      v.flat = true;
      this.renderer.setLamps(v, false);
      this.renderer.refresh(v);
    }
  }

  // ---- interactions -----------------------------------------------------------------

  updateInteraction(dt, input) {
    const X = input.activeDevice === 'gamepad' ? 'X' : 'E';
    const best = this.pickInteraction(X);
    const key = best?.act ? best.key : null;
    const holding = input.isDown('interact');
    const done = this.hold.update(dt, key, holding, best?.seconds ?? 1);
    // The moment a hold starts: the door or boot opens (and an alarm may go off).
    if (this.hold.active && key !== this.heldKey) {
      this.heldKey = key;
      best.start?.();
    }
    if (!this.hold.active && !done) this.heldKey = null;
    if (done && best?.act) {
      this.heldKey = null;
      best.act();
    }
    this.hud.prompt = best ? (this.hold.active && best.busy ? best.busy : best.prompt) : '';
    this.hud.progress = this.hold.key !== null ? this.hold.progress : 0;
  }

  // The nearest spot to use: { key, prompt, busy, seconds, act, start } or null.
  pickInteraction(X) {
    const p = this.player.position;
    const vc = this.vc;
    const range = vc.interactRange;
    let best = null;
    let bestD = range;
    for (const v of this.list) {
      if (Math.hypot(v.x - p.x, v.z - p.z) > v.def.size[0] / 2 + range + 1) continue;
      for (const spot of SPOTS) {
        const at = v.spots[spot];
        const d = Math.hypot(at.x - p.x, at.z - p.z);
        if (d >= bestD) continue;
        const offer = this.offerFor(v, spot, X);
        if (!offer) continue;
        best = offer;
        bestD = d;
      }
    }
    return best;
  }

  offerFor(v, spot, X) {
    const h = this.vc.hold;
    const words = v.def.spots;
    const loot = LOOT_OF[spot];
    if (loot) {
      if (v.searched[loot]) return null;
      return {
        key: `${v.id}-${spot}`,
        prompt: `Hold ${X}: ${words[loot]}`,
        busy: 'Searching…',
        seconds: h.search,
        start: () => this.openUp(v, spot),
        act: () => this.search(v, spot),
      };
    }
    if (!v.bonnetUp) {
      return { key: `${v.id}-bonnet`, prompt: `Hold ${X}: ${words.bonnet}`, busy: 'Lifting the bonnet…', seconds: h.bonnet, act: () => this.liftBonnet(v) };
    }
    if (v.hasBattery) {
      return {
        key: `${v.id}-battery`,
        prompt: `Hold ${X}: pull the battery`,
        busy: 'Unbolting the battery…',
        seconds: h.battery,
        start: () => this.combat.sfx.play('ratchet', v),
        act: () => this.pullBattery(v),
      };
    }
    return { key: `${v.id}-empty`, prompt: v.flat ? "The battery's flat: the alarm drained it" : 'No battery in this one', act: null };
  }

  // Opening a door or the boot: a clunk, and an armed alarm goes off.
  openUp(v, spot) {
    if (!v.opened[spot]) this.combat.sfx.play(spot === 'boot' ? 'carBoot' : 'carDoor', v);
    v.opened[spot] = true;
    this.tripAlarm(v);
  }

  // A shot that stops on a vehicle sets its alarm off.
  onImpact({ x, y, z }) {
    const v = this.vehicleAt(x, y, z, 0.25);
    if (v) this.tripAlarm(v);
  }

  // The vehicle whose body holds (x, y, z), give or take `pad` metres, or null.
  vehicleAt(x, y, z, pad) {
    for (const v of this.list) {
      const [length, width, height] = v.def.size;
      const dx = x - v.x;
      const dz = z - v.z;
      if (dx * dx + dz * dz > (length / 2 + pad) ** 2) continue;
      const s = Math.sin(v.yaw);
      const c = Math.cos(v.yaw);
      const lz = s * dx + c * dz;
      const lx = c * dx - s * dz;
      const base = v.groundY ?? this.ground.heightAt(v.x, v.z);
      if (Math.abs(lx) <= width / 2 + pad && Math.abs(lz) <= length / 2 + pad && y >= base - pad && y <= base + height + pad) return v;
    }
    return null;
  }

  // An armed alarm goes off (once): a toast, then it wails until the battery's pulled.
  tripAlarm(v) {
    if (!v.alarmArmed || !v.hasBattery) return;
    v.alarmArmed = false;
    v.ringing = true;
    v.ringTime = 0;
    this.notify(`A car alarm! Pull the ${v.def.name}'s battery to shut it up`);
    this.bus.emit('vehicle:alarm', { vehicle: v });
  }

  search(v, spot) {
    const loot = LOOT_OF[spot];
    v.searched[loot] = true;
    const found = rollLoot(v.def.loot[loot], v.lootRng);
    const at = v.spots[spot];
    let any = false;
    for (const { item, amount } of found) {
      any = true;
      // Whatever the player can't take (a full bag of kits, full armour) is left by the vehicle.
      if (!this.combat.takePickup(item, amount)) this.combat.pickups.drop(item, amount, at.x, this.ground.heightAt(at.x, at.z), at.z, v.yaw);
    }
    if (!any) {
      this.combat.hud.pickup('Nothing useful');
      this.combat.sfx.play('denied');
    }
    this.bus.emit('vehicle:searched', { vehicle: v, spot: loot });
  }

  liftBonnet(v) {
    v.bonnetUp = true;
    this.combat.sfx.play('bonnet', v);
  }

  pullBattery(v) {
    v.hasBattery = false;
    this.combat.inventory.addBattery(1);
    this.combat.hud.pickup(`+1 battery (${this.combat.inventory.batteries} carried)`);
    this.combat.sfx.play('batteryOut', v);
    this.enemies.alert(v.x, v.z, this.vc.batteryNoise);
    if (v.ringing) {
      v.ringing = false;
      this.renderer.setLamps(v, false);
      this.notify('The alarm dies');
    }
    this.renderer.refresh(v);
    this.bus.emit('vehicle:battery', { vehicle: v });
  }

  // Nothing left to take: searched, bonnet up, no battery.
  static isDone(v) {
    return v.searched.door && v.searched.boot && v.bonnetUp && !v.hasBattery;
  }

  // ---- debug and overlay ---------------------------------------------------------

  addDebugItems(menu) {
    const teleport = menu.category(DEBUG.teleport);
    const station = menu.category(DEBUG.station);
    teleport.addItem('Teleport: nearest unsearched vehicle', () => this.teleportToNearest());
    teleport.addItem('Teleport: nearest vehicle alarm', () => this.teleportToNearest((v) => v.alarmArmed && v.hasBattery));
    station.addItem(
      () => `Vehicles: show all on the map (${this.showAll ? 'on' : 'off'})`,
      () => {
        this.showAll = !this.showAll;
        for (const v of this.list) v.seenByDebug = this.showAll;
      },
    );
    station.addItem('Vehicles: restock them all', () => this.reset());
  }

  // which(v): the vehicles to choose from (default: any not yet emptied).
  teleportToNearest(which = (v) => !Vehicles.isDone(v)) {
    const p = this.player.position;
    let best = null;
    let bestD = Infinity;
    for (const v of this.list) {
      if (!which(v)) continue;
      const d = Math.hypot(v.x - p.x, v.z - p.z);
      if (d < bestD && d > 3) {
        bestD = d;
        best = v;
      }
    }
    if (!best) return this.notify('No vehicle like that left');
    // Stand by the driver's door, facing the car (the camera looks along -z at yaw 0).
    const at = best.spots.door;
    const yaw = Math.atan2(-(best.x - at.x), -(best.z - at.z));
    this.player.teleport(at.x, at.z, yaw);
    this.notify(`Teleported to a ${best.def.name} (${best.hasBattery ? 'battery' : 'no battery'}${best.alarm ? ', alarm' : ''})`);
  }

  overlayLine() {
    const n = this.list.length;
    const done = this.list.filter((v) => Vehicles.isDone(v)).length;
    const batteries = this.list.filter((v) => v.hasBattery).length;
    const ringing = this.list.filter((v) => v.ringing).length;
    const seen = this.list.filter((v) => v.seen).length;
    return `${n} (seen ${seen}, emptied ${done}, batteries left ${batteries}${ringing ? `, ALARM x${ringing}` : ''})`;
  }

  dispose() {
    for (const off of this.unsubscribers ?? []) off();
    this.renderer.dispose();
  }
}
