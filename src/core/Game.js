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
import { Forest } from '../render/Forest.js';
import { Terrain } from '../world/Terrain.js';
import { SpatialGrid } from '../world/SpatialGrid.js';
import { Player } from '../player/Player.js';
import { Flashlight } from '../player/Flashlight.js';
import { DebugOverlay } from '../debug/DebugOverlay.js';
import { DebugMenu } from '../debug/DebugMenu.js';
import { StartScreen } from '../ui/StartScreen.js';
import { Toast } from '../ui/Toast.js';

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
    this.applyQuality(cfg.quality.preset);
    this.wireEvents();

    this.loop = this.loop.bind(this);
    this.lastTime = null;
    this.rafId = requestAnimationFrame(this.loop);
  }

  initWorld(root) {
    const cfg = this.cfg;
    this.scene = new THREE.Scene();
    this.colliders = new SpatialGrid(cfg.world.colliderCellSize);

    this.player = new Player(cfg.player, cfg.render, this.colliders, cfg.world.boundaryRadius);
    this.player.init();
    this.renderer = new Renderer(cfg.render, cfg.postFX, this.bus);
    this.renderer.init(root, this.scene, this.player.camera);
    this.input = new Input(cfg.input, this.bus);
    this.input.init(this.renderer.canvas);
    this.dynamicResolution = new DynamicResolution(cfg.render.dynamicResolution);

    this.sky = new Sky(cfg.sky, cfg.fog, cfg.clock, this.rng.fork('sky'));
    this.sky.init(this.scene);
    this.terrain = new Terrain(cfg.terrain, this.rng.fork('terrain'));
    this.terrain.init(this.scene, this.colliders);
    this.forest = new Forest(cfg.forest, this.rng.fork('forest'));
    this.forest.init(this.scene, this.colliders);
    this.flashlight = new Flashlight(cfg.flashlight, this.rng.fork('flashlight'), this.bus);
    this.flashlight.init(this.scene, this.colliders);
  }

  initUi(root) {
    const cfg = this.cfg;
    this.toast = new Toast(cfg.ui);
    this.toast.init(root);
    this.overlay = new DebugOverlay(cfg.debug, this);
    this.overlay.init(root);
    this.addOverlayStats();
    this.debugMenu = new DebugMenu(cfg.debug.menu, this.input, this.bus);
    this.debugMenu.init(root);
    this.addDebugMenuItems();
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
      return `${p.stance}  ${p.speed.toFixed(1)} m/s  stamina ${Math.round(p.stamina.value)}  at ${p.position.x.toFixed(1)}, ${p.position.z.toFixed(1)}`;
    });
    this.overlay.addStat('world', () => {
      const f = this.flashlight;
      const torch = f.on ? `on ${Math.round(f.glareFactor * 100)}% (surface ${f.surfaceDistance.toFixed(1)}m)` : 'off';
      return `${this.forest.treeCount} trees  flashlight ${torch}`;
    });
  }

  addDebugMenuItems() {
    const menu = this.debugMenu;
    const cfg = this.cfg;
    menu.addItem('Toggle debug overlay', () => this.overlay.toggle());
    menu.addItem(() => `Skip to next phase (now ${this.clock.phase})`, () => this.clock.skipPhase());
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
    this.forest.setDrawDistance(q.drawDistance);
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

    if (this.state === 'running') {
      this.clock.update(dt);
      if (!this.debugMenu.isOpen) {
        this.player.update(dt, this.input);
        this.flashlight.update(dt, this.input, this.player.camera);
      }
    }
    this.sky.update(dt, this.clock.hourOfDay, this.player.camera);
    this.forest.update(dt, this.player.camera.position);

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
    this.flashlight.dispose();
    this.forest.dispose();
    this.terrain.dispose();
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

// The item after `current` in `list`, wrapping round.
function nextInList(list, current) {
  return list[(list.indexOf(current) + 1) % list.length];
}

function hasFinePointer() {
  return window.matchMedia('(pointer: fine)').matches;
}
