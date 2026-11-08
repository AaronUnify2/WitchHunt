// The pause menu (Session 20; DESIGN.md "Run length and saving", Aaron
// Nov 8: runs are longer now, so save and quit came forward to M10).
// Menu (Esc, or losing the mouse lock) pauses the game, the clock too:
//  - Resume (B / Menu / Esc also resume);
//  - Save and quit: saves the run and goes back to the main menu, where
//    Continue picks it up (Game puts Tom back at a safe point: home);
//  - Settings: greyed until its session.
// Saving can be refused (the opening, before dawn 1; past the point of no
// return): the choice is greyed with the reason.
// D-pad / arrows move, A / Enter picks; taps and clicks pick too.
//
// actions: { resume(), saveAndQuit(), canSave() -> null | reason }.

export const PAUSE_ITEMS = ['resume', 'saveQuit', 'settings'];
const GRACE_MS = 250;
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

// The menu's rows for a save state (exported for the tests).
export function pauseRows(saveRefusal) {
  return [
    { id: 'resume', label: 'Resume', note: '', enabled: true },
    { id: 'saveQuit', label: 'Save and quit', note: saveRefusal ?? 'back to the main menu: Continue picks it up', enabled: !saveRefusal },
    { id: 'settings', label: 'Settings', note: 'coming later', enabled: false },
  ];
}

export class PauseMenu {
  constructor(actions) {
    this.actions = actions;
    this.isOpen = false;
    this.focus = 0;
    this.rows = pauseRows(null);
  }

  init(root) {
    if (typeof document === 'undefined' || !root) return;
    this.el = document.createElement('div');
    this.el.className = 'pause hidden';
    this.el.innerHTML = `
      <div class="pause-panel">
        <h2 class="pause-title">PAUSED</h2>
        <div class="pause-choices"></div>
        <p class="pause-hint"></p>
      </div>
    `;
    root.appendChild(this.el);
    this.choicesEl = this.el.querySelector('.pause-choices');
    this.hintEl = this.el.querySelector('.pause-hint');
    this.onPointerUp = (e) => {
      if (!this.isOpen) return;
      e.preventDefault();
      e.stopPropagation();
      const b = e.target.closest('[data-choice]');
      if (b && !b.disabled) this.pick(b.dataset.choice);
    };
    this.el.addEventListener('pointerup', this.onPointerUp);
  }

  open(device = 'gamepad') {
    if (this.isOpen) return;
    this.isOpen = true;
    this.openedAt = now();
    this.device = device;
    this.rows = pauseRows(this.actions.canSave?.() ?? null);
    this.focus = 0;
    this.render();
    this.el?.classList.remove('hidden');
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.el?.classList.add('hidden');
  }

  render() {
    if (!this.el) return;
    const pad = this.device !== 'keyboardMouse';
    this.choicesEl.innerHTML = this.rows
      .map((r, i) => `<button type="button" class="start-choice${i === this.focus ? ' focused' : ''}" data-choice="${r.id}"${r.enabled ? '' : ' disabled'}>${r.label}${r.note ? `<span class="start-note">${r.note}</span>` : ''}</button>`)
      .join('');
    this.hintEl.textContent = pad ? 'D-pad: move · A: pick · B: resume' : 'Arrows: move · Enter: pick · Esc: resume';
  }

  move(step) {
    const n = this.rows.length;
    for (let i = 1; i <= n; i++) {
      const k = (this.focus + step * i + n * 4) % n;
      if (this.rows[k].enabled) {
        this.focus = k;
        break;
      }
    }
    this.render();
  }

  pick(id) {
    const row = this.rows.find((r) => r.id === id);
    if (!row?.enabled) return;
    if (id === 'resume') {
      this.close();
      this.actions.resume?.();
    } else if (id === 'saveQuit') {
      this.close();
      this.actions.saveAndQuit?.();
    }
  }

  // openedThisFrame: the press that opened it mustn't also close it.
  update(input, openedThisFrame = false) {
    if (!this.isOpen) return false;
    if (input.activeDevice && input.activeDevice !== this.device) {
      this.device = input.activeDevice;
      this.render();
    }
    // The Esc that let go of the mouse lock (and opened it) can arrive a beat later: not a resume.
    if (openedThisFrame || now() - this.openedAt < GRACE_MS) return true;
    if (input.wasPressed('menuUp')) this.move(-1);
    else if (input.wasPressed('menuDown')) this.move(1);
    else if (input.wasPressed('menuConfirm')) {
      input.swallowHeld?.();
      this.pick(this.rows[this.focus].id);
    } else if (input.wasPressed('menuBack') || input.wasPressed('pause')) {
      input.swallowHeld?.();
      this.pick('resume');
    }
    return this.isOpen;
  }

  dispose() {
    this.el?.removeEventListener('pointerup', this.onPointerUp);
    this.el?.remove();
  }
}
