// The dozer (experimental: the debug menu's "Experimental vehicles"):
// Earl's old forestry crawler dozer (render/dozerModel.js). Slow and
// unstoppable, and it changes the woods for the rest of the run
// (world/LandClearing.js). On the quad's rules (world/Quad.js: held X on
// and off, the work lights and their glare, the engine's noise drawing
// the dead, the witch's snare round a track, the witch faster while Tom's on it).
//
//  - Tank steering: the left stick drives and turns; with no gas it pivots
//    on the spot (the tracks running opposite ways). The brush hardly slows it.
//  - The blade: carried a hand's width up; RT / left mouse holds it down
//    (it digs: bare earth behind it, a trail that stays and shows on the
//    map, slower going); LT / right mouse holds it right up.
//  - Trees: the blade pushes them over (or the body, the small ones); the
//    tall and the thick hold it a moment, straining, before they go. A log
//    and a stump are left.
//  - The dead: before the blade they're shoved along in a pile (hurt; pinned
//    against something solid they're crushed); with the blade up they slip
//    under it, into the tracks (crushed). It's an open cab: stopped or slow,
//    they climb on beside the seat and reach Tom; going on fast or pivoting
//    hard throws them off.
//  - Cars: the blade shoves abandoned cars (and wrecks) along; the winch
//    (B / R at what you're looking at: a car or one of the dead) hooks one,
//    driving away drags it, holding Y / F reels it in; B / R again lets go.
//  - A / Space: the horn. D-pad right / H: the work lights. Black smoke
//    when it works hard. The loudest thing in the woods.
// Not saved itself (the trees and trails it leaves are: LandClearing).
//
// Events: 'dozer:mounted', 'dozer:dismounted', 'tree:felled' (LandClearing).

import * as THREE from 'three';
import { Quad } from './Quad.js';
import { resolveCircles } from './collision.js';
import { HoldAction } from '../player/HoldAction.js';
import { buildDozer, DOZER } from '../render/dozerModel.js';
import { rayEnemies } from '../combat/hitscan.js';
import { wrapAngle } from './Ute.js';
import { DEBUG } from '../debug/DebugMenu.js';
import { partMods, toggledParts } from './dozerParts.js';
import { buildPart } from '../render/dozerParts.js';

const ZERO = { x: 0, y: 0 };

// The two tracks' speeds (left, right) for a speed v and a turn rate (+ left), half the track apart.
export function trackSpeeds(v, turn, half) {
  return { left: v - turn * half, right: v + turn * half };
}

export class Dozer extends Quad {
  constructor(cfg, bus) {
    super(cfg, bus);
    this.qc = cfg.dozer;
  }

  // ctx: { scene, ground, colliders, player, combat, witch, vhud, notify, clearing (LandClearing), vehicles }.
  init(ctx) {
    Object.assign(this, ctx);
    this.enemies = ctx.combat.enemies;
    this.hold = new HoldAction(this.cfg.station.hold.releaseDrain);
    this.hold.init();
    this.hud = { prompt: '', progress: 0 };
    this.nearby = [];
    this.trees = [];
    this.daylight = 1;
    this.device = 'gamepad';
    this.lampOn = false;
    this.lampTouched = false;
    this.wheelSnare = null;
    this.mash = 0;
    this.colliderList = [];
    this.model = buildDozer(this.qc);
    this.mesh = this.model.root;
    this.scene.add(this.mesh);
    this.lamp = null;
    this.climbing = new Map(); // zombie -> seconds held on
    this.climbers = new Set();
    this.strain = new Map(); // tree index -> seconds pushed
    this.initCable();
    this.initSmoke();
    // Session 22 (M10.3 spike): parts bolted on (world/dozerParts.js, render/dozerParts.js).
    this.parts = [];
    this.partLooks = new Map();
    this.mods = partMods(this.qc.crush, this.cfg.spikes.dozerParts, this.parts);
    this.reset();
    this.unsubscribers = [
      this.bus.on('player:respawned', () => this.reset()),
      this.bus.on('player:hurt', () => this.hold.interrupt()),
    ];
  }

  reset() {
    if (this.wheelSnare) this.freeWheel(false);
    if (this.riding) this.leave();
    this.riding = false;
    this.stored = true;
    this.mesh.visible = false;
    this.unpark();
    this.setLamp(false);
    this.x = 0;
    this.z = 0;
    this.y = 0;
    this.heading = 0;
    this.clearMotion();
    this.combat?.sfx?.engine?.(false);
  }

  clearMotion() {
    this.speed = 0;
    this.turn = 0;
    this.blade = 0;
    this.bladeTarget = 0;
    this.travelL = 0;
    this.travelR = 0;
    this.clank = 0;
    this.pile = 0;
    this.pushing = null;
    this.straining = 0;
    this.lurch = 0;
    this.lookYaw = 0;
    this.lookIdle = 0;
    this.noiseTimer = 0;
    this.hours = this.qc.look.hoursStart;
    this.temp = 0.3;
    this.hornTimer = 0;
    this.hydraulic = 0;
    this.crunchTimer = 0;
    this.scrapeTimer = 0;
    this.creakTimer = 0;
    this.winch = null;
    this.climbing?.clear();
    this.releaseClimbers?.();
  }

  ensureLights() {
    if (this.lamp) return;
    this.buildHeadlamp();
    this.setLamp(this.lampOn);
  }

  place(x, z, heading) {
    this.ensureLights();
    this.stored = false;
    this.mesh.visible = true;
    this.x = x;
    this.z = z;
    this.heading = heading;
    this.y = this.ground.heightAt(x, z);
    this.park();
    this.pose();
  }

  park() {
    this.unpark();
    if (this.stored) return;
    const fx = -Math.sin(this.heading);
    const fz = -Math.cos(this.heading);
    for (const o of this.qc.circles) {
      const c = { x: this.x - fx * o, z: this.z - fz * o, r: this.qc.radius, top: this.y + 2.8, dozer: true };
      this.colliders.insert(c);
      this.colliderList.push(c);
    }
  }

  unpark() {
    const grid = this.colliders;
    for (const c of this.colliderList) {
      c.off = true;
      const cell = grid.cells?.get(grid.key(Math.floor(c.x / grid.cellSize), Math.floor(c.z / grid.cellSize)));
      const i = cell ? cell.indexOf(c) : -1;
      if (i >= 0) cell.splice(i, 1);
    }
    this.colliderList.length = 0;
  }

  setLamp(on) {
    this.lampOn = Boolean(on);
    if (this.lamp) this.lamp.intensity = this.lampOn ? this.qc.headlamp.intensity * (this.glare ?? 1) : 0;
    this.model?.lamps.work.emissive.setHex(this.lampOn ? 0xfff0d0 : 0x000000).multiplyScalar(this.lampOn ? 3 : 0);
  }

  // ---- its frame --------------------------------------------------------------------------------

  toLocal(x, z) {
    const dx = x - this.x;
    const dz = z - this.z;
    const rx = Math.cos(this.heading);
    const rz = -Math.sin(this.heading);
    const fx = -Math.sin(this.heading);
    const fz = -Math.cos(this.heading);
    return { lx: dx * rx + dz * rz, lz: -(dx * fx + dz * fz) };
  }

  toWorld(lx, lz, out = {}) {
    const rx = Math.cos(this.heading);
    const rz = -Math.sin(this.heading);
    const fx = -Math.sin(this.heading);
    const fz = -Math.cos(this.heading);
    out.x = this.x + rx * lx - fx * lz;
    out.z = this.z + rz * lx - fz * lz;
    return out;
  }

  boxDistance(x, z) {
    const { lx, lz } = this.toLocal(x, z);
    const ex = Math.max(0, Math.abs(lx) - 1.3);
    const ez = Math.max(0, lz < 0 ? -lz - 2.9 : lz - 2.0);
    return Math.hypot(ex, ez);
  }

  // ---- each frame -------------------------------------------------------------------------------

  update(dt, input, playing, canInteract, daylight = 1) {
    this.spinParts(dt);
    this.daylight = daylight;
    this.device = input.activeDevice;
    if (this.stored) {
      this.hud.prompt = '';
      this.hud.progress = 0;
      return;
    }
    this.clearing?.update(dt);
    if (!playing) {
      this.hud.prompt = '';
      if (!this.riding) this.combat.sfx?.engine?.(false);
      this.vhud?.hide(this);
      return;
    }
    const pad = input.activeDevice === 'gamepad';
    const X = pad ? 'X' : 'E';
    let offer = null;
    let freeing = false;
    if (this.riding) {
      this.updateLamp(input);
      if (this.lampOn) this.updateLampGlare(dt);
      if (input.wasPressed('jump')) this.honk();
      if (Math.abs(this.speed) < this.qc.dismountSpeed && Math.abs(this.turn) < 0.3) {
        offer = { key: 'dozer-off', prompt: this.wheelSnare ? `Snare round a track! Hold ${X}: get off` : `Hold ${X}: get off the dozer`, seconds: this.qc.dismountSeconds, act: () => this.dismount() };
      }
      this.updateBladeInput(dt, input);
      this.updateWinch(dt, input);
      this.updateClimbers(dt);
    } else if (canInteract && !this.player.platform && !this.player.riding) {
      const p = this.player.position;
      const d = this.boxDistance(p.x, p.z);
      if (this.wheelSnare) freeing = d < this.qc.snare.range - 1;
      else if (d < this.qc.mountRange - 1.2) offer = { key: 'dozer-on', prompt: `Hold ${X}: climb up on the dozer`, seconds: this.qc.mountSeconds, act: () => this.mount() };
    }
    if (this.wheelSnare && !this.riding) {
      if (freeing && input.wasPressed('interact')) this.mash += 1 / this.qc.snare.presses;
      this.mash = Math.max(0, this.mash - this.qc.snare.decay * dt);
      if (this.mash >= 1) this.freeWheel(true);
    }
    const done = this.hold.update(dt, offer?.key ?? null, input.isDown('interact'), offer?.seconds ?? 1);
    if (done && offer) offer.act();
    if (freeing && this.wheelSnare) {
      this.hud.prompt = `Tap ${X} to free the track from the snare`;
      this.hud.progress = this.mash;
    } else {
      this.hud.prompt = offer ? offer.prompt : '';
      this.hud.progress = this.hold.key !== null ? this.hold.progress : 0;
    }
    if (this.riding) this.updateNoise(dt);
    else this.idle(dt);
    this.updateCable();
    this.updateSmoke(dt);
    this.updateHud(input);
  }

  idle(dt) {
    this.speed = 0;
    this.turn = 0;
    this.blade += (0 - this.blade) * Math.min(1, dt * 2);
    this.pose();
  }

  mount() {
    if (this.riding || this.stored || this.player.riding) return;
    this.riding = true;
    this.unpark();
    const p = this.player;
    p.riding = this;
    p.crouched = false;
    p.sprinting = false;
    p.yaw = this.heading;
    p.pitch = this.qc.restPitch;
    this.lookYaw = 0;
    this.lookIdle = 0;
    this.model.cab.visible = true;
    this.combat.sfx?.play('climb');
    this.combat.sfx?.play('dozerStart', this);
    this.combat.sfx?.engine?.(true, 0, 0, 'dozer');
    this.puff(10);
    this.lampTouched = false;
    this.setLamp(this.daylight < this.qc.headlamp.autoBelow);
    const pad = this.device !== 'keyboardMouse';
    this.combat.hud?.pickup?.(
      pad
        ? 'The dozer: left stick to drive (no gas: it pivots), RT blade down (dig), LT blade up, B winch at what you look at, hold Y reel in, A horn, hold X (stopped) to get off.'
        : 'The dozer: WASD to drive, left mouse blade down (dig), right mouse blade up, R winch, hold F reel in, Space horn, hold E (stopped) to get off.',
    );
    this.bus.emit('dozer:mounted');
  }

  dismount() {
    if (!this.riding) return;
    let spot = null;
    for (const [lx, lz] of [[-this.qc.stepOff, 0.6], [this.qc.stepOff, 0.6], [0, 3.2]]) {
      const c = this.toWorld(lx, lz);
      const before = { ...c };
      resolveCircles(c, this.cfg.player.radius, this.colliders.query(c.x, c.z, this.cfg.player.radius, this.nearby), true);
      if (Math.hypot(c.x - before.x, c.z - before.z) < 0.05) {
        spot = c;
        break;
      }
      spot ??= c;
    }
    this.leave();
    this.player.teleport(spot.x, spot.z, this.heading);
    this.combat.sfx?.play('climb');
    this.bus.emit('dozer:dismounted');
  }

  leave() {
    this.riding = false;
    if (this.player?.riding === this) this.player.riding = null;
    if (this.player) this.player.fovMultiplier = 1;
    this.speed = 0;
    this.turn = 0;
    this.model.cab.visible = false;
    this.releaseClimbers();
    this.park();
    this.setLamp(false);
    this.combat?.sfx?.engine?.(false);
    this.vhud?.hide(this);
  }

  eject() {
    if (!this.riding) return;
    this.leave();
  }

  strikeScale() {
    return this.qc.strikeScale;
  }

  honk() {
    this.combat.sfx?.play('dozerHorn', this);
    this.enemies.alert(this.x, this.z, this.qc.horn.alert);
  }

  // RT: the blade down (it digs); LT: right up; neither: carried.
  updateBladeInput(dt, input) {
    const target = input.isDown('attack') ? -1 : input.isDown('aim') ? 1 : 0;
    if (target !== this.bladeTarget) {
      this.bladeTarget = target;
      this.combat.sfx?.play('hydraulic', this);
      this.hydraulic = 0.5;
    }
    const step = this.qc.bladeSpeed * dt;
    this.blade += Math.max(-step, Math.min(step, this.bladeTarget - this.blade));
    this.hydraulic = Math.max(0, this.hydraulic - dt);
  }

  // ---- driving ------------------------------------------------------------------------------------

  drive(dt, input, player) {
    const q = this.qc;
    if (!(dt > 0)) {
      this.carry(player);
      return;
    }
    const prevHeading = this.heading;
    const look = input.getLook();
    if (Math.abs(look.x) + Math.abs(look.y) > 0.0005) this.lookIdle = 0;
    else this.lookIdle += dt;
    this.lookYaw = clamp(wrapAngle(player.yaw - prevHeading), -q.view.yawLimit, q.view.yawLimit);
    player.pitch = clamp(player.pitch, q.view.pitchMin, q.view.pitchMax);
    if (this.lookIdle > q.view.recentre && Math.abs(this.speed) > 1.5) {
      const k = 1 - Math.exp(-q.view.recentreRate * dt);
      this.lookYaw -= this.lookYaw * k;
      player.pitch += (q.restPitch - player.pitch) * k;
    }
    const stuck = player.rooted || this.wheelSnare;
    const move = stuck ? ZERO : input.getMove();
    this.step(dt, move.y, move.x);
    player.yaw = this.heading + this.lookYaw;
    this.pose();
    this.carry(player);
    const work = Math.min(1, this.straining * 1.5 + (this.pushing ? 0.6 : 0) + this.pile * 0.12 + (this.blade < -0.5 && Math.abs(this.speed) > 0.3 ? 0.35 : 0));
    this.combat.sfx?.engine?.(true, Math.min(1, Math.abs(this.speed) / q.maxSpeed + Math.abs(this.turn) * 0.3), Math.min(1, Math.abs(move.y) + Math.abs(move.x) * 0.5), 'dozer', work);
    if (work > 0.4 && Math.random() < dt * 6) this.puff(1);
  }

  step(dt, throttle, steer) {
    const q = this.qc;
    // How hard it's working: the blade dug in, a car before it, the dead piled up.
    const brush = this.ground.undergrowthAt(this.x, this.z);
    let load = 1 + (q.undergrowthMultiplier - 1) * brush;
    if (this.blade < -0.5) load *= q.bladeLoad;
    if (this.pushing) load *= q.pushLoad;
    if (this.winch?.taut) load *= 0.7;
    load *= Math.max(0.35, 1 - this.pile * q.pileLoad);
    const top = (throttle >= 0 ? q.maxSpeed : q.reverseSpeed) * load;
    const target = throttle * top;
    const rate = Math.sign(target) !== Math.sign(this.speed) && Math.abs(this.speed) > 0.05 ? q.brake : q.acceleration;
    this.speed += clamp(target - this.speed, -rate * dt, rate * dt);
    // Turning: on the spot with no gas; reversing, it steers like a car would.
    const sign = this.speed < -0.3 ? -1 : 1;
    const turnTarget = -steer * q.turnRate * (1 - 0.3 * Math.min(1, Math.abs(this.speed) / q.maxSpeed)) * sign;
    this.turn += clamp(turnTarget - this.turn, -q.turnAccel * dt, q.turnAccel * dt);
    // Trees before the blade hold it while they strain.
    if (this.straining > 0) this.speed = Math.min(this.speed, 0.12);
    this.heading += this.turn * dt;
    const t = trackSpeeds(this.speed, this.turn, q.halfTrack);
    this.travelL += t.left * dt;
    this.travelR += t.right * dt;
    const fx = -Math.sin(this.heading);
    const fz = -Math.cos(this.heading);
    const dx = fx * this.speed * dt;
    const dz = fz * this.speed * dt;
    const want = { x: this.x + dx, z: this.z + dz };
    // What the blade and the body meet: trees (pushed over, or holding), cars (shoved), then everything else solid.
    this.fellTrees(dt, want);
    const pushed = this.pushCars(dt, want, this.speed * dt);
    const pos = { x: want.x, z: want.z };
    this.resolve(pos, pushed);
    this.ground.clamp(pos);
    const blocked = Math.hypot(pos.x - want.x, pos.z - want.z);
    if (blocked > Math.abs(this.speed) * dt * 0.6 && Math.abs(this.speed) > q.bumpSpeed) {
      this.player.shake(q.bumpShake * 0.6);
      this.combat.sfx?.play('carCrash', pos);
      this.speed *= 0.2;
    }
    this.x = pos.x;
    this.z = pos.z;
    // The ground under it: the tracks crush the undergrowth; the blade, down, cuts bare earth.
    this.workGround();
    this.crushDead(dt);
    // The tracks' clank, the hours, the coolant.
    const tracks = Math.max(Math.abs(t.left), Math.abs(t.right));
    this.clank += tracks * dt;
    if (this.clank > DOZER.track.pitch * 3) {
      this.clank = 0;
      this.combat.sfx?.play('trackClank', this);
    }
    this.hours += dt / 360; // game-ish: an hour meter that visibly ticks
    this.temp = Math.min(0.62, this.temp + dt * 0.002 * (0.4 + load * 0.6 + this.straining));
    this.lurch = Math.max(0, this.lurch - dt * 3);
  }

  // Trees: what the blade (or the front of the body) meets goes over, the
  // big ones after a strain; small ones at the sides are knocked aside;
  // big ones at the sides and the back are solid.
  fellTrees(dt, want) {
    const q = this.qc;
    const c = this.clearing;
    this.straining = 0;
    if (!c) return;
    const moving = Math.abs(this.speed) > q.fell.minSpeed || Math.abs(this.turn) > 0.25 || this.strain.size > 0;
    if (!moving) {
      this.strain.clear();
      return;
    }
    const fx = -Math.sin(this.heading);
    const fz = -Math.cos(this.heading);
    const rx = Math.cos(this.heading);
    const rz = -Math.sin(this.heading);
    const forward = this.speed > 0.05;
    const seen = new Set();
    for (const { tree, index } of c.treesNear(want.x, want.z, 4.2, this.trees)) {
      const dx = tree.x - want.x;
      const dz = tree.z - want.z;
      const lx = dx * rx + dz * rz;
      const lz = -(dx * fx + dz * fz);
      const r = this.cfg.forest.trunkRadius;
      const inBlade = forward && Math.abs(lx) < q.bladeHalf + r && lz < q.bladeFront + 0.7 && lz > q.bladeFront - 0.45;
      const onBody = Math.abs(lx) < 1.32 + r && lz > -2.4 && lz < 2.05;
      if (!inBlade && !onBody) continue;
      const strain = c.strainOf(tree) * this.mods.strainScale; // Session 22: the head saw
      // Which way it goes: ahead (the blade), out to the side (the flanks), back (reversing).
      let ox = fx;
      let oz = fz;
      if (!inBlade) {
        if (this.speed < -0.05 && lz > 1.2) {
          ox = -fx;
          oz = -fz;
        } else {
          const side = Math.sign(lx) || 1;
          ox = rx * side + fx * 0.3;
          oz = rz * side + fz * 0.3;
        }
      } else {
        ox = fx + rx * lx * 0.25;
        oz = fz + rz * lx * 0.25;
      }
      if (strain <= 0 && (inBlade || q.fell.sideFell)) {
        this.fell(index, ox, oz);
        continue;
      }
      if (!inBlade) continue; // big ones at the flanks are just solid
      seen.add(index);
      const held = (this.strain.get(index) ?? 0) + dt;
      this.strain.set(index, held);
      this.straining = Math.max(this.straining, Math.min(1, held / strain));
      this.player.shake(0.12);
      this.creakTimer -= dt;
      if (this.creakTimer <= 0) {
        this.creakTimer = 0.45;
        this.combat.sfx?.play('treeCreak', tree);
      }
      if (held >= strain) {
        this.fell(index, ox, oz);
        seen.delete(index);
      }
    }
    for (const k of [...this.strain.keys()]) if (!seen.has(k)) this.strain.delete(k);
  }

  fell(index, dx, dz) {
    this.clearing.fell(index, dx, dz);
    this.strain.delete(index);
    this.lurch = 1;
    this.player.shake(0.5);
    this.puff(3);
  }

  // The body's circles and the blade's out of whatever's solid (not the
  // trees being felled, not the car being shoved).
  resolve(pos, pushed) {
    const q = this.qc;
    const fx = -Math.sin(this.heading);
    const fz = -Math.cos(this.heading);
    const rx = Math.cos(this.heading);
    const rz = -Math.sin(this.heading);
    const shapes = q.circles.map((o) => [0, o, q.radius]);
    for (const lx of [-1.1, 0, 1.1]) shapes.push([lx, q.bladeFront + 0.42, 0.6]);
    for (let pass = 0; pass < 2; pass++) {
      let best = null;
      let bestLen = 0;
      for (const [lx, lz, r] of shapes) {
        const c = { x: pos.x + rx * lx - fx * lz, z: pos.z + rz * lx - fz * lz };
        const b = { x: c.x, z: c.z };
        const list = this.colliders.query(c.x, c.z, r, this.nearby).filter((k) => !(k.tree !== undefined && this.strain.has(k.tree)) && !(pushed && k.vehicle === pushed) && !k.dozer);
        resolveCircles(c, r, list, true);
        const len = Math.hypot(c.x - b.x, c.z - b.z);
        if (len > bestLen) {
          bestLen = len;
          best = { x: c.x - b.x, z: c.z - b.z };
        }
      }
      if (!best) break;
      pos.x += best.x;
      pos.z += best.z;
    }
  }

  // Cars before the blade are shoved along (turning a little about where it meets them).
  pushCars(dt, want, ahead) {
    this.pushing = null;
    const list = this.vehicles?.list;
    if (!list || ahead <= 0.0005) {
      this.scrapeTimer = 0;
      return null;
    }
    const q = this.qc;
    const fx = -Math.sin(this.heading);
    const fz = -Math.cos(this.heading);
    const rx = Math.cos(this.heading);
    const rz = -Math.sin(this.heading);
    const bx = want.x + fx * -q.bladeFront;
    const bz = want.z + fz * -q.bladeFront;
    for (const v of list) {
      if (Math.abs(v.x - bx) > 7 || Math.abs(v.z - bz) > 7) continue;
      const [length, width] = v.def.size;
      // The blade's face, sampled across: which points are inside the car?
      const inside = (shift) => {
        let n = 0;
        let sum = 0;
        const s = Math.sin(v.yaw);
        const c = Math.cos(v.yaw);
        const cx = v.x + fx * shift;
        const cz = v.z + fz * shift;
        for (let k = -4; k <= 4; k++) {
          const lx = (k / 4) * q.bladeHalf;
          const px = bx + rx * lx - cx;
          const pz = bz + rz * lx - cz;
          const along = px * s + pz * c;
          const across = px * c - pz * s;
          if (Math.abs(along) < length / 2 + 0.05 && Math.abs(across) < width / 2 + 0.05) {
            n++;
            sum += lx;
          }
        }
        return { n, mid: n ? sum / n : 0 };
      };
      const hit = inside(0);
      if (!hit.n) continue;
      // Shove it far enough that the blade's out of it.
      let shift = ahead;
      for (let i = 0; i < 8 && inside(shift).n; i++) shift += 0.06;
      const carOff = (v.x - want.x) * rx + (v.z - want.z) * rz;
      const yaw = v.yaw - ((hit.mid - carOff) * shift * 0.35) / length;
      const nx = v.x + fx * shift;
      const nz = v.z + fz * shift;
      // Trees in its way: the small ones go over, a big one stops it (and the dozer).
      let stopped = false;
      for (const { tree, index } of this.clearing?.treesNear(nx, nz, length / 2 + 0.3, this.trees) ?? []) {
        if (this.clearing.strainOf(tree) <= 0) this.clearing.fell(index, fx, fz);
        else stopped = true;
      }
      if (stopped) {
        this.speed = Math.min(this.speed, 0);
        return null;
      }
      this.vehicles.moveVehicle(v, nx, nz, yaw);
      this.pushing = v;
      this.scrapeTimer -= dt;
      if (this.scrapeTimer <= 0) {
        this.scrapeTimer = 0.35;
        this.combat.sfx?.play('scrape', v);
        const e = this.model.bladeEdge.getWorldPosition(this._p ?? (this._p = new THREE.Vector3()));
        this.combat.fx?.sparks?.(e.x + rx * hit.mid, e.y + 0.4, e.z + rz * hit.mid);
      }
      return v;
    }
    this.scrapeTimer = 0;
    return null;
  }

  // The tracks crush the undergrowth (and the bushes) where they run; the blade, down, cuts bare earth.
  workGround() {
    const c = this.clearing;
    if (!c) return;
    const moved = Math.hypot(this.x - (this.lastWorkX ?? Infinity), this.z - (this.lastWorkZ ?? Infinity));
    const turned = Math.abs(wrapAngle(this.heading - (this.lastWorkH ?? 99)));
    if (moved < 0.5 && turned < 0.15) return;
    this.lastWorkX = this.x;
    this.lastWorkZ = this.z;
    this.lastWorkH = this.heading;
    for (const side of [-1, 1]) {
      for (const lz of [-1.2, 0, 1.2]) {
        const p = this.toWorld(side * DOZER.track.x, lz);
        c.flatten(p.x, p.z, 0.7);
      }
    }
    if (this.blade < -0.5) {
      const q = this.qc;
      for (const lx of [-1.1, 0, 1.1]) {
        const p = this.toWorld(lx, q.bladeFront + 0.2);
        c.carve(p.x, p.z, q.clearing.bladeWidth * 0.62);
      }
      if (Math.random() < 0.5) {
        const e = this.model.bladeEdge.getWorldPosition(this._p ?? (this._p = new THREE.Vector3()));
        this.combat.fx?.dust?.(e.x, e.y + 0.1, e.z);
      }
    }
  }

  // The dead: shoved before the blade (and crushed if pinned), crushed under the tracks, shoved off the flanks.
  crushDead(dt) {
    const q = this.qc;
    const k = this.mods.crush; // Session 22: as the fitted parts change it
    const moving = Math.abs(this.speed) > 0.25 || Math.abs(this.turn) > 0.35;
    this.pile = 0;
    this.crunchTimer -= dt;
    const now = performance.now();
    for (const z of this.enemies.living) {
      if (Math.abs(z.x - this.x) > 6 || Math.abs(z.z - this.z) > 6) continue;
      if (this.climbers.has(z)) continue;
      const { lx, lz } = this.toLocal(z.x, z.z);
      const zr = z.radius ?? 0.35;
      const mutant = z.kind === 'mutant';
      const scale = mutant ? k.mutantScale : 1;
      const front = Math.abs(lx) < q.bladeHalf + zr * 0.5 && lz < q.bladeFront + 0.5 && lz > q.bladeFront - 0.5 - zr;
      if (front && this.blade < 0.7 && this.speed > 0.05) {
        // Before the blade: carried along.
        this.pile++;
        const at = this.toWorld(lx, q.bladeFront - zr - 0.06);
        // Pinned? Something solid just ahead of it.
        const ahead = { x: at.x, z: at.z };
        const b = { ...ahead };
        resolveCircles(ahead, zr, this.colliders.query(ahead.x, ahead.z, zr, this.nearby).filter((c) => !c.dozer && !(c.tree !== undefined && this.strain.has(c.tree))), false);
        const pinned = Math.hypot(ahead.x - b.x, ahead.z - b.z) > 0.12;
        z.x = at.x;
        z.z = at.z;
        const dmg = (pinned ? k.pinned : k.push) * dt * scale;
        const killed = this.enemies.damage(z, dmg, 'body', { id: 'dozer', stagger: pinned ? 1 : k.stagger * 0.3, knockback: 0 }, { x: z.x, y: (z.y ?? 0) + 0.9, z: z.z }, { x: this.x, z: this.z });
        if (pinned) this.gore(z, killed);
        continue;
      }
      // Under it: between the tracks or on them (the blade up lets them in from the front).
      const under = Math.abs(lx) < 1.25 + zr * 0.3 && lz > (this.blade >= 0.7 ? -2.6 : -2.0) && lz < 1.95;
      if (under && moving) {
        const onTrack = Math.abs(Math.abs(lx) - DOZER.track.x) < DOZER.track.width / 2 + zr;
        if (onTrack) {
          const killed = this.enemies.damage(z, k.tracks * dt * scale, 'body', { id: 'dozer', stagger: 1, knockback: 0 }, { x: z.x, y: (z.y ?? 0) + 0.3, z: z.z }, { x: this.x, z: this.z });
          this.gore(z, killed);
        }
        // Knocked down as it goes over them; the ones between the tracks come out the back.
        if (!(z.rammedUntil > now)) {
          z.rammedUntil = now + 500;
          this.enemies.damage(z, k.ram * scale * Math.min(1, Math.abs(this.speed) / q.maxSpeed + 0.3), 'body', { id: 'dozer', stagger: k.stagger, knockback: 0 }, { x: z.x, y: (z.y ?? 0) + 1, z: z.z }, { x: this.x, z: this.z });
        }
      } else if (moving && Math.abs(lx) < 1.25 + zr + 0.4 && Math.abs(lx) >= 1.25 && lz > -2.4 && lz < 1.95) {
        // Along its flanks: shoved off.
        const out = this.toWorld(Math.sign(lx || 1) * (1.32 + zr + 0.3), lz);
        z.x += (out.x - z.x) * Math.min(1, k.shove * dt);
        z.z += (out.z - z.z) * Math.min(1, k.shove * dt);
      }
    }
    // The witch, before the blade.
    const w = this.witch;
    if (w?.targetable && this.speed > 0.4 && !(w.rammedUntil > now)) {
      const { lx, lz } = this.toLocal(w.x, w.z);
      if (Math.abs(lx) < q.bladeHalf && lz < q.bladeFront + 0.5 && lz > q.bladeFront - 0.9) {
        w.rammedUntil = now + 1500;
        w.takeHit(45, 'body', { id: 'dozer' }, { x: w.x, y: (w.y ?? 0) + 1, z: w.z }, { x: this.x, z: this.z });
      }
    }
  }

  gore(z, killed) {
    if (this.crunchTimer > 0 && !killed) return;
    this.crunchTimer = 0.22;
    this.combat.sfx?.play('crunch', z);
    this.combat.fx?.blood?.(z.x, (z.y ?? 0) + 0.5, z.z, true);
    if (killed) this.bus.emit('weapon:hit', { killed, part: 'body', melee: true });
  }

  // ---- the open cab: the dead climb on ------------------------------------------------------------

  updateClimbers(dt) {
    const c = this.qc.climb;
    // Session 22: armour plating round the cab: nothing climbs on (any already on are thrown off).
    if (this.mods.noClimbers) {
      this.climbing.clear();
      if (this.climbers.size) this.releaseClimbers();
      return;
    }
    const slow = Math.abs(this.speed) < c.slowBelow && Math.abs(this.turn) < 0.4;
    const throwOff = Math.abs(this.speed) > c.throwAbove || Math.abs(this.turn) > c.throwTurn;
    for (const z of this.enemies.living) {
      if (this.climbers.has(z)) continue;
      if (Math.abs(z.x - this.x) > 4 || Math.abs(z.z - this.z) > 4) {
        this.climbing.delete(z);
        continue;
      }
      const { lx, lz } = this.toLocal(z.x, z.z);
      const beside = Math.abs(lx) > 1.1 && Math.abs(lx) < 2.2 && lz > -0.6 && lz < 1.8;
      if (!beside || !slow) {
        this.climbing.delete(z);
        continue;
      }
      const t = (this.climbing.get(z) ?? 0) + dt;
      this.climbing.set(z, t);
      if (t >= c.seconds) {
        this.climbing.delete(z);
        this.climbers.add(z);
        z.climbSide = Math.sign(lx) || 1;
        this.combat.sfx?.play('climb');
        this.combat.hud?.pickup?.("One of them's climbing on! Get moving or pivot hard to throw it off.");
      }
    }
    for (const z of [...this.climbers]) {
      if (!z.alive) {
        this.climbers.delete(z);
        continue;
      }
      if (throwOff) {
        const out = this.toWorld(z.climbSide * 3, c.spot[1]);
        z.x = out.x;
        z.z = out.z;
        this.enemies.damage(z, 15, 'body', { id: 'dozer', stagger: 1, knockback: 3 }, { x: z.x, y: (z.y ?? 0) + 1, z: z.z }, { x: this.x, z: this.z });
        this.climbers.delete(z);
        this.combat.sfx?.play('fenceHit', z);
        continue;
      }
      const at = this.toWorld(z.climbSide * c.spot[0], c.spot[1]);
      z.x = at.x;
      z.z = at.z;
    }
  }

  releaseClimbers() {
    this.climbers?.clear();
  }

  // ---- the winch ----------------------------------------------------------------------------------

  initCable() {
    const w = this.qc.winch;
    this.cable = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.014, 0.014, 1, 5).translate(0, 0.5, 0), new THREE.MeshLambertMaterial({ color: this.qc.look.colours.cable }), w.segments);
    this.cable.count = 0;
    this.cable.frustumCulled = false;
    this.cable.castShadow = true;
    this.cable.name = 'winch cable';
    this.scene.add(this.cable);
    const hook = new THREE.Group();
    const hookMat = new THREE.MeshLambertMaterial({ color: 0x2a2a28 });
    const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.16, 6), hookMat);
    const curl = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.022, 6, 10, Math.PI * 1.3), hookMat);
    curl.position.y = -0.1;
    hook.add(shank, curl);
    hook.visible = false;
    this.scene.add(hook);
    this.hook = hook;
    this.v = { a: new THREE.Vector3(), b: new THREE.Vector3(), d: new THREE.Vector3(), m: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), fwd: new THREE.Vector3(), eye: new THREE.Vector3() };
  }

  // What's under the crosshair that the hook could take: a car, or one of the dead.
  winchTarget() {
    const w = this.qc.winch;
    const cam = this.player.camera;
    const eye = this.v.eye.copy(cam.position);
    const fwd = cam.getWorldDirection(this.v.fwd);
    let best = null;
    let bestD = w.range;
    const z = rayEnemies(eye, fwd, this.enemies.living, w.range);
    if (z) {
      best = { kind: 'zombie', z: z.enemy };
      bestD = z.distance;
    }
    for (const v of this.vehicles?.list ?? []) {
      const dx = v.x - eye.x;
      const dz = v.z - eye.z;
      const along = dx * fwd.x + dz * fwd.z;
      if (along < 1 || along > bestD + 2) continue;
      const off = Math.hypot(dx - fwd.x * along, dz - fwd.z * along);
      if (off < v.def.size[1] / 2 + 0.6 && Math.abs(Math.atan2(off, along)) < w.cone * 2) {
        bestD = along;
        best = { kind: 'car', v };
      }
    }
    return best;
  }

  targetPoint(t, out) {
    if (t.kind === 'car') return out.set(t.v.x, (t.v.groundY ?? this.ground.heightAt(t.v.x, t.v.z)) + 0.6, t.v.z);
    return out.set(t.z.x, (t.z.y ?? 0) + 0.9, t.z.z);
  }

  updateWinch(dt, input) {
    const w = this.qc.winch;
    this.aimed = this.winch ? null : this.winchTarget();
    if (input.wasPressed('reload')) {
      if (this.winch) {
        this.winch = null;
        this.combat.sfx?.play('winchRelease', this);
      } else if (this.aimed) {
        const fair = this.model.fairlead.getWorldPosition(this.v.a);
        this.winch = { phase: 'flying', t: 0, target: this.aimed, from: fair.clone(), length: 0, taut: false, reelTimer: 0 };
        this.combat.sfx?.play('winchFire', this);
      } else {
        this.combat.sfx?.play('plasmaEmpty', this);
      }
    }
    const W = this.winch;
    if (!W) return;
    const t = W.target;
    if (t.kind === 'zombie' && !t.z.alive) {
      this.winch = null;
      return;
    }
    const fair = this.model.fairlead.getWorldPosition(this.v.a);
    const at = this.targetPoint(t, this.v.b);
    const d = fair.distanceTo(at);
    if (W.phase === 'flying') {
      W.t += (dt * w.hookSpeed) / Math.max(1, d);
      if (W.t >= 1) {
        W.phase = 'hooked';
        W.length = d;
        this.combat.sfx?.play('winchClunk', t.kind === 'car' ? t.v : t.z);
      }
      return;
    }
    if (input.isDown('flare')) {
      W.length = Math.max(w.minLength, W.length - w.reel * dt);
      W.reelTimer -= dt;
      if (W.reelTimer <= 0) {
        W.reelTimer = 0.12;
        this.combat.sfx?.play('winchReel', this);
      }
    }
    if (d > w.range * 1.6) {
      this.winch = null;
      this.combat.sfx?.play('winchSnap', this);
      this.player.shake(0.6);
      return;
    }
    W.taut = d > W.length + 0.05;
    if (!W.taut) return;
    // Taut: drag it toward the fairlead.
    const pull = Math.min(d - W.length, w.drag * dt);
    const dx = (fair.x - at.x) / d;
    const dz = (fair.z - at.z) / d;
    if (t.kind === 'car') {
      const v = t.v;
      // It swings round to follow the cable (nose or tail first, whichever's nearer).
      const want = Math.atan2(dx, dz);
      let dy = wrapAngle(want - v.yaw);
      if (Math.abs(dy) > Math.PI / 2) dy = wrapAngle(dy - Math.PI);
      const nx = v.x + dx * pull;
      const nz = v.z + dz * pull;
      for (const { tree, index } of this.clearing?.treesNear(nx, nz, v.def.size[0] / 2, this.trees) ?? []) {
        if (this.clearing.strainOf(tree) <= 0) this.clearing.fell(index, dx, dz);
      }
      this.vehicles.moveVehicle(v, nx, nz, v.yaw + dy * Math.min(1, dt * 1.5));
      this.scrapeTimer -= dt;
      if (this.scrapeTimer <= 0) {
        this.scrapeTimer = 0.4;
        this.combat.sfx?.play('scrape', v);
        this.combat.fx?.dust?.(v.x, this.ground.heightAt(v.x, v.z), v.z);
      }
    } else {
      const z = t.z;
      z.x += dx * pull;
      z.z += dz * pull;
      this.enemies.damage(z, w.zombieDamage * dt, 'body', { id: 'winch', stagger: 1, knockback: 0 }, { x: z.x, y: (z.y ?? 0) + 0.4, z: z.z }, fair);
    }
  }

  // The cable from the fairlead to the hook, sagging when it's slack.
  updateCable() {
    const W = this.winch;
    const w = this.qc.winch;
    if (!W || this.stored) {
      this.cable.count = 0;
      this.hook.visible = false;
      return;
    }
    const v = this.v;
    const fair = this.model.fairlead.getWorldPosition(v.a);
    const at = this.targetPoint(W.target, v.b);
    const end = W.phase === 'flying' ? v.d.lerpVectors(W.from, at, Math.min(1, W.t)) : v.d.copy(at);
    const span = fair.distanceTo(end);
    const slack = W.phase === 'flying' ? 0.2 : Math.max(0, W.length - span);
    const sag = Math.min(2.5, w.sag * span + slack * 0.45);
    const n = w.segments;
    let prev = fair.clone();
    const p = new THREE.Vector3();
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      p.lerpVectors(fair, end, t);
      p.y -= sag * 4 * t * (1 - t);
      const seg = v.s.subVectors(p, prev);
      const len = seg.length();
      v.q.setFromUnitVectors(v.up, seg.normalize());
      v.m.compose(prev, v.q, new THREE.Vector3(1, len, 1));
      this.cable.setMatrixAt(i - 1, v.m);
      prev.copy(p);
    }
    this.cable.count = n;
    this.cable.instanceMatrix.needsUpdate = true;
    this.hook.visible = true;
    this.hook.position.copy(end);
  }

  // ---- black smoke out of the stack ----------------------------------------------------------------

  initSmoke() {
    const n = 48;
    this.smoke = Array.from({ length: n }, () => ({ life: 0, x: 0, y: -1000, z: 0, vy: 0 }));
    this.smokeNext = 0;
    const geo = new THREE.BufferGeometry();
    this.smokePos = new Float32Array(n * 3).fill(-1000);
    geo.setAttribute('position', new THREE.BufferAttribute(this.smokePos, 3));
    let map = null;
    if (typeof document !== 'undefined') {
      const c = document.createElement('canvas');
      c.width = c.height = 32;
      const ctx = c.getContext('2d');
      if (ctx) {
        const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 32, 32);
        map = new THREE.CanvasTexture(c);
      }
    }
    this.smokePoints = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x141210, size: 1.1, map, transparent: true, opacity: 0.45, depthWrite: false }));
    this.smokePoints.frustumCulled = false;
    this.smokePoints.name = 'dozer smoke';
    this.scene.add(this.smokePoints);
  }

  puff(count) {
    if (this.stored) return;
    const at = this.toWorld(0.32, -1.05);
    for (let i = 0; i < count; i++) {
      const s = this.smoke[this.smokeNext];
      this.smokeNext = (this.smokeNext + 1) % this.smoke.length;
      s.life = 1.6 + Math.random();
      s.x = at.x + (Math.random() - 0.5) * 0.2;
      s.z = at.z + (Math.random() - 0.5) * 0.2;
      s.y = this.y + 3.0 + Math.random() * 0.2;
      s.vy = 1.2 + Math.random() * 0.8;
      s.vx = (Math.random() - 0.5) * 0.6;
      s.vz = (Math.random() - 0.5) * 0.6;
    }
  }

  updateSmoke(dt) {
    if (this.riding && Math.random() < dt * 2.5) this.puff(1); // it idles smoky
    let any = false;
    this.smoke.forEach((s, i) => {
      if (s.life <= 0) return;
      any = true;
      s.life -= dt;
      s.x += s.vx * dt;
      s.z += s.vz * dt;
      s.y += s.vy * dt;
      s.vy *= 1 - dt * 0.5;
      this.smokePos[i * 3] = s.x;
      this.smokePos[i * 3 + 1] = s.life > 0 ? s.y : -1000;
      this.smokePos[i * 3 + 2] = s.z;
    });
    if (any) this.smokePoints.geometry.attributes.position.needsUpdate = true;
  }

  // ---- its pose and the seat's view ----------------------------------------------------------------

  pose() {
    const g = this.ground;
    const ax = -Math.sin(this.heading);
    const az = -Math.cos(this.heading);
    const rx = Math.cos(this.heading);
    const rz = -Math.sin(this.heading);
    const L = 1.5;
    const T = DOZER.track.x;
    const front = g.heightAt(this.x + ax * L, this.z + az * L);
    const back = g.heightAt(this.x - ax * L, this.z - az * L);
    const right = g.heightAt(this.x + rx * T, this.z + rz * T);
    const left = g.heightAt(this.x - rx * T, this.z - rz * T);
    this.y = (front + back + left + right) / 4;
    const m = this.model;
    m.root.position.set(this.x, this.y, this.z);
    m.root.rotation.set(Math.atan2(front - back, 2 * L), this.heading, Math.atan2(right - left, 2 * T), 'YXZ');
    // The engine's shake, the lurch as a tree gives, the nose dipping as it digs.
    const shake = this.riding ? Math.sin(performance.now() * 0.05) * 0.003 * (1 + this.straining * 3) : 0;
    m.body.rotation.set(shake - this.lurch * 0.025 + (this.blade < -0.5 && this.speed > 0.3 ? -0.01 : 0) + this.straining * 0.012, 0, Math.sin(performance.now() * 0.037) * 0.002 * (this.riding ? 1 : 0));
    m.setTracks(this.travelL, this.travelR);
    m.setBlade(this.blade);
    if (m.cab.visible) {
      m.setLevers(clamp(this.speed / this.qc.maxSpeed, -1, 1), clamp(-this.turn / this.qc.turnRate, -1, 1), this.blade);
      m.setGauges({ temp: this.temp, oil: 0.25 + this.straining * 0.3 + (this.pushing ? 0.15 : 0), fuel: 0.55, hours: this.hours });
    }
  }

  carry(player) {
    const eye = this.cameraPose();
    player.position.set(eye.x, eye.y - player.eyeHeight, eye.z);
    const fx = -Math.sin(this.heading);
    const fz = -Math.cos(this.heading);
    player.velocity.x = fx * this.speed;
    player.velocity.z = fz * this.speed;
    player.onGround = true;
    player.verticalSpeed = 0;
  }

  cameraPose() {
    const q = this.qc;
    this.model.root.updateMatrixWorld(true);
    const eye = this._eye ?? (this._eye = new THREE.Vector3());
    return eye.set(q.eye.x, q.eye.y, q.eye.z).applyMatrix4(this.model.body.matrixWorld);
  }

  placeCamera(player) {
    if (!this.riding) return;
    const cam = player.camera;
    cam.position.copy(this.cameraPose());
    const shake = player.shakeAmount;
    const sx = Math.sin(player.shakeTime * 47) * shake * 0.02;
    const sy = Math.sin(player.shakeTime * 61 + 1.3) * shake * 0.02;
    const q = this._q ?? (this._q = new THREE.Quaternion());
    const e = this._e ?? (this._e = new THREE.Euler(0, 0, 0, 'YXZ'));
    const l = this._l ?? (this._l = new THREE.Quaternion());
    this.model.body.getWorldQuaternion(q);
    e.set(player.pitch + player.recoilPitch + sy, this.lookYaw + sx, 0, 'YXZ');
    l.setFromEuler(e);
    cam.quaternion.copy(q).multiply(l);
    cam.updateMatrixWorld();
  }

  snareWheel(trap) {
    if (!this.riding || this.wheelSnare) return false;
    this.wheelSnare = trap;
    this.mash = 0;
    trap.held = this;
    const at = this.toWorld(DOZER.track.x, -1.3);
    trap.x = at.x;
    trap.z = at.z;
    trap.y = this.ground.heightAt(at.x, at.z);
    this.speed = 0;
    this.turn = 0;
    this.player.shake(this.qc.snare.shake);
    this.combat.sfx?.play('impact', this);
    const pad = this.device !== 'keyboardMouse';
    this.combat.hud?.pickup?.(`A snare's caught in the track! Get off and tap ${pad ? 'X' : 'E'} by it to free it.`);
    this.bus.emit('quad:wheelSnared', { trap });
    return true;
  }

  // ---- the HUD --------------------------------------------------------------------------------------

  updateHud(input) {
    if (!this.vhud) return;
    if (!this.riding) {
      this.vhud.hide(this);
      return;
    }
    const pad = input.activeDevice === 'gamepad';
    const W = this.winch;
    const name = (t) => (t.kind === 'car' ? (t.v.def.name ?? 'the car').toLowerCase() : t.z.kind === 'mutant' ? 'the mutant' : 'one of the dead');
    let winch = '';
    if (W?.phase === 'flying') winch = 'WINCH · hook away';
    else if (W) winch = `WINCH · ${name(W.target)} · ${W.length.toFixed(0)} m${W.taut ? ' · TAUT' : ''}`;
    else if (this.aimed) winch = `${pad ? 'B' : 'R'}: hook ${name(this.aimed)}`;
    this.vhud.show(this, 'dozer', {
      speed: Math.abs(this.speed) * 3.6,
      blade: this.blade,
      pile: this.pile,
      straining: this.straining,
      trees: this.clearing?.felledCount ?? 0,
      trail: this.clearing?.carvedMetres ?? 0,
      winch,
      aimed: Boolean(this.aimed) || Boolean(W),
      climbers: this.climbers.size,
      hint: pad ? 'RT blade down · LT blade up · B winch · hold Y reel · A horn · hold X off' : 'Mouse blade down · Right blade up · R winch · hold F reel · Space horn · hold E off',
    });
  }

  // ---- debug ------------------------------------------------------------------------------------------

  bring() {
    if (this.riding) return;
    const p = this.player;
    const ax = -Math.sin(p.yaw);
    const az = -Math.cos(p.yaw);
    this.unpark();
    this.clearMotion();
    this.place(p.position.x + ax * 6, p.position.z + az * 6, p.yaw);
    this.notify?.('The dozer is in front of you (hold X by it to climb up)');
  }

  // ---- parts bolted on (Session 22, M10.3 spike) ---------------------------------------------------

  // Fit the part `id`, or take it off if it's on.
  togglePart(id) {
    const P = this.cfg.spikes.dozerParts;
    this.parts = toggledParts(P, this.parts, id);
    const on = this.parts.includes(id);
    if (on && !this.partLooks.has(id)) {
      const look = buildPart(id, P[id]);
      (look.mount === 'blade' ? this.model.bladeArm : this.model.body).add(look.mesh);
      this.partLooks.set(id, look);
    } else if (!on && this.partLooks.has(id)) {
      this.partLooks.get(id).dispose();
      this.partLooks.delete(id);
    }
    this.mods = partMods(this.qc.crush, P, this.parts);
    this.notify?.(`${P[id].name}: ${on ? 'bolted on' : 'off'}`);
  }

  spinParts(dt) {
    const saw = this.partLooks.get('saw');
    if (saw?.spinner && this.riding) saw.spinner.rotation.y += this.cfg.spikes.dozerParts.saw.spin * dt;
  }

  addDebugItems(menu) {
    const sp = menu.category(DEBUG.spikes);
    for (const [id, p] of Object.entries(this.cfg.spikes.dozerParts)) {
      sp.addItem(() => `Dozer part: ${p.name} (${this.parts.includes(id) ? 'on' : 'off'})`, () => {
        if (this.stored) this.bring();
        this.togglePart(id);
      });
    }
    const cat = menu.category(DEBUG.experimental);
    cat.addItem('Dozer: bring it here', () => this.bring());
    cat.addItem('Dozer: put me on it', () => {
      if (this.player.riding && this.player.riding !== this) return;
      if (this.stored) this.bring();
      this.mount();
    });
    cat.addItem('Dozer: fell every tree within 15 m of me (test)', () => {
      const p = this.player.position;
      let n = 0;
      for (const { tree, index } of this.clearing.treesNear(p.x, p.z, 15, [])) {
        this.clearing.fell(index, tree.x - p.x, tree.z - p.z, n > 5);
        n++;
      }
      this.notify?.(`${n} trees down`);
    });
    cat.addItem('Dozer: send it away (its trails stay)', () => {
      if (this.riding) this.dismount();
      this.reset();
    });
  }

  overlayLine() {
    if (this.stored) return 'dozer away';
    return `dozer ${this.riding ? `${(this.speed * 3.6).toFixed(0)} km/h turn ${this.turn.toFixed(2)}` : 'parked'} blade ${this.blade.toFixed(2)} pile ${this.pile}${this.straining ? ` STRAIN ${Math.round(this.straining * 100)}%` : ''}${this.pushing ? ' PUSHING' : ''} trees ${this.clearing?.felledCount ?? 0} trail ${Math.round(this.clearing?.carvedMetres ?? 0)}m${this.winch ? ` winch ${this.winch.phase}` : ''}${this.climbers.size ? ` climbers ${this.climbers.size}` : ''}${this.parts.length ? ` parts ${this.parts.join('+')}` : ''}`;
  }

  dispose() {
    for (const look of this.partLooks?.values() ?? []) look.dispose();
    for (const off of this.unsubscribers ?? []) off();
    this.combat?.sfx?.engine?.(false);
    this.unpark();
    this.lamp?.dispose();
    for (const m of [this.cable, this.smokePoints]) {
      m?.removeFromParent();
      m?.geometry.dispose();
      m?.material.map?.dispose();
      m?.material.dispose();
    }
    this.hook?.removeFromParent();
    this.hook?.traverse((o) => {
      o.geometry?.dispose();
      o.material?.dispose();
    });
    this.model?.dispose();
  }
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
