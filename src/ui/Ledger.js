// The station's ledger (DESIGN.md "The ledger"): a book on the comms room
// desk, the one place to manage the whole station. Placeholder look (the
// pixel-font book is Session 19's); controller-driven, and tappable:
//   LB / RB: tab (D-pad left / right too, on a page without a plan)
//   D-pad up / down or stick: row; on a plan, the D-pad moves round it
//   A: do it   B: close
// Tap or click a tab, a row or a part of a plan to do it (Session 15b).
// It doesn't pause the clock: zombies keep coming while you read.
// The pages come from the station (getPages(): [{ id, title, rows:
// [{ label, value, action } | { heading }], plan? }]); an action returns a
// message to show.
// A plan (Session 15b, Aaron: the fence tab's map of the compound):
// { viewBox, back (static SVG markup), title, items: [{ svg (its shape's
// markup), hit (a bigger, invisible shape to tap, optional), x, y (its
// centre, for the D-pad), cls, label, value, action }] }. The rows come
// first, above the plan; the D-pad moves between them all by where they sit.
//
// Events: 'ledger:opened', 'ledger:closed', 'ledger:action', 'ledger:page'.

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
    this.row = 0; // the focus: an index into focusables() (rows, then the plan's parts)
    this.message = '';
    this.refreshTimer = 0;
    this.stickDir = 0;
    this.repeatTimer = 0;
    // Taps and clicks (Session 15b): one listener, as the book redraws
    // itself. On release, not 'click': a redraw between press and release
    // swaps the element under the finger and the browser drops the click.
    this.onClick = (e) => this.click(e);
    this.el.addEventListener('pointerup', this.onClick);
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
    // Session 15b: free the mouse so the book can be clicked (the canvas re-locks it on a click).
    if (typeof document !== 'undefined' && document.pointerLockElement) document.exitPointerLock?.();
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

  // The pages to show: the whole book, or the one page opened on its own.
  pages() {
    const all = this.getPages();
    return this.only ? all.filter((p) => p.id === this.only) : all;
  }

  // What the focus can land on, in order: the rows (not headings), then the plan's parts.
  focusables(page) {
    const rows = (page?.rows ?? []).filter((r) => !r.heading);
    return page?.plan ? [...rows, ...page.plan.items] : rows;
  }

  // playing: false while the debug menu or map is open.
  update(dt, input, playing) {
    if (!this.isOpen || !playing) return;
    // Keep the mouse free while the book's open (a lock granted late would take the clicks).
    if (typeof document !== 'undefined' && document.pointerLockElement) document.exitPointerLock?.();
    const pages = this.pages();
    const page = pages[this.tab];
    const plan = Boolean(page?.plan);
    // LB / RB always turn the page; the D-pad does too unless the page has a plan to move round.
    const tabPrev = input.wasPressed('tabPrev');
    const tabNext = input.wasPressed('tabNext');
    if (tabPrev) this.setTab(this.tab - 1, pages);
    else if (tabNext) this.setTab(this.tab + 1, pages);
    else if (plan) {
      if (input.wasPressed('menuLeft')) this.moveOnPlan(-1, 0, pages);
      if (input.wasPressed('menuRight')) this.moveOnPlan(1, 0, pages);
      if (input.wasPressed('menuUp')) this.moveOnPlan(0, -1, pages);
      if (input.wasPressed('menuDown')) this.moveOnPlan(0, 1, pages);
    } else {
      if (input.wasPressed('menuLeft')) this.setTab(this.tab - 1, pages);
      if (input.wasPressed('menuRight')) this.setTab(this.tab + 1, pages);
      if (input.wasPressed('menuUp')) this.moveRow(-1, pages);
      if (input.wasPressed('menuDown')) this.moveRow(1, pages);
    }
    this.updateStick(dt, input, pages);
    if (input.wasPressed('menuConfirm')) this.act(pages);
    if (input.wasPressed('menuBack')) {
      this.close();
      return;
    }
    this.refreshTimer -= dt;
    if (this.refreshTimer <= 0) this.render();
  }

  act(pages = this.pages()) {
    const target = this.focusables(pages[this.tab])[this.row];
    if (target?.action) {
      this.message = target.action() ?? '';
      this.bus.emit('ledger:action');
    }
    this.render();
  }

  setTab(i, pages) {
    this.tab = (i + pages.length) % pages.length;
    this.row = 0;
    this.message = '';
    this.bus.emit('ledger:page');
    this.render();
  }

  moveRow(step, pages) {
    const list = this.focusables(pages[this.tab]);
    if (list.length === 0) return;
    this.row = (this.row + step + list.length) % list.length;
    this.render();
  }

  // The D-pad on a plan: along and between its rings if it has them
  // (planMove), else to the nearest thing that way (rows sit above the plan).
  moveOnPlan(dx, dy, pages) {
    const page = pages[this.tab];
    const list = this.focusables(page);
    if (list.length === 0) return;
    const next = page.plan.layers ? planMove(page, this.row, dx, dy) : nearestToward(planPositions(page), this.row, dx, dy);
    if (next >= 0) this.row = next;
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
    const step = () => (pages[this.tab]?.plan ? this.moveOnPlan(0, dir, pages) : this.moveRow(dir, pages));
    if (dir !== this.stickDir) {
      this.stickDir = dir;
      this.repeatTimer = this.cfg.repeatDelay;
      step();
      return;
    }
    this.repeatTimer -= dt;
    if (this.repeatTimer <= 0) {
      this.repeatTimer = this.cfg.repeatInterval;
      step();
    }
  }

  // A tap or click: a tab, a row or a plan's part (it does it), or close.
  click(e) {
    if (!this.isOpen || (e.button !== undefined && e.button !== 0)) return;
    const t = e.target.closest?.('[data-tab],[data-focus],[data-close]');
    if (!t) return;
    const pages = this.pages();
    if (t.dataset.close !== undefined) {
      this.close();
      return;
    }
    if (t.dataset.tab !== undefined) {
      this.setTab(Number(t.dataset.tab), pages);
      return;
    }
    this.row = Number(t.dataset.focus);
    this.act(pages);
  }

  render() {
    this.refreshTimer = this.cfg.refreshSeconds;
    const pages = this.pages();
    this.tab = Math.min(this.tab, pages.length - 1);
    const page = pages[this.tab];
    const list = this.focusables(page);
    this.row = Math.min(this.row, Math.max(0, list.length - 1));
    const focused = list[this.row];
    const tabs = pages.map((p, i) => `<span class="${i === this.tab ? 'on' : ''}" data-tab="${i}">${escapeHtml(p.title)}</span>`).join('');
    let n = 0;
    const rows = page.rows
      .map((r) => {
        if (r.heading) return `<li class="heading">${escapeHtml(r.heading)}</li>`;
        const i = n++;
        const cls = [i === this.row ? 'selected' : '', r.action ? 'can' : 'info'].join(' ');
        return `<li class="${cls}" data-focus="${i}"><span class="ledger-label">${escapeHtml(r.label)}</span><span class="ledger-value">${escapeHtml(r.value ?? '')}</span></li>`;
      })
      .join('');
    const plan = page.plan ? this.planHtml(page.plan, n, focused) : '';
    // Keep the list's scroll across the redraw, so moving up climbs the
    // highlight to the top before the list scrolls (Aaron, M5).
    const scroller = this.el.querySelector('.ledger-scroll');
    const scroll = scroller?.scrollTop ?? 0;
    const help = page.plan ? 'LB / RB: tab &middot; D-pad: move round the plan &middot; A or tap: do it &middot; B: close' : `${this.only ? '' : 'LB / RB: tab &middot; '}D-pad / stick: move &middot; A or tap: do it &middot; B: close`;
    this.el.innerHTML = `
      <div class="ledger-book">
        <button class="ledger-close" data-close aria-label="Close">&times;</button>
        <h2>${this.only ? escapeHtml(page.title.toUpperCase()) : 'STATION LEDGER'}</h2>
        <div class="ledger-summary">${escapeHtml(this.getSummary())}</div>
        <div class="ledger-tabs">${tabs}</div>
        <div class="ledger-scroll">
          <ul>${rows}</ul>
          ${plan}
        </div>
        <div class="ledger-message">${escapeHtml(this.message)}</div>
        <p class="ledger-help">${help} &middot; the night goes on while you read</p>
      </div>
    `;
    const sc = this.el.querySelector('.ledger-scroll');
    if (sc) sc.scrollTop = this.lastTab === this.tab ? scroll : 0;
    this.lastTab = this.tab;
    this.el.querySelector('li.selected')?.scrollIntoView({ block: 'nearest' });
  }

  // The plan: its picture, each part tappable, the focused one lit, and a
  // line saying what it is and what A does.
  planHtml(plan, first, focused) {
    const parts = plan.items
      .map((it, j) => {
        const i = first + j;
        const sel = i === this.row ? ' selected' : '';
        return `<g class="plan-item ${it.cls ?? ''}${it.action ? ' can' : ''}${sel}" data-focus="${i}">${it.svg}${it.hit ?? ''}</g>`;
      })
      .join('');
    const onPlan = focused && plan.items.includes(focused);
    const info = onPlan ? `<span class="ledger-label">${escapeHtml(focused.label)}</span><span class="ledger-value">${escapeHtml(focused.value ?? '')}</span>` : `<span class="ledger-label">${escapeHtml(plan.hint ?? '')}</span>`;
    return `
      <div class="ledger-plan-title">${escapeHtml(plan.title ?? '')}</div>
      <svg class="ledger-plan" viewBox="${plan.viewBox}" xmlns="http://www.w3.org/2000/svg">${plan.back ?? ''}${parts}</svg>
      <div class="ledger-plan-info${onPlan && focused.action ? ' can' : ''}">${info}</div>
    `;
  }

  dispose() {
    this.el.removeEventListener('pointerup', this.onClick);
    this.el.remove();
  }
}

// Where each focusable sits, for the D-pad: the plan's parts where they're
// drawn; the rows in a column above the plan's top edge.
export function planPositions(page) {
  const rows = (page.rows ?? []).filter((r) => !r.heading);
  const [vx, vy, vw] = (page.plan?.viewBox ?? '0 0 100 100').split(/\s+/).map(Number);
  const out = rows.map((_, i) => ({ x: vx + vw / 2, y: vy - (rows.length - i) * 6 }));
  for (const it of page.plan?.items ?? []) out.push({ x: it.x, y: it.y });
  return out;
}

// The D-pad on a plan with rings (Session 15b, Aaron): `plan.layers` lists
// its rings from the outside in; each item has a `ring` and an `order`
// along it, and some a place on the `spine` (0 at its foot). Up / down on
// the spine walks it (from its top, up to the rows above the plan); left /
// right walks a ring (stopping at its ends), or from the spine sideways to
// the nearest part of the next ring out that way. Off the spine, up steps
// in a ring (to the spine from the innermost ring), down steps out.
// Returns the new focus index (rows first, then the plan's items), or -1.
export function planMove(page, from, dx, dy) {
  const rows = (page.rows ?? []).filter((r) => !r.heading).length;
  const items = page.plan.items;
  const layers = page.plan.layers;
  const all = items.map((it, j) => ({ it, j }));
  const ringOf = (name) => all.filter((e) => e.it.ring === name).sort((a, b) => a.it.order - b.it.order);
  const spine = all.filter((e) => e.it.spine !== undefined).sort((a, b) => a.it.spine - b.it.spine);
  const nearest = (list, x, y, side = 0) => {
    let best = -1;
    let bestD = Infinity;
    for (const e of list) {
      if (side && (e.it.x - x) * side <= 0) continue;
      const d = Math.hypot(e.it.x - x, e.it.y - y);
      if (d < bestD) {
        bestD = d;
        best = rows + e.j;
      }
    }
    return best;
  };
  if (from < rows) {
    if (dy < 0) return from > 0 ? from - 1 : -1;
    if (dy > 0) {
      if (from < rows - 1) return from + 1;
      // Down from the last row: the top of the spine (or the innermost ring's top-most part).
      if (spine.length) return rows + spine[spine.length - 1].j;
      const inner = ringOf(layers[layers.length - 1]);
      return inner.length ? rows + inner.reduce((a, b) => (b.it.y < a.it.y ? b : a)).j : -1;
    }
    return -1;
  }
  const cur = items[from - rows];
  if (!cur) return -1;
  if (dy !== 0 && cur.spine !== undefined) {
    const k = spine.findIndex((e) => e.j === from - rows);
    if (dy < 0) return spine[k + 1] ? rows + spine[k + 1].j : rows > 0 ? rows - 1 : -1;
    return spine[k - 1] ? rows + spine[k - 1].j : -1;
  }
  const li = layers.indexOf(cur.ring);
  if (dx !== 0) {
    if (li === layers.length - 1 && li > 0) return nearest(ringOf(layers[li - 1]), cur.x, cur.y, Math.sign(dx)); // off the spine sideways
    const ring = ringOf(cur.ring);
    const k = ring.findIndex((e) => e.j === from - rows);
    const next = ring[k + Math.sign(dx)];
    return next ? rows + next.j : -1;
  }
  if (dy < 0) {
    if (li >= 0 && li < layers.length - 1) {
      return nearest(ringOf(layers[li + 1]), cur.x, cur.y);
    }
    return rows > 0 ? rows - 1 : -1;
  }
  if (dy > 0 && li > 0) return nearest(ringOf(layers[li - 1]), cur.x, cur.y);
  return -1;
}

// The nearest position from `from` in direction (dx, dy): ahead of it, and
// favouring what's straight that way over what's off to the side. -1 if none.
export function nearestToward(pos, from, dx, dy) {
  const o = pos[from];
  if (!o) return pos.length ? 0 : -1;
  let best = -1;
  let bestScore = Infinity;
  pos.forEach((p, i) => {
    if (i === from) return;
    const vx = p.x - o.x;
    const vy = p.y - o.y;
    const along = vx * dx + vy * dy;
    if (along <= 1e-6) return;
    const across = Math.abs(vx * dy - vy * dx);
    const score = along + across * 2.5;
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return best;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
