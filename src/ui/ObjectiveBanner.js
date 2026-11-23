// The objective, popped up top left when it changes (Aaron, Nov 2026: the map's "NEXT: ..."
// line, shown as it happens, then collapsing away). Waits out a cutscene, a paper, a card or
// a menu (held), so it isn't missed; a newer objective replaces one still waiting or showing.

import { readSeconds } from './Toast.js';

export class ObjectiveBanner {
  constructor(bannerConfig, bus) {
    this.cfg = bannerConfig;
    this.bus = bus;
    this.pending = null;
    this.remaining = 0;
  }

  init(root) {
    this.el = document.createElement('div');
    this.el.className = 'objective-banner';
    this.el.innerHTML = '<span class="objective-label"></span><span class="objective-text"></span>';
    this.el.querySelector('.objective-label').textContent = this.cfg.label;
    this.textEl = this.el.querySelector('.objective-text');
    root.appendChild(this.el);
    this.off = this.bus.on('objective:changed', ({ text }) => {
      if (text) this.pending = text;
    });
  }

  // held: something's up that it shouldn't pop over (it waits, or pauses if it's showing).
  update(dt, held) {
    if (held) return;
    if (this.pending) {
      this.textEl.textContent = this.pending;
      this.pending = null;
      this.el.classList.remove('open');
      void this.el.offsetWidth; // restart the slide-in if one was showing
      this.el.classList.add('open');
      this.remaining = readSeconds(this.textEl.textContent, this.cfg.read);
      return;
    }
    if (this.remaining > 0) {
      this.remaining -= dt;
      if (this.remaining <= 0) this.el.classList.remove('open');
    }
  }

  dispose() {
    this.off?.();
    this.el?.remove();
  }
}
