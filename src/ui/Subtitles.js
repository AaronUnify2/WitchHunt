// Subtitles (M8; DESIGN.md "Dialogue presentation"): every line is
// subtitled, never voiced. A dark strip at the bottom centre with the
// speaker's name above it in their colour; the text types on with a blip
// every few letters at the speaker's pitch, then holds for a readable
// time. Radio calls carry a RADIO tag and open with a crackle.
//
// Lines queue and play one at a time. show() returns the entry, so a
// caller can tell when its line is done (entry.done).
// Advance: advance() (the face-to-face talk calls it on interact) types
// the rest of the line at once, or ends it if it's already shown.
//
// Placeholder look: the pixel font and final strip are Session 28's.

export class Subtitles {
  // cfg: config.subtitles. storyCfg: config.story (speakers, blips).
  constructor(cfg, storyCfg, sfx) {
    this.cfg = cfg;
    this.story = storyCfg;
    this.sfx = sfx;
  }

  init(root) {
    this.el = document.createElement('div');
    this.el.className = 'subtitles hidden';
    this.el.innerHTML = '<div class="subtitle-speaker"><span class="subtitle-name"></span><span class="subtitle-tag"></span></div><div class="subtitle-text"></div>';
    root.appendChild(this.el);
    this.nameEl = this.el.querySelector('.subtitle-name');
    this.tagEl = this.el.querySelector('.subtitle-tag');
    this.textEl = this.el.querySelector('.subtitle-text');
    this.queue = [];
    this.current = null;
    this.gap = 0;
  }

  // entry: { speaker (id), text, radio, urgent, line (the data line, if
  // any), onStart(), onDone() }. Urgent entries go to the front.
  show(entry) {
    const e = { ...entry, done: false, shown: 0, hold: 0, blipCount: 0 };
    if (e.urgent) this.queue.unshift(e);
    else this.queue.push(e);
    // Too many waiting: the oldest waiting lines go (they've gone stale).
    while (this.queue.length > this.cfg.maxQueue) this.drop(this.queue.splice(e.urgent ? 1 : 0, 1)[0]);
    return e;
  }

  drop(e) {
    if (!e) return;
    e.done = true;
    e.dropped = true;
  }

  // Is a line showing, or waiting?
  get busy() {
    return this.current !== null || this.queue.length > 0;
  }

  // Who's speaking now (a speaker id), while their line types on; else null.
  get talking() {
    const c = this.current;
    return c && c.shown < c.text.length ? c.speaker : null;
  }

  get speaking() {
    return this.current?.speaker ?? null;
  }

  advance() {
    const c = this.current;
    if (!c) return;
    if (c.shown < c.text.length) {
      c.shown = c.text.length;
      this.textEl.textContent = c.text;
    } else c.hold = 0;
  }

  // Everything showing and queued goes (a cutscene skipped, the run over).
  clear() {
    for (const e of this.queue) this.drop(e);
    this.queue.length = 0;
    if (this.current) this.finish();
  }

  update(dt) {
    if (!this.current) {
      if (this.gap > 0) {
        this.gap -= dt;
        return;
      }
      if (this.queue.length === 0) return;
      this.begin(this.queue.shift());
    }
    const c = this.current;
    if (c.shown < c.text.length) {
      const before = Math.floor(c.shown);
      c.shown = Math.min(c.text.length, c.shown + dt * this.cfg.lettersPerSecond);
      const after = Math.floor(c.shown);
      for (let i = before; i < after; i++) this.blip(c, c.text[i]);
      this.textEl.textContent = c.text.slice(0, after);
      return;
    }
    c.hold -= dt;
    if (c.hold <= 0) this.finish();
  }

  begin(e) {
    this.current = e;
    const s = this.story.speakers[e.speaker] ?? { name: e.speaker, color: '#ffffff' };
    this.nameEl.textContent = (e.name ?? s.name).toUpperCase();
    this.nameEl.style.color = s.color;
    this.tagEl.textContent = e.radio ? 'RADIO' : '';
    this.textEl.textContent = '';
    const words = e.text.split(/\s+/).filter(Boolean).length;
    e.hold = Math.min(this.cfg.holdMax, this.cfg.holdBase + words * this.cfg.holdPerWord);
    this.el.className = `subtitles${e.radio ? ' radio' : ''}`;
    if (e.radio) this.sfx?.play(e.urgent ? 'radioAlarm' : 'radioCrackle');
    e.onStart?.(e);
  }

  finish() {
    const e = this.current;
    this.current = null;
    this.gap = this.cfg.gapSeconds;
    this.el.className = 'subtitles hidden';
    e.done = true;
    e.onDone?.(e);
  }

  // A blip every few letters (not on spaces or punctuation), at the speaker's pitch.
  blip(e, ch) {
    if (!/[A-Za-z0-9]/.test(ch)) return;
    e.blipCount++;
    if (e.blipCount % this.story.blipEvery !== 1 % this.story.blipEvery) return;
    const s = this.story.speakers[e.speaker];
    if (!s || !this.sfx) return;
    const jitter = 1 + (Math.random() * 2 - 1) * this.story.blipJitter; // cosmetic: not gameplay
    this.sfx.blip(s.blipFreq * jitter, this.story.blipSeconds, this.story.blipGain * (e.radio ? 0.7 : 1));
  }

  dispose() {
    this.el.remove();
  }
}
