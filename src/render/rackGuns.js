// Session 23 (#343): the guns on the comms room's rack, as simple shapes
// (placeholder looks), so Tom can see what's waiting there. Each gun stands
// upright on the rack's shelf, its side to the room: y up from the butt, z
// across the gun (the grip and magazine toward +z), x its thickness.
// config.station.gunRack.show: { stock, steel, guns: { id: { length, pump,
// scope, mag, stock } } }.
//
// box(w, h, d, x, y, z, colour): a box stood on y at (x, z) (StationRenderer's).

// The boxes for one gun (gun-local; exported for the tests).
export function rackGunParts(look, defaults, box) {
  const L = look.length ?? 1;
  const stock = look.stock ?? defaults.stock;
  const steel = look.steel ?? defaults.steel;
  const parts = [];
  if (L < 0.4) {
    // A handgun: the grip, then the slide and barrel.
    parts.push(box(0.03, 0.11, 0.035, 0, 0, 0.02, stock));
    parts.push(box(0.028, L - 0.08, 0.03, 0, 0.08, 0, steel));
    return parts;
  }
  parts.push(box(0.045, 0.3 * L, 0.11, 0, 0, 0, stock)); // the stock
  parts.push(box(0.035, 0.1, 0.04, 0, 0.27 * L, 0.05, stock)); // the grip
  parts.push(box(0.04, 0.22 * L, 0.06, 0, 0.3 * L, 0, steel)); // the receiver
  parts.push(box(0.022, 0.48 * L, 0.022, 0, 0.52 * L, -0.01, steel)); // the barrel
  if (look.pump) parts.push(box(0.045, 0.14 * L, 0.045, 0, 0.6 * L, -0.01, stock));
  if (look.mag) parts.push(box(0.03, 0.12, 0.05, 0, 0.36 * L, 0.055, steel));
  if (look.scope) parts.push(box(0.045, 0.24 * L, 0.045, 0, 0.36 * L, -0.06, steel));
  return parts;
}

// Where peg i's gun stands: rack: { x, z0, dz, y } (world, from the interior builder).
export function rackSlot(rack, i) {
  return { x: rack.x, y: rack.y, z: rack.z0 + i * rack.dz };
}
