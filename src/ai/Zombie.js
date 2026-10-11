// One zombie (pure logic, no rendering). M2 behaviour: walk straight at
// the player, swipe when in reach, flinch and stagger when hit, fall when
// killed, then lie as a corpse until it sinks away and returns to the pool.
// Detection, targeting and pathing come in M4.
//
// States: 'free' (in the pool), 'walk', 'attack', 'stagger', 'dying', 'corpse'.
// Facing is an angle on the ground plane: direction (sin a, cos a).

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

const ALIVE = new Set(['walk', 'attack', 'stagger']);

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
    // Hit shape for hitscan (read by combat/hitscan.js).
    this.hitRadius = zombieConfig.hitRadius;
    this.height = zombieConfig.height;
    this.headBottom = zombieConfig.headBottom;
    this.headRadius = zombieConfig.headRadius;
    this.x = 0;
    this.y = 0; // ground height under it (set by EnemyManager)
    this.z = 0;
    this.moveScale = 1; // set each frame by EnemyManager (undergrowth slows it)
    // Reused circle for the torch's glare check (no allocation per frame).
    this.glareCircle = { x: 0, z: 0, r: zombieConfig.hitRadius, vr: zombieConfig.hitRadius, base: 0, top: zombieConfig.height };
  }

  spawn(x, z, facing, speed) {
    this.state = 'walk';
    this.x = x;
    this.z = z;
    this.facing = facing;
    this.speed = speed;
    this.health = this.cfg.health;
    this.timer = 0;
    this.struck = false;
    this.walked = 0; // metres, drives the walk cycle
    this.kbX = 0; // knockback still to apply
    this.kbZ = 0;
    this.flash = 0;
    this.sink = 0; // 0..1, corpse sinking into the ground
  }

  get alive() {
    return ALIVE.has(this.state);
  }

  get active() {
    return this.state !== 'free';
  }

  // target: { x, z } (the player). onStrike(zombie) is called when a swipe
  // lands while the target is still in reach.
  update(dt, target, onStrike) {
    const c = this.cfg;
    this.flash = Math.max(0, this.flash - dt);
    this.applyKnockback(dt);
    const dx = target.x - this.x;
    const dz = target.z - this.z;
    const dist = Math.hypot(dx, dz);

    switch (this.state) {
      case 'walk':
        this.turnToward(dx, dz, dt);
        if (dist <= c.attackReach) {
          this.state = 'attack';
          this.timer = 0;
          this.struck = false;
        } else {
          const step = Math.min(this.speed * this.moveScale * dt, dist - c.attackReach * 0.9);
          this.x += Math.sin(this.facing) * step;
          this.z += Math.cos(this.facing) * step;
          this.walked += step;
        }
        break;
      case 'attack':
        this.turnToward(dx, dz, dt);
        this.timer += dt;
        if (!this.struck && this.timer >= c.attackWindup) {
          this.struck = true;
          if (dist <= c.attackReach) onStrike?.(this);
        }
        if (this.timer >= c.attackWindup + c.attackRecover) this.state = 'walk';
        break;
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
      default:
        break;
    }
  }

  // Take a hit. from: { x, z } where it came from (for knockback).
  // Returns true if this hit killed it.
  hit(damage, stagger, knockback, from) {
    if (!this.alive) return false;
    this.health -= damage;
    this.flash = this.cfg.hitFlashSeconds;
    const dx = this.x - from.x;
    const dz = this.z - from.z;
    const len = Math.hypot(dx, dz) || 1;
    const push = Math.min(knockback, this.cfg.maxKnockback);
    this.kbX = Math.max(-this.cfg.maxKnockback, Math.min(this.cfg.maxKnockback, this.kbX + (dx / len) * push));
    this.kbZ = Math.max(-this.cfg.maxKnockback, Math.min(this.cfg.maxKnockback, this.kbZ + (dz / len) * push));
    if (this.health <= 0) {
      this.state = 'dying';
      this.timer = 0;
      return true;
    }
    // A hit interrupts a swipe that hasn't landed, and stuns for a moment.
    if (stagger > 0 && !(this.state === 'attack' && this.struck)) {
      const left = this.state === 'stagger' ? this.timer : 0;
      this.state = 'stagger';
      this.timer = Math.max(left, stagger);
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
    this.facing += diff * Math.min(1, this.cfg.turnRate * dt);
  }

  // The atlas column to draw this frame.
  get frame() {
    const f = ZOMBIE_FRAMES;
    switch (this.state) {
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
