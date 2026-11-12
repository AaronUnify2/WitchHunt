// The Bigfoot cave's shape (build queue item 3; pure, tested). SCAFFOLDING: a
// fixed cave for now (DESIGN: "a small seeded interior"; the seed comes with
// the encounter's own design session). It runs along +z from the way in:
// the entry tunnel, the egg chamber, a passage (the lair's throat), and the
// last chamber where the Mothman has Bigfoot. Metres, in the cave's own frame
// (x across, z in from the mouth).

export const CAVE_SECTIONS = [
  { id: 'tunnel', z0: 0, z1: 22, half: 2.2, roof: 3.0 },
  { id: 'eggs', z0: 22, z1: 36, half: 6.5, roof: 5.2 },
  { id: 'throat', z0: 36, z1: 44, half: 2.4, roof: 3.2 },
  { id: 'lair', z0: 44, z1: 64, half: 9, roof: 7 },
];

export const CAVE = { length: 64, maxHalf: 9, mothman: { x: 1.5, z: 55 }, cocoon: { x: -0.5, z: 62.2 }, hearth: { x: -5.5, z: 49 } };

export function sectionAt(z) {
  return CAVE_SECTIONS.find((s) => z >= s.z0 && z < s.z1) ?? (z < 0 ? CAVE_SECTIONS[0] : CAVE_SECTIONS[CAVE_SECTIONS.length - 1]);
}

// Half the cave's width at z.
export function halfAt(z) {
  return sectionAt(z).half;
}

// Keep a point of radius r inside the rock: returns { x, z }.
export function confine(x, z, r = 0.3) {
  const cz = Math.max(0.4 + r, Math.min(CAVE.length - 0.4 - r, z));
  // Near a section's end the narrower neighbour's width holds (no stepping through a corner).
  const h = Math.min(halfAt(cz - r), halfAt(cz + r)) - r;
  return { x: Math.max(-h, Math.min(h, x)), z: cz };
}

// The room platform's blocks ([x0, x1, z0, z1] in the platform's frame, whose
// middle is the cave's (0, length / 2)): the rock either side of each
// section narrower than the widest.
export function caveBlocks() {
  const mid = CAVE.length / 2;
  const out = [];
  for (const s of CAVE_SECTIONS) {
    if (s.half >= CAVE.maxHalf) continue;
    out.push([-CAVE.maxHalf - 1, -s.half, s.z0 - mid, s.z1 - mid]);
    out.push([s.half, CAVE.maxHalf + 1, s.z0 - mid, s.z1 - mid]);
  }
  return out;
}
