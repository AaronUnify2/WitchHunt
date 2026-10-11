// One weapon's ammo, fire rate and reload (pure logic). Everything about
// the weapon comes from its entry in config.weapons. Melee weapons have
// no magazine (magSize 0) and only a swing cooldown.
//
// Reload styles: 'magazine' refills in one go after reloadSeconds;
// 'single' loads one round every reloadSeconds and can be cut short by
// firing (shotgun shells).

export class WeaponState {
  constructor(weaponConfig) {
    this.cfg = weaponConfig;
  }

  init(mag = this.cfg.magSize, reserve = this.cfg.startReserve ?? 0) {
    this.mag = mag;
    this.reserve = reserve;
    this.cooldown = 0;
    this.reloadTimer = 0;
    this.reloading = false;
  }

  get usesAmmo() {
    return this.cfg.magSize > 0;
  }

  get canFire() {
    if (this.cooldown > 0) return false;
    if (!this.usesAmmo) return true;
    return this.mag > 0 && (!this.reloading || this.cfg.reloadStyle === 'single');
  }

  get canReload() {
    return this.usesAmmo && !this.reloading && this.mag < this.cfg.magSize && this.reserve > 0;
  }

  // Fire once if possible. Returns true when a shot (or swing) happens.
  fire() {
    if (!this.canFire) return false;
    if (this.reloading) this.cancelReload(); // single-round reload, interrupted
    this.cooldown = this.cfg.fireInterval;
    if (this.usesAmmo) this.mag -= 1;
    return true;
  }

  startReload() {
    if (!this.canReload) return false;
    this.reloading = true;
    this.reloadTimer = this.cfg.reloadSeconds;
    return true;
  }

  cancelReload() {
    this.reloading = false;
    this.reloadTimer = 0;
  }

  addAmmo(rounds) {
    this.reserve += rounds;
  }

  // Returns true on a frame where rounds went into the magazine.
  update(dt) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (!this.reloading) return false;
    this.reloadTimer -= dt;
    if (this.reloadTimer > 0) return false;

    if (this.cfg.reloadStyle === 'single') {
      this.mag += 1;
      this.reserve -= 1;
      if (this.mag < this.cfg.magSize && this.reserve > 0) this.reloadTimer += this.cfg.reloadSeconds;
      else this.cancelReload();
    } else {
      const rounds = Math.min(this.cfg.magSize - this.mag, this.reserve);
      this.mag += rounds;
      this.reserve -= rounds;
      this.cancelReload();
    }
    return true;
  }

  dispose() {}

  // 0..1 progress through the current reload step, for the HUD.
  get reloadProgress() {
    return this.reloading ? 1 - this.reloadTimer / this.cfg.reloadSeconds : 0;
  }
}
