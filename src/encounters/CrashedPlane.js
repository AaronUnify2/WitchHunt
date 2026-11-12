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

import * as THREE from 'three';
import { AlienRenderer } from '../render/AlienRenderer.js';
import { toWorld } from '../world/CrashSite.js';
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

// Session 32: what the grey is doing `t` seconds into the standoff (config standoff): 'work' | 'turn' | 'hop'
// (k: 0..1 through it) | 'stare' | 'aim'; and how many of its wild shots are due by then.
export function standoffAt(t, s) {
  const shots = s.shots.filter((at) => t >= at).length;
  if (t < s.turnAt) return { phase: 'work', shots };
  if (t < s.hopAt) return { phase: 'turn', shots };
  if (t < s.hopAt + s.hopSeconds) return { phase: 'hop', k: (t - s.hopAt) / s.hopSeconds, shots };
  if (t < s.aimAt) return { phase: 'stare', shots };
  return { phase: 'aim', shots };
}

// Session 33 (Aaron: "make it very clear that something's been dropped"): the thing the grey dropped, `t`
// seconds after it went down. It leaves the grey's hand (hand: metres up), arcs out to where it rests (k: 0..1
// along the way, lift: metres above its resting height), lands at d.fallSeconds, and from then on glints:
// glint 0..1, a quick flash every d.glintEvery seconds, the first as it lands. d: config ...encounter.drop.
export function dropAt(t, d) {
  const k = Math.max(0, Math.min(1, t / d.fallSeconds));
  const lift = (1 - k) * d.hand + Math.sin(k * Math.PI) * d.hop;
  const since = t - d.fallSeconds;
  const glint = since < 0 ? 0 : Math.exp(-(since % d.glintEvery) * 7);
  return { k, lift, landed: since >= 0, glint };
}

// A hop from a to b (the scramble over the wing): t 0..1 -> { x, z, lift }.
export function hop(a, b, t, height) {
  const k = Math.max(0, Math.min(1, t));
  return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k, lift: Math.sin(k * Math.PI) * height };
}

const FLAGS = ['planeSeen', 'planeStandoff', 'planeGreyDown', 'planeLooted', 'planeLogRead', 'planeCellTaken', 'planeCellFitted', 'mothmanMet', 'planeDone'];

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
    // Session 32: the standoff's view follows it over the wing; the sweep's frame: ahead is up the gouge to the
    // wreck (the model's +z), x to the right of that (the model's -x).
    this.cutscenes?.liveTargets?.set('grey', () => ({ x: this.grey.x, y: this.grey.y + 1.0, z: this.grey.z }));
    this.cutscenes?.namedAnchors?.set('crashSite', () => ({ x: this.crashSite.place.x, z: this.crashSite.place.z, yaw: this.crashSite.place.yaw + Math.PI }));
    this.buildDrop();
    this.bus.on('player:respawned', () => this.reset());
    this.reset();
  }

  // Session 33: what the grey dropped, lying by the body until it's searched: the small alien power cell. No
  // light: an unlit crystal, and the same colour again as a wide, faint shell round it (the glow), so it
  // shows by night and reads from across the clearing by day, with a thin wisp of light standing up off it.
  buildDrop() {
    if (!this.scene) return;
    const d = this.ec.drop;
    const core = new THREE.OctahedronGeometry(d.size, 0);
    core.scale(1, 1.6, 1);
    this.dropCore = new THREE.Mesh(core, new THREE.MeshBasicMaterial({ color: d.color }));
    this.dropHalo = new THREE.Mesh(new THREE.SphereGeometry(d.size * d.haloScale, 12, 8), new THREE.MeshBasicMaterial({ color: d.color, transparent: true, opacity: d.haloOpacity, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.dropHalo.material.fog = false; // it shows through the ground mist
    // A thin wisp of the same light standing up off it (an open cone, widest at the cell, fading to its tip):
    // what's seen first from the clearing's edge, over the wing and the leaves.
    const wisp = new THREE.ConeGeometry(d.size * d.wispWidth, d.wispHeight, 10, 1, true);
    wisp.translate(0, d.wispHeight / 2, 0);
    this.dropWisp = new THREE.Mesh(wisp, new THREE.MeshBasicMaterial({ color: d.color, transparent: true, opacity: d.wispOpacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    this.drop = new THREE.Group();
    this.drop.name = 'planeDrop';
    this.drop.add(this.dropCore, this.dropHalo, this.dropWisp);
    this.drop.visible = false;
    this.scene.add(this.drop);
    this.dropT = 99;
    this.dropSpot = { x: 0, y: 0, z: 0 };
  }

  // Where it rests: `out` metres in front of the body's feet (the way it was facing: at Tom, when it fell).
  dropRest() {
    const g = this.grey;
    const out = this.ec.drop.out;
    const x = g.x + Math.sin(g.facing) * out;
    const z = g.z + Math.cos(g.facing) * out;
    return { x, y: this.ground.heightAt(x, z), z };
  }

  get dropShown() {
    return this.has('planeGreyDown') && !this.has('planeLooted');
  }

  updateDrop(dt, shown) {
    if (!this.drop) return;
    const show = shown && this.dropShown;
    this.drop.visible = show;
    if (!show) return;
    const d = this.ec.drop;
    const was = this.dropT;
    this.dropT += dt;
    const a = dropAt(this.dropT, d);
    const rest = this.dropRest();
    const g = this.grey;
    this.dropSpot.x = g.x + (rest.x - g.x) * a.k;
    this.dropSpot.z = g.z + (rest.z - g.z) * a.k;
    this.dropSpot.y = rest.y + d.restY + a.lift;
    this.drop.position.set(this.dropSpot.x, this.dropSpot.y, this.dropSpot.z);
    this.dropCore.rotation.y += dt * 1.3;
    this.dropCore.rotation.z = a.landed ? 0.5 : this.dropT * 9; // tumbling as it falls; lying tilted after
    const pulse = 1 + 0.12 * Math.sin(this.dropT * 2.6);
    this.dropHalo.scale.setScalar(pulse * (1 + a.glint * 0.9));
    this.dropHalo.material.opacity = d.haloOpacity * (1 + a.glint * 2.5);
    this.dropWisp.visible = a.landed; // it stands up once the thing's come to rest
    this.dropWisp.material.opacity = d.wispOpacity * (0.75 + 0.25 * pulse + a.glint * 1.5);
    this.dropWisp.scale.set(1, Math.min(1, (this.dropT - d.fallSeconds) / 0.6), 1);
    if (was < d.fallSeconds && a.landed) this.sfx?.play('cellDrop', this.dropSpot);
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
    this.later = [];
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
    this.dropT = 99; // (a load, a respawn: what it dropped is lying there already)
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
      this.tickLater(dt);
      switch (this.state) {
        case 'idle':
          // Session 32: the first sight of it, from the clearing's edge (once); then, close, the standoff.
          if (this.has(this.ec.needs) && !this.has('planeSeen') && near < this.ec.sweepDistance && near > this.ec.triggerDistance + 4 && !this.cutscenes?.active) this.arrive();
          else if (this.has(this.ec.needs) && near < this.ec.triggerDistance && !this.cutscenes?.active) this.startStandoff();
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
    this.updateDrop(dt, shown);
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

  // 0 (Session 32; Aaron: "a sweep just showing the crashed plane from a higher vantage point... a little hint
  // at the alien being there... have them reference the alien from the radio"): over the gouge to the wreck,
  // then low toward the wing and the small grey thing bent over it. Wyatt, then Ellen, once it's over.
  arrive() {
    this.progress?.setFlag('planeSeen');
    this.bus.emit('plane:seen');
    const [a, b] = this.ec.sweepLines;
    const lines = () => {
      this.later.push({ t: a, fn: () => this.dialogue?.play('plane.sweep.wyatt') });
      this.later.push({ t: b, fn: () => this.dialogue?.play('plane.sweep.ellen') });
    };
    if (!this.cutscenes?.play('sweep.crashedPlane', { onDone: lines })) lines();
  }

  tickLater(dt) {
    if (!this.later.length) return;
    for (const l of this.later) l.t -= dt;
    const due = this.later.filter((l) => l.t <= 0);
    this.later = this.later.filter((l) => l.t > 0);
    for (const l of due) l.fn();
  }

  // 1: the standoff.
  startStandoff() {
    this.state = 'standoff';
    this.timer = 0;
    this.shotsFired = 0;
    this.progress?.setFlag('planeSeen'); // (come at it from close: no sweep after this)
    const g = this.grey;
    const o = this.ec.standoff.out;
    const out = toWorld(this.crashSite.place, o[0], o[1]);
    this.hopFrom = { x: g.x, z: g.z };
    this.hopTo = { x: out.x, z: out.z };
    this.progress?.setFlag('planeStandoff');
    this.bus.emit('plane:standoff');
    this.cutscenes?.play('plane.standoff');
  }

  updateStandoff() {
    const s = this.ec.standoff;
    const g = this.grey;
    // Absorbed in its work; it looks up; it vaults the wing into the open and stands there, looking at him;
    // it lifts the pistol; it fires, twice, wide. Then it's Tom's move.
    const at = standoffAt(this.timer, s);
    // The view closes in on it over the first second, and opens again as control comes back.
    this.player.fovMultiplier = 1 + (s.zoom - 1) * Math.min(1, this.timer / 1.0) * Math.min(1, Math.max(0, (s.end - this.timer) / 0.35));
    const turn = () => {
      const p = this.player.position;
      const want = Math.atan2(p.x - g.x, p.z - g.z);
      let d = want - g.facing;
      d -= Math.round(d / (Math.PI * 2)) * Math.PI * 2;
      g.facing += d * Math.min(1, 0.12);
    };
    if (at.phase === 'work') g.state = 'examine';
    else if (at.phase === 'turn') {
      g.state = 'idle';
      turn();
    } else if (at.phase === 'hop') {
      const h = hop(this.hopFrom, this.hopTo, at.k, s.hopHeight);
      g.x = h.x;
      g.z = h.z;
      g.y = this.ground.heightAt(g.x, g.z) + h.lift;
      g.state = 'ambush';
      turn();
    } else {
      if (this.hopTo && (g.x !== this.hopTo.x || g.z !== this.hopTo.z)) {
        g.x = this.hopTo.x;
        g.z = this.hopTo.z;
      }
      g.y = this.ground.heightAt(g.x, g.z);
      turn();
      // A shot holds its pose a moment; between them it's aiming.
      if (at.phase === 'stare') g.state = 'idle';
      else if (g.state !== 'fire' || g.timer > 0.3) g.state = 'aim';
      while (this.shotsFired < at.shots) {
        this.shotsFired++;
        this.greyFire(false);
        this.player.shake?.(0.5);
      }
    }
    if (!this.cutscenes?.active && this.timer > 0.2) {
      // Control's back: the quick draw.
      this.player.fovMultiplier = 1;
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
    this.faceTom(); // Session 33: it goes down facing him, and what it drops lands on his side of it
    g.state = 'dying';
    g.timer = 0;
    this.dropT = 0;
    this.target.targetable = false;
    this.state = 'down';
    this.timer = 0;
    this.progress?.setFlag('planeGreyDown');
    this.bus.emit('plane:greyDown', { quick });
    this.sfx?.play('mothDie', g);
    // Session 33 (Aaron): said the moment it goes down, so he searches it the first time.
    this.notify?.(quick ? 'Quick draw: it never got its shot off. Something fell from its hand, glowing' : 'The grey is down. Something fell from its hand, glowing');
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
      if (!this.has('planeLooted') && Math.min(dist(g), dist(this.dropSpot ?? g)) < r + 0.4) return { key: 'loot', prompt: `Hold ${X}: search the creature (it dropped something)`, busy: 'Searching…', seconds: 1.4, act: () => this.loot() };
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
    // Session 32 (Aaron): the power cell is a quiet drop: named, not pointed at. (Session 33: what it's for
    // comes from Ellen once Junie's home: encounters/Stairs.js askForCell.)
    this.combat.hud.pickup(`The pilot's pistol, ${e.alienShells} alien shells (hold B to choose them), an alien med kit${kept ? '' : ' (sent home: your healing is full)'}, and a small alien power cell`);
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
    this.offLeft = this.bus.on('flyer:left', () => this.mothmanGone());
    // Session 32 (Aaron: "he has to knock you unconscious"): he can't be driven off.
    fl.send({ script: this.ec.mothmanScript, story: true, unbeatable: true });
    this.dialogue?.play('plane.mothman.ellen');
  }

  // Session 32: it can't be driven off any more (Session 26's smashed radio and the night sat out in the wreck
  // are gone). If it ever leaves by itself (its script run out), it's the same ending: he goes down.
  mothmanGone() {
    if (this.state !== 'mothman') return;
    this.blackout();
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
    if (this.drop) {
      this.drop.removeFromParent();
      for (const m of [this.dropCore, this.dropHalo, this.dropWisp]) {
        m.geometry.dispose();
        m.material.dispose();
      }
    }
    this.renderer?.pool?.forEach((o) => o.mesh.removeFromParent());
  }
}
