// Pure helpers for the time-of-day palette and sun position.

// Find the two keys either side of `hour` and how far between them we
// are. Keys must be sorted by hour; the list wraps past midnight.
export function findKeyframes(keys, hour, hoursPerDay) {
  let index = keys.length - 1;
  for (let k = 0; k < keys.length; k++) {
    if (keys[k].hour <= hour) index = k;
  }
  const a = keys[index];
  const b = keys[(index + 1) % keys.length];
  const span = (b.hour - a.hour + hoursPerDay) % hoursPerDay || hoursPerDay;
  const t = ((hour - a.hour + hoursPerDay) % hoursPerDay) / span;
  return { a, b, t };
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Unit vector toward the sun. It rises in the east (+x), passes through
// the south (+z, the witch's side of the map) and sets in the west (-x).
// Elevation follows a half sine from sunrise to sunset; outside that
// window it is below the horizon.
export function sunDirection(hour, skyConfig, out = { x: 0, y: 0, z: 0 }) {
  const { sunriseHour, sunsetHour, sunMaxElevation } = skyConfig;
  const dayFraction = (hour - sunriseHour) / (sunsetHour - sunriseHour);
  const elevation = Math.sin(dayFraction * Math.PI) * sunMaxElevation * (Math.PI / 180);
  const compass = dayFraction * Math.PI; // 0 = east, PI/2 = south, PI = west
  out.x = Math.cos(elevation) * Math.cos(compass);
  out.y = Math.sin(elevation);
  out.z = Math.cos(elevation) * Math.sin(compass);
  return out;
}
