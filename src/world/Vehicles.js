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
// Session 14 (Aaron): cars blow up. Every round that stops on one, a
// flare, a blast: it all adds up. Badly hurt it smokes; past fireAt it's
// on fire and burns down the rest by itself; at `health` it explodes (a
// blast like a charge's: config.vehicles.damage.blast), leaving a burnt-out
// wreck with nothing left in it. A blast sets the cars round it off in
// turn, a beat apart.
// Vehicles block bodies and shots. Once you've been close, a vehicle
// shows on the minimap and the map screen (dimmed once there's nothing
// left in it). "Try again" restocks them all.
//
// Events: 'vehicle:searched' { vehicle, spot }, 'vehicle:battery' { vehicle },
// 'vehicle:alarm' { vehicle }, 'vehicle:burning' { vehicle }, 'vehicle:exploded' { vehicle }.

import { placeVehicles, spotsOf } from './vehiclePlacement.js';
import { segmentCollider } from './collision.js';
import { rollLoot } from '../combat/loot.js';
import { HoldAction } from '../player/HoldAction.js';
import { VehicleRenderer } from '../render/VehicleRenderer.js';
import { VehicleFire } from '../render/VehicleFire.js';
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
  // fixed: { clearing key: [{ x, z, yaw }] } (authored car spots, M9.2),
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
    // And the gates (M9.1), along their whole span.
    for (const g of this.world.gates ?? []) {
      for (let d = -g.half; d <= g.half; d += 2) signs.push({ x: g.x + g.tz * d, z: g.z - g.tx * d });
    }
    const placed = placeVehicles(this.world.map, this.ground, this.data, vc, this.rng.fork('placement'), ctx.avoid ?? [], signs, ctx.fixed ?? {});
    this.list = placed.map((p) => ({ ...p, def: this.data.types[p.type], spots: spotsOf(p, this.data.types[p.type], vc.spotOut) }));
    this.time = 0;
    this.restock();
    this.buildColliders(ctx.colliders);
    this.renderer = new VehicleRenderer(vc, this.data, this.rng.fork('looks'));
    this.renderer.init(scene, this.list, this.ground);
    this.fire = new VehicleFire(vc.damage.fx, this.rng.fork('fire'));
    this.fire.init(scene);
    this.burning = []; // reused: where smoke and flames come out this frame
    this.explosives = ctx.explosives ?? null; // set by Game once it has them (the blast)
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
      this.bus.on('explosion', (e) => this.onExplosion(e)),
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
      // Session 14: what it's taken. A wreck stays a wreck (even on "try again").
      v.hurt = v.wrecked ? this.vc.damage.health : 0;
      v.wrecked = v.wrecked ?? false;
      v.fuse = -1;
      v.wreckBurn = v.wreckBurn ?? 0;
      if (v.wrecked) this.emptyOut(v);
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
      this.burning.length = 0;
      for (const v of this.list) {
        if (!v.seen && Math.hypot(v.x - p.x, v.z - p.z) < this.vc.seenDistance) v.seen = true;
        this.animateLids(v, dt);
        if (v.ringing) this.updateAlarm(v, dt);
        this.updateDamage(v, dt);
      }
      this.fire.update(dt, this.burning);
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
    if (v.wrecked) return spot === 'door' ? { key: `${v.id}-wreck`, prompt: 'Burnt out: nothing left', act: null } : null;
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

  // A shot that stops on a vehicle sets its alarm off, and hurts it (Session 14).
  onImpact({ x, y, z, damage = 0 }) {
    const v = this.vehicleAt(x, y, z, 0.25);
    if (!v) return;
    this.tripAlarm(v);
    this.damage(v, damage);
  }

  // ---- damage and explosions (Session 14, Aaron) -----------------------------------

  damage(v, amount) {
    const d = this.vc.damage;
    if (v.wrecked || amount <= 0) return;
    const was = v.hurt;
    v.hurt = Math.min(d.health, v.hurt + amount);
    if (was < d.health * d.fireAt && v.hurt >= d.health * d.fireAt) this.bus.emit('vehicle:burning', { vehicle: v });
    if (v.hurt >= d.health) this.explode(v);
  }

  // A blast nearby (a charge, another car): cars in it take damage. One
  // pushed past its health goes up a beat later, not this instant.
  onExplosion({ x, z, radius, source }) {
    const d = this.vc.damage;
    for (const v of this.list) {
      if (v === source || v.wrecked || v.fuse >= 0) continue;
      const dist = Math.hypot(v.x - x, v.z - z);
      const reach = radius + v.def.size[0] / 2;
      if (dist > reach) continue;
      const k = Math.max(0, 1 - dist / reach) * (1 - d.blast.edge) + d.blast.edge;
      v.hurt = Math.min(d.health, v.hurt + d.vehicleDamage * k);
      if (v.hurt >= d.health) v.fuse = this.rng.range(d.chainFuse[0], d.chainFuse[1]);
    }
  }

  // Each frame: a fuse burning down, a fire eating it, and its smoke and flames.
  updateDamage(v, dt) {
    const d = this.vc.damage;
    if (v.fuse >= 0) {
      v.fuse -= dt;
      if (v.fuse < 0) this.explode(v);
    }
    if (v.wrecked) {
      if (v.wreckBurn > 0) {
        v.wreckBurn = Math.max(0, v.wreckBurn - dt);
        this.burning.push({ ...this.engineAt(v, 0.6), smoke: 1, fire: Math.min(1, v.wreckBurn / 8) * 0.8 });
      }
      return;
    }
    const share = v.hurt / d.health;
    if (share >= d.fireAt) {
      v.hurt = Math.min(d.health, v.hurt + d.burnPerSecond * dt);
      if (v.hurt >= d.health) {
        this.explode(v);
        return;
      }
    }
    if (share >= d.smokeAt) {
      const fire = share >= d.fireAt ? 1 : 0;
      this.burning.push({ ...this.engineAt(v, 0.9), smoke: Math.min(1, (share - d.smokeAt) / (d.fireAt - d.smokeAt) + 0.3), fire });
    }
  }

  // Over the engine, `up` of the way up its height: where smoke and fire come out.
  engineAt(v, up) {
    const [length, , height] = v.def.size;
    const fwd = length * 0.32;
    const y = v.groundY ?? this.ground.heightAt(v.x, v.z);
    return { x: v.x + Math.sin(v.yaw) * fwd, y: y + height * up, z: v.z + Math.cos(v.yaw) * fwd };
  }

  // It goes up: a blast, and a burnt-out wreck with nothing left in it.
  explode(v) {
    const d = this.vc.damage;
    if (v.wrecked) return;
    v.wrecked = true;
    v.fuse = -1;
    v.hurt = d.health;
    v.wreckBurn = d.wreckBurnSeconds;
    this.emptyOut(v);
    this.renderer.setLamps(v, false);
    this.renderer.setBurnt(v, d.burnt);
    this.renderer.refresh(v);
    const y = v.groundY ?? this.ground.heightAt(v.x, v.z);
    this.explosives?.blast(v.x, y, v.z, d.blast, v);
    this.bus.emit('vehicle:exploded', { vehicle: v });
  }

  // A wreck has nothing left: no loot, no battery, no alarm.
  emptyOut(v) {
    v.searched.door = true;
    v.searched.boot = true;
    v.hasBattery = false;
    v.alarmArmed = false;
    v.ringing = false;
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
    // Session 14: blow cars up.
    station.addItem('Vehicles: set the nearest on fire (it goes up in a few seconds)', () => this.nearestDo((v) => this.damage(v, this.vc.damage.health * this.vc.damage.fireAt - v.hurt + 1)));
    station.addItem('Vehicles: blow up the nearest now', () => this.nearestDo((v) => this.explode(v)));
  }

  // Debug: do something to the nearest car still in one piece.
  nearestDo(fn) {
    const p = this.player.position;
    let best = null;
    for (const v of this.list) if (!v.wrecked && (!best || Math.hypot(v.x - p.x, v.z - p.z) < Math.hypot(best.x - p.x, best.z - p.z))) best = v;
    if (!best) return this.notify('No car left in one piece');
    fn(best);
    this.notify(`${best.def.name}: ${best.wrecked ? 'blown up' : 'on fire'}`);
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
    const wrecked = this.list.filter((v) => v.wrecked).length;
    const hurt = this.list.filter((v) => !v.wrecked && v.hurt > 0).length;
    const seen = this.list.filter((v) => v.seen).length;
    return `${n} (seen ${seen}, emptied ${done}, batteries left ${batteries}${ringing ? `, ALARM x${ringing}` : ''}${hurt ? `, damaged ${hurt}` : ''}${wrecked ? `, wrecks ${wrecked}` : ''})`;
  }

  dispose() {
    for (const off of this.unsubscribers ?? []) off();
    this.renderer.dispose();
    this.fire.dispose();
  }
}
