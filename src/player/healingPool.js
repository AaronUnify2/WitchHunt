// The healing pool (pure; DESIGN.md "Health, armour and healing", Aaron
// Nov 8; Session 20). Tom carries kits of several kinds (a first aid kit
// heals 30, an alien med kit 60), shown as one total of healing points
// ("Healing: 90") and capped at config.inventory.healing.poolCap (270,
// Aaron). D-pad right / H heals from it, the kit chosen here so it never
// wastes an alien med kit on a small top-up. Kits that don't fit go to
// the comms room's first aid box (Aaron).
//
// kits: { [kind]: count }. kinds: config.inventory.healing.kits
// ({ [kind]: { heal, name } }).

// Healing points in `kits`.
export function poolPoints(kits, kinds) {
  let sum = 0;
  for (const [kind, n] of Object.entries(kits)) sum += (kinds[kind]?.heal ?? 0) * n;
  return sum;
}

// How many of `count` kits of `kind` fit under the cap.
export function kitsThatFit(kits, kinds, cap, kind, count) {
  const heal = kinds[kind]?.heal ?? 0;
  if (heal <= 0 || count <= 0) return 0;
  const room = cap - poolPoints(kits, kinds);
  return Math.max(0, Math.min(count, Math.floor(room / heal)));
}

// Which kit to use when `missing` points of health are still to heal
// (after anything already healing). The biggest kit that heals no more
// than what's missing; if every kit carried is bigger, the smallest of
// them. Null if there's nothing to use or nothing to heal.
export function chooseKit(kits, kinds, missing) {
  if (missing <= 0) return null;
  let fits = null;
  let smallest = null;
  for (const [kind, n] of Object.entries(kits)) {
    const heal = kinds[kind]?.heal ?? 0;
    if (n <= 0 || heal <= 0) continue;
    if (heal <= missing && (!fits || heal > kinds[fits].heal)) fits = kind;
    if (!smallest || heal < kinds[smallest].heal) smallest = kind;
  }
  return fits ?? smallest;
}

// A fresh { [kind]: 0 } for every kind, with `start` added.
export function emptyKits(kinds, start = {}) {
  const kits = {};
  for (const kind of Object.keys(kinds)) kits[kind] = start[kind] ?? 0;
  return kits;
}
