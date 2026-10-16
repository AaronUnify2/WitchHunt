// The hunting rifle's scope view (Session 10b): while you aim it, the gun
// is hidden and the screen becomes the view through a 4x scope: black
// round the lens, a fine crosshair with thicker posts, a small dim red
// dot lit at the centre (so it reads at night), a faint lens tint and
// vignette. Fades in with the zoom. Drawn in HTML over the 3D view.

export class ScopeOverlay {
  init(root) {
    this.el = document.createElement('div');
    this.el.className = 'scope';
    this.el.innerHTML = '<div class="scope-lens"></div><div class="scope-post scope-post-l"></div><div class="scope-post scope-post-r"></div><div class="scope-post scope-post-b"></div><div class="scope-line scope-line-h"></div><div class="scope-line scope-line-v"></div><div class="scope-dot"></div>';
    root.appendChild(this.el);
    this.shown = -1;
  }

  // amount: 0..1, how far into the scope view.
  update(amount) {
    const a = Math.max(0, Math.min(1, (amount - 0.6) / 0.35));
    const rounded = Math.round(a * 50) / 50;
    if (rounded === this.shown) return;
    this.shown = rounded;
    this.el.style.opacity = String(rounded);
    this.el.style.display = rounded > 0 ? 'block' : 'none';
  }

  dispose() {
    this.el.remove();
  }
}
