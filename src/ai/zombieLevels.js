// Zombie levels, variants and what a spawn turns into (pure).
// DESIGN.md "Zombies": level = active sigils (1-5); each level sets the
// speed range, horde and mutant chances and the health, damage and notice
// multipliers. The variant mix comes from the clearing type.

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 5;

export function clampLevel(level) {
  return Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, Math.round(level)));
}

// The zombie level for a number of active sigils (no sigils still plays
// as level 1, e.g. for stragglers and debug spawns).
export function levelForSigils(count) {
  return clampLevel(Math.max(MIN_LEVEL, count));
}

// The level table's row (levels: config.zombies.levels).
export function levelStats(levels, level) {
  return levels[clampLevel(level)];
}

// A skewed 0..1 roll: skew > 1 favours the slow end (DESIGN.md "Speed variance").
export function speedRoll(rng, skew) {
  return Math.pow(rng.next(), skew);
}

// Speed in m/s from a roll and a range in multiples of the player's sprint.
export function speedFromRoll(roll, speedMin, speedMax, sprintSpeed) {
  return sprintSpeed * (speedMin + (speedMax - speedMin) * roll);
}

// Pick a variant from a mix like { citizen: 0.7, police: 0.15, army: 0.15 }
// (weights needn't add up to 1). Only variants in `allowed` count, if given.
export function pickVariant(mix, rng, allowed) {
  const keys = Object.keys(mix ?? {}).filter((k) => mix[k] > 0 && (!allowed || allowed.includes(k)));
  if (keys.length === 0) return allowed?.[0] ?? 'citizen';
  let total = 0;
  for (const k of keys) total += mix[k];
  let r = rng.next() * total;
  for (const k of keys) {
    r -= mix[k];
    if (r < 0) return k;
  }
  return keys[keys.length - 1];
}

// What one raising becomes at this level: a horde (7-15 slow zombies), a
// mutant, or a single zombie. mutantAllowed: false when the mutant pool is
// full (it falls back to a single). Returns { type, count }.
export function planSpawn(stats, hordeCfg, rng, mutantAllowed = true) {
  if (rng.chance(stats.hordeChance)) return { type: 'horde', count: rng.int(hordeCfg.countMin, hordeCfg.countMax) };
  if (rng.chance(stats.mutantChance) && mutantAllowed) return { type: 'mutant', count: 1 };
  return { type: 'single', count: 1 };
}
