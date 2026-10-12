// Nights while the player is away (pure; DESIGN.md "simulated nights"):
// the margin (security - danger) decides how the station fares.
//
// | Margin       | While away                     |
// | +20 or more  | Clean night, minimal damage    |
// | 0 to +19     | Holds, takes damage            |
// | -1 to -10    | May fall (chance-based)        |
// | below -10    | Likely overrun                 |
//
// M6 resolves the night one attack at a time: each marching group (or
// stray) that reaches the station while you're away is resolved with the
// margin as it stands then (security falls as the night wears the
// defences down; digging up a sigil lowers the danger). An attack does
// damage in proportion to its size and the band, and carries its share of
// the whole night's chance of falling, so a night of several attacks
// falls about as often as the table says.

function lerp(a, b, t) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

// The band for a margin: { band, label, damage (fraction of an attack's
// full damage that lands), fallChance (over the whole night) }.
export function verdict(margin, r) {
  if (margin >= r.cleanMargin) return { band: 'clean', label: 'Clean night, minimal damage', damage: r.damage.clean, fallChance: 0 };
  if (margin >= 0) {
    // From the most damage at 0 to the least just under the clean margin.
    return { band: 'holds', label: 'Holds, takes damage', damage: lerp(r.damage.holds[0], r.damage.holds[1], margin / r.cleanMargin), fallChance: 0 };
  }
  if (margin >= r.mayFallMargin) {
    const t = margin / r.mayFallMargin; // 0 just under 0, 1 at the bottom of the band
    return { band: 'mayFall', label: 'May fall', damage: r.damage.mayFall, fallChance: lerp(r.fall.mayFall[0], r.fall.mayFall[1], t) };
  }
  const t = (r.mayFallMargin - margin) / r.overrunSpan;
  return { band: 'overrun', label: 'Likely overrun', damage: r.damage.overrun, fallChance: lerp(r.fall.overrun[0], r.fall.overrun[1], t) };
}

// One attack's chance of breaking through, as its `share` (0-1) of the
// night's danger: attacks making up the whole night fall with the night's chance.
export function attackFallChance(nightChance, share) {
  const s = Math.max(0, Math.min(1, share));
  return 1 - Math.pow(1 - nightChance, s);
}

// Resolve one attack. a: { margin, zombies, threat (danger per zombie),
// nightDanger, defenceDamage (the level's), roll (0-1) }. r:
// config.nights.resolver. Returns { verdict, share, damage (barrier
// health to take off), falls, turretRounds (most it can use), zaps }.
export function resolveAttack(a, r) {
  const v = verdict(a.margin, r);
  const danger = a.zombies * a.threat;
  const share = danger / Math.max(a.nightDanger, danger, 1e-6);
  const falls = a.roll < attackFallChance(v.fallChance, share);
  return {
    verdict: v,
    share,
    damage: a.zombies * r.healthPerZombie * a.defenceDamage * v.damage,
    falls,
    turretRounds: a.zombies * r.turretRoundsPerZombie,
    zaps: a.zombies * r.zapsPerZombie,
  };
}
