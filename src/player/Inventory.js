// The player's carried items. First aid kits (M2); from M4, scrap and ammo
// for weapons the player isn't carrying yet (pistol rounds from police
// zombies wait for the pistol). Ammo for carried guns lives with each
// weapon. M5: batteries (for the fence box; no carry limit and no
// slowdown, Aaron) and spending scrap at the station. Charges, flares and
// lore items arrive with the systems that use them.

export class Inventory {
  constructor(inventoryConfig) {
    this.cfg = inventoryConfig;
  }

  init() {
    this.firstAid = this.cfg.startFirstAid;
    this.scrap = this.cfg.startScrap ?? 0;
    this.ammo = { ...(this.cfg.startAmmo ?? {}) };
    this.batteries = this.cfg.startBatteries ?? 0;
    this.charges = 0; // M7: explosive charges in hand (combat/Explosives.js)
  }

  update() {}

  dispose() {}

  addFirstAid(count) {
    const before = this.firstAid;
    this.firstAid = Math.min(this.cfg.maxFirstAid, this.firstAid + count);
    return this.firstAid - before;
  }

  get firstAidFull() {
    return this.firstAid >= this.cfg.maxFirstAid;
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

  // Use one kit on `health`. Kits queue (Health caps the rate). False if
  // there's no kit or nothing to heal.
  useFirstAid(health) {
    if (this.firstAid <= 0) return false;
    if (!health.queueHeal(this.cfg.firstAidHeal)) return false;
    this.firstAid -= 1;
    return true;
  }
}
