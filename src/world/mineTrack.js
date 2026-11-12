// The mine's track (pure; Session 30; DESIGN.md "Abandoned mineshaft"): one
// line of rails from the cage's landing down to the bottom, laid out from
// config (config.mineshaft.track) as a run of legs, each so long, turning
// so far and falling at such a grade. Everything below ground hangs off
// it: the tunnel's shape (render/mineModel.js), where the cart is
// (world/MineCart.js), where the dead can walk and where a shot stops
// (the mine has no ground field and no colliders: it's a pocket far under
// the map, world/Interiors.js).
//
// Mine space: metres, the cage's middle at the origin on the landing's
// floor, the track heading +z from it. A yaw is rotation.y's: forward is
// (sin yaw, cos yaw); `lat` is the frame's own +x, (cos yaw, -sin yaw).
// s: metres along the track from the cage (it runs a little behind the
// cage too: track.s0 is negative).

// tc: { step, back, legs: [{ len, turn (degrees, + toward lat), grade (rise per metre: negative falls) }],
//   half (the tunnel's half width), roof, wide: [{ s0, s1, half, ramp }] }.
// Returns { points: [{ s, x, y, z, yaw }], s0, length, step, half, roof, wide }.
export function buildTrack(tc) {
  const step = tc.step ?? 1;
  const raw = [];
  let x = 0;
  let y = 0;
  let z = 0;
  let yaw = 0;
  let s = 0;
  raw.push({ s, x, y, z, yaw });
  for (const leg of tc.legs) {
    const n = Math.max(1, Math.round(leg.len / step));
    const ds = leg.len / n;
    const dyaw = (((leg.turn ?? 0) * Math.PI) / 180) / n;
    for (let i = 0; i < n; i++) {
      const mid = yaw + dyaw / 2;
      x += Math.sin(mid) * ds;
      z += Math.cos(mid) * ds;
      y += (leg.grade ?? 0) * ds;
      yaw += dyaw;
      s += ds;
      raw.push({ s, x, y, z, yaw });
    }
  }
  const length = s;
  // The grade eased where it changes (a moving average over a few metres), so the cart doesn't kink.
  const ease = Math.max(1, Math.round((tc.ease ?? 5) / step));
  const ys = raw.map((_, i) => {
    let sum = 0;
    let n = 0;
    for (let k = -ease; k <= ease; k++) {
      const p = raw[Math.max(0, Math.min(raw.length - 1, i + k))];
      sum += p.y;
      n++;
    }
    return sum / n;
  });
  raw.forEach((p, i) => (p.y = ys[i]));
  // The run behind the cage: straight back, level.
  const points = [];
  const back = tc.back ?? 3;
  const nb = Math.round(back / step);
  for (let i = nb; i >= 1; i--) points.push({ s: -i * step, x: 0, y: raw[0].y, z: -i * step, yaw: 0 });
  for (const p of raw) points.push(p);
  return { points, s0: -nb * step, length, step, half: tc.half, roof: tc.roof, wide: tc.wide ?? [] };
}

const lerp = (a, b, t) => a + (b - a) * t;

// The track at s: { x, y, z, yaw, pitch } (pitch: radians, positive nose down, as rotation.x takes it).
export function pointAt(track, s, out = {}) {
  const pts = track.points;
  const f = Math.max(0, Math.min(pts.length - 1 - 1e-9, (s - track.s0) / track.step));
  const i = Math.floor(f);
  const t = f - i;
  const a = pts[i];
  const b = pts[i + 1];
  out.x = lerp(a.x, b.x, t);
  out.y = lerp(a.y, b.y, t);
  out.z = lerp(a.z, b.z, t);
  out.yaw = lerp(a.yaw, b.yaw, t);
  out.pitch = -Math.atan2(b.y - a.y, track.step);
  out.s = track.s0 + f * track.step;
  return out;
}

// The tunnel's half width at s: the track's own, wider through a gallery (eased over its ramp).
export function halfAt(track, s) {
  let h = track.half;
  for (const w of track.wide) {
    const ramp = w.ramp ?? 4;
    const k = Math.min(1, Math.max(0, (s - w.s0) / ramp), Math.max(0, (w.s1 - s) / ramp));
    if (k > 0) h = Math.max(h, track.half + (w.half - track.half) * (k * k * (3 - 2 * k)));
  }
  return h;
}

// The nearest point of the track to (x, y, z): { s, lat (metres off the line, + toward the frame's +x),
// dy (above the floor), d (how far off, flat) }. Two levels of the spiral lie one above the other, so
// height counts; `hint` (an s) looks near there first.
export function nearest(track, x, y, z, hint = null, out = {}) {
  const pts = track.points;
  const n = pts.length;
  let best = -1;
  let bestD = Infinity;
  const scan = (i0, i1) => {
    for (let i = Math.max(0, i0); i <= Math.min(n - 1, i1); i++) {
      const p = pts[i];
      const dy = (y - p.y) * 2; // a level above or below is further than it looks
      const d = (x - p.x) * (x - p.x) + (z - p.z) * (z - p.z) + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
  };
  if (hint !== null) {
    const hi = Math.round((hint - track.s0) / track.step);
    const span = Math.round(14 / track.step);
    scan(hi - span, hi + span);
    if (bestD > 64) {
      best = -1;
      bestD = Infinity;
    }
  }
  if (best < 0) scan(0, n - 1);
  const p = pts[best];
  // Along and across the track's own frame there.
  const fx = Math.sin(p.yaw);
  const fz = Math.cos(p.yaw);
  const dx = x - p.x;
  const dz = z - p.z;
  const along = Math.max(-track.step, Math.min(track.step, dx * fx + dz * fz));
  out.s = Math.max(track.s0, Math.min(track.length, p.s + along));
  out.lat = dx * fz - dz * fx;
  const q = pts[Math.max(0, Math.min(n - 1, best + (along >= 0 ? 1 : -1)))];
  const t = Math.abs(along) / track.step;
  out.floor = lerp(p.y, q.y, t);
  out.dy = y - out.floor;
  out.d = Math.abs(out.lat);
  out.yaw = p.yaw;
  return out;
}

const _n = {};

// Is (x, y, z) inside the tunnel (between its walls, its floor and its roof, not past either end)?
export function inside(track, x, y, z, hint = null, margin = 0) {
  const n = nearest(track, x, y, z, hint, _n);
  if (n.dy < -0.3 || n.dy > track.roof) return false;
  const along = alongPast(track, x, z, n);
  if (along) return false;
  return Math.abs(n.lat) < halfAt(track, n.s) - margin;
}

// Past either end wall?
function alongPast(track, x, z, n) {
  const pts = track.points;
  const end = n.s >= track.length - 1e-6 ? pts[pts.length - 1] : n.s <= track.s0 + 1e-6 ? pts[0] : null;
  if (!end) return false;
  const a = (x - end.x) * Math.sin(end.yaw) + (z - end.z) * Math.cos(end.yaw);
  return end === pts[0] ? a < -0.5 : a > (track.endRoom ?? 2.5);
}

// How far a ray from `origin` along `dir` (unit) goes before it leaves the tunnel, up to max.
export function rayDistance(track, origin, dir, max, hint = null, step = 0.6) {
  let h = hint;
  let prev = 0;
  for (let t = step; ; t += step) {
    const tt = Math.min(t, max);
    const x = origin.x + dir.x * tt;
    const y = origin.y + dir.y * tt;
    const z = origin.z + dir.z * tt;
    const n = nearest(track, x, y, z, h, _n);
    h = n.s;
    const out = n.dy < -0.05 || n.dy > track.roof || Math.abs(n.lat) >= halfAt(track, n.s) || alongPast(track, x, z, n);
    if (out) return (prev + tt) / 2;
    prev = tt;
    if (tt >= max) return max;
  }
}

// Keep pos ({ x, z }, at height y) between the tunnel's walls, r from them and not past its ends.
// Writes pos.x, pos.z; returns { s, floor }.
export function confine(track, pos, y, r, hint = null, out = {}) {
  const n = nearest(track, pos.x, y, pos.z, hint, _n);
  const lim = Math.max(0.05, halfAt(track, n.s) - r);
  const p = pointAt(track, n.s, _p);
  const lat = Math.max(-lim, Math.min(lim, n.lat));
  pos.x = p.x + Math.cos(p.yaw) * lat;
  pos.z = p.z - Math.sin(p.yaw) * lat;
  out.s = n.s;
  out.floor = p.y;
  out.lat = lat;
  return out;
}
const _p = {};

// A point of the track's frame at s: lat metres across, up metres above the rails' bed, `ahead` further on.
export function trackPoint(track, s, lat = 0, up = 0, out = {}) {
  const p = pointAt(track, s, _p);
  out.x = p.x + Math.cos(p.yaw) * lat;
  out.y = p.y + up;
  out.z = p.z - Math.sin(p.yaw) * lat;
  out.yaw = p.yaw;
  out.pitch = p.pitch;
  return out;
}

// The cart's speed at s (m/s): the fastest of the config's stretches there ({ s0, s1, speed }, else
// `cruise`), eased down to nothing over `brake` metres before the place it has to stop (`stopAt`, or null).
export function speedAt(rc, s, stopAt = null) {
  let v = rc.cruise;
  for (const r of rc.runs ?? []) if (s >= r.s0 && s < r.s1) v = r.speed;
  if (stopAt !== null) {
    const left = stopAt - s;
    if (left <= 0) return 0;
    if (left < rc.brake) v = Math.min(v, Math.max(rc.crawl, v * (left / rc.brake)));
  }
  return v;
}

// The next place the cart has to stop at or after s: the first stop not yet cleared, else the end.
// stops: [{ id, s }], cleared: a Set of ids. Returns { id, s }.
export function nextStop(stops, cleared, s, end) {
  for (const st of stops) if (!cleared.has(st.id) && st.s >= s - 0.01) return st;
  return { id: 'end', s: end };
}

// How deep the cage has come (feet, for the reading) t seconds into a ride of `seconds` to `depth`: it
// starts gently, hangs for `hang` seconds at `hangAt` (0..1 of the way), then drops faster.
export function cageDepth(t, lc) {
  const T = lc.seconds;
  const a = lc.hangAt;
  const t1 = T * a;
  const t2 = t1 + lc.hang;
  const ease = (k) => k * k * (3 - 2 * k);
  if (t <= 0) return 0;
  if (t < t1) return lc.depth * a * ease(t / t1);
  if (t < t2) return lc.depth * a;
  if (t >= T + lc.hang) return lc.depth;
  return lc.depth * (a + (1 - a) * ease((t - t2) / (T - t1)));
}
