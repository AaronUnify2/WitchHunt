// The abandoned campsite (M9.2; DESIGN.md "Abandoned campsite", agreed with
// Aaron in Session 15): the first stop of every run. Arrive calm, search,
// get hit with a turn, get rewarded, go home changed.
//  1. Arrival: four of the dead stand round the campers' fire (Nov 16,
//     Aaron). Walking into the clearing plays the establishing sweep, which
//     ends on them turning round; they come for Tom as it ends. With them
//     down, Wyatt's line 5 (check their shelters). Sets campsiteVisited;
//     the smoke over the trees is gone. (Day 1's retry point is taken just
//     before: onCheckpoint.)
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
      this.bus.on('campsite:turn', () => this.figureTurn()), // day2.screamer's emits
      this.bus.on('campsite:scream', () => this.figureScream()),
      this.bus.on('campsite:fireTurn', () => this.fireTurn()), // sweep.campsite's last shot
      this.bus.on('campsite:mutantRise', () => this.mutantRise()), // day2.mutant's emits
      this.bus.on('campsite:mutantTurn', () => this.mutantTurn()),
      // Nov 16: Day 2's dawn: Wyatt hands over the tower's box of rounds (the campground's mutant is next).
      this.bus.on('story:flag', ({ id, on }) => {
        if (id === 'day2' && on) this.giveDawnBox();
      }),
      // The wave's zombies, off the list as they fall (a pool slot can come back as another).
      this.bus.on('enemy:killed', ({ zombie }) => {
        const i = this.wave.indexOf(zombie);
        if (i >= 0) this.wave.splice(i, 1);
        const j = this.fire.indexOf(zombie);
        if (j >= 0) this.fire.splice(j, 1);
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
    this.escort = []; // Nov 16: the dead round Day 2's mutant
    this.dawnBoxGiven = false;
    this.searched = new Set();
    this.arrived = false;
    this.camcorderFound = false;
    this.shotgunFound = false;
    this.waveStarted = false;
    this.waveCleared = false;
    this.batteryTaken = false;
    this.wave = []; // the wave's zombies
    this.queue = []; // { at (seconds), x, z } still to burst out
    this.fire = []; // Nov 16: the dead standing round the fire as Tom arrives
    this.fireSent = false;
    this.fireAwake = false;
    this.fireCleared = false;
    this.fireFacing = 0;
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
    this.updateFire(p, dt);
    if (inside && !this.arrived) this.arrive();
    if (this.pendingClip >= 0) {
      this.pendingClip -= dt;
      if (this.pendingClip < 0) this.playClip();
    }
    // Round 2: the wave, a moment after the tape (or after it's put away unwatched).
    if (this.waveIn >= 0 && !this.waveStarted && !this.cutscenes?.active) {
      this.waveIn -= dt;
      // Nov 16: the tape kept, not watched: they come as he makes to leave, if not before.
      const leaving = this.tapeKept && Math.hypot(p.x - c.x, p.z - c.z) > c.radius - (this.cc.leaveInset ?? 2.5);
      if (this.waveIn < 0 || leaving) this.startWave();
    }
    this.updateWave(dt);
    this.updateEmergencyRounds();
    this.updateDawnFigure(p, dt);
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

  // Plan #19: on the ride out on Day 2 (the longest empty leg), once a run: something standing at the
  // campers' cold fire. Aaron (Nov 14: "one of the new types of zombies standing at the campground at the
  // campfire and ... another little cutscene just to show it off"): it's the Screamer, before Night 2 sends
  // one at the fence. Tom comes near and the camera goes to it (day2.screamer): it screams, a few of the
  // dead come up out of the dirt round it and come for him, and it sinks back into the ground. Not a
  // fight (it's Night 2's): a look at it, and what it does.
  updateDawnFigure(p, dt = 0) {
    const df = this.cc.dawnFigure;
    if (!df?.enabled || !this.enemies || !this.progress) return;
    if (df.variant === 'mutant') {
      this.updateDawnMutant(p, df);
      return;
    }
    const c = this.clearing;
    const d = Math.hypot(p.x - c.x, p.z - c.z);
    if (!this.figureSent) {
      if (!this.progress.has('day2') || this.progress.has('gasStationVisited') || this.clock?.phase === 'night' || d > df.spawnAt || d < c.radius) return;
      this.figureSent = true;
      const at = df.at ?? [0.3, -1.9];
      const w = frameToWorld(this.frame, at[0], at[1]);
      // Its back to the path from home, looking into the fire.
      const facing = frameYaw(this.frame, 0);
      const z = this.enemies.spawnZombie(w.x, w.z, { variant: df.variant ?? 'screamer', mode: 'linger', linger: { x: w.x, z: w.z, r: 0.8 }, rise: false, facing, authored: 'campsite' });
      if (z) {
        z.sightScale = 0; // it stands there until it's shown
        z.deaf = true;
      }
      this.figure = z ?? null;
      this.figureFacing = facing;
      this.figureShown = false;
      this.figureScreamed = false;
      return;
    }
    const z = this.figure;
    if (!z) return;
    if (z.screamT > 0) z.screamT -= dt; // the scream's pose (Zombie.frame)
    if (!z.alive) {
      this.figure = null;
      return;
    }
    // Rooted to its spot, turned the way the beat wants (the brain turns it toward its goal: ZombieBrain's linger).
    if (z.mode === 'linger') {
      z.pace = 0;
      z.goalX = z.x + Math.sin(this.figureFacing) * 6;
      z.goalZ = z.z + Math.cos(this.figureFacing) * 6;
      z.hasGoal = true;
    }
    if (this.figureShown || this.cutscenes?.active) return;
    // Shot from up the path before he's near: no picture, it screams and goes.
    const stirred = z.mode === 'chase' || z.health < z.maxHealth;
    if (d < (df.showAt ?? 30) || stirred) this.showFigure(p, stirred);
  }

  showFigure(p, stirred = false) {
    const z = this.figure;
    this.figureShown = true;
    if (this.player?.riding) this.player.riding.speed = 0; // the quad stops for it
    const done = () => this.figureLeaves();
    // (The anchor's z runs out of the camp's open side, the way Tom comes: the campsite's frame, turned round.)
    const anchors = { campScreamer: { x: z.x, z: z.z, yaw: frameAnchor(this.frame).yaw + Math.PI } };
    if (stirred || !this.cutscenes?.play('day2.screamer', { anchors, onDone: done })) done();
  }

  // It turns round, out of the camp (the cutscene's emit, a beat before the scream).
  figureTurn() {
    if (this.figure) this.figureFacing = frameYaw(this.frame, 180);
  }

  // The scream (the cutscene's emit; skipped before it, or no cutscene: as it ends).
  figureScream() {
    const z = this.figure;
    const df = this.cc.dawnFigure;
    if (!z?.alive || this.figureScreamed) return;
    this.figureScreamed = true;
    const p = this.player.position;
    this.figureTurn();
    if (!this.cutscenes?.active) z.facing = this.figureFacing = Math.atan2(p.x - z.x, p.z - z.z); // no picture: at Tom
    z.screamT = df.screamSeconds ?? 2.8;
    this.combat?.sfx?.play('screamerCall', z);
    const [r0, r1] = df.ring ?? [3, 5.5];
    for (let i = 0; i < (df.rise ?? 3); i++) {
      // Round it, on the open side of the fire.
      const a = this.figureFacing + (i - ((df.rise ?? 3) - 1) / 2) * 1.5;
      const r = r0 + ((r1 - r0) * ((i * 7) % 3)) / 2;
      const x = z.x + Math.sin(a) * r;
      const zz = z.z + Math.cos(a) * r;
      const risen = this.enemies.spawnZombie(x, zz, { variant: 'citizen', mode: 'chase', rise: true, facing: Math.atan2(p.x - x, p.z - zz), authored: 'campsite' });
      if (risen) this.enemies.alert?.(risen.x, risen.z, 1);
    }
    this.bus?.emit('campsite:screamed', {});
  }

  figureLeaves() {
    const z = this.figure;
    if (!z) return;
    this.figureScream();
    if (z.alive) z.burrow?.();
    this.figure = null;
    this.dialogue?.play('day2.figure.ellen');
  }

  // ---- Day 2: the mutant at the fire (Nov 16) ----------------------------------------------------------

  // Aaron (Nov 16: "Let's put one of our mutants in the campground waiting for the player on the morning of
  // day 2 ... our third zombie mutant by the campfire surrounded by 5 zombies. Again, quick sweep cutscene,
  // showing off the mutant variant as the focus of the scene"): in place of the Screamer (Night 2's now).
  // Crouched over the campers' cold fire, its back (the weak spot) to the path; the dead stand round it.
  // Within showAt the camera goes to it (day2.mutant): it unfolds, turns, and they all come. A fight.
  updateDawnMutant(p, df) {
    const c = this.clearing;
    const d = Math.hypot(p.x - c.x, p.z - c.z);
    if (!this.figureSent) {
      if (!this.progress.has('day2') || this.progress.has('gasStationVisited') || this.clock?.phase === 'night' || d > df.spawnAt || d < c.radius) return;
      this.figureSent = true;
      const at = df.at ?? [0, -0.9];
      const w = frameToWorld(this.frame, at[0], at[1]);
      const facing = frameYaw(this.frame, 0); // into the fire, its back to the path
      const z = this.enemies.spawnZombie(w.x, w.z, { kind: 'mutant', mode: 'held', health: df.health, facing, authored: 'campsite' });
      if (z) {
        z.maxHealth = z.health = df.health ?? z.health;
        z.state = 'dormant';
        z.timer = 0;
        z.facing = facing;
        z.sightScale = 0;
        z.deaf = true;
      }
      this.figure = z ?? null;
      this.figureShown = false;
      this.escort = [];
      const f = this.data.props.fire;
      const fire = frameToWorld(this.frame, f.x, f.z);
      for (const [x, zz] of df.escortSpots ?? []) {
        const e = frameToWorld(this.frame, x, zz);
        const zb = this.enemies.spawnZombie(e.x, e.z, { variant: 'citizen', mode: 'linger', linger: { x: e.x, z: e.z, r: 0.5 }, rise: false, facing: Math.atan2(fire.x - e.x, fire.z - e.z), authored: 'campsite' });
        if (!zb) continue;
        zb.sightScale = 0;
        zb.deaf = true;
        zb.fireAt = fire;
        this.escort.push(zb);
      }
      return;
    }
    const z = this.figure;
    if (!z && !this.escort.length) return;
    // The escort, rooted round the fire facing it (or Tom, once it's turned), until they're let go.
    if (!this.dawnAwake) {
      for (const e of this.escort) {
        if (!e.alive || e.mode !== 'linger') continue;
        const look = this.mutantTurned ? this.player.position : e.fireAt;
        e.pace = 0;
        e.goalX = e.x + (look.x - e.x) * 4;
        e.goalZ = e.z + (look.z - e.z) * 4;
        e.hasGoal = true;
      }
    }
    if (this.figureShown || this.cutscenes?.active) return;
    const stirred = (z && (z.state !== 'dormant' || z.health < z.maxHealth)) || this.escort.some((e) => e.alive && (e.health < e.maxHealth || e.mode === 'chase'));
    if (d < (df.showAt ?? 30) || stirred) this.showDawnMutant(stirred);
  }

  showDawnMutant(stirred) {
    const z = this.figure;
    this.figureShown = true;
    if (this.player?.riding) this.player.riding.speed = 0; // the quad stops for it
    const go = () => this.letDawnGo();
    if (!z || stirred) return go();
    const anchors = { campMutant: { x: z.x, z: z.z, yaw: frameAnchor(this.frame).yaw + Math.PI } };
    if (!this.cutscenes?.play('day2.mutant', { anchors, onDone: go })) go();
  }

  // The cutscene's emits: it unfolds from its crouch; it turns round on him.
  mutantRise() {
    const z = this.figure;
    if (z?.alive && z.state === 'dormant') {
      z.wake(this.cfg.mutant.look.wakeSeconds * 0.75);
      this.combat?.sfx?.play('mutantGroan', z);
    }
  }

  mutantTurn() {
    this.mutantTurned = true;
    const z = this.figure;
    if (z?.alive) z.facing = frameYaw(this.frame, 180);
  }

  // As the cutscene ends (or it's stirred early): they all come.
  letDawnGo() {
    this.dawnAwake = true;
    this.mutantTurned = true;
    const p = this.player.position;
    const z = this.figure;
    if (z?.alive) {
      if (z.state === 'dormant') z.wake(1.2);
      z.sightScale = 1;
      z.deaf = false;
      this.enemies.brain.chase(z, p.x, p.z, 30);
    }
    for (const e of this.escort) {
      if (!e.alive) continue;
      e.sightScale = 1;
      e.deaf = false;
      this.enemies.brain.chase(e, p.x, p.z, 30);
    }
    this.figure = null;
    this.escort = [];
  }

  // Wyatt's box (Nov 16): Day 2's fight is rifle and shovel only, against a mutant with twice the health.
  giveDawnBox() {
    const box = this.cc.dawnBox;
    if (!box || this.dawnBoxGiven) return;
    this.dawnBoxGiven = true;
    if (this.combat.takePickup?.('rifleAmmo', box.rounds)) this.combat.hud?.pickup?.(`Wyatt's box of rifle rounds (+${box.rounds})`);
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
    // Nov 16 (Aaron: Tom can die here now): Day 1's retry point, before anything's changed.
    if (this.clock?.day === 1 && !this.progress.has('campsiteVisited')) this.onCheckpoint?.(this.retrySpot());
    this.arrived = true;
    this.props.setSmoke(false);
    this.progress.setFlag('campsiteVisited');
    this.bus.emit('campsite:arrived');
    // The establishing sweep (with Wyatt's line 5), unless something's already playing.
    // Nov 16: it ends on the dead at the fire turning round; they come for him as it ends (skipped too).
    const go = () => this.wakeFire();
    if (this.cutscenes.active || !this.cutscenes.play('sweep.campsite', { anchors: { campsite: this.frameAnchor() }, onDone: go })) go();
  }

  // Where a retry from the campground puts Tom: on the path in from home, a few strides out, facing in.
  retrySpot() {
    const f = this.frame;
    const e = f.entrance;
    return { x: e.x - f.fx * 7, z: e.z - f.fz * 7, yaw: Math.atan2(-f.fx, -f.fz) };
  }

  // ---- the dead at the fire (Nov 16) ----------------------------------------------------------------

  updateFire(p, dt) {
    const fg = this.data.fireGroup;
    if (!fg || !this.enemies) return;
    const c = this.clearing;
    if (!this.fireSent) {
      if (this.arrived || this.progress?.has('campsiteVisited') || this.clock?.day !== 1) return;
      if (Math.hypot(p.x - c.x, p.z - c.z) > fg.spawnAt) return;
      this.fireSent = true;
      const f = this.data.props.fire;
      const fire = frameToWorld(this.frame, f.x, f.z);
      this.fireAt = fire;
      for (const [x, z] of fg.spots) {
        const w = frameToWorld(this.frame, x, z);
        const facing = Math.atan2(fire.x - w.x, fire.z - w.z);
        const zb = this.enemies.spawnZombie(w.x, w.z, { variant: 'citizen', mode: 'linger', linger: { x: w.x, z: w.z, r: 0.5 }, rise: false, facing, authored: 'campsite' });
        if (!zb) continue;
        zb.sightScale = 0; // round the fire, heads down, until the sweep's done (or a shot)
        zb.deaf = true;
        this.fire.push(zb);
      }
      return;
    }
    if (this.fireCleared) return;
    if (!this.fireAwake) {
      // Shot from up the path (or walked into before the sweep): they all come.
      if (this.fire.some((z) => z.alive && (z.health < z.maxHealth || z.mode === 'chase'))) {
        this.wakeFire();
        return;
      }
      for (const z of this.fire) {
        if (!z.alive || z.mode !== 'linger') continue;
        // Rooted, turned the way the beat wants (to the fire, then to Tom).
        const look = this.fireTurned ? this.player.position : this.fireAt;
        z.pace = 0;
        z.goalX = z.x + (look.x - z.x) * 4;
        z.goalZ = z.z + (look.z - z.z) * 4;
        z.hasGoal = true;
      }
    }
    if (this.fire.every((z) => !z.alive)) this.fireDown();
  }

  // The sweep's last shot: their heads come up off the fire, toward him.
  fireTurn() {
    this.fireTurned = true;
  }

  wakeFire() {
    if (this.fireAwake || !this.fireSent) return;
    this.fireAwake = true;
    this.fireTurned = true;
    const p = this.player.position;
    for (const z of this.fire) {
      if (!z.alive) continue;
      z.sightScale = 1;
      z.deaf = false;
      this.enemies.brain.chase(z, p.x, p.z, 30);
    }
    if (!this.fire.some((z) => z.alive)) this.fireDown();
  }

  // All four down: Wyatt, check their shelters (his line 5, off the sweep since Nov 16).
  fireDown() {
    if (this.fireCleared) return;
    this.fireCleared = true;
    this.fire = [];
    this.dialogue?.play('day1.05');
    this.bus.emit('campsite:fireCleared');
  }

  // Is the fight round the fire on (for the objective)?
  get fireFight() {
    return this.fireSent && !this.fireCleared && this.arrived;
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
    this.tapeKept = true;
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
        this.tapeKept = false;
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

  // Nov 16 (Aaron: "focus is put on the camper's car with the collect the battery to supercharge the fence
  // dialogue, however this time we spawn a horde of zombies in the trees behind the car and let them emerge
  // from the edge of the forest"): the horde, in groups out of the treeline behind the car (between Tom and
  // home), the first as its cutscene (campsite.horde) starts. Ellen asks for the battery in it.
  startWave() {
    if (this.waveStarted) return;
    this.waveStarted = true;
    const w = this.data.wave;
    const r = this.waveRng;
    this.queue = [];
    if (w.lead) {
      const at = frameEdge(this.frame, w.lead.angle, w.lead.out);
      this.queue.push({ at: 0, x: at.x, z: at.z, lead: true });
    }
    let count = this.queue.length;
    for (const g of w.groups ?? [{ count: w.count, after: 0, spread: w.spread, arcs: w.arcs, beyondEdge: w.beyondEdge }]) {
      for (let i = 0; i < g.count; i++) {
        const arc = g.arcs[i % g.arcs.length];
        const at = frameEdge(this.frame, r.range(arc[0], arc[1]), r.range(g.beyondEdge[0], g.beyondEdge[1]));
        this.queue.push({ at: g.after + (g.spread * i) / Math.max(1, g.count - 1), x: at.x, z: at.z });
      }
      count += g.count;
    }
    this.queue.sort((a, b) => a.at - b.at);
    this.waveTime = 0;
    this.wave = [];
    this.bus.emit('campsite:wave', { count });
    const done = () => {
      // Off the cutscene: all of them on him (the cutscene's start made the far ones forget).
      const p = this.player.position;
      for (const z of this.wave) if (z.alive) this.enemies.brain.chase(z, p.x, p.z, 30);
      if (!this.dialogue?.heard?.has?.('day1.10')) this.dialogue?.play('day1.10');
    };
    if (this.cutscenes?.active || !this.cutscenes?.play('campsite.horde', { anchors: { campsite: this.frameAnchor() }, onDone: done })) {
      this.dialogue.play('day1.08');
      done();
    }
  }

  updateWave(dt) {
    if (!this.waveStarted || this.waveCleared) return;
    this.waveTime += dt;
    const w = this.data.wave;
    const p = this.player.position;
    while (this.queue.length && this.queue[0].at <= this.waveTime) {
      const q = this.queue.shift();
      const z = this.enemies.spawnZombie(q.x, q.z, { variant: 'citizen', mode: 'chase', rise: false, speedRange: (q.lead && w.lead.speedRange) || w.speedRange, facing: Math.atan2(p.x - q.x, p.z - q.z), authored: 'campsite' });
      if (z) {
        this.wave.push(z);
        this.enemies.brain.chase(z, p.x, p.z, 30);
        this.enemies.alert(z.x, z.z, 1);
      }
    }
    if (this.queue.length === 0 && this.wave.every((z) => !z.alive)) this.clearWave();
  }

  clearWave() {
    this.waveCleared = true;
    this.wave = [];
    this.bus.emit('campsite:cleared');
    // Nov 16: Ellen asked for the battery as they came (the horde's cutscene); nothing more's said.
    if (!this.dialogue?.heard?.has?.('day1.10')) this.dialogue.play('day1.10');
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
    this.fireSent = true;
    this.fireCleared = true;
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
      dawnBox: this.dawnBoxGiven, // Nov 16
      fire: this.fireCleared || this.arrived, // Nov 16: the dead at the fire (not saved: a save after arriving comes back with them down)
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
    this.fireSent = this.fireCleared = Boolean(d.fire ?? this.arrived);
    this.dawnBoxGiven = Boolean(d.dawnBox ?? this.figureSent);
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
    day1.addItem('Campsite: start the horde now (its cutscene)', () => {
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
