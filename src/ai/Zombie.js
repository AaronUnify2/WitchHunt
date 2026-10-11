// One zombie (pure logic, no rendering): a normal zombie or a mutant,
// with its own size, health, reach and swipe timing set when it spawns.
// It climbs out of the ground beside its sigil, then walks where its
// brain points it (EnemyManager and ZombieBrain set `mode` and the goal):
//  - 'chase': straight at the player, swiping when in reach;
//  - 'search' / 'wander': toward (goalX, goalZ), never swiping.
// Hit: flinches and staggers. Killed: falls, lies as a corpse, sinks away
// and returns to the pool. At dawn it can burrow back into the ground.
//
// States: 'free' (in the pool), 'rise', 'walk', 'attack', 'stagger',
// 'dying', 'corpse', 'burrow'. Facing is an angle on the ground plane:
// direction (sin a, cos a).

// Sprite frame columns in the zombie atlas (see render/zombieSprite.js).
export const ZOMBIE_FRAMES = {
  walk: [0, 1, 2, 3],
  attackWindup: 4,
  attackStrike: 5,
  stagger: 6,
  dying: [7, 8, 9, 10],
  corpse: 10,
  count: 11,
};

const ALIVE = new Set(['rise', 'walk', 'attack', 'stagger']);

// Roll a zombie's speed (m/s) for a level: a multiple of the player's
// sprint, skewed toward the slow end (DESIGN.md "Speed variance").
export function rollSpeed(levelCfg, sprintSpeed, skew, rng) {
  const t = Math.pow(rng.next(), skew);
  return sprintSpeed * (levelCfg.speedMin + (levelCfg.speedMax - levelCfg.speedMin) * t);
}

export class Zombie {
  constructor(zombieConfig) {
    this.cfg = zombieConfig;
    this.state = 'free';
    this.x = 0;
    this.y = 0; // ground height under it (set by EnemyManager)
    this.z = 0;
    this.moveScale = 1; // set each frame by EnemyManager (undergrowth slows it)
    // Reused circle for the torch's glare check (no allocation per frame).
    this.glareCircle = { x: 0, z: 0, r: zombieConfig.hitRadius, vr: zombieConfig.hitRadius, base: 0, top: zombieConfig.height };
    this.applyBody(zombieConfig);
  }

  // Size and fighting numbers: the zombie config, or a mutant's (any
  // field missing from `s` falls back to the zombie config).
  applyBody(s) {
    const c = this.cfg;
    this.radius = s.radius ?? c.radius;
    // Hit shape for hitscan (read by combat/hitscan.js).
    this.hitRadius = s.hitRadius ?? c.hitRadius;
    this.height = s.height ?? c.height;
    this.headBottom = s.headBottom ?? c.headBottom;
    this.headRadius = s.headRadius ?? c.headRadius;
    this.attackReach = s.attackReach ?? c.attackReach;
    this.attackWindup = s.attackWindup ?? c.attackWindup;
    this.attackRecover = s.attackRecover ?? c.attackRecover;
    this.attackDamage = s.attackDamage ?? c.attackDamage;
    this.turnRate = s.turnRate ?? c.turnRate;
    this.staggerScale = s.staggerScale ?? 1;
    this.knockbackScale = s.knockbackScale ?? 1;
    this.glareCircle.r = this.hitRadius;
    this.glareCircle.vr = this.hitRadius;
  }

  // opts: { kind ('zombie' | 'mutant'), variant, health, body (a mutant's
  // config), rise (climb out of the ground first), mode }.
  spawn(x, z, facing, speed, opts = {}) {
    this.kind = opts.kind ?? 'zombie';
    this.variant = opts.variant ?? 'citizen';
    this.applyBody(opts.body ?? this.cfg);
    this.state = opts.rise ? 'rise' : 'walk';
    this.x = x;
    this.z = z;
    this.facing = facing;
    this.speed = speed;
    this.maxHealth = opts.health ?? this.cfg.health;
    this.health = this.maxHealth;
    this.mode = opts.mode ?? 'chase';
    this.pace = 1; // speed multiplier for the mode (wandering is slower)
    this.goalX = x;
    this.goalZ = z;
    this.hasGoal = false;
    this.timer = 0;
    this.struck = false;
    this.walked = 0; // metres, drives the walk cycle
    this.kbX = 0; // knockback still to apply
    this.kbZ = 0;
    this.flash = 0;
    this.sink = opts.rise ? 1 : 0; // 0..1, how far into the ground (rising, burrowing, a sinking corpse)
  }

  get alive() {
    return ALIVE.has(this.state);
  }

  get active() {
    return this.state !== 'free';
  }

  // player: { x, z }. onStrike(zombie) is called when a swipe lands while
  // the player is still in reach.
  update(dt, player, onStrike) {
    const c = this.cfg;
    this.flash = Math.max(0, this.flash - dt);
    this.applyKnockback(dt);

    switch (this.state) {
      case 'rise':
        this.timer += dt;
        this.sink = Math.max(0, 1 - this.timer / (c.riseSeconds ?? 1.5));
        if (this.sink === 0) {
          this.state = 'walk';
          this.timer = 0;
        }
        break;
      case 'walk':
        if (this.mode === 'chase') this.walkToPlayer(dt, player);
        else if (this.hasGoal) this.walkToGoal(dt);
        break;
      case 'attack': {
        const dx = player.x - this.x;
        const dz = player.z - this.z;
        this.turnToward(dx, dz, dt);
        this.timer += dt;
        if (!this.struck && this.timer >= this.attackWindup) {
          this.struck = true;
          if (Math.hypot(dx, dz) <= this.attackReach) onStrike?.(this);
        }
        if (this.timer >= this.attackWindup + this.attackRecover) this.state = 'walk';
        break;
      }
      case 'stagger':
        this.timer -= dt;
        if (this.timer <= 0) this.state = 'walk';
        break;
      case 'dying':
        this.timer += dt;
        if (this.timer >= c.deathSeconds) {
          this.state = 'corpse';
          this.timer = 0;
        }
        break;
      case 'corpse':
        this.timer += dt;
        this.sink = Math.max(0, (this.timer - (c.corpseSeconds - c.corpseSinkSeconds)) / c.corpseSinkSeconds);
        if (this.timer >= c.corpseSeconds) this.state = 'free';
        break;
      case 'burrow':
        this.timer += dt;
        this.sink = Math.min(1, this.timer / (c.burrowSeconds ?? 2.5));
        if (this.sink >= 1) this.state = 'free';
        break;
      default:
        break;
    }
  }

  walkToPlayer(dt, player) {
    const dx = player.x - this.x;
    const dz = player.z - this.z;
    const dist = Math.hypot(dx, dz);
    this.turnToward(dx, dz, dt);
    if (dist <= this.attackReach) {
      this.state = 'attack';
      this.timer = 0;
      this.struck = false;
      return;
    }
    this.stepForward(Math.min(this.speed * this.pace * this.moveScale * dt, dist - this.attackReach * 0.9));
  }

  walkToGoal(dt) {
    const dx = this.goalX - this.x;
    const dz = this.goalZ - this.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 1e-3) return;
    this.turnToward(dx, dz, dt);
    this.stepForward(Math.min(this.speed * this.pace * this.moveScale * dt, dist));
  }

  stepForward(step) {
    if (step <= 0) return;
    this.x += Math.sin(this.facing) * step;
    this.z += Math.cos(this.facing) * step;
    this.walked += step;
  }

  // Sink back into the ground (dawn). No corpse, no loot.
  burrow() {
    if (!this.alive) return;
    this.state = 'burrow';
    this.timer = this.sink * (this.cfg.burrowSeconds ?? 2.5);
  }

  // Take a hit. from: { x, z } where it came from (for knockback).
  // Returns true if this hit killed it.
  hit(damage, stagger, knockback, from) {
    if (!this.alive) return false;
    this.health -= damage;
    this.flash = this.cfg.hitFlashSeconds;
    const max = this.cfg.maxKnockback;
    const dx = this.x - from.x;
    const dz = this.z - from.z;
    const len = Math.hypot(dx, dz) || 1;
    const push = Math.min(knockback * this.knockbackScale, max);
    this.kbX = Math.max(-max, Math.min(max, this.kbX + (dx / len) * push));
    this.kbZ = Math.max(-max, Math.min(max, this.kbZ + (dz / len) * push));
    if (this.health <= 0) {
      this.state = 'dying';
      this.timer = 0;
      this.sink = 0;
      return true;
    }
    // A hit interrupts a swipe that hasn't landed, and stuns for a moment
    // (not while it's still climbing out of the ground).
    const stun = stagger * this.staggerScale;
    if (stun > 0 && this.state !== 'rise' && !(this.state === 'attack' && this.struck)) {
      const left = this.state === 'stagger' ? this.timer : 0;
      this.state = 'stagger';
      this.timer = Math.max(left, stun);
    }
    return false;
  }

  applyKnockback(dt) {
    if (this.kbX === 0 && this.kbZ === 0) return;
    const k = Math.min(1, this.cfg.knockbackSpeed * dt);
    const mx = this.kbX * k;
    const mz = this.kbZ * k;
    this.x += mx;
    this.z += mz;
    this.kbX -= mx;
    this.kbZ -= mz;
    if (Math.abs(this.kbX) < 1e-3 && Math.abs(this.kbZ) < 1e-3) this.kbX = this.kbZ = 0;
  }

  turnToward(dx, dz, dt) {
    if (dx === 0 && dz === 0) return;
    const want = Math.atan2(dx, dz);
    let diff = want - this.facing;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff)); // wrap to -pi..pi
    this.facing += diff * Math.min(1, this.turnRate * dt);
  }

  // The atlas column to draw this frame.
  get frame() {
    const f = ZOMBIE_FRAMES;
    switch (this.state) {
      case 'rise':
      case 'burrow':
        return f.walk[0];
      case 'walk':
        return f.walk[Math.floor(this.walked * this.cfg.walkFrameRate * f.walk.length) % f.walk.length];
      case 'attack':
        return this.struck ? f.attackStrike : f.attackWindup;
      case 'stagger':
        return f.stagger;
      case 'dying':
        return f.dying[Math.min(f.dying.length - 1, Math.floor((this.timer / this.cfg.deathSeconds) * f.dying.length))];
      default:
        return f.corpse;
    }
  }
}
