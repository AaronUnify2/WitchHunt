// The player's carried items. First aid kits (M2); from M4, scrap and ammo
// for weapons the player isn't carrying yet (pistol rounds from police
// zombies wait for the pistol). Ammo for carried guns lives with each
// weapon. M5: batteries (for the fence box; no carry limit and no
// slowdown, Aaron) and spending scrap at the station. Charges (M7) and
// flares (M9.1, a carry limit) arrive with the systems that use them.
// Session 20: the kits are a healing pool (player/healingPool.js).

import { poolPoints, kitsThatFit, chooseKit, emptyKits } from './healingPool.js';

export class Inventory {
  constructor(inventoryConfig) {
    this.cfg = inventoryConfig;
  }

  init() {
    this.kits = emptyKits(this.cfg.healing.kits, this.cfg.healing.startKits);
    this.scrap = this.cfg.startScrap ?? 0;
    this.ammo = { ...(this.cfg.startAmmo ?? {}) };
    this.batteries = this.cfg.startBatteries ?? 0;
    this.charges = 0; // M7: explosive charges in hand (combat/Explosives.js)
    this.dynamite = 0; // Session 27: sticks of dynamite (combat/Dynamite.js)
    this.maxFlares = this.cfg.maxFlares ?? 3; // M9.1: the flare gun's (combat/Flares.js)
    this.flares = Math.min(this.maxFlares, this.cfg.startFlares ?? 0);
  }

  // Flares up to the carry limit; returns how many fitted.
  addFlares(count) {
    const before = this.flares;
    this.flares = Math.min(this.maxFlares, this.flares + count);
    return this.flares - before;
  }

  update() {}

  dispose() {}

  // ---- the healing pool (Session 20) ----

  // Healing points carried ("Healing: 90").
  get healing() {
    return poolPoints(this.kits, this.cfg.healing.kits);
  }

  get healingCap() {
    return this.cfg.healing.poolCap;
  }

  // Whether one more kit of `kind` (default the smallest) would fit.
  canTakeKit(kind = 'firstAid') {
    return kitsThatFit(this.kits, this.cfg.healing.kits, this.cfg.healing.poolCap, kind, 1) > 0;
  }

  // Add up to `count` kits of `kind`; returns how many fitted under the cap
  // (the caller sends the rest to the comms room's box).
  addKits(kind, count) {
    const n = kitsThatFit(this.kits, this.cfg.healing.kits, this.cfg.healing.poolCap, kind, count);
    if (n > 0) this.kits[kind] = (this.kits[kind] ?? 0) + n;
    return n;
  }

  addScrap(count) {
    this.scrap += count;
    return count;
  }

  // Spend scrap; false (and nothing spent) if there isn't enough.
  spendScrap(count) {
    if (count > this.scrap) return false;
    this.scrap -= count;
    return true;
  }

  addBattery(count = 1) {
    this.batteries += count;
    return count;
  }

  useBattery() {
    if (this.batteries <= 0) return false;
    this.batteries -= 1;
    return true;
  }

  // Ammo for a weapon not in the loadout (e.g. 'pistol').
  addAmmo(weaponId, rounds) {
    this.ammo[weaponId] = (this.ammo[weaponId] ?? 0) + rounds;
    return rounds;
  }

  // Heal from the pool: the kit is chosen for what's still missing (after
  // anything already healing), queued on `health` (it caps the rate).
  // Returns the kind used, or null if there's no kit or nothing to heal.
  heal(health) {
    const missing = health.cfg.max - health.value - health.pendingHeal;
    const kind = chooseKit(this.kits, this.cfg.healing.kits, missing);
    if (!kind) return null;
    if (!health.queueHeal(this.cfg.healing.kits[kind].heal)) return null;
    this.kits[kind] -= 1;
    return kind;
  }
}
