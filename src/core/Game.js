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
import { World } from '../world/World.js';
import { SpatialGrid } from '../world/SpatialGrid.js';
import { Player } from '../player/Player.js';
import { Flashlight } from '../player/Flashlight.js';
import { Combat } from '../combat/Combat.js';
import { ZombieDirector } from '../ai/ZombieDirector.js';
import { Station } from '../base/Station.js';
import { Vehicles } from '../world/Vehicles.js';
import { NightWatch } from '../base/NightWatch.js';
import { daylightLevel } from '../ai/detection.js';
import { DebugOverlay } from '../debug/DebugOverlay.js';
import { DebugMenu } from '../debug/DebugMenu.js';
import { StartScreen } from '../ui/StartScreen.js';
import { Toast } from '../ui/Toast.js';
import { MapUi } from '../ui/MapUi.js';

const MS_PER_SECOND = 1000;

export class Game {
  constructor(cfg = defaultConfig) {
    this.cfg = cfg;
    this.state = 'boot';
  }

  init(root) {
    const cfg = this.cfg;
    this.bus = new EventBus();
    this.bus.init();
    this.seed = resolveSeed(cfg.rng);
    this.rng = new Rng(this.seed);
    this.clock = new Clock(cfg.clock, this.bus);
    this.clock.init();
    this.display = new Display(cfg.display, this.bus);
    this.display.init();

    this.initWorld(root);
    this.initUi(root);
    this.initDirector();
    this.initStation(root);
    this.initVehicles();
    this.initNightWatch(root);
    this.addOverlayStats();
    this.addDebugMenuItems();
    this.applyQuality(cfg.quality.preset);
    this.director.setDrawDistance(this.drawDistance);
    this.wireEvents();

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
    this.renderer = new Renderer(cfg.render, cfg.postFX, this.bus);
    this.renderer.init(root, this.scene, this.player.camera);
    this.input = new Input(cfg.input, this.bus);
    this.input.init(this.renderer.canvas);
    this.dynamicResolution = new DynamicResolution(cfg.render.dynamicResolution);

    this.sky = new Sky(cfg.sky, cfg.fog, cfg.clock, this.rng.fork('sky'));
    this.sky.init(this.scene);
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
    this.startScreen = new StartScreen(() => this.start());
    this.startScreen.init(root);
    this.startScreen.show('start');
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
    this.overlay.addStat('station', () => this.station.overlayLine());
    this.overlay.addStat('nights', () => this.nightWatch.overlayLine());
    this.overlay.addStat('vehicles', () => this.vehicles.overlayLine());
  }

  addDebugMenuItems() {
    const menu = this.debugMenu;
    const cfg = this.cfg;
    menu.addItem('Toggle debug overlay', () => this.overlay.toggle());
    this.addMapDebugItems(menu);
    this.combat.addDebugItems(menu);
    this.director.addDebugItems(menu);
    this.station.addDebugItems(menu);
    this.nightWatch.addDebugItems(menu);
    this.vehicles.addDebugItems(menu);
    menu.addItem(() => `Skip to next phase (now ${this.clock.phase})`, () => this.clock.skipPhase());
    menu.addItem('Skip to night', () => this.skipToPhase('night'));
    menu.addItem(
      () => `Time speed: x${this.clock.timeScale}`,
      () => this.clock.setTimeScale(nextInList(cfg.clock.timeScaleSteps, this.clock.timeScale)),
    );
    menu.addItem(
      () => `Quality: ${this.qualityName}`,
      () => this.applyQuality(nextInList(Object.keys(cfg.quality.presets), this.qualityName)),
    );
    menu.addItem(
      () => `Frame cap: ${this.frameCap || 'off'}`,
      () => this.setFrameCap(nextInList(cfg.quality.frameCapSteps, this.frameCap)),
    );
    menu.addItem(
      () => `Dynamic resolution: ${this.dynamicResolution.enabled ? 'on' : 'off'}`,
      () => this.dynamicResolution.setEnabled(!this.dynamicResolution.enabled),
    );
    menu.addItem('Close menu', () => menu.close());
  }

  // Teleports, the map screen's debug view, and new or repeated seeds.
  addMapDebugItems(menu) {
    const clearings = this.world.map.clearings;
    this.teleportIndex = 0;
    const label = () => {
      const c = clearings[this.teleportIndex];
      return `Teleport: next clearing (${this.teleportIndex + 1}/${clearings.length} ${this.world.clearingName(c)})`;
    };
    menu.addItem(label, () => {
      this.teleportIndex = (this.teleportIndex + 1) % clearings.length;
      this.teleportTo(clearings[this.teleportIndex]);
    });
    menu.addItem('Teleport: home', () => this.teleportTo(this.world.home));
    menu.addItem("Teleport: witch's hut", () => this.teleportTo(this.world.hut));
    this.mapUi.addDebugItems(menu);
    menu.addItem(() => `New map (seed now ${this.seed})`, () => reloadWithSeed(Math.floor(Math.random() * this.cfg.rng.randomSeedMax)));
    menu.addItem('Restart this map (same seed)', () => reloadWithSeed(this.seed));
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
    this.drawDistance = q.drawDistance;
    this.sky.setDrawDistance(q.drawDistance);
    this.world.setDrawDistance(q.drawDistance);
    this.director?.setDrawDistance(q.drawDistance);
    this.combat.setDrawDistance(q.drawDistance);
    this.station?.renderer.setDrawDistance(q.drawDistance);
    this.player.setFar(q.drawDistance + this.cfg.render.farMargin);
    this.flashlight.setShadow(q.flashlightShadow, q.shadowMapSize);
    this.setFrameCap(q.frameCap);
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
    const playing = running && !this.debugMenu.isOpen && !this.mapUi.isOpen;
    const ledgerPause = this.station.ledger.isOpen && this.cfg.ledger.pausesClock;
    if (running && !this.mapUi.isOpen && !ledgerPause) this.clock.update(dt);
    const daylight = daylightLevel(this.clock.phase, this.clock.phaseProgress);
    // The ledger takes the controls while it's open (the world carries on).
    const locked = this.station.ledger.isOpen;
    const controls = locked ? this.lockedInput : this.input;
    if (playing && this.combat.alive) this.player.update(dt, controls);
    this.combat.update(dt, this.input, playing, daylight, locked);
    this.director.update(dt, controls, playing, this.clock.phase, this.player.camera.position, daylight);
    this.station.update(dt, this.input, playing, this.clock.phase, this.player.camera.position, daylight);
    this.vehicles.update(dt, this.input, playing && !locked);
    this.nightWatch.update(dt, this.clock.phase, playing);
    if (playing) {
      this.flashlight.update(dt, controls, this.player.camera, this.combat.glareExtras(this.player.position));
    }
    const sigilsOnMap = this.director.showOnMap ? this.director.sigils.list : null;
    const enemies = this.combat.enemies;
    const tierColors = enemies.showTiers ? this.cfg.zombies.lod.tierColors : null;
    this.mapUi.update(dt, controls, this.player, enemies.living, running && !this.debugMenu.isOpen && this.combat.alive && !locked, sigilsOnMap, tierColors);
    this.sky.update(dt, this.clock.hourOfDay, this.player.camera);
    this.world.update(dt, this.player.camera.position);

    this.debugMenu.update(dt);
    this.toast.update(dt);
    this.overlay.update(dt);
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
    this.director.dispose();
    this.combat.dispose();
    this.flashlight.dispose();
    this.world.dispose();
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
