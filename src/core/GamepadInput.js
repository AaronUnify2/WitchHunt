// Raw gamepad state through the Gamepad API, polled every frame.
// Uses the W3C "standard" mapping, which is the Xbox layout.
// Handles connecting and disconnecting at any time by polling.
// Note: Chrome only exposes a pad after a button press on it.

// Standard-mapping button indices, by Xbox name. A fixed part of the
// Gamepad spec, not a tuning number.
export const GAMEPAD_BUTTONS = {
  A: 0, B: 1, X: 2, Y: 3,
  LB: 4, RB: 5, LT: 6, RT: 7,
  View: 8, Menu: 9, L3: 10, R3: 11,
  DpadUp: 12, DpadDown: 13, DpadLeft: 14, DpadRight: 15,
  Guide: 16,
};

export const GAMEPAD_BUTTON_NAMES = Object.fromEntries(
  Object.entries(GAMEPAD_BUTTONS).map(([name, index]) => [index, name]),
);

// Standard-mapping axis indices.
export const GAMEPAD_AXES = { LX: 0, LY: 1, RX: 2, RY: 3 };

// "Xbox Wireless Controller (STANDARD GAMEPAD Vendor: ...)" -> "Xbox Wireless Controller"
export function shortPadName(id) {
  return id.replace(/\s*\(.*\)\s*$/, '') || id;
}

const ANALOGUE_TRIGGERS = new Set([GAMEPAD_BUTTONS.LT, GAMEPAD_BUTTONS.RT]);

export class GamepadInput {
  constructor(gamepadConfig, callbacks) {
    this.cfg = gamepadConfig;
    this.onConnect = callbacks.onConnect;
    this.onDisconnect = callbacks.onDisconnect;
    this.index = null; // navigator.getGamepads() slot we're using
    this.info = null; // { id, mapping } of the pad in use
  }

  init() {
    this.supported = typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function';
    // The events only nudge an immediate poll; polling is the source of truth.
    this.handlers = {
      gamepadconnected: () => this.poll(),
      gamepaddisconnected: () => this.poll(),
    };
    for (const [name, fn] of Object.entries(this.handlers)) {
      window.addEventListener(name, fn);
    }
  }

  update() {}

  dispose() {
    for (const [name, fn] of Object.entries(this.handlers ?? {})) {
      window.removeEventListener(name, fn);
    }
  }

  get connected() {
    return this.index !== null;
  }

  listPads() {
    if (!this.supported) return [];
    return Array.from(navigator.getGamepads?.() ?? []).filter((p) => p && p.connected);
  }

  // Prefer a pad with the standard (Xbox) mapping.
  choosePad(pads) {
    return pads.find((p) => p.mapping === 'standard') ?? pads[0] ?? null;
  }

  // Returns this frame's pad state, or null if no pad is connected.
  poll() {
    const pads = this.listPads();
    let pad = pads.find((p) => p.index === this.index) ?? null;

    if (!pad && this.index !== null) {
      const lost = this.info;
      this.index = null;
      this.info = null;
      this.onDisconnect?.(lost);
    }
    if (!pad) {
      pad = this.choosePad(pads);
      if (pad) {
        this.index = pad.index;
        this.info = { id: pad.id, mapping: pad.mapping || 'non-standard' };
        this.onConnect?.(this.info);
      }
    }
    if (!pad) return null;

    const pressed = pad.buttons.map((b, i) =>
      ANALOGUE_TRIGGERS.has(i) ? b.value >= this.cfg.triggerThreshold || b.pressed : b.pressed,
    );
    const values = pad.buttons.map((b) => b.value);
    const axes = Array.from(pad.axes);
    return { pressed, values, axes };
  }
}
