// The model viewer's orbiting camera (pure; Session 13). The camera
// circles a target point at the model's middle: yaw is the direction
// from the target to the camera (0 = the camera sits on +z, so a model
// facing +z looks straight at it), pitch is how far above the target it
// looks down from, distance is how far out it sits, and height is the
// target's height above the model's feet.

// The orbit a model starts on. height: the model's height (metres).
// cfg: config.modelViewer.start.
export function startOrbit(modelHeight, yaw, cfg) {
  return {
    yaw,
    pitch: cfg.pitch,
    distance: modelHeight * cfg.distanceScale + cfg.distanceAdd,
    height: modelHeight * cfg.heightScale,
  };
}

// One frame of the controls. move: { turn (radians, + to the right),
// tilt (radians, + looks from higher up), zoom (-1..1, + in), raise
// (-1..1, + up) }. limits: config.modelViewer.limits; speeds: { zoom,
// raise } in metres per second at full deflection. Changes orbit in place.
export function stepOrbit(orbit, move, dt, limits, speeds) {
  orbit.yaw = wrapAngle(orbit.yaw - move.turn);
  orbit.pitch = clamp(orbit.pitch + move.tilt, limits.pitchMin, limits.pitchMax);
  // Zooming scales with how far out the camera is, so it's as quick far
  // off as it is fine up close.
  const zoomRate = speeds.zoom * Math.max(1, orbit.distance / 3);
  orbit.distance = clamp(orbit.distance - move.zoom * zoomRate * dt, limits.distanceMin, limits.distanceMax);
  orbit.height = clamp(orbit.height + move.raise * speeds.raise * dt, limits.heightMin, limits.heightMax);
  return orbit;
}

// Where the target and the camera are, given the model's feet at
// (x, y, z): { target: {x, y, z}, camera: {x, y, z} }.
export function orbitPoints(orbit, x, y, z) {
  const target = { x, y: y + orbit.height, z };
  const flat = Math.cos(orbit.pitch) * orbit.distance;
  return {
    target,
    camera: {
      x: x + Math.sin(orbit.yaw) * flat,
      y: target.y + Math.sin(orbit.pitch) * orbit.distance,
      z: z + Math.cos(orbit.yaw) * flat,
    },
  };
}

// Time into a looping pose: t wrapped into [0, length).
export function loopTime(t, length) {
  if (!(length > 0)) return 0;
  return ((t % length) + length) % length;
}

// The next index in a list of n, wrapping round (step +1 or -1).
export function cycle(index, n, step = 1) {
  if (n <= 0) return 0;
  return (((index + step) % n) + n) % n;
}

export function wrapAngle(a) {
  const TAU = Math.PI * 2;
  return a - TAU * Math.floor((a + Math.PI) / TAU);
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
