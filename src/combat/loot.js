// Loot rolls (pure). A table is a list of { item, chance, min?, max? }
// (data/loot.json); every entry is rolled on its own, so one body can
// drop several things. Returns [{ item, amount }] in table order.

// Session 20: lootGate.allows(item) holds items back until their story
// flag (loot.json items' "after"; Game sets it). The chance is still
// rolled, so a held-back item doesn't change the rest of the loot.
export const lootGate = { allows: () => true };

export function rollLoot(table, rng, out = []) {
  out.length = 0;
  for (const entry of table ?? []) {
    if (!rng.chance(entry.chance)) continue;
    if (!lootGate.allows(entry.item)) {
      if (entry.min !== undefined) rng.int(entry.min, entry.max ?? entry.min); // the same draws either way
      continue;
    }
    const amount = entry.min === undefined ? 1 : rng.int(entry.min, entry.max ?? entry.min);
    if (amount > 0) out.push({ item: entry.item, amount });
  }
  return out;
}

// The loot table for a dead enemy: mutants have their own, zombies use
// their variant's.
export function lootTableFor(enemy, tables) {
  if (enemy.kind === 'mutant') return tables.mutant;
  const table = tables[enemy.variant] ?? tables.citizen;
  // Session 17: an army zombie whose helmet was knocked off has none to drop.
  return enemy.helmetOff ? table.filter((e) => e.item !== 'helmet') : table;
}

// A pickup's line in the HUD, e.g. "+4 shotgun shells" or "+ police vest (+40)".
export function pickupLabel(itemDef, amount) {
  if (itemDef.armour) return `+ ${itemDef.name} (+${itemDef.amount} ${itemDef.armour})`;
  if (itemDef.firstAid) return `+ ${itemDef.name}`;
  return `+${amount} ${itemDef.name}`;
}
