// A short message at the top of the screen (controller connected, etc.).

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

  show(text) {
    this.el.textContent = text;
    this.el.classList.remove('hidden');
    this.remaining = this.cfg.toastSeconds;
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
