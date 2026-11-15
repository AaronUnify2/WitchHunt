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
  // Nov 15 (the toasts and cards pass, Aaron approved): one already showing isn't replaced: the new one waits its
  // turn (a short queue; the same text twice isn't queued again).
  show(text, seconds = this.cfg.toastSeconds) {
    if (this.remaining > 0 && this.el.textContent !== String(text)) {
      this.queue ??= [];
      if (!this.queue.some((q) => q.text === text) && this.queue.length < (this.cfg.toastQueue ?? 3)) this.queue.push({ text, seconds });
      return;
    }
    this.el.textContent = text;
    this.el.classList.remove('hidden');
    this.remaining = Math.max(seconds, readSeconds(text, this.cfg.toastRead));
  }

  // held: a card, a paper or a cutscene is up (Nov 15): it waits rather than running out unseen.
  update(dt, held = false) {
    if (this.remaining <= 0) return;
    if (held) return;
    this.remaining -= dt;
    if (this.remaining > 0) return;
    this.el.classList.add('hidden');
    const next = this.queue?.shift();
    if (next) this.show(next.text, next.seconds);
  }

  dispose() {
    this.el.remove();
  }
}
