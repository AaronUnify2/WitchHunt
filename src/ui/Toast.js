// A short message at the top of the screen (controller connected, etc.).

// Seconds to read `text` (pure): base + perWord a word, capped at max.
export function readSeconds(text, r) {
  if (!r) return 0;
  const words = String(text ?? '').trim().split(/\s+/).filter(Boolean).length;
  return Math.min(r.max, r.base + r.perWord * words);
}

export class Toast {
  constructor(uiConfig) {
    this.cfg = uiConfig;
  }

  init(root) {
    this.el = document.createElement('div');
    this.el.className = 'toast hidden';
    root.appendChild(this.el);
    this.remaining = 0;
  }

  // seconds: how long it stays (default config.ui.toastSeconds).
  // Round 2 (Aaron: the information at the top of the screen fades before it can be read): never
  // shorter than the time to read it (config.ui.toastRead: a base plus so long a word, capped).
  show(text, seconds = this.cfg.toastSeconds) {
    this.el.textContent = text;
    this.el.classList.remove('hidden');
    this.remaining = Math.max(seconds, readSeconds(text, this.cfg.toastRead));
  }

  update(dt) {
    if (this.remaining <= 0) return;
    this.remaining -= dt;
    if (this.remaining <= 0) this.el.classList.add('hidden');
  }

  dispose() {
    this.el.remove();
  }
}
