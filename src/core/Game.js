// Game: owns every system, runs the main loop and handles phases.
//
// App states: 'boot' (tap-to-start screen), 'running', 'suspended'
// (left fullscreen; waiting for a tap to resume). The day/night phase
// comes from the Clock; Game turns each change into 'phase:<name>'.

import * as THREE from 'three';
import { config as defaultConfig } from '../config.js';
import { EventBus } from './EventBus.js';
import { Rng } from './Rng.js';
import { Clock } from './Clock.js';
import { Input } from './Input.js';
import { Display } from './Display.js';
import { shortPadName } from './GamepadInput.js';
import { Renderer } from '../render/Renderer.js';
import { DynamicResolution } from '../render/DynamicResolution.js';
import { Sky } from '../render/Sky.js';
import { Atmosphere } from '../render/Atmosphere.js';
import { installAtmosphereShader } from '../render/atmosphereShader.js';
import { World } from '../world/World.js';
import { SpatialGrid } from '../world/SpatialGrid.js';
import { Player } from '../player/Player.js';
import { Flashlight } from '../player/Flashlight.js';
import { Combat } from '../combat/Combat.js';
import { ZombieDirector } from '../ai/ZombieDirector.js';
import { Witch } from '../ai/Witch.js';
import { Hut } from '../world/Hut.js';
import { Explosives } from '../combat/Explosives.js';
import { FinalBattle } from '../encounters/FinalBattle.js';
import { RunEndScreen } from '../ui/RunEndScreen.js';
import { NoReturnNotice } from '../ui/NoReturnNotice.js';
import { createStats, loadStats } from './runStats.js';
import { Station } from '../base/Station.js';
import { Vehicles } from '../world/Vehicles.js';
import { NightWatch } from '../base/NightWatch.js';
import { daylightLevel } from '../ai/detection.js';
import { DebugOverlay } from '../debug/DebugOverlay.js';
import { DebugMenu, DEBUG } from '../debug/DebugMenu.js';
import { StartScreen } from '../ui/StartScreen.js';
import { Toast } from '../ui/Toast.js';
import { MapUi } from '../ui/MapUi.js';
import { SaveStore } from './SaveStore.js';
import {
  SAVE_VERSION,
  validSave,
  packBits,
  unpackBits,
  saveClock,
  loadClock,
  savePlayer,
  loadPlayer,
  saveStation,
  loadStation,
  saveVehicles,
  loadVehicles,
  saveSigils,
  saveRevisits,
  loadRevisits,
} from './saveData.js';

const MS_PER_SECOND = 1000;

export class Game {
  constructor(cfg = defaultConfig) {
    this.cfg = cfg;
    this.state = 'boot';
  }

  init(root) {
    const cfg = this.cfg;
    // Session 10: the ground mist in every fogged material. First, before
    // any material is made (it hooks their onBeforeCompile).
    installAtmosphereShader();
    this.bus = new EventBus();
    this.bus.init();
    // M6: a saved run is offered if the URL asks for no other map.
    this.saves = new SaveStore(cfg.save);
    const saved = this.saves.load();
    const urlSeed = seedFromUrl(cfg.rng);
    this.pendingSave = validSave(saved) && (urlSeed === null || String(urlSeed) === String(saved.seed)) ? saved : null;
    this.seed = this.pendingSave ? this.pendingSave.seed : resolveSeed(cfg.rng);
    this.rng = new Rng(this.seed);
    this.clock = new Clock(cfg.clock, this.bus);
    this.clock.init();
    this.display = new Display(cfg.display, this.bus);
    this.display.init();

    this.initWorld(root);
    this.initUi(root);
    this.initDirector();
    this.hut = new Hut(this.cfg, this.bus); // M7 step 4
    this.hut.init(this.scene, this.world, this.colliders);
    this.initWitch();
    this.initStation(root);
    this.initVehicles();
    this.initNightWatch(root);
    this.initExplosives();
    this.initFinalBattle(root);
    // M7 step 6: the run's stats and its end (victory or defeat).
    this.stats = createStats();
    this.victoryTimer = -1;
    this.runEnd = new RunEndScreen(cfg.ending, this.bus, this.combat.sfx);
    // Session 9 (#130): both charges on the hut warn there's no going back.
    this.noReturn = new NoReturnNotice(cfg.ending, this.bus, this.combat.sfx, (text, seconds) => this.toast.show(text, seconds));
    this.noReturn.init(root);
    this.runEnd.init(root);
    this.startScreen.show(this.pendingSave ? 'continue' : 'start', this.pendingSave ? saveLabel(this.pendingSave, cfg.clock) : '');
    this.addOverlayStats();
    this.addDebugMenuItems();
    this.applyQuality(cfg.quality.preset);
    this.director.setDrawDistance(this.drawDistance);
    this.wireEvents();

    this.fastForward = 1; // debug (M6)
    this.loop = this.loop.bind(this);
    this.lastTime = null;
    this.rafId = requestAnimationFrame(this.loop);
  }

  initWorld(root) {
    const cfg = this.cfg;
    this.scene = new THREE.Scene();
    this.colliders = new SpatialGrid(cfg.world.colliderCellSize);
    this.world = new World(cfg, this.rng.fork('world'), this.seed);
    this.world.init(this.scene, this.colliders);
    const ground = this.world.ground;

    this.player = new Player(cfg.player, cfg.render, cfg.feedback, this.colliders, ground);
    const spawn = this.world.spawn;
    this.player.setSpawn(spawn.x, spawn.z, spawn.yaw);
    this.player.init();
    this.renderer = new Renderer(cfg.render, cfg.postFX, this.bus, cfg.clock.hoursPerDay);
    this.renderer.init(root, this.scene, this.player.camera);
    this.input = new Input(cfg.input, this.bus);
    this.input.init(this.renderer.canvas);
    this.dynamicResolution = new DynamicResolution(cfg.render.dynamicResolution);

    this.sky = new Sky(cfg.sky, cfg.fog, cfg.clock, this.rng.fork('sky'));
    this.sky.init(this.scene);
    // Session 10: ground mist and fog nights.
    this.atmosphere = new Atmosphere(cfg.fog, cfg.quality.presets, this.seed, this.rng.fork('atmosphere'));
    this.atmosphere.init(this.scene, ground, this.world.map);
    this.flashlight = new Flashlight(cfg.flashlight, this.rng.fork('flashlight'), this.bus);
    this.flashlight.init(this.scene, this.colliders, ground);
    this.combat = new Combat(cfg, this.rng.fork('combat'), this.bus);
    this.combat.init(root, this.scene, this.player, this.colliders, { sky: this.sky, flashlight: this.flashlight }, this.world);
  }

  // Sigils and the night's zombies (M4). After the UI, so it can toast.
  initDirector() {
    this.director = new ZombieDirector(this.cfg, this.rng.fork('director'), this.bus);
    this.director.init(this.scene, this.world, this.combat, this.player, (text) => this.toast.show(text));
    this.combat.promptSources.push(this.director.hud);
  }

  // The witch (M7): rests in her hut by day, roams and plants by night.
  initWitch() {
    this.witch = new Witch(this.cfg, this.rng.fork('witch'), this.bus);
    this.witch.init(this.scene, {
      world: this.world,
      director: this.director,
      player: this.player,
      colliders: this.colliders,
      combat: this.combat,
      clock: this.clock,
      hutBuilding: this.hut,
    });
  }

  // Explosives (M7 step 4): planting charges (at the hut and anywhere),
  // the detonator. Their prompt comes after every other.
  initExplosives() {
    this.explosives = new Explosives(this.cfg, this.bus);
    this.explosives.init(this.scene, {
      combat: this.combat,
      player: this.player,
      hut: this.hut,
      witch: this.witch,
      ground: this.world.ground,
      notify: (text) => this.toast.show(text),
      busy: [this.director.hud, this.station.hud, this.vehicles.hud],
    });
    this.combat.promptSources.push(this.explosives.hud);
  }

  // The final battle (M7 step 5): the hut's destruction starts it.
  initFinalBattle(root) {
    this.finalBattle = new FinalBattle(this.cfg, this.bus);
    this.finalBattle.init(this.scene, {
      root,
      witch: this.witch,
      hut: this.hut,
      player: this.player,
      clock: this.clock,
      sky: this.sky,
      world: this.world,
      combat: this.combat,
      skipToNight: () => this.skipToPhase('night'),
    });
  }

  // The ranger station (M5): fence, doors, turret, ledger, siege.
  initStation(root) {
    this.station = new Station(this.cfg, this.rng.fork('station'), this.bus);
    this.station.init(this.scene, {
      root,
      world: this.world,
      combat: this.combat,
      player: this.player,
      colliders: this.colliders,
      mapUi: this.mapUi,
      notify: (text) => this.toast.show(text),
    });
    this.combat.promptSources.push(this.station.hud);
    // Mist may drift inside the fence, but not into the cabin (Aaron).
    const L = this.station.layout;
    const cabin = this.cfg.station.layout.cabin;
    const m = this.cfg.fog.puffs.avoidMargin;
    const cz = L.centre.z + cabin.offsetZ;
    this.atmosphere.mist.avoid = [{ x0: L.centre.x - cabin.width / 2 - m, x1: L.centre.x + cabin.width / 2 + m, z0: cz - cabin.depth / 2 - m, z1: cz + cabin.depth / 2 + m }];
    // While the ledger is open the player's controls go to it; the world carries on.
    const input = () => this.input;
    const still = { x: 0, y: 0 };
    this.lockedInput = {
      isDown: () => false,
      wasPressed: () => false,
      wasReleased: () => false,
      getMove: () => still,
      getLook: () => still,
      get activeDevice() {
        return input().activeDevice;
      },
    };
  }

  // Abandoned vehicles (M5 part 2): searched for loot, batteries pulled.
  // Their prompts come after digging and the station's.
  initVehicles() {
    const L = this.station.layout;
    this.vehicles = new Vehicles(this.cfg, this.rng.fork('vehicles'), this.bus);
    this.vehicles.init(this.scene, {
      world: this.world,
      combat: this.combat,
      player: this.player,
      colliders: this.colliders,
      mapUi: this.mapUi,
      notify: (text) => this.toast.show(text),
      avoid: [{ x: L.centre.x, z: L.centre.z, r: L.radius + this.cfg.vehicles.placement.avoidRadius }],
      busy: [this.director.hud, this.station.hud],
    });
    this.combat.promptSources.push(this.vehicles.hud);
  }

  // Nights at the station (M6): the dusk forecast, attacks resolved
  // while you're away, the alarm.
  initNightWatch(root) {
    this.nightWatch = new NightWatch(this.cfg, this.rng.fork('nights'), this.bus);
    this.nightWatch.init(root, {
      station: this.station,
      director: this.director,
      witch: this.witch,
      combat: this.combat,
      player: this.player,
      clock: this.clock,
      notify: (text) => this.toast.show(text),
    });
  }

  initUi(root) {
    const cfg = this.cfg;
    this.mapUi = new MapUi(cfg, this.world, this.bus);
    this.mapUi.init(root);
    this.toast = new Toast(cfg.ui);
    this.toast.init(root);
    this.overlay = new DebugOverlay(cfg.debug, this);
    this.overlay.init(root);
    this.debugMenu = new DebugMenu(cfg.debug.menu, this.input, this.bus);
    this.debugMenu.init(root);
    this.startScreen = new StartScreen((choice) => this.onStartChoice(choice));
    this.startScreen.init(root);
  }

  addOverlayStats() {
    this.overlay.addStat('quality', () => {
      const dr = this.dynamicResolution;
      return `${this.qualityName}  cap ${this.frameCap || 'off'}  dynres ${dr.enabled ? 'on' : 'off'} (${dr.min}-${dr.max})  draw ${this.drawDistance}m`;
    });
    this.overlay.addStat('player', () => {
      const p = this.player;
      const brush = p.undergrowth > 0.05 ? `  undergrowth ${Math.round(p.undergrowth * 100)}%` : '';
      return `${p.stance}  ${p.speed.toFixed(1)} m/s  stamina ${Math.round(p.stamina.value)}  at ${p.position.x.toFixed(0)}, ${p.position.z.toFixed(0)}  height ${p.position.y.toFixed(1)}${brush}`;
    });
    this.overlay.addStat('map', () => {
      const p = this.player.position;
      const w = this.world;
      const { clearing, distance } = w.nearestClearing(p.x, p.z);
      const where = distance <= clearing.radius ? `in ${w.clearingName(clearing)}` : `${Math.round(distance)}m from ${w.clearingName(clearing)}`;
      return `${where} (${clearing.band}, south ${clearing.southness.toFixed(2)})  ${w.map.clearings.length} clearings ${w.map.edges.length} paths  ${this.mapUi.overlayLine()}`;
    });
    this.overlay.addStat('world', () => {
      const f = this.flashlight;
      const w = this.world;
      const torch = f.on ? `on ${Math.round(f.glareFactor * 100)}% (surface ${f.surfaceDistance.toFixed(1)}m)` : 'off';
      const k = (n) => `${Math.round(n / 1000)}k`;
      return `${k(w.forest.treeCount)} trees ${k(w.forest.bushCount)} bushes (${w.forest.visibleChunks} chunks drawn)  built ${Math.round(w.buildMs)}ms  torch ${torch}`;
    });
    this.overlay.addStat('combat', () => this.combat.overlayLine());
    this.overlay.addStat('zombies', () => this.combat.zombieOverlayLine());
    this.overlay.addStat('lod', () => this.combat.enemies.lodLine());
    this.overlay.addStat('sigils', () => this.director.overlayLines().sigils);
    this.overlay.addStat('witch', () => this.witch.overlayLine());
    this.overlay.addStat('final', () => this.finalBattle.overlayLine());
    this.overlay.addStat('station', () => this.station.overlayLine());
    this.overlay.addStat('nights', () => this.nightWatch.overlayLine());
    this.overlay.addStat('atmosphere', () => this.atmosphere.overlayLine(this.clock));
    this.overlay.addStat('vehicles', () => this.vehicles.overlayLine());
  }

  // Each system adds its tools to its category (DEBUG in DebugMenu.js).
  addDebugMenuItems() {
    const menu = this.debugMenu;
    const cfg = this.cfg;
    const time = menu.category(DEBUG.time);
    time.addItem(() => `Skip to next phase (now ${this.clock.phase})`, () => this.clock.skipPhase());
    time.addItem('Skip to night', () => this.skipToPhase('night'));
    // M6: fast-forward runs the whole world faster (not just the clock), so
    // a night's marches and attacks can be watched in a minute or two.
    time.addItem(
      () => `Fast-forward: x${this.fastForward} (zombies, marches and the clock)`,
      () => (this.fastForward = nextInList(cfg.debug.fastForwardSteps, this.fastForward)),
    );
    this.addMapDebugItems(menu);
    this.director.addDebugItems(menu);
    this.combat.addDebugItems(menu);
    this.witch.addDebugItems(menu, (text) => this.toast.show(text));
    this.addHutDebugItems(menu);
    this.station.addDebugItems(menu);
    this.nightWatch.addDebugItems(menu);
    this.vehicles.addDebugItems(menu);
    this.mapUi.addDebugItems(menu);
    this.atmosphere.addDebugItems(menu, (text) => this.toast.show(text));
    const display = menu.category(DEBUG.display);
    display.addItem('Toggle debug overlay', () => this.overlay.toggle());
    display.addItem(
      () => `Quality: ${this.qualityName}`,
      () => this.applyQuality(nextInList(Object.keys(cfg.quality.presets), this.qualityName)),
    );
    display.addItem(
      () => `Frame cap: ${this.frameCap || 'off'}`,
      () => this.setFrameCap(nextInList(cfg.quality.frameCapSteps, this.frameCap)),
    );
    display.addItem(
      () => `Dynamic resolution: ${this.dynamicResolution.enabled ? 'on' : 'off'}`,
      () => this.dynamicResolution.setEnabled(!this.dynamicResolution.enabled),
    );
  }

  // M7 step 4: the hut and explosives.
  addHutDebugItems(menu) {
    const hut = menu.category(DEBUG.hut);
    const ex = () => this.explosives;
    hut.addItem(
      () => `Give 2 charges (carrying ${this.combat.inventory.charges}, planted ${ex().placed.length})`,
      () => this.toast.show(ex().give(2) > 0 ? 'Charges given: switch to the detonator (RB / LB) to plant anywhere' : 'You can only have two out at once'),
    );
    hut.addItem('Teleport: to the hut door', () => {
      const d = this.hut.door;
      this.player.teleport(d.x + Math.sin(this.hut.facing) * 4, d.z + Math.cos(this.hut.facing) * 4, this.hut.facing);
      this.toast.show(this.hut.destroyed ? 'The hut is a wreck' : "At the witch's hut");
    });
    hut.addItem('Plant both charges on the hut now', () => {
      if (this.hut.destroyed) return this.toast.show('The hut is already destroyed');
      ex().placed = ex().placed.filter((c) => !c.onHut);
      this.combat.inventory.charges = 0;
      for (const a of [0.6, -0.6]) {
        const f = this.hut.facing + a;
        const w = this.hut.wallPoint(this.hut.x + Math.sin(f) * 10, this.hut.z + Math.cos(f) * 10);
        ex().placed.push({ x: w.x, z: w.z, y: this.world.ground.heightAt(w.x, w.z), onHut: true });
      }
      this.bus.emit('hut:armed'); // the point of no return's radio call and pop-up
    });
    hut.addItem('Set off every planted charge now', () => this.toast.show(`${ex().detonate()} charge(s) went off`));
    hut.addItem(() => `Destroy the hut now: starts the final battle (${this.hut.destroyed ? 'destroyed' : 'standing'})`, () => this.hut.destroy());
    hut.addItem('Final battle: teleport to the hut and start it', () => {
      const h = this.hut;
      this.player.teleport(h.x + Math.sin(h.facing) * 14, h.z + Math.cos(h.facing) * 14, h.facing);
      this.hut.destroy();
    });
  }

  // Teleports, the map screen's debug view, and new or repeated seeds.
  addMapDebugItems(menu) {
    const clearings = this.world.map.clearings;
    this.teleportIndex = 0;
    const label = () => {
      const c = clearings[this.teleportIndex];
      return `Teleport: next clearing (${this.teleportIndex + 1}/${clearings.length} ${this.world.clearingName(c)})`;
    };
    const teleport = menu.category(DEBUG.teleport);
    const run = menu.category(DEBUG.run);
    teleport.addItem(label, () => {
      this.teleportIndex = (this.teleportIndex + 1) % clearings.length;
      this.teleportTo(clearings[this.teleportIndex]);
    });
    teleport.addItem('Teleport: home', () => this.teleportTo(this.world.home));
    teleport.addItem("Teleport: witch's hut", () => this.teleportTo(this.world.hut));
    run.addItem(() => `New map (seed now ${this.seed})`, () => this.newRun());
    run.addItem('Restart this map (same seed, deletes the save)', () => {
      this.saves.clear();
      reloadWithSeed(this.seed);
    });
    // M6: the save slot.
    run.addItem('Save now (as the dawn autosave does)', () => this.toast.show(this.autosave() ? 'Game saved' : this.pastNoReturn ? 'No saving after the hut is destroyed' : 'Could not save (storage blocked?)'));
    run.addItem('Delete the save', () => {
      this.saves.clear();
      this.toast.show('Save deleted');
    });
  }

  // Land a few metres from a clearing's centre, facing it.
  teleportTo(clearing) {
    const off = this.cfg.debug.teleportOffset;
    this.player.teleport(clearing.x, clearing.z + off, 0);
    this.toast.show(`Teleported to ${this.world.clearingName(clearing)}`);
  }

  skipToPhase(name) {
    for (let i = 0; i < this.cfg.clock.phases.length && this.clock.phase !== name; i++) this.clock.skipPhase();
  }

  // Apply a quality preset to every system it touches.
  applyQuality(name) {
    const q = this.cfg.quality.presets[name];
    const dr = this.dynamicResolution;
    if (this.qualityName === undefined) {
      dr.init({ scale: this.cfg.render.renderScale, min: q.renderScaleMin, max: q.renderScaleMax, targetFps: this.cfg.render.targetFps });
    } else {
      dr.setBounds(q.renderScaleMin, q.renderScaleMax);
    }
    this.qualityName = name;
    this.renderer.setScale(dr.scale);
    this.renderer.setPostFX(q.postFX, q.bloom);
    this.presetDrawDistance = q.drawDistance;
    this.sky.setDrawDistance(q.drawDistance);
    this.setViewDistance(q.drawDistance);
    this.atmosphere.setQuality(q);
    this.world.terrain.setTwoSizes(q.groundTwoSizes ?? true);
    this.world.forest.nearTrunks.setDistance(q.treeTrunks ?? 0);
    this.flashlight.setShadow(q.flashlightShadow, q.shadowMapSize);
    this.setFrameCap(q.frameCap);
  }

  // How far everything is drawn: the preset's distance, or less while a
  // fog night is in (Session 10). Visual only.
  setViewDistance(distance) {
    this.drawDistance = distance;
    this.world.setDrawDistance(distance);
    this.director?.setDrawDistance(distance);
    this.witch?.setDrawDistance(distance);
    this.combat.setDrawDistance(distance);
    this.station?.renderer.setDrawDistance(distance);
    this.player.setFar(distance + this.cfg.render.farMargin);
  }

  setFrameCap(cap) {
    this.frameCap = cap;
    this.dynamicResolution.setTarget(cap || this.cfg.render.targetFps);
  }

  wireEvents() {
    const { bus } = this;
    this.unsubscribers = [
      bus.on('clock:phaseChanged', ({ to, day }) => bus.emit(`phase:${to}`, { day })),
      bus.on('input:gamepadConnected', ({ id }) => {
        const name = shortPadName(id);
        this.startScreen.setControllerStatus(name);
        this.toast.show(`Controller connected: ${name}`);
      }),
      bus.on('input:gamepadDisconnected', () => {
        this.startScreen.setControllerStatus(null);
        this.toast.show('Controller disconnected. Reconnect it, or use keyboard and mouse.');
      }),
      bus.on('display:fullscreenChanged', ({ fullscreen }) => this.onFullscreenChanged(fullscreen)),
      bus.on('render:contextLost', () => this.toast.show('Graphics context lost. Reload the page.')),
      // Permadeath (M6): a new run on a fresh map (M12 brings the run summary).
      bus.on('run:newRequested', () => this.newRun()),
      // M6: autosave at each dawn; the save goes when the run ends (permadeath).
      bus.on('phase:dawn', () => {
        if (this.cfg.save.autosaveAtDawn && this.state === 'running' && this.combat.alive && this.autosave()) this.toast.show(`Dawn: night ${this.clock.day} survived. Game saved`);
      }),
      bus.on('player:died', () => {
        this.saves.clear();
        this.endRun('defeat', 'YOU DIED', this.deathReason());
      }),
      bus.on('station:overrun', () => this.saves.clear()),
      // Session 9 (Aaron, #130): destroying the hut is a true point of no
      // return. The save goes, and nothing saves again this run.
      bus.on('hut:destroyed', () => {
        this.pastNoReturn = true;
        this.saves.clear();
      }),
      bus.on('player:overrun', ({ reason }) => this.endRun('defeat', 'THE STATION FELL', reason)),
      bus.on('player:respawned', () => this.runEnd.hide()), // debug "try again"
      // M7: killing the witch wins the run. She bursts apart, the dead
      // collapse where they stand, and after a moment the ending plays.
      bus.on('witch:killed', () => {
        this.saves.clear();
        this.combat.enemies.collapseAll();
        this.victoryTimer = this.cfg.ending.victoryDelay;
      }),
      // The run's stats (the summary).
      bus.on('enemy:killed', () => this.stats.kills++),
      bus.on('sigil:dug', () => this.stats.sigilsDug++),
      bus.on('witch:planted', () => this.stats.sigilsPlanted++),
      bus.on('witch:interrupted', () => this.stats.ritualsBroken++),
      bus.on('witch:hurt', ({ damage }) => (this.stats.witchDamage += damage)),
      bus.on('witch:attacking', () => this.stats.witchEncounters++),
    ];

    // Re-lock the mouse when the canvas is clicked (desktop only).
    this.onCanvasClick = () => {
      if (this.state === 'running' && !this.debugMenu.isOpen && hasFinePointer()) {
        this.input.requestPointerLock();
      }
    };
    this.renderer.canvas.addEventListener('click', this.onCanvasClick);

    // Don't let a hidden tab produce one huge frame on return.
    this.onVisibility = () => {
      this.lastTime = null;
    };
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  // Nights survived: one for every dawn reached (day N is followed by night N).
  get nightsSurvived() {
    return this.clock.day - 1 + (this.clock.phase === 'dawn' ? 1 : 0);
  }

  // M7 step 6: the run's over. kind: 'victory' | 'defeat'.
  endRun(kind, title, reason) {
    if (this.runEnd.isOpen) return;
    this.runEnd.show(kind, title, reason, this.stats, this.nightsSurvived);
  }

  deathReason() {
    if (this.finalBattle.active) return 'She killed you on the blood night.';
    return `You died on ${this.clock.phase === 'night' || this.clock.phase === 'dusk' ? 'night' : 'day'} ${this.clock.day}.`;
  }

  // The start screen's choice (M6): continue the saved run (put it back,
  // then start), or begin a new one (a fresh map).
  onStartChoice(choice) {
    if (choice === 'new') {
      this.newRun();
      return;
    }
    if (choice === 'continue' && this.pendingSave) {
      this.applySave(this.pendingSave);
      this.pendingSave = null;
    }
    this.start();
  }

  // A new run: the save goes, and the page reloads on a fresh map.
  newRun() {
    this.saves.clear();
    reloadWithSeed(Math.floor(Math.random() * this.cfg.rng.randomSeedMax));
  }

  // ---- saving (M6; core/saveData.js) -------------------------------------------

  collectSave() {
    return {
      version: SAVE_VERSION,
      seed: this.seed,
      savedAt: Date.now(),
      clock: saveClock(this.clock),
      player: savePlayer(this.player, this.combat),
      fog: packBits(this.mapUi.fog.toBytes()),
      station: saveStation(this.station.state),
      vehicles: saveVehicles(this.vehicles.list),
      sigils: saveSigils(this.director.sigils.list),
      revisits: saveRevisits(this.director.revisits),
      witch: this.witch.saveState(), // M7: her wounds and traps (optional: older saves have none)
      explosives: this.explosives.saveState(), // M7: charges carried and planted
      stats: { ...this.stats }, // M7: for the run summary
    };
  }

  autosave() {
    if (this.pastNoReturn) return false;
    return this.saves.save(this.collectSave());
  }

  // Put a saved run back (the world is already built from its seed).
  applySave(d) {
    loadClock(this.clock, d.clock);
    loadPlayer(this.combat, d.player);
    this.player.teleport(d.player.x, d.player.z, d.player.yaw);
    const fog = this.mapUi.fog;
    fog.fromBytes(unpackBits(d.fog, fog.cells.length));
    loadStation(this.station.state, d.station);
    this.station.syncColliders();
    loadVehicles(this.vehicles.list, d.vehicles);
    for (const v of this.vehicles.list) this.vehicles.renderer.refresh(v);
    this.director.removeAll();
    for (const s of d.sigils) {
      const sigil = this.director.plant({ ...s });
      if (sigil) sigil.raised = s.raised;
    }
    loadRevisits(this.director.revisits, d.revisits ?? []);
    this.witch.loadState(d.witch);
    this.explosives.loadState(d.explosives);
    this.stats = loadStats(d.stats);
    this.toast.show(`Continuing: ${saveLabel(d, this.cfg.clock)}`);
  }

  // Called from the start screen's tap: a user gesture, so fullscreen
  // and pointer lock are allowed here. Pointer lock first, because the
  // fullscreen request uses up the gesture.
  start() {
    if (hasFinePointer()) this.input.requestPointerLock();
    this.display.enter();
    this.combat.start();
    this.mapUi.start();
    const firstStart = this.state === 'boot';
    this.state = 'running';
    if (firstStart) this.bus.emit('game:started', { seed: this.seed });
  }

  onFullscreenChanged(fullscreen) {
    if (fullscreen || this.state !== 'running') return;
    if (!this.cfg.display.resumeScreenOnFullscreenExit) return;
    this.state = 'suspended';
    this.startScreen.show('resume');
  }

  loop(now) {
    this.rafId = requestAnimationFrame(this.loop);
    if (this.lastTime !== null && this.frameCap > 0) {
      const minFrameMs = MS_PER_SECOND / this.frameCap - this.cfg.loop.frameCapToleranceMs;
      if (now - this.lastTime < minFrameMs) return;
    }
    const dt = this.lastTime === null ? 0 : Math.min((now - this.lastTime) / MS_PER_SECOND, this.cfg.loop.maxFrameDt);
    this.lastTime = now;

    const t0 = performance.now();
    this.update(dt);
    const t1 = performance.now();
    this.renderer.render(dt);
    const t2 = performance.now();
    this.overlay.recordFrame(dt, t1 - t0, t2 - t1);
    if (this.dynamicResolution.update(dt)) this.renderer.setScale(this.dynamicResolution.scale);
  }

  update(dt) {
    this.input.update(dt);
    if (this.input.wasPressed('debugOverlay')) this.overlay.toggle();
    if (this.input.wasPressed('debugMenu')) this.debugMenu.toggle();

    const running = this.state === 'running';
    // The debug menu and the map screen stop the action. The map screen
    // pauses the clock too (Aaron, M4); the debug menu lets it run on.
    // The point-of-no-return pop-up (Session 9) holds the game until it's closed.
    const noticeOpen = this.noReturn.update(dt, this.input, running && !this.debugMenu.isOpen && !this.mapUi.isOpen);
    const playing = running && !this.debugMenu.isOpen && !this.mapUi.isOpen && !noticeOpen;
    const locked = this.station.ledger.isOpen;
    const controls = locked ? this.lockedInput : this.input;
    // Debug fast-forward (M6): the whole world (clock, zombies, marches,
    // the station) steps this many times a frame; you move and act in the
    // first step only. Drawn once.
    const steps = playing ? this.fastForward : 1;
    for (let i = 0; i < steps; i++) this.step(dt, running, playing, i === 0);
    if (playing) {
      this.flashlight.update(dt, controls, this.player.camera, this.combat.glareExtras(this.player.position));
    }
    const sigilsOnMap = this.director.showOnMap ? this.director.sigils.list : null;
    const enemies = this.combat.enemies;
    const tierColors = enemies.showTiers ? this.cfg.zombies.lod.tierColors : null;
    const witchOnMap = this.witch.showOnMap ? this.witch : null;
    this.mapUi.update(dt, controls, this.player, enemies.living, running && !this.debugMenu.isOpen && this.combat.alive && !locked, sigilsOnMap, tierColors, witchOnMap);
    this.atmosphere.preUpdate(this.clock, this.sky);
    this.sky.update(dt, this.clock.hourOfDay, this.player.camera);
    this.atmosphere.setViewport(this.renderer.canvas.height, this.player.camera.fov);
    this.atmosphere.update(dt, this.player.camera, this.sky, this.flashlight);
    this.renderer.postFX.setTime(this.clock.hourOfDay, this.sky.blood); // Session 10: the colour grade
    const view = this.atmosphere.viewDistance(this.presetDrawDistance, this.sky.fog.far);
    if (view !== this.drawDistance) this.setViewDistance(view);
    this.world.update(dt, this.player.camera.position);
    this.hut.update(dt, this.player.camera.position, this.drawDistance);

    // M7 step 6: the run's clock, and the ending after she dies.
    if (playing && this.combat.alive) this.stats.seconds += dt;
    if (this.victoryTimer >= 0 && playing) {
      this.victoryTimer -= dt;
      if (this.victoryTimer < 0) {
        this.combat.victory();
        this.endRun('victory', 'THE WITCH IS DEAD', `You killed her on ${this.finalBattle.state === 'idle' ? 'the pathways' : 'the blood night'}, night ${this.clock.day}.`);
      }
    }
    this.runEnd.update(dt, this.input);
    this.debugMenu.update(dt);
    this.toast.update(dt);
    this.overlay.update(dt);
  }

  // One step of the world. first: the player's controls work (later
  // fast-forward steps have them locked).
  step(dt, running, playing, first) {
    const ledgerPause = this.station.ledger.isOpen && this.cfg.ledger.pausesClock;
    if (running && !this.mapUi.isOpen && !this.noReturn.isOpen && !ledgerPause) this.clock.update(dt);
    const daylight = daylightLevel(this.clock.phase, this.clock.phaseProgress);
    // The ledger takes the controls while it's open (the world carries on).
    const locked = this.station.ledger.isOpen || !first || this.finalBattle.cinematic;
    const input = first && !this.finalBattle.cinematic ? this.input : this.lockedInput;
    const controls = locked ? this.lockedInput : this.input;
    if (first && playing && this.combat.alive) this.player.update(dt, controls);
    this.combat.update(dt, input, playing, daylight, locked);
    this.director.update(dt, controls, playing, this.clock.phase, this.player.camera.position, daylight);
    this.witch.update(dt, playing, this.player.camera.position, first ? controls : this.lockedInput);
    this.explosives.update(dt, first ? controls : this.lockedInput, playing && first && !locked);
    if (playing) this.finalBattle.update(dt, this.player.camera.position);
    this.station.update(dt, input, playing, this.clock.phase, this.player.camera.position, daylight);
    this.vehicles.update(dt, input, playing && !locked);
    this.nightWatch.update(dt, this.clock.phase, playing);
  }

  get phase() {
    return this.clock.phase;
  }

  dispose() {
    cancelAnimationFrame(this.rafId);
    for (const off of this.unsubscribers ?? []) off();
    this.renderer.canvas.removeEventListener('click', this.onCanvasClick);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.startScreen.dispose();
    this.debugMenu.dispose();
    this.overlay.dispose();
    this.toast.dispose();
    this.mapUi.dispose();
    this.nightWatch.dispose();
    this.vehicles.dispose();
    this.station.dispose();
    this.runEnd.dispose();
    this.noReturn.dispose();
    this.finalBattle.dispose();
    this.explosives.dispose();
    this.witch.dispose();
    this.hut.dispose();
    this.director.dispose();
    this.combat.dispose();
    this.flashlight.dispose();
    this.world.dispose();
    this.atmosphere.dispose();
    this.sky.dispose();
    this.dynamicResolution.dispose();
    this.player.dispose();
    this.input.dispose();
    this.renderer.dispose();
    this.display.dispose();
    this.clock.dispose();
    this.rng.dispose();
    this.bus.dispose();
  }
}

// The ?seed= in the URL, or null.
function seedFromUrl(rngConfig) {
  const raw = new URLSearchParams(window.location.search).get(rngConfig.seedUrlParam);
  if (raw === null || raw === '') return null;
  const asNumber = Number(raw);
  return Number.isFinite(asNumber) ? asNumber : String(raw);
}

// "dawn after night 3" (or "day 3, dusk" for a debug save) for the Continue button.
function saveLabel(d, clockCfg) {
  const phase = clockCfg.phases[d.clock.phaseIndex]?.name ?? '';
  return phase === 'dawn' ? `dawn after night ${d.clock.day}` : `day ${d.clock.day}, ${phase}`;
}

// URL ?seed= beats config.rng.defaultSeed; otherwise roll a fresh seed.
// (Math.random is fine here: it only picks the seed, never gameplay.)
function resolveSeed(rngConfig) {
  const fromUrl = new URLSearchParams(window.location.search).get(rngConfig.seedUrlParam);
  const raw = fromUrl ?? rngConfig.defaultSeed;
  if (raw === null || raw === '') return Math.floor(Math.random() * rngConfig.randomSeedMax);
  const asNumber = Number(raw);
  return Number.isFinite(asNumber) ? asNumber : String(raw);
}

// Reload the page on a given map seed (debug).
function reloadWithSeed(seed) {
  const url = new URL(window.location.href);
  url.searchParams.set(defaultConfig.rng.seedUrlParam, seed);
  window.location.href = url.toString();
}

// The item after `current` in `list`, wrapping round.
function nextInList(list, current) {
  return list[(list.indexOf(current) + 1) % list.length];
}

function hasFinePointer() {
  return window.matchMedia('(pointer: fine)').matches;
}
