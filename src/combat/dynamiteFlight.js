// A thrown stick of dynamite (pure; Session 27; config.dynamite). It leaves
// the hand on an arc (gravity, no drag, so the drawn arc is where it goes
// until it first touches something), bounces off the ground losing most of
// its speed, glances off trunks, walls and the dead, then rolls to a stop.
// It never goes off by itself here: the fuse is Dynamite.js's.
//
// throwVelocity(): the launch from where Tom's looking. throwArc(): the arc
// drawn while it's lit (until it first lands). stepStick(): one step of a
// stick in the world.

// The launch velocity: `speed` along the look direction (fx, fy, fz: unit), tipped up by `lift`
// radians (toward the sky, about the look's horizontal right).
export function throwVelocity(fx, fy, fz, speed, lift) {
  const flat = Math.hypot(fx, fz) || 1;
  const pitch = Math.atan2(fy, flat) + lift;
  const c = Math.cos(pitch);
  return { x: (fx / flat) * c * speed, y: Math.sin(pitch) * speed, z: (fz / flat) * c * speed };
}

// The arc from (o) at velocity (v) until it meets the ground (heightAt(x, z)), at most `dots`
// points `step` seconds apart. Returns { points: [{ x, y, z }], land: { x, y, z, t } | null }.
export function throwArc(o, v, gravity, heightAt, dots, step) {
  const points = [];
  let land = null;
  let px = o.x;
  let py = o.y;
  let pz = o.z;
  for (let i = 1; i <= dots && !land; i++) {
    const t = i * step;
    const x = o.x + v.x * t;
    const y = o.y + v.y * t - 0.5 * gravity * t * t;
    const z = o.z + v.z * t;
    const g = heightAt(x, z);
    if (y <= g) {
      // Where between the last point and this one it crossed the ground.
      const g0 = heightAt(px, pz);
      const a = py - g0;
      const b = g - y;
      const k = a + b > 1e-6 ? a / (a + b) : 1;
      land = { x: px + (x - px) * k, y: g0 + (g - g0) * k, z: pz + (z - pz) * k, t: (i - 1 + k) * step };
      points.push({ ...land });
    } else points.push({ x, y, z });
    px = x;
    py = y;
    pz = z;
  }
  return { points, land };
}

// One step of a stick. s: { x, y, z, vx, vy, vz, resting, bounces }. cfg: config.dynamite.
// world: { heightAt(x, z), blockers: colliders near it ([{ x, z, r, top } or segments]),
// bodies: [{ x, z, y, hitRadius, height }] (the dead: it glances off them) }.
// Returns 'bounce' on a bounce off the ground (or a glance off something), else null.
export function stepStick(s, dt, cfg, world) {
  if (s.resting) return null;
  let event = null;
  const ground = world.heightAt;
  s.vy -= cfg.gravity * dt;
  const nx = s.x + s.vx * dt;
  const ny = s.y + s.vy * dt;
  const nz = s.z + s.vz * dt;
  // Trunks, walls, rocks: it glances off whatever it flies into below its top.
  for (const b of world.blockers ?? []) {
    if (b.off || b.noBody) continue;
    if (b.top !== undefined && ny > b.top) continue;
    const hit = b.seg ? nearSegment(nx, nz, b, cfg.radius) : nearCircle(nx, nz, b.x, b.z, b.r + cfg.radius);
    if (!hit) continue;
    reflect(s, hit.nx, hit.nz, cfg.restitution + 0.15);
    s.x += hit.nx * hit.depth;
    s.z += hit.nz * hit.depth;
    event = 'bounce';
  }
  // The dead: a conk off a body.
  for (const z of world.bodies ?? []) {
    const top = (z.y ?? 0) + (z.height ?? 1.7);
    if (ny > top || ny < (z.y ?? 0)) continue;
    const hit = nearCircle(nx, nz, z.x, z.z, (z.hitRadius ?? 0.35) + cfg.radius);
    if (!hit) continue;
    reflect(s, hit.nx, hit.nz, cfg.restitution);
    s.x += hit.nx * hit.depth;
    s.z += hit.nz * hit.depth;
    event = 'bounce';
  }
  s.x += s.vx * dt;
  s.z += s.vz * dt;
  s.y += s.vy * dt;
  const g = ground(s.x, s.z);
  if (s.y <= g + cfg.radius) {
    s.y = g + cfg.radius;
    if (s.vy < -2) {
      // A bounce: most of the speed into the ground's gone, some along it.
      s.vy = -s.vy * cfg.restitution;
      s.vx *= cfg.friction;
      s.vz *= cfg.friction;
      s.bounces = (s.bounces ?? 0) + 1;
      event = 'bounce';
    } else {
      // Rolling.
      s.vy = 0;
      const keep = Math.exp(-cfg.rollDrag * dt);
      s.vx *= keep;
      s.vz *= keep;
      if (Math.hypot(s.vx, s.vz) < cfg.restSpeed) {
        s.vx = 0;
        s.vz = 0;
        s.resting = true;
      }
    }
  }
  return event;
}

// Bounce the horizontal velocity off a surface with normal (nx, nz), keeping `keep` of the part into it.
function reflect(s, nx, nz, keep) {
  const into = s.vx * nx + s.vz * nz;
  if (into >= 0) return;
  s.vx -= (1 + keep) * into * nx;
  s.vz -= (1 + keep) * into * nz;
  s.vx *= 0.8;
  s.vz *= 0.8;
}

function nearCircle(x, z, cx, cz, r) {
  const dx = x - cx;
  const dz = z - cz;
  const d = Math.hypot(dx, dz);
  if (d >= r) return null;
  if (d < 1e-6) return { nx: 1, nz: 0, depth: r };
  return { nx: dx / d, nz: dz / d, depth: r - d };
}

function nearSegment(x, z, c, r) {
  const ex = c.bx - c.ax;
  const ez = c.bz - c.az;
  const len2 = ex * ex + ez * ez;
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((x - c.ax) * ex + (z - c.az) * ez) / len2)) : 0;
  return nearCircle(x, z, c.ax + ex * t, c.az + ez * t, c.t + r);
}
