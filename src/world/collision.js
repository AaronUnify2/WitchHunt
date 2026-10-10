// Pure 2D collision helpers on the ground plane (x, z).

// Push a circle at `pos` with `radius` out of every overlapping static
// circle. Mutates and returns `pos`.
export function resolveCircles(pos, radius, circles) {
  for (const c of circles) {
    const dx = pos.x - c.x;
    const dz = pos.z - c.z;
    const minDist = radius + c.r;
    const distSq = dx * dx + dz * dz;
    if (distSq >= minDist * minDist) continue;
    const dist = Math.sqrt(distSq);
    if (dist === 0) {
      pos.x += minDist; // dead centre: push out along +x
      continue;
    }
    const push = (minDist - dist) / dist;
    pos.x += dx * push;
    pos.z += dz * push;
  }
  return pos;
}

// Keep `pos` within `maxRadius` of the origin. Mutates and returns `pos`.
export function clampToRadius(pos, maxRadius) {
  const dist = Math.hypot(pos.x, pos.z);
  if (dist > maxRadius) {
    pos.x *= maxRadius / dist;
    pos.z *= maxRadius / dist;
  }
  return pos;
}
