// Session 22 (Aaron): Demo mode, from the main menu. "If it runs in demo
// mode, it'll run on your device": the ranger station on its own, with no
// story, no witch and no saving (Game swaps in a save store that keeps
// nothing, so the real save is never touched, and the menu's Skip intro
// isn't unlocked by it). config.demo holds every number.
//
// The demo panel (Menu / Esc) sends waves of up to 150 zombies at the
// fence, sets their level, the time of day, the fence's power, infinite
// ammo, the graphics preset, brings the quad or the dozer to the gate, and
// runs the device test: night, a big wave, and the frame rate measured as
// they arrive, for a verdict ("Runs great", "Playable", "Struggling")
// and the preset to keep for real runs on this device.
//
// Game asks it: active, update(dt, playing), onDied(), rows for the panel.

import { DemoPanel } from './DemoPanel.js';
import { FpsMeter, verdictFor, recommendPreset, stepIn } from './verdict.js';

export class DemoMode {
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.dc = cfg.demo;
    this.bus = bus;
    this.active = false;
  }

  // game: the Game (the demo drives the whole of it).
  init(root, game) {
    this.root = root;
    this.game = game;
  }

  // ---- starting --------------------------------------------------------------------------------

  begin() {
    const g = this.game;
    const d = this.dc;
    this.active = true;
    this.count = d.startCount;
    this.level = d.startLevel;
    this.time = d.startTime;
    this.fenceOn = d.fenceOn;
    this.infiniteAmmo = d.infiniteAmmo;
    this.fps = 0;
    this.test = null;
    this.result = null;
    this.respawnTimer = -1;

    // The station as after the opening: the fence whole, a battery in.
    const st = g.station;
    for (const s of st.state.segments) s.health = s.max;
    st.state.fitBattery();
    st.syncColliders();
    st.takeAidBox?.(true);
    // Past Day 1's scripted beats, and nothing left for the radio to say.
    for (const id of ['towerClimbed', 'campsiteVisited', 'shotgunFound', 'campsiteCleared', 'campsiteBattery', 'day1Home', 'day1Battery', 'night1Planted', 'night1', 'day2', 'aidBoxTaken']) g.progress.setFlag(id);
    for (const l of g.dialogue.lines) g.dialogue.heard.add(l.id);
    g.subtitles.clear?.();
    // No sigils, no witch (Game stops her updating), the clock held.
    g.director.removeAll();
    g.combat.clearHealthFloor('day1'); // Day 1's can't-die floor (lifted at dawn 1, which the demo skips past)
    g.clock.day = d.day;
    g.clock.setPaused(true);
    this.setTime(this.time);
    this.equip();
    this.toYard();
    g.director.levelOverride = this.level;

    this.panel = new DemoPanel(this.rows(), () => g.resumeFromPause());
    this.panel.init(this.root);
    this.initHud();
    g.toast.show('Demo mode: Menu / Esc opens the demo panel');
  }

  // The early-game weapons, the first one in hand.
  equip() {
    const c = this.game.combat;
    for (const id of this.dc.weapons) c.giveWeapon(id, 0);
    const w = c.weapons;
    const i = w.order.indexOf(this.dc.weapons[this.dc.weapons.length - 1]);
    if (i >= 0) w.select(i);
    this.topUpAmmo(true);
  }

  // Tom in the yard, just inside the gate, facing out.
  toYard() {
    const { gate } = this.game.station.layout;
    const { ox, oz } = this.outward();
    const x = gate.mid.x - ox * this.dc.yardIn;
    const z = gate.mid.z - oz * this.dc.yardIn;
    this.game.player.teleport(x, z, Math.atan2(-ox, -oz));
  }

  // The unit direction from the station's centre out through the gate.
  outward() {
    const { gate, centre } = this.game.station.layout;
    const len = Math.hypot(gate.mid.x - centre.x, gate.mid.z - centre.z) || 1;
    return { ox: (gate.mid.x - centre.x) / len, oz: (gate.mid.z - centre.z) / len };
  }

  // ---- what the panel does -----------------------------------------------------------------------

  // Straight to a time of day (config.demo.times): no phase events, so nothing scripted runs.
  setTime(id) {
    const t = this.dc.times.find((x) => x.id === id);
    if (!t) return;
    const c = this.game.clock;
    const i = this.cfg.clock.phases.findIndex((p) => p.name === t.phase);
    if (i < 0) return;
    this.time = id;
    c.phaseIndex = i;
    c.phaseElapsed = this.cfg.clock.phases[i].seconds * t.progress;
  }

  // `n` zombies on a ring outside the fence, coming for Tom. Returns how many rose.
  send(n = this.count) {
    const g = this.game;
    const { centre, radius } = g.station.layout;
    const enemies = g.combat.enemies;
    const opts = { ringMin: radius + this.dc.ring.min, ringMax: radius + this.dc.ring.max, mix: g.world.variantMixAt(centre.x, centre.z), mode: 'chase', faceX: centre.x, faceZ: centre.z };
    let spawned = 0;
    for (let i = 0; i < n; i++) {
      const k = enemies.spawnPlanned({ type: 'single', count: 1 }, centre.x, centre.z, opts);
      if (k === 0) break; // the pool is full
      spawned += k;
    }
    return spawned;
  }

  clear() {
    this.game.combat.enemies.clear();
  }

  setLevel(level) {
    this.level = level;
    this.game.director.levelOverride = level;
  }

  // A vehicle ('quad' | 'dozer') to just outside the gate.
  bring(id) {
    const g = this.game;
    const v = id === 'quad' ? g.quad : g.dozer;
    if (!v || g.player.riding === v) return;
    const spot = this.dc.vehicles[id];
    const { gate } = g.station.layout;
    const { ox, oz } = this.outward();
    v.place(gate.mid.x + ox * spot.out - oz * spot.side, gate.mid.z + oz * spot.out + ox * spot.side, Math.atan2(-ox, -oz));
    g.toast.show(`The ${id === 'quad' ? 'quad bike' : 'dozer'} is outside the gate`);
  }

  setQuality(name) {
    const g = this.game;
    g.applyQuality(name);
    g.meta.set(this.dc.metaQualityKey, name);
  }

  // The device test: night, a big wave, and the frame rate as they come.
  startTest() {
    this.clear();
    this.setTime('night');
    const sent = this.send(this.dc.test.count);
    this.test = { phase: 'settle', t: this.dc.test.settleSeconds, sent, meter: new FpsMeter() };
    this.result = null;
    this.panel.close();
  }

  // ---- the panel's rows ----------------------------------------------------------------------------

  rows() {
    const d = this.dc;
    const g = this.game;
    const presets = Object.keys(this.cfg.quality.presets);
    const label = (name) => name[0].toUpperCase() + name.slice(1);
    return [
      { id: 'resume', label: 'Back to the game', pick: () => this.panel.close() },
      {
        id: 'test',
        label: 'Run the device test',
        note: () => (this.result ? `last: ${this.result.label} (${Math.round(this.result.avg)} fps)` : `night, ${d.test.count} zombies, about ${d.test.settleSeconds + d.test.measureSeconds} s`),
        pick: () => this.startTest(),
      },
      { id: 'count', label: 'Zombies to send', value: () => String(this.count), adjust: (s) => (this.count = stepIn(d.zombieCounts, this.count, s)) },
      {
        id: 'send',
        label: 'Send them',
        note: () => `${g.combat.enemies.living.length} on the map`,
        pick: () => {
          const n = this.send();
          this.panel.close();
          g.toast.show(n < this.count ? `${n} zombies coming (the rest wouldn't fit)` : `${n} zombies coming`);
        },
      },
      { id: 'level', label: 'Zombie level', value: () => String(this.level), adjust: (s) => this.setLevel(stepIn(d.levels, this.level, s)) },
      { id: 'clear', label: 'Clear the zombies', pick: () => this.clear() },
      { id: 'time', label: 'Time of day', value: () => d.times.find((t) => t.id === this.time)?.label ?? '', adjust: (s) => this.setTime(stepIn(d.times.map((t) => t.id), this.time, s)) },
      { id: 'fence', label: 'Fence power', value: () => (this.fenceOn ? 'On' : 'Off'), adjust: () => (this.fenceOn = !this.fenceOn) },
      { id: 'ammo', label: 'Infinite ammo', value: () => (this.infiniteAmmo ? 'On' : 'Off'), adjust: () => (this.infiniteAmmo = !this.infiniteAmmo) },
      { id: 'quad', label: 'Bring the quad bike', pick: () => this.bring('quad') },
      { id: 'dozer', label: 'Bring the dozer', pick: () => this.bring('dozer') },
      { id: 'quality', label: 'Graphics', value: () => label(g.qualityName), adjust: (s) => this.setQuality(stepIn(presets, g.qualityName, s)) },
      { id: 'quit', label: 'Quit the demo', note: () => 'back to the main menu', pick: () => this.quit() },
    ];
  }

  quit() {
    if (typeof document !== 'undefined' && document.pointerLockElement) document.exitPointerLock?.();
    if (typeof window !== 'undefined') window.location.reload();
  }

  // ---- each frame ------------------------------------------------------------------------------------

  // playing: the world is running (no menu, map or panel up).
  update(dt, playing) {
    if (!this.active) return;
    if (dt > 0) {
      const k = this.dc.fpsSmoothing;
      this.fps = this.fps > 0 ? this.fps + (1 / dt - this.fps) * k : 1 / dt;
    }
    const st = this.game.station.state;
    st.charge = this.fenceOn ? st.capacity : 0;
    if (this.infiniteAmmo) this.topUpAmmo();
    this.updateRespawn(dt);
    if (playing) this.updateTest(dt);
    this.paintHud();
  }

  topUpAmmo(force = false) {
    if (!this.infiniteAmmo && !force) return;
    const w = this.game.combat.weapons;
    for (const [type, pool] of Object.entries(w.pools)) if (!this.cfg.weapons.ammoTypes[type]) pool.rounds = Math.max(pool.rounds, this.dc.ammoFloor);
  }

  updateTest(dt) {
    const t = this.test;
    if (!t) return;
    t.t -= dt;
    if (t.phase === 'settle') {
      if (t.t <= 0) {
        t.phase = 'measure';
        t.t = this.dc.test.measureSeconds;
        t.meter.reset();
      }
      return;
    }
    t.meter.add(dt);
    if (t.t > 0) return;
    const g = this.game;
    const avg = t.meter.average;
    const v = verdictFor(avg, g.frameCap, this.dc.test);
    const presets = Object.keys(this.cfg.quality.presets);
    const tested = g.qualityName;
    const keep = recommendPreset(v.id, tested, presets);
    this.result = { ...v, avg, low: t.meter.low, tested, keep };
    this.test = null;
    if (keep !== tested) {
      this.setQuality(keep);
      g.toast.show(`Device test: ${v.label}, ${Math.round(avg)} fps. Switched to ${keep} graphics`, this.cfg.ui.toastSeconds * 2);
    } else {
      g.meta.set(this.dc.metaQualityKey, keep);
      g.toast.show(`Device test: ${v.label}, ${Math.round(avg)} fps on ${tested} graphics`, this.cfg.ui.toastSeconds * 2);
    }
  }

  // ---- dying -----------------------------------------------------------------------------------------

  // Game calls this instead of ending the run.
  onDied() {
    this.respawnTimer = this.dc.respawnSeconds;
    this.test = null;
  }

  updateRespawn(dt) {
    if (this.respawnTimer < 0) return;
    this.respawnTimer -= dt;
    if (this.respawnTimer >= 0) return;
    const g = this.game;
    g.combat.respawn();
    this.equip();
    this.toYard();
    g.toast.show('Back on your feet');
  }

  // ---- the readout -------------------------------------------------------------------------------------

  initHud() {
    if (typeof document === 'undefined' || !this.root) return;
    this.hud = document.createElement('div');
    this.hud.className = 'demo-hud';
    this.root.appendChild(this.hud);
    this.hudText = '';
  }

  paintHud() {
    if (!this.hud) return;
    const n = this.game.combat.enemies.living.length;
    let line2 = 'Menu / Esc: demo panel';
    const t = this.test;
    if (t) line2 = t.phase === 'settle' ? `Device test: ${t.sent} zombies coming…` : `Device test: measuring… ${Math.ceil(t.t)} s`;
    else if (this.result) line2 = `Test: ${this.result.label} (${Math.round(this.result.avg)} fps, ${this.result.tested})`;
    const text = `DEMO · ${Math.round(this.fps)} fps · ${n} zombies\n${line2}`;
    if (text === this.hudText) return;
    this.hudText = text;
    this.hud.textContent = text;
  }

  overlayLine() {
    if (!this.active) return 'demo off';
    return `demo ${this.time} L${this.level} fence ${this.fenceOn ? 'on' : 'off'} ammo ${this.infiniteAmmo ? 'inf' : 'normal'}${this.test ? ` test ${this.test.phase} ${this.test.t.toFixed(1)}` : ''}${this.result ? ` last ${this.result.id} ${this.result.avg.toFixed(1)}` : ''}`;
  }

  dispose() {
    this.panel?.dispose();
    this.hud?.remove();
  }
}
