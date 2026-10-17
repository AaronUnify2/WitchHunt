// Where the trail cameras go (pure; M8). Seeded: the same map gets the
// same cameras. Each sits on a post at the edge of a clearing in one of
// config.trailCams.bands, facing its centre; their clearings are at least
// minSpacing apart. Numbered 1..n from north to south.
//
// M9.1 adds the fixed camera near the storm shelter (#153: the Night 1
// clip of her planting there), with the opening cluster.

// map: the world's map ({ clearings }). rng: an Rng (int, range, next).
// cfg: config.trailCams. Returns [{ id, name, x, z, facing, clearingId }].
export function placeTrailCams(map, rng, cfg) {
  const pool = map.clearings.filter((c) => cfg.bands.includes(c.band) && c.kind !== 'home' && c.kind !== 'hut');
  // Shuffle (Fisher-Yates on the seeded rng).
  for (let i = pool.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const chosen = [];
  for (const c of pool) {
    if (chosen.length >= cfg.count) break;
    if (chosen.some((o) => Math.hypot(o.x - c.x, o.z - c.z) < cfg.minSpacing)) continue;
    chosen.push(c);
  }
  const cams = chosen.map((c) => {
    const a = rng.range(0, Math.PI * 2);
    const r = c.radius * cfg.fromCentre;
    const x = c.x + Math.sin(a) * r;
    const z = c.z + Math.cos(a) * r;
    // Facing: the yaw that looks from the post back to the clearing's centre.
    return { x, z, facing: Math.atan2(x - c.x, z - c.z), clearingId: c.id };
  });
  cams.sort((a, b) => a.z - b.z); // north (smaller z) first
  return cams.map((cam, i) => ({ id: i + 1, name: `Camera ${i + 1}`, ...cam }));
}

// Does the camera see (x, z)? Within range, anywhere in front of it
// (trail cams have a wide lens: 180 degrees).
export function camSees(cam, x, z, range) {
  const dx = x - cam.x;
  const dz = z - cam.z;
  if (dx * dx + dz * dz > range * range) return false;
  // Forward is (-sin facing, -cos facing).
  return dx * -Math.sin(cam.facing) + dz * -Math.cos(cam.facing) >= 0;
}
