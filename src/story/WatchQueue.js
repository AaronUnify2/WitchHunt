// Clips that wait for the player (Session 16, Aaron): a tape or a live
// feed doesn't play the moment it comes up (mid-fight, mid-search, over
// the family's talk); a prompt waits on screen ("D-pad down: play the
// camcorder") and it plays when the player presses the 'watch' button
// (D-pad down; V on a keyboard). One at a time, oldest first; the prompt
// hides while a cutscene, the map or a menu is up.
//
// offer({ id, pad, key, play }): pad / key: the prompt's words for each
// device; play(): starts it. has(id), cancel(id). Not saved: whoever
// offers re-offers on load.
//
// Events: 'watch:offered' { id }, 'watch:played' { id }.

export class WatchQueue {
  constructor(bus) {
    this.bus = bus;
    this.queue = [];
  }

  init(root) {
    if (typeof document === 'undefined' || !root) return;
    this.el = document.createElement('div');
    this.el.className = 'toast hint watch hidden';
    root.appendChild(this.el);
  }

  offer(item) {
    if (!item?.id || this.has(item.id)) return false;
    this.queue.push(item);
    this.bus?.emit('watch:offered', { id: item.id });
    return true;
  }

  has(id) {
    return this.queue.some((q) => q.id === id);
  }

  cancel(id) {
    this.queue = this.queue.filter((q) => q.id !== id);
  }

  clear() {
    this.queue.length = 0;
    this.el?.classList.add('hidden');
  }

  // canWatch: the world's running with the controls Tom's (no cutscene, map, ledger or menu).
  update(dt, input, canWatch) {
    const next = this.queue[0];
    const show = Boolean(next) && canWatch;
    if (this.el) {
      if (show) this.el.textContent = input.activeDevice === 'keyboardMouse' ? next.key : next.pad;
      this.el.classList.toggle('hidden', !show);
    }
    if (show && input.wasPressed('watch')) {
      this.queue.shift();
      input.swallowHeld?.();
      this.el?.classList.add('hidden');
      this.bus?.emit('watch:played', { id: next.id });
      next.play();
    }
  }

  dispose() {
    this.el?.remove();
  }
}
