// The abandoned campsite (M9.2; DESIGN.md "Abandoned campsite", agreed with
// Aaron in Session 15): the first stop of every run. Arrive calm, search,
// get hit with a turn, get rewarded, go home changed.
//  1. Arrival: walking into the clearing plays an establishing sweep and
//     Wyatt's line 5 (check the car and the tents). Sets campsiteVisited;
//     the smoke over the trees is gone.
//  2. The search: hold-X search points (data/campsite.json): the cooler
//     by the entrance, the tents, a backpack. Each teaches a pickup.
//  3. The camcorder (in the cooler, near the entrance): Ellen's line 6,
//     then the clip (clip.camcorder), then her line 7.
//  4. The shotgun (in the torn tent, deep in the camp): the instant it's
//     taken the wave bursts from the treeline (line 8): 7 level-1 citizens
//     from both flanks, a few seconds apart, coming straight for Tom.
//  5. Wave cleared: lines 9 and 10.
//  6. The battery: the campers' car (vehicles.json placement.campsite: a
//     sure battery and no alarm), parked by the path in.
// The order guarantee: the camcorder is near the entrance and the shotgun
// deep in; if the shotgun is taken first the wave still starts, and the
// camcorder still plays when it's picked up. Once looted the campsite
// stays empty: no restock and no second wave. It all works by day or by
// night, whenever Tom first comes.
//
// Events: 'campsite:arrived', 'campsite:searched' { id }, 'campsite:camcorder',
// 'campsite:shotgun', 'campsite:wave' { count }, 'campsite:cleared',
// 'campsite:battery'.

import campsiteData from '../data/campsite.json';
import { clearingFrame, frameToWorld, frameEdge, frameYaw, frameAnchor } from '../world/clearingFrame.js';
import { segmentCollider } from '../world/collision.js';
import { rollLoot } from '../combat/loot.js';
import { HoldAction } from '../player/HoldAction.js';
import { CampsiteProps } from '../render/CampsiteProps.js';
import { Rng } from '../core/Rng.js';
import { DEBUG } from '../debug/DebugMenu.js';

export class Campsite {
  constructor(cfg, bus, data = campsiteData) {
    this.cfg = cfg;
    this.cc = cfg.campsite;
    this.bus = bus;
    this.data = data;
  }

  // The campsite's frame (from the path in from home), for placing things
  // before the encounter is built (the campers' car: Game's vehicles).
  static frame(map) {
    return clearingFrame(map, 'campsite', 'home');
  }

  // Where the campers' car is parked: { x, z, yaw } in the world.
  static carSpot(map, data = campsiteData) {
    const f = Campsite.frame(map);
    if (!f) return null;
    const w = frameToWorld(f, data.car.x, data.car.z);
    return { x: w.x, z: w.z, yaw: frameYaw(f, data.car.yaw) };
  }

  // ctx: { world, combat, player, colliders, vehicles, lore, dialogue,
  // cutscenes, progress, notify(text) }.
  init(scene, ctx) {
    Object.assign(this, ctx);
    this.ground = ctx.world.ground;
    this.enemies = ctx.combat.enemies;
    this.frame = Campsite.frame(ctx.world.map);
    this.clearing = ctx.world.map.clearings.find((c) => c.cluster && c.key === 'campsite');
    this.points = this.data.searches.map((s) => ({ ...s, ...frameToWorld(this.frame, s.x, s.z) }));
    this.car = this.findCar();
    this.props = new CampsiteProps(this.cc.look, this.data);
    this.props.init(scene, this.frame, this.ground);
    this.buildColliders(ctx.colliders);
    // Its loot is rolled from the cluster's seed (the same every run), like its cars.
    this.lootRng = new Rng(`${this.cfg.map.cluster.seed}:campsite-loot`);
    this.waveRng = new Rng(`${this.cfg.map.cluster.seed}:campsite-wave`);
    this.hold = new HoldAction(this.cfg.station.hold.releaseDrain);
    this.hold.init();
    this.hud = { prompt: '', progress: 0 }; // read by Combat's HUD
    this.reset();
    this.unsubscribers = [
      this.bus.on('player:hurt', () => this.hold.interrupt()),
      // The wave's zombies, off the list as they fall (a pool slot can come back as another).
      this.bus.on('enemy:killed', ({ zombie }) => {
        const i = this.wave.indexOf(zombie);
        if (i >= 0) this.wave.splice(i, 1);
      }),
      this.bus.on('vehicle:battery', ({ vehicle }) => {
        if (vehicle === this.car && !this.batteryTaken) {
          this.batteryTaken = true;
          this.bus.emit('campsite:battery');
        }
      }),
    ];
  }

  reset() {
    this.searched = new Set();
    this.arrived = false;
    this.camcorderFound = false;
    this.shotgunFound = false;
    this.waveStarted = false;
    this.waveCleared = false;
    this.batteryTaken = false;
    this.wave = []; // the wave's zombies
    this.queue = []; // { at (seconds), x, z } still to burst out
    this.waveTime = 0;
    this.pendingClip = -1; // seconds until the camcorder's clip plays
    this.props?.setSmoke(true);
  }

  // The campers' car: the vehicle parked at the campsite.
  findCar() {
    const c = this.clearing;
    let best = null;
    let bestD = Infinity;
    for (const v of this.vehicles.list) {
      const d = Math.hypot(v.x - c.x, v.z - c.z);
      if (d < c.radius + 4 && d < bestD) {
        best = v;
        bestD = d;
      }
    }
    return best;
  }

  // The tents block bodies (shots pass them: they're canvas).
  buildColliders(grid) {
    const L = this.cc.look.tent;
    for (const t of this.data.tents) {
      const at = frameToWorld(this.frame, t.x, t.z);
      const y = this.ground.heightAt(at.x, at.z);
      const yaw = frameYaw(this.frame, t.yaw);
      if (t.kind === 'dome') {
        const r = this.cc.look.dome.radius * 0.8;
        grid.insert(segmentCollider(at.x - 0.01, at.z, at.x + 0.01, at.z, r, y - 0.5, y + 1.2, false));
        continue;
      }
      const half = L.length / 2 - L.halfWidth * 0.5;
      const s = Math.sin(yaw);
      const c = Math.cos(yaw);
      grid.insert(segmentCollider(at.x - s * half, at.z - c * half, at.x + s * half, at.z + c * half, L.halfWidth * 0.8, y - 0.5, y + L.height, false));
    }
  }

  // ---- each frame -----------------------------------------------------------------------------

  // playing: the world runs. canInteract: the controls are Tom's (no ledger, no other prompt first).
  update(dt, input, playing, canInteract) {
    this.props.update(dt, this.searched.has('cooler'));
    if (!playing) {
      this.hud.prompt = '';
      return;
    }
    const p = this.player.position;
    const c = this.clearing;
    const inside = Math.hypot(p.x - c.x, p.z - c.z) <= c.radius - this.cc.arriveInset;
    if (inside && !this.arrived) this.arrive();
    if (this.pendingClip >= 0) {
      this.pendingClip -= dt;
      if (this.pendingClip < 0) this.playClip();
    }
    this.updateWave(dt);
    if (canInteract && this.combat.alive) this.updateInteraction(dt, input);
    else {
      this.hud.prompt = '';
      this.hud.progress = 0;
      this.hold.update(dt, null, false, 1);
    }
  }

  updateInteraction(dt, input) {
    const X = input.activeDevice === 'gamepad' ? 'X' : 'E';
    const best = this.pickPoint();
    const key = best ? best.id : null;
    const done = this.hold.update(dt, key, input.isDown('interact'), best?.seconds ?? 1);
    if (done && best) this.search(best);
    this.hud.prompt = best ? (this.hold.active ? 'Searching…' : `Hold ${X}: ${best.label}`) : '';
    this.hud.progress = this.hold.key !== null ? this.hold.progress : 0;
  }

  // The nearest unsearched point in reach, or null.
  pickPoint() {
    const p = this.player.position;
    let best = null;
    let bestD = this.cc.interactRange;
    for (const pt of this.points) {
      if (this.searched.has(pt.id)) continue;
      const d = Math.hypot(pt.x - p.x, pt.z - p.z);
      if (d < bestD) {
        best = pt;
        bestD = d;
      }
    }
    return best;
  }

  // ---- the beats ----------------------------------------------------------------------------------

  arrive() {
    this.arrived = true;
    this.props.setSmoke(false);
    this.progress.setFlag('campsiteVisited');
    this.bus.emit('campsite:arrived');
    // The establishing sweep (with Wyatt's line 5), unless something's already playing.
    if (!this.cutscenes.active) this.cutscenes.play('sweep.campsite', { anchors: { campsite: this.frameAnchor() } });
    else this.dialogue.play('day1.05');
  }

  // The campsite frame as a cutscene anchor (yaw: facing in from the path).
  frameAnchor() {
    return frameAnchor(this.frame);
  }

  search(pt) {
    this.searched.add(pt.id);
    let any = false;
    for (const g of pt.gives ?? []) {
      if (g.item === 'camcorder') {
        any = true;
        this.findCamcorder();
      } else if (g.item === 'shotgun') {
        any = true;
        this.findShotgun(g.rounds ?? 0);
      } else {
        any = this.give(g.item, g.amount ?? 1, pt) || any;
      }
    }
    for (const { item, amount } of rollLoot(pt.loot ?? [], this.lootRng)) any = this.give(item, amount, pt) || any;
    if (!any) {
      this.combat.hud.pickup('Nothing useful');
      this.combat.sfx.play('denied');
    }
    this.bus.emit('campsite:searched', { id: pt.id });
  }

  // A pickup into the pack, or left on the ground if there's no room for it.
  give(item, amount, pt) {
    if (this.combat.takePickup(item, amount)) return true;
    this.combat.pickups.drop(item, amount, pt.x, this.ground.heightAt(pt.x, pt.z), pt.z, 0);
    return true;
  }

  findCamcorder() {
    if (this.camcorderFound) return;
    this.camcorderFound = true;
    this.lore.give('camcorder');
    this.bus.emit('campsite:camcorder');
    // Ellen: play it. Then the clip, then her line after it.
    this.dialogue.play('day1.06');
    this.pendingClip = this.cc.clipDelay;
  }

  playClip() {
    this.pendingClip = -1;
    this.cutscenes.play('clip.camcorder', {
      anchors: { campsite: this.frameAnchor() },
      onDone: () => this.dialogue.play('day1.07'),
    });
  }

  findShotgun(rounds) {
    if (this.shotgunFound) return;
    this.shotgunFound = true;
    this.combat.giveWeapon('shotgun', rounds);
    this.combat.hud.pickup(`Shotgun (+${this.combat.weapons.ammoRounds('shotgun') ?? 0} shells)`);
    this.combat.sfx.play('loaded');
    this.bus.emit('campsite:shotgun');
    this.startWave();
  }

  // ---- the wave -----------------------------------------------------------------------------------

  startWave() {
    if (this.waveStarted) return;
    this.waveStarted = true;
    this.dialogue.play('day1.08');
    const w = this.data.wave;
    const r = this.waveRng;
    this.queue = [];
    for (let i = 0; i < w.count; i++) {
      const arc = w.arcs[i % w.arcs.length];
      const at = frameEdge(this.frame, r.range(arc[0], arc[1]), r.range(w.beyondEdge[0], w.beyondEdge[1]));
      this.queue.push({ at: (w.spread * i) / Math.max(1, w.count - 1), x: at.x, z: at.z });
    }
    this.waveTime = 0;
    this.wave = [];
    this.bus.emit('campsite:wave', { count: w.count });
  }

  updateWave(dt) {
    if (!this.waveStarted || this.waveCleared) return;
    this.waveTime += dt;
    const w = this.data.wave;
    const p = this.player.position;
    while (this.queue.length && this.queue[0].at <= this.waveTime) {
      const q = this.queue.shift();
      const z = this.enemies.spawnZombie(q.x, q.z, { variant: 'citizen', mode: 'chase', rise: false, speedRange: w.speedRange, facing: Math.atan2(p.x - q.x, p.z - q.z) });
      if (z) {
        this.wave.push(z);
        this.enemies.alert(z.x, z.z, 1);
      }
    }
    if (this.queue.length === 0 && this.wave.every((z) => !z.alive)) this.clearWave();
  }

  clearWave() {
    this.waveCleared = true;
    this.wave = [];
    this.bus.emit('campsite:cleared');
    this.dialogue.play('day1.09'); // and line 10 after it
  }

  // ---- skip intro and saving ------------------------------------------------------------------

  // Everything already done (Skip intro): looted, the wave over, the battery gone.
  completeAll() {
    for (const pt of this.points) this.searched.add(pt.id);
    this.arrived = true;
    this.camcorderFound = true;
    this.shotgunFound = true;
    this.waveStarted = true;
    this.waveCleared = true;
    this.batteryTaken = true;
    this.props.setSmoke(false);
    const v = this.car;
    if (v) {
      v.searched.door = true;
      v.searched.boot = true;
      v.bonnetUp = true;
      v.hasBattery = false;
      this.vehicles.renderer.refresh(v);
    }
  }

  saveState() {
    return {
      searched: [...this.searched],
      arrived: this.arrived,
      camcorder: this.camcorderFound,
      shotgun: this.shotgunFound,
      wave: this.waveStarted,
      cleared: this.waveCleared,
      battery: this.batteryTaken,
    };
  }

  // A save mid-wave comes back with the wave over (its zombies aren't saved).
  loadState(d) {
    if (!d) return;
    this.searched = new Set(d.searched ?? []);
    this.arrived = Boolean(d.arrived);
    this.camcorderFound = Boolean(d.camcorder);
    this.shotgunFound = Boolean(d.shotgun);
    this.waveStarted = Boolean(d.wave);
    this.waveCleared = Boolean(d.cleared) || this.waveStarted;
    this.batteryTaken = Boolean(d.battery);
    this.queue = [];
    this.wave = [];
    this.props.setSmoke(!this.arrived);
  }

  // ---- debug ------------------------------------------------------------------------------------------

  addDebugItems(menu) {
    const day1 = menu.category(DEBUG.firstDay);
    day1.addItem('Campsite: teleport to the path in', () => {
      const f = this.frame;
      const e = f.entrance;
      this.player.teleport(e.x - f.fx * 6, e.z - f.fz * 6, Math.atan2(-f.fx, -f.fz));
      this.notify('At the path into the campsite');
    });
    day1.addItem('Campsite: start the shotgun wave now', () => {
      if (this.waveStarted && !this.waveCleared) return this.notify('The wave is already on');
      this.waveStarted = false;
      this.waveCleared = false;
      this.startWave();
    });
    day1.addItem('Campsite: reset it (unsearched, no wave yet)', () => {
      this.reset();
      this.notify('The campsite is as you found it (the car is as it is)');
    });
  }

  overlayLine() {
    const st = this.waveCleared ? 'cleared' : this.waveStarted ? `wave ${this.wave.filter((z) => z.alive).length} left (+${this.queue.length})` : 'quiet';
    return `campsite ${this.arrived ? 'visited' : 'unvisited'} searched ${this.searched.size}/${this.points.length} ${st}${this.batteryTaken ? ' battery taken' : ''}`;
  }

  dispose() {
    for (const off of this.unsubscribers ?? []) off();
    this.props.dispose();
  }
}
