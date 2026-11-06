// The alien quad (experimental: the debug menu's "Experimental vehicles"):
// Earl's quad bike as the greys rebuilt it (render/alienQuadModel.js). It
// rides on the quad's rules (world/Quad.js: held X on and off, the
// headlamp, the engine's noise, the witch's snare, the witch faster while
// Tom rides), and adds:
//  - The boost (L3 or A; Shift or Space): three seconds of a far higher
//    top speed (it drives itself forward while it burns), the brush hardly
//    slowing it, the dead it hits thrown much harder. The view widens, the
//    neon blazes, the engine orb throws flame. It charges back up over a
//    few seconds; a part-charged meter gives a shorter burst.
//  - Plasma (combat/Plasma.js): RT / left mouse fires bolts from the two
//    emitters in turn (hold to keep firing); LT / right mouse charges both
//    into an orb while held and lets it go on release (the longer the
//    charge, the bigger the orb and its burst). Both draw on a capacitor
//    of cells that refills once it's left alone a moment. They fly where
//    the crosshair is (within the emitters' arc ahead), drawn a little
//    toward the dead near it.
// A holo ring over the bars shows the cells and the boost; so does the HUD.
// Not saved: it waits, unseen, until the debug menu brings it.
//
// Events: 'alienQuad:mounted', 'alienQuad:dismounted', 'alienQuad:boost'.

import * as THREE from 'three';
import { Quad } from './Quad.js';
import { resolveCircles } from './collision.js';
import { HoldAction } from '../player/HoldAction.js';
import { buildAlienQuad } from '../render/alienQuadModel.js';
import { Plasma } from '../combat/Plasma.js';
import { rayBlockers, rayEnemies } from '../combat/hitscan.js';
import { wrapAngle } from './Ute.js';
import { DEBUG } from '../debug/DebugMenu.js';

// The boost meter after a step: burning or not. Returns { meter, burning }.
export function stepBoost(meter, burning, dt, b) {
  if (burning) {
    const m = Math.max(0, meter - dt / b.seconds);
    return { meter: m, burning: m > 0 };
  }
  return { meter: Math.min(1, meter + dt / b.recharge), burning: false };
}

export class AlienQuad extends Quad {
  constructor(cfg, bus) {
    super(cfg, bus);
    this.qc = cfg.alienQuad;
  }

  // ctx: { scene, ground, colliders, player, combat, notify(text), witch, vhud }.
  init(ctx) {
    Object.assign(this, ctx);
    this.enemies = ctx.combat.enemies;
    this.hold = new HoldAction(this.cfg.station.hold.releaseDrain);
    this.hold.init();
    this.hud = { prompt: '', progress: 0 };
    this.nearby = [];
    this.daylight = 1;
    this.device = 'gamepad';
    this.lampOn = false;
    this.lampTouched = false;
    this.wheelSnare = null;
    this.mash = 0;
    this.time = 0;
    this.model = buildAlienQuad(this.qc);
    this.mesh = this.model.root;
    this.scene.add(this.mesh);
    this.lamp = null; // its lights are made the first time it's brought (ensureLights)
    this.underglow = null;
    this.plasma = new Plasma(this.qc.plasma, this.qc.look, this.bus);
    this.plasma.init(this.scene, { combat: this.combat, colliders: this.colliders, ground: this.ground, player: this.player, witch: this.witch, headshot: this.cfg.weapons?.headshotMultiplier ?? 2 });
    this.v = { from: new THREE.Vector3(), dir: new THREE.Vector3(), fwd: new THREE.Vector3(), aim: new THREE.Vector3() };
    this.blockers = [];
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
    if (this.collider) this.collider.off = true;
    this.setLamp(false);
    this.speed = 0;
    this.x = 0;
    this.z = 0;
    this.y = 0;
    this.heading = 0;
    this.spin = 0;
    this.steer = 0;
    this.lean = 0;
    this.noiseTimer = 0;
    this.boostMeter = 1;
    this.boosting = false;
    this.boostFx = 0;
    this.cells = this.qc.plasma.cells;
    this.idleFor = 10;
    this.fireTimer = 0;
    this.charge = 0;
    this.charging = false;
    this.emitterIndex = 0;
    this.firing = 0;
    this.plasma?.clear();
    this.combat?.sfx?.engine?.(false);
  }

  // Its lights (the headlamp, the underglow, the plasma's): made once, the
  // first time it's brought, then always in the scene (dark when off).
  ensureLights() {
    if (this.lamp) return;
    this.buildHeadlamp();
    const u = this.qc.underglow;
    this.underglow = new THREE.PointLight(u.color, 0, u.distance, 2);
    this.underglow.castShadow = false;
    this.underglow.position.set(0, 0.25, 0);
    this.mesh.add(this.underglow);
    this.plasma.ensureLights();
  }

  place(x, z, heading) {
    this.ensureLights();
    this.stored = false;
    this.mesh.visible = true;
    super.place(x, z, heading);
  }

  park() {
    if (this.stored) return;
    super.park();
  }

  setLamp(on) {
    this.lampOn = Boolean(on);
    if (this.lamp) this.lamp.intensity = this.lampOn ? this.qc.headlamp.intensity * (this.glare ?? 1) : 0;
    this.model?.lens.material.emissive.setHex(this.lampOn ? this.qc.look.vein : 0x000000).multiplyScalar(this.lampOn ? 3 : 0);
  }

  // ---- getting on and off ----------------------------------------------------------------------------

  update(dt, input, playing, canInteract, daylight = 1) {
    this.daylight = daylight;
    this.device = input.activeDevice;
    this.time += dt;
    if (this.stored) {
      this.hud.prompt = '';
      this.hud.progress = 0;
      return;
    }
    if (!playing) {
      this.hud.prompt = '';
      if (!this.riding) this.combat.sfx?.engine?.(false);
      this.vhud?.hide(this);
      this.glow();
      return;
    }
    const pad = input.activeDevice === 'gamepad';
    const X = pad ? 'X' : 'E';
    let offer = null;
    let freeing = false;
    if (this.riding) {
      this.updateLamp(input);
      if (this.lampOn) this.updateLampGlare(dt);
      const off = this.wheelSnare ? `Snare round the front wheel! Hold ${X}: get off` : `Hold ${X}: get off`;
      if (Math.abs(this.speed) < this.qc.dismountSpeed && !this.boosting) offer = { key: 'aq-off', prompt: off, seconds: this.qc.dismountSeconds, act: () => this.dismount() };
    } else if (canInteract && !this.player.platform && !this.player.riding) {
      const p = this.player.position;
      const d = Math.hypot(p.x - this.x, p.z - this.z);
      if (this.wheelSnare) freeing = d < this.qc.snare.range;
      else if (d < this.qc.mountRange) offer = { key: 'aq-on', prompt: `Hold ${X}: ride the alien quad`, seconds: this.qc.mountSeconds, act: () => this.mount() };
    }
    if (this.wheelSnare && !this.riding) {
      if (freeing && input.wasPressed('interact')) this.mash += 1 / this.qc.snare.presses;
      this.mash = Math.max(0, this.mash - this.qc.snare.decay * dt);
      if (this.mash >= 1) this.freeWheel(true);
    }
    const done = this.hold.update(dt, offer?.key ?? null, input.isDown('interact'), offer?.seconds ?? 1);
    if (done && offer) offer.act();
    if (freeing && this.wheelSnare) {
      this.hud.prompt = `Tap ${X} to free the wheel from the snare`;
      this.hud.progress = this.mash;
    } else {
      this.hud.prompt = offer ? offer.prompt : '';
      this.hud.progress = this.hold.key !== null ? this.hold.progress : 0;
    }
    if (this.riding) {
      this.updateNoise(dt);
      this.updateBoost(dt, input);
      this.updateGuns(dt, input);
    } else {
      this.rechargeIdle(dt);
      this.pose(dt);
    }
    this.plasma.update(dt, this.player.camera);
    this.glow();
    this.updateHud(input);
  }

  mount() {
    if (this.riding || this.stored || this.player.riding) return;
    this.riding = true;
    this.speed = 0;
    if (this.collider) this.collider.off = true;
    const p = this.player;
    p.riding = this;
    p.crouched = false;
    p.sprinting = false;
    p.yaw = this.heading;
    p.position.set(this.x, this.y, this.z);
    this.combat.sfx?.play('alienHum', this);
    this.combat.sfx?.engine?.(true, 0, 0, 'alien');
    this.lampTouched = false;
    this.setLamp(this.daylight < this.qc.headlamp.autoBelow);
    this.fireTimer = 0.25; // the press that got him on doesn't fire
    const pad = this.device !== 'keyboardMouse';
    this.combat.hud?.pickup?.(
      pad
        ? 'The alien quad: left stick to ride, RT plasma, hold LT to charge an orb, L3 or A to boost, hold X (slow) to get off.'
        : 'The alien quad: WASD to ride, left mouse plasma, hold right mouse to charge an orb, Shift or Space to boost, hold E (slow) to get off.',
    );
    this.bus.emit('alienQuad:mounted');
  }

  dismount() {
    if (!this.riding) return;
    const p = this.player;
    const rx = Math.cos(this.heading);
    const rz = -Math.sin(this.heading);
    let spot = null;
    for (const side of [-1, 1]) {
      const c = { x: this.x + rx * side * this.qc.stepOff, z: this.z + rz * side * this.qc.stepOff };
      const before = { ...c };
      resolveCircles(c, this.cfg.player.radius, this.colliders.query(c.x, c.z, this.cfg.player.radius, this.nearby), true);
      if (Math.hypot(c.x - before.x, c.z - before.z) < 0.05) {
        spot = c;
        break;
      }
      spot ??= c;
    }
    this.leave();
    p.teleport(spot.x, spot.z, p.yaw);
    this.bus.emit('alienQuad:dismounted');
  }

  leave() {
    this.riding = false;
    this.speed = 0;
    this.boosting = false;
    this.charging = false;
    this.charge = 0;
    if (this.player?.riding === this) this.player.riding = null;
    if (this.player) this.player.fovMultiplier = 1;
    this.park();
    this.setLamp(false);
    this.combat?.sfx?.engine?.(false);
    this.vhud?.hide(this);
  }

  eject() {
    if (!this.riding) return;
    this.leave();
  }

  // ---- the boost ---------------------------------------------------------------------------------------

  updateBoost(dt, input) {
    const b = this.qc.boost;
    const pressed = input.wasPressed('sprint') || input.wasPressed('jump');
    if (pressed && !this.boosting && this.boostMeter >= b.minToStart && !this.wheelSnare) {
      this.boosting = true;
      this.combat.sfx?.play('boost', this);
      this.player.shake(0.6);
      this.bus.emit('alienQuad:boost');
    }
    const wasFull = this.boostMeter >= 1;
    const s = stepBoost(this.boostMeter, this.boosting, dt, b);
    this.boostMeter = s.meter;
    if (this.boosting && !s.burning) this.combat.sfx?.play('boostEnd', this);
    this.boosting = s.burning;
    if (!wasFull && this.boostMeter >= 1 && !this.boosting) this.combat.sfx?.play('boostReady');
    this.boostFx += ((this.boosting ? 1 : 0) - this.boostFx) * Math.min(1, dt * (this.boosting ? 8 : 3));
    this.player.fovMultiplier = 1 + (b.fov - 1) * this.boostFx;
    if (this.boosting) this.player.shake(b.shake * 0.5);
  }

  // ---- the plasma ----------------------------------------------------------------------------------------

  updateGuns(dt, input) {
    const P = this.qc.plasma;
    this.fireTimer -= dt;
    this.firing = Math.max(0, this.firing - dt * 6);
    let used = false;
    // LT: charge an orb while held, let it go on release.
    if (input.isDown('aim')) {
      if (!this.charging) {
        this.charging = true;
        this.charge = 0;
        if (this.cells >= P.orb.cost) this.combat.sfx?.play('plasmaCharge', this);
      }
      if (this.cells >= P.orb.cost) this.charge = Math.min(1, this.charge + dt / P.orb.charge);
      used = true;
    } else if (this.charging) {
      this.charging = false;
      if (this.charge >= P.orb.minCharge && this.cells >= P.orb.cost) {
        if (this.shoot('orb', this.charge)) this.cells -= P.orb.cost;
      } else if (this.charge > 0) {
        this.combat.sfx?.play('plasmaFizzle', this);
      }
      this.charge = 0;
      used = true;
    }
    // RT: bolts, one emitter then the other, as long as it's held and there are cells.
    if (input.isDown('attack') && !this.charging && this.fireTimer <= 0) {
      if (this.cells >= P.bolt.cost) {
        if (this.shoot('bolt', 1)) {
          this.cells -= P.bolt.cost;
          this.fireTimer = P.bolt.every;
        } else this.fireTimer = 0.1;
      } else if (input.wasPressed('attack')) this.combat.sfx?.play('plasmaEmpty', this);
      used = true;
    }
    if (input.isDown('attack')) used = true;
    this.rechargeCells(dt, used);
  }

  rechargeCells(dt, used) {
    const P = this.qc.plasma;
    this.idleFor = used ? 0 : this.idleFor + dt;
    if (this.idleFor >= P.rechargeDelay) this.cells = Math.min(P.cells, this.cells + P.recharge * dt);
  }

  rechargeIdle(dt) {
    this.rechargeCells(dt, false);
    const s = stepBoost(this.boostMeter, false, dt, this.qc.boost);
    this.boostMeter = s.meter;
    this.boostFx = Math.max(0, this.boostFx - dt * 3);
  }

  // Where the crosshair points (the first thing on its line, or far ahead).
  aimPoint(out) {
    const cam = this.player.camera;
    const eye = cam.position;
    const fwd = this.v.fwd;
    cam.getWorldDirection(fwd);
    const far = 90;
    this.colliders.query(eye.x + fwd.x * far * 0.5, eye.z + fwd.z * far * 0.5, far * 0.5 + 2, this.blockers);
    let t = rayBlockers(eye, fwd, this.blockers, far, this.ground);
    const hit = rayEnemies(eye, fwd, this.combat.weapons?.targets?.() ?? this.enemies.living, t);
    if (hit) t = hit.distance;
    return out.copy(fwd).multiplyScalar(Math.max(4, t)).add(eye);
  }

  // Can the emitters bear on where he's looking? (They face forward.)
  inArc() {
    return Math.abs(wrapAngle(this.player.yaw - this.heading)) <= this.qc.plasma.aimCone;
  }

  // Fire one from an emitter (a bolt) or both (an orb) toward the crosshair. Returns whether it went.
  shoot(kind, power) {
    if (!this.inArc()) {
      this.combat.sfx?.play('plasmaEmpty', this);
      return false;
    }
    const v = this.v;
    this.aimPoint(v.aim);
    this.mesh.updateMatrixWorld(true);
    const em = this.model.emitters;
    if (kind === 'orb') {
      em[0].muzzle.getWorldPosition(v.from);
      const b = em[1].muzzle.getWorldPosition(new THREE.Vector3());
      v.from.add(b).multiplyScalar(0.5);
    } else {
      em[this.emitterIndex].muzzle.getWorldPosition(v.from);
      this.emitterIndex = 1 - this.emitterIndex;
    }
    v.dir.subVectors(v.aim, v.from).normalize();
    const carry = { x: -Math.sin(this.heading) * this.speed * 0.6, z: -Math.cos(this.heading) * this.speed * 0.6 };
    this.plasma.fire(v.from, v.dir, kind, power, carry);
    this.firing = 1;
    this.combat.sfx?.play(kind === 'orb' ? 'plasmaOrb' : 'plasmaShot', this);
    this.player.kick?.(kind === 'orb' ? 1.2 : 0.25);
    this.player.shake(kind === 'orb' ? 0.5 : 0.08);
    this.enemies.alert(this.x, this.z, this.qc.plasma.noise * 0.6);
    return true;
  }

  // ---- riding ------------------------------------------------------------------------------------------

  drive(dt, input, player) {
    if (!(dt > 0)) return;
    const base = this.qc;
    const b = base.boost;
    const boost = this.boosting;
    const stuck = player.rooted || this.wheelSnare;
    if (this.wheelSnare) this.speed = 0;
    const move = stuck ? { x: 0, y: 0 } : input.getMove();
    // Boosting, it drives itself forward.
    const throttle = boost ? Math.max(1, move.y) : move.y;
    const steer = move.x;
    const brush = this.ground.undergrowthAt(this.x, this.z);
    const maxSpeed = boost ? b.speed : base.maxSpeed;
    const mult = boost ? b.brush : base.undergrowthMultiplier;
    const top = maxSpeed * (1 + (mult - 1) * brush);
    let target;
    if (throttle > 0.1) target = throttle * top;
    else if (throttle < -0.1) target = this.speed > 0.4 ? 0 : throttle * base.reverseSpeed;
    else target = 0;
    const braking = (throttle < -0.1 && this.speed > 0.4) || (target === 0 && this.speed !== 0) || this.speed > top + 0.5;
    const accel = boost ? b.acceleration : base.acceleration;
    const rate = braking ? (throttle < -0.1 ? base.brake : base.coast + (this.speed > top ? 6 : 0)) : accel;
    this.speed += Math.max(-rate * dt, Math.min(rate * dt, target - this.speed));
    // Steering: tighter slow, gentler fast (gentler still on the boost).
    const grip = Math.min(1, Math.abs(this.speed) / base.steerFullAt);
    const fast = Math.min(1, Math.abs(this.speed) / base.maxSpeed);
    const turn = -steer * base.steerRate * grip * (1 - base.steerFastLoss * fast) * (boost ? b.steer : 1) * Math.sign(this.speed) * dt;
    this.heading += turn;
    player.yaw += turn;
    this.steer += (steer - this.steer) * Math.min(1, dt * 10);
    this.lean += (steer * fast * 0.12 - this.lean) * Math.min(1, dt * 6);
    // Move, then out of whatever it ran into.
    const ax = -Math.sin(this.heading);
    const az = -Math.cos(this.heading);
    const want = { x: this.x + ax * this.speed * dt, z: this.z + az * this.speed * dt };
    const pos = { ...want };
    resolveCircles(pos, base.radius, this.colliders.query(pos.x, pos.z, base.radius, this.nearby), true);
    this.ground.clamp(pos);
    const pushed = Math.hypot(pos.x - want.x, pos.z - want.z);
    if (pushed > Math.abs(this.speed) * dt * 0.5 && Math.abs(this.speed) > base.bumpSpeed) {
      player.shake(Math.min(1.5, Math.abs(this.speed) / base.maxSpeed) * base.bumpShake);
      this.combat.sfx?.play('impact', pos);
      this.speed *= base.bumpKeep;
      if (this.boosting) {
        this.boosting = false; // a tree ends the boost
        this.combat.sfx?.play('boostEnd', this);
      }
    }
    this.x = pos.x;
    this.z = pos.z;
    this.spin -= (this.speed / base.wheel.radius) * dt;
    this.ram(dt, player);
    this.pose(dt);
    player.position.set(this.x - ax * base.seatBack, this.y + base.eyeHeight - player.eyeHeight, this.z - az * base.seatBack);
    player.velocity.x = ax * this.speed;
    player.velocity.z = az * this.speed;
    player.onGround = true;
    player.verticalSpeed = 0;
    const sp = Math.min(1.3, Math.abs(this.speed) / base.maxSpeed);
    this.combat.sfx?.engine?.(true, sp, Math.abs(throttle), 'alien', this.boostFx);
  }

  // Into the dead: harder on the boost.
  ram(dt, player) {
    const q = this.qc;
    const r = q.ram;
    if (Math.abs(this.speed) < r.minSpeed) return;
    const ax = -Math.sin(this.heading) * Math.sign(this.speed);
    const az = -Math.cos(this.heading) * Math.sign(this.speed);
    const fx = this.x + ax * 0.9;
    const fz = this.z + az * 0.9;
    const boost = this.boosting ? q.boost.ram : 1;
    const now = performance.now();
    for (const z of this.enemies.living) {
      if (z.rammedUntil > now) continue;
      if (Math.hypot(z.x - fx, z.z - fz) > r.reach + z.radius) continue;
      const k = Math.abs(this.speed) / q.maxSpeed;
      z.rammedUntil = now + 600;
      const mutant = z.kind === 'mutant';
      const killed = this.enemies.damage(z, r.damage * k * boost * (mutant ? r.mutantScale : 1), 'body', { id: 'alienQuad', stagger: r.stagger, knockback: r.knockback * k * boost }, { x: z.x, y: (z.y ?? 0) + 1, z: z.z }, { x: this.x, z: this.z });
      this.speed *= this.boosting ? 0.95 : mutant ? r.mutantKeep : r.keep;
      player.shake(r.shake);
      this.combat.sfx?.play('fenceHit', z);
      this.bus.emit('weapon:hit', { killed, part: 'body', melee: true });
      if (this.boosting) {
        const c = new THREE.Color(this.qc.look.vein).multiplyScalar(2);
        this.combat.fx?.emit?.(z.x, (z.y ?? 0) + 1, z.z, 10, c, 5);
      }
    }
  }

  pose(dt) {
    super.pose(dt);
    const m = this.model;
    m.body.rotation.z = this.lean;
    m.body.rotation.x = this.boostFx * 0.035; // the nose lifts on the boost
    for (const w of m.wheels) {
      w.spin.rotation.x = this.spin;
      w.group.rotation.y = w.front ? -this.steer * 0.45 : 0;
    }
  }

  // The neon, the cores, the flame, the holo ring, the underglow.
  glow() {
    if (this.stored) return;
    this.model.setGlow(this.time, {
      riding: this.riding,
      boost: this.boostFx,
      charge: this.charge,
      cells: this.cells,
      boostMeter: this.boostMeter,
      firing: this.firing,
    });
    const u = this.qc.underglow;
    if (this.underglow) this.underglow.intensity = u.intensity * (this.riding ? 1 + this.boostFx * 1.5 : 0.4) * (0.85 + 0.15 * Math.sin(this.time * 3));
  }

  snareWheel(trap) {
    if (this.boosting) return false; // too fast to catch
    return super.snareWheel(trap);
  }

  updateHud(input) {
    if (!this.vhud) return;
    if (!this.riding) {
      this.vhud.hide(this);
      return;
    }
    const pad = input.activeDevice === 'gamepad';
    this.vhud.show(this, 'alien', {
      speed: Math.abs(this.speed) * 3.6,
      boost: this.boostMeter,
      boosting: this.boostFx,
      cells: this.cells,
      cellsMax: this.qc.plasma.cells,
      charge: this.charge,
      canOrb: this.cells >= this.qc.plasma.orb.cost,
      inArc: this.inArc(),
      hint: pad ? 'RT plasma · hold LT orb · L3/A boost · hold X off' : 'Mouse plasma · hold Right orb · Shift boost · hold E off',
    });
  }

  // ---- debug ---------------------------------------------------------------------------------------------

  bring() {
    if (this.riding) return;
    const p = this.player;
    const ax = -Math.sin(p.yaw);
    const az = -Math.cos(p.yaw);
    this.place(p.position.x + ax * 3, p.position.z + az * 3, p.yaw);
    this.notify?.('The alien quad is in front of you');
  }

  addDebugItems(menu) {
    const cat = menu.category(DEBUG.experimental);
    cat.addItem('Alien quad: bring it here', () => this.bring());
    cat.addItem('Alien quad: put me on it', () => {
      if (this.player.riding && this.player.riding !== this) return;
      if (this.stored) this.bring();
      this.mount();
    });
    cat.addItem('Alien quad: refill cells and boost', () => {
      this.cells = this.qc.plasma.cells;
      this.boostMeter = 1;
    });
    cat.addItem('Alien quad: send it away', () => {
      if (this.riding) this.dismount();
      this.reset();
    });
  }

  overlayLine() {
    if (this.stored) return 'alien quad away';
    return `alien quad ${this.riding ? `${(Math.abs(this.speed) * 3.6).toFixed(0)} km/h` : 'parked'} boost ${Math.round(this.boostMeter * 100)}%${this.boosting ? ' BURNING' : ''} cells ${this.cells.toFixed(1)} charge ${Math.round(this.charge * 100)}% plasma ${this.plasma.flying}`;
  }

  dispose() {
    for (const off of this.unsubscribers ?? []) off();
    this.combat?.sfx?.engine?.(false);
    if (this.collider) this.collider.off = true;
    this.lamp?.dispose();
    this.underglow?.dispose();
    this.plasma?.dispose();
    this.model?.dispose();
  }
}

