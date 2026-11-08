// One power unit for everything (pure; DESIGN.md "The ranger station":
// "Power: one unit for everything", Aaron Nov 8; Session 20). A car
// battery is 100. The fence's store starts with a capacity of 300; the
// crashed plane's alien power cell raises it to 1000 and puts 500 in. The
// alien quad holds 1000 (10 batteries). Cells and batteries fit either.
//
// A unit is { capacity, charge }.

// Put `units` in, up to the capacity. Returns how much went in.
export function addCharge(unit, units) {
  const before = unit.charge;
  unit.charge = Math.min(unit.capacity, unit.charge + Math.max(0, units));
  return unit.charge - before;
}

// Take `units` out if there's that much. Returns whether it was taken.
export function drawCharge(unit, units) {
  if (unit.charge < units) return false;
  unit.charge -= units;
  return true;
}

// Fit a power cell ({ capacity, charge }): the store grows to the cell's
// capacity (never shrinks) and the cell's charge goes in. Returns how
// much charge went in.
export function fitCell(unit, cell) {
  unit.capacity = Math.max(unit.capacity, cell.capacity ?? 0);
  return addCharge(unit, cell.charge ?? 0);
}

export function isFull(unit) {
  return unit.charge >= unit.capacity;
}
