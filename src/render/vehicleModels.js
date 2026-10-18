// The vehicles' real models (Session 13, #145; Aaron: four types, the
// sheriff's paint for the police), replacing the placeholder boxes type by
// type. Built in code like the people: shapes extruded from side
// profiles with rounded edges, painted with vertex colours, in the
// vehicle's own frame (x to its right, y up, z forward; data/vehicles.json).
//
// A model is { body, lids: { bonnet, boot, door }, extras } of geometries
// (extras: { name: geometry }, kit only some carry: the type's `extras` in
// vehicles.json give the chance of each), each
// with a colour and an aPaint attribute: 1 where it takes the vehicle's
// paint (its instance colour), 0 where it keeps its own colour (glass,
// rubber, chrome, the wheel arches). Each lid is built where it sits shut;
// the renderer swings it on its hinge (the type's lids in vehicles.json)
// and makes the passenger door by mirroring the driver's. The wheels and
// lamps stay the data's parts (round wheels, unlit lamps).

import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const colour = new THREE.Color();

// ---- the kit ---------------------------------------------------------------------------------

// A side profile [[z, y], ...] extruded across the vehicle, `width` wide
// (centred on x = cx), its edges rounded by `round` metres. holes: more
// profiles cut through it. Returns a geometry in the vehicle's frame.
function extrude(profile, width, round = 0.03, cx = 0, holes = []) {
  const shape = new THREE.Shape(profile.map(([z, y]) => new THREE.Vector2(z, y)));
  for (const h of holes) shape.holes.push(new THREE.Path(h.map(([z, y]) => new THREE.Vector2(z, y))));
  const depth = Math.max(0.001, width - 2 * round);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: round > 0,
    bevelThickness: round,
    bevelSize: round,
    bevelOffset: -round, // the profile is the outside: the rounding eats inward
    bevelSegments: 3,
    curveSegments: 10,
  });
  // (shape x, shape y, extrusion) -> (vehicle z, y, x): a mirror, so the winding flips back.
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getZ(i) - depth / 2 + cx, p.getY(i), p.getX(i));
  return weld(flip(g));
}

// A rounded box [w, h, l] centred at (x, y, z).
function box(w, h, l, x, y, z, round = 0.01) {
  const r = Math.min(round, h / 2 - 0.001, l / 2 - 0.001);
  const g = extrude(
    [
      [z - l / 2, y - h / 2],
      [z + l / 2, y - h / 2],
      [z + l / 2, y + h / 2],
      [z - l / 2, y + h / 2],
    ],
    w,
    Math.max(0, Math.min(r, w / 2 - 0.001)),
    x,
  );
  return g;
}

// A flat panel (glass, a plate): the polygon [[x, y, z], ...] (convex, in order), one-sided.
function panel(points) {
  const pos = [];
  for (let i = 1; i < points.length - 1; i++) pos.push(...points[0], ...points[i], ...points[i + 1]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

// A tube from a to b, radius r.
function rod(a, b, r) {
  const A = new THREE.Vector3(...a);
  const B = new THREE.Vector3(...b);
  const dir = new THREE.Vector3().subVectors(B, A);
  const g = new THREE.CylinderGeometry(r, r, dir.length(), 6, 1);
  g.translate(0, dir.length() / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()));
  g.translate(...a);
  return weld(g);
}

// Each triangle's winding reversed (non-indexed: every attribute swapped).
function flip(g) {
  for (const a of Object.values(g.attributes)) {
    const s = a.itemSize;
    const arr = a.array;
    for (let i = 0; i < a.count; i += 3) {
      for (let k = 0; k < s; k++) {
        const t = arr[(i + 1) * s + k];
        arr[(i + 1) * s + k] = arr[(i + 2) * s + k];
        arr[(i + 2) * s + k] = t;
      }
    }
  }
  return g;
}

// Seams welded, so it shades smooth (its rounded edges round).
function weld(g) {
  for (const name of Object.keys(g.attributes)) if (name !== 'position') g.deleteAttribute(name);
  const w = mergeVertices(g.index ? g.toNonIndexed() : g, 1e-4);
  w.computeVertexNormals();
  return w;
}

// Move each vertex: f(p) changes p (a Vector3) in place. Normals redone.
function reshape(g, f) {
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    f(v.fromBufferAttribute(p, i));
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

// Colour a part: key ('body': the paint, else a key of `colours`), or
// f(p, n) -> key per vertex. Baked shading: darker underneath.
function paint(g, key, colours) {
  const p = g.attributes.position;
  const n = g.attributes.normal;
  const col = new Float32Array(p.count * 3);
  const paintAttr = new Float32Array(p.count);
  const pv = new THREE.Vector3();
  const nv = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    pv.fromBufferAttribute(p, i);
    nv.fromBufferAttribute(n, i);
    const k = typeof key === 'function' ? key(pv, nv) : key;
    if (k === 'body') {
      colour.setRGB(1, 1, 1);
      paintAttr[i] = 1;
    } else {
      colour.set(colours[k] ?? '#ff00ff');
    }
    colour.multiplyScalar(0.72 + 0.28 * (nv.y * 0.5 + 0.5));
    colour.toArray(col, i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aPaint', new THREE.BufferAttribute(paintAttr, 1));
  return g;
}

function merge(parts) {
  const g = mergeGeometries(parts.map((x) => (x.index ? x.toNonIndexed() : x)));
  for (const x of parts) x.dispose();
  g.computeBoundingSphere();
  return g;
}

// ---- the four-doors: the sedan and the police car --------------------------------------------

function arch([cz, cy], r, from, to, steps = 10) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = from + ((to - from) * i) / steps;
    pts.push([cz + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

// The wheel wells' liners: the arches are cut right through the body, so
// a dark block inside each, between the wheels, stops you seeing through
// to the far wheel (width: across, clear of the tyres).
function wells(arches, r, width, colours) {
  return arches.map(([cz, cy]) => paint(box(width, r * 1.1, r * 2, 0, cy + r * 0.45, cz, 0.01), 'under', colours));
}

// A chrome surround round a side window: a thin rod along each edge
// (x(y): where the cabin's side is at that height).
function surround(outline, x, colours, key = 'chrome') {
  return outline.map(([z, y], i) => {
    const [z2, y2] = outline[(i + 1) % outline.length];
    return paint(rod([x(y), y, z], [x(y2), y2, z2], 0.009), key, colours);
  });
}

// A boxy late-80s American four-door. All in metres, the vehicle's frame:
// the body's half-width; the cabin's half-width up its tumblehome; the
// side profiles of the tub (bumper to bumper, bonnet and boot deck flat
// for the lids, the wheel arches cut up into its lower edge), the cabin
// (the windscreen, roof and rear window's frame: painted, the pillars),
// the bonnet and boot lids and the front door; the side windows' outlines
// [[z, y], ...] (the front door's under the windscreen's slope, the rear
// door's raked).
const SEDAN = {
  half: 0.885,
  belt: 0.93,
  cabinBase: 0.9,
  cabinHalf: (y) => 0.82 - ((y - 0.9) / 0.52) * 0.1,
  arches: [
    [1.35, 0.34],
    [-1.35, 0.34],
  ],
  archRadius: 0.44,
  pinch: [1.75, 0.47, 0.07], // in plan: from |z|, over, by
  tuck: 0.48, // the sills tuck under below this
  tub: [
    [2.18, 0.42],
    [2.21, 0.6],
    [2.2, 0.82],
    [2.14, 0.865],
    [0.78, 0.865], // under the bonnet
    [0.7, 0.9], // the cowl
    [-1.46, 0.93],
    [-1.5, 0.935], // the boot deck
    [-2.13, 0.935],
    [-2.2, 0.88],
    [-2.22, 0.66],
    [-2.19, 0.46],
    [-2.08, 0.38],
    'arches',
    [2.08, 0.38],
  ],
  cabin: [
    [0.7, 0.9],
    [-0.12, 1.39],
    [-0.2, 1.42],
    [-0.94, 1.42],
    [-1.02, 1.39],
    [-1.47, 0.93],
  ],
  cabinRound: 0.05,
  windscreen: [
    [0.7, 0.9],
    [-0.12, 1.39],
  ],
  rearScreen: [
    [-1.02, 1.39],
    [-1.47, 0.93],
  ],
  frontWindow: [
    [0.56, 0.97],
    [-0.07, 1.355],
    [-0.4, 1.355],
    [-0.4, 0.97],
  ],
  rearWindow: [
    [-0.47, 0.97],
    [-1.0, 0.97],
    [-0.86, 1.355],
    [-0.47, 1.355],
  ],
  glassTop: 1.25,
  bumpers: { front: 2.24, rear: -2.25, low: 0.4, high: 0.58, width: 1.84, wrap: 0.72 },
  grille: { y: 0.71, width: 0.62, z: 2.205 },
  plates: [
    [0.47, 2.33],
    [0.72, -2.226],
  ],
  strip: 0.64, // the rubbing strips' height
  seams: [-0.44, -1.02],
  bonnet: [
    [2.16, 0.866],
    [2.16, 0.885],
    [2.1, 0.905],
    [0.77, 0.906],
    [0.77, 0.866],
  ],
  bonnetWidth: 1.66,
  boot: [
    [-1.52, 0.936],
    [-1.52, 0.968],
    [-2.12, 0.968],
    [-2.17, 0.95],
    [-2.17, 0.936],
  ],
  bootWidth: 1.62,
  door: [0.64, -0.42, 0.4, 0.92], // front z, back z, bottom, top
  mirror: [0.99, 0.5],
  aerial: [
    [0.72, 0.88, 1.9],
    [0.72, 1.6, 1.98],
  ],
};

// One four-door from its numbers (SEDAN's shape). S.extra(parts): the
// type's own kit added to the body and the door (the police car's).
function fourDoor(colours, S) {
  const [front, rear] = S.arches;
  const r = S.archRadius;
  const pinch = (p, from = S.pinch[0]) => {
    const end = Math.max(0, (Math.abs(p.z) - from) / S.pinch[1]);
    return 1 - S.pinch[2] * end * end;
  };
  const tubProfile = S.tub.flatMap((pt) => (pt === 'arches' ? [...arch(rear, r, Math.PI + 0.25, -0.25), ...arch(front, r, Math.PI + 0.25, -0.25)] : [pt]));
  const tub = extrude(tubProfile, S.half * 2, 0.035); // rounded no more than the thin strip over the front arch allows
  reshape(tub, (p) => {
    const tuck = Math.max(0, (S.tuck - p.y) / 0.14);
    p.x *= pinch(p) - 0.035 * Math.min(1, tuck);
  });
  const archKey = (p, n) => {
    if (n.y < -0.55) return 'under';
    for (const [cz, cy] of S.arches) if (Math.hypot(p.z - cz, p.y - cy) < r + 0.025 && Math.abs(n.x) < 0.6) return 'under';
    return null;
  };
  paint(tub, (p, n) => archKey(p, n) ?? S.tubKey?.(p, n) ?? 'body', colours);

  const base = S.cabinHalf(S.cabinBase);
  const cabin = extrude(S.cabin, base * 2, S.cabinRound);
  reshape(cabin, (p) => {
    p.x *= S.cabinHalf(Math.max(S.cabinBase, p.y)) / base;
  });
  paint(cabin, (p, n) => S.cabinKey?.(p, n) ?? 'body', colours);

  const glass = [];
  const side = (y) => S.cabinHalf(y) + 0.007;
  // The windscreen and rear window, inset from their pillars.
  const pane = ([a, b], t0, t1, inset) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = [(b[1] - a[1]) / len, -(b[0] - a[0]) / len]; // (z, y) outward
    return [
      [t0, -1],
      [t0, 1],
      [t1, 1],
      [t1, -1],
    ].map(([t, sgn]) => {
      const z = a[0] + (b[0] - a[0]) * t;
      const y = a[1] + (b[1] - a[1]) * t;
      return [sgn * (S.cabinHalf(y) - inset), y + n[1] * 0.008, z + n[0] * 0.008];
    });
  };
  glass.push(panel(pane(S.windscreen, 0.07, 0.95, 0.09)));
  glass.push(panel(pane(S.rearScreen, 0.07, 0.92, 0.1)));
  // The rear door windows (the front ones are on the doors), both sides,
  // and behind each front door's window a dark pane (seen through it, and
  // in its place once the door swings open: the cabin's inside).
  const frames = [];
  for (const sx of [-1, 1]) {
    const pts = S.rearWindow.map(([z, y]) => [sx * side(y), y, z]);
    glass.push(panel(sx > 0 ? pts : pts.reverse()));
    frames.push(...surround(S.rearWindow, (y) => sx * (side(y) + 0.004), colours, S.frameKey));
    const inner = S.frontWindow.map(([z, y]) => [sx * (side(y) - 0.004), y, z]);
    glass.push(panel(sx > 0 ? inner.reverse() : inner));
  }
  const glassKey = (p) => (p.y > S.glassTop ? 'glassTop' : 'glass');
  const glassParts = glass.map((g) => paint(g, glassKey, colours));

  // Bumpers: black rubber with a chrome strip, wrapping the corners.
  const B = S.bumpers;
  const bumper = (z, dir) => {
    const g = extrude(
      [
        [z - 0.08, B.low],
        [z + 0.08, B.low],
        [z + 0.08, B.high],
        [z - 0.08, B.high],
      ],
      B.width,
      0.03,
    );
    reshape(g, (p) => {
      const wrap = Math.max(0, (Math.abs(p.x) - B.wrap) / 0.2);
      p.z -= dir * wrap * wrap * 0.12;
    });
    return paint(g, (p) => (B.chrome !== false && p.y > B.high - 0.06 && p.z * dir > 0 ? 'chrome' : 'rubber'), colours);
  };
  const trim = [bumper(B.front, 1), bumper(B.rear, -1), ...wells(S.arches, r, 1.2, colours)];
  // The grille between the headlamps, and its bars.
  const G = S.grille;
  trim.push(paint(box(G.width, 0.17, 0.03, 0, G.y, G.z), 'grille', colours));
  for (const dy of [-0.05, 0, 0.05]) trim.push(paint(box(G.width - 0.02, 0.012, 0.02, 0, G.y + dy, G.z + 0.017, 0.004), 'chrome', colours));
  trim.push(paint(box(G.width + 0.04, 0.02, 0.03, 0, G.y + 0.095, G.z + 0.01, 0.005), 'chrome', colours));
  // Number plates.
  for (const [y, z] of S.plates) trim.push(paint(box(0.3, 0.15, 0.015, 0, y, z, 0.003), 'plate', colours));
  // Side rubbing strips and door seams on the fixed body (the doors carry their own).
  for (const sx of [-1, 1]) {
    trim.push(paint(box(0.012, 0.035, 0.8, sx * S.half, S.strip, (S.seams[0] + S.seams[1]) / 2 - 0.09, 0.004), 'rubber', colours));
    trim.push(paint(box(0.012, 0.035, 0.7, sx * (S.half - 0.01), S.strip, front[0] - 0.2, 0.004), 'rubber', colours));
    for (const z of S.seams) trim.push(paint(box(0.008, 0.52, 0.012, sx * (S.half + 0.004), 0.66, z, 0.002), 'seam', colours));
    trim.push(paint(box(0.012, 0.03, 0.06, sx * (S.half + 0.007), 0.82, S.seams[1] + 0.12, 0.004), 'chrome', colours)); // the rear door's handle
  }
  // A whip aerial.
  trim.push(paint(rod(...S.aerial, 0.004), 'rubber', colours));

  // ---- the lids, where they sit shut ----
  const bonnet = extrude(S.bonnet, S.bonnetWidth, 0.03);
  const bonnetTop = S.bonnet[1][1] - 0.005;
  reshape(bonnet, (p) => {
    if (p.y > bonnetTop) p.y += 0.012 * (1 - (p.x / (S.bonnetWidth / 2)) ** 2); // a gentle crown
    p.x *= pinch(p);
  });
  paint(bonnet, (p, n) => (n.y < -0.5 ? 'under' : 'body'), colours);

  const boot = extrude(S.boot, S.bootWidth, 0.025);
  reshape(boot, (p) => {
    p.x *= pinch(p);
  });
  paint(boot, (p, n) => (n.y < -0.5 ? 'under' : 'body'), colours);

  // The driver's door (left: -x): its skin, its window (moves with it), handle, mirror, strip.
  const [dz0, dz1, dy0, dy1] = S.door;
  const skin = extrude(
    [
      [dz0, dy0],
      [dz0, dy1],
      [dz1, dy1],
      [dz1, dy0],
    ],
    0.035,
    0.012,
    -(S.half - 0.012),
  );
  paint(skin, (p, n) => (n.x > 0.5 ? 'under' : S.doorKey?.(p, n) ?? 'body'), colours);
  const winPts = S.frontWindow.map(([z, y]) => [-side(y), y, z]);
  const doorParts = [
    skin,
    paint(panel(winPts), glassKey, colours),
    ...surround(S.frontWindow, (y) => -(side(y) + 0.004), colours, S.frameKey),
    paint(box(0.012, 0.035, dz0 - dz1 - 0.06, -(S.half + 0.008), S.strip, (dz0 + dz1) / 2, 0.004), 'rubber', colours),
    paint(box(0.014, 0.03, 0.07, -(S.half + 0.009), 0.82, dz1 + 0.12, 0.004), 'chrome', colours),
    paint(box(0.06, 0.08, 0.12, -(S.half + 0.045), S.mirror[0], S.mirror[1], 0.02), 'rubber', colours), // the mirror
    paint(box(0.008, 0.52, 0.012, -(S.half + 0.007), 0.66, dz0 - 0.005, 0.002), 'seam', colours),
  ];
  const own = S.extra ? S.extra(colours, side) : { body: [], door: [] };
  const body = merge([tub, cabin, ...glassParts, ...frames, ...trim, ...own.body]);
  const door = merge([...doorParts, ...own.door]);
  return { body, lids: { bonnet: merge([bonnet]), boot: merge([boot]), door } };
}

function sedan(colours) {
  return fourDoor(colours, SEDAN);
}

// ---- the police car: a county sheriff's Crown Victoria (Aaron: the sheriff's paint) ------------

// Bigger and rounder than the sedan: a sloping nose, a rounded boot, a
// softer cabin; painted the county's brown with white front doors, a gold
// star on each and a gold stripe down the sides; a push bar, a light bar,
// a spotlight by the driver's mirror, black steel wheels.
const POLICE = {
  ...SEDAN,
  half: 0.9,
  belt: 0.95,
  cabinBase: 0.92,
  cabinHalf: (y) => 0.83 - ((y - 0.92) / 0.54) * 0.13,
  arches: [
    [1.42, 0.34],
    [-1.42, 0.34],
  ],
  archRadius: 0.45,
  pinch: [1.6, 0.7, 0.1],
  tub: [
    [2.24, 0.42],
    [2.3, 0.56],
    [2.28, 0.74],
    [2.18, 0.84],
    [2.0, 0.875],
    [0.82, 0.885], // under the bonnet
    [0.72, 0.92], // the cowl
    [-1.5, 0.95],
    [-1.56, 0.955], // the boot deck
    [-2.1, 0.955],
    [-2.24, 0.91],
    [-2.3, 0.8],
    [-2.3, 0.6],
    [-2.25, 0.44],
    [-2.12, 0.38],
    'arches',
    [2.12, 0.38],
  ],
  cabin: [
    [0.72, 0.92],
    [0.0, 1.4],
    [-0.15, 1.46],
    [-0.9, 1.46],
    [-1.06, 1.41],
    [-1.52, 0.95],
  ],
  cabinRound: 0.08,
  windscreen: [
    [0.72, 0.92],
    [0.0, 1.4],
  ],
  rearScreen: [
    [-1.06, 1.41],
    [-1.52, 0.95],
  ],
  frontWindow: [
    [0.6, 0.99],
    [0.04, 1.39],
    [-0.42, 1.4],
    [-0.42, 0.99],
  ],
  rearWindow: [
    [-0.49, 0.99],
    [-1.06, 0.99],
    [-0.9, 1.4],
    [-0.49, 1.4],
  ],
  glassTop: 1.28,
  frameKey: 'rubber', // black window surrounds, not chrome
  bumpers: { front: 2.33, rear: -2.33, low: 0.38, high: 0.56, width: 1.86, wrap: 0.7, chrome: false },
  grille: { y: 0.68, width: 0.5, z: 2.29 },
  plates: [
    [0.47, 2.42],
    [0.72, -2.305],
  ],
  strip: 0.5, // low: the star sits above it
  seams: [-0.46, -1.08],
  bonnet: [
    [2.2, 0.866],
    [2.2, 0.878],
    [2.0, 0.905],
    [0.8, 0.915],
    [0.8, 0.886],
  ],
  bonnetWidth: 1.7,
  boot: [
    [-1.58, 0.956],
    [-1.58, 0.988],
    [-2.08, 0.988],
    [-2.22, 0.958],
    [-2.22, 0.956],
  ],
  bootWidth: 1.66,
  door: [0.66, -0.44, 0.4, 0.94],
  mirror: [1.0, 0.52],
  aerial: [
    [-0.5, 0.96, -1.95],
    [-0.5, 1.75, -2.02],
  ],
  // The county's two-tone: white front doors (the doors carry them) and
  // roof, a gold stripe down each side (in extra()).
  cabinKey: (p) => (p.y > 1.43 ? 'sheriffWhite' : null),
  doorKey: () => 'sheriffWhite',
  extra(colours, side) {
    const body = [];
    // The push bar: two uprights off the bumper, a crossbar, black.
    for (const sx of [-0.42, 0.42]) body.push(paint(rod([sx, 0.42, 2.42], [sx, 0.88, 2.42], 0.025), 'rubber', colours));
    body.push(paint(rod([-0.42, 0.86, 2.42], [0.42, 0.86, 2.42], 0.025), 'rubber', colours));
    body.push(paint(rod([-0.42, 0.62, 2.45], [0.42, 0.62, 2.45], 0.02), 'rubber', colours));
    // The light bar on the roof: a base and its feet (the lenses are lamps: they flash).
    body.push(paint(box(1.18, 0.05, 0.3, 0, 1.485, -0.42, 0.02), 'rubber', colours));
    for (const sx of [-0.5, 0.5]) body.push(paint(box(0.06, 0.04, 0.08, sx, 1.462, -0.42, 0.01), 'rubber', colours));
    // A second aerial and the roof's white is the cabin's paint.
    body.push(paint(rod([0.5, 0.96, -1.95], [0.5, 1.6, -2.0], 0.004), 'rubber', colours));
    // The spotlight on the driver's A-pillar: its lamp and handle.
    const sx = -(side(1.1) + 0.06);
    body.push(paint(rod([sx, 1.1, 0.5], [sx, 1.1, 0.62], 0.05), 'chrome', colours));
    body.push(paint(rod([sx + 0.06, 1.1, 0.55], [sx, 1.1, 0.55], 0.01), 'chrome', colours));
    // A gold star on each white door (built on the driver's: mirrored with it).
    const centre = [-(this.half + 0.008), 0.64, 0.12];
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
      const rr = i % 2 ? 0.045 : 0.11;
      pts.push([centre[0], centre[1] + Math.sin(a) * rr, centre[2] + Math.cos(a) * rr]);
    }
    const door = [paint(panel([centre, ...pts]), 'gold', colours)];
    // The gold stripe: along the body ahead of and behind the door, and across it.
    for (const sx of [-1, 1]) {
      body.push(paint(box(0.012, 0.035, 0.92, sx * (this.half + 0.004), 0.84, 1.12, 0.004), 'gold', colours));
      body.push(paint(box(0.012, 0.035, 1.12, sx * (this.half + 0.004), 0.84, -1.0, 0.004), 'gold', colours));
    }
    door.push(paint(box(0.012, 0.035, 1.08, -(this.half + 0.01), 0.84, 0.11, 0.004), 'gold', colours));
    return { body, door };
  },
};

function police(colours) {
  return fourDoor(colours, POLICE);
}

// ---- the pickup: a 90s full-size, regular cab --------------------------------------------------

const PICKUP = {
  half: 0.95,
  belt: 1.2,
  roof: 1.84,
  cabinHalf: (y) => 0.89 - ((y - 1.2) / 0.64) * 0.06,
  arches: [
    [1.6, 0.42],
    [-1.6, 0.42],
  ],
  archRadius: 0.52,
};
const PICKUP_WINDOW = [
  [0.6, 1.27],
  [0.15, 1.765],
  [-0.4, 1.765],
  [-0.4, 1.27],
];

function pickup(colours) {
  const P = PICKUP;
  const [front, rear] = P.arches;
  const r = P.archRadius;
  const ends = Math.asin((0.5 - front[1]) / r); // where the arch meets the rocker
  // The front clip and cab: the grille's face, the long flat bonnet, the
  // cowl, the cab's beltline, down its back to the rocker.
  const tub = extrude(
    [
      [2.56, 0.6],
      [2.585, 0.76],
      [2.57, 1.08],
      [2.5, 1.15],
      [0.8, 1.15],
      [0.7, P.belt],
      [-0.5, P.belt],
      [-0.545, 1.16],
      [-0.545, 0.6],
      [-0.5, 0.5],
      ...arch(front, r, Math.PI - ends, ends),
      [2.4, 0.52],
    ],
    P.half * 2,
    0.06,
  );
  reshape(tub, (p) => {
    const end = Math.max(0, (p.z - 2.15) / 0.43);
    const tuck = Math.max(0, (0.6 - p.y) / 0.12);
    p.x *= 1 - 0.05 * end * end - 0.03 * Math.min(1, tuck);
  });
  paint(tub, (p, n) => {
    if (n.y < -0.55) return 'under';
    if (Math.hypot(p.z - front[0], p.y - front[1]) < r + 0.025 && Math.abs(n.x) < 0.6) return 'under';
    return 'body';
  }, colours);

  // The cab: a near-upright back window, a flat roof.
  const cabin = extrude(
    [
      [0.7, P.belt],
      [0.14, 1.8],
      [0.06, P.roof],
      [-0.42, P.roof],
      [-0.5, 1.8],
      [-0.53, P.belt],
    ],
    1.78,
    0.05,
  );
  reshape(cabin, (p) => {
    p.x *= P.cabinHalf(Math.max(P.belt, p.y)) / 0.89;
  });
  paint(cabin, 'body', colours);
  const side = (y) => P.cabinHalf(y) + 0.007;

  // Glass: the windscreen, the back window, and behind each door's window a dark pane.
  const glass = [];
  const windscreen = [
    [0.7, P.belt],
    [0.14, 1.8],
  ];
  const along = ([a, b], t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const ws = [
    [0.07, -1],
    [0.07, 1],
    [0.94, 1],
    [0.94, -1],
  ].map(([t, sx]) => {
    const [z, y] = along(windscreen, t);
    return [sx * (P.cabinHalf(y) - 0.09), y + 0.006, z + 0.007];
  });
  glass.push(panel(ws));
  const back = [
    [-1, 1.3],
    [1, 1.3],
    [1, 1.72],
    [-1, 1.72],
  ].map(([sx, y]) => [sx * (P.cabinHalf(y) - 0.2), y, -0.538 - (y - 1.2) * 0.05]);
  glass.push(panel(back.reverse()));
  const frames = [];
  for (const sx of [-1, 1]) {
    const inner = PICKUP_WINDOW.map(([z, y]) => [sx * (side(y) - 0.004), y, z]);
    glass.push(panel(sx > 0 ? inner.reverse() : inner));
  }
  const glassParts = glass.map((g) => paint(g, (p) => (p.y > 1.6 ? 'glassTop' : 'glass'), colours));

  // The bed: two sides cut round the rear wheels, a front wall, a ribbed
  // floor, wheel humps, black rail caps; the frame dark beneath.
  const bed = [];
  for (const sx of [-1, 1]) {
    const wall = extrude(
      [
        [-0.58, P.belt],
        [-2.585, P.belt],
        [-2.585, 0.6],
        [-2.5, 0.52],
        ...arch(rear, r, Math.PI - ends, ends),
        [-0.58, 0.52],
      ],
      0.07,
      0.02,
      sx * (P.half - 0.035),
    );
    bed.push(
      paint(wall, (p, n) => {
        if (n.y < -0.55) return 'under';
        if (Math.hypot(p.z - rear[0], p.y - rear[1]) < r + 0.025 && Math.abs(n.x) < 0.6) return 'under';
        return n.x * sx < -0.5 ? 'bedSide' : 'body';
      }, colours),
    );
    bed.push(paint(box(0.1, 0.03, 2.02, sx * (P.half - 0.04), P.belt + 0.012, -1.58, 0.01), 'rubber', colours)); // the rail cap
    bed.push(paint(box(0.26, 0.24, 0.98, sx * 0.76, 1.05, rear[0], 0.06), 'bed', colours)); // the wheel hump
    bed.push(paint(box(0.08, 0.13, 0.03, sx * 0.93, 0.98, -2.6, 0.005), 'tailOff', colours)); // the tail lamp housing
  }
  bed.push(paint(box(1.84, 0.66, 0.07, 0, 0.88, -0.6, 0.02), 'body', colours));
  bed.push(paint(box(1.78, 0.04, 1.98, 0, 0.93, -1.58, 0.005), 'bed', colours));
  for (const x of [-0.6, -0.3, 0, 0.3, 0.6]) bed.push(paint(box(0.05, 0.015, 1.94, x, 0.955, -1.58, 0.004), 'bedRib', colours));
  bed.push(paint(box(1.6, 0.36, 1.98, 0, 0.72, -1.58, 0.02), 'under', colours));

  // The front: a big chrome-framed grille, the bumper; the step bumper behind.
  const trim = [];
  trim.push(paint(box(1.02, 0.27, 0.03, 0, 0.92, 2.575), 'grille', colours));
  for (const y of [0.85, 0.92, 0.99]) trim.push(paint(box(1.0, 0.014, 0.02, 0, y, 2.592, 0.004), 'chrome', colours));
  trim.push(paint(box(0.014, 0.27, 0.02, 0, 0.92, 2.592, 0.004), 'chrome', colours));
  trim.push(paint(box(1.08, 0.33, 0.025, 0, 0.92, 2.57, 0.01), 'chrome', colours)); // the grille's surround
  const bumper = (z, dir, top) => {
    const g = extrude(
      [
        [z - 0.1, 0.5],
        [z + 0.1, 0.5],
        [z + 0.1, top],
        [z - 0.1, top],
      ],
      1.98,
      0.035,
    );
    reshape(g, (p) => {
      const wrap = Math.max(0, (Math.abs(p.x) - 0.82) / 0.17);
      p.z -= dir * wrap * wrap * 0.1;
    });
    return paint(g, (p, n) => (n.y < -0.5 ? 'rubber' : 'chrome'), colours);
  };
  trim.push(bumper(2.67, 1, 0.73), bumper(-2.66, -1, 0.68), ...wells(P.arches, r, 1.26, colours));
  trim.push(paint(box(0.4, 0.04, 0.12, 0, 0.69, -2.71, 0.01), 'rubber', colours)); // the step's tread
  trim.push(paint(box(0.3, 0.15, 0.015, 0, 0.6, 2.775, 0.003), 'plate', colours));
  trim.push(paint(box(0.3, 0.15, 0.015, 0, 0.6, -2.765, 0.003), 'plate', colours));
  // The cab's back pillar seams, the fuel door, and the antenna.
  for (const sx of [-1, 1]) {
    trim.push(paint(box(0.008, 0.62, 0.012, sx * 0.952, 0.86, -0.46, 0.002), 'seam', colours));
    trim.push(paint(box(0.008, 0.1, 0.12, sx * 0.958, 1.05, -2.1, 0.002), 'seam', colours));
  }
  trim.push(paint(rod([0.82, 1.15, 2.2], [0.82, 1.9, 2.28], 0.004), 'rubber', colours));

  const body = merge([tub, cabin, ...glassParts, ...frames, ...bed, ...trim]);

  // ---- the lids ----
  const bonnet = extrude(
    [
      [2.52, 1.151],
      [2.52, 1.172],
      [2.47, 1.19],
      [0.79, 1.19],
      [0.79, 1.151],
    ],
    1.78,
    0.03,
  );
  reshape(bonnet, (p) => {
    if (p.y > 1.17) p.y += 0.01 * (1 - (p.x / 0.89) ** 2);
    const end = Math.max(0, (p.z - 2.15) / 0.37);
    p.x *= 1 - 0.05 * end * end;
  });
  paint(bonnet, (p, n) => (n.y < -0.5 ? 'under' : 'body'), colours);

  // The tailgate (drops on its bottom hinge): the paint outside, its handle.
  const gate = extrude(
    [
      [-2.555, 0.6],
      [-2.555, 1.195],
      [-2.615, 1.195],
      [-2.615, 0.6],
    ],
    1.76,
    0.02,
  );
  paint(gate, (p, n) => (n.z > 0.5 ? 'bedSide' : 'body'), colours);
  const gateHandle = paint(box(0.24, 0.05, 0.02, 0, 1.1, -2.62, 0.008), 'chrome', colours);

  // The driver's door: skin, window and its chrome surround, handle, a big mirror.
  const skin = extrude(
    [
      [0.72, 0.53],
      [0.72, P.belt],
      [-0.45, P.belt],
      [-0.45, 0.53],
    ],
    0.035,
    0.012,
    -(P.half - 0.012),
  );
  paint(skin, (p, n) => (n.x > 0.5 ? 'under' : 'body'), colours);
  const winPts = PICKUP_WINDOW.map(([z, y]) => [-side(y), y, z]);
  const door = merge([
    skin,
    paint(panel(winPts), (p) => (p.y > 1.6 ? 'glassTop' : 'glass'), colours),
    ...surround(PICKUP_WINDOW, (y) => -(side(y) + 0.004), colours),
    paint(box(0.014, 0.035, 0.1, -(P.half + 0.008), 1.06, -0.32, 0.005), 'chrome', colours),
    paint(box(0.04, 0.2, 0.14, -(P.half + 0.09), 1.4, 0.58, 0.02), 'rubber', colours), // the towing-style mirror
    paint(rod([-(P.half + 0.005), 1.36, 0.62], [-(P.half + 0.08), 1.38, 0.6], 0.008), 'rubber', colours),
    paint(box(0.008, 0.62, 0.012, -(P.half + 0.004), 0.86, 0.715, 0.002), 'seam', colours),
  ]);

  // Extras, some trucks only: a crossbed toolbox; a headache rack.
  const toolbox = merge([paint(box(1.86, 0.26, 0.46, 0, P.belt + 0.155, -0.86, 0.02), 'toolbox', colours), paint(box(0.2, 0.03, 0.02, 0, P.belt + 0.2, -1.095, 0.005), 'chrome', colours)]);
  const rackParts = [];
  for (const sx of [-0.88, 0.88]) rackParts.push(paint(rod([sx, P.belt, -0.62], [sx, 1.95, -0.62], 0.025), 'rubber', colours));
  rackParts.push(paint(rod([-0.88, 1.95, -0.62], [0.88, 1.95, -0.62], 0.025), 'rubber', colours));
  for (const x of [-0.45, 0, 0.45]) rackParts.push(paint(rod([x, P.belt, -0.62], [x, 1.95, -0.62], 0.012), 'rubber', colours));
  const rack = merge(rackParts);

  return { body, lids: { bonnet: merge([bonnet]), boot: merge([gate, gateHandle]), door }, extras: { toolbox, rack } };
}

// ---- the army truck: an M35 'deuce-and-a-half' ------------------------------------------------

// A flat-nosed cab behind a narrow hood, flat steel fenders over the front
// wheels, a grille guard, a heavy bumper; a cargo bed with low sides under
// a canvas cover on bows, tandem rear axles. The canvas flap at the back is
// its 'boot' (it lifts on its top edge), the tailgate below it stays shut.
const ARMY = {
  cabHalf: 1.0,
  cab: [1.15, 2.15], // back, front (z)
  floor: 0.95,
  belt: 1.6,
  roof: 2.42,
  bed: [-3.18, 1.05], // back, front (z)
  bedHalf: 1.1,
  bedFloor: 1.15,
  door: [2.05, 1.25], // front z (the hinge), back z
};
const ARMY_WINDOW = [
  [2.0, 1.66],
  [2.0, 2.28],
  [1.32, 2.28],
  [1.32, 1.66],
];

function armyTruck(colours) {
  const A = ARMY;
  const parts = [];
  const add = (g, key) => parts.push(paint(g, key, colours));
  // The chassis: two rails the length of it, dark.
  for (const sx of [-0.42, 0.42]) add(box(0.12, 0.22, 6.2, sx, 0.84, 0, 0.01), 'under');
  // The heavy front bumper, its tow hooks and stencils; the rear crossmember.
  add(box(2.3, 0.26, 0.2, 0, 0.78, 3.12, 0.02), 'body');
  for (const sx of [-0.55, 0.55]) add(box(0.06, 0.16, 0.12, sx, 0.7, 3.25, 0.01), 'rubber');
  for (const sx of [-0.85, -0.7, 0.7, 0.85]) add(box(0.1, 0.07, 0.01, sx, 0.8, 3.222, 0.002), 'stencil');
  add(box(2.2, 0.2, 0.16, 0, 0.84, -3.14, 0.02), 'body');
  add(box(0.3, 0.15, 0.015, 0, 0.82, -3.225, 0.003), 'plate');
  // The hood: narrow, its sides sloping in to the top; the radiator and its grille guard.
  const hood = extrude(
    [
      [3.02, 0.92],
      [3.02, 1.535],
      [2.15, 1.535],
      [2.15, 0.92],
    ],
    1.16,
    0.03,
  );
  reshape(hood, (p) => {
    p.x *= 1 - 0.1 * Math.max(0, (p.y - 1.2) / 0.34);
  });
  add(hood, 'body');
  add(box(0.92, 0.5, 0.03, 0, 1.22, 3.035, 0.01), 'grille');
  for (const x of [-0.44, -0.29, -0.15, 0, 0.15, 0.29, 0.44]) parts.push(paint(rod([x, 0.95, 3.1], [x, 1.5, 3.1], 0.014), 'body', colours));
  parts.push(paint(rod([-0.47, 1.5, 3.1], [0.47, 1.5, 3.1], 0.016), 'body', colours), paint(rod([-0.47, 0.95, 3.1], [0.47, 0.95, 3.1], 0.016), 'body', colours));
  // The front fenders: flat-topped plates over the front wheels, their fronts sloping down.
  for (const sx of [-1, 1]) {
    const fender = extrude(
      [
        [3.04, 0.98],
        [2.9, 1.12],
        [1.85, 1.12],
        [1.85, 1.07],
        [2.88, 1.07],
        [3.0, 0.96],
      ],
      0.52,
      0.012,
      sx * 0.83,
    );
    add(fender, 'body');
    add(box(0.5, 0.36, 0.03, sx * 0.83, 0.92, 1.86, 0.01), 'body'); // its back, to the cab step
    add(box(0.08, 0.06, 0.05, sx * 0.92, 1.16, 2.8, 0.01), 'rubber'); // a blackout lamp
  }
  // The cab: its lower body, the windscreen's frame and a canvas roof.
  const [cb, cf] = A.cab;
  add(
    extrude(
      [
        [cf, A.floor],
        [cf, A.belt],
        [cb, A.belt],
        [cb, A.floor],
      ],
      A.cabHalf * 2,
      0.03,
    ),
    'body',
  );
  const top = extrude(
    [
      [cf, A.belt],
      [cf - 0.05, A.roof - 0.06],
      [cf - 0.1, A.roof],
      [cb, A.roof],
      [cb, A.belt],
    ],
    A.cabHalf * 2 - 0.04,
    0.04,
  );
  paint(top, (p) => (p.y > A.roof - 0.07 ? 'canvas' : 'body'), colours);
  parts.push(top);
  const side = (y) => A.cabHalf - 0.02 + 0.007 + 0 * y;
  // The split windscreen: two flat panes either side of a bar.
  for (const [x0, x1] of [
    [-0.88, -0.05],
    [0.05, 0.88],
  ]) {
    const zAt = (y) => cf + 0.008 - ((y - A.belt) / (A.roof - 0.06 - A.belt)) * 0.05;
    parts.push(
      paint(
        panel([
          [x0, 1.68, zAt(1.68)],
          [x1, 1.68, zAt(1.68)],
          [x1, 2.3, zAt(2.3)],
          [x0, 2.3, zAt(2.3)],
        ]),
        (p) => (p.y > 2.1 ? 'glassTop' : 'glass'),
        colours,
      ),
    );
  }
  // The cab's small back window, and behind each door's window a dark pane.
  parts.push(
    paint(
      panel([
        [0.4, 1.75, cb - 0.008],
        [-0.4, 1.75, cb - 0.008],
        [-0.4, 2.15, cb - 0.008],
        [0.4, 2.15, cb - 0.008],
      ]),
      'glass',
      colours,
    ),
  );
  for (const sx of [-1, 1]) {
    const inner = ARMY_WINDOW.map(([z, y]) => [sx * (side(y) - 0.004), y, z]);
    parts.push(paint(panel(sx > 0 ? inner.reverse() : inner), 'glass', colours));
    // The step under the door, and the mirror on its arm.
    add(box(0.25, 0.04, 0.7, sx * 1.02, 0.72, 1.65, 0.01), 'body');
    parts.push(paint(rod([sx * 1.0, 2.2, 2.12], [sx * 1.22, 2.1, 2.15], 0.012), 'rubber', colours));
    add(box(0.04, 0.3, 0.2, sx * 1.24, 2.0, 2.15, 0.01), 'rubber');
  }
  // The exhaust stack behind the cab, up past the roof.
  parts.push(paint(rod([0.92, 1.0, 1.08], [0.92, 2.62, 1.08], 0.045), 'rubber', colours));
  // The bed: floor, low sides, the front wall, the tailgate (shut), mudflaps.
  const [bb, bf] = A.bed;
  const bedLen = bf - bb;
  const bedMid = (bf + bb) / 2;
  add(box(A.bedHalf * 2, 0.16, bedLen, 0, A.bedFloor - 0.08, bedMid, 0.02), 'body');
  for (const sx of [-1, 1]) {
    add(box(0.06, 0.45, bedLen, sx * (A.bedHalf - 0.03), A.bedFloor + 0.225, bedMid, 0.015), 'body');
    for (const z of [-2.6, -1.6, -0.6, 0.4]) add(box(0.07, 0.45, 0.06, sx * (A.bedHalf - 0.02), A.bedFloor + 0.225, z, 0.01), 'under'); // the side's stakes
    add(box(0.5, 0.02, 0.45, sx * 0.95, 1.0, -1.6, 0.005), 'under'); // the tandem's cover plate
    add(box(0.42, 0.45, 0.02, sx * 0.9, 0.6, -2.85, 0.005), 'rubber'); // a mudflap
    add(box(0.4, 0.3, 0.7, sx * 0.72, 0.8, 0.35, 0.03), 'under'); // the fuel tank / toolbox
  }
  add(box(A.bedHalf * 2, 0.45, 0.06, 0, A.bedFloor + 0.225, bf, 0.015), 'body');
  add(box(A.bedHalf * 2 - 0.04, 0.45, 0.06, 0, A.bedFloor + 0.225, bb + 0.03, 0.015), 'body');
  // The canvas cover on its bows: rounded on top, sagging a touch between the bows.
  const coverTop = 2.72;
  const cover = box(A.bedHalf * 2 - 0.02, coverTop - (A.bedFloor + 0.4), bedLen - 0.18, 0, (coverTop + A.bedFloor + 0.4) / 2, bedMid + 0.06, 0.16);
  reshape(cover, (p) => {
    if (p.y > coverTop - 0.2) p.y -= 0.025 * Math.abs(Math.sin(((p.z - bedMid) / 0.9) * Math.PI));
    p.x *= 1 - 0.04 * Math.max(0, (p.y - 2.3) / 0.4);
  });
  paint(cover, (p) => (Math.abs(Math.sin(((p.z - bedMid) / 0.9) * Math.PI)) < 0.12 ? 'canvasDark' : 'canvas'), colours);
  parts.push(cover);
  const body = merge(parts);

  // ---- the lids ----
  // The hood's top: a flat panel.
  const bonnet = merge([paint(box(1.1, 0.03, 0.88, 0, 1.55, 2.585, 0.01), 'body', colours)]);
  // The canvas flap over the bed's back, rolled at its top.
  const flap = merge([
    paint(box(2.1, 1.12, 0.03, 0, 2.08, bb + 0.02, 0.01), 'canvas', colours),
    paint(rod([-1.04, 2.62, bb + 0.03], [1.04, 2.62, bb + 0.03], 0.04), 'canvasDark', colours),
  ]);
  // The driver's door: skin, window, handle.
  const [dz0, dz1] = A.door;
  const skin = extrude(
    [
      [dz0, A.floor + 0.05],
      [dz0, A.belt],
      [dz1, A.belt],
      [dz1, A.floor + 0.05],
    ],
    0.035,
    0.012,
    -(A.cabHalf - 0.005),
  );
  paint(skin, (p, n) => (n.x > 0.5 ? 'under' : 'body'), colours);
  const door = merge([
    skin,
    paint(panel(ARMY_WINDOW.map(([z, y]) => [-side(y), y, z])), (p) => (p.y > 2.1 ? 'glassTop' : 'glass'), colours),
    ...surround(ARMY_WINDOW, (y) => -(side(y) + 0.004), colours, 'body'),
    paint(box(0.02, 0.04, 0.12, -(A.cabHalf + 0.02), 1.45, dz1 + 0.15, 0.008), 'rubber', colours),
  ]);
  return { body, lids: { bonnet, boot: flap, door } };
}

export const VEHICLE_MODELS = { sedan, pickup, police, army: armyTruck };

// A lid mirrored across the vehicle (the passenger door from the driver's).
export function mirrorGeometry(g) {
  const m = g.clone();
  m.scale(-1, 1, 1);
  return flip(m.index ? m.toNonIndexed() : m); // (scale mirrors the normals too)
}
