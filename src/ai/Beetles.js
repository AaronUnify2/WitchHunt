// Giant beetles (Session 17, M9.4; DESIGN.md "Giant beetles", "Overrun
// military outpost" beat 9): the Mothman's brood, the player's first live
// ones, crated in the outpost's compound. Armoured: a shot to the shell does
// little; the soft spot on the face (between the mandibles, glowing) takes
// full damage, so the player has to face one and aim.
//
// States (render/BeetleRenderer.js poses each): emerge (clawing out of its
// broken crate) -> threat (wing cases flared, a hiss) -> charge (at Tom) ->
// attack (rears up, lunges, snaps: a hit if he's still in reach) -> charge
// again; flinch (a shot to the face staggers it); dying -> corpse.
// Up a platform (the watchtower) Tom's out of reach: they mill below.
//
// They're the weapons' extra targets (Weapons.extraTargets: { group }): a
// low body cylinder, no head, the weak spot a sphere out in front
// (combat/hitscan.js rayWeakSpot with a negative `back`).
//
// Events: 'beetle:out' { beetle }, 'beetle:hit' { beetle, part, killed },
// 'beetle:killed' { beetle }.

import { resolveCircles } from '../world/collision.js';
import { BeetleRenderer } from '../render/BeetleRenderer.js';

let nextSeed = 1;

export class Beetles {
  // cfg: the whole config (config.beetles.giant: the look; config.beetles.ai: the rest).
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.ac = cfg.beetles.ai;
    this.bus = bus;
    this.list = [];
    this.nearby = [];
  }

  // ctx: { player, combat, colliders, ground }.
  init(scene, ctx) {
    Object.assign(this, ctx);
    if (scene) {
      this.renderer = new BeetleRenderer(this.cfg.beetles.giant);
      this.renderer.init(scene);
    }
    // The weapons can hit them.
    this.target = { group: this.list };
    this.combat?.weapons?.extraTargets?.push(this.target);
  }

  // One out of the ground (its crate) at (x, z), facing yaw (radians, +z at 0).
  // Session 30: opts { space, y, floorAt(x, z, y), confine(pos, y, r), state }: one inside an interior (the mine).
  spawn(x, z, facing = 0, opts = null) {
    const a = this.ac;
    const b = {
      space: opts?.space ?? null,
      room: opts,
      active: true,
      alive: true,
      targetable: true,
      x,
      z,
      y: opts?.space ? (opts.y ?? 0) : this.ground.heightAt(x, z),
      facing,
      state: opts?.state ?? 'emerge',
      timer: 0,
      walked: 0,
      flash: 0,
      sink: 1,
      seed: nextSeed++ * 1.7,
      health: a.health,
      cooldown: 0,
      struck: false,
      // The hit shape (combat/hitscan.js): a low cylinder, no head to speak of, the face's soft spot out in front.
      hitRadius: a.hitRadius,
      headBottom: a.height,
      height: a.height + 0.01,
      headRadius: 0.01,
      headshotMultiplier: 1,
      weakSpot: { back: -a.spotAhead, height: a.spotHeight, radius: a.spotRadius, multiplier: a.weakMultiplier },
      noAssist: false,
    };
    b.takeHit = (amount, part, weapon, at, from) => this.hit(b, amount, part, weapon, at, from);
    this.list.push(b);
    this.bus.emit('beetle:out', { beetle: b });
    return b;
  }

  get living() {
    return this.list.filter((b) => b.alive);
  }

  // A shot or a swing. The shell takes `armour` of it; the face (the weak spot) all of it.
  hit(b, amount, part, weapon, at, from) {
    if (!b.alive) return false;
    const a = this.ac;
    const dmg = part === 'weak' ? amount : amount * a.armour;
    b.health -= dmg;
    b.flash = this.cfg.beetles.giant.hitFlashSeconds;
    const killed = b.health <= 0;
    if (killed) {
      b.alive = false;
      b.targetable = false;
      b.state = 'dying';
      b.timer = 0;
      this.bus.emit('beetle:killed', { beetle: b });
    } else if (part === 'weak' && b.state !== 'emerge') {
      b.state = 'flinch';
      b.timer = 0;
    }
    // Blood on a weak hit; a ricochet off the shell.
    if (at) this.bus.emit('enemy:hit', { x: at.x, y: at.y, z: at.z, part: part === 'weak' ? 'weak' : 'helmet', killed });
    this.bus.emit('beetle:hit', { beetle: b, part, killed });
    return killed;
  }

  update(dt, playing) {
    if (playing) {
      const p = this.player.position;
      const up = Boolean(this.player.platform);
      const dead = !this.combat?.alive;
      // Session 30: one in the interior Tom's in can reach him (its platform is the floor they share).
      for (const b of this.list) this.step(b, dt, p, dead || (b.space ? b.space !== this.player.space : up));
    }
    this.renderer?.update(this.list, playing ? dt : 0);
  }

  step(b, dt, p, safe) {
    const a = this.ac;
    const g = this.cfg.beetles.giant;
    b.flash = Math.max(0, b.flash - dt);
    b.timer += dt;
    if (b.state === 'corpse') return;
    if (b.state === 'dying') {
      if (b.timer >= g.deathSeconds) b.state = 'corpse';
      return;
    }
    const dx = p.x - b.x;
    const dz = p.z - b.z;
    const d = Math.hypot(dx, dz);
    const want = Math.atan2(dx, dz);
    switch (b.state) {
      case 'emerge':
        b.sink = Math.max(0, 1 - b.timer / a.emergeSeconds);
        if (b.timer >= a.emergeSeconds) {
          b.sink = 0;
          b.state = 'threat';
          b.timer = 0;
          this.combat?.sfx?.play('beetleHiss', b);
        }
        return;
      case 'threat':
        b.facing = turn(b.facing, want, a.turnRate * dt);
        if (b.timer >= a.threatSeconds) this.go(b, 'charge');
        return;
      case 'flinch':
        if (b.timer >= a.flinchSeconds) this.go(b, 'charge');
        return;
      case 'attack': {
        b.facing = turn(b.facing, want, a.turnRate * 0.4 * dt);
        const strikeAt = g.attackWindup + g.strikeSeconds * 0.5;
        if (!b.struck && b.timer >= strikeAt) {
          b.struck = true;
          this.combat?.sfx?.play('beetleSnap', b);
          const ahead = Math.cos(want - b.facing) > 0.5;
          if (!safe && d <= a.reach && ahead) this.combat?.hurtPlayer(a.damage, 1.5);
        }
        if (b.timer >= g.attackWindup + g.strikeSeconds + a.recover) {
          b.cooldown = a.cooldown;
          this.go(b, 'charge');
        }
        return;
      }
      default:
        break;
    }
    // Charging (or walking, cooling off after a strike).
    b.cooldown = Math.max(0, b.cooldown - dt);
    b.facing = turn(b.facing, want, a.turnRate * dt);
    if (!safe && d <= a.attackRange && b.cooldown <= 0) {
      this.go(b, 'attack');
      return;
    }
    const speed = b.cooldown > 0 || safe ? a.walkSpeed : a.speed;
    b.state = b.cooldown > 0 || safe ? 'walk' : 'charge';
    // Don't climb onto him: stop just short.
    const stop = safe ? 1.6 : a.attackRange * 0.7;
    const move = Math.max(0, Math.min(speed * dt, d - stop));
    const pos = { x: b.x + Math.sin(b.facing) * move, z: b.z + Math.cos(b.facing) * move };
    if (b.space) b.room.confine?.(pos, b.y, a.radius);
    else {
      if (this.colliders) resolveCircles(pos, a.radius, this.colliders.query(pos.x, pos.z, a.radius, this.nearby));
      this.ground?.clamp?.(pos);
    }
    b.walked += Math.hypot(pos.x - b.x, pos.z - b.z);
    b.x = pos.x;
    b.z = pos.z;
    b.y = b.space ? (b.room.floorAt?.(b.x, b.z, b.y) ?? b.y) : this.ground.heightAt(b.x, b.z);
  }

  go(b, state) {
    b.state = state;
    b.timer = 0;
    b.struck = false;
  }

  // All gone (the debug reset).
  clear() {
    this.list.length = 0;
  }

  overlayLine() {
    const alive = this.list.filter((b) => b.alive);
    return `beetles ${alive.length}/${this.list.length}${alive.length ? ` ${alive.map((b) => `${b.state}:${Math.round(b.health)}`).join(',')}` : ''}`;
  }

  dispose() {
    const xs = this.combat?.weapons?.extraTargets;
    if (xs) {
      const i = xs.indexOf(this.target);
      if (i >= 0) xs.splice(i, 1);
    }
    this.renderer?.dispose?.();
  }
}

// From one yaw toward another by at most `step` radians.
function turn(from, to, step) {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return from + Math.max(-step, Math.min(step, d));
}
