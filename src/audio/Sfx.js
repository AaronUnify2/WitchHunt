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

  // Output node for a sound at world position (x, z), or the centre if no
  // position. range: metres it carries (default hearingDistance).
  out(x, z, gain = 1, range = this.cfg.hearingDistance) {
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
    const fade = Math.max(0, 1 - dist / range);
    // Session 21: inside an interior, what's out in the world comes through muffled.
    g.gain.value = gain * fade * fade * (this.muffled ?? 1);
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

  // Session 15b: the quad bike's engine, a held note. on: running or not;
  // speed 0..1 (the pitch climbs with it); throttle 0..1 (a little louder on the gas).
  // voice (the experimental vehicles): 'quad' (Earl's), 'ute' (a diesel's
  // low knock, speed being its revs), 'alien' (a whining drive, a sub hum;
  // boost 0..1 opens it up into a roar).
  engine(on, speed = 0, throttle = 0, voice = 'quad', boost = 0) {
    if (!this.ready) return;
    if (this.engineMuted) on = false; // Session 17 (Aaron): cut while a cutscene plays
    const ctx = this.ctx;
    if (on && this.engineNodes && this.engineNodes.voice !== voice) this.engine(false);
    if (!on) {
      if (this.engineNodes) {
        const { oscs, gain } = this.engineNodes;
        gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.08);
        for (const o of oscs) o.stop(ctx.currentTime + 0.4);
        this.engineNodes = null;
      }
      return;
    }
    if (!this.engineNodes) {
      const V = ENGINE_VOICES[voice] ?? ENGINE_VOICES.quad;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = V.filter;
      filter.Q.value = V.q ?? 0.7;
      const gain = ctx.createGain();
      gain.gain.value = 0.0001;
      const oscs = V.waves.map((w) => {
        const o = ctx.createOscillator();
        o.type = w;
        o.connect(filter);
        o.start();
        return o;
      });
      // The diesel's knock: the level wobbled at the firing rate.
      let lfo = null;
      let trem = null;
      if (V.knock) {
        trem = ctx.createGain();
        trem.gain.value = 1;
        lfo = ctx.createOscillator();
        lfo.type = 'square';
        const depth = ctx.createGain();
        depth.gain.value = V.knock;
        lfo.connect(depth).connect(trem.gain);
        lfo.start();
        oscs.push(lfo);
        filter.connect(trem).connect(gain);
      } else {
        filter.connect(gain);
      }
      gain.connect(this.master);
      this.engineNodes = { voice, oscs, filter, gain, lfo };
    }
    const n = this.engineNodes;
    const V = ENGINE_VOICES[voice] ?? ENGINE_VOICES.quad;
    const t = ctx.currentTime;
    const f = V.base + speed * V.range + throttle * V.gas + boost * (V.boost ?? 0);
    n.oscs.forEach((o, i) => {
      if (o === n.lfo) return;
      o.frequency.setTargetAtTime(f * V.ratios[i], t, 0.12);
    });
    if (n.lfo) n.lfo.frequency.setTargetAtTime(f * 0.5, t, 0.1);
    n.filter.frequency.setTargetAtTime(V.filter + speed * V.open + throttle * 200 + boost * 1800, t, 0.15);
    n.gain.gain.setTargetAtTime((V.level + throttle * 0.05 + speed * 0.04 + boost * 0.06) * 0.8, t, 0.1); // Session 16 (Aaron): 20% quieter
  }

  // M8: a dialogue blip (a short square pip at the speaker's pitch).
  blip(freq, seconds, gain) {
    if (!this.ready) return;
    this.tone(this.out(), { seconds, wave: 'square', freq, gain, attack: 0.003 });
  }

  dispose() {
    this.ctx?.close();
    this.ctx = null;
  }
}

// The engines' voices: waves (one oscillator each) at ratios of the base
// frequency (Hz) that climbs with speed (range), the gas (gas) and a boost;
// a low-pass that opens with speed; knock: a diesel's tremor (0..1).
const ENGINE_VOICES = {
  quad: { waves: ['sawtooth', 'square'], ratios: [1, 0.502], base: 38, range: 62, gas: 8, filter: 380, open: 700, level: 0.09 },
  ute: { waves: ['sawtooth', 'sawtooth', 'square'], ratios: [1, 1.006, 0.5], base: 24, range: 46, gas: 5, filter: 260, open: 520, level: 0.1, knock: 0.45, q: 1.2 },
  dozer: { waves: ['sawtooth', 'square', 'sawtooth'], ratios: [1, 0.5, 1.51], base: 17, range: 22, gas: 6, boost: 9, filter: 200, open: 380, level: 0.12, knock: 0.6, q: 1.6 },
  alien: { waves: ['sine', 'triangle', 'sawtooth'], ratios: [1, 2.01, 4.02], base: 70, range: 120, gas: 20, boost: 140, filter: 900, open: 1600, level: 0.07, q: 4 },
};

const RECIPES = {
  // M9.1: the flare gun's hollow pop, the flare catching with a hiss, and
  // the thunk of one bouncing off a zombie's head.
  flareGun(s) {
    const o = s.out();
    s.tone(o, { seconds: 0.18, freq: 220, endFreq: 90, gain: 0.7 });
    s.noiseBurst(o, { seconds: 0.25, type: 'bandpass', freq: 1200, endFreq: 3000, q: 1.2, gain: 0.5, attack: 0.01 });
  },
  flareIgnite(s, pos) {
    s.noiseBurst(s.out(pos?.x, pos?.z, 0.6), { seconds: 0.9, type: 'highpass', freq: 3000, endFreq: 1800, gain: 0.35, attack: 0.05 });
  },
  flareConk(s, pos) {
    const o = s.out(pos?.x, pos?.z, 0.9);
    s.tone(o, { seconds: 0.12, freq: 420, endFreq: 160, gain: 0.8 });
    s.noiseBurst(o, { seconds: 0.06, type: 'bandpass', freq: 900, q: 3, gain: 0.6 });
  },
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
  // Session 17: the dogfight, far off through the scope: a jet's roar
  // swelling and fading, a gun's rattle, the craft's warbling ray, a crash.
  jetFar(s) {
    const o = s.out(undefined, undefined, 0.5);
    s.noiseBurst(o, { seconds: 7, type: 'lowpass', freq: 500, endFreq: 1400, q: 0.8, gain: 0.5, attack: 2.5 });
    s.tone(o, { seconds: 7, wave: 'sawtooth', freq: 70, endFreq: 95, gain: 0.08, attack: 2.5 });
  },
  gunFar(s) {
    const o = s.out(undefined, undefined, 0.4);
    for (let i = 0; i < 9; i++) setTimeout(() => s.ready && s.noiseBurst(o, { seconds: 0.05, type: 'bandpass', freq: 900, q: 1.5, gain: 0.5 }), i * 70);
  },
  rayFar(s) {
    s.tone(s.out(undefined, undefined, 0.4), { seconds: 0.6, wave: 'sine', freq: 1400, endFreq: 500, gain: 0.25, vibrato: 30 });
  },
  // Session 17: a blast close by (charges, a car going up, the outpost's machine gun): there was none
  // (Explosives played 'explosion', which didn't exist). A crack, a roar falling away, a thump.
  explosion(s, pos) {
    const o = s.out(pos?.x, pos?.z, 1.2, pos?.range);
    s.noiseBurst(o, { seconds: 0.08, type: 'highpass', freq: 1800, gain: 0.9 });
    s.noiseBurst(o, { seconds: 1.8, type: 'lowpass', freq: 1400, endFreq: 90, gain: 1.2, attack: 0.005 });
    s.tone(o, { seconds: 1.2, freq: 70, endFreq: 30, gain: 1 });
  },
  // Session 18 (Aaron): a gas pump holed: fuel hissing out, a spark's tick, just before it goes.
  gasHiss(s, pos) {
    const o = s.out(pos?.x, pos?.z, 0.9);
    s.noiseBurst(o, { seconds: 1.1, type: 'bandpass', freq: 3200, endFreq: 1600, q: 1.5, gain: 0.55, attack: 0.03 });
    s.tone(o, { seconds: 0.05, wave: 'square', freq: 900, gain: 0.15 });
  },
  boomFar(s) {
    const o = s.out(undefined, undefined, 0.8);
    s.noiseBurst(o, { seconds: 2.2, type: 'lowpass', freq: 260, endFreq: 60, gain: 1, attack: 0.02 });
    s.tone(o, { seconds: 1.6, freq: 50, endFreq: 28, gain: 0.7 });
  },
  // Session 17: the beetles: a hiss (the threat), the mandibles' snap, a
  // crate splitting, scratching inside a crate or a sealed container.
  beetleHiss(s, pos) {
    s.noiseBurst(s.out(pos?.x, pos?.z, 0.8), { seconds: 0.9, type: 'highpass', freq: 2600, endFreq: 1800, gain: 0.45, attack: 0.08 });
  },
  beetleSnap(s, pos) {
    const o = s.out(pos?.x, pos?.z, 0.9);
    s.noiseBurst(o, { seconds: 0.06, type: 'bandpass', freq: 2400, q: 5, gain: 0.8 });
    s.tone(o, { seconds: 0.08, wave: 'square', freq: 320, endFreq: 180, gain: 0.25 });
  },
  crateBreak(s, pos) {
    const o = s.out(pos?.x, pos?.z, 1);
    s.noiseBurst(o, { seconds: 0.4, type: 'bandpass', freq: 700, endFreq: 300, q: 1.2, gain: 0.9 });
    s.tone(o, { seconds: 0.25, freq: 120, endFreq: 60, gain: 0.5 });
  },
  scratch(s, pos) {
    const o = s.out(pos?.x, pos?.z, 0.5);
    for (let i = 0; i < 4; i++) setTimeout(() => s.ready && s.noiseBurst(o, { seconds: 0.12, type: 'bandpass', freq: 3000 + i * 300, q: 6, gain: 0.35 }), i * 110);
  },
  // Session 17: a reveal's sting (C-4's doors open on the body in the resin): a low swell and a high whine.
  reveal(s) {
    const o = s.out(undefined, undefined, 0.6);
    s.tone(o, { seconds: 2.4, wave: 'sawtooth', freq: 55, endFreq: 48, gain: 0.25, attack: 0.4, vibrato: 3 });
    s.tone(o, { seconds: 2.0, wave: 'sine', freq: 1900, endFreq: 2300, gain: 0.06, attack: 0.6 });
  },
  // Session 17: a round off an army helmet (a bright ring), and one knocking it off (a clank and a clatter).
  helmetPing(s, pos) {
    const o = s.out(pos?.x, pos?.z, 0.9);
    s.tone(o, { seconds: 0.22, wave: 'triangle', freq: 2600, endFreq: 2100, gain: 0.35 });
    s.noiseBurst(o, { seconds: 0.05, type: 'bandpass', freq: 3200, q: 4, gain: 0.5 });
  },
  helmetOff(s, pos) {
    const o = s.out(pos?.x, pos?.z, 0.9);
    s.tone(o, { seconds: 0.3, wave: 'triangle', freq: 1400, endFreq: 900, gain: 0.4 });
    s.noiseBurst(o, { seconds: 0.18, type: 'bandpass', freq: 1800, endFreq: 700, q: 2, gain: 0.5 });
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
  // M4: digging, sigils, pickups, mutants.
  dig(s) {
    const o = s.out(undefined, undefined, 0.5);
    s.noiseBurst(o, { seconds: 0.28, type: 'bandpass', freq: 700, endFreq: 300, q: 1.2, gain: 0.7, attack: 0.03 }); // the blade into earth
    s.tone(o, { seconds: 0.12, freq: 120, endFreq: 70, gain: 0.3 });
  },
  cleanse(s) {
    const o = s.out(undefined, undefined, 0.5);
    s.tone(o, { seconds: 1.6, freq: 330, endFreq: 660, gain: 0.25, attack: 0.15 });
    s.tone(o, { seconds: 1.8, freq: 495, endFreq: 990, gain: 0.15, attack: 0.3 });
    s.noiseBurst(o, { seconds: 1.2, type: 'highpass', freq: 3000, endFreq: 6000, gain: 0.15, attack: 0.2 });
  },
  rise(s, pos) {
    const o = s.out(pos?.x, pos?.z, 0.8);
    s.noiseBurst(o, { seconds: 0.9, freq: 300, endFreq: 90, q: 0.9, gain: 0.8, attack: 0.15 }); // earth breaking
    s.tone(o, { seconds: 1.2, wave: 'sawtooth', freq: 70, endFreq: 50, gain: 0.25, attack: 0.3, vibrato: 3 });
  },
  pickup(s) {
    const o = s.out(undefined, undefined, 0.4);
    s.tone(o, { seconds: 0.08, wave: 'square', freq: 880, gain: 0.2 });
    s.noiseBurst(o, { seconds: 0.05, type: 'bandpass', freq: 2000, q: 3, gain: 0.4 });
  },
  // The mutant bursting forward: a grunt and heavy, fast footfalls.
  charge(s, pos) {
    const o = s.out(pos?.x, pos?.z, 0.9);
    s.tone(o, { seconds: 0.5, wave: 'sawtooth', freq: 75, endFreq: 50, gain: 0.45, attack: 0.03, vibrato: 4 });
    for (let i = 0; i < 3; i++) {
      setTimeout(() => s.ready && s.tone(o, { seconds: 0.14, freq: 70, endFreq: 38, gain: 0.7 }), i * 170);
    }
  },
  mutantGroan(s, pos) {
    const o = s.out(pos?.x, pos?.z, 0.7);
    const base = 45 + Math.random() * 15;
    s.tone(o, { seconds: 1.8, wave: 'sawtooth', freq: base, endFreq: base * 0.7, gain: 0.45, attack: 0.3, vibrato: 2.5 });
    s.noiseBurst(o, { seconds: 1.4, type: 'bandpass', freq: 250, q: 1.5, gain: 0.3, attack: 0.4 });
  },
  // M5: the station.
  // The electric fence biting a zombie: a crackling buzz.
  zap(s, pos) {
    const o = s.out(pos?.x, pos?.z, 0.8);
    s.tone(o, { seconds: 0.35, wave: 'square', freq: 120, endFreq: 90, gain: 0.25, vibrato: 40 });
    s.noiseBurst(o, { seconds: 0.3, type: 'highpass', freq: 3000, gain: 0.5 });
  },
  // A zombie clawing the chain-link: a metallic rattle.
  fenceHit(s, pos) {
    const o = s.out(pos?.x, pos?.z, 0.6);
    s.noiseBurst(o, { seconds: 0.25, type: 'bandpass', freq: 2600, q: 6, gain: 0.5 });
    s.noiseBurst(o, { seconds: 0.12, type: 'bandpass', freq: 1400, q: 5, gain: 0.4 });
  },
  // A zombie battering a door or a barricade: a heavy wooden thud.
  doorHit(s, pos) {
    const o = s.out(pos?.x, pos?.z, 0.9);
    s.tone(o, { seconds: 0.22, freq: 110, endFreq: 55, gain: 0.8 });
    s.noiseBurst(o, { seconds: 0.15, freq: 600, gain: 0.5 });
  },
  // A defence gives way: a crash and a falling clang.
  breach(s, pos) {
    const o = s.out(pos?.x, pos?.z, 1);
    s.noiseBurst(o, { seconds: 0.7, freq: 1800, endFreq: 200, gain: 0.9 });
    s.tone(o, { seconds: 0.9, wave: 'triangle', freq: 300, endFreq: 140, gain: 0.35 });
  },
  // The turret: heavier and harder than the rifle.
  turret(s, pos) {
    const o = s.out(pos?.x, pos?.z, 1);
    s.noiseBurst(o, { seconds: 0.3, freq: 3500, endFreq: 250, gain: 0.9 });
    s.noiseBurst(o, { seconds: 0.04, type: 'highpass', freq: 3000, gain: 0.7 });
    s.tone(o, { seconds: 0.2, wave: 'square', freq: 70, endFreq: 40, gain: 0.5 });
  },
  turretTurn(s, pos) {
    s.tone(s.out(pos?.x, pos?.z, 0.3), { seconds: 0.25, wave: 'sawtooth', freq: 220, endFreq: 260, gain: 0.12, attack: 0.05 });
  },
  gate(s, pos) {
    const o = s.out(pos?.x, pos?.z, 0.6);
    s.tone(o, { seconds: 0.8, wave: 'sawtooth', freq: 70, endFreq: 85, gain: 0.15, attack: 0.1 });
    s.noiseBurst(o, { seconds: 0.8, type: 'bandpass', freq: 900, q: 3, gain: 0.2, attack: 0.1 });
  },
  door(s, pos) {
    s.noiseBurst(s.out(pos?.x, pos?.z, 0.5), { seconds: 0.3, type: 'bandpass', freq: 500, endFreq: 350, q: 2, gain: 0.5, attack: 0.03 });
  },
  // Repairs and building: a few hammer blows.
  hammer(s) {
    const o = s.out(undefined, undefined, 0.5);
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        if (!s.ready) return;
        s.tone(o, { seconds: 0.08, freq: 900, endFreq: 500, gain: 0.3 });
        s.noiseBurst(o, { seconds: 0.06, type: 'bandpass', freq: 2200, q: 3, gain: 0.5 });
      }, i * 150);
    }
  },
  // A battery clunks in and the fence hums up.
  battery(s) {
    const o = s.out(undefined, undefined, 0.6);
    s.tone(o, { seconds: 0.15, freq: 140, endFreq: 80, gain: 0.6 });
    setTimeout(() => s.ready && s.tone(o, { seconds: 1.2, wave: 'sawtooth', freq: 60, endFreq: 120, gain: 0.15, attack: 0.2 }), 150);
  },
  page(s) {
    s.noiseBurst(s.out(undefined, undefined, 0.4), { seconds: 0.18, type: 'bandpass', freq: 3000, endFreq: 1500, q: 1, gain: 0.35, attack: 0.03 });
  },
  denied(s) {
    s.tone(s.out(undefined, undefined, 0.4), { seconds: 0.18, wave: 'square', freq: 180, gain: 0.2 });
  },
  climb(s) {
    const o = s.out(undefined, undefined, 0.5);
    for (let i = 0; i < 4; i++) setTimeout(() => s.ready && s.tone(o, { seconds: 0.06, freq: 300, endFreq: 200, gain: 0.25 }), i * 120);
  },
  spike(s, pos) {
    s.noiseBurst(s.out(pos?.x, pos?.z, 0.7), { seconds: 0.12, type: 'bandpass', freq: 1200, q: 2, gain: 0.6 });
  },
  // Vehicles (M5 part 2): a car door's clunk, a boot lid, the bonnet's
  // creak, a ratchet on the battery's bolts, the battery coming out, and
  // a two-tone car alarm (each call is one wail; Vehicles.js alternates them).
  carDoor(s, pos) {
    const o = s.out(pos?.x, pos?.z, 0.7);
    s.noiseBurst(o, { seconds: 0.12, type: 'bandpass', freq: 700, q: 2, gain: 0.6 });
    s.tone(o, { seconds: 0.18, freq: 110, endFreq: 70, gain: 0.5 });
  },
  carBoot(s, pos) {
    const o = s.out(pos?.x, pos?.z, 0.7);
    s.noiseBurst(o, { seconds: 0.35, type: 'bandpass', freq: 1400, endFreq: 900, q: 4, gain: 0.25, attack: 0.05 });
    setTimeout(() => s.ready && s.tone(o, { seconds: 0.15, freq: 120, endFreq: 80, gain: 0.4 }), 300);
  },
  bonnet(s, pos) {
    const o = s.out(pos?.x, pos?.z, 0.7);
    s.tone(o, { seconds: 0.7, wave: 'sawtooth', freq: 340, endFreq: 520, gain: 0.08, attack: 0.1, vibrato: 14 });
    setTimeout(() => s.ready && s.tone(o, { seconds: 0.12, freq: 160, endFreq: 110, gain: 0.35 }), 650);
  },
  ratchet(s, pos) {
    const o = s.out(pos?.x, pos?.z, 0.6);
    for (let i = 0; i < 8; i++) {
      setTimeout(() => s.ready && s.noiseBurst(o, { seconds: 0.03, type: 'highpass', freq: 3500, gain: 0.45 }), i * 90 + (i % 4 === 3 ? 200 : 0));
    }
  },
  batteryOut(s, pos) {
    const o = s.out(pos?.x, pos?.z, 0.8);
    s.noiseBurst(o, { seconds: 0.2, type: 'bandpass', freq: 600, q: 1.5, gain: 0.5 });
    s.tone(o, { seconds: 0.25, freq: 90, endFreq: 60, gain: 0.6 });
  },
  carAlarm(s, pos) {
    s.tone(s.out(pos?.x, pos?.z, 1), { seconds: 0.5, wave: 'square', freq: 880, endFreq: 1180, gain: 0.22, attack: 0.02 });
  },
  carAlarmLow(s, pos) {
    s.tone(s.out(pos?.x, pos?.z, 1), { seconds: 0.5, wave: 'square', freq: 1180, endFreq: 760, gain: 0.22, attack: 0.02 });
  },
  // M6: the radio crackles into the station's alarm (three urgent pips).
  radioAlarm(s) {
    const o = s.out(undefined, undefined, 0.8);
    s.noiseBurst(o, { seconds: 0.35, type: 'bandpass', freq: 1800, q: 1.2, gain: 0.25, attack: 0.02 });
    for (let i = 0; i < 3; i++) setTimeout(() => s.ready && s.tone(o, { seconds: 0.16, wave: 'square', freq: 990, gain: 0.18 }), 380 + i * 230);
  },
  // M8: a radio call opens with a short crackle.
  radioCrackle(s) {
    const o = s.out(undefined, undefined, 0.6);
    s.noiseBurst(o, { seconds: 0.28, type: 'bandpass', freq: 2100, endFreq: 1500, q: 1.1, gain: 0.2, attack: 0.01 });
  },
  overrun(s) {
    const o = s.out();
    s.tone(o, { seconds: 3, wave: 'sawtooth', freq: 160, endFreq: 40, gain: 0.35, attack: 0.1, vibrato: 8 });
    s.noiseBurst(o, { seconds: 2.5, freq: 900, endFreq: 100, gain: 0.4, attack: 0.2 });
  },
  // M7: the witch singing over a sigil as she plants it: a wavering,
  // breathy minor line that carries a long way through the trees.
  witchSong(s, pos) {
    const o = s.out(pos?.x, pos?.z, 0.7, pos?.range);
    const notes = [220, 261.6, 246.9, 207.7, 220];
    const base = Math.random() < 0.5 ? 1 : 0.75; // cosmetic: not gameplay
    notes.forEach((f, i) => {
      setTimeout(() => {
        if (!s.ready) return;
        s.tone(o, { seconds: 0.75, wave: 'triangle', freq: f * base, endFreq: f * base * 0.98, gain: 0.22, attack: 0.18, vibrato: 7 });
        s.noiseBurst(o, { seconds: 0.6, type: 'bandpass', freq: f * base * 4, q: 6, gain: 0.05, attack: 0.15 });
      }, i * 560);
    });
  },
  // M7: a sigil goes into the ground: a deep thud and a sour chord.
  witchPlanted(s, pos) {
    const o = s.out(pos?.x, pos?.z, 1, pos?.range);
    s.tone(o, { seconds: 0.5, freq: 80, endFreq: 32, gain: 0.8 });
    s.tone(o, { seconds: 2.4, wave: 'sawtooth', freq: 110, endFreq: 104, gain: 0.12, attack: 0.3, vibrato: 3 });
    s.tone(o, { seconds: 2.4, wave: 'sawtooth', freq: 155.6, endFreq: 147, gain: 0.1, attack: 0.3, vibrato: 3 });
  },
  // M7: the witch notices you, or is hurt: a rasping, rising shriek.
  witchShriek(s, pos) {
    const o = s.out(pos?.x, pos?.z, 0.9, pos?.range);
    s.tone(o, { seconds: 0.7, wave: 'sawtooth', freq: 520, endFreq: 1240, gain: 0.18, attack: 0.03, vibrato: 22 });
    s.noiseBurst(o, { seconds: 0.6, type: 'bandpass', freq: 2600, endFreq: 3800, q: 3, gain: 0.25, attack: 0.02 });
  },
  // M7: she throws a hex: a hissing whoosh.
  witchHex(s, pos) {
    const o = s.out(pos?.x, pos?.z, 0.8);
    s.noiseBurst(o, { seconds: 0.45, type: 'bandpass', freq: 900, endFreq: 2400, q: 2, gain: 0.4, attack: 0.05 });
    s.tone(o, { seconds: 0.5, wave: 'triangle', freq: 330, endFreq: 660, gain: 0.15, vibrato: 18 });
  },
  // M7: a hex hits you: a sour, crackling burst.
  witchHexHit(s) {
    const o = s.out(undefined, undefined, 0.8);
    s.noiseBurst(o, { seconds: 0.4, freq: 3000, endFreq: 400, gain: 0.5 });
    s.tone(o, { seconds: 0.6, wave: 'square', freq: 180, endFreq: 140, gain: 0.15, vibrato: 30 });
  },
  // M7: her claws: a fast tearing swish.
  witchSwipe(s, pos) {
    const o = s.out(pos?.x, pos?.z, 1);
    s.noiseBurst(o, { seconds: 0.18, type: 'highpass', freq: 1800, endFreq: 5000, gain: 0.6, attack: 0.005 });
  },
  // M7: she calls up the dead: a low, rising drone.
  witchSummon(s, pos) {
    const o = s.out(pos?.x, pos?.z, 0.9, pos?.range);
    s.tone(o, { seconds: 1.4, wave: 'sawtooth', freq: 55, endFreq: 110, gain: 0.3, attack: 0.3, vibrato: 5 });
    s.tone(o, { seconds: 1.4, wave: 'sawtooth', freq: 82, endFreq: 165, gain: 0.2, attack: 0.3, vibrato: 5 });
  },
  // M7: she dies: a long falling scream into a rumble.
  witchDeath(s, pos) {
    const o = s.out(pos?.x, pos?.z, 1, pos?.range);
    s.tone(o, { seconds: 2.4, wave: 'sawtooth', freq: 1100, endFreq: 90, gain: 0.25, attack: 0.02, vibrato: 16 });
    s.noiseBurst(o, { seconds: 2.6, freq: 1200, endFreq: 80, gain: 0.4, attack: 0.1 });
  },
  // M7 step 3, traps. A snare snaps shut: a crack and a creak of rope.
  snare(s, pos) {
    const o = s.out(pos?.x, pos?.z, 1);
    s.noiseBurst(o, { seconds: 0.08, type: 'highpass', freq: 2000, gain: 0.8 });
    s.tone(o, { seconds: 0.5, wave: 'sawtooth', freq: 140, endFreq: 95, gain: 0.18, attack: 0.05, vibrato: 12 });
  },
  // Tearing free of it.
  snareBreak(s) {
    const o = s.out(undefined, undefined, 0.8);
    s.noiseBurst(o, { seconds: 0.25, type: 'bandpass', freq: 1400, endFreq: 600, q: 1.5, gain: 0.6 });
  },
  // Session 16: a paper picked up, a page turned: a dry rustle.
  paper(s) {
    const o = s.out(undefined, undefined, 0.5);
    s.noiseBurst(o, { seconds: 0.12, type: 'highpass', freq: 3500, gain: 0.25 });
    setTimeout(() => s.ready && s.noiseBurst(o, { seconds: 0.18, type: 'bandpass', freq: 2400, endFreq: 1600, q: 0.8, gain: 0.22 }), 70);
  },
  // An alarm charm's bones clattering.
  charmRattle(s, pos) {
    const o = s.out(pos?.x, pos?.z, 1, 60);
    for (let i = 0; i < 9; i++) setTimeout(() => s.ready && s.tone(o, { seconds: 0.05, wave: 'square', freq: 700 + Math.random() * 900, gain: 0.18 }), i * 70 + Math.random() * 40);
  },
  // Inside a totem's ring: a sour sizzle.
  totemBurn(s) {
    const o = s.out(undefined, undefined, 0.6);
    s.noiseBurst(o, { seconds: 0.3, type: 'highpass', freq: 3000, gain: 0.35 });
    s.tone(o, { seconds: 0.3, wave: 'square', freq: 220, endFreq: 200, gain: 0.08, vibrato: 30 });
  },
  // A totem or charm shot apart.
  trapBreak(s, pos) {
    const o = s.out(pos?.x, pos?.z, 1);
    s.noiseBurst(o, { seconds: 0.2, freq: 1800, endFreq: 300, gain: 0.6 });
    s.tone(o, { seconds: 0.6, wave: 'triangle', freq: 600, endFreq: 150, gain: 0.15 });
  },
  // M7 step 6: the defeat screen's radio static.
  radioStatic(s) {
    const o = s.out(undefined, undefined, 0.5);
    s.noiseBurst(o, { seconds: 1.4, type: 'bandpass', freq: 1700, endFreq: 1300, q: 0.8, gain: 0.28, attack: 0.2 });
  },
  // ---- the experimental vehicles (the ute, the alien quad) ----
  horn(s, pos) {
    const o = s.out(pos?.x, pos?.z, 0.8, 140);
    s.tone(o, { seconds: 0.55, wave: 'square', freq: 392, gain: 0.18, attack: 0.02 });
    s.tone(o, { seconds: 0.55, wave: 'square', freq: 466, gain: 0.14, attack: 0.02 });
  },
  carCrash(s, pos) {
    const o = s.out(pos?.x, pos?.z, 1);
    s.noiseBurst(o, { seconds: 0.35, freq: 1400, endFreq: 120, gain: 0.8 });
    s.tone(o, { seconds: 0.3, freq: 80, endFreq: 40, gain: 0.6 });
    s.noiseBurst(o, { seconds: 0.5, type: 'bandpass', freq: 2600, q: 4, gain: 0.15, attack: 0.03 });
  },
  gearShift(s, pos) {
    const o = s.out(pos?.x, pos?.z, 0.35);
    s.noiseBurst(o, { seconds: 0.06, type: 'bandpass', freq: 900, q: 2, gain: 0.4 });
    s.tone(o, { seconds: 0.08, freq: 160, endFreq: 110, gain: 0.25 });
  },
  uteGun(s, pos) {
    const o = s.out(pos?.x, pos?.z, 1.1, 220);
    s.noiseBurst(o, { seconds: 0.05, type: 'highpass', freq: 2400, gain: 0.8 });
    s.noiseBurst(o, { seconds: 0.32, freq: 2800, endFreq: 160, gain: 1.0 });
    s.tone(o, { seconds: 0.18, wave: 'square', freq: 58, endFreq: 34, gain: 0.55 });
  },
  gunHot(s, pos) {
    const o = s.out(pos?.x, pos?.z, 0.8);
    s.noiseBurst(o, { seconds: 1.6, type: 'highpass', freq: 3500, endFreq: 5000, gain: 0.35, attack: 0.05 });
    s.tone(o, { seconds: 0.25, wave: 'square', freq: 180, endFreq: 120, gain: 0.15 });
  },
  gunCool(s, pos) {
    const o = s.out(pos?.x, pos?.z, 0.5);
    s.noiseBurst(o, { seconds: 0.1, type: 'bandpass', freq: 1200, q: 3, gain: 0.4 });
    setTimeout(() => s.ready && s.noiseBurst(o, { seconds: 0.08, type: 'bandpass', freq: 800, q: 3, gain: 0.4 }), 110);
  },
  brass(s, pos) {
    const o = s.out(pos?.x, pos?.z, 0.25);
    s.tone(o, { seconds: 0.12, wave: 'triangle', freq: 3200 + Math.random() * 1500, endFreq: 2600, gain: 0.12 });
  },
  wiper(s, pos) {
    const o = s.out(pos?.x, pos?.z, 0.3);
    s.noiseBurst(o, { seconds: 0.9, type: 'bandpass', freq: 700, endFreq: 500, q: 2, gain: 0.12, attack: 0.15 });
  },
  alienHum(s, pos) {
    const o = s.out(pos?.x, pos?.z, 0.6);
    s.tone(o, { seconds: 1.0, wave: 'sine', freq: 90, endFreq: 420, gain: 0.3, attack: 0.1, vibrato: 12 });
    s.tone(o, { seconds: 0.8, wave: 'triangle', freq: 880, endFreq: 1760, gain: 0.06, attack: 0.3 });
  },
  boost(s, pos) {
    const o = s.out(pos?.x, pos?.z, 1);
    s.noiseBurst(o, { seconds: 1.2, type: 'bandpass', freq: 400, endFreq: 3000, q: 1.2, gain: 0.7, attack: 0.02 });
    s.tone(o, { seconds: 0.9, wave: 'sawtooth', freq: 110, endFreq: 660, gain: 0.25, attack: 0.02 });
    s.tone(o, { seconds: 0.25, freq: 60, endFreq: 30, gain: 0.6 });
  },
  boostEnd(s, pos) {
    const o = s.out(pos?.x, pos?.z, 0.6);
    s.noiseBurst(o, { seconds: 0.7, type: 'bandpass', freq: 2000, endFreq: 300, q: 1, gain: 0.3 });
  },
  boostReady(s) {
    const o = s.out(undefined, undefined, 0.3);
    s.tone(o, { seconds: 0.12, wave: 'sine', freq: 880, gain: 0.25 });
    setTimeout(() => s.ready && s.tone(o, { seconds: 0.2, wave: 'sine', freq: 1320, gain: 0.25 }), 110);
  },
  plasmaShot(s, pos) {
    const o = s.out(pos?.x, pos?.z, 0.7);
    s.tone(o, { seconds: 0.22, wave: 'sawtooth', freq: 1400, endFreq: 180, gain: 0.25 });
    s.tone(o, { seconds: 0.16, wave: 'sine', freq: 300, endFreq: 90, gain: 0.35 });
    s.noiseBurst(o, { seconds: 0.08, type: 'highpass', freq: 4000, gain: 0.2 });
  },
  plasmaCharge(s, pos) {
    const o = s.out(pos?.x, pos?.z, 0.5);
    s.tone(o, { seconds: 1.15, wave: 'sawtooth', freq: 120, endFreq: 960, gain: 0.16, attack: 0.08, vibrato: 18 });
    s.tone(o, { seconds: 1.15, wave: 'sine', freq: 240, endFreq: 1920, gain: 0.1, attack: 0.1 });
  },
  plasmaOrb(s, pos) {
    const o = s.out(pos?.x, pos?.z, 1);
    s.tone(o, { seconds: 0.6, wave: 'sawtooth', freq: 700, endFreq: 70, gain: 0.35 });
    s.tone(o, { seconds: 0.5, wave: 'sine', freq: 140, endFreq: 40, gain: 0.7 });
    s.noiseBurst(o, { seconds: 0.4, freq: 3000, endFreq: 300, gain: 0.4 });
  },
  plasmaFizzle(s, pos) {
    const o = s.out(pos?.x, pos?.z, 0.4);
    s.noiseBurst(o, { seconds: 0.35, type: 'highpass', freq: 2500, endFreq: 6000, gain: 0.25 });
  },
  plasmaEmpty(s, pos) {
    const o = s.out(pos?.x, pos?.z, 0.3);
    s.tone(o, { seconds: 0.08, wave: 'square', freq: 220, endFreq: 180, gain: 0.15 });
  },
  plasmaBurst(s, pos) {
    const o = s.out(pos?.x, pos?.z, 0.9, 90);
    s.noiseBurst(o, { seconds: 0.4, type: 'bandpass', freq: 1800, endFreq: 200, q: 0.8, gain: 0.7 });
    s.tone(o, { seconds: 0.3, wave: 'sine', freq: 520, endFreq: 60, gain: 0.35 });
  },
  plasmaBoom(s, pos) {
    const o = s.out(pos?.x, pos?.z, 1.3, 160);
    s.noiseBurst(o, { seconds: 1.4, freq: 2200, endFreq: 70, gain: 1.1, attack: 0.005 });
    s.tone(o, { seconds: 1.1, wave: 'sawtooth', freq: 300, endFreq: 30, gain: 0.45 });
    s.tone(o, { seconds: 0.9, wave: 'sine', freq: 90, endFreq: 25, gain: 0.9 });
  },
  // ---- the dozer ----
  dozerStart(s, pos) {
    const o = s.out(pos?.x, pos?.z, 0.9, 200);
    s.tone(o, { seconds: 1.4, wave: 'sawtooth', freq: 30, endFreq: 18, gain: 0.4, attack: 0.15 });
    s.noiseBurst(o, { seconds: 1.2, freq: 500, endFreq: 120, gain: 0.5, attack: 0.1 });
  },
  dozerHorn(s, pos) {
    const o = s.out(pos?.x, pos?.z, 0.9, 200);
    s.tone(o, { seconds: 0.8, wave: 'square', freq: 196, gain: 0.2, attack: 0.03 });
    s.tone(o, { seconds: 0.8, wave: 'sawtooth', freq: 247, gain: 0.12, attack: 0.03 });
  },
  hydraulic(s, pos) {
    const o = s.out(pos?.x, pos?.z, 0.5);
    s.tone(o, { seconds: 0.6, wave: 'sawtooth', freq: 260, endFreq: 330, gain: 0.06, attack: 0.08, vibrato: 6 });
    s.noiseBurst(o, { seconds: 0.5, type: 'bandpass', freq: 2400, q: 2, gain: 0.1, attack: 0.05 });
  },
  trackClank(s, pos) {
    const o = s.out(pos?.x, pos?.z, 0.35, 90);
    s.noiseBurst(o, { seconds: 0.05, type: 'bandpass', freq: 1300 + Math.random() * 500, q: 5, gain: 0.5 });
    s.tone(o, { seconds: 0.06, wave: 'square', freq: 120, endFreq: 90, gain: 0.12 });
  },
  treeCreak(s, pos) {
    const o = s.out(pos?.x, pos?.z, 0.6);
    s.tone(o, { seconds: 0.4, wave: 'sawtooth', freq: 90 + Math.random() * 40, endFreq: 140, gain: 0.12, attack: 0.1, vibrato: 25 });
  },
  treeCrack(s, pos) {
    const o = s.out(pos?.x, pos?.z, 1, 160);
    s.noiseBurst(o, { seconds: 0.08, type: 'highpass', freq: 1800, gain: 1 });
    setTimeout(() => s.ready && s.noiseBurst(o, { seconds: 0.5, type: 'bandpass', freq: 900, endFreq: 300, q: 1, gain: 0.5 }), 60);
  },
  treeFall(s, pos) {
    const o = s.out(pos?.x, pos?.z, 1.2, pos?.range ?? 140);
    s.noiseBurst(o, { seconds: 1.0, freq: 1600, endFreq: 80, gain: 0.8, attack: 0.01 });
    s.tone(o, { seconds: 0.7, freq: 55, endFreq: 28, gain: 0.9 });
  },
  scrape(s, pos) {
    const o = s.out(pos?.x, pos?.z, 0.7);
    s.noiseBurst(o, { seconds: 0.4, type: 'bandpass', freq: 2200 + Math.random() * 800, q: 6, gain: 0.35, attack: 0.03 });
    s.tone(o, { seconds: 0.35, wave: 'sawtooth', freq: 700 + Math.random() * 300, endFreq: 500, gain: 0.04 });
  },
  crunch(s, pos) {
    const o = s.out(pos?.x, pos?.z, 0.9);
    s.noiseBurst(o, { seconds: 0.18, freq: 1500, endFreq: 200, gain: 0.8 });
    s.noiseBurst(o, { seconds: 0.08, type: 'highpass', freq: 3000, gain: 0.4 });
    s.tone(o, { seconds: 0.15, freq: 90, endFreq: 50, gain: 0.5 });
  },
  winchFire(s, pos) {
    const o = s.out(pos?.x, pos?.z, 0.7);
    s.noiseBurst(o, { seconds: 0.25, type: 'highpass', freq: 2500, endFreq: 800, gain: 0.4 });
    s.tone(o, { seconds: 0.3, wave: 'sawtooth', freq: 600, endFreq: 150, gain: 0.08 });
  },
  winchClunk(s, pos) {
    const o = s.out(pos?.x, pos?.z, 0.8);
    s.tone(o, { seconds: 0.12, wave: 'square', freq: 180, endFreq: 90, gain: 0.3 });
    s.noiseBurst(o, { seconds: 0.08, type: 'bandpass', freq: 1500, q: 3, gain: 0.5 });
  },
  winchReel(s, pos) {
    const o = s.out(pos?.x, pos?.z, 0.3);
    s.noiseBurst(o, { seconds: 0.03, type: 'bandpass', freq: 2800, q: 6, gain: 0.5 });
  },
  winchRelease(s, pos) {
    const o = s.out(pos?.x, pos?.z, 0.5);
    s.tone(o, { seconds: 0.25, wave: 'triangle', freq: 400, endFreq: 900, gain: 0.12 });
  },
  winchSnap(s, pos) {
    const o = s.out(pos?.x, pos?.z, 1);
    s.noiseBurst(o, { seconds: 0.12, type: 'highpass', freq: 3500, gain: 1 });
    s.tone(o, { seconds: 0.5, wave: 'sawtooth', freq: 900, endFreq: 60, gain: 0.2 });
  },
  death(s) {
    const o = s.out();
    s.tone(o, { seconds: 2.5, wave: 'sawtooth', freq: 90, endFreq: 35, gain: 0.4, attack: 0.1 });
    s.noiseBurst(o, { seconds: 2, freq: 400, endFreq: 60, gain: 0.3, attack: 0.1 });
  },
};
