// The ranger station's interior (Session 13, #147; Aaron: lit, static on
// the monitors, a woodstove): a lived-in 1980s Forest Service lookout
// station, refitted in the 90s, now the Hales' refuge. Built from boxes
// into the station's one merged mesh, so it adds no draw calls of its own:
//  - the shell: knotty pine boards inside the walls, exposed tie beams,
//    plank floors, window frames and faded gingham curtains;
//  - the comms room: a grey-green steel desk with the base-station radio,
//    the open ledger, a mug and papers and a goose-neck lamp; three CRT
//    monitors on a shelf above it; a swivel chair; filing cabinets; the
//    district's topo map, the fire-danger sign, a calendar and a clock, a
//    first-aid box and an extinguisher on the walls;
//  - the main room: a cast-iron woodstove and its pipe, a kitchen counter
//    (sink, two-burner stove, a small fridge, shelves of cans), a table
//    with mismatched chairs, a hurricane lantern and cards, steel bunks with
//    wool blankets, coats on hooks, boots by the door, a rag rug.
// What glows (the lamp's bulb, the stove's fire, the monitors' static) is
// built apart for the renderer to light and animate.
//
// Cabin-local coordinates (x east, z south, from its centre); box(w, h, d,
// x, y, z, colour, yaw) stands a box on y at (x, z), as StationRenderer's.

import * as THREE from 'three';

// cabin: the layout's cabin; fy: the floor's height; k: config.station.look;
// box: StationRenderer's box(). Returns { parts, glow, fire, screens,
// lamps: [{ x, y, z }] (where the room's light hangs, world) }.
export function buildInterior(cabin, fy, k, box, rng) {
  const c = cabin;
  const at = (x, z) => [c.x + x, c.z + z];
  const parts = [];
  const glow = [];
  const fire = [];
  const screens = [];
  // A box in cabin-local coordinates, its base `y` above the floor.
  const b = (w, h, d, x, y, z, colour, yaw = 0) => {
    const [wx, wz] = at(x, z);
    return box(w, h, d, wx, fy + y, wz, colour, yaw);
  };
  const add = (...a) => parts.push(b(...a));
  const hw = c.halfW;
  const hd = c.halfD;
  const H = c.wallHeight;
  const inset = 0.115; // the walls' inner faces, from their centre lines
  const shade = (hex, k2) => new THREE.Color(hex).multiplyScalar(k2).getHex();

  // ---- the shell ----
  // Knotty pine boards up the inside of every wall, varied board by board,
  // skipping the windows and the door gaps.
  const windows = [
    // [wall: 'south' | 'east' | 'west', centre along it, half-width, bottom, top]
    ['south', -3.2, 0.55, 1.3, 2.1],
    ['south', 3.2, 0.55, 1.3, 2.1],
    ['west', hd - 2.2, 0.55, 1.3, 2.1],
    ['east', hd - 2.2, 0.55, 1.3, 2.1],
  ];
  const boardW = 0.24;
  const boards = (wall, from, to, fixed, faces) => {
    for (let u = from; u < to - 0.01; u += boardW) {
      const mid = u + boardW / 2;
      const tone = shade(k.pine, 0.82 + rng.range(0, 0.3));
      const win = windows.find((w) => w[0] === wall && Math.abs(mid - w[1]) < w[2] + boardW / 2);
      const spans = win ? [[0, win[3]], [win[4], H]] : [[0, H]];
      for (const [y0, y1] of spans) {
        if (wall === 'north' || wall === 'south' || wall === 'partN' || wall === 'partS') add(boardW, y1 - y0, 0.02, mid, y0, fixed + faces * 0.01, tone);
        else add(0.02, y1 - y0, boardW, fixed + faces * 0.01, y0, mid, tone);
      }
    }
  };
  const fd = c.frontDoor.width / 2;
  const cdx = c.commsDoor.x - c.x;
  const cdw = c.commsDoor.width / 2;
  boards('south', -hw + inset, -fd, hd - inset, -1);
  boards('south', fd, hw - inset, hd - inset, -1);
  boards('north', -hw + inset, hw - inset, -hd + inset, 1);
  boards('west', -hd + inset, hd - inset, -hw + inset, 1);
  boards('east', -hd + inset, hd - inset, hw - inset, -1);
  // The partition, boarded on both faces round the comms door.
  for (const [from, to] of [
    [-hw + inset, cdx - cdw],
    [cdx + cdw, hw - inset],
  ]) {
    boards('partN', from, to, c.partZ - inset, -1);
    boards('partS', from, to, c.partZ + inset, 1);
  }
  // Exposed tie beams across under the roof, a ridge beam, and skirting.
  for (const x of [-4, -2, 0, 2, 4]) add(0.14, 0.2, hd * 2 - 0.2, x, H - 0.2, 0, k.beam);
  add(hw * 2 - 0.2, 0.18, 0.16, 0, H + c.roofRise - 0.35, 0, k.beam);
  // Plank floor boards, east to west.
  for (let z = -hd + 0.12; z < hd - 0.12; z += 0.2) add(hw * 2 - 0.24, 0.015, 0.19, 0, 0, z + 0.1, shade(k.floorBoard, 0.85 + rng.range(0, 0.3)));
  // Window frames and curtains (inside), and frames outside.
  for (const [wall, along, half, y0, y1] of windows) {
    const southWall = wall === 'south';
    const face = southWall ? hd : wall === 'east' ? hw : -hw;
    const inward = southWall ? -1 : wall === 'east' ? -1 : 1;
    const frame = (o, depth) => {
      if (southWall) {
        add(half * 2 + 0.16, 0.08, depth, along, y0 - 0.08, face + o, k.trimLight);
        add(half * 2 + 0.16, 0.08, depth, along, y1, face + o, k.trimLight);
        add(0.08, y1 - y0, depth, along - half - 0.04, y0, face + o, k.trimLight);
        add(0.08, y1 - y0, depth, along + half + 0.04, y0, face + o, k.trimLight);
        add(0.04, y1 - y0, depth * 0.6, along, y0, face + o, k.trimLight); // the mullion
      } else {
        add(depth, 0.08, half * 2 + 0.16, face + o, y0 - 0.08, along, k.trimLight);
        add(depth, 0.08, half * 2 + 0.16, face + o, y1, along, k.trimLight);
        add(depth, y1 - y0, 0.08, face + o, y0, along - half - 0.04, k.trimLight);
        add(depth, y1 - y0, 0.08, face + o, y0, along + half + 0.04, k.trimLight);
        add(depth * 0.6, y1 - y0, 0.04, face + o, y0, along, k.trimLight);
      }
    };
    frame(inward * 0.13, 0.05);
    frame(-inward * 0.13, 0.05);
    // Curtains gathered at each side, their rod above.
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const tone = i % 2 ? k.curtain : shade(k.curtain, 0.75);
        const off = s * (half + 0.02 - i * 0.07);
        if (southWall) add(0.07, y1 - y0 + 0.3, 0.04, along + off, y0 - 0.2, face + inward * 0.18, tone);
        else add(0.04, y1 - y0 + 0.3, 0.07, face + inward * 0.18, y0 - 0.2, along + off, tone);
      }
    }
    if (southWall) add(half * 2 + 0.4, 0.03, 0.03, along, y1 + 0.12, face + inward * 0.2, k.metalDark);
    else add(0.03, 0.03, half * 2 + 0.4, face + inward * 0.2, y1 + 0.12, along, k.metalDark);
  }

  // ---- the comms room ----
  const d = { x: c.desk.x - c.x, z: c.desk.z - c.z };
  // The steel desk: its top, a drawer pedestal each end, the modesty panel.
  add(1.8, 0.04, 0.72, d.x, 0.74, d.z, k.deskTop);
  for (const s of [-1, 1]) {
    add(0.45, 0.74, 0.68, d.x + s * 0.66, 0, d.z, k.desk);
    for (const y of [0.08, 0.32, 0.54]) add(0.4, 0.015, 0.02, d.x + s * 0.66, y + 0.12, d.z + 0.345, k.chrome); // drawer pulls
  }
  add(0.85, 0.5, 0.03, d.x, 0.22, d.z - 0.32, k.desk);
  // The base-station radio: a cabinet with a speaker grille, dials, a meter;
  // its handset on a coiled cord.
  add(0.6, 0.28, 0.36, d.x - 0.5, 0.78, d.z - 0.12, k.radio);
  add(0.2, 0.18, 0.01, d.x - 0.66, 0.83, d.z + 0.065, k.radioGrille);
  for (const x of [-0.42, -0.32, -0.22]) add(0.05, 0.05, 0.03, d.x + x, 0.86, d.z + 0.07, k.chrome);
  glow.push(b(0.1, 0.05, 0.01, d.x - 0.32, 0.95, d.z + 0.066, k.radioMeter));
  add(0.06, 0.18, 0.06, d.x - 0.12, 0.78, d.z + 0.05, k.radioGrille); // the handset, upright in its cradle
  for (let i = 0; i < 6; i++) add(0.02, 0.02, 0.02, d.x - 0.14 - i * 0.03, 0.8 - (i % 2) * 0.01, d.z + 0.12 + i * 0.02, k.radioGrille); // its cord
  // The ledger, open: cover, two pale pages; papers; the mug.
  add(0.46, 0.02, 0.32, d.x + 0.35, 0.78, d.z + 0.08, k.ledger);
  for (const s of [-1, 1]) add(0.21, 0.012, 0.3, d.x + 0.35 + s * 0.11, 0.8, d.z + 0.08, k.paper);
  add(0.22, 0.006, 0.3, d.x + 0.68, 0.78, d.z - 0.15, k.paper, 0.3);
  add(0.2, 0.006, 0.28, d.x + 0.74, 0.786, d.z - 0.12, shade(k.paper, 0.9), -0.2);
  add(0.08, 0.1, 0.08, d.x + 0.05, 0.78, d.z + 0.2, k.mug);
  // The goose-neck lamp: base, stem, shade; its bulb glows.
  add(0.14, 0.03, 0.14, d.x + 0.78, 0.78, d.z + 0.18, k.metalDark);
  add(0.02, 0.4, 0.02, d.x + 0.78, 0.8, d.z + 0.18, k.metalDark);
  add(0.18, 0.1, 0.18, d.x + 0.7, 1.12, d.z + 0.22, k.lampShade);
  glow.push(b(0.08, 0.04, 0.08, d.x + 0.7, 1.1, d.z + 0.22, k.bulb));
  // The monitor shelf and its three CRTs (the screens glow with static).
  add(1.75, 0.04, 0.42, d.x, 1.2, -hd + inset + 0.21, k.beam);
  for (const s of [-1, 1]) add(0.04, 0.16, 0.38, d.x + s * 0.82, 1.04, -hd + inset + 0.2, k.metalDark);
  for (let i = 0; i < 3; i++) {
    const x = d.x - 0.56 + i * 0.56;
    add(0.5, 0.42, 0.38, x, 1.24, -hd + inset + 0.2, k.crt);
    add(0.3, 0.2, 0.06, x, 1.26, -hd + inset + 0.02, k.crt); // the tube's back
    const [wx, wz] = at(x, -hd + inset + 0.395);
    screens.push(new THREE.PlaneGeometry(0.4, 0.31).translate(wx, fy + 1.45, wz));
  }
  // The swivel chair: five-star base, column, seat, back.
  const ch = { x: d.x, z: d.z + 0.75 };
  for (let i = 0; i < 5; i++) add(0.04, 0.03, 0.28, ch.x, 0.04, ch.z, k.metalDark, (i / 5) * Math.PI * 2);
  add(0.05, 0.38, 0.05, ch.x, 0.05, ch.z, k.chrome);
  add(0.48, 0.08, 0.46, ch.x, 0.43, ch.z, k.chairSeat);
  add(0.44, 0.48, 0.07, ch.x, 0.55, ch.z + 0.22, k.chairSeat);
  // Filing cabinets, olive, three drawers each.
  const fc = c.furniture.find((f) => f.id === 'cabinets');
  for (let i = 0; i < 3; i++) {
    const x = fc.x - c.x - 0.48 + i * 0.48;
    add(0.46, 1.32, 0.6, x, 0, fc.z - c.z, k.cabinet);
    for (const y of [0.3, 0.72, 1.12]) add(0.12, 0.03, 0.02, x, y, fc.z - c.z + 0.305, k.chrome);
  }
  // The district's topo map on the back wall: greens and browns in contour bands, pins.
  const map = { x: -0.4, y: 1.3, w: 1.7, h: 1.05 };
  const wallZ = -hd + inset + 0.015;
  add(map.w + 0.08, map.h + 0.08, 0.015, map.x, map.y - 0.04, wallZ, k.trimLight);
  const cells = 10;
  for (let i = 0; i < cells; i++) {
    for (let j = 0; j < 6; j++) {
      const u = i / cells;
      const v = j / 6;
      const hgt = Math.sin(u * 7 + v * 3) * 0.5 + Math.sin(u * 3 - v * 8) * 0.5;
      const tone = hgt > 0.4 ? k.mapHigh : hgt > -0.2 ? k.mapMid : k.mapLow;
      add(map.w / cells, map.h / 6, 0.01, map.x - map.w / 2 + (i + 0.5) * (map.w / cells), map.y + j * (map.h / 6), wallZ + 0.012, tone);
    }
  }
  for (let i = 0; i < 9; i++) add(0.025, 0.025, 0.03, map.x + rng.range(-0.75, 0.75), map.y + rng.range(0.1, 0.95), wallZ + 0.03, i < 3 ? k.pinRed : k.pinWhite);
  // The fire-danger sign: a semicircle of five bands, low to extreme, its arrow at HIGH.
  const sign = { x: 3.6, y: 1.55 };
  add(1.1, 0.62, 0.02, sign.x, sign.y - 0.05, wallZ, k.signBoard);
  const bands = [k.dangerLow, k.dangerModerate, k.dangerHigh, k.dangerVery, k.dangerExtreme];
  bands.forEach((col, i) => {
    const a = Math.PI - ((i + 0.5) / 5) * Math.PI;
    const [wx, wz] = at(sign.x + Math.cos(a) * 0.26, wallZ + 0.015);
    const g = box(0.18, 0.24, 0.01, wx, fy + sign.y + 0.04 + Math.sin(a) * 0.2, wz, col);
    parts.push(g);
  });
  add(0.03, 0.3, 0.02, sign.x + 0.04, sign.y + 0.04, wallZ + 0.03, k.metalDark, 0);
  // A calendar and a clock on the west wall; the first-aid box and the
  // extinguisher by the comms door.
  const westX = -hw + inset + 0.015;
  add(0.015, 0.45, 0.32, westX, 1.35, -2.4, k.paper);
  add(0.016, 0.2, 0.3, westX + 0.002, 1.6, -2.4, k.calendar);
  add(0.04, 0.3, 0.3, westX, 2.15, -1.6, k.clock);
  add(0.045, 0.24, 0.24, westX + 0.005, 2.18, -1.6, k.paper);
  add(0.4, 0.3, 0.15, cdx - cdw - 0.45, 1.4, c.partZ - inset - 0.08, k.firstAid);
  add(0.06, 0.18, 0.02, cdx - cdw - 0.45, 1.46, c.partZ - inset - 0.16, k.firstAidCross);
  add(0.18, 0.06, 0.02, cdx - cdw - 0.45, 1.52, c.partZ - inset - 0.16, k.firstAidCross);
  add(0.14, 0.5, 0.14, cdx + cdw + 0.25, 0, c.partZ - inset - 0.1, k.extinguisher);
  // Session 20 (Aaron): the gun rack on the east wall: a board, a shelf
  // for the butts and a rail of pegs for the barrels (config.station.gunRack).
  const eastX = hw - inset;
  const rz = -2.2;
  add(0.04, 1.3, 1.5, eastX - 0.02, 0.5, rz, k.rackBoard);
  add(0.3, 0.05, 1.5, eastX - 0.15, 0.55, rz, k.rackBoard);
  add(0.06, 0.06, 1.5, eastX - 0.06, 1.55, rz, k.rackPeg);
  for (let i = 0; i < 5; i++) add(0.18, 0.04, 0.04, eastX - 0.1, 1.5, rz - 0.6 + i * 0.3, k.rackPeg);
  // Session 23 (#343): where the guns on it stand (world): on the shelf, against peg i (render/rackGuns.js).
  const [rackX, rackZ0] = at(eastX - 0.11, rz - 0.6);
  const rack = { x: rackX, z0: rackZ0, dz: 0.3, y: fy + 0.6 };

  // ---- the main room ----
  // The woodstove: a cast-iron box on legs, its door (the fire shows
  // through it), a hearth plate under it, the stovepipe up to the roof.
  const st = c.furniture.find((f) => f.id === 'stove');
  const sx = st.x - c.x;
  const sz = st.z - c.z;
  add(1.1, 0.02, 1.0, sx, 0, sz, k.hearth);
  for (const [lx, lz] of [[-0.3, -0.24], [0.3, -0.24], [-0.3, 0.24], [0.3, 0.24]]) add(0.06, 0.14, 0.06, sx + lx, 0.02, sz + lz, k.iron);
  add(0.72, 0.6, 0.6, sx, 0.16, sz, k.iron);
  add(0.76, 0.05, 0.64, sx, 0.76, sz, k.iron);
  add(0.04, 0.32, 0.3, sx + 0.37, 0.28, sz, k.iron); // the door, facing east into the room
  fire.push(b(0.02, 0.2, 0.22, sx + 0.392, 0.33, sz, k.fire));
  add(0.16, 2.5 + c.roofRise * 0.6, 0.16, sx, 0.81, sz, k.iron); // the pipe
  // The kitchen counter along the south wall: cupboards, the worktop, the
  // sink under the window, the two-burner stove; a little fridge; shelves of cans.
  const kt = c.furniture.find((f) => f.id === 'kitchen');
  const kx = kt.x - c.x;
  const kz = kt.z - c.z;
  add(kt.w - 0.7, 0.86, kt.d - 0.04, kx + 0.35, 0, kz, k.cupboard);
  add(kt.w - 0.66, 0.05, kt.d, kx + 0.35, 0.86, kz, k.worktop);
  for (let i = 0; i < 5; i++) add(0.04, 0.6, 0.02, kx - 1.2 + i * 0.6, 0.12, kz - kt.d / 2 + 0.01, k.woodDark); // the doors' gaps
  add(0.5, 0.04, 0.4, -3.2, 0.9, kz, k.chrome); // the sink
  add(0.4, 0.02, 0.32, -3.2, 0.89, kz, k.metalDark);
  add(0.03, 0.22, 0.03, -3.2, 0.9, kz + 0.2, k.chrome);
  add(0.5, 0.08, 0.32, kx + 1.3, 0.91, kz, k.metalDark); // the camp stove
  for (const ox of [-0.12, 0.12]) add(0.12, 0.02, 0.12, kx + 1.3 + ox, 0.99, kz, k.iron);
  add(0.22, 0.32, 0.22, kx + 1.3 + 0.42, 0.91, kz + 0.05, k.propane);
  add(0.62, 1.35, 0.62, kx - kt.w / 2 + 0.31, 0, kz, k.fridge); // the fridge
  add(0.03, 0.4, 0.03, kx - kt.w / 2 + 0.6, 0.6, kz - 0.32, k.chrome);
  for (const y of [1.55, 1.95]) {
    add(1.3, 0.03, 0.26, -5.0, y, hd - inset - 0.14, k.beam);
    for (let i = 0; i < 6; i++) add(0.08, 0.12, 0.08, -5.55 + i * 0.2, y + 0.03, hd - inset - 0.14, i % 3 === 0 ? k.canRed : i % 3 === 1 ? k.canGreen : k.chrome);
  }
  // The table: top and legs; mismatched chairs; the hurricane lantern and a game of cards.
  const tb = c.furniture.find((f) => f.id === 'table');
  const tx = tb.x - c.x;
  const tz = tb.z - c.z;
  add(tb.w, 0.05, tb.d, tx, tb.h - 0.05, tz, k.tableTop);
  for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(0.06, tb.h - 0.05, 0.06, tx + lx * (tb.w / 2 - 0.08), 0, tz + lz * (tb.d / 2 - 0.08), k.woodDark);
  const chair = (x, z, yaw, tone) => {
    add(0.42, 0.04, 0.42, x, 0.44, z, tone, yaw);
    const bx = Math.sin(yaw) * -0.19;
    const bz = Math.cos(yaw) * -0.19;
    add(0.42, 0.5, 0.04, x + bx, 0.48, z + bz, tone, yaw);
    for (const [lx, lz] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]]) add(0.035, 0.44, 0.035, x + lx, 0, z + lz, tone);
  };
  chair(tx - 0.95, tz, Math.PI / 2, k.woodDark);
  chair(tx + 0.95, tz + 0.1, -Math.PI / 2 - 0.3, k.chairPaint);
  chair(tx, tz - 0.75, 0, k.plank);
  add(0.14, 0.03, 0.14, tx + 0.25, tb.h, tz - 0.1, k.metalDark); // the lantern: base, glass, cap
  glow.push(b(0.1, 0.18, 0.1, tx + 0.25, tb.h + 0.03, tz - 0.1, k.lanternGlass));
  add(0.13, 0.04, 0.13, tx + 0.25, tb.h + 0.21, tz - 0.1, k.metalDark);
  for (let i = 0; i < 5; i++) add(0.07, 0.005, 0.1, tx - 0.3 + i * 0.09, tb.h, tz + 0.12 + (i % 2) * 0.03, k.paper, i * 0.4 - 0.8);
  // Session 28: the workbench against the comms room's wall: a thick top on a braced frame, a shelf
  // under it; the vise at one end; a board of tools on the wall behind (a bow saw, a hammer, files in
  // a row); an oil can, a jar of nails, a rag. The chainsaw's chain is filed here (base/Station.js).
  const wb = c.furniture.find((f) => f.id === 'workbench');
  if (wb) {
    const wx = wb.x - c.x;
    const wz = wb.z - c.z;
    const back = wz - wb.d / 2;
    add(wb.w, 0.07, wb.d, wx, wb.h - 0.07, wz, k.tableTop);
    add(wb.w - 0.2, 0.03, wb.d - 0.12, wx, 0.22, wz, k.woodDark);
    for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(0.08, wb.h - 0.07, 0.08, wx + lx * (wb.w / 2 - 0.08), 0, wz + lz * (wb.d / 2 - 0.07), k.woodDark);
    add(wb.w - 0.2, 0.08, 0.04, wx, 0.5, wz + wb.d / 2 - 0.06, k.woodDark);
    // The vise at the east end, its jaws and its bar.
    add(0.16, 0.16, 0.2, wx + wb.w / 2 - 0.25, wb.h, wz + 0.12, k.iron);
    add(0.2, 0.06, 0.06, wx + wb.w / 2 - 0.25, wb.h + 0.16, wz + 0.02, k.metalDark);
    add(0.2, 0.06, 0.06, wx + wb.w / 2 - 0.25, wb.h + 0.16, wz + 0.2, k.metalDark);
    add(0.02, 0.02, 0.3, wx + wb.w / 2 - 0.25, wb.h + 0.06, wz + 0.3, k.chrome);
    // The tool board.
    add(wb.w - 0.1, 0.8, 0.03, wx, wb.h + 0.25, back + 0.02, k.rackBoard);
    add(0.5, 0.03, 0.02, wx - 0.5, wb.h + 0.85, back + 0.05, k.metalDark); // a bow saw: the frame and the blade
    add(0.03, 0.2, 0.02, wx - 0.74, wb.h + 0.66, back + 0.05, k.metalDark);
    add(0.03, 0.2, 0.02, wx - 0.26, wb.h + 0.66, back + 0.05, k.metalDark);
    add(0.48, 0.015, 0.015, wx - 0.5, wb.h + 0.66, back + 0.05, k.chrome);
    add(0.04, 0.3, 0.03, wx + 0.05, wb.h + 0.5, back + 0.05, k.plank); // a hammer
    add(0.14, 0.05, 0.04, wx + 0.05, wb.h + 0.8, back + 0.055, k.iron);
    for (let i = 0; i < 4; i++) {
      add(0.02, 0.24, 0.015, wx + 0.35 + i * 0.1, wb.h + 0.55, back + 0.05, k.chrome); // the files
      add(0.03, 0.09, 0.03, wx + 0.35 + i * 0.1, wb.h + 0.46, back + 0.05, k.plank);
    }
    // On the top: an oil can, a jar of nails, a rag, a file left out.
    add(0.09, 0.1, 0.09, wx - 0.6, wb.h, wz - 0.08, k.metalDark);
    add(0.015, 0.1, 0.015, wx - 0.6, wb.h + 0.1, wz - 0.08, k.metalDark, 0);
    add(0.08, 0.11, 0.08, wx - 0.35, wb.h, wz - 0.1, k.chrome);
    add(0.2, 0.015, 0.16, wx - 0.05, wb.h, wz + 0.1, k.blanketRed, 0.4);
    add(0.26, 0.015, 0.02, wx + 0.3, wb.h, wz + 0.05, k.chrome, 0.5);
  }
  // Round 2, step 5: Ellen's string board on the comms room's wall, facing the front door: the cork in a
  // dark frame, a strip light clipped over it; her writing desk under its west end (a notebook, the station's
  // incident forms in a stack, a box of pins, a ball of red string, Earl's cassette recorder, her mug, a
  // pencil jar); a chair pushed back. What's pinned to it is its own meshes (render/storyBoard.js).
  if (c.board) {
    const bd = c.board;
    const bx = bd.x - c.x;
    const bz = bd.z - c.z;
    const cork = k.cork ?? 0x5a4028;
    add(bd.w + 0.1, bd.h + 0.1, 0.02, bx, bd.bottom - 0.05, bz + 0.005, k.woodDark);
    // The cork, in tiles, a shade apart.
    const cols = 6;
    const rows = 3;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) add(bd.w / cols - 0.004, bd.h / rows - 0.004, 0.012, bx - bd.w / 2 + (i + 0.5) * (bd.w / cols), bd.bottom + j * (bd.h / rows) + 0.002, bz + 0.016, shade(cork, 0.86 + rng.range(0, 0.26)));
    // The strip light over it: a bracket each end, its tin hood, the tube.
    for (const s of [-1, 1]) add(0.02, 0.02, 0.2, bx + s * 0.7, bd.bottom + bd.h + 0.12, bz + 0.1, k.metalDark);
    add(1.5, 0.03, 0.12, bx, bd.bottom + bd.h + 0.14, bz + 0.2, k.lampShade);
    glow.push(b(1.36, 0.02, 0.04, bx, bd.bottom + bd.h + 0.12, bz + 0.2, k.bulb));
    // The desk: a top on four legs, a drawer under it.
    const dk = bd.desk;
    const dx = dk.x - c.x;
    const dz = dk.z - c.z;
    add(dk.w, 0.04, dk.d, dx, dk.h - 0.04, dz, k.tableTop);
    for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(0.05, dk.h - 0.04, 0.05, dx + lx * (dk.w / 2 - 0.05), 0, dz + lz * (dk.d / 2 - 0.05), k.woodDark);
    add(dk.w * 0.5, 0.1, dk.d - 0.08, dx - dk.w * 0.18, dk.h - 0.15, dz, k.woodDark);
    add(0.1, 0.02, 0.02, dx - dk.w * 0.18, dk.h - 0.11, dz + dk.d / 2 - 0.03, k.chrome);
    // On it: the notebook, open, a pencil across it; the forms; the pins; the string; the recorder; the mug; the jar.
    add(0.3, 0.012, 0.22, dx - 0.2, dk.h, dz + 0.04, k.ledger, 0.12);
    for (const s of [-1, 1]) add(0.135, 0.008, 0.2, dx - 0.2 + s * 0.072, dk.h + 0.012, dz + 0.04, k.paper, 0.12);
    add(0.16, 0.008, 0.008, dx - 0.16, dk.h + 0.02, dz + 0.06, k.pinRed, 0.7);
    for (let i = 0; i < 4; i++) add(0.21, 0.004, 0.29, dx + 0.28, dk.h + i * 0.004, dz - 0.06, shade(k.paper, 0.86 + i * 0.05), 0.05 * i - 0.08);
    add(0.09, 0.03, 0.06, dx + 0.02, dk.h, dz - 0.16, k.metalDark);
    add(0.075, 0.006, 0.045, dx + 0.02, dk.h + 0.03, dz - 0.16, k.pinRed);
    add(0.07, 0.07, 0.07, dx - 0.5, dk.h, dz - 0.14, k.pinRed, 0.5);
    add(0.008, 0.008, 0.2, dx - 0.44, dk.h, dz - 0.02, k.pinRed, 0.9);
    add(0.2, 0.05, 0.13, dx + 0.5, dk.h, dz + 0.12, k.radio, -0.3);
    add(0.09, 0.006, 0.06, dx + 0.5, dk.h + 0.05, dz + 0.12, k.radioGrille, -0.3);
    for (const s of [-1, 1]) add(0.03, 0.012, 0.02, dx + 0.5 + s * 0.05, dk.h + 0.05, dz + 0.17, k.chrome, -0.3);
    add(0.08, 0.1, 0.08, dx - 0.52, dk.h, dz + 0.16, k.mug);
    add(0.06, 0.09, 0.06, dx + 0.56, dk.h, dz - 0.18, k.chrome);
    for (let i = 0; i < 3; i++) add(0.008, 0.16, 0.008, dx + 0.55 + i * 0.012, dk.h + 0.02, dz - 0.18 + i * 0.01, [k.pinRed, k.plank, k.metalDark][i]);
    chair(dx - 0.1, dz + 0.62, Math.PI + 0.35, k.plank);
    // A cardboard box of the station's files on the floor by the desk, its flaps open.
    add(0.4, 0.28, 0.3, dx + dk.w / 2 + 0.32, 0, dz + 0.02, k.plank, 0.2);
    add(0.36, 0.02, 0.26, dx + dk.w / 2 + 0.32, 0.27, dz + 0.02, k.paper, 0.2);
  }
  // Round 2 (the polish pass; Aaron: "improve the aesthetic... the interior of the cabin"): a family has
  // lived in this room for a season. Set dressing only (nothing here is solid but the trunk, a piece of
  // furniture), all of it clear of the way from the front door to the comms door.
  {
    // (The walls' boards stand 0.02 proud of `inset`: these are their faces.)
    const south = hd - inset - 0.02;
    const partS = c.partZ + inset + 0.02; // the partition's main-room face
    const east = hw - inset - 0.02;
    const west = -hw + inset + 0.02;
    // By the stove: a kettle on its top; a crate of split logs, more stacked against the wall; the axe.
    add(0.2, 0.14, 0.2, sx - 0.1, 0.81, sz + 0.1, k.iron);
    add(0.04, 0.05, 0.14, sx - 0.1, 0.95, sz + 0.1, k.iron);
    add(0.1, 0.03, 0.03, sx + 0.04, 0.9, sz + 0.1, k.iron);
    add(0.62, 0.3, 0.42, sx + 0.05, 0, sz + 1.0, k.plank);
    for (let i = 0; i < 5; i++) add(0.11, 0.11, 0.38, sx - 0.17 + (i % 3) * 0.17, 0.3 + Math.floor(i / 3) * 0.1, sz + 1.0, shade(k.woodDark, 1.1 + (i % 2) * 0.35), 0.1 * i);
    for (let i = 0; i < 6; i++) add(0.36, 0.1, 0.11, west + 0.24, 0.02 + Math.floor(i / 2) * 0.105, sz - 0.75 - (i % 2) * 0.12, shade(k.woodDark, 1.0 + ((i * 7) % 3) * 0.25));
    add(0.035, 0.8, 0.035, west + 0.12, 0, sz + 0.62, k.plank); // the axe, leaning
    add(0.05, 0.14, 0.16, west + 0.13, 0.7, sz + 0.62, k.iron);
    // The kitchen: pans hung on a rail over the worktop; plates in a rack by the sink; a percolator on the
    // camp stove; a tea towel over the cupboard door; four mugs and a bowl on the table.
    add(1.5, 0.025, 0.025, kx + 0.3, 1.5, south - 0.05, k.metalDark);
    for (let i = 0; i < 4; i++) {
      const px = kx - 0.3 + i * 0.4;
      const r = 0.2 - (i % 2) * 0.05;
      add(0.02, 0.1, 0.02, px, 1.4, south - 0.05, k.metalDark);
      add(r, r, 0.035, px, 1.4 - r, south - 0.05, i === 2 ? k.chrome : k.iron);
      add(0.03, 0.14, 0.02, px, 1.26 - r, south - 0.04, k.iron);
    }
    add(0.3, 0.02, 0.2, -2.72, 0.91, kz, k.chrome);
    for (let i = 0; i < 4; i++) add(0.015, 0.16, 0.16, -2.82 + i * 0.065, 0.93, kz, k.paper);
    add(0.1, 0.2, 0.1, kx + 1.18, 1.01, kz, k.chrome);
    add(0.04, 0.04, 0.04, kx + 1.18, 1.21, kz, k.metalDark);
    add(0.24, 0.3, 0.015, kx + 0.5, 0.52, kz - kt.d / 2 - 0.005, k.blanketRed);
    for (const [mx, mz, col] of [[-0.4, 0.2, k.mug], [0.42, -0.22, k.coatBlue], [0.1, 0.28, k.coatOlive], [-0.45, -0.25, k.paper]]) add(0.07, 0.085, 0.07, tx + mx, tb.h, tz + mz, col);
    add(0.2, 0.06, 0.2, tx - 0.1, tb.h, tz - 0.18, k.chairPaint);
    for (let i = 0; i < 3; i++) add(0.065, 0.06, 0.065, tx - 0.15 + i * 0.05, tb.h + 0.05, tz - 0.2 + (i % 2) * 0.05, i === 1 ? k.canGreen : k.canRed);
    // Over the front door, inside: a rack of antlers on a plaque. Beside it: the fire poster (the bear in his
    // hat, as a few blocks); the key hooks, a torch on charge.
    add(0.34, 0.22, 0.03, 0, 2.38, south - 0.02, k.woodDark);
    for (const s of [-1, 1]) {
      add(0.3, 0.035, 0.035, s * 0.2, 2.55, south - 0.08, k.paper, 0);
      for (let i = 0; i < 3; i++) add(0.03, 0.14 + i * 0.04, 0.03, s * (0.12 + i * 0.1), 2.56, south - 0.08, k.paper);
    }
    const poster = { x: -1.55, y: 1.25 };
    add(0.58, 0.8, 0.012, poster.x, poster.y, south - 0.012, k.dangerModerate);
    add(0.5, 0.14, 0.014, poster.x, poster.y + 0.62, south - 0.016, k.woodDark); // the lettering's band
    add(0.3, 0.3, 0.016, poster.x, poster.y + 0.2, south - 0.018, k.woodDark); // the bear: head, hat, shoulders
    add(0.4, 0.05, 0.018, poster.x, poster.y + 0.5, south - 0.02, k.plank);
    add(0.24, 0.1, 0.018, poster.x, poster.y + 0.52, south - 0.022, k.plank);
    add(0.46, 0.16, 0.016, poster.x, poster.y + 0.04, south - 0.018, k.coatBlue);
    add(0.5, 0.08, 0.014, poster.x, poster.y + 0.03, south - 0.024, k.dangerExtreme);
    add(0.3, 0.05, 0.03, fd + 0.3, 1.32, south - 0.02, k.woodDark);
    for (let i = 0; i < 4; i++) add(0.015, 0.07, 0.01, fd + 0.19 + i * 0.07, 1.25, south - 0.03, i % 2 ? k.chrome : k.dangerModerate);
    add(0.07, 0.24, 0.07, -fd - 0.25, 1.2, south - 0.06, k.dangerModerate);
    add(0.09, 0.06, 0.09, -fd - 0.25, 1.44, south - 0.06, k.metalDark);
    // The east end is the children's. A bookshelf on the partition wall: books, board games, the cassette
    // player; the family's photographs over it.
    const bs = { x: 4.95, w: 1.5, d: 0.26 };
    add(bs.w, 1.3, 0.02, bs.x, 0, partS + 0.01, k.woodDark);
    for (const s of [-1, 1]) add(0.03, 1.3, bs.d, bs.x + s * (bs.w / 2 - 0.015), 0, partS + bs.d / 2, k.woodDark);
    for (let j = 0; j < 4; j++) {
      const y = 0.04 + j * 0.42;
      add(bs.w, 0.03, bs.d, bs.x, y, partS + bs.d / 2, k.woodDark);
      if (j === 3) break;
      if (j === 0) {
        // Board games, flat, in a stack; a shoebox.
        for (let i = 0; i < 4; i++) add(0.46, 0.05, 0.22, bs.x - 0.4, y + 0.03 + i * 0.052, partS + bs.d / 2, [k.canRed, k.coatBlue, k.dangerModerate, k.canGreen][i], 0.04 * i);
        add(0.34, 0.14, 0.2, bs.x + 0.3, y + 0.03, partS + bs.d / 2, k.plank);
        continue;
      }
      let x = bs.x - bs.w / 2 + 0.06;
      for (let i = 0; x < bs.x + bs.w / 2 - (j === 2 ? 0.5 : 0.1); i++) {
        const w = 0.03 + rng.range(0, 0.035);
        const h = 0.2 + rng.range(0, 0.14);
        add(w, h, 0.17, x + w / 2, y + 0.03, partS + bs.d / 2, [k.ledger, k.coatBlue, k.coatOlive, k.mapLow, k.blanketGrey, k.paper, k.canRed, k.woodDark][Math.floor(rng.range(0, 8))]);
        x += w + 0.004;
      }
      if (j === 2) {
        add(0.36, 0.2, 0.14, bs.x + 0.5, y + 0.03, partS + bs.d / 2, k.radio); // the cassette player, its speakers, its handle
        for (const s of [-1, 1]) add(0.1, 0.1, 0.01, bs.x + 0.5 + s * 0.11, y + 0.07, partS + bs.d / 2 + 0.072, k.radioGrille);
        add(0.3, 0.02, 0.02, bs.x + 0.5, y + 0.25, partS + bs.d / 2, k.metalDark);
      }
    }
    for (const [px, py, pw, ph] of [[4.5, 1.55, 0.24, 0.3], [4.85, 1.62, 0.34, 0.24], [5.3, 1.56, 0.22, 0.28], [4.7, 1.98, 0.3, 0.22], [5.15, 1.98, 0.24, 0.24]]) {
      add(pw + 0.04, ph + 0.04, 0.015, px, py - 0.02, partS + 0.01, k.woodDark);
      add(pw, ph, 0.012, px, py, partS + 0.016, shade(k.blanketGrey, 0.9 + rng.range(0, 0.5)));
      add(pw * 0.3, ph * 0.45, 0.01, px - pw * 0.12, py + ph * 0.1, partS + 0.022, k.paper); // somebody in it
      add(pw * 0.22, ph * 0.34, 0.01, px + pw * 0.2, py + ph * 0.1, partS + 0.022, shade(k.paper, 0.8));
    }
    // Junie's drawings, taped up by the bunks (crayon on district notepaper); paper stars on a thread over them.
    for (const [dz, dy, tone, tilt] of [[1.05, 1.0, k.dangerModerate, 0.06], [0.7, 1.22, k.paper, -0.05], [0.72, 0.84, k.paper, 0.04], [0.36, 1.05, k.dangerLow, -0.08]]) {
      add(0.01, 0.2, 0.26, east - 0.012, dy, dz, tone, tilt);
      add(0.012, 0.09, 0.1, east - 0.018, dy + 0.06, dz - 0.03, tone === k.paper ? k.canRed : k.coatBlue, tilt);
      add(0.012, 0.03, 0.2, east - 0.018, dy + 0.01, dz, k.canGreen, tilt);
    }
    add(0.006, 0.006, 1.6, east - 0.03, 2.3, 1.0, k.paper);
    for (let i = 0; i < 6; i++) add(0.012, 0.08, 0.08, east - 0.03, 2.16 + (i % 2) * 0.04, 0.3 + i * 0.28, i % 2 ? k.dangerModerate : k.paper);
    // Wyatt's rods in the corner; a trunk under the south-east window with a folded blanket and his comics;
    // a small rug by the bunks; a hurricane lamp hung from the east beam (its glass glows).
    for (let i = 0; i < 3; i++) add(0.018, 1.9 + i * 0.1, 0.018, east - 0.12 - i * 0.07, 0, partS + 0.42 + i * 0.06, i === 1 ? k.woodDark : k.metalDark);
    add(0.07, 0.07, 0.05, east - 0.12, 0.55, partS + 0.46, k.chrome);
    const tr = c.furniture.find((f) => f.id === 'trunk');
    if (tr) {
      const trx = tr.x - c.x;
      const trz = tr.z - c.z;
      add(tr.w, tr.h - 0.04, tr.d, trx, 0, trz, k.coatOlive);
      add(tr.w + 0.02, 0.05, tr.d + 0.02, trx, tr.h - 0.05, trz, shade(k.coatOlive, 0.8));
      for (const s of [-1, 1]) add(0.04, tr.h - 0.04, tr.d + 0.01, trx + s * (tr.w / 2 - 0.12), 0, trz, k.metalDark);
      add(0.5, 0.07, 0.3, trx - 0.18, tr.h, trz, k.blanketRed);
      for (let i = 0; i < 3; i++) add(0.2, 0.008, 0.27, trx + 0.3, tr.h + i * 0.008, trz, [k.dangerModerate, k.coatBlue, k.canRed][i], 0.15 * i);
    }
    for (let i = 0; i < 3; i++) add(1.1 - i * 0.26, 0.008, 0.7 - i * 0.2, 3.5, 0.016 + i * 0.002, 2.5, [k.rugB, k.rugC, k.rugA][i]);
    add(0.01, 0.34, 0.01, 4, H - 0.54, 1.2, k.metalDark);
    add(0.14, 0.03, 0.14, 4, H - 0.58, 1.2, k.metalDark);
    glow.push(b(0.1, 0.16, 0.1, 4, H - 0.74, 1.2, k.lanternGlass));
    add(0.13, 0.03, 0.13, 4, H - 0.77, 1.2, k.metalDark);
    // Snowshoes crossed on the west wall over the wood; the district's framed photograph of the lookout.
    for (const s of [-1, 1]) {
      add(0.02, 0.8, 0.26, west + 0.02, 1.55, 2.2, k.plank, s * 0.5);
      add(0.022, 0.5, 0.16, west + 0.024, 1.7, 2.2, k.woodDark, s * 0.5);
    }
    add(0.02, 0.44, 0.56, west + 0.015, 1.4, 3.2, k.woodDark);
    add(0.022, 0.36, 0.48, west + 0.02, 1.44, 3.2, k.mapMid);
    add(0.024, 0.2, 0.06, west + 0.024, 1.46, 3.2, k.woodDark); // the tower in it
    add(0.024, 0.07, 0.14, west + 0.024, 1.66, 3.2, k.woodDark);
  }
  // And in the comms room: the watch roster on the partition (four rows, a magnet in each); binders on a
  // shelf over the cabinets; a thermos and a torch on them; notices pinned by the door; the aerial's cable
  // up the back wall from the radio.
  {
    const partN = c.partZ - inset - 0.02;
    const back = -hd + inset + 0.02;
    const ro = { x: 0.9, y: 1.25, w: 1.0, h: 0.7 };
    add(ro.w + 0.06, ro.h + 0.06, 0.015, ro.x, ro.y - 0.03, partN - 0.01, k.metalDark);
    add(ro.w, ro.h, 0.012, ro.x, ro.y, partN - 0.018, k.paper);
    for (let i = 1; i < 5; i++) add(ro.w, 0.006, 0.01, ro.x, ro.y + (i * ro.h) / 5, partN - 0.026, k.metalDark);
    for (let i = 1; i < 4; i++) add(0.006, ro.h, 0.01, ro.x - ro.w / 2 + (i * ro.w) / 4 + 0.08, ro.y, partN - 0.026, k.metalDark);
    [k.coatBlue, k.coatRed, k.coatOlive, k.dangerModerate].forEach((col, i) => add(0.06, 0.06, 0.02, ro.x - 0.05 + ((i * 3) % 4) * 0.25 - 0.1, ro.y + 0.04 + (i * ro.h) / 5, partN - 0.03, col));
    const fcab = c.furniture.find((f) => f.id === 'cabinets');
    const fx = fcab.x - c.x;
    add(1.5, 0.03, 0.28, fx, 1.85, back + 0.15, k.beam);
    for (let i = 0; i < 9; i++) add(0.07, 0.3, 0.22, fx - 0.66 + i * 0.085, 1.88, back + 0.14, [k.cabinet, k.ledger, k.coatBlue][i % 3]);
    add(0.1, 0.28, 0.1, fx + 0.4, 1.32, back + 0.4, k.coatOlive); // the thermos
    add(0.11, 0.05, 0.11, fx + 0.4, 1.6, back + 0.4, k.chrome);
    add(0.22, 0.07, 0.07, fx - 0.3, 1.32, back + 0.45, k.dangerModerate, 0.4); // the torch
    for (const [nx, ny, col] of [[0.0, 1.5, k.paper], [0.26, 1.42, k.dangerLow], [0.02, 1.2, k.paper], [0.3, 1.72, k.paper]]) add(0.2, 0.26, 0.01, cdx + cdw + 0.5 + nx, ny, partN - 0.012, col);
    add(0.02, H - 1.5, 0.02, d.x - 0.82, 1.5, back + 0.03, k.metalDark);
    add(0.5, 0.02, 0.02, d.x - 0.58, 1.5, back + 0.03, k.metalDark);
  }
  // The bunks: a steel frame, two mattresses with wool blankets and pillows.
  const bk = c.furniture.find((f) => f.id === 'bunks');
  const bxl = bk.x - c.x;
  const bzl = bk.z - c.z;
  for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(0.05, 1.9, 0.05, bxl + lx * (bk.w / 2 - 0.03), 0, bzl + lz * (bk.d / 2 - 0.03), k.metalDark);
  for (const y of [0.32, 1.3]) {
    add(bk.w, 0.05, bk.d, bxl, y, bzl, k.metalDark);
    add(bk.w - 0.08, 0.14, bk.d - 0.06, bxl, y + 0.05, bzl, k.mattress);
    add(bk.w - 0.5, 0.06, bk.d - 0.02, bxl - 0.2, y + 0.18, bzl, y < 1 ? k.blanketRed : k.blanketGrey);
    add(0.36, 0.1, bk.d - 0.2, bxl + bk.w / 2 - 0.26, y + 0.19, bzl, k.pillow);
  }
  for (let y = 0.4; y < 1.3; y += 0.25) add(0.04, 0.04, bk.d * 0.6, bxl + bk.w / 2 - 0.03, y, bzl, k.metalDark); // the ladder rungs
  // Coats on hooks by the front door, boots below them, the rag rug.
  add(0.9, 0.06, 0.04, fd + 0.65, 1.7, hd - inset - 0.02, k.woodDark);
  [k.coatRed, k.coatOlive, k.coatBlue].forEach((col, i) => add(0.26, 0.7, 0.14, fd + 0.35 + i * 0.3, 1.02, hd - inset - 0.1, col));
  for (let i = 0; i < 3; i++) for (const s of [-0.06, 0.06]) add(0.1, 0.18, 0.26, fd + 0.35 + i * 0.3 + s, 0.01, hd - inset - 0.35, k.boots);
  for (let i = 0; i < 5; i++) add(1.9 - i * 0.3, 0.008, 1.2 - i * 0.2, 0.2, 0.016 + i * 0.002, 1.6, [k.rugA, k.rugB, k.rugA, k.rugC, k.rugB][i]);
  // The light bulb hanging from the middle beam, in a tin shade.
  add(0.01, 0.4, 0.01, 0, H - 0.6, 1.6, k.metalDark);
  add(0.3, 0.08, 0.3, 0, H - 0.68, 1.6, k.lampShade);
  glow.push(b(0.1, 0.08, 0.1, 0, H - 0.74, 1.6, k.bulb));

  const lamps = [
    { x: c.x, y: fy + H - 0.85, z: c.z + 1.6 }, // the main room's bulb
    { x: c.desk.x + 0.7, y: fy + 1.05, z: c.desk.z + 0.22 }, // the desk lamp
  ];
  return { parts, glow, fire, screens, lamps, rack };
}
