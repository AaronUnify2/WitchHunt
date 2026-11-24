// Where the witch stands at the gas station (Nov 24, Aaron: "We need to ensure that the witch is visible"):
// one of a few spots along the treeline across the road (data/gasStation.json witch.spots), the first that Tom
// can see from where he stands, with nothing in the line between: a car, a pump island, a canopy post, the
// sign's pole. All in the station's own frame (x right as you face the road, z toward it). Pure.

// Distance from point p to the segment a-b.
export function distToSegment(p, a, b) {
  const vx = b.x - a.x;
  const vz = b.z - a.z;
  const len2 = vx * vx + vz * vz;
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.z - a.z) * vz) / len2)) : 0;
  return Math.hypot(a.x + vx * t - p.x, a.z + vz * t - p.z);
}

// The things on the forecourt that hide her, as circles { x, z, r }: the cars where they stand now (frame
// coordinates), each pump island as a row of circles along its length, the canopy's posts and the sign.
export function forecourtBlockers(data, look, cars, carRadius = 2.4) {
  const out = cars.map((c) => ({ x: c.x, z: c.z, r: carRadius }));
  const half = look.island.length / 2;
  for (const p of data.pumps ?? []) {
    for (let s = -half; s <= half + 1e-6; s += half / 2) out.push({ x: p.x + s, z: p.z, r: 0.6 }); // the kerb is 1.1 deep: half and a little
    for (const side of [-1, 1]) out.push({ x: p.x + side * (half + 0.25), z: p.z, r: 0.3 }); // the canopy's posts
  }
  if (data.sign) out.push({ x: data.sign.x, z: data.sign.z, r: 0.45 });
  return out;
}

// Whether the line from Tom to a spot is clear (`margin` metres added round each blocker).
export function lineClear(from, to, blockers, margin = 0.3) {
  return blockers.every((b) => distToSegment(b, from, to) > b.r + margin);
}

// The spot to use: of the clear ones in range (w.minDistance-w.maxDistance from Tom), the one most nearly
// straight across the road from him (least x offset); none clear, the one with the fewest things in the way.
export function pickWitchSpot(from, spots, blockers, w = {}) {
  const min = w.minDistance ?? 0;
  const max = w.maxDistance ?? Infinity;
  const margin = w.margin ?? 0.3;
  const scored = spots.map((s, i) => {
    const d = Math.hypot(s.x - from.x, s.z - from.z);
    const inRange = d >= min && d <= max;
    const hidden = blockers.filter((b) => distToSegment(b, from, s) <= b.r + margin).length;
    return { s, i, inRange, hidden, across: Math.abs(s.x - from.x) };
  });
  const clear = scored.filter((c) => c.hidden === 0 && c.inRange).sort((a, b) => a.across - b.across);
  if (clear.length) return clear[0].s;
  return scored.sort((a, b) => a.hidden - b.hidden || Number(b.inRange) - Number(a.inRange) || a.across - b.across)[0]?.s ?? null;
}
