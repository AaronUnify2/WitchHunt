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
//  6. The compound (pass 4): the containers, the beetles, the armoury's
//     charge, the field report, the manifest.
// Each beat happens once; it's saved (a wave out isn't: it comes again).
//
// Events: 'outpost:called', 'outpost:approach', 'outpost:wave' { index },
// 'outpost:waveDown' { index }, 'outpost:peak', 'outpost:cleared',
// 'outpost:climbed', 'outpost:rounds', 'outpost:dogfight', 'outpost:searched' { id }.

import outpostData from '../data/outpost.json';
import { frameToWorld, frameYaw, frameAnchor } from '../world/clearingFrame.js';
import { segmentCollider } from '../world/collision.js';
import { rollLoot } from '../combat/loot.js';
import { HoldAction } from '../player/HoldAction.js';
import { OutpostProps, CONTAINER, CRATE } from '../render/OutpostProps.js';
import { Rng } from '../core/Rng.js';
import { DEBUG } from '../debug/DebugMenu.js';

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
      this.props = new OutpostProps(this.oc.look, this.data, this.cfg.aliens?.grey);
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
    this.reset();
    this.sureBattery();
    this.unsubscribers = [
      this.bus.on('player:hurt', () => this.hold.interrupt()),
      this.bus.on('enemy:killed', ({ zombie }) => this.onKilled(zombie)),
      // Session 17 (Aaron): Ellen sends Tom the moment the safe opens.
      this.bus.on('story:flag', ({ id, on }) => {
        if (id === 'rifleClaimed' && on && !this.progress?.has('outpostCall')) this.callIn = 0.6;
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
    this.climbs = 0;
    this.props?.setTaken('rounds', false);
    this.props?.setTaken('report', false);
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
      const y = this.gy(ct.x, ct.z);
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
    if (called && !this.approachStarted && d < this.oc.approach.start) this.startApproach();
    if (!this.entered && d <= this.frame.radius - this.oc.arriveInset) this.enter();
    if (this.approachStarted) {
      this.updateWaves(dt, d);
      this.updatePeak(dt, l, d);
    }
    this.updateDogfight(l);
    this.updateSmoke();
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
    this.dialogue?.play('outpost.call.wyatt');
    this.dialogue?.play('outpost.call.home');
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
    this.bus.emit('outpost:wave', { index });
    if (!out.length) this.waveDown();
  }

  updateWaves(dt, d) {
    if (this.peakState !== 'none') return;
    const a = this.oc.approach;
    if (this.waveOut !== null) {
      this.wave = this.wave.filter((z) => z.alive);
      // Retreat (DESIGN edge case): back to the last wave cleared; these are strays now.
      if (d > a.retreat) {
        for (const z of this.wave) z.authored = null;
        this.wave = [];
        this.waveOut = null;
        this.lull = 0;
        return;
      }
      if (!this.wave.length) this.waveDown();
      return;
    }
    if (this.approachDone) {
      // The radio suggests the tower (DESIGN edge case: the barricade's hard without the rounds).
      if (!this.roundsTaken && !this.towerTold) {
        this.towerTold = true;
        this.dialogue?.play('outpost.tower');
      }
      return;
    }
    if (d > a.start) return; // away: the next waits for him
    if (this.lull > 0) {
      this.lull -= dt;
      return;
    }
    if (this.cutscenes?.active) return;
    if (!this.helmetDone) this.sendHelmet();
    else this.sendWave(this.wavesCleared);
  }

  waveDown() {
    const was = this.waveOut;
    this.waveOut = null;
    this.wave = [];
    this.lull = this.oc.approach.lull;
    if (was === 'helmet') {
      this.helmetDone = true;
      this.dialogue?.play('outpost.helmetDown');
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
      // Up the tower it waits for the scope's dogfight (pass 3), so it's seen first.
      const free = this.dogfightSeen || !this.onTower;
      const ready =
        free &&
        ((this.approachDone && this.roundsTaken && near) || (this.approachDone && toLine < pk.trigger * 0.45 && Math.abs(l.x) < 40) || (toLine < pk.rush && Math.abs(l.x) < 40));
      if (ready && !this.cutscenes?.active) this.startPeak();
      return;
    }
    if (this.peakState !== 'running') return;
    this.peak = this.peak.filter((z) => z.alive);
    if (d > this.oc.approach.retreat) {
      // Gone: it'll be there again when he's back.
      for (const z of this.peak) z.authored = null;
      this.peak = [];
      this.peakState = 'none';
      return;
    }
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

  // The first time the scope's raised up the tower; else crossing the barricade once the peak's down.
  updateDogfight(l) {
    if (this.dogfightSeen || !this.cutscenes || this.cutscenes.active) return;
    const w = this.combat?.weapons;
    if (this.onTower && w?.id === 'sniper' && w.scoped > 0.7) this.playDogfight();
    else if (!this.onTower && this.peakState === 'done' && this.toLine(l) < -1.5) this.playDogfight();
  }

  playDogfight() {
    this.dogfightSeen = true;
    const p = this.player.position;
    const eye = this.onTower ? this.towerEye() : { x: p.x, z: p.z, y: this.ground.heightAt(p.x, p.z) };
    const after = () => {
      this.dialogue?.play('outpost.dogfight.after');
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
      if (!this.roundsTaken) return { key: 'rounds', prompt: `Hold ${X}: take the hunting rifle rounds`, seconds: h.rounds, act: () => this.takeRounds() };
      return { key: 'tower-down', prompt: `Hold ${X}: climb down`, busy: 'Climbing down…', seconds: h.climb, act: () => this.climbDown() };
    }
    if (this.player.platform) return null;
    if (dist(this.ladderAt) < 1.3) return { key: 'tower-up', prompt: `Hold ${X}: climb the watchtower`, busy: 'Climbing…', seconds: h.climb, act: () => this.climbUp() };
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
    return null;
  }

  search(pt) {
    // The clipboard stays where it is (read it again any time); everything else is searched once.
    if (pt.id !== 'manifest') this.searched.add(pt.id);
    switch (pt.id) {
      case 'armoury':
        this.takeCharge();
        break;
      case 'report':
        this.props?.setTaken('report', true);
        this.lore?.give('fieldReport');
        this.combat?.sfx?.play('paper');
        if (!this.paper?.open('fieldReport', { device: this.device, onClose: () => this.dialogue?.play('outpost.report') })) this.dialogue?.play('outpost.report');
        break;
      case 'manifest':
        this.combat?.sfx?.play('paper');
        if (!this.paper?.open('outpostManifest', { device: this.device, onClose: () => this.manifestRead() })) this.manifestRead();
        break;
      default:
        this.loot(pt);
    }
    this.bus.emit('outpost:searched', { id: pt.id });
  }

  manifestRead() {
    if (this.searched.has('manifestRead')) return;
    this.searched.add('manifestRead');
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
    this.props?.setTaken('charge', this.searched.has('armoury'));
  }

  // An older save with the rifle claimed but no call: make the call now.
  checkCall() {
    if (this.progress?.has('rifleClaimed') && !this.progress?.has('outpostCall')) this.callIn = 1;
  }

  // ---- debug -------------------------------------------------------------------------------------------

  addDebugItems(menu) {
    if (!this.frame) return;
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
    cat.addItem('Outpost: put the barricade wave down', () => {
      this.peakLeft = 0;
      for (const z of this.peak) if (z.alive) this.enemies.damage(z, 1e6, 'body', {}, z, z);
    });
    cat.addItem('Outpost: reset it (as Tom first finds it)', () => {
      for (const z of [...this.wave, ...this.peak]) if (z.alive) this.enemies.damage(z, 1e6, 'body', {}, z, z);
      if (this.onTower) this.climbDown();
      this.reset();
      this.notify('The outpost is as Tom first finds it (flags as they are)');
    });
  }

  overlayLine() {
    if (!this.frame) return '';
    const wave = this.waveOut === null ? '-' : `${this.waveOut}:${this.wave.filter((z) => z.alive).length}`;
    return `outpost ${this.approachStarted ? 'approach' : 'quiet'} helmet ${this.helmetDone ? 'down' : '-'} waves ${this.wavesCleared}/${this.oc.approach.waves.length} out ${wave} lull ${Math.max(0, this.lull).toFixed(0)} rounds ${this.roundsTaken ? 'taken' : '-'} peak ${this.peakState}${this.peakState === 'running' ? ` ${this.peak.length}+${this.peakLeft}` : ''}${this.onTower ? ' TOWER' : ''} searched ${this.searched.size}`;
  }

  dispose() {
    for (const off of this.unsubscribers ?? []) off();
    this.props?.dispose();
  }
}
