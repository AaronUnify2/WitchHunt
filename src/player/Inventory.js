// The player's carried items. M2: first aid kits only (ammo lives with
// each weapon). Scrap, batteries, charges, flares and lore items arrive
// with the systems that use them.

export class Inventory {
  constructor(inventoryConfig) {
    this.cfg = inventoryConfig;
  }

  init() {
    this.firstAid = this.cfg.startFirstAid;
  }

  update() {}

  dispose() {}

  addFirstAid(count) {
    const before = this.firstAid;
    this.firstAid = Math.min(this.cfg.maxFirstAid, this.firstAid + count);
    return this.firstAid - before;
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
