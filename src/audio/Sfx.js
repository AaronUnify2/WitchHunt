// PLACEHOLDER SOUNDS: synthesised on the fly with Web Audio (filtered
// noise and oscillators), no files. To be upgraded in the audio pass
// (Session 20, Audio Designer), as Aaron asked. Positional sounds are
// panned left/right and fade with distance from the listener.
//
// The AudioContext can only start after a user gesture: call unlock()
// from the tap that starts the game.

const NOISE_SECONDS = 1;

export class Sfx {
  constructor(sfxConfig) {
    this.cfg = sfxConfig;
  }

  init() {
    this.ctx = null;
    this.listener = { x: 0, z: 0, yaw: 0 };
  }

  unlock() {
    if (!this.cfg.enabled) return;
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.cfg.volume;
      this.master.connect(this.ctx.destination);
      const length = Math.floor(this.ctx.sampleRate * NOISE_SECONDS);
      this.noise = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1; // cosmetic: not gameplay
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setListener(x, z, yaw) {
    this.listener.x = x;
    this.listener.z = z;
    this.listener.yaw = yaw;
  }

  get ready() {
    return this.ctx !== null && this.ctx.state === 'running';
  }

  // Output node for a sound at world position (x, z), or the centre if no position.
  out(x, z, gain = 1) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.value = gain;
    if (x === undefined) {
      g.connect(this.master);
      return g;
    }
    const dx = x - this.listener.x;
    const dz = z - this.listener.z;
    const dist = Math.hypot(dx, dz);
    const fade = Math.max(0, 1 - dist / this.cfg.hearingDistance);
    g.gain.value = gain * fade * fade;
    const pan = ctx.createStereoPanner();
    // Listener's right = (cos yaw, -sin yaw) on the ground plane.
    const right = dist > 0.01 ? (dx * Math.cos(this.listener.yaw) - dz * Math.sin(this.listener.yaw)) / dist : 0;
    pan.pan.value = right * 0.8;
    g.connect(pan).connect(this.master);
    return g;
  }

  noiseBurst(dest, { seconds, type = 'lowpass', freq = 1000, endFreq = freq, q = 0.7, gain = 1, attack = 0.002 }) {
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true; // bursts longer than the buffer just wrap round
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(freq, t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + seconds);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(gain, t + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
    src.connect(filter).connect(env).connect(dest);
    src.start(t, Math.random() * NOISE_SECONDS);
    src.stop(t + seconds + 0.02);
  }

  tone(dest, { seconds, wave = 'sine', freq, endFreq = freq, gain = 1, attack = 0.005, vibrato = 0 }) {
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + seconds);
    if (vibrato > 0) {
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      lfo.frequency.value = 5 + Math.random() * 3;
      depth.gain.value = vibrato;
      lfo.connect(depth).connect(osc.frequency);
      lfo.start(t);
      lfo.stop(t + seconds);
    }
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(gain, t + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
    osc.connect(env).connect(dest);
    osc.start(t);
    osc.stop(t + seconds + 0.02);
  }

  // name: one of the recipes below. pos: { x, z } for a positional sound.
  play(name, pos) {
    if (!this.ready) return;
    const recipe = RECIPES[name];
    if (recipe) recipe(this, pos);
  }

  dispose() {
    this.ctx?.close();
    this.ctx = null;
  }
}

const RECIPES = {
  rifle(s) {
    const o = s.out();
    s.noiseBurst(o, { seconds: 0.35, freq: 4000, endFreq: 300, gain: 0.9 });
    s.noiseBurst(o, { seconds: 0.05, type: 'highpass', freq: 2500, gain: 0.6 }); // crack
    s.tone(o, { seconds: 0.25, freq: 90, endFreq: 40, gain: 0.8 }); // thump
  },
  shotgun(s) {
    const o = s.out();
    s.noiseBurst(o, { seconds: 0.55, freq: 2500, endFreq: 150, gain: 1 });
    s.tone(o, { seconds: 0.35, freq: 70, endFreq: 30, gain: 1 });
  },
  pump(s) {
    const o = s.out(undefined, undefined, 0.5);
    s.noiseBurst(o, { seconds: 0.06, type: 'bandpass', freq: 1800, q: 3, gain: 0.7 });
    setTimeout(() => s.ready && s.noiseBurst(o, { seconds: 0.07, type: 'bandpass', freq: 1300, q: 3, gain: 0.7 }), 140);
  },
  swing(s) {
    s.noiseBurst(s.out(undefined, undefined, 0.5), { seconds: 0.22, type: 'bandpass', freq: 500, endFreq: 1500, q: 1.5, gain: 0.6, attack: 0.05 });
  },
  shovelHit(s) {
    const o = s.out();
    s.tone(o, { seconds: 0.18, freq: 160, endFreq: 70, gain: 0.8 });
    s.noiseBurst(o, { seconds: 0.08, freq: 1200, gain: 0.6 });
  },
  flesh(s, pos) {
    s.noiseBurst(s.out(pos?.x, pos?.z, 0.8), { seconds: 0.14, freq: 700, endFreq: 200, q: 2, gain: 0.8 });
  },
  headshot(s, pos) {
    const o = s.out(pos?.x, pos?.z, 0.9);
    s.noiseBurst(o, { seconds: 0.16, freq: 900, endFreq: 200, q: 2, gain: 0.9 });
    s.noiseBurst(o, { seconds: 0.05, type: 'bandpass', freq: 2200, q: 4, gain: 0.6 });
  },
  kill(s, pos) {
    s.tone(s.out(pos?.x, pos?.z, 0.6), { seconds: 0.6, wave: 'sawtooth', freq: 140, endFreq: 55, gain: 0.35, vibrato: 6 });
  },
  groan(s, pos) {
    const o = s.out(pos?.x, pos?.z, 0.45);
    const base = 80 + Math.random() * 50;
    s.tone(o, { seconds: 1.1 + Math.random() * 0.6, wave: 'sawtooth', freq: base, endFreq: base * 0.75, gain: 0.3, attack: 0.25, vibrato: 4 });
    s.noiseBurst(o, { seconds: 0.9, type: 'bandpass', freq: 500, q: 2, gain: 0.15, attack: 0.3 });
  },
  swipe(s, pos) {
    s.noiseBurst(s.out(pos?.x, pos?.z, 0.6), { seconds: 0.2, type: 'bandpass', freq: 400, endFreq: 1200, q: 1.2, gain: 0.6, attack: 0.04 });
  },
  hurt(s) {
    const o = s.out();
    s.tone(o, { seconds: 0.25, wave: 'square', freq: 150, endFreq: 90, gain: 0.25 });
    s.noiseBurst(o, { seconds: 0.12, freq: 600, gain: 0.5 });
  },
  impact(s, pos) {
    s.noiseBurst(s.out(pos?.x, pos?.z, 0.4), { seconds: 0.07, type: 'bandpass', freq: 1500, q: 2, gain: 0.5 });
  },
  reload(s) {
    s.noiseBurst(s.out(undefined, undefined, 0.5), { seconds: 0.05, type: 'bandpass', freq: 2500, q: 4, gain: 0.6 });
  },
  loaded(s) {
    s.noiseBurst(s.out(undefined, undefined, 0.5), { seconds: 0.06, type: 'bandpass', freq: 1600, q: 4, gain: 0.6 });
  },
  empty(s) {
    s.tone(s.out(undefined, undefined, 0.4), { seconds: 0.04, wave: 'square', freq: 1800, gain: 0.3 });
  },
  switch(s) {
    s.noiseBurst(s.out(undefined, undefined, 0.3), { seconds: 0.12, type: 'bandpass', freq: 900, q: 2, gain: 0.4, attack: 0.02 });
  },
  heal(s) {
    s.tone(s.out(undefined, undefined, 0.4), { seconds: 0.4, freq: 440, endFreq: 660, gain: 0.25, attack: 0.05 });
  },
  death(s) {
    const o = s.out();
    s.tone(o, { seconds: 2.5, wave: 'sawtooth', freq: 90, endFreq: 35, gain: 0.4, attack: 0.1 });
    s.noiseBurst(o, { seconds: 2, freq: 400, endFreq: 60, gain: 0.3, attack: 0.1 });
  },
};
