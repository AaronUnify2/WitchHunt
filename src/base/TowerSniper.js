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
    this.holding = false;
    if (this.rifle) this.rifle.visible = false;
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

  // Is the rifle his yet? Tom hands it over on the tower before Night 2 (a run saved before that beat: night2Done).
  get armed() {
    return Boolean(this.progress?.has('wyattArmed') || this.progress?.has('night2Done'));
  }

  // Aaron (Nov 14: "we don't have a model for the rifle to hand to Wyatt, so he's just standing there shooting
  // bullets out of his chest"): Earl's lever-action, in his hands while he's posted with it: a small mesh on
  // his figure (walnut stock and fore-end, a blued receiver, barrel and magazine tube, the lever's loop), and
  // his arms up to it (FamilyRenderer's 'aim').
  showRifle(on) {
    const fr = this.station.renderer?.familyRenderer;
    const person = fr?.people?.[WYATT];
    if (!person) return;
    if (on && !this.rifle) this.rifle = buildLeverRifle(this.wc.rifle);
    if (this.rifle) {
      if (on && this.rifle.parent !== person.mesh) person.mesh.add(this.rifle);
      this.rifle.visible = on;
    }
    fr.setPose?.(WYATT, on ? 'aim' : 'stand');
  }

  update(dt, playing) {
    const want = this.wanted();
    const hold = want && this.armed;
    if (hold !== this.holding) {
      this.holding = hold;
      this.showRifle(hold);
    }
    if (want !== this.posted) {
      this.posted = want;
      this.station.placeFamily(WYATT, want ? this.spot() : null);
      this.timer = this.wc.every;
      this.bus.emit('wyatt:posted', { on: want });
    }
    if (!playing || !this.posted || this.clock.phase !== 'night') return;
    // He shoots once the rifle's in his hands.
    if (!this.armed) return;
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
    const m = this.wc.rifle?.muzzle ?? [0.5, 1.35];
    this.from.set(s.x + Math.sin(yaw) * m[0], s.y + m[1], s.z + Math.cos(yaw) * m[0]); // the rifle's muzzle
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

// Earl's lever-action as Wyatt holds it: a group in his figure's own space (feet at the origin, facing +z),
// up at his right shoulder, pointing where he faces. k: config.wyattTower.rifle.
export function buildLeverRifle(k) {
  const group = new THREE.Group();
  group.name = 'wyatt rifle';
  const wood = new THREE.MeshLambertMaterial({ color: k.wood });
  const steel = new THREE.MeshLambertMaterial({ color: k.steel });
  const box = (w, h, d, x, y, z, mat, rx = 0) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.rotation.x = rx;
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  };
  // Along +z from the butt at his shoulder: stock, receiver, fore-end, barrel and the tube under it.
  box(0.045, 0.11, 0.3, 0, -0.035, -0.1, wood, 0.12); // the stock, dropping to the butt
  box(0.04, 0.085, 0.2, 0, 0, 0.14, steel); // the receiver
  box(0.012, 0.06, 0.09, 0, -0.07, 0.1, steel, -0.5); // the lever's loop
  box(0.012, 0.012, 0.11, 0, -0.1, 0.08, steel);
  box(0.042, 0.05, 0.22, 0, -0.012, 0.35, wood); // the fore-end
  box(0.022, 0.022, 0.56, 0, 0.012, 0.52, steel); // the barrel
  box(0.018, 0.018, 0.44, 0, -0.018, 0.5, steel); // the magazine tube
  box(0.008, 0.02, 0.012, 0, 0.032, 0.78, steel); // the front sight
  box(0.02, 0.03, 0.04, 0, 0.05, 0.1, steel); // the hammer
  group.position.set(k.at[0], k.at[1], k.at[2]);
  group.rotation.set(k.tilt ?? 0, k.yaw ?? 0, 0);
  group.visible = false;
  return group;
}

