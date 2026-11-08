// The end of the road north (pure; Session 21, M10.2; DESIGN.md "the road
// north", "Bigfoot cave: the cave's location"). The road past the gas
// station forks north and runs to the foot of the cliff, where an old road
// tunnel goes into the rock. The tunnel's fallen in, and the army have
// closed the road in front of it: a ROAD CLOSED barrier (nobody in or out),
// instead of an invisible wall. Just south of the barrier, on the east side
// of the road, a spur of rock juts out of the cliff, and in its south face
// is Bigfoot's cave, its mouth hidden behind brush until the dozer clears
// it. That's why Earl saw Bigfoot so often, and opened the Home of Bigfoot
// shop at the gas station down the road.
//
// Everything here is the same on every run (the cluster's land). Positions
// are worked out from the road north's end and the cliff line; the numbers
// are config.map.roadNorth's. x is east, z south (the map's own axes).

import { cliffZ } from './mapGeometry.js';
import { roadFrame } from './road.js';

// geo: the map's geometry. north: the road north (road.js buildBranch).
// cfg: config.map.roadNorth. Returns the layout (see the fields below).
export function roadNorthLayout(geo, north, cfg) {
  const end = north.points[north.points.length - 1];
  const x0 = end.x;
  const line = cliffZ(geo, x0);
  const p = cfg.portal;
  const portal = {
    x: x0,
    face: line + p.front, // the headwall's front face (z)
    back: line - p.into, // it's set into the rock
    width: p.width,
    height: p.height,
    opening: p.opening, // { width, spring, height }: the arch
    wing: p.wing,
  };
  const b = cfg.barrier;
  const barrier = { x: x0, z: line + b.fromCliff, half: b.half, jersey: line + b.fromCliff - b.jerseyBack };
  const o = cfg.outcrop;
  // The rock spur east of the road: from the cliff out to its south face,
  // where the cave's mouth is.
  const mouth = { x: x0 + o.mouthEast, z: line + o.reach, width: o.mouth.width, height: o.mouth.height, depth: o.mouth.depth };
  const outcrop = { x0: x0 + o.west, x1: x0 + o.east, z0: line - 2, z1: line + o.reach, line };
  const br = cfg.brush;
  const brush = { x: mouth.x, z: mouth.z + br.depth / 2 + br.gap, hx: br.width / 2, hz: br.depth / 2 };
  // Session 21 (Aaron: it should come away a piece at a time): the brush is
  // pieces: bushes packed in a jittered grid (the back ones bigger, up the
  // rock) and deadfall trunks leaned against it. Each its own collider; the
  // dozer's blade knocks each away as it reaches it.
  brush.pieces = brushPieces(brush, br);
  // Earl's signs on the way up: frames along the road north (yaw: facing).
  const signs = cfg.signs.map((s) => {
    const f = roadFrame(north, s.along < 0 ? north.length + s.along : s.along);
    const side = s.side;
    // A sign faces the traffic that reads it: southbound traffic (from the
    // tunnel) meets a sign facing up the road (its heading, north); northbound, down it.
    const yaw = s.for === 'southbound' ? Math.atan2(f.tx, f.tz) : Math.atan2(-f.tx, -f.tz);
    return { id: s.id, x: f.x + f.rx * side, z: f.z + f.rz * side, yaw, title: s.title, lines: s.lines, art: s.art ?? null };
  });
  // Big prints in the soft ground by the brush, going in (a hint, not a sign).
  const prints = cfg.prints.map(([dx, dz, turn]) => ({ x: mouth.x + dx, z: brush.z + brush.hz + dz, yaw: Math.PI + turn }));
  // Ground kept open (no trees): the road's end, the barrier, the spur and the brush.
  const open = [
    { x: x0, z: line + 6, r: p.width / 2 + 3 },
    { x: (outcrop.x0 + outcrop.x1) / 2, z: (outcrop.z0 + outcrop.z1) / 2, r: Math.hypot(outcrop.x1 - outcrop.x0, outcrop.z1 - outcrop.z0) / 2 + 2 },
    { x: brush.x, z: brush.z, r: Math.hypot(brush.hx, brush.hz) + 2 },
  ];
  return { end: { x: end.x, z: end.z }, line, portal, barrier, outcrop, mouth, brush, signs, prints, open };
}

// The brush's pieces ({ x, z, r, kind: 'bush' | 'log', back: 0..1 toward the rock, seed }), from a fixed seed.
function brushPieces(b, cfg) {
  let seed = 4021;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const out = [];
  const cols = cfg.cols;
  const rows = cfg.rows;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const x = b.x - b.hx + ((i + 0.5) / cols) * b.hx * 2 + (rand() - 0.5) * 0.6;
      const z = b.z - b.hz + ((j + 0.5) / rows) * b.hz * 2 + (rand() - 0.5) * 0.4;
      const back = 1 - (z - (b.z - b.hz)) / (b.hz * 2);
      out.push({ x, z, r: 0.75 + rand() * 0.35 + back * 0.4, kind: 'bush', back, seed: 300 + out.length });
    }
  }
  for (let k = 0; k < cfg.logs; k++) {
    const x = b.x - b.hx * 0.7 + (k / Math.max(1, cfg.logs - 1)) * b.hx * 1.4 + (rand() - 0.5) * 0.5;
    out.push({ x, z: b.z + b.hz * (0.1 + rand() * 0.5), r: 0.7, kind: 'log', back: 0.5, seed: 500 + k, lean: (rand() - 0.5) * 0.7 });
  }
  return out;
}

// Is (x, z) in the brush in front of the cave (grown by `pad` metres)?
export function inBrush(layout, x, z, pad = 0) {
  const b = layout.brush;
  return Math.abs(x - b.x) <= b.hx + pad && Math.abs(z - b.z) <= b.hz + pad;
}

// The colliders: the barrier across the road (stops everyone: nobody in or
// out), the spur of rock (circles along its outline), and the brush (the
// player only, until it's cleared: the dozer drives through it).
export function roadNorthColliders(layout, cfg) {
  const out = [];
  const b = layout.barrier;
  const zMid = (b.z + b.jersey) / 2;
  out.push({ seg: true, ax: b.x - b.half, az: zMid, bx: b.x + b.half, bz: zMid, t: Math.abs(b.z - b.jersey) / 2 + 0.35, x: b.x, z: zMid, r: b.half + 1, top: 1.8, what: 'barrier' });
  // The spur: its outline, bar the cliff side.
  const o = layout.outcrop;
  const rr = cfg.outcrop.colliderRadius;
  const step = rr * 1.4;
  for (let z = o.line + 2; z <= o.z1; z += step) {
    out.push({ x: o.x0 + rr * 0.6, z, r: rr, what: 'rock' });
    out.push({ x: o.x1 - rr * 0.6, z, r: rr, what: 'rock' });
  }
  for (let x = o.x0; x <= o.x1; x += step) {
    // The south face, bar the mouth (it's a hole, but the brush and the dark keep Tom out for now).
    out.push({ x, z: o.z1 - rr * 0.6, r: rr, what: 'rock' });
    for (let z = o.line + 2; z < o.z1 - rr; z += step * 1.6) out.push({ x, z, r: rr, what: 'rock' });
  }
  // One per piece of the brush (Session 21: they go one at a time).
  layout.brush.pieces.forEach((p, i) => out.push({ x: p.x, z: p.z, r: p.r, playerOnly: true, what: 'brush', piece: i }));
  return out;
}
