// Raw keyboard and mouse state. Knows nothing about actions; Input maps
// codes and buttons to actions. Mouse movement only counts while the
// pointer is locked to the canvas.

// Keys whose browser default (focus change, find, page scroll) must not run.
const BLOCKED_DEFAULT_KEYS = new Set([
  'Tab', 'Space', 'F3', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Backquote',
]);

// Listeners that call preventDefault() can't be passive.
const ACTIVE_LISTENERS = new Set(['keydown', 'wheel', 'contextmenu']);

export class KeyboardMouseInput {
  constructor() {
    this.keysDown = new Set();
    this.keysTapped = new Set(); // pressed since last poll, even if released
    this.buttonsDown = new Set();
    this.buttonsTapped = new Set();
    this.mouseDx = 0;
    this.mouseDy = 0;
    this.wheelTicks = 0;
    this.activity = false;
    this.lockTarget = null;
  }

  init(lockTarget) {
    this.lockTarget = lockTarget;
    this.handlers = {
      keydown: (e) => this.onKeyDown(e),
      keyup: (e) => this.keysDown.delete(e.code),
      mousedown: (e) => this.onMouseDown(e),
      mouseup: (e) => this.buttonsDown.delete(e.button),
      mousemove: (e) => this.onMouseMove(e),
      wheel: (e) => this.onWheel(e),
      blur: () => this.releaseAll(),
      contextmenu: (e) => e.preventDefault(),
    };
    for (const [name, fn] of Object.entries(this.handlers)) {
      window.addEventListener(name, fn, { passive: !ACTIVE_LISTENERS.has(name) });
    }
  }

  update() {}

  dispose() {
    for (const [name, fn] of Object.entries(this.handlers ?? {})) {
      window.removeEventListener(name, fn);
    }
    this.releaseAll();
  }

  onKeyDown(e) {
    if (BLOCKED_DEFAULT_KEYS.has(e.code)) e.preventDefault();
    if (e.repeat) return;
    this.keysDown.add(e.code);
    this.keysTapped.add(e.code);
    this.activity = true;
  }

  onMouseDown(e) {
    this.buttonsDown.add(e.button);
    this.buttonsTapped.add(e.button);
    this.activity = true;
  }

  onMouseMove(e) {
    if (!this.isPointerLocked()) return;
    this.mouseDx += e.movementX;
    this.mouseDy += e.movementY;
    if (e.movementX !== 0 || e.movementY !== 0) this.activity = true;
  }

  onWheel(e) {
    if (!this.isPointerLocked()) return;
    e.preventDefault();
    if (e.deltaY !== 0) {
      this.wheelTicks += Math.sign(e.deltaY);
      this.activity = true;
    }
  }

  isPointerLocked() {
    return this.lockTarget !== null && document.pointerLockElement === this.lockTarget;
  }

  // Ask for pointer lock (desktop only; harmless where unsupported).
  requestPointerLock() {
    if (!this.lockTarget?.requestPointerLock) return;
    try {
      const result = this.lockTarget.requestPointerLock();
      result?.catch?.(() => {});
    } catch {
      // Not supported here (e.g. touch-only device). Ignore.
    }
  }

  releaseAll() {
    this.keysDown.clear();
    this.buttonsDown.clear();
  }

  // Snapshot of this frame's state; clears the per-frame accumulators.
  poll() {
    const snapshot = {
      keys: new Set([...this.keysDown, ...this.keysTapped]),
      buttons: new Set([...this.buttonsDown, ...this.buttonsTapped]),
      mouseDx: this.mouseDx,
      mouseDy: this.mouseDy,
      wheelTicks: this.wheelTicks,
      activity: this.activity,
    };
    this.keysTapped.clear();
    this.buttonsTapped.clear();
    this.mouseDx = 0;
    this.mouseDy = 0;
    this.wheelTicks = 0;
    this.activity = false;
    return snapshot;
  }
}
