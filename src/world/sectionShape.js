// A space built as sections along a line (build queue items 5 and 6; pure,
// tested): each section { id, z0, z1, half, roof }, end to end along +z from
// the way in. One room platform as wide as the widest holds Tom; the rock (or
// hull) either side of each narrower section is a block of that platform.
// The Bigfoot cave's own shape (world/bigfootCaveShape.js) was the first of
// these; this is the same thing for any list of sections.
//
// sectionShape(sections) -> { sections, length, maxHalf, sectionAt(z),
// halfAt(z), confine(x, z, r), blocks() }. Metres, in the space's own frame
// (x across, z in from the way in).

export function sectionShape(sections) {
  const length = sections[sections.length - 1].z1;
  const maxHalf = Math.max(...sections.map((s) => s.half));
  const sectionAt = (z) => sections.find((s) => z >= s.z0 && z < s.z1) ?? (z < sections[0].z0 ? sections[0] : sections[sections.length - 1]);
  const halfAt = (z) => sectionAt(z).half;
  // Keep a point of radius r inside: near a section's end the narrower neighbour's width holds.
  const confine = (x, z, r = 0.3) => {
    const cz = Math.max(sections[0].z0 + 0.4 + r, Math.min(length - 0.4 - r, z));
    const h = Math.min(halfAt(cz - r), halfAt(cz + r)) - r;
    return { x: Math.max(-h, Math.min(h, x)), z: cz };
  };
  // [x0, x1, z0, z1] in the platform's frame, whose middle is (0, length / 2).
  const blocks = () => {
    const mid = length / 2;
    const out = [];
    for (const s of sections) {
      if (s.half >= maxHalf) continue;
      out.push([-maxHalf - 1, -s.half, s.z0 - mid, s.z1 - mid]);
      out.push([s.half, maxHalf + 1, s.z0 - mid, s.z1 - mid]);
    }
    return out;
  };
  return { sections, length, maxHalf, sectionAt, halfAt, confine, blocks };
}
