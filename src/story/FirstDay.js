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
//  - Nightfall (Session 15b, Aaron): with the fence patched, the battery in
//    and Junie's word had (13-14, indoors), the day fades straight to night
//    (no dusk to stand about in). The forecast comes up once the fade's
//    done, with Ellen's line 15.
//  - Night 1, the first defence (Session 15b, Aaron): 9 dead in waves of 3
//    (Session 16: each wave 15 s after the last rose, so they overlap),
//    each from a new side (16, then the family on the tower and the
//    shotgun). Once they're down Ellen says a trail cam's live, and the
//    witch plants her first sigil at the storm shelter (the one exception
//    to "night 1 is safe"): camera six's clip (17-19). The sigil goes on
//    the map, the shelter spur opens (night1), and the family talk it
//    over: the Pruitts, line 20, and the gas station (supplies, a phone).
//    Then the night fades to dawn. The sigil's dead hold the shelter
//    (sigil.hold). The night holds short of dawn until she's planted.
//  - Dawn 1: lines 21 / 22 and 23 (the dialogue's own dawn triggers), the
//    autosave (Game), and day2 opens the gas station trail.
//  - Skip intro: a fresh run that starts at Dawn 1 with all of that done.
// A few nudge lines (dialogue.json "day1.nudge.*") come over the radio if
// Tom seems stuck. Its progress is in the story flags (data/progress.json),
// so it's saved with them.
//
// Events: 'firstDay:opening' (the opening's over), 'firstDay:tower',
// 'firstDay:nightfall' (mid-fade: the clock goes to night), 'firstDay:dawn'
// (mid-fade: the clock goes to dawn), 'firstDay:wave'
// { wave, count }, 'firstDay:sigil' { sigil }.

import { StormShelter } from '../encounters/StormShelter.js';
import { zoneOf, compassName } from '../base/stationLayout.js';
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
      // Round 2 (Aaron): the rifle taken off the tower on Day 1: Wyatt owns up to the turkey.
      this.bus.on('station:rifle', () => {
        if (this.isDay1()) this.dialogue.play('day1.rifle.turkey');
      }),
      this.bus.on('station:repaired', ({ barrier, via }) => {
        if (!this.isDay1() || barrier.kind !== 'fence') return;
        // Session 15b (Aaron): patched by hand at the fence: Wyatt says the ledger can do it too (line 11).
        if (via === 'world') this.dialogue.say('day1.11');
        if (!flag('day1Battery')) this.dialogue.say('day1.12');
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
      // Session 15b: the nightfall cutscene's mid-fade.
      this.bus.on('firstDay:nightfall', () => this.fallToNight()),
      this.bus.on('firstDay:dawn', () => this.riseToDawn()),
      // Night 1's waves: off the list as they fall (a pool slot can come back as another).
      this.bus.on('enemy:killed', ({ zombie }) => {
        const w = this.night?.wave;
        const i = w ? w.indexOf(zombie) : -1;
        if (i >= 0) w.splice(i, 1);
      }),
    ];
  }

  reset() {
    this.night = null; // Night 1's script (startNight1)
    this.nightfall = null; // Session 15b: { done (s since the work was done), talked (s since Junie's talk) }
    this.nightfallDone = false;
    this.idle = 0; // seconds since the last step forward (for the nudges)
    this.nudged = new Set();
    this.notifyFamily = false;
    this.lastStep = '';
    this.gateCall = 0; // seconds until Ellen will call Tom back from the locked gate again
    this.prompts = null; // Session 15b: which control prompts have been shown this run
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
    // Session 16 (Aaron): Ellen's instruction plays as the cutscene ends, skipped or not.
    this.dialogue.play('day1.02', {}, false);
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
      onDone: (skipped) => {
        // Session 16 (Aaron): skipped, the campsite's lines still play (where to go next).
        if (skipped && !this.dialogue.heard?.has('day1.03')) this.dialogue.play('day1.03');
        this.mapPrompt('campsite'); // Session 15b (Aaron): the campsite's on the map now: the map's button
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
    this.combat.setHealthFloor('day1', day1 && this.fc.cantFail ? this.fc.healthFloor : 0); // Session 20: the general switch
    // Session 15b (Aaron): the gate's locked on Day 1 until Tom's been up the tower.
    this.station.gateLocked = this.gateLocked();
    // Session 15b (Aaron): the rifle on the tower is Night 1's beat (Ellen sends Tom up for it).
    // Round 2 (Aaron): the rifle on the tower and the shovel can be taken from the start of Day 1
    // (Wyatt was up there after a turkey). Digging on Night 1 is still off, below.
    this.station.towerRifleLocked = false;
    this.station.shovelLocked = false;
    // Session 16 (Aaron): no digging the shelter's sigil up on Night 1 (the night ends with the talk).
    this.director.digLocked = this.clock.day === 1 && this.clock.phase === 'night';
    // Session 15b (Aaron): no searching cars or pulling batteries on Day 1 until the tape's been seen.
    // (Or once the campsite's wave is down: Ellen's asked for the battery by then, tape or no tape.)
    if (this.vehicles) this.vehicles.locked = this.clock.day === 1 && !this.campsite.tapeSeen && !this.progress.has('campsiteCleared');
    if (!playing) return;
    this.updateSkip(dt);
    this.updateGate(dt);
    this.updatePrompts(dt);
    if (day1) this.holdTheClock();
    if (day1) this.updateHome(dt);
    if (day1) this.updateNightfall(dt);
    if (this.night) this.updateNight1(dt);
  }

  // Session 15b (Aaron): the controls the game hasn't shown yet, as they're
  // needed (the family say it; the button shows on screen):
  //  - sprint, out on the long walk to the campsite;
  //  - the torch, stepping outside on Night 1 with it off;
  //  - the map, as Wyatt says the shelter's on it (plantNight1).
  updatePrompts(dt) {
    const p = this.player.position;
    const zone = zoneOf(this.station.layout, p.x, p.z);
    const pr = (this.prompts ??= { walk: 0, shown: new Set() });
    const once = (id, line, pad, key) => {
      if (pr.shown.has(id)) return;
      pr.shown.add(id);
      if (line) this.dialogue.play(line);
      this.hint?.(pad, key);
    };
    const day1 = this.clock.day === 1 && this.clock.phase === 'day';
    // Session 16 (Aaron): the torn fence and the shovel on screen too (the family's lines are easy to miss).
    const calm = !this.cutscenes.active && !this.subtitles?.busy;
    const step = day1 ? this.currentStep() : null;
    if ((step === 'fit' || step === 'repair') && zone >= 1 && !this.fenceWhole() && calm) {
      once('fence', null, 'The torn fence: hold X at it, or repair it from the ledger in the comms room', 'The torn fence: hold E at it, or repair it from the ledger in the comms room');
    }
    if (this.progress.has('shelterCall') && !this.combat.weapons.has('shovel') && calm) {
      once('shovel', null, 'Fetch the shovel from beside the cabin door: it digs up what she buries', 'Fetch the shovel from beside the cabin door: it digs up what she buries');
    }
    if (day1 && this.currentStep() === 'campsite' && zone === 0 && !this.cutscenes.active) {
      // Walking (not running) a while outside the fence on the way.
      pr.walk = this.player.sprinting ? 0 : pr.walk + dt * (this.player.speed > 0.5 ? 1 : 0);
      if (pr.walk > this.fc.prompts.sprintAfter) once('sprint', 'day1.prompt.sprint', 'Click LS: sprint', 'Hold Shift: sprint');
      // Session 15b (Aaron): the wrecked car on the trail out: the first sign something's wrong.
      if (!pr.shown.has('wreck') && this.vehicles?.list) {
        // Session 16: the bloody wreck that's always there (or any car, if it didn't fit).
        const wreck = this.vehicles.list.some((v) => v.bloody);
        const near = this.vehicles.list.some((v) => (wreck ? v.bloody : v !== this.campsite.car) && Math.hypot(v.x - p.x, v.z - p.z) < this.fc.prompts.wreckDistance);
        if (near) {
          pr.shown.add('wreck');
          this.dialogue.play('day1.wreck.wyatt');
          this.dialogue.play('day1.wreck.ellen');
        }
      }
    }
    // Plan #7: fire, aim and reload the first time a gun's in hand (the shotgun, under Wyatt's 'behind you');
    // healing the first time Tom's hurt with a kit to use.
    if (this.clock.day === 1 && this.combat.weapons?.has?.('shotgun') && !this.cutscenes.active) {
      once('shoot', null, 'RT: fire  ·  LT: aim  ·  B: reload', 'Left click: fire  ·  Right click: aim  ·  R: reload');
    }
    const hp = this.combat.health;
    if (hp && hp.value < this.fc.prompts.healBelow && (this.combat.inventory?.healing ?? 0) > 0 && !this.cutscenes.active) {
      once('heal', null, 'D-pad right: heal', 'H: heal');
    }
    if (this.clock.day === 1 && this.clock.phase === 'night' && zone <= 1 && this.flashlight && !this.flashlight.on && !this.cutscenes.active) {
      once('torch', 'day1.prompt.torch', 'D-pad left: flashlight', 'L: flashlight');
    }
  }

  // The map prompt, each time something's first marked on it (the campsite
  // after the tower; the shelter's sigil, with Wyatt's line).
  mapPrompt(what = 'map') {
    const pr = (this.prompts ??= { walk: 0, shown: new Set() });
    if (pr.shown.has(`map:${what}`)) return;
    pr.shown.add(`map:${what}`);
    this.hint?.('D-pad up: map', 'M: map');
  }

  gateLocked() {
    return this.clock.day === 1 && !this.progress.has('towerClimbed');
  }

  // Tom at the locked gate (or a panel that's down): Ellen calls him back to the tower.
  updateGate(dt) {
    this.gateCall = Math.max(0, this.gateCall - dt);
    if (!this.station.penned() || this.gateCall > 0 || this.cutscenes.active) return;
    const L = this.station.layout;
    const gl = this.cfg.station.gateLock;
    const p = this.player.position;
    const near = (q) => Math.hypot(p.x - q.x, p.z - q.z) < gl.callDistance;
    const atGap = this.station.state.segments.some((seg, i) => seg.health <= 0 && L.segments[i].pieces.some((q) => near({ x: q.ax, z: q.az }) || near({ x: q.bx, z: q.bz }) || near({ x: (q.ax + q.bx) / 2, z: (q.az + q.bz) / 2 })));
    if (!near(L.gate.mid) && !atGap) return;
    this.gateCall = gl.callEvery;
    this.dialogue.play('day1.gate');
  }

  // Dusk waits for the tutorial: the clock stops at holdHour on Day 1 until
  // a battery is fitted and the torn fence is patched (Night 1's strays
  // would walk straight through a broken panel).
  // Session 15b: it holds until nightfall now (the fade to dusk after Junie's talk).
  holdTheClock() {
    if (this.nightfallDone) return;
    const c = this.clock;
    const phase = c.currentPhase;
    const next = this.cfg.clock.phases[(c.phaseIndex + 1) % this.cfg.clock.phases.length];
    const span = (next.startHour - phase.startHour + this.cfg.clock.hoursPerDay) % this.cfg.clock.hoursPerDay;
    const at = ((this.fc.holdHour - phase.startHour) / span) * phase.seconds;
    if (c.phaseElapsed > at) c.phaseElapsed = at;
  }

  // Session 15b (Aaron): the work done (the fence patched, the battery in)
  // and Junie's had her word (13-14), or Tom's left her waiting: the day
  // fades straight to night.
  updateNightfall(dt) {
    if (this.nightfallDone || this.cutscenes.active) return;
    if (!(this.progress.has('day1Battery') && this.fenceWhole())) {
      this.nightfall = null;
      return;
    }
    const nf = (this.nightfall ??= { done: 0, talked: -1 });
    const f = this.fc.nightfall;
    nf.done += dt;
    const heard = this.dialogue.heard.has('day1.14');
    if (heard && !this.subtitles?.busy) nf.talked = nf.talked < 0 ? 0 : nf.talked + dt;
    if ((nf.talked >= f.afterTalk) || (!heard && nf.done >= f.timeout && !this.subtitles?.busy)) this.startNightfall();
  }

  startNightfall() {
    this.nightfallDone = true;
    if (!this.cutscenes.play('day1.nightfall', { onDone: () => this.fallToNight() })) this.fallToNight();
  }

  // The clock to night (once), through dusk in the same moment (its events
  // still fire: the forecast, which waits for the fade, and Ellen's line 15).
  fallToNight() {
    this.nightfallDone = true;
    const c = this.clock;
    if (c.day !== 1) return;
    if (c.phase === 'day') c.skipPhase();
    if (c.phase === 'dusk') c.skipPhase();
  }

  // Session 15b (Aaron): after camera six and the talk, the night fades to dawn.
  startDawn() {
    if (this.night) this.night.dawnStarted = true;
    if (!this.cutscenes.play('day1.dawn', { onDone: () => this.riseToDawn() })) this.riseToDawn();
  }

  riseToDawn() {
    const c = this.clock;
    if (c.day !== 1 || c.phase !== 'night') return;
    c.skipPhase();
  }

  // Day 1 at home: line 11 coming in with the battery, Junie's marker, the nudges.
  updateHome(dt) {
    const p = this.player.position;
    const zone = zoneOf(this.station.layout, p.x, p.z);
    const has = (id) => this.progress.has(id);
    const back = has('campsiteBattery') || has('campsiteCleared');
    if (back && zone >= 1 && !has('day1Home')) {
      this.progress.setFlag('day1Home'); // Session 15b: line 11 waits for a fence patched by hand (it came as Tom was at the fence box)
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
    this.night = { time: 0, waves: 0, wave: [], waveTime: 0, nextIn: this.fc.night1.waves.firstDelay, firstCall: false, tactics: -1, clearIn: -1, feedIn: -1, planted: false, talked: false, dawnIn: -1, dawnStarted: false };
  }

  updateNight1(dt) {
    const n = this.night;
    const fc = this.fc.night1;
    const w = fc.waves;
    n.time += dt;
    // The night holds short of dawn until she's planted.
    if (!n.planted) {
      const c = this.clock;
      const hold = c.currentPhase.seconds - fc.holdBeforeDawn;
      if (c.phase === 'night' && c.phaseElapsed > hold) c.phaseElapsed = hold;
    }
    if (n.waves > 0 && n.wave.length > 0) {
      n.waveTime += dt;
      if (n.waveTime > w.timeout) n.wave.length = 0; // lost in the woods: it counts as down
    }
    // The next wave `gap` seconds after the last one rose, down or not
    // (Session 16, Aaron: they overlap, so there's no waiting about).
    if (n.waves < w.count) {
      n.nextIn -= dt;
      if (n.nextIn <= 0) this.sendWave();
    } else if (n.wave.length === 0 && n.clearIn < 0 && !n.planted) {
      n.clearIn = fc.plantAfter;
      this.dialogue.play('day1.night.clear');
    }
    // Line 16 as the first wave nears the fence, then the family's two ways to fight.
    // (Or a while after it rose, or once one's down: shot from the tower before they reach the fence.)
    if (n.waves >= 1 && !n.firstCall) {
      const L = this.station.layout;
      const near = n.wave.some((z) => Math.hypot(z.x - L.centre.x, z.z - L.centre.z) < L.radius + fc.fenceCallDistance);
      const late = n.waves > 1 || n.waveTime > fc.firstCallAfter || n.wave.length < fc.waves.size;
      if (near || late) {
        n.firstCall = true;
        n.tactics = fc.tacticsDelay;
        this.dialogue.play('day1.16', { where: n.where });
      }
    }
    if (n.tactics >= 0) {
      n.tactics -= dt;
      if (n.tactics < 0) {
        this.dialogue.play('day1.night.shotgun');
        this.dialogue.play(this.combat.weapons?.has?.(this.cfg.station.towerRifle.weapon) ? 'day1.night.tower.have' : 'day1.night.tower');
      }
    }
    if (n.clearIn >= 0 && !n.planted && n.feedIn < 0 && !n.offered) {
      n.clearIn = Math.max(0, n.clearIn - dt);
      // Not while Tom's right there: she waits till he's gone.
      const s = this.shelterSpot();
      const p = this.player.position;
      if (n.clearIn <= 0 && Math.hypot(p.x - s.x, p.z - s.z) > fc.plantClearance && !this.cutscenes.active) {
        // Session 15b (Aaron): a warning first: Ellen's got a trail cam live.
        n.feedIn = fc.feedDelay;
        this.dialogue.play('day1.night.feed');
      }
    }
    if (n.feedIn >= 0 && !n.planted) {
      n.feedIn -= dt;
      if (n.feedIn < 0) {
        // Session 16 (Aaron): the feed waits for D-pad down (on Tom's own time).
        n.feedIn = -1;
        n.offered = true;
        const play = () => {
          if (this.night && !this.night.planted) this.plantNight1();
        };
        if (!this.watch?.offer({ id: 'camera6', pad: "D-pad down: watch Ellen's trail cam feed", key: "V: watch Ellen's trail cam feed", play })) {
          if (!this.watch) play();
        }
      }
    }
    // After the clip and the talk: the night fades to dawn.
    if (n.talked && !n.dawnStarted && !this.cutscenes.active) {
      if (this.subtitles?.busy) n.dawnIn = fc.dawnAfterTalk;
      else if ((n.dawnIn -= dt) < 0) this.startDawn();
    }
  }

  // Where wave i rises: wave 0 out along the campsite path, then due south,
  // then the far side from the path. { x, z, where } (where: "west" etc.).
  // turn: degrees to swing a side wave back toward due south (when its
  // first spot was no good: the cliff runs close on the east).
  waveStart(i, turn = 0) {
    const w = this.fc.night1.waves;
    const L = this.station.layout;
    const c = L.centre;
    const path = this.campsitePathPoint(w.pathDistance);
    const pathAngle = Math.atan2(path.x - c.x, path.z - c.z);
    let at = path;
    if (i > 0) {
      const side = pathAngle < 0 ? 1 : -1; // the other side from the path
      const a = i === 1 ? 0 : (side * Math.max(0, w.sideAngle - turn) * Math.PI) / 180;
      at = this.world.ground.clamp({ x: c.x + Math.sin(a) * w.distance, z: c.z + Math.cos(a) * w.distance });
    }
    const where = compassName(Math.atan2(at.x - c.x, at.z - c.z));
    return { x: at.x, z: at.z, where };
  }

  campsitePathPoint(distance) {
    const home = this.world.home;
    const path = this.world.map.paths.find((p) => p.cluster && (this.world.map.clearings[p.a].key === 'campsite' || this.world.map.clearings[p.b].key === 'campsite') && (p.a === home.id || p.b === home.id));
    const pts = path?.points ?? [];
    return pts.find((q) => Math.hypot(q.x - home.x, q.z - home.z) >= distance) ?? { x: home.x - distance, z: home.z + 20 };
  }

  // A wave of the dead, risen out in the woods and marching on the fence.
  sendWave() {
    const n = this.night;
    const w = this.fc.night1.waves;
    const enemies = this.combat.enemies;
    const out = [];
    let start = null;
    // If nowhere near the spot will take them (rock, the cliff), swing toward due south.
    for (let turn = 0; turn <= w.sideAngle && out.length === 0; turn += 10) {
      start = this.waveStart(n.waves, turn);
      for (let i = 0; i < w.size; i++) {
        enemies.spawnPlanned({ type: 'single', count: 1 }, start.x, start.z, { ringMin: 0, ringMax: 4, mix: this.world.variantMixAt(start.x, start.z), mode: 'march', rise: true, out });
      }
      if (n.waves === 0) break; // the path's spot: no swinging
    }
    n.waves += 1;
    n.waveTime = 0;
    n.nextIn = w.gap;
    n.where = start.where;
    if (out.length) enemies.formMarch(out, { leader: null, radius: this.cfg.zombies.horde.radius });
    n.wave.push(...out); // every wave still up (they overlap)
    this.bus.emit('firstDay:wave', { wave: n.waves, count: out.length });
    if (n.waves === 2) this.dialogue.play('day1.night.wave2', { where: start.where });
    if (n.waves === 3) this.dialogue.play('day1.night.wave3', { where: start.where });
  }

  // The first sigil's spot: beside the storm shelter's hatch (the clearing's centre).
  // Session 16: in the shelter's frame, beside the hatch (data/stormShelter.json).
  shelterSpot() {
    const c = this.world.map.clearings.find((x) => x.cluster && x.key === 'stormShelter');
    const at = StormShelter.sigilSpot(this.world.map) ?? { x: c.x, z: c.z };
    return { x: at.x, z: at.z, clearingId: c.id };
  }

  plantNight1() {
    const n = this.night;
    n.planted = true;
    this.watch?.cancel('camera6');
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
        // Session 15b (Aaron): they talk it over, then the gas station at first light.
        for (const id of this.fc.night1.afterClip) this.dialogue.play(id);
        this.mapPrompt('sigil'); // Session 15b (Aaron): the button for the map, as Wyatt says it's on it
        n.talked = true;
        n.dawnIn = this.fc.night1.dawnAfterTalk;
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
    // Session 20 (Aaron, #344): Skip intro hands over the shovel too (it leans by the door otherwise).
    if (this.station.shovelAtDoor) this.combat.giveWeapon(this.cfg.station.shovelByDoor.weapon);
    if (this.station.rifleOnTower) this.combat.giveWeapon(this.cfg.station.towerRifle.weapon); // Session 15b: it's on the tower otherwise
    this.combat.giveWeapon('shotgun', this.fc.skip.shotgunShells);
    this.combat.inventory.scrap = this.fc.skip.scrap;
    // Session 16: the comms room's first aid box, already searched (Session 20: into the healing pool).
    this.station.takeAidBox(true);
    this.progress.setFlag('aidBoxTaken');
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
    day1.addItem('Nightfall: fade to dusk now', () => {
      if (this.clock.day === 1 && this.clock.phase === 'day') this.startNightfall();
    });
    day1.addItem(() => `Night 1: plant the shelter sigil and play camera six (${this.progress.has('night1Planted') ? 'planted' : 'not yet'})`, () => {
      if (!this.night) this.startNight1();
      if (this.night) {
        this.night.waves = this.fc.night1.waves.count;
        this.plantNight1();
      }
    });
    day1.addItem(() => `Night 1: send the next wave now (${this.night ? `${this.night.waves}/${this.fc.night1.waves.count} sent, ${this.night.wave.length} up` : 'not night 1'})`, () => {
      if (!this.night) this.startNight1();
      if (this.night && this.night.waves < this.fc.night1.waves.count) this.sendWave();
    });
    day1.addItem(() => `Day 1 step: ${this.currentStep()} (idle ${Math.round(this.idle)}s)`, () => {});
  }

  overlayLine() {
    const n = this.night;
    return `day1 ${this.currentStep()}${n ? ` night1 t${Math.round(n.time)} wave ${n.waves}/${this.fc.night1.waves.count} (${n.wave.length} up) ${n.planted ? 'planted' : 'waiting'}` : ''}${this.combat.healthFloor.value ? ' cant-fail' : ''}`;
  }

  dispose() {
    for (const off of this.unsubscribers ?? []) off();
  }
}
