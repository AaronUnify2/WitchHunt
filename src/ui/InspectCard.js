// The inspect card (Session 20; DESIGN.md "Resources and inventory":
// Pickups, Aaron Nov 8). A special item found in the world (a tape, a
// paper, alien tech) gets a card instead of a toast: the item turning
// slowly, its name, a line about it, and what to do with it:
//  - D-pad down (V): watch it (a tape);
//  - A (Enter): read it (a paper), or take it;
//  - B (Esc): keep it for later. A kept tape or paper is handed in at the
//    comms room and played or read again from the ledger's monitors.
// Watching becomes the player's choice rather than the game cutting away.
// The world waits while it's up (Game counts it as a notice, like a paper).
//
// The turning item is a placeholder: a CSS 3D box in the item's shape and
// colour (no WebGL scene, no lights; art pass later). The card's words
// are in src/data/lore.json (each item's `card`).
//
// show(id, { watch, read, take, keep }): each a function; the card offers
// the ones given. keep runs on B (and when no other is chosen). Returns
// false if there's no screen or no such item (the caller does it the old way).
//
// Events: 'inspect:opened' { id }, 'inspect:closed' { id, choice }.

import loreData from '../data/lore.json';

// The words on the card's buttons (exported for the tests).
export function cardActions({ watch, read, take }, pad = true) {
  const out = [];
  if (watch) out.push({ id: 'watch', label: `${pad ? 'D-pad ▼' : 'V'}: watch it` });
  if (read) out.push({ id: 'read', label: `${pad ? 'A' : 'Enter'}: read it` });
  else if (take) out.push({ id: 'take', label: `${pad ? 'A' : 'Enter'}: take it` });
  out.push({ id: 'keep', label: `${pad ? 'B' : 'Esc'}: keep it for later` });
  return out;
}

export class InspectCard {
  constructor(bus, data = loreData) {
    this.bus = bus;
    this.byId = new Map(data.items.map((i) => [i.id, i]));
  }

  init(root, sfx) {
    this.sfx = sfx;
    this.isOpen = false;
    this.item = null;
    this.handlers = null;
    if (typeof document === 'undefined' || !root) return;
    this.el = document.createElement('div');
    this.el.className = 'inspect hidden';
    this.el.innerHTML = `
      <div class="inspect-card">
        <div class="inspect-stage"><div class="inspect-item">${['front', 'back', 'left', 'right', 'top', 'bottom'].map((f) => `<i class="inspect-face ${f}"></i>`).join('')}</div></div>
        <p class="inspect-name"></p>
        <p class="inspect-line"></p>
        <div class="inspect-actions"></div>
      </div>
    `;
    root.appendChild(this.el);
    this.itemEl = this.el.querySelector('.inspect-item');
    this.nameEl = this.el.querySelector('.inspect-name');
    this.lineEl = this.el.querySelector('.inspect-line');
    this.actionsEl = this.el.querySelector('.inspect-actions');
    this.onPointerUp = (e) => {
      if (!this.isOpen) return;
      e.preventDefault();
      e.stopPropagation();
      const b = e.target.closest('[data-choice]');
      this.choose(b ? b.dataset.choice : 'keep');
    };
    this.el.addEventListener('pointerup', this.onPointerUp);
  }

  has(id) {
    return Boolean(this.byId.get(id)?.card);
  }

  show(id, handlers = {}, device = 'gamepad') {
    const item = this.byId.get(id);
    if (!item?.card || !this.el || this.isOpen) return false;
    this.item = item;
    this.handlers = handlers;
    this.device = device;
    this.isOpen = true;
    const c = item.card;
    this.itemEl.className = `inspect-item look-${c.look ?? 'box'}`;
    this.itemEl.style.setProperty('--item-color', c.color ?? '#555');
    this.itemEl.style.setProperty('--item-label', c.label ?? '#ddd');
    this.nameEl.textContent = item.name;
    this.lineEl.textContent = c.line ?? '';
    this.render();
    this.el.classList.remove('hidden');
    if (typeof document !== 'undefined' && document.pointerLockElement) document.exitPointerLock?.();
    this.sfx?.play('pickup');
    this.bus?.emit('inspect:opened', { id });
    return true;
  }

  render() {
    const pad = this.device !== 'keyboardMouse';
    this.actionsEl.replaceChildren(
      ...cardActions(this.handlers, pad).map((a) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.dataset.choice = a.id;
        b.textContent = a.label;
        return b;
      }),
    );
  }

  // choice: 'watch', 'read', 'take' or 'keep'.
  choose(choice, input) {
    if (!this.isOpen) return;
    const id = this.item.id;
    const h = this.handlers;
    this.isOpen = false;
    this.item = null;
    this.handlers = null;
    this.el?.classList.add('hidden');
    input?.swallowHeld?.();
    this.bus?.emit('inspect:closed', { id, choice });
    const fn = h[choice] ?? h.keep;
    fn?.();
  }

  // Before the world's step (after the paper's: a card that opens a paper
  // mustn't hand it the same press). Returns true while it holds the game.
  update(dt, input) {
    if (!this.isOpen) return false;
    if (input.activeDevice && input.activeDevice !== this.device) {
      this.device = input.activeDevice;
      this.render();
    }
    const h = this.handlers;
    if (h.watch && input.wasPressed('watch')) this.choose('watch', input);
    else if ((h.read || h.take) && input.wasPressed('menuConfirm')) this.choose(h.read ? 'read' : 'take', input);
    else if (input.wasPressed('menuBack')) this.choose('keep', input);
    return this.isOpen;
  }

  dispose() {
    this.el?.removeEventListener('pointerup', this.onPointerUp);
    this.el?.remove();
  }
}
