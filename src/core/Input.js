// One input module for the Xbox controller (Gamepad API) and keyboard/
// mouse. Maps raw buttons and keys to the action names in DESIGN.md
// "Controls", plus menu and debug actions. Everything else in the game
// asks Input about actions, never about keys or buttons.
//
// Events: 'input:deviceChanged' { device }, 'input:gamepadConnected'
// { id, mapping }, 'input:gamepadDisconnected' { id, mapping }.

import { applyRadialDeadZone, applyResponseCurve, clampLength } from './stickMath.js';
import { GamepadInput, GAMEPAD_BUTTONS, GAMEPAD_AXES } from './GamepadInput.js';
import { KeyboardMouseInput } from './KeyboardMouseInput.js';

const DEG_TO_RAD = Math.PI / 180;

export const DEVICES = { gamepad: 'gamepad', keyboardMouse: 'keyboardMouse' };

export class Input {
  constructor(inputConfig, bus) {
    this.cfg = inputConfig;
    this.bus = bus;
  }

  init(pointerLockTarget) {
    this.kbm = new KeyboardMouseInput();
    this.kbm.init(pointerLockTarget);
    this.pad = new GamepadInput(this.cfg.gamepad, {
      onConnect: (info) => this.onPadConnect(info),
      onDisconnect: (info) => this.onPadDisconnect(info),
    });
    this.pad.init();

    this.activeDevice = this.cfg.defaultDevice;
    this.down = new Set();
    this.prevDown = new Set();
    this.move = { x: 0, y: 0 }; // x right, y forward, length <= 1
    this.look = { x: 0, y: 0 }; // radians this frame: x turn right, y look up
    this.rawPad = null;
    this.comboState = {};
    for (const name of Object.keys(this.cfg.combos)) {
      this.comboState[name] = { held: 0, fired: false };
    }
  }

  update(dt) {
    const kb = this.kbm.poll();
    const pad = this.pad.poll();
    this.rawPad = pad;

    this.prevDown = this.down;
    this.down = new Set();
    this.readKeyboardMouse(kb);
    if (pad) {
      this.readGamepadButtons(pad);
      this.readCombos(pad, dt);
    } else {
      this.resetCombos();
    }

    this.move = this.computeMove(kb, pad);
    this.look = this.computeLook(kb, pad, dt);
    this.updateActiveDevice(kb, pad);
  }

  dispose() {
    this.kbm?.dispose();
    this.pad?.dispose();
  }

  // ---- queries ---------------------------------------------------------

  isDown(action) {
    return this.down.has(action);
  }

  wasPressed(action) {
    return this.down.has(action) && !this.prevDown.has(action);
  }

  wasReleased(action) {
    return !this.down.has(action) && this.prevDown.has(action);
  }

  getMove() {
    return this.move;
  }

  getLook() {
    return this.look;
  }

  get activeActions() {
    return [...this.down];
  }

  get gamepadInfo() {
    return this.pad.info;
  }

  requestPointerLock() {
    this.kbm.requestPointerLock();
  }

  // ---- reading devices ---------------------------------------------------

  readKeyboardMouse(kb) {
    for (const [action, codes] of Object.entries(this.cfg.keyBindings)) {
      if (codes.some((code) => kb.keys.has(code))) this.down.add(action);
    }
    for (const [action, buttons] of Object.entries(this.cfg.mouseBindings)) {
      if (buttons.some((b) => kb.buttons.has(b))) this.down.add(action);
    }
    if (kb.wheelTicks !== 0) this.down.add(this.cfg.wheelAction);
  }

  readGamepadButtons(pad) {
    const suppressed = this.suppressedButtons(pad);
    for (const [action, names] of Object.entries(this.cfg.gamepadBindings)) {
      if (names.some((name) => pad.pressed[GAMEPAD_BUTTONS[name]] && !suppressed.has(name))) {
        this.down.add(action);
      }
    }
  }

  // While a combo's first button (its modifier) is held, its other
  // buttons don't fire their own actions.
  suppressedButtons(pad) {
    const suppressed = new Set();
    for (const combo of Object.values(this.cfg.combos)) {
      const [modifier, ...rest] = combo.buttons;
      if (pad.pressed[GAMEPAD_BUTTONS[modifier]]) rest.forEach((b) => suppressed.add(b));
    }
    return suppressed;
  }

  // A combo fires once (one frame of "down") after its buttons are held
  // together for holdSeconds, and re-arms when any of them is released.
  readCombos(pad, dt) {
    for (const [name, combo] of Object.entries(this.cfg.combos)) {
      const state = this.comboState[name];
      const held = combo.buttons.every((b) => pad.pressed[GAMEPAD_BUTTONS[b]]);
      if (!held) {
        state.held = 0;
        state.fired = false;
        continue;
      }
      state.held += dt;
      if (!state.fired && state.held >= combo.holdSeconds) {
        state.fired = true;
        this.down.add(name);
      }
    }
  }

  resetCombos() {
    for (const state of Object.values(this.comboState)) {
      state.held = 0;
      state.fired = false;
    }
  }

  computeMove(kb, pad) {
    const has = (action) => this.cfg.keyBindings[action].some((c) => kb.keys.has(c));
    let x = (has('moveRight') ? 1 : 0) - (has('moveLeft') ? 1 : 0);
    let y = (has('moveForward') ? 1 : 0) - (has('moveBack') ? 1 : 0);
    if (pad) {
      const g = this.cfg.gamepad;
      const stick = applyRadialDeadZone(
        pad.axes[GAMEPAD_AXES.LX] ?? 0,
        -(pad.axes[GAMEPAD_AXES.LY] ?? 0), // stick up is negative
        g.moveDeadZone,
        1 - g.outerDeadZone,
      );
      x += stick.x;
      y += stick.y;
    }
    return clampLength(x, y);
  }

  computeLook(kb, pad, dt) {
    const m = this.cfg.mouse;
    let x = kb.mouseDx * m.sensitivity;
    let y = -kb.mouseDy * m.sensitivity * (m.invertY ? -1 : 1);
    if (pad) {
      const g = this.cfg.gamepad;
      const dz = applyRadialDeadZone(
        pad.axes[GAMEPAD_AXES.RX] ?? 0,
        -(pad.axes[GAMEPAD_AXES.RY] ?? 0),
        g.lookDeadZone,
        1 - g.outerDeadZone,
      );
      const stick = applyResponseCurve(dz.x, dz.y, g.lookCurveExponent);
      x += stick.x * g.lookSpeedX * DEG_TO_RAD * dt;
      y += stick.y * g.lookSpeedY * DEG_TO_RAD * dt * (g.invertY ? -1 : 1);
    }
    return { x, y };
  }

  // ---- active device -------------------------------------------------------

  updateActiveDevice(kb, pad) {
    if (kb.activity) this.setActiveDevice(DEVICES.keyboardMouse);
    if (pad && this.padHasActivity(pad)) this.setActiveDevice(DEVICES.gamepad);
  }

  padHasActivity(pad) {
    const t = this.cfg.gamepad.activityThreshold;
    const a = pad.axes;
    return (
      pad.pressed.some(Boolean) ||
      Math.hypot(a[GAMEPAD_AXES.LX] ?? 0, a[GAMEPAD_AXES.LY] ?? 0) > t ||
      Math.hypot(a[GAMEPAD_AXES.RX] ?? 0, a[GAMEPAD_AXES.RY] ?? 0) > t
    );
  }

  setActiveDevice(device) {
    if (device === this.activeDevice) return;
    this.activeDevice = device;
    this.bus.emit('input:deviceChanged', { device });
  }

  onPadConnect(info) {
    this.bus.emit('input:gamepadConnected', info);
    this.setActiveDevice(DEVICES.gamepad);
  }

  onPadDisconnect(info) {
    this.resetCombos();
    this.bus.emit('input:gamepadDisconnected', info);
    if (this.activeDevice === DEVICES.gamepad) this.setActiveDevice(DEVICES.keyboardMouse);
  }
}
