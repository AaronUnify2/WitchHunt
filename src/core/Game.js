// Game: owns every system, runs the main loop and handles phases.
//
// App states: 'boot' (tap-to-start screen), 'running', 'suspended'
// (left fullscreen; waiting for a tap to resume). The day/night phase
// comes from the Clock; Game turns each change into 'phase:<name>'.

import { config as defaultConfig } from '../config.js';
import { EventBus } from './EventBus.js';
import { Rng } from './Rng.js';
import { Clock } from './Clock.js';
import { Input } from './Input.js';
import { Display } from './Display.js';
import { shortPadName } from './GamepadInput.js';
import { Renderer } from '../render/Renderer.js';
import { TestScene } from '../debug/TestScene.js';
import { FreeCamera } from '../debug/FreeCamera.js';
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
    this.renderer = new Renderer(cfg.render, this.bus);
    this.renderer.init(root);
    this.input = new Input(cfg.input, this.bus);
    this.input.init(this.renderer.canvas);

    this.testScene = new TestScene(cfg.testScene, this.rng.fork('testScene'));
    this.testScene.init();
    this.freeCamera = new FreeCamera(cfg.testCamera, cfg.render, cfg.testScene.groundSize / 2);
    this.freeCamera.init();

    this.toast = new Toast(cfg.ui);
    this.toast.init(root);
    this.overlay = new DebugOverlay(cfg.debug, this);
    this.overlay.init(root);
    this.debugMenu = new DebugMenu(cfg.debug.menu, this.input, this.bus);
    this.debugMenu.init(root);
    this.debugMenu.addItem('Toggle debug overlay', () => this.overlay.toggle());
    this.debugMenu.addItem('Close menu', () => this.debugMenu.close());
    this.startScreen = new StartScreen(() => this.start());
    this.startScreen.init(root);
    this.startScreen.show('start');

    this.wireEvents();
    this.loop = this.loop.bind(this);
    this.lastTime = null;
    this.rafId = requestAnimationFrame(this.loop);
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
    const dt = this.lastTime === null ? 0 : Math.min((now - this.lastTime) / MS_PER_SECOND, this.cfg.loop.maxFrameDt);
    this.lastTime = now;

    const t0 = performance.now();
    this.update(dt);
    const t1 = performance.now();
    this.renderer.render(this.testScene.scene, this.freeCamera.camera);
    const t2 = performance.now();
    this.overlay.recordFrame(dt, t1 - t0, t2 - t1);
  }

  update(dt) {
    this.input.update(dt);
    if (this.input.wasPressed('debugOverlay')) this.overlay.toggle();
    if (this.input.wasPressed('debugMenu')) this.debugMenu.toggle();

    if (this.state === 'running') {
      this.clock.update(dt);
      if (!this.debugMenu.isOpen) this.freeCamera.update(dt, this.input);
    }

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
    this.freeCamera.dispose();
    this.testScene.dispose();
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

function hasFinePointer() {
  return window.matchMedia('(pointer: fine)').matches;
}
