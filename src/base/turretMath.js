// The automated turret's numbers (pure; DESIGN.md "The automated turret").
//  - Any ammo converts to turret rounds by damage: rounds gained = rounds
//    loaded x (that ammo's damage per round / a turret round's damage).
//  - Each fire mode shoots once every `seconds`; a night needs
//    nightSeconds / seconds rounds.
//  - Ammo coverage = rounds loaded / rounds needed (at most 1); its
//    security = the mode's value x coverage, and 0 when unpowered.

// Damage per round of an ammo type: a gun's damage x its pellets (a shell
// is 8 pellets x 6 = 48), or the turret config's table for ammo whose gun
// isn't carried yet (the pistol).
export function ammoDamage(ammoId, weaponsCfg, turretCfg) {
  const w = weaponsCfg[ammoId];
  if (w && w.kind === 'hitscan') return w.damage * (w.pellets ?? 1);
  return turretCfg.ammoDamage[ammoId] ?? 0;
}

export function turretRoundsFor(rounds, damagePerRound, roundDamage) {
  if (rounds <= 0 || roundDamage <= 0) return 0;
  return (rounds * damagePerRound) / roundDamage;
}

export function roundsNeeded(mode, nightSeconds) {
  return nightSeconds / mode.seconds;
}

export function ammoCoverage(rounds, mode, nightSeconds) {
  const needed = roundsNeeded(mode, nightSeconds);
  return needed > 0 ? Math.min(1, Math.max(0, rounds) / needed) : 0;
}

export function turretSecurity(rounds, mode, nightSeconds, powered) {
  if (!powered) return 0;
  return mode.security * ammoCoverage(rounds, mode, nightSeconds);
}

// Seconds of firing the loaded rounds last in this mode.
export function secondsOfFire(rounds, mode) {
  return Math.max(0, rounds) * mode.seconds;
}

// Turn `yaw` toward `target` (radians) by at most `maxStep`. Returns the new yaw.
export function turnToward(yaw, target, maxStep) {
  let diff = target - yaw;
  diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  if (Math.abs(diff) <= maxStep) return target;
  return yaw + Math.sign(diff) * maxStep;
}

// Absolute difference between two angles (radians), 0..pi.
export function angleBetween(a, b) {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

// Which zombie the turret shoots: living, out of the ground, in range
// and in sight (canSee(z)), preferring those inside the fence, then those
// clawing at the defences, then the nearest. Returns the zombie or null.
export function pickTarget(turret, zombies, range, canSee, isInside, isClawing) {
  let best = null;
  let bestScore = Infinity;
  for (const z of zombies) {
    if (!z.alive || z.state === 'rise') continue;
    const d = Math.hypot(z.x - turret.x, z.z - turret.z);
    if (d > range) continue;
    // Lower is better: distance, minus a big bonus for the urgent ones.
    const score = d - (isInside(z) ? 1000 : 0) - (isClawing(z) ? 500 : 0);
    if (score >= bestScore) continue;
    if (!canSee(z)) continue;
    best = z;
    bestScore = score;
  }
  return best;
}
