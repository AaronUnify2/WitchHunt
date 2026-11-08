// The loadout (pure; DESIGN.md "Loadout" and "Tools vs weapons", Aaron
// Nov 8; Session 20). Tom carries two long guns, a sidearm and one melee
// weapon (the flare gun is always to hand on Y, outside the loadout).
// Whatever doesn't fit waits on the comms room's gun rack: a gun picked up
// with its slot full goes to the rack by itself (Aaron: carrying isn't a
// real pressure). Tools (the shovel) live on the belt: they never take a
// slot and come out by themselves to dig. The shovel is also the melee
// weapon until something better takes the slot; then it's only a tool.
//
// cfg: config.weapons.loadout ({ slots: { [slot]: count }, slotOf: { [id]: slot }, tools: [id] }).
// Weapons with no slot (the detonator, empty hands) are always carried.

export function slotOf(cfg, id) {
  return cfg.slotOf[id] ?? null;
}

export function isTool(cfg, id) {
  return cfg.tools.includes(id);
}

// How many carried weapons (in `order`) are in `slot`.
export function carriedIn(cfg, order, slot) {
  let n = 0;
  for (const id of order) if (slotOf(cfg, id) === slot) n++;
  return n;
}

// Can `id` join the carried weapons in `order`?
export function hasRoom(cfg, order, id) {
  const slot = slotOf(cfg, id);
  if (!slot) return true;
  return carriedIn(cfg, order, slot) < (cfg.slots[slot] ?? 0);
}

// The carried weapons `id` could be swapped for (same slot).
export function swapCandidates(cfg, order, id) {
  const slot = slotOf(cfg, id);
  if (!slot) return [];
  return order.filter((x) => x !== id && slotOf(cfg, x) === slot);
}
