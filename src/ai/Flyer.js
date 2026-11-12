// Session 22 (M10.3 spike, debug only): a flying enemy, the Mothman's
// flyovers and dives (DESIGN.md "The Mothman"). Rough on purpose: it
// answers "can a flyer move, read, be shot and hurt Tom, cheaply?", not
// what the Mothman looks like or how his fights are scripted.
//
//  - It works through a script (config.spikes.flyer.script): passes over
//    Tom, circling between, then dives that strike if they reach him; then
//    it leaves. Its steering is ai/flyerPath.js (tested).
//  - It's one of the weapons' extra targets (the zombies' hit shape, high
//    up). It can't die out here: below fleeAt of its health it flies off.
//  - Its look: the Mothman's model (Session 24; render/MothmanRenderer.js):
//    one draw call, no lights, red eyes that aren't fogged.
//
// Events: 'flyer:struck' { damage }, 'flyer:left' { hurt }.

import { DEBUG, ENEMY_TABS } from '../debug/DebugMenu.js';
import { MothmanRenderer } from '../render/MothmanRenderer.js';
import { steerTo, circlePoint, passEnd, climbEnd, nextMove } from './flyerPath.js';

export class Flyer {
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.fc = cfg.spikes.flyer;
    this.bus = bus;
    this.active = false;
  }

  // ctx: { scene, player, combat, sfx, notify, rng }.
  init(ctx) {
    Object.assign(this, ctx);
    this.build();
    this.p = { x: 0, y: 0, z: 0 };
    this.v = { x: 0, y: 0, z: 0 };
    const f = this.fc;
    // The weapons' extra target: the hit shape round its body's foot.
    this.target = {
      x: 0,
      y: 0,
      z: 0,
      targetable: false,
      alive: true,
      hitRadius: f.hitRadius,
      height: f.height,
      headBottom: f.headBottom,
      headRadius: f.headRadius,
      headshotMultiplier: f.headshotMultiplier,
      noAssist: true, // the aim doesn't stick to it: a fast flyer should be hard to track
      takeHit: (amount, part) => this.hit(amount, part),
    };
    this.combat.weapons.extraTargets.push(this.target);
  }

  // Its look: the Mothman's model (render/MothmanRenderer.js), posed by what it's doing.
  build() {
    this.renderer = new MothmanRenderer(this.cfg.mothman);
    this.renderer.init(this.scene, 1);
    this.look = { active: false, x: 0, y: 0, z: 0, facing: 0, state: 'glide', timer: 0, flap: 0, pitch: 0, roll: 0, flash: 0 };
    this.flap = 0;
    this.flash = 0;
    this.strikeShow = 0;
  }

  // ---- starting and stopping ----------------------------------------------------------------------

  // In from far off, on its script. Session 25: opts { script } (the crashed plane's Mothman, story: true).
  send(opts = {}) {
    const f = this.fc;
    this.script = opts.script ?? f.script;
    this.story = Boolean(opts.story);
    this.unbeatable = Boolean(opts.unbeatable); // Session 32: the Mothman at the plane: it flinches, it never leaves
    const t = this.player.position;
    const a = this.rng.range(0, Math.PI * 2);
    this.p.x = t.x + Math.sin(a) * f.startDistance;
    this.p.z = t.z + Math.cos(a) * f.startDistance;
    this.p.y = t.y + f.circleHeight + 6;
    this.v.x = this.v.y = this.v.z = 0;
    this.health = f.health;
    this.index = 0;
    this.active = true;
    this.hurt = false;
    this.target.targetable = true;
    this.look.active = true;
    this.look.mothPose = null;
    this.begin('circle');
    this.moveTimer = this.rng.range(f.circleSeconds[0], f.circleSeconds[1]) + 3;
  }

  // Build queue item 2: hooked on a cable (the dozer's winch at the station). It thrashes round `at`
  // ({ x, y, z }: the fairlead) at radius and height, can't leave and can't dive; its health is `health` now
  // and every hit is the owner's to count: onHit(amount), onDown() at zero.
  tether(at, { radius, height, speed, health, onHit = null, onDown = null }) {
    this.tethered = { at, radius, height, speed, onHit, onDown };
    this.unbeatable = false;
    this.health = health;
    this.move = 'tether';
    this.angle = Math.atan2(this.p.x - at.x, this.p.z - at.z);
    this.sfx?.play('screech', this.p);
  }

  stop() {
    this.tethered = null;
    this.active = false;
    this.target.targetable = false;
    this.look.active = false;
    this.renderer.update([this.look], 0);
  }

  begin(move) {
    const f = this.fc;
    const t = this.player.position;
    this.move = move;
    if (move === 'circle') {
      this.angle = Math.atan2(this.p.x - t.x, this.p.z - t.z);
      this.moveTimer = this.rng.range(f.circleSeconds[0], f.circleSeconds[1]);
    } else if (move === 'flyover') {
      this.goal = passEnd(this.p, t.x, t.y, t.z, f.flyoverPast, f.flyoverHeight);
    } else if (move === 'dive') {
      this.sfx?.play('screech', this.p);
    } else if (move === 'climb') {
      this.goal = climbEnd(this.p, this.v, t.y, f.climbDistance, f.circleHeight);
    } else if (move === 'leave') {
      const d = Math.hypot(this.p.x - t.x, this.p.z - t.z) || 1;
      this.goal = { x: this.p.x + ((this.p.x - t.x) / d) * f.leaveDistance * 2, y: t.y + 40, z: this.p.z + ((this.p.z - t.z) / d) * f.leaveDistance * 2 };
    }
  }

  // The script's next move, with a circle between each.
  advance() {
    if (this.move === 'circle') {
      const script = this.script ?? this.fc.script;
      let next = nextMove(script, this.index++);
      if (next === 'leave' && this.unbeatable) next = script[script.length - 1]; // Session 32: it doesn't tire
      this.begin(next);
    } else {
      this.begin('circle');
    }
  }

  // ---- each frame --------------------------------------------------------------------------------

  update(dt, playing) {
    if (!this.active) return;
    const f = this.fc;
    if (playing) this.fly(dt);
    // The look: facing where it's going, banked into its turns, nose up
    // or down with its climb, the wings beating faster in a dive.
    const k = this.look;
    const heading = Math.atan2(this.v.x, this.v.z);
    let turned = heading - k.facing;
    turned -= Math.round(turned / (Math.PI * 2)) * Math.PI * 2;
    const bank = dt > 0 ? Math.max(-f.bankMax, Math.min(f.bankMax, (-turned / dt) * f.bank)) : k.roll;
    k.roll += (bank - k.roll) * Math.min(1, dt * 4);
    k.x = this.p.x;
    k.y = this.p.y;
    k.z = this.p.z;
    k.facing = heading;
    k.pitch = Math.max(-0.6, Math.min(0.6, -this.v.y * 0.04));
    this.strikeShow = Math.max(0, this.strikeShow - dt);
    k.state = this.strikeShow > 0 ? 'strike' : this.move === 'dive' ? 'dive' : this.move === 'circle' ? 'glide' : 'fly';
    k.timer = f.strikeShowSeconds - this.strikeShow;
    const fast = this.move === 'dive' ? 1 : this.move === 'flyover' ? 0.5 : 0.15;
    const hz = f.flapHz[0] + (f.flapHz[1] - f.flapHz[0]) * fast;
    const before = Math.sin(this.flap);
    this.flap += dt * hz * Math.PI * 2;
    const beat = Math.sin(this.flap);
    k.flap = this.flap;
    if (before > 0 && beat <= 0 && playing) this.sfx?.play('wingbeat', this.p);
    this.flash = Math.max(0, this.flash - dt);
    k.flash = this.flash * (this.cfg.mothman.hitFlashSeconds / f.hitFlashSeconds);
    this.renderer.update([k], dt);
    // The hit shape follows the body (its foot a little under the body's middle).
    const tg = this.target;
    tg.x = this.p.x;
    tg.y = this.p.y - f.height * 0.55;
    tg.z = this.p.z;
  }

  fly(dt) {
    const f = this.fc;
    const t = this.player.position;
    if (this.move === 'circle') {
      this.angle += (f.circleSpeed / f.circleRadius) * dt;
      steerTo(this.p, this.v, circlePoint(t.x, t.y, t.z, f.circleRadius, f.circleHeight, this.angle), f.circleSpeed, f.steer, dt);
      this.moveTimer -= dt;
      if (this.moveTimer <= 0) this.advance();
    } else if (this.move === 'tether') {
      // Round and round on the cable, jerking up and down against it.
      const T = this.tethered;
      this.angle += (T.speed / T.radius) * dt;
      const lift = Math.sin(this.angle * 3.1) * 2.2;
      steerTo(this.p, this.v, circlePoint(T.at.x, T.at.y, T.at.z, T.radius, T.height + lift, this.angle), T.speed, f.steer * 1.5, dt);
    } else if (this.move === 'flyover') {
      if (steerTo(this.p, this.v, this.goal, f.flyoverSpeed, f.steer, dt) < 4) this.advance();
    } else if (this.move === 'dive') {
      const aim = { x: t.x, y: t.y + f.diveAt, z: t.z };
      const d = steerTo(this.p, this.v, aim, f.diveSpeed, f.steer * 1.6, dt);
      if (d < f.strikeRange) {
        this.combat.hurtPlayer(f.strikeDamage, 1.5);
        this.bus.emit('flyer:struck', { damage: f.strikeDamage });
        this.strikeShow = f.strikeShowSeconds;
        this.begin('climb');
      } else if (this.p.y < t.y + 0.3) {
        this.begin('climb'); // missed, at the ground: pull up
      }
    } else if (this.move === 'climb') {
      if (steerTo(this.p, this.v, this.goal, f.climbSpeed, f.steer, dt) < 4) this.advance();
    } else if (this.move === 'leave') {
      steerTo(this.p, this.v, this.goal, f.leaveSpeed, f.steer, dt);
      if (Math.hypot(this.p.x - t.x, this.p.z - t.z) > f.leaveDistance) {
        this.stop();
        this.bus.emit('flyer:left', { hurt: this.hurt });
      }
    }
  }

  // A shot or a swing. It can't die: hurt enough, it leaves.
  hit(amount) {
    if (!this.active || this.move === 'leave') return false;
    this.health -= amount;
    this.flash = this.fc.hitFlashSeconds;
    if (this.tethered) {
      this.tethered.onHit?.(amount);
      if (this.health <= 0) {
        const down = this.tethered.onDown;
        this.tethered.onHit = null;
        this.tethered.onDown = null;
        down?.();
      }
      return false;
    }
    if (this.unbeatable) {
      this.health = Math.max(this.fc.health * this.fc.fleeAt + 1, this.health);
      return false;
    }
    if (this.health <= this.fc.health * this.fc.fleeAt) {
      this.hurt = true;
      this.begin('leave');
      this.notify?.('It shrieks and flies off, hurt');
    }
    return false;
  }

  // ---- debug -------------------------------------------------------------------------------------

  addDebugItems(menu) {
    const sp = menu.tab(DEBUG.enemies, ENEMY_TABS.mothman); // Session 25: the Enemies menu
    sp.addItem(() => `Flyer: send one at me (${this.active ? `${this.move}, health ${Math.round(this.health)}` : 'none up'})`, () => this.send());
    sp.addItem('Flyer: send it away', () => this.active && this.begin('leave'));
  }

  overlayLine() {
    if (!this.active) return 'flyer -';
    const t = this.player.position;
    return `flyer ${this.move} ${this.index}/${(this.script ?? this.fc.script).length} hp ${Math.round(this.health)} up ${(this.p.y - t.y).toFixed(0)}m off ${Math.hypot(this.p.x - t.x, this.p.z - t.z).toFixed(0)}m`;
  }

  dispose() {
    this.renderer?.dispose();
  }
}
