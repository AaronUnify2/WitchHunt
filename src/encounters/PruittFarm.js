// The Pruitt farm (Round 2; Aaron's play-test of Nov 13: "A, with sigil elements"). The old storm
// shelter clearing east of home is Earl and Marcy's farmhouse now, and Day 3's road into the army's
// outpost runs through it.
//
//  1. The shut gate (after Ellen's call at Dawn 3). Tom takes the road past the gas station to the
//     military checkpoint's main gate: chained from the inside, nobody answers. The family remember a
//     back way: the Pruitts' bottom field backs onto the army's fence (farmCall: the farm's pipe gate
//     and the tear in the fence open). A nudge to search the sheriff's car if its pistol's still in it.
//     The clock goes on to late afternoon while they talk (a fade), then holds short of dusk until Tom
//     reaches the farm, so dusk falls there, with the moths, and night on the way to the outpost.
//  2. The farm (farmVisited): the porch light is on, off Earl's generator, and giant moths are thick on
//     the wall round it. Walk up and they come for him; shoot one from far off and most scatter and a
//     few come; or go round the side and shut the generator down: with no light they leave (unless
//     Tom's torch is on: then it's him they come to). Dead or gone: farmMothsDone.
//  3. The Mothman, briefly (mothmanGlimpsed): something huge in the dead oak across the yard, watching;
//     it throws its wings wide, screams and is gone. Those were its young.
//  4. The house: Marcy's journal on the kitchen table (she believed him; the family loved him), Earl's
//     shotgun on its pegs (shotgunFound: it used to be the campsite's), the pantry, and things that
//     only say something: the photographs, the children's drawings, Earl's map, the beds, the door
//     frame, the mailbox.
//  5. The family plot, down the track: what the witch buried there on Night 2 is still in the ground,
//     and more moths come to its glow as Tom reaches it. Dug up (the director's own dig), the way on
//     is the tear in the army's fence.
//
// The frame (PruittFarm.frame): walking in from home, x to the right, z ahead. Saved: story flags
// (farmCall, farmVisited, farmMothsDone, mothmanGlimpsed, marcyJournal, shotgunFound, plotMoths) and
// what's been looked at and searched, the generator's state. Off in Demo mode.
//
// Events: 'farm:gate', 'farm:arrived', 'farm:moths' { killed, fled }, 'farm:mothman', 'farm:journal', 'farm:shotgun'.

import * as THREE from 'three';
import farmData from '../data/pruittFarm.json';
import { clearingFrame, frameToWorld, frameAnchor } from '../world/clearingFrame.js';
import { toWorld } from '../world/CrashSite.js';
import { buildPruittFarm, FARM } from '../render/pruittFarmModel.js';
import { weatherFor } from '../render/propKit.js';
import { HoldAction } from '../player/HoldAction.js';
import { DEBUG } from '../debug/DebugMenu.js';

export const FARM_FLAGS = ['farmCall', 'farmVisited', 'farmMothsDone', 'mothmanGlimpsed', 'marcyJournal', 'plotMoths'];
const GROUP = 'porch';

// ---- the pure parts (tested) ----------------------------------------------------------------

// What the porch's moths do when something changes (pure). light: the porch light is on; torch: Tom's is;
// near: he's within wakeAt of the porch; shot: one of them was hit; far: he's beyond scatterBeyond.
// Returns null (they hang on), 'attack' (all come), 'scatter' (most flee, a few come) or 'leave' (all go).
export function porchMoths({ light, torch, near, shot, far }) {
  if (!light) return torch ? 'attack' : 'leave';
  if (shot) return far ? 'scatter' : 'attack';
  if (near) return 'attack';
  return null;
}

// Where the day's clock should stand once the family have talked at the gate (pure): `dayLeft` seconds
// short of dusk, never earlier than it is now.
export function afternoonAt(elapsed, daySeconds, dayLeft) {
  return Math.max(elapsed, daySeconds - dayLeft);
}

export class PruittFarm {
  constructor(cfg, bus, data = farmData) {
    this.cfg = cfg;
    this.fc = cfg.pruittFarm;
    this.bus = bus;
    this.data = data;
  }

  static frame(map) {
    return clearingFrame(map, 'pruittFarm', 'home');
  }

  // ctx: { world, player, combat, colliders, progress, dialogue, subtitles, cutscenes, clock, moths, flyer,
  // flashlight, lore, paper, card, gates, director, vehicles, demo, notify, skipToPhase }.
  init(scene, ctx) {
    Object.assign(this, ctx);
    this.ground = ctx.world.ground;
    this.frame = PruittFarm.frame(ctx.world.map);
    this.hud = { prompt: '', progress: 0 };
    this.hold = new HoldAction(this.cfg.station.hold.releaseDrain);
    this.hold.init();
    this.spots = {};
    if (!this.frame) return;
    const f = this.frame;
    this.place = { x: f.x, z: f.z, yaw: f.yaw };
    this.y = this.ground.heightAt(f.x, f.z);
    if (scene) {
      this.model = buildPruittFarm(this.fc, { weather: weatherFor(this.cfg.props.weather, this.fc.look.weather) });
      this.model.group.position.set(f.x, this.y, f.z);
      this.model.group.rotation.y = f.yaw;
      this.model.group.updateMatrixWorld(true);
      scene.add(this.model.group);
      for (const [name, s] of Object.entries(this.model.spots)) {
        const w = toWorld(this.place, s.x, s.z);
        this.spots[name] = { x: w.x, y: this.y + s.y, z: w.z };
      }
      this.colliderList = this.model.colliders.map((c) => {
        if (c.seg) {
          const a = toWorld(this.place, c.ax, c.az);
          const b = toWorld(this.place, c.bx, c.bz);
          return { seg: true, ax: a.x, az: a.z, bx: b.x, bz: b.z, t: c.t, x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, r: Math.hypot(b.x - a.x, b.z - a.z) / 2 + c.t, base: this.y - 1, top: this.y + c.top, blocksShots: c.blocksShots, what: 'pruittFarm' };
        }
        const w = toWorld(this.place, c.x, c.z);
        return { x: w.x, z: w.z, r: c.r, top: this.y + c.top, what: 'pruittFarm' };
      });
      for (const c of this.colliderList) this.colliders?.insert(c);
      // The two bulbs' light (the generator's): the porch, and over the kitchen table.
      const L = this.fc.light;
      this.lights = ['porchLight', 'bulb'].map((name) => {
        const light = new THREE.PointLight(L.color, L.intensity, L.distance, L.decay);
        const s = this.spots[name];
        light.position.set(s.x, s.y - 0.05, s.z);
        scene.add(light);
        return light;
      });
    }
    this.cutscenes?.namedAnchors?.set('pruittFarm', () => frameAnchor(this.frame));
    this.cutscenes?.namedAnchors?.set('mothmanSpot', () => {
      const s = this.spots.oakTop ?? { x: f.x, z: f.z };
      return { x: s.x, z: s.z, yaw: 0, dy: (s.y ?? this.y + 8) - this.ground.heightAt(s.x, s.z) - 0.6 };
    });
    this.unsubscribers = [
      this.bus.on('player:hurt', () => this.hold.interrupt()),
      this.bus.on('moths:roostHit', ({ group }) => group === GROUP && (this.shot = true)),
      this.bus.on('moths:killed', () => this.mothsOut && this.killed++),
      this.bus.on('farm:mantle', () => this.mantle()),
      this.bus.on('fade:mid', () => this.onFadeMid()),
    ];
    this.reset();
  }

  get ready() {
    return Boolean(this.frame);
  }

  has(flag) {
    return Boolean(this.progress?.has(flag));
  }

  set(flag) {
    this.progress?.setFlag(flag);
  }

  spot(name) {
    return this.spots[name] ?? (this.frame ? { x: this.frame.x, y: this.y, z: this.frame.z } : null);
  }

  reset() {
    this.gate = null; // the gate beat: { t, said }
    this.heldDay = 0;
    this.roosted = false;
    this.mothsOut = false; // ours are in the air
    this.shot = false;
    this.killed = 0;
    this.generatorOn = true;
    this.looked = new Set();
    this.searched = new Set();
    this.glimpse = null;
    this.plotSaid = false;
    this.device = 'gamepad';
    this.applyGenerator();
    if (this.model) {
      this.model.parts.journal.visible = !this.has('marcyJournal');
      this.model.parts.shotgun.visible = !this.has('shotgunFound');
    }
  }

  // ---- places ----------------------------------------------------------------------------------

  // The checkpoint's main gate on the road (where the shut gate's beat happens).
  get roadGate() {
    return this.gates?.list?.find((g) => g.id === 'outpostRoad') ?? null;
  }

  // The tear in the army's fence, down past the family plot.
  get rip() {
    return this.gates?.list?.find((g) => g.id === 'outpostSide') ?? null;
  }

  // The family plot's clearing, and what's buried in it.
  get plot() {
    return this.world.map.clearings.find((c) => c.cluster && c.key === 'familyCemetery') ?? null;
  }

  plotSigil() {
    const p = this.plot;
    if (!p) return null;
    return this.director?.sigils?.list.find((s) => Math.hypot(s.x - p.x, s.z - p.z) < p.radius + 6) ?? null;
  }

  // Tom's place in the farm's frame (x right, z ahead).
  local() {
    const p = this.player.position;
    const f = this.frame;
    const dx = p.x - f.x;
    const dz = p.z - f.z;
    return { x: dx * f.rx + dz * f.rz, z: dx * f.fx + dz * f.fz };
  }

  inHouse(l = this.local()) {
    const H = FARM.house;
    return l.x > H.x0 && l.x < H.x1 && l.z > H.z0 && l.z < H.z1;
  }

  // ---- each frame ------------------------------------------------------------------------------

  update(dt, input, playing, canInteract) {
    if (!this.ready || this.demo?.active) return;
    if (this.model) {
      const p = this.player.position;
      this.model.group.visible = Math.hypot(p.x - this.frame.x, p.z - this.frame.z) < (this.drawDistance?.() ?? 400) + this.fc.radius;
    }
    if (!playing) {
      this.hud.prompt = '';
      return;
    }
    this.updateGate(dt);
    this.updateClock(dt);
    const l = this.local();
    const d = Math.hypot(l.x, l.z);
    if (this.has('farmCall') || d < this.fc.radius) {
      if (!this.roosted && !this.has('farmMothsDone') && d < this.fc.mothsAt) this.roost();
      if (!this.has('farmVisited') && d < this.fc.radius - this.fc.arriveInset) this.arrive();
    }
    this.updateMoths(l);
    this.updateGlimpse(dt, l, d);
    this.updatePlot();
    if (canInteract && input) this.updateInteraction(dt, input);
    else {
      this.hud.prompt = '';
      this.hud.progress = 0;
      this.hold.update(dt, null, false, 1);
    }
  }

  // 1: the shut gate.
  updateGate(dt) {
    if (!this.has('outpostCall') || this.has('farmCall')) return;
    const g = this.roadGate;
    if (!g) return;
    const p = this.player.position;
    if (!this.gate) {
      if (Math.hypot(p.x - g.x, p.z - g.z) > this.fc.gate.near || this.cutscenes?.active) return;
      this.gate = { t: 0, faded: false };
      this.dialogue?.play('farm.gate.wyatt');
      this.dialogue?.play('farm.gate.ellen');
      this.dialogue?.play('farm.gate.back');
      this.bus.emit('farm:gate');
      return;
    }
    this.gate.t += dt;
    if (this.gate.t < this.fc.gate.talkMin || this.subtitles?.busy || this.dialogue?.pending?.length || this.cutscenes?.active) return;
    if (this.gate.fading) return;
    // The afternoon goes while they talk it over.
    this.gate.fading = true;
    const done = () => this.gateDone();
    if (this.clock.phase !== 'day' || !this.cutscenes?.play('fade.afternoon', { onDone: done })) done();
  }

  onFadeMid() {
    if (!this.gate?.fading || this.gate.faded) return;
    this.gate.faded = true;
    const c = this.clock;
    if (c.phase === 'day') c.phaseElapsed = afternoonAt(c.phaseElapsed, c.currentPhase.seconds, this.fc.clock.dayLeft);
  }

  gateDone() {
    if (this.has('farmCall')) return;
    this.onFadeMid();
    this.set('farmCall');
    // The sheriff's car, if its pistol's still in it.
    if (!this.combat?.weapons?.has?.('pistol') && this.vehicles?.list?.some((v) => v.gives && !v.searched?.door)) this.dialogue?.play('farm.gate.car');
  }

  // The day waits short of dusk for him to reach the farm (a while).
  updateClock(dt) {
    if (!this.has('farmCall') || this.has('farmVisited')) return;
    const c = this.clock;
    const k = this.fc.clock;
    if (c.phase !== 'day' || this.heldDay >= k.holdMax) return;
    const at = c.currentPhase.seconds - k.holdBeforeDusk;
    if (c.phaseElapsed > at) {
      this.heldDay += Math.min(dt, c.phaseElapsed - at);
      c.phaseElapsed = at;
    }
  }

  // 2: the farm.
  arrive() {
    this.set('farmVisited');
    this.bus.emit('farm:arrived');
    const lines = () => {
      this.dialogue?.play('farm.arrive.wyatt');
      this.dialogue?.play('farm.arrive.ellen');
    };
    if (this.has('farmMothsDone') || !this.cutscenes || this.cutscenes.active || !this.cutscenes.play('sweep.farm', { anchors: { pruittFarm: frameAnchor(this.frame) }, onDone: lines })) lines();
  }

  // The moths on the porch wall, round the light.
  roost() {
    this.roosted = true;
    if (!this.moths) return;
    const pts = this.data.roost.slice(0, this.fc.moths.count).map(([x, h, z, deg]) => {
      const w = frameToWorld(this.frame, x, z);
      return { x: w.x, y: this.y + h, z: w.z, facing: this.frame.yaw + (deg * Math.PI) / 180 };
    });
    const n = this.moths.roost(pts, GROUP);
    this.mothsOut = n > 0;
    this.killed = 0;
    this.roostCount = n;
    if (!n) this.mothsDone();
  }

  updateMoths(l) {
    if (!this.mothsOut || !this.moths) return;
    const m = this.fc.moths;
    const hanging = this.moths.roosting(GROUP);
    if (hanging > 0) {
      const porch = this.spots.porch ?? this.frame;
      const p = this.player.position;
      const d = Math.hypot(p.x - porch.x, p.z - porch.z);
      const what = porchMoths({ light: this.generatorOn, torch: Boolean(this.flashlight?.on), near: d < m.wakeAt, shot: this.shot, far: d > m.scatterBeyond });
      this.shot = false;
      if (what === 'attack') this.moths.wake(GROUP, false);
      else if (what === 'scatter') this.moths.wake(GROUP, true);
      else if (what === 'leave') {
        this.moths.wake(GROUP, true);
        for (const moth of this.moths.moths) if (moth.active && moth.group === GROUP && moth.state === 'fly') moth.state = 'leave';
      }
      if (what && !this.wokeSaid) {
        this.wokeSaid = true;
        this.dialogue?.play(what === 'leave' ? 'farm.moths.leave' : 'farm.moths.wake');
      }
      return;
    }
    // None hanging: over once the last of them is down or gone.
    if (!this.moths.moths.some((x) => x.active && x.group === GROUP && x.state !== 'corpse' && x.state !== 'dying')) this.mothsDone();
  }

  mothsDone() {
    if (this.has('farmMothsDone')) return;
    this.mothsOut = false;
    this.set('farmMothsDone');
    this.bus.emit('farm:moths', { killed: this.killed, fled: Math.max(0, (this.roostCount ?? 0) - this.killed) });
  }

  // 3: the Mothman in the oak, for a moment.
  updateGlimpse(dt, l, d) {
    if (this.glimpse) {
      this.glimpse.t += dt;
      if (this.glimpse.t > this.fc.glimpse.max) this.glimpseDone();
      return;
    }
    if (!this.has('farmMothsDone') || this.has('mothmanGlimpsed') || this.cutscenes?.active || this.subtitles?.busy) return;
    if (d > this.fc.glimpse.within || this.inHouse(l) || !this.flyer?.perch) {
      if (!this.flyer?.perch && !this.inHouse(l) && d <= this.fc.glimpse.within) this.glimpseDone();
      return;
    }
    const s = this.spot('oakTop');
    const p = this.player.position;
    this.flyer.perch({ x: s.x, y: s.y, z: s.z, facing: Math.atan2(p.x - s.x, p.z - s.z) }, 'perch');
    this.glimpse = { t: 0 };
    this.bus.emit('farm:mothman');
    if (!this.cutscenes?.play('farm.mothman', { onDone: () => this.glimpseDone() })) this.glimpseDone();
  }

  // Its wings thrown wide, the scream (the cutscene's emit).
  mantle() {
    if (!this.glimpse) return;
    this.flyer?.perch?.(null, 'mantle');
    this.combat?.sfx?.play('screech', this.spot('oakTop'));
    this.player.shake?.(0.3);
  }

  glimpseDone() {
    if (this.has('mothmanGlimpsed')) return;
    this.glimpse = null;
    this.flyer?.unperch?.();
    this.set('mothmanGlimpsed');
    this.dialogue?.play(this.killed > 0 ? 'farm.mothman.ellen' : 'farm.mothman.ellenFled');
  }

  // 5: the family plot: more of them to the sigil's glow, once.
  updatePlot() {
    if (!this.has('farmVisited') || this.has('plotMoths')) return;
    const s = this.plotSigil();
    if (!s) return;
    const p = this.player.position;
    if (Math.hypot(p.x - s.x, p.z - s.z) > this.fc.plot.near || this.clock.phase === 'day') return;
    this.set('plotMoths');
    if (this.moths && !this.moths.habitat) this.moths.send(this.fc.plot.moths);
    this.dialogue?.play('farm.plot.wyatt');
  }

  // ---- the generator and its lights ------------------------------------------------------------

  applyGenerator() {
    const on = this.generatorOn;
    for (const light of this.lights ?? []) light.visible = on;
    if (this.model) for (const k of ['porchBulb', 'innerBulb', 'yardBulb']) this.model.parts[k].visible = on;
  }

  switchGenerator() {
    this.generatorOn = !this.generatorOn;
    this.applyGenerator();
    this.combat?.sfx?.play(this.generatorOn ? 'battery' : 'denied', this.spot('generator'));
    this.notify?.(this.generatorOn ? "Earl's generator coughs and catches. The lights come up" : 'The generator dies. The porch light goes out');
  }

  // ---- interactions ----------------------------------------------------------------------------

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

  pick(X) {
    if (!this.model || this.player.riding) return null;
    const p = this.player.position;
    const dist = (name) => {
      const s = this.spots[name];
      return s ? Math.hypot(p.x - s.x, p.z - s.z) : Infinity;
    };
    const r = this.fc.interactRange;
    const h = this.fc.hold;
    if (dist('generator') < r + 0.3) return { key: 'generator', prompt: `Hold ${X}: ${this.generatorOn ? "shut Earl's generator down" : 'start the generator'}`, seconds: h.generator, act: () => this.switchGenerator() };
    if (!this.has('marcyJournal') && dist('journal') < r) return { key: 'journal', prompt: `Hold ${X}: take the journal from the table`, seconds: h.take, act: () => this.takeJournal() };
    if (!this.has('shotgunFound') && dist('shotgun') < r) return { key: 'shotgun', prompt: `Hold ${X}: take Earl's shotgun down`, seconds: h.take, act: () => this.takeShotgun() };
    for (const s of this.data.searches) {
      if (this.searched.has(s.id) || dist(s.spot) >= r) continue;
      return { key: s.id, prompt: `Hold ${X}: ${s.prompt}`, busy: 'Searching…', seconds: s.seconds ?? 1.2, act: () => this.search(s) };
    }
    for (const k of this.data.looks) {
      if (this.looked.has(k.id) || dist(k.spot) >= r) continue;
      return { key: k.id, prompt: `Hold ${X}: ${k.prompt}`, seconds: h.look, act: () => this.look(k) };
    }
    return null;
  }

  look(k) {
    this.looked.add(k.id);
    this.notify?.(k.text);
    this.bus.emit('farm:looked', { id: k.id });
  }

  search(s) {
    this.searched.add(s.id);
    const at = this.spots[s.spot];
    for (const g of s.gives ?? []) {
      if (!this.combat.takePickup(g.item, g.amount ?? 1)) this.combat.pickups.drop(g.item, g.amount ?? 1, at.x, this.ground.heightAt(at.x, at.z), at.z, 0);
    }
  }

  takeJournal() {
    this.set('marcyJournal');
    if (this.model) this.model.parts.journal.visible = false;
    this.lore?.give('marcyJournal');
    const after = () => {
      this.dialogue?.play('farm.journal.ellen');
      this.dialogue?.play('farm.journal.wyatt');
    };
    const read = () => {
      if (!this.paper?.open('marcyJournal', { device: this.device, take: true, onClose: after })) after();
    };
    if (!this.card?.show('marcyJournal', { read, keep: after }, this.device)) read();
    this.bus.emit('farm:journal');
  }

  takeShotgun() {
    this.set('shotgunFound');
    if (this.model) this.model.parts.shotgun.visible = false;
    this.combat.giveWeapon('shotgun', this.fc.shotgunShells);
    this.combat.hud?.pickup?.(`Earl's shotgun (+${this.combat.weapons.ammoRounds?.('shotgun') ?? this.fc.shotgunShells} shells)`);
    this.combat.sfx?.play('loaded');
    this.dialogue?.play('farm.shotgun.wyatt');
    this.bus.emit('farm:shotgun');
  }

  // ---- saving ----------------------------------------------------------------------------------

  saveState() {
    return { generator: this.generatorOn, looked: [...this.looked], searched: [...this.searched] };
  }

  loadState(d) {
    this.reset();
    if (!d) return;
    this.generatorOn = d.generator !== false;
    this.looked = new Set(d.looked ?? []);
    this.searched = new Set(d.searched ?? []);
    this.applyGenerator();
  }

  // ---- debug ----------------------------------------------------------------------------------

  addDebugItems(menu) {
    const cat = menu.category(DEBUG.story);
    cat.addItem("The Pruitt farm: Day 3 at the shut gate (Ellen's call made)", () => {
      for (const f of ['shelterCall', 'earlCombination', 'rifleClaimed', 'wyattRifle', 'night2Done', 'outpostCall']) this.set(f);
      const g = this.roadGate;
      if (g) this.player.teleport(g.x - g.tx * 22, g.z - g.tz * 22, 0);
    });
    cat.addItem('The Pruitt farm: at the track in, at dusk (the back way known)', () => {
      for (const f of ['shelterCall', 'earlCombination', 'rifleClaimed', 'wyattRifle', 'night2Done', 'outpostCall', 'farmCall']) this.set(f);
      const e = this.frame.entrance;
      this.player.teleport(e.x - this.frame.fx * 14, e.z - this.frame.fz * 14, Math.atan2(-this.frame.fx, -this.frame.fz));
    });
    cat.addItem("The Pruitt farm: the porch's moths done (dead)", () => {
      this.moths?.clear?.();
      this.killed = Math.max(1, this.killed);
      this.roosted = true;
      this.mothsDone();
    });
  }

  overlayLine() {
    return `farm ${this.has('farmCall') ? (this.has('farmVisited') ? (this.has('farmMothsDone') ? 'moths done' : `moths ${this.moths?.roosting?.(GROUP) ?? 0} hanging`) : 'called') : 'idle'}${this.generatorOn ? '' : ' (dark)'}`;
  }

  dispose() {
    for (const off of this.unsubscribers ?? []) off();
    this.model?.group.removeFromParent();
    this.model?.dispose();
    for (const l of this.lights ?? []) l.removeFromParent();
  }
}
