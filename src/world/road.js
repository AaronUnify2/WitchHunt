// The opening cluster's one road (pure; DESIGN.md "Fixed opening cluster",
// M9.1): an old county road in from the dense forest at the west edge,
// past the gas station's forecourt and south to the military checkpoint.
// Its control points are in data/openingCluster.json ("road"), in metres
// from home's centre; the line through them is a smooth curve sampled
// every `cfg.sample` metres. It's the same every run.

// A Catmull-Rom curve through `pts` ([{ x, z }]), sampled about every
// `step` metres. Passes through every control point.
function smoothLine(pts, step) {
  const out = [{ ...pts[0] }];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const n = Math.max(1, Math.ceil(Math.hypot(p2.x - p1.x, p2.z - p1.z) / step));
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), z: f(p0.z, p1.z, p2.z, p3.z) });
    }
  }
  return out;
}

// home: { x, z } (the cluster's anchor). layout: openingCluster.json's
// "road". cfg: config.road. Returns { points, along, length, width }:
// points along the centre line, and the distance along it at each.
export function buildRoad(home, layout, cfg) {
  const control = layout.points.map(([dx, dz]) => ({ x: home.x + dx, z: home.z + dz }));
  const points = smoothLine(control, cfg.sample);
  const along = [0];
  for (let i = 1; i < points.length; i++) along.push(along[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z));
  return { points, along, length: along[along.length - 1], width: cfg.width, wrecks: layout.wrecks ?? [] };
}

// Where the road's furniture stands: telephone poles along one side, up
// to the closed-road sign, and the sign itself, facing traffic coming in
// from the west. cfg: config.map.road. Returns { poles: [{ x, z, yaw }],
// sign: { x, z, yaw } }; yaw turns +z to face (sin yaw, cos yaw).
export function roadProps(road, cfg) {
  const pc = cfg.poles;
  const poles = [];
  for (let d = pc.startAlong; d <= cfg.sign.along; d += pc.spacing) {
    const f = roadFrame(road, d);
    poles.push({ x: f.x + f.rx * pc.side * pc.offset, z: f.z + f.rz * pc.side * pc.offset, yaw: Math.atan2(f.tx, f.tz) });
  }
  const f = roadFrame(road, cfg.sign.along);
  const sign = { x: f.x + f.rx * cfg.sign.side, z: f.z + f.rz * cfg.sign.side, yaw: Math.atan2(-f.tx, -f.tz) };
  return { poles, sign };
}

// The point `d` metres along the road, its direction (unit tangent) and
// its right-hand side ((tz, -tx), as a vehicle's). Clamped to the ends.
export function roadFrame(road, d) {
  const { points, along } = road;
  d = Math.max(0, Math.min(road.length, d));
  let i = 1;
  while (i < points.length - 1 && along[i] < d) i++;
  const a = points[i - 1];
  const b = points[i];
  const seg = along[i] - along[i - 1] || 1;
  const t = (d - along[i - 1]) / seg;
  const tx = (b.x - a.x) / seg;
  const tz = (b.z - a.z) / seg;
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, tx, tz, rx: tz, rz: -tx };
}

// The index of the road point nearest (x, z).
export function nearestRoadIndex(road, x, z) {
  let best = 0;
  let bestD = Infinity;
  road.points.forEach((p, i) => {
    const d = (p.x - x) ** 2 + (p.z - z) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}

// Distance from (x, z) to the road's centre line, and how far along it
// the nearest point is.
export function roadDistance(road, x, z) {
  const { points, along } = road;
  let best = Infinity;
  let at = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const ex = b.x - a.x;
    const ez = b.z - a.z;
    const len2 = ex * ex + ez * ez;
    const t = len2 > 0 ? Math.max(0, Math.min(1, ((x - a.x) * ex + (z - a.z) * ez) / len2)) : 0;
    const d = Math.hypot(x - (a.x + ex * t), z - (a.z + ez * t));
    if (d < best) {
      best = d;
      at = along[i - 1] + (along[i] - along[i - 1]) * t;
    }
  }
  return { distance: best, along: at };
}
