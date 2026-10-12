// Tonight's danger to the station (pure; DESIGN.md "Danger rating":
// the sum over active sigils of spawn strength x zombie level, weighted by
// closeness to the station).
//
// For each sigil (M6):
//  - spawn strength: the zombies it sends marching tonight, its night
//    quota x the share that march (config.sigils);
//  - closeness: the share of them that get home before dawn. Groups rise
//    through the first part of the night (raiseSpread of it) and walk the
//    pathways at a typical marching pace, so a far sigil's last groups
//    don't make it;
//  - level: each arriving zombie is worth perZombie x the level's
//    defenceDamage (how hard it hits the defences).
// Danger is in the same units as security, so margin = security - danger
// reads straight off DESIGN.md's margin table (nightResolver.js).

// A typical marching group's speed at `level`, out of sight (m/s): the
// level's typical roll x the sprint, at the group's pace, x the abstract
// tier's forced march.
export function marchSpeed(cfg, level) {
  const z = cfg.zombies;
  const L = z.levels[level];
  const typical = L.speedMin + (L.speedMax - L.speedMin) * cfg.danger.typicalSpeedRoll;
  return typical * z.sprintSpeed * z.wander.marchPackPace * z.lod.abstractMarchScale;
}

// One sigil `distance` metres from home by pathway. Returns { marchers,
// arriving (0-1), travel (s), firstArrival (s into the night), threat
// (per zombie), value }.
export function sigilDanger(distance, level, cfg, nightSeconds) {
  const sc = cfg.sigils;
  const d = cfg.danger;
  const quota = sc.nightQuota[level - 1] ?? 0;
  const marchers = quota * sc.marchShare;
  const travel = distance / marchSpeed(cfg, level);
  const arriving = Math.max(0, Math.min(1, (nightSeconds - travel) / (nightSeconds * d.raiseSpread)));
  const threat = d.perZombie * (cfg.zombies.levels[level]?.defenceDamage ?? 1);
  const [a, b] = sc.firstSpawnDelay;
  return { marchers, arriving, travel, firstArrival: (a + b) / 2 + travel, threat, value: marchers * arriving * threat };
}

// Every sigil. sigils: [{ x, z, ... }]. distanceOf(sigil): metres home by
// pathway. describe(sigil): a label. Returns { total, threat, parts:
// [{ label, value, marchers, arriving, firstArrival }] }.
export function nightDanger(sigils, distanceOf, describe, level, cfg, nightSeconds) {
  const parts = [];
  let total = 0;
  for (const s of sigils) {
    const one = sigilDanger(distanceOf(s), level, cfg, nightSeconds);
    parts.push({ label: describe(s), ...one });
    total += one.value;
  }
  const threat = cfg.danger.perZombie * (cfg.zombies.levels[level]?.defenceDamage ?? 1);
  return { total, threat, parts };
}
