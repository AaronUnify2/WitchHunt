// Round 2 (Aaron: "I don't love that the family just sits in the safe room. I think Wyatt should jump up
// onto the tower and snipe zombies. So we need a story beat where he gets a gun"). The gun is the old
// lever-action in Earl's safe, the one Earl once let him shoot (flag wyattRifle: GasStation's safe).
// From then on, at night, Wyatt is up the lookout tower with it:
//  - every `every` seconds he picks one of the dead within `range` of the tower (the nearest to the
//    fence's middle: the ones at the wire first) and fires: `hitChance` to hit, `headChance` of those to
//    the head; a tracer, a crack from the tower;
//  - by day he's back in the comms room with the others;
//  - he says so now and then when he drops one (rate-limited lines).
// A help, not a turret: about one of the dead every five or six seconds at best. config.wyattTower.
//
// Events: 'wyatt:posted' { on }, 'wyatt:fired' { hit, killed }.

import * as THREE from 'three';

const WYATT = 1; // config.story.family's order: ellen, wyatt, junie

// Who he shoots at (pure): the living within `range` of (tx, tz), nearest (cx, cz) first; none that are
// held, sinking or already down. enemies: [{ x, z, alive, mode, state }].
export function sniperTarget(enemies, tx, tz, range, cx, cz) {
  let best = null;
  let bestD = Infinity;
  for (const z of enemies) {
    if (!z.alive || z.mode === 'held' || z.state === 'burrow' || z.state === 'dormant') continue;
    if (Math.hypot(z.x - tx, z.z - tz) > range) continue;
    const d = Math.hypot(z.x - cx, z.z - cz);
    if (d < bestD) {
      bestD = d;
      best = z;
    }
  }
  return best;
}

export class TowerSniper {
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.wc = cfg.wyattTower;
    this.bus = bus;
    this.from = new THREE.Vector3();
    this.to = new THREE.Vector3();
  }

  // ctx: { station, enemies, clock, progress, fx, sfx, dialogue, rng, ground }.
  init(ctx) {
    Object.assign(this, ctx);
    this.reset();
  }

  reset() {
    this.posted = false;
    this.timer = this.wc.every;
    this.sayIn = 0;
    this.force = false; // an encounter wants him up there now (Night 2's dusk)
  }

  // Should he be up the tower?
  wanted() {
    if (!this.wc.enabled || !this.progress?.has('wyattRifle')) return false;
    if (this.station.renderer?.family?.[WYATT]?.visible === false) return false;
    return this.force || this.clock.phase === 'night';
  }

  spot() {
    const t = this.station.layout.tower;
    const y = this.ground.heightAt(t.x, t.z) + t.height;
    const c = this.station.layout.centre;
    // The corner of the platform away from the cabin, facing out over the gate.
    const x = t.x + this.wc.at[0];
    const z = t.z + this.wc.at[1];
    return { x, y, z, facing: Math.atan2(x - c.x, z - c.z) };
  }

  update(dt, playing) {
    const want = this.wanted();
    if (want !== this.posted) {
      this.posted = want;
      this.station.placeFamily(WYATT, want ? this.spot() : null);
      this.timer = this.wc.every;
      this.bus.emit('wyatt:posted', { on: want });
    }
    if (!playing || !this.posted || this.clock.phase !== 'night') return;
    // He shoots once the rifle's in his hands: Tom hands it over on the tower before Night 2 (wyattArmed;
    // a run saved before that beat was built: night2Done).
    if (!this.progress?.has('wyattArmed') && !this.progress?.has('night2Done')) return;
    this.sayIn = Math.max(0, this.sayIn - dt);
    this.timer -= dt;
    if (this.timer > 0) return;
    const s = this.spot();
    const c = this.station.layout.centre;
    const target = sniperTarget(this.enemies.living, s.x, s.z, this.wc.range, c.x, c.z);
    if (!target) {
      this.timer = 0.5;
      return;
    }
    this.timer = this.wc.every * this.rng.range(0.85, 1.25);
    this.fire(s, target);
  }

  fire(s, target) {
    const w = this.wc;
    const person = this.station.renderer.familyRenderer?.people?.[WYATT];
    const yaw = Math.atan2(target.x - s.x, target.z - s.z);
    if (person) {
      person.facing = yaw;
      person.mesh.rotation.y = yaw;
    }
    this.from.set(s.x + Math.sin(yaw) * 0.5, s.y + 1.35, s.z + Math.cos(yaw) * 0.5);
    const hit = this.rng.chance(w.hitChance);
    const head = hit && this.rng.chance(w.headChance);
    const chest = (target.y ?? this.ground.heightAt(target.x, target.z)) + (target.headBottom ?? 1.5) * (head ? 1.05 : 0.6);
    if (hit) this.to.set(target.x, chest, target.z);
    else this.to.set(target.x + this.rng.range(-1.2, 1.2), this.ground.heightAt(target.x, target.z), target.z + this.rng.range(-1.2, 1.2));
    this.fx?.tracer(this.from, this.to);
    this.fx?.muzzleFlash(this.from);
    this.sfx?.play('leverShot', s);
    let killed = false;
    if (hit) {
      const amount = w.damage * (head ? this.cfg.weapons.headshotMultiplier : 1);
      killed = this.enemies.damage(target, amount, head ? 'head' : 'body', w, { x: this.to.x, y: this.to.y, z: this.to.z }, this.from);
    } else this.fx?.dust?.(this.to.x, this.to.y, this.to.z);
    if (killed && this.sayIn <= 0 && this.rng.chance(w.sayChance)) {
      this.sayIn = w.sayEvery;
      this.dialogue?.play(w.lines[Math.floor(this.rng.range(0, w.lines.length - 0.001))]);
    }
    this.bus.emit('wyatt:fired', { hit, killed });
  }

  overlayLine() {
    return this.posted ? 'wyatt: on the tower' : '';
  }
}
