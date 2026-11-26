// The mothership as a tower (Nov 26, after Aaron's four concept pictures and
// his answers; docs/MOTHERSHIP_PLAN.md; pure, tested). One layout, built once,
// that both the collision (world/towerShape.js) and the model
// (render/mothershipModel.js) are made from, so what's drawn is what's solid.
//
// The core hall (picture 2) is the tower's shaft: round, 30 m across, the
// reactor's glass column up its middle, a deck every 9 m. Each deck is three
// bands round the column: the ring catwalk against the glass, the energy net
// (a floor you can see through), the outer balcony. Off the decks:
//  - the service wells (picture 1): a corridor out through the hull, a ramp
//    up, a landing with a side room (loot), a ramp back, in again a deck up;
//  - the lounge (picture 3): off deck 3, windows over the Earth, sofas, its
//    mezzanine and ramps up to the top;
//  - the workshop (picture 4): off the top, Earl's quad on its lift, the
//    mechanics, shelves of curios; and the hangar past it, with the beam down.
// Up the shaft: a spiral stair (deck 0 to 1 whole, 1 to 2 broken), hover discs
// in the nets' holes (each deck to the next), the wells, the lounge's ramps.
// Holes are staggered: a fall through one lands on the deck below.
//
// Angles are from +z toward +x (atan2(x, z)). Tom arrives on the pad at deck 0,
// on the -z side, facing the column.
//
// buildShipTower() -> { solids, places, posts, zones, panels, loot, curios, levels, lights, strips }

export const TAU = Math.PI * 2;
export const R = 15; // the shaft's inner wall
export const WALL = 0.6;
export const COLUMN = 3; // the reactor's glass
export const LEVELS = [0, 9, 18, 27, 36];
export const ROOF = 46;
export const T = 0.35; // a deck's thickness
const BANDS = { catwalk: [COLUMN, 6], net: [6, 10.5], balcony: [10.5, R] };
const DISC_R = 1.05;
const RAIL_H = 1.05;
const DOOR_H = 3.2;

const norm = (a) => ((a % TAU) + TAU) % TAU;
const polar = (r, a) => ({ x: r * Math.sin(a), z: r * Math.cos(a) });

// The arcs of a full circle left once the holes ([a0, a1] each) are taken out.
export function arcsMinus(holes) {
  const cuts = [];
  for (const [a0, a1] of holes) {
    const s = norm(a0);
    const len = a1 - a0;
    if (len >= TAU) return [];
    if (s + len > TAU) {
      cuts.push([s, TAU], [0, s + len - TAU]);
    } else cuts.push([s, s + len]);
  }
  cuts.sort((a, b) => a[0] - b[0]);
  const out = [];
  let at = 0;
  for (const [s, e] of cuts) {
    if (s > at + 1e-6) out.push([at, s]);
    at = Math.max(at, e);
  }
  if (at < TAU - 1e-6) out.push([at, TAU]);
  // Join the arc over 0 to the arc before it.
  if (out.length > 1 && out[0][0] < 1e-6 && out[out.length - 1][1] > TAU - 1e-6) {
    const first = out.shift();
    out[out.length - 1] = [out[out.length - 1][0], TAU + first[1]];
  }
  return out;
}

// A frame turned to face out of the shaft at angle a: (lx across, lz out from the middle) -> the ship's.
function frame(a) {
  const ux = Math.sin(a);
  const uz = Math.cos(a);
  const vx = Math.cos(a);
  const vz = -Math.sin(a);
  return {
    a,
    at: (lx, lz) => ({ x: lx * vx + lz * ux, z: lx * vz + lz * uz }),
    // A box lx0..lx1 across, lz0..lz1 out, y0..y1, square to the frame.
    box: (lx0, lx1, lz0, lz1, y0, y1, extra = {}) => {
      const cx = (lx0 + lx1) / 2;
      const cz = (lz0 + lz1) / 2;
      const c = { x: cx * vx + cz * ux, z: cx * vz + cz * uz };
      return { kind: 'box', x: c.x, z: c.z, hx: (lx1 - lx0) / 2, hz: (lz1 - lz0) / 2, a, y0, y1, ...extra };
    },
    // A ramp rising along +lz (out) or, with back, toward the shaft.
    ramp: (lx0, lx1, lz0, lz1, yLow, yHigh, back, extra = {}) => {
      const cx = (lx0 + lx1) / 2;
      const cz = (lz0 + lz1) / 2;
      const c = { x: cx * vx + cz * ux, z: cx * vz + cz * uz };
      return { kind: 'ramp', x: c.x, z: c.z, hx: (lx1 - lx0) / 2, hz: (lz1 - lz0) / 2, a: back ? a + Math.PI : a, y0: yLow, y1: yHigh, thick: 0.35, ...extra };
    },
  };
}

export function buildShipTower() {
  const solids = [];
  const openings = []; // in the shaft's wall: { a, half, y0, y1 }
  const lights = []; // cyan tube lights (unlit glow, drawn): { x, y, z, a, len }
  const strips = []; // the alarm strips, by zone: { zone, x, y, z, a, len }
  const add = (s) => {
    solids.push(s);
    return s;
  };
  const deckPiece = (band, a0, a1, y, extra = {}) => {
    const [r0, r1] = BANDS[band];
    return add({ kind: 'ring', x: 0, z: 0, r0, r1, a0, a1, y0: y - T, y1: y, style: band, ...(band === 'net' ? { shots: false, see: false } : {}), ...extra });
  };
  const rail = (r, a0, a1, y, extra = {}) => add({ kind: 'ring', x: 0, z: 0, r0: r - 0.06, r1: r + 0.06, a0, a1, y0: y, y1: y + RAIL_H, walk: false, shots: false, see: false, style: 'rail', ...extra });
  const radialRail = (a, r0, r1, y) => {
    const f = frame(a);
    return add(f.box(-0.06, 0.06, r0, r1, y, y + RAIL_H, { walk: false, shots: false, see: false, style: 'rail' }));
  };
  // A deck: each band round the circle less its holes ({ band, a0, a1 }).
  const deck = (y, holes = []) => {
    for (const band of Object.keys(BANDS)) {
      const mine = holes.filter((h) => h.band === band).map((h) => [h.a0, h.a1]);
      for (const [a0, a1] of arcsMinus(mine)) deckPiece(band, a0, a1, y);
    }
  };

  // ---- the shell, the floor, the roof, the column ----
  add({ kind: 'cyl', x: 0, z: 0, r: R + WALL, y0: -1.5, y1: 0, style: 'floor' });
  add({ kind: 'cyl', x: 0, z: 0, r: R + WALL, y0: ROOF, y1: ROOF + 1, style: 'roof' });
  add({ kind: 'cyl', x: 0, z: 0, r: COLUMN, y0: 0, y1: ROOF, style: 'column', see: false });

  // ---- the stairs: a spiral against the glass. Deck 0 to 1 whole; 1 to 2 broken (two flights gone: jump it) ----
  const STAIR = { r0: COLUMN + 0.05, r1: 5.95, n: 8 };
  const stairs = [];
  const helix = (aStart, span, yA, yB, skip = [], id) => {
    const dy = (yB - yA) / STAIR.n;
    const rm = (STAIR.r0 + STAIR.r1) / 2;
    const chord = 2 * rm * Math.sin(Math.abs(span) / (2 * STAIR.n)) + 0.3;
    for (let k = 0; k < STAIR.n; k++) {
      if (skip.includes(k)) continue;
      const am = aStart + ((k + 0.5) * span) / STAIR.n;
      const c = polar(rm, am);
      const s = add({ kind: 'ramp', x: c.x, z: c.z, hx: (STAIR.r1 - STAIR.r0) / 2, hz: chord / 2, a: am + (span > 0 ? Math.PI / 2 : -Math.PI / 2), y0: yA + k * dy, y1: yA + (k + 1) * dy, thick: 0.3, style: 'stair', stair: id, flight: k });
      stairs.push(s);
    }
  };
  helix(Math.PI / 2, Math.PI, 0, 9, [], 's1');
  helix((3 * Math.PI) / 2, Math.PI, 9, 18, [3, 4], 's2');

  // ---- the hover discs: three up each net's hole, staggered round the shaft ----
  const discs = [];
  const discRoute = (y, aFirst, step, r = 8.25, last = null) => {
    for (let k = 0; k < 3; k++) {
      const a = aFirst + k * step;
      const rr = k === 2 && last ? last : r;
      const c = polar(rr, a);
      discs.push(add({ kind: 'cyl', x: c.x, z: c.z, r: DISC_R, y0: y + 2.25 * (k + 1) - 0.3, y1: y + 2.25 * (k + 1), style: 'disc' }));
    }
  };
  const D1 = 0.05 * Math.PI;
  const D2 = -0.8 * Math.PI;
  const D3 = 0.7 * Math.PI;
  const D4 = -0.3 * Math.PI;
  const DSTEP = 0.12 * Math.PI;
  discRoute(0, D1, DSTEP);
  discRoute(9, D2, DSTEP);
  discRoute(18, D3, DSTEP);
  discRoute(27, D4, DSTEP, 8.25, 9.1);
  const netHole = (aFirst) => ({ band: 'net', a0: aFirst + 0.06 * Math.PI, a1: aFirst + 0.37 * Math.PI });
  const stairHole = (aStart) => ({ band: 'catwalk', a0: aStart + 0.65 * Math.PI, a1: aStart + Math.PI });

  // ---- decks 1 to 3, the top ----
  const holes1 = [netHole(D1), stairHole(Math.PI / 2)];
  const holes2 = [netHole(D2), stairHole((3 * Math.PI) / 2)];
  const holes3 = [netHole(D3)];
  deck(LEVELS[1], holes1);
  deck(LEVELS[2], holes2);
  deck(LEVELS[3], holes3);
  // Rails round each hole (not on the side a route lands on).
  const holeRails = (y, h, landEnd) => {
    const [r0, r1] = BANDS[h.band];
    if (h.band === 'net') {
      rail(r0, h.a0, h.a1, y);
      rail(r1, h.a0, h.a1, y);
      if (landEnd !== 'a0') radialRail(h.a0, r0, r1, y);
      if (landEnd !== 'a1') radialRail(h.a1, r0, r1, y);
    } else {
      rail(r1, h.a0, h.a1, y);
      if (landEnd !== 'a0') radialRail(h.a0, r0, r1, y);
    }
  };
  holeRails(LEVELS[1], holes1[0], 'a1');
  holeRails(LEVELS[1], holes1[1], 'a1');
  holeRails(LEVELS[2], holes2[0], 'a1');
  holeRails(LEVELS[2], holes2[1], 'a1');
  holeRails(LEVELS[3], holes3[0], 'a1');
  // The top: the crown round the column's head, the balcony, two bridges between; the void open (a fall: deck 3's net).
  const TOP = LEVELS[4];
  const CROWN = 7;
  add({ kind: 'ring', x: 0, z: 0, r0: COLUMN, r1: CROWN, a0: 0, a1: TAU, y0: TOP - T, y1: TOP, style: 'catwalk' });
  add({ kind: 'ring', x: 0, z: 0, r0: BANDS.balcony[0], r1: R, a0: 0, a1: TAU, y0: TOP - T, y1: TOP, style: 'balcony' });
  const bridgeHalf = 1.25;
  for (const a of [Math.PI / 2, -Math.PI / 2]) {
    const f = frame(a);
    add(f.box(-bridgeHalf, bridgeHalf, CROWN - 0.3, BANDS.balcony[0] + 0.3, TOP - T, TOP, { style: 'bridge' }));
    add(f.box(-bridgeHalf - 0.12, -bridgeHalf, CROWN, BANDS.balcony[0], TOP, TOP + RAIL_H, { walk: false, shots: false, see: false, style: 'rail' }));
    add(f.box(bridgeHalf, bridgeHalf + 0.12, CROWN, BANDS.balcony[0], TOP, TOP + RAIL_H, { walk: false, shots: false, see: false, style: 'rail' }));
  }
  const gapC = bridgeHalf / CROWN + 0.02;
  const gapB = bridgeHalf / BANDS.balcony[0] + 0.02;
  const d4Land = D4 + 2 * DSTEP;
  const gapD = 1.6 / BANDS.balcony[0];
  for (const [a0, a1] of arcsMinus([[Math.PI / 2 - gapC, Math.PI / 2 + gapC], [-Math.PI / 2 - gapC, -Math.PI / 2 + gapC]])) rail(CROWN, a0, a1, TOP);
  for (const [a0, a1] of arcsMinus([[Math.PI / 2 - gapB, Math.PI / 2 + gapB], [-Math.PI / 2 - gapB, -Math.PI / 2 + gapB], [d4Land - gapD, d4Land + gapD]])) rail(BANDS.balcony[0], a0, a1, TOP);

  // ---- the service wells (picture 1): out, up a ramp, a landing (and its side room), back up, in a deck higher ----
  const wells = [];
  const well = (a, yL, id) => {
    const f = frame(a);
    const W = 3; // a lane
    const z0 = R - 0.6; // the stub starts on the deck
    const zIn = R + WALL - 0.3;
    const zRamp = 17.2;
    const zLand = 25;
    const zFar = 28;
    const top = yL + 12.6;
    const room = { z0: zFar + 0.4, z1: zFar + 6.2, half: 3 };
    const S = { style: 'wall' };
    add(f.box(-W - 0.2, -0.2, z0, zRamp, yL - T, yL, { style: 'corridor' })); // stub in (lane A)
    add(f.ramp(-W - 0.2, -0.2, zRamp, zLand, yL, yL + 4.5, false, { style: 'stair' }));
    add(f.box(-W - 0.2, W + 0.2, zLand, zFar, yL + 4.5 - T, yL + 4.5, { style: 'corridor' })); // the landing
    add(f.ramp(0.2, W + 0.2, zRamp, zLand, yL + 4.5, yL + 9, true, { style: 'stair' }));
    add(f.box(0.2, W + 0.2, z0, zRamp, yL + 9 - T, yL + 9, { style: 'corridor' })); // stub out (lane B)
    add(f.box(-W - 0.6, W + 0.6, zIn, zFar + 0.4, yL - 1, yL - 0.5, { style: 'floor' })); // its floor, under everything
    add(f.box(-0.2, 0.2, zIn, zLand, yL - 0.5, top, S)); // the divider
    add(f.box(-W - 0.6, -W - 0.2, zIn, zFar + 0.4, yL - 0.5, top, S));
    add(f.box(W + 0.2, W + 0.6, zIn, zFar + 0.4, yL - 0.5, top, S));
    add(f.box(-W - 0.6, W + 0.6, zIn, zFar + 0.4, top, top + 0.4, { style: 'ceiling' }));
    // The far wall, with the side room's door in it.
    const dy0 = yL + 4.5;
    const dy1 = dy0 + DOOR_H;
    add(f.box(-W - 0.6, -1.3, zFar, zFar + 0.4, yL - 0.5, top, S));
    add(f.box(1.3, W + 0.6, zFar, zFar + 0.4, yL - 0.5, top, S));
    add(f.box(-1.3, 1.3, zFar, zFar + 0.4, yL - 0.5, dy0, S));
    add(f.box(-1.3, 1.3, zFar, zFar + 0.4, dy1, top, S));
    // The side room: a short corridor's end, a conduit at the back (picture 1), what's kept there.
    add(f.box(-room.half, room.half, room.z0 - 0.4, room.z1, dy0 - T, dy0, { style: 'corridor' }));
    add(f.box(-room.half - 0.4, -room.half, room.z0, room.z1 + 0.4, dy0 - 0.5, dy0 + 3.6, S));
    add(f.box(room.half, room.half + 0.4, room.z0, room.z1 + 0.4, dy0 - 0.5, dy0 + 3.6, S));
    add(f.box(-room.half - 0.4, room.half + 0.4, room.z1, room.z1 + 0.4, dy0 - 0.5, dy0 + 3.6, S));
    add(f.box(-room.half - 0.4, room.half + 0.4, room.z0, room.z1 + 0.4, dy0 + 3.6, dy0 + 4, { style: 'ceiling' }));
    const conduit = f.at(0, room.z1 - 0.9);
    add({ kind: 'cyl', x: conduit.x, z: conduit.z, r: 0.55, y0: dy0, y1: dy0 + 3.6, style: 'conduit' });
    // The doors through the shaft's wall.
    const half = (W / 2 + 0.05) / R;
    const aA = a + Math.asin(-(W / 2 + 0.2) / R);
    const aB = a + Math.asin((W / 2 + 0.2) / R);
    openings.push({ a: aA, half, y0: yL, y1: yL + DOOR_H }, { a: aB, half, y0: yL + 9, y1: yL + 9 + DOOR_H });
    // Lights down each lane's ceiling; the room's.
    for (const lx of [-W / 2 - 0.2, W / 2 + 0.2]) lights.push({ ...f.at(lx, (zIn + zFar) / 2), y: top - 0.3, a, len: zFar - zIn - 1 });
    lights.push({ ...f.at(0, (room.z0 + room.z1) / 2), y: dy0 + 3.4, a, len: room.z1 - room.z0 - 1 });
    const w = { id, a, yL, frame: f, room: { ...f.at(0, (room.z0 + room.z1) / 2), y: dy0 }, landing: { ...f.at(0, (zLand + zFar) / 2), y: yL + 4.5 }, doorIn: { ...f.at(-W / 2 - 0.2, R - 1.5), y: yL }, doorOut: { ...f.at(W / 2 + 0.2, R - 1.5), y: yL + 9 } };
    wells.push(w);
    return w;
  };
  const W1 = well(-0.55 * Math.PI, LEVELS[0], 'well1');
  const W2 = well(0.62 * Math.PI, LEVELS[2], 'well2');

  // ---- the lounge (picture 3): off deck 3 at +z; windows over the Earth; its mezzanine and ramps up to the top ----
  const LY = LEVELS[3];
  const L = { x0: -9, x1: 9, z0: 12.2, z1: 28, ceil: TOP + 3.6 }; // (z0 inside the shaft's wall: no gap where the straight walls meet the curve)
  const lounge = { floorY: LY, ...L };
  add({ kind: 'box', x: 0, z: (L.z0 + L.z1) / 2, hx: L.x1 + 0.2, hz: (L.z1 - L.z0) / 2, y0: LY - T, y1: LY, style: 'lounge' });
  const wallS = { style: 'wall' };
  add({ kind: 'box', x: L.x0 - 0.2, z: (L.z0 + L.z1) / 2 + 0.3, hx: 0.2, hz: (L.z1 - L.z0) / 2 + 0.3, y0: LY - 0.5, y1: L.ceil, ...wallS });
  add({ kind: 'box', x: L.x1 + 0.2, z: (L.z0 + L.z1) / 2 + 0.3, hx: 0.2, hz: (L.z1 - L.z0) / 2 + 0.3, y0: LY - 0.5, y1: L.ceil, ...wallS });
  add({ kind: 'box', x: 0, z: L.z1 + 0.2, hx: L.x1 + 0.4, hz: 0.2, y0: LY - 0.5, y1: LY + 0.9, ...wallS }); // under the windows
  add({ kind: 'box', x: 0, z: L.z1 + 0.2, hx: L.x1 + 0.4, hz: 0.2, y0: LY + 0.9, y1: L.ceil - 0.6, style: 'window', see: false }); // the glass
  add({ kind: 'box', x: 0, z: L.z1 + 0.2, hx: L.x1 + 0.4, hz: 0.2, y0: L.ceil - 0.6, y1: L.ceil, ...wallS });
  add({ kind: 'box', x: 0, z: (L.z0 + L.z1) / 2 + 0.3, hx: L.x1 + 0.4, hz: (L.z1 - L.z0) / 2 + 0.5, y0: L.ceil, y1: L.ceil + 0.4, style: 'ceiling' });
  // The mezzanine along the left, a ramp up to it, a ramp across to the top's door.
  const MZ = LY + 4.5;
  add({ kind: 'ramp', x: -7.5, z: 22, hx: 1.5, hz: 4, a: Math.PI, y0: LY, y1: MZ, thick: 0.35, style: 'stair' }); // rises toward the shaft
  add({ kind: 'box', x: -6.75, z: 16.6, hx: 2.25, hz: 1.4, y0: MZ - T, y1: MZ, style: 'balcony' });
  add({ kind: 'ramp', x: -0.5, z: 16.6, hx: 1.3, hz: 4, a: Math.PI / 2, y0: MZ, y1: TOP, thick: 0.35, style: 'stair' }); // rises toward +x
  add({ kind: 'box', x: 5.5, z: 16.2, hx: 2, hz: 1.8, y0: TOP - T, y1: TOP, style: 'balcony' });
  // Rails: the mezzanine's open sides, the ramp across.
  add({ kind: 'box', x: -5.25, z: 18.06, hx: 0.75, hz: 0.06, y0: MZ, y1: MZ + RAIL_H, walk: false, shots: false, see: false, style: 'rail' }); // (R1 comes up beside it)
  add({ kind: 'ramp', x: -0.5, z: 17.96, hx: 0.06, hz: 4, a: Math.PI / 2, y0: MZ + RAIL_H, y1: TOP + RAIL_H, thick: RAIL_H, walk: false, shots: false, see: false, style: 'rail' });
  add({ kind: 'box', x: 5.5, z: 18.06, hx: 2, hz: 0.06, y0: TOP, y1: TOP + RAIL_H, walk: false, shots: false, see: false, style: 'rail' });
  add({ kind: 'box', x: 7.56, z: 16.2, hx: 0.06, hz: 1.8, y0: TOP, y1: TOP + RAIL_H, walk: false, shots: false, see: false, style: 'rail' });
  // Sofas (picture 3), low consoles by the glass.
  const sofas = [
    { x: -3.5, z: 21.5, a: 0.3, len: 3.4 },
    { x: 3.2, z: 23.2, a: -0.2, len: 3.0 },
    { x: 1.5, z: 18.6, a: 0.0, len: 2.6 },
    { x: -5.8, z: 26.2, a: 0.1, len: 2.4 },
  ];
  for (const s of sofas) add({ kind: 'box', x: s.x, z: s.z, hx: s.len / 2, hz: 0.5, a: s.a, y0: LY, y1: LY + 0.85, style: 'sofa' });
  for (const [x, z] of [[-1.5, 26.9], [5.5, 26.9]]) add({ kind: 'box', x, z, hx: 0.5, hz: 0.35, y0: LY, y1: LY + 1.1, style: 'console' });
  const loungeDoor = { a: 0, half: 0.18 * Math.PI, y0: LY, y1: LY + 4.2 };
  const topDoorA = Math.asin(5.5 / R);
  openings.push(loungeDoor, { a: topDoorA, half: 1.9 / R, y0: TOP, y1: TOP + DOOR_H });
  for (const x of [-5, 0, 5]) lights.push({ x, z: 21.5, y: L.ceil - 0.3, a: 0, len: 9 });

  // ---- the workshop (picture 4) and the hangar, off the top at +x ----
  const WK = { x0: 13, x1: 28, z0: -7, z1: 7, ceil: TOP + 6, wallFrom: 13.6 }; // (x0 inside the shaft: no gap where its walls meet the curve)
  const HG = { x0: 28, x1: 46, z0: -10, z1: 10, ceil: TOP + 10, wallFrom: 27.4 };
  const room = (b, style) => {
    add({ kind: 'box', x: (b.x0 + b.x1) / 2, z: 0, hx: (b.x1 - b.x0) / 2, hz: b.z1 + 0.2, y0: TOP - T, y1: TOP, style });
    const wx = (b.wallFrom + b.x1 + 0.6) / 2;
    const whx = (b.x1 + 0.6 - b.wallFrom) / 2;
    add({ kind: 'box', x: wx, z: b.z0 - 0.2, hx: whx, hz: 0.2, y0: TOP - 0.5, y1: b.ceil, ...wallS });
    add({ kind: 'box', x: wx, z: b.z1 + 0.2, hx: whx, hz: 0.2, y0: TOP - 0.5, y1: b.ceil, ...wallS });
    add({ kind: 'box', x: wx, z: 0, hx: whx, hz: b.z1 + 0.4, y0: b.ceil, y1: b.ceil + 0.4, style: 'ceiling' });
  };
  room(WK, 'workshop');
  room(HG, 'hangar');
  // Between them: the bay door's frame.
  const bayHalf = 2.6;
  add({ kind: 'box', x: WK.x1 + 0.2, z: (WK.z0 - bayHalf) / 2, hx: 0.2, hz: (-bayHalf - WK.z0) / 2, y0: TOP - 0.5, y1: WK.ceil, ...wallS });
  add({ kind: 'box', x: WK.x1 + 0.2, z: (WK.z1 + bayHalf) / 2, hx: 0.2, hz: (WK.z1 - bayHalf) / 2, y0: TOP - 0.5, y1: WK.ceil, ...wallS });
  add({ kind: 'box', x: WK.x1 + 0.2, z: 0, hx: 0.2, hz: bayHalf, y0: TOP + 4.4, y1: WK.ceil, ...wallS });
  add({ kind: 'box', x: WK.x1 + 0.2, z: (HG.z0 + WK.z0) / 2 - 0.2, hx: 0.2, hz: (WK.z0 - HG.z0) / 2 + 0.2, y0: TOP - 0.5, y1: HG.ceil, ...wallS });
  add({ kind: 'box', x: WK.x1 + 0.2, z: (HG.z1 + WK.z1) / 2 + 0.2, hx: 0.2, hz: (HG.z1 - WK.z1) / 2 + 0.2, y0: TOP - 0.5, y1: HG.ceil, ...wallS });
  add({ kind: 'box', x: WK.x1 + 0.2, z: 0, hx: 0.2, hz: WK.z1, y0: WK.ceil, y1: HG.ceil, ...wallS });
  // The hangar's open end: a field across it (see through, not through it).
  add({ kind: 'box', x: HG.x1 + 0.2, z: 0, hx: 0.2, hz: HG.z1 + 0.4, y0: TOP - 0.5, y1: TOP + 0.6, ...wallS });
  add({ kind: 'box', x: HG.x1 + 0.2, z: 0, hx: 0.2, hz: HG.z1 + 0.4, y0: TOP + 0.6, y1: HG.ceil, style: 'field', see: false });
  // The workshop's lift (it stands raised, the quad on it), benches, the shelves of curios.
  const lift = add({ kind: 'box', x: 21, z: 0, hx: 1.25, hz: 1.7, y0: TOP, y1: TOP + 1.3, style: 'lift', tag: 'lift' });
  const benches = [
    { x: 17.5, z: 5.9, hx: 1.6, hz: 0.6 },
    { x: 24.5, z: 5.9, hx: 1.8, hz: 0.6 },
    { x: 17.8, z: -5.9, hx: 1.4, hz: 0.6 },
    { x: 24.8, z: -5.6, hx: 1.2, hz: 0.6 },
  ];
  for (const b of benches) add({ kind: 'box', x: b.x, z: b.z, hx: b.hx, hz: b.hz, y0: TOP, y1: TOP + 0.95, style: 'bench' });
  add({ kind: 'box', x: 21.2, z: -6.7, hx: 1.3, hz: 0.3, y0: TOP, y1: TOP + 2.6, style: 'shelf' });
  openings.push({ a: Math.PI / 2, half: 2.5 / R, y0: TOP, y1: TOP + 4 });

  // ---- deck 0: the floor's consoles; crates by the wall ----
  const consoles0 = [
    { a: 0.32 * Math.PI, r: 11.5 },
    { a: -0.18 * Math.PI, r: 12 },
    { a: -0.78 * Math.PI, r: 11.5 },
    { a: 0.55 * Math.PI, r: 12.5 },
  ];
  for (const c of consoles0) {
    const p = polar(c.r, c.a);
    add({ kind: 'box', x: p.x, z: p.z, hx: 0.8, hz: 0.35, a: c.a, y0: 0, y1: 1.1, style: 'console' });
  }
  const consoles1 = [{ a: 0.95 * Math.PI, r: 13.4, y: LEVELS[1] }, { a: -0.3 * Math.PI, r: 13.4, y: LEVELS[2] }, { a: 0.4 * Math.PI, r: 13.4, y: LEVELS[3] }];
  for (const c of consoles1) {
    const p = polar(c.r, c.a);
    add({ kind: 'box', x: p.x, z: p.z, hx: 0.8, hz: 0.35, a: c.a, y0: c.y, y1: c.y + 1.1, style: 'console' });
  }
  for (const [a, r, h] of [[-0.42 * Math.PI, 13.6, 1.0], [-0.45 * Math.PI, 13.2, 1.6], [0.12 * Math.PI, 13.8, 1.2]]) {
    const p = polar(r, a);
    add({ kind: 'box', x: p.x, z: p.z, hx: 0.6, hz: 0.6, a: a + 0.3, y0: 0, y1: h, style: 'crate' });
  }

  // ---- the shaft's wall, less its openings ----
  shaftWall(add, openings);

  // ---- lights: tube lights round the wall under each deck; alarm strips round each deck's balcony ----
  for (let i = 0; i < LEVELS.length; i++) {
    const y = LEVELS[i];
    for (let k = 0; k < 16; k++) {
      const a = (k + 0.5) * (TAU / 16);
      if (openings.some((o) => Math.abs(norm(a - o.a + Math.PI) - Math.PI) < o.half + 0.12 && y + 2.6 >= o.y0 && y + 2.6 <= o.y1 + 1)) continue;
      const p = polar(R - 0.08, a);
      lights.push({ ...p, y: y + 2.6, a: a + Math.PI / 2, len: 2.6, wall: true });
    }
    const zone = ['floor', 'deck1', 'deck2', 'deck3', 'top'][i];
    for (let k = 0; k < 24; k++) {
      const a = (k + 0.5) * (TAU / 24);
      const p = polar(R - 0.06, a);
      strips.push({ zone, ...p, y: y + 0.12, a: a + Math.PI / 2, len: 3.4 });
    }
  }
  for (const w of wells) {
    const f = w.frame;
    for (const lx of [-3.18, 3.18]) strips.push({ zone: w.id, ...f.at(lx, 21.5), y: w.yL + 7, a: w.a, len: 12, along: true });
  }
  for (const x of [-9, 9]) strips.push({ zone: 'lounge', x: x * 0.98, z: 21.5, y: LY + 0.12, a: 0, len: 13, along: true });
  for (const z of [-6.95, 6.95]) strips.push({ zone: 'workshop', x: 21.5, z, y: TOP + 0.12, a: Math.PI / 2, len: 12, along: true });
  for (const z of [-9.95, 9.95]) strips.push({ zone: 'hangar', x: 37, z, y: TOP + 0.12, a: Math.PI / 2, len: 17, along: true });

  // ---- places ----
  const places = {
    pad: { x: 0, y: 0, z: -9 },
    core: { x: COLUMN + 1.35, y: TOP, z: 0 }, // where Tom stands to take it: on the crown, at the socket
    socket: { x: COLUMN + 0.05, y: TOP + 1.25, z: 0 },
    quad: { x: 21, y: TOP + 1.3, z: 0 },
    beam: { x: 40, y: TOP, z: 0 },
    panel: { x: 14.8, y: TOP + 1.3, z: 6.95 }, // the alarm panel on the workshop's wall; the mechanics run here:
    panelStand: { x: 14.8, y: TOP, z: 6.15 },
    // Their ways there, round the lift and the benches.
    fleeFrom: [[{ x: 18.6, z: 2.4 }, { x: 15.2, z: 3.5 }], [{ x: 23.2, z: -2.5 }, { x: 18.4, z: -2.5 }, { x: 15.2, z: 3.5 }]],
    stairFoot: { ...polar(4.5, Math.PI / 2 - 0.3), y: 0 }, // (just short of its first flight)
    lounge: { x: 0, y: LY, z: 21 },
    workshop: { x: 18.5, y: TOP, z: 0 },
    hangar: { x: 34, y: TOP, z: 0 },
    wells: Object.fromEntries(wells.map((w) => [w.id, w])),
  };

  // ---- the greys: [zone, role, kit stage, x, y, z, facing (radians, 0 = +z)] ----
  // worker: busy at a console until it notices Tom; guard: watching (deck 2 is the red zone, on alert);
  // lounger: off duty on a sofa, slow to react; mechanic: unarmed, runs for the alarm panel.
  const P = (r, a, y) => ({ ...polar(r, a), y });
  const face = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
  const post = (zone, role, stage, at, facing, extra = {}) => ({ zone, role, stage, x: at.x, y: at.y, z: at.z, facing, ...extra });
  // On a sofa, `along` metres from its middle, a little forward of its back.
  const sitOn = (s, along) => ({ x: s.x + along * Math.cos(s.a) + 0.1 * Math.sin(s.a), y: LY, z: s.z - along * Math.sin(s.a) + 0.1 * Math.cos(s.a) });
  const atConsole = (c, y = 0) => {
    const p = polar(c.r - 0.85, c.a);
    return { ...p, y };
  };
  const posts = [
    post('floor', 'worker', 5, atConsole(consoles0[0]), consoles0[0].a),
    post('floor', 'worker', 5, atConsole(consoles0[1]), consoles0[1].a),
    post('floor', 'worker', 5, atConsole(consoles0[2]), consoles0[2].a),
    post('deck1', 'guard', 1, P(12.5, -0.1 * Math.PI, LEVELS[1]), Math.PI),
    post('deck1', 'worker', 1, atConsole(consoles1[0], LEVELS[1]), consoles1[0].a),
    post('deck2', 'guard', 2, P(12.6, -0.45 * Math.PI, LEVELS[2]), 0),
    post('deck2', 'guard', 2, P(12.6, 0.15 * Math.PI, LEVELS[2]), Math.PI),
    post('deck2', 'guard', 2, P(4.6, 0.95 * Math.PI, LEVELS[2]), 0),
    post('well2', 'guard', 2, { ...W2.landing }, W2.a + Math.PI),
    post('lounge', 'lounger', 3, sitOn(sofas[0], -0.5), sofas[0].a),
    post('lounge', 'lounger', 3, sitOn(sofas[1], 0.6), sofas[1].a),
    post('lounge', 'lounger', 2, sitOn(sofas[2], 0), sofas[2].a),
    post('top', 'guard', 3, P(5.2, -0.5 * Math.PI, TOP), Math.PI / 2 + Math.PI),
    post('top', 'guard', 3, P(12.8, 0.15 * Math.PI, TOP), -0.85 * Math.PI),
    post('hangar', 'guard', 3, { x: 37, y: TOP, z: -6.5 }, -Math.PI / 2, { waitAlarm: true }),
    post('hangar', 'guard', 3, { x: 42.5, y: TOP, z: 6 }, -Math.PI / 2, { waitAlarm: true }),
    post('workshop', 'mechanic', 4, { x: 19.4, y: TOP, z: 1.1 }, face({ x: 19.4, z: 1.1 }, { x: 21, z: 0 })),
    post('workshop', 'mechanic', 4, { x: 22.7, y: TOP, z: -1.5 }, face({ x: 22.7, z: -1.5 }, { x: 21, z: 0 })),
  ];

  // ---- zones (alerts, gravity): the first that holds a point is its zone ----
  const zones = [
    { id: 'well1', solid: wellVolume(W1) },
    { id: 'well2', solid: wellVolume(W2) },
    { id: 'lounge', solid: { kind: 'box', x: 0, z: (L.z0 + L.z1) / 2 + 0.6, hx: L.x1 + 0.2, hz: (L.z1 - L.z0) / 2 + 0.2, y0: LY - 1, y1: L.ceil } },
    { id: 'workshop', solid: { kind: 'box', x: 21.2, z: 0, hx: 7.1, hz: WK.z1, y0: TOP - 1, y1: WK.ceil } },
    { id: 'hangar', solid: { kind: 'box', x: (HG.x0 + HG.x1) / 2 + 0.2, z: 0, hx: (HG.x1 - HG.x0) / 2, hz: HG.z1, y0: TOP - 1, y1: HG.ceil } },
    { id: 'floor', solid: { kind: 'cyl', x: 0, z: 0, r: R + 1, y0: -2, y1: 7.5 } },
    { id: 'deck1', solid: { kind: 'cyl', x: 0, z: 0, r: R + 1, y0: 7.5, y1: 16.5 } },
    { id: 'deck2', solid: { kind: 'cyl', x: 0, z: 0, r: R + 1, y0: 16.5, y1: 25.5 } },
    { id: 'deck3', solid: { kind: 'cyl', x: 0, z: 0, r: R + 1, y0: 25.5, y1: 34.5 } },
    { id: 'top', solid: { kind: 'cyl', x: 0, z: 0, r: R + 1, y0: 34.5, y1: ROOF } },
  ];

  // ---- what's kept: the side rooms' crates, a locker on deck 2 ----
  const loot = [
    { id: 'well1', at: { ...W1.room }, kits: 1, shells: 6, energy: 0, label: 'a med kit and alien shells' },
    { id: 'well2', at: { ...W2.room }, kits: 1, shells: 4, energy: 40, label: 'an alien shield, a med kit and shells' },
    { id: 'deck2', at: P(13.8, 0.74 * Math.PI, LEVELS[2]), kits: 0, shells: 6, energy: 0, label: 'alien shells' },
  ];
  // ---- the workshop's curios (inspect cards: data/pickupCards.json) ----
  const curios = [
    { id: 'curioFigures', at: { x: 20.3, y: TOP + 1.5, z: -6.3 } },
    { id: 'curioStar', at: { x: 21.4, y: TOP + 1.5, z: -6.3 } },
    { id: 'curioTrailCam', at: { x: 22.4, y: TOP + 1.5, z: -6.3 } },
  ];

  return {
    solids,
    openings,
    lights,
    strips,
    places,
    posts,
    zones,
    loot,
    curios,
    stairs,
    discs,
    wells,
    lounge,
    sofas,
    workshop: WK,
    hangar: HG,
    lift,
    benches,
    levels: LEVELS,
    bands: BANDS,
  };
}

// The well's whole volume, for its zone.
function wellVolume(w) {
  const f = w.frame;
  const c = f.at(0, (R + 34.4) / 2);
  return { kind: 'box', x: c.x, z: c.z, hx: 3.7, hz: (34.4 - R - WALL) / 2, a: w.a, y0: w.yL - 1, y1: w.yL + 13 };
}

// The wall round the shaft, from the floor to the roof, with its openings cut.
function shaftWall(add, openings) {
  const cuts = new Set([0, TAU]);
  const spans = openings.map((o) => {
    const a0 = norm(o.a - o.half);
    return { ...o, a0, a1: a0 + 2 * o.half };
  });
  for (const s of spans) {
    cuts.add(s.a0);
    cuts.add(s.a1 > TAU ? s.a1 - TAU : s.a1);
  }
  const list = [...cuts].sort((a, b) => a - b);
  for (let i = 0; i < list.length - 1; i++) {
    const a0 = list[i];
    const a1 = list[i + 1];
    if (a1 - a0 < 1e-6) continue;
    const mid = (a0 + a1) / 2;
    const holes = spans.filter((s) => {
      const d = norm(mid - s.a0);
      return d < s.a1 - s.a0;
    });
    holes.sort((a, b) => a.y0 - b.y0);
    let y = -1.5;
    for (const h of holes) {
      if (h.y0 > y + 1e-6) add({ kind: 'ring', x: 0, z: 0, r0: R, r1: R + WALL, a0, a1, y0: y, y1: h.y0, style: 'hull' });
      y = Math.max(y, h.y1);
    }
    if (y < ROOF + 1) add({ kind: 'ring', x: 0, z: 0, r0: R, r1: R + WALL, a0, a1, y0: y, y1: ROOF + 1, style: 'hull' });
  }
}
