// The station's ledger (DESIGN.md "The ledger"): a book on the comms room
// desk, the one place to manage the whole station. Placeholder look (the
// pixel-font book is Session 19's); controller-driven:
//   LB / RB or D-pad left / right: tab   D-pad up / down or stick: row
//   A: do it   B: close
// It doesn't pause the clock: zombies keep coming while you read.
// The pages come from the station (getPages(): [{ id, title, rows:
// [{ label, value, action }] }]); an action returns a message to show.
//
// Events: 'ledger:opened', 'ledger:closed'.

export class Ledger {
  constructor(ledgerConfig, bus) {
    this.cfg = ledgerConfig;
    this.bus = bus;
  }

  init(root, getPages, getSummary) {
    this.getPages = getPages;
    this.getSummary = getSummary;
    this.el = document.createElement('div');
    this.el.className = 'ledger hidden';
    root.appendChild(this.el);
    this.isOpen = false;
    this.tab = 0;
    this.row = 0;
    this.message = '';
    this.refreshTimer = 0;
    this.stickDir = 0;
    this.repeatTimer = 0;
  }

  // only: a page id to open on its own (the turret's menu), or nothing for the whole book.
  open(only = null) {
    if (this.isOpen) return null;
    this.isOpen = true;
    this.only = only;
    this.tab = 0;
    this.row = 0;
    this.message = '';
    this.el.classList.remove('hidden');
    this.render();
    this.bus.emit('ledger:opened');
    return null;
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.el.classList.add('hidden');
    this.bus.emit('ledger:closed');
  }

  // playing: false while the debug menu or map is open.
  // The pages to show: the whole book, or the one page opened on its own.
  pages() {
    const all = this.getPages();
    return this.only ? all.filter((p) => p.id === this.only) : all;
  }

  update(dt, input, playing) {
    if (!this.isOpen || !playing) return;
    const pages = this.pages();
    if (input.wasPressed('menuLeft')) this.setTab(this.tab - 1, pages);
    if (input.wasPressed('menuRight')) this.setTab(this.tab + 1, pages);
    if (input.wasPressed('menuUp')) this.moveRow(-1, pages);
    if (input.wasPressed('menuDown')) this.moveRow(1, pages);
    this.updateStick(dt, input, pages);
    if (input.wasPressed('menuConfirm')) {
      const row = pages[this.tab]?.rows[this.row];
      if (row?.action) {
        this.message = row.action() ?? '';
        this.bus.emit('ledger:action');
      }
      this.render();
    }
    if (input.wasPressed('menuBack')) {
      this.close();
      return;
    }
    this.refreshTimer -= dt;
    if (this.refreshTimer <= 0) this.render();
  }

  setTab(i, pages) {
    this.tab = (i + pages.length) % pages.length;
    this.row = 0;
    this.message = '';
    this.bus.emit('ledger:page');
    this.render();
  }

  moveRow(step, pages) {
    const rows = pages[this.tab]?.rows ?? [];
    if (rows.length === 0) return;
    this.row = (this.row + step + rows.length) % rows.length;
    this.render();
  }

  // Left stick (or WASD) moves the row, repeating while held.
  updateStick(dt, input, pages) {
    const y = input.getMove().y;
    const dir = y > this.cfg.stickThreshold ? -1 : y < -this.cfg.stickThreshold ? 1 : 0;
    if (dir === 0) {
      this.stickDir = 0;
      return;
    }
    if (dir !== this.stickDir) {
      this.stickDir = dir;
      this.repeatTimer = this.cfg.repeatDelay;
      this.moveRow(dir, pages);
      return;
    }
    this.repeatTimer -= dt;
    if (this.repeatTimer <= 0) {
      this.repeatTimer = this.cfg.repeatInterval;
      this.moveRow(dir, pages);
    }
  }

  render() {
    this.refreshTimer = this.cfg.refreshSeconds;
    const pages = this.pages();
    this.tab = Math.min(this.tab, pages.length - 1);
    const page = pages[this.tab];
    this.row = Math.min(this.row, Math.max(0, page.rows.length - 1));
    const tabs = pages.map((p, i) => `<span class="${i === this.tab ? 'on' : ''}">${escapeHtml(p.title)}</span>`).join('');
    const rows = page.rows
      .map((r, i) => {
        const cls = [i === this.row ? 'selected' : '', r.action ? 'can' : 'info'].join(' ');
        return `<li class="${cls}"><span class="ledger-label">${escapeHtml(r.label)}</span><span class="ledger-value">${escapeHtml(r.value ?? '')}</span></li>`;
      })
      .join('');
    // Keep the list's scroll across the redraw, so moving up climbs the
    // highlight to the top before the list scrolls (Aaron, M5).
    const scroll = this.el.querySelector('ul')?.scrollTop ?? 0;
    this.el.innerHTML = `
      <div class="ledger-book">
        <h2>${this.only ? escapeHtml(page.title.toUpperCase()) : 'STATION LEDGER'}</h2>
        <div class="ledger-summary">${escapeHtml(this.getSummary())}</div>
        <div class="ledger-tabs">${tabs}</div>
        <ul>${rows}</ul>
        <div class="ledger-message">${escapeHtml(this.message)}</div>
        <p class="ledger-help">${this.only ? '' : 'LB / RB: tab &middot; '}D-pad / stick: move &middot; A: do it &middot; B: close &middot; the night goes on while you read</p>
      </div>
    `;
    const list = this.el.querySelector('ul');
    if (list) list.scrollTop = this.lastTab === this.tab ? scroll : 0;
    this.lastTab = this.tab;
    this.el.querySelector('li.selected')?.scrollIntoView({ block: 'nearest' });
  }

  dispose() {
    this.el.remove();
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
