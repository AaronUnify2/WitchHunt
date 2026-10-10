// Pure analogue-stick maths, kept separate so it can be unit tested.

// Radial dead zone with rescaling: inside `inner` reads as zero, and the
// range inner..outer is stretched to 0..1 so there's no jump at the edge.
export function applyRadialDeadZone(x, y, inner, outer) {
  const mag = Math.hypot(x, y);
  if (mag <= inner) return { x: 0, y: 0 };
  const scaled = Math.min(1, (mag - inner) / (outer - inner));
  const k = scaled / mag;
  return { x: x * k, y: y * k };
}

// Raise the stick's magnitude to `exponent`, keeping its direction.
// exponent 1 = linear; 2 gives finer control near the centre.
export function applyResponseCurve(x, y, exponent) {
  const mag = Math.hypot(x, y);
  if (mag === 0) return { x: 0, y: 0 };
  const k = Math.pow(mag, exponent) / mag;
  return { x: x * k, y: y * k };
}

// Clamp a vector to length 1 (e.g. stick plus keys pressed together).
export function clampLength(x, y) {
  const mag = Math.hypot(x, y);
  if (mag <= 1) return { x, y };
  return { x: x / mag, y: y / mag };
}
