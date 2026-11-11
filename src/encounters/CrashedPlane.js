// The crashed plane's story beats (Session 25; DESIGN.md "Crashed plane"
// and "The Mothman at the crash site"; the set: world/CrashSite.js, Session
// 24). Built straight from the design, to be tuned after Aaron plays it.
//
//  1. The standoff: as Tom comes up the gouge (the outpost behind him), the
//     camera holds on the grey at its workbench (the wing), absorbed; it
//     turns, sees him and lifts its gun ('plane.standoff', the world running).
//  2. The quick draw: control comes back just before it fires. For about
//     half a second (config) one good hit drops it. Miss the moment and its
//     first shot misses (clumsy with an Earth gun); it scrambles over the
//     wing into cover and a shootout begins: it hides, steps out past the
//     wing's tip, aims, fires, ducks back.
//  3. Its drops, where it fell (hold X): the pilot's pistol (into Tom's
//     hands: Session 25 carries every gun), alien shells, an alien med kit
//     (the healing pool, or home to the first aid box if that's full) and
//     the small alien power cell (fitted at the fence box at home). The
//     pilot's log on his knee-board (a paper; carried to the ledger).
//  4. Wyatt suggests the pilot's signal flare (the survival kit): Tom fires
//     it ('plane.flare'), and what answers isn't a rescue: the Mothman (the
//     flyer's moves on his model, ai/Flyer.js): a flyover, a second, then
//     the full attack. Hurt enough, he flies off early. Otherwise Tom drops
//     to a 10% health floor (Combat.setHealthFloor) and blacks out: red eyes
//     over him ('plane.blackout'), and he wakes at the wreck at dawn with
//     the radio quiet. Session 26: driven off, its last strike smashes Tom's
//     radio and the night passes all the same (plane.radioSmashed): Junie is
//     taken in both endings (encounters/JunieTaken.js).
//     Either way mothmanMet is set: flares join the drop tables.
//
// Saved through story flags (data/progress.json): planeStandoff, planeGreyDown,
// planeLooted, planeLogRead, planeCellTaken, planeCellFitted, mothmanMet,
// planeDone. A fight that was on when the run was saved (the grey's, the
// Mothman's) starts again when Tom comes back. Off in Demo mode.
//
// Events: 'plane:standoff', 'plane:greyDown' { quick }, 'plane:flare',
// 'plane:mothmanGone' { drivenOff }, 'plane:done'.

import { AlienRenderer } from '../render/AlienRenderer.js';
import { HoldAction } from '../player/HoldAction.js';
import { rayBlockers } from '../combat/hitscan.js';
import { DEBUG, ENEMY_TABS } from '../debug/DebugMenu.js';

// ---- the pure parts (tested) ----------------------------------------------------------------

// The quick draw: is a hit `since` seconds after control came back inside the window?
export function inQuickDraw(since, window) {
  return since >= 0 && since <= window;
}

// Where the grey steps out to shoot: past the wing's tip, from cover along
// the wing (the unit vector `along`, in the world, toward the tip).
export function peekPoint(cover, along, out) {
  return { x: cover.x + along.x * out, z: cover.z + along.z * out };
}

// A hop from a to b (the scramble over the wing): t 0..1 -> { x, z, lift }.
export function hop(a, b, t, height) {
  const k = Math.max(0, Math.min(1, t));
  return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k, lift: Math.sin(k * Math.PI) * height };
}

const FLAGS = ['planeStandoff', 'planeGreyDown', 'planeLooted', 'planeLogRead', 'planeCellTaken', 'planeCellFitted', 'mothmanMet', 'planeDone'];

export class CrashedPlane {
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.ec = cfg.crashedPlane.encounter;
    this.bus = bus;
    this.hud = { prompt: '', progress: 0 };
  }

  // ctx: { scene, crashSite, player, combat, ground, colliders, cutscenes, dialogue, progress, lore,
  // paper, card, station, flyer, clock, skipToDawn(), notify(text), demo }.
  init(ctx) {
    Object.assign(this, ctx);
    this.sfx = this.combat.sfx;
    this.hold = new HoldAction(this.cfg.station.hold.releaseDrain);
    this.hold.init();
    this.renderer = new AlienRenderer(this.cfg.aliens.grey);
    this.renderer.init(this.scene, 1);
    this.grey = { active: false, x: 0, y: 0, z: 0, facing: 0, state: 'examine', timer: 0, walked: 0, flash: 0, stage: 0 };
    const h = this.ec.hit;
    this.target = {
      x: 0,
      y: 0,
      z: 0,
      targetable: false,
      alive: true,
      hitRadius: h.hitRadius,
      height: h.height,
      headBottom: h.headBottom,
      headRadius: h.headRadius,
      headshotMultiplier: h.headshotMultiplier,
      takeHit: (amount, part) => this.hitGrey(amount, part),
    };
    this.combat.weapons.extraTargets.push(this.target);
    this.blockers = [];
    this.cutscenes?.namedAnchors?.set('grey', () => ({ x: this.grey.x, z: this.grey.z, yaw: 0, dy: 1.1 }));
    this.cutscenes?.namedAnchors?.set('wreck', () => ({ ...this.spot('kit'), yaw: 0 }));
    this.bus.on('player:respawned', () => this.reset());
    this.reset();
  }

  get ready() {
    return Boolean(this.crashSite?.place && this.crashSite.spots?.work);
  }

  spot(name) {
    return this.crashSite.spots[name];
  }

  has(flag) {
    return Boolean(this.progress?.has(flag));
  }

  // As the flags say (a new run, a load, a respawn): the fights start over.
  reset() {
    this.state = 'idle';
    this.timer = 0;
    this.greyHealth = this.ec.greyHealth;
    this.mothmanOn = false;
    this.flareSuggested = false;
    this.combat.clearHealthFloor?.('crashedPlane');
    if (!this.ready) return;
    this.placeGrey();
  }

  // The grey at its bench, or lying where it fell.
  placeGrey() {
    const g = this.grey;
    const down = this.has('planeGreyDown');
    const at = down ? this.spot('cover') : this.spot('work');
    const bench = this.spot('bench');
    g.x = at.x;
    g.z = at.z;
    g.y = this.ground.heightAt(at.x, at.z);
    g.facing = Math.atan2(bench.x - at.x, bench.z - at.z);
    g.state = down ? 'corpse' : 'examine';
    g.timer = down ? 99 : 0;
    g.active = true;
    g.alienPose = null;
    this.target.targetable = false;
    if (down) this.state = this.has('mothmanMet') ? 'done' : 'down';
  }

  // ---- each frame ----------------------------------------------------------------------------

  update(dt, input, playing, canInteract) {
    if (!this.ready || this.demo?.active) return;
    const p = this.player.position;
    const g = this.grey;
    const near = Math.hypot(p.x - g.x, p.z - g.z);
    if (playing) {
      this.timer += dt;
      switch (this.state) {
        case 'idle':
          if (this.has(this.ec.needs) && near < this.ec.triggerDistance && !this.cutscenes?.active) this.startStandoff();
          break;
        case 'standoff':
          this.updateStandoff(dt);
          break;
        case 'quickdraw':
          this.faceTom();
          g.state = 'aim';
          if (this.timer >= this.ec.quickDraw) this.firstShot();
          break;
        case 'scramble':
          this.updateScramble();
          break;
        case 'shootout':
          this.updateShootout(dt);
          break;
        case 'down':
          if (!this.flareSuggested && this.has('planeLooted') && this.timer > this.ec.flareAfter) {
            this.flareSuggested = true;
            this.dialogue?.play('plane.flare.wyatt');
          }
          break;
        default:
          break;
      }
    }
    // The grey drawn while Tom's anywhere near.
    g.flash = Math.max(0, g.flash - dt);
    g.timer += dt;
    const shown = near < this.ec.drawDistance;
    this.renderer.update(shown && g.active ? [g] : [], dt);
    const t = this.target;
    t.x = g.x;
    t.y = g.y;
    t.z = g.z;
    // Hold X: the drops, the log, the flare.
    if (canInteract && input && playing) this.updateInteraction(dt, input);
    else {
      this.hud.prompt = '';
      this.hold.update(dt, null, false, 1);
    }
  }

  faceTom() {
    const p = this.player.position;
    const g = this.grey;
    g.facing = Math.atan2(p.x - g.x, p.z - g.z);
  }

  // 1: the standoff.
  startStandoff() {
    this.state = 'standoff';
    this.timer = 0;
    this.progress?.setFlag('planeStandoff');
    this.bus.emit('plane:standoff');
    this.cutscenes?.play('plane.standoff');
  }

  updateStandoff() {
    const s = this.ec.standoff;
    const g = this.grey;
    // Absorbed in its work, then it turns and lifts its gun.
    if (this.timer < s.turnAt) g.state = 'examine';
    else if (this.timer < s.aimAt) {
      g.state = 'idle';
      const p = this.player.position;
      const want = Math.atan2(p.x - g.x, p.z - g.z);
      let d = want - g.facing;
      d -= Math.round(d / (Math.PI * 2)) * Math.PI * 2;
      g.facing += d * Math.min(1, 0.12);
    } else g.state = 'aim';
    if (!this.cutscenes?.active && this.timer > 0.2) {
      // Control's back: the quick draw.
      this.state = 'quickdraw';
      this.timer = 0;
      this.target.targetable = true;
    }
  }

  // 2: missed the moment: its first shot goes wide; over the wing into cover.
  firstShot() {
    this.greyFire(false);
    this.state = 'scramble';
    this.timer = 0;
    this.scrambleFrom = { x: this.grey.x, z: this.grey.z };
    this.dialogue?.play('plane.shootout.ellen');
  }

  updateScramble() {
    const g = this.grey;
    const c = this.spot('cover');
    const k = this.timer / this.ec.scrambleSeconds;
    const h = hop(this.scrambleFrom, c, k, this.ec.scrambleHeight);
    g.x = h.x;
    g.z = h.z;
    g.y = this.ground.heightAt(g.x, g.z) + h.lift;
    g.state = 'ambush';
    if (k >= 1) {
      g.y = this.ground.heightAt(g.x, g.z);
      this.state = 'shootout';
      this.timer = 0;
      this.phase = 'hide';
      this.phaseTimer = this.range(this.ec.shootout.hideSeconds);
    }
  }

  // Out past the wing's tip: the direction along the wing, from the bench toward its tip.
  alongWing() {
    const b = this.spot('bench');
    const ck = this.spot('cockpit');
    const w = this.spot('work');
    // The wing's chord runs bench -> work; along it is across that, away from the cockpit.
    let zx = w.x - b.x;
    let zz = w.z - b.z;
    const zl = Math.hypot(zx, zz) || 1;
    zx /= zl;
    zz /= zl;
    let ax = b.x - ck.x;
    let az = b.z - ck.z;
    const dot = ax * zx + az * zz;
    ax -= zx * dot;
    az -= zz * dot;
    const al = Math.hypot(ax, az) || 1;
    return { x: ax / al, z: az / al };
  }

  updateShootout(dt) {
    const s = this.ec.shootout;
    const g = this.grey;
    const cover = this.spot('cover');
    this.phaseTimer -= dt;
    if (this.phase === 'hide') {
      // Crouched behind the wing.
      const k = Math.min(1, dt * 4);
      g.x += (cover.x - g.x) * k;
      g.z += (cover.z - g.z) * k;
      g.state = 'sneak';
      if (this.phaseTimer <= 0) {
        this.phase = 'out';
        this.peek = peekPoint(cover, this.alongWing(), s.peekOut);
        this.phaseTimer = s.stepSeconds;
      }
    } else if (this.phase === 'out') {
      const k = Math.min(1, dt * 5);
      g.x += (this.peek.x - g.x) * k;
      g.z += (this.peek.z - g.z) * k;
      g.state = 'walk';
      g.walked += dt * 1.5;
      this.faceTom();
      if (this.phaseTimer <= 0) {
        this.phase = 'aim';
        this.phaseTimer = s.aimSeconds;
      }
    } else if (this.phase === 'aim') {
      g.state = 'aim';
      this.faceTom();
      if (this.phaseTimer <= 0) {
        this.greyFire(this.rng() < s.hitChance);
        this.phase = 'fired';
        this.phaseTimer = s.afterShot;
      }
    } else if (this.phase === 'fired') {
      g.state = 'fire';
      if (this.phaseTimer <= 0) {
        this.phase = 'hide';
        this.phaseTimer = this.range(s.hideSeconds);
      }
    }
    g.y = this.ground.heightAt(g.x, g.z);
  }

  rng() {
    return Math.random();
  }

  range([a, b]) {
    return a + (b - a) * this.rng();
  }

  // Its shot at Tom: `hits` if it means to (and nothing's in the way).
  greyFire(hits) {
    const g = this.grey;
    g.state = 'fire';
    g.timer = 0;
    this.sfx?.play('greyShot', g);
    if (!hits) {
      this.sfx?.play('ricochet', this.player.position);
      return;
    }
    const eye = this.player.camera.position;
    const from = { x: g.x, y: g.y + 1.15, z: g.z };
    const dx = eye.x - from.x;
    const dy = eye.y - 0.4 - from.y;
    const dz = eye.z - from.z;
    const d = Math.hypot(dx, dy, dz);
    if (d > this.ec.shootout.range) return;
    const dir = { x: dx / d, y: dy / d, z: dz / d };
    this.colliders.query((from.x + eye.x) / 2, (from.z + eye.z) / 2, d / 2 + 2, this.blockers);
    const blocked = rayBlockers(from, dir, this.blockers.filter((c) => Math.hypot(c.x - g.x, c.z - g.z) > (c.r ?? 0) + 0.6 || !c.seg), d, this.ground);
    if (blocked < d - 0.6) return;
    this.combat.hurtPlayer(this.ec.shootout.damage, 1);
  }

  hitGrey(amount, part) {
    const g = this.grey;
    if (!['quickdraw', 'scramble', 'shootout'].includes(this.state)) return false;
    g.flash = this.cfg.aliens.grey.hitFlashSeconds;
    // The quick draw: one good hit inside the window drops it.
    const quick = this.state === 'quickdraw' && inQuickDraw(this.timer, this.ec.quickDraw);
    this.greyHealth -= quick ? 1e6 : amount;
    if (this.greyHealth > 0) {
      if (this.state === 'shootout' && this.phase !== 'hide') {
        // Hit while out: it ducks back.
        this.phase = 'hide';
        this.phaseTimer = this.range(this.ec.shootout.hideSeconds);
      }
      return false;
    }
    this.greyDown(quick);
    return true;
  }

  greyDown(quick) {
    const g = this.grey;
    g.state = 'dying';
    g.timer = 0;
    this.target.targetable = false;
    this.state = 'down';
    this.timer = 0;
    this.progress?.setFlag('planeGreyDown');
    this.bus.emit('plane:greyDown', { quick });
    this.sfx?.play('mothDie', g);
    this.notify?.(quick ? 'Quick draw: it never got its shot off' : 'The grey is down');
    this.dialogue?.play(quick ? 'plane.quick.wyatt' : 'plane.down.wyatt');
  }

  // ---- hold X ---------------------------------------------------------------------------------

  updateInteraction(dt, input) {
    this.device = input.activeDevice;
    const X = input.activeDevice === 'gamepad' ? 'X' : 'E';
    const best = this.pick(X);
    const key = best?.act ? best.key : null;
    const done = this.hold.update(dt, key, input.isDown('interact'), best?.seconds ?? 1);
    if (done && best?.act) best.act();
    this.hud.prompt = best ? (this.hold.active && best.busy ? best.busy : best.prompt) : '';
    this.hud.progress = this.hold.key !== null ? this.hold.progress : 0;
  }

  pick(X) {
    const p = this.player.position;
    const r = this.ec.interactRange;
    const dist = (q) => Math.hypot(p.x - q.x, p.z - q.z);
    if (this.state === 'down' || this.state === 'done') {
      const g = this.grey;
      if (!this.has('planeLooted') && dist(g) < r + 0.4) return { key: 'loot', prompt: `Hold ${X}: search the grey (it had the pilot's pistol)`, busy: 'Searching…', seconds: 1.4, act: () => this.loot() };
      if (!this.has('planeLogRead') && dist(this.spot('log')) < r) return { key: 'log', prompt: `Hold ${X}: pick up the pilot's knee-board`, busy: 'Picking it up…', seconds: 0.8, act: () => this.readLog() };
      if (this.state === 'down' && this.has('planeLooted') && !this.mothmanOn && dist(this.spot('kit')) < r) return { key: 'flare', prompt: `Hold ${X}: fire the pilot's signal flare`, busy: 'Loading the flare pistol…', seconds: 1.2, act: () => this.fireFlare() };
      if (this.state === 'down' && !this.has('planeLooted') && dist(this.spot('kit')) < r) return { key: 'kit', prompt: "The pilot's survival kit: a flare pistol and three flares", act: null };
    }
    return null;
  }

  // 3: the drops (each teaches something: the sidearm, ammo on B, the healing pool, the fence's power).
  loot() {
    const e = this.ec.drops;
    this.combat.giveWeapon('pistol', e.pistolRounds);
    if (!this.combat.weapons.addAmmo('alienShells', e.alienShells)) this.combat.inventory.addAmmo?.('alienShells', e.alienShells);
    const inv = this.combat.inventory;
    const kept = inv.addKits('alienMed', 1);
    if (!kept) this.station?.state.stashKits('alienMed', 1);
    this.progress?.setFlag('planeCellTaken');
    this.progress?.setFlag('planeLooted');
    this.sfx?.play('pickup');
    this.timer = 0;
    this.combat.hud.pickup(`The pilot's pistol, ${e.alienShells} alien shells (hold B to choose them), an alien med kit${kept ? '' : ' (sent home: your healing is full)'}, and a small alien power cell (fit it at the fence box at home)`);
  }

  readLog() {
    this.progress?.setFlag('planeLogRead');
    this.lore?.give('pilotLog');
    const read = () => this.paper?.open('pilotLog', { device: this.device, take: true });
    if (!this.card?.show('pilotLog', { read, keep: () => {} }, this.device)) read();
  }

  // 4: the signal flare, and what answers it.
  fireFlare() {
    this.mothmanOn = true;
    this.state = 'mothman';
    this.timer = 0;
    this.bus.emit('plane:flare');
    this.sfx?.play('flareGun');
    const start = () => this.startMothman();
    if (!this.cutscenes?.play('plane.flare', { onDone: start })) start();
  }

  startMothman() {
    const fl = this.flyer;
    this.combat.setHealthFloor('crashedPlane', this.ec.floor, () => this.blackout());
    this.offLeft = this.bus.on('flyer:left', ({ hurt }) => this.mothmanGone(hurt));
    fl.send({ script: this.ec.mothmanScript, story: true });
    this.dialogue?.play('plane.mothman.ellen');
  }

  // Hurt enough, it flew off. Session 26 (HANDOVER default 1: Junie is taken
  // either way): its last low pass on the way out smashes Tom's radio mid-line,
  // and the night passes with nobody able to reach him.
  mothmanGone(drivenOff) {
    this.offLeft?.();
    this.offLeft = null;
    if (this.state !== 'mothman') return;
    this.combat.clearHealthFloor('crashedPlane');
    this.state = 'smashed';
    this.drivenOff = drivenOff;
    this.progress?.setFlag('radioSmashed');
    const night = () => this.nightPasses();
    if (!this.cutscenes?.play('plane.radioSmashed', { onDone: night })) night();
  }

  // Dazed, the radio in pieces: he sits the dark out in the wreck. Dawn.
  nightPasses() {
    this.skipToDawn?.();
    this.finish(this.drivenOff);
    this.notify?.("Dawn. You sat the night out in the wreck. The radio's in pieces. Home's north");
  }

  // The floor held: he blacks out; red eyes over him; he wakes at the wreck at dawn.
  blackout() {
    if (this.state !== 'mothman') return;
    this.state = 'blackout';
    this.offLeft?.();
    this.offLeft = null;
    this.combat.clearHealthFloor('crashedPlane');
    this.flyer.stop();
    const p = { x: this.player.position.x, z: this.player.position.z };
    const yaw = this.player.yaw;
    // Its frame's ahead (+z) is the way Tom faces; the eyes hang over him there.
    this.cutscenes?.namedAnchors?.set('downed', () => ({ x: p.x, z: p.z, yaw: yaw + Math.PI }));
    this.cutscenes?.namedAnchors?.set('downedEyes', () => ({ x: p.x - Math.sin(yaw) * 1.2, z: p.z - Math.cos(yaw) * 1.2, yaw: 0, dy: 1.9 }));
    const wake = () => this.wake();
    if (!this.cutscenes?.play('plane.blackout', { onDone: wake })) wake();
  }

  wake() {
    const k = this.spot('kit');
    this.skipToDawn?.();
    this.player.teleport(k.x + 1.2, k.z + 1.2);
    this.combat.health.value = Math.max(1, Math.round(this.combat.health.cfg.max * this.ec.floor));
    this.finish(false);
    this.notify?.("Dawn. Your radio's quiet");
  }

  finish(drivenOff) {
    this.state = 'done';
    this.mothmanOn = false;
    this.progress?.setFlag('mothmanMet');
    this.progress?.setFlag('planeDone');
    this.bus.emit('plane:mothmanGone', { drivenOff });
    this.bus.emit('plane:done');
  }

  // ---- debug ----------------------------------------------------------------------------------

  addDebugItems(menu) {
    const cat = menu.tab(DEBUG.enemies, ENEMY_TABS.aliens); // Session 25: the Enemies menu (the grey's at the plane)
    cat.addItem(() => `Crashed plane: take me there (${this.state})`, () => {
      if (!this.ready) return;
      const w = this.spot('work');
      const b = this.spot('bench');
      const dx = w.x - b.x;
      const dz = w.z - b.z;
      const l = Math.hypot(dx, dz) || 1;
      this.player.teleport(w.x + (dx / l) * (this.ec.triggerDistance + 6), w.z + (dz / l) * (this.ec.triggerDistance + 6));
    });
    cat.addItem('Crashed plane: start it again (flags cleared)', () => {
      for (const f of FLAGS) this.progress?.setFlag(f, false);
      this.flyer?.active && this.flyer.stop();
      this.reset();
    });
  }

  overlayLine() {
    if (!this.ready) return 'plane -';
    return `plane ${this.state}${this.state === 'shootout' ? ` ${this.phase}` : ''} grey ${Math.max(0, Math.round(this.greyHealth))}`;
  }

  dispose() {
    this.renderer?.pool?.forEach((o) => o.mesh.removeFromParent());
  }
}
