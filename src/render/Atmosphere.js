// The atmosphere (Session 10, style pass 1): the low ground mist in every
// fogged material (atmosphereShader.js), the drifting mist billboards near
// you (GroundMist.js) and fog nights (world/fogNights.js). Sky owns the
// colours and the fog itself; this feeds it the fog night's thickness and
// feeds the shader the mist's values each frame.
//
// Fog nights shrink the draw distance with the fog (viewDistance()), so a
// fog night costs the tablet less, not more.

import * as THREE from 'three';
import { atmosphereUniforms } from './atmosphereShader.js';
import { GroundMist } from './GroundMist.js';
import { isFogNight, fogNightAmount } from '../world/fogNights.js';
import { DEBUG } from '../debug/DebugMenu.js';

const FORCE_STEPS = ['auto', 'on', 'off'];

export class Atmosphere {
  // fogCfg: config.fog. presets: config.quality.presets.
  constructor(fogCfg, presets, seed, rng) {
    this.cfg = fogCfg;
    this.seed = seed;
    this.rng = rng;
    this.maxPuffs = Math.max(...Object.values(presets).map((q) => q.mistPuffs ?? 0));
    this.quality = 0; // the preset's mist strength
    this.heightMist = true; // debug switches
    this.force = 'auto';
    this.amount = 0; // the fog night's thickness now
    this.drift = { x: 0, z: 0 };
    this.windDir = new THREE.Vector2(fogCfg.mist.drift.x, fogCfg.mist.drift.z).normalize();
    this.foggyCache = new Map();
    this.uniforms = atmosphereUniforms; // the shader's shared values (handy in the console)
    this.torch = {
      on: false,
      position: new THREE.Vector3(),
      aim: new THREE.Vector3(),
      color: new THREE.Color(),
      range: 1,
      cosOuter: 0,
      cosInner: 1,
      strength: 0,
    };
  }

  // ground: heightAt(x, z). avoid: rectangles { x0, x1, z0, z1 } where no mist sheets stand.
  init(scene, ground, avoid = []) {
    this.ground = ground;
    this.mist = new GroundMist(this.cfg.puffs, this.maxPuffs, this.rng);
    this.mist.init(scene, ground);
    this.mist.avoid = avoid;
  }

  // From the Quality preset.
  setQuality(preset) {
    this.quality = preset.mist ?? 0;
    this.mist.setCount(preset.mistPuffs ?? 0);
  }

  isFoggy(night) {
    if (!this.foggyCache.has(night)) this.foggyCache.set(night, isFogNight(this.seed, night, this.cfg.nights));
    return this.foggyCache.get(night);
  }

  // The fog night's thickness for the clock now (the debug switch wins).
  fogNightNow(clock) {
    if (this.force === 'on') return 1;
    if (this.force === 'off') return 0;
    return fogNightAmount(clock.phase, clock.phaseProgress, clock.day, (n) => this.isFoggy(n), this.cfg.nights);
  }

  // Before sky.update(): tells the sky how foggy it is.
  preUpdate(clock, sky) {
    this.amount = this.fogNightNow(clock);
    sky.setFogNight(this.amount);
  }

  // After sky.update() (the mist's colour and strength are fresh).
  // flashlight: the player's Flashlight.
  update(dt, camera, sky, flashlight) {
    const m = this.cfg.mist;
    const n = this.cfg.nights;
    this.drift.x += m.drift.x * dt;
    this.drift.z += m.drift.z * dt;
    const strength = this.heightMist ? sky.mistAmount * this.quality * (1 + (n.mistBoost - 1) * this.amount) : 0;
    const p = camera.position;
    const u = atmosphereUniforms;
    u.uMistShape.value.set(strength, m.layerHeight, this.ground.heightAt(p.x, p.z), m.hollowCap);
    // Wrap the drift so the shader's noise coordinates stay small.
    const wrap = 1000;
    u.uMistFlow.value.set(m.noiseScale, m.reach, -((this.drift.x * m.noiseScale) % wrap), -((this.drift.z * m.noiseScale) % wrap));
    u.uMistLook.value.set(m.noiseAmount, m.maxOpacity, 0, 0);
    u.uMistColor.value.copy(sky.mistColor);

    const t = this.torch;
    const f = flashlight;
    t.on = f.on;
    if (f.on) {
      const fc = f.cfg;
      t.position.copy(f.light.position);
      t.aim.copy(f.aim);
      t.color.copy(f.light.color);
      t.range = fc.distance;
      t.cosOuter = Math.cos(fc.angle * (Math.PI / 180));
      t.cosInner = Math.cos(fc.angle * (1 - fc.penumbra) * (Math.PI / 180));
      t.strength = f.glareFactor;
    }
    const puffAmount = sky.mistAmount * (1 + (n.mistBoost - 1) * this.amount);
    this.mist.update(dt, camera, puffAmount, sky.mistColor, sky.fog.far, { x: this.windDir.x, z: this.windDir.y }, t);
  }

  // The draw distance to use: the preset's, or less while the fog is in
  // (in steps, so the chunk culling isn't redone every frame).
  viewDistance(presetDistance, fogFar) {
    const step = this.cfg.nights.drawDistanceStep;
    return Math.min(presetDistance, Math.ceil(fogFar / step) * step);
  }

  overlayLine(clock) {
    const night = clock.day; // tonight, or the night in progress
    const next = `night ${night} ${this.isFoggy(night) ? 'foggy' : 'clear'}`;
    const shown = this.mist.mesh.visible ? this.mist.count : 0;
    return `fog night ${Math.round(this.amount * 100)}% (${this.force}, ${next})  mist ${(atmosphereUniforms.uMistShape.value.x).toFixed(2)}  puffs ${shown}`;
  }

  addDebugItems(menu, notify) {
    const display = menu.category(DEBUG.display);
    display.addItem(
      () => `Fog night: ${this.force}`,
      () => {
        this.force = FORCE_STEPS[(FORCE_STEPS.indexOf(this.force) + 1) % FORCE_STEPS.length];
        notify(this.force === 'auto' ? 'Fog nights: from the seed' : `Fog night forced ${this.force}`);
      },
    );
    display.addItem(
      () => `Ground mist (shader): ${this.heightMist ? 'on' : 'off'}`,
      () => (this.heightMist = !this.heightMist),
    );
    display.addItem(
      () => `Mist billboards: ${this.mist.enabled ? 'on' : 'off'}`,
      () => (this.mist.enabled = !this.mist.enabled),
    );
  }

  dispose() {
    this.mist.dispose();
  }
}
