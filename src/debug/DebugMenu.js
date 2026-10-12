// Debug menu: a controller-navigable list of debug tools, grouped into
// categories (Aaron, M7: the flat list had grown too long to find
// things). The top level lists the categories; A opens one, B goes back
// up (B at the top closes the menu). It reopens where you left it.
// Systems add tools with menu.category('Name').addItem(label, onSelect);
// categories show in the order they were first created.
// Open: hold View + D-pad down, or the ` key. Navigate: D-pad / left stick / arrows.
// Select: A / Enter. Back: B / Esc.
// Emits 'debug:menuOpened' and 'debug:menuClosed'.

// The categories, in the order the top level lists them.
export const DEBUG = {
  time: 'Time & night',
  teleport: 'Teleport & map',
  witch: 'Witch',
  zombies: 'Sigils & zombies',
  player: 'Player',
  station: 'Station & vehicles',
  run: 'Run & save',
  display: 'Display & performance',
};

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
    this.categories = Object.values(DEBUG).map((name) => ({ name, items: [] })); // [{ name, items: [{ label, onSelect }] }]
    this.current = null; // the open category, or null at the top level
    this.selected = 0;
    this.topSelected = 0; // remembered while inside a category
    this.isOpen = false;
    this.stickDir = 0;
    this.repeatTimer = 0;
  }

  dispose() {
    this.el.remove();
  }

  // The category called `name` (made on first use): { addItem(label, onSelect) }.
  category(name) {
    let cat = this.categories.find((c) => c.name === name);
    if (!cat) {
      cat = { name, items: [] };
      this.categories.push(cat);
    }
    return { addItem: (label, onSelect) => this.addItem(label, onSelect, name) };
  }

  // label is a string, or a function returning one (re-read after every
  // selection, e.g. "Quality: medium"). Without a category the item goes
  // in "Other". Returns a function that removes the item again.
  addItem(label, onSelect, categoryName = 'Other') {
    this.category(categoryName);
    const cat = this.categories.find((c) => c.name === categoryName);
    const item = { label, onSelect };
    cat.items.push(item);
    this.render();
    return () => {
      cat.items = cat.items.filter((i) => i !== item);
      this.selected = Math.min(this.selected, Math.max(0, this.rows().length - 1));
      this.render();
    };
  }

  // What's listed now: the categories (top level) or the open one's items.
  rows() {
    if (!this.current) return this.categories.filter((c) => c.items.length > 0);
    return this.current.items;
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

  enter(cat) {
    this.topSelected = this.selected;
    this.current = cat;
    this.selected = 0;
    this.render(true);
  }

  back() {
    if (!this.current) {
      this.close();
      return;
    }
    this.current = null;
    this.selected = this.topSelected;
    this.render(true);
  }

  update(dt) {
    if (!this.isOpen) return;
    const input = this.input;
    if (input.wasPressed('menuUp')) this.moveSelection(-1);
    if (input.wasPressed('menuDown')) this.moveSelection(1);
    this.updateStick(dt);
    if (input.wasPressed('menuConfirm')) {
      const row = this.rows()[this.selected];
      if (row && !this.current) this.enter(row);
      else if (row) {
        row.onSelect();
        if (this.isOpen) this.render();
      }
    } else if (input.wasPressed('menuBack')) {
      this.back();
    }
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
    const n = this.rows().length;
    if (n === 0) return;
    this.selected = (this.selected + step + n) % n;
    this.render();
  }

  // fresh: a different list is showing, so start it scrolled to the top.
  render(fresh = false) {
    const rows = this.rows();
    const top = !this.current;
    const html = rows
      .map((row, i) => {
        const text = top ? `${row.name}  ›` : labelOf(row);
        const count = top ? `<span class="debug-menu-count">${row.items.length}</span>` : '';
        return `<li class="${i === this.selected ? 'selected' : ''}">${escapeHtml(text)}${count}</li>`;
      })
      .join('');
    // Keep the list's scroll across the redraw, so moving up climbs the
    // highlight to the top before the list scrolls (Aaron, M5).
    const scroll = fresh ? 0 : (this.el.querySelector('ul')?.scrollTop ?? 0);
    const title = top ? 'DEBUG MENU' : `DEBUG MENU &rsaquo; ${escapeHtml(this.current.name.toUpperCase())}`;
    const help = top ? 'D-pad / stick: move &middot; A: open &middot; B: close' : 'D-pad / stick: move &middot; A: select &middot; B: back';
    this.el.innerHTML = `
      <h2>${title}</h2>
      <ul>${html}</ul>
      <p class="debug-menu-help">${help}</p>
    `;
    const list = this.el.querySelector('ul');
    if (list) list.scrollTop = scroll;
    this.el.querySelector('li.selected')?.scrollIntoView({ block: 'nearest' });
  }
}

function labelOf(item) {
  return typeof item.label === 'function' ? item.label() : item.label;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
