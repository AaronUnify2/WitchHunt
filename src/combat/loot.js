// Loot rolls (pure). A table is a list of { item, chance, min?, max? }
// (data/loot.json); every entry is rolled on its own, so one body can
// drop several things. Returns [{ item, amount }] in table order.

export function rollLoot(table, rng, out = []) {
  out.length = 0;
  for (const entry of table ?? []) {
    if (!rng.chance(entry.chance)) continue;
    const amount = entry.min === undefined ? 1 : rng.int(entry.min, entry.max ?? entry.min);
    if (amount > 0) out.push({ item: entry.item, amount });
  }
  return out;
}

// The loot table for a dead enemy: mutants have their own, zombies use
// their variant's.
export function lootTableFor(enemy, tables) {
  if (enemy.kind === 'mutant') return tables.mutant;
  return tables[enemy.variant] ?? tables.citizen;
}

// A pickup's line in the HUD, e.g. "+4 shotgun shells" or "+ police vest (+40)".
export function pickupLabel(itemDef, amount) {
  if (itemDef.armour) return `+ ${itemDef.name} (+${itemDef.amount} ${itemDef.armour})`;
  if (itemDef.firstAid) return `+ ${itemDef.name}`;
  return `+${amount} ${itemDef.name}`;
}
