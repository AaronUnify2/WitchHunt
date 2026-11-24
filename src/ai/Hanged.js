// The Hanged (Nov 24, Aaron: at the Pruitts' family plot, "one of those hanged mutants. To give the player something
// novel to fight. Maybe even ... 3 at once"; his picks: they drop, and go back up into the tree when badly hurt;
// 3D bodies). Three bodies hanging from the dead oak's limbs (render/familyCemeteryModel.js) by their nooses.
//
// One body's life (config.familyPlot.hanged):
//   hang   - limp on its rope, turning slowly. A shot to it, a shot through its rope, or Tom within wakeAt of the
//            tree wakes them all, one by one (dropEvery apart, the one hit first).
//   wake   - its head snaps up, its arms and legs draw up (snapSeconds); the rope creaks.
//   fall   - the rope goes; it drops to the ground (gravity). A rope shot through skips `wake` and costs it ropeFall
//            of its health.
//   land   - in a crouch, a hand down (landSeconds); a snarl.
//   chase  - bent double, loping at him, fast; within reach: claw (windup, then a hit if he's still in reach),
//            recover, chase.
//   up     - badly hurt (retreatAt of its health left), once: it leaps back up into the branches (upSeconds) and is
//   lurk   - gone among them (lurk seconds), out of reach;
//   drop   - then down again from dropHeight, dropBehind metres behind Tom (the way he isn't looking): fall, land.
//   dead   - down on its back. All three dead: 'hanged:allDead'.
// They're the weapons' extra targets (each body; each rope while it hangs: thin, no aim assist).
//
// Pure of three.js but for the renderer (a FamilyRenderer per body, given by `makeBody`), so it runs headless in
// tests with makeBody null.
//
// Events: 'hanged:woke', 'hanged:dropped' { body }, 'hanged:hit' { body, killed }, 'hanged:up' { body },
// 'hanged:killed' { body }, 'hanged:allDead'.

import { resolveCircles } from '../world/collision.js';

const GRAVITY = 14;

export class Hanged {
  // cfg: config.familyPlot.hanged. ctx: { player, combat, colliders, ground, bus, rng, makeBody(look) => { mesh,
  // pose(name, rate), update(dt), dispose() } | null, sfx(name, at) }.
  constructor(cfg, ctx) {
    this.cfg = cfg;
    Object.assign(this, ctx);
    this.list = [];
    this.ropes = [];
    this.woken = false;
    this.nearby = [];
    this.target = { group: this.list };
    this.ropeTarget = { group: this.ropes };
    this.combat?.weapons?.extraTargets?.push(this.target, this.ropeTarget);
  }

  // Hang one under each rope knot ({ x, y, z } world) in `ropes`; tree: { x, z } (the trunk). dead: indices already
  // killed (from a save): left out.
  hang(ropes, tree, looks, dead = []) {
    this.clear();
    this.tree = tree;
    this.woken = false;
    ropes.slice(0, this.cfg.count).forEach((r, i) => {
      if (dead.includes(i)) return;
      const look = looks[i % looks.length];
      const body = this.makeBody?.(look) ?? null;
      const ground = this.ground.heightAt(r.x, r.z);
      const height = body?.height ?? 1.8;
      const feet = ground + this.cfg.feetUp;
      const neck = feet + height * 0.865;
      const h = {
        i,
        look,
        body,
        knot: r,
        state: 'hang',
        t: 0,
        wakeIn: -1,
        x: r.x,
        z: r.z,
        y: feet,
        vy: 0,
        facing: (i * 2.1) % (Math.PI * 2),
        sway: i * 1.7,
        maxHealth: this.cfg.health,
        health: this.cfg.health,
        retreated: false,
        alive: true,
        targetable: true,
        hitRadius: 0.28,
        height,
        headBottom: height - 0.3,
        headRadius: 0.13,
        fullHeight: height,
        takeHit: (amount, part, weapon, at, from) => this.hit(h, amount, part, from),
      };
      h.rope = {
        owner: h,
        x: r.x,
        z: r.z,
        y: neck,
        height: Math.max(0.2, r.y - neck),
        hitRadius: 0.07,
        headBottom: 99,
        headRadius: 0,
        facing: 0,
        alive: true,
        targetable: true,
        noAssist: true,
        takeHit: () => this.cutRope(h),
      };
      this.list.push(h);
      this.ropes.push(h.rope);
      body?.pose('hang');
    });
    this.place();
  }

  clear() {
    for (const h of this.list) h.body?.dispose();
    this.list.length = 0;
    this.ropes.length = 0;
  }

  get alive() {
    return this.list.filter((h) => h.alive).length;
  }

  // Wake them all: the first now (or the one that was hit), the rest dropEvery apart.
  wake(first = null) {
    if (this.woken) return;
    this.woken = true;
    const order = [...this.list].filter((h) => h.alive && h.state === 'hang').sort((a, b) => (a === first ? -1 : b === first ? 1 : a.i - b.i));
    order.forEach((h, k) => {
      h.wakeIn = k * this.cfg.dropEvery;
    });
    this.bus?.emit('hanged:woke', {});
  }

  // A shot through its rope while it hangs: it falls before it wakes, hard.
  cutRope(h) {
    if (h.state !== 'hang' || !h.alive) return false;
    this.drop(h);
    h.health -= h.maxHealth * this.cfg.ropeFall;
    this.wake(h);
    this.sfx?.('ropeSnap', h);
    return false;
  }

  drop(h) {
    h.state = 'fall';
    h.t = 0;
    h.vy = 0;
    h.wakeIn = -1;
    h.rope.targetable = false;
    h.body?.pose('wake');
    this.bus?.emit('hanged:dropped', { body: h });
  }

  hit(h, amount, part, from) {
    if (!h.alive || !h.targetable) return false;
    const mult = part === 'head' ? 1.6 : 1;
    h.health -= amount * mult;
    if (h.state === 'hang') this.wake(h);
    if (h.health <= 0) {
      this.kill(h);
      this.bus?.emit('hanged:hit', { body: h, killed: true });
      return true;
    }
    this.bus?.emit('hanged:hit', { body: h, killed: false });
    // Badly hurt, on the ground: back up into the tree, once.
    if (!h.retreated && h.health <= h.maxHealth * this.cfg.retreatAt && ['chase', 'claw', 'recover', 'land'].includes(h.state)) {
      h.retreated = true;
      h.state = 'up';
      h.t = 0;
      h.from = { x: h.x, z: h.z, y: h.y };
      h.body?.pose('climb');
      this.sfx?.('branchThrash', h);
      this.bus?.emit('hanged:up', { body: h });
    }
    return false;
  }

  kill(h) {
    h.alive = false;
    h.targetable = false;
    h.rope.targetable = false;
    h.state = 'dead';
    h.t = 0;
    h.y = this.ground.heightAt(h.x, h.z);
    h.height = 0.4;
    h.body?.pose('down');
    if (h.body) h.body.mesh.visible = true;
    this.bus?.emit('hanged:killed', { body: h });
    if (this.alive === 0) this.bus?.emit('hanged:allDead', {});
  }

  update(dt) {
    if (!this.list.length) return;
    const p = this.player.position;
    const c = this.cfg;
    if (!this.woken && this.tree && Math.hypot(p.x - this.tree.x, p.z - this.tree.z) < c.wakeAt) this.wake();
    for (const h of this.list) {
      h.t += dt;
      switch (h.state) {
        case 'hang':
          h.sway += dt * c.sway.rate;
          h.facing += Math.sin(h.sway) * c.sway.amount * dt * 4;
          if (h.wakeIn >= 0) {
            h.wakeIn -= dt;
            if (h.wakeIn <= 0) {
              h.state = 'wake';
              h.t = 0;
              h.body?.pose('wake');
              this.sfx?.('ropeCreak', h);
            }
          }
          break;
        case 'wake':
          if (h.t >= c.snapSeconds) {
            this.drop(h);
            this.sfx?.('ropeSnap', h);
          }
          break;
        case 'fall': {
          h.vy -= GRAVITY * dt;
          h.y += h.vy * dt;
          const g = this.ground.heightAt(h.x, h.z);
          if (h.y <= g) {
            h.y = g;
            h.state = 'land';
            h.t = 0;
            h.body?.pose('crouch', 20);
            this.sfx?.('bodyThud', h);
            this.sfx?.('hangedSnarl', h);
          }
          break;
        }
        case 'land':
          h.facing = turnToward(h.facing, Math.atan2(p.x - h.x, p.z - h.z), c.turnRate * dt);
          if (h.t >= c.landSeconds) this.chase(h);
          break;
        case 'chase': {
          const want = Math.atan2(p.x - h.x, p.z - h.z);
          h.facing = turnToward(h.facing, want, c.turnRate * dt);
          const d = Math.hypot(p.x - h.x, p.z - h.z);
          if (d <= c.reach) {
            h.state = 'claw';
            h.t = 0;
            h.body?.pose('claw', 30);
            this.sfx?.('hangedSnarl', h);
            break;
          }
          const step = Math.min(d - c.reach * 0.8, c.speed * dt);
          h.x += Math.sin(h.facing) * step;
          h.z += Math.cos(h.facing) * step;
          this.collide(h);
          h.y = this.ground.heightAt(h.x, h.z);
          break;
        }
        case 'claw':
          h.facing = turnToward(h.facing, Math.atan2(p.x - h.x, p.z - h.z), c.turnRate * 0.5 * dt);
          if (h.t >= c.windup && !h.struck) {
            h.struck = true;
            if (Math.hypot(p.x - h.x, p.z - h.z) <= c.reach + 0.35) this.combat?.hurtPlayer?.(c.damage, 1.2);
          }
          if (h.t >= c.windup + c.recover) {
            h.struck = false;
            this.chase(h);
          }
          break;
        case 'up': {
          // Up and back toward the tree, into the canopy.
          const k = Math.min(1, h.t / c.upSeconds);
          const top = h.knot.y + 0.8;
          h.x = h.from.x + (h.knot.x - h.from.x) * k;
          h.z = h.from.z + (h.knot.z - h.from.z) * k;
          h.y = h.from.y + (top - h.from.y) * Math.sin((k * Math.PI) / 2);
          h.targetable = false;
          if (k >= 1) {
            h.state = 'lurk';
            h.t = 0;
            h.lurkFor = c.lurk[0] + (this.rng?.next?.() ?? 0.5) * (c.lurk[1] - c.lurk[0]);
            if (h.body) h.body.mesh.visible = false;
          }
          break;
        }
        case 'lurk':
          if (h.t >= h.lurkFor) {
            // Down again behind him: the way he isn't facing.
            const yaw = this.player.yaw ?? 0; // the camera looks down -z at yaw 0
            const bx = p.x + Math.sin(yaw) * c.dropBehind;
            const bz = p.z + Math.cos(yaw) * c.dropBehind;
            h.x = bx;
            h.z = bz;
            this.collide(h);
            h.y = this.ground.heightAt(h.x, h.z) + c.dropHeight;
            h.vy = 0;
            h.facing = Math.atan2(p.x - h.x, p.z - h.z);
            h.state = 'fall';
            h.t = 0;
            h.targetable = true;
            if (h.body) h.body.mesh.visible = true;
            h.body?.pose('wake');
            this.sfx?.('branchThrash', h);
          }
          break;
        default:
          break;
      }
      // The hit shape follows the pose: lower bent double or crouched.
      if (h.alive) {
        const low = h.state === 'land' || h.state === 'claw' ? 0.7 : h.state === 'chase' ? 0.78 : 1;
        h.height = h.fullHeight * low;
        h.headBottom = h.height - 0.3;
      }
    }
    this.place();
    for (const h of this.list) h.body?.update(dt);
  }

  chase(h) {
    h.state = 'chase';
    h.t = 0;
    h.body?.pose('lope', 12);
  }

  collide(h) {
    if (!this.colliders) return;
    const pos = { x: h.x, z: h.z };
    resolveCircles(pos, this.cfg.radius, this.colliders.query(pos.x, pos.z, this.cfg.radius, this.nearby));
    h.x = pos.x;
    h.z = pos.z;
  }

  // Each body's mesh where it is: hanging, swinging a little under its knot; else on the ground or in the air.
  place() {
    for (const h of this.list) {
      if (!h.body) continue;
      const m = h.body.mesh;
      if (h.state === 'hang' || h.state === 'wake') {
        const swing = Math.sin(h.sway * 1.3) * 0.05;
        m.position.set(h.knot.x + swing, h.y, h.knot.z + Math.cos(h.sway) * 0.03);
      } else m.position.set(h.x, h.y, h.z);
      m.rotation.y = h.facing;
    }
  }

  // Where they are, for a save: which are dead.
  deadIndices() {
    const alive = new Set(this.list.filter((h) => h.alive).map((h) => h.i));
    const all = this.list.map((h) => h.i);
    return all.filter((i) => !alive.has(i));
  }

  dispose() {
    this.clear();
    const xs = this.combat?.weapons?.extraTargets;
    if (xs) for (const t of [this.target, this.ropeTarget]) {
      const i = xs.indexOf(t);
      if (i >= 0) xs.splice(i, 1);
    }
  }
}

export function turnToward(a, b, max) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + Math.max(-max, Math.min(max, d));
}
