// Where everything at the ranger station stands (pure). Built from the
// home clearing and the line of the cliff behind it (DESIGN.md "Layout"):
//  - a chain-link fence: an arc round the fence's centre from the cliff
//    on the west to the cliff on the east, 12 segments plus a gate due
//    south;
//  - the station cabin in the middle (front door south, the fortified
//    comms room along its back), the fire lookout tower beside it, the
//    turret pad, the fence box by the gate;
//  - slots for barricades (one per segment, just outside it: Session 18), spike traps
//    (one per segment, outside it) and floodlights (on four segments).
// Angles round the fence: 0 = due south of its centre, + toward east.
// A point at angle a and radius r is (cx + r sin a, cz + r cos a).
// North is -z.

const COMPASS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];

// ground: { cliffZ(x), heightAt(x, z), geo: { cliff: { walkMargin } } }.
// home: the home clearing ({ x, z }). cfg: config.station.layout.
export function stationLayout(home, ground, cfg) {
  const R = cfg.fenceRadius;
  const centre = { x: home.x, z: ground.cliffZ(home.x) + cfg.fenceCentreFromCliff };
  const at = (a, r) => ({ x: centre.x + r * Math.sin(a), z: centre.z + r * Math.cos(a) });
  const walkMargin = ground.geo.cliff.walkMargin;

  // Each end runs north round the arc until it's tucked into the cliff's foot.
  const endAngle = (sign) => {
    const step = 0.01;
    for (let a = Math.PI / 2; a < Math.PI; a += step) {
      const p = at(sign * a, R);
      if (p.z <= ground.cliffZ(p.x) + walkMargin - cfg.fenceEndInset) return sign * a;
    }
    return sign * (Math.PI - step);
  };
  const west = endAngle(-1);
  const east = endAngle(1);
  const gateHalf = cfg.gateWidth / 2 / R;

  const segments = [];
  const n = cfg.segmentsPerSide;
  for (let i = 0; i < n; i++) segments.push(arcPiece(segments.length, west + ((-gateHalf - west) * i) / n, west + ((-gateHalf - west) * (i + 1)) / n));
  for (let i = 0; i < n; i++) segments.push(arcPiece(segments.length, gateHalf + ((east - gateHalf) * i) / n, gateHalf + ((east - gateHalf) * (i + 1)) / n));
  // Names by direction; where two share one, they're numbered round the
  // arc ("west fence 1", "west fence 2").
  const names = segments.map((s) => compassName((s.a0 + s.a1) / 2));
  const seen = {};
  for (const s of segments) {
    const base = names[s.index];
    const count = names.filter((n) => n === base).length;
    seen[base] = (seen[base] ?? 0) + 1;
    s.kind = 'fence';
    s.name = count > 1 ? `${base} fence ${seen[base]}` : `${base} fence`;
    s.mid = at((s.a0 + s.a1) / 2, R);
    s.pieces = arcChords(at, s.a0, s.a1, R, cfg.panelLength);
    s.barricade = {
      // Session 18 (Aaron): outside the fence, so the dead have to get through it before they can pull the fence down.
      mid: at((s.a0 + s.a1) / 2, R + cfg.barricadeOutside),
      pieces: arcChords(at, s.a0 + 0.3 / R, s.a1 - 0.3 / R, R + cfg.barricadeOutside, cfg.panelLength),
    };
    s.spike = at((s.a0 + s.a1) / 2, R + cfg.spikeOutside);
  }
  const gate = { index: -1, kind: 'gate', name: 'gate', a0: -gateHalf, a1: gateHalf, mid: at(0, R), pieces: arcChords(at, -gateHalf, gateHalf, R, cfg.gateWidth) };

  const floods = cfg.floodSegments
    .filter((i) => i < segments.length)
    .map((i) => {
      const a = (segments[i].a0 + segments[i].a1) / 2;
      return { segment: i, angle: a, ...at(a, R - cfg.floodInside) };
    });

  const cabin = cabinLayout(centre, cfg.cabin, cfg.desk);
  const t = cfg.tower;
  const tower = { x: centre.x + t.offsetX, z: centre.z + t.offsetZ, height: t.height, half: t.platformHalf, legSpread: t.legSpread, revealRadius: t.revealRadius };
  tower.ladder = { x: tower.x, z: tower.z + t.platformHalf + 0.5 };
  const turretPad = { x: centre.x + cfg.turretPad.offsetX, z: centre.z + cfg.turretPad.offsetZ };
  const boxAngle = gateHalf + cfg.fenceBox.gateOffset / R;
  const fenceBox = at(boxAngle, R - cfg.fenceBox.inside);
  fenceBox.angle = boxAngle;

  const garage = cfg.garage ? garageLayout(centre, cfg.garage) : null;
  const layout = { centre, radius: R, west, east, gateHalf, segments, gate, floods, cabin, tower, turretPad, fenceBox, garage, at };
  layout.walls = cabin.walls;
  return layout;
}

// Round 2: the garage (pure). Its own frame: x across the bays (bay 0 at -x), z from the open front (-z)
// to the back wall (+z); turned half round in the world, so the bays open south and bay 0 is the east one.
// Returns { x, z, yaw, w, depth, bays: [{ x, z, heading }], bench: { x, z, w, d, h, stand }, shovel,
// walls: [{ ax, az, bx, bz }], posts: [{ x, z }], local(x, z) }.
export function garageLayout(centre, g) {
  const x = centre.x + g.offsetX;
  const z = centre.z + g.offsetZ;
  const yaw = Math.PI;
  const local = (lx, lz) => ({ x: x + lx * Math.cos(yaw) + lz * Math.sin(yaw), z: z - lx * Math.sin(yaw) + lz * Math.cos(yaw) });
  const w = g.bays * g.bayWidth;
  const hw = w / 2;
  const hd = g.depth / 2;
  const seg = (ax, az, bx, bz) => {
    const a = local(ax, az);
    const b = local(bx, bz);
    return { ax: a.x, az: a.z, bx: b.x, bz: b.z };
  };
  const bayX = (i) => -hw + g.bayWidth * (i + 0.5);
  // A vehicle in a bay noses out of the open front (the player's heading convention: ahead is (-sin, -cos)).
  const out = local(0, -1);
  const heading = Math.atan2(-(out.x - x), -(out.z - z));
  const bays = Array.from({ length: g.bays }, (_, i) => ({ ...local(bayX(i), 0.2), heading }));
  const bx = bayX(1);
  const bz = hd - 0.12 - g.bench.d / 2;
  const bench = { ...local(bx, bz), w: g.bench.w, d: g.bench.d, h: g.bench.h, lx: bx, lz: bz, stand: local(bx, bz - g.bench.d / 2 - 0.75) };
  const shovel = { ...local(bx - g.bench.w / 2 - 0.45, hd - 0.42), lx: bx - g.bench.w / 2 - 0.45, lz: hd - 0.42 };
  const walls = [seg(-hw, hd, hw, hd), seg(-hw, -hd + 0.3, -hw, hd), seg(hw, -hd + 0.3, hw, hd)];
  const posts = [];
  for (let i = 0; i <= g.bays; i++) posts.push(local(-hw + i * g.bayWidth, -hd + 0.15));
  return { x, z, yaw, w, depth: g.depth, bayWidth: g.bayWidth, frontHeight: g.frontHeight, backHeight: g.backHeight, bays, bench, shovel, walls, posts, local };
}

function arcPiece(index, a0, a1) {
  return { index, a0, a1 };
}

// Straight chords along an arc, each at most `maxLength` long: posts at the ends.
function arcChords(at, a0, a1, r, maxLength) {
  const count = Math.max(1, Math.ceil((Math.abs(a1 - a0) * r) / maxLength));
  const out = [];
  for (let i = 0; i < count; i++) {
    const p = at(a0 + ((a1 - a0) * i) / count, r);
    const q = at(a0 + ((a1 - a0) * (i + 1)) / count, r);
    out.push({ ax: p.x, az: p.z, bx: q.x, bz: q.z });
  }
  return out;
}

// "south-east" etc.: the direction of angle `a` from the fence's centre.
export function compassName(a) {
  // Bearing clockwise from north: south is 180, east 90.
  const bearing = (((180 - (a * 180) / Math.PI) % 360) + 360) % 360;
  return COMPASS[Math.round(bearing / 45) % 8];
}

// The cabin: walls (with door gaps), the two doors, the two rooms and the
// furniture spots. Local coordinates: x east, z south, from its centre.
function cabinLayout(centre, c, deskCfg) {
  const cx = centre.x;
  const cz = centre.z + c.offsetZ;
  const hw = c.width / 2;
  const hd = c.depth / 2;
  const partZ = -hd + c.commsDepth; // the comms room is z < partZ (local)
  const w = (ax, az, bx, bz) => ({ ax: cx + ax, az: cz + az, bx: cx + bx, bz: cz + bz });
  const fd = c.frontDoorWidth / 2;
  const cd0 = c.commsDoorX - c.commsDoorWidth / 2;
  const cd1 = c.commsDoorX + c.commsDoorWidth / 2;
  const walls = [
    w(-hw, hd, -fd, hd), // south wall, west of the front door
    w(fd, hd, hw, hd), // south wall, east of it
    w(-hw, -hd, hw, -hd), // north (back) wall
    w(-hw, -hd, -hw, hd), // west
    w(hw, -hd, hw, hd), // east
    w(-hw, partZ, cd0, partZ), // the comms room's wall, west of its door
    w(cd1, partZ, hw, partZ), // and east of it
  ];
  const a = c.doorApproach;
  const frontDoor = {
    id: 'front',
    name: 'front door',
    line: w(-fd, hd, fd, hd),
    x: cx,
    z: cz + hd,
    outer: { x: cx, z: cz + hd + a },
    inner: { x: cx, z: cz + hd - a },
    width: c.frontDoorWidth,
    hinge: { x: cx - fd, z: cz + hd },
  };
  const commsDoor = {
    id: 'comms',
    name: 'comms room door',
    line: w(cd0, partZ, cd1, partZ),
    x: cx + c.commsDoorX,
    z: cz + partZ,
    outer: { x: cx + c.commsDoorX, z: cz + partZ + a }, // the main room side
    inner: { x: cx + c.commsDoorX, z: cz + partZ - a }, // the comms room side
    width: c.commsDoorWidth,
    hinge: { x: cx + cd0, z: cz + partZ },
  };
  const desk = { x: cx + deskCfg.offsetX, z: cz - hd + deskCfg.fromNorthWall };
  // Round 2, step 5: Ellen's string board on the comms room's wall (the main room's side), its desk, where
  // she stands at it (facing: toward the board's middle) and where Tom stands to read it; Junie's place at
  // the comms desk, facing the monitors.
  const B = c.board;
  const wallZ = cz + partZ + 0.115; // the partition's main-room face
  const board = B
    ? {
        x: cx + B.x,
        z: wallZ,
        w: B.w,
        h: B.h,
        bottom: B.bottom,
        desk: { id: 'ellenDesk', x: cx + B.desk.x, z: wallZ + B.desk.d / 2, w: B.desk.w, d: B.desk.d, h: B.desk.h },
        stand: { x: cx + B.stand.x, z: wallZ + B.stand.out, facing: Math.atan2(B.x + B.w * 0.1 - B.stand.x, -B.stand.out) },
        look: { x: cx + B.x + B.w * 0.12, z: wallZ + 0.9 },
      }
    : null;
  const junieSpot = c.junieSpot ? { x: desk.x + c.junieSpot.x, z: desk.z + c.junieSpot.z, facing: Math.atan2(-c.junieSpot.x * 0.55, -c.junieSpot.z - 0.6) } : null;
  return {
    x: cx,
    z: cz,
    halfW: hw,
    halfD: hd,
    partZ,
    wallHeight: c.wallHeight,
    roofRise: c.roofRise,
    cornerMargin: c.cornerMargin,
    walls,
    frontDoor,
    commsDoor,
    desk,
    board,
    junieSpot,
    // Session 13 (#147): the furniture you can't walk through (world
    // coordinates; w across x, d along z, h tall), kept clear of the
    // zombies' way in from the front door to the comms door. The rest of
    // the interior (render/stationInterior.js) is set dressing.
    furniture: [
      { id: 'stove', x: cx - 5.3, z: cz + 0.5, w: 0.75, d: 0.65, h: 0.8 },
      { id: 'kitchen', x: cx - 3.95, z: cz + hd - 0.42, w: 3.9, d: 0.62, h: 0.92 },
      { id: 'table', x: cx - 2.8, z: cz + 2.0, w: 1.3, d: 0.85, h: 0.76 },
      { id: 'bunks', x: cx + hw - 1.15, z: cz + 2.45, w: 2.0, d: 0.9, h: 1.9 },
      { id: 'cabinets', x: cx + 1.5, z: cz - hd + 0.4, w: 1.45, d: 0.6, h: 1.32 },
      ...(board ? [board.desk] : []),
      { id: 'trunk', x: cx + hw - 1.0, z: cz + hd - 0.42, w: 1.1, d: 0.5, h: 0.46 }, // Round 2 (the polish pass): under the south-east window
      ...(c.workbench ? [{ id: 'workbench', x: cx + c.workbench.x, z: cz + partZ + 0.08 + c.workbench.d / 2, w: c.workbench.w, d: c.workbench.d, h: c.workbench.h }] : []), // Session 28
    ],
    // Where the family wait out the night (placeholders until M8).
    family: [
      { x: cx - 4.6, z: cz - hd + 1.9 },
      { x: cx - 0.6, z: cz - hd + 2.2 },
      { x: cx - 3.6, z: cz - hd + 2.6 },
    ],
    commsCentre: { x: cx - 1, z: cz + (partZ - hd) / 2 },
  };
}

// Which zone a point is in: 0 outside the fence, 1 the yard, 2 the
// cabin's main room, 3 the comms room.
export function zoneOf(layout, x, z) {
  const c = layout.cabin;
  const lx = x - c.x;
  const lz = z - c.z;
  if (lx > -c.halfW && lx < c.halfW && lz > -c.halfD && lz < c.halfD) return lz < c.partZ ? 3 : 2;
  const dx = x - layout.centre.x;
  const dz = z - layout.centre.z;
  return dx * dx + dz * dz < layout.radius * layout.radius ? 1 : 0;
}

// The angle of (x, z) round the fence's centre.
export function angleOf(layout, x, z) {
  return Math.atan2(x - layout.centre.x, z - layout.centre.z);
}
