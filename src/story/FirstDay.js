// The first day (M9.2; DESIGN.md "Opening and first run", "Day 1 tutorial
// lines", agreed with Aaron in Session 15). It runs the guided opening,
// teaching through the radio and the world, never pop-ups:
//  - The opening: the cold open at Ground Zero (government CCTV), then Tom
//    wakes in the comms room to Ellen at the radio (lines 1-2).
//  - The tower: the first climb on Day 1 plays the view (fog over the
//    treetops, the cliff behind, a light far to the south he can't make
//    out, then the smoke over the campsite) with lines 3-4.
//  - The campsite (encounters/Campsite.js): lines 5-10.
//  - Home: line 11 coming into the compound with the battery (or after
//    the wave), 12 when the fence is patched, 13-14 (Junie's marker) once
//    the battery's in the fence box.
//  - Day 1 can't be failed: Tom's health can't drop below a floor
//    (config.firstDay.healthFloor), and the clock stops at about 17:00 on
//    Day 1 until a battery is fitted and the torn fence patched, so dusk
//    never comes before the tutorial's done (it never shows as a rule).
//  - Dusk 1: Ellen's forecast line (15, from the forecast).
//  - Night 1: a few strays test the fence (16); later the witch plants
//    her first sigil at the storm shelter (the one exception to "night 1
//    is safe"): camera six's clip (17-19), the sigil goes on the map
//    (20) and the shelter spur opens (night1). The sigil's dead hold the
//    shelter (sigil.hold), so nothing reaches home before dawn.
//  - Dawn 1: lines 21 / 22 and 23 (the dialogue's own dawn triggers), the
//    autosave (Game), and day2 opens the gas station trail.
//  - Skip intro: a fresh run that starts at Dawn 1 with all of that done.
// A few nudge lines (dialogue.json "day1.nudge.*") come over the radio if
// Tom seems stuck. Its progress is in the story flags (data/progress.json),
// so it's saved with them.
//
// Events: 'firstDay:opening' (the opening's over), 'firstDay:tower',
// 'firstDay:sigil' { sigil }.

import { zoneOf } from '../base/stationLayout.js';
import { DEBUG } from '../debug/DebugMenu.js';

export class FirstDay {
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.fc = cfg.firstDay;
    this.bus = bus;
  }

  // ctx: { world, player, combat, clock, station, director, campsite,
  // cutscenes, dialogue, subtitles, progress, lore, meta, mapUi,
  // drawDistance(), notify(text), save() }.
  init(ctx) {
    Object.assign(this, ctx);
    this.reset();
    const flag = (id) => this.progress.has(id);
    this.unsubscribers = [
      this.bus.on('station:climbed', () => this.onTower()),
      this.bus.on('station:repaired', ({ barrier }) => {
        if (this.isDay1() && barrier.kind === 'fence' && !flag('day1Battery')) this.dialogue.say('day1.12');
      }),
      this.bus.on('station:battery', () => {
        if (this.clock.day !== 1 || flag('day1Battery')) return;
        this.progress.setFlag('day1Battery');
        this.notifyFamily = true;
      }),
      this.bus.on('campsite:battery', () => this.progress.setFlag('campsiteBattery')),
      this.bus.on('campsite:cleared', () => this.progress.setFlag('campsiteCleared')),
      this.bus.on('campsite:shotgun', () => this.progress.setFlag('shotgunFound')),
      this.bus.on('phase:night', ({ day }) => {
        if (day === 1) this.startNight1();
      }),
      this.bus.on('phase:dawn', () => (this.night = null)),
    ];
  }

  reset() {
    this.night = null; // Night 1's script: { time, strays, strayCall, planted, clip }
    this.idle = 0; // seconds since the last step forward (for the nudges)
    this.nudged = new Set();
    this.notifyFamily = false;
    this.lastStep = '';
  }

  isDay1() {
    return this.clock.day === 1 && this.clock.phase === 'day';
  }

  // ---- starting a run -------------------------------------------------------------------------

  // mode: 'new' (the opening), 'skip' (Skip intro), 'continue' (a save: nothing to start).
  begin(mode) {
    if (mode === 'skip') this.skipIntro();
    else if (mode === 'new') this.playOpening();
  }

  playOpening() {
    const wake = () => {
      this.placeForWaking();
      this.cutscenes.play('opening.wake', {
        anchors: { ellen: this.familySeat(0) },
        onDone: () => this.openingDone(),
      });
    };
    if (!this.cutscenes.play('opening.coldOpen', { onDone: wake })) wake();
  }

  // Tom wakes in the comms room, by the desk, facing Ellen at the radio.
  placeForWaking() {
    const c = this.station.layout.cabin;
    const w = this.fc.wake;
    const x = c.x + w.dx;
    const z = c.z - c.halfD + w.fromNorthWall;
    const e = this.familySeat(0);
    this.player.teleport(x, z, Math.atan2(x - e.x, z - e.z));
  }

  // Where a family member sits (config.story.family order: Ellen 0, Wyatt 1, Junie 2).
  familySeat(i) {
    const s = this.station.layout.cabin.family[i];
    return { x: s.x, z: s.z, yaw: 0 };
  }

  openingDone() {
    this.meta.set('introSeen', true);
    this.idle = 0;
    this.bus.emit('firstDay:opening');
  }

  // ---- the tower -----------------------------------------------------------------------------------

  onTower() {
    if (this.progress.has('towerClimbed') || this.clock.day !== 1) return;
    this.progress.setFlag('towerClimbed');
    this.bus.emit('firstDay:tower');
    const t = this.station.layout.tower;
    const camp = this.world.map.clearings.find((c) => c.cluster && c.key === 'campsite');
    const fc = this.fc.tower;
    // The light to the south: as far as the eye reaches today, toward Ground Zero.
    const gz = this.world.map.clearings.find((c) => c.key === 'groundZero') ?? { x: t.x, z: t.z + 1000 };
    const d = Math.hypot(gz.x - t.x, gz.z - t.z) || 1;
    const far = Math.min(d, this.drawDistance() * fc.lightDistance);
    const light = { x: t.x + ((gz.x - t.x) / d) * far, z: t.z + ((gz.z - t.z) / d) * far, yaw: 0 };
    const yawTo = (p) => Math.atan2(p.x - t.x, p.z - t.z);
    this.standClearOfPosts(camp);
    // The smoke as the tower sees it: the campsite is past the fog's reach,
    // so its wisp is drawn along the same line at the edge of sight.
    const cd = Math.hypot(camp.x - t.x, camp.z - t.z) || 1;
    const seen = Math.min(cd, this.drawDistance() * fc.smokeDistance);
    const smoke = { x: t.x + ((camp.x - t.x) / cd) * seen, z: t.z + ((camp.z - t.z) / cd) * seen, yaw: 0 };
    this.cutscenes.play('day1.tower', {
      anchors: {
        southLight: { ...light, dy: fc.lightHeight },
        campsite: { ...smoke, dy: fc.smokeLookHeight },
        smoke,
        tower: { x: t.x, z: t.z, yaw: yawTo(light) },
      },
    });
  }

  // The platform's corner posts would block the look toward `target`: step
  // Tom sideways, away from the post nearest that line.
  standClearOfPosts(target) {
    const t = this.station.layout.tower;
    const dx = target.x - t.x;
    const dz = target.z - t.z;
    const d = Math.hypot(dx, dz) || 1;
    const ux = dx / d;
    const uz = dz / d;
    let post = null;
    let best = -Infinity;
    for (const cx of [-1, 1]) {
      for (const cz of [-1, 1]) {
        const dot = (ux * cx + uz * cz) / Math.SQRT2;
        if (dot > best) {
          best = dot;
          post = { x: cx * t.half, z: cz * t.half };
        }
      }
    }
    const px = -uz;
    const pz = ux;
    const side = px * post.x + pz * post.z > 0 ? -1 : 1;
    const step = this.fc.tower.sideStep;
    this.player.setPlatform(this.player.platform, t.x + px * side * step, t.z + pz * side * step);
  }

  // ---- each frame -----------------------------------------------------------------------------------

  // playing: the world runs (no menu, no frozen cutscene).
  update(dt, playing) {
    const day1 = this.clock.day === 1 && this.clock.phase === 'day';
    // Day 1 can't be failed (config.firstDay.healthFloor: a share of full health).
    this.combat.healthFloor = day1 && this.fc.cantFail ? this.fc.healthFloor * this.combat.health.cfg.max : 0;
    if (!playing) return;
    this.updateSkip(dt);
    if (day1) this.holdTheClock();
    if (day1) this.updateHome(dt);
    if (this.night) this.updateNight1(dt);
  }

  // Dusk waits for the tutorial: the clock stops at holdHour on Day 1 until
  // a battery is fitted and the torn fence is patched (Night 1's strays
  // would walk straight through a broken panel).
  holdTheClock() {
    if (this.progress.has('day1Battery') && this.fenceWhole()) return;
    const c = this.clock;
    const phase = c.currentPhase;
    const next = this.cfg.clock.phases[(c.phaseIndex + 1) % this.cfg.clock.phases.length];
    const span = (next.startHour - phase.startHour + this.cfg.clock.hoursPerDay) % this.cfg.clock.hoursPerDay;
    const at = ((this.fc.holdHour - phase.startHour) / span) * phase.seconds;
    if (c.phaseElapsed > at) c.phaseElapsed = at;
  }

  // Day 1 at home: line 11 coming in with the battery, Junie's marker, the nudges.
  updateHome(dt) {
    const p = this.player.position;
    const zone = zoneOf(this.station.layout, p.x, p.z);
    const has = (id) => this.progress.has(id);
    const back = has('campsiteBattery') || has('campsiteCleared');
    if (back && zone >= 1 && !has('day1Home')) {
      this.progress.setFlag('day1Home');
      if (!has('day1Battery')) this.dialogue.say('day1.11');
    }
    if (this.notifyFamily && zone >= 1) {
      this.notifyFamily = false;
      this.dialogue.say('day1.nudge.family');
    }
    this.updateNudges(dt, zone);
  }

  // If Tom seems stuck, a family member says what's next, once each.
  updateNudges(dt, zone) {
    const has = (id) => this.progress.has(id);
    const step = this.currentStep();
    if (step !== this.lastStep) {
      this.lastStep = step;
      this.idle = 0;
    }
    if (this.cutscenes.active || this.subtitles?.busy) return;
    this.idle += dt;
    const n = this.fc.nudges;
    const nudge = (id, after) => {
      if (this.idle < after || this.nudged.has(id)) return;
      this.nudged.add(id);
      this.dialogue.say(id);
    };
    switch (step) {
      case 'tower':
        nudge('day1.nudge.tower', n.tower);
        break;
      case 'campsite':
        nudge('day1.nudge.campsite', n.campsite);
        break;
      case 'battery':
        // Home again without the car's battery.
        if (zone >= 1 && !has('campsiteBattery') && this.combat.inventory.batteries === 0) nudge('day1.nudge.battery', n.battery);
        break;
      case 'fit':
        if (this.combat.inventory.batteries > 0) nudge('day1.nudge.fit', n.fit);
        break;
      case 'repair':
        nudge('day1.nudge.repair', n.repair);
        break;
      default:
        break;
    }
  }

  // No fence panel broken through (they're all standing, if hurt).
  fenceWhole() {
    return this.station.state.segments.every((s) => s.health > 0);
  }

  // Where Day 1 has got to.
  currentStep() {
    const has = (id) => this.progress.has(id);
    if (has('day1Battery')) return this.fenceWhole() ? 'done' : 'repair';
    if (has('campsiteBattery') || this.combat.inventory.batteries > 0) return 'fit';
    if (has('campsiteCleared')) return 'battery';
    if (has('campsiteVisited')) return 'search';
    if (has('towerClimbed')) return 'campsite';
    return 'tower';
  }

  // ---- night 1 --------------------------------------------------------------------------------------

  startNight1() {
    if (this.night || this.progress.has('night1Planted')) return;
    this.night = { time: 0, strays: [], strayCall: false, strayDone: false, planted: false };
  }

  updateNight1(dt) {
    const n = this.night;
    const fc = this.fc.night1;
    n.time += dt;
    if (!n.strayDone && n.time >= fc.strayDelay) this.sendStrays();
    if (n.strayDone && !n.strayCall) {
      const L = this.station.layout;
      for (const z of n.strays) {
        if (z.alive && Math.hypot(z.x - L.centre.x, z.z - L.centre.z) < L.radius + fc.fenceCallDistance) {
          n.strayCall = true;
          this.dialogue.say('day1.16');
          break;
        }
      }
    }
    if (!n.planted && n.time >= fc.plantDelay) {
      // Not while Tom's right there: she waits till he's gone.
      const s = this.shelterSpot();
      const p = this.player.position;
      if (Math.hypot(p.x - s.x, p.z - s.z) > fc.plantClearance && !this.cutscenes.active) this.plantNight1();
    }
  }

  // A few strays along the path from the campsite, marching on the fence.
  sendStrays() {
    const n = this.night;
    const fc = this.fc.night1;
    n.strayDone = true;
    const home = this.world.home;
    const path = this.world.map.paths.find((p) => p.cluster && (this.world.map.clearings[p.a].key === 'campsite' || this.world.map.clearings[p.b].key === 'campsite') && (p.a === home.id || p.b === home.id));
    const pts = path?.points ?? [];
    const start = pts.find((q) => Math.hypot(q.x - home.x, q.z - home.z) >= fc.strayDistance) ?? { x: home.x - fc.strayDistance, z: home.z + 20 };
    const enemies = this.combat.enemies;
    const out = [];
    for (let i = 0; i < fc.strays; i++) {
      enemies.spawnPlanned({ type: 'single', count: 1 }, start.x, start.z, { ringMin: 0, ringMax: 4, mix: this.world.variantMixAt(start.x, start.z), mode: 'march', rise: true, out });
    }
    if (out.length) enemies.formMarch(out, { leader: null, radius: this.cfg.zombies.horde.radius });
    n.strays = out;
  }

  // The first sigil's spot: beside the storm shelter's hatch (the clearing's centre).
  shelterSpot() {
    const c = this.world.map.clearings.find((x) => x.cluster && x.key === 'stormShelter');
    const o = this.fc.night1.sigilOffset;
    return { x: c.x + o[0], z: c.z + o[1], clearingId: c.id };
  }

  plantNight1() {
    const n = this.night;
    n.planted = true;
    const sigil = this.plantShelterSigil();
    this.progress.setFlag('night1Planted');
    if (!sigil) return;
    this.bus.emit('witch:planted', { sigil, scripted: true }); // the milestone and the run's stats
    this.bus.emit('firstDay:sigil', { sigil });
    // The family patch camera six through to Tom (lines 17-19 are in the clip).
    this.cutscenes.play('clip.night1', {
      onDone: () => {
        sigil.known = true; // on the map now
        this.progress.setFlag('night1');
        this.dialogue.play('day1.20');
      },
    });
  }

  // The Night 1 sigil: holds its dead at the shelter (they never march).
  plantShelterSigil() {
    const s = this.shelterSpot();
    const y = this.world.ground.heightAt(s.x, s.z);
    const sigil = this.director.plant({ x: s.x, z: s.z, y, groundId: -1, clearingId: s.clearingId });
    if (sigil) {
      sigil.hold = this.fc.night1.holdRadius;
      sigil.firstSigil = true;
    }
    return sigil;
  }

  // ---- skip intro -----------------------------------------------------------------------------------

  // A fresh run that starts at Dawn 1 with the tutorial done: the fence
  // repaired, the battery fitted, the shotgun in hand, the camcorder handed
  // in, the campsite looted, and the Night 1 sigil still planted at the shelter.
  skipIntro() {
    const st = this.station;
    for (const s of st.state.segments) s.health = s.max;
    st.state.fitBattery();
    st.syncColliders();
    this.combat.giveWeapon('shotgun', this.fc.skip.shotgunShells);
    this.combat.inventory.scrap = this.fc.skip.scrap;
    this.campsite.completeAll();
    if (this.lore.give('camcorder')) this.lore.handIn('camcorder');
    this.mapUi.fog.reveal(st.layout.tower.x, st.layout.tower.z, st.layout.tower.revealRadius);
    for (const id of ['towerClimbed', 'campsiteVisited', 'shotgunFound', 'campsiteCleared', 'campsiteBattery', 'day1Home', 'day1Battery', 'night1Planted', 'night1', 'day2']) this.progress.setFlag(id);
    const sigil = this.plantShelterSigil();
    if (sigil) sigil.known = true;
    const dawnLines = new Set(this.fc.skip.unheard);
    for (const l of this.dialogue.lines) if (l.script === 'day1' && !dawnLines.has(l.id)) this.dialogue.heard.add(l.id);
    // Dawn after night 1.
    const c = this.clock;
    c.day = 1;
    c.phaseIndex = this.cfg.clock.phases.findIndex((p) => p.name === 'dawn');
    c.phaseElapsed = 0;
    this.meta.set('introSeen', true);
    this.notify?.('Dawn, after night 1');
    this.pendingDawnLines = this.fc.skip.dawnLineDelay;
    this.save?.();
  }

  // The dawn lines after a skip (the clock's own dawn event doesn't come: we start in it).
  updateSkip(dt) {
    if (!(this.pendingDawnLines >= 0)) return;
    this.pendingDawnLines -= dt;
    if (this.pendingDawnLines < 0) this.dialogue.say('day1.21');
  }

  // ---- debug ------------------------------------------------------------------------------------------

  addDebugItems(menu) {
    const day1 = menu.category(DEBUG.firstDay);
    day1.addItem('Opening: play it again (cold open, waking)', () => this.playOpening());
    day1.addItem('Tower: play the view from the top', () => {
      this.progress.setFlag('towerClimbed', false);
      this.onTower();
    });
    day1.addItem(() => `Night 1: plant the shelter sigil and play camera six (${this.progress.has('night1Planted') ? 'planted' : 'not yet'})`, () => {
      this.night ??= { time: 0, strays: [], strayCall: true, strayDone: true, planted: false };
      this.plantNight1();
    });
    day1.addItem('Night 1: send the strays at the fence now', () => {
      this.night ??= { time: 0, strays: [], strayCall: false, strayDone: false, planted: true };
      this.sendStrays();
    });
    day1.addItem(() => `Day 1 step: ${this.currentStep()} (idle ${Math.round(this.idle)}s)`, () => {});
  }

  overlayLine() {
    const n = this.night;
    return `day1 ${this.currentStep()}${n ? ` night1 t${Math.round(n.time)} ${n.planted ? 'planted' : 'waiting'}` : ''}${this.combat.healthFloor ? ' cant-fail' : ''}`;
  }

  dispose() {
    for (const off of this.unsubscribers ?? []) off();
  }
}
