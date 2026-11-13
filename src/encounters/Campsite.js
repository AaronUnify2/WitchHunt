// The abandoned campsite (M9.2; DESIGN.md "Abandoned campsite", agreed with
// Aaron in Session 15): the first stop of every run. Arrive calm, search,
// get hit with a turn, get rewarded, go home changed.
//  1. Arrival: walking into the clearing plays an establishing sweep and
//     Wyatt's line 5 (check the car and the tents). Sets campsiteVisited;
//     the smoke over the trees is gone.
//  2. The search: hold-X search points (data/campsite.json): the cooler
//     by the entrance, the tents, a backpack. Each teaches a pickup.
//  3. The camcorder (in the cooler, near the entrance): Ellen's line 6,
//     then the clip (clip.camcorder; Session 16: it waits for D-pad down), then her line 7.
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

  // Session 16 (Aaron): the wrecked car on the trail out from home, every
  // run: candidate spots about halfway along the path, on its verge, nosed
  // into the ditch (the first that fits is used: vehiclePlacement).
  static trailWreckSpots(map) {
    const ci = map.clearings.findIndex((c) => c.cluster && c.key === 'campsite');
    const hi = map.clearings.findIndex((c) => c.cluster && c.key === 'home');
    const path = map.paths.find((p) => (p.a === ci && p.b === hi) || (p.a === hi && p.b === ci));
    const pts = path?.points;
    if (!pts || pts.length < 2) return [];
    const lens = [0];
    for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z));
    const total = lens[lens.length - 1];
    const out = [];
    for (const [t, side] of [[0.5, 1], [0.5, -1], [0.44, 1], [0.56, -1], [0.38, 1], [0.62, -1], [0.32, -1], [0.68, 1]]) {
      const d = total * t;
      let i = 1;
      while (i < pts.length - 1 && lens[i] < d) i++;
      const a = pts[i - 1];
      const b = pts[i];
      const seg = lens[i] - lens[i - 1] || 1;
      const k = (d - lens[i - 1]) / seg;
      const tx = (b.x - a.x) / seg;
      const tz = (b.z - a.z) / seg;
      const off = 2.9;
      out.push({ type: 'sedan', x: a.x + (b.x - a.x) * k + tz * side * off, z: a.z + (b.z - a.z) * k - tx * side * off, yaw: Math.atan2(tx, tz) + side * 0.5 });
    }
    return out;
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
    // Session 15b (Aaron): the camcorder's clip rewatched on the monitors was
    // shot round the cabin (no anchor given): it's named for any cutscene now.
    this.cutscenes?.namedAnchors?.set('campsite', () => this.frameAnchor());
    this.car = this.findCar();
    this.props = new CampsiteProps(this.cc.look, this.data, this.cfg.props?.weather);
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
    this.waveIn = -1; // Round 2: seconds until the wave (after the tape)
    this.emergencyGiven = false;
    this.figureSent = false; // Plan #19
    this.figureTold = false;
    this.figure = null;
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
    this.pendingClip = -1; // (unused since Session 16: the clip waits for D-pad down)
    this.tapeWatched = false; // Session 16: the camcorder's clip has been started
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

  // The tents block bodies (shots pass them: they're canvas). Session 25: the log wall blocks both.
  buildColliders(grid) {
    const r = this.data.props.reflector;
    if (r) {
      const at = frameToWorld(this.frame, r.x, r.z);
      const y = this.ground.heightAt(at.x, at.z);
      const yaw = frameYaw(this.frame, r.yaw ?? 0);
      const ax = Math.cos(yaw) * (r.length / 2);
      const az = -Math.sin(yaw) * (r.length / 2);
      grid.insert(segmentCollider(at.x - ax, at.z - az, at.x + ax, at.z + az, 0.16, y - 0.5, y + r.logs * 0.2 + 0.1, true));
    }
    const L = this.cc.look.tent;
    for (const t of this.data.tents) {
      const at = frameToWorld(this.frame, t.x, t.z);
      const y = this.ground.heightAt(at.x, at.z);
      const yaw = frameYaw(this.frame, t.yaw);
      if (t.kind === 'leanto') {
        // Session 25: a lean-to: solid along its width, toward its back (the open front faces the fire).
        const lt = this.cc.look.leanto;
        const half = lt.width / 2 - 0.3;
        const ox = Math.sin(yaw) * 0.25;
        const oz = Math.cos(yaw) * 0.25;
        const ax = Math.cos(yaw);
        const az = -Math.sin(yaw);
        grid.insert(segmentCollider(at.x + ox - ax * half, at.z + oz - az * half, at.x + ox + ax * half, at.z + oz + az * half, lt.depth * 0.32, y - 0.5, y + lt.height, false));
        continue;
      }
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
    // Round 2: the wave, a moment after the tape (or after it's put away unwatched).
    if (this.waveIn >= 0 && !this.waveStarted && !this.cutscenes?.active) {
      this.waveIn -= dt;
      if (this.waveIn < 0) this.startWave();
    }
    this.updateWave(dt);
    this.updateEmergencyRounds();
    this.updateDawnFigure(p);
    if (canInteract && this.combat.alive) this.updateInteraction(dt, input);
    else {
      this.hud.prompt = '';
      this.hud.progress = 0;
      this.hold.update(dt, null, false, 1);
    }
  }

  // Round 2: the wave on, the rifle dry and no shovel: a camper's box of rounds by the fire, once
  // (Day 1 can't be failed, so it mustn't be possible to be stuck in it).
  updateEmergencyRounds() {
    if (!this.waveStarted || this.waveCleared || this.emergencyGiven) return;
    const w = this.combat.weapons;
    if (!w || w.has?.('shovel')) return;
    const rounds = (w.states?.rifle?.mag ?? 0) + (w.ammoRounds?.('rifle') ?? 0);
    if (rounds > 0) return;
    this.emergencyGiven = true;
    const f = this.data.props.fire;
    const at = frameToWorld(this.frame, f.x + 1.1, f.z - 0.6);
    this.combat.pickups.drop('rifleAmmo', this.cc.emergencyRounds, at.x, this.ground.heightAt(at.x, at.z), at.z, 0);
    this.dialogue?.play('day1.rounds');
  }

  // Plan #19: on the walk out on Day 2 (the longest empty leg), once a run: one of the dead standing at
  // the campers' cold fire, its back to the path from home. Wyatt sees it; Ellen says what it is once it
  // turns or falls. Not a wave, not a revisit pack: a picture.
  updateDawnFigure(p) {
    const df = this.cc.dawnFigure;
    if (!df?.enabled || !this.enemies || !this.progress) return;
    const c = this.clearing;
    const d = Math.hypot(p.x - c.x, p.z - c.z);
    if (!this.figureSent) {
      if (!this.progress.has('day2') || this.progress.has('gasStationVisited') || this.clock?.phase === 'night' || d > df.spawnAt || d < c.radius) return;
      this.figureSent = true;
      const f = this.data.props.fire;
      const w = frameToWorld(this.frame, f.x, f.z + f.radius + 0.4);
      const z = this.enemies.spawnZombie(w.x, w.z, { variant: 'citizen', mode: 'linger', linger: { x: w.x, z: w.z, r: 0.8 }, rise: false, facing: frameYaw(this.frame, 0), authored: 'campsite' });
      this.figure = z ?? null;
      return;
    }
    const z = this.figure;
    if (!z) return;
    if (!this.figureTold && z.alive && z.mode !== 'chase' && d < df.callAt && !this.cutscenes?.active) {
      this.figureTold = true;
      this.dialogue?.play('day2.figure');
    }
    if (this.figureTold && (!z.alive || z.mode === 'chase')) {
      this.figure = null;
      this.dialogue?.play('day2.figure.ellen');
    } else if (!z.alive) this.figure = null;
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
    let bestD = Infinity;
    for (const pt of this.points) {
      if (this.searched.has(pt.id)) continue;
      const d = Math.hypot(pt.x - p.x, pt.z - p.z);
      // Session 15b (Aaron): a point can reach further (`range`: the tents, whose centres you can't get near).
      if (d < (pt.range ?? this.cc.interactRange) && d < bestD) {
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
    // Ellen: play it. Session 16 (Aaron): the clip waits for D-pad down (on
    // Tom's own time, not over the family's talk); then her line after it.
    this.dialogue.play('day1.06');
    // Session 20 (Aaron): its inspect card: watch it now, or keep it (the prompt waits, and handed in it's on the monitors).
    if (this.card?.show('camcorder', { watch: () => this.playClip(), keep: () => this.offerTape() })) return;
    this.offerTape();
  }

  offerTape() {
    if (this.tapeWatched) return;
    // Kept for later: they come anyway, a little after (the cars wait on the tape or the wave).
    if (!this.waveStarted && !(this.waveIn >= 0)) this.waveIn = this.cc.waveAfterKeep;
    if (!this.watch?.offer({ id: 'camcorder', pad: 'D-pad down: play the camcorder', key: 'V: play the camcorder', play: () => this.playClip() })) {
      if (!this.watch) this.playClip();
    }
  }

  // Session 15b: has the camcorder's tape played (or been skipped)? The cars
  // wait for it on Day 1.
  get tapeSeen() {
    return this.camcorderFound && this.tapeWatched && this.cutscenes.current?.id !== 'clip.camcorder';
  }

  playClip() {
    this.pendingClip = -1;
    this.tapeWatched = true;
    this.watch?.cancel('camcorder');
    this.cutscenes.play('clip.camcorder', {
      anchors: { campsite: this.frameAnchor() },
      // Round 2 (Aaron: the shotgun's at the Pruitt farm now; "that's not just okay, it's better"): the dead
      // come out of the trees as the tape ends.
      onDone: () => {
        this.dialogue.play('day1.07');
        this.waveIn = this.cc.waveAfterTape;
      },
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
    this.tapeWatched = true;
    this.watch?.cancel('camcorder');
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
      tape: this.tapeWatched,
      shotgun: this.shotgunFound,
      wave: this.waveStarted,
      cleared: this.waveCleared,
      battery: this.batteryTaken,
      figure: this.figureSent, // Plan #19
    };
  }

  // A save mid-wave comes back with the wave over (its zombies aren't saved).
  loadState(d) {
    if (!d) return;
    this.searched = new Set(d.searched ?? []);
    this.arrived = Boolean(d.arrived);
    this.camcorderFound = Boolean(d.camcorder);
    this.tapeWatched = d.tape ?? this.camcorderFound; // (older saves: as good as watched)
    if (this.camcorderFound && !this.tapeWatched) this.offerTape();
    this.shotgunFound = Boolean(d.shotgun);
    this.waveStarted = Boolean(d.wave);
    this.waveCleared = Boolean(d.cleared) || this.waveStarted;
    this.batteryTaken = Boolean(d.battery);
    this.figureSent = Boolean(d.figure);
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
