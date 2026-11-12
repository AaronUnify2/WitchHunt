// The radio on the HUD (Session 26): nothing while it works; RADIO DEAD
// (struck through, still) once the Mothman's smashed it; NO SIGNAL (a slow,
// uneasy flicker) south of the comms line. The point of NO SIGNAL: down there
// voices still come over the radio, and the HUD says nothing can.
// Hidden in cutscenes with the rest of the HUD (body.in-cutscene).

export class RadioStatus {
  // cfg: config.comms.
  constructor(cfg) {
    this.cfg = cfg;
    this.shown = null;
  }

  init(root) {
    if (typeof document === 'undefined' || !root) return;
    this.el = document.createElement('div');
    this.el.className = 'radio-status hidden';
    this.el.innerHTML = '<span class="radio-status-icon"></span><span class="radio-status-text"></span>';
    root.appendChild(this.el);
    this.textEl = this.el.querySelector('.radio-status-text');
  }

  // state: 'ok' | 'dead' | 'south' | 'deep' (story/Comms.js); visible: the HUD is up.
  update(state, visible = true) {
    const key = visible ? state : 'hidden';
    if (key === this.shown || !this.el) return;
    this.shown = key;
    const on = visible && state !== 'ok';
    // Session 31: deep underground reads as the south does (NO SIGNAL).
    this.el.className = `radio-status ${on ? (state === 'deep' ? 'south' : state) : 'hidden'}`;
    if (on) this.textEl.textContent = state === 'dead' ? this.cfg.hud.deadText : this.cfg.hud.southText;
  }

  dispose() {
    this.el?.remove();
  }
}
