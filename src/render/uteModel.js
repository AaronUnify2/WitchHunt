// The ute (experimental, debug menu only): a single-cab, right-hand-drive
// farm ute in the 70-series mould, a steel bull bar with driving lights,
// a snorkel, a flat alloy tray with drop sides and a headboard, and a
// pintle-mounted heavy machine gun behind a shield in the middle of the
// tray: a bush "technical".
//
// Built in code with the vehicles' kit (render/vehicleModels.js), in the
// game's vehicle frame for things Tom rides (the quad's): the front at -z,
// the right at +x, y up, the origin on the ground midway between the axles.
//
// buildUte(cfg) returns the parts the game moves (world/Ute.js) and the
// model viewer poses (debug/viewerModels.js):
//  root (Group: position and heading) > body (Group: pitch and roll, the
//  suspension) > the shell, the tray, the lamps, the turret, the interior;
//  wheels: [{ group (steers), spin (Group: rolls), side, front }];
//  turret: { yaw (Group), pitch (Group), barrel (its heat glow), flash,
//    muzzle (Object3D at the barrel's tip), ejector (Object3D: where brass comes out) };
//  interior: the cab as seen from the driver's seat (hidden unless Tom's in
//    it): needles, the steering wheel, wipers, splats, the mirror, the
//    air freshener, the gear and handbrake levers, the warning lamps;
//  lamps: the materials that glow (head, spot, tail, brake, reverse);
//  setGauges(), setClock(), setOdometer(): the dash's faces (canvas; a
//    plain face where there's no canvas, as in the tests).
// The renderer of all of it is the game's own: Lambert vertex colours,
// glows that the bloom catches.

import * as THREE from 'three';
import { VEHICLE_KIT } from './vehicleModels.js';

const { extrude, box, panel, rod, reshape, paint, merge, arch, flip } = VEHICLE_KIT;

// The ute's numbers (metres). Front at -z, right at +x.
export const UTE = {
  half: 0.93, // the cab and front clip's half-width
  sill: 0.56,
  bonnet: 1.3,
  belt: 1.33,
  roof: 1.98,
  cabFront: -0.78, // the windscreen's foot
  cabBack: 0.57,
  axles: [-1.6, 1.58], // front, rear (z)
  track: 0.8, // wheel centres from the middle (x)
  wheelRadius: 0.41,
  wheelWidth: 0.28,
  archRadius: 0.5,
  tray: { front: 0.66, back: 2.64, half: 0.99, deck: 1.12, sides: 0.3 },
  pedestal: { z: 1.62, top: 2.08 }, // the gun's post in the tray
  driver: { x: 0.42 }, // right-hand drive
  wheel: { x: 0.42, y: 1.24, z: -0.38, r: 0.19, tilt: -0.52 }, // the steering wheel
  cluster: { x: 0.42, y: 1.3, z: -0.565, w: 0.4, h: 0.2, tilt: -0.3 },
};

// Paint the shell's 'body' vertices: aPaint 1 takes the paint, the rest keep their colour.
function bakePaint(g, paintHex) {
  const c = new THREE.Color(paintHex);
  const col = g.attributes.color;
  const p = g.attributes.aPaint;
  if (p) {
    for (let i = 0; i < col.count; i++) {
      if (p.getX(i) === 1) col.setXYZ(i, col.getX(i) * c.r, col.getY(i) * c.g, col.getZ(i) * c.b);
    }
    g.deleteAttribute('aPaint');
  }
  return g;
}

// Dirt: darker and browner toward the ground, a soft mottle over everything,
// red-brown dust thrown up behind the wheels. Vertex colours, so it's free.
function grime(g, look) {
  const col = g.attributes.color;
  const pos = g.attributes.position;
  const tint = new THREE.Color(look.dirt);
  const c = new THREE.Color();
  for (let i = 0; i < col.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    c.setRGB(col.getX(i), col.getY(i), col.getZ(i));
    const low = Math.max(0, Math.min(1, (look.dirtHeight - y) / look.dirtHeight));
    const n = noise(x * 2.3, y * 2.3, z * 2.3);
    c.lerp(tint, low * low * 0.55 + n * 0.08);
    c.multiplyScalar(1 - low * 0.25 + (n - 0.5) * 0.1);
    col.setXYZ(i, c.r, c.g, c.b);
  }
  return g;
}

// A cheap smooth-ish value noise in 0..1.
function noise(x, y, z) {
  const h = (a, b, cc) => {
    const s = Math.sin(a * 127.1 + b * 311.7 + cc * 74.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const xf = x - xi;
  const yf = y - yi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const w = zf * zf * (3 - 2 * zf);
  const l = (a, b, t) => a + (b - a) * t;
  return l(
    l(l(h(xi, yi, zi), h(xi + 1, yi, zi), u), l(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), u), v),
    l(l(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), u), l(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), u), v),
    w,
  );
}

// A plain coloured part (the kit's paint, one key).
const tone = (g, key, colours) => {
  if (g.attributes.uv) g.deleteAttribute('uv');
  if (!g.attributes.normal) g.computeVertexNormals();
  return paint(g, key, colours);
};

// A cylinder from a to b (radius r, `seg` sides), welded for the kit's paint.
function tube(a, b, r, seg = 8) {
  const A = new THREE.Vector3(...a);
  const B = new THREE.Vector3(...b);
  const dir = new THREE.Vector3().subVectors(B, A);
  const g = new THREE.CylinderGeometry(r, r, dir.length(), seg, 1);
  g.translate(0, dir.length() / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()));
  g.translate(...a);
  return g.toNonIndexed();
}

// A disc facing +z or -z (a lamp's lens), `seg` sides.
function disc(r, x, y, z, facing = -1, seg = 16) {
  const g = new THREE.CircleGeometry(r, seg);
  if (facing > 0) g.rotateY(0);
  else g.rotateY(Math.PI);
  g.translate(x, y, z);
  return g.toNonIndexed();
}

// A lit-or-not material for a lamp lens (its emissive turned up when lit).
function lensMaterial(color) {
  return new THREE.MeshLambertMaterial({ color, emissive: 0x000000 });
}

// ---- the shell: the front clip, the cab, glass, the bull bar, the snorkel ---------------------

function buildShell(colours, look) {
  const U = UTE;
  const [front] = U.axles;
  const r = U.archRadius;
  const ends = Math.asin((U.sill - 0.42) / r);
  // The front clip: the bonnet, the grille's face, the front wheel's arch,
  // closed at the back by the firewall under the windscreen. The cab below
  // the windows is an open box (door skins, the back panel, the floor), so
  // from the driver's seat the dash isn't lidded over.
  const tub = extrude(
    [
      [U.cabFront + 0.02, U.sill],
      [U.cabFront + 0.02, U.belt],
      [-0.82, U.bonnet],
      [-2.4, U.bonnet - 0.03],
      [-2.48, 1.23],
      [-2.5, 0.84],
      [-2.48, 0.64],
      [-2.4, 0.6],
      [-2.18, U.sill],
      ...arch([front, 0.42], r, Math.PI - ends, ends),
    ],
    U.half * 2,
    0.05,
  );
  reshape(tub, (p) => {
    const nose = Math.max(0, (-p.z - 2.15) / 0.35);
    const tuck = Math.max(0, (0.66 - p.y) / 0.1);
    p.x *= 1 - 0.04 * nose * nose - 0.03 * Math.min(1, tuck);
  });
  paint(tub, (p, n) => {
    if (n.y < -0.55) return 'under';
    if (Math.hypot(p.z - front, p.y - 0.42) < r + 0.03 && Math.abs(n.x) < 0.6) return 'under';
    return 'body';
  }, colours);
  const cab = [];
  for (const sx of [-1, 1]) {
    const skin = extrude(
      [
        [U.cabFront + 0.02, U.sill],
        [U.cabFront + 0.02, U.belt],
        [U.cabBack, U.belt],
        [U.cabBack, U.sill + 0.06],
        [U.cabBack - 0.08, U.sill],
      ],
      0.04,
      0.012,
      sx * (U.half - 0.02),
    );
    cab.push(paint(skin, (p, n) => (n.x * sx < -0.5 || n.y < -0.55 ? 'under' : 'body'), colours));
  }
  cab.push(paint(box(U.half * 2 - 0.02, U.belt - U.sill - 0.04, 0.04, 0, (U.belt + U.sill) / 2 - 0.02, U.cabBack - 0.02, 0.012), (p, n) => (n.z < -0.5 ? 'under' : 'body'), colours));
  cab.push(tone(box(U.half * 2 - 0.06, 0.05, U.cabBack - U.cabFront, 0, U.sill + 0.02, (U.cabBack + U.cabFront) / 2, 0.01), 'under', colours));
  cab.push(paint(box(U.half * 2 - 0.02, 0.03, 0.06, 0, U.belt - 0.012, U.cabBack - 0.03, 0.01), 'body', colours));

  // Fender flares over the front wheels: black plastic lips.
  const flares = [];
  for (const sx of [-1, 1]) {
    const lip = arch([front, 0.42], r + 0.06, Math.PI - ends + 0.05, ends - 0.05, 12);
    for (let i = 0; i < lip.length - 1; i++) {
      const [z1, y1] = lip[i];
      const [z2, y2] = lip[i + 1];
      flares.push(tone(rod([sx * (U.half + 0.025), y1, z1], [sx * (U.half + 0.025), y2, z2], 0.045), 'rubber', colours));
    }
  }

  // The cab's greenhouse: a near-upright windscreen, a flat roof, a square back.
  const cabHalf = (y) => 0.88 - ((y - U.belt) / (U.roof - U.belt)) * 0.06;
  const cabin = extrude(
    [
      [U.cabFront, U.belt],
      [-0.4, U.roof - 0.04],
      [-0.33, U.roof],
      [0.5, U.roof],
      [0.56, U.roof - 0.05],
      [U.cabBack, U.belt],
    ],
    1.76,
    0.05,
  );
  reshape(cabin, (p) => {
    p.x *= cabHalf(Math.max(U.belt, p.y)) / 0.88;
  });
  paint(cabin, 'body', colours);
  // Gutters along the roof's edges, and a roof rack's two bars.
  const trim = [];
  for (const sx of [-1, 1]) trim.push(tone(rod([sx * 0.83, U.roof - 0.02, -0.34], [sx * 0.83, U.roof - 0.02, 0.52], 0.012), 'rubber', colours));
  for (const z of [-0.2, 0.38]) {
    trim.push(tone(box(1.7, 0.035, 0.05, 0, U.roof + 0.05, z, 0.01), 'steel', colours));
    for (const sx of [-1, 1]) trim.push(tone(box(0.05, 0.06, 0.06, sx * 0.8, U.roof + 0.02, z, 0.01), 'steel', colours));
  }

  // Glass (dark from outside; one-sided, so from inside the cab you see out).
  const glass = [];
  const along = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const wsA = [U.cabFront, U.belt];
  const wsB = [-0.4, U.roof - 0.04];
  const ws = [
    [0.06, 1],
    [0.06, -1],
    [0.94, -1],
    [0.94, 1],
  ].map(([t, sx]) => {
    const [z, y] = along(wsA, wsB, t);
    return [sx * (cabHalf(y) - 0.07), y + 0.006, z - 0.008];
  });
  glass.push(panel(ws));
  const back = [
    [-1, 1.46],
    [1, 1.46],
    [1, 1.86],
    [-1, 1.86],
  ].map(([sx, y]) => [sx * 0.58, y, U.cabBack + 0.006]);
  glass.push(panel(back));
  const sideWin = [
    [-0.7, 1.38],
    [-0.38, 1.9],
    [0.44, 1.9],
    [0.44, 1.38],
  ];
  for (const sx of [-1, 1]) {
    const pts = sideWin.map(([z, y]) => [sx * (cabHalf(y) + 0.006), y, z]);
    glass.push(panel(sx > 0 ? pts : pts.reverse()));
  }
  const glassParts = glass.map((g) => tone(g, 'glass', colours));
  // Window rubbers round the side windows, and the door seams and handles.
  for (const sx of [-1, 1]) {
    for (let i = 0; i < sideWin.length; i++) {
      const [z1, y1] = sideWin[i];
      const [z2, y2] = sideWin[(i + 1) % sideWin.length];
      trim.push(tone(rod([sx * (cabHalf(y1) + 0.008), y1, z1], [sx * (cabHalf(y2) + 0.008), y2, z2], 0.01), 'rubber', colours));
    }
    trim.push(tone(box(0.008, 0.72, 0.012, sx * (U.half + 0.003), 0.97, U.cabFront + 0.02, 0.002), 'seam', colours));
    trim.push(tone(box(0.008, 0.72, 0.012, sx * (U.half + 0.003), 0.97, 0.46, 0.002), 'seam', colours));
    trim.push(tone(box(0.016, 0.03, 0.12, sx * (U.half + 0.01), 1.2, 0.3, 0.006), 'steel', colours));
    // The mirrors: a black arm and a tall head.
    trim.push(tone(rod([sx * (U.half - 0.02), 1.36, -0.68], [sx * (U.half + 0.16), 1.42, -0.66], 0.014), 'rubber', colours));
    trim.push(tone(box(0.05, 0.22, 0.14, sx * (U.half + 0.2), 1.48, -0.66, 0.02), 'rubber', colours));
  }

  // The front: a slatted grille, round lamps in square bezels, indicators.
  const face = [];
  face.push(tone(box(1.0, 0.36, 0.03, 0, 1.02, -2.505), 'grille', colours));
  for (const y of [0.9, 0.96, 1.02, 1.08, 1.14]) face.push(tone(box(0.98, 0.016, 0.02, 0, y, -2.522, 0.004), 'steel', colours));
  for (const sx of [-1, 1]) {
    face.push(tone(box(0.3, 0.28, 0.03, sx * 0.67, 1.02, -2.5, 0.02), 'rubber', colours)); // the bezel
    face.push(tone(box(0.12, 0.06, 0.02, sx * 0.67, 0.84, -2.51, 0.01), 'amber', colours)); // the indicator
  }
  // The steel bumper under the bull bar, and the number plate.
  face.push(tone(box(1.9, 0.2, 0.18, 0, 0.66, -2.55, 0.03), 'steel', colours));
  face.push(tone(box(0.36, 0.12, 0.012, 0, 0.66, -2.645, 0.003), 'plate', colours));

  // The bull bar: a powder-coated tube frame round the grille and lamps, a centre hoop.
  const bar = [];
  const by = [0.62, 0.94];
  const bz = -2.74;
  bar.push(tone(box(1.96, 0.26, 0.16, 0, 0.66, -2.68, 0.04), 'bar', colours)); // the bar's base pan
  bar.push(tube([-0.96, by[1], bz], [0.96, by[1], bz], 0.035));
  for (const x of [-0.96, -0.36, 0.36, 0.96]) bar.push(tube([x, 0.74, bz], [x, by[1] + 0.02, bz], 0.035));
  for (const sx of [-1, 1]) {
    bar.push(tube([sx * 0.36, by[1], bz], [sx * 0.3, 1.3, bz + 0.04], 0.035));
    bar.push(tube([sx * 0.96, by[1], bz], [sx * 0.94, 1.12, bz + 0.12], 0.035));
    bar.push(tube([sx * 0.94, 1.12, bz + 0.12], [sx * 0.9, 1.16, -2.46], 0.03));
    bar.push(tube([sx * 0.36, by[1] - 0.08, bz], [sx * 0.96, by[1] - 0.08, bz], 0.025));
  }
  bar.push(tube([-0.3, 1.3, bz + 0.04], [0.3, 1.3, bz + 0.04], 0.035));
  for (const x of [-0.12, 0.12]) bar.push(tube([x, by[1], bz + 0.01], [x, 1.3, bz + 0.04], 0.02));
  // The driving lights' housings on top of the hoop, and the aerial.
  const spot = [];
  for (const sx of [-1, 1]) {
    bar.push(tube([sx * 0.22, 1.33, bz + 0.04], [sx * 0.22, 1.38, bz + 0.04], 0.02));
    spot.push(tone(new THREE.CylinderGeometry(0.1, 0.085, 0.12, 14).rotateX(Math.PI / 2).translate(sx * 0.22, 1.45, bz + 0.06).toNonIndexed(), 'rubber', colours));
  }
  bar.push(tube([0.94, 1.12, bz + 0.12], [0.96, 2.4, bz + 0.18], 0.006));
  const barParts = bar.map((g) => (g.attributes.color ? g : tone(g, 'bar', colours)));

  // The snorkel up the driver's A-pillar.
  const snork = [];
  snork.push(tube([0.95, 1.08, -0.98], [0.96, 1.36, -0.86], 0.05));
  snork.push(tube([0.96, 1.36, -0.86], [0.92, 2.0, -0.52], 0.05));
  snork.push(tube([0.92, 2.0, -0.52], [0.92, 2.08, -0.5], 0.06));
  snork.push(box(0.14, 0.12, 0.18, 0.92, 2.13, -0.52, 0.03));
  const snorkParts = snork.map((g) => tone(g.attributes.normal ? g : g, 'rubber', colours));

  // Under: the chassis rails, the axles' diffs, the front's shadowed belly.
  const under = [];
  for (const sx of [-1, 1]) under.push(tone(box(0.09, 0.16, 5.0, sx * 0.44, 0.5, 0.0, 0.01), 'under', colours));
  under.push(tone(box(1.5, 0.24, 1.6, 0, 0.6, -1.65, 0.02), 'under', colours));
  for (const z of U.axles) {
    under.push(tone(tube([-0.7, 0.41, z], [0.7, 0.41, z], 0.05), 'under', colours));
    under.push(tone(new THREE.SphereGeometry(0.16, 10, 8).scale(1, 0.9, 1.1).translate(0.12, 0.41, z).toNonIndexed(), 'under', colours));
  }

  const g = merge([tub, ...cab, cabin, ...flares, ...trim, ...glassParts, ...face, ...barParts, ...snorkParts, ...under, ...spot]);
  return grime(bakePaint(g, look.paint), look);
}

// ---- the tray: deck, drop sides, headboard, the gun's post, the load ---------------------------

function buildTray(colours, look) {
  const T = UTE.tray;
  const len = T.back - T.front;
  const mid = (T.front + T.back) / 2;
  const parts = [];
  // The deck and its frame.
  parts.push(tone(box(T.half * 2, 0.08, len, 0, T.deck - 0.04, mid, 0.01), 'alloy', colours));
  for (let x = -0.8; x <= 0.81; x += 0.2) parts.push(tone(box(0.04, 0.012, len - 0.06, x, T.deck + 0.004, mid, 0.003), 'alloyDark', colours));
  parts.push(tone(box(T.half * 2 - 0.1, 0.12, len - 0.1, 0, T.deck - 0.14, mid, 0.01), 'under', colours));
  for (const z of [T.front + 0.25, mid, T.back - 0.25]) parts.push(tone(box(T.half * 2, 0.08, 0.08, 0, T.deck - 0.16, z, 0.01), 'under', colours));
  // Drop sides: ribbed alloy panels, the tailgate at the back.
  for (const sx of [-1, 1]) {
    parts.push(tone(box(0.04, T.sides, len, sx * (T.half - 0.02), T.deck + T.sides / 2, mid, 0.008), 'alloy', colours));
    for (const y of [0.08, 0.17, 0.26]) parts.push(tone(box(0.012, 0.025, len - 0.04, sx * T.half, T.deck + y, mid, 0.004), 'alloyDark', colours));
  }
  parts.push(tone(box(T.half * 2, T.sides, 0.04, 0, T.deck + T.sides / 2, T.back - 0.02, 0.008), 'alloy', colours));
  for (const y of [0.08, 0.17, 0.26]) parts.push(tone(box(T.half * 2 - 0.04, 0.025, 0.012, 0, T.deck + y, T.back + 0.002, 0.004), 'alloyDark', colours));
  // The headboard: a frame and its bars, up past the cab's roof.
  const hb = T.front + 0.03;
  for (const sx of [-1, 1]) parts.push(tone(tube([sx * (T.half - 0.04), T.deck, hb], [sx * (T.half - 0.04), 2.08, hb], 0.03), 'alloyDark', colours));
  parts.push(tone(tube([-(T.half - 0.04), 2.08, hb], [T.half - 0.04, 2.08, hb], 0.03), 'alloyDark', colours));
  parts.push(tone(tube([-(T.half - 0.04), 1.55, hb], [T.half - 0.04, 1.55, hb], 0.02), 'alloyDark', colours));
  for (let x = -0.75; x <= 0.76; x += 0.15) parts.push(tone(tube([x, T.deck + T.sides, hb], [x, 2.08, hb], 0.01, 5), 'alloyDark', colours));
  parts.push(tone(box(T.half * 2 - 0.08, T.sides, 0.03, 0, T.deck + T.sides / 2, hb, 0.006), 'alloy', colours));
  // The tail lights in the rear frame (the housings: their lenses are the lamps').
  for (const sx of [-1, 1]) parts.push(tone(box(0.22, 0.16, 0.06, sx * 0.78, 0.94, T.back - 0.04, 0.01), 'rubber', colours));
  parts.push(tone(box(1.9, 0.12, 0.1, 0, 0.88, T.back - 0.08, 0.01), 'under', colours));
  // Mudflaps behind the rear wheels.
  for (const sx of [-1, 1]) parts.push(tone(box(0.3, 0.36, 0.015, sx * UTE.track, 0.36, UTE.axles[1] + 0.56, 0.004), 'rubber', colours));

  // The gun's post: a braced pedestal bolted to the deck.
  const P = UTE.pedestal;
  parts.push(tone(new THREE.CylinderGeometry(0.34, 0.38, 0.06, 18).translate(0, T.deck + 0.03, P.z).toNonIndexed(), 'gun', colours));
  parts.push(tone(new THREE.CylinderGeometry(0.075, 0.09, P.top - T.deck, 12).translate(0, (P.top + T.deck) / 2, P.z).toNonIndexed(), 'gun', colours));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    parts.push(tone(tube([Math.cos(a) * 0.3, T.deck + 0.05, P.z + Math.sin(a) * 0.3], [0, T.deck + 0.55, P.z], 0.022), 'gun', colours));
  }
  parts.push(tone(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 14).translate(0, P.top - 0.04, P.z).toNonIndexed(), 'gun', colours));

  // The load: jerry cans in a rack by the headboard, ammo crates at the back,
  // the spare wheel lying flat, a coil of rope, spent brass in the corners.
  for (let i = 0; i < 2; i++) {
    const x = -0.72 + i * 0.22;
    parts.push(tone(box(0.18, 0.46, 0.34, x, T.deck + 0.24, T.front + 0.24, 0.03), i ? 'jerryB' : 'jerry', colours));
    parts.push(tone(box(0.05, 0.05, 0.08, x - 0.04, T.deck + 0.5, T.front + 0.16, 0.01), 'rubber', colours));
  }
  parts.push(tone(box(0.5, 0.04, 0.04, -0.62, T.deck + 0.36, T.front + 0.43, 0.01), 'rubber', colours)); // the strap
  for (const [x, z, h] of [
    [0.58, T.back - 0.32, 0],
    [0.58, T.back - 0.74, 0],
    [0.6, T.back - 0.52, 0.27],
  ]) {
    parts.push(tone(box(0.42, 0.26, 0.3, x, T.deck + 0.13 + h, z, 0.02), 'crate', colours));
    parts.push(tone(box(0.1, 0.03, 0.04, x, T.deck + 0.27 + h, z, 0.006), 'rubber', colours));
  }
  const spare = new THREE.TorusGeometry(0.3, 0.12, 8, 18).rotateX(Math.PI / 2).translate(-0.55, T.deck + 0.12, T.back - 0.5).toNonIndexed();
  parts.push(tone(spare, 'tyre', colours));
  parts.push(tone(new THREE.CylinderGeometry(0.2, 0.2, 0.2, 12).translate(-0.55, T.deck + 0.12, T.back - 0.5).toNonIndexed(), 'rim', colours));
  const rope = new THREE.TorusGeometry(0.16, 0.035, 6, 14).rotateX(Math.PI / 2).translate(0.62, T.deck + 0.04, T.front + 0.3).toNonIndexed();
  parts.push(tone(rope, 'rope', colours));

  const g = merge(parts);
  return grime(g, { ...look, dirtHeight: look.dirtHeight * 1.6 });
}

// ---- the wheels: a chunky mud tyre on a steel rim ----------------------------------------------

function buildWheel(colours, mirror) {
  const R = UTE.wheelRadius;
  const W = UTE.wheelWidth;
  const parts = [];
  // The tyre: the carcass, then tread blocks round it, staggered.
  parts.push(tone(new THREE.CylinderGeometry(R - 0.03, R - 0.03, W, 22, 1).rotateZ(Math.PI / 2).toNonIndexed(), 'tyre', colours));
  const n = 18;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    for (const side of [-1, 1]) {
      const g = box(W * 0.44, 0.05, 0.12, side * W * 0.24, 0, 0, 0.01);
      g.rotateX(a + (side > 0 ? 0.08 : -0.08));
      g.translate(0, Math.cos(a) * (R - 0.025), Math.sin(a) * (R - 0.025));
      parts.push(tone(g, 'tyre', colours));
    }
  }
  // The sidewall's lettering band (a lighter ring), the rim, its holes, the hub, the nuts.
  parts.push(tone(new THREE.RingGeometry(R * 0.66, R * 0.8, 22).rotateY(Math.PI / 2).translate(W / 2 + 0.002, 0, 0).toNonIndexed(), 'tyreWall', colours));
  parts.push(tone(new THREE.CylinderGeometry(R * 0.6, R * 0.6, W * 0.9, 18).rotateZ(Math.PI / 2).toNonIndexed(), 'rim', colours));
  parts.push(tone(new THREE.CircleGeometry(R * 0.58, 18).rotateY(Math.PI / 2).translate(W * 0.46, 0, 0).toNonIndexed(), 'rim', colours));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    parts.push(tone(new THREE.CircleGeometry(0.035, 8).rotateY(Math.PI / 2).translate(W * 0.465, Math.cos(a) * R * 0.4, Math.sin(a) * R * 0.4).toNonIndexed(), 'hole', colours));
  }
  parts.push(tone(new THREE.CylinderGeometry(0.075, 0.09, 0.06, 12).rotateZ(Math.PI / 2).translate(W * 0.48, 0, 0).toNonIndexed(), 'hub', colours));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.5;
    parts.push(tone(new THREE.CylinderGeometry(0.012, 0.012, 0.03, 6).rotateZ(Math.PI / 2).translate(W * 0.5, Math.cos(a) * 0.12, Math.sin(a) * 0.12).toNonIndexed(), 'steel', colours));
  }
  let g = merge(parts);
  if (mirror) {
    g.scale(-1, 1, 1);
    g = flip(g.index ? g.toNonIndexed() : g);
    g.computeVertexNormals();
  }
  return g;
}

// ---- the gun: a heavy machine gun on a cradle behind a shield ----------------------------------

function buildGun(colours) {
  // The cradle and shield turn (yaw); the gun itself tilts (pitch) about the trunnions.
  const yawParts = [];
  yawParts.push(tone(new THREE.CylinderGeometry(0.12, 0.13, 0.08, 14).translate(0, 0.04, 0).toNonIndexed(), 'gun', colours));
  for (const sx of [-1, 1]) yawParts.push(tone(box(0.03, 0.26, 0.18, sx * 0.14, 0.17, 0, 0.01), 'gun', colours)); // the cradle's cheeks
  // The shield: a centre plate with a notch for the barrel, angled wings, a viewing slot.
  const sz = -0.42;
  // Low enough that the gunner looks over it at the dead close in; the barrel through its notch.
  yawParts.push(tone(box(0.46, 0.2, 0.025, 0, 0.08, sz, 0.006), 'shield', colours));
  for (const sx of [-1, 1]) {
    yawParts.push(tone(box(0.16, 0.36, 0.025, sx * 0.31, 0.14, sz, 0.006), 'shield', colours));
    const wing = box(0.34, 0.36, 0.025, 0, 0, 0, 0.006);
    wing.rotateY(sx * 0.5);
    wing.translate(sx * 0.53, 0.14, sz + 0.09);
    yawParts.push(tone(wing, 'shield', colours));
    yawParts.push(tone(box(0.008, 0.3, 0.03, sx * 0.24, 0.14, sz - 0.014, 0.002), 'shieldEdge', colours)); // the plate's bolted seams
  }
  yawParts.push(tone(box(0.46, 0.04, 0.025, 0, 0.3, sz, 0.006), 'shield', colours));
  yawParts.push(tone(box(1.22, 0.02, 0.05, 0, 0.33, sz + 0.1, 0.005), 'shieldEdge', colours)); // a lip along the top
  // The ammo can on its tray, on the gun's left, and the belt into the feed.
  yawParts.push(tone(box(0.12, 0.2, 0.3, -0.27, 0.12, 0.06, 0.01), 'ammoCan', colours));
  yawParts.push(tone(box(0.13, 0.02, 0.32, -0.27, 0.23, 0.06, 0.004), 'gun', colours));
  for (let i = 0; i < 6; i++) yawParts.push(tone(box(0.014, 0.05, 0.014, -0.2 + i * 0.026, 0.27 + Math.sin(i * 0.6) * 0.02, 0.04 - i * 0.008, 0.002), 'brass', colours));

  const pitchParts = [];
  // The receiver, the top cover, the trunnion block.
  pitchParts.push(tone(box(0.16, 0.18, 0.72, 0, 0.0, 0.02, 0.012), 'gun', colours));
  pitchParts.push(tone(box(0.15, 0.04, 0.42, 0, 0.11, -0.04, 0.008), 'gunDark', colours));
  pitchParts.push(tone(box(0.22, 0.08, 0.12, 0, -0.06, -0.14, 0.01), 'gun', colours));
  // The spade grips and the butterfly trigger at the back, the rear sight.
  for (const sx of [-1, 1]) {
    pitchParts.push(tone(tube([sx * 0.06, 0.0, 0.38], [sx * 0.15, 0.0, 0.48], 0.016), 'gun', colours));
    pitchParts.push(tone(tube([sx * 0.15, -0.07, 0.49], [sx * 0.15, 0.08, 0.49], 0.028, 8), 'grip', colours));
  }
  pitchParts.push(tone(box(0.07, 0.05, 0.02, 0, 0.02, 0.45, 0.005), 'gunDark', colours));
  pitchParts.push(tone(box(0.03, 0.07, 0.03, 0, 0.14, 0.28, 0.005), 'gunDark', colours));
  // The carrying handle and the front sight post, out on the barrel.
  pitchParts.push(tone(box(0.03, 0.08, 0.16, 0.0, 0.17, -0.46, 0.006), 'gunDark', colours));
  const gun = merge(pitchParts);

  // The barrel: its own mesh, so it can glow with heat. A perforated jacket, the barrel, the flash hider.
  const barrelParts = [];
  barrelParts.push(new THREE.CylinderGeometry(0.05, 0.05, 0.36, 12).rotateX(Math.PI / 2).translate(0, 0.0, -0.5).toNonIndexed());
  barrelParts.push(new THREE.CylinderGeometry(0.026, 0.026, 1.0, 10).rotateX(Math.PI / 2).translate(0, 0.0, -1.0).toNonIndexed());
  barrelParts.push(new THREE.CylinderGeometry(0.038, 0.034, 0.12, 10).rotateX(Math.PI / 2).translate(0, 0.0, -1.55).toNonIndexed());
  for (let i = 0; i < 5; i++) barrelParts.push(new THREE.TorusGeometry(0.051, 0.006, 4, 12).translate(0, 0, -0.36 - i * 0.07).toNonIndexed());
  const barrel = merge(barrelParts.map((g) => {
    g.deleteAttribute('uv');
    return g;
  }));

  return { yaw: merge(yawParts), gun, barrel, muzzleZ: -1.62 };
}

// The muzzle flash: two crossed stars and a hot core, additive (the bloom takes it).
function buildFlash(look) {
  const star = (rot) => {
    const shape = new THREE.Shape();
    const n = 7;
    for (let i = 0; i <= n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2;
      const r = i % 2 === 0 ? 1 : 0.32;
      if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const g = new THREE.ShapeGeometry(shape);
    g.rotateZ(rot);
    return g;
  };
  const front = star(0);
  front.scale(0.22, 0.22, 1);
  const side = star(0.3);
  side.scale(0.16, 0.5, 1);
  side.rotateY(Math.PI / 2);
  side.translate(0, 0, -0.25);
  const side2 = side.clone().rotateZ(Math.PI / 2);
  const g = merge([front.toNonIndexed(), side.toNonIndexed(), side2.toNonIndexed()].map((x) => {
    x.deleteAttribute('uv');
    x.deleteAttribute('normal');
    return x;
  }));
  const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(look.flash).multiplyScalar(4), transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const m = new THREE.Mesh(g, mat);
  m.visible = false;
  m.frustumCulled = false;
  return m;
}

// ---- the cab from the driver's seat -------------------------------------------------------------

function buildInteriorShell(colours) {
  const U = UTE;
  const parts = [];
  const add = (g, key) => parts.push(tone(g, key, colours));
  // The roof lining and the sun visors.
  add(box(1.7, 0.03, 0.95, 0, U.roof - 0.045, 0.1, 0.01), 'lining');
  for (const x of [-0.42, 0.42]) add(box(0.4, 0.015, 0.16, x, U.roof - 0.08, -0.3, 0.006), 'liningDark');
  // The A-pillars' trim inside, and their grab handles.
  for (const sx of [-1, 1]) {
    add(tube([sx * 0.84, U.belt, U.cabFront + 0.04], [sx * 0.8, U.roof - 0.05, -0.37], 0.045, 8), 'trim');
    add(tube([sx * 0.84, U.belt, 0.5], [sx * 0.8, U.roof - 0.05, 0.52], 0.05, 8), 'trim');
  }
  // The back wall round the small back window.
  const bw = U.cabBack - 0.03;
  add(box(1.7, 0.84, 0.03, 0, 1.04, bw, 0.005), 'trim');
  add(box(1.7, 0.1, 0.03, 0, 1.92, bw, 0.005), 'trim');
  for (const sx of [-1, 1]) add(box(0.27, 0.42, 0.03, sx * 0.72, 1.66, bw, 0.005), 'trim');
  // The doors' cards: a panel, an armrest, a pull, the window winder.
  for (const sx of [-1, 1]) {
    const x = sx * 0.86;
    add(box(0.03, 0.66, 1.2, x, 0.99, -0.14, 0.008), 'door');
    add(box(0.07, 0.05, 0.42, x - sx * 0.04, 1.1, -0.02, 0.015), 'trim');
    add(box(0.05, 0.04, 0.14, x - sx * 0.03, 1.22, -0.36, 0.01), 'trimDark');
    add(tube([x - sx * 0.02, 1.0, -0.5], [x - sx * 0.08, 1.0, -0.5], 0.012, 6), 'steel');
    add(tube([x - sx * 0.08, 1.0, -0.5], [x - sx * 0.08, 0.92, -0.45], 0.01, 6), 'steel');
    add(box(0.02, 0.03, 1.2, x - sx * 0.01, U.belt + 0.01, -0.14, 0.006), 'trimDark'); // the window's sill
  }
  // The dash: a long body, a padded top with a rounded lip, the cluster's hood over the wheel.
  add(box(1.72, 0.3, 0.3, 0, 1.1, -0.68, 0.02), 'dash');
  add(box(1.72, 0.05, 0.28, 0, 1.275, -0.66, 0.02), 'dashTop');
  add(tube([-0.86, 1.25, -0.52], [0.86, 1.25, -0.52], 0.035, 10), 'dashTop');
  const C = U.cluster;
  add(box(0.5, 0.04, 0.2, C.x, 1.41, -0.6, 0.02), 'dashTop'); // the hood
  for (const sx of [-1, 1]) add(box(0.03, 0.14, 0.2, C.x + sx * 0.24, 1.34, -0.6, 0.01), 'dashTop');
  add(box(0.46, 0.23, 0.06, C.x, 1.3, -0.62, 0.005), 'dashDark'); // the cluster's recess
  // The centre stack: the radio's fascia and the heater's three knobs; the glovebox.
  add(box(0.3, 0.26, 0.04, 0, 1.08, -0.535, 0.01), 'dashDark');
  for (const x of [-0.08, 0, 0.08]) add(new THREE.CylinderGeometry(0.018, 0.018, 0.025, 10).rotateX(Math.PI / 2).translate(x, 0.99, -0.51).toNonIndexed(), 'knob');
  add(box(0.4, 0.16, 0.02, -0.46, 1.08, -0.525, 0.01), 'dashSeam');
  add(box(0.08, 0.02, 0.01, -0.46, 1.13, -0.513, 0.003), 'steel');
  // Air vents at each end.
  for (const sx of [-1, 1]) {
    add(box(0.12, 0.07, 0.02, sx * 0.74, 1.2, -0.53, 0.005), 'dashDark');
    for (const dy of [-0.02, 0, 0.02]) add(box(0.11, 0.006, 0.01, sx * 0.74, 1.2 + dy, -0.518, 0.002), 'knob');
  }
  // The steering column.
  add(tube([U.wheel.x, 1.06, -0.7], [U.wheel.x, U.wheel.y - 0.02, U.wheel.z - 0.06], 0.045, 10), 'dashDark');
  // The floor, the transmission tunnel, the seats (a bench split in two), their headrests.
  add(box(1.7, 0.04, 1.3, 0, 0.64, -0.12, 0.01), 'mat');
  add(box(0.3, 0.16, 1.0, 0, 0.72, -0.1, 0.04), 'mat');
  for (const sx of [-1, 1]) {
    const x = sx * 0.42;
    add(box(0.5, 0.12, 0.5, x, 0.94, 0.12, 0.05), 'seat');
    const back = box(0.5, 0.62, 0.12, 0, 0, 0, 0.05);
    back.rotateX(-0.18);
    back.translate(x, 1.3, 0.42);
    add(back, 'seat');
    add(box(0.26, 0.16, 0.1, x, 1.72, 0.5, 0.04), 'seat');
    add(box(0.5, 0.02, 0.5, x, 1.0, 0.12, 0.02), 'seatStripe');
  }
  // The mirror's stalk.
  add(tube([0, U.roof - 0.05, -0.38], [0, 1.88, -0.38], 0.01, 6), 'trimDark');
  // The wipers' spindles outside, at the windscreen's foot.
  return merge(parts);
}

function buildSteeringWheel(colours, look) {
  const W = UTE.wheel;
  const parts = [];
  parts.push(tone(new THREE.TorusGeometry(W.r, 0.019, 8, 28).toNonIndexed(), 'wheel', colours));
  for (const a of [Math.PI / 2 + Math.PI, Math.PI / 6 + Math.PI, -Math.PI / 6]) {
    parts.push(tone(tube([0, 0, 0], [Math.cos(a) * W.r, Math.sin(a) * W.r, 0], 0.016, 6), 'wheel', colours));
  }
  parts.push(tone(new THREE.CylinderGeometry(0.065, 0.075, 0.05, 14).rotateX(Math.PI / 2).toNonIndexed(), 'wheelHub', colours));
  parts.push(tone(box(0.04, 0.02, 0.01, 0, 0.012, 0.028, 0.004), 'steel', colours));
  // Session 25 (Aaron: "remove the player arms when driving the ute; it's okay if the
  // steering wheel just moves on its own"): no hands on it any more.
  if (!look.driverHands) return merge(parts);
  // Tom's gloved hands at ten and two, his jacket's cuffs going back toward him.
  for (const sx of [-1, 1]) {
    const a = sx > 0 ? Math.PI / 6 : Math.PI - Math.PI / 6;
    const hx = Math.cos(a) * W.r;
    const hy = Math.sin(a) * W.r;
    const glove = box(0.085, 0.1, 0.07, 0, 0, 0, 0.025);
    glove.rotateZ(sx * 0.5);
    glove.translate(hx, hy, 0.015);
    parts.push(tone(glove, 'glove', colours));
    const thumb = box(0.03, 0.05, 0.03, 0, 0, 0, 0.01);
    thumb.rotateZ(sx * -0.4);
    thumb.translate(hx - sx * 0.035, hy + 0.035, -0.02);
    parts.push(tone(thumb, 'glove', colours));
    parts.push(tone(tube([hx + sx * 0.03, hy - 0.05, 0.03], [hx + sx * 0.26, hy - 0.6, 0.22], 0.038, 8), 'sleeve', colours));
    parts.push(tone(tube([hx + sx * 0.015, hy - 0.025, 0.02], [hx + sx * 0.05, hy - 0.11, 0.06], 0.043, 8), 'cuff', colours));
  }
  return merge(parts);
}

// The air freshener: a gum leaf on a string, hung from the mirror.
function buildFreshener(colours) {
  const leaf = new THREE.Shape();
  leaf.moveTo(0, 0);
  leaf.quadraticCurveTo(0.03, -0.04, 0.0, -0.1);
  leaf.quadraticCurveTo(-0.03, -0.04, 0, 0);
  const g = new THREE.ShapeGeometry(leaf, 4).translate(0, -0.08, 0).toNonIndexed();
  g.deleteAttribute('uv');
  const s = tube([0, 0, 0], [0, -0.08, 0], 0.0015, 3);
  const both = [tone(g, 'leaf', colours), tone(s, 'string', colours)];
  return merge(both);
}

// ---- the dash's faces (canvas) ------------------------------------------------------------------

// The cluster: the speedo (km/h) on the left, the tacho on the right,
// fuel and temperature between them, the odometer under the speedo.
// Each needle's pivot in the face's own frame (u, v in 0..1).
export const DIALS = {
  speed: { u: 0.25, v: 0.5, r: 0.21, min: 0, max: 180, from: -135, to: 135, label: 'km/h', step: 20 },
  rpm: { u: 0.75, v: 0.5, r: 0.21, min: 0, max: 5, from: -135, to: 135, label: 'x1000 r/min', step: 1, red: 4 },
  fuel: { u: 0.5, v: 0.33, r: 0.08, min: 0, max: 1, from: -60, to: 60, label: 'FUEL' },
  temp: { u: 0.5, v: 0.72, r: 0.08, min: 0, max: 1, from: -60, to: 60, label: 'TEMP' },
};

// The angle (degrees, clockwise from straight up) a needle points for `value`.
export function dialAngle(dial, value) {
  const t = Math.max(0, Math.min(1, (value - dial.min) / (dial.max - dial.min)));
  return dial.from + (dial.to - dial.from) * t;
}

function makeCanvas(w, h) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c.getContext('2d') ? c : null;
}

function drawCluster(ctx, w, h, odometer, look) {
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, w, h);
  const ink = look.dialInk;
  for (const [id, d] of Object.entries(DIALS)) {
    const cx = d.u * w;
    const cy = d.v * h;
    const r = d.r * w;
    ctx.strokeStyle = '#1c1c1c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
    ctx.stroke();
    const big = id === 'speed' || id === 'rpm';
    const ticks = big ? Math.round((d.max - d.min) / d.step) * 2 : 4;
    for (let i = 0; i <= ticks; i++) {
      const v = d.min + ((d.max - d.min) * i) / ticks;
      const a = ((dialAngle(d, v) - 90) * Math.PI) / 180;
      const major = i % 2 === 0 || !big;
      const red = d.red !== undefined && v >= d.red;
      ctx.strokeStyle = red ? '#c8361e' : ink;
      ctx.lineWidth = major ? 3 : 1.5;
      const r0 = r * (major ? 0.8 : 0.88);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      ctx.stroke();
      if (big && major) {
        ctx.fillStyle = red ? '#c8361e' : ink;
        ctx.font = `bold ${Math.round(r * 0.17)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(Math.round(v)), cx + Math.cos(a) * r * 0.62, cy + Math.sin(a) * r * 0.62);
      }
    }
    ctx.fillStyle = ink;
    ctx.font = `${Math.round(big ? r * 0.12 : r * 0.28)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(d.label, cx, cy + (big ? r * 0.38 : r * 0.62));
    if (!big) {
      ctx.font = `${Math.round(r * 0.3)}px sans-serif`;
      ctx.fillText(id === 'fuel' ? 'E' : 'C', cx - r * 0.95, cy - r * 0.2);
      ctx.fillText(id === 'fuel' ? 'F' : 'H', cx + r * 0.95, cy - r * 0.2);
    }
  }
  // The odometer's drum: white digits on black, the last one red.
  const digits = String(Math.floor(odometer * 10) % 10000000).padStart(7, '0');
  const ox = DIALS.speed.u * w - 46;
  const oy = DIALS.speed.v * h + DIALS.speed.r * w * 0.58;
  ctx.font = 'bold 15px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = i === 6 ? '#3a0c08' : '#141414';
    ctx.fillRect(ox + i * 13.2, oy - 9, 12, 18);
    ctx.fillStyle = i === 6 ? '#e8c0b0' : '#d8d4c8';
    ctx.fillText(digits[i], ox + i * 13.2 + 6, oy + 1);
  }
}

function drawClock(ctx, w, h, text, look) {
  ctx.fillStyle = '#0a0602';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = look.radioInk;
  ctx.font = `bold ${Math.round(h * 0.62)}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2 + 2);
  ctx.font = `${Math.round(h * 0.22)}px monospace`;
  ctx.textAlign = 'left';
  ctx.fillText('FM 94.7', 6, h * 0.2);
}

// ---- the whole ute ------------------------------------------------------------------------------

export function buildUte(cfg) {
  const look = cfg.look;
  const colours = look.colours;
  const U = UTE;
  const root = new THREE.Group();
  root.name = 'ute';
  const body = new THREE.Group();
  body.name = 'ute body';
  root.add(body);
  const lambert = (opts = {}) => new THREE.MeshLambertMaterial({ vertexColors: true, ...opts });
  const meshes = [];
  const addMesh = (geo, mat, parent = body, name = '') => {
    const m = new THREE.Mesh(geo, mat);
    m.name = name;
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    meshes.push(m);
    return m;
  };

  addMesh(buildShell(colours, look), lambert(), body, 'shell');
  addMesh(buildTray(colours, look), lambert(), body, 'tray');

  // The lamps' lenses: their own materials, lit by the game.
  const lamps = {
    head: lensMaterial(look.headLens),
    spot: lensMaterial(look.spotLens),
    tail: lensMaterial(look.tailLens),
    brake: lensMaterial(look.brakeLens),
    reverse: lensMaterial(look.reverseLens),
  };
  const lensGeo = (list) => merge(list);
  const heads = [];
  const spots = [];
  for (const sx of [-1, 1]) {
    heads.push(disc(0.095, sx * 0.67, 1.02, -2.522, -1, 16));
    spots.push(disc(0.085, sx * 0.22, 1.45, -2.745, -1, 16));
  }
  const T = U.tray;
  const tails = [];
  const brakes = [];
  const reverses = [];
  for (const sx of [-1, 1]) {
    tails.push(disc(0.04, sx * 0.84, 0.97, T.back + 0.003, 1, 10));
    brakes.push(disc(0.04, sx * 0.72, 0.97, T.back + 0.003, 1, 10));
    reverses.push(disc(0.025, sx * 0.78, 0.9, T.back + 0.003, 1, 8));
  }
  const strip = (gs) => gs.map((g) => {
    g.deleteAttribute('uv');
    return g;
  });
  addMesh(lensGeo(strip(heads)), lamps.head, body, 'headlamps').castShadow = false;
  addMesh(lensGeo(strip(spots)), lamps.spot, body, 'spots').castShadow = false;
  addMesh(lensGeo(strip(tails)), lamps.tail, body, 'tails').castShadow = false;
  addMesh(lensGeo(strip(brakes)), lamps.brake, body, 'brakes').castShadow = false;
  addMesh(lensGeo(strip(reverses)), lamps.reverse, body, 'reverse').castShadow = false;

  // The wheels: each steers (group) and rolls (spin), on the chassis (not the body: it rolls over them).
  const wheels = [];
  const wheelGeo = buildWheel(colours, false);
  const wheelGeoL = buildWheel(colours, true);
  const wheelMat = lambert();
  for (const [sx, front] of [
    [-1, true],
    [1, true],
    [-1, false],
    [1, false],
  ]) {
    const group = new THREE.Group();
    group.position.set(sx * U.track, U.wheelRadius, front ? U.axles[0] : U.axles[1]);
    const spin = new THREE.Group();
    group.add(spin);
    addMesh(sx > 0 ? wheelGeo : wheelGeoL, wheelMat, spin, 'wheel');
    root.add(group);
    wheels.push({ group, spin, side: sx, front });
  }

  // The turret: yaw on the pedestal's top, pitch at the trunnions.
  const gunParts = buildGun(colours);
  const yaw = new THREE.Group();
  yaw.position.set(0, U.pedestal.top, U.pedestal.z);
  body.add(yaw);
  addMesh(gunParts.yaw, lambert(), yaw, 'turret cradle');
  const pitch = new THREE.Group();
  pitch.position.set(0, 0.24, 0);
  yaw.add(pitch);
  addMesh(gunParts.gun, lambert(), pitch, 'gun');
  const barrelMat = new THREE.MeshLambertMaterial({ color: colours.gunDark, emissive: 0x000000 });
  addMesh(gunParts.barrel, barrelMat, pitch, 'barrel');
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0, gunParts.muzzleZ);
  pitch.add(muzzle);
  const flash = buildFlash(look);
  flash.position.copy(muzzle.position);
  pitch.add(flash);
  const ejector = new THREE.Object3D();
  ejector.position.set(0.1, 0.0, -0.05);
  pitch.add(ejector);
  // The gunner's hands on the spade grips (seen from behind the gun).
  const handParts = [];
  for (const sx of [-1, 1]) {
    handParts.push(tone(box(0.07, 0.11, 0.08, sx * 0.15, 0.0, 0.5, 0.025), 'glove', colours));
    handParts.push(tone(tube([sx * 0.16, -0.03, 0.54], [sx * 0.24, -0.3, 0.9], 0.045, 8), 'sleeve', colours));
  }
  const hands = addMesh(merge(handParts), lambert(), pitch, 'gunner hands');
  hands.visible = false;

  // The cab inside: hidden unless Tom's at the wheel.
  const interior = new THREE.Group();
  interior.name = 'ute interior';
  interior.visible = false;
  body.add(interior);
  // A faint glow off the gauges' backlights, so the dash isn't a black hole by night.
  const inside = addMesh(buildInteriorShell(colours), lambert({ emissive: look.dashGlow }), interior, 'cab');
  inside.castShadow = false;
  // The steering wheel (with his hands): tilted toward him; `turn` spins it.
  const W = U.wheel;
  const wheelMount = new THREE.Group();
  wheelMount.position.set(W.x, W.y, W.z);
  wheelMount.rotation.x = W.tilt;
  interior.add(wheelMount);
  const steeringWheel = new THREE.Group();
  wheelMount.add(steeringWheel);
  addMesh(buildSteeringWheel(colours, look), lambert(), steeringWheel, 'steering wheel').castShadow = false;

  // The cluster's face and its needles (unlit: backlit gauges you can read by night).
  const C = U.cluster;
  const clusterMount = new THREE.Group();
  clusterMount.position.set(C.x, C.y, C.z);
  clusterMount.rotation.x = C.tilt;
  interior.add(clusterMount);
  const clusterCanvas = makeCanvas(512, 256);
  const clusterTex = clusterCanvas ? new THREE.CanvasTexture(clusterCanvas) : null;
  if (clusterTex) clusterTex.colorSpace = THREE.SRGBColorSpace;
  const faceMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(look.dialBrightness), map: clusterTex, fog: false });
  if (!clusterTex) faceMat.color.set(0x0a0a0a);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(C.w, C.h), faceMat);
  face.name = 'cluster face';
  clusterMount.add(face);
  meshes.push(face);
  const needleMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(look.needle).multiplyScalar(1.4), fog: false });
  const needles = {};
  for (const [id, d] of Object.entries(DIALS)) {
    const len = d.r * C.w * 0.9;
    const geo = new THREE.BoxGeometry(id === 'speed' || id === 'rpm' ? 0.0035 : 0.0025, len, 0.002).translate(0, len / 2 - len * 0.12, 0.003);
    const pivot = new THREE.Group();
    pivot.position.set((d.u - 0.5) * C.w, (0.5 - d.v) * C.h, 0.001);
    clusterMount.add(pivot);
    const n = new THREE.Mesh(geo, needleMat);
    pivot.add(n);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.004, 10).rotateX(Math.PI / 2).translate(0, 0, 0.005), new THREE.MeshBasicMaterial({ color: 0x111111, fog: false }));
    pivot.add(cap);
    meshes.push(n, cap);
    needles[id] = pivot;
  }
  // Warning lamps along the cluster's bottom: the headlamp (green), the handbrake (red).
  const warn = {};
  for (const [id, x, color] of [
    ['lamp', -0.06, look.warnLamp],
    ['brake', 0.06, look.warnBrake],
  ]) {
    const mat = new THREE.MeshBasicMaterial({ color: 0x050505, fog: false });
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.008, 10), mat);
    m.position.set(x, -C.h * 0.42, 0.002);
    clusterMount.add(m);
    meshes.push(m);
    warn[id] = { mat, on: new THREE.Color(color).multiplyScalar(2.2), off: new THREE.Color(0x060606) };
  }

  // The radio's clock: amber digits.
  const radioCanvas = makeCanvas(128, 40);
  const radioTex = radioCanvas ? new THREE.CanvasTexture(radioCanvas) : null;
  if (radioTex) radioTex.colorSpace = THREE.SRGBColorSpace;
  const radio = new THREE.Mesh(
    new THREE.PlaneGeometry(0.2, 0.0625),
    new THREE.MeshBasicMaterial({ color: radioTex ? 0xffffff : 0x1a0e04, map: radioTex, fog: false }),
  );
  radio.position.set(0, 1.15, -0.513);
  interior.add(radio);
  meshes.push(radio);

  // The rear-view mirror: a live picture when the game gives it one, else dark glass.
  const mirrorMat = new THREE.MeshBasicMaterial({ color: 0x0c0e10, fog: false });
  const mirror = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.075), mirrorMat);
  mirror.position.set(0, 1.85, -0.375);
  mirror.rotation.x = 0.12;
  interior.add(mirror);
  meshes.push(mirror);
  const mirrorFrame = new THREE.Mesh(merge([tone(box(0.27, 0.09, 0.02, 0, 0, -0.012, 0.01), 'trimDark', colours)]), lambert());
  mirror.add(mirrorFrame);
  meshes.push(mirrorFrame);
  const freshPivot = new THREE.Group();
  freshPivot.position.set(0.06, 1.81, -0.38);
  interior.add(freshPivot);
  const freshener = addMesh(buildFreshener(colours), lambert({ side: THREE.DoubleSide }), freshPivot, 'freshener');
  freshener.castShadow = false;
  // Inside, nothing takes the sun's shadows (the roof would leave it all black): the cab reads by day.
  interior.traverse((o) => {
    if (o.isMesh) {
      o.receiveShadow = false;
      o.castShadow = false;
    }
  });

  // The gear lever (it moves through a five-speed gate) and the handbrake.
  const gear = new THREE.Group();
  gear.position.set(0.05, 0.8, -0.18);
  interior.add(gear);
  addMesh(merge([tone(tube([0, 0, 0], [0, 0.32, 0.04], 0.012, 6), 'steel', colours), tone(new THREE.SphereGeometry(0.03, 10, 8).translate(0, 0.33, 0.04).toNonIndexed(), 'knob', colours), tone(box(0.09, 0.03, 0.09, 0, 0.0, 0, 0.02), 'mat', colours)]), lambert(), gear, 'gear lever').castShadow = false;
  const handbrake = new THREE.Group();
  handbrake.position.set(-0.08, 0.82, 0.08);
  interior.add(handbrake);
  addMesh(merge([tone(box(0.035, 0.035, 0.3, 0, 0, -0.15, 0.012), 'trimDark', colours), tone(box(0.02, 0.02, 0.03, 0, 0.012, -0.29, 0.005), 'steel', colours)]), lambert(), handbrake, 'handbrake').castShadow = false;

  // The wipers: arms on spindles at the windscreen's foot (outside), parked flat.
  const wipers = [];
  const wiperMat = lambert();
  for (const x of [-0.5, 0.2]) {
    const pivotW = new THREE.Group();
    // At the windscreen's foot, lying in its plane.
    pivotW.position.set(x, U.belt + 0.03, U.cabFront - 0.03);
    pivotW.rotation.x = -Math.atan2(U.roof - 0.04 - U.belt, -0.4 - U.cabFront) + Math.PI / 2;
    body.add(pivotW);
    const armGeo = merge([tone(box(0.02, 0.5, 0.012, 0, 0.25, 0, 0.004), 'rubber', colours), tone(box(0.016, 0.46, 0.02, 0.02, 0.27, 0.008, 0.004), 'rubber', colours)]);
    armGeo.rotateZ(-Math.PI / 2 + 0.05); // parked: lying along the screen's foot, pointing toward the middle
    const arm = new THREE.Group();
    pivotW.add(arm);
    addMesh(armGeo, wiperMat, arm, 'wiper').castShadow = false;
    wipers.push({ pivot: pivotW, arm, x });
  }

  // Blood on the windscreen: a pool of splats laid on the glass (outside), shown as the dead are hit.
  const splats = [];
  const splatMat = new THREE.MeshLambertMaterial({ color: look.blood, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 });
  const wsPlane = new THREE.Group();
  wsPlane.position.set(0, U.belt + 0.006, U.cabFront - 0.012);
  wsPlane.rotation.x = -Math.atan2(U.roof - 0.04 - U.belt, -0.4 - U.cabFront) + Math.PI / 2;
  body.add(wsPlane);
  for (let i = 0; i < cfg.splats.pool; i++) {
    const shape = new THREE.Shape();
    const n = 14;
    for (let k = 0; k <= n; k++) {
      const a = (k / n) * Math.PI * 2;
      const rr = 0.5 + 0.5 * noise(i * 3.1 + Math.cos(a) * 1.7, Math.sin(a) * 1.7, i);
      if (k === 0) shape.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else shape.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    const g = new THREE.ShapeGeometry(shape);
    // Drips running down from it.
    const drips = [];
    for (let d = 0; d < 3; d++) drips.push(new THREE.PlaneGeometry(0.08, 0.9 + noise(i, d, 1) * 1.2).translate((d - 1) * 0.35 + noise(d, i, 2) * 0.2, -0.7 - noise(i, d, 3) * 0.4, 0));
    const merged = merge([g.toNonIndexed(), ...drips.map((x) => x.toNonIndexed())].map((x) => {
      x.deleteAttribute('uv');
      return x;
    }));
    const m = new THREE.Mesh(merged, splatMat.clone());
    m.visible = false;
    m.castShadow = false;
    m.renderOrder = 2;
    wsPlane.add(m);
    meshes.push(m);
    splats.push({ mesh: m, life: 0, fade: 1, u: 0, v: 0 });
  }

  // ---- the faces' drawing ----
  let lastOdo = -1;
  let lastClock = '';
  const setOdometer = (km) => {
    const tenth = Math.floor(km * 10);
    if (tenth === lastOdo || !clusterCanvas) return;
    lastOdo = tenth;
    drawCluster(clusterCanvas.getContext('2d'), 512, 256, km, look);
    clusterTex.needsUpdate = true;
  };
  setOdometer(look.odometerStart);
  const setClock = (text) => {
    if (text === lastClock || !radioCanvas) return;
    lastClock = text;
    drawClock(radioCanvas.getContext('2d'), 128, 40, text, look);
    radioTex.needsUpdate = true;
  };
  setClock('--:--');

  // s: { speed (km/h), rpm (x1000), fuel 0..1, temp 0..1, lamp, brake }.
  const setGauges = (s) => {
    for (const id of Object.keys(DIALS)) {
      if (s[id] === undefined) continue;
      needles[id].rotation.z = (-dialAngle(DIALS[id], s[id]) * Math.PI) / 180;
    }
    for (const id of ['lamp', 'brake']) {
      if (s[id] === undefined) continue;
      warn[id].mat.color.copy(s[id] ? warn[id].on : warn[id].off);
    }
  };
  setGauges({ speed: 0, rpm: 0, fuel: 0.4, temp: 0.2, lamp: false, brake: false });

  const dispose = () => {
    root.removeFromParent();
    const seen = new Set();
    root.traverse((o) => {
      if (o.geometry && !seen.has(o.geometry)) {
        seen.add(o.geometry);
        o.geometry.dispose();
      }
      if (o.material && !seen.has(o.material)) {
        seen.add(o.material);
        o.material.map?.dispose();
        o.material.dispose();
      }
    });
  };

  return {
    root,
    body,
    wheels,
    lamps,
    meshes,
    turret: { yaw, pitch, barrel: barrelMat, flash, muzzle, ejector, hands },
    interior: { group: interior, steeringWheel, needles, wipers, splats, mirror, mirrorMat, freshPivot, gear, handbrake, warn },
    setGauges,
    setClock,
    setOdometer,
    dispose,
  };
}
