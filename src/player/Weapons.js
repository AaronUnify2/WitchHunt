// The player's weapons: switching (Session 25: RB flips between the last two
// used, LB the shovel and back; the weapon cross on D-pad down; keys 1-8 and
// the mouse wheel cycle on a keyboard), firing
// (RT), aiming down sights (LT: zoom, tighter spread, stronger aim
// assist), reloading (B), the aim and fire slowdown, and aim assist.
// Hits are resolved here with combat/hitscan.js and applied through the
// EnemyManager. The shovel swings in an arc and connects a moment later.
// M7: other targets (the witch) can join through `extraTargets`: objects
// with the same hit shape as a zombie, a `targetable` flag and their own
// takeHit(amount, part, weapon, at, from) (returns true if killed). An
// entry with a `group` array (the witch's traps) adds each of those.
// Targets with `noAssist` don't slow the aim.
//
// Events: 'weapon:switched' { id }, 'weapon:fired' { id }, 'weapon:swing',
// 'weapon:hit' { killed, part, melee }, 'weapon:impact' { x, y, z, damage, id },
// 'weapon:reload' { id }, 'weapon:loaded' { id }, 'weapon:empty'.

import * as THREE from 'three';
import { WeaponState } from '../combat/WeaponState.js';
import { slotOf } from './loadout.js';
import { aimSlowdown } from '../combat/aimAssist.js';
import { rayEnemiesAll, rayBlockers, falloff, spreadDirection, meleeTarget, partMultiplier, meleeFromBehind, helmetPart } from '../combat/hitscan.js';

// Which part counts when several pellets of one shot land: the best one.
const PART_RANK = { body: 0, helmet: 0.5, head: 1, weak: 2 }; // Session 17: 'helmet', a headshot an army helmet stopped

const DEG_TO_RAD = Math.PI / 180;
const SLOT_ACTIONS = ['weaponSlot1', 'weaponSlot2', 'weaponSlot3', 'weaponSlot4', 'weaponSlot5', 'weaponSlot6', 'weaponSlot7', 'weaponSlot8'];
const MISS_CHECK_DISTANCE = 40; // metres: how far a missed shot looks for a tree or the ground to puff

export class Weapons {
  constructor(weaponsConfig, aimingConfig, aimAssistConfig, playerConfig, rng, bus) {
    this.cfg = weaponsConfig;
    this.aimingCfg = aimingConfig;
    this.assistCfg = aimAssistConfig;
    this.playerCfg = playerConfig;
    this.rng = rng;
    this.bus = bus;
  }

  // ground: the GroundField (shots stop where they hit the terrain).
  init(player, enemies, colliders, ground) {
    this.ground = ground;
    this.player = player;
    this.enemies = enemies;
    this.colliders = colliders;
    this.eye = new THREE.Vector3();
    this.forward = new THREE.Vector3();
    this.right = new THREE.Vector3();
    this.up = new THREE.Vector3();
    this.dir = { x: 0, y: 0, z: 0 };
    this.blockers = [];
    this.pelletHits = new Map(); // zombie -> { damage, head, pellets, x, y, z }
    this.rayHits = []; // reused by rayEnemiesAll
    this.assistTargets = [];
    this.extraTargets = []; // M7: the witch
    this.targetList = []; // reused: zombies plus targetable extras
    this.assistCfgAiming = { ...this.assistCfg, slowFactor: this.assistCfg.aimingSlowFactor };
    this.reset();
  }

  reset() {
    this.order = [...this.cfg.startingLoadout];
    this.rack = []; // Session 20: guns waiting on the comms room's gun rack
    this.belt = []; // Session 20: tools out of the melee slot (the shovel)
    this.states = {};
    this.pools = {}; // Session 10b: reserve rounds by ammo type, shared by the guns that fire them
    for (const id of this.order) this.addState(id);
    this.index = Math.max(0, this.order.indexOf(this.cfg.startingWeapon));
    this.switchTimer = 0;
    this.lastId = null; // Session 25: the swap button's other weapon
    this.aiming = false;
    this.zoom = 0;
    this.fireSlow = 0;
    this.meleeTimer = -1;
    this.requireRelease = true; // the click or tap that starts the game must not fire
    this.reloadHeld = null; // Session 20: seconds B has been held (null: not held)
    this.choosing = null; // the ammo type showing while B is held
    this.swingTime = Infinity; // seconds since the last swing (view model)
    this.shotTime = Infinity; // seconds since the last shot (view model)
  }

  get id() {
    return this.order[this.index];
  }

  get weapon() {
    return this.cfg[this.id];
  }

  get state() {
    return this.states[this.id];
  }

  // Session 10b: how far into a scope view (0 unless the gun has a scope).
  get scoped() {
    return this.weapon.scope ? this.zoom : 0;
  }

  // 0..1 through a weapon switch (1 = ready).
  get switchProgress() {
    return 1 - this.switchTimer / this.cfg.switchSeconds;
  }

  // Ignore the attack button until it's next released (game start, resume).
  holdFire() {
    this.requireRelease = true;
  }

  select(index) {
    const next = (index + this.order.length) % this.order.length;
    if (next === this.index) return;
    this.lastId = this.id; // Session 25: for the swap button
    this.state.cancelReload();
    this.index = next;
    this.reloadHeld = null;
    this.choosing = null;
    this.switchTimer = this.cfg.switchSeconds;
    this.meleeTimer = -1;
    this.bus.emit('weapon:switched', { id: this.id });
  }

  update(dt, input, camera) {
    this.swingTime += dt;
    this.shotTime += dt;
    this.updateSwitching(input, dt);
    for (const id of this.order) {
      if (this.states[id].update(dt) && id === this.id) this.bus.emit('weapon:loaded', { id });
    }

    camera.getWorldPosition(this.eye);
    camera.getWorldDirection(this.forward);
    this.right.crossVectors(this.forward, camera.up).normalize();
    this.up.crossVectors(this.right, this.forward);

    const w = this.weapon;
    const ready = this.switchTimer <= 0;
    // No shouldering the gun while reloading (Aaron, M6: the rounds came up to your face).
    this.aiming = ready && w.kind === 'hitscan' && !this.state.reloading && input.isDown('aim');
    const zoomTarget = this.aiming ? 1 : 0;
    this.zoom += (zoomTarget - this.zoom) * Math.min(1, this.aimingCfg.zoomSpeed * dt);
    this.player.fovMultiplier = 1 + ((w.aimFovMultiplier ?? 1) - 1) * this.zoom;
    // Session 10b: a scope slows the look with its zoom, so 4x isn't twitchy.
    this.player.scopeLookScale = 1 + ((w.scopeLookScale ?? 1) - 1) * this.zoom;

    if (ready) this.updateReload(dt, input);
    if (ready) this.updateFiring(input);
    this.updateMelee(dt);

    this.fireSlow = Math.max(0, this.fireSlow - dt);
    this.player.moveMultiplier = this.aiming || this.fireSlow > 0 ? this.playerCfg.aimMultiplier : 1;
    this.updateAimAssist();
  }

  // Session 20 (Aaron): tap B to reload; hold B to swap the ammo (once per
  // hold, round 31), and it reloads with the swap on release. Only when
  // there's another type to swap to: otherwise B reloads on the press.
  updateReload(dt, input) {
    const s = this.state;
    const c = this.cfg.ammoChoice;
    if (this.reloadHeld === null && !this.hasOtherAmmo()) {
      this.choosing = null;
      if (input.wasPressed('reload')) this.reloadInHand();
      return;
    }
    if (input.wasPressed('reload')) {
      this.reloadHeld = 0;
      this.swapped = false;
    }
    if (this.reloadHeld === null) return;
    if (input.isDown('reload')) {
      this.reloadHeld += dt;
      if (!this.swapped && this.reloadHeld >= c.holdSeconds) {
        this.swapped = true;
        this.chooseNextAmmo();
        this.choosing = s.chosen;
      }
      return;
    }
    this.reloadHeld = null;
    this.choosing = null;
    this.reloadInHand();
  }

  // Reload the gun in hand. Out of the chosen type (the alien shells ran
  // out), it falls back to a type that has rounds.
  reloadInHand() {
    const s = this.state;
    if (s.reserve <= 0 && s.types?.length > 1) {
      const t = s.types.find((x) => s.typePools[x].rounds > 0);
      if (t) s.choose(t);
    }
    if (!s.startReload()) return false;
    this.bus.emit('weapon:reload', { id: this.id });
    return true;
  }

  // Round 31 (Aaron): is there another ammo type in the pack for the gun in hand?
  hasOtherAmmo() {
    const s = this.state;
    if (!s.types || s.types.length < 2) return false;
    return s.types.some((t) => t !== s.chosen && s.typePools[t].rounds > 0);
  }

  // The next ammo type the gun in hand fires that has rounds (or is loaded).
  chooseNextAmmo() {
    const s = this.state;
    const i = s.types.indexOf(s.chosen);
    for (let k = 1; k <= s.types.length; k++) {
      const t = s.types[(i + k) % s.types.length];
      if (s.typePools[t].rounds > 0 || t === s.loaded) {
        s.choose(t);
        this.bus.emit('weapon:ammoChosen', { id: this.id, type: t });
        return t;
      }
    }
    return s.chosen;
  }

  // The display name of an ammo type ('normal' rounds have none).
  ammoName(type) {
    return this.cfg.ammoTypes[type]?.name ?? null;
  }

  updateSwitching(input, dt) {
    this.switchTimer = Math.max(0, this.switchTimer - dt);
    // Session 25 (Aaron): every gun's carried; the weapon cross picks one. RB flips
    // between the last two used, LB to the shovel and back; the wheel still cycles.
    if (input.wasPressed('weaponNext')) this.swapLast();
    if (input.wasPressed('weaponPrev')) this.toggleShovel();
    if (input.wasPressed('weaponCycle')) this.select(this.index + 1);
    SLOT_ACTIONS.forEach((action, i) => {
      if (i < this.order.length && input.wasPressed(action)) this.select(i);
    });
  }

  // Guns fire once per trigger pull; the shovel keeps swinging while held.
  updateFiring(input) {
    if (this.requireRelease) {
      if (!input.isDown('attack')) this.requireRelease = false;
      return;
    }
    const w = this.weapon;
    const s = this.state;
    if (w.kind === 'none') return; // Session 15b: empty-handed
    // Session 10b: automatic guns keep firing while the trigger is held.
    const wants = w.kind === 'melee' || w.auto ? input.isDown('attack') : input.wasPressed('attack');
    if (!wants) return;
    // M7: the detonator only signals (combat/Explosives.js sets the charges off).
    if (w.kind === 'remote') {
      this.triggered = true;
      return;
    }
    if (s.usesAmmo && s.mag === 0) {
      if (!this.reloadInHand() && input.wasPressed('attack')) this.bus.emit('weapon:empty');
      return;
    }
    if (!s.fire()) return;
    this.fireSlow = this.cfg.fireSlowSeconds;
    if (w.kind === 'melee') {
      this.meleeTimer = w.hitDelay;
      this.swingTime = 0;
      this.bus.emit('weapon:swing');
    } else {
      this.shotTime = 0;
      this.fireHitscan(w);
      this.player.kick(w.recoilDegrees);
      this.player.shake(w.shake ?? 0);
      this.bus.emit('weapon:fired', { id: this.id, ammo: s.loaded });
    }
  }

  fireHitscan(w) {
    const eye = this.eye;
    const dmg = w.damage * this.state.damageScale; // Session 20: alien shells hit 1.5x
    const spread = (this.aiming ? w.aimSpreadDegrees : w.spreadDegrees) * DEG_TO_RAD;
    const check = Math.min(w.range, MISS_CHECK_DISTANCE);
    const half = check / 2;
    this.colliders.query(eye.x + this.forward.x * half, eye.z + this.forward.z * half, half + spread * check, this.blockers);
    const living = this.targets();
    this.pelletHits.clear();

    for (let i = 0; i < w.pellets; i++) {
      const dir = spreadDirection(this.forward, this.right, this.up, spread, this.rng, this.dir);
      const blocked = rayBlockers(eye, dir, this.blockers, w.range, this.ground);
      const count = rayEnemiesAll(eye, dir, living, blocked, this.rayHits);
      if (count === 0) {
        if (blocked < check) {
          // damage: what the round still carries (Session 14: cars take it).
          const damage = dmg * falloff(blocked, w.falloffStart, w.falloffEnd, w.falloffMin);
          this.bus.emit('weapon:impact', { x: eye.x + dir.x * blocked, y: eye.y + dir.y * blocked, z: eye.z + dir.z * blocked, damage, id: this.id });
        }
        continue;
      }
      // Penetration: the round carries on through up to `pierce` zombies,
      // keeping `pierceKeep` of its damage after each one.
      const pierce = Math.min(count, w.pierce ?? 1);
      let carried = 1;
      for (let k = 0; k < pierce; k++) {
        const hit = this.rayHits[k];
        const part = helmetPart(hit.enemy, hit.part, w); // Session 17: an army helmet stops the headshot bonus
        const mult = partMultiplier(hit.enemy, part, this.cfg.headshotMultiplier);
        const damage = dmg * carried * falloff(hit.distance, w.falloffStart, w.falloffEnd, w.falloffMin) * mult;
        let entry = this.pelletHits.get(hit.enemy);
        if (!entry) {
          entry = { damage: 0, part: 'body', pellets: 0, x: 0, y: 0, z: 0 };
          this.pelletHits.set(hit.enemy, entry);
        }
        entry.damage += damage;
        if (PART_RANK[part] > PART_RANK[entry.part]) entry.part = part;
        entry.pellets += 1;
        entry.x = eye.x + dir.x * hit.distance;
        entry.y = eye.y + dir.y * hit.distance;
        entry.z = eye.z + dir.z * hit.distance;
        carried *= w.pierceKeep ?? 1;
      }
    }

    // One hit per zombie per shot, however many pellets landed.
    for (const [zombie, e] of this.pelletHits) {
      const scaled = { id: this.id, stagger: w.stagger, knockback: w.knockback * e.pellets, helmetPierce: Boolean(w.helmetPierce) }; // id: the witch backs off from the shotgun
      const killed = this.applyHit(zombie, e.damage, e.part, scaled, e, eye);
      this.bus.emit('weapon:hit', { killed, part: e.part, melee: false });
    }
  }

  updateMelee(dt) {
    if (this.meleeTimer < 0) return;
    this.meleeTimer -= dt;
    if (this.meleeTimer > 0) return;
    this.meleeTimer = -1;
    const w = this.weapon;
    if (w.kind !== 'melee') return;
    const flat = Math.hypot(this.forward.x, this.forward.z) || 1;
    const target = meleeTarget(this.eye, this.forward.x / flat, this.forward.z / flat, this.targets(), w.reach, w.arcDegrees * DEG_TO_RAD);
    if (!target) return;
    const at = { x: target.x, y: this.eye.y - 0.4, z: target.z };
    // A swing from behind a mutant lands on its weak spot.
    const part = meleeFromBehind(this.eye, target) ? 'weak' : 'body';
    const killed = this.applyHit(target, w.damage * partMultiplier(target, part, 1), part, w, at, this.eye);
    this.player.shake(0.15);
    this.bus.emit('weapon:hit', { killed, part, melee: true });
  }

  // Controller look slows over a zombie's body or head (stronger aimed).
  updateAimAssist() {
    if (!this.assistCfg.enabled) {
      this.player.lookScale = 1;
      return;
    }
    const targets = this.assistTargets;
    const living = this.targets();
    while (targets.length < living.length * 2) targets.push({ x: 0, y: 0, z: 0, r: 0 });
    let n = 0;
    for (const z of living) {
      if (z.noAssist) continue;
      const body = targets[n++];
      body.x = z.x;
      body.z = z.z;
      body.y = z.y + z.headBottom * 0.55;
      body.r = z.hitRadius;
      const head = targets[n++];
      head.x = z.x;
      head.z = z.z;
      head.y = z.y + (z.headBottom + z.height) / 2;
      head.r = z.headRadius;
    }
    this.player.lookScale = aimSlowdown(this.eye, this.forward, targets, this.aiming ? this.assistCfgAiming : this.assistCfg, n);
  }

  // Which rounds a gun fires (its config's `ammo`, else its own id).
  ammoType(id) {
    return this.cfg[id].ammo ?? id;
  }

  // A weapon's state, drawing on its ammo type's pool (made the first
  // time, holding that gun's starting reserve).
  addState(id) {
    if (!(this.cfg[id].magSize > 0)) {
      // No rounds (the shovel, the detonator): no pool.
      const state = new WeaponState(this.cfg[id]);
      state.init();
      this.states[id] = state;
      return state;
    }
    const type = this.ammoType(id);
    const fresh = !this.pools[type];
    if (fresh) this.pools[type] = { rounds: 0 };
    const state = new WeaponState(this.cfg[id], this.pools[type], type);
    // Session 20: the other ammo types it fires (alien shells), each a shared pool.
    for (const alt of this.cfg[id].altAmmo ?? []) {
      if (!this.pools[alt]) this.pools[alt] = { rounds: 0 };
      state.addType(alt, this.pools[alt], this.cfg.ammoTypes[alt]);
    }
    state.init(this.cfg[id].magSize, fresh ? this.cfg[id].startReserve ?? 0 : null);
    this.states[id] = state;
    return state;
  }

  // Rounds of an ammo type in reserve (null if no gun here fires them).
  ammoRounds(type) {
    return this.pools[type] ? this.pools[type].rounds : null;
  }

  // Add rounds to a pool; false if no gun here fires them.
  addAmmo(type, rounds) {
    if (!this.pools[type]) return false;
    this.pools[type].rounds += rounds;
    return true;
  }

  // M7: add or take away a weapon slot (the detonator, while charges are
  // out or in hand). Taking away the one in hand switches back to the
  // starting weapon.
  setSlot(id, present) {
    const has = this.order.includes(id);
    if (present === has) return;
    const current = this.id;
    if (present) {
      this.order.push(id);
      if (!this.states[id]) this.addState(id); // Session 20: a gun off the rack keeps its magazine
      return;
    }
    this.order = this.order.filter((x) => x !== id);
    if (current === id) {
      this.index = Math.max(0, this.order.indexOf(this.cfg.startingWeapon));
      this.switchTimer = this.cfg.switchSeconds;
      this.bus.emit('weapon:switched', { id: this.id });
    } else {
      this.index = this.order.indexOf(current);
    }
  }

  // ---- what Tom carries (Session 20; Session 25: everything) -------------------

  // Does Tom own it? (Session 25: everything found is carried. `rack` and
  // `belt` are kept empty, for older saves: loadPlayer hands their guns back.)
  has(id) {
    return this.order.includes(id) || this.rack.includes(id) || this.belt.includes(id);
  }

  // A weapon found: Tom carries it (Session 25, Aaron: "I think the player
  // should be able to carry every gun"). Returns 'carried'.
  take(id) {
    for (const list of [this.rack, this.belt]) {
      const i = list.indexOf(id);
      if (i >= 0) list.splice(i, 1);
    }
    if (this.order.includes(id)) return 'carried';
    this.setSlot(id, true);
    if (id !== 'hands') this.setSlot('hands', false);
    return 'carried';
  }

  // The guns Tom has found (for the comms room's rack, which shows them).
  get found() {
    return this.order.filter((id) => slotOf(this.cfg.loadout, id) && slotOf(this.cfg.loadout, id) !== 'melee');
  }

  // Into Tom's hands, by id (the weapon cross). False if he hasn't got it.
  selectId(id) {
    const i = this.order.indexOf(id);
    if (i < 0) return false;
    this.select(i);
    return true;
  }

  // The swap button: back to the last weapon used (if he still has it).
  swapLast() {
    const last = this.lastId;
    if (!last || last === this.id || !this.order.includes(last)) return false;
    return this.selectId(last);
  }

  // LB: the shovel, and back to what was in hand.
  toggleShovel() {
    if (!this.order.includes('shovel')) return false;
    if (this.id === 'shovel') return this.swapLast();
    return this.selectId('shovel');
  }

  // Was the detonator's trigger pulled since the last call? (M7)
  consumeTrigger() {
    const t = this.triggered;
    this.triggered = false;
    return t;
  }

  // The zombies, plus any extra targets that can be hit now (M7).
  targets() {
    const living = this.enemies.living;
    if (this.extraTargets.length === 0) return living;
    const list = this.targetList;
    list.length = 0;
    for (const z of living) list.push(z);
    for (const t of this.extraTargets) {
      if (t.group) {
        for (const g of t.group) if (g.targetable) list.push(g);
      } else if (t.targetable) list.push(t);
    }
    return list;
  }

  applyHit(target, amount, part, weapon, at, from) {
    if (target.takeHit) return target.takeHit(amount, part, weapon, at, from);
    return this.enemies.damage(target, amount, part, weapon, at, from);
  }

  // Debug: rounds into every pool (each shared pool once).
  giveAmmo(rounds) {
    for (const [type, pool] of Object.entries(this.pools)) if (!this.cfg.ammoTypes[type]) pool.rounds += rounds; // not alien shells (their own item)
  }

  dispose() {}
}
