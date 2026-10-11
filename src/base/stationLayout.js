// Where everything at the ranger station stands (pure). Built from the
// home clearing and the line of the cliff behind it (DESIGN.md "Layout"):
//  - a chain-link fence: an arc round the fence's centre from the cliff
//    on the west to the cliff on the east, 12 segments plus a gate due
//    south;
//  - the station cabin in the middle (front door south, the fortified
//    comms room along its back), the fire lookout tower beside it, the
//    turret pad, the fence box by the gate;
//  - slots for barricades (one per segment, just inside it), spike traps
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
  for (const s of segments) {
    s.kind = 'fence';
    s.name = compassName((s.a0 + s.a1) / 2);
    s.mid = at((s.a0 + s.a1) / 2, R);
    s.pieces = arcChords(at, s.a0, s.a1, R, cfg.panelLength);
    s.barricade = {
      mid: at((s.a0 + s.a1) / 2, R - cfg.barricadeInside),
      pieces: arcChords(at, s.a0 + 0.3 / R, s.a1 - 0.3 / R, R - cfg.barricadeInside, cfg.panelLength),
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

  const layout = { centre, radius: R, west, east, gateHalf, segments, gate, floods, cabin, tower, turretPad, fenceBox, at };
  layout.walls = cabin.walls;
  return layout;
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
