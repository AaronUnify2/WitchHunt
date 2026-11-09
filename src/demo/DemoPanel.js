// Session 22 (Aaron): Demo mode's panel. Menu / Esc opens it (in place of
// the pause menu) and it holds the world while it's up. Rows are given by
// DemoMode: each has a label, maybe a value with left / right to change it
// (D-pad or arrows, or tap the arrows), maybe an action (A / Enter, or tap
// the row). B / Menu / Esc closes it. Styled as the pause menu.
//
// row: { id, label, value?() -> string, adjust?(step), pick?(), note?() -> string }

const GRACE_MS = 250;
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export class DemoPanel {
  constructor(rows, onClose) {
    this.rows = rows;
    this.onClose = onClose;
    this.isOpen = false;
    this.focus = 0;
  }

  init(root) {
    if (typeof document === 'undefined' || !root) return;
    this.el = document.createElement('div');
    this.el.className = 'pause demo-panel hidden';
    this.el.innerHTML = `
      <div class="pause-panel">
        <h2 class="pause-title">DEMO</h2>
        <div class="pause-choices demo-rows"></div>
        <p class="pause-hint"></p>
      </div>
    `;
    root.appendChild(this.el);
    this.choicesEl = this.el.querySelector('.demo-rows');
    this.hintEl = this.el.querySelector('.pause-hint');
    this.onPointerUp = (e) => {
      if (!this.isOpen) return;
      e.preventDefault();
      e.stopPropagation();
      const b = e.target.closest('[data-row]');
      if (!b) return;
      const i = Number(b.dataset.row);
      this.focus = i;
      const arrow = e.target.closest('[data-step]');
      if (arrow) this.adjust(Number(arrow.dataset.step));
      else this.pick();
    };
    this.el.addEventListener('pointerup', this.onPointerUp);
  }

  open(device = 'gamepad') {
    if (this.isOpen) return;
    this.isOpen = true;
    this.openedAt = now();
    this.device = device;
    this.render();
    this.el?.classList.remove('hidden');
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.el?.classList.add('hidden');
    this.onClose?.();
  }

  render() {
    if (!this.el) return;
    const pad = this.device !== 'keyboardMouse';
    this.choicesEl.innerHTML = this.rows
      .map((r, i) => {
        const value = r.value ? `<span class="demo-value"><span class="demo-arrow" data-step="-1">◀</span> ${r.value()} <span class="demo-arrow" data-step="1">▶</span></span>` : '';
        const note = r.note?.() ?? '';
        return `<button type="button" class="start-choice demo-row${i === this.focus ? ' focused' : ''}" data-row="${i}"><span class="demo-label">${r.label}</span>${value}${note ? `<span class="start-note">${note}</span>` : ''}</button>`;
      })
      .join('');
    this.choicesEl.children[this.focus]?.scrollIntoView?.({ block: 'nearest' });
    this.hintEl.textContent = pad ? 'D-pad: move and change · A: pick · B: back to the game' : 'Arrows: move and change · Enter: pick · Esc: back to the game';
  }

  move(step) {
    const n = this.rows.length;
    this.focus = (this.focus + step + n) % n;
    this.render();
  }

  adjust(step) {
    const r = this.rows[this.focus];
    if (!r?.adjust) return;
    r.adjust(step);
    this.render();
  }

  // A row's action, or one step on for a value with none.
  pick() {
    const r = this.rows[this.focus];
    if (!r) return;
    if (r.pick) r.pick();
    else if (r.adjust) r.adjust(1);
    if (this.isOpen) this.render();
  }

  // openedThisFrame: the press that opened it mustn't also close it.
  update(input, openedThisFrame = false) {
    if (!this.isOpen) return false;
    if (input.activeDevice && input.activeDevice !== this.device) {
      this.device = input.activeDevice;
      this.render();
    }
    if (openedThisFrame || now() - this.openedAt < GRACE_MS) return true;
    if (input.wasPressed('menuUp')) this.move(-1);
    else if (input.wasPressed('menuDown')) this.move(1);
    else if (input.wasPressed('menuLeft')) this.adjust(-1);
    else if (input.wasPressed('menuRight')) this.adjust(1);
    else if (input.wasPressed('menuConfirm')) {
      input.swallowHeld?.();
      this.pick();
    } else if (input.wasPressed('menuBack') || input.wasPressed('pause')) {
      input.swallowHeld?.();
      this.close();
    }
    return this.isOpen;
  }

  dispose() {
    this.el?.removeEventListener('pointerup', this.onPointerUp);
    this.el?.remove();
  }
}
