// The world's background sound (Nov 2026, the Suno test; config.ambience).
//
// Beds: loops under everything, crossfaded by how dark it is (day, night) and
// where Tom is (inside the gas station's shop; muffled from an interior). They
// are plain textures: the character is in the calls, one-off sounds (crows,
// an owl, something howling) played every so often from a random direction,
// so nothing repeats in a pattern. Gusts of wind likewise, day or night.
// After dark, outdoors, the night music (music/night.mp3) creeps in.
//
// All of it goes quiet in the CCTV-style cutscenes (Aaron: they're footage
// from somewhere else) and while the game isn't running (the menu).
// No file: that bed or call is silence (there were none before).

import { nightness } from './audioFiles.js';

export class Ambience {
  constructor(ambienceConfig, sfx, music) {
    this.cfg = ambienceConfig;
    this.sfx = sfx;
    this.music = music;
    this.beds = new Map(); // key -> { name, gain, src }
    this.callIn = this.pick(this.cfg.calls.every);
    this.gustIn = this.pick(this.cfg.gusts.every);
  }

  pick([a, b]) {
    return a + Math.random() * (b - a); // cosmetic: not gameplay
  }

  // Each frame. state: { running, night (0..1), inShop, muffled (0..1), quiet (a footage cutscene),
  // listener: { x, z, yaw } }.
  update(dt, state) {
    if (!this.cfg.enabled || !this.sfx.ready) return;
    const live = state.running && !state.quiet;
    const outside = live && !state.inShop ? state.muffled ?? 1 : 0;
    const outsideLevel = outside < 1 ? outside * this.cfg.muffledBed : 1;
    const level = live ? this.cfg.bedVolume : 0;
    this.setBed('day', level * (state.inShop ? 0 : outsideLevel) * (1 - state.night));
    this.setBed('night', level * (state.inShop ? 0 : outsideLevel) * state.night);
    this.setBed('shop', level * (state.inShop && live ? 1 : 0));

    // The calls and the gusts: outdoors only, not in the shop or an interior.
    const open = live && !state.inShop && (state.muffled ?? 1) >= 1;
    if (open) {
      this.callIn -= dt;
      this.gustIn -= dt;
      if (this.callIn <= 0) {
        this.callIn = this.pick(this.cfg.calls.every);
        this.call(state.night > 0.5 ? this.cfg.calls.night : this.cfg.calls.day, this.cfg.calls, state.listener);
      }
      if (this.gustIn <= 0) {
        this.gustIn = this.pick(this.cfg.gusts.every);
        this.call(this.cfg.gusts.name, this.cfg.gusts, state.listener);
      }
    }

    // Night music: outdoors after dark (its own long fades); off by day, in the footage, at the menu.
    const nm = this.cfg.nightMusic;
    if (this.music && nm) {
      const want = live && state.night >= nm.from && !state.inShop;
      if (want && this.music.playing === null) this.music.play(nm.track);
      else if (!want && this.music.playing === nm.track) this.music.stop(this.music.trackCfg(nm.track).fadeOut);
    }
  }

  // A one-off from a random direction, some way off (only if there's a file for it: no stand-in).
  call(name, c, listener) {
    if (!this.sfx.files.sfx[name] || !listener) return;
    const a = Math.random() * Math.PI * 2; // cosmetic: not gameplay
    const d = this.pick(c.distance ?? [20, 40]);
    const range = d * 1.6; // the fade with distance stays gentle: it's meant to be heard
    const pos = { x: listener.x + Math.cos(a) * d, z: listener.z + Math.sin(a) * d, range };
    this.sfx.playAt?.(name, pos, this.pick(c.volume));
  }

  // A bed toward a level (started when there's a file and a reason to hear it).
  setBed(key, level) {
    const name = this.cfg.beds[key];
    let bed = this.beds.get(key);
    if (!bed) {
      if (level <= 0) return;
      const held = this.sfx.loop(name, null, { onlyFile: true });
      if (!held) return; // no file (yet, or still loading)
      bed = { name, held, level: 0 };
      this.beds.set(key, bed);
      held.level(0, 0);
    }
    if (Math.abs(bed.level - level) < 0.001) return;
    bed.level = level;
    bed.held.level(level, this.cfg.fadeSeconds);
  }

  stopAll() {
    for (const bed of this.beds.values()) bed.held.stop(0.5);
    this.beds.clear();
  }
}

// The state from the game, each frame (kept apart from the class for the tests).
export function ambienceState({ running, clock, inShop, muffled, cutscene, quietStyles, listener }) {
  return {
    running,
    night: clock ? nightness(clock.phase, clock.phaseProgress) : 0,
    inShop: Boolean(inShop),
    muffled: muffled ?? 1,
    quiet: Boolean(cutscene && quietStyles.includes(cutscene.data?.style)),
    listener,
  };
}
