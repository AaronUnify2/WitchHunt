// Aim assist maths (pure): "light aim assist (slowdown near targets)".
// When the crosshair is over or near a target, controller look speed is
// scaled down so it's easier to stay on it. No magnetism, no snapping.

// targets: [{ x, y, z, r }] (centre of mass and a body radius, metres).
// origin, forward: { x, y, z } (forward a unit vector).
// cfg: { maxDistance, marginDegrees, slowFactor, fadeDegrees }.
// Returns the look-speed multiplier: 1 = none, cfg.slowFactor = full slowdown.
export function aimSlowdown(origin, forward, targets, cfg) {
  const margin = (cfg.marginDegrees * Math.PI) / 180;
  const fade = (cfg.fadeDegrees * Math.PI) / 180;
  let best = 1;
  for (const t of targets) {
    const dx = t.x - origin.x;
    const dy = t.y - origin.y;
    const dz = t.z - origin.z;
    const dist = Math.hypot(dx, dy, dz);
    if (dist === 0 || dist > cfg.maxDistance) continue;
    const cos = (dx * forward.x + dy * forward.y + dz * forward.z) / dist;
    const angle = Math.acos(Math.max(-1, Math.min(1, cos)));
    const inner = Math.atan(t.r / dist) + margin; // full slowdown inside this
    if (angle >= inner + fade) continue;
    const k = angle <= inner ? 1 : 1 - (angle - inner) / fade;
    const factor = 1 - (1 - cfg.slowFactor) * k;
    if (factor < best) best = factor;
  }
  return best;
}
