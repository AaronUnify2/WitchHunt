// The missing quad and the mega night (build queue item 4; story spine, beat
// 8; DESIGN.md "After Bigfoot: the missing quad and the mega night").
// SCAFFOLDING: the beat plays from start to end; the three new kinds of dead
// are stand-ins that do their one job; the night's shape and numbers are for
// the encounter's own design session.
//
//  1. The quad's gone: once the Blessing is buried the greys have taken it
//     (world/Quad.js setGone: no model, no map icon, no prompt). Where it
//     stood: a scorched ring in the grass. Tom, sent to fetch it, finds the
//     ring (quadMissing).
//  2. The radio erupts a few seconds later (megaNightCalled): everything is
//     coming out of the trees at home. When Tom's back near the station the
//     night begins (megaNightStarted; the clock goes to night).
//  3. About 150 of the dead, in waves, from all round the fence. In them,
//     for the first time:
//      - the Hollow (a mutant's body for now): at the wire it tears a whole
//        fence panel down;
//      - the Screamer: hangs back at the treeline and shrieks, and more of
//        the dead come to each shriek until it's put down;
//      - the Hanged: drops out of the branches onto Tom when he's outside
//        the fence (a stand-in: it lands beside him; the pin isn't built).
//  4. Dawn (megaNightDone): the last of them down, or the night run out.
//     Ellen's ask: they won't live through another; the ship that came down
//     in the south had a power core, a big one.
//
// Saved through story flags (quadMissing, megaNightCalled, megaNightStarted,
// megaNightDone; quadReturned is the mothership's) and the ring's place (Game: save.megaNight). A night under
// way when the run's saved starts again from its first wave. Off in Demo mode.
//
// Events: 'mega:quadMissing', 'mega:started', 'mega:wave' { index, count }, 'mega:done'.

import * as THREE from 'three';
import { angleOf } from '../base/stationLayout.js';
import { DEBUG } from '../debug/DebugMenu.js';

export const MEGA_FLAGS = ['quadMissing', 'megaNightCalled', 'megaNightStarted', 'megaNightDone'];

// ---- the pure parts (tested) ----------------------------------------------------------------

// The night's plan: waves[i] = { at (seconds in), count, hollows, screamers, hanged }. m: config.megaNight.
export function megaPlan(m) {
  const out = [];
  for (let i = 0; i < m.waves; i++) {
    out.push({ at: m.firstAfter + i * m.every, count: m.perWave, hollows: m.hollowWaves.filter((w) => w === i).length, screamers: m.screamerWaves.filter((w) => w === i).length, hanged: m.hangedWaves.filter((w) => w === i).length });
  }
  return out;
}

export function megaTotal(plan) {
  return plan.reduce((n, w) => n + w.count + w.hollows + w.screamers + w.hanged, 0);
}

// Which fence segment is at bearing `a` (radians round the centre)? segments: [{ a0, a1 }]. -1 if none (the gate).
export function segmentAt(segments, a) {
  const wrap = (x) => ((x % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const t = wrap(a);
  return segments.findIndex((s) => {
    const a0 = wrap(s.a0);
    const a1 = wrap(s.a1);
    return a0 <= a1 ? t >= a0 && t <= a1 : t >= a0 || t <= a1;
  });
}

// Is the night over: every wave sent, and few enough left near home; or it's run past its time.
export function megaOver({ sent, waves, left, endLeft, t, timeout }) {
  return (sent >= waves && left <= endLeft) || t >= timeout;
}

export class MegaNight {
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.mc = cfg.megaNight;
    this.bus = bus;
    this.ring = null; // { x, z }: where the quad stood
  }

  // ctx: { scene, ground, player, quad, station, enemies, world, combat, clock, dialogue, subtitles,
  // progress, demo, notify, sfx, skipToNight(), skipToDawn(), rng() }.
  init(ctx) {
    Object.assign(this, ctx);
    this.rng ??= Math.random;
    this.plan = megaPlan(this.mc);
    this.buildRing();
    this.bus.on('cave:blessing', () => this.takeQuad());
    this.bus.on('player:respawned', () => this.reset());
    this.reset();
  }

  has(flag) {
    return Boolean(this.progress?.has(flag));
  }

  set(flag) {
    this.progress?.setFlag(flag);
  }

  reset() {
    this.state = this.has('megaNightDone') ? 'done' : 'idle';
    this.t = 0;
    this.sent = 0;
    this.callIn = null;
    this.hollows = [];
    this.screamers = [];
    this.restoreOverrun?.();
    if (!this.has('megaNightDone')) this.progress?.setFlag('megaNightStarted', false);
    // The quad's gone from the moment the Blessing's in the ground (until the mothership gives it back).
    if (this.has('blessingBuried')) this.takeQuad();
    else this.showRing(false);
  }

  // ---- 1: the quad -----------------------------------------------------------------------------

  buildRing() {
    if (!this.scene) return;
    const r = this.mc.ring;
    const g = new THREE.RingGeometry(r.inner, r.outer, 28);
    g.rotateX(-Math.PI / 2);
    this.ringMesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: r.color, transparent: true, opacity: 0.85, depthWrite: false }));
    this.ringMesh.name = 'quadRing';
    this.ringMesh.visible = false;
    this.scene.add(this.ringMesh);
  }

  showRing(on) {
    if (!this.ringMesh) return;
    this.ringMesh.visible = Boolean(on && this.ring);
    if (on && this.ring) this.ringMesh.position.set(this.ring.x, this.ground.heightAt(this.ring.x, this.ring.z) + 0.1, this.ring.z);
  }

  takeQuad() {
    const q = this.quad;
    if (!q) return;
    if (q.riding) q.dismount?.();
    this.ring ??= { x: q.x, z: q.z };
    q.setGone?.(true);
    this.showRing(!this.has('quadReturned'));
  }

  // The mothership gives it back (build queue item 5 calls this): rebuilt, as the alien quad (world/AlienQuad.js,
  // which the mothership's encounter places). Earl's quad as it was is gone for good; so is the ring.
  returnQuad() {
    this.set('quadReturned');
    this.showRing(false);
  }

  // ---- each frame ---------------------------------------------------------------------------

  update(dt, playing) {
    if (this.demo?.active || !playing || !this.station) return;
    const p = this.player.position;
    const L = this.station.layout;
    const home = Math.hypot(p.x - L.centre.x, p.z - L.centre.z);
    if (this.has('blessingBuried') && !this.has('quadMissing') && this.ring && Math.hypot(p.x - this.ring.x, p.z - this.ring.z) < this.mc.ring.find) {
      this.set('quadMissing');
      this.notify?.("The quad's gone. A ring burned into the grass where it stood, and three-toed tracks that stop in the middle of it");
      this.callIn = this.mc.callAfter;
      this.bus.emit('mega:quadMissing');
    }
    if (this.has('quadMissing') && !this.has('megaNightCalled')) {
      this.callIn = (this.callIn ?? this.mc.callAfter) - dt;
      if (this.callIn <= 0 && !this.subtitles?.busy) {
        this.set('megaNightCalled');
        this.dialogue?.play('mega.call.ellen');
      }
    }
    if (this.has('megaNightCalled') && this.state === 'idle' && home < this.mc.startWithin) this.start();
    if (this.state === 'night') this.updateNight(dt);
  }

  // 3: the night.
  start() {
    if (this.state !== 'idle') return;
    this.state = 'night';
    this.t = 0;
    this.sent = 0;
    this.set('megaNightStarted');
    // SCAFFOLDING: the station can't fall tonight (config holdsOut). 150 against a fence the Mothman drained isn't
    // tuned yet, and an untuned set piece shouldn't end a run. The dead still break in and still hurt Tom.
    if (this.mc.holdsOut && this.station.overrunEnabled) {
      this.station.overrunEnabled = false;
      this.heldOut = true;
    }
    if (this.clock?.phase !== 'night') this.skipToNight?.();
    this.notify?.('They are coming out of the trees on every side');
    this.bus.emit('mega:started');
  }

  updateNight(dt) {
    const m = this.mc;
    this.t += dt;
    const L = this.station.layout;
    while (this.sent < this.plan.length && this.t >= this.plan[this.sent].at) this.sendWave(this.sent++);
    // The Hollow: at the wire it takes a panel down, once.
    for (const h of this.hollows) {
      if (h.tore || !h.z.alive) continue;
      if (Math.hypot(h.z.x - L.centre.x, h.z.z - L.centre.z) > L.radius + m.hollow.reach) continue;
      h.tore = true;
      const i = segmentAt(L.segments, angleOf(L, h.z.x, h.z.z));
      const seg = this.station.state.segments[i];
      if (seg && seg.health > 0) {
        seg.health = 0;
        this.sfx?.play('carCrash', h.z);
        this.notify?.('The Hollow walks through the fence. A whole panel is down');
        this.dialogue?.play('mega.hollow.wyatt');
      }
    }
    // The Screamer: every few seconds it shrieks and more come to it.
    for (const s of this.screamers) {
      if (s.z.screamT > 0) s.z.screamT -= dt; // (Round 2: its scream's pose: Zombie.frame)
      if (!s.z.alive || s.calls >= m.screamer.maxCalls) continue;
      s.t -= dt;
      if (s.t > 0) continue;
      s.t = m.screamer.every;
      s.z.screamT = this.cfg.screamer?.poseSeconds ?? 2.4;
      this.sfx?.play('screech', s.z);
      s.calls++;
      if (!this.screamerSaid) {
        this.screamerSaid = true;
        this.notify?.('Something at the treeline is screaming, and they answer it. Find it and put it down');
        this.dialogue?.play('mega.screamer.ellen');
      }
      this.spawnRing(m.screamer.calls, s.z.x, s.z.z, 4, 12);
    }
    const left = this.enemies.living.filter((z) => Math.hypot(z.x - L.centre.x, z.z - L.centre.z) < m.nearHome).length;
    if (megaOver({ sent: this.sent, waves: this.plan.length, left, endLeft: m.endLeft, t: this.t, timeout: m.timeout })) this.finish();
  }

  spawnRing(n, cx, cz, min, max) {
    const L = this.station.layout;
    const opts = { ringMin: min, ringMax: max, mix: this.world.variantMixAt(L.centre.x, L.centre.z), mode: 'chase', faceX: L.centre.x, faceZ: L.centre.z };
    let k = 0;
    for (let i = 0; i < n; i++) k += this.enemies.spawnPlanned({ type: 'single', count: 1 }, cx, cz, opts);
    return k;
  }

  sendWave(i) {
    const w = this.plan[i];
    const m = this.mc;
    const L = this.station.layout;
    const count = this.spawnRing(w.count, L.centre.x, L.centre.z, L.radius + m.ringMin, L.radius + m.ringMax);
    const around = (d) => {
      const a = this.rng() * Math.PI * 2;
      return { x: L.centre.x + Math.sin(a) * (L.radius + d), z: L.centre.z + Math.cos(a) * (L.radius + d), a };
    };
    for (let k = 0; k < w.hollows; k++) {
      const at = around(m.ringMin + 6);
      const z = this.enemies.spawnZombie(at.x, at.z, { kind: 'mutant', mode: 'chase', facing: at.a + Math.PI, authored: 'hollow' });
      if (z) this.hollows.push({ z, tore: false });
      if (z && !this.hollowSaid) {
        this.hollowSaid = true;
        this.notify?.('Something huge is coming through the trees, slowly, straight at the fence');
      }
    }
    for (let k = 0; k < w.screamers; k++) {
      const at = around(m.screamer.back);
      // Round 2: it wears the Screamer's own figure now (the variant), at a share of Night 2's health (there
      // are two of them tonight, among much else).
      const z = this.enemies.spawnZombie(at.x, at.z, { variant: 'screamer', mode: 'linger', facing: at.a + Math.PI, authored: 'screamer', linger: { x: at.x, z: at.z, r: 3 } });
      if (z) {
        if (typeof z.health === 'number') z.health *= m.screamer.healthScale ?? 1;
        this.screamers.push({ z, t: m.screamer.first, calls: 0 });
      }
    }
    for (let k = 0; k < w.hanged; k++) {
      // A stand-in: it comes down beside Tom if he's out under the trees; else at the gate.
      const p = this.player.position;
      const outside = Math.hypot(p.x - L.centre.x, p.z - L.centre.z) > L.radius + 2;
      const at = outside ? { x: p.x + 1.1, z: p.z + 0.6 } : around(3);
      const z = this.enemies.spawnZombie(at.x, at.z, { mode: 'chase', facing: 0, authored: 'hanged' });
      if (z && outside) this.notify?.('Something drops out of the branches onto you');
    }
    this.bus.emit('mega:wave', { index: i, count });
    if (i === 0) this.dialogue?.play('mega.first.wyatt');
  }

  restoreOverrun() {
    if (!this.heldOut) return;
    this.heldOut = false;
    this.station.overrunEnabled = true;
  }

  // 4: dawn, and Ellen's ask.
  finish() {
    if (this.state !== 'night') return;
    this.state = 'done';
    this.restoreOverrun();
    this.set('megaNightDone');
    this.skipToDawn?.();
    this.notify?.('Dawn. The yard is full of them, and none of them moving');
    this.dialogue?.play('mega.after.ellen');
    this.bus.emit('mega:done');
  }

  // ---- saving ----------------------------------------------------------------------------------

  saveState() {
    return this.ring ? { ring: { x: this.ring.x, z: this.ring.z } } : null;
  }

  loadState(d) {
    if (d?.ring && Number.isFinite(d.ring.x) && Number.isFinite(d.ring.z)) this.ring = { x: d.ring.x, z: d.ring.z };
  }

  // ---- debug ----------------------------------------------------------------------------------

  addDebugItems(menu) {
    const cat = menu.category(DEBUG.story);
    cat.addItem(() => `The mega night: ${this.state}${this.state === 'night' ? ` wave ${this.sent}/${this.plan.length}` : ''} (select: start it now)`, () => {
      for (const f of ['blessingBuried', 'quadMissing', 'megaNightCalled']) this.set(f);
      this.takeQuad();
      this.start();
    });
    cat.addItem('The mega night: end it now (dawn)', () => this.finish());
    cat.addItem('The mega night: start it again (flags cleared; the quad back)', () => {
      for (const f of MEGA_FLAGS) this.progress?.setFlag(f, false);
      this.quad?.setGone?.(false);
      this.ring = null;
      this.reset();
    });
  }

  overlayLine() {
    return `mega ${this.state}${this.state === 'night' ? ` ${this.sent}/${this.plan.length} t${Math.round(this.t)}` : ''}`;
  }

  dispose() {
    if (this.ringMesh) {
      this.ringMesh.removeFromParent();
      this.ringMesh.geometry.dispose();
      this.ringMesh.material.dispose();
    }
  }
}
