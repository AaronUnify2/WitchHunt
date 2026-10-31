// A paper read in close-up (Session 16, Aaron: Earl's note at the gas
// station, and his diary in the storm shelter). The page fills the
// screen over a darkened view and the world waits (Game counts it as a
// notice, like the point-of-no-return pop-up). A note is a torn notepad
// sheet; a diary is a ruled notebook with a page at a time.
//  - D-pad / LB / RB (arrow keys, Q / R): turn the page.
//  - A / Enter: the next page (closes on the last).
//  - B or X (Escape, E): put it down.
//  - Taps: the left / right half of the page turns it; outside the page,
//    or the ×, puts it down.
// The press that closes it is swallowed (it doesn't reach the game).
// Text is in src/data/papers.json.
//
// Events: 'paper:opened' { id }, 'paper:closed' { id }.

import papersData from '../data/papers.json';

export class PaperNote {
  constructor(bus, data = papersData) {
    this.bus = bus;
    this.byId = new Map(data.papers.map((p) => [p.id, p]));
  }

  // sfx: optional (the rustle as it opens and as a page turns).
  init(root, sfx) {
    this.sfx = sfx;
    this.isOpen = false;
    this.paper = null;
    this.page = 0;
    this.onClose = null;
    if (typeof document === 'undefined' || !root) return;
    this.el = document.createElement('div');
    this.el.className = 'paper hidden';
    this.el.innerHTML = `
      <div class="paper-sheet">
        <button class="paper-close" type="button" aria-label="Put it down">×</button>
        <p class="paper-head"></p>
        <p class="paper-date"></p>
        <div class="paper-text"></div>
        <p class="paper-page"></p>
      </div>
      <p class="paper-prompt"></p>
    `;
    root.appendChild(this.el);
    this.sheet = this.el.querySelector('.paper-sheet');
    this.headEl = this.el.querySelector('.paper-head');
    this.dateEl = this.el.querySelector('.paper-date');
    this.textEl = this.el.querySelector('.paper-text');
    this.pageEl = this.el.querySelector('.paper-page');
    this.promptEl = this.el.querySelector('.paper-prompt');
    // Taps act on release (as the ledger's).
    this.onPointerUp = (e) => {
      if (!this.isOpen) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.target.closest('.paper-close') || !e.target.closest('.paper-sheet')) {
        this.close();
        return;
      }
      const r = this.sheet.getBoundingClientRect();
      if (e.clientX < r.left + r.width / 2) this.turn(-1);
      else this.turn(1, true);
    };
    this.el.addEventListener('pointerup', this.onPointerUp);
  }

  has(id) {
    return this.byId.has(id);
  }

  // Open a paper. onClose: called once it's put down. Returns false if
  // there's no such paper (or no screen to show it on).
  open(id, { onClose = null, device = 'gamepad' } = {}) {
    const paper = this.byId.get(id);
    if (!paper || !this.el) return false;
    this.paper = paper;
    this.page = 0;
    this.onClose = onClose;
    this.device = device;
    this.isOpen = true;
    this.sheet.className = `paper-sheet paper-${paper.kind ?? 'note'}`;
    this.el.classList.remove('hidden');
    if (typeof document !== 'undefined' && document.pointerLockElement) document.exitPointerLock?.();
    this.render();
    this.sfx?.play('paper');
    this.bus?.emit('paper:opened', { id });
    return true;
  }

  close(input) {
    if (!this.isOpen) return;
    const id = this.paper.id;
    const done = this.onClose;
    this.isOpen = false;
    this.paper = null;
    this.onClose = null;
    this.el?.classList.add('hidden');
    input?.swallowHeld?.();
    this.sfx?.play('paper');
    this.bus?.emit('paper:closed', { id });
    done?.();
  }

  // dir: -1 back, +1 on. closeAtEnd: on past the last page puts it down.
  turn(dir, closeAtEnd = false, input) {
    if (!this.paper) return;
    const last = this.paper.pages.length - 1;
    const next = this.page + dir;
    if (next > last) {
      if (closeAtEnd) this.close(input);
      return;
    }
    if (next < 0) return;
    this.page = next;
    this.sfx?.play('paper');
    this.render();
  }

  render() {
    const p = this.paper;
    const pg = p.pages[this.page];
    this.headEl.textContent = this.page === 0 || p.kind === 'diary' ? (p.head ?? '') : '';
    this.dateEl.textContent = pg.date ?? '';
    this.textEl.replaceChildren(...this.lines(pg.text ?? ''));
    const many = p.pages.length > 1;
    this.pageEl.textContent = many ? `${this.page + 1} / ${p.pages.length}` : '';
    const pad = this.device !== 'keyboardMouse';
    const turn = many ? (pad ? '◀ ▶ turn the page · ' : '← → turn the page · ') : '';
    this.promptEl.textContent = `${turn}${pad ? 'B' : 'Esc'}: put it down`;
  }

  // The text as paragraphs; *words* underlined.
  lines(text) {
    return text.split('\n').map((line) => {
      const el = document.createElement('p');
      if (!line.trim()) {
        el.className = 'paper-gap';
        return el;
      }
      line.split(/(\*[^*]+\*)/).forEach((part) => {
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
          const u = document.createElement('u');
          u.textContent = part.slice(1, -1);
          el.appendChild(u);
        } else if (part) el.appendChild(document.createTextNode(part));
      });
      return el;
    });
  }

  // Before the world's step. Returns true while the paper holds the game.
  update(dt, input) {
    if (!this.isOpen) return false;
    if (input.activeDevice && input.activeDevice !== this.device) {
      this.device = input.activeDevice;
      this.render();
    }
    if (input.wasPressed('menuBack') || input.wasPressed('interact')) this.close(input);
    else if (input.wasPressed('menuConfirm')) this.turn(1, true, input);
    else if (input.wasPressed('menuLeft') || input.wasPressed('tabPrev')) this.turn(-1);
    else if (input.wasPressed('menuRight') || input.wasPressed('tabNext')) this.turn(1);
    return this.isOpen;
  }

  dispose() {
    this.el?.removeEventListener('pointerup', this.onPointerUp);
    this.el?.remove();
  }
}
