// Debug menu stub: an empty, controller-navigable list that later
// milestones fill with addItem() (set seed, skip time, spawn, ...).
// Open: hold L3 + R3, or the ` key. Navigate: D-pad / left stick / arrows.
// Select: A / Enter. Close: B / Esc.
// Emits 'debug:menuOpened' and 'debug:menuClosed'.

const EMPTY_NOTE = 'Empty for now. Later milestones add tools here.';

export class DebugMenu {
  constructor(menuConfig, input, bus) {
    this.cfg = menuConfig;
    this.input = input;
    this.bus = bus;
  }

  init(root) {
    this.el = document.createElement('div');
    this.el.className = 'debug-menu hidden';
    root.appendChild(this.el);
    this.items = [];
    this.selected = 0;
    this.isOpen = false;
    this.stickDir = 0;
    this.repeatTimer = 0;
  }

  dispose() {
    this.el.remove();
  }

  // Returns a function that removes the item again.
  addItem(label, onSelect) {
    const item = { label, onSelect };
    this.items.push(item);
    this.render();
    return () => {
      this.items = this.items.filter((i) => i !== item);
      this.selected = Math.min(this.selected, Math.max(0, this.items.length - 1));
      this.render();
    };
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.stickDir = 0;
    this.el.classList.remove('hidden');
    this.render();
    this.bus.emit('debug:menuOpened');
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.el.classList.add('hidden');
    this.bus.emit('debug:menuClosed');
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  update(dt) {
    if (!this.isOpen) return;
    const input = this.input;
    if (input.wasPressed('menuUp')) this.moveSelection(-1);
    if (input.wasPressed('menuDown')) this.moveSelection(1);
    this.updateStick(dt);
    if (input.wasPressed('menuConfirm')) this.items[this.selected]?.onSelect();
    if (input.wasPressed('menuBack')) this.close();
  }

  // Left stick (or WASD) moves the selection, repeating while held.
  updateStick(dt) {
    const y = this.input.getMove().y;
    const dir = y > this.cfg.stickThreshold ? -1 : y < -this.cfg.stickThreshold ? 1 : 0;
    if (dir === 0) {
      this.stickDir = 0;
      return;
    }
    if (dir !== this.stickDir) {
      this.stickDir = dir;
      this.repeatTimer = this.cfg.repeatDelay;
      this.moveSelection(dir);
      return;
    }
    this.repeatTimer -= dt;
    if (this.repeatTimer <= 0) {
      this.repeatTimer = this.cfg.repeatInterval;
      this.moveSelection(dir);
    }
  }

  moveSelection(step) {
    if (this.items.length === 0) return;
    this.selected = (this.selected + step + this.items.length) % this.items.length;
    this.render();
  }

  render() {
    const rows = this.items
      .map((item, i) => `<li class="${i === this.selected ? 'selected' : ''}">${escapeHtml(item.label)}</li>`)
      .join('');
    this.el.innerHTML = `
      <h2>DEBUG MENU</h2>
      <p class="debug-menu-note">${EMPTY_NOTE}</p>
      <ul>${rows}</ul>
      <p class="debug-menu-help">D-pad / stick: move &middot; A: select &middot; B: close</p>
    `;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
