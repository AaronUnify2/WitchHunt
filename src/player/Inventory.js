// The player's carried items. First aid kits (M2); from M4, scrap and ammo
// for weapons the player isn't carrying yet (pistol rounds from police
// zombies wait for the pistol). Ammo for carried guns lives with each
// weapon. Batteries, charges, flares and lore items arrive with the
// systems that use them.

export class Inventory {
  constructor(inventoryConfig) {
    this.cfg = inventoryConfig;
  }

  init() {
    this.firstAid = this.cfg.startFirstAid;
    this.scrap = this.cfg.startScrap ?? 0;
    this.ammo = { ...(this.cfg.startAmmo ?? {}) };
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
