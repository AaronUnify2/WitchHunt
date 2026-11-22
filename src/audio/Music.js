// Music (Nov 2026, the first Suno test: the title screen). Tracks are files in
// public/audio/music (audio/audioFiles.js), played on the sound effects'
// AudioContext with their own volume. A track loops, crossfading its end into
// its start so the join doesn't show. A track that isn't there is silence.
//
// play() before the AudioContext can run (a controller press isn't a user
// gesture to the browser) waits, and starts once it's running.

import { loopPeriod } from './audioFiles.js';

export class Music {
  constructor(musicConfig, sfx) {
    this.cfg = musicConfig;
    this.sfx = sfx;
    this.current = null; // { name, gain, sources, timer }
    this.wanted = null; // a track asked for before the context could run
  }

  get ctx() {
    return this.sfx.ctx;
  }

  has(name) {
    return !!this.sfx.files?.music?.[name];
  }

  // Fetch and decode a track ahead of time (it can be done before the first tap).
  preload(name) {
    if (this.cfg.enabled && this.has(name)) this.sfx.loadFile(this.sfx.files.music[name][0], { trim: true });
  }

  // A track's own settings (config.music.tracks), over the defaults.
  trackCfg(name) {
    const t = this.cfg.tracks?.[name] ?? {};
    return { volume: t.volume ?? this.cfg.volume, fadeIn: t.fadeIn ?? this.cfg.fadeIn, fadeOut: t.fadeOut ?? this.cfg.fadeOut };
  }

  // The track playing or about to (or null).
  get playing() {
    return this.current?.name ?? this.wanted ?? null;
  }

  // Start a track (from silence, fading in). Already playing: nothing.
  play(name) {
    if (!this.cfg.enabled || !this.has(name)) return;
    if (this.current?.name === name || this.wanted === name) return;
    this.stop(this.current ? this.trackCfg(this.current.name).fadeOut : this.cfg.fadeOut);
    this.wanted = name;
    this.tryStart();
  }

  async tryStart() {
    const name = this.wanted;
    if (!name) return;
    if (!this.sfx.ready) {
      // Wait for the context (the next tap or key unlocks it: Sfx.watchForGesture), checking a few times a second.
      this.sfx.watchForGesture?.();
      clearTimeout(this.retry);
      this.retry = setTimeout(() => this.tryStart(), 200);
      return;
    }
    if (this.loading === name) return;
    this.loading = name;
    const buffer = await this.sfx.loadFile(this.sfx.files.music[name][0], { trim: true });
    this.loading = null;
    if (this.wanted !== name || !buffer) return; // stopped (or another track asked for) while it loaded
    this.wanted = null;
    const ctx = this.ctx;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    const tc = this.trackCfg(name);
    gain.gain.exponentialRampToValueAtTime(tc.volume, ctx.currentTime + tc.fadeIn);
    gain.connect(ctx.destination);
    const track = { name, gain, buffer, sources: [], timer: null };
    this.current = track;
    this.pass(track, ctx.currentTime, false);
  }

  // One pass of the track at `when`, and the next pass booked before this one ends.
  pass(track, when, fadeIn) {
    const ctx = this.ctx;
    const { period, fade } = loopPeriod(track.buffer.duration, this.cfg.loopCrossfade);
    const src = ctx.createBufferSource();
    src.buffer = track.buffer;
    const env = ctx.createGain();
    env.gain.setValueAtTime(fadeIn ? 0.0001 : 1, when);
    if (fadeIn) env.gain.exponentialRampToValueAtTime(1, when + fade);
    env.gain.setValueAtTime(1, when + period);
    env.gain.linearRampToValueAtTime(0, when + track.buffer.duration);
    src.connect(env).connect(track.gain);
    src.start(when);
    src.stop(when + track.buffer.duration + 0.05);
    track.sources.push(src);
    if (track.sources.length > 2) track.sources.shift();
    const next = when + period;
    const lead = Math.max(0, (next - ctx.currentTime - 1) * 1000); // book it a second ahead
    track.timer = setTimeout(() => {
      if (this.current === track) this.pass(track, next, true);
    }, lead);
  }

  // Nov 2026: a sting (music/<name>.mp3), once, over whatever's playing. bus: a cutscene's.
  async sting(name, bus = null) {
    if (!this.cfg.enabled || !this.has(name) || !this.sfx.ready) return;
    const buffer = await this.sfx.loadFile(this.sfx.files.music[name][0], { trim: true });
    if (!buffer || !this.sfx.ready) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const g = ctx.createGain();
    g.gain.value = this.cfg.stingVolume ?? this.cfg.volume;
    src.connect(g).connect(bus?.node ?? ctx.destination);
    src.start();
  }

  // Fade out whatever's playing (seconds; 0: cut).
  stop(seconds = this.cfg.fadeOut) {
    this.wanted = null;
    clearTimeout(this.retry);
    const track = this.current;
    if (!track) return;
    this.current = null;
    clearTimeout(track.timer);
    const ctx = this.ctx;
    const t = ctx.currentTime;
    track.gain.gain.cancelScheduledValues(t);
    track.gain.gain.setValueAtTime(Math.max(0.0001, track.gain.gain.value), t);
    track.gain.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.01, seconds));
    for (const s of track.sources) {
      try {
        s.stop(t + seconds + 0.05);
      } catch {
        // already stopped
      }
    }
    setTimeout(() => track.gain.disconnect(), (seconds + 0.2) * 1000);
  }
}
