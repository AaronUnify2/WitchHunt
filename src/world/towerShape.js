// A space with floors at many heights (Nov 26: the mothership as a
// low-gravity tower climb; pure, tested). Every interior before this had one
// flat floor (a room platform: Player keepInRoom). Here the space is a list
// of solids, and whatever's under Tom's feet is his floor: catwalks, decks,
// stairs, ledges, a lift. Everything is solid all round, so a deck overhead
// is a ceiling and a deck at chest height is a wall.
//
// Solids, in the space's own frame (x across, z, y up; metres):
//   { kind: 'box',  x, z, hx, hz, a, y0, y1 }      a: turned a radians (its +z toward (sin a, cos a))
//   { kind: 'ramp', x, z, hx, hz, a, y0, y1, thick } its top rises from y0 at its -z end to y1 at its +z end
//   { kind: 'cyl',  x, z, r, y0, y1 }
//   { kind: 'ring', x, z, r0, r1, a0, a1, y0, y1 }  a sector of an annulus: angles from +z toward +x (atan2(x, z)),
//                                                   from a0 round to a1 (a1 - a0 >= 2 pi: the whole ring)
// Optional on any: walk (false: not a floor), shots (false: rounds pass), see (false: sight passes), tag, style.
//
// towerShape(solids, { cell }) -> {
//   solids, bounds,
//   floorAt(x, z, y, step, pad): the highest top under (x, z) no higher than y + step (-Infinity: none),
//   ceilingAt(x, z, y, step): the lowest underside above y + step (Infinity: none),
//   confine(p, r, y, height, step): push a circle (p.x, p.z; radius r) out of every solid the body
//     (feet y, height) runs into; returns true if it moved,
//   ray(origin, dir, max, out, flag): how far a ray goes before it meets a solid (flag 'shots' or 'see'
//     skips solids with that set false); out (optional) gets { distance, facing } (facing 1 head-on),
//   contains(s, x, y, z), topAt(s, x, z) }

const TAU = Math.PI * 2;

// ---- one solid ----------------------------------------------------------------------------------

// (x, z) in a box's or ramp's own frame.
function local(s, x, z) {
  const dx = x - s.x;
  const dz = z - s.z;
  const a = s.a ?? 0;
  if (!a) return { lx: dx, lz: dz };
  const c = Math.cos(a);
  const n = Math.sin(a);
  return { lx: dx * c - dz * n, lz: dx * n + dz * c };
}

function toWorldDir(s, lx, lz) {
  const a = s.a ?? 0;
  if (!a) return { x: lx, z: lz };
  const c = Math.cos(a);
  const n = Math.sin(a);
  return { x: lx * c + lz * n, z: -lx * n + lz * c };
}

// Is angle t (radians) in the span a0 -> a1?
export function inSpan(t, a0, a1) {
  if (a1 - a0 >= TAU - 1e-9) return true;
  let d = (t - a0) % TAU;
  if (d < 0) d += TAU;
  return d <= a1 - a0 + 1e-9;
}

// Is (x, z) inside the solid's footprint (grown by pad)?
export function inside2D(s, x, z, pad = 0) {
  switch (s.kind) {
    case 'box':
    case 'ramp': {
      const { lx, lz } = local(s, x, z);
      return Math.abs(lx) <= s.hx + pad && Math.abs(lz) <= s.hz + pad;
    }
    case 'cyl':
      return Math.hypot(x - s.x, z - s.z) <= s.r + pad;
    case 'ring': {
      const dx = x - (s.x ?? 0);
      const dz = z - (s.z ?? 0);
      const d = Math.hypot(dx, dz);
      if (d < s.r0 - pad || d > s.r1 + pad) return false;
      if (s.a1 - s.a0 >= TAU - 1e-9) return true;
      const grow = d > 1e-6 ? pad / d : 0;
      return inSpan(Math.atan2(dx, dz), s.a0 - grow, s.a1 + grow);
    }
    default:
      return false;
  }
}

// The solid's top at (x, z) (a ramp's slopes; the rest are flat).
export function topAt(s, x, z) {
  if (s.kind !== 'ramp') return s.y1;
  const { lz } = local(s, x, z);
  const k = Math.max(0, Math.min(1, (lz + s.hz) / (2 * s.hz)));
  return s.y0 + (s.y1 - s.y0) * k;
}

export function bottomAt(s, x, z) {
  if (s.kind !== 'ramp') return s.y0;
  return topAt(s, x, z) - (s.thick ?? 0.3);
}

export function contains(s, x, y, z, pad = 0) {
  if (!inside2D(s, x, z, pad)) return false;
  return y >= bottomAt(s, x, z) && y <= topAt(s, x, z);
}

// The nearest point of the solid's footprint to (x, z), and the way out from it (unit): null if far.
function nearest(s, x, z) {
  switch (s.kind) {
    case 'box':
    case 'ramp': {
      const { lx, lz } = local(s, x, z);
      const cx = Math.max(-s.hx, Math.min(s.hx, lx));
      const cz = Math.max(-s.hz, Math.min(s.hz, lz));
      const ex = lx - cx;
      const ez = lz - cz;
      const d = Math.hypot(ex, ez);
      if (d > 1e-6) {
        const o = toWorldDir(s, ex / d, ez / d);
        return { d, ox: o.x, oz: o.z, inside: false };
      }
      // Inside: out the nearest side.
      const outs = [[s.hx - lx, 1, 0], [s.hx + lx, -1, 0], [s.hz - lz, 0, 1], [s.hz + lz, 0, -1]];
      outs.sort((a, b) => a[0] - b[0]);
      const o = toWorldDir(s, outs[0][1], outs[0][2]);
      return { d: -outs[0][0], ox: o.x, oz: o.z, inside: true };
    }
    case 'cyl': {
      const dx = x - s.x;
      const dz = z - s.z;
      const d = Math.hypot(dx, dz);
      if (d < 1e-6) return { d: -s.r, ox: 1, oz: 0, inside: true };
      return { d: d - s.r, ox: dx / d, oz: dz / d, inside: d < s.r };
    }
    case 'ring': {
      const cx = s.x ?? 0;
      const cz = s.z ?? 0;
      const dx = x - cx;
      const dz = z - cz;
      const d = Math.hypot(dx, dz);
      const t = Math.atan2(dx, dz);
      const ux = d > 1e-6 ? dx / d : 0;
      const uz = d > 1e-6 ? dz / d : 1;
      if (inSpan(t, s.a0, s.a1)) {
        if (d < s.r0) return { d: s.r0 - d, ox: -ux, oz: -uz, inside: false };
        if (d > s.r1) return { d: d - s.r1, ox: ux, oz: uz, inside: false };
        // In the band: out whichever face is nearer (never inward past the middle).
        const toIn = d - s.r0;
        const toOut = s.r1 - d;
        if (toIn < toOut && s.r0 > 0.05) return { d: -toIn, ox: -ux, oz: -uz, inside: true };
        return { d: -toOut, ox: ux, oz: uz, inside: true };
      }
      // Off its ends: the nearer end face (a radial segment).
      let best = null;
      for (const e of [s.a0, s.a1]) {
        const ex = Math.sin(e);
        const ez = Math.cos(e);
        const along = Math.max(s.r0, Math.min(s.r1, dx * ex + dz * ez));
        const px = ex * along;
        const pz = ez * along;
        const qx = dx - px;
        const qz = dz - pz;
        const q = Math.hypot(qx, qz);
        if (!best || q < best.d) best = { d: q, ox: q > 1e-6 ? qx / q : ez, oz: q > 1e-6 ? qz / q : -ex, inside: false };
      }
      return best;
    }
    default:
      return null;
  }
}

// The solid's footprint box in the frame (for the grid).
function aabb(s) {
  switch (s.kind) {
    case 'box':
    case 'ramp': {
      const a = s.a ?? 0;
      const c = Math.abs(Math.cos(a));
      const n = Math.abs(Math.sin(a));
      const ex = s.hx * c + s.hz * n;
      const ez = s.hx * n + s.hz * c;
      return [s.x - ex, s.x + ex, s.z - ez, s.z + ez];
    }
    case 'cyl':
      return [s.x - s.r, s.x + s.r, s.z - s.r, s.z + s.r];
    case 'ring': {
      const cx = s.x ?? 0;
      const cz = s.z ?? 0;
      return [cx - s.r1, cx + s.r1, cz - s.r1, cz + s.r1];
    }
    default:
      return [0, 0, 0, 0];
  }
}

// A face's normal where a ray met the solid at (x, y, z), came from (px, py, pz).
function normalAt(s, x, y, z, px, py, pz) {
  if (py > topAt(s, px, pz) - 1e-3 && inside2D(s, x, z)) return { x: 0, y: 1, z: 0 };
  if (py < bottomAt(s, px, pz) + 1e-3 && inside2D(s, x, z)) return { x: 0, y: -1, z: 0 };
  const n = nearest(s, px, pz);
  if (!n) return { x: 0, y: 1, z: 0 };
  return { x: n.ox, y: 0, z: n.oz };
}

// ---- the space -----------------------------------------------------------------------------------

export function towerShape(solids, { cell = 4 } = {}) {
  let x0 = Infinity;
  let x1 = -Infinity;
  let z0 = Infinity;
  let z1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  const boxes = solids.map((s) => {
    const b = aabb(s);
    x0 = Math.min(x0, b[0]);
    x1 = Math.max(x1, b[1]);
    z0 = Math.min(z0, b[2]);
    z1 = Math.max(z1, b[3]);
    y0 = Math.min(y0, s.kind === 'ramp' ? Math.min(s.y0, s.y1) - (s.thick ?? 0.3) : s.y0);
    y1 = Math.max(y1, s.kind === 'ramp' ? Math.max(s.y0, s.y1) : s.y1);
    return b;
  });
  const bounds = { x0, x1, z0, z1, y0, y1 };
  const nx = Math.max(1, Math.ceil((x1 - x0) / cell) + 1);
  const nz = Math.max(1, Math.ceil((z1 - z0) / cell) + 1);
  const grid = Array.from({ length: nx * nz }, () => []);
  const ci = (x) => Math.max(0, Math.min(nx - 1, Math.floor((x - x0) / cell)));
  const cj = (z) => Math.max(0, Math.min(nz - 1, Math.floor((z - z0) / cell)));
  const PAD = 0.6; // every solid sits in the cells its footprint (grown this much) touches
  solids.forEach((s, k) => {
    const b = boxes[k];
    for (let i = ci(b[0] - PAD); i <= ci(b[1] + PAD); i++) for (let j = cj(b[2] - PAD); j <= cj(b[3] + PAD); j++) grid[i * nz + j].push(s);
  });
  let stamp = 0;
  const seen = new Map();
  const near = (x, z, r, out) => {
    out.length = 0;
    stamp++;
    for (let i = ci(x - r); i <= ci(x + r); i++)
      for (let j = cj(z - r); j <= cj(z + r); j++)
        for (const s of grid[i * nz + j]) {
          if (seen.get(s) === stamp) continue;
          seen.set(s, stamp);
          out.push(s);
        }
    return out;
  };
  const list = [];
  const list2 = [];

  const floorAt = (x, z, y, step = 0.45, pad = 0.18) => {
    let best = -Infinity;
    for (const s of near(x, z, 0, list)) {
      if (s.walk === false || !inside2D(s, x, z, pad)) continue;
      const t = topAt(s, x, z);
      if (t <= y + step && t > best) best = t;
    }
    return best;
  };

  const ceilingAt = (x, z, y, step = 0.45) => {
    let best = Infinity;
    for (const s of near(x, z, 0, list)) {
      if (!inside2D(s, x, z)) continue;
      const b = bottomAt(s, x, z);
      if (b > y + step && b < best) best = b;
    }
    return best;
  };

  // Out of whatever the body (feet y, `height` tall) runs into; a solid whose top is within `step` of the
  // feet is stepped onto, not pushed against.
  const confine = (p, r, y, height = 1.8, step = 0.45) => {
    let moved = false;
    for (let pass = 0; pass < 3; pass++) {
      let any = false;
      for (const s of near(p.x, p.z, r, list2)) {
        const n = nearest(s, p.x, p.z);
        if (!n || n.d >= r) continue;
        // Where it's met: the near edge (a ramp's height there).
        const ex = p.x - n.ox * Math.max(0, n.d);
        const ez = p.z - n.oz * Math.max(0, n.d);
        const top = topAt(s, ex, ez);
        const bot = bottomAt(s, ex, ez);
        if (top <= y + step || bot >= y + height) continue;
        const push = r - n.d;
        p.x += n.ox * push;
        p.z += n.oz * push;
        any = true;
        moved = true;
      }
      if (!any) break;
    }
    return moved;
  };

  // March the ray in short steps through the cells it crosses; refine the first hit.
  const ray = (o, d, max, out = null, flag = 'shots') => {
    const len = Math.hypot(d.x, d.y, d.z) || 1;
    const dx = d.x / len;
    const dy = d.y / len;
    const dz = d.z / len;
    const stepLen = 0.2;
    const blocks = (s) => s[flag] !== false;
    const hitAt = (t) => {
      const x = o.x + dx * t;
      const y = o.y + dy * t;
      const z = o.z + dz * t;
      for (const s of near(x, z, 0, list)) if (blocks(s) && contains(s, x, y, z)) return s;
      return null;
    };
    let prev = 0;
    for (let t = stepLen; t <= max + stepLen; t += stepLen) {
      const tt = Math.min(t, max);
      const s = hitAt(tt);
      if (s) {
        let a = prev;
        let b = tt;
        for (let k = 0; k < 6; k++) {
          const m = (a + b) / 2;
          if (hitAt(m)) b = m;
          else a = m;
        }
        if (out) {
          const n = normalAt(s, o.x + dx * b, o.y + dy * b, o.z + dz * b, o.x + dx * a, o.y + dy * a, o.z + dz * a);
          out.distance = a;
          out.facing = Math.abs(dx * n.x + dy * n.y + dz * n.z);
          out.solid = s;
        }
        return a;
      }
      prev = tt;
      if (tt >= max) break;
    }
    if (out) {
      out.distance = max;
      out.facing = 0;
      out.solid = null;
    }
    return max;
  };

  // A clear line from a to b (for eyes): nothing with see !== false between.
  const clear = (a, b) => {
    const d = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
    const dist = Math.hypot(d.x, d.y, d.z);
    if (dist < 1e-3) return true;
    return ray(a, d, dist, null, 'see') >= dist - 0.05;
  };

  return { solids, bounds, floorAt, ceilingAt, confine, ray, clear, contains, topAt, near: (x, z, r) => near(x, z, r, []) };
}

// ---- a body moving in it (the Player's feet in the tower; the tests' climber) ------------------
//
// One step for a body { x, y, z, vx, vz, vy, onGround } (the space's frame) toward a wished-for
// velocity wish { x, z } (m/s), jumping if `jump` (pressed this step and on the ground). push: an
// extra shove { x, z } (metres this step). phys: { gravity, jumpSpeed, airSpeed (the most it moves
// sideways in the air), airAccel, accel, decel, radius, height, step }.
// Low gravity: high, slow jumps, and only a little steering once off the ground.
export function stepBody(b, wish, jump, dt, tower, phys, push = null) {
  const y0 = b.y;
  // Sideways: on the ground the stick has it at once; in the air, a little, and never past airSpeed.
  if (b.onGround) {
    const speeding = Math.hypot(wish.x, wish.z) >= Math.hypot(b.vx, b.vz);
    const max = (speeding ? phys.accel : phys.decel) * dt;
    b.vx += Math.max(-max, Math.min(max, wish.x - b.vx));
    b.vz += Math.max(-max, Math.min(max, wish.z - b.vz));
  } else {
    let wx = wish.x;
    let wz = wish.z;
    const w = Math.hypot(wx, wz);
    if (w > phys.airSpeed) {
      wx *= phys.airSpeed / w;
      wz *= phys.airSpeed / w;
    }
    const max = phys.airAccel * dt;
    // Only steer toward the wish where it's more than what it carries (no braking to a stop mid-air).
    const ddx = wx - b.vx;
    const ddz = wz - b.vz;
    const dd = Math.hypot(ddx, ddz);
    if (dd > 1e-6) {
      const k = Math.min(1, max / dd);
      b.vx += ddx * k;
      b.vz += ddz * k;
    }
  }
  if (jump && b.onGround) {
    b.vy = phys.jumpSpeed;
    b.onGround = false;
    const v = Math.hypot(b.vx, b.vz);
    if (v > phys.airSpeed) {
      b.vx *= phys.airSpeed / v;
      b.vz *= phys.airSpeed / v;
    }
  }
  const p = { x: b.x + b.vx * dt + (push?.x ?? 0), z: b.z + b.vz * dt + (push?.z ?? 0) };
  tower.confine(p, phys.radius, b.y, phys.height, phys.step);
  // A wall took the speed into it.
  const mx = (p.x - b.x) / dt;
  const mz = (p.z - b.z) / dt;
  if (Math.hypot(mx - b.vx, mz - b.vz) > 0.5) {
    b.vx = mx - (push?.x ?? 0) / dt;
    b.vz = mz - (push?.z ?? 0) / dt;
  }
  b.x = p.x;
  b.z = p.z;
  // Up and down: the floor's the highest top under the feet no higher than a step up from where they were.
  let floor = tower.floorAt(b.x, b.z, y0, phys.step);
  if (floor === -Infinity) floor = (tower.bounds?.y0 ?? 0) - 40; // (off everything: keep falling; a safety net catches it)
  if (b.onGround) {
    if (floor < y0 - phys.step) {
      b.onGround = false; // walked off an edge
      b.vy = 0;
    } else {
      b.y = floor;
      b.vy = 0;
    }
  }
  if (!b.onGround) {
    b.vy -= phys.gravity * dt;
    b.y += b.vy * dt;
    if (b.vy > 0) {
      const ceil = tower.ceilingAt(b.x, b.z, y0, phys.step);
      if (b.y + phys.height > ceil) {
        b.y = Math.max(floor, ceil - phys.height);
        b.vy = 0;
      }
    }
    if (b.y <= floor) {
      b.y = floor;
      b.vy = 0;
      b.onGround = true;
    }
  }
  return b;
}
