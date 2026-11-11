// The fog that moves wrong (Session 26; DESIGN.md "The Caller": "at most,
// fog that moves when it shouldn't"). Pure: how one mist puff drifts while
// the Caller calls from the trees (render/GroundMist.js uses it; the pull's
// timing is story/Caller.js's fogAt()).
//
// pull: { x, z (the voice), tx, tz (Tom), inhale 0..1, exhale 0..1, radius, speed }.
//  - inhale: puffs within `radius` of Tom stream toward the voice, against the wind;
//  - exhale: puffs within `radius` of the voice roll out of it toward Tom (a bank).
// The wind's share fades as either grows, so for those seconds the mist ignores it.

export function puffVelocity(px, pz, wind, drift, pull, out = { x: 0, z: 0 }) {
  out.x = wind.x * drift;
  out.z = wind.z * drift;
  if (!pull) return out;
  const k = Math.max(pull.inhale, pull.exhale);
  if (k <= 0) return out;
  let vx = 0;
  let vz = 0;
  if (pull.inhale > 0) {
    const d = Math.hypot(px - pull.tx, pz - pull.tz);
    if (d < pull.radius) {
      const tx = pull.x - px;
      const tz = pull.z - pz;
      const l = Math.hypot(tx, tz) || 1;
      const f = pull.inhale * (1 - d / pull.radius) * pull.speed;
      vx += (tx / l) * f;
      vz += (tz / l) * f;
    }
  }
  if (pull.exhale > 0) {
    const d = Math.hypot(px - pull.x, pz - pull.z);
    if (d < pull.radius) {
      const tx = pull.tx - pull.x;
      const tz = pull.tz - pull.z;
      const l = Math.hypot(tx, tz) || 1;
      const f = pull.exhale * (1 - (d / pull.radius) * 0.5) * pull.speed;
      vx += (tx / l) * f;
      vz += (tz / l) * f;
    }
  }
  out.x = out.x * (1 - k) + vx;
  out.z = out.z * (1 - k) + vz;
  return out;
}
