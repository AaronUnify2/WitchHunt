// Where the abandoned vehicles stand (pure; DESIGN.md "Vehicles and
// batteries"). Seeded, so a seed always gives the same cars:
//  - in clearings, by the clearing's encounter or type (data/vehicles.json
//    "placement"): a roadblock row at roadside clearings and checkpoints,
//    one sure car with a battery at the campsite next to home, now and
//    then one elsewhere;
//  - pulled onto the verge along the pathways, about one every
//    `pathSpacing` metres, some nosed off the road into the trees.
// Every vehicle stands on open ground (no trees or undergrowth under it
// or at its spots), on gentle slopes, clear of the cliff, the station and
// the signposts, and a gap away from every other vehicle.
//
// Yaw is like the zombies': forward is (sin yaw, cos yaw), its right
// (cos yaw, -sin yaw). North is -z.

// Weighted pick from { id: weight }.
export function pickWeighted(weights, rng) {
  const entries = Object.entries(weights ?? {}).filter(([, w]) => w > 0);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  if (total <= 0) return null;
  let r = rng.next() * total;
  for (const [id, w] of entries) {
    r -= w;
    if (r < 0) return id;
  }
  return entries[entries.length - 1][0];
}

// A point in a vehicle's own frame (x right, z forward) in the world.
export function toWorld(v, lx, lz) {
  const s = Math.sin(v.yaw);
  const c = Math.cos(v.yaw);
  return { x: v.x + s * lz + c * lx, z: v.z + c * lz - s * lx };
}

// The four corners of its footprint, grown by `pad` metres.
export function footprint(v, length, width, pad = 0) {
  const hl = length / 2 + pad;
  const hw = width / 2 + pad;
  return [toWorld(v, -hw, -hl), toWorld(v, hw, -hl), toWorld(v, hw, hl), toWorld(v, -hw, hl)];
}

// Where the player stands for each hold-X spot: beside the driver's door
// (left) and the passenger's (right), behind the boot and in front of
// the bonnet.
export function spotsOf(v, type, out) {
  const [length, width] = type.size;
  const doorZ = type.lids.door.box[5];
  return {
    door: toWorld(v, -width / 2 - out, doorZ),
    door2: toWorld(v, width / 2 + out, doorZ),
    boot: toWorld(v, 0, -length / 2 - out),
    bonnet: toWorld(v, 0, length / 2 + out),
  };
}

// Do two footprints (convex quads) overlap? Separating axis test.
export function quadsOverlap(a, b) {
  for (const quad of [a, b]) {
    for (let i = 0; i < 4; i++) {
      const p = quad[i];
      const q = quad[(i + 1) % 4];
      const nx = q.z - p.z;
      const nz = p.x - q.x;
      let aMin = Infinity;
      let aMax = -Infinity;
      let bMin = Infinity;
      let bMax = -Infinity;
      for (const c of a) {
        const d = c.x * nx + c.z * nz;
        aMin = Math.min(aMin, d);
        aMax = Math.max(aMax, d);
      }
      for (const c of b) {
        const d = c.x * nx + c.z * nz;
        bMin = Math.min(bMin, d);
        bMax = Math.max(bMax, d);
      }
      if (aMax < bMin || bMax < aMin) return false;
    }
  }
  return true;
}

// The placement rule for a clearing: its encounter's, else its type's, else the default.
export function ruleFor(clearing, rules) {
  return rules[clearing.key] ?? rules[clearing.kind] ?? rules[clearing.clearingType] ?? rules.default;
}

// map: { clearings, paths }. ground: { openAt, heightAt, cliffZ, geo }.
// data: data/vehicles.json. cfg: config.vehicles. rng: a forked Rng.
// avoid: [{ x, z, r }] kept clear (the station). signs: [{ x, z }].
// Returns [{ id, type, x, z, yaw, battery, alarm, place }].
export function placeVehicles(map, ground, data, cfg, rng, avoid = [], signs = []) {
  const pc = cfg.placement;
  const rules = data.placement;
  const placed = [];
  const quads = [];

  const fits = (v, place) => {
    const type = data.types[v.type];
    const [length, width] = type.size;
    const geo = ground.geo;
    if (v.x < geo.xMin + length || v.x > geo.xMax - length || v.z > geo.zMax - length) return false;
    if (v.z - length / 2 < ground.cliffZ(v.x) + geo.cliff.walkMargin + pc.cliffMargin) return false;
    for (const a of avoid) if (Math.hypot(v.x - a.x, v.z - a.z) < a.r + length / 2) return false;
    for (const s of signs) if (Math.hypot(v.x - s.x, v.z - s.z) < pc.signClearance + length / 2) return false;
    if (place !== 'path') {
      for (const c of map.clearings) if (Math.hypot(v.x - c.x, v.z - c.z) < pc.centreClearance + length / 2) return false;
    }
    const corners = footprint(v, length, width, 0.3);
    for (const p of corners) if (ground.openAt(p.x, p.z) < pc.openNeeded) return false;
    if (ground.openAt(v.x, v.z) < pc.openNeeded) return false;
    // The boot and bonnet must be reachable, and at least one front door
    // (a verge car's passenger side often faces the trees).
    const spots = spotsOf(v, type, cfg.spotOut + 0.3);
    const open = (p) => ground.openAt(p.x, p.z) >= pc.openNeeded;
    if (!open(spots.boot) || !open(spots.bonnet) || !(open(spots.door) || open(spots.door2))) return false;
    const front = toWorld(v, 0, length / 2);
    const back = toWorld(v, 0, -length / 2);
    const left = toWorld(v, -width / 2, 0);
    const right = toWorld(v, width / 2, 0);
    if (Math.abs(ground.heightAt(front.x, front.z) - ground.heightAt(back.x, back.z)) / length > pc.maxSlope) return false;
    if (Math.abs(ground.heightAt(left.x, left.z) - ground.heightAt(right.x, right.z)) / width > pc.maxSlope) return false;
    const quad = footprint(v, length, width, pc.minGap / 2);
    for (const q of quads) if (quadsOverlap(quad, q)) return false;
    return true;
  };

  const add = (v, place, rule, rng2) => {
    if (placed.length >= pc.maxVehicles || !fits(v, place)) return false;
    const type = data.types[v.type];
    const [length, width] = type.size;
    // A type's own chances (every police car has an alarm: Aaron) beat the place's, which beat config's.
    const battery = rng2.chance(type.battery ?? rule?.battery ?? cfg.batteryChance);
    const alarm = battery && rng2.chance(type.alarm ?? rule?.alarm ?? cfg.alarmChance);
    placed.push({ id: placed.length, type: v.type, x: v.x, z: v.z, yaw: v.yaw, battery, alarm, place });
    quads.push(footprint(v, length, width, pc.minGap / 2));
    return true;
  };

  // ---- clearings first (the campsite's sure battery among them) ----
  for (const c of map.clearings) {
    const rule = ruleFor(c, rules);
    if (!rule) continue;
    const r = rng.fork(`clearing-${c.id}`);
    if (!r.chance(rule.chance ?? 1)) continue;
    const [lo, hi] = rule.count ?? [1, 1];
    const count = r.int(lo, hi);
    if (count <= 0) continue;
    const place = c.kind === 'wild' ? (c.clearingType ?? 'clearing') : c.key;
    if (rule.row) placeRow(c, rule, count, r, place);
    else for (let k = 0; k < count; k++) placeScattered(c, rule, r, place);
  }

  function placeScattered(c, rule, r, place) {
    for (let t = 0; t < pc.tries; t++) {
      const type = pickWeighted(rule.weights, r);
      if (!type) return;
      const a = r.range(0, Math.PI * 2);
      const d = c.radius * r.range(pc.clearingInner, pc.clearingOuter);
      const v = { type, x: c.x + Math.sin(a) * d, z: c.z + Math.cos(a) * d, yaw: r.range(0, Math.PI * 2) };
      if (add(v, place, rule, r)) return;
    }
  }

  // A roadblock: a staggered line across the clearing, cars alternately
  // angled. Several lines are tried; the one that fits the most cars wins.
  function placeRow(c, rule, count, r, place) {
    let best = [];
    for (let t = 0; t < pc.tries && best.length < count; t++) {
      const theta = r.range(0, Math.PI * 2);
      const offA = r.range(0, Math.PI * 2);
      const offD = c.radius * r.range(pc.clearingInner, (pc.clearingInner + pc.clearingOuter) / 2);
      const cx = c.x + Math.sin(offA) * offD;
      const cz = c.z + Math.cos(offA) * offD;
      const flip = r.chance(0.5) ? Math.PI : 0;
      const row = [];
      for (let k = 0; k < count; k++) {
        const type = pickWeighted(rule.weights, r);
        if (!type) break;
        const along = (k - (count - 1) / 2) * pc.rowSpacing;
        const yaw = theta + flip + (k % 2 ? 0.4 : -0.4) + r.range(-0.15, 0.15);
        const v = { type, x: cx + Math.sin(theta) * along, z: cz + Math.cos(theta) * along, yaw };
        if (fits(v, place)) row.push(v);
      }
      if (row.length > best.length) best = row;
    }
    for (const v of best) add(v, place, rule, r);
  }

  // ---- along the pathways ----
  const pathRule = rules.path;
  map.paths.forEach((path, pi) => {
    const r = rng.fork(`path-${pi}`);
    const pts = path.points;
    let next = pc.pathSpacing * r.range(0.3, 1);
    let walked = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const seg = Math.hypot(b.x - a.x, b.z - a.z);
      while (seg > 0 && walked + seg >= next) {
        const t = (next - walked) / seg;
        next += pc.pathSpacing * (1 + r.range(-pc.pathJitter, pc.pathJitter));
        if (!r.chance(pc.pathChance)) continue;
        const px = a.x + (b.x - a.x) * t;
        const pz = a.z + (b.z - a.z) * t;
        const near = map.clearings.some((c) => Math.hypot(px - c.x, pz - c.z) < c.radius + pc.clearingGap);
        if (near) continue;
        const tx = (b.x - a.x) / seg;
        const tz = (b.z - a.z) / seg;
        const type = pickWeighted(pathRule.weights, r);
        if (!type) continue;
        const side = r.chance(0.5) ? 1 : -1;
        // The pathway's right is (tz, -tx), as a vehicle's is.
        const sx = tz * side;
        const sz = -tx * side;
        const forward = r.chance(0.5);
        const yaw0 = Math.atan2(tx, tz) + (forward ? 0 : Math.PI) + r.range(-0.08, 0.08);
        // Nosed off the road: turn toward the side it's parked on.
        const turn = (forward ? 1 : -1) * side * pc.ditchAngle;
        const tries = r.chance(pc.ditchChance) ? [[pc.vergeOffset + 0.8, turn], [pc.vergeOffset, 0]] : [[pc.vergeOffset, 0]];
        for (const [off, extra] of tries) {
          if (add({ type, x: px + sx * off, z: pz + sz * off, yaw: yaw0 + extra }, 'path', pathRule, r)) break;
        }
      }
      walked += seg;
    }
  });

  return placed;
}
