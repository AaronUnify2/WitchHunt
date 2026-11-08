// The overrun military outpost (Session 17, M9.4; DESIGN.md "Overrun
// military outpost"). The climax of the opening and the gateway south: a
// transfer point where containment failed in transit. Ellen sends Tom to
// report the witch; he finds the dead.
//  1. The call: the gas station's safe opens (rifleClaimed): Ellen sends
//     Tom to the checkpoint (outpostCall; its gates open), and says to come
//     home if it goes bad.
//  2. The walk out: within config.outpost.approach.start of the outpost,
//     the arrival sweep down the road to the barricade, the first helmet
//     standing on the road (one army zombie: its helmet stops a headshot).
//  3. Waves: down, a lull, then a wave (3, 5, 8, config), each standing up
//     ahead of Tom toward the barricade and coming at him; the radio talks
//     in the lulls (the soldiers are the dead; what a quarantine zone
//     really means). Bigger by night. Retreat far enough mid-wave and the
//     waves go back to the last one cleared.
//  4. The watchtower, on the near side of the barricade: climb it (the
//     dead can't: they gather at its foot); the snipers' nest has the
//     hunting rifle's rounds (guaranteed). The first time Tom raises the
//     rifle's scope up there: the dogfight (clip.dogfight): a patrol plane
//     and a craft trade fire and both come down, where the map puts the
//     crashed plane and the crashed UFO (Aaron); smoke stands over both
//     sites afterwards until Tom gets there. If he never climbs it, it plays
//     as he crosses the barricade once the peak's down.
//  5. The barricade's peak: the biggest wave, out of the compound through
//     the gaps. Once the approach is done and the rounds are taken (and Tom's
//     off the tower or has seen the dogfight), or Tom's close to the line,
//     or right at it whatever. Down: outpostCleared (the checkpoint opens):
//     nobody's coming.
//  5b. The gun pit's machine gun (Session 17, Aaron: a first taste of the
//     turret): dead until Tom fits a battery (hold X with one in his pack);
//     then it swings onto the dead and fires 15 rounds, overheats and blows
//     up. Once.
//  6. The compound: a crime scene of the failed transfer.
//     - The beetles' crates (DESIGN beat 9): shot, blown or prised open,
//       each lets one out (ai/Beetles.js: the shell shrugs off shots, the
//       face doesn't); the first time Tom comes near one breaks open on its
//       own, so the fight always happens. Scratching inside the crates.
//       C-9, the brood's container, busted open (Session 17, Aaron).
//     - The Mothman's container (C-7, torn apart from inside): a short sweep
//       up its claw gouges the first time Tom comes to it, out of a fight;
//       never named.
//     - The body in the resin (C-4): its doors shut until Tom hauls them
//       open, and the camera turns onto it (Session 17, Aaron); the empty one with its doors blown out.
//     - The armoury's one charge, the field report (read in close-up, then
//       carried home), the manifest on its clipboard (one line redacted).
// Each beat happens once; it's saved (a wave out isn't: it comes again).
//
// Events: 'outpost:called', 'outpost:approach', 'outpost:wave' { index },
// 'outpost:waveDown' { index }, 'outpost:peak', 'outpost:cleared',
// 'outpost:climbed', 'outpost:rounds', 'outpost:dogfight', 'outpost:crate' { index },
// 'outpost:c7', 'outpost:searched' { id }.

import { Vector3 } from 'three';
import outpostData from '../data/outpost.json';
import { frameToWorld, frameYaw, frameAnchor } from '../world/clearingFrame.js';
import { segmentCollider } from '../world/collision.js';
import { rollLoot } from '../combat/loot.js';
import { HoldAction } from '../player/HoldAction.js';
import { OutpostProps, CONTAINER, CRATE } from '../render/OutpostProps.js';
import { Rng } from '../core/Rng.js';
import { DEBUG } from '../debug/DebugMenu.js';
import { Beetles } from '../ai/Beetles.js';

export class Outpost {
  constructor(cfg, bus, data = outpostData) {
    this.cfg = cfg;
    this.oc = cfg.outpost;
    this.bus = bus;
    this.data = data;
  }

  // The outpost's frame: from its centre, facing the checkpoint (due south);
  // x to the right as you face it (west), z toward the cordon.
  static frame(map) {
    const c = map.clearings.find((x) => x.cluster && x.key === 'outpost');
    if (!c) return null;
    return { x: c.x, z: c.z, radius: c.radius, yaw: 0, fx: 0, fz: 1, rx: -1, rz: 0, entrance: { x: c.x, z: c.z - c.radius } };
  }

  // The trucks' spots in the world (Game's vehicles: the first is across the barricade's gap).
  static truckSpots(map, data = outpostData) {
    const f = Outpost.frame(map);
    if (!f) return [];
    return data.trucks.map((s) => {
      const w = frameToWorld(f, s.x, s.z);
      return { x: w.x, z: w.z, yaw: frameYaw(f, s.yaw) };
    });
  }

  // ctx: { world, player, combat, colliders, vehicles, explosives, clock,
  // cutscenes, dialogue, progress, lore, paper, notify(text) }.
  init(scene, ctx) {
    Object.assign(this, ctx);
    this.ground = ctx.world.ground;
    this.frame = Outpost.frame(ctx.world.map);
    if (!this.frame) return;
    this.enemies = ctx.combat?.enemies;
    const t = this.data.tower;
    this.towerY = OutpostProps.towerTop(this.frame, this.ground, t);
    this.towerAt = frameToWorld(this.frame, t.x, t.z);
    this.ladderAt = frameToWorld(this.frame, t.x, t.z - t.half - 0.9);
    if (scene) {
      this.props = new OutpostProps(this.oc.look, this.data, this.cfg.aliens?.grey, this.cfg.props?.weather);
      this.props.init(scene, this.frame, this.ground);
    }
    if (ctx.colliders) this.buildColliders(ctx.colliders);
    const at = (s) => ({ ...s, ...frameToWorld(this.frame, s.x, s.z) });
    this.points = this.data.searches.map(at);
    this.gapAt = frameToWorld(this.frame, 2.2, this.data.barricade.z);
    this.lootRng = new Rng(`${this.cfg.map.cluster.seed}:outpost-loot`);
    this.waveRng = new Rng(`${this.cfg.map.cluster.seed}:outpost-waves`);
    this.hold = new HoldAction(this.cfg.station.hold.releaseDrain);
    this.hold.init();
    this.hud = { prompt: '', progress: 0 };
    this.cutscenes?.namedAnchors?.set('outpost', () => frameAnchor(this.frame));
    this.cutscenes?.namedAnchors?.set('outpostTower', () => ({ ...this.towerAt, yaw: Math.PI, dy: this.towerY - this.ground.heightAt(this.towerAt.x, this.towerAt.z) }));
    // The dogfight's anchors (from the tower), so it plays the same rewatched on the monitors.
    for (const name of ['dogfight', 'fight', 'planeCrash', 'ufoCrash']) this.cutscenes?.namedAnchors?.set(name, () => this.dogfightAnchors(this.towerEye())[name]);
    this.sites = this.crashSites();
    this.props?.buildCrashSmoke(scene, [this.sites.plane, this.sites.ufo]);
    // The compound: the crates' beetles, the containers.
    this.beetles = new Beetles(this.cfg, this.bus);
    this.beetles.init(scene, { player: this.player, combat: this.combat, colliders: ctx.colliders, ground: this.ground });
    this.crateAt = this.data.compound.crates.map(([x, z]) => ({ ...frameToWorld(this.frame, x, z), y: this.gy(x, z) }));
    const container = (kind) => this.data.compound.containers.find((c) => c.kind === kind);
    this.doorOf = (kind) => {
      const c = container(kind);
      const a = (c.yaw * Math.PI) / 180;
      const h = CONTAINER.length / 2 + 2.5; // just out from its door end
      return frameToWorld(this.frame, c.x + Math.sin(a) * h, c.z + Math.cos(a) * h);
    };
    this.c7At = this.doorOf('mothman');
    this.resinAt = this.doorOf('resin');
    // C-4's doors (Session 17, Aaron: shut; hold X to haul them open, the reveal): the spot in front of them,
    // and the body inside (the camera turns to it).
    const c4 = container('resin');
    const a4 = (c4.yaw * Math.PI) / 180;
    const atC4 = (dz) => frameToWorld(this.frame, c4.x + Math.sin(a4) * dz, c4.z + Math.cos(a4) * dz);
    this.resinDoorAt = atC4(CONTAINER.length / 2 + 1.0);
    const body = atC4(CONTAINER.length / 2 - 1.1);
    this.cutscenes?.namedAnchors?.set('outpostResin', () => ({ ...body, yaw: 0, dy: CONTAINER.deck - 0.7 }));
    const c7 = container('mothman');
    const c7w = frameToWorld(this.frame, c7.x, c7.z);
    // The C-7 sweep's anchor: the container's middle, facing out of its door end.
    const a7 = (c7.yaw * Math.PI) / 180;
    const out = frameToWorld(this.frame, c7.x + Math.sin(a7), c7.z + Math.cos(a7));
    this.cutscenes?.namedAnchors?.set('outpostC7', () => ({ x: c7w.x, z: c7w.z, yaw: Math.atan2(-(out.x - c7w.x), -(out.z - c7w.z)) }));
    this.reset();
    this.sureBattery();
    this.unsubscribers = [
      this.bus.on('player:hurt', () => this.hold.interrupt()),
      this.bus.on('enemy:killed', ({ zombie }) => this.onKilled(zombie)),
      // Session 17 (Aaron): Ellen sends Tom the moment the safe opens.
      this.bus.on('story:flag', ({ id, on }) => {
        if (id === 'rifleClaimed' && on && !this.progress?.has('outpostCall')) this.callIn = 0.6;
      }),
      // A round into a crate, or a blast near one, breaks it open.
      this.bus.on('weapon:impact', ({ x, y, z }) => this.crateShot(x, y, z)),
      this.bus.on('explosion', ({ x, z, radius }) => this.crateBlast(x, z, radius)),
      this.bus.on('beetle:hit', ({ part, killed }) => {
        if (part !== 'weak' && !killed && !this.told.has('beetleHint')) {
          this.told.add('beetleHint');
          this.dialogue?.play('outpost.beetle.hint');
        }
      }),
    ];
  }

  reset() {
    this.callIn = -1; // seconds until Ellen's call (after Wyatt's line on the safe)
    this.approachStarted = false;
    this.helmetDone = false;
    this.wavesCleared = 0;
    this.wave = []; // the zombies of the wave that's out (the first helmet's too)
    this.waveOut = null; // 'helmet' | wave index, while one's out
    this.waveAge = 0;
    this.scopeHinted = false; // Session 17: the scope's hint up the tower, once a climb
    // The gun pit's machine gun: dead -> live (a battery fitted) -> hot (overheating) -> spent (blown up).
    this.turret = { state: 'dead', rounds: 0, yaw: Math.PI, timer: 0, kick: 0, target: null };
    this.props?.setTurret('dead', Math.PI);
    // Session 19 (Aaron): the barricade's floodlights, dark until the generator has a battery.
    this.floodsOn = false;
    this.props?.setFloodsOn(false);
    this.lull = 0;
    this.towerTold = false;
    this.roundsTaken = false;
    this.dogfightSeen = false;
    this.sitesReached = new Set(); // the crash sites Tom's been to (their smoke goes)
    this.peakState = 'none'; // none -> running -> done
    this.peak = [];
    this.peakLeft = 0; // still to stand up
    this.burstTimer = 0;
    this.entered = false;
    this.searched = new Set();
    this.crates = (this.data.compound.crates ?? []).map(() => 'whole');
    this.autoBroken = false;
    this.told = new Set(); // one-off lines and beats: beetleHint, beetlesDone, c7, resinOpen
    this.beatGap = 0; // Session 18 (Aaron): quiet seconds still owed before the next beat that comes by itself
    this.scopeAskDue = false; // Session 18: Wyatt's ask to look through the scope, waiting for a quiet moment
    this.burst = []; // Session 18 (Aaron): crates still to break in the beetles' burst: [{ index, in }]
    this.resinOpen = 0; // C-4's doors: 0 shut .. 1 open
    this.props?.setResinDoors(0);
    this.scratchIn = 2;
    this.beetles?.clear();
    for (let i = 0; i < this.crates.length; i++) this.props?.setCrate(i, false);
    for (const c of this.crateCols ?? []) c.off = false;
    this.climbs = 0;
    this.props?.setTaken('rounds', false);
    this.props?.setTaken('report', false);
    this.props?.setTaken('manifest', false);
    this.props?.setTaken('charge', false);
  }

  // The truck across the barricade's gap has a sure battery, no alarm (DESIGN: a jeep's battery).
  sureBattery() {
    if (!this.vehicles?.list || !this.data.trucks.length) return;
    const s = frameToWorld(this.frame, this.data.trucks[0].x, this.data.trucks[0].z);
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
    this.sureTruck = best;
  }

  // ---- what's solid ------------------------------------------------------------------------------

  line(grid, ax, az, bx, bz, t, base, top, blocksShots) {
    const a = frameToWorld(this.frame, ax, az);
    const b = frameToWorld(this.frame, bx, bz);
    const col = segmentCollider(a.x, a.z, b.x, b.z, t, base, top, blocksShots);
    col.glare = true;
    grid.insert(col);
    return col;
  }

  // A box w (across, local x) by d (along, local z) at (x, z) turned yaw degrees, base to top.
  block(grid, x, z, w, d, base, top, blocksShots, yaw = 0) {
    const a = (yaw * Math.PI) / 180;
    const long = d >= w;
    const half = Math.max(w, d) / 2 - Math.min(w, d) / 2;
    // The long axis in the frame: local z turns toward +x by yaw.
    const ux = long ? Math.sin(a) : Math.cos(a);
    const uz = long ? Math.cos(a) : -Math.sin(a);
    return this.line(grid, x - ux * half, z - uz * half, x + ux * half, z + uz * half, Math.min(w, d) / 2, base, top, blocksShots);
  }

  circle(grid, x, z, r, top) {
    const w = frameToWorld(this.frame, x, z);
    const y = this.ground.heightAt(w.x, w.z);
    grid.insert({ x: w.x, z: w.z, r, base: y - 1, top: y + top });
  }

  gy(x, z) {
    const w = frameToWorld(this.frame, x, z);
    return this.ground.heightAt(w.x, w.z);
  }

  buildColliders(grid) {
    const B = this.data.barricade;
    for (const p of B.pieces) {
      if (p.kind === 'sandbags') {
        const y = Math.min(this.gy(p.x0, B.z), this.gy(p.x1, B.z), this.gy((p.x0 + p.x1) / 2, B.z));
        this.line(grid, p.x0, B.z, p.x1, B.z, B.thickness / 2, y - 1, y + B.height, true);
      } else if (p.kind === 'fence') {
        const [b0, b1] = [Math.min(...p.breach), Math.max(...p.breach)];
        const y = Math.min(this.gy(p.x0, B.z), this.gy(p.x1, B.z));
        const [lo, hi] = [Math.min(p.x0, p.x1), Math.max(p.x0, p.x1)];
        // Chain-link: solid, but shots go through; the torn panel's open.
        this.line(grid, lo, B.z, b0, B.z, 0.08, y - 1, y + 2.4, false);
        this.line(grid, b1, B.z, hi, B.z, 0.08, y - 1, y + 2.4, false);
      }
    }
    for (const [x, z] of B.lights) this.circle(grid, x, z, 0.35, 6);
    // Session 19: the working floodlights' poles, and the generator.
    for (const [x, z] of this.data.floods?.always ?? []) this.circle(grid, x, z, 0.35, 6);
    const gen = this.data.floods?.generator;
    if (gen) this.block(grid, gen.x, gen.z, 1.1, 0.7, this.gy(gen.x, gen.z) - 1, this.gy(gen.x, gen.z) + 1.0, true, gen.yaw ?? 0);
    // The watchtower's legs.
    const t = this.data.tower;
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) this.circle(grid, t.x + dx * t.legs, t.z + dz * t.legs, 0.25, t.height);
    // The gun pit's ring (its gap on the road side), the HALT sign's posts.
    const g = this.data.staging.gunPit;
    for (let a = 0; a < 300; a += 30) this.circle(grid, g.x + Math.sin((a * Math.PI) / 180) * g.r, g.z + Math.cos((a * Math.PI) / 180) * g.r, 0.35, 0.9);
    const h = this.data.staging.halt;
    this.circle(grid, h.x, h.z, 0.9, 2.2);
    // The tents (canvas: shots go through), the comms hut, the lockers.
    for (const tn of this.data.compound.tents) {
      const y = this.gy(tn.x, tn.z);
      this.block(grid, tn.x, tn.z, tn.d, tn.w, y - 1, y + 2.6, false, 0);
    }
    const c = this.data.compound.comms;
    const cy = this.gy(c.x, c.z);
    const top = cy + c.height + 0.4;
    this.line(grid, c.x + c.w / 2, c.z - c.d / 2, c.x + c.w / 2, c.z + c.d / 2, 0.1, cy - 1, top, true);
    this.line(grid, c.x - c.w / 2, c.z - c.d / 2, c.x + c.w / 2, c.z - c.d / 2, 0.1, cy - 1, top, true);
    this.line(grid, c.x - c.w / 2, c.z + c.d / 2, c.x + c.w / 2, c.z + c.d / 2, 0.1, cy - 1, top, true);
    this.block(grid, c.x + c.w / 2 - 0.5, c.z, 0.8, 1.8, cy - 1, cy + 0.8, false);
    this.circle(grid, c.mast[0], c.mast[1], 0.15, 7);
    const a = this.data.compound.armoury;
    this.block(grid, a.x, a.z, 0.6, 1.95, this.gy(a.x, a.z) - 1, this.gy(a.x, a.z) + 1.9, true);
    // The containers on their trailers (the torn one too: its bent side sticks out).
    for (const ct of this.data.compound.containers) {
      const y = OutpostProps.containerY(this.frame, this.ground, ct); // Session 19: level on its highest ground (C-7's on a slope)
      const wide = ct.kind === 'mothman' ? CONTAINER.width + 1.2 : CONTAINER.width + 0.1;
      this.block(grid, ct.x, ct.z, wide, CONTAINER.length + 0.6, y - 1, y + CONTAINER.deck + CONTAINER.height, true, ct.yaw);
    }
    this.crateCols = this.data.compound.crates.map(([x, z, yaw]) => {
      const y = this.gy(x, z);
      return this.block(grid, x, z, CRATE.w, CRATE.d, y - 1, y + CRATE.h, true, yaw);
    });
    const m = this.data.compound.manifest;
    this.block(grid, m.x, m.z, 0.7, 0.55, this.gy(m.x, m.z) - 1, this.gy(m.x, m.z) + 0.8, false, 20);
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

  get onTower() {
    return Boolean(this.player?.platform?.outpost);
  }

  get night() {
    const ph = this.clock?.phase;
    return ph === 'night' || ph === 'dusk';
  }

  get approachDone() {
    return this.helmetDone && this.wavesCleared >= this.oc.approach.waves.length;
  }

  // ---- each frame -----------------------------------------------------------------------------------

  update(dt, input, playing, canInteract) {
    this.props?.update(dt);
    if (!this.frame) return;
    this.updateFloods();
    if (!playing) {
      this.hud.prompt = '';
      return;
    }
    if (this.callIn >= 0) {
      this.callIn -= dt;
      if (this.callIn < 0) this.call();
    }
    const l = this.local();
    const d = Math.hypot(l.x, l.z);
    const called = this.progress?.has('outpostCall');
    // Session 17 (Aaron): while the witch is on Tom (story/WitchEscape.js), the outpost waits: no sweeps,
    // no cutscenes, no next wave or peak (the dogfight fired when he scoped her from the tower).
    this.witchOn = this.witchBusy?.() ?? false;
    if (called && !this.approachStarted && d < this.oc.approach.start && !this.witchOn) this.startApproach();
    if (!this.entered && d <= this.frame.radius - this.oc.arriveInset) this.enter();
    if (this.approachStarted) {
      this.updateWaves(dt, d);
      this.updatePeak(dt, l, d);
    }
    if (!this.cutscenes?.active && !this.talking()) this.beatGap = Math.max(0, this.beatGap - dt);
    this.updateScopeAsk();
    this.updateDogfight();
    this.updateSmoke();
    this.updateCompound(dt, l);
    this.updateTurret(dt);
    this.updateGeneratorHint();
    this.beetles?.update(dt, true);
    if (canInteract && input) this.updateInteraction(dt, input);
    else {
      this.hud.prompt = '';
      this.hud.progress = 0;
      this.hold.update(dt, null, false, 1);
    }
  }

  // ---- the call -----------------------------------------------------------------------------------------

  // Ellen's call to adventure (Aaron, Session 17: as soon as the safe opens; come home if it goes bad).
  call() {
    if (this.progress?.has('outpostCall')) return;
    this.progress?.setFlag('outpostCall');
    this.bus.emit('outpost:called');
    this.dialogue?.play('outpost.call.ellen');
    this.dialogue?.play('outpost.call.home');
    // Session 17 (Aaron: one idea at a time): Wyatt's word on the rounds comes on its own, later.
    this.dialogue?.playLater?.('outpost.call.wyatt', this.oc.callRoundsAfter, () => !this.roundsTaken);
  }

  // ---- the approach -------------------------------------------------------------------------------------

  startApproach() {
    this.approachStarted = true;
    this.bus.emit('outpost:approach');
    if (!this.helmetDone) this.sendHelmet();
    // The lines after it (Session 16 gotcha: a line inside a skipped cutscene is cleared).
    const lines = () => {
      this.dialogue?.play('outpost.arrive');
      this.dialogue?.play('outpost.helmet');
    };
    if (this.cutscenes && !this.cutscenes.active && this.cutscenes.play('sweep.outpost', { anchors: { outpost: frameAnchor(this.frame) }, onDone: lines })) return;
    lines();
  }

  // The first helmet: one army zombie standing on the road, looking up it.
  sendHelmet() {
    if (!this.enemies) return;
    const h = this.data.firstHelmet;
    const w = frameToWorld(this.frame, h.x, h.z);
    const z = this.enemies.spawnZombie(w.x, w.z, { variant: 'army', mode: 'linger', linger: { ...w, r: 1.2 }, facing: frameYaw(this.frame, h.yaw), authored: 'outpost' });
    this.wave = z ? [z] : [];
    this.waveOut = 'helmet';
    this.waveAge = -1e9; // the first helmet waits for him, however long
    if (!z) this.helmetDone = true;
  }

  // The next wave: `count` army zombies standing up ahead of Tom, toward the barricade, coming at him.
  sendWave(index) {
    const a = this.oc.approach;
    const count = Math.round(a.waves[index] * (this.night ? a.nightScale : 1));
    const p = this.player.position;
    let dx = this.gapAt.x - p.x;
    let dz = this.gapAt.z - p.z;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len;
    dz /= len;
    const ahead = Math.min(a.spawnAhead, len + 14); // never far past the barricade
    const out = [];
    for (let i = 0; i < count && this.enemies; i++) {
      const side = this.waveRng.range(-a.spread, a.spread);
      const fwd = ahead + this.waveRng.range(-5, 5);
      let x = p.x + dx * fwd - dz * side;
      let z = p.z + dz * fwd + dx * side;
      // Not past the cordon.
      const f = this.frame;
      const lz = (x - f.x) * f.fx + (z - f.z) * f.fz;
      if (lz > 27) {
        x -= f.fx * (lz - 27);
        z -= f.fz * (lz - 27);
      }
      const zb = this.enemies.spawnZombie(x, z, { variant: 'army', mode: 'chase', authored: 'outpost', facing: Math.atan2(p.x - x, p.z - z) });
      if (!zb) continue;
      this.enemies.brain.chase(zb, p.x, p.z, a.memory);
      out.push(zb);
    }
    this.wave = out;
    this.waveOut = index;
    this.waveAge = 0;
    this.bus.emit('outpost:wave', { index });
    if (!out.length) this.waveDown();
  }

  updateWaves(dt, d) {
    if (this.peakState !== 'none') return;
    const a = this.oc.approach;
    if (this.waveOut !== null) {
      this.wave = this.wave.filter((z) => z.alive);
      // Session 17 (Aaron: the fight dragged on): a retreat no longer sends the wave again on his return
      // (the ones out followed him: that doubled it). A wave that's lost him, or gone on too long, counts as down.
      this.waveAge += dt;
      this.dropLost(this.wave, d);
      if (!this.wave.length || this.waveAge > a.waveTimeout) {
        for (const z of this.wave) z.authored = null;
        this.waveDown();
      }
      return;
    }
    if (this.approachDone) {
      // The radio suggests the gun pit's rounds (DESIGN edge case: the barricade's hard without them).
      if (!this.roundsTaken && !this.towerTold) {
        this.towerTold = true;
        this.dialogue?.play('outpost.tower');
      }
      return;
    }
    if (d > a.start || this.witchOn) return; // away, or the witch is on him: the next waits
    if (this.lull > 0) {
      if (!this.cutscenes?.active) this.lull -= dt;
      return;
    }
    if (this.cutscenes?.active) return;
    if (!this.helmetDone) this.sendHelmet();
    else this.sendWave(this.wavesCleared);
  }

  // Back near the outpost, the wave's (or the peak's) ones still out far off, having lost him, are strays now.
  dropLost(list, d) {
    if (d > this.oc.approach.start) return;
    const f = this.frame;
    for (let i = list.length - 1; i >= 0; i--) {
      const z = list[i];
      if (Math.hypot(z.x - f.x, z.z - f.z) > this.oc.approach.lostAt && z.mode !== 'chase') {
        z.authored = null;
        list.splice(i, 1);
      }
    }
  }

  waveDown() {
    const was = this.waveOut;
    this.waveOut = null;
    this.wave = [];
    this.lull = this.oc.approach.lull;
    if (was === 'helmet') {
      this.helmetDone = true;
      this.dialogue?.play('outpost.helmetDown');
      // Session 18 (Aaron): the rounds are in the gun pit: Wyatt wonders if the machine gun takes Earl's rifle's.
      this.dialogue?.playLater?.('outpost.gunPitAsk', this.oc.gunPitAskAfter, () => !this.roundsTaken);
      return;
    }
    this.wavesCleared = Math.max(this.wavesCleared, was + 1);
    this.bus.emit('outpost:waveDown', { index: was });
    const lines = [['outpost.lull1'], ['outpost.lull2', 'outpost.lull2b'], ['outpost.lull3']][was] ?? [];
    for (const id of lines) this.dialogue?.play(id);
  }

  onKilled(zombie) {
    if (zombie?.authored !== 'outpost') return;
    const i = this.wave.indexOf(zombie);
    if (i >= 0) this.wave.splice(i, 1);
    const j = this.peak.indexOf(zombie);
    if (j >= 0) this.peak.splice(j, 1);
  }

  // ---- the barricade's peak -----------------------------------------------------------------------

  // How far Tom is short of the barricade line (negative once he's past it).
  toLine(l = this.local()) {
    return this.data.barricade.z - l.z;
  }

  updatePeak(dt, l, d) {
    const pk = this.oc.peak;
    if (this.peakState === 'none') {
      const toLine = this.toLine(l);
      const near = Math.abs(l.x) < 40 && toLine < pk.trigger;
      // Session 18 (Aaron): the dogfight comes last now (after the compound), so the peak doesn't wait for it.
      const free = true;
      const ready =
        free &&
        ((this.approachDone && this.roundsTaken && near) || (this.approachDone && toLine < pk.trigger * 0.45 && Math.abs(l.x) < 40) || (toLine < pk.rush && Math.abs(l.x) < 40));
      if (ready && !this.cutscenes?.active && !this.witchOn) this.startPeak();
      return;
    }
    if (this.peakState !== 'running') return;
    this.peak = this.peak.filter((z) => z.alive);
    // Session 17: no reset on a retreat (the ones out follow him; sending them again doubled the fight).
    this.dropLost(this.peak, d);
    if (this.peakLeft > 0) {
      this.burstTimer -= dt;
      if (this.burstTimer <= 0) this.sendBurst();
      return;
    }
    if (!this.peak.length) this.peakDown();
  }

  startPeak() {
    this.peakState = 'running';
    // Whatever's left of the approach is part of it now.
    if (this.waveOut !== null) {
      this.peak.push(...this.wave);
      this.wave = [];
      this.waveOut = null;
    }
    this.helmetDone = true;
    this.wavesCleared = this.oc.approach.waves.length;
    const pk = this.oc.peak;
    this.peakLeft = Math.round(pk.count * (this.night ? pk.nightScale : 1));
    this.peakPer = Math.ceil(this.peakLeft / Math.max(1, pk.bursts));
    this.burstTimer = 0;
    this.spots = [...this.data.peak];
    for (let i = this.spots.length - 1; i > 0; i--) {
      const j = this.waveRng.int(0, i);
      [this.spots[i], this.spots[j]] = [this.spots[j], this.spots[i]];
    }
    this.spotIndex = 0;
    this.bus.emit('outpost:peak');
    this.dialogue?.play('outpost.peak');
    this.sendBurst();
  }

  sendBurst() {
    const pk = this.oc.peak;
    const n = Math.min(this.peakLeft, this.peakPer);
    const p = this.player.position;
    for (let i = 0; i < n && this.enemies; i++) {
      const [x, z] = this.spots[this.spotIndex++ % this.spots.length];
      const w = frameToWorld(this.frame, x + this.waveRng.range(-0.8, 0.8), z + this.waveRng.range(-0.8, 0.8));
      const zb = this.enemies.spawnZombie(w.x, w.z, { variant: 'army', mode: 'chase', authored: 'outpost', facing: Math.atan2(p.x - w.x, p.z - w.z) });
      this.peakLeft--;
      if (!zb) continue;
      this.enemies.brain.chase(zb, p.x, p.z, pk.memory);
      this.peak.push(zb);
    }
    this.burstTimer = pk.burstEvery;
  }

  peakDown() {
    this.peakState = 'done';
    this.progress?.setFlag('outpostCleared');
    this.bus.emit('outpost:cleared');
    this.dialogue?.play('outpost.cleared.ellen');
    this.dialogue?.play('outpost.cleared.wyatt');
    this.beat();
    // Session 19 round 3: the compound's beats in any order (the dogfight's ready now); Wyatt's ask to
    // look through the scope still waits for the beetles to be down, as a nudge, not a gate.
    if (this.told.has('beetlesDone') && !this.dogfightSeen) this.scopeAskDue = true;
  }

  // ---- pacing (Session 18, Aaron: "they're just not getting time to breathe") ---------------------------

  // Someone's talking (a line showing, or one waiting on the radio).
  talking() {
    const d = this.dialogue;
    return Boolean(d?.subtitles?.busy || d?.pending?.length);
  }

  // Session 19 round 3 (Aaron: the compound's beats come in any order): the dogfight is ready once
  // the barricade's down (Session 18 held it until the beetles were down too).
  get dogfightReady() {
    return this.peakState === 'done';
  }

  // A beat's just happened: the next one that comes by itself waits.
  beat() {
    this.beatGap = this.oc.beatGap;
  }

  // Quiet enough for the next beat that comes by itself.
  quiet() {
    return this.beatGap <= 0 && !this.cutscenes?.active && !this.talking() && !this.witchOn;
  }

  updateScopeAsk() {
    if (!this.scopeAskDue) return;
    if (this.dogfightSeen) {
      this.scopeAskDue = false;
      return;
    }
    if (!this.quiet() || this.onTower || this.inCombat()) return;
    this.scopeAskDue = false;
    this.dialogue?.play('outpost.scope');
    this.beat();
  }

  // Tom's inside the outpost's clearing (outpostEntered).
  enter() {
    this.entered = true;
    this.progress?.setFlag('outpostEntered');
  }

  // ---- the dogfight (pass 3) ------------------------------------------------------------------------------

  // Where the two come down: the map's crashed plane and crashed UFO (Aaron:
  // in the right spot with the map). A stand-in point if one isn't on the map.
  crashSites() {
    const map = this.world.map;
    const f = this.frame;
    const find = (key) => map.clearings.find((c) => c.key === key);
    const site = (c, dx, dz) => (c ? { x: c.x, z: c.z, real: true } : { x: f.x + dx, z: f.z + dz, real: false });
    return { plane: site(find('crashedPlane'), -200, 380), ufo: site(find('crashedUfo'), -300, 850) };
  }

  // The tower's top: where the dogfight's seen from.
  towerEye() {
    return { x: this.towerAt.x, z: this.towerAt.z, y: this.towerY };
  }

  // The cutscene's anchors from an eye ({ x, z, y: what it stands on }): dogfight
  // (the eye, facing the plane's crash), fight (out along that line, its
  // heights from the eye's ground), planeCrash and ufoCrash (facing away from
  // the eye). An anchor's ahead is (-sin yaw, -cos yaw).
  dogfightAnchors(eye) {
    const { plane, ufo } = this.sites ?? this.crashSites();
    const g = this.ground;
    const yawTo = (to) => Math.atan2(-(to.x - eye.x), -(to.z - eye.z));
    const dp = Math.hypot(plane.x - eye.x, plane.z - eye.z) || 1;
    const df = Math.max(150, Math.min(340, dp * 0.6));
    const fight = { x: eye.x + ((plane.x - eye.x) / dp) * df, z: eye.z + ((plane.z - eye.z) / dp) * df };
    const ground = g.heightAt(eye.x, eye.z);
    return {
      dogfight: { x: eye.x, z: eye.z, yaw: yawTo(plane), dy: eye.y - ground },
      fight: { ...fight, yaw: yawTo(plane), dy: ground - g.heightAt(fight.x, fight.z) },
      planeCrash: { x: plane.x, z: plane.z, yaw: yawTo(plane) },
      ufoCrash: { x: ufo.x, z: ufo.z, yaw: yawTo(ufo) },
    };
  }

  // The first time the scope's raised up the tower (Session 17, Aaron: only there; no more crossing the
  // barricade). Up there without it seen, a hint says how; after the fight, Wyatt asks him to look.
  updateDogfight() {
    if (this.dogfightSeen || !this.cutscenes || this.cutscenes.active || this.witchOn || !this.dogfightReady) return;
    const w = this.combat?.weapons;
    if (!this.onTower) {
      this.scopeHinted = false;
      return;
    }
    if (w?.id === 'sniper' && w.scoped > 0.7) {
      this.playDogfight();
      return;
    }
    if (!this.scopeHinted && this.combat?.weapons?.order?.includes('sniper')) {
      this.scopeHinted = true;
      this.hint?.(w?.id === 'sniper' ? 'LT: look through the scope' : 'Y: the hunting rifle, then LT: look through its scope', w?.id === 'sniper' ? 'Right click: look through the scope' : 'Switch to the hunting rifle, then right click: look through its scope');
    }
  }

  playDogfight() {
    this.dogfightSeen = true;
    const p = this.player.position;
    const eye = this.onTower ? this.towerEye() : { x: p.x, z: p.z, y: this.ground.heightAt(p.x, p.z) };
    const after = () => {
      this.dialogue?.play('outpost.dogfight.after');
      this.beat();
      this.bus.emit('outpost:dogfight');
    };
    if (!this.cutscenes?.play('clip.dogfight', { anchors: this.dogfightAnchors(eye), onDone: after })) after();
  }

  // Smoke over each crash site once they've come down, until Tom gets there.
  updateSmoke() {
    if (!this.props) return;
    const p = this.player.position;
    ['plane', 'ufo'].forEach((key, i) => {
      const s = this.sites[key];
      if (this.dogfightSeen && !this.sitesReached.has(key) && Math.hypot(p.x - s.x, p.z - s.z) < 40) this.sitesReached.add(key);
      this.props.setCrashSmoke(i, this.dogfightSeen && !this.sitesReached.has(key) && !(this.cutscenes?.active && this.cutscenes.current?.id === 'clip.dogfight'));
    });
  }

  // ---- the compound (pass 4) -----------------------------------------------------------------------------

  updateCompound(dt, l) {
    const p = this.player.position;
    const dist = (q) => Math.hypot(p.x - q.x, p.z - q.z);
    const busy = this.peakState === 'running' || this.cutscenes?.active || this.witchOn;
    // DESIGN: at least one crate breaks open on its own as Tom passes, so the beetles' fight always happens.
    // Session 18 (Aaron, after playing it): coming near the crates, one breaks open by itself; the second
    // one Tom opens (shot, blown or prised) sets the rest off together, a second or two apart.
    if (!this.autoBroken && !busy && !this.onTower && this.toLine(l) < -3) {
      let near = -1;
      let nearD = this.oc.crates.autoBreak;
      this.crateAt.forEach((c, i) => {
        const d = dist(c);
        if (this.crates[i] === 'whole' && d < nearD) {
          near = i;
          nearD = d;
        }
      });
      if (near >= 0) this.breakCrate(near);
    }
    if (this.burst.length) {
      for (const b of this.burst) b.in -= dt;
      const due = this.burst.filter((b) => b.in <= 0);
      this.burst = this.burst.filter((b) => b.in > 0);
      for (const b of due) this.breakCrate(b.index, true);
    }
    // The Mothman's container (C-7): the first time Tom comes to its torn-open end.
    // Session 17 (Aaron): not mid-fight. Session 18: not over someone talking either (it's by the road in now).
    // Session 18 (Aaron): not from the quad, and not with more than a couple of the dead about.
    // Session 21 (Aaron): once Tom's been there it's off the map, even if its sweep has to wait.
    if (!this.told.has('c7Visited') && dist(this.c7At) < this.oc.c7Distance) this.told.add('c7Visited');
    if (!this.told.has('c7') && !busy && !this.player.riding && this.nearCount() <= this.oc.c7MaxNear && !this.talking() && dist(this.c7At) < this.oc.c7Distance) this.playC7();
    // C-4's doors swinging open (the reveal).
    if (this.resinOpen < 1 && this.told.has('resinOpen')) {
      this.resinOpen = Math.min(1, this.resinOpen + dt / this.oc.resinOpenSeconds);
      this.props?.setResinDoors(easeOut(this.resinOpen));
    }
    // Scratching inside the crates still whole.
    this.scratchIn -= dt;
    if (this.scratchIn <= 0) {
      this.scratchIn = 2.4 + Math.random() * 2;
      const spots = this.crateAt.filter((_, i) => this.crates[i] === 'whole');
      const s = spots.find((q) => dist(q) < this.oc.crates.hearScratch);
      if (s) this.combat?.sfx?.play('scratch', s);
    }
    // Every beetle let out is down.
    const out = this.beetles?.list ?? [];
    // (Session 18: and none still to come out of a crate.)
    if (out.length && !this.burst.length && !this.crates.includes('whole') && !this.told.has('beetlesDone') && out.every((b) => !b.alive)) {
      this.told.add('beetlesDone');
      this.dialogue?.play('outpost.beetles.done');
      this.beat();
      if (this.dogfightReady && !this.dogfightSeen) this.scopeAskDue = true; // Session 18: the last beat's next
    }
  }

  // Session 17: is a fight on round Tom (any of the outpost's dead or a beetle close, alive)?
  inCombat() {
    const p = this.player.position;
    const r = this.oc.combatRange;
    const near = (z) => z.alive && Math.hypot(z.x - p.x, z.z - p.z) < r;
    return this.enemies?.living?.some(near) || this.beetles?.list.some(near);
  }

  // Session 18: how many of the dead (or beetles) are alive within combatRange of Tom.
  nearCount() {
    const p = this.player.position;
    const r = this.oc.combatRange;
    const near = (z) => z.alive && Math.hypot(z.x - p.x, z.z - p.z) < r;
    return (this.enemies?.living?.filter(near).length ?? 0) + (this.beetles?.list.filter(near).length ?? 0);
  }

  // A round's impact inside a crate's box breaks it.
  crateShot(x, y, z) {
    this.crateAt?.forEach((c, i) => {
      if (this.crates[i] !== 'whole') return;
      if (Math.hypot(x - c.x, z - c.z) < 0.95 && y < c.y + 1.3) this.breakCrate(i);
    });
  }

  crateBlast(x, z, radius = 6) {
    this.crateAt?.forEach((c, i) => {
      if (this.crates[i] === 'whole' && Math.hypot(x - c.x, z - c.z) < radius + 0.7) this.breakCrate(i);
    });
  }

  // Open: the slats split, and its beetle claws its way out, facing Tom.
  breakCrate(i, fromBurst = false) {
    if (this.crates[i] !== 'whole') return;
    this.crates[i] = 'broken';
    this.autoBroken = true; // one's open: none breaks by itself now
    // Session 18 (Aaron): the second crate opened sets off all the rest.
    if (!fromBurst && !this.told.has('beetleBurst') && this.crates.filter((c) => c === 'broken').length >= 2) this.startBurst();
    this.props?.setCrate(i, true);
    if (this.crateCols?.[i]) this.crateCols[i].off = true;
    const c = this.crateAt[i];
    this.combat?.sfx?.play('crateBreak', c);
    const p = this.player.position;
    this.beetles?.spawn(c.x, c.z, Math.atan2(p.x - c.x, p.z - c.z));
    this.bus.emit('outpost:crate', { index: i });
    if (!this.told.has('crate')) {
      this.told.add('crate');
      this.dialogue?.play('outpost.crate');
    }
  }

  // Every crate still whole breaks open, nearest first, a second or two apart.
  startBurst() {
    this.told.add('beetleBurst');
    const cc = this.oc.crates;
    const p = this.player.position;
    const order = this.crateAt
      .map((c, i) => ({ i, d: Math.hypot(c.x - p.x, c.z - p.z) }))
      .filter((e) => this.crates[e.i] === 'whole')
      .sort((a, b) => a.d - b.d);
    let t = cc.stagger[0];
    this.burst = order.map((e, k) => {
      if (k > 0) t += cc.stagger[0] + Math.random() * (cc.stagger[1] - cc.stagger[0]);
      return { index: e.i, in: t };
    });
    if (this.burst.length) this.dialogue?.play('outpost.crates.burst');
  }

  // Session 17 (Aaron): haul C-4's doors open: they swing out, and the camera turns onto what's inside.
  openResin() {
    if (this.told.has('resinOpen')) return;
    this.told.add('resinOpen');
    this.resinOpen = 0;
    this.combat?.sfx?.play('door', this.resinDoorAt);
    this.bus.emit('outpost:resin');
    const lines = () => {
      this.dialogue?.play('outpost.resin.wyatt');
      this.dialogue?.play('outpost.resin.ellen');
      this.beat();
    };
    if (!this.cutscenes?.play('outpost.resin', { onDone: lines })) lines();
  }

  playC7() {
    this.told.add('c7');
    this.bus.emit('outpost:c7');
    const lines = () => {
      this.dialogue?.play('outpost.c7.wyatt');
      this.dialogue?.play('outpost.c7.ellen');
      this.beat();
      // Session 18: on the road in, mid-approach: the next wave waits for its lines.
      if (this.peakState === 'none' && !this.approachDone) this.lull = Math.max(this.lull, this.oc.c7Lull);
    };
    if (!this.cutscenes?.play('sweep.outpostC7', { onDone: lines })) lines();
  }

  // ---- the gun pit's machine gun (Session 17, Aaron) ---------------------------------------------------

  turretAt() {
    const g = this.data.staging.gunPit;
    const w = frameToWorld(this.frame, g.x, g.z);
    return { ...w, y: this.gy(g.x, g.z) + 0.9 };
  }

  fitTurret() {
    if (this.turret.state !== 'dead' || !this.combat?.inventory?.useBattery()) return;
    const tc = this.oc.turret;
    this.turret.state = 'live';
    this.turret.rounds = tc.rounds;
    this.turret.timer = 0.6;
    this.combat?.sfx?.play('battery');
    this.combat?.sfx?.play('turretTurn', this.turretAt());
    this.bus.emit('outpost:turret', { state: 'live' });
    this.dialogue?.play('outpost.turret.on');
  }

  updateTurret(dt) {
    const t = this.turret;
    const tc = this.oc.turret;
    // The first time Tom's at the dead gun: Wyatt says what would wake it.
    if (t.state === 'dead' && !this.told.has('turretHint') && !this.witchOn) {
      const at = this.turretAt();
      const p = this.player.position;
      if (Math.hypot(p.x - at.x, p.z - at.z) < tc.fitRange + 1) {
        this.told.add('turretHint');
        this.dialogue?.play('outpost.turret.hint');
      }
    }
    t.kick = Math.max(0, t.kick - dt * 8);
    if (t.state === 'live') {
      const at = this.turretAt();
      // The nearest of the dead in range, held while it lives.
      if (!t.target?.alive || Math.hypot(t.target.x - at.x, t.target.z - at.z) > tc.range) {
        t.target = null;
        let best = tc.range;
        for (const z of this.enemies?.living ?? []) {
          const d = Math.hypot(z.x - at.x, z.z - at.z);
          if (d < best) {
            best = d;
            t.target = z;
          }
        }
      }
      t.timer -= dt;
      if (t.target) {
        const want = Math.atan2(t.target.x - at.x, t.target.z - at.z);
        let d = want - t.yaw;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        t.yaw += Math.max(-tc.turnRate * dt, Math.min(tc.turnRate * dt, d));
        if (Math.abs(d) < tc.aimed && t.timer <= 0) this.turretFire(at);
      }
      if (t.rounds <= 0) {
        t.state = 'hot';
        t.timer = tc.overheat;
        this.bus.emit('outpost:turret', { state: 'hot' });
        this.dialogue?.play('outpost.turret.hot');
      }
    } else if (t.state === 'hot') {
      t.timer -= dt;
      if (Math.random() < dt * 6) this.combat?.fx?.dust?.(this.turretAt().x, this.turretAt().y + 0.3, this.turretAt().z);
      if (t.timer <= 0) this.turretBlow();
    }
    this.props?.setTurret(t.state, t.yaw, t.kick, t.state === 'hot' && Math.floor(t.timer * 6) % 2 === 0);
  }

  turretFire(at) {
    const t = this.turret;
    const tc = this.oc.turret;
    const z = t.target;
    t.rounds--;
    t.timer = tc.every;
    t.kick = 1;
    const muzzle = { x: at.x + Math.sin(t.yaw) * 1.2, y: at.y + 0.1, z: at.z + Math.cos(t.yaw) * 1.2 };
    this.combat?.fx?.muzzleFlash?.(new Vector3(muzzle.x, muzzle.y, muzzle.z));
    this.combat?.sfx?.play('turret', at);
    const hit = { x: z.x, y: (z.y ?? 0) + 1.1, z: z.z };
    this.enemies.damage(z, tc.damage, 'body', { id: 'turret', stagger: 0.4, knockback: 0.6 }, hit, at);
  }

  turretBlow() {
    const at = this.turretAt();
    this.turret.state = 'spent';
    this.turret.target = null;
    this.bus.emit('outpost:turret', { state: 'spent' });
    if (this.explosives?.blast) this.explosives.blast(at.x, at.y - 0.9, at.z, { ...this.cfg.explosives, ...this.oc.turret.blast });
    else this.combat?.sfx?.play('explosion', at);
  }

  // ---- the watchtower -----------------------------------------------------------------------------------

  platform() {
    return { x: this.towerAt.x, z: this.towerAt.z, y: this.towerY, half: this.data.tower.half - 0.1, outpost: true };
  }

  climbUp() {
    const pl = this.platform();
    this.player.setPlatform(pl, pl.x, pl.z);
    this.player.yaw = Math.PI; // facing south, over the barricade
    this.player.pitch = -0.08;
    this.combat?.sfx?.play('climb');
    this.climbs++;
    this.bus.emit('outpost:climbed');
  }

  climbDown() {
    this.player.setPlatform(null, this.ladderAt.x, this.ladderAt.z);
    this.combat?.sfx?.play('climb');
  }

  // Session 18: where the hunting rifle's rounds sit, in the gun pit (its ammo box).
  roundsAt() {
    const g = this.data.staging.gunPit;
    const r = this.data.staging.gunPitRounds ?? { x: g.x + 1.0, z: g.z + 0.7 };
    return frameToWorld(this.frame, r.x, r.z);
  }

  takeRounds() {
    this.roundsTaken = true;
    this.props?.setTaken('rounds', true);
    const n = this.oc.tower.rounds;
    if (this.combat) {
      if (!this.combat.weapons.addAmmo('sniper', n)) this.combat.inventory.addAmmo('sniper', n);
      this.combat.hud.pickup(`+${n} hunting rifle rounds`);
      this.combat.sfx.play('pickup');
    }
    this.bus.emit('outpost:rounds');
    this.dialogue?.play('outpost.rounds');
  }

  // ---- the floodlights (Session 19, Aaron) ----------------------------------------------------------

  generatorAt() {
    const g = this.data.floods?.generator;
    return g ? frameToWorld(this.frame, g.x, g.z) : null;
  }

  // 0 by day .. 1 at night (the cutscene's hour while one plays).
  darkness() {
    const n = this.oc.look.floods?.night;
    if (!n) return 1;
    const h = this.cutscenes?.hour ?? this.clock?.hourOfDay ?? 0;
    const ease = (v) => Math.max(0, Math.min(1, v / n.ramp));
    if (h >= n.on) return ease(h - n.on);
    if (h < n.off) return ease(n.off - h);
    return 0;
  }

  // Session 19 round 3 (Aaron: the family should prompt it): the first time Tom's near the dark
  // generator, in a quiet-enough moment, Wyatt points it out.
  updateGeneratorHint() {
    const fl = this.oc.look.floods;
    if (this.floodsOn || this.told.has('generatorHint') || !fl || !this.approachStarted || this.witchOn || this.cutscenes?.active) return;
    const at = this.generatorAt();
    const p = this.player.position;
    if (!at || Math.hypot(p.x - at.x, p.z - at.z) > fl.hintRange) return;
    this.told.add('generatorHint');
    // Queued behind whatever's being said (one idea at a time), and dropped if the lights are on by then.
    this.dialogue?.playLater('outpost.floods.hint', 1.5, () => !this.floodsOn);
  }

  updateFloods() {
    if (!this.props?.updateFloods) return;
    const cam = this.cutscenes?.ownCamera ? this.cutscenes.camera.position : this.player?.camera?.position;
    this.props.updateFloods(cam, this.darkness());
  }

  fitGenerator() {
    if (this.floodsOn || !this.combat?.inventory?.useBattery()) return;
    this.floodsOn = true;
    this.props?.setFloodsOn(true);
    this.combat?.sfx?.play('battery');
    this.bus.emit('outpost:floods', { on: true });
    this.dialogue?.play('outpost.floods.on');
  }

  // ---- interactions ----------------------------------------------------------------------------------

  updateInteraction(dt, input) {
    this.device = input.activeDevice;
    const X = input.activeDevice === 'gamepad' ? 'X' : 'E';
    const best = this.pick(X);
    const key = best?.act ? best.key : null;
    const done = this.hold.update(dt, key, input.isDown('interact'), best?.seconds ?? 1);
    if (done && best?.act) best.act();
    this.hud.prompt = best ? (this.hold.active && best.busy ? best.busy : best.prompt) : '';
    this.hud.progress = this.hold.key !== null ? this.hold.progress : 0;
  }

  // The nearest thing to do: { key, prompt, busy, seconds, act } (act null: information only).
  pick(X) {
    const p = this.player.position;
    const dist = (q) => Math.hypot(p.x - q.x, p.z - q.z);
    const h = this.oc.hold;
    if (this.onTower) {
      return { key: 'tower-down', prompt: `Hold ${X}: climb down`, busy: 'Climbing down…', seconds: h.climb, act: () => this.climbDown() };
    }
    if (this.player.platform) return null;
    if (dist(this.ladderAt) < 1.3) return { key: 'tower-up', prompt: `Hold ${X}: climb the watchtower`, busy: 'Climbing…', seconds: h.climb, act: () => this.climbUp() };
    // Session 18 (Aaron): the hunting rifle's rounds are in the gun pit's ammo box now (not up the tower).
    if (!this.roundsTaken && dist(this.roundsAt()) < this.oc.interactRange + 0.6) return { key: 'rounds', prompt: `Hold ${X}: take the rounds from the gun's ammo box`, busy: 'Taking…', seconds: h.rounds, act: () => this.takeRounds() };
    // The gun pit's machine gun (Session 17).
    const tu = this.turretAt();
    if (this.turret.state === 'dead' && dist(tu) < this.oc.turret.fitRange) {
      if ((this.combat?.inventory?.batteries ?? 0) > 0) return { key: 'turret', prompt: `Hold ${X}: fit a battery to the machine gun`, busy: 'Wiring it in…', seconds: this.oc.turret.fitSeconds, act: () => this.fitTurret() };
      return { key: 'turret-info', prompt: "A machine gun on its mount, its battery dead. It'd take a car battery", act: null };
    }
    // Session 19 (Aaron): the generator by the barricade's floodlights.
    const ga = this.generatorAt();
    const fl = this.oc.look.floods;
    if (ga && !this.floodsOn && fl && dist(ga) < fl.fitRange) {
      if ((this.combat?.inventory?.batteries ?? 0) > 0) return { key: 'generator', prompt: `Hold ${X}: fit a battery to the generator`, busy: 'Wiring it in…', seconds: fl.fitSeconds, act: () => this.fitGenerator() };
      return { key: 'generator-info', prompt: "A generator for the floodlights, its battery flat. It'd take a car battery", act: null };
    }
    let best = null;
    let bestD = this.oc.interactRange;
    for (const pt of this.points) {
      if (this.searched.has(pt.id)) continue;
      const d = dist(pt);
      if (d < bestD) {
        best = pt;
        bestD = d;
      }
    }
    if (best) {
      const read = best.id === 'report' || best.id === 'manifest';
      return { key: best.id, prompt: `Hold ${X}: ${best.label}`, busy: read ? null : 'Searching…', seconds: read ? h.read : h.search, act: () => this.search(best) };
    }
    // C-4's doors, shut (Session 17: the reveal).
    if (!this.told.has('resinOpen') && dist(this.resinDoorAt) < this.oc.crates.pryRange + 0.4) return { key: 'resin', prompt: `Hold ${X}: haul the container's doors open`, busy: 'Hauling…', seconds: h.crate, act: () => this.openResin() };
    // A crate still whole: prise it open (something's scratching inside).
    for (let i = 0; i < (this.crateAt?.length ?? 0); i++) {
      if (this.crates[i] === 'whole' && dist(this.crateAt[i]) < this.oc.crates.pryRange) return { key: `crate${i}`, prompt: `Hold ${X}: prise the crate open`, busy: 'Prising…', seconds: h.crate, act: () => this.breakCrate(i) };
    }
    return null;
  }

  search(pt) {
    // Session 18 (Aaron): everything's searched once; the papers are taken (read them again from the ledger).
    this.searched.add(pt.id);
    switch (pt.id) {
      case 'armoury':
        this.takeCharge();
        break;
      case 'report':
        this.props?.setTaken('report', true);
        this.lore?.give('fieldReport');
        {
          const after = () => this.dialogue?.play('outpost.report');
          const read = () => {
            this.combat?.sfx?.play('paper');
            if (!this.paper?.open('fieldReport', { device: this.device, take: true, onClose: after })) after();
          };
          if (!this.card?.show('fieldReport', { read, keep: after }, this.device)) read(); // Session 20: its inspect card
        }
        break;
      case 'manifest':
        this.props?.setTaken('manifest', true);
        {
          const read = () => {
            this.combat?.sfx?.play('paper');
            if (!this.paper?.open('outpostManifest', { device: this.device, take: true, onClose: () => this.manifestRead() })) this.manifestRead();
          };
          if (!this.card?.show('outpostManifest', { read, keep: () => this.manifestRead() }, this.device)) read(); // Session 20: its inspect card
        }
        break;
      default:
        this.loot(pt);
    }
    this.bus.emit('outpost:searched', { id: pt.id });
  }

  manifestRead() {
    if (this.searched.has('manifestRead')) return;
    this.searched.add('manifestRead');
    this.lore?.give('outpostManifest'); // Session 17 (Aaron): taken: to the ledger, to read again
    this.dialogue?.play('outpost.manifest');
  }

  // The armoury: one explosive charge (DESIGN: guaranteed), and the dead quartermaster's rounds.
  takeCharge() {
    this.props?.setTaken('charge', true);
    const n = this.explosives?.give(1) ?? 0;
    if (n > 0) this.combat?.hud.pickup('An explosive charge (and its detonator)');
    else {
      // Carrying all he can: it stays in the locker.
      this.searched.delete('armoury');
      this.props?.setTaken('charge', false);
      this.notify?.("You can't carry another charge.");
      return;
    }
    this.combat?.sfx.play('pickup');
    this.dialogue?.play('outpost.charge');
  }

  loot(pt) {
    let any = false;
    for (const g of pt.gives ?? []) any = this.give(g.item, g.amount ?? 1, pt) || any;
    for (const { item, amount } of rollLoot(pt.loot ?? [], this.lootRng)) any = this.give(item, amount, pt) || any;
    if (!any) {
      this.combat?.hud.pickup('Nothing useful');
      this.combat?.sfx.play('denied');
    }
  }

  give(item, amount, pt) {
    if (!this.combat) return false;
    if (this.combat.takePickup(item, amount)) return true;
    this.combat.pickups?.drop(item, amount, pt.x, this.ground.heightAt(pt.x, pt.z), pt.z, 0);
    return true;
  }

  // ---- saving ------------------------------------------------------------------------------------------

  saveState() {
    return {
      approach: this.approachStarted,
      helmet: this.helmetDone,
      waves: this.wavesCleared,
      towerTold: this.towerTold,
      rounds: this.roundsTaken,
      dogfight: this.dogfightSeen,
      sites: [...this.sitesReached],
      peak: this.peakState === 'done' ? 'done' : 'none',
      entered: this.entered,
      searched: [...this.searched],
      crates: this.crates.map((c) => (c === 'broken' ? 1 : 0)),
      auto: this.autoBroken,
      told: [...this.told],
      floods: this.floodsOn, // Session 19
      turret: this.turret.state === 'dead' ? 'dead' : this.turret.state === 'spent' || this.turret.state === 'hot' ? 'spent' : `live:${this.turret.rounds}`,
    };
  }

  // A wave or the peak that was out isn't saved: it comes again as Tom comes back.
  loadState(d) {
    if (!d) return;
    this.reset();
    this.approachStarted = Boolean(d.approach);
    this.helmetDone = Boolean(d.helmet);
    this.wavesCleared = Math.max(0, Math.min(this.oc.approach.waves.length, d.waves | 0));
    this.towerTold = Boolean(d.towerTold);
    this.roundsTaken = Boolean(d.rounds);
    this.dogfightSeen = Boolean(d.dogfight);
    this.sitesReached = new Set(d.sites ?? []);
    this.peakState = d.peak === 'done' ? 'done' : 'none';
    this.entered = Boolean(d.entered);
    this.searched = new Set(d.searched ?? []);
    this.props?.setTaken('rounds', this.roundsTaken);
    this.props?.setTaken('report', this.searched.has('report'));
    this.props?.setTaken('manifest', this.searched.has('manifest'));
    this.props?.setTaken('charge', this.searched.has('armoury'));
    // Broken crates stay broken (their beetles aren't saved: gone into the woods, or down).
    (d.crates ?? []).forEach((b, i) => {
      if (!b || i >= this.crates.length) return;
      this.crates[i] = 'broken';
      this.props?.setCrate(i, true);
      if (this.crateCols?.[i]) this.crateCols[i].off = true;
    });
    this.autoBroken = Boolean(d.auto);
    this.told = new Set(d.told ?? []);
    this.resinOpen = this.told.has('resinOpen') ? 1 : 0;
    this.scopeAskDue = this.dogfightReady && !this.dogfightSeen; // Session 18
    const tu = String(d.turret ?? 'dead');
    if (tu === 'spent') this.turret.state = 'spent';
    else if (tu.startsWith('live:')) {
      this.turret.state = 'live';
      this.turret.rounds = Math.max(1, Number(tu.slice(5)) || 1);
    }
    this.props?.setTurret(this.turret.state, this.turret.yaw);
    this.props?.setResinDoors(this.resinOpen);
    this.floodsOn = Boolean(d.floods);
    this.props?.setFloodsOn(this.floodsOn);
  }

  // An older save with the rifle claimed but no call: make the call now.
  checkCall() {
    if (this.progress?.has('rifleClaimed') && !this.progress?.has('outpostCall')) this.callIn = 1;
  }

  // ---- debug -------------------------------------------------------------------------------------------

  addDebugItems(menu) {
    if (!this.frame) return;
    // Session 18 (Aaron): beetles anywhere, for testing.
    menu.category(DEBUG.zombies).addItem('Spawn 3 giant beetles near me', () => {
      const p = this.player.position;
      for (let i = 0; i < 3; i++) {
        const a = this.player.yaw + Math.PI + (i - 1) * 0.6;
        const x = p.x - Math.sin(this.player.yaw) * 8 + Math.cos(a) * 1.5;
        const z = p.z - Math.cos(this.player.yaw) * 8 - Math.sin(a) * 1.5;
        this.beetles?.spawn(x, z, Math.atan2(p.x - x, p.z - z));
      }
      this.notify?.('Three beetles, ahead of you');
    });
    const cat = menu.category(DEBUG.outpost);
    const f = this.frame;
    const tp = (x, z, facing, text) => () => {
      if (this.player.platform) this.player.setPlatform(null, this.player.position.x, this.player.position.z);
      const w = frameToWorld(f, x, z);
      this.player.teleport(w.x, w.z, facing);
      this.notify(text);
    };
    const south = Math.PI;
    cat.addItem(() => `Outpost: Ellen's call now (${this.progress?.has('outpostCall') ? 'made' : 'not yet'})`, () => this.call());
    cat.addItem('Outpost: teleport up the road (the approach)', tp(52, -36, Math.atan2(-0.84, 0.54) + Math.PI, 'On the road up to the outpost'));
    cat.addItem('Outpost: teleport to the watchtower', tp(this.data.tower.x, this.data.tower.z - this.data.tower.half - 1.4, south, 'At the foot of the watchtower'));
    cat.addItem('Outpost: teleport to the barricade (near side)', tp(2.2, this.data.barricade.z - 3, south, 'At the barricade'));
    cat.addItem('Outpost: teleport into the compound', tp(2, 14, south, 'In the compound'));
    cat.addItem('Outpost: skip the approach (waves done)', () => {
      for (const z of this.wave) if (z.alive) this.enemies.damage(z, 1e6, 'body', {}, z, z);
      this.wave = [];
      this.waveOut = null;
      this.approachStarted = true;
      this.helmetDone = true;
      this.wavesCleared = this.oc.approach.waves.length;
      this.notify('The approach is done');
    });
    cat.addItem('Outpost: start the barricade peak now', () => {
      this.approachStarted = true;
      if (this.peakState === 'none') this.startPeak();
    });
    cat.addItem('Outpost: the dogfight now (from where Tom is)', () => {
      this.dogfightSeen = false;
      this.playDogfight();
    });
    cat.addItem('Outpost: break a crate open (a beetle)', () => {
      const i = this.crates.indexOf('whole');
      if (i >= 0) this.breakCrate(i);
      else this.notify('Every crate is open');
    });
    cat.addItem("Outpost: the Mothman's container (C-7) now", () => this.playC7());
    cat.addItem('Outpost: open C-4 (the body in the resin) now', () => this.openResin());
    cat.addItem(() => `Outpost: the floodlights' generator: ${this.floodsOn ? 'on (select: off)' : 'off (select: fit a battery, gives one)'}`, () => {
      if (this.floodsOn) {
        this.floodsOn = false;
        this.props?.setFloodsOn(false);
        return;
      }
      this.combat?.inventory?.addBattery(1);
      this.fitGenerator();
    });
    cat.addItem('Outpost: teleport to the generator', () => {
      const g = this.generatorAt();
      if (g) this.player.teleport(g.x + 1.6, g.z, Math.atan2(1, 0));
    });
    cat.addItem('Outpost: the machine gun: fit a battery (gives one)', () => {
      this.combat?.inventory?.addBattery(1);
      if (this.turret.state !== 'dead') this.turret = { state: 'dead', rounds: 0, yaw: Math.PI, timer: 0, kick: 0, target: null };
      this.fitTurret();
    });
    cat.addItem('Outpost: teleport to the containers', tp(-8, 20, -Math.PI / 2, 'By the containers'));
    cat.addItem('Outpost: put the barricade wave down', () => {
      this.peakLeft = 0;
      for (const z of this.peak) if (z.alive) this.enemies.damage(z, 1e6, 'body', {}, z, z);
    });
    cat.addItem('Outpost: reset it (as Tom first finds it)', () => {
      for (const z of [...this.wave, ...this.peak]) if (z.alive) this.enemies.damage(z, 1e6, 'body', {}, z, z);
      if (this.onTower) this.climbDown();
      for (const b of this.beetles?.list ?? []) b.active = false;
      this.reset();
      this.notify('The outpost is as Tom first finds it (flags as they are)');
    });
  }

  overlayLine() {
    if (!this.frame) return '';
    const wave = this.waveOut === null ? '-' : `${this.waveOut}:${this.wave.filter((z) => z.alive).length}`;
    const crates = this.crates.filter((c) => c === 'whole').length;
    return `${this.beetles?.overlayLine() ?? ''} crates ${crates}/${this.crates.length} outpost ${this.approachStarted ? 'approach' : 'quiet'} helmet ${this.helmetDone ? 'down' : '-'} waves ${this.wavesCleared}/${this.oc.approach.waves.length} out ${wave} lull ${Math.max(0, this.lull).toFixed(0)} rounds ${this.roundsTaken ? 'taken' : '-'} peak ${this.peakState}${this.peakState === 'running' ? ` ${this.peak.length}+${this.peakLeft}` : ''}${this.onTower ? ' TOWER' : ''} searched ${this.searched.size}`;
  }

  dispose() {
    for (const off of this.unsubscribers ?? []) off();
    this.beetles?.dispose();
    this.props?.dispose();
  }
}

// 0..1 eased out (a heavy door, slowing as it swings wide).
function easeOut(t) {
  return 1 - (1 - t) * (1 - t) * (1 - t);
}
